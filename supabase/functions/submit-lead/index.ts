// ============================================================
//  submit-lead
//  Recibe los leads del formulario de contacto publico en
//  thetryla.com y los manda a Cimiento, que es donde vive el
//  pipeline de ventas desde octubre 2026. Aqui ya no se guarda
//  nada: el lead entra a Cimiento en la etapa «Interesado».
//
//  La llaman los visitantes del sitio, asi que el token de
//  Cimiento nunca sale de esta funcion: el sitio solo manda
//  datos de contacto.
//
//  Anti-spam minimo: honeypot ("website" debe venir vacio) + rate
//  limit simple por IP (ver RATE_LIMIT_MAX / RATE_LIMIT_WINDOW_MS).
//  Si crece el spam, subir esto a algo real (Turnstile/hCaptcha).
//
//  Deploy:  Dashboard -> Edge Functions -> submit-lead -> Via Editor
//  Secrets requeridos (Edge Functions -> Secrets):
//    CIMIENTO_LEADS_TOKEN  el mismo valor que TRYLA_LEADS_TOKEN en Cimiento
//    CIMIENTO_LEADS_URL    opcional; por omision la de produccion
//
//  Body esperado:
//  { name, phone?, email?, size?, message?, city?, website? (honeypot) }
//  Responde { ok: true, id } o { ok:false, error }
// ============================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CIMIENTO_LEADS_URL =
  Deno.env.get("CIMIENTO_LEADS_URL") ??
  "https://cimiento-mx-construccion.lovable.app/api/public/tryla/leads";
const CIMIENTO_LEADS_TOKEN = Deno.env.get("CIMIENTO_LEADS_TOKEN") ?? "";

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 min
const hits = new Map<string, number[]>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(ip)) return json({ ok: false, error: "Demasiados intentos, espera unos minutos." }, 429);

    const body = await req.json().catch(() => ({}));

    // Honeypot: un campo invisible para humanos que un bot si llena.
    if (body.website) return json({ ok: true, id: "ignored" });

    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const email = String(body.email || "").trim();

    if (!name || (!phone && !email)) {
      return json({ ok: false, error: "Falta nombre y un telefono o correo." }, 400);
    }
    if (!CIMIENTO_LEADS_TOKEN) {
      throw new Error("Falta configurar el secret CIMIENTO_LEADS_TOKEN en Edge Functions.");
    }

    // El ref hace que un reintento del mismo envio no abra dos leads.
    const ref = "site-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
    const res = await fetch(CIMIENTO_LEADS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + CIMIENTO_LEADS_TOKEN },
      body: JSON.stringify({
        leads: [
          {
            ref,
            canal: "web",
            name,
            phone,
            email,
            size: String(body.size || "").trim(),
            message: String(body.message || "").trim(),
            ciudad: String(body.city || "").trim(),
            fuente: "Website contact form",
          },
        ],
      }),
    });
    if (!res.ok) throw new Error("Cimiento respondio " + res.status + ": " + (await res.text()).slice(0, 200));
    const respuesta = await res.json();

    if (respuesta.invalidos?.length) {
      return json({ ok: false, error: "Revisa el telefono o el correo." }, 400);
    }
    return json({ ok: true, id: respuesta.porRef?.[ref]?.id ?? ref });
  } catch (e) {
    console.error("[submit-lead]", e);
    return json({ ok: false, error: "No pudimos recibir tus datos, intenta de nuevo." }, 500);
  }
});

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > RATE_LIMIT_MAX;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
