// Empleos (LODES) desde un CSV local (li_jobs_parte*.csv). Para pruebas y verificacion sin base de datos.
import { readFileSync } from "node:fs";
import { millasEntre } from "../analyze-location.mjs";

export function crearJobsCsv(rutas) {
  const celdas = new Map();
  const key = (la, lo) => `${Math.floor(la * 20)}:${Math.floor(lo * 20)}`; // celdas de 0.05 grados
  for (const ruta of [].concat(rutas)) {
    const lineas = readFileSync(ruta, "utf8").split("\n");
    for (let i = 1; i < lineas.length; i++) {
      if (!lineas[i]) continue;
      const [, la, lo, j, f, r] = lineas[i].split(",");
      const fila = { lat: +la, lon: +lo, jobs: +j, food: +f, retail: +r };
      const k = key(fila.lat, fila.lon);
      (celdas.get(k) || celdas.set(k, []).get(k)).push(fila);
    }
  }
  return async function jobs(lat, lon, radio) {
    const dLat = radio / 69, dLon = radio / (69 * Math.cos((lat * Math.PI) / 180));
    let jobsT = 0, food = 0, retail = 0, bloques = 0;
    for (let a = Math.floor((lat - dLat) * 20); a <= Math.floor((lat + dLat) * 20); a++) {
      for (let b = Math.floor((lon - dLon) * 20); b <= Math.floor((lon + dLon) * 20); b++) {
        for (const f of celdas.get(`${a}:${b}`) || []) {
          if (millasEntre({ lat, lon }, f) <= radio) { jobsT += f.jobs; food += f.food; retail += f.retail; bloques++; }
        }
      }
    }
    if (!bloques) return null;
    return {
      data: { empleos: jobsT, empleos_comida: food, empleos_comercio: retail, bloques, anio: 2024 },
      evidencia: { fuente: "US Census Bureau (LEHD)", dataset: "LODES8 WAC (S000, JT00)", version: "2024", url: "https://lehd.ces.census.gov/data/lodes/" },
    };
  };
}
