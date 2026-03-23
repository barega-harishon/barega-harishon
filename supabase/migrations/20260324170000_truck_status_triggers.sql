-- טריגרים: סנכרון סטטוס משאית גם בעריכה ישירה ב-DB / בלי קוד אפליקציה.
-- תלוי ב־refresh_truck_status_from_projects (מיגרציה קודמת).

create or replace function public.project_trucks_refresh_truck_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_truck_status_from_projects(old.truck_id);
  elsif tg_op = 'INSERT' then
    perform public.refresh_truck_status_from_projects(new.truck_id);
  elsif tg_op = 'UPDATE' then
    if old.truck_id is distinct from new.truck_id then
      perform public.refresh_truck_status_from_projects(old.truck_id);
      perform public.refresh_truck_status_from_projects(new.truck_id);
    else
      perform public.refresh_truck_status_from_projects(new.truck_id);
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger project_trucks_after_write_refresh_truck
  after insert or update or delete on public.project_trucks
  for each row
  execute procedure public.project_trucks_refresh_truck_status();

create or replace function public.projects_status_refresh_truck_assignments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid;
begin
  if old.status is distinct from new.status then
    for tid in
      select pt.truck_id
      from public.project_trucks pt
      where pt.project_id = new.id
    loop
      perform public.refresh_truck_status_from_projects(tid);
    end loop;
  end if;
  return new;
end;
$$;

create trigger projects_after_status_change_refresh_trucks
  after update of status on public.projects
  for each row
  execute procedure public.projects_status_refresh_truck_assignments();

comment on function public.project_trucks_refresh_truck_status() is
  'אחרי שינוי ב־project_trucks — מרענן סטטוס משאית (דרך refresh_truck_status_from_projects).';

comment on function public.projects_status_refresh_truck_assignments() is
  'אחרי שינוי status בפרויקט — מרענן סטטוס לכל משאית משובצת לפרויקט.';
