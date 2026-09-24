// ===== TrylApp — Location Intelligence (demo module) =====
// This is a self-contained, illustrative scoring tool: no external APIs for the
// score itself, no real geographic/demographic data behind the numbers. Scores
// are generated from a deterministic hash of the address + cuisine, so the same
// input always returns the same result. Geocoding (turning the address into a
// map pin) IS real, via OpenStreetMap's free Nominatim service.
//
// Exposes window.TrylaLocationIntel so both the internal CRM (crm.html) and the
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

  function tier(overall10) {
    if (overall10 >= 8) return { label: "Alta oportunidad", cls: "high", color: "#1CAD5A" };
    if (overall10 >= 6) return { label: "Oportunidad moderada", cls: "mid", color: "#E0A94C" };
    return { label: "Requiere mas analisis", cls: "low", color: "#C0392B" };
  }

  function insightsFor(r, cuisine) {
    var list = [];
    if (r.traffic >= 70) {
      list.push("Trafico peatonal y de vehiculos estimado como alto para este punto — buena exposicion para venta al paso.");
    } else if (r.traffic < 45) {
      list.push("Trafico estimado bajo-medio. Conviene reforzar visibilidad (senalizacion, redes, horario) mas que depender solo de paso.");
    }
    if (r.competitorsNearby === 0) {
      list.push("No se detectaron conceptos similares de " + cuisine.toLowerCase() + " cerca en este estimado — posible espacio abierto.");
    } else if (r.competitorsNearby <= 2) {
      list.push("Competencia directa estimada baja (" + r.competitorsNearby + " conceptos similares) — el mercado no esta saturado.");
    } else {
      list.push("Se estiman " + r.competitorsNearby + " conceptos similares de " + cuisine.toLowerCase() + " en la zona — diferenciacion de menu o precio sera clave.");
    }
    if (r.demo >= 70) {
      list.push("El perfil demografico estimado (densidad, ingreso, flujo de commuters) favorece este tipo de negocio.");
    }
    if (r.gap >= 70) {
      list.push("Brecha de oferta estimada alta para " + cuisine.toLowerCase() + " en esta zona frente a lo que ya existe.");
    } else if (r.gap < 40) {
      list.push("La oferta de " + cuisine.toLowerCase() + " ya esta relativamente cubierta aqui — considera un angulo de menu distinto.");
    }
    return list;
  }

  // Real geocoding via OpenStreetMap Nominatim (free, no key). Returns
  // {lat, lon, label} or null if the address can't be resolved.
  async function geocode(address) {
    var url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(address);
    try {
      var res = await fetch(url, { headers: { Accept: "application/json" } });
      var data = await res.json();
      if (!data || !data[0]) return null;
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), label: data[0].display_name };
    } catch (e) {
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
          '<rect x="36" y="24" width="20" height="14" rx="1.5" fill="#EAF6FF"/>' +
          '<rect x="76" y="16" width="10" height="20" rx="2" fill="#3B36D6"/>' +
          '<line x1="0" y1="44" x2="4" y2="44" stroke="#171433" stroke-width="3"/>' +
          '<circle cx="20" cy="48" r="7" fill="#171433"/><circle cx="20" cy="48" r="3" fill="#8B87A6"/>' +
          '<circle cx="56" cy="48" r="7" fill="#171433"/><circle cx="56" cy="48" r="3" fill="#8B87A6"/>' +
        '</svg>' +
      '</div>';
    return window.L.divIcon({ html: html, className: "tli-marker", iconSize: [72, 60], iconAnchor: [36, 50] });
  }

  var mapInstances = new WeakMap();

  // Mounts (or reuses) a Leaflet map in `container`, flies to {lat, lon} and
  // drops an animated trailer marker badged with the score. Safe to call again
  // on the same container for a new analysis — it reuses the map instance.
  async function mountMap(container, point, scoreObj) {
    await ensureLeaflet();
    var L = window.L;
    var map = mapInstances.get(container);
    if (!map) {
      map = L.map(container, { zoomControl: true, attributionControl: true }).setView([point.lat, point.lon], 15);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);
      mapInstances.set(container, map);
    } else {
      map.invalidateSize();
      map.flyTo([point.lat, point.lon], 15, { duration: 0.8 });
      if (map.__trailerMarker) map.removeLayer(map.__trailerMarker);
    }
    var marker = L.marker([point.lat, point.lon], { icon: trailerDivIcon(scoreObj) }).addTo(map);
    map.__trailerMarker = marker;
    setTimeout(function () {
      var el = marker.getElement();
      if (el) el.classList.add("tli-drop-in");
    }, 30);
    return map;
  }

  window.TrylaLocationIntel = {
    scoreFor: scoreFor,
    tier: tier,
    insightsFor: insightsFor,
    geocode: geocode,
    mountMap: mountMap,
    ensureLeaflet: ensureLeaflet,
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
