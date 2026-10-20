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
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(ip)) return json({ ok: false, error: "Demasiados intentos, espera unos minutos." }, 429);

    const body = await req.json().catch(() => ({}));

    // Honeypot: un campo invisible para humanos que un bot si llena.
    if (body.website) return json({ ok: true, id: "ignored" });

    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const email = String(body.email || "").trim();
    const size = String(body.size || "").trim();
    const message = String(body.message || "").trim();

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
    return json({ ok: false, error: e instanceof Error ? e.message : "Error inesperado." }, 500);
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
