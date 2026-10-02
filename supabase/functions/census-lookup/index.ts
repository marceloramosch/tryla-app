// ============================================================
//  census-lookup
//  Dado un punto (lat, lon), regresa el perfil demografico real
//  del census tract donde cae — poblacion y ingreso mediano por
//  hogar, del Census Bureau de USA (ACS 5-year estimates).
//
//  Reemplaza el "demo=55" (placeholder neutral) que usaba
//  Location Intelligence antes de esto. Cualquier usuario con
//  sesion activa puede llamarla (no es staff-only, como
//  sync-places) — es de solo lectura, no toca nuestra base de
//  datos para nada.
//
//  El Census Geocoder no acepta llamadas directas desde el
//  navegador (sin CORS), por eso esto vive en una Edge Function
//  en vez de llamarse directo desde location-intel.js.
//
//  Deploy:  Dashboard -> Edge Functions -> census-lookup -> Via Editor
//  Secret nuevo requerido: CENSUS_API_KEY (gratis, sin tarjeta,
//  se saca en api.census.gov/data/key_signup.html). Se configura
//  en Edge Functions -> Secrets.
//
//  Body esperado: { lat, lon }
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

const CENSUS_API_KEY = Deno.env.get("CENSUS_API_KEY") ?? "";

// Vintages de ACS5 a intentar, de la mas nueva a la mas vieja — por si la
// mas reciente todavia no esta publicada cuando esto corre.
const ACS_YEARS = [2023, 2022, 2021];

async function requireAuth(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data, error } = await sb.auth.getUser(jwt);
  if (error || !data.user) return null;
  return data.user.id;
}

// El Census Geocoder y la API de ACS a veces tardan mucho o se quedan sin
// responder — sin limite de tiempo, esto colgaba toda la funcion (y por lo
// tanto el score y los lugares cercanos en el navegador, que esperan a que
// esto termine antes de dibujar nada). fetchWithTimeout() corta la espera.
async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

type TractRef = { state: string; county: string; tract: string };

async function geocodeTract(lat: number, lon: number): Promise<TractRef | null> {
  const url =
    `https://geocoding.geo.census.gov/geocoder/geographies/coordinates` +
    `?x=${lon}&y=${lat}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`;
  const res = await fetchWithTimeout(url, 6000);
  if (!res.ok) throw new Error(`Census geocoder respondio ${res.status}`);
  const data = await res.json();
  const geographies = (data && data.result && data.result.geographies) || {};
  const tractKey = Object.keys(geographies).find((k) => /tract/i.test(k));
  const tractInfo = tractKey && geographies[tractKey] && geographies[tractKey][0];
  if (!tractInfo || !tractInfo.STATE || !tractInfo.COUNTY || !tractInfo.TRACT) return null;
  return { state: String(tractInfo.STATE), county: String(tractInfo.COUNTY), tract: String(tractInfo.TRACT) };
}

type AcsResult = { year: number; population: number; medianIncome: number };

async function fetchAcsData(ref: TractRef): Promise<AcsResult | null> {
  for (const year of ACS_YEARS) {
    const url =
      `https://api.census.gov/data/${year}/acs/acs5?get=B01003_001E,B19013_001E` +
      `&for=tract:${ref.tract}&in=state:${ref.state}+county:${ref.county}&key=${CENSUS_API_KEY}`;
    try {
      const res = await fetchWithTimeout(url, 6000);
      if (!res.ok) continue;
      const rows = await res.json();
      if (!Array.isArray(rows) || rows.length < 2) continue;
      const dataRow = rows[1];
      const population = Number(dataRow[0]);
      const medianIncome = Number(dataRow[1]);
      // El Census usa -666666666 como centinela de "muestra insuficiente".
      if (!Number.isFinite(population) || !Number.isFinite(medianIncome) || medianIncome < 0) continue;
      return { year, population, medianIncome };
    } catch (_e) {
      continue;
    }
  }
  return null;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!CENSUS_API_KEY) {
      return json({ error: "Falta configurar el secret CENSUS_API_KEY en Edge Functions." }, 500);
    }

    const userId = await requireAuth(req);
    if (!userId) return json({ error: "Necesitas una sesion activa." }, 403);

    const { lat, lon } = await req.json();
    if (typeof lat !== "number" || typeof lon !== "number") {
      return json({ error: "Faltan datos (lat, lon)." }, 400);
    }

    const tract = await geocodeTract(lat, lon);
    if (!tract) return json({ error: "No se encontro el census tract para ese punto." }, 404);

    const acs = await fetchAcsData(tract);
    if (!acs) return json({ error: "No se encontraron datos de Census para ese tract." }, 404);

    // Normalizacion aproximada, anclada a promedios nacionales (no
    // calibrada contra una muestra real como traffic/space/gap): un tract
    // "lleno" ronda 8,000 habitantes, un ingreso mediano "alto" ronda
    // $120,000/hogar. Ajustar si en la practica el rango real observado
    // no se parece a esto.
    const popScore = clamp((acs.population / 8000) * 100, 0, 100);
    const incomeScore = clamp((acs.medianIncome / 120000) * 100, 0, 100);
    const demo = Math.round((popScore + incomeScore) / 2);

    return json({
      demo,
      population: acs.population,
      medianIncome: acs.medianIncome,
      year: acs.year,
    });
  } catch (e) {
    console.error("[census-lookup]", e);
    return json({ error: e instanceof Error ? e.message : "Error inesperado." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
