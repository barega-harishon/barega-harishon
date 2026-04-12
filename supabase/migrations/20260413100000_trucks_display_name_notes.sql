-- Friendly name and internal notes for trucks (UI + project assignment).

alter table public.trucks
  add column if not exists display_name text not null default '',
  add column if not exists notes text;

comment on column public.trucks.display_name is 'שם תצוגה (למשל כינוי צוות); אם ריק מציגים רישוי.';
comment on column public.trucks.notes is 'הערות פנימיות על המשאית.';
