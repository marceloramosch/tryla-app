// ============================================================
//  stripe-connect-onboarding
//  El cliente (dueño de un food trailer) le da clic a "Conectar
//  Stripe" en TrylApp ("Operar el trailer"). Esta funcion:
//    1. Resuelve su subdominio a partir de su portal token
//       (mismo patron que get_site_by_portal_token en SQL).
//    2. Crea (o reusa) su cuenta de Stripe Connect Express.
//    3. Regresa el link de onboarding alojado por Stripe, al que
//       el navegador del cliente se redirige.
//
//  Deploy:  supabase functions deploy stripe-connect-onboarding
//  Secrets: supabase secrets set STRIPE_SECRET_KEY=sk_...
//
//  SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya vienen inyectados
//  automaticamente en todo Edge Function de Supabase — no hace
//  falta configurarlos a mano.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { portal_token, return_url, refresh_url } = await req.json();
    if (!portal_token || !return_url || !refresh_url) {
      return json({ error: "Faltan datos (portal_token, return_url, refresh_url)." }, 400);
    }

    const { data: portal, error: portalErr } = await sb
      .from("client_portal")
      .select("site_subdomain, client_name")
      .eq("token", portal_token)
      .maybeSingle();
    if (portalErr) throw portalErr;
    if (!portal) return json({ error: "Link de portal invalido." }, 404);

    const subdomain = portal.site_subdomain;

    let { data: payment } = await sb
      .from("client_payments")
      .select("*")
      .eq("subdomain", subdomain)
      .maybeSingle();

    let accountId = payment?.stripe_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        business_type: "individual",
        business_profile: { name: portal.client_name || subdomain },
        metadata: { subdomain },
      });
      accountId = account.id;
      await sb.from("client_payments").upsert(
        {
          subdomain,
          stripe_account_id: accountId,
          charges_enabled: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "subdomain" }
      );
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url,
      return_url,
      type: "account_onboarding",
    });

    return json({ url: accountLink.url });
  } catch (e) {
    console.error("[stripe-connect-onboarding]", e);
    return json({ error: e instanceof Error ? e.message : "Error inesperado." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
