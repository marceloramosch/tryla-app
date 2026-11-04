// ============================================================
//  Migracion unica: los leads del CRM (nova_store.novaClients)
//  pasan a Cimiento con todo lo que se trabajo aqui: etapa, fecha
//  de alta, negocio, notas, llamadas, historial de etapas, tareas
//  y el grupo (Utah Colds).
//
//  Se puede correr mas de una vez: Cimiento reconoce cada lead
//  por su id de aqui (ref) y no lo duplica; si el historial quedo
//  a medias, lo completa.
//
//  Uso (Node 18+), leyendo nova_store de una de dos formas:
//    TRYLA_SERVICE_ROLE_KEY=... node scripts/migrar-leads-a-cimiento.mjs --probar
//    node scripts/migrar-leads-a-cimiento.mjs --desde-csv <export de nova_store.csv> --probar
//  Sin --probar manda de verdad (requiere CIMIENTO_LEADS_TOKEN).
//
//  El CSV es el export del SQL Editor de:
//    select key, value, updated_at from public.nova_store;
//  Tiene datos de clientes: guardalo fuera de este repo.
//
//  Variables:
//    TRYLA_SERVICE_ROLE_KEY  service role del proyecto de Tryla (sin --desde-csv)
//    CIMIENTO_LEADS_TOKEN    el mismo valor que TRYLA_LEADS_TOKEN en Cimiento
//    TRYLA_SUPABASE_URL      opcional; por omision la de supabase-config.js
//    CIMIENTO_LEADS_URL      opcional; por omision la de produccion
// ============================================================
import { leerNovaStore } from "./nova-store.mjs";

const TRYLA_URL = process.env.TRYLA_SUPABASE_URL ?? "https://dcuescldzrgcppubcoxq.supabase.co";
const TRYLA_KEY = process.env.TRYLA_SERVICE_ROLE_KEY ?? "";
const CIMIENTO_URL =
  process.env.CIMIENTO_LEADS_URL ?? "https://cimiento-mx-construccion.lovable.app/api/public/tryla/leads";
const CIMIENTO_TOKEN = process.env.CIMIENTO_LEADS_TOKEN ?? "";
const PROBAR = process.argv.includes("--probar");
const CSV = argumento("--desde-csv");
const TANDA = 200;

if (!CSV && !TRYLA_KEY) salir("Falta TRYLA_SERVICE_ROLE_KEY (o usa --desde-csv <archivo>)");
if (!CIMIENTO_TOKEN && !PROBAR) salir("Falta CIMIENTO_LEADS_TOKEN");

const valor = await leerNovaStore("novaClients", { csv: CSV, url: TRYLA_URL, llave: TRYLA_KEY }).catch((e) =>
  salir(e.message),
);
const clientes = Array.isArray(valor) ? valor : [];
console.log(`${clientes.length} leads en el CRM de tryla-app`);

const leads = clientes.map((c) => ({
  canal: "importacion",
  ref: c.id,
  name: c.name,
  contacto: c.contacto,
  ciudad: c.ciudad,
  status: c.status,
  createdAt: fechaDeAlta(c),
  fuente: c.fuente,
  negocio: c.negocio,
  grupo: c.grupo,
  noteLog: c.noteLog,
  stageHistory: c.stageHistory,
  tasks: c.tasks,
  callCount: c.callCount,
  lastCallAt: c.lastCallAt,
  notas:
    [
      c.assignedTo ? `Lo llevaba: ${c.assignedTo}` : "",
      c.needsFinancing === true ? "Necesita financiamiento." : "",
      c.downpayment ? `Downpayment: ${c.downpayment}` : "",
      c.notas ?? "",
    ]
      .filter(Boolean)
      .join("\n") || undefined,
}));

const cuenta = (f) => leads.reduce((n, l) => n + f(l), 0);
const porEtapa = {};
for (const l of leads) porEtapa[l.status ?? "(sin estatus)"] = (porEtapa[l.status ?? "(sin estatus)"] ?? 0) + 1;
console.log("Por estatus:", porEtapa);
console.log("Sin teléfono ni correo (entran igual):", cuenta((l) => (l.contacto ? 0 : 1)));
console.log("Historial a migrar:", {
  notas: cuenta((l) => (l.noteLog ?? []).length),
  etapas: cuenta((l) => (l.stageHistory ?? []).length),
  tareas: cuenta((l) => (l.tasks ?? []).length),
  conLlamadas: cuenta((l) => (l.callCount ? 1 : 0)),
  enGrupo: cuenta((l) => (l.grupo ? 1 : 0)),
  conNegocio: cuenta((l) => (l.negocio ? 1 : 0)),
});

if (PROBAR) {
  console.log("--probar: no se mandó nada.");
  process.exit(0);
}

const total = { nuevos: 0, yaEstaban: 0, repetidos: 0, invalidos: [] };
for (let i = 0; i < leads.length; i += TANDA) {
  const tanda = leads.slice(i, i + TANDA);
  const r = await fetch(CIMIENTO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${CIMIENTO_TOKEN}` },
    body: JSON.stringify({ leads: tanda }),
  });
  if (!r.ok) salir(`Cimiento respondió ${r.status} en la tanda ${i / TANDA + 1}: ${await r.text()}`);
  const resultado = await r.json();
  total.nuevos += resultado.nuevos;
  total.yaEstaban += resultado.yaEstaban;
  total.repetidos += resultado.repetidos;
  for (const inv of resultado.invalidos) {
    const lead = tanda[inv.indice];
    total.invalidos.push({ ref: lead?.ref, motivo: inv.motivo });
  }
  console.log(`Tanda ${i / TANDA + 1}: ${resultado.nuevos} nuevos, ${resultado.yaEstaban} ya estaban, ${resultado.repetidos} repetidos`);
}

console.log(`\nListo: ${total.nuevos} nuevos, ${total.yaEstaban} ya estaban, ${total.repetidos} repetidos.`);
if (total.invalidos.length) {
  console.log(`${total.invalidos.length} no entraron:`);
  for (const inv of total.invalidos) console.log(`  ${inv.ref} · ${inv.motivo}`);
}

// Los ids "c<milisegundos>" son de antes de que existiera createdAt; los del
// Sheet ("sheet-<fila>") nunca la guardaron: queda la fecha mas vieja de su
// historial, y si no hay ninguna, Cimiento pone la de la importacion.
function fechaDeAlta(c) {
  if (c.createdAt) return c.createdAt;
  if (/^c\d+$/.test(c.id ?? "")) return Number(c.id.slice(1));
  const fechas = [
    ...(c.stageHistory ?? []).map((e) => e.at),
    ...(c.noteLog ?? []).map((n) => n.at),
    c.lastCallAt,
    c.movedAt,
  ].filter((f) => typeof f === "number" && f > 0);
  return fechas.length ? Math.min(...fechas) : undefined;
}

function argumento(nombre) {
  const i = process.argv.indexOf(nombre);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function salir(mensaje) {
  console.error(mensaje);
  process.exit(1);
}
