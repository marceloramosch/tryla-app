// ============================================================
//  stripe-connect-onboarding
//  El cliente (dueño de un food trailer) le da clic a "Conectar
//  Stripe" en TrylApp ("Operator"). Esta funcion:
//    1. Resuelve su subdominio — o del portal_token heredado
//       (links generados antes del login), o del JWT de su sesion
//       (flujo nuevo: auth.uid() -> tryla_sites.owner_user_id).
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

async function resolveSite(req: Request, portalToken: string | undefined) {
  if (portalToken) {
    const { data: portal, error } = await sb
      .from("client_portal")
      .select("site_subdomain, client_name")
      .eq("token", portalToken)
      .maybeSingle();
    if (error) throw error;
    if (!portal) return null;
    return { subdomain: portal.site_subdomain, displayName: portal.client_name };
  }

  // Sesion nueva: el JWT del que llama viene en el header Authorization
  // (sb.functions.invoke() lo manda solo cuando hay sesion activa).
  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return null;

  const { data: userData, error: userErr } = await sb.auth.getUser(jwt);
  if (userErr || !userData.user) return null;

  const { data: site, error: siteErr } = await sb
    .from("tryla_sites")
    .select("subdomain, restaurant_name")
    .eq("owner_user_id", userData.user.id)
    .maybeSingle();
  if (siteErr) throw siteErr;
  if (!site) return null;
  return { subdomain: site.subdomain, displayName: site.restaurant_name };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { portal_token, return_url, refresh_url } = await req.json();
    if (!return_url || !refresh_url) {
      return json({ error: "Faltan datos (return_url, refresh_url)." }, 400);
    }

    const resolved = await resolveSite(req, portal_token);
    if (!resolved) return json({ error: "No se pudo identificar tu sitio. Inicia sesión de nuevo." }, 404);
    const subdomain = resolved.subdomain;

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
        business_profile: { name: resolved.displayName || subdomain },
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
