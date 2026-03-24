-- Centralized request rate limit for public inquiry flow.

create table if not exists public.request_rate_limits (
  key text primary key,
  window_start timestamptz not null,
  count integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists request_rate_limits_window_start_idx
  on public.request_rate_limits (window_start);

alter table public.request_rate_limits enable row level security;

create policy "request_rate_limits_deny_all"
  on public.request_rate_limits
  for all
  using (false)
  with check (false);
