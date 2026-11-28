// Validador minimo de JSON Schema (type, required, properties, items, enum, minimum, maximum).
// Sin dependencias: suficiente para verificar que el resultado cumple schema.json.
export function validar(valor, schema, ruta = "$") {
  const errores = [];
  const tipos = [].concat(schema.type || []);
  const tipoDe = (v) => (v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v);
  if (tipos.length) {
    const t = tipoDe(valor);
    const ok = tipos.some((x) => x === t || (x === "number" && t === "integer"));
    if (!ok) return [`${ruta}: tipo ${t}, se esperaba ${tipos.join("|")}`];
  }
  if (schema.enum && !schema.enum.includes(valor)) errores.push(`${ruta}: valor fuera de enum (${valor})`);
  if (typeof valor === "number") {
    if (schema.minimum != null && valor < schema.minimum) errores.push(`${ruta}: menor que ${schema.minimum}`);
    if (schema.maximum != null && valor > schema.maximum) errores.push(`${ruta}: mayor que ${schema.maximum}`);
  }
  if (valor && typeof valor === "object" && !Array.isArray(valor)) {
    for (const r of schema.required || []) if (!(r in valor)) errores.push(`${ruta}.${r}: falta`);
    for (const [k, s] of Object.entries(schema.properties || {})) if (k in valor) errores.push(...validar(valor[k], s, `${ruta}.${k}`));
  }
  if (Array.isArray(valor) && schema.items) valor.forEach((v, i) => errores.push(...validar(v, schema.items, `${ruta}[${i}]`)));
  return errores;
}
