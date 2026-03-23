-- עובד שטח משובץ: עדכון סטטוס פרויקט בשלבים תפעוליים בלבד (לא הצעה/סגירה וכו׳).

create policy "projects_update_field_assigned_operational"
  on public.projects for update
  using (
    auth.uid() is not null
    and public.current_app_role() = 'field'
    and public.is_project_assigned_to_me(projects.id)
    and projects.status in ('approved', 'prep', 'setup', 'teardown')
  )
  with check (
    auth.uid() is not null
    and public.current_app_role() = 'field'
    and public.is_project_assigned_to_me(projects.id)
    and projects.status in ('prep', 'setup', 'teardown')
  );

comment on policy "projects_update_field_assigned_operational" on public.projects is
  'שטח משובץ: מעבר ל־prep/setup/teardown בלבד, רק כשהפרויקט כבר מאושר או בתהליך תפעול.';
