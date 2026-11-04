// ============================================================
//  ingest-lead
//  Recibe leads nuevos del Google Sheet de captura y los manda a
//  Cimiento, que es donde vive el pipeline de ventas desde
//  octubre 2026. Entran en «Interesado»: la columna STATUS del
//  Sheet ya no decide etapa, porque ahi arranca la automatizacion
//  de contacto.
//
//  Quien llama esto es un Apps Script del Sheet, no un usuario
//  logueado -- por eso se protege con un secret compartido en vez
//  de JWT de Supabase (como si usan census-lookup/sync-places).
//
//  Un lead que ya entro (mismo rowId) no se vuelve a crear; si la
//  persona ya estaba en Cimiento por telefono, se le suma una nota.
//
//  Deploy:  Dashboard -> Edge Functions -> ingest-lead -> Via Editor
//  Secrets (Edge Functions -> Secrets):
//    INGEST_LEAD_SECRET    el mismo valor que tiene el Apps Script
//    CIMIENTO_LEADS_TOKEN  el mismo valor que TRYLA_LEADS_TOKEN en Cimiento
//    CIMIENTO_LEADS_URL    opcional; por omision la de produccion
//
//  Body esperado:
//  { secret, leads: [{ rowId, nombre, ciudad, phone, status, notas, fuente }] }
//  Responde { inserted: [rowId,...], skipped: [rowId,...] }
//  inserted = quedaron en Cimiento (nuevos, o nota a alguien que ya estaba)
//  skipped  = ya habian entrado antes o les falta nombre/telefono
// ============================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ingest-secret",
};

const INGEST_LEAD_SECRET = Deno.env.get("INGEST_LEAD_SECRET") ?? "";
const MAX_BODY_BYTES = 200 * 1024; // lotes de leads del Sheet
const MAX_LEADS_PER_CALL = 200;

// Quita caracteres de control (menos \n y \t) y recorta al maximo permitido.
function clean(v: unknown, max: number): string {
  // deno-lint-ignore no-control-regex
  return String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
}

// Comparacion en tiempo constante: se comparan hashes SHA-256 (misma longitud).
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
const CIMIENTO_LEADS_URL =
  Deno.env.get("CIMIENTO_LEADS_URL") ??
  "https://cimiento-mx-construccion.lovable.app/api/public/tryla/leads";
const CIMIENTO_LEADS_TOKEN = Deno.env.get("CIMIENTO_LEADS_TOKEN") ?? "";

type IncomingLead = {
  rowId?: string | number;
  nombre?: string;
  ciudad?: string;
  phone?: string;
  status?: string;
  notas?: string;
  fuente?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!INGEST_LEAD_SECRET) {
      return json({ error: "Falta configurar el secret INGEST_LEAD_SECRET en Edge Functions." }, 500);
    }
    if (!CIMIENTO_LEADS_TOKEN) {
      return json({ error: "Falta configurar el secret CIMIENTO_LEADS_TOKEN en Edge Functions." }, 500);
    }

    const declared = Number(req.headers.get("content-length") || 0);
    if (declared > MAX_BODY_BYTES) return json({ error: "Solicitud demasiado grande." }, 413);
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return json({ error: "Solicitud demasiado grande." }, 413);
    let body: { secret?: unknown; leads?: unknown } = {};
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") body = parsed;
    } catch (_) {
      return json({ error: "JSON invalido." }, 400);
    }

    // Preferido: header x-ingest-secret. El secret en el body se sigue aceptando
    // para no romper el Apps Script actual del Sheet (migrar y quitar despues).
    const provided = req.headers.get("x-ingest-secret") ?? (typeof body.secret === "string" ? body.secret : "");
    if (!(await safeEqual(provided, INGEST_LEAD_SECRET))) {
      return json({ error: "Secret invalido." }, 403);
    }

    const incoming: IncomingLead[] = Array.isArray(body.leads) ? (body.leads as IncomingLead[]).slice(0, MAX_LEADS_PER_CALL) : [];
    if (!incoming.length) return json({ inserted: [], skipped: [] });

    const skipped: (string | number)[] = [];
    const conRow = incoming.filter((lead) => {
      if (lead.rowId === undefined || lead.rowId === null || !clean(lead.nombre, 120) || clean(lead.rowId, 60) === "") {
        skipped.push(lead.rowId ?? "?");
        return false;
      }
      return true;
    });

    // Mismo prefijo que usaba el CRM viejo: un lead del Sheet que ya se
    // importo a Cimiento con ese id no se duplica.
    const refDe = (lead: IncomingLead) => "sheet-" + clean(lead.rowId, 60);
    const res = await fetch(CIMIENTO_LEADS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + CIMIENTO_LEADS_TOKEN },
      body: JSON.stringify({
        leads: conRow.map((lead) => ({
          ref: refDe(lead),
          canal: "sheet",
          nombre: clean(lead.nombre, 120),
          phone: clean(lead.phone, 200),
          ciudad: clean(lead.ciudad, 120),
          notas: clean(lead.notas, 2000),
          fuente: clean(lead.fuente, 120),
        })),
      }),
    });
    if (!res.ok) throw new Error("Cimiento respondio " + res.status + ": " + (await res.text()).slice(0, 200));
    const respuesta = await res.json();

    const inserted: (string | number)[] = [];
    for (const lead of conRow) {
      const estado = respuesta.porRef?.[refDe(lead)]?.estado;
      if (estado === "nuevo" || estado === "ya_estaba") inserted.push(lead.rowId!);
      else skipped.push(lead.rowId!);
    }

    return json({ inserted, skipped });
  } catch (e) {
    console.error("[ingest-lead]", e);
    return json({ error: "Error inesperado." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
