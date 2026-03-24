create table if not exists public.employee_file_events (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  event_type text not null check (event_type in ('upload_documents', 'upload_licenses', 'delete_documents', 'delete_licenses')),
  file_path text not null,
  actor_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists employee_file_events_employee_id_created_at_idx
  on public.employee_file_events (employee_id, created_at desc);

alter table public.employee_file_events enable row level security;

drop policy if exists "employee_file_events_select_staff" on public.employee_file_events;
create policy "employee_file_events_select_staff"
  on public.employee_file_events for select
  using (public.current_app_role() in ('admin', 'office', 'operations'));

drop policy if exists "employee_file_events_insert_staff" on public.employee_file_events;
create policy "employee_file_events_insert_staff"
  on public.employee_file_events for insert
  with check (public.current_app_role() in ('admin', 'office', 'operations'));
