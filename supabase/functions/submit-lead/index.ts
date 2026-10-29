// ============================================================
//  submit-lead
//  Recibe los leads del formulario de contacto publico en
//  thetryla.com y los agrega a novaClients en nova_store, para
//  que aparezcan directo en la pestana Pipeline del CRM -- igual
//  que ingest-lead, pero esta SI esta pensada para que la llame
//  cualquier visitante del sitio (no un Apps Script de confianza),
//  por eso no usa INGEST_LEAD_SECRET: la llave real (service role)
//  nunca sale de esta funcion, y el sitio solo manda datos de
//  contacto, no credenciales.
//
//  Anti-spam minimo: honeypot ("website" debe venir vacio) + rate
//  limit simple por IP (ver RATE_LIMIT_MAX / RATE_LIMIT_WINDOW_MS).
//  Si crece el spam, subir esto a algo real (Turnstile/hCaptcha).
//
//  Deploy:  Dashboard -> Edge Functions -> submit-lead -> Via Editor
//  No requiere secrets nuevos (usa los mismos SUPABASE_URL /
//  SUPABASE_SERVICE_ROLE_KEY que ya configuran las otras funciones).
//
//  Body esperado:
//  { name, phone?, email?, size?, message?, website? (honeypot) }
//  Responde { ok: true, id } o { ok:false, error }
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sb = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

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

type Client = {
  id: string;
  name: string;
  contacto: string;
  negocio: string;
  ciudad: string;
  status: string;
  notas: string;
  fuente?: string;
  createdAt?: number;
};

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
    const size = clean(body.size, 60);
    const message = clean(body.message, 2000);

    if (!name || (!phone && !email)) {
      return json({ ok: false, error: "Falta nombre y un telefono o correo." }, 400);
    }

    const { data: row, error: readError } = await sb
      .from("nova_store")
      .select("value")
      .eq("key", "novaClients")
      .maybeSingle();
    if (readError) throw readError;

    const clients: Client[] = Array.isArray(row?.value) ? (row!.value as Client[]) : [];

    const notas = [
      size ? "Tamano de interes: " + size : "",
      message ? "Mensaje: " + message : "",
      email ? "Email: " + email : "",
    ].filter(Boolean).join("\n");

    const id = "site-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
    clients.push({
      id,
      name,
      contacto: phone || email,
      negocio: "",
      ciudad: "",
      status: "Cold",
      notas,
      fuente: "Website contact form",
      createdAt: Date.now(),
    });

    const { error: writeError } = await sb
      .from("nova_store")
      .upsert({ key: "novaClients", value: clients, updated_at: new Date().toISOString() });
    if (writeError) throw writeError;

    // TODO: notificacion por correo al equipo cuando entra un lead con email.
    // Requiere una API de email (ej. Resend) + su API key como secret nuevo
    // (RESEND_API_KEY) en Edge Functions -> Secrets. Sin eso, el lead solo
    // queda registrado en el CRM.

    return json({ ok: true, id });
  } catch (e) {
    console.error("[submit-lead]", e);
    return json({ ok: false, error: "Error inesperado. Intenta de nuevo." }, 500);
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
