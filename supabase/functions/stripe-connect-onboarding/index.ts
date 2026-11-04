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
    const raw = await req.text();
    if (raw.length > 10 * 1024) return json({ error: "Solicitud demasiado grande." }, 413);
    let parsed: { portal_token?: unknown; return_url?: unknown; refresh_url?: unknown } = {};
    try {
      parsed = JSON.parse(raw) ?? {};
    } catch (_) {
      return json({ error: "Solicitud invalida." }, 400);
    }
    const portal_token = parsed.portal_token ? clean(parsed.portal_token, 64) : undefined;
    const return_url = safeReturnUrl(parsed.return_url);
    const refresh_url = safeReturnUrl(parsed.refresh_url);
    if (!return_url || !refresh_url) {
      return json({ error: "Faltan datos o la URL de regreso no esta permitida." }, 400);
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
    return json({ error: "No se pudo iniciar la conexion con Stripe. Intenta de nuevo." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
