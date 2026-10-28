// ============================================================
//  Migracion unica: los leads del CRM (nova_store.novaClients)
//  pasan a Cimiento, con su etapa y su fecha de alta.
//
//  Se puede correr mas de una vez: Cimiento reconoce cada lead
//  por su id de aqui (ref) y no lo duplica.
//
//  Uso (Node 18+):
//    TRYLA_SERVICE_ROLE_KEY=... CIMIENTO_LEADS_TOKEN=... \
//      node scripts/migrar-leads-a-cimiento.mjs --probar
//    (sin --probar manda de verdad)
//
//  Variables:
//    TRYLA_SERVICE_ROLE_KEY  service role del proyecto de Tryla (lee nova_store)
//    CIMIENTO_LEADS_TOKEN    el mismo valor que TRYLA_LEADS_TOKEN en Cimiento
//    TRYLA_SUPABASE_URL      opcional; por omision la de supabase-config.js
//    CIMIENTO_LEADS_URL      opcional; por omision la de produccion
// ============================================================

const TRYLA_URL = process.env.TRYLA_SUPABASE_URL ?? "https://dcuescldzrgcppubcoxq.supabase.co";
const TRYLA_KEY = process.env.TRYLA_SERVICE_ROLE_KEY ?? "";
const CIMIENTO_URL =
  process.env.CIMIENTO_LEADS_URL ?? "https://cimiento-mx-construccion.lovable.app/api/public/tryla/leads";
const CIMIENTO_TOKEN = process.env.CIMIENTO_LEADS_TOKEN ?? "";
const PROBAR = process.argv.includes("--probar");
const TANDA = 200;

if (!TRYLA_KEY) salir("Falta TRYLA_SERVICE_ROLE_KEY");
if (!CIMIENTO_TOKEN && !PROBAR) salir("Falta CIMIENTO_LEADS_TOKEN");

const res = await fetch(`${TRYLA_URL}/rest/v1/nova_store?key=eq.novaClients&select=value`, {
  headers: { apikey: TRYLA_KEY, Authorization: `Bearer ${TRYLA_KEY}` },
});
if (!res.ok) salir(`No se pudo leer nova_store: ${res.status} ${await res.text()}`);
const [fila] = await res.json();
const clientes = Array.isArray(fila?.value) ? fila.value : [];
console.log(`${clientes.length} leads en el CRM de tryla-app`);

const leads = clientes.map((c) => ({
  canal: "importacion",
  ref: c.id,
  name: c.name,
  contacto: c.contacto,
  ciudad: c.ciudad,
  status: c.status,
  // Los ids "c<milisegundos>" son de antes de que existiera createdAt.
  createdAt: c.createdAt ?? (/^c\d+$/.test(c.id ?? "") ? Number(c.id.slice(1)) : undefined),
  fuente: c.fuente,
  notas:
    [
      c.negocio ? `Negocio: ${c.negocio}` : "",
      c.assignedTo ? `Lo llevaba: ${c.assignedTo}` : "",
      c.notas ?? "",
    ]
      .filter(Boolean)
      .join("\n") || undefined,
}));

const porEtapa = {};
for (const l of leads) porEtapa[l.status ?? "(sin estatus)"] = (porEtapa[l.status ?? "(sin estatus)"] ?? 0) + 1;
console.log("Por estatus:", porEtapa);

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
    total.invalidos.push({ ref: lead?.ref, nombre: lead?.name, motivo: inv.motivo });
  }
  console.log(`Tanda ${i / TANDA + 1}: ${resultado.nuevos} nuevos, ${resultado.yaEstaban} ya estaban, ${resultado.repetidos} repetidos`);
}

console.log(`\nListo: ${total.nuevos} nuevos, ${total.yaEstaban} ya estaban, ${total.repetidos} repetidos.`);
if (total.invalidos.length) {
  console.log(`${total.invalidos.length} no entraron (sin teléfono ni correo válido):`);
  for (const inv of total.invalidos) console.log(`  ${inv.ref} · ${inv.nombre} · ${inv.motivo}`);
}

function salir(mensaje) {
  console.error(mensaje);
  process.exit(1);
}
