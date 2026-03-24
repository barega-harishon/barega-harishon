alter table public.clients
add column if not exists national_id text;

update public.clients
set national_id = nullif(regexp_replace(coalesce(national_id, ''), '\D', '', 'g'), '');

create index if not exists clients_national_id_idx
  on public.clients (national_id);

create unique index if not exists clients_national_id_unique_not_null_idx
  on public.clients (national_id)
  where national_id is not null and national_id <> '';
