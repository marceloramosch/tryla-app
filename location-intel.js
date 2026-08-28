// ===== TrylApp — Location Intelligence (demo module) =====
// This is a self-contained, illustrative scoring tool: no external APIs, no real
// geographic/demographic data. Scores are generated from a deterministic hash of
// the address + cuisine, so the same input always returns the same result — it
// behaves consistently in a demo without claiming to be real live data.
(function () {
  var HISTORY_KEY = "trylaLocationScores";

  var addressEl = document.getElementById("liAddress");
  var cuisineEl = document.getElementById("liCuisine");
  var clientNameEl = document.getElementById("liClientName");
  var analyzeBtn = document.getElementById("liAnalyzeBtn");
  var resultPanel = document.getElementById("liResultPanel");
  var saveBtn = document.getElementById("liSaveBtn");
  var historyBody = document.getElementById("liHistoryTable");
  if (!addressEl || !analyzeBtn) return; // this tab isn't on the page

  var lastResult = null;

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
    // Each metric pulls from its own slice of the sequence so tweaking one
    // input shifts every metric, not just one — feels less like a single dial.
    var traffic = Math.round(clamp(38 + rand() * 55 + rand() * 10, 8, 97));
    var competitorsNearby = Math.round(rand() * 9); // 0-8 "similar concepts nearby"
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
    if (overall10 >= 8) return { label: "Alta oportunidad", cls: "high" };
    if (overall10 >= 6) return { label: "Oportunidad moderada", cls: "mid" };
    return { label: "Requiere mas analisis", cls: "low" };
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

  function render(r, address, cuisine) {
    var t = tier(r.overall10);
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
    insightsFor(r, cuisine).forEach(function (text) {
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

  analyzeBtn.addEventListener("click", function () {
    var address = (addressEl.value || "").trim();
    if (!address) {
      addressEl.focus();
      return;
    }
    var cuisine = cuisineEl.value;
    var r = scoreFor(address, cuisine);
    lastResult = { r: r, address: address, cuisine: cuisine };
    render(r, address, cuisine);
    resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
