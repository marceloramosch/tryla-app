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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INGEST_LEAD_SECRET = Deno.env.get("INGEST_LEAD_SECRET") ?? "";
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

    const body = await req.json();
    if (body.secret !== INGEST_LEAD_SECRET) {
      return json({ error: "Secret invalido." }, 403);
    }

    const incoming: IncomingLead[] = Array.isArray(body.leads) ? body.leads : [];
    if (!incoming.length) return json({ inserted: [], skipped: [] });

    const skipped: (string | number)[] = [];
    const conRow = incoming.filter((lead) => {
      if (lead.rowId === undefined || lead.rowId === null || !lead.nombre) {
        skipped.push(lead.rowId ?? "?");
        return false;
      }
      return true;
    });

    // Mismo prefijo que usaba el CRM viejo: un lead del Sheet que ya se
    // importo a Cimiento con ese id no se duplica.
    const refDe = (lead: IncomingLead) => "sheet-" + lead.rowId;
    const res = await fetch(CIMIENTO_LEADS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + CIMIENTO_LEADS_TOKEN },
      body: JSON.stringify({
        leads: conRow.map((lead) => ({
          ref: refDe(lead),
          canal: "sheet",
          nombre: lead.nombre,
          phone: lead.phone,
          ciudad: lead.ciudad,
          notas: lead.notas,
          fuente: lead.fuente,
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
    return json({ error: e instanceof Error ? e.message : "Error inesperado." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
