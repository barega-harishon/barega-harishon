-- Equipment purchase batches and warehouse/project picking transactions.

create table if not exists public.equipment_purchase_batches (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment (id) on delete cascade,
  purchased_at date not null,
  quantity integer not null check (quantity > 0),
  unit_cost numeric(12, 2) not null default 0 check (unit_cost >= 0),
  supplier_name text,
  reference_no text,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists equipment_purchase_batches_equipment_id_idx
  on public.equipment_purchase_batches (equipment_id);
create index if not exists equipment_purchase_batches_purchased_at_idx
  on public.equipment_purchase_batches (purchased_at desc);

create table if not exists public.equipment_pick_transactions (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment (id) on delete restrict,
  project_id uuid references public.projects (id) on delete cascade,
  batch_id uuid not null references public.equipment_purchase_batches (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  source text not null check (source in ('project', 'warehouse')),
  note text,
  picked_by uuid references public.profiles (id) on delete set null,
  picked_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists equipment_pick_transactions_equipment_id_idx
  on public.equipment_pick_transactions (equipment_id);
create index if not exists equipment_pick_transactions_project_id_idx
  on public.equipment_pick_transactions (project_id);
create index if not exists equipment_pick_transactions_batch_id_idx
  on public.equipment_pick_transactions (batch_id);
create index if not exists equipment_pick_transactions_source_idx
  on public.equipment_pick_transactions (source);

alter table public.equipment_purchase_batches enable row level security;
alter table public.equipment_pick_transactions enable row level security;

create policy "equipment_batches_select_authenticated"
  on public.equipment_purchase_batches for select
  using (
    auth.uid() is not null
    and public.current_app_role() in ('admin', 'office', 'operations', 'warehouse', 'field')
  );

create policy "equipment_batches_insert_manage_roles"
  on public.equipment_purchase_batches for insert
  with check (public.current_app_role() in ('admin', 'office', 'warehouse'));

create policy "equipment_batches_update_manage_roles"
  on public.equipment_purchase_batches for update
  using (public.current_app_role() in ('admin', 'office', 'warehouse'))
  with check (public.current_app_role() in ('admin', 'office', 'warehouse'));

create policy "equipment_batches_delete_admin"
  on public.equipment_purchase_batches for delete
  using (public.current_app_role() = 'admin');

create policy "equipment_pick_tx_select_role_based"
  on public.equipment_pick_transactions for select
  using (
    auth.uid() is not null
    and (
      public.current_app_role() in ('admin', 'office', 'operations', 'warehouse')
      or (
        public.current_app_role() = 'field'
        and project_id is not null
        and public.is_project_assigned_to_me(project_id)
      )
    )
  );

create policy "equipment_pick_tx_insert_role_based"
  on public.equipment_pick_transactions for insert
  with check (
    (
      source = 'warehouse'
      and public.current_app_role() in ('admin', 'office', 'warehouse')
      and project_id is null
    )
    or (
      source = 'project'
      and public.current_app_role() in ('admin', 'office', 'operations', 'warehouse')
      and project_id is not null
    )
  );

create policy "equipment_pick_tx_delete_admin"
  on public.equipment_pick_transactions for delete
  using (public.current_app_role() = 'admin');

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
  select coalesce(sum(t.quantity), 0)::integer into v_sum
  from public.equipment_pick_transactions t
  where t.project_id = p_project_id
    and t.equipment_id = p_equipment_id
    and t.source = 'project';

  update public.project_equipment
  set picked_qty = v_sum
  where project_id = p_project_id
    and equipment_id = p_equipment_id;
end;
$$;

create or replace function public.on_equipment_pick_tx_change_sync_project_equipment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') and new.project_id is not null and new.source = 'project' then
    perform public.sync_project_equipment_picked_qty(new.project_id, new.equipment_id);
  end if;

  if tg_op in ('UPDATE', 'DELETE') and old.project_id is not null and old.source = 'project' then
    perform public.sync_project_equipment_picked_qty(old.project_id, old.equipment_id);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_equipment_pick_tx_sync_project_equipment
  on public.equipment_pick_transactions;
create trigger trg_equipment_pick_tx_sync_project_equipment
after insert or update or delete on public.equipment_pick_transactions
for each row
execute procedure public.on_equipment_pick_tx_change_sync_project_equipment();
