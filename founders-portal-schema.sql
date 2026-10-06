-- ============================================================
--  FOUNDERS PORTAL — esquema de Supabase
--  Corre esto UNA vez en el SQL Editor de tu proyecto de Supabase
--  (dcuescldzrgcppubcoxq), despues de client-auth-schema.sql.
--
--  Da de alta un tercer tipo de cuenta, "founder": solo lectura de
--  leads (novaClients) y cotizaciones (novaQuotes) dentro de
--  nova_store -- nada de precios de catalogo, nada del log de
--  actividad interno, y nada de escritura (no pueden editar nada).
--  El staff (staff_users) sigue con acceso total a nova_store, sin
--  cambios.
--
--  IMPORTANTE: nova_store nunca tuvo su propio schema file (se creo
--  desde el Dashboard en algun momento), asi que este script deja
--  su RLS explicito y correcto de una vez -- borra cualquier policy
--  vieja que tuviera (por si acceso total a "cualquier autenticado"
--  se le quedo pegado de antes de que existiera staff_users) y la
--  reemplaza por las dos de abajo.
--
--  Pasos manuales despues de correr esto:
--    1) Crea las cuentas en Authentication -> Users -> Add user
--       (correo + contraseña temporal) para cada socio:
--         silverramos@silverfox.capital
--         jlgpalafox@silverfox.capital
--    2) Date de alta como founder a cada uno (corre esto DESPUES
--       de crear las cuentas del paso 1, una vez por correo):
--       insert into public.founder_users (user_id, email)
--       select id, email from auth.users where email = 'silverramos@silverfox.capital';
--       insert into public.founder_users (user_id, email)
--       select id, email from auth.users where email = 'jlgpalafox@silverfox.capital';
-- ============================================================

create table if not exists public.founder_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.founder_users enable row level security;

drop policy if exists "founders can read own row" on public.founder_users;
create policy "founders can read own row"
  on public.founder_users for select
  to authenticated
  using (user_id = auth.uid());

-- ---- nova_store: acceso explicito (staff = todo, founders = solo lectura de leads/cotizaciones) ----
alter table public.nova_store enable row level security;

do $$
declare
  pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'nova_store'
  loop
    execute format('drop policy if exists %I on public.nova_store', pol.policyname);
  end loop;
end $$;

create policy "staff full access to nova_store"
  on public.nova_store for all
  to authenticated
  using (exists (select 1 from public.staff_users su where su.user_id = auth.uid()))
  with check (exists (select 1 from public.staff_users su where su.user_id = auth.uid()));

create policy "founders read leads and quotes"
  on public.nova_store for select
  to authenticated
  using (
    key in ('novaClients', 'novaQuotes')
    and exists (select 1 from public.founder_users fu where fu.user_id = auth.uid())
  );
