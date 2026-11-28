// Poblacion (B01003) e ingreso mediano por hogar (B19013) del census tract, ACS 5-year.
// Requiere CENSUS_API_KEY (gratis). Prueba el ano mas nuevo primero.
export function crearAcsApi({ key, fetchImpl = fetch, anios = [2023, 2022, 2021] }) {
  return async function acs(tractGeoid) {
    if (!key) throw new Error("Falta CENSUS_API_KEY");
    const g = String(tractGeoid);
    if (g.length !== 11) throw new Error("GEOID de tract invalido");
    const estado = g.slice(0, 2), condado = g.slice(2, 5), tract = g.slice(5);
    for (const anio of anios) {
      const url = `https://api.census.gov/data/${anio}/acs/acs5?get=B01003_001E,B19013_001E&for=tract:${tract}&in=state:${estado}+county:${condado}&key=${key}`;
      let res;
      try { res = await fetchImpl(url, { signal: AbortSignal.timeout(10000) }); } catch { continue; }
      if (!res.ok) continue;
      const filas = await res.json().catch(() => null);
      if (!Array.isArray(filas) || filas.length < 2) continue;
      const poblacion = Number(filas[1][0]);
      let ingreso = Number(filas[1][1]);
      if (!Number.isFinite(poblacion)) continue;
      if (!Number.isFinite(ingreso) || ingreso < 0) ingreso = null; // -666666666 = muestra insuficiente
      return {
        data: { poblacion, ingreso_mediano: ingreso, anio },
        evidencia: { fuente: "US Census Bureau", dataset: "ACS 5-year (B01003, B19013)", version: String(anio), url: `https://api.census.gov/data/${anio}/acs/acs5` },
      };
    }
    return null;
  };
}
