-- סנכרון trucks.status עם שיבוצים לפרויקטים שאינם סגורים.
-- SECURITY DEFINER: משרד יכול לסגור פרויקט בלי הרשאת UPDATE על trucks ב-RLS.

create or replace function public.refresh_truck_status_from_projects(p_truck_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cur text;
  has_active boolean;
begin
  select t.status into cur
  from public.trucks t
  where t.id = p_truck_id;

  if not found then
    return;
  end if;

  if cur = 'maintenance' then
    return;
  end if;

  select exists (
    select 1
    from public.project_trucks pt
    inner join public.projects p on p.id = pt.project_id
    where pt.truck_id = p_truck_id
      and p.status <> 'closed'::public.project_status
  ) into has_active;

  if has_active then
    if cur is distinct from 'in_use' then
      update public.trucks
      set status = 'in_use'
      where id = p_truck_id;
    end if;
  else
    if cur = 'in_use' then
      update public.trucks
      set status = 'available'
      where id = p_truck_id;
    end if;
  end if;
end;
$$;

comment on function public.refresh_truck_status_from_projects(uuid) is
  'מעדכן סטטוס משאית לפי שיבוצים פעילים; לא משנה maintenance.';

grant execute on function public.refresh_truck_status_from_projects(uuid) to authenticated;
