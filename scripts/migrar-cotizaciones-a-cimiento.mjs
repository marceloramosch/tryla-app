// ============================================================
//  Migracion unica: las cotizaciones del CRM (nova_store.novaQuotes)
//  pasan a Cimiento con sus lineas (descuentos incluidos), idioma,
//  garantia, deposito, notas y financiamiento. La que ya tenia
//  abonos o invoice abre un cobro con sus pagos en Cobros.
//
//  Va despues de migrar-leads-a-cimiento.mjs: cada cotizacion se
//  liga a su lead por el id con que el lead entro a Cimiento.
//  Se puede correr mas de una vez: Cimiento reconoce cada
//  cotizacion por su id de aqui y no la duplica.
//
//  Uso (Node 18+), leyendo nova_store de una de dos formas:
//    TRYLA_SERVICE_ROLE_KEY=... node scripts/migrar-cotizaciones-a-cimiento.mjs --probar
//    node scripts/migrar-cotizaciones-a-cimiento.mjs --desde-csv <export de nova_store.csv> --probar
//  Sin --probar manda de verdad (requiere CIMIENTO_LEADS_TOKEN).
//
//  Variables: las mismas que migrar-leads-a-cimiento.mjs, mas
//    CIMIENTO_COTIZACIONES_URL  opcional; por omision la de produccion
// ============================================================
import { leerNovaStore } from "./nova-store.mjs";

const TRYLA_URL = process.env.TRYLA_SUPABASE_URL ?? "https://dcuescldzrgcppubcoxq.supabase.co";
const TRYLA_KEY = process.env.TRYLA_SERVICE_ROLE_KEY ?? "";
const CIMIENTO_URL =
  process.env.CIMIENTO_COTIZACIONES_URL ??
  "https://cimiento-mx-construccion.lovable.app/api/public/tryla/cotizaciones";
const CIMIENTO_TOKEN = process.env.CIMIENTO_LEADS_TOKEN ?? "";
const PROBAR = process.argv.includes("--probar");
const CSV = argumento("--desde-csv");
const TANDA = 50;

if (!CSV && !TRYLA_KEY) salir("Falta TRYLA_SERVICE_ROLE_KEY (o usa --desde-csv <archivo>)");
if (!CIMIENTO_TOKEN && !PROBAR) salir("Falta CIMIENTO_LEADS_TOKEN");

const fuente = { csv: CSV, url: TRYLA_URL, llave: TRYLA_KEY };
const [valorCotizaciones, valorClientes] = await Promise.all([
  leerNovaStore("novaQuotes", fuente),
  leerNovaStore("novaClients", fuente),
]).catch((e) => salir(e.message));
const cotizaciones = Array.isArray(valorCotizaciones) ? valorCotizaciones : [];
const idsDeLeads = new Set((Array.isArray(valorClientes) ? valorClientes : []).map((c) => c.id));
console.log(`${cotizaciones.length} cotizaciones en el CRM de tryla-app`);

// Se manda tal cual: Cimiento entiende los nombres del CRM viejo.
const total = (q) => (q.lineItems ?? []).reduce((s, l) => s + (parseFloat(l.price) || 0) * (parseFloat(l.qty) || 1), 0);
const cuenta = (f) => cotizaciones.reduce((n, q) => n + f(q), 0);
console.log("Resumen:", {
  lineas: cuenta((q) => (q.lineItems ?? []).length),
  descuentos: cuenta((q) => (q.lineItems ?? []).filter((l) => parseFloat(l.price) < 0).length),
  conFinanciamiento: cuenta((q) => (q.finance ? 1 : 0)),
  conAbonosOInvoice: cuenta((q) => ((q.payments ?? []).length || q.invoiceCreated ? 1 : 0)),
  sinLeadEnElCrm: cuenta((q) => (idsDeLeads.has(q.clientId) ? 0 : 1)),
  totalUsd: Math.round(cuenta(total)),
});

if (PROBAR) {
  console.log("--probar: no se mandó nada.");
  process.exit(0);
}

const suma = { nuevas: 0, repetidas: 0, cobros: 0, sinLead: [], invalidas: [] };
for (let i = 0; i < cotizaciones.length; i += TANDA) {
  const tanda = cotizaciones.slice(i, i + TANDA);
  const r = await fetch(CIMIENTO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${CIMIENTO_TOKEN}` },
    body: JSON.stringify({ cotizaciones: tanda }),
  });
  if (!r.ok) salir(`Cimiento respondió ${r.status} en la tanda ${i / TANDA + 1}: ${await r.text()}`);
  const resultado = await r.json();
  suma.nuevas += resultado.nuevas;
  suma.repetidas += resultado.repetidas;
  suma.cobros += resultado.cobros;
  suma.sinLead.push(...resultado.sinLead);
  for (const inv of resultado.invalidas) suma.invalidas.push({ ref: tanda[inv.indice]?.id, motivo: inv.motivo });
  console.log(`Tanda ${i / TANDA + 1}: ${resultado.nuevas} nuevas, ${resultado.repetidas} repetidas, ${resultado.cobros} cobros`);
}

console.log(`\nListo: ${suma.nuevas} nuevas, ${suma.repetidas} repetidas, ${suma.cobros} cobros abiertos.`);
if (suma.sinLead.length) console.log(`${suma.sinLead.length} sin lead en Cimiento (corre antes la migración de leads):`, suma.sinLead.join(", "));
if (suma.invalidas.length) {
  console.log(`${suma.invalidas.length} no entraron:`);
  for (const inv of suma.invalidas) console.log(`  ${inv.ref} · ${inv.motivo}`);
}

function argumento(nombre) {
  const i = process.argv.indexOf(nombre);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function salir(mensaje) {
  console.error(mensaje);
  process.exit(1);
}
