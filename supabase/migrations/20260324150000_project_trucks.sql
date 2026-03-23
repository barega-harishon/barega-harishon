-- שיוך משאיות לפרויקטים (M–N). משאית אחת לא אמורה להיות על שני פרויקטים פעילים — נאכף באפליקציה.

create table public.project_trucks (
  project_id uuid not null references public.projects (id) on delete cascade,
  truck_id uuid not null references public.trucks (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, truck_id)
);

create index project_trucks_truck_id_idx on public.project_trucks (truck_id);
create index project_trucks_project_id_idx on public.project_trucks (project_id);

alter table public.project_trucks enable row level security;

create policy "project_trucks_select_via_project"
  on public.project_trucks for select
  using (
    auth.uid() is not null
    and (
      public.current_app_role() in ('admin', 'office', 'operations', 'warehouse')
      or (
        public.current_app_role() = 'field'
        and public.is_project_assigned_to_me(project_trucks.project_id)
      )
    )
  );

create policy "project_trucks_insert_office_ops_admin"
  on public.project_trucks for insert
  with check (public.current_app_role() in ('admin', 'office', 'operations'));

create policy "project_trucks_delete_office_ops_admin"
  on public.project_trucks for delete
  using (public.current_app_role() in ('admin', 'office', 'operations'));
