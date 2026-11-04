// ============================================================
//  create-checkout-session
//  Llamada desde el carrito del sitio publico de un restaurante
//  (subdominio.thetryla.com). Recibe lo que el comprador junto en
//  su carrito, pero NUNCA confia en los precios que manda el
//  navegador: vuelve a leer el menu real desde tryla_sites y
//  recalcula el total del lado del servidor. Crea el pedido y una
//  Stripe Checkout Session cuyo dinero va directo a la cuenta de
//  Stripe Connect del cliente (transfer_data.destination) — Tryla
//  no retiene fondos ni cobra comision en esta version.
//
//  Deploy:  supabase functions deploy create-checkout-session
//  Secrets: supabase secrets set STRIPE_SECRET_KEY=sk_...
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const sb = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const MAX_QTY_PER_ITEM = 50;
const MAX_CART_LINES = 40;
const MAX_BODY_BYTES = 50 * 1024;

// Solo se permite regresar a dominios propios (evita redirects abiertos tras el pago/onboarding).
// thetryla.app = TrylApp (operator), thetryla.com y *.thetryla.com = sitios de los restaurantes.
function safeReturnUrl(raw: unknown): string | null {
  try {
    const u = new URL(String(raw || ""));
    const h = u.hostname.toLowerCase();
    const okHost =
      h === "thetryla.com" || h.endsWith(".thetryla.com") ||
      h === "thetryla.app" || h.endsWith(".thetryla.app");
    const okDev = (h === "localhost" || h === "127.0.0.1") && u.protocol === "http:";
    if ((u.protocol === "https:" && okHost) || okDev) return u.toString().slice(0, 1000);
  } catch (_) { /* url invalida */ }
  return null;
}

// Quita caracteres de control (menos \n y \t) y recorta al maximo permitido.
function clean(v: unknown, max: number): string {
  // deno-lint-ignore no-control-regex
  return String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const declared = Number(req.headers.get("content-length") || 0);
    if (declared > MAX_BODY_BYTES) return json({ error: "Solicitud demasiado grande." }, 413);
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return json({ error: "Solicitud demasiado grande." }, 413);
    let body: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
    } catch (_) {
      return json({ error: "Solicitud invalida." }, 400);
    }

    const subdomain = clean(body.subdomain, 63).toLowerCase();
    const cartItems: Array<{ name: string; qty: number }> = Array.isArray(body.items)
      ? (body.items as Array<{ name: string; qty: number }>).slice(0, MAX_CART_LINES)
      : [];
    const fulfillment = body.fulfillment === "delivery" ? "delivery" : "pickup";
    const deliveryAddress = clean(body.delivery_address, 300);
    const customerName = clean(body.customer_name, 120);
    const customerPhone = clean(body.customer_phone, 40);
    const notes = clean(body.notes, 500);
    const successUrl = safeReturnUrl(body.success_url);
    const cancelUrl = safeReturnUrl(body.cancel_url);

    if (!subdomain || !cartItems.length || !customerName || !customerPhone) {
      return json({ error: "Faltan datos del pedido." }, 400);
    }
    if (!successUrl || !cancelUrl) {
      return json({ error: "URL de regreso no permitida." }, 400);
    }
    if (fulfillment === "delivery" && !deliveryAddress) {
      return json({ error: "Falta la direccion de entrega." }, 400);
    }

    const { data: site, error: siteErr } = await sb
      .from("tryla_sites")
      .select("subdomain, restaurant_name, menu, published")
      .eq("subdomain", subdomain)
      .maybeSingle();
    if (siteErr) throw siteErr;
    if (!site || !site.published) return json({ error: "Restaurante no encontrado." }, 404);

    const { data: payment } = await sb
      .from("client_payments")
      .select("stripe_account_id, charges_enabled")
      .eq("subdomain", subdomain)
      .maybeSingle();
    if (!payment?.stripe_account_id || !payment.charges_enabled) {
      return json({ error: "Este restaurante todavia no tiene pagos habilitados." }, 400);
    }

    // Recalcula cada linea contra el menu REAL guardado en tryla_sites —
    // el precio y el nombre nunca vienen del navegador del comprador.
    const menu: Array<{ name: string; price: string; desc?: string }> = Array.isArray(site.menu) ? site.menu : [];
    const resolvedItems: Array<{ name: string; price: number; qty: number }> = [];
    for (const ci of cartItems) {
      const qty = Math.min(MAX_QTY_PER_ITEM, Math.max(1, Math.floor(Number(ci.qty) || 0)));
      const menuItem = menu.find((m) => (m.name || "").trim().toLowerCase() === String(ci.name || "").trim().toLowerCase());
      const price = menuItem ? parseFloat(menuItem.price) : NaN;
      if (!menuItem || !Number.isFinite(price) || price <= 0) continue;
      resolvedItems.push({ name: menuItem.name, price, qty });
    }
    if (!resolvedItems.length) return json({ error: "El carrito no tiene articulos validos." }, 400);

    const subtotal = resolvedItems.reduce((sum, it) => sum + it.price * it.qty, 0);
    const total = Math.round(subtotal * 100) / 100;

    const { data: order, error: orderErr } = await sb
      .from("orders")
      .insert({
        subdomain,
        items: resolvedItems,
        fulfillment,
        delivery_address: fulfillment === "delivery" ? deliveryAddress : null,
        customer_name: customerName,
        customer_phone: customerPhone,
        notes: notes || null,
        subtotal: total,
        total,
        status: "nuevo",
        payment_status: "pendiente",
      })
      .select()
      .single();
    if (orderErr) throw orderErr;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: resolvedItems.map((it) => ({
        quantity: it.qty,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(it.price * 100),
          product_data: { name: it.name },
        },
      })),
      payment_intent_data: {
        transfer_data: { destination: payment.stripe_account_id },
      },
      client_reference_id: order.id,
      metadata: { order_id: order.id, subdomain },
      success_url: `${successUrl}${successUrl.includes("?") ? "&" : "?"}order=${order.id}`,
      cancel_url: cancelUrl,
    });

    await sb.from("orders").update({ stripe_checkout_session_id: session.id }).eq("id", order.id);

    return json({ url: session.url, order_id: order.id });
  } catch (e) {
    console.error("[create-checkout-session]", e);
    return json({ error: "No se pudo crear el pago. Intenta de nuevo." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
