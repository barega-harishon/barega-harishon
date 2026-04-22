-- Fix RLS recursion on public.employees for field users.
-- Root cause: employees_select_field_team queried public.employees (e_self)
-- while being evaluated on public.employees itself.

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
        join public.assignments a_other on a_other.project_id = a_self.project_id
        where a_self.employee_id = public.current_user_employee_id()
          and a_other.employee_id = employees.id
      )
    )
  );

comment on policy "employees_select_field_team" on public.employees is
  'Field can see own employee row and coworkers on shared assigned projects (no recursive self-join on employees).';
