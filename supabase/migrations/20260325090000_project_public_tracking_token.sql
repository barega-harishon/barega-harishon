-- קישור מעקב ללקוח: טוקן ייחודי לכל פרויקט (לא מנחשים בקלות).
alter table public.projects
  add column if not exists public_tracking_token uuid;

update public.projects
set public_tracking_token = gen_random_uuid()
where public_tracking_token is null;

alter table public.projects
  alter column public_tracking_token set default gen_random_uuid();

alter table public.projects
  alter column public_tracking_token set not null;

create unique index if not exists projects_public_tracking_token_uidx
  on public.projects (public_tracking_token);

comment on column public.projects.public_tracking_token is
  'טוקן לדף מעקב ציבורי ללקוח (/track/[token]) — ללא התחברות.';
