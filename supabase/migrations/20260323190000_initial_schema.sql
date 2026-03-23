-- MVP initial schema: equipment rental / events
-- Aligns with docs/TECH_DESIGN.md and docs/SPEC.md
-- Run via Supabase CLI or SQL editor.

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.app_role as enum (
  'admin',
  'office',
  'operations',
  'warehouse',
  'field'
);

create type public.project_status as enum (
  'quote',
  'approved',
  'prep',
  'setup',
  'teardown',
  'closed'
);

create type public.employee_type as enum (
  'fixed',
  'hourly',
  'agency'
);

create type public.assignment_role as enum (
  'team_lead',
  'driver',
  'worker'
);

create type public.payment_type as enum (
  'deposit',
  'balance',
  'other'
);

-- -----------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role public.app_role not null default 'field',
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Application user profile and role for RLS.';

-- New auth users get a profile row (default role: field; admin should adjust).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'field'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Core domain tables
-- -----------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  created_at timestamptz not null default now()
);

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default '',
  total_qty integer not null default 0 check (total_qty >= 0),
  rent_price numeric(12, 2) not null default 0,
  warehouse_location text,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  status public.project_status not null default 'quote',
  location_address text,
  total_price numeric(12, 2) not null default 0,
  setup_starts_at timestamptz,
  event_starts_at timestamptz,
  event_ends_at timestamptz,
  teardown_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.project_equipment (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  equipment_id uuid not null references public.equipment (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  picked_qty integer not null default 0 check (picked_qty >= 0),
  returned_qty integer not null default 0 check (returned_qty >= 0),
  damaged_qty integer not null default 0 check (damaged_qty >= 0),
  unique (project_id, equipment_id)
);

create table public.project_site_details (
  project_id uuid primary key references public.projects (id) on delete cascade,
  access_notes text,
  cladding_color text,
  notes text,
  site_photo_paths text[] not null default '{}',
  sketch_path text,
  submitted_by_client boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Links a person record to a login for field RLS (nullable for contractors).
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  name text not null,
  type public.employee_type not null default 'hourly',
  hourly_rate numeric(12, 2),
  availability_note text,
  created_at timestamptz not null default now()
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  role public.assignment_role not null,
  unique (project_id, employee_id, role)
);

create table public.trucks (
  id uuid primary key default gen_random_uuid(),
  license_plate text not null unique,
  driver_id uuid references public.employees (id) on delete set null,
  status text not null default 'available',
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  type public.payment_type not null default 'other',
  paid_at timestamptz not null default now(),
  note text
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
create index projects_client_id_idx on public.projects (client_id);
create index projects_status_idx on public.projects (status);
create index projects_event_starts_at_idx on public.projects (event_starts_at);
create index project_equipment_project_id_idx on public.project_equipment (project_id);
create index assignments_employee_id_idx on public.assignments (employee_id);
create index assignments_project_id_idx on public.assignments (project_id);
create index payments_project_id_idx on public.payments (project_id);
create index employees_auth_user_id_idx on public.employees (auth_user_id);

-- -----------------------------------------------------------------------------
-- Row Level Security helpers
-- -----------------------------------------------------------------------------
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid();
$$;

create or replace function public.is_project_assigned_to_me(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.assignments a
    join public.employees e on e.id = a.employee_id
    where a.project_id = p_project_id
      and e.auth_user_id = auth.uid()
  );
$$;

-- -----------------------------------------------------------------------------
-- Enable RLS
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.equipment enable row level security;
alter table public.projects enable row level security;
alter table public.project_equipment enable row level security;
alter table public.project_site_details enable row level security;
alter table public.employees enable row level security;
alter table public.assignments enable row level security;
alter table public.trucks enable row level security;
alter table public.payments enable row level security;

-- -----------------------------------------------------------------------------
-- Policies: profiles
-- -----------------------------------------------------------------------------
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.current_app_role() = 'admin');

create policy "profiles_update_admin"
  on public.profiles for update
  using (public.current_app_role() = 'admin');

-- -----------------------------------------------------------------------------
-- Policies: clients
-- -----------------------------------------------------------------------------
create policy "clients_select_authenticated"
  on public.clients for select
  using (
    auth.uid() is not null
    and public.current_app_role() in (
      'admin', 'office', 'operations', 'warehouse', 'field'
    )
  );

create policy "clients_insert_office_admin"
  on public.clients for insert
  with check (public.current_app_role() in ('admin', 'office'));

create policy "clients_update_office_admin"
  on public.clients for update
  using (public.current_app_role() in ('admin', 'office'));

create policy "clients_delete_admin"
  on public.clients for delete
  using (public.current_app_role() = 'admin');

-- -----------------------------------------------------------------------------
-- Policies: equipment
-- -----------------------------------------------------------------------------
create policy "equipment_select_authenticated"
  on public.equipment for select
  using (
    auth.uid() is not null
    and public.current_app_role() in (
      'admin', 'office', 'operations', 'warehouse', 'field'
    )
  );

create policy "equipment_insert_admin"
  on public.equipment for insert
  with check (public.current_app_role() = 'admin');

create policy "equipment_update_warehouse_admin"
  on public.equipment for update
  using (public.current_app_role() in ('admin', 'warehouse'));

create policy "equipment_delete_admin"
  on public.equipment for delete
  using (public.current_app_role() = 'admin');

-- -----------------------------------------------------------------------------
-- Policies: projects
-- -----------------------------------------------------------------------------
create policy "projects_select_role_based"
  on public.projects for select
  using (
    auth.uid() is not null
    and (
      public.current_app_role() in ('admin', 'office', 'operations', 'warehouse')
      or (
        public.current_app_role() = 'field'
        and public.is_project_assigned_to_me(projects.id)
      )
    )
  );

create policy "projects_insert_office_ops_admin"
  on public.projects for insert
  with check (
    public.current_app_role() in ('admin', 'office', 'operations')
  );

create policy "projects_update_office_ops_admin"
  on public.projects for update
  using (
    public.current_app_role() in ('admin', 'office', 'operations')
  );

create policy "projects_delete_admin"
  on public.projects for delete
  using (public.current_app_role() = 'admin');

-- -----------------------------------------------------------------------------
-- Policies: project_equipment
-- -----------------------------------------------------------------------------
create policy "project_equipment_select_via_project"
  on public.project_equipment for select
  using (
    auth.uid() is not null
    and (
      public.current_app_role() in ('admin', 'office', 'operations', 'warehouse')
      or (
        public.current_app_role() = 'field'
        and public.is_project_assigned_to_me(project_equipment.project_id)
      )
    )
  );

create policy "project_equipment_insert_office_ops_admin"
  on public.project_equipment for insert
  with check (public.current_app_role() in ('admin', 'office', 'operations'));

create policy "project_equipment_update_office_ops_admin"
  on public.project_equipment for update
  using (public.current_app_role() in ('admin', 'office', 'operations'));

create policy "project_equipment_update_warehouse_pick"
  on public.project_equipment for update
  using (public.current_app_role() in ('admin', 'warehouse'))
  with check (public.current_app_role() in ('admin', 'warehouse'));

-- Note: two UPDATE policies on same table are OR-ed in Postgres RLS.

create policy "project_equipment_delete_admin"
  on public.project_equipment for delete
  using (public.current_app_role() = 'admin');

-- -----------------------------------------------------------------------------
-- Policies: project_site_details
-- -----------------------------------------------------------------------------
create policy "project_site_details_select_via_project"
  on public.project_site_details for select
  using (
    auth.uid() is not null
    and (
      public.current_app_role() in ('admin', 'office', 'operations', 'warehouse')
      or (
        public.current_app_role() = 'field'
        and public.is_project_assigned_to_me(project_site_details.project_id)
      )
    )
  );

create policy "project_site_details_insert_office_admin"
  on public.project_site_details for insert
  with check (public.current_app_role() in ('admin', 'office'));

create policy "project_site_details_update_office_admin"
  on public.project_site_details for update
  using (public.current_app_role() in ('admin', 'office'));

create policy "project_site_details_delete_admin"
  on public.project_site_details for delete
  using (public.current_app_role() = 'admin');

-- -----------------------------------------------------------------------------
-- Policies: employees
-- -----------------------------------------------------------------------------
create policy "employees_select_authenticated"
  on public.employees for select
  using (
    auth.uid() is not null
    and public.current_app_role() in ('admin', 'office', 'operations', 'warehouse')
  );

create policy "employees_insert_update_admin_office"
  on public.employees for insert
  with check (public.current_app_role() in ('admin', 'office'));

create policy "employees_update_admin_office"
  on public.employees for update
  using (public.current_app_role() in ('admin', 'office'));

create policy "employees_delete_admin"
  on public.employees for delete
  using (public.current_app_role() = 'admin');

-- Field staff: see own linked employee row and coworkers on the same projects.
create policy "employees_select_field_team"
  on public.employees for select
  using (
    public.current_app_role() = 'field'
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

-- -----------------------------------------------------------------------------
-- Policies: assignments
-- -----------------------------------------------------------------------------
create policy "assignments_select_role_based"
  on public.assignments for select
  using (
    auth.uid() is not null
    and (
      public.current_app_role() in ('admin', 'office', 'operations', 'warehouse')
      or (
        public.current_app_role() = 'field'
        and public.is_project_assigned_to_me(assignments.project_id)
      )
    )
  );

create policy "assignments_insert_update_ops_office_admin"
  on public.assignments for insert
  with check (
    public.current_app_role() in ('admin', 'office', 'operations')
  );

create policy "assignments_update_ops_office_admin"
  on public.assignments for update
  using (
    public.current_app_role() in ('admin', 'office', 'operations')
  );

create policy "assignments_delete_admin"
  on public.assignments for delete
  using (public.current_app_role() = 'admin');

-- -----------------------------------------------------------------------------
-- Policies: trucks
-- -----------------------------------------------------------------------------
create policy "trucks_select_authenticated"
  on public.trucks for select
  using (
    auth.uid() is not null
    and public.current_app_role() in (
      'admin', 'office', 'operations', 'warehouse', 'field'
    )
  );

create policy "trucks_insert_update_ops_wh_admin"
  on public.trucks for insert
  with check (
    public.current_app_role() in ('admin', 'operations', 'warehouse')
  );

create policy "trucks_update_ops_wh_admin"
  on public.trucks for update
  using (
    public.current_app_role() in ('admin', 'operations', 'warehouse')
  );

create policy "trucks_delete_admin"
  on public.trucks for delete
  using (public.current_app_role() = 'admin');

-- -----------------------------------------------------------------------------
-- Policies: payments (office + admin only)
-- -----------------------------------------------------------------------------
create policy "payments_select_office_admin"
  on public.payments for select
  using (public.current_app_role() in ('admin', 'office'));

create policy "payments_insert_update_office_admin"
  on public.payments for insert
  with check (public.current_app_role() in ('admin', 'office'));

create policy "payments_update_office_admin"
  on public.payments for update
  using (public.current_app_role() in ('admin', 'office'));

create policy "payments_delete_admin"
  on public.payments for delete
  using (public.current_app_role() = 'admin');
