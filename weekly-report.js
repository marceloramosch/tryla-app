/* Reporte semanal del CRM: se arma solo con los datos vivos (leads, pipeline, cotizaciones,
   blueprints, tareas, actividad) + las prioridades e insights que escribe el usuario.
   Se imprime / guarda como PDF desde el navegador. Los datos manuales viven en la clave
   "novaWeeklyReport" (localStorage + nube), nunca en el repo. */
(function () {
  "use strict";
  var KEY = "novaWeeklyReport";
  var DAY = 86400000;
  var CATS = ["Más cercano", "Por cotizar", "En cotización", "Seguimiento"];
  var STAGES = ["Cold", "Warm", "HOT", "Finance", "Cash", "Closed", "Lost", "Trash"];
  var FUNNEL = ["Cold", "Warm", "HOT", "Finance", "Cash", "Closed"];

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
  function money(n) { return "$" + Math.round(n || 0).toLocaleString("en-US"); }
  function ymd(d) { var x = new Date(d); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); }
  function startOf(str) { var p = str.split("-"); return new Date(+p[0], +p[1] - 1, +p[2], 0, 0, 0, 0).getTime(); }
  function endOf(str) { return startOf(str) + DAY - 1; }
  function fdate(ts) { return new Date(ts).toLocaleDateString("es-MX", { day: "numeric", month: "short" }); }
  function fdatetime(ts) { return new Date(ts).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" }) + " " + new Date(ts).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }); }
  function uid() { return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

  var state = null;
  function load() {
    try { state = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { state = null; }
    if (!state || typeof state !== "object") state = {};
    state.priorities = Array.isArray(state.priorities) ? state.priorities : [];
    state.snapshots = Array.isArray(state.snapshots) ? state.snapshots : [];
    state.insights = typeof state.insights === "string" ? state.insights : "";
  }
  function save() {
    var v = JSON.stringify(state);
    var crm = window.TrylaCRM;
    if (crm && crm.syncSet) crm.syncSet(KEY, v); else { try { localStorage.setItem(KEY, v); } catch (e) {} }
  }

  var root, from, to;

  function dataset() {
    var crm = window.TrylaCRM;
    var d = crm ? crm.data() : { clients: [], quotes: [], activityLog: [] };
    d.blueprints = (window.TrylaBlueprints && window.TrylaBlueprints.list) ? window.TrylaBlueprints.list() : [];
    d.value = crm ? crm.value : function () { return 0; };
    d.totals = crm ? crm.totals : function () { return { subtotal: 0 }; };
    d.isInvoice = crm ? crm.isInvoice : function () { return false; };
    return d;
  }

  function lastTouch(c) {
    var at = c.createdAt || 0, label = "Lead creado";
    if (c.lastCallAt && c.lastCallAt > at) { at = c.lastCallAt; label = "Llamada"; }
    var n = (c.noteLog || [])[0];
    if (n && n.at > at) { at = n.at; label = n.type === "email" ? "Correo" : "Nota"; }
    if (c.movedAt && c.movedAt > at) { at = c.movedAt; label = "Movido"; }
    return { at: at, label: label };
  }
  function isMeeting(t) { return /cita|reuni|videollamada|llamada|meeting|call|visita/i.test(t.text || ""); }

  function compute() {
    var d = dataset(), f = startOf(from), t = endOf(to), now = Date.now();
    var clients = d.clients, quotes = d.quotes;
    var byId = {}; clients.forEach(function (c) { byId[c.id] = c; });
    var out = { f: f, t: t, d: d };
    var live = clients.filter(function (c) { return c.status !== "Trash"; });

    out.stage = {};
    STAGES.forEach(function (s) { out.stage[s] = { n: 0, v: 0 }; });
    clients.forEach(function (c) {
      var s = out.stage[c.status] ? c.status : "Cold";
      out.stage[s].n++; out.stage[s].v += d.value(c);
    });
    out.openValue = live.filter(function (c) { return ["Cold", "Warm", "HOT", "Finance"].indexOf(c.status) !== -1; }).reduce(function (s, c) { return s + d.value(c); }, 0);

    out.newLeads = clients.filter(function (c) { return c.createdAt >= f && c.createdAt <= t; });
    out.closedWeek = clients.filter(function (c) { return (c.stageHistory || []).some(function (h) { return h.stage === "Closed" && h.at >= f && h.at <= t; }); });
    out.invoicedWeek = quotes.filter(function (q) { return d.isInvoice(q) && q.invoiceCreatedAt >= f && q.invoiceCreatedAt <= t; });
    out.quotesWeek = quotes.filter(function (q) {
      var m = /^q(\d{10,})$/.exec(String(q.id || "")), at = m ? +m[1] : (q.updatedAt || 0);
      q._createdAt = at; return at >= f && at <= t;
    }).sort(function (a, b) { return b._createdAt - a._createdAt; });
    out.quotesUpdated = quotes.filter(function (q) { return q.updatedAt >= f && q.updatedAt <= t && out.quotesWeek.indexOf(q) === -1; }).length;
    out.hot = live.filter(function (c) { return c.status === "HOT" || c.status === "Finance"; })
      .sort(function (a, b) { return d.value(b) - d.value(a); });
    out.touched = live.map(function (c) { var l = lastTouch(c); return { c: c, at: l.at, label: l.label }; })
      .filter(function (x) { return x.at >= f && x.at <= t; }).sort(function (a, b) { return b.at - a.at; }).slice(0, 12);
    out.cooling = live.filter(function (c) { return ["Warm", "HOT", "Finance"].indexOf(c.status) !== -1; })
      .map(function (c) { return { c: c, days: Math.floor((now - lastTouch(c).at) / DAY) }; })
      .filter(function (x) { return x.days >= 7; }).sort(function (a, b) { return b.days - a.days; }).slice(0, 8);

    out.done = []; out.upcoming = [];
    clients.forEach(function (c) {
      (c.tasks || []).forEach(function (tk) {
        if (tk.done) {
          var at = tk.doneAt || tk.dueAt || tk.createdAt || 0;
          if (at >= f && at <= t) out.done.push({ c: c, t: tk, at: at });
        } else if (tk.dueAt && tk.dueAt >= f) {
          out.upcoming.push({ c: c, t: tk, at: tk.dueAt });
        }
      });
    });
    out.done.sort(function (a, b) { return b.at - a.at; });
    out.upcoming.sort(function (a, b) { return a.at - b.at; });
    out.upcoming = out.upcoming.slice(0, 20);

    out.bpWeek = d.blueprints.filter(function (b) { return b.updated >= f && b.updated <= t; }).sort(function (a, b) { return b.updated - a.updated; });

    var ev = [];
    (d.activityLog || []).forEach(function (a) { if (a.ts >= f && a.ts <= t) ev.push({ at: a.ts, k: "Actividad", text: a.text }); });
    clients.forEach(function (c) {
      if (c.createdAt >= f && c.createdAt <= t) ev.push({ at: c.createdAt, k: "Lead", text: "Nuevo lead: " + (c.name || "") });
      (c.noteLog || []).forEach(function (n) { if (n.at >= f && n.at <= t) ev.push({ at: n.at, k: "Nota", text: (c.name || "") + ": " + String(n.text || "").slice(0, 140) }); });
    });
    out.bpWeek.forEach(function (b) { ev.push({ at: b.updated, k: "Blueprint", text: "Blueprint " + (b.cliente || "") + (b.folio ? " (cotización " + b.folio + ")" : "") }); });
    out.timeline = ev.sort(function (a, b) { return b.at - a.at; }).slice(0, 60);

    out.prev = null;
    for (var i = state.snapshots.length - 1; i >= 0; i--) { if (state.snapshots[i].date < ymd(f + 1) || i === 0) { out.prev = state.snapshots[i]; break; } }
    out.byId = byId;
    return out;
  }

  function table(head, rows, cls) {
    if (!rows.length) return '<div class="wr-empty">Sin movimientos en este periodo.</div>';
    return '<table class="wr-t ' + (cls || "") + '"><thead><tr>' + head.map(function (h) { return "<th>" + esc(h) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      rows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table>";
  }

  function docHtml(R) {
    var d = R.d, h = [];
    var rangeTxt = fdate(R.f) + " – " + fdate(R.t) + ", " + new Date(R.t).getFullYear();
    h.push('<div class="wr-bar"></div><div class="wr-head"><img src="../assets/tryla_logo_full.png" alt="Tryla" class="wr-logo"><div class="wr-hd-r">1111 Ellenwood St, Dallas, TX 75217<br>Generado ' + esc(new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })) + "</div></div>");
    h.push('<h1 class="wr-title">Reporte semanal</h1><div class="wr-sub">' + esc(rangeTxt) + "</div>");

    var kp = [
      ["Leads nuevos", R.newLeads.length], ["Cotizaciones hechas", R.quotesWeek.length], ["Ventas cerradas", R.closedWeek.length + R.invoicedWeek.length],
      ["Blueprints", R.bpWeek.length], ["Pipeline abierto", money(R.openValue)], ["Leads activos", Object.keys(R.stage).filter(function (s) { return s !== "Trash" && s !== "Lost" && s !== "Closed"; }).reduce(function (s, k) { return s + R.stage[k].n; }, 0)]
    ];
    h.push('<div class="wr-kpis">' + kp.map(function (k) { return '<div class="wr-kpi"><b>' + esc(k[1]) + "</b><span>" + esc(k[0]) + "</span></div>"; }).join("") + "</div>");

    var pr = state.priorities.filter(function (p) { return p.name; });
    if (pr.length) {
      h.push('<h2 class="wr-h2">Prioridades de la semana</h2>');
      CATS.forEach(function (cat) {
        var l = pr.filter(function (p) { return p.cat === cat; });
        if (!l.length) return;
        h.push('<div class="wr-cat">' + esc(cat) + "</div>" + l.map(function (p) { return '<div class="wr-pr"><b>' + esc(p.name) + "</b>" + (p.note ? " — " + esc(p.note) : "") + "</div>"; }).join(""));
      });
    }
    if (state.insights.trim()) h.push('<h2 class="wr-h2">Insights</h2><div class="wr-ins">' + esc(state.insights).replace(/\n/g, "<br>") + "</div>");

    // Funnel congelado
    var max = Math.max.apply(null, FUNNEL.map(function (s) { return R.stage[s].n; }).concat([1]));
    h.push('<h2 class="wr-h2">Pipeline y funnel (foto de hoy)</h2><div class="wr-funnel">' + FUNNEL.map(function (s) {
      var n = R.stage[s].n, w = Math.max(6, Math.round(n / max * 100));
      var dl = ""; if (R.prev && R.prev.counts && R.prev.counts[s] != null) { var dd = n - R.prev.counts[s]; dl = dd ? ' <i class="' + (dd > 0 ? "up" : "dn") + '">' + (dd > 0 ? "+" : "") + dd + "</i>" : ""; }
      return '<div class="wr-fr"><span class="wr-fl">' + esc(s) + '</span><div class="wr-fw"><div class="wr-fb" style="width:' + w + '%"></div></div><span class="wr-fn"><b>' + n + "</b>" + dl + (R.stage[s].v ? " · " + money(R.stage[s].v) : "") + "</span></div>";
    }).join("") + "</div>" + (R.prev ? '<div class="wr-note">Cambio contra la foto del ' + esc(R.prev.date) + ". Lost: " + R.stage.Lost.n + " · Trash: " + R.stage.Trash.n + "</div>" : '<div class="wr-note">Lost: ' + R.stage.Lost.n + " · Trash: " + R.stage.Trash.n + ". Guarda la foto del funnel para comparar la próxima semana.</div>"));

    h.push('<h2 class="wr-h2">Leads HOT y en financiamiento</h2>' + table(["Lead", "Etapa", "Sub-etapa", "Cotizado", "Último movimiento"], R.hot.slice(0, 20).map(function (c) {
      var l = lastTouch(c);
      return ["<b>" + esc(c.name || "") + "</b>" + (c.negocio ? "<br><small>" + esc(c.negocio) + "</small>" : ""), esc(c.status), esc(c.substage || "—"), d.value(c) ? money(d.value(c)) : "—", esc(l.label + " · " + fdate(l.at))];
    })));

    h.push('<h2 class="wr-h2">Cotizaciones hechas esta semana</h2>' + table(["Fecha", "Cliente", "Cotización", "Total", "Estado"], R.quotesWeek.map(function (q) {
      return [esc(fdate(q._createdAt)), "<b>" + esc(q.cliente || "") + "</b>", esc(q.number || ""), money(d.totals(q).subtotal), esc(d.isInvoice(q) ? "Invoice" : q.status || "")];
    })) + (R.quotesUpdated ? '<div class="wr-note">Además se actualizaron ' + R.quotesUpdated + " cotizaciones existentes.</div>" : ""));

    h.push('<h2 class="wr-h2">Citas y tareas hechas</h2>' + table(["Fecha", "Lead", "Tarea"], R.done.map(function (x) { return [esc(fdate(x.at)), "<b>" + esc(x.c.name || "") + "</b>", esc(x.t.text || "")]; })));
    h.push('<h2 class="wr-h2">Lo que viene</h2>' + table(["Cuándo", "Lead", "Tarea / cita"], R.upcoming.map(function (x) { return [esc(fdatetime(x.at)) + (x.at < Date.now() ? ' <i class="dn">vencida</i>' : ""), "<b>" + esc(x.c.name || "") + "</b>", esc(x.t.text || "") + (isMeeting(x.t) ? " 📅" : "")]; })));

    h.push('<h2 class="wr-h2">Leads tocados recientemente</h2>' + table(["Lead", "Etapa", "Qué pasó", "Cuándo"], R.touched.map(function (x) { return ["<b>" + esc(x.c.name || "") + "</b>", esc(x.c.status), esc(x.label), esc(fdate(x.at))]; })));
    if (R.cooling.length) h.push('<h2 class="wr-h2">Se están enfriando (7+ días sin tocar)</h2>' + table(["Lead", "Etapa", "Días sin tocar"], R.cooling.map(function (x) { return ["<b>" + esc(x.c.name || "") + "</b>", esc(x.c.status), x.days]; })));

    h.push('<h2 class="wr-h2">Blueprints</h2>' + table(["Cliente", "Cotización", "Tamaño", "Actualizado"], R.bpWeek.map(function (b) { return ["<b>" + esc(b.cliente || "—") + "</b>", esc(b.folio || "sin vincular"), esc(b.size || ""), esc(fdate(b.updated))]; })) + '<div class="wr-note">Total de blueprints guardados: ' + d.blueprints.length + "</div>");

    h.push('<h2 class="wr-h2">Línea de tiempo</h2>' + table(["Fecha", "Tipo", "Detalle"], R.timeline.map(function (e) { return [esc(fdatetime(e.at)), esc(e.k), esc(e.text)]; }), "wr-tl"));
    h.push('<div class="wr-foot"><span>Marcelo Ramos Schiaffino · +1 (645) 235-3186 · marcelo.ramos@thetryla.com</span><span>Confidencial · uso interno</span></div>');
    return h.join("");
  }

  function textSummary(R) {
    var L = ["REPORTE SEMANAL TRYLA · " + fdate(R.f) + " – " + fdate(R.t), ""];
    L.push("Leads nuevos: " + R.newLeads.length + " · Cotizaciones: " + R.quotesWeek.length + " · Ventas cerradas: " + (R.closedWeek.length + R.invoicedWeek.length) + " · Blueprints: " + R.bpWeek.length);
    L.push("Pipeline abierto: " + money(R.openValue));
    CATS.forEach(function (cat) { state.priorities.filter(function (p) { return p.cat === cat && p.name; }).forEach(function (p) { L.push("• " + cat + ": " + p.name + (p.note ? " — " + p.note : "")); }); });
    L.push("Funnel: " + FUNNEL.map(function (s) { return s + " " + R.stage[s].n; }).join(" · "));
    if (state.insights.trim()) L.push("", state.insights.trim());
    return L.join("\n");
  }

  function renderPriorities() {
    var box = root.querySelector("#wrPrio");
    box.innerHTML = state.priorities.map(function (p) {
      return '<div class="wr-prow" data-id="' + esc(p.id) + '"><input class="wr-pn" placeholder="Nombre (ej. EMRA)" value="' + esc(p.name) + '">' +
        '<select class="wr-pc">' + CATS.map(function (c) { return '<option' + (c === p.cat ? " selected" : "") + ">" + c + "</option>"; }).join("") + "</select>" +
        '<input class="wr-pt" placeholder="Nota (cita miércoles, rango $25-30k…)" value="' + esc(p.note) + '"><button type="button" class="btn-small wr-pd" title="Quitar">✕</button></div>';
    }).join("") || '<div class="wr-empty">Agrega los leads clave de la semana.</div>';
  }

  function render() {
    if (!root) return;
    var R = compute();
    root.querySelector("#wrDoc").innerHTML = docHtml(R);
    renderSnaps();
  }
  function renderSnaps() {
    var el = root.querySelector("#wrSnaps");
    if (!el) return;
    el.textContent = state.snapshots.length ? "Fotos guardadas: " + state.snapshots.slice(-6).map(function (s) { return s.date; }).join(" · ") : "Aún no hay fotos del funnel.";
  }

  function init() {
    root = document.getElementById("tab-report");
    if (!root) return;
    load();
    var today = ymd(Date.now());
    from = ymd(Date.now() - 6 * DAY); to = today; // ultimos 7 dias
    root.querySelector("#wrFrom").value = from; root.querySelector("#wrTo").value = to;
    root.querySelector("#wrIns").value = state.insights;
    renderPriorities();
    root.querySelector("#wrFrom").addEventListener("change", function (e) { from = e.target.value || from; render(); });
    root.querySelector("#wrTo").addEventListener("change", function (e) { to = e.target.value || to; render(); });
    root.querySelector("#wrWeek").addEventListener("click", function () { var dw = (new Date().getDay() + 6) % 7; from = ymd(Date.now() - (dw + 7) * DAY); to = ymd(Date.now() - (dw + 1) * DAY); root.querySelector("#wrFrom").value = from; root.querySelector("#wrTo").value = to; render(); });
    root.querySelector("#wrAdd").addEventListener("click", function () { state.priorities.push({ id: uid(), name: "", cat: CATS[0], note: "" }); save(); renderPriorities(); });
    root.querySelector("#wrPrio").addEventListener("input", function (e) {
      var row = e.target.closest(".wr-prow"); if (!row) return;
      var p = state.priorities.filter(function (x) { return x.id === row.dataset.id; })[0]; if (!p) return;
      if (e.target.classList.contains("wr-pn")) p.name = e.target.value; else if (e.target.classList.contains("wr-pt")) p.note = e.target.value; else if (e.target.classList.contains("wr-pc")) p.cat = e.target.value;
      save(); render();
    });
    root.querySelector("#wrPrio").addEventListener("click", function (e) {
      if (!e.target.classList.contains("wr-pd")) return;
      var id = e.target.closest(".wr-prow").dataset.id;
      state.priorities = state.priorities.filter(function (x) { return x.id !== id; }); save(); renderPriorities(); render();
    });
    root.querySelector("#wrIns").addEventListener("input", function (e) { state.insights = e.target.value; save(); render(); });
    root.querySelector("#wrSnap").addEventListener("click", function () {
      var R = compute(), counts = {}, values = {};
      STAGES.forEach(function (s) { counts[s] = R.stage[s].n; values[s] = Math.round(R.stage[s].v); });
      var date = ymd(Date.now());
      state.snapshots = state.snapshots.filter(function (s) { return s.date !== date; });
      state.snapshots.push({ date: date, counts: counts, values: values });
      state.snapshots.sort(function (a, b) { return a.date < b.date ? -1 : 1; }); state.snapshots = state.snapshots.slice(-52);
      save(); render();
    });
    root.querySelector("#wrPrint").addEventListener("click", function () {
      render(); document.body.classList.add("wr-print");
      var done = function () { document.body.classList.remove("wr-print"); window.removeEventListener("afterprint", done); };
      window.addEventListener("afterprint", done); setTimeout(function () { window.print(); }, 60);
    });
    root.querySelector("#wrCopy").addEventListener("click", function () {
      var txt = textSummary(compute()), b = this, t0 = b.textContent;
      var ok = function () { b.textContent = "Copiado ✓"; setTimeout(function () { b.textContent = t0; }, 1400); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, function () { window.prompt("Copia el texto:", txt); }); else window.prompt("Copia el texto:", txt);
    });
    render();
  }

  window.TrylaWeeklyReport = { render: function () { if (root) { render(); } }, init: init };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
