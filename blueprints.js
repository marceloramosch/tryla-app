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
  var STORE = "trylaBlueprints", STORE_KEY = "novaBlueprints";

  var EN_LABEL = {
    t10_table_4ft_21: "Prep table 4' x 21\"", t10_table_5ft_21: "Prep table 5' x 21\"", t10_window_single_5ft: "Service window 5'", t12_table_6ft_21: "Prep table 6' x 21\"",
    t12_display_fridge_r: "Glass-door display fridge", t12_window_5ft: "Service window 5'", t12_fridge_prep_top: "Prep fridge with cutting top", fryer: "Fryer 40 lb",
    grill_2: "Griddle / grill 2 burners", grill_4: "Grill 4 burners", hotplate_a: "Hot plate 2 burners", hotplate_b: "Hot plate 2 burners", table_2ft: "Table 2'",
    outlet_110v: "110V outlet", extinguisher: "Fire extinguisher", sink_ext_r: "Hand sink + extinguisher", rack_ac_r: "Propane rack + A/C", hood: "Exhaust hood 10'",
    freezer_a: "Freezer", window: "Service window", table_6ft: "Table 6'", sink_l: "Hand sink", v1_griddle_3: "Griddle 3'", v1_stove_4: "Stove 4 burners",
    v1_table_kitchen_3ft: "Kitchen table 3'", v1_fridge_ss_sandwich: "Stainless fridge with prep top", v1_hood_8ft: "Exhaust hood 8'", v2_table_4ft_burner: "Table 4' with burner",
    v2_fridge_ss_legs: "Stainless fridge on legs", v2_tv: "TV", v2_outlet_small_a: "Small outlet", v3_table_4ft_30: "Prep table 4' x 30\"", v5_griddle_4ft: "Griddle 4'",
    v5_table_3ft_30: "Prep table 3' x 30\"", v5_warmer_double: "Double food warmer (2 pans)", v5_sandwich_prep_27: "Sandwich prep table 27\"", v5_shelves_wall: "Wall shelves",
    v5_hood_4ft: "Exhaust hood 4'", v5_window_double_5ft_a: "Double service window 5'", v5_window_double_5ft_b: "Double service window 5'", v5_table_3ft_21: "Prep table 3' x 21\"",
    v5_sandwich_prep_27_l: "Sandwich prep table 27\"", v5_table_2ft_21: "Prep table 2' x 21\"", v4_fryer_double: "Double fryer", v4_grill_4k: "Grill 4 burners",
    v4_hotplate_4k: "Hot plate 4 burners", v4_prep_cabinet: "Equipment stand with doors", v4_display_fridge: "Glass-door display fridge", v4_table_5ft_a: "Table 5'",
    v4_window_a: "Service window", v4_window_b: "Service window", v4_hood_10ft: "Exhaust hood 10'", v4_extinguisher: "Fire extinguisher", v4_sink_handwash_r: "Hand sink",
    v4_rack_ac_r: "Propane rack + A/C", v4_sink_l: "Hand sink", v4_rack_ac_l: "Propane rack + A/C", v6_freezer_big: "Large freezer", v6_fridge_prep_top: "Prep fridge with cutting top",
    v6_table_2ft_21_side: "Prep table 2' x 21\"", b_hood_5ft: "Exhaust hood 5'", b_hood_8ft: "Exhaust hood 8'", b_partition_wall: "Partition wall", b_tv_window_32: "TV 32\" window",
    b_window_5ft: "Service window 5'", b_window_4ft: "Service window 4'", b_table_7ft_21: "Prep table 7' x 21\"", b_table_4ft_21: "Prep table 4' x 21\"", b_fridge_tall: "Tall fridge",
    b_hotplate_4: "Hot plate 4 burners", c_mesh_panel_r: "Mesh vent panel", c_oven_racks: "Oven with trays", c_range_6_oven: "Range 6 burners with oven", c_griddle_3: "Griddle 3'",
    c_hood_10ft: "Exhaust hood 10'", c_prep_cabinet: "Equipment stand with doors", c_window_6ft: "Service window 6'", c_table_6ft_21: "Prep table 6' x 21\""
  };
  var EN_CAT = { "Mesas": "Tables", "Ventanas y TV": "Windows & TV", "Refrigeración": "Refrigeration", "Cocina": "Kitchen", "Servicios": "Utilities", "Campana": "Hoods" };
  LIB = LIB.filter(function (l) { return !/^(c_mesh_panel_l|t12_display_fridge_l|v2_outlet_small_b|v4_table_5ft_b|v4_window_b|v4_extinguisher)$/.test(l.id); });
  LIB.forEach(function (l) { if (EN_LABEL[l.id]) l.label = EN_LABEL[l.id]; if (EN_CAT[l.cat]) l.cat = EN_CAT[l.cat]; });

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
  function money(n) { return "$" + Math.round(n || 0).toLocaleString("en-US"); }
  function fmtFt(ft) { var i = Math.round(ft * 12), f = Math.floor(i / 12), r = i - f * 12; return f + "'" + (r ? "-" + r + '"' : ""); }
  function uid() { return "o" + Math.random().toString(36).slice(2, 9); }
  function libById(id) { for (var i = 0; i < LIB.length; i++) if (LIB[i].id === id) return LIB[i]; return null; }

  var FICHA = [
    ["cliente", "Client"], ["folio", "Quote no."], ["oficina", "Office"], ["destino", "Delivery to"], ["modelo", "Model"], ["piso", "Flooring"],
    ["ejes", "Axles"], ["color", "Color"], ["ac", "A/C"], ["louver", "Louver"], ["plomeria", "Plumbing"], ["agua_limpia", "Fresh water tank"],
    ["agua_residual", "Grey water tank"], ["generador", "Generator"], ["ventana", "Windows"], ["ruedas", "Wheels"], ["campana", "Hood"],
    ["bomba", "Water pump"], ["calentador", "Water heater"], ["luz", "Exterior light"], ["observaciones", "Remarks"]
  ];
  var FICHA_SHEET = ["cliente", "folio", "color", "modelo", "ac", "ejes", "ventana", "campana", "agua_limpia", "agua_residual", "generador", "calentador", "observaciones"];

  var doc = null, selId = null, tool = "select", hist = [], histI = -1, cropMode = false;
  var style = { stroke: "#06038D", fill: "none", sw: 4, dash: false, size: 34 };
  var root, svgHost, selTarget = "auto";

  // ---------- Documento ----------
  function newDoc(sizeId) {
    var d = { sizeId: String(sizeId || 16), titulo: "", showPrices: false, ficha: {}, objs: [], notas: "" };
    addDefaults(d);
    return d;
  }
  // Piezas estandar de todo trailer (se pueden quitar): lavamanos, rack de tanques + A/C, mesa 6' y ventana 6'
  function defSpec(key, L) {
    var x6 = 6.4 + (L - 16) * 0.605;
    switch (key) {
      case "sink_r": return L >= 20 ? { lib: "v4_sink_handwash_r", view: "right", x: L - 2.32, label: "Hand sink", grp: "sink" } : { lib: "sink_ext_r", view: "right", x: L - 2.34, label: "Hand sink", grp: "sink" };
      case "sink_l": return { lib: L >= 20 ? "v4_sink_l" : "sink_l", view: "left", x: 0.1, label: "Hand sink", grp: "sink" };
      case "rack_r": return { lib: L >= 20 ? "v4_rack_ac_r" : "rack_ac_r", view: "right", x: L - 0.08, label: "Propane tank rack + A/C unit", grp: "rack" };
      case "rack_l": return { lib: "v4_rack_ac_l", view: "left", x: -1.83, label: "Propane tank rack + A/C unit", grp: "rack" };
      case "table": return { lib: "table_6ft", view: "left", x: x6, label: "Counter table 6'" };
      case "window": return { lib: "window", view: "left", x: x6, label: "Service window 6'" };
    }
    return null;
  }
  var DEF_KEYS = ["sink_r", "sink_l", "rack_r", "rack_l", "table", "window"];
  function addDefaults(d) {
    var b = BASES[d.sizeId] || BASES[16], added = 0;
    DEF_KEYS.forEach(function (k) {
      if (d.objs.some(function (o) { return o.defk === k; })) return;
      var sp = defSpec(k, b.length), l = libById(sp.lib); if (!l) return;
      var o = { id: uid(), t: "comp", lib: l.id, view: sp.view, xft: sp.x, bft: Math.max(0, l.bottom), wft: l.w, hft: l.h, price: 0, label: sp.label, defk: k, def: true };
      if (sp.grp) o.grp = sp.grp;
      d.objs.unshift(o); added++;
    });
    return added;
  }
  function repositionDefaults(d) {
    var b = BASES[d.sizeId] || BASES[16];
    d.objs.forEach(function (o) { if (o.defk) { var sp = defSpec(o.defk, b.length); if (sp) { o.xft = sp.x; o.view = sp.view; } } });
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
    var all = doc.objs.filter(function (o) { return o.t === "comp" || o.t === "fss"; });
    all.sort(function (a, b) { return (a.view === b.view ? 0 : a.view === "right" ? -1 : 1) || a.xft - b.xft; });
    var prim = [], seen = {}, groups = {};
    all.forEach(function (o) {
      if (o.grp) { if (seen[o.grp]) { groups[seen[o.grp]].push(o); return; } seen[o.grp] = o.id; }
      prim.push(o); groups[o.id] = [o];
    });
    var auto = {}; prim.forEach(function (o, i) { auto[o.id] = i + 1; });
    var map = {}, numOf = {};
    prim.forEach(function (o) {
      var ex = groups[o.id].filter(function (m) { return m.num != null && m.num !== ""; })[0];
      numOf[o.id] = ex ? ex.num : auto[o.id];
      groups[o.id].forEach(function (m) { map[m.id] = numOf[o.id]; });
    });
    var items = prim.slice().sort(function (a, b) { var x = String(numOf[a.id]), y = String(numOf[b.id]), nx = parseFloat(x), ny = parseFloat(y); return (isNaN(nx) || isNaN(ny) ? x.localeCompare(y, undefined, { numeric: true }) : nx - ny) || auto[a.id] - auto[b.id]; });
    return { items: items, map: map, groups: groups };
  }
  function syncGroupNums() { var nm = numbering(); nm.items.forEach(function (o) { nm.groups[o.id].forEach(function (m) { if (o.num == null) delete m.num; else m.num = o.num; }); }); }
  // fija numeracion explicita con el orden actual (para poder subir/bajar)
  function freezeNumbers() { var nm = numbering(); nm.items.forEach(function (o, i) { o.num = i + 1; }); syncGroupNums(); }
  function moveNumber(id, dir) {
    freezeNumbers(); var nm = numbering(), i = -1; nm.items.forEach(function (o, k) { if (o.id === id) i = k; });
    var j = i + dir; if (i < 0 || j < 0 || j >= nm.items.length) return;
    var a = nm.items[i], b2 = nm.items[j], tmp = a.num; a.num = b2.num; b2.num = tmp; syncGroupNums(); commit();
  }
  function autoNumber() { doc.objs.forEach(function (o) { delete o.num; }); commit(); }
  function objLabel(o) { if (o.t === "fss") return "Fire suppression system (FSS)" + (o.ps === 2 ? " · 2 pull stations (PS)" : " · 1 pull station (PS)"); return o.label || (libById(o.lib) || {}).label || "Component"; }

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
      var cr = o.crop || {}, cl = cr.l || 0, ct = cr.t || 0, crr = cr.r || 0, cb = cr.b || 0;
      if (cl || ct || crr || cb) {
        var fw = p.w / (1 - cl - crr), fh = p.h / (1 - ct - cb);
        s += '<g data-oid="' + o.id + '"' + tr + '><svg x="' + R(p.x) + '" y="' + R(p.y) + '" width="' + R(p.w) + '" height="' + R(p.h) + '" viewBox="0 0 ' + R(p.w) + " " + R(p.h) + '" overflow="hidden"><image href="' + ASSET + lib.file + '" x="' + R(-cl * fw) + '" y="' + R(-ct * fh) + '" width="' + R(fw) + '" height="' + R(fh) + '" preserveAspectRatio="none"/></svg></g>';
      } else
      s += '<g data-oid="' + o.id + '"' + tr + '><image href="' + ASSET + lib.file + '" x="' + R(p.x) + '" y="' + R(p.y) + '" width="' + R(p.w) + '" height="' + R(p.h) + '" preserveAspectRatio="none"/></g>';
      if (num) s += '<g data-badge="' + o.id + '" style="cursor:move">' + badge(p.x + p.w / 2 + (o.bdx || 0), p.y + p.h + 26 + (o.bdy || 0), num) + "</g>";
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
      if (num) s += '<g data-badge="' + o.id + '" style="cursor:move">' + badge(q.x + q.w / 2 + (o.bdx || 0), q.y + q.h + 26 + (o.bdy || 0), num) + "</g>";
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

  function wallOf(nm, o) {
    var g = nm.groups[o.id] || [o], v = {}; g.forEach(function (m) { v[m.view] = 1; });
    return v.right && v.left ? "Both walls" : (o.view === "right" ? "Right" : "Left");
  }
  function badge(cx, cy, n) {
    return '<circle cx="' + R(cx) + '" cy="' + R(cy) + '" r="15" fill="' + C.navy + '" stroke="#fff" stroke-width="3"/>' + t(cx, cy + 6.5, n, 18, { fill: "#fff", anchor: "middle", bold: true });
  }
  function sheetSVG(withHandles) {
    var L = layout(doc), b = base(doc), nm = numbering();
    var rows = nm.items.length, fichaVals = FICHA_SHEET.filter(function (k) { return doc.ficha[k]; });
    var legendY = L.endY + 10, rowH = 44;
    var needed = legendY + 60 + (rows + 1) * rowH + 70 + Math.ceil(fichaVals.length / 2) * 38 + (doc.notas ? 40 + Math.min(4, wrapText(doc.notas, 96).length) * 30 : 0) + 230;
    var H = Math.max(PAGE_H, needed);
    var s = "", ttl = doc.titulo || ("Food Trailer " + b.label + " · Equipment Layout");
    s += '<rect width="' + W + '" height="' + H + '" fill="#fff"/>';
    // letterhead
    s += '<rect width="' + W + '" height="16" fill="' + C.blue + '"/>';
    s += '<image href="../assets/tryla_logo_full.png" x="' + MARGIN + '" y="48" height="86" width="' + R(86 * 4.1) + '" preserveAspectRatio="xMinYMid meet"/>';
    s += t(W - MARGIN, 82, ttl, 38, { anchor: "end", bold: true });
    var sub = [doc.ficha.cliente ? "Client: " + doc.ficha.cliente : "", doc.ficha.folio ? "Quote " + doc.ficha.folio : "", new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })].filter(Boolean).join("   ·   ");
    s += t(W - MARGIN, 122, sub, 23, { anchor: "end", fill: C.text2 });
    s += '<line x1="' + MARGIN + '" y1="160" x2="' + (W - MARGIN) + '" y2="160" stroke="' + C.border + '" stroke-width="2"/>';
    // views
    var names = { right: "RIGHT WALL · INTERIOR VIEW", left: "LEFT WALL · INTERIOR VIEW" };
    ["right", "left"].forEach(function (v) {
      var vw = L.views[v];
      s += t(MARGIN, vw.y - 22, names[v], 20, { bold: true, fill: C.blue });
      s += '<image href="' + ASSET + vw.file + '" x="' + R(vw.x) + '" y="' + R(vw.y) + '" width="' + R(vw.w) + '" height="' + R(vw.h) + '"/>';
    });
    doc.objs.forEach(function (o) { s += renderObj(o, L, nm.map[o.id]); });
    // equipment list
    var y = legendY;
    s += t(MARGIN, y + 6, "EQUIPMENT LIST", 24, { bold: true });
    y += 24;
    var cNum = MARGIN + 16, cName = MARGIN + 84, cSize = 1040, cLast = W - MARGIN - 8;
    s += '<rect x="' + MARGIN + '" y="' + y + '" width="' + (W - MARGIN * 2) + '" height="' + rowH + '" fill="' + C.light + '"/>' +
      t(cNum, y + 29, "NO.", 17, { bold: true }) + t(cName, y + 29, "COMPONENT", 17, { bold: true }) +
      t(cSize, y + 29, "SIZE (W × H)", 17, { bold: true }) + t(cLast, y + 29, doc.showPrices ? "PRICE" : "WALL", 17, { bold: true, anchor: "end" });
    y += rowH;
    nm.items.forEach(function (o) {
      s += '<line x1="' + MARGIN + '" y1="' + (y + rowH) + '" x2="' + (W - MARGIN) + '" y2="' + (y + rowH) + '" stroke="' + C.border + '" stroke-width="1.5"/>' +
        badge(MARGIN + 30, y + rowH / 2, nm.map[o.id]) +
        t(cName, y + 30, objLabel(o), 21, { fill: C.ink }) + t(cSize, y + 30, fmtFt(o.wft) + " × " + fmtFt(o.hft), 21, { fill: C.text2 }) +
        t(cLast, y + 30, doc.showPrices ? money(o.price) : wallOf(nm, o), 21, { fill: C.ink, anchor: "end" });
      y += rowH;
    });
    if (!rows) { s += t(cName, y + 30, "No equipment yet.", 21, { fill: C.text2 }); y += rowH; }
    if (doc.showPrices && rows) {
      var tot = nm.items.reduce(function (a, o) { return a + (o.price || 0); }, 0);
      s += t(cSize, y + 32, "EQUIPMENT TOTAL", 19, { bold: true }) + t(cLast, y + 32, money(tot), 23, { bold: true, anchor: "end" });
      y += rowH;
    }
    y += 50;
    if (fichaVals.length) {
      s += t(MARGIN, y, "SPECIFICATIONS", 24, { bold: true }); y += 14;
      fichaVals.forEach(function (k, i) {
        var col = i % 2, row = Math.floor(i / 2), lab = FICHA.filter(function (f) { return f[0] === k; })[0][1];
        var fx = MARGIN + col * ((W - MARGIN * 2) / 2);
        s += t(fx, y + 30 + row * 38, lab + ":", 20, { bold: true, fill: C.text2 }) + t(fx + 250, y + 30 + row * 38, String(doc.ficha[k]).slice(0, 40), 20, { fill: C.ink });
      });
      y += Math.ceil(fichaVals.length / 2) * 38 + 36;
    }
    if (doc.notas) {
      s += t(MARGIN, y + 6, "NOTES", 24, { bold: true });
      wrapText(doc.notas, 96).slice(0, 4).forEach(function (ln, i) { s += t(MARGIN, y + 46 + i * 30, ln, 21, { fill: C.ink }); });
    }
    // signatures + footer
    var fy = H - 160;
    s += t(MARGIN, fy - 28, "Reference sketch for sales purposes, not an engineering drawing. Equipment sizes are approximate.", 17, { fill: C.text2 });
    s += '<line x1="' + (W - MARGIN - 760) + '" y1="' + fy + '" x2="' + (W - MARGIN - 400) + '" y2="' + fy + '" stroke="' + C.navy + '" stroke-width="2"/>' + t(W - MARGIN - 580, fy + 26, "CLIENT SIGNATURE", 16, { anchor: "middle", fill: C.text2 });
    s += '<line x1="' + (W - MARGIN - 340) + '" y1="' + fy + '" x2="' + (W - MARGIN) + '" y2="' + fy + '" stroke="' + C.navy + '" stroke-width="2"/>' + t(W - MARGIN - 170, fy + 26, "TRYLA REPRESENTATIVE", 16, { anchor: "middle", fill: C.text2 });
    s += '<rect y="' + (H - 78) + '" width="' + W + '" height="78" fill="' + C.navy + '"/>' +
      t(MARGIN, H - 32, "Marcelo Ramos Schiaffino · +1 (645) 235-3186 · marcelo.ramos@thetryla.com", 24, { fill: "#fff", bold: true }) +
      t(W - MARGIN, H - 32, "1111 Ellenwood St, Dallas, TX 75217", 22, { fill: C.border, anchor: "end" });
    if (withHandles && selId) {
      var so = byId(selId);
      if (so) {
        var bb = bboxOf(so, L);
        s += '<rect class="bp-sel" x="' + R(bb.x - 6) + '" y="' + R(bb.y - 6) + '" width="' + R(bb.w + 12) + '" height="' + R(bb.h + 12) + '" fill="none" stroke="#1A73E8" stroke-width="2.5" stroke-dasharray="8 5" pointer-events="none"/>';
        if (cropMode && so.t === "comp") {
          var lb = libById(so.lib), cc = so.crop || {}, ccl = cc.l || 0, cct = cc.t || 0, ccr = cc.r || 0, ccb = cc.b || 0;
          if (lb) {
            var gw = bb.w / (1 - ccl - ccr), gh = bb.h / (1 - cct - ccb), gx = so.mirror ? bb.x - ccr * gw : bb.x - ccl * gw, gy = bb.y - cct * gh;
            if (so.mirror) gx = bb.x - ccr * gw;
            s += '<image href="' + ASSET + lb.file + '" x="' + R(gx) + '" y="' + R(gy) + '" width="' + R(gw) + '" height="' + R(gh) + '" preserveAspectRatio="none" opacity="0.22" pointer-events="none"' + (so.mirror ? ' transform="translate(' + R(gx * 2 + gw) + ',0) scale(-1,1)"' : "") + "/>";
          }
          var hs = 22, mx = bb.x + bb.w / 2 - hs / 2, my = bb.y + bb.h / 2 - hs / 2;
          [["cl", bb.x - hs / 2, my], ["cr", bb.x + bb.w - hs / 2, my], ["ct", mx, bb.y - hs / 2], ["cb", mx, bb.y + bb.h - hs / 2]].forEach(function (h) {
            s += '<rect class="bp-h" data-h="' + h[0] + '" x="' + R(h[1]) + '" y="' + R(h[2]) + '" width="' + hs + '" height="' + hs + '" rx="5" fill="#FF8A00" stroke="#fff" stroke-width="3" style="cursor:' + (h[0] === "cl" || h[0] === "cr" ? "ew-resize" : "ns-resize") + '"/>';
          });
          s += t(bb.x, bb.y - 24, "CROP: drag the orange handles · click outside to finish", 17, { fill: "#FF8A00", bold: true });
        } else if (so.t === "line") {
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
    doc.objs.forEach(function (o) { if ((o.t === "comp" || o.t === "fss") && !o.def && o.view === view && o.bft < 0.6) m = Math.max(m, o.xft + o.wft); });
    return m;
  }
  function clampX(x, w) { var L = base().length; return Math.max(0, Math.min(x, L - w)); }
  function addComp(libId, view, xft, bft) {
    var l = libById(libId); if (!l) return null;
    view = view || (selTarget !== "auto" ? selTarget : l.view);
    var floorItem = l.bottom < 0.6;
    var o = { id: uid(), t: "comp", lib: l.id, view: view, xft: xft != null ? xft : clampX(floorItem ? nextX(view) : 0.5 + (doc.objs.length % 5), l.w), bft: bft != null ? bft : (floorItem ? 0 : l.bottom), wft: l.w, hft: l.h, price: l.price || 0, label: l.label };
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
    // libre: se puede soltar en cualquier parte de la hoja (dentro o fuera del trailer)
    x = Math.max(0, Math.min(x, W - (o.wft || 0) * v.pxft)); y = Math.max(0, Math.min(y, PAGE_H - (o.hft || 0) * v.pxft));
    var xft = Math.round(((x - v.ox) / v.pxft) / q) * q;
    var bft = ((v.floor - y) / v.pxft) - o.hft;
    bft = Math.round(bft / q) * q;
    if (snapOn && Math.abs(bft) < 0.3) bft = 0;
    o.view = view; o.xft = xft; o.bft = bft;
  }
  var drag = null;
  function onDown(e) {
    var svg = document.getElementById("bpSvg"); if (!svg || !svg.contains(e.target)) return;
    if (e.button !== 0) return;
    var p = ptr(e), L = layout(doc);
    if (tool !== "select") {
      var o;
      if (tool === "text") {
        var txt = window.prompt("Text:", ""); if (!txt) return;
        doc.objs.push({ id: uid(), t: "text", x: p.x, y: p.y, text: txt, size: style.size, fill: style.stroke, bold: true });
        selId = doc.objs[doc.objs.length - 1].id; tool = "select"; setTool(); commit(); return;
      }
      if (tool === "pencil") o = { id: uid(), t: "path", pts: [[p.x, p.y]], stroke: style.stroke, sw: style.sw };
      else if (tool === "line" || tool === "arrow") o = { id: uid(), t: "line", x1: p.x, y1: p.y, x2: p.x, y2: p.y, stroke: style.stroke, sw: style.sw, dash: style.dash, arrow: tool === "arrow" };
      else o = { id: uid(), t: tool, x: p.x, y: p.y, w: 0, h: 0, stroke: style.stroke, fill: style.fill, sw: style.sw, dash: style.dash };
      doc.objs.push(o); selId = o.id; drag = { mode: "draw", o: o, sx: p.x, sy: p.y }; e.preventDefault(); return;
    }
    var bdg = e.target.closest ? e.target.closest("[data-badge]") : null;
    if (bdg) { var bo = byId(bdg.getAttribute("data-badge")); if (bo) { selId = bo.id; drag = { mode: "badge", o: bo, sx: p.x, sy: p.y, x0: bo.bdx || 0, y0: bo.bdy || 0, moved: false }; draw(); e.preventDefault(); return; } }
    var h = e.target.getAttribute && e.target.getAttribute("data-h");
    if (!h && cropMode) cropMode = false;
    var oidEl = e.target.closest ? e.target.closest("[data-oid]") : null;
    if (h && selId) { var so = byId(selId); var c0 = null; if (so.t === "comp") { var cc0 = so.crop || {}; c0 = { l: cc0.l || 0, t: cc0.t || 0, r: cc0.r || 0, b: cc0.b || 0, w: so.wft, h: so.hft, x: so.xft, bb: so.bft }; } drag = { mode: "handle", h: h, o: so, sx: p.x, sy: p.y, w0: so.wft, h0: so.hft, ow: so.w, oh: so.h, c0: c0 }; e.preventDefault(); return; }
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
    } else if (drag.mode === "badge") {
      drag.moved = true; o.bdx = Math.round(drag.x0 + dx); o.bdy = Math.round(drag.y0 + dy);
    } else if (drag.mode === "move") {
      drag.moved = true;
      if (o.t === "comp" || o.t === "fss") setFromSheet(o, drag.bx + dx, drag.by + dy, L, !e.altKey);
      else if (o.t === "line") { var c = JSON.parse(drag.copy); o.x1 = c.x1 + dx; o.y1 = c.y1 + dy; o.x2 = c.x2 + dx; o.y2 = c.y2 + dy; }
      else if (o.t === "path") { var c2 = JSON.parse(drag.copy); o.pts = c2.pts.map(function (q) { return [q[0] + dx, q[1] + dy]; }); }
      else { var c3 = JSON.parse(drag.copy); o.x = c3.x + dx; o.y = c3.y + dy; }
    } else if (drag.mode === "handle") {
      if (/^c[lrtb]$/.test(drag.h) && drag.c0) {
        var v0 = L.views[o.view], c0 = drag.c0, dxf = dx / v0.pxft, dyf = dy / v0.pxft, Wf = c0.w / (1 - c0.l - c0.r), Hf = c0.h / (1 - c0.t - c0.b), MIN = 0.06;
        var cro = { l: c0.l, t: c0.t, r: c0.r, b: c0.b };
        function fld(side) { return o.mirror ? (side === "l" ? "r" : "l") : side; }
        if (drag.h === "cl") { var f = fld("l"), oth = fld("r"), nv = Math.max(0, Math.min(1 - cro[oth] - MIN, c0[f] + dxf / Wf)); cro[f] = nv; o.wft = Wf * (1 - nv - cro[oth]); o.xft = c0.x + (nv - c0[f]) * Wf; }
        else if (drag.h === "cr") { var f2 = fld("r"), oth2 = fld("l"), nv2 = Math.max(0, Math.min(1 - cro[oth2] - MIN, c0[f2] - dxf / Wf)); cro[f2] = nv2; o.wft = Wf * (1 - nv2 - cro[oth2]); }
        else if (drag.h === "ct") { var nt = Math.max(0, Math.min(1 - c0.b - MIN, c0.t + dyf / Hf)); cro.t = nt; o.hft = Hf * (1 - nt - c0.b); }
        else { var nb = Math.max(0, Math.min(1 - c0.t - MIN, c0.b - dyf / Hf)); cro.b = nb; o.hft = Hf * (1 - c0.t - nb); o.bft = c0.bb + (nb - c0.b) * Hf; }
        o.crop = cro; o.wft = Math.round(o.wft * 100) / 100; o.hft = Math.round(o.hft * 100) / 100;
      } else if (o.t === "comp" || o.t === "fss") {
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
    } else if (d.mode === "move" || d.mode === "badge") { if (d.moved) commit(); else draw(); }
    else commit();
  }
  function onDbl(e) {
    var el = e.target.closest ? e.target.closest("[data-oid]") : null; if (!el) return;
    var o = byId(el.getAttribute("data-oid"));
    if (o && o.t === "text") { var n = window.prompt("Text:", o.text); if (n != null && n !== "") { o.text = n; commit(); } }
  }
  function onKey(e) {
    if (!root || root.closest(".tab-panel") == null || !root.closest(".tab-panel").classList.contains("active")) return;
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    var o = selId ? byId(selId) : null;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { undo(e.shiftKey ? 1 : -1); e.preventDefault(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { undo(1); e.preventDefault(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") { if (copyObj()) e.preventDefault(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "x") { if (o) { cutObj(); e.preventDefault(); } return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") { if (clip) { pasteObj(null); e.preventDefault(); } return; }
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
    var c = JSON.parse(JSON.stringify(o)); c.id = uid(); delete c.def; delete c.defk; delete c.grp; delete c.num;
    if (c.t === "comp" || c.t === "fss") { c.xft += 0.5; } else if (c.t === "line") { c.x1 += 30; c.x2 += 30; c.y1 += 30; c.y2 += 30; } else if (c.t === "path") { c.pts = c.pts.map(function (q) { return [q[0] + 30, q[1] + 30]; }); } else { c.x += 30; c.y += 30; }
    doc.objs.push(c); selId = c.id; commit();
  }
  function reorder(front) { var o = selId && byId(selId); if (!o) return; doc.objs = doc.objs.filter(function (x) { return x.id !== o.id; }); if (front) doc.objs.push(o); else doc.objs.unshift(o); commit(); }

  function startCrop(o) { if (!o || o.t !== "comp") return; selId = o.id; cropMode = true; draw(); }
  function hasCrop(o) { var c = o && o.crop; return !!(c && (c.l || c.t || c.r || c.b)); }
  function resetCrop(o) {
    if (!hasCrop(o)) return; var c = o.crop, Wf = o.wft / (1 - (c.l || 0) - (c.r || 0)), Hf = o.hft / (1 - (c.t || 0) - (c.b || 0));
    var visLeft = o.mirror ? (c.r || 0) : (c.l || 0);
    o.xft -= visLeft * Wf; o.bft -= (c.b || 0) * Hf; o.wft = Math.round(Wf * 100) / 100; o.hft = Math.round(Hf * 100) / 100; delete o.crop; cropMode = false; commit();
  }
  // ---------- Portapapeles y menú de clic derecho ----------
  var clip = null, menuEl = null;
  function copyObj() { var o = selId && byId(selId); if (!o) return false; clip = JSON.parse(JSON.stringify(o)); return true; }
  function cutObj() { if (copyObj()) delObj(); }
  function pasteObj(at) {
    if (!clip) return;
    var c = JSON.parse(JSON.stringify(clip)); c.id = uid(); delete c.num; delete c.bdx; delete c.bdy; delete c.def; delete c.defk; delete c.grp;
    doc.objs.push(c);
    var L = layout(doc), bb = bboxOf(c, L);
    if (at) {
      if (c.t === "comp" || c.t === "fss") setFromSheet(c, at.x - bb.w / 2, at.y - bb.h / 2, L, true);
      else shiftObj(c, at.x - bb.w / 2 - bb.x, at.y - bb.h / 2 - bb.y);
    } else if (c.t === "comp" || c.t === "fss") c.xft += 0.5; else shiftObj(c, 30, 30);
    selId = c.id; commit();
  }
  function shiftObj(o, dx, dy) {
    if (o.t === "line") { o.x1 += dx; o.x2 += dx; o.y1 += dy; o.y2 += dy; }
    else if (o.t === "path") o.pts = o.pts.map(function (q) { return [q[0] + dx, q[1] + dy]; });
    else { o.x += dx; o.y += dy; }
  }
  function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; } }
  function showMenu(e) {
    closeMenu();
    var p = ptr(e), el = e.target.closest ? e.target.closest("[data-oid],[data-badge]") : null, o = null;
    if (el) { o = byId(el.getAttribute("data-oid") || el.getAttribute("data-badge")); }
    if (o) { selId = o.id; draw(); } else { selId = null; draw(); }
    var items = [];
    if (o) {
      var isEq = o.t === "comp" || o.t === "fss";
      items.push(["Cut", "Ctrl+X", function () { cutObj(); }], ["Copy", "Ctrl+C", function () { copyObj(); }]);
      items.push(["Paste here", "Ctrl+V", function () { pasteObj(p); }, !clip]);
      items.push(["Duplicate", "Ctrl+D", dupObj], ["Delete", "Del", delObj], "-");
      items.push(["Bring to front", "", function () { reorder(true); }], ["Send to back", "", function () { reorder(false); }]);
      if (isEq) {
        items.push("-");
        if (o.t === "comp") items.push(["✂ Crop (show only part)…", "", function () { startCrop(o); }], ["Reset crop", "", function () { resetCrop(o); }, !hasCrop(o)], ["Flip horizontally", "", function () { o.mirror = !o.mirror; commit(); }]);
        if (o.t === "fss") items.push([o.ps === 2 ? "Use 1 pull station" : "Use 2 pull stations (PS)", "", function () { o.ps = o.ps === 2 ? 1 : 2; commit(); }]);
        items.push(["Edit label…", "", function () { var v = window.prompt("Label shown in the list:", objLabel(o)); if (v != null && v !== "") { o.label = v; commit(); } }, o.t === "fss"]);
        items.push(["Set number…", "", function () { var v = window.prompt("Number on the sheet (empty = automatic):", numbering().map[o.id]); if (v == null) return; v = String(v).trim(); if (v === "") delete o.num; else o.num = /^\d+$/.test(v) ? parseInt(v, 10) : v.slice(0, 4); if (o.grp) doc.objs.forEach(function (m) { if (m.grp === o.grp) { if (o.num == null) delete m.num; else m.num = o.num; } }); commit(); }]);
        items.push(["Edit price…", "", function () { var v = window.prompt("Price:", o.price || 0); if (v == null) return; o.price = parseFloat(v) || 0; commit(); }]);
        items.push(["Edit size (ft)…", "", function () { var v = window.prompt("Width x height in feet (e.g. 4.5 x 3):", o.wft + " x " + o.hft); if (!v) return; var m = /([\d.]+)\s*[x×]\s*([\d.]+)/i.exec(v); if (m) { o.wft = parseFloat(m[1]); o.hft = parseFloat(m[2]); commit(); } }]);
        items.push(["Move number badge back", "", function () { delete o.bdx; delete o.bdy; commit(); }, o.bdx == null && o.bdy == null]);
        items.push(["Move to " + (o.view === "right" ? "left" : "right") + " wall", "", function () { o.view = o.view === "right" ? "left" : "right"; commit(); }]);
      } else if (o.t === "text") {
        items.push("-", ["Edit text…", "", function () { var n = window.prompt("Text:", o.text); if (n != null && n !== "") { o.text = n; commit(); } }]);
        items.push(["Bigger", "", function () { o.size = Math.round(o.size * 1.15); commit(); }], ["Smaller", "", function () { o.size = Math.max(10, Math.round(o.size / 1.15)); commit(); }]);
        items.push(["Bold on/off", "", function () { o.bold = !o.bold; commit(); }]);
      } else {
        items.push("-");
        if ("dash" in o || o.t === "line" || o.t === "rect" || o.t === "ellipse") items.push([o.dash ? "Solid line" : "Dashed line", "", function () { o.dash = !o.dash; commit(); }]);
        items.push(["Thicker", "", function () { o.sw = Math.min(30, o.sw + 2); commit(); }], ["Thinner", "", function () { o.sw = Math.max(1, o.sw - 2); commit(); }]);
        items.push(["Use current line color", "", function () { o.stroke = style.stroke; commit(); }]);
        if (o.t === "rect" || o.t === "ellipse") items.push(["Use current fill", "", function () { o.fill = style.fill; commit(); }], ["No fill", "", function () { o.fill = "none"; commit(); }]);
        if (o.t === "line") items.push(["Arrow head on/off", "", function () { o.arrow = !o.arrow; commit(); }]);
      }
    } else {
      items.push(["Paste here", "Ctrl+V", function () { pasteObj(p); }, !clip], ["Undo", "Ctrl+Z", function () { undo(-1); }], ["Redo", "", function () { undo(1); }]);
    }
    menuEl = document.createElement("div"); menuEl.className = "bp-ctx";
    items.forEach(function (it) {
      if (it === "-") { var hr = document.createElement("div"); hr.className = "bp-ctx-sep"; menuEl.appendChild(hr); return; }
      var b = document.createElement("button"); b.type = "button"; b.disabled = !!it[3];
      b.innerHTML = "<span>" + esc(it[0]) + "</span><kbd>" + esc(it[1]) + "</kbd>";
      b.addEventListener("click", function (ev) { ev.stopPropagation(); closeMenu(); it[2](); });
      menuEl.appendChild(b);
    });
    document.body.appendChild(menuEl);
    var w = menuEl.offsetWidth, h = menuEl.offsetHeight;
    menuEl.style.left = Math.max(4, Math.min(e.clientX, window.innerWidth - w - 4)) + "px";
    menuEl.style.top = Math.max(4, Math.min(e.clientY, window.innerHeight - h - 4)) + "px";
  }
  (function () {
    var st = document.createElement("style");
    st.textContent = ".bp-ctx{position:fixed;z-index:99999;min-width:220px;background:#fff;color:#1B1D2A;border:1px solid #D6D3FF;border-radius:10px;box-shadow:0 8px 28px rgba(6,3,141,.25);padding:6px;font:13px Barlow,Arial,sans-serif}" +
      ".bp-ctx button{display:flex;justify-content:space-between;gap:18px;width:100%;border:0;background:none;padding:7px 10px;border-radius:6px;cursor:pointer;text-align:left;color:inherit;font:inherit}" +
      ".bp-ctx button:hover:not(:disabled){background:#F1F0FF}.bp-ctx button:disabled{opacity:.4;cursor:default}.bp-ctx kbd{color:#7c8aa6;font:11px monospace}" +
      ".bp-ctx-sep{height:1px;background:#EEEDFF;margin:5px 4px}";
    document.head.appendChild(st);
    document.addEventListener("click", closeMenu); window.addEventListener("scroll", closeMenu, true); window.addEventListener("resize", closeMenu);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeMenu(); if (cropMode) { cropMode = false; draw(); } } });
  })();

  // ---------- Guardar / abrir ----------
  function loadAll() {
    try { var cur = JSON.parse(localStorage.getItem(STORE_KEY) || "null"); if (cur && typeof cur === "object") return cur; } catch (e) { /* vacío */ }
    var out = {}, old = {};
    try { old = JSON.parse(localStorage.getItem(STORE) || "{}"); } catch (e) { /* vacío */ }
    Object.keys(old).forEach(function (n) { var d = old[n]; if (!d || !d.objs) return; d.bid = d.bid || uid(); d.updated = d.updated || Date.now(); d.ficha = d.ficha || {}; if (!d.ficha.cliente) d.ficha.cliente = n; out[d.bid] = d; });
    return out;
  }
  function persistAll(all) {
    var v = JSON.stringify(all);
    try { localStorage.setItem(STORE_KEY, v); } catch (e) { alert("Could not save in this browser."); return false; }
    if (window.NovaCloud && window.NovaCloud.enabled && window.NovaCloud.push) { try { window.NovaCloud.push(STORE_KEY, v); } catch (e) { /* offline */ } }
    return true;
  }
  function saveCurrent(silent) {
    var cl = String(doc.ficha.cliente || "").trim();
    if (!cl) { cl = window.prompt("Client name for this blueprint:", ""); if (!cl || !cl.trim()) return false; doc.ficha.cliente = cl.trim(); syncControls(); }
    doc.bid = doc.bid || uid(); doc.updated = Date.now();
    var all = loadAll(); all[doc.bid] = JSON.parse(JSON.stringify(doc));
    if (!persistAll(all)) return false;
    autosave(); updateListBadge();
    if (!silent) { var b = document.getElementById("bpSave"); if (b) { var t0 = b.textContent; b.textContent = "Saved ✓"; setTimeout(function () { b.textContent = t0; }, 1400); } }
    return true;
  }
  function matchesDoc(d, name, nums) {
    var n = String(name || "").trim().toLowerCase(), c = String((d.ficha && d.ficha.cliente) || "").trim().toLowerCase(), f = String((d.ficha && d.ficha.folio) || "").trim().toLowerCase();
    if (n && c && n === c) return true;
    return !!(f && (nums || []).some(function (x) { return String(x || "").trim().toLowerCase() === f; }));
  }
  function docsFor(name, nums) { var all = loadAll(); return Object.keys(all).map(function (k) { return all[k]; }).filter(function (d) { return matchesDoc(d, name, nums); }); }
  function fmtDate(ts) { try { return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); } catch (e) { return ""; } }
  function fileBase(d) { return String((d.ficha && d.ficha.cliente) || "blueprint").trim().replace(/[^\w\- ]+/g, "").replace(/\s+/g, "-") || "blueprint"; }
  var listFilter = "";
  function updateListBadge() { var b = root && root.querySelector('[data-bpview="list"]'); if (b) b.textContent = "My blueprints (" + Object.keys(loadAll()).length + ")"; }
  function showView(v) {
    var ed = document.getElementById("bpEditor"), li = document.getElementById("bpListView"); if (!ed || !li) return;
    ed.style.display = v === "list" ? "none" : ""; li.style.display = v === "list" ? "" : "none";
    root.querySelectorAll("[data-bpview]").forEach(function (b) { b.classList.toggle("active", b.dataset.bpview === v); });
    if (v === "list") renderList(); else draw(true);
  }
  function renderList() {
    var host = document.getElementById("bpListView"); if (!host) return;
    var all = loadAll(), arr = Object.keys(all).map(function (k) { return all[k]; });
    var q = listFilter.trim().toLowerCase();
    if (q) arr = arr.filter(function (d) { return (String(d.ficha.cliente || "") + " " + String(d.ficha.folio || "") + " " + d.sizeId).toLowerCase().indexOf(q) !== -1; });
    arr.sort(function (a, b) { return (b.updated || 0) - (a.updated || 0); });
    host.innerHTML = '<div class="bp-listtop"><input type="search" id="bpListSearch" placeholder="Search by client, quote or size…" value="' + esc(listFilter) + '"><span class="hint">' + arr.length + " blueprint" + (arr.length === 1 ? "" : "s") + "</span></div>" +
      (arr.length ? '<div class="table-scroll"><table class="crm"><thead><tr><th>Client</th><th>Trailer</th><th>Linked quote</th><th>Equipment</th><th>Last edited</th><th></th></tr></thead><tbody>' +
      arr.map(function (d) {
        var n = d.objs.filter(function (o) { return o.t === "comp" || o.t === "fss"; }).length, sz = (BASES[d.sizeId] || {}).label || d.sizeId + " ft";
        return '<tr data-bid="' + esc(d.bid) + '"><td><b>' + esc(d.ficha.cliente || "—") + "</b></td><td>" + esc(sz) + "</td><td>" + (d.ficha.folio ? "Quote " + esc(d.ficha.folio) : '<span class="hint">not linked</span>') + "</td><td>" + n + "</td><td>" + esc(fmtDate(d.updated)) + "</td>" +
          '<td class="actions-cell"><button type="button" class="btn-small primary" data-la="open">Open</button><button type="button" class="btn-small" data-la="pdf">PDF</button><button type="button" class="btn-small" data-la="png">PNG</button><button type="button" class="btn-small" data-la="del">Delete</button></td></tr>';
      }).join("") + "</tbody></table></div>" : '<div class="bp-empty">No blueprints saved yet. Build one in the editor and press Save.</div>');
    var si = document.getElementById("bpListSearch"); if (si) si.addEventListener("input", function () { listFilter = si.value; var pos = si.selectionStart; renderList(); var n = document.getElementById("bpListSearch"); if (n) { n.focus(); n.setSelectionRange(pos, pos); } });
    host.querySelectorAll("[data-la]").forEach(function (b) {
      b.addEventListener("click", function () {
        var bid = b.closest("tr").dataset.bid, all2 = loadAll(), d = all2[bid]; if (!d) return;
        if (b.dataset.la === "open") { doc = JSON.parse(JSON.stringify(d)); selId = null; cropMode = false; hist = []; histI = -1; snapshot(); syncControls(); showView("editor"); autosave(); }
        else if (b.dataset.la === "pdf") downloadPdf(d);
        else if (b.dataset.la === "png") downloadPng(d);
        else if (b.dataset.la === "del") { if (!confirm('Delete the blueprint for "' + (d.ficha.cliente || "this client") + '"?')) return; delete all2[bid]; persistAll(all2); if (doc.bid === bid) delete doc.bid; renderList(); updateListBadge(); }
      });
    });
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
  function withDoc(d, fn) {
    var sd = doc, ss = selId, sc = cropMode; doc = d; selId = null; cropMode = false;
    try { return fn(); } finally { doc = sd; selId = ss; cropMode = sc; }
  }
  function buildCanvas(d, scale) {
    var r = withDoc(d, function () { return sheetSVG(false); });
    return Promise.all([inlineAssets(r.svg), fetchB64("../assets/fonts-pdf/Barlow-400.ttf"), fetchB64("../assets/fonts-pdf/Barlow-700.ttf")]).then(function (a) {
      var css = (a[1] ? "@font-face{font-family:Barlow;font-weight:400;src:url(data:font/ttf;base64," + a[1] + ")}" : "") + (a[2] ? "@font-face{font-family:Barlow;font-weight:700;src:url(data:font/ttf;base64," + a[2] + ")}" : "");
      var sv = a[0].replace(/(<svg[^>]*>)/, "$1<defs><style>" + css + "</style></defs>");
      return new Promise(function (res, rej) {
        var img = new Image();
        img.onload = function () {
          var cv = document.createElement("canvas"); cv.width = Math.round(W * scale); cv.height = Math.round(r.H * scale);
          var ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(img, 0, 0, cv.width, cv.height);
          res(cv);
        };
        img.onerror = function () { rej(new Error("render")); };
        img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(sv);
      });
    });
  }
  function saveBlob(blob, name) {
    var l = document.createElement("a"); l.href = URL.createObjectURL(blob); l.download = name; document.body.appendChild(l); l.click(); l.remove();
    setTimeout(function () { URL.revokeObjectURL(l.href); }, 4000);
  }
  function downloadPng(d) {
    d = d && d.objs ? d : doc;
    buildCanvas(d, 1.5).then(function (cv) { cv.toBlob(function (blob) { saveBlob(blob, fileBase(d) + "-blueprint-" + d.sizeId + "ft.png"); }, "image/png"); })
      .catch(function () { alert("Could not generate the PNG."); });
    draw();
  }
  function makePdf(jpg, pw, ph) {
    var enc = new TextEncoder(), parts = [], offs = [], len = 0, Wpt = 612, Hpt = Math.round(612 * ph / pw * 100) / 100;
    function push(x) { var b = typeof x === "string" ? enc.encode(x) : x; parts.push(b); len += b.length; }
    push("%PDF-1.4\n");
    offs[1] = len; push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
    offs[2] = len; push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
    offs[3] = len; push("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + Wpt + " " + Hpt + "] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n");
    offs[4] = len; push("4 0 obj\n<< /Type /XObject /Subtype /Image /Width " + pw + " /Height " + ph + " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + jpg.length + " >>\nstream\n"); push(jpg); push("\nendstream\nendobj\n");
    var cs = "q " + Wpt + " 0 0 " + Hpt + " 0 0 cm /Im0 Do Q";
    offs[5] = len; push("5 0 obj\n<< /Length " + cs.length + " >>\nstream\n" + cs + "\nendstream\nendobj\n");
    var xr = len, x = "xref\n0 6\n0000000000 65535 f \n";
    for (var i = 1; i <= 5; i++) x += ("0000000000" + offs[i]).slice(-10) + " 00000 n \n";
    push(x + "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + xr + "\n%%EOF");
    var out = new Uint8Array(len), pos = 0; parts.forEach(function (b) { out.set(b, pos); pos += b.length; });
    return out;
  }
  function downloadPdf(d) {
    d = d && d.objs ? d : doc;
    buildCanvas(d, 2).then(function (cv) {
      var b64 = cv.toDataURL("image/jpeg", 0.92).split(",")[1], bin = atob(b64), u = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      saveBlob(new Blob([makePdf(u, cv.width, cv.height)], { type: "application/pdf" }), fileBase(d) + "-blueprint-" + d.sizeId + "ft.pdf");
    }).catch(function () { alert("Could not generate the PDF."); });
    draw();
  }
  function printPdf() {
    var w = window.open("", "_blank");
    if (!w) { alert("The browser blocked the window. Allow pop-ups to print."); return; }
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
    var nm = numbering(), rows = nm.items.filter(function (o) { return !(o.def && !o.price); }).map(function (o) { return { name: objLabel(o), price: o.price || 0 }; });
    return rows;
  }
  function addToQuote() {
    var api = window.TrylaQuote; if (!api || !api.addLineItem) { alert("The quote builder is not ready."); return; }
    var b = base();
    api.addLineItem("8' x " + b.length + "' Food Trailer - Base unit", 0, 1);
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
  function fromQuote(items, cliente, folio, quoteId) {
    var size = null;
    items.forEach(function (it) { var m = /(\d+)\s*'?\s*x\s*(\d+)\s*'?/i.exec(it.desc) || /food trailer\s*(\d+)/i.exec(it.desc); if (m && !size) { var n = parseInt(m[m.length - 1], 10); if (BASES[n]) size = n; } });
    doc = newDoc(size || 16); doc.ficha.cliente = cliente || ""; doc.ficha.folio = folio || ""; if (quoteId) doc.quoteId = quoteId;
    var skipped = [], hoodNeed = 0, hoodX = null, n = 0;
    items.forEach(function (it) {
      var ty = typeOfLine(it.desc || ""); if (!ty) { if (!/base unit|unidad base|trailer/i.test(it.desc || "")) skipped.push(it.desc); return; }
      if (ty === "fss") { var f = addFSS("right"); f.price = it.price || 3700; f.num = ++n; return; }
      var lib = pickLib(ty, wantedWidth(it.desc)); if (!lib) { skipped.push(it.desc); return; }
      var view = (ty === "fridge" || ty === "freezer" || ty === "sink" || ty === "window" || ty === "tv") ? "left" : "right";
      if (ty === "hood") return;
      var o = addComp(lib.id, view, null, null); o.price = it.price || 0; o.num = ++n;
      if (view === "right" && ["griddle", "grill", "fryer", "stove"].indexOf(ty) !== -1) { hoodNeed += o.wft; if (hoodX == null) hoodX = o.xft; }
    });
    if (hoodNeed > 0) { var h = pickLib("hood", hoodNeed); if (h) { var ho = addComp(h.id, "right", hoodX, h.bottom); ho.price = 0; ho.num = ++n; } }
    var nmq = numbering(); nmq.items.forEach(function (o) { if (o.num == null) { o.num = ++n; } }); syncGroupNums();
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
    host.innerHTML = (!cat && (!q || /fire|fss|supp/.test(q)) ? '<button type="button" class="bp-pitem" data-fss="1"><span class="bp-ph" style="color:#C0392B;font-weight:800;font-size:22px">FSS</span><span class="bp-pl">Fire suppression system<br><small>1 or 2 pull stations · $3,700</small></span></button>' : "") +
      list.map(function (l) {
        return '<button type="button" class="bp-pitem" draggable="true" data-lib="' + esc(l.id) + '"><span class="bp-ph"><img src="' + ASSET + esc(l.file) + '" alt="" loading="lazy"></span><span class="bp-pl">' + esc(l.label) + "<br><small>" + fmtFt(l.w) + " × " + fmtFt(l.h) + "</small></span></button>";
      }).join("");
  }
  var TNAME = { rect: "Rectangle", ellipse: "Ellipse", path: "Drawing", text: "Text" };
  function renderSide() {
    var el = document.getElementById("bpProps"); if (!el) return;
    var o = selId ? byId(selId) : null, h = "", nm = numbering();
    if (!o) h = '<div class="hint">Select an object to edit it. Keys: Delete removes, arrows move, Ctrl+Z undoes, Ctrl+D duplicates. Right-click an element for all options (cut, copy, paste, flip, edit…). Hold Alt while dragging to turn off snapping. Drag a numbered badge to reposition it.</div>';
    else {
      h += "<b>" + esc(o.t === "comp" || o.t === "fss" ? objLabel(o) : o.t === "line" ? (o.arrow ? "Arrow" : "Line") : TNAME[o.t]) + "</b>";
      if (o.t === "comp" || o.t === "fss") {
        h += '<label class="bp-m">Number on sheet<input type="text" inputmode="numeric" data-num="' + o.id + '" value="' + esc(nm.map[o.id]) + '"></label>';
        h += '<div class="bp-btnrow"><button type="button" class="btn-small" data-mv="up" title="Move up the list">▲ No.</button><button type="button" class="btn-small" data-mv="down" title="Move down the list">▼ No.</button><button type="button" class="btn-small" data-act="badge0">Reset badge</button></div>';
        h += '<label class="bp-m">Label (shown in the list)<input type="text" data-p="label" value="' + esc(objLabel(o)) + '"' + (o.t === "fss" ? " disabled" : "") + "></label>";
        h += '<label class="bp-m">Price<input type="number" step="50" min="0" data-p="price" value="' + esc(o.price || 0) + '"></label>';
        h += '<label class="bp-m">Width (ft)<input type="number" step="0.05" min="0.3" data-p="wft" value="' + esc(o.wft) + '"></label><label class="bp-m">Height (ft)<input type="number" step="0.05" min="0.3" data-p="hft" value="' + esc(o.hft) + '"></label>';
        h += '<label class="bp-m">Height above floor (ft)<input type="number" step="0.25" data-p="bft" value="' + esc(o.bft) + '"></label>';
        if (o.t === "fss") h += '<label class="bp-m">Pull stations (PS)<select data-p="ps"><option value="1"' + (o.ps !== 2 ? " selected" : "") + '>1 pull station</option><option value="2"' + (o.ps === 2 ? " selected" : "") + ">2 pull stations (double)</option></select></label>";
        if (o.t === "comp") h += '<div class="bp-btnrow"><button type="button" class="btn-small" data-act="crop">✂ Crop</button><button type="button" class="btn-small" data-act="uncrop"' + (hasCrop(o) ? "" : " disabled") + '>Reset crop</button></div>';
        if (o.t === "comp") h += '<label class="bp-check"><input type="checkbox" data-p="mirror"' + (o.mirror ? " checked" : "") + "> Flip horizontally</label>";
        h += '<label class="bp-m">Wall<select data-p="view"><option value="right"' + (o.view === "right" ? " selected" : "") + '>Right</option><option value="left"' + (o.view === "left" ? " selected" : "") + ">Left</option></select></label>";
      } else if (o.t === "text") {
        h += '<label class="bp-m">Text<textarea data-p="text" rows="2">' + esc(o.text) + '</textarea></label><label class="bp-m">Size<input type="number" min="12" max="120" data-p="size" value="' + esc(o.size) + '"></label><label class="bp-m">Color<input type="color" data-p="fill" value="' + esc(o.fill) + '"></label>';
      } else {
        h += '<label class="bp-m">Line<input type="color" data-p="stroke" value="' + esc(o.stroke) + '"></label><label class="bp-m">Width<input type="number" min="1" max="30" data-p="sw" value="' + esc(o.sw) + '"></label>';
        if (o.t === "rect" || o.t === "ellipse") h += '<label class="bp-m">Fill<input type="color" data-p="fill" value="' + (o.fill === "none" ? "#ffffff" : esc(o.fill)) + '"></label><label class="bp-check"><input type="checkbox" data-p="nofill"' + (o.fill === "none" ? " checked" : "") + "> No fill</label>";
        if (o.t !== "path") h += '<label class="bp-check"><input type="checkbox" data-p="dash"' + (o.dash ? " checked" : "") + "> Dashed line</label>";
      }
      h += '<div class="bp-btnrow"><button type="button" class="btn-small" data-act="dup">Duplicate</button><button type="button" class="btn-small" data-act="front">To front</button><button type="button" class="btn-small" data-act="back">To back</button><button type="button" class="btn-small" data-act="del">Delete</button></div>';
    }
    el.innerHTML = h;
    var tot = nm.items.reduce(function (a, x) { return a + (x.price || 0); }, 0);
    var lt = document.getElementById("bpList");
    lt.innerHTML = nm.items.map(function (x) { return '<div class="bp-li' + (x.id === selId ? " bp-on" : "") + '" data-sel="' + x.id + '"><span class="bp-num">' + esc(nm.map[x.id]) + "</span><span>" + esc(objLabel(x)) + '</span><span class="bp-pr">' + (x.price ? money(x.price) : "—") + "</span></div>"; }).join("") +
      '<div class="bp-li bp-tot"><span></span><span>Equipment total</span><span class="bp-pr">' + money(tot) + "</span></div>";
    var b = base(), used = 0;
    doc.objs.forEach(function (x) { if ((x.t === "comp") && x.bft < 0.6 && x.view === "right") used += x.wft; });
    var pl = document.getElementById("bpFit");
    if (pl) { pl.textContent = "Trailer " + b.label + " · usable wall " + fmtFt(b.length - 1) + (used > b.length - 1 ? " · ⚠ floor equipment on the right wall is " + fmtFt(used) + " wide" : ""); pl.classList.toggle("bad", used > b.length - 1); }
  }
  function build() {
    root.innerHTML =
      '<div class="bp-views"><button type="button" class="btn-small active" data-bpview="editor">Editor</button><button type="button" class="btn-small" data-bpview="list">My blueprints</button></div>' +
      '<div id="bpEditor"><div class="bp-top">' +
      '<select id="bpSize" title="Trailer size">' + Object.keys(BASES).map(function (k) { return '<option value="' + k + '">Trailer ' + BASES[k].label + "</option>"; }).join("") + "</select>" +
      '<span class="bp-sep"></span>' +
      '<button type="button" class="bp-tool" data-tool="select" title="Select / move">⬉ Move</button>' +
      '<button type="button" class="bp-tool" data-tool="pencil" title="Pencil">✎ Pencil</button>' +
      '<button type="button" class="bp-tool" data-tool="line" title="Line (Shift = straight)">╱ Line</button>' +
      '<button type="button" class="bp-tool" data-tool="arrow" title="Arrow">➜ Arrow</button>' +
      '<button type="button" class="bp-tool" data-tool="rect" title="Box">▭ Box</button>' +
      '<button type="button" class="bp-tool" data-tool="ellipse" title="Ellipse">◯ Ellipse</button>' +
      '<button type="button" class="bp-tool" data-tool="text" title="Text">T Text</button>' +
      '<span class="bp-sep"></span>' +
      '<label class="bp-c" title="Line / text color">Line <input type="color" id="bpStroke" value="#06038d"></label>' +
      '<label class="bp-c" title="Fill">Fill <input type="color" id="bpFill" value="#5b54ff"></label><label class="bp-c"><input type="checkbox" id="bpNoFill" checked> none</label>' +
      '<label class="bp-c" title="Width">Width <input type="number" id="bpSw" min="1" max="30" value="4" style="width:54px"></label>' +
      '<label class="bp-c"><input type="checkbox" id="bpDash"> dashed</label>' +
      '<span class="bp-sep"></span>' +
      '<button type="button" class="btn-small" id="bpUndo" title="Undo (Ctrl+Z)">↶</button><button type="button" class="btn-small" id="bpRedo" title="Redo">↷</button>' +
      "</div>" +
      '<div class="bp-main">' +
      '<aside class="bp-pal"><input type="search" id="bpSearch" placeholder="Search component…">' +
      '<div class="bp-cats" id="bpCats"></div>' +
      '<label class="bp-m">Add to<select id="bpTarget"><option value="auto">Wall by equipment type</option><option value="right">Right wall</option><option value="left">Left wall</option></select></label>' +
      '<div id="bpItems" class="bp-items"></div></aside>' +
      '<div class="bp-stagewrap"><div id="bpStage"><div id="bpSvgHost"></div></div></div>' +
      '<aside class="bp-side2">' +
      '<div class="bp-card"><button type="button" class="btn-small primary" id="bpFromQuote" style="width:100%">⟳ Build from the current quote</button><div id="bpFit" class="hint" style="margin-top:8px"></div><div id="bpProps"></div></div>' +
      '<div class="bp-card"><h3 class="bp-h">Equipment list &amp; numbering</h3><div id="bpList"></div><div class="bp-btnrow"><button type="button" class="btn-small" id="bpAutoNum">Auto-number</button></div><label class="bp-check"><input type="checkbox" id="bpShowPrices"> Show prices on the sheet</label>' +
      '<div class="bp-btnrow"><button type="button" class="btn-small" id="bpAddQuote">Add to quote</button></div></div>' +
      '<div class="bp-card"><h3 class="bp-h">Sheet</h3><div class="bp-btnrow"><button type="button" class="btn-small" id="bpDefaults" title="Put back the standard pieces (hand sink, tank rack + A/C, 6-ft counter table and window) if you removed them">Restore standard pieces</button></div><label class="bp-m">Title<input type="text" id="bpTitulo" placeholder="Food Trailer · Equipment Layout"></label>' +
      '<div class="bp-ficha" id="bpFicha"></div><label class="bp-m">Notes<textarea id="bpNotas" rows="3"></textarea></label></div>' +
      '<div class="bp-card"><h3 class="bp-h">Save &amp; download</h3><div class="bp-btnrow"><button type="button" class="btn-small primary" id="bpSave">Save</button><button type="button" class="btn-small primary" id="bpPdf">Download PDF</button><button type="button" class="btn-small" id="bpPng">Download PNG</button></div>' +
      '<div class="bp-btnrow"><button type="button" class="btn-small" id="bpPrint">Print</button><button type="button" class="btn-small" id="bpJson">Export .json</button><button type="button" class="btn-small" id="bpNew">New sheet</button></div></div>' +
      '</aside></div></div><div id="bpListView" style="display:none"></div>';
    svgHost = document.getElementById("bpSvgHost");
    var cats = [""].concat(LIB.map(function (l) { return l.cat; }).filter(function (v, i, a) { return a.indexOf(v) === i; }));
    document.getElementById("bpCats").innerHTML = cats.map(function (c) { return '<button type="button" class="bp-cat' + (c === "" ? " active" : "") + '" data-cat="' + esc(c) + '">' + (c || "All") + "</button>"; }).join("");
    document.getElementById("bpFicha").innerHTML = FICHA.map(function (f) { return '<label class="bp-m">' + f[1] + '<input type="text" data-f="' + f[0] + '"></label>'; }).join("");
    renderPalette(); updateListBadge(); setTool();
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
      if (b.dataset.mv) { if (selId) moveNumber(selId, b.dataset.mv === "up" ? -1 : 1); return; }
      if (b.dataset.act === "crop") { startCrop(selId && byId(selId)); return; }
      if (b.dataset.act === "uncrop") { resetCrop(selId && byId(selId)); return; }
      if (b.dataset.act === "badge0") { var bo = selId && byId(selId); if (bo) { delete bo.bdx; delete bo.bdy; commit(); } return; }
      if (b.dataset.act === "del") delObj(); else if (b.dataset.act === "dup") dupObj(); else if (b.dataset.act === "front") reorder(true); else if (b.dataset.act === "back") reorder(false);
    });
    root.addEventListener("dragstart", function (e) { var b = e.target.closest("[data-lib]"); if (b) { e.dataTransfer.setData("text/plain", b.dataset.lib); e.dataTransfer.effectAllowed = "copy"; } });
    var stage = document.getElementById("bpStage");
    stage.addEventListener("dragover", function (e) { e.preventDefault(); });
    stage.addEventListener("drop", function (e) {
      e.preventDefault(); var id = e.dataTransfer.getData("text/plain"), l = libById(id); if (!l) return;
      var p = ptr(e), L = layout(doc), view = viewAt(L, p.y), v = L.views[view];
      var xft = Math.round(((p.x - v.ox) / v.pxft - l.w / 2) * 4) / 4, bft = Math.round(((v.floor - p.y) / v.pxft - l.h / 2) * 4) / 4;
      if (Math.abs(bft) < 0.3) bft = 0;
      addComp(id, view, xft, bft); commit();
    });
    stage.addEventListener("pointerdown", onDown); window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp);
    stage.addEventListener("dblclick", onDbl); stage.addEventListener("contextmenu", function (e) { e.preventDefault(); showMenu(e); }); window.addEventListener("keydown", onKey);
    document.getElementById("bpSearch").addEventListener("input", renderPalette);
    document.getElementById("bpTarget").addEventListener("change", function (e) { selTarget = e.target.value; });
    document.getElementById("bpSize").addEventListener("change", function (e) { doc.sizeId = e.target.value; repositionDefaults(doc); commit(); });
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
      else if (p === "label") { o.label = v; }
      else o[p] = v;
      if (p === "text" || p === "fill" || p === "stroke" || p === "sw" || p === "size" || p === "dash" || p === "mirror" || p === "view" || p === "ps" || p === "wft" || p === "hft" || p === "bft" || p === "price" || p === "nofill" || p === "label") { draw(); autosave(); }
    });
    root.addEventListener("change", function (e) {
      var d = e.target.dataset || {};
      if (d.num) { var no = byId(d.num); if (no) { var v = String(e.target.value).trim(); if (v === "") delete no.num; else no.num = /^\d+$/.test(v) ? parseInt(v, 10) : v.slice(0, 4); if (no.grp) doc.objs.forEach(function (m) { if (m.grp === no.grp) { if (no.num == null) delete m.num; else m.num = no.num; } }); commit(); } return; }
      if (d.p && selId) { snapshot(); }
    });
    document.getElementById("bpAutoNum").addEventListener("click", autoNumber);
    document.getElementById("bpDefaults").addEventListener("click", function () { if (addDefaults(doc)) { commit(); } else alert("All standard pieces are already on the sheet."); });
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
    document.getElementById("bpPdf").addEventListener("click", function () { downloadPdf(); });
    document.getElementById("bpSave").addEventListener("click", function () { saveCurrent(); });
    root.querySelectorAll("[data-bpview]").forEach(function (b) { b.addEventListener("click", function () { showView(b.dataset.bpview); }); });
    document.getElementById("bpPng").addEventListener("click", function () { downloadPng(); });
    document.getElementById("bpJson").addEventListener("click", exportJson);
    document.getElementById("bpAddQuote").addEventListener("click", addToQuote);
                document.getElementById("bpNew").addEventListener("click", function () { if (doc.objs.length && !confirm("The current sheet will be discarded (if you did not save it). Continue?")) return; doc = newDoc(doc.sizeId); selId = null; hist = []; histI = -1; snapshot(); syncControls(); draw(true); });
    document.getElementById("bpFromQuote").addEventListener("click", function () { api.fromQuoteUI(); });
    var origCommit = commit; void origCommit;
  }

  var api = {
    fromQuoteUI: function () {
      var q = window.TrylaQuote; if (!q || !q.getLineItems) { alert("The quote builder is not ready."); return; }
      if (doc.objs.length && !confirm("Replace the current sheet with a new one built from the quote?")) return;
      var items = q.getLineItems(); if (!items.length) { alert("The quote has no lines yet."); return; }
      var meta = q.getMeta ? q.getMeta() : {};
      var ex = docsFor(meta.cliente, meta.numero ? [meta.numero] : []).filter(function (d) { return !meta.numero || String(d.ficha.folio || "").toLowerCase() === String(meta.numero).toLowerCase(); });
      if (ex.length && confirm("A blueprint for this quote/client already exists (" + (ex[0].ficha.cliente || "") + (ex[0].ficha.folio ? ", quote " + ex[0].ficha.folio : "") + ").\n\nOK = open the saved one\nCancel = build a new one from the quote lines")) { doc = JSON.parse(JSON.stringify(ex[0])); selId = null; cropMode = false; hist = []; histI = -1; snapshot(); syncControls(); autosave(); api.open(); showView("editor"); return; }
      var skipped = fromQuote(items, meta.cliente, meta.numero, meta.id); syncControls(); api.open(); showView("editor");
      if (skipped.length) alert("Blueprint built from the quote lines I could recognize.\nNot placed:\n• " + skipped.slice(0, 12).join("\n• ") + "\n\nAdd them by hand from the palette.");
    },
    count: function (name, nums) { return docsFor(name, nums).length; },
    showFor: function (name, nums) { listFilter = String(name || ""); api.open(); showView("list"); },
    newFor: function (name) {
      if (!root) return; if (doc.objs.length && !confirm("Start a new blueprint for " + name + "? The sheet currently open will be replaced (save it first if you need it).")) return;
      doc = newDoc(doc.sizeId); doc.ficha.cliente = name || ""; selId = null; cropMode = false; hist = []; histI = -1; snapshot(); syncControls(); autosave(); api.open(); showView("editor");
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
    var qb = document.getElementById("btnQuoteBp"); if (qb) qb.addEventListener("click", function () { api.fromQuoteUI(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
