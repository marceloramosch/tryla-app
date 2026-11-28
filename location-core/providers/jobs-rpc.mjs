// Empleos (LODES) desde Supabase con la funcion li_jobs_near. Requiere sesion (JWT de un usuario autenticado).
export function crearJobsRpc({ url, key, jwt, fetchImpl = fetch }) {
  return async function jobs(lat, lon, radio) {
    if (!jwt) throw new Error("Falta la sesion (JWT) para leer li_jobs");
    const res = await fetchImpl(`${url}/rest/v1/rpc/li_jobs_near`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_lat: lat, p_lon: lon, p_miles: radio }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`li_jobs_near respondio ${res.status}`);
    const fila = (await res.json())[0];
    if (!fila || Number(fila.blocks) === 0) return null;
    return {
      data: { empleos: Number(fila.jobs), empleos_comida: Number(fila.food_jobs), empleos_comercio: Number(fila.retail_jobs), bloques: Number(fila.blocks), anio: 2024 },
      evidencia: { fuente: "US Census Bureau (LEHD)", dataset: "LODES8 WAC (S000, JT00)", version: "2024", url: "https://lehd.ces.census.gov/data/lodes/" },
    };
  };
}
