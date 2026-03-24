alter table public.employees
  add column if not exists documents_paths text[] not null default '{}'::text[],
  add column if not exists licenses_paths text[] not null default '{}'::text[];

comment on column public.employees.documents_paths is 'נתיבי קבצי מסמכים (Storage)';
comment on column public.employees.licenses_paths is 'נתיבי קבצי רשיונות (Storage)';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select 'employee-files',
       'employee-files',
       false,
       10485760,
       array[
         'application/pdf',
         'image/jpeg',
         'image/png',
         'image/webp',
         'application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'text/plain'
       ]::text[]
where not exists (select 1 from storage.buckets where id = 'employee-files');

drop policy if exists "employee_files_select" on storage.objects;
drop policy if exists "employee_files_insert" on storage.objects;
drop policy if exists "employee_files_update" on storage.objects;
drop policy if exists "employee_files_delete" on storage.objects;

create policy "employee_files_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'employee-files'
    and name ~ '^[0-9a-fA-F-]{36}/'
    and exists (
      select 1
      from public.employees e
      where e.id = substring(name from 1 for 36)::uuid
        and public.current_app_role() in ('admin', 'office', 'operations')
    )
  );

create policy "employee_files_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'employee-files'
    and name ~ '^[0-9a-fA-F-]{36}/'
    and exists (
      select 1
      from public.employees e
      where e.id = substring(name from 1 for 36)::uuid
        and public.current_app_role() in ('admin', 'office', 'operations')
    )
  );

create policy "employee_files_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'employee-files'
    and name ~ '^[0-9a-fA-F-]{36}/'
    and exists (
      select 1
      from public.employees e
      where e.id = substring(name from 1 for 36)::uuid
        and public.current_app_role() in ('admin', 'office', 'operations')
    )
  )
  with check (
    bucket_id = 'employee-files'
    and name ~ '^[0-9a-fA-F-]{36}/'
    and exists (
      select 1
      from public.employees e
      where e.id = substring(name from 1 for 36)::uuid
        and public.current_app_role() in ('admin', 'office', 'operations')
    )
  );

create policy "employee_files_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'employee-files'
    and name ~ '^[0-9a-fA-F-]{36}/'
    and exists (
      select 1
      from public.employees e
      where e.id = substring(name from 1 for 36)::uuid
        and public.current_app_role() in ('admin', 'office', 'operations')
    )
  );
