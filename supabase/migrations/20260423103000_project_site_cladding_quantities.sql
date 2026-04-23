alter table public.project_site_details
  add column if not exists carpet_cladding_meters numeric(10, 2),
  add column if not exists carpet_cladding_rolls integer,
  add column if not exists fabric_cladding_meters numeric(10, 2),
  add column if not exists fabric_cladding_rolls integer;

alter table public.project_site_details
  drop constraint if exists project_site_details_carpet_cladding_meters_check,
  add constraint project_site_details_carpet_cladding_meters_check
    check (carpet_cladding_meters is null or carpet_cladding_meters >= 0);

alter table public.project_site_details
  drop constraint if exists project_site_details_carpet_cladding_rolls_check,
  add constraint project_site_details_carpet_cladding_rolls_check
    check (carpet_cladding_rolls is null or carpet_cladding_rolls >= 0);

alter table public.project_site_details
  drop constraint if exists project_site_details_fabric_cladding_meters_check,
  add constraint project_site_details_fabric_cladding_meters_check
    check (fabric_cladding_meters is null or fabric_cladding_meters >= 0);

alter table public.project_site_details
  drop constraint if exists project_site_details_fabric_cladding_rolls_check,
  add constraint project_site_details_fabric_cladding_rolls_check
    check (fabric_cladding_rolls is null or fabric_cladding_rolls >= 0);
