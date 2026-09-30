// ============================================================
//  sync-places
//  Jala restaurantes y "anclas" de trafico (gasolineras, templos,
//  bares/pubs/clubes, estadios, centros comerciales, cines/teatros)
//  de Geoapify Places API para una zona (bbox) y los guarda en
//  li_places. Solo staff puede llamarla (CRM).
//
//  Nota: Geoapify no tiene categoria de "construccion nueva" — ese
//  dato (senal de colonias/desarrollos en crecimiento) se queda sin
//  cubrir con esta fuente. Todo lo demas si.
//
//  Guarda tambien en li_coverage_areas cuando se jalo cada zona,
//  para no repetir trabajo si despues se expande de Dallas a
//  todo Texas — solo se jalan las zonas nuevas.
//
//  Deploy:  Dashboard -> Edge Functions -> sync-places -> Via Editor
//  Secret nuevo requerido: GEOAPIFY_API_KEY (gratis, sin tarjeta,
//  se saca en geoapify.com). Se configura en Edge Functions -> Secrets.
//
//  Body esperado: { area_name, label?, bbox: {south,west,north,east}, force? }
//  "force" vuelve a jalar aunque la zona ya se haya jalado antes.
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

const GEOAPIFY_API_KEY = Deno.env.get("GEOAPIFY_API_KEY") ?? "";

// Nombres de categoria verificados uno por uno contra la API real de
// Geoapify (su documentacion no los lista todos de forma clara).
const GEOAPIFY_CATEGORIES = [
  "catering.restaurant",
  "catering.fast_food",
  "catering.cafe",
  "catering.food_court",
  "service.vehicle.fuel",
  "religion.place_of_worship",
  "catering.bar",
  "catering.pub",
  "adult.nightclub",
  "sport.stadium",
  "commercial.shopping_mall",
  "entertainment.cinema",
  "entertainment.culture.theatre",
].join(",");

type Bbox = { south: number; west: number; north: number; east: number };

type GeoapifyFeature = {
  geometry?: { coordinates?: [number, number] };
  properties: {
    name?: string;
    categories?: string[];
    city?: string;
    state?: string;
    datasource?: { raw?: Record<string, unknown> };
  };
};

async function requireStaff(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data: userData, error } = await sb.auth.getUser(jwt);
  if (error || !userData.user) return null;
  const { data: staff } = await sb
    .from("staff_users")
    .select("user_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  return staff ? userData.user.id : null;
}

function categorize(categories: string[], name: string): string {
  const has = (prefix: string) => categories.some((c) => c === prefix || c.startsWith(prefix + "."));
  if (has("catering.food_court") || /food truck|food ?park/i.test(name)) return "food_park";
  if (has("catering.restaurant") || has("catering.fast_food") || has("catering.cafe")) return "restaurant";
  if (has("service.vehicle.fuel")) return "fuel";
  if (has("religion.place_of_worship")) return "worship";
  if (has("catering.bar") || has("catering.pub") || has("adult.nightclub")) return "bar";
  if (has("sport.stadium")) return "stadium";
  if (has("commercial.shopping_mall")) return "mall";
  if (has("entertainment.cinema") || has("entertainment.culture.theatre")) return "entertainment";
  return "other";
}

// Parte un bbox grande en una cuadricula de celdas de ~tileMiles de lado.
// Geoapify tope a 500 resultados por llamada, y una ciudad como Dallas
// supera eso si se pide de un jalon — pedir en celdas chicas evita perder
// lugares en las zonas mas densas.
function tileBbox(bbox: Bbox, tileMiles: number): Bbox[] {
  const midLat = (bbox.south + bbox.north) / 2;
  const latStep = tileMiles / 69;
  const lonStep = tileMiles / (69 * Math.cos((midLat * Math.PI) / 180));
  const tiles: Bbox[] = [];
  for (let s = bbox.south; s < bbox.north; s += latStep) {
    for (let w = bbox.west; w < bbox.east; w += lonStep) {
      tiles.push({
        south: s,
        west: w,
        north: Math.min(s + latStep, bbox.north),
        east: Math.min(w + lonStep, bbox.east),
      });
    }
  }
  return tiles;
}

async function fetchGeoapifyTile(bbox: Bbox): Promise<GeoapifyFeature[]> {
  const filter = `rect:${bbox.west},${bbox.south},${bbox.east},${bbox.north}`;
  const url = `https://api.geoapify.com/v2/places?categories=${GEOAPIFY_CATEGORIES}&filter=${filter}&limit=500&apiKey=${GEOAPIFY_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geoapify respondio ${res.status}`);
  const data = await res.json();
  return (data.features as GeoapifyFeature[]) || [];
}

// Corre las llamadas de las celdas en tandas paralelas en vez de una por
// una, para que sincronizar una ciudad completa no se tarde tanto como
// para tronar el limite de tiempo de la Edge Function. Si una celda falla
// se ignora (no tira toda la sincronizacion) — el resto de celdas igual
// se guardan.
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    results.push(...(await Promise.all(batch.map(fn))));
  }
  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!GEOAPIFY_API_KEY) {
      return json({ error: "Falta configurar el secret GEOAPIFY_API_KEY en Edge Functions." }, 500);
    }

    const staffId = await requireStaff(req);
    if (!staffId) return json({ error: "Solo el staff puede sincronizar lugares." }, 403);

    const { area_name, label, bbox, force } = await req.json();
    if (!area_name || !bbox) return json({ error: "Faltan datos (area_name, bbox)." }, 400);

    if (!force) {
      const { data: existing } = await sb
        .from("li_coverage_areas")
        .select("area_name, pulled_at, place_count")
        .eq("area_name", area_name)
        .maybeSingle();
      if (existing) {
        const ageDays = (Date.now() - new Date(existing.pulled_at).getTime()) / 86400000;
        if (ageDays < 365) {
          return json({
            skipped: true,
            reason: `"${area_name}" ya se jalo hace ${Math.round(ageDays)} dias (menos de un ano). Manda force:true para forzar.`,
            place_count: existing.place_count,
            pulled_at: existing.pulled_at,
          });
        }
      }
    }

    const tiles = tileBbox(bbox as Bbox, 3);
    const tileResults = await mapWithConcurrency(tiles, 6, (tile) =>
      fetchGeoapifyTile(tile).catch((e) => {
        console.error("[sync-places] una celda fallo:", e);
        return [] as GeoapifyFeature[];
      })
    );
    const allFeatures = tileResults.flat();

    const seen = new Set<string>();
    const rows: {
      osm_type: string;
      osm_id: number;
      category: string;
      name: string | null;
      cuisine: string | null;
      lat: number;
      lon: number;
      city: string | null;
      state: string | null;
      tags: Record<string, unknown>;
      pulled_at: string;
    }[] = [];

    for (const f of allFeatures) {
      const raw = f.properties.datasource?.raw || {};
      const osmId = raw.osm_id;
      if (osmId == null) continue;
      const osmType = String(raw.osm_type || "node");
      const key = `${osmType}:${osmId}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const lat = (raw.lat as number) ?? f.geometry?.coordinates?.[1];
      const lon = (raw.lon as number) ?? f.geometry?.coordinates?.[0];
      if (lat == null || lon == null) continue;

      rows.push({
        osm_type: osmType,
        osm_id: Number(osmId),
        category: categorize(f.properties.categories || [], f.properties.name || ""),
        name: f.properties.name || null,
        cuisine: (raw.cuisine as string) || null,
        lat,
        lon,
        city: f.properties.city || null,
        state: f.properties.state || null,
        tags: raw,
        pulled_at: new Date().toISOString(),
      });
    }

    if (rows.length) {
      const { error: upsertErr } = await sb
        .from("li_places")
        .upsert(rows, { onConflict: "osm_type,osm_id" });
      if (upsertErr) throw upsertErr;
    }

    await sb.from("li_coverage_areas").upsert(
      {
        area_name,
        label: label || area_name,
        bbox,
        place_count: rows.length,
        pulled_at: new Date().toISOString(),
      },
      { onConflict: "area_name" }
    );

    const byCategory: Record<string, number> = {};
    for (const r of rows) byCategory[r.category] = (byCategory[r.category] || 0) + 1;

    return json({ area_name, tiles: tiles.length, place_count: rows.length, by_category: byCategory });
  } catch (e) {
    console.error("[sync-places]", e);
    return json({ error: e instanceof Error ? e.message : "Error inesperado." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
