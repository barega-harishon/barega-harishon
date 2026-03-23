-- Office / operations can maintain the equipment catalog (MVP).
-- Field staff remains read-only via existing SELECT policy.

drop policy if exists "equipment_insert_admin" on public.equipment;

create policy "equipment_insert_office_ops_admin"
  on public.equipment for insert
  with check (
    public.current_app_role() in ('admin', 'office', 'operations')
  );

drop policy if exists "equipment_update_warehouse_admin" on public.equipment;

create policy "equipment_update_staff"
  on public.equipment for update
  using (
    public.current_app_role() in ('admin', 'office', 'operations', 'warehouse')
  );
