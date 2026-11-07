// ============================================================
//  TRYLA BLUEPRINTS — editor de blueprints sobre hoja membretada
//  Base de trailer (10, 12, 16, 20, 22, 24 ft) + componentes recortados
//  de las hojas Panamerican + herramientas de dibujo + lista y total.
//  Exporta a PNG o PDF (imprimir) para mandar a prospectos.
// ============================================================
(function () {
  "use strict";
  var BASES = window.TRYLA_BP_BASES || {};
  var LIB = window.TRYLA_BP_LIB || [];
  var ASSET = "../assets/blueprint/";
  var FONT = "Barlow, Arial, sans-serif";
  var C = { blue: "#5B54FF", navy: "#06038D", light: "#F1F0FF", border: "#D6D3FF", text2: "#5C6270", ink: "#1B1D2A", red: "#C0392B" };
  var W = 1650, MARGIN = 60, PAGE_H = 2135;
  var STORE = "trylaBlueprints";

  var LABEL_FIX = {
    grill_2: "Plancha / parrilla 2 perillas", grill_4: "Parrilla 4 perillas", hotplate_a: "Hornilla 2 perillas", hotplate_b: "Hornilla 2 perillas",
    sink_ext_r: "Lavamanos + extintor", rack_ac_r: "Rack de propano + A/C", rack_ac_l: "Rack de propano + A/C", v1_griddle_3: "Plancha 3 pies",
    v1_stove_4: "Estufa 4 quemadores", c_griddle_3: "Plancha 3 pies", v5_warmer_double: "Calentador doble (2 pans)", v5_sandwich_prep_27: "Sandwich prep 27\"",
    v5_sandwich_prep_27_l: "Sandwich prep 27\"", v4_grill_4k: "Parrilla 4 perillas", v4_hotplate_4k: "Hornilla 4 quemadores", v4_prep_cabinet: "Mueble con equipo (puertas)",
    c_prep_cabinet: "Mueble con equipo (puertas)", t12_display_fridge_r: "Refrigerador de vidrio", v4_display_fridge: "Refrigerador de vidrio",
    c_mesh_panel_r: "Panel de malla (ventilación)", c_range_6_oven: "Estufa 6 quemadores con horno", b_hotplate_4: "Hornilla 4 quemadores",
    v1_fridge_ss_sandwich: "Refrigerador acero inox con tapa", v2_fridge_ss_legs: "Refrigerador acero inox con patas", b_tv_window_32: "Ventana TV 32\"",
    v4_sink_handwash_r: "Lavamanos", v4_sink_l: "Lavamanos", hood: "Campana 10 pies", v2_outlet_small_a: "Toma chica", fryer: "Freidora 40 lb",
    v4_fryer_double: "Freidoras dobles", v5_shelves_wall: "Repisas de pared", v6_freezer_big: "Congelador grande", b_fridge_tall: "Refrigerador alto"
  };
  LIB = LIB.filter(function (l) { return !/^(c_mesh_panel_l|t12_display_fridge_l|v2_outlet_small_b|v4_table_5ft_b|v4_window_b|v4_extinguisher|v4_rack_ac_l)$/.test(l.id) && ["grill_2"].indexOf(l.id) !== -2; });
  LIB.forEach(function (l) { if (LABEL_FIX[l.id]) l.label = LABEL_FIX[l.id]; });

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
  function money(n) { return "$" + Math.round(n || 0).toLocaleString("en-US"); }
  function fmtFt(ft) { var i = Math.round(ft * 12), f = Math.floor(i / 12), r = i - f * 12; return f + "'" + (r ? "-" + r + '"' : ""); }
  function uid() { return "o" + Math.random().toString(36).slice(2, 9); }
  function libById(id) { for (var i = 0; i < LIB.length; i++) if (LIB[i].id === id) return LIB[i]; return null; }

  var FICHA = [
    ["cliente", "Cliente"], ["folio", "Folio"], ["oficina", "Oficina"], ["destino", "Destino"], ["modelo", "Modelo"], ["piso", "Piso"],
    ["ejes", "Ejes"], ["color", "Color"], ["ac", "A/C"], ["louver", "Louver"], ["plomeria", "Plomería"], ["agua_limpia", "Tanque agua limpia"],
    ["agua_residual", "Tanque agua residual"], ["generador", "Generador"], ["ventana", "Ventanas"], ["ruedas", "Ruedas"], ["campana", "Campana"],
    ["bomba", "Bomba de agua"], ["calentador", "Calentador"], ["luz", "Luz exterior"], ["observaciones", "Observaciones"]
  ];
  var FICHA_SHEET = ["cliente", "folio", "color", "modelo", "ac", "ejes", "ventana", "campana", "agua_limpia", "agua_residual", "generador", "calentador", "observaciones"];

  var doc = null, selId = null, tool = "select", hist = [], histI = -1;
  var style = { stroke: "#06038D", fill: "none", sw: 4, dash: false, size: 34 };
  var root, svgHost, selTarget = "auto";

  // ---------- Documento ----------
  function newDoc(sizeId) {
    return {
      sizeId: String(sizeId || 16), titulo: "", showPrices: false, ficha: {}, objs: [], notas: ""
    };
  }
  function base(d) { return BASES[(d || doc).sizeId] || BASES[16]; }

  // ---------- Layout de la hoja ----------
  function layout(d) {
    var b = base(d), views = {}, y = 250;
    ["right", "left"].forEach(function (v) {
      var bi = b[v];
      var s = Math.min((W - MARGIN * 2) / bi.w, 590 / bi.h);
      var vw = bi.w * s, vh = bi.h * s, vx = (W - vw) / 2;
      views[v] = { x: vx, y: y, w: vw, h: vh, s: s, ox: vx + bi.x0 * s, floor: y + bi.floor * s, pxft: bi.pxft * s, file: bi.file, bw: bi.w, bh: bi.h };
      y += vh + 110;
    });
    return { views: views, endY: y - 30 };
  }
  function toSheet(o, L) {
    var v = L.views[o.view] || L.views.right;
    return { x: v.ox + o.xft * v.pxft, y: v.floor - (o.bft + o.hft) * v.pxft, w: o.wft * v.pxft, h: o.hft * v.pxft };
  }
  function viewAt(L, y) {
    return y < (L.views.right.y + L.views.right.h + 50) ? "right" : "left";
  }
  function numbering() {
    var items = doc.objs.filter(function (o) { return o.t === "comp" || o.t === "fss"; });
    items.sort(function (a, b) { return (a.view === b.view ? 0 : a.view === "right" ? -1 : 1) || a.xft - b.xft; });
    var map = {};
    items.forEach(function (o, i) { map[o.id] = i + 1; });
    return { items: items, map: map };
  }
  function objLabel(o) { if (o.t === "fss") return "Sistema contra incendios (FSS)" + (o.ps === 2 ? " · 2 palancas (PS)" : " · 1 palanca (PS)"); return o.label || (libById(o.lib) || {}).label || "Componente"; }

  // ---------- Render ----------
  function R(x) { return Math.round(x * 10) / 10; }
  function t(x, y, s, size, o) {
    o = o || {};
    return '<text x="' + R(x) + '" y="' + R(y) + '" font-family="' + FONT + '" font-size="' + size + '" fill="' + (o.fill || C.navy) + '"' + (o.bold ? ' font-weight="700"' : "") +
      ' text-anchor="' + (o.anchor || "start") + '"' + (o.halo ? ' paint-order="stroke" stroke="#fff" stroke-width="6" stroke-linejoin="round"' : "") + ">" + esc(s) + "</text>";
  }
  function wrapText(str, maxChars) {
    var words = String(str).split(/\s+/), lines = [], cur = "";
    words.forEach(function (w) { var c = cur ? cur + " " + w : w; if (c.length > maxChars && cur) { lines.push(cur); cur = w; } else cur = c; });
    if (cur) lines.push(cur);
    return lines;
  }
  function dashAttr(o) { return o.dash ? ' stroke-dasharray="' + (o.sw * 3) + " " + (o.sw * 2) + '"' : ""; }

  function renderObj(o, L, num) {
    var s = "";
    if (o.t === "comp") {
      var lib = libById(o.lib); if (!lib) return "";
      var p = toSheet(o, L);
      var tr = o.mirror ? ' transform="translate(' + R(p.x * 2 + p.w) + ',0) scale(-1,1)"' : "";
      s += '<g data-oid="' + o.id + '"' + tr + '><image href="' + ASSET + lib.file + '" x="' + R(p.x) + '" y="' + R(p.y) + '" width="' + R(p.w) + '" height="' + R(p.h) + '" preserveAspectRatio="none"/></g>';
      if (num) s += '<g data-oid="' + o.id + '"><circle cx="' + R(p.x + p.w / 2) + '" cy="' + R(p.y + p.h + 26) + '" r="17" fill="' + C.navy + '"/>' + t(p.x + p.w / 2, p.y + p.h + 33, num, 20, { fill: "#fff", anchor: "middle", bold: true }) + "</g>";
    } else if (o.t === "fss") {
      var q = toSheet(o, L), cw = q.w * 0.5, ps = o.ps === 2 ? 2 : 1;
      s += '<g data-oid="' + o.id + '">' +
        '<rect x="' + R(q.x) + '" y="' + R(q.y) + '" width="' + R(cw) + '" height="' + R(q.h) + '" rx="' + R(cw / 2.6) + '" fill="#E53935" stroke="#7A1F1F" stroke-width="3"/>' +
        t(q.x + cw / 2, q.y + q.h * 0.42, "FSS", Math.max(14, cw * 0.38), { fill: "#fff", anchor: "middle", bold: true });
      for (var k = 0; k < ps; k++) {
        var by = q.y + 8 + k * (q.h * 0.42), bs = Math.min(q.w * 0.42, q.h * 0.34);
        s += '<rect x="' + R(q.x + cw + q.w * 0.07) + '" y="' + R(by) + '" width="' + R(bs) + '" height="' + R(bs) + '" rx="4" fill="#C0392B" stroke="#fff" stroke-width="2"/>' +
          t(q.x + cw + q.w * 0.07 + bs / 2, by + bs * 0.62, "PS", Math.max(11, bs * 0.4), { fill: "#fff", anchor: "middle", bold: true });
      }
      s += "</g>";
      if (num) s += '<g data-oid="' + o.id + '"><circle cx="' + R(q.x + q.w / 2) + '" cy="' + R(q.y + q.h + 26) + '" r="17" fill="' + C.navy + '"/>' + t(q.x + q.w / 2, q.y + q.h + 33, num, 20, { fill: "#fff", anchor: "middle", bold: true }) + "</g>";
    } else if (o.t === "rect") {
      s += '<rect data-oid="' + o.id + '" x="' + R(Math.min(o.x, o.x + o.w)) + '" y="' + R(Math.min(o.y, o.y + o.h)) + '" width="' + R(Math.abs(o.w)) + '" height="' + R(Math.abs(o.h)) + '" fill="' + o.fill + '" stroke="' + o.stroke + '" stroke-width="' + o.sw + '"' + dashAttr(o) + ' fill-opacity="' + (o.fill === "none" ? 0 : 0.35) + '"/>';
    } else if (o.t === "ellipse") {
      s += '<ellipse data-oid="' + o.id + '" cx="' + R(o.x + o.w / 2) + '" cy="' + R(o.y + o.h / 2) + '" rx="' + R(Math.abs(o.w) / 2) + '" ry="' + R(Math.abs(o.h) / 2) + '" fill="' + o.fill + '" stroke="' + o.stroke + '" stroke-width="' + o.sw + '"' + dashAttr(o) + ' fill-opacity="' + (o.fill === "none" ? 0 : 0.35) + '"/>';
    } else if (o.t === "line") {
      s += '<line data-oid="' + o.id + '" x1="' + R(o.x1) + '" y1="' + R(o.y1) + '" x2="' + R(o.x2) + '" y2="' + R(o.y2) + '" stroke="' + o.stroke + '" stroke-width="' + o.sw + '" stroke-linecap="round"' + dashAttr(o) + "/>";
      if (o.arrow) {
        var a = Math.atan2(o.y2 - o.y1, o.x2 - o.x1), hl = 14 + o.sw * 2.5;
        s += '<polygon data-oid="' + o.id + '" points="' + R(o.x2) + "," + R(o.y2) + " " + R(o.x2 - hl * Math.cos(a - 0.4)) + "," + R(o.y2 - hl * Math.sin(a - 0.4)) + " " + R(o.x2 - hl * Math.cos(a + 0.4)) + "," + R(o.y2 - hl * Math.sin(a + 0.4)) + '" fill="' + o.stroke + '"/>';
      }
    } else if (o.t === "path") {
      s += '<polyline data-oid="' + o.id + '" points="' + o.pts.map(function (p) { return R(p[0]) + "," + R(p[1]); }).join(" ") + '" fill="none" stroke="' + o.stroke + '" stroke-width="' + o.sw + '" stroke-linecap="round" stroke-linejoin="round"/>';
    } else if (o.t === "text") {
      var lines = String(o.text).split("\n");
      s += '<g data-oid="' + o.id + '">' + lines.map(function (ln, i) { return t(o.x, o.y + i * o.size * 1.2, ln, o.size, { fill: o.fill, bold: o.bold }); }).join("") + "</g>";
    }
    return s;
  }
  function bboxOf(o, L) {
    if (o.t === "comp" || o.t === "fss") { var p = toSheet(o, L); return { x: p.x, y: p.y, w: p.w, h: p.h }; }
    if (o.t === "rect" || o.t === "ellipse") return { x: Math.min(o.x, o.x + o.w), y: Math.min(o.y, o.y + o.h), w: Math.abs(o.w), h: Math.abs(o.h) };
    if (o.t === "line") return { x: Math.min(o.x1, o.x2), y: Math.min(o.y1, o.y2), w: Math.abs(o.x2 - o.x1), h: Math.abs(o.y2 - o.y1) };
    if (o.t === "path") { var xs = o.pts.map(function (p) { return p[0]; }), ys = o.pts.map(function (p) { return p[1]; }); var x0 = Math.min.apply(0, xs), y0 = Math.min.apply(0, ys); return { x: x0, y: y0, w: Math.max.apply(0, xs) - x0, h: Math.max.apply(0, ys) - y0 }; }
    if (o.t === "text") { var ln = String(o.text).split("\n"); var mw = Math.max.apply(0, ln.map(function (l) { return l.length; })) * o.size * 0.55; return { x: o.x, y: o.y - o.size, w: mw, h: ln.length * o.size * 1.2 }; }
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  function sheetSVG(withHandles) {
    var L = layout(doc), b = base(doc), nm = numbering();
    var rows = nm.items.length, fichaVals = FICHA_SHEET.filter(function (k) { return doc.ficha[k]; });
    var legendY = L.endY + 20, rowH = 46;
    var needed = legendY + 70 + rows * rowH + 40 + Math.ceil(fichaVals.length / 2) * 40 + (doc.notas ? 120 : 0) + 170;
    var H = Math.max(PAGE_H, needed);
    var s = "", ttl = doc.titulo || ("Blueprint · Trailer " + b.label);
    s += '<rect width="' + W + '" height="' + H + '" fill="#fff"/>';
    // membrete
    s += '<rect width="' + W + '" height="16" fill="' + C.blue + '"/>';
    s += '<image href="../assets/tryla_logo_full.png" x="' + MARGIN + '" y="48" height="86" width="' + R(86 * 4.1) + '" preserveAspectRatio="xMinYMid meet"/>';
    s += t(W - MARGIN, 80, ttl, 40, { anchor: "end", bold: true });
    var sub = [doc.ficha.cliente ? "Cliente: " + doc.ficha.cliente : "", doc.ficha.folio ? "Folio: " + doc.ficha.folio : "", new Date().toLocaleDateString("es-MX", { dateStyle: "long" })].filter(Boolean).join("  ·  ");
    s += t(W - MARGIN, 120, sub, 24, { anchor: "end", fill: C.text2 });
    s += '<line x1="' + MARGIN + '" y1="160" x2="' + (W - MARGIN) + '" y2="160" stroke="' + C.border + '" stroke-width="3"/>';
    s += t(MARGIN, 200, "Boceto de referencia para ventas, no es plano de ingeniería. Medidas de equipo de referencia.", 22, { fill: C.text2 });
    // vistas
    var names = { right: "VISTA INTERIOR · PARED DERECHA", left: "VISTA INTERIOR · PARED IZQUIERDA" };
    ["right", "left"].forEach(function (v) {
      var vw = L.views[v];
      s += t(MARGIN, vw.y - 22, names[v], 24, { bold: true });
      s += '<image href="' + ASSET + vw.file + '" x="' + R(vw.x) + '" y="' + R(vw.y) + '" width="' + R(vw.w) + '" height="' + R(vw.h) + '"/>';
    });
    doc.objs.forEach(function (o) { s += renderObj(o, L, nm.map[o.id]); });
    // leyenda
    var y = legendY;
    s += t(MARGIN, y + 6, "LISTA DE EQUIPO", 26, { bold: true });
    y += 22;
    s += '<rect x="' + MARGIN + '" y="' + y + '" width="' + (W - MARGIN * 2) + '" height="' + rowH + '" fill="' + C.navy + '"/>' +
      t(MARGIN + 18, y + 31, "#", 20, { fill: "#fff", bold: true }) + t(MARGIN + 80, y + 31, "COMPONENTE", 20, { fill: "#fff", bold: true }) +
      t(1010, y + 31, "MEDIDAS REF.", 20, { fill: "#fff", bold: true }) + t(1330, y + 31, doc.showPrices ? "PRECIO" : "PARED", 20, { fill: "#fff", bold: true });
    y += rowH;
    nm.items.forEach(function (o, i) {
      s += '<rect x="' + MARGIN + '" y="' + y + '" width="' + (W - MARGIN * 2) + '" height="' + rowH + '" fill="' + (i % 2 ? "#fff" : C.light) + '" stroke="' + C.border + '"/>' +
        '<circle cx="' + (MARGIN + 36) + '" cy="' + (y + rowH / 2) + '" r="15" fill="' + C.navy + '"/>' + t(MARGIN + 36, y + rowH / 2 + 7, i + 1, 18, { fill: "#fff", anchor: "middle", bold: true }) +
        t(MARGIN + 80, y + 31, objLabel(o), 22, { fill: C.ink }) + t(1010, y + 31, fmtFt(o.wft) + " × " + fmtFt(o.hft), 22, { fill: C.ink }) +
        t(1330, y + 31, doc.showPrices ? money(o.price) : (o.view === "right" ? "Derecha" : "Izquierda"), 22, { fill: C.ink });
      y += rowH;
    });
    if (!rows) { s += '<rect x="' + MARGIN + '" y="' + y + '" width="' + (W - MARGIN * 2) + '" height="' + rowH + '" fill="#fff" stroke="' + C.border + '"/>' + t(MARGIN + 18, y + 31, "Aún sin componentes: arrástralos desde la paleta.", 22, { fill: C.text2 }); y += rowH; }
    if (doc.showPrices && rows) {
      var tot = nm.items.reduce(function (a, o) { return a + (o.price || 0); }, 0);
      s += '<rect x="' + MARGIN + '" y="' + y + '" width="' + (W - MARGIN * 2) + '" height="' + rowH + '" fill="' + C.light + '" stroke="' + C.border + '"/>' + t(1010, y + 31, "TOTAL EQUIPO", 22, { bold: true }) + t(1330, y + 31, money(tot), 24, { bold: true });
      y += rowH;
    }
    y += 40;
    if (fichaVals.length) {
      s += t(MARGIN, y, "ESPECIFICACIONES", 26, { bold: true }); y += 20;
      fichaVals.forEach(function (k, i) {
        var col = i % 2, row = Math.floor(i / 2), lab = FICHA.filter(function (f) { return f[0] === k; })[0][1];
        var fx = MARGIN + col * ((W - MARGIN * 2) / 2);
        s += t(fx, y + 30 + row * 40, lab + ":", 21, { bold: true }) + t(fx + 260, y + 30 + row * 40, String(doc.ficha[k]).slice(0, 44), 21, { fill: C.ink });
      });
      y += Math.ceil(fichaVals.length / 2) * 40 + 30;
    }
    if (doc.notas) { wrapText(doc.notas, 100).slice(0, 4).forEach(function (ln, i) { s += t(MARGIN, y + 30 + i * 30, ln, 22, { fill: C.ink }); }); y += 130; }
    // firmas + pie
    var fy = H - 160;
    s += '<line x1="' + (W - MARGIN - 760) + '" y1="' + fy + '" x2="' + (W - MARGIN - 400) + '" y2="' + fy + '" stroke="' + C.navy + '" stroke-width="2"/>' + t(W - MARGIN - 580, fy + 26, "FIRMA CLIENTE", 18, { anchor: "middle", fill: C.text2 });
    s += '<line x1="' + (W - MARGIN - 340) + '" y1="' + fy + '" x2="' + (W - MARGIN) + '" y2="' + fy + '" stroke="' + C.navy + '" stroke-width="2"/>' + t(W - MARGIN - 170, fy + 26, "REPRESENTANTE TRYLA", 18, { anchor: "middle", fill: C.text2 });
    s += '<rect y="' + (H - 78) + '" width="' + W + '" height="78" fill="' + C.navy + '"/>' +
      t(MARGIN, H - 32, "Marcelo Ramos Schiaffino · +1 (645) 235-3186 · marcelo.ramos@thetryla.com", 24, { fill: "#fff", bold: true }) +
      t(W - MARGIN, H - 32, "1111 Ellenwood St, Dallas, TX 75217", 22, { fill: C.border, anchor: "end" });
    if (withHandles && selId) {
      var so = byId(selId);
      if (so) {
        var bb = bboxOf(so, L);
        s += '<rect class="bp-sel" x="' + R(bb.x - 6) + '" y="' + R(bb.y - 6) + '" width="' + R(bb.w + 12) + '" height="' + R(bb.h + 12) + '" fill="none" stroke="#1A73E8" stroke-width="2.5" stroke-dasharray="8 5" pointer-events="none"/>';
        if (so.t === "line") {
          s += '<circle class="bp-h" data-h="p1" cx="' + so.x1 + '" cy="' + so.y1 + '" r="10" fill="#1A73E8"/><circle class="bp-h" data-h="p2" cx="' + so.x2 + '" cy="' + so.y2 + '" r="10" fill="#1A73E8"/>';
        } else if (so.t !== "text" && so.t !== "path") {
          s += '<rect class="bp-h" data-h="se" x="' + R(bb.x + bb.w - 6) + '" y="' + R(bb.y + bb.h - 6) + '" width="20" height="20" fill="#1A73E8" stroke="#fff" stroke-width="2"/>';
        }
      }
    }
    return { svg: '<svg id="bpSvg" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" font-family="' + FONT + '">' + s + "</svg>", H: H, L: L };
  }

  // ---------- Estado ----------
  function byId(id) { for (var i = 0; i < doc.objs.length; i++) if (doc.objs[i].id === id) return doc.objs[i]; return null; }
  function snapshot() { hist = hist.slice(0, histI + 1); hist.push(JSON.stringify(doc)); if (hist.length > 80) hist.shift(); histI = hist.length - 1; }
  function undo(step) { var n = histI + step; if (n < 0 || n >= hist.length) return; histI = n; doc = JSON.parse(hist[n]); selId = null; draw(true); }
  var rafId = 0;
  function draw(full) {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(function () {
      rafId = 0;
      var r = sheetSVG(true);
      svgHost.innerHTML = r.svg;
      renderSide();
      void full;
    });
  }
  function commit() { snapshot(); draw(true); autosave(); }
  function autosave() { try { localStorage.setItem(STORE + "_current", JSON.stringify(doc)); } catch (e) { /* sin storage */ } }

  // ---------- Agregar objetos ----------
  function nextX(view) {
    var m = 0.5;
    doc.objs.forEach(function (o) { if ((o.t === "comp" || o.t === "fss") && o.view === view && o.bft < 0.6) m = Math.max(m, o.xft + o.wft); });
    return m;
  }
  function clampX(x, w) { var L = base().length; return Math.max(0, Math.min(x, L - w)); }
  function addComp(libId, view, xft, bft) {
    var l = libById(libId); if (!l) return null;
    view = view || (selTarget !== "auto" ? selTarget : l.view);
    var floorItem = l.bottom < 0.6;
    var o = { id: uid(), t: "comp", lib: l.id, view: view, xft: clampX(xft != null ? xft : (floorItem ? nextX(view) : 0.5 + (doc.objs.length % 5)), l.w), bft: bft != null ? bft : (floorItem ? 0 : l.bottom), wft: l.w, hft: l.h, price: l.price || 0, label: l.label };
    doc.objs.push(o); selId = o.id; return o;
  }
  function addFSS(view) {
    view = view || (selTarget !== "auto" ? selTarget : "right");
    var o = { id: uid(), t: "fss", view: view, xft: clampX(nextX(view), 1.4), bft: 3.2, wft: 1.4, hft: 2.2, ps: 1, price: 3700 };
    doc.objs.push(o); selId = o.id; return o;
  }

  // ---------- Interacción ----------
  function ptr(e) {
    var svg = document.getElementById("bpSvg"), pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    var m = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: m.x, y: m.y };
  }
  function setFromSheet(o, x, y, L, snapOn) {
    var view = viewAt(L, y + (o.hft || 0) * L.views.right.pxft / 2);
    var v = L.views[view], q = snapOn ? 0.25 : 0.01;
    var xft = Math.round(((x - v.ox) / v.pxft) / q) * q;
    var bft = ((v.floor - y) / v.pxft) - o.hft;
    bft = Math.round(bft / q) * q;
    if (snapOn && Math.abs(bft) < 0.3) bft = 0;
    o.view = view; o.xft = Math.max(-1, Math.min(xft, base().length - o.wft + 1)); o.bft = Math.max(-0.5, bft);
  }
  var drag = null;
  function onDown(e) {
    var svg = document.getElementById("bpSvg"); if (!svg || !svg.contains(e.target)) return;
    var p = ptr(e), L = layout(doc);
    if (tool !== "select") {
      var o;
      if (tool === "text") {
        var txt = window.prompt("Texto:", ""); if (!txt) return;
        doc.objs.push({ id: uid(), t: "text", x: p.x, y: p.y, text: txt, size: style.size, fill: style.stroke, bold: true });
        selId = doc.objs[doc.objs.length - 1].id; tool = "select"; setTool(); commit(); return;
      }
      if (tool === "pencil") o = { id: uid(), t: "path", pts: [[p.x, p.y]], stroke: style.stroke, sw: style.sw };
      else if (tool === "line" || tool === "arrow") o = { id: uid(), t: "line", x1: p.x, y1: p.y, x2: p.x, y2: p.y, stroke: style.stroke, sw: style.sw, dash: style.dash, arrow: tool === "arrow" };
      else o = { id: uid(), t: tool, x: p.x, y: p.y, w: 0, h: 0, stroke: style.stroke, fill: style.fill, sw: style.sw, dash: style.dash };
      doc.objs.push(o); selId = o.id; drag = { mode: "draw", o: o, sx: p.x, sy: p.y }; e.preventDefault(); return;
    }
    var h = e.target.getAttribute && e.target.getAttribute("data-h");
    var oidEl = e.target.closest ? e.target.closest("[data-oid]") : null;
    if (h && selId) { var so = byId(selId); drag = { mode: "handle", h: h, o: so, sx: p.x, sy: p.y, w0: so.wft, h0: so.hft, ow: so.w, oh: so.h }; e.preventDefault(); return; }
    if (oidEl) {
      var obj = byId(oidEl.getAttribute("data-oid"));
      selId = obj.id;
      var bb = bboxOf(obj, L);
      drag = { mode: "move", o: obj, sx: p.x, sy: p.y, bx: bb.x, by: bb.y, moved: false, copy: JSON.stringify(obj) };
      draw(); e.preventDefault();
    } else { selId = null; draw(); }
  }
  function onMove(e) {
    if (!drag) return;
    var p = ptr(e), L = layout(doc), o = drag.o, dx = p.x - drag.sx, dy = p.y - drag.sy;
    if (drag.mode === "draw") {
      if (o.t === "path") o.pts.push([p.x, p.y]);
      else if (o.t === "line") { o.x2 = p.x; o.y2 = p.y; if (e.shiftKey) { if (Math.abs(p.x - o.x1) > Math.abs(p.y - o.y1)) o.y2 = o.y1; else o.x2 = o.x1; } }
      else { o.w = p.x - drag.sx; o.h = p.y - drag.sy; }
    } else if (drag.mode === "move") {
      drag.moved = true;
      if (o.t === "comp" || o.t === "fss") setFromSheet(o, drag.bx + dx, drag.by + dy, L, !e.altKey);
      else if (o.t === "line") { var c = JSON.parse(drag.copy); o.x1 = c.x1 + dx; o.y1 = c.y1 + dy; o.x2 = c.x2 + dx; o.y2 = c.y2 + dy; }
      else if (o.t === "path") { var c2 = JSON.parse(drag.copy); o.pts = c2.pts.map(function (q) { return [q[0] + dx, q[1] + dy]; }); }
      else { var c3 = JSON.parse(drag.copy); o.x = c3.x + dx; o.y = c3.y + dy; }
    } else if (drag.mode === "handle") {
      if (o.t === "comp" || o.t === "fss") {
        var v = L.views[o.view], nw = Math.max(0.3, drag.w0 + dx / v.pxft), k = nw / drag.w0;
        o.wft = Math.round(nw * 20) / 20; o.hft = Math.round(drag.h0 * k * 20) / 20;
      } else if (o.t === "line") { if (drag.h === "p1") { o.x1 = p.x; o.y1 = p.y; } else { o.x2 = p.x; o.y2 = p.y; } }
      else { o.w = drag.ow + dx; o.h = drag.oh + dy; }
    }
    draw();
  }
  function onUp() {
    if (!drag) return;
    var d = drag; drag = null;
    if (d.mode === "draw") {
      var o = d.o;
      var tiny = (o.t === "rect" || o.t === "ellipse") ? (Math.abs(o.w) < 6 && Math.abs(o.h) < 6) : o.t === "line" ? (Math.abs(o.x2 - o.x1) + Math.abs(o.y2 - o.y1) < 6) : o.pts && o.pts.length < 2;
      if (tiny) doc.objs.pop();
      if (o.t === "rect" || o.t === "ellipse") { if (o.w < 0) { o.x += o.w; o.w = -o.w; } if (o.h < 0) { o.y += o.h; o.h = -o.h; } }
      tool = "select"; setTool(); commit();
    } else if (d.mode === "move") { if (d.moved) commit(); else draw(); }
    else commit();
  }
  function onDbl(e) {
    var el = e.target.closest ? e.target.closest("[data-oid]") : null; if (!el) return;
    var o = byId(el.getAttribute("data-oid"));
    if (o && o.t === "text") { var n = window.prompt("Texto:", o.text); if (n != null && n !== "") { o.text = n; commit(); } }
  }
  function onKey(e) {
    if (!root || root.closest(".tab-panel") == null || !root.closest(".tab-panel").classList.contains("active")) return;
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    var o = selId ? byId(selId) : null;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { undo(e.shiftKey ? 1 : -1); e.preventDefault(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { undo(1); e.preventDefault(); return; }
    if (!o) return;
    if (e.key === "Delete" || e.key === "Backspace") { delObj(); e.preventDefault(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") { dupObj(); e.preventDefault(); }
    else if (e.key.indexOf("Arrow") === 0) {
      var st = e.shiftKey ? 20 : 4, dx = e.key === "ArrowLeft" ? -st : e.key === "ArrowRight" ? st : 0, dy = e.key === "ArrowUp" ? -st : e.key === "ArrowDown" ? st : 0;
      if (o.t === "comp" || o.t === "fss") { var v = layout(doc).views[o.view]; o.xft += dx / v.pxft; o.bft -= dy / v.pxft; }
      else if (o.t === "line") { o.x1 += dx; o.x2 += dx; o.y1 += dy; o.y2 += dy; }
      else if (o.t === "path") o.pts = o.pts.map(function (q) { return [q[0] + dx, q[1] + dy]; });
      else { o.x += dx; o.y += dy; }
      commit(); e.preventDefault();
    }
  }
  function delObj() { if (!selId) return; doc.objs = doc.objs.filter(function (o) { return o.id !== selId; }); selId = null; commit(); }
  function dupObj() {
    var o = selId && byId(selId); if (!o) return;
    var c = JSON.parse(JSON.stringify(o)); c.id = uid();
    if (c.t === "comp" || c.t === "fss") { c.xft += 0.5; } else if (c.t === "line") { c.x1 += 30; c.x2 += 30; c.y1 += 30; c.y2 += 30; } else if (c.t === "path") { c.pts = c.pts.map(function (q) { return [q[0] + 30, q[1] + 30]; }); } else { c.x += 30; c.y += 30; }
    doc.objs.push(c); selId = c.id; commit();
  }
  function reorder(front) { var o = selId && byId(selId); if (!o) return; doc.objs = doc.objs.filter(function (x) { return x.id !== o.id; }); if (front) doc.objs.push(o); else doc.objs.unshift(o); commit(); }

  // ---------- Guardar / abrir ----------
  function loadAll() { try { return JSON.parse(localStorage.getItem(STORE) || "{}"); } catch (e) { return {}; } }
  function saveNamed() {
    var name = window.prompt("Nombre del blueprint:", doc.ficha.cliente ? (doc.ficha.cliente + " " + base().length + "ft") : ""); if (!name) return;
    var all = loadAll(); all[name] = doc;
    try { localStorage.setItem(STORE, JSON.stringify(all)); } catch (e) { alert("No se pudo guardar en este navegador."); return; }
    refreshSaved(name);
  }
  function refreshSaved(sel) {
    var s = document.getElementById("bpSaved"); if (!s) return;
    var all = loadAll(), names = Object.keys(all).sort();
    s.innerHTML = '<option value="">Guardados…</option>' + names.map(function (n) { return '<option value="' + esc(n) + '"' + (n === sel ? " selected" : "") + ">" + esc(n) + "</option>"; }).join("");
  }
  function exportJson() {
    var blob = new Blob([JSON.stringify(doc)], { type: "application/json" }), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "tryla-blueprint-" + doc.sizeId + "ft.json"; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  // ---------- Exportar ----------
  function fetchB64(url) {
    return fetch(url).then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (buf) {
      if (!buf) return null; var u = new Uint8Array(buf), s = ""; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s);
    }).catch(function () { return null; });
  }
  function exportSvgString() { selId = null; var r = sheetSVG(false); return r; }
  function inlineAssets(svgStr) {
    var hrefs = {}, re = /href="(\.\.\/assets\/[^"]+)"/g, m;
    while ((m = re.exec(svgStr))) hrefs[m[1]] = 1;
    var list = Object.keys(hrefs);
    return Promise.all(list.map(function (h) { return fetchB64(h).then(function (b) { return [h, b]; }); })).then(function (pairs) {
      pairs.forEach(function (p) { if (p[1]) svgStr = svgStr.split('href="' + p[0] + '"').join('href="data:image/png;base64,' + p[1] + '"'); });
      return svgStr;
    });
  }
  function downloadPng() {
    var keep = selId, r = exportSvgString(), svgStr = r.svg;
    Promise.all([inlineAssets(svgStr), fetchB64("../assets/fonts-pdf/Barlow-400.ttf"), fetchB64("../assets/fonts-pdf/Barlow-700.ttf")]).then(function (a) {
      var css = (a[1] ? "@font-face{font-family:Barlow;font-weight:400;src:url(data:font/ttf;base64," + a[1] + ")}" : "") + (a[2] ? "@font-face{font-family:Barlow;font-weight:700;src:url(data:font/ttf;base64," + a[2] + ")}" : "");
      var s = a[0].replace(/(<svg[^>]*>)/, "$1<defs><style>" + css + "</style></defs>");
      var img = new Image();
      img.onload = function () {
        var cv = document.createElement("canvas"); cv.width = W * 1.5; cv.height = r.H * 1.5;
        var ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(img, 0, 0, cv.width, cv.height);
        cv.toBlob(function (blob) { var l = document.createElement("a"); l.href = URL.createObjectURL(blob); l.download = "tryla-blueprint-" + doc.sizeId + "ft.png"; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(l.href); }, 2000); }, "image/png");
      };
      img.onerror = function () { alert("No se pudo generar el PNG. Prueba con Imprimir / PDF."); };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
      selId = keep; draw();
    });
  }
  function printPdf() {
    var w = window.open("", "_blank");
    if (!w) { alert("El navegador bloqueó la ventana. Permite ventanas emergentes para imprimir."); return; }
    var keep = selId, r = exportSvgString();
    var abs = r.svg.replace(/href="(\.\.\/assets\/[^"]+)"/g, function (m, p) { return 'href="' + new URL(p, location.href).href + '"'; });
    var fb = new URL("../assets/fonts-pdf/", location.href).href;
    w.document.write("<!doctype html><html><head><meta charset=utf-8><title>Blueprint Tryla " + esc(doc.sizeId) + " ft</title><style>" +
      "@font-face{font-family:Barlow;font-weight:400;src:url(" + fb + "Barlow-400.ttf)}@font-face{font-family:Barlow;font-weight:700;src:url(" + fb + "Barlow-700.ttf)}" +
      "@page{size:letter portrait;margin:0}html,body{margin:0;background:#fff;width:8.5in;height:10.98in;overflow:hidden}svg{display:block;width:8.5in;height:10.98in}</style></head><body>" + abs + "</body></html>");
    w.document.close(); selId = keep; draw();
    var go = function () { try { w.focus(); w.print(); } catch (e) { /* cerrado */ } };
    var imgs = w.document.images; var pending = 0;
    var svgImgs = w.document.querySelectorAll("image");
    if (!svgImgs.length) { setTimeout(go, 400); return; }
    setTimeout(go, 1800 + svgImgs.length * 20); void imgs; void pending;
  }

  // ---------- Cotización ----------
  function totalRows() {
    var nm = numbering(), rows = nm.items.map(function (o) { return { name: objLabel(o), price: o.price || 0 }; });
    return rows;
  }
  function addToQuote() {
    var api = window.TrylaQuote; if (!api || !api.addLineItem) { alert("El cotizador no está listo."); return; }
    var b = base();
    api.addLineItem("8' x " + b.length + "' Food Trailer - Unidad base", 0, 1);
    totalRows().forEach(function (r) { api.addLineItem(r.name, r.price, 1); });
    if (doc.ficha.cliente && api.setClient) api.setClient(doc.ficha.cliente);
    if (api.switchTab) api.switchTab("quote");
  }

  // ---------- Molde desde cotización (mejor esfuerzo) ----------
  function typeOfLine(d) {
    var n = d.toLowerCase();
    var map = [[/plancha|griddle|flat.?top/, "griddle"], [/charbroil|parrilla|grill/, "grill"], [/freidora|fryer/, "fryer"], [/estufa|range|stove|quemador|burner/, "stove"], [/vapor|bain|warmer|calentador de comida/, "warmer"], [/sandwich|prep/, "prep"], [/congelador|freezer/, "freezer"], [/refrigerador|fridge|refrigerator/, "fridge"], [/fregadero|lavamanos|sink|hand ?wash/, "sink"], [/ventana|window/, "window"], [/campana|hood/, "hood"], [/mesa|table/, "table"], [/incendio|fire sup|fss/, "fss"], [/\btv\b/, "tv"]];
    for (var i = 0; i < map.length; i++) if (map[i][0].test(n)) return map[i][1];
    return null;
  }
  function wantedWidth(d) {
    var m = /(\d+)\s*(?:"|inch|pulg)/i.exec(d); if (m) return parseInt(m[1], 10) / 12;
    m = /(\d+)\s*(?:ft|pies|')/i.exec(d); if (m) return parseInt(m[1], 10);
    return null;
  }
  function pickLib(type, w) {
    var c = LIB.filter(function (l) { return l.type === type; }); if (!c.length) return null;
    c.sort(function (a, b) { return Math.abs(a.w - (w || a.w)) - Math.abs(b.w - (w || b.w)); }); return c[0];
  }
  function fromQuote(items, cliente, folio) {
    var size = null;
    items.forEach(function (it) { var m = /(\d+)\s*'?\s*x\s*(\d+)\s*'?/i.exec(it.desc) || /food trailer\s*(\d+)/i.exec(it.desc); if (m && !size) { var n = parseInt(m[m.length - 1], 10); if (BASES[n]) size = n; } });
    doc = newDoc(size || 16); doc.ficha.cliente = cliente || ""; doc.ficha.folio = folio || "";
    var skipped = [], hoodNeed = 0, hoodX = null;
    items.forEach(function (it) {
      var ty = typeOfLine(it.desc || ""); if (!ty) { if (!/unidad base|trailer/i.test(it.desc || "")) skipped.push(it.desc); return; }
      if (ty === "fss") { var f = addFSS("right"); f.price = it.price || 3700; return; }
      var lib = pickLib(ty, wantedWidth(it.desc)); if (!lib) { skipped.push(it.desc); return; }
      var view = (ty === "fridge" || ty === "freezer" || ty === "sink" || ty === "window" || ty === "tv") ? "left" : "right";
      if (ty === "hood") return;
      var o = addComp(lib.id, view, null, null); o.price = it.price || 0;
      if (view === "right" && ["griddle", "grill", "fryer", "stove"].indexOf(ty) !== -1) { hoodNeed += o.wft; if (hoodX == null) hoodX = o.xft; }
    });
    if (hoodNeed > 0) { var h = pickLib("hood", hoodNeed); if (h) { var ho = addComp(h.id, "right", hoodX, h.bottom); ho.price = 0; } }
    selId = null; hist = []; histI = -1; snapshot(); draw(true); autosave();
    return skipped;
  }

  // ---------- UI ----------
  function setTool() {
    root.querySelectorAll("[data-tool]").forEach(function (b) { b.classList.toggle("active", b.dataset.tool === tool); });
    var s = document.getElementById("bpStage"); if (s) s.style.cursor = tool === "select" ? "default" : "crosshair";
  }
  function renderPalette() {
    var q = (document.getElementById("bpSearch").value || "").toLowerCase(), cat = root.dataset.cat || "";
    var list = LIB.filter(function (l) { return (!cat || l.cat === cat) && (!q || l.label.toLowerCase().indexOf(q) !== -1); });
    var host = document.getElementById("bpItems");
    host.innerHTML = '<button type="button" class="bp-pitem" data-fss="1"><span class="bp-ph" style="color:#C0392B;font-weight:800;font-size:22px">FSS</span><span class="bp-pl">Sistema contra incendios<br><small>1 o 2 palancas · $3,700</small></span></button>' +
      list.map(function (l) {
        return '<button type="button" class="bp-pitem" draggable="true" data-lib="' + esc(l.id) + '"><span class="bp-ph"><img src="' + ASSET + esc(l.file) + '" alt="" loading="lazy"></span><span class="bp-pl">' + esc(l.label) + "<br><small>" + fmtFt(l.w) + " × " + fmtFt(l.h) + "</small></span></button>";
      }).join("");
  }
  function renderSide() {
    var el = document.getElementById("bpProps"); if (!el) return;
    var o = selId ? byId(selId) : null, h = "";
    if (!o) h = '<div class="hint">Selecciona un objeto para editarlo. Teclas: Supr borra, flechas mueven, Ctrl+Z deshace, Ctrl+D duplica. Alt mientras arrastras = sin imán.</div>';
    else {
      h += "<b>" + esc(o.t === "comp" || o.t === "fss" ? objLabel(o) : { rect: "Rectángulo", ellipse: "Elipse", line: o.arrow ? "Flecha" : "Línea", path: "Dibujo", text: "Texto" }[o.t]) + "</b>";
      if (o.t === "comp" || o.t === "fss") {
        h += '<label class="bp-m">Precio<input type="number" step="50" min="0" data-p="price" value="' + esc(o.price || 0) + '"></label>';
        h += '<label class="bp-m">Ancho (pies)<input type="number" step="0.05" min="0.3" data-p="wft" value="' + esc(o.wft) + '"></label><label class="bp-m">Alto (pies)<input type="number" step="0.05" min="0.3" data-p="hft" value="' + esc(o.hft) + '"></label>';
        h += '<label class="bp-m">Altura sobre el piso (pies)<input type="number" step="0.25" data-p="bft" value="' + esc(o.bft) + '"></label>';
        if (o.t === "fss") h += '<label class="bp-m">Palancas de activación (PS)<select data-p="ps"><option value="1"' + (o.ps !== 2 ? " selected" : "") + '>1 palanca</option><option value="2"' + (o.ps === 2 ? " selected" : "") + ">2 palancas (doble)</option></select></label>";
        if (o.t === "comp") h += '<label class="bp-check"><input type="checkbox" data-p="mirror"' + (o.mirror ? " checked" : "") + "> Voltear horizontal</label>";
        h += '<label class="bp-m">Pared<select data-p="view"><option value="right"' + (o.view === "right" ? " selected" : "") + '>Derecha</option><option value="left"' + (o.view === "left" ? " selected" : "") + ">Izquierda</option></select></label>";
      } else if (o.t === "text") {
        h += '<label class="bp-m">Texto<textarea data-p="text" rows="2">' + esc(o.text) + '</textarea></label><label class="bp-m">Tamaño<input type="number" min="12" max="120" data-p="size" value="' + esc(o.size) + '"></label><label class="bp-m">Color<input type="color" data-p="fill" value="' + esc(o.fill) + '"></label>';
      } else {
        h += '<label class="bp-m">Línea<input type="color" data-p="stroke" value="' + esc(o.stroke) + '"></label><label class="bp-m">Grosor<input type="number" min="1" max="30" data-p="sw" value="' + esc(o.sw) + '"></label>';
        if (o.t === "rect" || o.t === "ellipse") h += '<label class="bp-m">Relleno<input type="color" data-p="fill" value="' + (o.fill === "none" ? "#ffffff" : esc(o.fill)) + '"></label><label class="bp-check"><input type="checkbox" data-p="nofill"' + (o.fill === "none" ? " checked" : "") + "> Sin relleno</label>";
        if (o.t !== "path") h += '<label class="bp-check"><input type="checkbox" data-p="dash"' + (o.dash ? " checked" : "") + "> Línea punteada</label>";
      }
      h += '<div class="bp-btnrow"><button type="button" class="btn-small" data-act="dup">Duplicar</button><button type="button" class="btn-small" data-act="front">Al frente</button><button type="button" class="btn-small" data-act="back">Al fondo</button><button type="button" class="btn-small" data-act="del">Borrar</button></div>';
    }
    el.innerHTML = h;
    var nm = numbering(), tot = nm.items.reduce(function (a, x) { return a + (x.price || 0); }, 0);
    var lt = document.getElementById("bpList");
    lt.innerHTML = nm.items.map(function (x, i) { return '<div class="bp-li" data-sel="' + x.id + '"><span class="bp-num">' + (i + 1) + "</span><span>" + esc(objLabel(x)) + '</span><span class="bp-pr">' + (x.price ? money(x.price) : "—") + "</span></div>"; }).join("") +
      '<div class="bp-li bp-tot"><span></span><span>Total equipo</span><span class="bp-pr">' + money(tot) + "</span></div>";
    var b = base();
    var pl = document.getElementById("bpFit"); if (pl) pl.textContent = "Trailer " + b.label + " · pared útil " + fmtFt(b.length - 1);
  }
  function build() {
    root.innerHTML =
      '<div class="bp-top">' +
      '<select id="bpSize" title="Tamaño del trailer">' + Object.keys(BASES).map(function (k) { return '<option value="' + k + '">Trailer ' + BASES[k].label + "</option>"; }).join("") + "</select>" +
      '<span class="bp-sep"></span>' +
      '<button type="button" class="bp-tool" data-tool="select" title="Seleccionar / mover">⬉ Mover</button>' +
      '<button type="button" class="bp-tool" data-tool="pencil" title="Lápiz">✎ Lápiz</button>' +
      '<button type="button" class="bp-tool" data-tool="line" title="Línea (Shift = recta)">╱ Línea</button>' +
      '<button type="button" class="bp-tool" data-tool="arrow" title="Flecha">➜ Flecha</button>' +
      '<button type="button" class="bp-tool" data-tool="rect" title="Cuadro">▭ Cuadro</button>' +
      '<button type="button" class="bp-tool" data-tool="ellipse" title="Elipse">◯ Elipse</button>' +
      '<button type="button" class="bp-tool" data-tool="text" title="Texto">T Texto</button>' +
      '<span class="bp-sep"></span>' +
      '<label class="bp-c" title="Color de línea / texto">Línea <input type="color" id="bpStroke" value="#06038d"></label>' +
      '<label class="bp-c" title="Relleno">Relleno <input type="color" id="bpFill" value="#5b54ff"></label><label class="bp-c"><input type="checkbox" id="bpNoFill" checked> sin</label>' +
      '<label class="bp-c" title="Grosor">Grosor <input type="number" id="bpSw" min="1" max="30" value="4" style="width:54px"></label>' +
      '<label class="bp-c"><input type="checkbox" id="bpDash"> punteada</label>' +
      '<span class="bp-sep"></span>' +
      '<button type="button" class="btn-small" id="bpUndo" title="Deshacer (Ctrl+Z)">↶</button><button type="button" class="btn-small" id="bpRedo" title="Rehacer">↷</button>' +
      "</div>" +
      '<div class="bp-main">' +
      '<aside class="bp-pal"><input type="search" id="bpSearch" placeholder="Buscar componente…">' +
      '<div class="bp-cats" id="bpCats"></div>' +
      '<label class="bp-m">Agregar en<select id="bpTarget"><option value="auto">Pared según el equipo</option><option value="right">Pared derecha</option><option value="left">Pared izquierda</option></select></label>' +
      '<div id="bpItems" class="bp-items"></div></aside>' +
      '<div class="bp-stagewrap"><div id="bpStage"><div id="bpSvgHost"></div></div></div>' +
      '<aside class="bp-side2">' +
      '<div class="bp-card"><div id="bpFit" class="hint"></div><div id="bpProps"></div></div>' +
      '<div class="bp-card"><h3 class="bp-h">Lista y total</h3><div id="bpList"></div><label class="bp-check"><input type="checkbox" id="bpShowPrices"> Mostrar precios en la hoja</label>' +
      '<div class="bp-btnrow"><button type="button" class="btn-small" id="bpAddQuote">Agregar a la cotización</button></div></div>' +
      '<div class="bp-card"><h3 class="bp-h">Hoja</h3><label class="bp-m">Título<input type="text" id="bpTitulo" placeholder="Blueprint · Trailer 16\' x 7\'"></label>' +
      '<div class="bp-ficha" id="bpFicha"></div><label class="bp-m">Notas<textarea id="bpNotas" rows="3"></textarea></label></div>' +
      '<div class="bp-card"><h3 class="bp-h">Guardar y exportar</h3><div class="bp-btnrow"><button type="button" class="btn-small primary" id="bpPrint">Imprimir / PDF</button><button type="button" class="btn-small" id="bpPng">Descargar PNG</button></div>' +
      '<div class="bp-btnrow"><select id="bpSaved"></select><button type="button" class="btn-small" id="bpSave">Guardar</button><button type="button" class="btn-small" id="bpOpen">Abrir</button><button type="button" class="btn-small" id="bpDelSaved">Borrar</button></div>' +
      '<div class="bp-btnrow"><button type="button" class="btn-small" id="bpNew">Hoja nueva</button><button type="button" class="btn-small" id="bpFromQuote">Molde desde la cotización</button><button type="button" class="btn-small" id="bpJson">Exportar .json</button></div></div>' +
      "</aside></div>";
    svgHost = document.getElementById("bpSvgHost");
    var cats = [""].concat(LIB.map(function (l) { return l.cat; }).filter(function (v, i, a) { return a.indexOf(v) === i; }));
    document.getElementById("bpCats").innerHTML = cats.map(function (c) { return '<button type="button" class="bp-cat' + (c === "" ? " active" : "") + '" data-cat="' + esc(c) + '">' + (c || "Todos") + "</button>"; }).join("");
    document.getElementById("bpFicha").innerHTML = FICHA.map(function (f) { return '<label class="bp-m">' + f[1] + '<input type="text" data-f="' + f[0] + '"></label>'; }).join("");
    renderPalette(); refreshSaved(); setTool();
    wire();
  }
  function syncControls() {
    document.getElementById("bpSize").value = doc.sizeId;
    document.getElementById("bpTitulo").value = doc.titulo || "";
    document.getElementById("bpNotas").value = doc.notas || "";
    document.getElementById("bpShowPrices").checked = !!doc.showPrices;
    root.querySelectorAll("[data-f]").forEach(function (i) { i.value = doc.ficha[i.dataset.f] || ""; });
  }
  function wire() {
    root.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) { var li = e.target.closest("[data-sel]"); if (li) { selId = li.dataset.sel; draw(); } return; }
      if (b.dataset.tool) { tool = b.dataset.tool; setTool(); return; }
      if (b.dataset.cat !== undefined && b.classList.contains("bp-cat")) { root.dataset.cat = b.dataset.cat; root.querySelectorAll(".bp-cat").forEach(function (x) { x.classList.toggle("active", x === b); }); renderPalette(); return; }
      if (b.dataset.lib) { addComp(b.dataset.lib); commit(); return; }
      if (b.dataset.fss) { addFSS(); commit(); return; }
      if (b.dataset.act === "del") delObj(); else if (b.dataset.act === "dup") dupObj(); else if (b.dataset.act === "front") reorder(true); else if (b.dataset.act === "back") reorder(false);
    });
    root.addEventListener("dragstart", function (e) { var b = e.target.closest("[data-lib]"); if (b) { e.dataTransfer.setData("text/plain", b.dataset.lib); e.dataTransfer.effectAllowed = "copy"; } });
    var stage = document.getElementById("bpStage");
    stage.addEventListener("dragover", function (e) { e.preventDefault(); });
    stage.addEventListener("drop", function (e) {
      e.preventDefault(); var id = e.dataTransfer.getData("text/plain"), l = libById(id); if (!l) return;
      var p = ptr(e), L = layout(doc), view = viewAt(L, p.y), v = L.views[view];
      var xft = Math.round(((p.x - v.ox) / v.pxft - l.w / 2) * 4) / 4, bft = Math.round(((v.floor - p.y) / v.pxft - l.h / 2) * 4) / 4;
      if (Math.abs(bft) < 0.3 || l.bottom < 0.6) bft = l.bottom < 0.6 ? 0 : bft;
      addComp(id, view, xft, bft); commit();
    });
    stage.addEventListener("pointerdown", onDown); window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp);
    stage.addEventListener("dblclick", onDbl); window.addEventListener("keydown", onKey);
    document.getElementById("bpSearch").addEventListener("input", renderPalette);
    document.getElementById("bpTarget").addEventListener("change", function (e) { selTarget = e.target.value; });
    document.getElementById("bpSize").addEventListener("change", function (e) { doc.sizeId = e.target.value; commit(); });
    document.getElementById("bpTitulo").addEventListener("input", function (e) { doc.titulo = e.target.value; draw(); autosave(); });
    document.getElementById("bpNotas").addEventListener("input", function (e) { doc.notas = e.target.value; draw(); autosave(); });
    document.getElementById("bpShowPrices").addEventListener("change", function (e) { doc.showPrices = e.target.checked; commit(); });
    root.querySelector("#bpFicha").addEventListener("input", function (e) { var k = e.target.dataset.f; if (k) { doc.ficha[k] = e.target.value; draw(); autosave(); } });
    root.addEventListener("input", function (e) {
      var p = e.target.dataset && e.target.dataset.p; if (!p || !selId) return;
      var o = byId(selId); if (!o) return;
      var v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
      if (p === "nofill") { o.fill = v ? "none" : (document.querySelector('[data-p="fill"]') ? document.querySelector('[data-p="fill"]').value : "#5b54ff"); }
      else if (p === "price" || p === "wft" || p === "hft" || p === "bft" || p === "sw" || p === "size") o[p] = parseFloat(v) || 0;
      else if (p === "ps") o.ps = parseInt(v, 10);
      else o[p] = v;
      if (p === "text" || p === "fill" || p === "stroke" || p === "sw" || p === "size" || p === "dash" || p === "mirror" || p === "view" || p === "ps" || p === "wft" || p === "hft" || p === "bft" || p === "price" || p === "nofill") { draw(); autosave(); }
    });
    root.addEventListener("change", function (e) { var p = e.target.dataset && e.target.dataset.p; if (p && selId) { snapshot(); } });
    ["bpStroke", "bpFill", "bpSw", "bpDash", "bpNoFill"].forEach(function (id) {
      document.getElementById(id).addEventListener("input", function () {
        style.stroke = document.getElementById("bpStroke").value; style.sw = parseInt(document.getElementById("bpSw").value, 10) || 4;
        style.dash = document.getElementById("bpDash").checked; style.fill = document.getElementById("bpNoFill").checked ? "none" : document.getElementById("bpFill").value;
        var o = selId && byId(selId); if (o && o.t !== "comp" && o.t !== "fss" && o.t !== "text") { o.stroke = style.stroke; o.sw = style.sw; if ("dash" in o) o.dash = style.dash; if (o.t === "rect" || o.t === "ellipse") o.fill = style.fill; draw(); }
        if (o && o.t === "text") { o.fill = style.stroke; draw(); }
      });
    });
    document.getElementById("bpUndo").addEventListener("click", function () { undo(-1); });
    document.getElementById("bpRedo").addEventListener("click", function () { undo(1); });
    document.getElementById("bpPrint").addEventListener("click", printPdf);
    document.getElementById("bpPng").addEventListener("click", downloadPng);
    document.getElementById("bpJson").addEventListener("click", exportJson);
    document.getElementById("bpAddQuote").addEventListener("click", addToQuote);
    document.getElementById("bpSave").addEventListener("click", saveNamed);
    document.getElementById("bpOpen").addEventListener("click", function () { var n = document.getElementById("bpSaved").value, all = loadAll(); if (n && all[n]) { doc = all[n]; selId = null; hist = []; histI = -1; snapshot(); syncControls(); draw(true); } });
    document.getElementById("bpDelSaved").addEventListener("click", function () { var n = document.getElementById("bpSaved").value; if (!n || !confirm('¿Borrar "' + n + '"?')) return; var all = loadAll(); delete all[n]; try { localStorage.setItem(STORE, JSON.stringify(all)); } catch (e) { /* sin storage */ } refreshSaved(); });
    document.getElementById("bpNew").addEventListener("click", function () { if (doc.objs.length && !confirm("Se descarta la hoja actual (si no la guardaste). ¿Seguir?")) return; doc = newDoc(doc.sizeId); selId = null; hist = []; histI = -1; snapshot(); syncControls(); draw(true); });
    document.getElementById("bpFromQuote").addEventListener("click", function () { api.fromQuoteUI(); });
    var origCommit = commit; void origCommit;
  }

  var api = {
    fromQuoteUI: function () {
      var q = window.TrylaQuote; if (!q || !q.getLineItems) { alert("El cotizador no está listo."); return; }
      var items = q.getLineItems(); if (!items.length) { alert("La cotización no tiene líneas todavía."); return; }
      var meta = q.getMeta ? q.getMeta() : {};
      var skipped = fromQuote(items, meta.cliente, meta.numero); syncControls();
      if (skipped.length) alert("Armé el molde con lo que pude reconocer.\nNo pude ubicar:\n• " + skipped.slice(0, 12).join("\n• ") + "\n\nAgrégalos a mano desde la paleta.");
    },
    open: function () { var el = document.querySelector('.tab-btn[data-tab="blueprints"]'); if (el) el.click(); }
  };
  window.TrylaBlueprints = api;
  api.fromQuote = fromQuote;

  function init() {
    root = document.getElementById("bpRoot"); if (!root || !Object.keys(BASES).length) return;
    var saved = null; try { saved = JSON.parse(localStorage.getItem(STORE + "_current") || "null"); } catch (e) { /* vacío */ }
    doc = saved && saved.objs && BASES[saved.sizeId] ? saved : newDoc(16);
    build(); syncControls(); snapshot(); draw(true);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
