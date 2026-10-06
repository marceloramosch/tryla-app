// ============================================================
//  ingest-lead
//  Recibe leads nuevos del Google Sheet de captura (columna STATUS
//  ya usa Cold/Warm/HOT/Finance/Cash/Closed, igual que el Pipeline)
//  y los agrega a novaClients en nova_store, para que aparezcan
//  directo en la pestaña Pipeline del CRM sin captura manual.
//
//  Quien llama esto es un Apps Script del Sheet, no un usuario
//  logueado del CRM -- por eso se protege con un secret compartido
//  en vez de JWT de Supabase (como si usan census-lookup/sync-places).
//
//  Una vez que un lead ya entro al CRM (mismo rowId), no se vuelve
//  a tocar -- el Sheet solo alimenta leads nuevos, el pipeline manda
//  despues de eso (si alguien arrastra la tarjeta a otra etapa en el
//  CRM, un resync del Sheet no la regresa).
//
//  Deploy:  Dashboard -> Edge Functions -> ingest-lead -> Via Editor
//  Secret nuevo requerido: INGEST_LEAD_SECRET (cualquier cadena larga
//  que tu elijas -- el mismo valor va tambien en el Apps Script del
//  Sheet). Se configura en Edge Functions -> Secrets.
//
//  Body esperado:
//  { secret, leads: [{ rowId, nombre, ciudad, phone, status, notas, fuente }] }
//  Responde { inserted: [rowId,...], skipped: [rowId,...] }
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

const INGEST_LEAD_SECRET = Deno.env.get("INGEST_LEAD_SECRET") ?? "";

// Debe quedar igual a PIPELINE_STAGES en tryla-app.js
const VALID_STAGES = ["Cold", "Warm", "HOT", "Finance", "Cash", "Closed"];

type IncomingLead = {
  rowId?: string | number;
  nombre?: string;
  ciudad?: string;
  phone?: string;
  status?: string;
  notas?: string;
  fuente?: string;
};

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
    if (!INGEST_LEAD_SECRET) {
      return json({ error: "Falta configurar el secret INGEST_LEAD_SECRET en Edge Functions." }, 500);
    }

    const body = await req.json();
    if (body.secret !== INGEST_LEAD_SECRET) {
      return json({ error: "Secret invalido." }, 403);
    }

    const incoming: IncomingLead[] = Array.isArray(body.leads) ? body.leads : [];
    if (!incoming.length) return json({ inserted: [], skipped: [] });

    const { data: row, error: readError } = await sb
      .from("nova_store")
      .select("value")
      .eq("key", "novaClients")
      .maybeSingle();
    if (readError) throw readError;

    const clients: Client[] = Array.isArray(row?.value) ? (row!.value as Client[]) : [];
    const existingIds = new Set(clients.map((c) => c.id));

    const inserted: (string | number)[] = [];
    const skipped: (string | number)[] = [];

    for (const lead of incoming) {
      const rowId = lead.rowId;
      if (rowId === undefined || rowId === null || !lead.nombre) {
        skipped.push(rowId ?? "?");
        continue;
      }
      const id = "sheet-" + rowId;
      if (existingIds.has(id)) {
        skipped.push(rowId);
        continue;
      }

      const status = VALID_STAGES.includes(lead.status || "") ? (lead.status as string) : "Cold";
      clients.push({
        id,
        name: String(lead.nombre).trim(),
        contacto: (lead.phone || "").trim(),
        negocio: "",
        ciudad: (lead.ciudad || "").trim(),
        status,
        notas: (lead.notas || "").trim(),
        fuente: (lead.fuente || "").trim(),
        createdAt: Date.now(),
      });
      existingIds.add(id);
      inserted.push(rowId);
    }

    if (inserted.length) {
      const { error: writeError } = await sb
        .from("nova_store")
        .upsert({ key: "novaClients", value: clients, updated_at: new Date().toISOString() });
      if (writeError) throw writeError;
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
