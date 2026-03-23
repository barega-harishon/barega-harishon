-- Allow office/operations to delete project equipment lines (not only admin).

drop policy if exists "project_equipment_delete_admin" on public.project_equipment;

create policy "project_equipment_delete_office_ops_admin"
  on public.project_equipment for delete
  using (public.current_app_role() in ('admin', 'office', 'operations'));
