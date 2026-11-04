// ============================================================
//  Lectura de nova_store para los scripts de migracion a Cimiento:
//  del export CSV del SQL Editor o, con la service role, de la base.
// ============================================================
import { readFileSync } from "node:fs";

// Devuelve el valor (ya parseado) de una clave de nova_store, o [] si no esta.
export async function leerNovaStore(clave, { csv, url, llave }) {
  if (csv) return deCsv(csv, clave);
  const res = await fetch(`${url}/rest/v1/nova_store?key=eq.${encodeURIComponent(clave)}&select=value`, {
    headers: { apikey: llave, Authorization: `Bearer ${llave}` },
  });
  if (!res.ok) throw new Error(`No se pudo leer nova_store: ${res.status} ${await res.text()}`);
  const [fila] = await res.json();
  return fila?.value ?? [];
}

function deCsv(ruta, clave) {
  const [encabezado, ...datos] = leerCsv(readFileSync(ruta, "utf8"));
  const iKey = encabezado.indexOf("key");
  const iValue = encabezado.indexOf("value");
  if (iKey < 0 || iValue < 0) throw new Error("El CSV debe traer las columnas key y value");
  const fila = datos.find((f) => f[iKey] === clave);
  return fila ? JSON.parse(fila[iValue]) : [];
}

// CSV con comillas dobles y saltos de linea dentro de los campos.
function leerCsv(texto) {
  const filas = [];
  let fila = [];
  let campo = "";
  let entreComillas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (entreComillas) {
      if (ch === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (ch === '"') entreComillas = false;
      else campo += ch;
    } else if (ch === '"') entreComillas = true;
    else if (ch === ",") {
      fila.push(campo);
      campo = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && texto[i + 1] === "\n") i++;
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else campo += ch;
  }
  if (campo || fila.length) {
    fila.push(campo);
    filas.push(fila);
  }
  return filas.filter((f) => f.length > 1);
}
