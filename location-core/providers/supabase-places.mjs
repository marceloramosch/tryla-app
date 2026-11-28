// Lugares (li_places) y zonas cubiertas (li_coverage_areas) desde Supabase.
// Usa la llave PUBLICA (anon): estas dos tablas son de lectura abierta.
const MI_POR_GRADO_LAT = 69;

async function leerTodo(fetchImpl, url, headers, pagina = 1000) {
  const filas = [];
  for (let off = 0; ; off += pagina) {
    const res = await fetchImpl(`${url}&limit=${pagina}&offset=${off}`, { headers, signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`Supabase respondio ${res.status}`);
    const lote = await res.json();
    filas.push(...lote);
    if (lote.length < pagina) return filas;
  }
}

export function crearSupabasePlaces({ url, key, fetchImpl = fetch }) {
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  let zonas = null;
  return {
    async places(lat, lon, radio) {
      const dLat = radio / MI_POR_GRADO_LAT;
      const dLon = radio / (MI_POR_GRADO_LAT * Math.cos((lat * Math.PI) / 180));
      const q = new URLSearchParams({ select: "category,cuisine,name,lat,lon", order: "id" });
      q.append("lat", `gte.${lat - dLat}`); q.append("lat", `lte.${lat + dLat}`);
      q.append("lon", `gte.${lon - dLon}`); q.append("lon", `lte.${lon + dLon}`);
      const data = await leerTodo(fetchImpl, `${url}/rest/v1/li_places?${q}`, headers);
      return {
        data,
        evidencia: { fuente: "OpenStreetMap via Geoapify", dataset: "li_places", version: "carga sep-oct 2026", url: "https://www.geoapify.com/places-api/" },
      };
    },
    async coverage(lat, lon) {
      if (!zonas) zonas = await leerTodo(fetchImpl, `${url}/rest/v1/li_coverage_areas?select=area_name,bbox,pulled_at&order=area_name`, headers);
      const z = zonas.find((r) => lat >= r.bbox.south && lat <= r.bbox.north && lon >= r.bbox.west && lon <= r.bbox.east);
      if (!z) return null;
      return {
        data: { area_name: z.area_name, pulled_at: z.pulled_at },
        evidencia: { fuente: "Tryla", dataset: "li_coverage_areas", version: String(z.pulled_at).slice(0, 10), url: "supabase:li_coverage_areas" },
      };
    },
  };
}
