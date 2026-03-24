-- Add incoming requests status and restrict access to admin/office.

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'project_status'
      and e.enumlabel = 'incoming'
  ) then
    alter type public.project_status add value 'incoming' before 'quote';
  end if;
end $$;

drop policy if exists "projects_select_role_based" on public.projects;
create policy "projects_select_role_based"
  on public.projects for select
  using (
    auth.uid() is not null
    and (
      public.current_app_role() in ('admin', 'office')
      or (
        public.current_app_role() in ('operations', 'warehouse')
        and projects.status::text <> 'incoming'
      )
      or (
        public.current_app_role() = 'field'
        and projects.status::text <> 'incoming'
        and public.is_project_assigned_to_me(projects.id)
      )
    )
  );

drop policy if exists "projects_insert_office_ops_admin" on public.projects;
create policy "projects_insert_office_ops_admin"
  on public.projects for insert
  with check (
    public.current_app_role() in ('admin', 'office')
    or (
      public.current_app_role() = 'operations'
      and status::text <> 'incoming'
    )
  );

drop policy if exists "projects_update_office_ops_admin" on public.projects;
create policy "projects_update_office_ops_admin"
  on public.projects for update
  using (
    public.current_app_role() in ('admin', 'office')
    or (
      public.current_app_role() = 'operations'
      and projects.status::text <> 'incoming'
    )
  )
  with check (
    public.current_app_role() in ('admin', 'office')
    or (
      public.current_app_role() = 'operations'
      and status::text <> 'incoming'
    )
  );
