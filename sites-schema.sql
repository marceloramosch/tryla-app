-- ============================================================
--  TRYLA SITES — esquema de Supabase
--  Corre esto UNA vez en el SQL Editor de tu proyecto de
--  Supabase (el mismo que usa TrylApp: dcuescldzrgcppubcoxq).
--
--  Crea la tabla donde vive cada micrositio de restaurante y el
--  bucket de Storage donde se suben sus fotos/logo. Los sitios
--  publicados (published = true) son legibles de forma anonima
--  (para que el sitio publico en *.thetryla.com pueda leerlos sin
--  iniciar sesion); solo el equipo de Tryla (usuarios autenticados
--  del CRM) puede crear/editar/borrar.
-- ============================================================

create table if not exists public.tryla_sites (
  id uuid primary key default gen_random_uuid(),
  subdomain text unique not null,             -- ej. "tacos-el-sol"  ->  tacos-el-sol.thetryla.com
  restaurant_name text not null,
  tagline text,
  description text,
  logo_url text,
  hero_image_url text,
  gallery jsonb not null default '[]',         -- ["https://.../foto1.jpg", ...]
  menu jsonb not null default '[]',            -- [{"name":"Taco al pastor","price":"3.50","desc":"..."}]
  hours text,
  phone text,
  email text,
  address text,
  instagram text,
  facebook text,
  tiktok text,
  template text not null default 'kit-classic',
  kit_included boolean not null default true,  -- viene con el "kit" de fotos/assets del trailer
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tryla_sites_subdomain_idx on public.tryla_sites (subdomain);

alter table public.tryla_sites enable row level security;

drop policy if exists "public can read published sites" on public.tryla_sites;
create policy "public can read published sites"
  on public.tryla_sites for select
  to anon
  using (published = true);

drop policy if exists "authenticated staff full access to sites" on public.tryla_sites;
create policy "authenticated staff full access to sites"
  on public.tryla_sites for all
  to authenticated
  using (true)
  with check (true);

-- ---- Storage: bucket publico para logos / fotos de cada sitio ----
insert into storage.buckets (id, name, public)
values ('site-images', 'site-images', true)
on conflict (id) do nothing;

drop policy if exists "public read site-images" on storage.objects;
create policy "public read site-images"
  on storage.objects for select
  to public
  using (bucket_id = 'site-images');

drop policy if exists "authenticated upload site-images" on storage.objects;
create policy "authenticated upload site-images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'site-images');

drop policy if exists "authenticated update site-images" on storage.objects;
create policy "authenticated update site-images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'site-images');

drop policy if exists "authenticated delete site-images" on storage.objects;
create policy "authenticated delete site-images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'site-images');
