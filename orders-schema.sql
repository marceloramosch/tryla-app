-- ============================================================
--  PEDIDOS — esquema de Supabase
--  Corre esto UNA vez en el SQL Editor de tu proyecto de
--  Supabase (el mismo que usa TrylApp: dcuescldzrgcppubcoxq),
--  despues de client-portal-schema.sql.
--
--  Le da a cada sitio de restaurante (tryla_sites) la capacidad
--  de recibir pedidos con pago en linea. El dinero va directo a
--  la cuenta de Stripe del propio cliente (Stripe Connect
--  Express) — Tryla nunca retiene fondos.
--
--  Todas las escrituras en "orders" y "client_payments" pasan
--  por las Supabase Edge Functions (create-checkout-session,
--  stripe-connect-onboarding, stripe-webhook), que usan la
--  service role key del lado del servidor y por lo tanto no
--  necesitan (ni tienen) policy de INSERT/UPDATE para "anon" —
--  el cliente nunca escribe estas tablas directo, igual de
--  seguro que el patron de RPC "security definer" ya usado en
--  client-portal-schema.sql, solo que aqui la validacion vive en
--  la funcion en vez de en SQL puro (porque tiene que hablar con
--  la API de Stripe).
-- ============================================================

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  subdomain text not null references public.tryla_sites (subdomain) on delete cascade,
  items jsonb not null default '[]',           -- [{"name":"Taco al pastor","price":3.50,"qty":2}]
  fulfillment text not null check (fulfillment in ('pickup','delivery')),
  delivery_address text,
  customer_name text not null,
  customer_phone text not null,
  notes text,
  subtotal numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  currency text not null default 'usd',
  status text not null default 'nuevo' check (status in ('nuevo','preparando','listo','completado','cancelado')),
  payment_status text not null default 'pendiente' check (payment_status in ('pendiente','pagado','fallido')),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_subdomain_idx on public.orders (subdomain, created_at desc);

alter table public.orders enable row level security;

-- Solo el equipo de Tryla (staff autenticado) puede leer/escribir la
-- tabla directo, para soporte. El cliente y el comprador SIEMPRE pasan
-- por las funciones/RPC de abajo.
drop policy if exists "authenticated staff full access to orders" on public.orders;
create policy "authenticated staff full access to orders"
  on public.orders for all
  to authenticated
  using (true)
  with check (true);

create table if not exists public.client_payments (
  subdomain text primary key references public.tryla_sites (subdomain) on delete cascade,
  stripe_account_id text,
  charges_enabled boolean not null default false,
  onboarded_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.client_payments enable row level security;

drop policy if exists "authenticated staff full access to client_payments" on public.client_payments;
create policy "authenticated staff full access to client_payments"
  on public.client_payments for all
  to authenticated
  using (true)
  with check (true);

-- ---- Pedidos del cliente, scoped por su portal token ----

-- Pedidos del sitio de ese token, mas recientes primero.
create or replace function public.get_orders_by_portal_token(p_token text)
returns setof public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subdomain text;
begin
  select site_subdomain into v_subdomain
  from public.client_portal
  where token = p_token;

  if v_subdomain is null then
    return;
  end if;

  return query
    select * from public.orders
    where subdomain = v_subdomain
    order by created_at desc;
end;
$$;

-- Mueve un pedido por el flujo (nuevo -> preparando -> listo -> completado,
-- o cancelado). El subdominio SIEMPRE se resuelve del token en el
-- servidor, y se verifica que el pedido le pertenezca antes de tocarlo.
create or replace function public.update_order_status_by_portal_token(p_token text, p_order_id uuid, p_status text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subdomain text;
  v_order public.orders;
begin
  if p_status not in ('nuevo','preparando','listo','completado','cancelado') then
    raise exception 'invalid order status';
  end if;

  select site_subdomain into v_subdomain
  from public.client_portal
  where token = p_token;

  if v_subdomain is null then
    raise exception 'invalid portal token';
  end if;

  update public.orders
  set status = p_status, updated_at = now()
  where id = p_order_id and subdomain = v_subdomain
  returning * into v_order;

  if v_order is null then
    raise exception 'order not found for this token';
  end if;

  return v_order;
end;
$$;

-- Lectura publica minima de si un sitio ya puede cobrar (para que el
-- sitio publico decida si muestra botones de "Agregar" en el menu).
-- Nunca expone stripe_account_id — solo el booleano.
create or replace function public.get_payment_status(p_subdomain text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(charges_enabled, false) from public.client_payments where subdomain = p_subdomain;
$$;

grant execute on function public.get_payment_status(text) to anon;

-- Lectura minima y publica para la pantalla de confirmacion del
-- comprador (thetryla.com/?order=<id>) — solo lo que necesita ver,
-- nada de datos de otros pedidos ni del negocio.
create or replace function public.get_order_public_status(p_order_id uuid, p_subdomain text)
returns table (
  id uuid,
  status text,
  payment_status text,
  fulfillment text,
  items jsonb,
  total numeric,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select o.id, o.status, o.payment_status, o.fulfillment, o.items, o.total, o.created_at
    from public.orders o
    where o.id = p_order_id and o.subdomain = p_subdomain;
end;
$$;

grant execute on function public.get_orders_by_portal_token(text) to anon;
grant execute on function public.update_order_status_by_portal_token(text, uuid, text) to anon;
grant execute on function public.get_order_public_status(uuid, text) to anon;

-- ---- Realtime: para que "Operar el trailer" vea pedidos nuevos al
-- instante sin refrescar (util con un iPad/telefono en el mostrador) ----
alter publication supabase_realtime add table public.orders;
