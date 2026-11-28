#!/usr/bin/env node
// Uso:  node run.mjs "1500 Marilla St" "Dallas" [--estado TX] [--zona dallas-city] [--cocina tacos]
// Variables opcionales:
//   SUPABASE_URL, SUPABASE_ANON_KEY   (por defecto se leen de ../supabase-config.js; son las llaves PUBLICAS)
//   CENSUS_API_KEY                    poblacion e ingreso (sin ella queda como faltante)
//   SUPABASE_USER_JWT                 empleos desde Supabase (li_jobs_near)
//   JOBS_CSV                          rutas de li_jobs_parte*.csv, separadas por coma (empleos sin base de datos)
import { readFileSync } from "node:fs";
import { analizarUbicacion } from "./analyze-location.mjs";
import { crearCensusGeocoder } from "./providers/census-geocoder.mjs";
import { crearSupabasePlaces } from "./providers/supabase-places.mjs";
import { crearAcsApi } from "./providers/acs-api.mjs";
import { crearJobsRpc } from "./providers/jobs-rpc.mjs";
import { crearJobsCsv } from "./providers/jobs-csv.mjs";

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(`--${n}`); return i === -1 ? null : args[i + 1]; };
const pos = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
if (pos.length < 2) { console.error('Uso: node run.mjs "<direccion>" "<ciudad>" [--estado TX] [--zona x] [--cocina x]'); process.exit(2); }

let url = process.env.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY;
if (!url || !key) {
  const cfg = readFileSync(new URL("../supabase-config.js", import.meta.url), "utf8");
  url = url || (cfg.match(/url:\s*"([^"]+)"/) || [])[1];
  key = key || (cfg.match(/anonKey:\s*"([^"]+)"/) || [])[1];
}
const lugares = crearSupabasePlaces({ url, key });
const proveedores = {
  geocode: crearCensusGeocoder(),
  places: lugares.places,
  coverage: lugares.coverage,
  acs: process.env.CENSUS_API_KEY ? crearAcsApi({ key: process.env.CENSUS_API_KEY }) : undefined,
  jobs: process.env.JOBS_CSV ? crearJobsCsv(process.env.JOBS_CSV.split(",")) : process.env.SUPABASE_USER_JWT ? crearJobsRpc({ url, key, jwt: process.env.SUPABASE_USER_JWT }) : undefined,
};
const r = await analizarUbicacion({ direccion: pos[0], ciudad: pos[1], estado: flag("estado"), zona: flag("zona"), cocina: flag("cocina") }, proveedores);
console.log(JSON.stringify(r, null, 2));
