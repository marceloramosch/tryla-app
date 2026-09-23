-- ============================================================
--  CLIENT PORTAL — esquema de Supabase
--  Corre esto UNA vez en el SQL Editor de tu proyecto de
--  Supabase (el mismo que usa TrylApp: dcuescldzrgcppubcoxq).
--
--  Le da a cada cliente un link privado y persistente
--  (thetryla.com/?portal=<token>) para editar su propio sitio
--  (Web Builder) sin necesitar contraseña — mismo nivel de
--  seguridad que el link de "Compartir cotizacion": quien tenga
--  el link entra, sin sesion. El equipo genera el token desde la
--  pestaña Clientes de TrylApp.
--
--  El acceso a tryla_sites vía token NO se hace ampliando las
--  policies de esa tabla a "anon" (eso dejaria a cualquiera leer
--  o editar CUALQUIER sitio) — se hace con dos funciones
--  "security definer" que validan el token del lado del servidor
--  y solo tocan el subdominio que ese token tiene asignado.
-- ============================================================

create table if not exists public.client_portal (
  token text primary key,             -- va en la URL: thetryla.com/?portal=<token>
  client_name text not null,
  site_subdomain text not null,       -- que fila de tryla_sites controla este token
  state text,                         -- para la futura guia de permisos (paso 1)
  created_at timestamptz not null default now()
);

alter table public.client_portal enable row level security;

-- El equipo (autenticado) es el unico que crea/lista tokens de clientes.
-- El cliente NUNCA lee esta tabla directamente (ni con anon key): solo
-- pasa su token a las funciones de abajo, que lo validan internamente.
drop policy if exists "authenticated staff manage client portals" on public.client_portal;
create policy "authenticated staff manage client portals"
  on public.client_portal for all
  to authenticated
  using (true)
  with check (true);

-- ---- Acceso al sitio de un cliente, scoped por su token ----

-- Lee el sitio del cliente (publicado o no) si el token es valido.
create or replace function public.get_site_by_portal_token(p_token text)
returns public.tryla_sites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subdomain text;
  v_site public.tryla_sites;
begin
  select site_subdomain into v_subdomain
  from public.client_portal
  where token = p_token;

  if v_subdomain is null then
    return null;
  end if;

  select * into v_site from public.tryla_sites where subdomain = v_subdomain;
  return v_site;
end;
$$;

-- Crea o actualiza el sitio del cliente si el token es valido — el
-- subdominio SIEMPRE se resuelve del token en el servidor, nunca del
-- valor que mande el cliente, para que no pueda editar el sitio de otro.
create or replace function public.save_site_by_portal_token(p_token text, p_site jsonb)
returns public.tryla_sites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subdomain text;
  v_site public.tryla_sites;
begin
  select site_subdomain into v_subdomain
  from public.client_portal
  where token = p_token;

  if v_subdomain is null then
    raise exception 'invalid portal token';
  end if;

  insert into public.tryla_sites (
    subdomain, restaurant_name, tagline, description, logo_url, hero_image_url,
    gallery, menu, hours, phone, email, address, instagram, facebook, tiktok,
    template, kit_included, published, updated_at
  )
  values (
    v_subdomain,
    coalesce(p_site->>'restaurant_name', ''),
    p_site->>'tagline',
    p_site->>'description',
    p_site->>'logo_url',
    p_site->>'hero_image_url',
    coalesce(p_site->'gallery', '[]'::jsonb),
    coalesce(p_site->'menu', '[]'::jsonb),
    p_site->>'hours',
    p_site->>'phone',
    p_site->>'email',
    p_site->>'address',
    p_site->>'instagram',
    p_site->>'facebook',
    p_site->>'tiktok',
    coalesce(p_site->>'template', 'kit-classic'),
    coalesce((p_site->>'kit_included')::boolean, true),
    coalesce((p_site->>'published')::boolean, false),
    now()
  )
  on conflict (subdomain) do update set
    restaurant_name = excluded.restaurant_name,
    tagline = excluded.tagline,
    description = excluded.description,
    logo_url = excluded.logo_url,
    hero_image_url = excluded.hero_image_url,
    gallery = excluded.gallery,
    menu = excluded.menu,
    hours = excluded.hours,
    phone = excluded.phone,
    email = excluded.email,
    address = excluded.address,
    instagram = excluded.instagram,
    facebook = excluded.facebook,
    tiktok = excluded.tiktok,
    template = excluded.template,
    kit_included = excluded.kit_included,
    published = excluded.published,
    updated_at = now()
  returning * into v_site;

  return v_site;
end;
$$;

-- El cliente (anon) llama las funciones de arriba, nunca la tabla directo.
grant execute on function public.get_site_by_portal_token(text) to anon;
grant execute on function public.save_site_by_portal_token(text, jsonb) to anon;

-- ---- Fotos: el cliente sube directo al bucket "site-images" ----
-- Nota de seguridad: esto amplia el bucket (creado en sites-schema.sql)
-- para permitir subir a "anon", igual que ya permite leer. El riesgo es
-- el mismo nivel que el link de cotizacion compartida: no hay validacion
-- de token a nivel Storage (Supabase Storage RLS no puede validar un
-- token de texto simple sin una sesion real) — cualquiera podria subir
-- un archivo al bucket si conoce su nombre, aunque no pueda enlazarlo a
-- ningun sitio sin tambien tener un token valido para guardarlo via RPC.
drop policy if exists "anon upload site-images" on storage.objects;
create policy "anon upload site-images"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'site-images');
