-- Mapping table between internal project milestones and Google Calendar events.

create table if not exists public.project_google_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  milestone_type text not null check (milestone_type in ('setup', 'event', 'teardown')),
  google_event_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, milestone_type)
);

create index if not exists project_google_events_google_event_id_idx
  on public.project_google_events (google_event_id);

create or replace function public.set_project_google_events_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists project_google_events_set_updated_at on public.project_google_events;
create trigger project_google_events_set_updated_at
before update on public.project_google_events
for each row
execute procedure public.set_project_google_events_updated_at();

alter table public.project_google_events enable row level security;

drop policy if exists "project_google_events_select_admin_office" on public.project_google_events;
create policy "project_google_events_select_admin_office"
  on public.project_google_events for select
  using (
    public.current_has_any_app_role(array['admin'::public.app_role, 'office'::public.app_role])
  );

drop policy if exists "project_google_events_modify_admin_only" on public.project_google_events;
create policy "project_google_events_modify_admin_only"
  on public.project_google_events for all
  using (public.current_has_any_app_role(array['admin'::public.app_role]))
  with check (public.current_has_any_app_role(array['admin'::public.app_role]));
