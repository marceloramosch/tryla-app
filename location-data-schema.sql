-- ============================================================
--  LOCATION INTELLIGENCE — datos reales (OpenStreetMap)
--  Corre esto UNA vez en el SQL Editor de tu proyecto de
--  Supabase (el mismo que usa TrylApp: dcuescldzrgcppubcoxq),
--  despues de client-auth-schema.sql.
--
--  Guarda los restaurantes y "anclas" de trafico (gasolineras,
--  iglesias, bares, clubes, estadios, plazas, cines) que se
--  jalan de OpenStreetMap (Overpass API, gratis, sin llave) via
--  la Edge Function "sync-places". Location Intelligence lee
--  esta tabla para calcular el score con datos reales en vez de
--  el estimado simulado de antes.
--
--  li_coverage_areas lleva registro de que zonas ya se jalaron
--  y cuando, para no repetir trabajo si mas adelante se expande
--  de Dallas a todo Texas (solo se jalan las zonas nuevas).
-- ============================================================

create table if not exists public.li_places (
  id bigint generated always as identity primary key,
  osm_type text not null,
  osm_id bigint not null,
  category text not null, -- restaurant | fuel | worship | bar | nightclub | stadium | mall | entertainment
  name text,
  cuisine text,
  lat double precision not null,
  lon double precision not null,
  city text,
  state text,
  tags jsonb,
  pulled_at timestamptz not null default now(),
  unique (osm_type, osm_id)
);

create index if not exists li_places_lat_lon_idx on public.li_places (lat, lon);
create index if not exists li_places_category_idx on public.li_places (category);

alter table public.li_places enable row level security;

drop policy if exists "anyone can read li_places" on public.li_places;
create policy "anyone can read li_places"
  on public.li_places for select
  to anon, authenticated
  using (true);

drop policy if exists "staff manage li_places" on public.li_places;
create policy "staff manage li_places"
  on public.li_places for all
  to authenticated
  using (exists (select 1 from public.staff_users su where su.user_id = auth.uid()))
  with check (exists (select 1 from public.staff_users su where su.user_id = auth.uid()));

create table if not exists public.li_coverage_areas (
  id bigint generated always as identity primary key,
  area_name text not null unique, -- ej. 'dallas-city'
  label text,
  bbox jsonb not null, -- {"south":.., "west":.., "north":.., "east":..}
  place_count int not null default 0,
  pulled_at timestamptz not null default now()
);

alter table public.li_coverage_areas enable row level security;

drop policy if exists "anyone can read li_coverage_areas" on public.li_coverage_areas;
create policy "anyone can read li_coverage_areas"
  on public.li_coverage_areas for select
  to anon, authenticated
  using (true);

drop policy if exists "staff manage li_coverage_areas" on public.li_coverage_areas;
create policy "staff manage li_coverage_areas"
  on public.li_coverage_areas for all
  to authenticated
  using (exists (select 1 from public.staff_users su where su.user_id = auth.uid()))
  with check (exists (select 1 from public.staff_users su where su.user_id = auth.uid()));
