import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { analizarUbicacion } from "../analyze-location.mjs";
import { crearAcsApi } from "../providers/acs-api.mjs";
import { crearCensusGeocoder } from "../providers/census-geocoder.mjs";
import { crearJobsRpc } from "../providers/jobs-rpc.mjs";
import { crearSupabasePlaces } from "../providers/supabase-places.mjs";
import { validar } from "./validate.mjs";

const schema = JSON.parse(readFileSync(new URL("../schema.json", import.meta.url), "utf8"));
const AHORA = () => new Date("2026-11-28T12:00:00Z");
const PUNTO = { lat: 32.7767, lon: -96.797 };
const ev = (fuente) => ({ fuente, dataset: "d", version: "v", url: "u" });

function lugares(n, extra = []) {
  const r = Array.from({ length: n }, (_, i) => ({ category: "restaurant", cuisine: i < 3 ? "mexican" : null, name: `r${i}`, ...PUNTO }));
  return [...r, ...extra];
}
function prov(o = {}) {
  return {
    geocode: async () => ({ data: { ...PUNTO, direccion_normalizada: "1500 MARILLA ST, DALLAS, TX", tract: "48113020100", condado: "48113", confianza: 0.95 }, evidencia: ev("geocoder") }),
    places: async () => ({ data: lugares(20, [{ category: "fuel", ...PUNTO }, { category: "fuel", ...PUNTO }, { category: "bar", ...PUNTO }, { category: "restaurant", lat: 33.5, lon: -96.797 }]), evidencia: ev("places") }),
    coverage: async () => ({ data: { area_name: "dallas-city", pulled_at: "2026-09-30" }, evidencia: ev("cobertura") }),
    acs: async () => ({ data: { poblacion: 4000, ingreso_mediano: 75000, anio: 2023 }, evidencia: ev("acs") }),
    jobs: async () => ({ data: { empleos: 10000, empleos_comida: 300, empleos_comercio: 500, bloques: 100, anio: 2024 }, evidencia: ev("jobs") }),
    ...o,
  };
}
const entrada = { direccion: "1500 Marilla St", ciudad: "Dallas", estado: "TX", cocina: "tacos / mexicana" };
const correr = (p = prov(), e = entrada) => analizarUbicacion(e, p, { ahora: AHORA });

test("caso base: numeros esperados y equilibrio = 5.0", async () => {
  const r = await correr();
  assert.equal(r.ok, true);
  assert.equal(r.oferta.restaurantes, 20); // el restaurante a 50 millas se ignora
  assert.equal(r.oferta.misma_cocina, 3);
  assert.equal(r.oferta.anclas, 2);
  assert.equal(r.oferta.bares, 1);
  assert.equal(r.demanda.gasto_residentes_usd, 6_000_000);
  assert.equal(r.demanda.gasto_trabajadores_usd, 12_000_000);
  assert.equal(r.demanda.gasto_total_usd, 18_000_000);
  assert.equal(r.oferta.ventas_usadas_usd, 18_000_000);
  assert.equal(r.brecha.razon_demanda_oferta, 1);
  assert.equal(r.brecha.score_0_10, 5);
  assert.equal(r.brecha.nivel, "baja");
  assert.equal(r.calidad.datos, "completos");
  assert.deepEqual(r.calidad.faltantes, []);
  assert.equal(r.evidencia.length, 5);
  assert.ok(r.evidencia.every((e) => e.fecha_consulta === "2026-11-28T12:00:00.000Z"));
});

test("mucha demanda y poca oferta da score alto", async () => {
  const r = await correr(prov({
    acs: async () => ({ data: { poblacion: 12000, ingreso_mediano: 120000, anio: 2023 }, evidencia: ev("acs") }),
    jobs: async () => ({ data: { empleos: 60000, empleos_comida: 300, empleos_comercio: 0, bloques: 9, anio: 2024 }, evidencia: ev("jobs") }),
  }));
  assert.ok(r.brecha.score_0_10 > 8, `score ${r.brecha.score_0_10}`);
  assert.equal(r.brecha.nivel, "alta");
});

test("sin poblacion (acs falta): no inventa, avisa y usa solo empleos", async () => {
  const r = await correr(prov({ acs: async () => null }));
  assert.equal(r.demanda.poblacion, null);
  assert.equal(r.demanda.gasto_residentes_usd, null);
  assert.equal(r.demanda.gasto_total_usd, 12_000_000);
  assert.ok(r.calidad.faltantes.includes("acs"));
  assert.equal(r.calidad.datos, "parciales");
});

test("sin demanda alguna: score null y datos insuficientes", async () => {
  const r = await correr(prov({ acs: undefined, jobs: undefined }));
  assert.equal(r.ok, true);
  assert.equal(r.brecha.score_0_10, null);
  assert.equal(r.calidad.datos, "insuficientes");
});

test("direccion no encontrada", async () => {
  const r = await correr(prov({ geocode: async () => null }));
  assert.equal(r.ok, false);
  assert.equal(r.error.codigo, "GEOCODER_SIN_RESULTADO");
});

test("geocodificador que truena no tumba el proceso", async () => {
  const r = await correr(prov({ geocode: async () => { throw new Error("caido"); } }));
  assert.equal(r.ok, false);
  assert.equal(r.error.codigo, "GEOCODER_FALLO");
});

test("un proveedor que falla queda como faltante, no como error", async () => {
  const r = await correr(prov({ places: async () => { throw new Error("timeout"); } }));
  assert.equal(r.ok, true);
  assert.ok(r.calidad.faltantes.includes("lugares"));
  assert.ok(r.calidad.advertencias.some((a) => a.includes("timeout")));
});

test("entrada invalida", async () => {
  for (const mala of [null, {}, { direccion: "x" }, { direccion: "", ciudad: "Dallas" }, { direccion: "a".repeat(201), ciudad: "Dallas" }]) {
    const r = await correr(prov(), mala);
    assert.equal(r.ok, false);
    assert.equal(r.error.codigo, "ENTRADA_INVALIDA");
  }
});

test("oferta por lugares y por empleos muy distintas: advertencia y menos confianza", async () => {
  const sano = await correr();
  const r = await correr(prov({
    places: async () => ({ data: lugares(1), evidencia: ev("places") }),
    jobs: async () => ({ data: { empleos: 10000, empleos_comida: 3000, empleos_comercio: 0, bloques: 5, anio: 2024 }, evidencia: ev("jobs") }),
  }));
  assert.ok(r.calidad.advertencias.some((a) => a.includes("difiere")));
  assert.ok(r.calidad.confianza_0_1 < sano.calidad.confianza_0_1);
});

test("es determinista: misma entrada y datos, mismo resultado", async () => {
  assert.deepEqual(await correr(), await correr());
});

test("toda salida cumple schema.json", async () => {
  const casos = [
    await correr(), await correr(prov({ acs: async () => null })), await correr(prov({ acs: undefined, jobs: undefined })),
    await correr(prov({ geocode: async () => null })), await correr(prov(), {}),
  ];
  for (const r of casos) assert.deepEqual(validar(r, schema), []);
});

// ---------- proveedores reales, con red simulada ----------
const respuesta = (cuerpo, ok = true, status = 200) => ({ ok, status, json: async () => cuerpo });

test("acs-api: prueba el ano anterior y descarta el centinela de ingreso", async () => {
  const llamadas = [];
  const f = async (url) => {
    llamadas.push(url);
    if (url.includes("/2023/")) return respuesta({}, false, 404);
    return respuesta([["B01003_001E", "B19013_001E"], ["4120", "-666666666"]]);
  };
  const r = await crearAcsApi({ key: "K", fetchImpl: f })("48113020100");
  assert.equal(r.data.anio, 2022);
  assert.equal(r.data.poblacion, 4120);
  assert.equal(r.data.ingreso_mediano, null);
  assert.ok(llamadas[0].includes("for=tract:020100") && llamadas[0].includes("state:48+county:113"));
});

test("census-geocoder: extrae coordenadas, tract y condado", async () => {
  const f = async () => respuesta({ result: { addressMatches: [{ matchedAddress: "1500 MARILLA ST, DALLAS, TX, 75201", coordinates: { x: -96.797, y: 32.7767 }, geographies: { "Census Tracts": [{ GEOID: "48113020100" }], Counties: [{ GEOID: "48113" }] } }] } });
  const r = await crearCensusGeocoder({ fetchImpl: f })({ direccion: "1500 Marilla St", ciudad: "Dallas", estado: "TX" });
  assert.deepEqual([r.data.lat, r.data.lon, r.data.tract, r.data.condado], [32.7767, -96.797, "48113020100", "48113"]);
  const vacio = await crearCensusGeocoder({ fetchImpl: async () => respuesta({ result: { addressMatches: [] } }) })({ direccion: "x", ciudad: "y" });
  assert.equal(vacio, null);
});

test("jobs-rpc: pide sesion y devuelve null si no hay bloques", async () => {
  await assert.rejects(() => crearJobsRpc({ url: "u", key: "k", fetchImpl: async () => respuesta([]) })(1, 2, 1.5), /sesion/);
  const f = async () => respuesta([{ jobs: 5, food_jobs: 1, retail_jobs: 2, blocks: 0 }]);
  assert.equal(await crearJobsRpc({ url: "u", key: "k", jwt: "j", fetchImpl: f })(1, 2, 1.5), null);
});

test("supabase-places: pagina de 1000 en 1000", async () => {
  let n = 0;
  const f = async () => { n++; return respuesta(n === 1 ? Array.from({ length: 1000 }, () => ({})) : [{}, {}]); };
  const r = await crearSupabasePlaces({ url: "http://x", key: "k", fetchImpl: f }).places(32.7, -96.8, 1.5);
  assert.equal(r.data.length, 1002);
  assert.equal(n, 2);
});
