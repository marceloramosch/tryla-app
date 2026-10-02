// ===== TrylApp — Location Intelligence (demo module) =====
// This is a self-contained, illustrative scoring tool: no external APIs for the
// score itself, no real geographic/demographic data behind the numbers. Scores
// are generated from a deterministic hash of the address + cuisine, so the same
// input always returns the same result. Geocoding (turning the address into a
// map pin) IS real, via OpenStreetMap's free Nominatim service.
//
// Exposes window.TrylaLocationIntel so both the internal CRM (crm/index.html) and the
// client-facing TrylApp (index.html) can share the exact same scoring logic and
// map rendering instead of two copies drifting apart.
(function () {
  function hashString(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    var t = seed;
    return function () {
      t += 0x6d2b79f5;
      var r = Math.imul(t ^ (t >>> 15), t | 1);
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function scoreFor(address, cuisine) {
    var seed = hashString(address.trim().toLowerCase() + "|" + cuisine);
    var rand = mulberry32(seed);
    var traffic = Math.round(clamp(38 + rand() * 55 + rand() * 10, 8, 97));
    var competitorsNearby = Math.round(rand() * 9);
    var space = Math.round(clamp(100 - competitorsNearby * 9 - rand() * 12, 6, 96));
    var demo = Math.round(clamp(35 + rand() * 58, 10, 96));
    var gap = Math.round(clamp(30 + rand() * 62, 8, 97));
    var overall10 = (traffic * 0.3 + space * 0.25 + demo * 0.25 + gap * 0.2) / 10;
    return {
      traffic: traffic,
      space: space,
      competitorsNearby: competitorsNearby,
      demo: demo,
      gap: gap,
      overall10: Math.round(overall10 * 10) / 10,
    };
  }

  // Distancia en millas entre dos puntos lat/lon (formula haversine).
  function milesBetween(a, b) {
    var R = 3958.8;
    var dLat = (b.lat - a.lat) * Math.PI / 180;
    var dLon = (b.lon - a.lon) * Math.PI / 180;
    var lat1 = a.lat * Math.PI / 180, lat2 = b.lat * Math.PI / 180;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.asin(Math.sqrt(h));
  }

  var REAL_RADIUS_MILES = 1.5;

  // El <select> de cocina muestra la etiqueta traducida (ES/EN) como su
  // propio "value" — para comparar contra el tag cuisine=... de OpenStreetMap
  // (siempre en ingles, ej. "mexican", "bbq") hace falta este mapeo, ademas
  // del match directo por si acaso coinciden.
  var CUISINE_ALIASES = {
    "tacos / mexicana": ["mexican", "tex-mex", "taco"],
    "tacos / mexican": ["mexican", "tex-mex", "taco"],
    "bbq": ["barbecue", "bbq"],
    "café / postres": ["coffee_shop", "cafe", "dessert", "ice_cream"],
    "coffee / desserts": ["coffee_shop", "cafe", "dessert", "ice_cream"],
    "pizza": ["pizza"],
    "hamburguesas": ["burger"],
    "burgers": ["burger"],
    "asiática": ["asian", "chinese", "japanese", "thai", "vietnamese", "korean", "sushi"],
    "asian": ["asian", "chinese", "japanese", "thai", "vietnamese", "korean", "sushi"],
    "mariscos": ["seafood"],
    "seafood": ["seafood"],
    "vegana / saludable": ["vegan", "vegetarian", "healthy"],
    "vegan / healthy": ["vegan", "vegetarian", "healthy"],
  };

  // Todo el texto que arma este modulo (insights, tier, etiquetas del mapa)
  // vive aqui en vez de usar el sistema de traduccion de index.html — este
  // archivo lo comparte tambien crm/index.html (solo en espanol, sin toggle
  // de idioma), por eso cada funcion que genera texto recibe un "lang"
  // opcional y cae a espanol si no se lo mandan.
  var L10N = {
    es: {
      tier_high: "Alta oportunidad", tier_mid: "Oportunidad moderada", tier_low: "Requiere mas analisis",
      cat: {
        restaurant: "Restaurante", food_park: "Food park", construction: "Construcción nueva",
        fuel: "Gasolinera", worship: "Templo / iglesia", bar: "Bar / antro",
        mall: "Centro comercial", stadium: "Estadio", entertainment: "Cine / teatro", other: "Otro",
      },
      foodPark: function (n) { return n + (n === 1 ? " food park/food court cerca" : " food parks/food courts cerca") + " — gente que ya va especificamente a comer ahi, con hambre y lista para gastar. Mas trafico suele pesar mas que la competencia extra."; },
      bar: function (n) { return n + (n === 1 ? " bar cerca" : " bares cerca") + " — una de las mejores ubicaciones para un trailer en horario nocturno."; },
      noCompetition: function (radius) { return "No hay restaurantes ni food parks en " + radius + " millas a la redonda — zona sin competencia directa."; },
      restaurants: function (n, sameCuisine) { return n + " restaurante(s) cerca; " + sameCuisine + " del mismo tipo de cocina."; },
      construction: function (n) { return n + " obra(s) de construccion nueva cerca — senal de colonias/desarrollos en crecimiento."; },
      anchors: function (n) { return n + " otros puntos de interes cerca (gasolineras, templos, plazas, estadios, cines) que generan trafico peatonal."; },
      census: function (pop, income) { return "Zona censal con " + pop.toLocaleString("es-MX") + " habitantes y un ingreso mediano por hogar de $" + income.toLocaleString("es-MX") + " (datos del Census Bureau de USA)."; },
      trafficHigh: "Trafico peatonal y de vehiculos estimado como alto para este punto — buena exposicion para venta al paso.",
      trafficLow: "Trafico estimado bajo-medio. Conviene reforzar visibilidad (senalizacion, redes, horario) mas que depender solo de paso.",
      noCompetitorsEst: function (cuisine) { return "No se detectaron conceptos similares de " + cuisine + " cerca en este estimado — posible espacio abierto."; },
      lowCompetitorsEst: function (n) { return "Competencia directa estimada baja (" + n + " conceptos similares) — el mercado no esta saturado."; },
      someCompetitorsEst: function (n, cuisine) { return "Se estiman " + n + " conceptos similares de " + cuisine + " en la zona — diferenciacion de menu o precio sera clave."; },
      demoHighEst: "El perfil demografico estimado (densidad, ingreso, flujo de commuters) favorece este tipo de negocio.",
      gapHighEst: function (cuisine) { return "Brecha de oferta estimada alta para " + cuisine + " en esta zona frente a lo que ya existe."; },
      gapLowEst: function (cuisine) { return "La oferta de " + cuisine + " ya esta relativamente cubierta aqui — considera un angulo de menu distinto."; },
    },
    en: {
      tier_high: "High opportunity", tier_mid: "Moderate opportunity", tier_low: "Needs more analysis",
      cat: {
        restaurant: "Restaurant", food_park: "Food park", construction: "New construction",
        fuel: "Gas station", worship: "Place of worship", bar: "Bar / club",
        mall: "Shopping mall", stadium: "Stadium", entertainment: "Movie theater", other: "Other",
      },
      foodPark: function (n) { return n + (n === 1 ? " food park/food court nearby" : " food parks/food courts nearby") + " — people who already came specifically to eat, hungry and ready to spend. More foot traffic usually outweighs the extra competition."; },
      bar: function (n) { return n + (n === 1 ? " bar nearby" : " bars nearby") + " — one of the best spots for a trailer during night hours."; },
      noCompetition: function (radius) { return "No restaurants or food parks within " + radius + " miles — no direct competition in the area."; },
      restaurants: function (n, sameCuisine) { return n + " restaurant(s) nearby; " + sameCuisine + " of the same cuisine type."; },
      construction: function (n) { return n + " new construction project(s) nearby — a sign of growing neighborhoods/developments."; },
      anchors: function (n) { return n + " other points of interest nearby (gas stations, places of worship, plazas, stadiums, theaters) that drive foot traffic."; },
      census: function (pop, income) { return "Census area with " + pop.toLocaleString("en-US") + " residents and a median household income of $" + income.toLocaleString("en-US") + " (US Census Bureau data)."; },
      trafficHigh: "Estimated foot and vehicle traffic is high for this spot — good exposure for walk-up sales.",
      trafficLow: "Estimated traffic is low-to-medium. Lean on visibility (signage, social media, hours) rather than just foot traffic.",
      noCompetitorsEst: function (cuisine) { return "No similar " + cuisine + " concepts detected nearby in this estimate — possible open space."; },
      lowCompetitorsEst: function (n) { return "Estimated direct competition is low (" + n + " similar concepts) — the market isn't saturated."; },
      someCompetitorsEst: function (n, cuisine) { return "An estimated " + n + " similar " + cuisine + " concepts in the area — menu or price differentiation will be key."; },
      demoHighEst: "The estimated demographic profile (density, income, commuter flow) favors this type of business.",
      gapHighEst: function (cuisine) { return "High estimated supply gap for " + cuisine + " in this area versus what already exists."; },
      gapLowEst: function (cuisine) { return cuisine + " supply is already relatively covered here — consider a different menu angle."; },
    },
  };
  function l10n(lang) { return L10N[lang === "en" ? "en" : "es"]; }

  // Score con datos reales de li_places (OpenStreetMap), si la zona ya fue
  // sincronizada. Regresa null si no hay cobertura ahi todavia — quien
  // llama debe caer de vuelta a scoreFor() (el estimado) en ese caso.
  // "sbClient" es el cliente de Supabase ya creado por quien llama
  // (index.html / crm/index.html), li_places es de lectura publica.
  var ANCHOR_CATEGORIES = ["fuel", "worship", "stadium", "mall", "entertainment"];

  // Calcula espacio/trafico/brecha a partir de los lugares reales cercanos
  // a un punto — compartido entre el analisis de un solo pin (scoreForReal)
  // y la cuadricula de oportunidad (plotOpportunityGrid), para que nunca se
  // desincronicen los criterios entre los dos.
  function computeDemandFactors(nearby, cuisine) {
    var restaurants = nearby.filter(function (p) { return p.category === "restaurant"; });
    var foodParks = nearby.filter(function (p) { return p.category === "food_park"; });
    var bars = nearby.filter(function (p) { return p.category === "bar"; });
    var construction = nearby.filter(function (p) { return p.category === "construction"; });
    var anchors = nearby.filter(function (p) { return ANCHOR_CATEGORIES.indexOf(p.category) !== -1; });
    var aliasKeywords = CUISINE_ALIASES[(cuisine || "").toLowerCase()] || [];
    var sameCuisine = restaurants.filter(function (p) {
      if (!p.cuisine) return false;
      var pc = p.cuisine.toLowerCase();
      if (aliasKeywords.some(function (k) { return pc.indexOf(k) !== -1; })) return true;
      return !!cuisine && pc.indexOf(cuisine.toLowerCase()) !== -1;
    });

    // Espacio vs competencia: un restaurante mas es competencia directa,
    // PERO un downtown con 200 restaurantes cerca no es "200 veces peor"
    // que uno con 20 — esa cantidad de restaurantes ES la prueba de que
    // ahi hay muchisima gente comiendo, no solo saturacion. Penalizacion
    // lineal normal hasta 20 restaurantes (zona ya calibrada contra datos
    // reales), y despues raiz cuadrada — cada restaurante extra pesa cada
    // vez menos. Un food park tampoco se castiga igual de fuerte aqui —
    // ahi abajo en "trafico" se refleja que lo que de verdad importa de un
    // food park es la cantidad de gente que atrae, no solo que haya mas
    // trailers. Pesos base calibrados contra una muestra real de 45 puntos
    // en Dallas, Chicago y Houston (restaurantes van de 0 a 268 cerca de
    // un punto cualquiera).
    var RESTAURANT_LINEAR_CAP = 20;
    var restaurantPenalty = restaurants.length <= RESTAURANT_LINEAR_CAP
      ? restaurants.length * 0.7
      : RESTAURANT_LINEAR_CAP * 0.7 + Math.sqrt(restaurants.length - RESTAURANT_LINEAR_CAP) * 3.4;
    var space = clamp(100 - restaurantPenalty - foodParks.length * 4, 10, 96);
    // Brecha de cocina: pocos sirviendo lo mismo cerca = brecha (oportunidad) alta.
    // Esta SI se queda estricta — muchos competidores de tu mismo tipo de
    // cocina especificamente es una señal real de que hace falta
    // diferenciarte, sin importar cuanta gente ande por la zona.
    var gap = clamp(100 - sameCuisine.length * 15, 10, 95);
    // Trafico/demanda: los bares pesan mas que una ancla generica — un
    // trailer afuera de un bar en la noche es de las mejores ubicaciones
    // que hay. Un food park cerca pesa todavia mas — es gente que ya fue
    // ahi especificamente a comer, con hambre y lista para gastar; eso
    // importa mas que contarlo solo como "mas competencia". Construccion
    // nueva cerca tambien suma — demanda futura (colonias/desarrollos). La
    // cantidad de restaurantes tambien suma aqui (con raiz cuadrada, para
    // que no dispare el numero sin control) — un corredor con 200
    // restaurantes es, el mismo, evidencia de trafico peatonal alto.
    var traffic = clamp(
      anchors.length * 2 + bars.length * 3 + foodParks.length * 12 + construction.length * 5 + Math.sqrt(restaurants.length) * 1.5,
      10,
      95
    );
    return {
      restaurants: restaurants, foodParks: foodParks, bars: bars, construction: construction,
      anchors: anchors, sameCuisine: sameCuisine, space: space, gap: gap, traffic: traffic,
    };
  }

  // Pisos de "alta demanda" — reglas de negocio explicitas, no solo
  // matematica del promedio ponderado: la cantidad de gente real compensa
  // casi cualquier otra cosa (competencia, brecha de nicho). Los dos pisos
  // escalan de forma continua dentro de su rango (nunca saltan de golpe a
  // un numero fijo) para que la diferencia entre "cumple apenas" y "cumple
  // por mucho" se siga notando en el score. "demo" puede venir null (la
  // cuadricula de oportunidad no hace una llamada a Census por celda) — en
  // ese caso el piso 1 solo se evalua con trafico.
  function applyHighDemandFloors(overall10, traffic, demo, nearby, point) {
    // 1) Zona de alta demanda en general (downtown, zonas muy saturadas de
    // trafico, o con poblacion real muy alta): piso de 8.0 a 9.0, segun que
    // tan por encima del umbral esta el tráfico o la demografia real.
    var HIGH_DEMAND_FLOOR_MIN = 8.0, HIGH_DEMAND_FLOOR_MAX = 9.0;
    if (traffic >= 85) {
      var trafficExcess = clamp((traffic - 85) / (95 - 85), 0, 1);
      overall10 = Math.max(overall10, HIGH_DEMAND_FLOOR_MIN + trafficExcess * (HIGH_DEMAND_FLOOR_MAX - HIGH_DEMAND_FLOOR_MIN));
    } else if (demo != null && demo >= 75) {
      var demoExcess = clamp((demo - 75) / (100 - 75), 0, 1);
      overall10 = Math.max(overall10, HIGH_DEMAND_FLOOR_MIN + demoExcess * (HIGH_DEMAND_FLOOR_MAX - HIGH_DEMAND_FLOOR_MIN));
    }

    // 2) Justo al lado de un ancla fuerte (gasolinera, plaza/mall o bar) a
    // menos de un cuarto de milla real — tráfico garantizado, todo el dia,
    // sin depender de que el resto de la zona tambien este saturada. Piso
    // mas bajo que el general de arriba (7.0 a 8.0) — una sola ancla pesa
    // menos que un cluster completo tipo downtown — escalando con la
    // distancia real al ancla mas cercana (mas cerca = mas alto).
    var PROXIMITY_CATEGORIES = ["fuel", "mall", "bar"];
    var PROXIMITY_RADIUS_MILES = 0.25;
    var PROXIMITY_FLOOR_MIN = 7.0, PROXIMITY_FLOOR_MAX = 8.0;
    var closeAnchors = nearby.filter(function (p) { return PROXIMITY_CATEGORIES.indexOf(p.category) !== -1; });
    if (closeAnchors.length) {
      var nearestAnchorMiles = Math.min.apply(null, closeAnchors.map(function (p) { return milesBetween(point, p); }));
      if (nearestAnchorMiles <= PROXIMITY_RADIUS_MILES) {
        var closeness = clamp(1 - nearestAnchorMiles / PROXIMITY_RADIUS_MILES, 0, 1);
        overall10 = Math.max(overall10, PROXIMITY_FLOOR_MIN + closeness * (PROXIMITY_FLOOR_MAX - PROXIMITY_FLOOR_MIN));
      }
    }
    return overall10;
  }

  async function scoreForReal(sbClient, point, cuisine) {
    var latDelta = REAL_RADIUS_MILES / 69;
    var lonDelta = REAL_RADIUS_MILES / (69 * Math.cos(point.lat * Math.PI / 180));
    var res = await sbClient
      .from("li_places")
      .select("category,cuisine,name,lat,lon")
      .gte("lat", point.lat - latDelta).lte("lat", point.lat + latDelta)
      .gte("lon", point.lon - lonDelta).lte("lon", point.lon + lonDelta);
    if (res.error || !res.data || !res.data.length) return null;

    var nearby = res.data.filter(function (p) { return milesBetween(point, p) <= REAL_RADIUS_MILES; });
    if (!nearby.length) return null;

    var f = computeDemandFactors(nearby, cuisine);

    // Demografico: poblacion e ingreso mediano real del census tract (US
    // Census Bureau, ACS5), via la Edge Function census-lookup. Si falla
    // (zona sin cobertura, Census caido, etc.) cae a un valor neutro — no
    // tira el resto del score real que ya calculamos arriba.
    var demo = 55;
    var censusPopulation = null;
    var censusIncome = null;
    try {
      // Si Census tarda mas de 8s (o se cuelga), seguimos con el valor
      // neutro en vez de dejar el score entero esperando para siempre.
      var censusTimeout = new Promise(function (resolve) { setTimeout(function () { resolve({ timedOut: true }); }, 8000); });
      var censusRes = await Promise.race([
        sbClient.functions.invoke("census-lookup", { body: { lat: point.lat, lon: point.lon } }),
        censusTimeout,
      ]);
      if (censusRes.timedOut) console.warn("Census tardo demasiado, uso demografico neutral.");
      if (!censusRes.timedOut && !censusRes.error && censusRes.data && typeof censusRes.data.demo === "number") {
        demo = censusRes.data.demo;
        censusPopulation = censusRes.data.population;
        censusIncome = censusRes.data.medianIncome;
      }
    } catch (e) {
      console.warn("Census no disponible, uso demografico neutral:", e);
    }

    var overall10 = (f.traffic * 0.3 + f.space * 0.25 + demo * 0.25 + f.gap * 0.2) / 10;
    overall10 = applyHighDemandFloors(overall10, f.traffic, demo, nearby, point);

    return {
      traffic: Math.round(f.traffic),
      space: Math.round(f.space),
      competitorsNearby: f.restaurants.length,
      demo: Math.round(demo),
      gap: Math.round(f.gap),
      overall10: Math.round(overall10 * 10) / 10,
      real: true,
      nearby: nearby,
      nearbyCount: nearby.length,
      anchorCount: f.anchors.length,
      barCount: f.bars.length,
      restaurantCount: f.restaurants.length,
      sameCuisineCount: f.sameCuisine.length,
      foodParkCount: f.foodParks.length,
      constructionCount: f.construction.length,
      censusPopulation: censusPopulation,
      censusIncome: censusIncome,
    };
  }

  // Frases de insight especificas para el score real (a diferencia de
  // insightsFor(), que es generica y trabaja con el estimado simulado).
  function insightsForReal(r, lang) {
    var s = l10n(lang);
    var out = [];
    if (r.foodParkCount > 0) out.push(s.foodPark(r.foodParkCount));
    if (r.barCount > 0) out.push(s.bar(r.barCount));
    if (r.restaurantCount === 0 && r.foodParkCount === 0) {
      out.push(s.noCompetition(REAL_RADIUS_MILES));
    } else if (r.restaurantCount > 0) {
      out.push(s.restaurants(r.restaurantCount, r.sameCuisineCount));
    }
    if (r.constructionCount > 0) out.push(s.construction(r.constructionCount));
    if (r.anchorCount > 0) out.push(s.anchors(r.anchorCount));
    if (r.censusPopulation != null && r.censusIncome != null) {
      out.push(s.census(r.censusPopulation, Math.round(r.censusIncome)));
    }
    return out;
  }

  function tier(overall10, lang) {
    var s = l10n(lang);
    if (overall10 >= 8) return { label: s.tier_high, cls: "high", color: "#1CAD5A" };
    if (overall10 >= 6) return { label: s.tier_mid, cls: "mid", color: "#E0A94C" };
    return { label: s.tier_low, cls: "low", color: "#C0392B" };
  }

  function insightsFor(r, cuisine, lang) {
    var s = l10n(lang);
    var cuisineLabel = (cuisine || "").toLowerCase();
    var list = [];
    if (r.traffic >= 70) list.push(s.trafficHigh);
    else if (r.traffic < 45) list.push(s.trafficLow);
    if (r.competitorsNearby === 0) list.push(s.noCompetitorsEst(cuisineLabel));
    else if (r.competitorsNearby <= 2) list.push(s.lowCompetitorsEst(r.competitorsNearby));
    else list.push(s.someCompetitorsEst(r.competitorsNearby, cuisineLabel));
    if (r.demo >= 70) list.push(s.demoHighEst);
    if (r.gap >= 70) list.push(s.gapHighEst(cuisineLabel));
    else if (r.gap < 40) list.push(s.gapLowEst(cuisineLabel));
    return list;
  }

  // Real geocoding via OpenStreetMap Nominatim (free, no key). Returns
  // {lat, lon, label} or null if the address can't be resolved.
  async function geocode(address) {
    var url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=" + encodeURIComponent(address);
    try {
      var res = await fetch(url, { headers: { Accept: "application/json" } });
      var data = await res.json();
      if (!data || !data[0]) return null;
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), label: data[0].display_name };
    } catch (e) {
      return null;
    }
  }

  // Lat/lon -> direccion legible. Se usa cuando el usuario da click directo
  // en el mapa en vez de escribir una direccion.
  async function reverseGeocode(lat, lon) {
    var url = "https://nominatim.openstreetmap.org/reverse?format=json&lat=" + lat + "&lon=" + lon;
    try {
      var res = await fetch(url, { headers: { Accept: "application/json" } });
      var data = await res.json();
      return (data && data.display_name) || null;
    } catch (e) {
      console.warn("Reverse geocode (Nominatim) fallo, muestro coordenadas:", e);
      return null;
    }
  }

  // Leaflet loads via a static <script>/<link> tag in the page's <head> (same
  // page, before this file) — far more reliable than injecting it at call
  // time. This just waits for it to be ready, with a short-lived fallback
  // dynamic load in case the static tags are ever missing from a page.
  function ensureLeaflet() {
    if (window.L) return Promise.resolve();
    if (window.__leafletLoading) return window.__leafletLoading;
    window.__leafletLoading = new Promise(function (resolve, reject) {
      var tries = 0;
      var poll = setInterval(function () {
        if (window.L) {
          clearInterval(poll);
          resolve();
          return;
        }
        tries++;
        if (tries > 100) {
          clearInterval(poll);
          // Static tag never showed up — fall back to a dynamic load.
          var script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        }
      }, 30);
    });
    return window.__leafletLoading;
  }

  function trailerDivIcon(scoreObj) {
    var t = tier(scoreObj.overall10);
    var html =
      '<div class="tli-marker-wrap">' +
        '<div class="tli-marker-badge" style="background:' + t.color + '">' + scoreObj.overall10.toFixed(1) + '</div>' +
        '<svg class="tli-marker-trailer" width="46" height="30" viewBox="0 0 92 60" xmlns="http://www.w3.org/2000/svg">' +
          '<rect x="4" y="10" width="72" height="34" rx="4" fill="#5B54FF"/>' +
          '<rect x="4" y="10" width="72" height="10" fill="#3B36D6"/>' +
          '<rect x="12" y="24" width="20" height="14" rx="1.5" fill="#EAF6FF"/>' +
          '<rect x="38" y="22" width="18" height="18" rx="4" fill="#3B36D6"/>' +
          '<g transform="translate(37.2,21.9) scale(0.152)">' +
            '<polygon points="21.6,25.8 98.3,25.8 106.9,45.0 30.2,45.0" fill="#fff"/>' +
            '<polygon points="57.9,45.0 79.2,45.0 100.5,94.2 79.2,94.2" fill="#fff"/>' +
          '</g>' +
          '<rect x="76" y="16" width="10" height="20" rx="2" fill="#3B36D6"/>' +
          '<line x1="0" y1="44" x2="4" y2="44" stroke="#171433" stroke-width="3"/>' +
          '<circle cx="20" cy="48" r="7" fill="#171433"/><circle cx="20" cy="48" r="3" fill="#8B87A6"/>' +
          '<circle cx="56" cy="48" r="7" fill="#171433"/><circle cx="56" cy="48" r="3" fill="#8B87A6"/>' +
        '</svg>' +
      '</div>';
    return window.L.divIcon({ html: html, className: "tli-marker", iconSize: [72, 60], iconAnchor: [36, 50] });
  }

  var mapInstances = new WeakMap();
  // Dallas, TX — centro por defecto del mapa cuando aun no hay direccion
  // ni pin (nuestro mercado base hoy).
  var DEFAULT_CENTER = { lat: 32.7767, lon: -96.797 };

  var EXPAND_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#171433" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';
  var COLLAPSE_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#171433" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>';

  // Boton para ver el mapa a pantalla completa con un click — clave en
  // movil, donde el mapa embebido es chico. Alterna una clase CSS en el
  // contenedor (position:fixed cubriendo toda la pantalla) y le pide a
  // Leaflet que recalcule su tamano despues del cambio.
  function addExpandControl(map, container) {
    var L = window.L;
    var ExpandControl = L.Control.extend({
      options: { position: "topright" },
      onAdd: function () {
        var btn = L.DomUtil.create("button", "tli-expand-btn");
        btn.type = "button";
        btn.innerHTML = EXPAND_ICON;
        btn.setAttribute("aria-label", "Expandir mapa");
        L.DomEvent.disableClickPropagation(btn);

        function setFullscreen(isFull) {
          container.classList.toggle("tli-map-fullscreen", isFull);
          btn.innerHTML = isFull ? COLLAPSE_ICON : EXPAND_ICON;
          btn.setAttribute("aria-label", isFull ? "Cerrar mapa completo" : "Expandir mapa");
          document.body.classList.toggle("tli-map-open", isFull);
          requestAnimationFrame(function () { map.invalidateSize(); });
        }

        L.DomEvent.on(btn, "click", function () {
          setFullscreen(!container.classList.contains("tli-map-fullscreen"));
        });
        // Tecla Escape como salida de emergencia, por si en algun momento
        // el boton de cerrar no es facil de encontrar/tocar.
        document.addEventListener("keydown", function (e) {
          if (e.key === "Escape" && container.classList.contains("tli-map-fullscreen")) {
            setFullscreen(false);
          }
        });
        return btn;
      },
    });
    map.addControl(new ExpandControl());
  }

  // Fuerza a Leaflet a recalcular su tamano. Necesario cuando el mapa se
  // monta mientras su contenedor esta oculto (display:none) — por ejemplo,
  // la pestana de Location Intelligence cuando Home es la pestana activa
  // por default. Sin esto, Leaflet calcula un tamano de 0 al montarse y el
  // grid de tiles queda roto/parcial hasta que algo (como redimensionar la
  // ventana) lo fuerce a recalcular. Quien llama debe invocar esto cuando
  // el contenedor del mapa se vuelve visible (ej. al cambiar de pestana).
  function invalidateMap(container) {
    var map = mapInstances.get(container);
    if (map) map.invalidateSize();
  }

  // Mounts (or reuses) a Leaflet map in `container`. With a `point`, flies to
  // {lat, lon} and drops an animated trailer marker badged with the score.
  // Without one, shows a pickable base map centered on Dallas. Safe to call
  // again on the same container for a new analysis — it reuses the map
  // instance. `onPick(point)` (optional) fires once per map instance when
  // the user clicks anywhere on the map to drop/move the pin themselves.
  async function mountMap(container, point, scoreObj, onPick) {
    await ensureLeaflet();
    var L = window.L;
    var center = point || DEFAULT_CENTER;
    var zoom = point ? 15 : 11;
    var map = mapInstances.get(container);
    if (!map) {
      map = L.map(container, { zoomControl: true, attributionControl: true }).setView([center.lat, center.lon], zoom);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);
      addExpandControl(map, container);
      mapInstances.set(container, map);
    } else {
      map.invalidateSize();
      map.flyTo([center.lat, center.lon], zoom, { duration: 0.8 });
      if (map.__trailerMarker) { map.removeLayer(map.__trailerMarker); map.__trailerMarker = null; }
    }
    if (point) {
      var marker = L.marker([point.lat, point.lon], { icon: trailerDivIcon(scoreObj) }).addTo(map);
      map.__trailerMarker = marker;
      setTimeout(function () {
        var el = marker.getElement();
        if (el) el.classList.add("tli-drop-in");
      }, 30);
    }
    if (onPick && !map.__pickWired) {
      map.__pickWired = true;
      map.on("click", function (e) {
        onPick({ lat: e.latlng.lat, lon: e.latlng.lng });
      });
    }
    return map;
  }

  var nearbyLayers = new WeakMap();
  // Un color distinto por categoria, para poder diferenciarlas de un
  // vistazo en el mapa (no solo con el nombre al pasar el mouse).
  var CATEGORY_COLORS = {
    restaurant: "#C0392B",
    food_park: "#7A0C0C",
    construction: "#E0A94C",
    fuel: "#2D7DD2",
    worship: "#8E44AD",
    bar: "#D6336C",
    mall: "#E67E22",
    stadium: "#16A085",
    entertainment: "#34495E",
    other: "#8B87A6",
  };
  // Glyphs chicos y rellenos (no de linea) — a 13px adentro de un circulo de
  // 22px, un icono de trazos finos no se alcanza a leer; uno solido si.
  var CATEGORY_ICONS = {
    restaurant: '<path fill="#fff" d="M7 2a1 1 0 0 1 1 1v5.17a2 2 0 0 1-.59 1.41L6 11v10a1 1 0 0 1-2 0V11L2.59 9.58A2 2 0 0 1 2 8.17V3a1 1 0 0 1 2 0v5h1V3a1 1 0 0 1 1-1h1zM16 2c-1.66 0-3 2.24-3 5s1.34 5 3 5v9a1 1 0 0 0 2 0V3a1 1 0 0 0-2-1z"/>',
    fuel: '<path fill="#fff" d="M14 3H6a1 1 0 0 0-1 1v16h10V9h1a2 2 0 0 1 2 2v5.5a1.5 1.5 0 0 0 3 0V8l-3-3v2a1 1 0 0 1-1 1h-1V4a1 1 0 0 0-1-1zM7 6h5v4H7V6z"/>',
    worship: '<path fill="#fff" d="M13 2h-2v3H8v2h3v3H8v2h3v8h2v-8h3v-2h-3V7h3V5h-3V2z"/>',
    bar: '<path fill="#fff" d="M4 4h16l-7 8v6h4v2H7v-2h4v-6L4 4zm3.2 2 3.4 3.9L14 6H7.2z"/>',
    mall: '<path fill="#fff" d="M7 7V6a5 5 0 0 1 10 0v1h2l1 14H4L5 7h2zm2 0h6V6a3 3 0 0 0-6 0v1z"/>',
    stadium: '<path fill="#fff" d="M12 4c-5 0-9 2.2-9 5v6c0 2.8 4 5 9 5s9-2.2 9-5V9c0-2.8-4-5-9-5zm0 2c4.2 0 7 1.7 7 3s-2.8 3-7 3-7-1.7-7-3 2.8-3 7-3z"/>',
    entertainment: '<path fill="#fff" d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-2 5.5 6 3.5-6 3.5v-7z"/>',
    construction: '<path fill="#fff" d="M12 3 2 21h20L12 3zm-1 8h2v4h-2v-4zm0 5h2v2h-2v-2z"/>',
    other: '<circle fill="#fff" cx="12" cy="12" r="5"/>',
  };
  CATEGORY_ICONS.food_park = CATEGORY_ICONS.restaurant;

  function nearbyDivIcon(category) {
    var color = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
    var glyph = CATEGORY_ICONS[category] || CATEGORY_ICONS.other;
    var html =
      '<div class="tli-poi-marker" style="background:' + color + '">' +
        '<svg viewBox="0 0 24 24" width="13" height="13">' + glyph + "</svg>" +
      "</div>";
    return window.L.divIcon({ html: html, className: "tli-poi-icon", iconSize: [22, 22], iconAnchor: [11, 11] });
  }

  function nearbyTooltipText(p, lang) {
    var cat = l10n(lang).cat;
    var catLabel = cat[p.category] || cat.other;
    if (!p.name) return catLabel;
    if (p.category === "restaurant" && p.cuisine) return p.name + " · " + p.cuisine;
    return p.name + " · " + catLabel;
  }

  // Pinta los lugares reales cercanos (competencia, food parks, construccion,
  // anclas de trafico) con un icono por categoria alrededor del pin
  // principal — para poder VER el panorama (que es cada cosa, y el nicho de
  // cada restaurante) y no solo leer el score. Reemplaza la capa anterior
  // si ya existia (evita duplicados al re-analizar en el mismo mapa).
  function plotNearby(map, nearby, lang) {
    var L = window.L;
    var old = nearbyLayers.get(map);
    if (old) map.removeLayer(old);
    if (!nearby || !nearby.length) return;
    var group = L.layerGroup();
    nearby.forEach(function (p) {
      var marker = L.marker([p.lat, p.lon], { icon: nearbyDivIcon(p.category) });
      marker.bindTooltip(nearbyTooltipText(p, lang), { direction: "top" });
      group.addLayer(marker);
    });
    group.addTo(map);
    nearbyLayers.set(map, group);
  }

  function getMap(container) {
    return mapInstances.get(container);
  }

  var opportunityLayers = new WeakMap();
  var OPPORTUNITY_GRID_STEP_MILES = 0.3;
  var OPPORTUNITY_MAX_CELLS = 700;
  var OPPORTUNITY_THRESHOLD = 8;

  function clearOpportunityGrid(map) {
    var old = opportunityLayers.get(map);
    if (old) {
      map.removeLayer(old);
      opportunityLayers.delete(map);
    }
  }

  // Pinta en verde las zonas (dentro de lo visible del mapa) donde el score
  // de oportunidad para "cuisine" daria 8-10. Jala los lugares reales UNA
  // sola vez para todo el area visible (no uno por celda) y calcula cada
  // celda en memoria con computeDemandFactors/applyHighDemandFloors — los
  // mismos criterios que usa el analisis de un solo pin. No hace una
  // llamada a Census por celda (seria demasiado lento: cientos de celdas x
  // una llamada externa cada una) — por eso el demografico se deja fuera
  // aqui y se reescalan los otros 3 pesos para que sigan sumando 100%.
  async function plotOpportunityGrid(sbClient, map, cuisine) {
    var L = window.L;
    var bounds = map.getBounds();
    var south = bounds.getSouth(), north = bounds.getNorth();
    var west = bounds.getWest(), east = bounds.getEast();

    // Se agranda el area de busqueda por el radio de analisis, para que las
    // celdas cerca del borde visible tambien vean todo su radio de lugares
    // reales (si no, saldrian con menos "nearby" del que en realidad hay).
    var latPad = REAL_RADIUS_MILES / 69;
    var midLat = (south + north) / 2;
    var lonPad = REAL_RADIUS_MILES / (69 * Math.cos(midLat * Math.PI / 180));

    var res = await sbClient
      .from("li_places")
      .select("category,cuisine,lat,lon")
      .gte("lat", south - latPad).lte("lat", north + latPad)
      .gte("lon", west - lonPad).lte("lon", east + lonPad);
    if (res.error || !res.data) throw res.error || new Error("No se pudieron cargar los lugares reales.");
    var allPlaces = res.data;

    var latStep = OPPORTUNITY_GRID_STEP_MILES / 69;
    var lonStep = OPPORTUNITY_GRID_STEP_MILES / (69 * Math.cos(midLat * Math.PI / 180));

    var cells = [];
    for (var lat = south; lat <= north && cells.length < OPPORTUNITY_MAX_CELLS; lat += latStep) {
      for (var lon = west; lon <= east && cells.length < OPPORTUNITY_MAX_CELLS; lon += lonStep) {
        cells.push({ lat: lat, lon: lon });
      }
    }

    var group = L.layerGroup();
    cells.forEach(function (cell) {
      var nearbyAtCell = allPlaces.filter(function (p) { return milesBetween(cell, p) <= REAL_RADIUS_MILES; });
      if (!nearbyAtCell.length) return;
      var f = computeDemandFactors(nearbyAtCell, cuisine);
      // Pesos originales sin demografico (0.3 trafico / 0.25 espacio / 0.2
      // brecha, de 0.75 en total) reescalados para que sumen 1 otra vez.
      var overallNoDemo = (f.traffic * 0.4 + f.space * (0.25 / 0.75) + f.gap * (0.2 / 0.75)) / 10;
      overallNoDemo = applyHighDemandFloors(overallNoDemo, f.traffic, null, nearbyAtCell, cell);
      if (overallNoDemo >= OPPORTUNITY_THRESHOLD) {
        var marker = L.circleMarker([cell.lat, cell.lon], {
          radius: 16,
          stroke: false,
          fillColor: "#1CAD5A",
          fillOpacity: 0.3,
          interactive: false,
        });
        group.addLayer(marker);
      }
    });

    clearOpportunityGrid(map);
    group.addTo(map);
    opportunityLayers.set(map, group);
    return { cellsChecked: cells.length, cellsGreen: group.getLayers().length };
  }

  window.TrylaLocationIntel = {
    scoreFor: scoreFor,
    scoreForReal: scoreForReal,
    insightsForReal: insightsForReal,
    tier: tier,
    insightsFor: insightsFor,
    geocode: geocode,
    reverseGeocode: reverseGeocode,
    mountMap: mountMap,
    plotNearby: plotNearby,
    ensureLeaflet: ensureLeaflet,
    invalidateMap: invalidateMap,
    getMap: getMap,
    plotOpportunityGrid: plotOpportunityGrid,
    clearOpportunityGrid: clearOpportunityGrid,
  };
})();

// ===== CRM-specific auto-wiring (no-ops if this tab isn't on the page) =====
(function () {
  var HISTORY_KEY = "trylaLocationScores";
  var TLI = window.TrylaLocationIntel;

  var addressEl = document.getElementById("liAddress");
  var cuisineEl = document.getElementById("liCuisine");
  var clientNameEl = document.getElementById("liClientName");
  var analyzeBtn = document.getElementById("liAnalyzeBtn");
  var resultPanel = document.getElementById("liResultPanel");
  var saveBtn = document.getElementById("liSaveBtn");
  var historyBody = document.getElementById("liHistoryTable");
  var mapEl = document.getElementById("liMap");
  if (!addressEl || !analyzeBtn) return; // this tab isn't on the page

  var lastResult = null;

  function render(r, address, cuisine) {
    var t = TLI.tier(r.overall10);
    document.getElementById("liScoreNum").textContent = r.overall10.toFixed(1) + " / 10";
    document.getElementById("liScoreSub").textContent = t.label;
    document.getElementById("liMetricTraffic").textContent = r.traffic;
    document.getElementById("liMetricComp").textContent = r.space;
    document.getElementById("liMetricDemo").textContent = r.demo;
    document.getElementById("liMetricGap").textContent = r.gap;
    document.getElementById("liBarTraffic").style.width = r.traffic + "%";
    document.getElementById("liBarComp").style.width = r.space + "%";
    document.getElementById("liBarDemo").style.width = r.demo + "%";
    document.getElementById("liBarGap").style.width = r.gap + "%";

    var insightsEl = document.getElementById("liInsights");
    insightsEl.innerHTML = "";
    TLI.insightsFor(r, cuisine).forEach(function (text) {
      var div = document.createElement("div");
      div.className = "li-insight";
      div.textContent = text;
      insightsEl.appendChild(div);
    });

    resultPanel.style.display = "block";
  }

  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function saveHistory(list) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  }

  function renderHistory() {
    var list = loadHistory();
    if (!historyBody) return;
    if (list.length === 0) {
      historyBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#7c8aa6;">Sin analisis guardados todavia</td></tr>';
      return;
    }
    historyBody.innerHTML = "";
    list
      .slice()
      .sort(function (a, b) {
        return b.ts - a.ts;
      })
      .forEach(function (item) {
        var tr = document.createElement("tr");
        var d = new Date(item.ts);
        var when = isNaN(d) ? "" : d.toLocaleDateString("es-MX");
        tr.innerHTML =
          "<td>" + when + "</td>" +
          "<td>" + (item.client || "—") + "</td>" +
          "<td>" + item.address + "</td>" +
          "<td>" + item.cuisine + "</td>" +
          "<td><b>" + item.overall10.toFixed(1) + "/10</b></td>" +
          '<td class="actions-cell"></td>';
        var actionsTd = tr.children[5];
        var delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "btn-small";
        delBtn.textContent = "Eliminar";
        delBtn.addEventListener("click", function () {
          var updated = loadHistory().filter(function (x) {
            return x.id !== item.id;
          });
          saveHistory(updated);
          renderHistory();
        });
        actionsTd.appendChild(delBtn);
        historyBody.appendChild(tr);
      });
  }

  analyzeBtn.addEventListener("click", async function () {
    var address = (addressEl.value || "").trim();
    if (!address) {
      addressEl.focus();
      return;
    }
    var cuisine = cuisineEl.value;
    var r = TLI.scoreFor(address, cuisine);
    lastResult = { r: r, address: address, cuisine: cuisine };
    render(r, address, cuisine);
    resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    if (mapEl) {
      var point = await TLI.geocode(address);
      if (point) TLI.mountMap(mapEl, point, r);
    }
  });

  addressEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      analyzeBtn.click();
    }
  });

  saveBtn.addEventListener("click", function () {
    if (!lastResult) return;
    var list = loadHistory();
    list.push({
      id: "li" + Date.now(),
      ts: Date.now(),
      client: (clientNameEl.value || "").trim(),
      address: lastResult.address,
      cuisine: lastResult.cuisine,
      overall10: lastResult.r.overall10,
      metrics: lastResult.r,
    });
    saveHistory(list);
    renderHistory();
  });

  renderHistory();
})();
