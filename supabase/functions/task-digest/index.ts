// ============================================================
//  task-digest
//  Resumen diario por correo de las tareas/llamadas de seguimiento
//  de los leads del CRM (novaClients[].tasks): las de HOY y las
//  VENCIDAS. Si no hay ninguna, no manda nada.
//
//  Quien lo llama es un cron (pg_cron + pg_net de Supabase), no un
//  usuario logueado -- se protege con un secret compartido en el
//  header x-digest-secret.
//
//  Deploy:  Dashboard -> Edge Functions -> task-digest -> Via Editor
//  Desactivar "Verify JWT" (el cron manda el secret, no un JWT).
//  Secrets requeridos (Edge Functions -> Secrets):
//    DIGEST_SECRET    cadena larga que tu elijas (va tambien en el cron)
//    RESEND_API_KEY   API key de resend.com
//    DIGEST_TO        correo(s) destino, separados por coma
//    DIGEST_FROM      remitente verificado en Resend, ej. "Tryla CRM <crm@thetryla.com>"
//                     (opcional; por defecto onboarding@resend.dev, que solo
//                     puede enviar al correo dueno de la cuenta de Resend)
//    DIGEST_TZ        zona horaria (opcional, por defecto America/Chicago)
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sb = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const DIGEST_SECRET = Deno.env.get("DIGEST_SECRET") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const DIGEST_TO = (Deno.env.get("DIGEST_TO") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const DIGEST_FROM = Deno.env.get("DIGEST_FROM") ?? "Tryla CRM <onboarding@resend.dev>";
const DIGEST_TZ = Deno.env.get("DIGEST_TZ") ?? "America/Chicago";

type Task = { id?: string; text?: string; dueAt?: string | null; done?: boolean };
type Client = { name?: string; contacto?: string; ciudad?: string; status?: string; tasks?: Task[] };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function escapeHtml(v: unknown): string {
  return String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// Comparacion en tiempo constante (hashes SHA-256 de misma longitud).
async function safeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const x = new Uint8Array(ha);
  const y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

// Fecha de hoy YYYY-MM-DD en la zona horaria del negocio (en-CA da ese formato)
function todayKey(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: DIGEST_TZ }).format(new Date());
}

Deno.serve(async (req) => {
  if (!DIGEST_SECRET || !RESEND_API_KEY || !DIGEST_TO.length) {
    return json({ error: "Faltan secrets: DIGEST_SECRET, RESEND_API_KEY y DIGEST_TO." }, 500);
  }
  if (!(await safeEqual(req.headers.get("x-digest-secret") ?? "", DIGEST_SECRET))) {
    return json({ error: "Secret invalido." }, 403);
  }

  try {
    const { data: row, error } = await sb.from("nova_store").select("value").eq("key", "novaClients").maybeSingle();
    if (error) throw error;
    const clients: Client[] = Array.isArray(row?.value) ? (row!.value as Client[]) : [];

    const today = todayKey();
    const due: { c: Client; t: Task }[] = [];
    const late: { c: Client; t: Task }[] = [];
    for (const c of clients) {
      for (const t of Array.isArray(c.tasks) ? c.tasks : []) {
        if (t.done || !t.dueAt) continue;
        if (t.dueAt === today) due.push({ c, t });
        else if (t.dueAt < today) late.push({ c, t });
      }
    }
    if (!due.length && !late.length) return json({ sent: false, reason: "Sin tareas para hoy ni vencidas." });

    late.sort((a, b) => String(a.t.dueAt).localeCompare(String(b.t.dueAt)));
    const rowHtml = ({ c, t }: { c: Client; t: Task }, showDate: boolean) =>
      `<tr><td style="padding:6px 10px;border-bottom:1px solid #D6D3FF"><b>${escapeHtml(c.name)}</b>` +
      `${c.status ? ` <span style="color:#5C6270">(${escapeHtml(c.status)})</span>` : ""}<br>` +
      `${escapeHtml(t.text)}${showDate ? ` <span style="color:#B42318">· vencio ${escapeHtml(t.dueAt)}</span>` : ""}` +
      `${c.contacto ? `<br><span style="color:#5C6270">${escapeHtml(c.contacto)}</span>` : ""}</td></tr>`;
    const section = (title: string, items: { c: Client; t: Task }[], showDate: boolean) =>
      items.length
        ? `<h3 style="color:#06038D;margin:18px 0 6px">${title} (${items.length})</h3>` +
          `<table style="width:100%;border-collapse:collapse;background:#F1F0FF">${items.map((i) => rowHtml(i, showDate)).join("")}</table>`
        : "";

    const html =
      `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1a1a2e">` +
      `<h2 style="color:#06038D;margin:0">Tareas de seguimiento</h2>` +
      section("Para hoy", due, false) +
      section("Vencidas", late, true) +
      `<p style="color:#5C6270;font-size:12px;margin-top:20px">Tryla CRM · thetryla.app/crm</p></div>`;

    const parts = [];
    if (due.length) parts.push(`${due.length} para hoy`);
    if (late.length) parts.push(`${late.length} vencida${late.length === 1 ? "" : "s"}`);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: DIGEST_FROM, to: DIGEST_TO, subject: `Tryla CRM: ${parts.join(" y ")}`, html }),
    });
    if (!res.ok) return json({ error: "Resend rechazo el envio.", status: res.status }, 502);
    return json({ sent: true, today: due.length, overdue: late.length });
  } catch (e) {
    console.error("task-digest", e);
    return json({ error: "Error interno." }, 500);
  }
});
