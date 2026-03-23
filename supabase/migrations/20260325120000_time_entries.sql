-- דיווח שעות לפרויקט (עובדים משובצים + משרד/תפעול)

create or replace function public.current_user_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.id
  from public.employees e
  where e.auth_user_id is not null
    and e.auth_user_id = auth.uid()
  limit 1;
$$;

comment on function public.current_user_employee_id() is
  'מזהה עובד לפי auth.users — ל־RLS של דיווח שעות.';

grant execute on function public.current_user_employee_id() to authenticated;

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  work_date date not null,
  hours numeric(6, 2) not null check (hours > 0 and hours <= 24),
  note text,
  created_at timestamptz not null default now()
);

create index time_entries_project_id_idx on public.time_entries (project_id);
create index time_entries_employee_id_idx on public.time_entries (employee_id);
create index time_entries_work_date_idx on public.time_entries (work_date desc);

comment on table public.time_entries is 'דיווח שעות עבודה לפי פרויקט ותאריך.';

alter table public.time_entries enable row level security;

create policy "time_entries_select_staff"
  on public.time_entries for select
  using (
    auth.uid() is not null
    and (
      public.current_app_role() in ('admin', 'office', 'operations')
      or (
        public.current_app_role() = 'field'
        and time_entries.employee_id = public.current_user_employee_id()
      )
    )
  );

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
      public.current_app_role() in ('admin', 'office', 'operations')
      or (
        public.current_app_role() = 'field'
        and time_entries.employee_id = public.current_user_employee_id()
      )
    )
  );

create policy "time_entries_update_staff"
  on public.time_entries for update
  using (
    auth.uid() is not null
    and (
      public.current_app_role() in ('admin', 'office', 'operations')
      or (
        public.current_app_role() = 'field'
        and time_entries.employee_id = public.current_user_employee_id()
      )
    )
  );

create policy "time_entries_delete_staff"
  on public.time_entries for delete
  using (
    auth.uid() is not null
    and (
      public.current_app_role() in ('admin', 'office', 'operations')
      or (
        public.current_app_role() = 'field'
        and time_entries.employee_id = public.current_user_employee_id()
      )
    )
  );
