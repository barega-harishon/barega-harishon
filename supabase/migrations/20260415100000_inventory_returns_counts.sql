-- Add return/adjustment support for stock transactions + inventory count tables.

alter table public.equipment_pick_transactions
  add column if not exists tx_type text;

update public.equipment_pick_transactions
set tx_type = 'pick'
where tx_type is null;

alter table public.equipment_pick_transactions
  alter column tx_type set not null;

alter table public.equipment_pick_transactions
  add column if not exists adjustment_direction text;

alter table public.equipment_pick_transactions
  alter column batch_id drop not null;

alter table public.equipment_pick_transactions
  drop constraint if exists equipment_pick_transactions_tx_type_check;

alter table public.equipment_pick_transactions
  add constraint equipment_pick_transactions_tx_type_check
  check (tx_type in ('pick', 'return', 'adjustment'));

alter table public.equipment_pick_transactions
  drop constraint if exists equipment_pick_transactions_adjustment_direction_check;

alter table public.equipment_pick_transactions
  add constraint equipment_pick_transactions_adjustment_direction_check
  check (
    adjustment_direction is null
    or adjustment_direction in ('in', 'out')
  );

alter table public.equipment_pick_transactions
  drop constraint if exists equipment_pick_transactions_tx_shape_check;

alter table public.equipment_pick_transactions
  add constraint equipment_pick_transactions_tx_shape_check
  check (
    (
      tx_type = 'pick'
      and source in ('project', 'warehouse')
      and (
        (source = 'project' and project_id is not null and batch_id is not null)
        or (source = 'warehouse' and project_id is null and batch_id is not null)
      )
      and adjustment_direction is null
    )
    or (
      tx_type = 'return'
      and source = 'project'
      and project_id is not null
      and batch_id is not null
      and adjustment_direction is null
    )
    or (
      tx_type = 'adjustment'
      and source = 'warehouse'
      and project_id is null
      and adjustment_direction in ('in', 'out')
    )
  );

create table if not exists public.inventory_counts (
  id uuid primary key default gen_random_uuid(),
  note text,
  status text not null default 'draft' check (status in ('draft', 'posted')),
  counted_by uuid references public.profiles (id) on delete set null,
  posted_by uuid references public.profiles (id) on delete set null,
  posted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_count_lines (
  id uuid primary key default gen_random_uuid(),
  count_id uuid not null references public.inventory_counts (id) on delete cascade,
  equipment_id uuid not null references public.equipment (id) on delete restrict,
  expected_qty integer not null check (expected_qty >= 0),
  counted_qty integer not null check (counted_qty >= 0),
  delta_qty integer generated always as (counted_qty - expected_qty) stored,
  created_at timestamptz not null default now(),
  unique (count_id, equipment_id)
);

create index if not exists inventory_count_lines_count_id_idx
  on public.inventory_count_lines (count_id);
create index if not exists inventory_count_lines_equipment_id_idx
  on public.inventory_count_lines (equipment_id);

alter table public.inventory_counts enable row level security;
alter table public.inventory_count_lines enable row level security;

drop policy if exists "inventory_counts_select_staff" on public.inventory_counts;
create policy "inventory_counts_select_staff"
  on public.inventory_counts for select
  using (
    public.current_has_any_app_role(
      array['admin'::public.app_role, 'office'::public.app_role, 'warehouse'::public.app_role]
    )
  );

drop policy if exists "inventory_counts_insert_staff" on public.inventory_counts;
create policy "inventory_counts_insert_staff"
  on public.inventory_counts for insert
  with check (
    public.current_has_any_app_role(
      array['admin'::public.app_role, 'office'::public.app_role, 'warehouse'::public.app_role]
    )
  );

drop policy if exists "inventory_counts_update_staff" on public.inventory_counts;
create policy "inventory_counts_update_staff"
  on public.inventory_counts for update
  using (
    public.current_has_any_app_role(
      array['admin'::public.app_role, 'office'::public.app_role, 'warehouse'::public.app_role]
    )
  )
  with check (
    public.current_has_any_app_role(
      array['admin'::public.app_role, 'office'::public.app_role, 'warehouse'::public.app_role]
    )
  );

drop policy if exists "inventory_count_lines_select_staff" on public.inventory_count_lines;
create policy "inventory_count_lines_select_staff"
  on public.inventory_count_lines for select
  using (
    public.current_has_any_app_role(
      array['admin'::public.app_role, 'office'::public.app_role, 'warehouse'::public.app_role]
    )
  );

drop policy if exists "inventory_count_lines_insert_staff" on public.inventory_count_lines;
create policy "inventory_count_lines_insert_staff"
  on public.inventory_count_lines for insert
  with check (
    public.current_has_any_app_role(
      array['admin'::public.app_role, 'office'::public.app_role, 'warehouse'::public.app_role]
    )
  );

drop policy if exists "inventory_count_lines_update_staff" on public.inventory_count_lines;
create policy "inventory_count_lines_update_staff"
  on public.inventory_count_lines for update
  using (
    public.current_has_any_app_role(
      array['admin'::public.app_role, 'office'::public.app_role, 'warehouse'::public.app_role]
    )
  )
  with check (
    public.current_has_any_app_role(
      array['admin'::public.app_role, 'office'::public.app_role, 'warehouse'::public.app_role]
    )
  );

drop policy if exists "equipment_pick_tx_insert_role_based" on public.equipment_pick_transactions;
create policy "equipment_pick_tx_insert_role_based"
  on public.equipment_pick_transactions for insert
  with check (
    (
      tx_type = 'pick'
      and source = 'warehouse'
      and batch_id is not null
      and project_id is null
      and public.current_has_any_app_role(
        array['admin'::public.app_role, 'office'::public.app_role, 'warehouse'::public.app_role]
      )
    )
    or (
      tx_type = 'pick'
      and source = 'project'
      and batch_id is not null
      and project_id is not null
      and public.current_has_any_app_role(
        array['admin'::public.app_role, 'office'::public.app_role, 'operations'::public.app_role, 'warehouse'::public.app_role]
      )
    )
    or (
      tx_type = 'return'
      and source = 'project'
      and batch_id is not null
      and project_id is not null
      and public.current_has_any_app_role(
        array['admin'::public.app_role, 'office'::public.app_role, 'warehouse'::public.app_role]
      )
    )
    or (
      tx_type = 'adjustment'
      and source = 'warehouse'
      and project_id is null
      and adjustment_direction in ('in', 'out')
      and public.current_has_any_app_role(
        array['admin'::public.app_role, 'office'::public.app_role, 'warehouse'::public.app_role]
      )
    )
  );

create or replace function public.sync_project_equipment_picked_qty(
  p_project_id uuid,
  p_equipment_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sum integer;
begin
  select coalesce(
    sum(
      case
        when t.tx_type = 'return' then -t.quantity
        when t.tx_type = 'pick' then t.quantity
        else 0
      end
    ),
    0
  )::integer
  into v_sum
  from public.equipment_pick_transactions t
  where t.project_id = p_project_id
    and t.equipment_id = p_equipment_id
    and t.source = 'project';

  update public.project_equipment
  set picked_qty = greatest(v_sum, 0)
  where project_id = p_project_id
    and equipment_id = p_equipment_id;
end;
$$;
