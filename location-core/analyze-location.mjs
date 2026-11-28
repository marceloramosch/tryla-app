// ============================================================
//  analizarUbicacion — funcion atomica de Location Intelligence
//
//  Recibe { direccion, ciudad, zona?, estado?, cocina? } y devuelve un
//  objeto con el schema de ./schema.json. No tiene interfaz ni efectos
//  secundarios: los datos entran por "proveedores" inyectados, asi que
//  la misma entrada + los mismos datos dan SIEMPRE el mismo resultado
//  (se puede probar con datos de prueba y verificar contra fuentes).
//
//  Lo que no se pudo obtener NO se inventa: queda en calidad.faltantes,
//  y cada numero trae su fuente en "evidencia".
//
//  Proveedor = async (...) => { data, evidencia } | null
//    geocode(input)            -> { lat, lon, direccion_normalizada, tract, condado, confianza }
//    places(lat, lon, radio)   -> [{ category, cuisine, name, lat, lon }]
//    coverage(lat, lon)        -> { area_name, pulled_at } | null
//    acs(tractGeoid)           -> { poblacion, ingreso_mediano, anio }
//    jobs(lat, lon, radio)     -> { empleos, empleos_comida, empleos_comercio, bloques, anio }
// ============================================================
import defaultParams from "./model-params.json" with { type: "json" };

const ANCLAS = ["fuel", "worship", "stadium", "mall", "entertainment"];
const ALIAS_COCINA = {
  "tacos / mexicana": ["mexican", "tex-mex", "taco"],
  "mexicana": ["mexican", "tex-mex", "taco"],
  "bbq": ["barbecue", "bbq"],
  "pizza": ["pizza"],
  "hamburguesas": ["burger"],
  "burgers": ["burger"],
  "asiatica": ["asian", "chinese", "japanese", "thai", "vietnamese", "korean", "sushi"],
  "asian": ["asian", "chinese", "japanese", "thai", "vietnamese", "korean", "sushi"],
  "mariscos": ["seafood"],
  "cafe / postres": ["coffee_shop", "cafe", "dessert", "ice_cream"],
};

export function millasEntre(a, b) {
  const R = 3958.8;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const redondear = (n, d = 2) => (n == null ? null : Math.round(n * 10 ** d) / 10 ** d);
const texto = (v, max = 200) => (typeof v === "string" && v.trim() && v.trim().length <= max ? v.trim() : null);

function normalizarInput(input) {
  const i = input && typeof input === "object" ? input : {};
  const direccion = texto(i.direccion);
  const ciudad = texto(i.ciudad);
  return {
    valido: !!(direccion && ciudad),
    input: {
      direccion: direccion || "",
      ciudad: ciudad || "",
      zona: texto(i.zona) || null,
      estado: texto(i.estado, 40) || null,
      cocina: texto(i.cocina, 60) || null,
    },
  };
}

function resultadoError(input, params, codigo, mensaje, ahora) {
  return {
    ok: false,
    version_modelo: params.version,
    input,
    error: { codigo, mensaje },
    resuelto: null,
    demanda: null,
    oferta: null,
    brecha: null,
    evidencia: [],
    calidad: { datos: "insuficientes", faltantes: ["ubicacion"], advertencias: [mensaje], confianza_0_1: 0 },
  };
}

// Llama a un proveedor sin tumbar todo el analisis si falla o no existe.
async function intentar(nombre, fn, faltantes, advertencias) {
  if (typeof fn !== "function") {
    faltantes.push(nombre);
    advertencias.push(`Proveedor "${nombre}" no configurado.`);
    return null;
  }
  try {
    const r = await fn();
    if (r == null || r.data == null) {
      faltantes.push(nombre);
      return null;
    }
    return r;
  } catch (e) {
    faltantes.push(nombre);
    advertencias.push(`Proveedor "${nombre}" fallo: ${String(e && e.message ? e.message : e).slice(0, 160)}`);
    return null;
  }
}

export async function analizarUbicacion(entrada, proveedores = {}, opciones = {}) {
  const params = opciones.params || defaultParams;
  const ahora = (opciones.ahora ? opciones.ahora() : new Date()).toISOString();
  const { valido, input } = normalizarInput(entrada);
  if (!valido) {
    return resultadoError(input, params, "ENTRADA_INVALIDA", "Se necesitan direccion y ciudad (texto, maximo 200 caracteres).", ahora);
  }

  // 1) Ubicacion
  let geoR = null;
  try {
    geoR = proveedores.geocode ? await proveedores.geocode(input) : null;
  } catch (e) {
    return resultadoError(input, params, "GEOCODER_FALLO", `El geocodificador fallo: ${String(e && e.message ? e.message : e).slice(0, 160)}`, ahora);
  }
  if (!geoR || !geoR.data || !Number.isFinite(geoR.data.lat) || !Number.isFinite(geoR.data.lon)) {
    return resultadoError(input, params, "GEOCODER_SIN_RESULTADO", "No se encontro esa direccion.", ahora);
  }
  const geo = geoR.data;
  const punto = { lat: geo.lat, lon: geo.lon };
  const radio = params.radio_millas;

  // 2) Datos (cada proveedor puede faltar sin romper el resultado)
  const faltantes = [];
  const advertencias = [];
  const [placesR, coberturaR, acsR, jobsR] = await Promise.all([
    intentar("lugares", () => proveedores.places && proveedores.places(punto.lat, punto.lon, radio), faltantes, advertencias),
    intentar("cobertura", () => proveedores.coverage && proveedores.coverage(punto.lat, punto.lon), faltantes, advertencias),
    geo.tract
      ? intentar("acs", () => proveedores.acs && proveedores.acs(geo.tract), faltantes, advertencias)
      : (faltantes.push("acs"), advertencias.push("La direccion no tiene census tract; no hay poblacion ni ingreso."), null),
    intentar("empleos", () => proveedores.jobs && proveedores.jobs(punto.lat, punto.lon, radio), faltantes, advertencias),
  ]);

  // 3) Oferta: lugares dentro del radio
  const cercanos = (placesR ? placesR.data : []).filter((p) => millasEntre(punto, p) <= radio);
  const aliases = ALIAS_COCINA[(input.cocina || "").toLowerCase()] || [];
  const cocinaTxt = (input.cocina || "").toLowerCase();
  const restaurantes = cercanos.filter((p) => p.category === "restaurant");
  const mismaCocina = restaurantes.filter((p) => {
    const c = (p.cuisine || "").toLowerCase();
    if (!c || !cocinaTxt) return false;
    return aliases.some((a) => c.includes(a)) || c.includes(cocinaTxt);
  });
  const oferta = {
    restaurantes: restaurantes.length,
    misma_cocina: mismaCocina.length,
    food_parks: cercanos.filter((p) => p.category === "food_park").length,
    bares: cercanos.filter((p) => p.category === "bar").length,
    anclas: cercanos.filter((p) => ANCLAS.includes(p.category)).length,
  };
  if (placesR && cercanos.length === 0) {
    faltantes.push("lugares_en_radio");
    advertencias.push("No hay lugares cargados dentro del radio: el punto puede estar fuera de la zona cubierta.");
  }
  const ventasLugares = oferta.restaurantes * params.ventas_por_restaurante_usd;
  const empleosComida = jobsR ? jobsR.data.empleos_comida : null;
  const ventasEmpleos = empleosComida != null ? empleosComida * params.ventas_por_empleo_comida_usd : null;

  let inconsistente = false;
  if (ventasEmpleos != null && placesR) {
    const mayor = Math.max(ventasLugares, ventasEmpleos);
    const menor = Math.max(Math.min(ventasLugares, ventasEmpleos), 1);
    if (mayor / menor > params.umbral_inconsistencia_oferta) {
      inconsistente = true;
      advertencias.push(`La oferta estimada por lugares y por empleos de comida difiere mas de ${params.umbral_inconsistencia_oferta}x: posible cobertura incompleta de lugares o un empleo de comida atipico.`);
    }
  }
  const ventasUsadas = Math.max(ventasLugares, ventasEmpleos || 0, params.ventas_por_restaurante_usd);

  // 4) Demanda
  const poblacion = acsR ? acsR.data.poblacion : null;
  const ingreso = acsR ? acsR.data.ingreso_mediano : null;
  const empleos = jobsR ? jobsR.data.empleos : null;
  let factorIngreso = 1;
  if (ingreso != null && ingreso > 0) {
    factorIngreso = clamp((ingreso / params.ingreso_referencia_usd) ** params.elasticidad_ingreso, params.factor_ingreso_min, params.factor_ingreso_max);
  } else if (acsR) {
    faltantes.push("ingreso");
  }
  const gastoRes = poblacion != null ? poblacion * params.gasto_comida_fuera_por_residente_usd * factorIngreso : null;
  const gastoTrab = empleos != null ? empleos * params.gasto_comida_fuera_por_empleo_usd : null;
  const gastoTotal = gastoRes == null && gastoTrab == null ? null : (gastoRes || 0) + (gastoTrab || 0);

  // 5) Brecha y score
  let razon = null, score = null, nivel = null;
  if (gastoTotal != null && gastoTotal > 0) {
    razon = gastoTotal / ventasUsadas;
    score = 10 / (1 + Math.exp(-params.pendiente_logistica * Math.log(razon / params.razon_equilibrio)));
    nivel = score >= params.umbral_alta ? "alta" : score >= params.umbral_media ? "media" : "baja";
  }

  // 6) Calidad y confianza (heuristica: se calibra en el punto 4 del plan)
  const area = coberturaR ? coberturaR.data.area_name : null;
  if (coberturaR == null && !faltantes.includes("cobertura")) faltantes.push("cobertura");
  const confianza = clamp(
    0.25 * (geo.confianza ?? 0) + 0.25 * (placesR && cercanos.length > 0 ? 1 : 0) + 0.2 * (acsR ? 1 : 0) + 0.2 * (jobsR ? 1 : 0) + 0.1 * (area ? 1 : 0) - (inconsistente ? 0.15 : 0),
    0, 1
  );
  const datos = score == null ? "insuficientes" : faltantes.length ? "parciales" : "completos";

  // 7) Evidencia: cada fuente usada, con su fecha de consulta
  const evidencia = [geoR, placesR, coberturaR, acsR, jobsR]
    .filter((r) => r && r.evidencia)
    .map((r) => ({ ...r.evidencia, fecha_consulta: ahora }));

  return {
    ok: true,
    version_modelo: params.version,
    input,
    error: null,
    resuelto: {
      lat: geo.lat,
      lon: geo.lon,
      direccion_normalizada: geo.direccion_normalizada || "",
      tract: geo.tract || null,
      condado: geo.condado || null,
      area_cobertura: area,
      confianza_geocoder: geo.confianza ?? 0,
    },
    demanda: {
      poblacion,
      ingreso_mediano: ingreso,
      empleos,
      empleos_comida: empleosComida,
      empleos_comercio: jobsR ? jobsR.data.empleos_comercio : null,
      gasto_residentes_usd: redondear(gastoRes, 0),
      gasto_trabajadores_usd: redondear(gastoTrab, 0),
      gasto_total_usd: redondear(gastoTotal, 0),
    },
    oferta: {
      ...oferta,
      ventas_estimadas_por_lugares_usd: redondear(ventasLugares, 0),
      ventas_estimadas_por_empleos_usd: redondear(ventasEmpleos, 0),
      ventas_usadas_usd: redondear(ventasUsadas, 0),
      criterio_oferta: "maximo entre lugares y empleos de comida, con piso de un restaurante",
    },
    brecha: { razon_demanda_oferta: redondear(razon, 3), score_0_10: redondear(score, 1), nivel },
    evidencia,
    calidad: { datos, faltantes: [...new Set(faltantes)], advertencias, confianza_0_1: redondear(confianza, 2) },
  };
}
