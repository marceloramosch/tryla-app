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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const subdomain = String(body.subdomain || "").toLowerCase().trim();
    const cartItems: Array<{ name: string; qty: number }> = Array.isArray(body.items) ? body.items : [];
    const fulfillment = body.fulfillment === "delivery" ? "delivery" : "pickup";
    const deliveryAddress = String(body.delivery_address || "").trim();
    const customerName = String(body.customer_name || "").trim();
    const customerPhone = String(body.customer_phone || "").trim();
    const notes = String(body.notes || "").trim();
    const successUrl = String(body.success_url || "");
    const cancelUrl = String(body.cancel_url || "");

    if (!subdomain || !cartItems.length || !customerName || !customerPhone || !successUrl || !cancelUrl) {
      return json({ error: "Faltan datos del pedido." }, 400);
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
    return json({ error: e instanceof Error ? e.message : "Error inesperado." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
