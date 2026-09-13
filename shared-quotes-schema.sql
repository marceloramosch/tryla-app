-- ============================================================
--  COTIZACIONES COMPARTIDAS — esquema de Supabase
--  Corre esto UNA vez en el SQL Editor de tu proyecto de
--  Supabase (el mismo que usa TrylApp: dcuescldzrgcppubcoxq).
--
--  Guarda una "foto" (HTML ya renderizado) de una cotizacion
--  especifica cuando le das clic a "Compartir" en TrylApp, para
--  que cualquiera con el link (ej. en un anuncio de Facebook
--  Marketplace) la pueda ver y descargar/imprimir en thetryla.com
--  — sin iniciar sesion y sin exponer el resto de tus cotizaciones.
-- ============================================================

create table if not exists public.shared_quotes (
  id text primary key,          -- id corto y aleatorio, va en la URL: thetryla.com/?quote=<id>
  doc_html text not null,       -- la cotizacion ya renderizada (mismo HTML que ves en "Vista previa")
  cliente text,
  number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shared_quotes enable row level security;

drop policy if exists "public can read shared quotes" on public.shared_quotes;
create policy "public can read shared quotes"
  on public.shared_quotes for select
  to anon
  using (true);

drop policy if exists "authenticated staff can manage shared quotes" on public.shared_quotes;
create policy "authenticated staff can manage shared quotes"
  on public.shared_quotes for all
  to authenticated
  using (true)
  with check (true);
