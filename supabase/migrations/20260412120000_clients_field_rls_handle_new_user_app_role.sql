-- Tighten clients SELECT for field staff (assigned projects only) and allow
-- initial app_role from auth app_metadata on signup (set via Admin API only).

-- -----------------------------------------------------------------------------
-- clients: replace broad SELECT with role-based policy
-- -----------------------------------------------------------------------------
drop policy if exists "clients_select_authenticated" on public.clients;

create policy "clients_select_role_based"
  on public.clients for select
  using (
    auth.uid() is not null
    and (
      public.current_app_role() in ('admin', 'office', 'operations', 'warehouse')
      or (
        public.current_app_role() = 'field'
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

-- -----------------------------------------------------------------------------
-- New auth users: optional app_role from app_metadata (invite / Admin API)
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role text;
  resolved_role public.app_role;
begin
  meta_role := nullif(trim(coalesce(new.raw_app_meta_data ->> 'app_role', '')), '');

  if meta_role in ('admin', 'office', 'operations', 'warehouse', 'field') then
    resolved_role := meta_role::public.app_role;
  else
    resolved_role := 'field'::public.app_role;
  end if;

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    resolved_role
  );
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates profiles row; role from raw_app_meta_data.app_role when valid, else field. Set app_role via Supabase Admin API (app_metadata), not user-controlled signup metadata.';
