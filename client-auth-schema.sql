-- ============================================================
--  CLIENT AUTH — esquema de Supabase
--  Corre esto UNA vez en el SQL Editor de tu proyecto de
--  Supabase (el mismo que usa TrylApp: dcuescldzrgcppubcoxq),
--  despues de orders-schema.sql.
--
--  Le da a TrylApp un login real (correo/contraseña + Google/
--  Facebook/Apple via Supabase Auth), abierto a cualquiera que
--  quiera registrarse. El staff del CRM y los clientes de TrylApp
--  terminan siendo el MISMO tipo de usuario a nivel de Supabase
--  (ambos "authenticated") — por eso este script tambien reescribe
--  las policies que antes daban acceso total a "cualquier usuario
--  autenticado" (eso asumia que solo el staff tenia cuenta). Ahora
--  ese acceso total requiere aparecer en staff_users; un cliente
--  normal solo ve/edita lo que le pertenece.
--
--  IMPORTANTE — pasos manuales despues de correr esto:
--    1) Date de alta tu como staff (cambia el correo):
--       insert into public.staff_users (user_id, email)
--       select id, email from auth.users where email = 'tu-correo@thetryla.com';
--    2) Repite el paso 1 para cada persona de tu equipo que deba
--       ver todo en el CRM.
--    3) En el Dashboard de Supabase (Authentication -> Providers)
--       activa Google / Facebook / Apple con sus credenciales OAuth
--       si quieres esos botones funcionando (correo/contraseña ya
--       funciona sin nada adicional).
-- ============================================================

-- ---- Quien es "staff" (acceso total al CRM) ----
create table if not exists public.staff_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.staff_users enable row level security;

-- Cada quien solo puede leer su PROPIA fila — alcanza para que los
-- checks "exists (select 1 from staff_users where user_id = auth.uid())"
-- de las policies de abajo funcionen, sin exponer la lista completa
-- de staff a nadie mas.
drop policy if exists "staff can read own row" on public.staff_users;
create policy "staff can read own row"
  on public.staff_users for select
  to authenticated
  using (user_id = auth.uid());

-- ---- A quien le pertenece cada sitio ----
alter table public.tryla_sites add column if not exists owner_user_id uuid references auth.users (id);
alter table public.tryla_sites add column if not exists owner_email text;
create index if not exists tryla_sites_owner_user_id_idx on public.tryla_sites (owner_user_id);

-- ---- Reescribe el acceso de staff: ya no es "cualquier autenticado" ----
drop policy if exists "authenticated staff full access to sites" on public.tryla_sites;
create policy "staff full access to sites"
  on public.tryla_sites for all
  to authenticated
  using (exists (select 1 from public.staff_users su where su.user_id = auth.uid()))
  with check (exists (select 1 from public.staff_users su where su.user_id = auth.uid()));

drop policy if exists "authenticated staff manage client portals" on public.client_portal;
create policy "staff manage client portals"
  on public.client_portal for all
  to authenticated
  using (exists (select 1 from public.staff_users su where su.user_id = auth.uid()))
  with check (exists (select 1 from public.staff_users su where su.user_id = auth.uid()));

drop policy if exists "authenticated staff full access to orders" on public.orders;
create policy "staff full access to orders"
  on public.orders for all
  to authenticated
  using (exists (select 1 from public.staff_users su where su.user_id = auth.uid()))
  with check (exists (select 1 from public.staff_users su where su.user_id = auth.uid()));

drop policy if exists "authenticated staff full access to client_payments" on public.client_payments;
create policy "staff full access to client_payments"
  on public.client_payments for all
  to authenticated
  using (exists (select 1 from public.staff_users su where su.user_id = auth.uid()))
  with check (exists (select 1 from public.staff_users su where su.user_id = auth.uid()));

-- ---- Acceso de cliente: solo lo suyo ----
drop policy if exists "clients manage their own site" on public.tryla_sites;
create policy "clients manage their own site"
  on public.tryla_sites for all
  to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

drop policy if exists "clients manage their own orders" on public.orders;
create policy "clients manage their own orders"
  on public.orders for all
  to authenticated
  using (subdomain in (select subdomain from public.tryla_sites where owner_user_id = auth.uid()))
  with check (subdomain in (select subdomain from public.tryla_sites where owner_user_id = auth.uid()));

drop policy if exists "clients read their own payment status" on public.client_payments;
create policy "clients read their own payment status"
  on public.client_payments for select
  to authenticated
  using (subdomain in (select subdomain from public.tryla_sites where owner_user_id = auth.uid()));

-- ---- Reclamar un sitio que el staff dejo listo con tu correo ----
-- Se llama una vez despues de cada login. Solo toca una fila si su
-- owner_email coincide con el correo YA VERIFICADO del que llama
-- (nunca un valor que mande el cliente) y todavia no tiene dueño.
create or replace function public.claim_my_site()
returns public.tryla_sites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_site public.tryla_sites;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then
    return null;
  end if;

  update public.tryla_sites
  set owner_user_id = auth.uid(), updated_at = now()
  where lower(owner_email) = lower(v_email) and owner_user_id is null
  returning * into v_site;

  return v_site;
end;
$$;

grant execute on function public.claim_my_site() to authenticated;
