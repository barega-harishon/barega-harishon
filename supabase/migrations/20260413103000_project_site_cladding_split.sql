-- Split cladding into carpet + fabric swatch values (text, same as legacy cladding_color).

alter table public.project_site_details
  add column if not exists carpet_cladding_color text,
  add column if not exists fabric_cladding_color text;

update public.project_site_details
set
  carpet_cladding_color = coalesce(nullif(trim(carpet_cladding_color), ''), cladding_color),
  fabric_cladding_color = coalesce(nullif(trim(fabric_cladding_color), ''), cladding_color)
where cladding_color is not null
  and trim(coalesce(cladding_color, '')) <> '';

comment on column public.project_site_details.carpet_cladding_color is 'צבע שטיח (חיפוי)';
comment on column public.project_site_details.fabric_cladding_color is 'צבע בד (חיפוי)';
