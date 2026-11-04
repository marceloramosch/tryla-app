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
const MAX_BODY_BYTES = 20 * 1024;

// Quita caracteres de control (menos \n y \t) y recorta al maximo permitido.
function clean(v: unknown, max: number): string {
  // deno-lint-ignore no-control-regex
  return String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
}

// cf-connecting-ip lo pone Cloudflare (no lo controla el cliente); si no esta,
// se usa el ULTIMO salto de x-forwarded-for (el agregado por el proxy), no el primero.
function clientIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return "unknown";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const ip = clientIp(req);
    if (isRateLimited(ip)) return json({ ok: false, error: "Demasiados intentos, espera unos minutos." }, 429);

    const declared = Number(req.headers.get("content-length") || 0);
    if (declared > MAX_BODY_BYTES) return json({ ok: false, error: "Solicitud demasiado grande." }, 413);
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return json({ ok: false, error: "Solicitud demasiado grande." }, 413);
    let body: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
    } catch (_) { /* body vacio -> falla la validacion de abajo */ }

    // Honeypot: un campo invisible para humanos que un bot si llena.
    if (body.website) return json({ ok: true, id: "ignored" });

    const name = clean(body.name, 120);
    const phone = clean(body.phone, 40);
    const email = clean(body.email, 200);

    if (!name || (!phone && !email)) {
      return json({ ok: false, error: "Falta nombre y un telefono o correo." }, 400);
    }
    if (!CIMIENTO_LEADS_TOKEN) {
      throw new Error("Falta configurar el secret CIMIENTO_LEADS_TOKEN en Edge Functions.");
    }

    // El ref hace que un reintento del mismo envio no abra dos leads.
    const ref = "site-" + crypto.randomUUID();
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
            size: clean(body.size, 60),
            message: clean(body.message, 2000),
            ciudad: clean(body.city, 120),
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
  // Poda de entradas viejas para que el Map no crezca sin limite.
  if (hits.size > 500) {
    for (const [k, v] of hits) {
      if (!v.length || now - v[v.length - 1] >= RATE_LIMIT_WINDOW_MS) hits.delete(k);
    }
  }
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
