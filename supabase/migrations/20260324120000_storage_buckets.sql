-- Buckets for project site photos and sketches (private; access via signed URLs in app)
-- Run after initial schema migration.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select 'project-site-photos',
       'project-site-photos',
       false,
       5242880,
       array['image/jpeg', 'image/png', 'image/webp']::text[]
where not exists (select 1 from storage.buckets where id = 'project-site-photos');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select 'project-sketches',
       'project-sketches',
       false,
       8388608,
       array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
where not exists (select 1 from storage.buckets where id = 'project-sketches');

-- Policies: any authenticated user can manage objects (single-tenant MVP).
-- Tighten later with path checks / roles.

drop policy if exists "project_site_photos_select" on storage.objects;
create policy "project_site_photos_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'project-site-photos');

drop policy if exists "project_site_photos_insert" on storage.objects;
create policy "project_site_photos_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'project-site-photos');

drop policy if exists "project_site_photos_update" on storage.objects;
create policy "project_site_photos_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'project-site-photos');

drop policy if exists "project_site_photos_delete" on storage.objects;
create policy "project_site_photos_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'project-site-photos');

drop policy if exists "project_sketches_select" on storage.objects;
create policy "project_sketches_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'project-sketches');

drop policy if exists "project_sketches_insert" on storage.objects;
create policy "project_sketches_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'project-sketches');

drop policy if exists "project_sketches_update" on storage.objects;
create policy "project_sketches_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'project-sketches');

drop policy if exists "project_sketches_delete" on storage.objects;
create policy "project_sketches_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'project-sketches');
