// Geocodificador del Censo de EE. UU. (gratis, sin llave): direccion -> lat/lon + census tract.
export function crearCensusGeocoder({ fetchImpl = fetch, timeoutMs = 15000 } = {}) {
  return async function geocode({ direccion, ciudad, estado }) {
    const q = [direccion, ciudad, estado].filter(Boolean).join(", ");
    const url =
      "https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress" +
      `?address=${encodeURIComponent(q)}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`;
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) throw new Error(`Census Geocoder respondio ${res.status}`);
    const json = await res.json();
    const matches = (json && json.result && json.result.addressMatches) || [];
    if (!matches.length) return null;
    const m = matches[0];
    const geos = m.geographies || {};
    const tractKey = Object.keys(geos).find((k) => /tract/i.test(k));
    const tract = tractKey && geos[tractKey] && geos[tractKey][0];
    const condKey = Object.keys(geos).find((k) => /^counties$/i.test(k));
    const cond = condKey && geos[condKey] && geos[condKey][0];
    return {
      data: {
        lat: Number(m.coordinates.y),
        lon: Number(m.coordinates.x),
        direccion_normalizada: m.matchedAddress,
        tract: tract ? String(tract.GEOID) : null,
        condado: cond ? String(cond.GEOID) : null,
        confianza: matches.length === 1 ? 0.95 : 0.7,
      },
      evidencia: {
        fuente: "US Census Bureau",
        dataset: "Geocoder (Public_AR_Current)",
        version: "Current_Current",
        url: "https://geocoding.geo.census.gov/geocoder/",
      },
    };
  };
}
