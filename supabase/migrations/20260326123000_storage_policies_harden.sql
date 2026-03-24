-- Harden storage access: authenticated users can access only project-scoped objects
-- they are allowed to see (role-based or assigned to project).

drop policy if exists "project_site_photos_select" on storage.objects;
drop policy if exists "project_site_photos_insert" on storage.objects;
drop policy if exists "project_site_photos_update" on storage.objects;
drop policy if exists "project_site_photos_delete" on storage.objects;

drop policy if exists "project_sketches_select" on storage.objects;
drop policy if exists "project_sketches_insert" on storage.objects;
drop policy if exists "project_sketches_update" on storage.objects;
drop policy if exists "project_sketches_delete" on storage.objects;

create policy "project_site_photos_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'project-site-photos'
    and name ~ '^[0-9a-fA-F-]{36}/'
    and exists (
      select 1
      from public.projects p
      where p.id = substring(name from 1 for 36)::uuid
        and (
          public.current_app_role() in ('admin', 'office', 'operations', 'warehouse')
          or public.is_project_assigned_to_me(p.id)
        )
    )
  );

create policy "project_site_photos_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-site-photos'
    and name ~ '^[0-9a-fA-F-]{36}/'
    and exists (
      select 1
      from public.projects p
      where p.id = substring(name from 1 for 36)::uuid
        and (
          public.current_app_role() in ('admin', 'office', 'operations', 'warehouse')
          or public.is_project_assigned_to_me(p.id)
        )
    )
  );

create policy "project_site_photos_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'project-site-photos'
    and name ~ '^[0-9a-fA-F-]{36}/'
    and exists (
      select 1
      from public.projects p
      where p.id = substring(name from 1 for 36)::uuid
        and (
          public.current_app_role() in ('admin', 'office', 'operations', 'warehouse')
          or public.is_project_assigned_to_me(p.id)
        )
    )
  )
  with check (
    bucket_id = 'project-site-photos'
    and name ~ '^[0-9a-fA-F-]{36}/'
    and exists (
      select 1
      from public.projects p
      where p.id = substring(name from 1 for 36)::uuid
        and (
          public.current_app_role() in ('admin', 'office', 'operations', 'warehouse')
          or public.is_project_assigned_to_me(p.id)
        )
    )
  );

create policy "project_site_photos_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-site-photos'
    and name ~ '^[0-9a-fA-F-]{36}/'
    and exists (
      select 1
      from public.projects p
      where p.id = substring(name from 1 for 36)::uuid
        and (
          public.current_app_role() in ('admin', 'office', 'operations', 'warehouse')
          or public.is_project_assigned_to_me(p.id)
        )
    )
  );

create policy "project_sketches_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'project-sketches'
    and name ~ '^[0-9a-fA-F-]{36}/'
    and exists (
      select 1
      from public.projects p
      where p.id = substring(name from 1 for 36)::uuid
        and (
          public.current_app_role() in ('admin', 'office', 'operations', 'warehouse')
          or public.is_project_assigned_to_me(p.id)
        )
    )
  );

create policy "project_sketches_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-sketches'
    and name ~ '^[0-9a-fA-F-]{36}/'
    and exists (
      select 1
      from public.projects p
      where p.id = substring(name from 1 for 36)::uuid
        and (
          public.current_app_role() in ('admin', 'office', 'operations', 'warehouse')
          or public.is_project_assigned_to_me(p.id)
        )
    )
  );

create policy "project_sketches_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'project-sketches'
    and name ~ '^[0-9a-fA-F-]{36}/'
    and exists (
      select 1
      from public.projects p
      where p.id = substring(name from 1 for 36)::uuid
        and (
          public.current_app_role() in ('admin', 'office', 'operations', 'warehouse')
          or public.is_project_assigned_to_me(p.id)
        )
    )
  )
  with check (
    bucket_id = 'project-sketches'
    and name ~ '^[0-9a-fA-F-]{36}/'
    and exists (
      select 1
      from public.projects p
      where p.id = substring(name from 1 for 36)::uuid
        and (
          public.current_app_role() in ('admin', 'office', 'operations', 'warehouse')
          or public.is_project_assigned_to_me(p.id)
        )
    )
  );

create policy "project_sketches_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-sketches'
    and name ~ '^[0-9a-fA-F-]{36}/'
    and exists (
      select 1
      from public.projects p
      where p.id = substring(name from 1 for 36)::uuid
        and (
          public.current_app_role() in ('admin', 'office', 'operations', 'warehouse')
          or public.is_project_assigned_to_me(p.id)
        )
    )
  );
