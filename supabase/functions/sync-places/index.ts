// ============================================================
//  sync-places
//  Jala restaurantes y "anclas" de trafico (gasolineras, iglesias,
//  bares, clubes, estadios, plazas, cines) de OpenStreetMap
//  (Overpass API, gratis, sin llave) para una zona (bbox) y los
//  guarda en li_places. Solo staff puede llamarla (CRM).
//
//  Guarda tambien en li_coverage_areas cuando se jalo cada zona,
//  para no repetir trabajo si despues se expande de Dallas a
//  todo Texas — solo se jalan las zonas nuevas.
//
//  Deploy:  supabase functions deploy sync-places
//  Sin secrets nuevos — Overpass es publico y no pide llave.
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

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

type Bbox = { south: number; west: number; north: number; east: number };

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
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

function overpassQuery(bbox: Bbox) {
  const b = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  return `[out:json][timeout:55];(
    node["amenity"~"^(restaurant|fast_food|cafe)$"](${b});
    node["amenity"="fuel"](${b});
    node["amenity"="place_of_worship"](${b});
    node["amenity"~"^(bar|nightclub|pub)$"](${b});
    node["leisure"~"^(stadium|sports_centre)$"](${b});
    node["shop"="mall"](${b});
    node["amenity"~"^(cinema|theatre)$"](${b});
    nwr["amenity"="food_court"](${b});
    nwr["name"~"food truck|food park|foodpark",i](${b});
    way["building"="construction"](${b});
    node["construction"](${b});
  );out center;`;
}

function categorize(tags: Record<string, string>): string {
  const amenity = tags.amenity;
  const leisure = tags.leisure;
  const name = (tags.name || "").toLowerCase();
  if (tags.building === "construction" || tags.construction) return "construction";
  if (amenity === "food_court" || /food truck|food ?park/.test(name)) return "food_park";
  if (amenity === "restaurant" || amenity === "fast_food" || amenity === "cafe") return "restaurant";
  if (amenity === "fuel") return "fuel";
  if (amenity === "place_of_worship") return "worship";
  if (amenity === "bar" || amenity === "nightclub" || amenity === "pub") return "bar";
  if (leisure === "stadium" || leisure === "sports_centre") return "stadium";
  if (tags.shop === "mall") return "mall";
  if (amenity === "cinema" || amenity === "theatre") return "entertainment";
  return "other";
}

async function fetchOverpass(bbox: Bbox) {
  const body = "data=" + encodeURIComponent(overpassQuery(bbox));
  let lastErr: unknown = null;
  // Un solo intento por endpoint — Overpass compartido puede quedarse
  // saturado por minutos/horas seguidas, asi que reintentar varias veces
  // DENTRO de una sola llamada solo arriesga tronar el limite de tiempo
  // de la Edge Function. Mejor fallar rapido y que quien llama reintente
  // mas tarde (unos minutos despues) en una llamada nueva.
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      if (res.status === 429) {
        lastErr = new Error("Overpass respondio 429 (saturado ahorita)");
        continue;
      }
      if (!res.ok) throw new Error(`Overpass respondio ${res.status}`);
      const data = await res.json();
      return data.elements as OverpassElement[];
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("No se pudo contactar Overpass.");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
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

    const elements = await fetchOverpass(bbox as Bbox);

    const rows = elements
      .map((el) => {
        const lat = el.lat ?? el.center?.lat;
        const lon = el.lon ?? el.center?.lon;
        if (lat == null || lon == null) return null;
        return {
          osm_type: el.type,
          osm_id: el.id,
          category: categorize(el.tags || {}),
          name: el.tags?.name || null,
          cuisine: el.tags?.cuisine || null,
          lat,
          lon,
          city: el.tags?.["addr:city"] || null,
          state: el.tags?.["addr:state"] || null,
          tags: el.tags || {},
          pulled_at: new Date().toISOString(),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

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

    return json({ area_name, place_count: rows.length, by_category: byCategory });
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
