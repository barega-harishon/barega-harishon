-- Extra application roles per profile (union with profiles.role for RLS and app checks).

alter table public.profiles
  add column if not exists extra_roles public.app_role[] not null default '{}'::public.app_role[];

comment on column public.profiles.extra_roles is
  'תפקידי אפליקציה נוספים לצד profiles.role; האיחוד משמש ל־RLS ולהרשאות באפליקציה.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'profiles'
      and c.conname = 'profiles_extra_roles_excludes_primary'
  ) then
    alter table public.profiles
      add constraint profiles_extra_roles_excludes_primary
      check (not (role = any (extra_roles)));
  end if;
end $$;

create or replace function public.current_user_app_roles()
returns public.app_role[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select array_agg(u.r order by u.r)
      from (
        select distinct q.r
        from (
          select p.role as r
          from public.profiles p
          where p.id = auth.uid()
          union all
          select unnest(p.extra_roles) as r
          from public.profiles p
          where p.id = auth.uid()
        ) q
      ) u
    ),
    '{}'::public.app_role[]
  );
$$;

comment on function public.current_user_app_roles() is
  'איחוד profiles.role ו־extra_roles למשתמש המחובר (ל־RLS).';

create or replace function public.current_has_any_app_role(allowed public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from unnest(public.current_user_app_roles()) as u(role)
    where u.role = any (allowed)
  );
$$;

comment on function public.current_has_any_app_role(public.app_role[]) is
  'האם למשתמש המחובר יש לפחות אחד מהתפקידים ברשימה.';

grant execute on function public.current_user_app_roles() to authenticated;
grant execute on function public.current_has_any_app_role(public.app_role[]) to authenticated;

-- -----------------------------------------------------------------------------
-- RLS: replace current_app_role() checks with current_has_any_app_role(...)
-- -----------------------------------------------------------------------------

-- profiles
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.current_has_any_app_role (array['admin'::public.app_role]));

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles for update
  using (public.current_has_any_app_role (array['admin'::public.app_role]));

-- clients
drop policy if exists "clients_select_role_based" on public.clients;
create policy "clients_select_role_based"
  on public.clients for select
  using (
    auth.uid() is not null
    and (
      public.current_has_any_app_role (
        array[
          'admin'::public.app_role,
          'office'::public.app_role,
          'operations'::public.app_role,
          'warehouse'::public.app_role
        ]
      )
      or (
        public.current_has_any_app_role (array['field'::public.app_role])
        and exists (
          select 1
          from public.projects p
          join public.assignments a on a.project_id = p.id
          join public.employees e on e.id = a.employee_id
          where p.client_id = clients.id
            and e.auth_user_id is not null
            and e.auth_user_id = auth.uid()
        )
      )
    )
  );

drop policy if exists "clients_insert_office_admin" on public.clients;
create policy "clients_insert_office_admin"
  on public.clients for insert
  with check (
    public.current_has_any_app_role (array['admin'::public.app_role, 'office'::public.app_role])
  );

drop policy if exists "clients_update_office_admin" on public.clients;
create policy "clients_update_office_admin"
  on public.clients for update
  using (
    public.current_has_any_app_role (array['admin'::public.app_role, 'office'::public.app_role])
  );

drop policy if exists "clients_delete_admin" on public.clients;
create policy "clients_delete_admin"
  on public.clients for delete
  using (public.current_has_any_app_role (array['admin'::public.app_role]));

-- equipment
drop policy if exists "equipment_select_authenticated" on public.equipment;
create policy "equipment_select_authenticated"
  on public.equipment for select
  using (
    auth.uid() is not null
    and public.current_has_any_app_role (
      array[
        'admin'::public.app_role,
        'office'::public.app_role,
        'operations'::public.app_role,
        'warehouse'::public.app_role,
        'field'::public.app_role
      ]
    )
  );

drop policy if exists "equipment_insert_office_ops_admin" on public.equipment;
create policy "equipment_insert_office_ops_admin"
  on public.equipment for insert
  with check (
    public.current_has_any_app_role (
      array['admin'::public.app_role, 'office'::public.app_role, 'operations'::public.app_role]
    )
  );

drop policy if exists "equipment_update_staff" on public.equipment;
create policy "equipment_update_staff"
  on public.equipment for update
  using (
    public.current_has_any_app_role (
      array[
        'admin'::public.app_role,
        'office'::public.app_role,
        'operations'::public.app_role,
        'warehouse'::public.app_role
      ]
    )
  );

drop policy if exists "equipment_delete_admin" on public.equipment;
create policy "equipment_delete_admin"
  on public.equipment for delete
  using (public.current_has_any_app_role (array['admin'::public.app_role]));

-- projects
drop policy if exists "projects_select_role_based" on public.projects;
create policy "projects_select_role_based"
  on public.projects for select
  using (
    auth.uid() is not null
    and (
      public.current_has_any_app_role (array['admin'::public.app_role, 'office'::public.app_role])
      or (
        public.current_has_any_app_role (
          array['operations'::public.app_role, 'warehouse'::public.app_role]
        )
        and projects.status::text <> 'incoming'
      )
      or (
        public.current_has_any_app_role (array['field'::public.app_role])
        and projects.status::text <> 'incoming'
        and public.is_project_assigned_to_me(projects.id)
      )
    )
  );

drop policy if exists "projects_insert_office_ops_admin" on public.projects;
create policy "projects_insert_office_ops_admin"
  on public.projects for insert
  with check (
    public.current_has_any_app_role (array['admin'::public.app_role, 'office'::public.app_role])
    or (
      public.current_has_any_app_role (array['operations'::public.app_role])
      and status::text <> 'incoming'
    )
  );

drop policy if exists "projects_update_office_ops_admin" on public.projects;
create policy "projects_update_office_ops_admin"
  on public.projects for update
  using (
    public.current_has_any_app_role (array['admin'::public.app_role, 'office'::public.app_role])
    or (
      public.current_has_any_app_role (array['operations'::public.app_role])
      and projects.status::text <> 'incoming'
    )
  )
  with check (
    public.current_has_any_app_role (array['admin'::public.app_role, 'office'::public.app_role])
    or (
      public.current_has_any_app_role (array['operations'::public.app_role])
      and status::text <> 'incoming'
    )
  );

drop policy if exists "projects_delete_admin" on public.projects;
create policy "projects_delete_admin"
  on public.projects for delete
  using (public.current_has_any_app_role (array['admin'::public.app_role]));

drop policy if exists "projects_update_field_assigned_operational" on public.projects;
create policy "projects_update_field_assigned_operational"
  on public.projects for update
  using (
    auth.uid() is not null
    and public.current_has_any_app_role (array['field'::public.app_role])
    and public.is_project_assigned_to_me(projects.id)
    and projects.status in ('approved', 'prep', 'setup', 'teardown')
  )
  with check (
    auth.uid() is not null
    and public.current_has_any_app_role (array['field'::public.app_role])
    and public.is_project_assigned_to_me(projects.id)
    and projects.status in ('prep', 'setup', 'teardown')
  );

-- project_equipment
drop policy if exists "project_equipment_select_via_project" on public.project_equipment;
create policy "project_equipment_select_via_project"
  on public.project_equipment for select
  using (
    auth.uid() is not null
    and (
      public.current_has_any_app_role (
        array[
          'admin'::public.app_role,
          'office'::public.app_role,
          'operations'::public.app_role,
          'warehouse'::public.app_role
        ]
      )
      or (
        public.current_has_any_app_role (array['field'::public.app_role])
        and public.is_project_assigned_to_me(project_equipment.project_id)
      )
    )
  );

drop policy if exists "project_equipment_insert_office_ops_admin" on public.project_equipment;
create policy "project_equipment_insert_office_ops_admin"
  on public.project_equipment for insert
  with check (
    public.current_has_any_app_role (
      array['admin'::public.app_role, 'office'::public.app_role, 'operations'::public.app_role]
    )
  );

drop policy if exists "project_equipment_update_office_ops_admin" on public.project_equipment;
create policy "project_equipment_update_office_ops_admin"
  on public.project_equipment for update
  using (
    public.current_has_any_app_role (
      array['admin'::public.app_role, 'office'::public.app_role, 'operations'::public.app_role]
    )
  );

drop policy if exists "project_equipment_update_warehouse_pick" on public.project_equipment;
create policy "project_equipment_update_warehouse_pick"
  on public.project_equipment for update
  using (
    public.current_has_any_app_role (array['admin'::public.app_role, 'warehouse'::public.app_role])
  )
  with check (
    public.current_has_any_app_role (array['admin'::public.app_role, 'warehouse'::public.app_role])
  );

drop policy if exists "project_equipment_delete_office_ops_admin" on public.project_equipment;
create policy "project_equipment_delete_office_ops_admin"
  on public.project_equipment for delete
  using (
    public.current_has_any_app_role (
      array['admin'::public.app_role, 'office'::public.app_role, 'operations'::public.app_role]
    )
  );

-- project_site_details
drop policy if exists "project_site_details_select_via_project" on public.project_site_details;
create policy "project_site_details_select_via_project"
  on public.project_site_details for select
  using (
    auth.uid() is not null
    and (
      public.current_has_any_app_role (
        array[
          'admin'::public.app_role,
          'office'::public.app_role,
          'operations'::public.app_role,
          'warehouse'::public.app_role
        ]
      )
      or (
        public.current_has_any_app_role (array['field'::public.app_role])
        and public.is_project_assigned_to_me(project_site_details.project_id)
      )
    )
  );

drop policy if exists "project_site_details_insert_office_admin" on public.project_site_details;
create policy "project_site_details_insert_office_admin"
  on public.project_site_details for insert
  with check (
    public.current_has_any_app_role (array['admin'::public.app_role, 'office'::public.app_role])
  );

drop policy if exists "project_site_details_update_office_admin" on public.project_site_details;
create policy "project_site_details_update_office_admin"
  on public.project_site_details for update
  using (
    public.current_has_any_app_role (array['admin'::public.app_role, 'office'::public.app_role])
  );

drop policy if exists "project_site_details_delete_admin" on public.project_site_details;
create policy "project_site_details_delete_admin"
  on public.project_site_details for delete
  using (public.current_has_any_app_role (array['admin'::public.app_role]));

-- employees
drop policy if exists "employees_select_authenticated" on public.employees;
create policy "employees_select_authenticated"
  on public.employees for select
  using (
    auth.uid() is not null
    and public.current_has_any_app_role (
      array[
        'admin'::public.app_role,
        'office'::public.app_role,
        'operations'::public.app_role,
        'warehouse'::public.app_role
      ]
    )
  );

drop policy if exists "employees_insert_update_admin_office" on public.employees;
create policy "employees_insert_update_admin_office"
  on public.employees for insert
  with check (
    public.current_has_any_app_role (array['admin'::public.app_role, 'office'::public.app_role])
  );

drop policy if exists "employees_update_admin_office" on public.employees;
create policy "employees_update_admin_office"
  on public.employees for update
  using (
    public.current_has_any_app_role (array['admin'::public.app_role, 'office'::public.app_role])
  );

drop policy if exists "employees_delete_admin" on public.employees;
create policy "employees_delete_admin"
  on public.employees for delete
  using (public.current_has_any_app_role (array['admin'::public.app_role]));

drop policy if exists "employees_select_field_team" on public.employees;
create policy "employees_select_field_team"
  on public.employees for select
  using (
    public.current_has_any_app_role (array['field'::public.app_role])
    and (
      employees.auth_user_id = auth.uid()
      or exists (
        select 1
        from public.assignments a_self
        join public.employees e_self on e_self.id = a_self.employee_id
        join public.assignments a_other on a_other.project_id = a_self.project_id
        where e_self.auth_user_id = auth.uid()
          and a_other.employee_id = employees.id
      )
    )
  );

-- assignments
drop policy if exists "assignments_select_role_based" on public.assignments;
create policy "assignments_select_role_based"
  on public.assignments for select
  using (
    auth.uid() is not null
    and (
      public.current_has_any_app_role (
        array[
          'admin'::public.app_role,
          'office'::public.app_role,
          'operations'::public.app_role,
          'warehouse'::public.app_role
        ]
      )
      or (
        public.current_has_any_app_role (array['field'::public.app_role])
        and public.is_project_assigned_to_me(assignments.project_id)
      )
    )
  );

drop policy if exists "assignments_insert_update_ops_office_admin" on public.assignments;
create policy "assignments_insert_update_ops_office_admin"
  on public.assignments for insert
  with check (
    public.current_has_any_app_role (
      array['admin'::public.app_role, 'office'::public.app_role, 'operations'::public.app_role]
    )
  );

drop policy if exists "assignments_update_ops_office_admin" on public.assignments;
create policy "assignments_update_ops_office_admin"
  on public.assignments for update
  using (
    public.current_has_any_app_role (
      array['admin'::public.app_role, 'office'::public.app_role, 'operations'::public.app_role]
    )
  );

drop policy if exists "assignments_delete_admin" on public.assignments;
create policy "assignments_delete_admin"
  on public.assignments for delete
  using (public.current_has_any_app_role (array['admin'::public.app_role]));

-- trucks
drop policy if exists "trucks_select_authenticated" on public.trucks;
create policy "trucks_select_authenticated"
  on public.trucks for select
  using (
    auth.uid() is not null
    and public.current_has_any_app_role (
      array[
        'admin'::public.app_role,
        'office'::public.app_role,
        'operations'::public.app_role,
        'warehouse'::public.app_role,
        'field'::public.app_role
      ]
    )
  );

drop policy if exists "trucks_insert_update_ops_wh_admin" on public.trucks;
create policy "trucks_insert_update_ops_wh_admin"
  on public.trucks for insert
  with check (
    public.current_has_any_app_role (
      array['admin'::public.app_role, 'operations'::public.app_role, 'warehouse'::public.app_role]
    )
  );

drop policy if exists "trucks_update_ops_wh_admin" on public.trucks;
create policy "trucks_update_ops_wh_admin"
  on public.trucks for update
  using (
    public.current_has_any_app_role (
      array['admin'::public.app_role, 'operations'::public.app_role, 'warehouse'::public.app_role]
    )
  );

drop policy if exists "trucks_delete_admin" on public.trucks;
create policy "trucks_delete_admin"
  on public.trucks for delete
  using (public.current_has_any_app_role (array['admin'::public.app_role]));

-- payments
drop policy if exists "payments_select_office_admin" on public.payments;
create policy "payments_select_office_admin"
  on public.payments for select
  using (
    public.current_has_any_app_role (array['admin'::public.app_role, 'office'::public.app_role])
  );

drop policy if exists "payments_insert_update_office_admin" on public.payments;
create policy "payments_insert_update_office_admin"
  on public.payments for insert
  with check (
    public.current_has_any_app_role (array['admin'::public.app_role, 'office'::public.app_role])
  );

drop policy if exists "payments_update_office_admin" on public.payments;
create policy "payments_update_office_admin"
  on public.payments for update
  using (
    public.current_has_any_app_role (array['admin'::public.app_role, 'office'::public.app_role])
  );

drop policy if exists "payments_delete_admin" on public.payments;
create policy "payments_delete_admin"
  on public.payments for delete
  using (public.current_has_any_app_role (array['admin'::public.app_role]));

-- project_trucks
drop policy if exists "project_trucks_select_via_project" on public.project_trucks;
create policy "project_trucks_select_via_project"
  on public.project_trucks for select
  using (
    auth.uid() is not null
    and (
      public.current_has_any_app_role (
        array[
          'admin'::public.app_role,
          'office'::public.app_role,
          'operations'::public.app_role,
          'warehouse'::public.app_role
        ]
      )
      or (
        public.current_has_any_app_role (array['field'::public.app_role])
        and public.is_project_assigned_to_me(project_trucks.project_id)
      )
    )
  );

drop policy if exists "project_trucks_insert_office_ops_admin" on public.project_trucks;
create policy "project_trucks_insert_office_ops_admin"
  on public.project_trucks for insert
  with check (
    public.current_has_any_app_role (
      array['admin'::public.app_role, 'office'::public.app_role, 'operations'::public.app_role]
    )
  );

drop policy if exists "project_trucks_delete_office_ops_admin" on public.project_trucks;
create policy "project_trucks_delete_office_ops_admin"
  on public.project_trucks for delete
  using (
    public.current_has_any_app_role (
      array['admin'::public.app_role, 'office'::public.app_role, 'operations'::public.app_role]
    )
  );

-- time_entries
drop policy if exists "time_entries_select_staff" on public.time_entries;
create policy "time_entries_select_staff"
  on public.time_entries for select
  using (
    auth.uid() is not null
    and (
      public.current_has_any_app_role (
        array['admin'::public.app_role, 'office'::public.app_role, 'operations'::public.app_role]
      )
      or (
        public.current_has_any_app_role (array['field'::public.app_role])
        and time_entries.employee_id = public.current_user_employee_id()
      )
    )
  );

drop policy if exists "time_entries_insert_staff" on public.time_entries;
create policy "time_entries_insert_staff"
  on public.time_entries for insert
  with check (
    auth.uid() is not null
    and exists (
      select 1
      from public.assignments a
      where a.project_id = time_entries.project_id
        and a.employee_id = time_entries.employee_id
    )
    and (
      public.current_has_any_app_role (
        array['admin'::public.app_role, 'office'::public.app_role, 'operations'::public.app_role]
      )
      or (
        public.current_has_any_app_role (array['field'::public.app_role])
        and time_entries.employee_id = public.current_user_employee_id()
      )
    )
  );

drop policy if exists "time_entries_update_staff" on public.time_entries;
create policy "time_entries_update_staff"
  on public.time_entries for update
  using (
    auth.uid() is not null
    and (
      public.current_has_any_app_role (
        array['admin'::public.app_role, 'office'::public.app_role, 'operations'::public.app_role]
      )
      or (
        public.current_has_any_app_role (array['field'::public.app_role])
        and time_entries.employee_id = public.current_user_employee_id()
      )
    )
  );

drop policy if exists "time_entries_delete_staff" on public.time_entries;
create policy "time_entries_delete_staff"
  on public.time_entries for delete
  using (
    auth.uid() is not null
    and (
      public.current_has_any_app_role (
        array['admin'::public.app_role, 'office'::public.app_role, 'operations'::public.app_role]
      )
      or (
        public.current_has_any_app_role (array['field'::public.app_role])
        and time_entries.employee_id = public.current_user_employee_id()
      )
    )
  );

-- equipment_purchase_batches / equipment_pick_transactions
drop policy if exists "equipment_batches_select_authenticated" on public.equipment_purchase_batches;
create policy "equipment_batches_select_authenticated"
  on public.equipment_purchase_batches for select
  using (
    auth.uid() is not null
    and public.current_has_any_app_role (
      array[
        'admin'::public.app_role,
        'office'::public.app_role,
        'operations'::public.app_role,
        'warehouse'::public.app_role,
        'field'::public.app_role
      ]
    )
  );

drop policy if exists "equipment_batches_insert_manage_roles" on public.equipment_purchase_batches;
create policy "equipment_batches_insert_manage_roles"
  on public.equipment_purchase_batches for insert
  with check (
    public.current_has_any_app_role (
      array['admin'::public.app_role, 'office'::public.app_role, 'warehouse'::public.app_role]
    )
  );

drop policy if exists "equipment_batches_update_manage_roles" on public.equipment_purchase_batches;
create policy "equipment_batches_update_manage_roles"
  on public.equipment_purchase_batches for update
  using (
    public.current_has_any_app_role (
      array['admin'::public.app_role, 'office'::public.app_role, 'warehouse'::public.app_role]
    )
  )
  with check (
    public.current_has_any_app_role (
      array['admin'::public.app_role, 'office'::public.app_role, 'warehouse'::public.app_role]
    )
  );

drop policy if exists "equipment_batches_delete_admin" on public.equipment_purchase_batches;
create policy "equipment_batches_delete_admin"
  on public.equipment_purchase_batches for delete
  using (public.current_has_any_app_role (array['admin'::public.app_role]));

drop policy if exists "equipment_pick_tx_select_role_based" on public.equipment_pick_transactions;
create policy "equipment_pick_tx_select_role_based"
  on public.equipment_pick_transactions for select
  using (
    auth.uid() is not null
    and (
      public.current_has_any_app_role (
        array[
          'admin'::public.app_role,
          'office'::public.app_role,
          'operations'::public.app_role,
          'warehouse'::public.app_role
        ]
      )
      or (
        public.current_has_any_app_role (array['field'::public.app_role])
        and project_id is not null
        and public.is_project_assigned_to_me(project_id)
      )
    )
  );

drop policy if exists "equipment_pick_tx_insert_role_based" on public.equipment_pick_transactions;
create policy "equipment_pick_tx_insert_role_based"
  on public.equipment_pick_transactions for insert
  with check (
    (
      source = 'warehouse'
      and public.current_has_any_app_role (
        array['admin'::public.app_role, 'office'::public.app_role, 'warehouse'::public.app_role]
      )
      and project_id is null
    )
    or (
      source = 'project'
      and public.current_has_any_app_role (
        array[
          'admin'::public.app_role,
          'office'::public.app_role,
          'operations'::public.app_role,
          'warehouse'::public.app_role
        ]
      )
      and project_id is not null
    )
  );

drop policy if exists "equipment_pick_tx_delete_admin" on public.equipment_pick_transactions;
create policy "equipment_pick_tx_delete_admin"
  on public.equipment_pick_transactions for delete
  using (public.current_has_any_app_role (array['admin'::public.app_role]));

-- employee_file_events
drop policy if exists "employee_file_events_select_staff" on public.employee_file_events;
create policy "employee_file_events_select_staff"
  on public.employee_file_events for select
  using (
    public.current_has_any_app_role (
      array['admin'::public.app_role, 'office'::public.app_role, 'operations'::public.app_role]
    )
  );

drop policy if exists "employee_file_events_insert_staff" on public.employee_file_events;
create policy "employee_file_events_insert_staff"
  on public.employee_file_events for insert
  with check (
    public.current_has_any_app_role (
      array['admin'::public.app_role, 'office'::public.app_role, 'operations'::public.app_role]
    )
  );

-- storage.objects (project photos/sketches + employee files)
drop policy if exists "project_site_photos_select" on storage.objects;
create policy "project_site_photos_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'project-site-photos'
    and name ~ '^[0-9a-fA-F-]{36}/'
    and exists (
      select 1
      from public.projects p
      where p.id = substring(name from 1 for 36)::uuid
        and (
          public.current_has_any_app_role (
            array[
              'admin'::public.app_role,
              'office'::public.app_role,
              'operations'::public.app_role,
              'warehouse'::public.app_role
            ]
          )
          or public.is_project_assigned_to_me(p.id)
        )
    )
  );

drop policy if exists "project_site_photos_insert" on storage.objects;
create policy "project_site_photos_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-site-photos'
    and name ~ '^[0-9a-fA-F-]{36}/'
    and exists (
      select 1
      from public.projects p
      where p.id = substring(name from 1 for 36)::uuid
        and (
          public.current_has_any_app_role (
            array[
              'admin'::public.app_role,
              'office'::public.app_role,
              'operations'::public.app_role,
              'warehouse'::public.app_role
            ]
          )
          or public.is_project_assigned_to_me(p.id)
        )
    )
  );

drop policy if exists "project_site_photos_update" on storage.objects;
create policy "project_site_photos_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'project-site-photos'
    and name ~ '^[0-9a-fA-F-]{36}/'
    and exists (
      select 1
      from public.projects p
      where p.id = substring(name from 1 for 36)::uuid
        and (
          public.current_has_any_app_role (
            array[
              'admin'::public.app_role,
              'office'::public.app_role,
              'operations'::public.app_role,
              'warehouse'::public.app_role
            ]
          )
          or public.is_project_assigned_to_me(p.id)
        )
    )
  )
  with check (
    bucket_id = 'project-site-photos'
    and name ~ '^[0-9a-fA-F-]{36}/'
    and exists (
      select 1
      from public.projects p
      where p.id = substring(name from 1 for 36)::uuid
        and (
          public.current_has_any_app_role (
            array[
              'admin'::public.app_role,
              'office'::public.app_role,
              'operations'::public.app_role,
              'warehouse'::public.app_role
            ]
          )
          or public.is_project_assigned_to_me(p.id)
        )
    )
  );

drop policy if exists "project_site_photos_delete" on storage.objects;
create policy "project_site_photos_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-site-photos'
    and name ~ '^[0-9a-fA-F-]{36}/'
    and exists (
      select 1
      from public.projects p
      where p.id = substring(name from 1 for 36)::uuid
        and (
          public.current_has_any_app_role (
            array[
              'admin'::public.app_role,
              'office'::public.app_role,
              'operations'::public.app_role,
              'warehouse'::public.app_role
            ]
          )
          or public.is_project_assigned_to_me(p.id)
        )
    )
  );

drop policy if exists "project_sketches_select" on storage.objects;
create policy "project_sketches_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'project-sketches'
    and name ~ '^[0-9a-fA-F-]{36}/'
    and exists (
      select 1
      from public.projects p
      where p.id = substring(name from 1 for 36)::uuid
        and (
          public.current_has_any_app_role (
            array[
              'admin'::public.app_role,
              'office'::public.app_role,
              'operations'::public.app_role,
              'warehouse'::public.app_role
            ]
          )
          or public.is_project_assigned_to_me(p.id)
        )
    )
  );

drop policy if exists "project_sketches_insert" on storage.objects;
create policy "project_sketches_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-sketches'
    and name ~ '^[0-9a-fA-F-]{36}/'
    and exists (
      select 1
      from public.projects p
      where p.id = substring(name from 1 for 36)::uuid
        and (
          public.current_has_any_app_role (
            array[
              'admin'::public.app_role,
              'office'::public.app_role,
              'operations'::public.app_role,
              'warehouse'::public.app_role
            ]
          )
          or public.is_project_assigned_to_me(p.id)
        )
    )
  );

drop policy if exists "project_sketches_update" on storage.objects;
create policy "project_sketches_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'project-sketches'
    and name ~ '^[0-9a-fA-F-]{36}/'
    and exists (
      select 1
      from public.projects p
      where p.id = substring(name from 1 for 36)::uuid
        and (
          public.current_has_any_app_role (
            array[
              'admin'::public.app_role,
              'office'::public.app_role,
              'operations'::public.app_role,
              'warehouse'::public.app_role
            ]
          )
          or public.is_project_assigned_to_me(p.id)
        )
    )
  )
  with check (
    bucket_id = 'project-sketches'
    and name ~ '^[0-9a-fA-F-]{36}/'
    and exists (
      select 1
      from public.projects p
      where p.id = substring(name from 1 for 36)::uuid
        and (
          public.current_has_any_app_role (
            array[
              'admin'::public.app_role,
              'office'::public.app_role,
              'operations'::public.app_role,
              'warehouse'::public.app_role
            ]
          )
          or public.is_project_assigned_to_me(p.id)
        )
    )
  );

drop policy if exists "project_sketches_delete" on storage.objects;
create policy "project_sketches_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-sketches'
    and name ~ '^[0-9a-fA-F-]{36}/'
    and exists (
      select 1
      from public.projects p
      where p.id = substring(name from 1 for 36)::uuid
        and (
          public.current_has_any_app_role (
            array[
              'admin'::public.app_role,
              'office'::public.app_role,
              'operations'::public.app_role,
              'warehouse'::public.app_role
            ]
          )
          or public.is_project_assigned_to_me(p.id)
        )
    )
  );

drop policy if exists "employee_files_select" on storage.objects;
create policy "employee_files_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'employee-files'
    and name ~ '^[0-9a-fA-F-]{36}/'
    and exists (
      select 1
      from public.employees e
      where e.id = substring(name from 1 for 36)::uuid
        and public.current_has_any_app_role (
          array['admin'::public.app_role, 'office'::public.app_role, 'operations'::public.app_role]
        )
    )
  );

drop policy if exists "employee_files_insert" on storage.objects;
create policy "employee_files_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'employee-files'
    and name ~ '^[0-9a-fA-F-]{36}/'
    and exists (
      select 1
      from public.employees e
      where e.id = substring(name from 1 for 36)::uuid
        and public.current_has_any_app_role (
          array['admin'::public.app_role, 'office'::public.app_role, 'operations'::public.app_role]
        )
    )
  );

drop policy if exists "employee_files_update" on storage.objects;
create policy "employee_files_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'employee-files'
    and name ~ '^[0-9a-fA-F-]{36}/'
    and exists (
      select 1
      from public.employees e
      where e.id = substring(name from 1 for 36)::uuid
        and public.current_has_any_app_role (
          array['admin'::public.app_role, 'office'::public.app_role, 'operations'::public.app_role]
        )
    )
  )
  with check (
    bucket_id = 'employee-files'
    and name ~ '^[0-9a-fA-F-]{36}/'
    and exists (
      select 1
      from public.employees e
      where e.id = substring(name from 1 for 36)::uuid
        and public.current_has_any_app_role (
          array['admin'::public.app_role, 'office'::public.app_role, 'operations'::public.app_role]
        )
    )
  );

drop policy if exists "employee_files_delete" on storage.objects;
create policy "employee_files_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'employee-files'
    and name ~ '^[0-9a-fA-F-]{36}/'
    and exists (
      select 1
      from public.employees e
      where e.id = substring(name from 1 for 36)::uuid
        and public.current_has_any_app_role (
          array['admin'::public.app_role, 'office'::public.app_role, 'operations'::public.app_role]
        )
    )
  );
