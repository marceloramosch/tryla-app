// ============================================================
//  TRYLA BLUEPRINT
//  Genera la hoja de blueprint de un food trailer (planta, pared de
//  cocina, pared de servicio, vista lateral y lista de equipo) en SVG y
//  maneja el "cotizador de blueprints" de la pestana Blueprint del CRM.
//
//  No es un plano de ingenieria: es un boceto a escala para ventas.
//  Las medidas de cada equipo son de referencia y se pueden editar.
// ============================================================
(function () {
  "use strict";

  var FONT = "Barlow, Arial, sans-serif";
  var C = {
    blue: "#5B54FF", navy: "#06038D", light: "#F1F0FF", border: "#D6D3FF",
    text2: "#5C6270", ink: "#1B1D2A", steel: "#E9EAF3", steelD: "#8E94AD", red: "#C0392B",
  };
  var SHEET_W = 1700;
  var MARGIN = 60;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function fmtFt(ft) {
    var inches = Math.round(ft * 12);
    var f = Math.floor(inches / 12);
    var i = inches - f * 12;
    return f + "'" + (i ? "-" + i + '"' : "-0\"");
  }
  function money(n) {
    return "$" + Math.round(n).toLocaleString("en-US");
  }

  // ---------- Biblioteca de equipo (medidas de referencia, en pies) ----------
  function numIn(name) {
    var m = /(\d+)\s*(?:"|pulg)/.exec(name);
    return m ? parseInt(m[1], 10) : null;
  }
  function specFor(name) {
    var n = String(name).toLowerCase();
    var s = { type: "generic", w: 2, d: 2.5, h: 3, hood: false, util: [] };
    var inch;
    if (n.indexOf("plancha") !== -1) {
      inch = numIn(n) || 36;
      s = { type: "griddle", w: inch / 12, d: 2.5, h: 3, hood: true, util: ["Gas"] };
    } else if (n.indexOf("carbon") !== -1) {
      s = { type: "grill", w: 3, d: 2.5, h: 3, hood: true, util: ["Carbon"] };
    } else if (n.indexOf("parrilla") !== -1) {
      inch = numIn(n) || 36;
      s = { type: "grill", w: inch / 12, d: 2.5, h: 3, hood: true, util: ["Gas"] };
    } else if (n.indexOf("freidora") !== -1) {
      var lb = /(\d+)\s*lb/.exec(n);
      var l = lb ? parseInt(lb[1], 10) : 40;
      s = { type: "fryer", w: l <= 30 ? 1.5 : l <= 50 ? 2 : 2.5, d: 2.5, h: 3, hood: true, util: ["Gas"] };
    } else if (n.indexOf("wok") !== -1) {
      s = { type: "stove", w: 1.5, d: 2.5, h: 3, hood: true, util: ["Gas"] };
    } else if (n.indexOf("estufa") !== -1) {
      var q = /(\d+)\s*quemadores/.exec(n);
      var b = q ? parseInt(q[1], 10) : 4;
      s = { type: "stove", w: b <= 2 ? 1.5 : b === 3 ? 2 : b === 4 ? 2.5 : 3, d: 2.5, h: 3, hood: true, util: ["Gas"], burners: b };
    } else if (n.indexOf("vapor") !== -1 || n.indexOf("warmer") !== -1) {
      var sp = /(\d+)\s*espacios/.exec(n);
      var k = sp ? parseInt(sp[1], 10) : 4;
      s = { type: "steam", w: k <= 4 ? 2.5 : k <= 6 ? 3.5 : 4.5, d: 2.5, h: 3, hood: false, util: ["Electrico"] };
    } else if (n.indexOf("congelador") !== -1) {
      s = { type: "fridge", w: 2.5, d: 2.5, h: 6.2, hood: false, util: ["Electrico"] };
    } else if (n.indexOf("refrigerador") !== -1) {
      var under = n.indexOf("29") !== -1;
      s = { type: "fridge", w: under ? 2.4 : 2.5, d: 2.5, h: under ? 3 : 6.2, hood: false, util: ["Electrico"] };
    } else if (n.indexOf("mesa fria") !== -1 || n.indexOf("prep") !== -1) {
      inch = numIn(n) || 36;
      s = { type: "preptable", w: inch / 12, d: 2.5, h: 3.3, hood: false, util: ["Electrico"] };
    } else if (n.indexOf("hielo") !== -1) {
      s = { type: "ice", w: 2, d: 2.5, h: 3, hood: false, util: ["Electrico", "Agua"] };
    } else if (n.indexOf("fregadero") !== -1) {
      var t3 = n.indexOf("3 tarjas") !== -1;
      s = { type: "sink", w: t3 ? 6 : 4.5, d: 2, h: 3, hood: false, util: ["Agua"] };
    }
    return s;
  }

  var SYSTEMS = [
    { id: "ac", label: "A/C (techo)", catalog: "Unidad AC y calefaccion 110V" },
    { id: "heater", label: "Calentador de agua", catalog: "Calentador de agua electrico 110V" },
    { id: "tanks", label: "Tanques de agua limpia y residual + bomba", catalog: "Tanque aguas residuales con bomba automatica" },
    { id: "propane", label: "Tanque de propano 100 lb (en lanza)", catalog: "Tanque de propano 100 lb + estante acero inoxidable" },
    { id: "generator", label: "Generador con jaula (en lanza)", catalog: "Generador Honda 7,000 W (silencioso)" },
    { id: "fss", label: "Sistema contra incendios (FSS)", catalog: "Sistema contra incendios" },
  ];

  // ---------- Layout de puerta y ventanas (pared de servicio, en pies) ----------
  function serviceLayout(L, nWin, doorSide) {
    var doorW = 3;
    var doorX = doorSide === "right" ? L - 0.4 - doorW : 0.4;
    var start = doorSide === "right" ? 0.5 : doorX + doorW + 0.5;
    var end = doorSide === "right" ? doorX - 0.5 : L - 0.5;
    var span = end - start;
    var ww = L < 14 ? 3 : 4;
    var wins = [];
    for (var i = 0; i < nWin; i++) {
      var cx = start + (i + 0.5) * (span / nWin);
      wins.push({ x: cx - ww / 2, w: ww, cx: cx });
    }
    return { door: { x: doorX, w: doorW }, wins: wins };
  }

  // ---------- Helpers SVG ----------
  function line(x1, y1, x2, y2, stroke, sw, dash) {
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + stroke + '" stroke-width="' + (sw || 1) + '"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : "") + "/>";
  }
  function rect(x, y, w, h, fill, stroke, sw, dash, rx) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + (fill || "none") + '" stroke="' + (stroke || "none") +
      '" stroke-width="' + (sw || 1) + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : "") + (rx ? ' rx="' + rx + '"' : "") + "/>";
  }
  function text(x, y, str, size, o) {
    o = o || {};
    return '<text x="' + x + '" y="' + y + '" font-family="' + FONT + '" font-size="' + size + '" fill="' + (o.fill || C.navy) + '"' +
      (o.bold ? ' font-weight="700"' : "") + (o.halo ? ' paint-order="stroke" stroke="#fff" stroke-width="5" stroke-linejoin="round"' : "") + ' text-anchor="' + (o.anchor || "start") + '"' +
      (o.rotate ? ' transform="rotate(' + o.rotate + " " + x + " " + y + ')"' : "") + ">" + esc(str) + "</text>";
  }
  // Parte un texto en lineas que quepan en maxW px (sin cortar con "...")
  function wrap(str, maxW, size) {
    var cw = size * 0.52;
    var max = Math.max(4, Math.floor(maxW / cw));
    var words = String(str).split(/\s+/);
    var lines = [], cur = "";
    words.forEach(function (w) {
      while (w.length > max) {
        if (cur) { lines.push(cur); cur = ""; }
        lines.push(w.slice(0, max)); w = w.slice(max);
      }
      var cand = cur ? cur + " " + w : w;
      if (cand.length > max && cur) { lines.push(cur); cur = w; } else cur = cand;
    });
    if (cur) lines.push(cur);
    return lines;
  }
  function textBox(cx, y, str, size, maxW, o) {
    var ls = wrap(str, maxW, size), out = "";
    for (var i = 0; i < ls.length; i++) out += text(cx, y + i * (size * 1.15), ls[i], size, Object.assign({ anchor: "middle" }, o || {}));
    return { svg: out, h: ls.length * size * 1.15 };
  }
  // Cota con flechas: horizontal u vertical
  function dimH(x1, x2, y, label, size) {
    size = size || 16;
    var s = line(x1, y, x2, y, C.navy, 1.5) + line(x1, y - 7, x1, y + 7, C.navy, 1.5) + line(x2, y - 7, x2, y + 7, C.navy, 1.5);
    s += '<polygon points="' + x1 + "," + y + " " + (x1 + 9) + "," + (y - 4) + " " + (x1 + 9) + "," + (y + 4) + '" fill="' + C.navy + '"/>';
    s += '<polygon points="' + x2 + "," + y + " " + (x2 - 9) + "," + (y - 4) + " " + (x2 - 9) + "," + (y + 4) + '" fill="' + C.navy + '"/>';
    s += text((x1 + x2) / 2, y - 9, label, size, { anchor: "middle", bold: true });
    return s;
  }
  function dimV(x, y1, y2, label, size) {
    size = size || 16;
    var s = line(x, y1, x, y2, C.navy, 1.5) + line(x - 7, y1, x + 7, y1, C.navy, 1.5) + line(x - 7, y2, x + 7, y2, C.navy, 1.5);
    s += '<polygon points="' + x + "," + y1 + " " + (x - 4) + "," + (y1 + 9) + " " + (x + 4) + "," + (y1 + 9) + '" fill="' + C.navy + '"/>';
    s += '<polygon points="' + x + "," + y2 + " " + (x - 4) + "," + (y2 - 9) + " " + (x + 4) + "," + (y2 - 9) + '" fill="' + C.navy + '"/>';
    s += text(x + 12, (y1 + y2) / 2 + 5, label, size, { bold: true });
    return s;
  }
  function badge(cx, cy, n, r) {
    r = r || 15;
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + C.navy + '"/>' +
      text(cx, cy + r * 0.38, String(n), r * 1.15, { fill: "#fff", anchor: "middle", bold: true });
  }
  // Simbolo del equipo, dibujado dentro de una caja (x,y,w,h)
  function symbol(type, x, y, w, h, extra) {
    var col = C.navy, s = "", i;
    var pad = Math.min(w, h) * 0.14;
    var ix = x + pad, iy = y + pad, iw = w - pad * 2, ih = h - pad * 2;
    if (iw < 6 || ih < 6) return "";
    if (type === "griddle") {
      s += rect(ix, iy, iw, ih, "none", col, 1.5);
      for (i = 1; i <= 3; i++) s += line(ix + 6, iy + (ih * i) / 4, ix + iw - 6, iy + (ih * i) / 4, col, 1.2);
    } else if (type === "grill") {
      s += rect(ix, iy, iw, ih, "none", col, 1.5);
      for (i = 1; i <= 4; i++) s += line(ix + (iw * i) / 5, iy, ix + (iw * i) / 5, iy + ih, col, 1);
      for (i = 1; i <= 2; i++) s += line(ix, iy + (ih * i) / 3, ix + iw, iy + (ih * i) / 3, col, 1);
    } else if (type === "fryer") {
      s += rect(ix, iy, iw, ih, "none", col, 1.5);
      var bw = iw / 2 - 5;
      s += rect(ix + 3, iy + ih * 0.18, bw, ih * 0.64, "none", col, 1.2, null, 3);
      s += rect(ix + iw / 2 + 2, iy + ih * 0.18, bw, ih * 0.64, "none", col, 1.2, null, 3);
    } else if (type === "stove") {
      s += rect(ix, iy, iw, ih, "none", col, 1.5);
      var nb = (extra && extra.burners) || 4;
      var cols = nb <= 2 ? 1 : 2, rows = Math.ceil(nb / cols), r = Math.min(iw / (cols * 2.6), ih / (rows * 2.6));
      for (i = 0; i < nb; i++) {
        var cx = ix + iw * ((i % cols) + 0.5) / cols;
        var cy = iy + ih * (Math.floor(i / cols) + 0.5) / rows;
        s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="1.3"/>';
      }
    } else if (type === "sink") {
      s += rect(ix, iy, iw, ih, "none", col, 1.5);
      var nBasin = iw > ih * 3 ? 3 : 2;
      var gap = 5, bwid = (iw - gap * (nBasin + 1)) / nBasin;
      for (i = 0; i < nBasin; i++) s += rect(ix + gap + i * (bwid + gap), iy + ih * 0.18, bwid, ih * 0.64, "none", col, 1.2, null, 6);
    } else if (type === "fridge") {
      s += rect(ix, iy, iw, ih, "none", col, 1.5);
      s += line(ix, iy + ih * 0.42, ix + iw, iy + ih * 0.42, col, 1.2);
      s += line(ix + iw * 0.82, iy + ih * 0.12, ix + iw * 0.82, iy + ih * 0.32, col, 3);
      s += line(ix + iw * 0.82, iy + ih * 0.52, ix + iw * 0.82, iy + ih * 0.78, col, 3);
    } else if (type === "steam") {
      s += rect(ix, iy, iw, ih, "none", col, 1.5);
      var np = Math.max(2, Math.round(iw / (ih * 0.8)));
      for (i = 0; i < np; i++) s += rect(ix + 4 + i * ((iw - 8) / np), iy + ih * 0.2, (iw - 8) / np - 4, ih * 0.6, "none", col, 1.2, null, 3);
    } else if (type === "preptable") {
      s += rect(ix, iy, iw, ih, "none", col, 1.5);
      s += rect(ix + 4, iy + 4, iw - 8, ih * 0.28, "none", col, 1.2);
      s += line(ix + iw / 2, iy + ih * 0.4, ix + iw / 2, iy + ih, col, 1.2);
    } else if (type === "ice") {
      s += rect(ix, iy, iw, ih, "none", col, 1.5);
      var cs = Math.min(iw, ih) * 0.3;
      s += rect(ix + iw / 2 - cs, iy + ih / 2 - cs, cs * 1.3, cs * 1.3, "none", col, 1.3);
    } else {
      s += rect(ix, iy, iw, ih, "none", col, 1.5);
    }
    return s;
  }

  // ---------- Calculo del estado -> geometria ----------
  function placeItems(state, L) {
    var cursor = 0.5, out = [], total = 0;
    state.items.forEach(function (it, idx) {
      var sp = specFor(it.name);
      var w = it.w > 0 ? it.w : sp.w;
      out.push({ idx: idx, num: idx + 1, name: it.name, x: cursor, w: w, d: sp.d, h: sp.h, type: sp.type, hood: sp.hood, util: sp.util, burners: sp.burners, price: it.price || 0 });
      cursor += w; total += w;
    });
    return { placed: out, used: total, free: L - 1 - total };
  }
  function hoodSpan(placed, hoodFt, L) {
    var a = null, b = null;
    placed.forEach(function (p) { if (p.hood) { if (a === null) a = p.x; b = p.x + p.w; } });
    if (a === null) return null;
    var w = b - a;
    if (hoodFt > 0) w = Math.min(hoodFt, L - 0.5 - a);
    return { x: a, w: w };
  }

  // ---------- Vistas ----------
  function renderSheet(state, size) {
    var L = size.length, Wd = size.width;
    var pl = placeItems(state, L);
    var placed = pl.placed;
    var hood = hoodSpan(placed, state.hoodFt, L);
    var sys = state.sys || {};
    var lay = serviceLayout(L, state.windows, state.door);
    var S = Math.min(52, (SHEET_W - MARGIN * 2) / (L + 6));
    var totalPx = (L + 4) * S;
    var hitchX = (SHEET_W - totalPx) / 2;
    var x0 = hitchX + 4 * S;
    var body = "";
    var y = 0;

    // ----- Titulo -----
    body += rect(0, 0, SHEET_W, 14, C.blue);
    body += text(MARGIN, 80, "TRYLA", 46, { bold: true });
    body += text(MARGIN + 172, 80, "FOOD TRAILERS", 22, { fill: C.blue, bold: true });
    body += text(SHEET_W - MARGIN, 50, state.titulo || "Blueprint " + size.label, 34, { anchor: "end", bold: true });
    var sub = [];
    if (state.cliente) sub.push("Cliente: " + state.cliente);
    if (state.folio) sub.push("Folio: " + state.folio);
    sub.push(new Date().toLocaleDateString("es-MX", { dateStyle: "long" }));
    body += text(SHEET_W - MARGIN, 82, sub.join("  ·  "), 18, { anchor: "end", fill: C.text2 });
    body += line(MARGIN, 112, SHEET_W - MARGIN, 112, C.border, 2);
    y = 150;

    // ----- Planta -----
    body += text(MARGIN, y, "1 · VISTA SUPERIOR (PLANTA)", 22, { bold: true });
    y += 34;
    // cotas por equipo (arriba)
    var dimY = y + 30;
    placed.forEach(function (p) {
      body += dimH(x0 + p.x * S, x0 + (p.x + p.w) * S, dimY, fmtFt(p.w), 14);
    });
    var yTop = dimY + 55; // pared trasera
    var hPx = Wd * S;
    // tanques (bajo piso)
    if (sys.tanks) {
      body += rect(x0 + (L * 0.28) * S, yTop + hPx - 2.1 * S, 3.2 * S, 1.6 * S, "none", C.steelD, 2, "8 6", 4);
      body += text(x0 + (L * 0.28) * S + 1.6 * S, yTop + hPx - 1.25 * S, "TANQUES (bajo piso)", 13, { anchor: "middle", fill: C.text2 });
      body += text(x0 + (L * 0.28) * S + 1.6 * S, yTop + hPx - 0.95 * S, "limpia / residual + bomba", 12, { anchor: "middle", fill: C.text2 });
    }
    // lanza (A-frame)
    var midY = yTop + hPx / 2;
    body += '<polygon points="' + x0 + "," + (yTop + hPx * 0.18) + " " + (x0 - 3.2 * S) + "," + (midY - 0.12 * S) + " " + (x0 - 3.2 * S) + "," + (midY + 0.12 * S) + " " + x0 + "," + (yTop + hPx * 0.82) + '" fill="#fff" stroke="' + C.navy + '" stroke-width="3"/>';
    body += rect(x0 - 3.7 * S, midY - 0.22 * S, 0.55 * S, 0.44 * S, C.steel, C.navy, 2, null, 3);
    body += text(x0 - 3.45 * S, midY + 0.55 * S + 18, "ACOPLE", 12, { anchor: "middle", fill: C.text2 });
    if (sys.propane) {
      body += '<circle cx="' + (x0 - 1.7 * S) + '" cy="' + (midY - 0.65 * S) + '" r="' + 0.42 * S + '" fill="' + C.light + '" stroke="' + C.navy + '" stroke-width="2.5"/>';
      body += text(x0 - 1.7 * S, midY - 0.65 * S + 5, "LP", 14, { anchor: "middle", bold: true });
      body += text(x0 - 1.7 * S, midY - 1.25 * S, "PROPANO 100 lb", 12, { anchor: "middle", fill: C.text2, halo: true });
    }
    if (sys.generator) {
      body += rect(x0 - 2.55 * S, midY + 0.28 * S, 1.6 * S, 0.62 * S, C.light, C.navy, 2, "6 4", 3);
      body += text(x0 - 1.75 * S, midY + 0.64 * S, "GENERADOR", 12, { anchor: "middle", fill: C.navy, bold: true });
    }
    // ruedas
    var nAx = state.axles || size.axles || 2;
    for (var a = 0; a < nAx; a++) {
      var ax = L * 0.55 + (a - (nAx - 1) / 2) * 2.6;
      body += rect(x0 + (ax - 1.1) * S, yTop - 0.55 * S, 2.2 * S, 0.5 * S, "#2a2a35", C.navy, 1.5, null, 5);
      body += rect(x0 + (ax - 1.1) * S, yTop + hPx + 0.05 * S, 2.2 * S, 0.5 * S, "#2a2a35", C.navy, 1.5, null, 5);
    }
    // caja del trailer
    body += rect(x0, yTop, L * S, hPx, "#FFFFFF", C.navy, 5);
    // cuadricula de 1 pie
    for (var gx = 1; gx < L; gx++) body += line(x0 + gx * S, yTop, x0 + gx * S, yTop + hPx, "#EEEDFF", 1);
    for (var gy = 1; gy < Wd; gy++) body += line(x0, yTop + gy * S, x0 + L * S, yTop + gy * S, "#EEEDFF", 1);
    body += rect(x0, yTop, L * S, hPx, "none", C.navy, 5);
    // campana
    if (hood) {
      body += rect(x0 + hood.x * S - 6, yTop + 6, hood.w * S + 12, 3.1 * S, "rgba(91,84,255,0.08)", C.blue, 2.5, "10 6");
      body += text(x0 + (hood.x + hood.w / 2) * S, yTop + 3.1 * S + 26, "CAMPANA " + fmtFt(hood.w) + " + EXTRACTOR", 15, { anchor: "middle", fill: C.blue, bold: true });
    }
    // equipo
    placed.forEach(function (p) {
      var px = x0 + p.x * S, pw = p.w * S, ph = p.d * S;
      body += rect(px, yTop, pw, ph, C.steel, C.navy, 2.5);
      body += symbol(p.type, px, yTop, pw, ph, { burners: p.burners });
      body += badge(px + pw / 2, yTop + ph + 20, p.num, 14);
    });
    // A/C (techo)
    if (sys.ac) {
      var acX = x0 + Math.min(L - 3.2, Math.max((hood ? hood.x + hood.w : 0) + 0.8, L - 4.6)) * S;
      body += rect(acX, yTop + 3.4 * S, 2.6 * S, 1.8 * S, "rgba(91,84,255,0.06)", C.navy, 2, "8 6", 4);
      body += text(acX + 1.3 * S, yTop + 4.35 * S, "A/C (techo)", 15, { anchor: "middle", fill: C.navy, bold: true });
    }
    // calentador
    if (sys.heater) {
      var hx = x0 + (L - 1.6) * S, hy = yTop + 3.0 * S;
      body += rect(hx, hy, 1.1 * S, 1.1 * S, C.light, C.navy, 2, null, 4);
      body += text(hx + 0.55 * S, hy + 0.5 * S, "CA", 14, { anchor: "middle", bold: true });
      body += text(hx + 0.55 * S, hy + 0.5 * S + 15, "calentador", 10, { anchor: "middle", fill: C.text2 });
    }
    // pared de servicio: puerta + ventanas
    var yFront = yTop + hPx;
    body += rect(x0 + lay.door.x * S, yFront - 5, lay.door.w * S, 10, "#fff", C.navy, 3);
    body += '<path d="M ' + (x0 + lay.door.x * S) + " " + yFront + " A " + lay.door.w * S + " " + lay.door.w * S + " 0 0 0 " + (x0 + (lay.door.x + lay.door.w) * S) + " " + (yFront - lay.door.w * S) +
      '" fill="none" stroke="' + C.text2 + '" stroke-width="1.5" stroke-dasharray="5 4"/>';
    body += line(x0 + (lay.door.x + lay.door.w) * S, yFront, x0 + (lay.door.x + lay.door.w) * S, yFront - lay.door.w * S, C.text2, 1.5);
    body += text(x0 + (lay.door.x + lay.door.w / 2) * S, yFront + 0.55 * S + 20, "PUERTA", 13, { anchor: "middle", fill: C.text2, bold: true });
    lay.wins.forEach(function (w, i) {
      body += rect(x0 + w.x * S, yFront - 6, w.w * S, 12, "#fff", C.blue, 4);
      body += text(x0 + w.cx * S, yFront + 0.55 * S + 20, "VENTANA " + (i + 1), 13, { anchor: "middle", fill: C.blue, bold: true });
    });
    // cotas largo y ancho
    var dimBottom = yFront + 0.55 * S + 70;
    body += dimH(x0, x0 + L * S, dimBottom, "LARGO " + fmtFt(L), 17);
    body += dimV(x0 + L * S + 36, yTop, yFront, "ANCHO " + fmtFt(Wd), 17);
    if (pl.free < -0.01) {
      body += text(x0 + L * S / 2, yTop + hPx / 2 + 50, "AVISO: el equipo (" + fmtFt(pl.used) + ") no cabe en la pared (" + fmtFt(L - 1) + ")", 22, { anchor: "middle", fill: C.red, bold: true });
    }
    y = dimBottom + 60;

    // ----- Elevacion: pared de cocina -----
    var H = 7 * S;
    body += text(MARGIN, y, "2 · PARED DE COCINA (INTERIOR)", 22, { bold: true });
    y += 28 + 1.3 * S;
    var wy = y, floor = wy + H;
    body += rect(x0, wy, L * S, H, "#fff", C.navy, 5);
    // altura de mostrador
    body += line(x0, floor - 3 * S, x0 + L * S, floor - 3 * S, "#CFCDEB", 1.5, "6 5");
    body += text(x0 - 10, floor - 3 * S + 5, "36\"", 12, { anchor: "end", fill: C.text2 });
    placed.forEach(function (p) {
      var bx = x0 + p.x * S, bw = p.w * S, bh = p.h * S;
      body += rect(bx, floor - bh, bw, bh, C.steel, C.navy, 2.5);
      if (p.type === "griddle" || p.type === "grill" || p.type === "stove" || p.type === "fryer") body += rect(bx, floor - bh, bw, 0.14 * S, C.steelD, C.navy, 1.5);
      var fs = bw < 2.2 * S ? 12 : 15;
      var tb = textBox(bx + bw / 2, floor - bh + Math.min(bh * 0.35, 0.9 * S) + 8, p.name, fs, bw - 8, { fill: C.navy, bold: true });
      body += tb.svg;
      body += badge(bx + bw / 2, floor - 0.38 * S, p.num, 13);
    });
    // campana + FSS + extractor
    if (hood) {
      var hb = floor - 5.4 * S, ht = floor - 6.7 * S, hx0 = x0 + hood.x * S - 8, hx1 = x0 + (hood.x + hood.w) * S + 8;
      body += '<polygon points="' + hx0 + "," + hb + " " + hx1 + "," + hb + " " + (hx1 - 0.3 * S) + "," + ht + " " + (hx0 + 0.3 * S) + "," + ht + '" fill="rgba(91,84,255,0.10)" stroke="' + C.blue + '" stroke-width="3"/>';
      var nf = Math.max(2, Math.floor(hood.w / 1.4));
      for (var f = 0; f < nf; f++) body += rect(hx0 + 18 + f * ((hx1 - hx0 - 36) / nf), hb - 0.5 * S, (hx1 - hx0 - 36) / nf - 8, 0.3 * S, "none", C.blue, 1.5);
      body += text((hx0 + hx1) / 2, hb - 0.7 * S + 2, "CAMPANA TIPO I  " + fmtFt(hood.w), 14, { anchor: "middle", fill: C.blue, bold: true });
      // ducto y extractor
      var dx = (hx0 + hx1) / 2;
      body += rect(dx - 0.35 * S, wy - 0.05 * S, 0.7 * S, ht - wy + 0.05 * S, "none", C.blue, 2.5, "7 5");
      body += rect(dx - 0.6 * S, wy - 0.7 * S, 1.2 * S, 0.65 * S, C.light, C.blue, 2.5, null, 4);
      body += text(dx, wy - 0.28 * S, "EXTRACTOR", 13, { anchor: "middle", fill: C.blue, bold: true, halo: true });
      if (sys.fss) {
        body += line(hx0 + 14, hb + 0.22 * S, hx1 - 14, hb + 0.22 * S, C.red, 2.5);
        placed.forEach(function (p) {
          if (!p.hood) return;
          var cx = x0 + (p.x + p.w / 2) * S;
          body += line(cx, hb + 0.22 * S, cx, hb + 0.55 * S, C.red, 2.5);
          body += '<polygon points="' + (cx - 7) + "," + (hb + 0.55 * S) + " " + (cx + 7) + "," + (hb + 0.55 * S) + " " + cx + "," + (hb + 0.55 * S + 12) + '" fill="' + C.red + '"/>';
        });
        body += text((hx0 + hx1) / 2, hb + 0.55 * S + 34, "FSS · boquillas por equipo", 12, { anchor: "middle", fill: C.red, bold: true });
      }
    }
    if (sys.fss) {
      var pxs = lay.door.x + lay.door.w + 0.3;
      body += rect(x0 + pxs * S, floor - 4.4 * S, 0.5 * S, 0.5 * S, C.red, "#fff", 1.5, null, 3);
      body += text(x0 + (pxs + 0.25) * S, floor - 4.4 * S + 0.3 * S, "PS", 12, { anchor: "middle", fill: "#fff", bold: true });
      body += text(x0 + (pxs + 0.25) * S, floor - 4.5 * S, "palanca FSS", 11, { anchor: "middle", fill: C.red });
      body += '<circle cx="' + (x0 + (pxs + 1.3) * S) + '" cy="' + (floor - 4.15 * S) + '" r="' + 0.28 * S + '" fill="' + C.red + '" stroke="#fff" stroke-width="1.5"/>';
      body += text(x0 + (pxs + 1.3) * S, floor - 4.15 * S + 5, "K", 13, { anchor: "middle", fill: "#fff", bold: true });
      body += text(x0 + (pxs + 1.3) * S, floor - 4.5 * S, "extintor", 11, { anchor: "middle", fill: C.red });
    }
    body += dimV(x0 + L * S + 36, wy, floor, "ALTURA INT. 7'-0\"", 15);
    y = floor + 70;

    // ----- Elevacion: pared de servicio -----
    body += text(MARGIN, y, "3 · PARED DE SERVICIO (VENTANAS Y PUERTA)", 22, { bold: true });
    y += 28 + 1.0 * S;
    var sy = y, sfloor = sy + H;
    body += rect(x0, sy, L * S, H, "#fff", C.navy, 5);
    lay.wins.forEach(function (w, i) {
      var wx = x0 + w.x * S, wb = sfloor - 3.5 * S, wt = sfloor - 6.5 * S;
      body += rect(wx, wt, w.w * S, wb - wt, "rgba(91,84,255,0.07)", C.blue, 3.5);
      body += line(wx + w.w * S / 2, wt, wx + w.w * S / 2, wb, C.blue, 2);
      body += text(wx + w.w * S / 2, wt + (wb - wt) / 2 + 5, "VENTANA " + w.w * 12 + '" × 36"', 14, { anchor: "middle", fill: C.blue, bold: true, halo: true });
      body += rect(wx - 0.25 * S, sfloor - 3.5 * S, w.w * S + 0.5 * S, 0.22 * S, C.steelD, C.navy, 2);
      // toldo
      body += '<polygon points="' + (wx - 8) + "," + (wt - 4) + " " + (wx + w.w * S + 8) + "," + (wt - 4) + " " + (wx + w.w * S + 22) + "," + (wt - 0.55 * S) + " " + (wx - 22) + "," + (wt - 0.55 * S) + '" fill="rgba(91,84,255,0.18)" stroke="' + C.blue + '" stroke-width="2"/>';
      body += text(wx + w.w * S / 2, wt - 0.62 * S - 6, "toldo", 11, { anchor: "middle", fill: C.blue });
    });
    body += rect(x0 + 0.05 * S, sfloor - 3.0 * S, L * S - 0.1 * S, 0.12 * S, "none", "#CFCDEB", 1.5, "6 5");
    body += rect(x0 + lay.door.x * S, sfloor - 6.67 * S, lay.door.w * S, 6.67 * S, "#fff", C.navy, 3.5);
    body += line(x0 + (lay.door.x + lay.door.w - 0.3) * S, sfloor - 3.5 * S, x0 + (lay.door.x + lay.door.w - 0.3) * S, sfloor - 3.0 * S, C.navy, 5);
    body += text(x0 + (lay.door.x + lay.door.w / 2) * S, sfloor - 3.3 * S, "PUERTA", 14, { anchor: "middle", bold: true });
    body += text(x0 + (lay.door.x + lay.door.w / 2) * S, sfloor - 3.3 * S + 18, '36" × 80"', 13, { anchor: "middle", fill: C.text2 });
    y = sfloor + 70;

    // ----- Vista lateral exterior -----
    body += text(MARGIN, y, "4 · VISTA LATERAL (LADO DE SERVICIO)", 22, { bold: true });
    y += 30 + 1.4 * S;
    var gy0 = y + 10.5 * S; // linea de suelo
    var fl = gy0 - 1.7 * S; // piso del trailer
    var bt = fl - 7.6 * S;
    body += line(MARGIN, gy0, SHEET_W - MARGIN, gy0, C.steelD, 2);
    body += rect(x0, bt, L * S, fl - bt, "#FFFFFF", C.navy, 5, null, 8);
    body += rect(x0, bt, L * S, 0.5 * S, C.steel, C.navy, 2.5);
    body += rect(x0, fl - 0.3 * S, L * S, 0.3 * S, C.steel, C.navy, 2.5);
    // lanza y gato
    body += line(x0, fl - 0.15 * S, x0 - 3.4 * S, fl + 0.45 * S, C.navy, 5);
    body += line(x0 - 3.2 * S, fl + 0.45 * S, x0 - 3.2 * S, gy0 - 0.2 * S, C.navy, 4);
    body += rect(x0 - 3.45 * S, gy0 - 0.25 * S, 0.5 * S, 0.12 * S, C.navy);
    if (sys.propane) {
      body += rect(x0 - 2.1 * S, fl + 0.05 * S - 1.35 * S, 0.8 * S, 1.35 * S, C.light, C.navy, 2.5, null, 10);
      body += text(x0 - 1.7 * S, fl - 0.62 * S, "LP", 14, { anchor: "middle", bold: true });
    }
    // ruedas
    for (var wI = 0; wI < nAx; wI++) {
      var wcx = x0 + (L * 0.55 + (wI - (nAx - 1) / 2) * 2.6) * S;
      body += '<path d="M ' + (wcx - 1.45 * S) + " " + (fl + 0.05 * S) + " A " + 1.45 * S + " " + 1.45 * S + " 0 0 1 " + (wcx + 1.45 * S) + " " + (fl + 0.05 * S) + '" fill="none" stroke="' + C.navy + '" stroke-width="4"/>';
      body += '<circle cx="' + wcx + '" cy="' + (gy0 - 1.1 * S) + '" r="' + 1.1 * S + '" fill="#2a2a35" stroke="' + C.navy + '" stroke-width="3"/>';
      body += '<circle cx="' + wcx + '" cy="' + (gy0 - 1.1 * S) + '" r="' + 0.5 * S + '" fill="#cfd2e3"/>';
    }
    // ventanas, puerta, toldo abierto
    lay.wins.forEach(function (w) {
      var wx = x0 + w.x * S, wb = fl - 3.5 * S, wt = fl - 6.5 * S;
      body += rect(wx, wt, w.w * S, wb - wt, "rgba(91,84,255,0.10)", C.blue, 3.5);
      body += '<polygon points="' + (wx - 4) + "," + (wt - 4) + " " + (wx + w.w * S + 4) + "," + (wt - 4) + " " + (wx + w.w * S + 18) + "," + (wt - 0.7 * S) + " " + (wx - 18) + "," + (wt - 0.7 * S) + '" fill="rgba(91,84,255,0.22)" stroke="' + C.blue + '" stroke-width="2"/>';
      body += rect(wx - 0.2 * S, wb, w.w * S + 0.4 * S, 0.18 * S, C.steelD, C.navy, 2);
    });
    body += rect(x0 + lay.door.x * S, fl - 6.67 * S, lay.door.w * S, 6.67 * S, "#fff", C.navy, 3.5);
    body += text(x0 + (lay.door.x + lay.door.w / 2) * S, fl - 3.4 * S, "PUERTA", 13, { anchor: "middle", bold: true });
    // techo: A/C y extractor
    if (sys.ac) {
      var acX2 = x0 + Math.min(L - 3.2, Math.max((hood ? hood.x + hood.w : 0) + 0.8, L - 4.6)) * S;
      body += rect(acX2, bt - 0.75 * S, 2.6 * S, 0.75 * S, C.light, C.navy, 2.5, null, 5);
      body += text(acX2 + 1.3 * S, bt - 0.25 * S, "A/C", 15, { anchor: "middle", bold: true });
    }
    if (hood) {
      var ex = x0 + (hood.x + hood.w / 2) * S;
      body += rect(ex - 0.6 * S, bt - 0.6 * S, 1.2 * S, 0.6 * S, C.light, C.blue, 2.5, null, 4);
      body += text(ex, bt - 0.2 * S, "EXTRACTOR", 12, { anchor: "middle", fill: C.blue, bold: true });
    }
    body += text(x0 + L * S / 2, fl - 1.5 * S, "RÓTULO / WRAP SEGÚN DISEÑO", 16, { anchor: "middle", fill: C.border, bold: true });
    body += dimH(x0, x0 + L * S, gy0 + 40, "LARGO " + fmtFt(L), 15);
    y = gy0 + 90;

    // ----- Leyenda -----
    body += text(MARGIN, y, "5 · LISTA DE EQUIPO Y SISTEMAS", 22, { bold: true });
    y += 18;
    var colX = [MARGIN, MARGIN + 70, 760, 1090, 1350];
    var rowH = 44;
    body += rect(MARGIN, y, SHEET_W - MARGIN * 2, rowH, C.navy);
    ["#", "EQUIPO", "MEDIDAS REF. (A × F × H)", "SERVICIOS", state.showPrices ? "PRECIO" : "CAMPANA"].forEach(function (h, i) {
      body += text(colX[i] + 14, y + 29, h, 16, { fill: "#fff", bold: true });
    });
    y += rowH;
    placed.forEach(function (p, i) {
      body += rect(MARGIN, y, SHEET_W - MARGIN * 2, rowH, i % 2 === 0 ? C.light : "#fff", C.border, 1);
      body += badge(colX[0] + 28, y + rowH / 2, p.num, 14);
      body += text(colX[1] + 14, y + 29, p.name, 18, { fill: C.ink });
      body += text(colX[2] + 14, y + 29, Math.round(p.w * 12) + '" × ' + Math.round(p.d * 12) + '" × ' + Math.round(p.h * 12) + '"', 18, { fill: C.ink });
      body += text(colX[3] + 14, y + 29, p.util.join(" · ") || "—", 18, { fill: C.ink });
      body += text(colX[4] + 14, y + 29, state.showPrices ? money(p.price) : p.hood ? "Sí" : "—", 18, { fill: C.ink });
      y += rowH;
    });
    if (!placed.length) {
      body += rect(MARGIN, y, SHEET_W - MARGIN * 2, rowH, "#fff", C.border, 1);
      body += text(MARGIN + 14, y + 29, "Sin equipo en la pared de cocina todavía.", 18, { fill: C.text2 });
      y += rowH;
    }
    y += 24;
    var sysOn = SYSTEMS.filter(function (s) { return sys[s.id]; }).map(function (s) { return s.label; });
    var extra = "Ventanas de servicio: " + state.windows + "  ·  Puerta: " + (state.door === "right" ? "derecha" : "izquierda") + "  ·  Ejes: " + nAx;
    body += text(MARGIN, y, "Sistemas incluidos:", 18, { bold: true });
    var sl = wrap(sysOn.length ? sysOn.join("  ·  ") : "ninguno seleccionado", SHEET_W - MARGIN * 2 - 220, 18);
    sl.forEach(function (ln, i) { body += text(MARGIN + 200, y + i * 24, ln, 18, { fill: C.ink }); });
    y += Math.max(1, sl.length) * 24 + 8;
    body += text(MARGIN, y, extra, 18, { fill: C.ink });
    y += 44;
    body += text(MARGIN, y, "Boceto de referencia para ventas, no es plano de ingeniería. Las medidas del equipo son de referencia: confirmar con la ficha del fabricante.", 15, { fill: C.text2 });
    y += 70;
    var sigW = 340;
    body += line(SHEET_W - MARGIN - sigW * 2 - 50, y, SHEET_W - MARGIN - sigW - 50, y, C.navy, 1.5);
    body += text(SHEET_W - MARGIN - sigW * 1.5 - 50, y + 22, "FIRMA CLIENTE", 14, { anchor: "middle", fill: C.text2 });
    body += line(SHEET_W - MARGIN - sigW, y, SHEET_W - MARGIN, y, C.navy, 1.5);
    body += text(SHEET_W - MARGIN - sigW / 2, y + 22, "REPRESENTANTE TRYLA", 14, { anchor: "middle", fill: C.text2 });
    y += 60;
    body += rect(0, y, SHEET_W, 56, C.navy);
    body += text(MARGIN, y + 35, "Marcelo Ramos Schiaffino · +1 (645) 235-3186 · marcelo.ramos@thetryla.com", 18, { fill: "#fff", bold: true });
    body += text(SHEET_W - MARGIN, y + 35, "1111 Ellenwood St, Dallas, TX 75217", 16, { fill: C.border, anchor: "end" });
    y += 56;

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + SHEET_W + " " + y + '" width="' + SHEET_W + '" height="' + y + '" font-family="' + FONT + '"><rect width="' + SHEET_W + '" height="' + y + '" fill="#fff"/>' + body + "</svg>";
  }

  // ============================================================
  //  UI de la pestana Blueprint
  // ============================================================
  var state = null;
  var els = {};
  var SIZES = (typeof TRAILER_SIZES !== "undefined") ? TRAILER_SIZES : [];
  var CATALOG = (typeof COMPONENT_CATALOG !== "undefined") ? COMPONENT_CATALOG : [];
  var EQUIP_CATS = ["Equipo de cocina", "Refrigeracion / Hielo", "Fregaderos / Plomeria"];

  function catalogItems(cats) {
    var out = [];
    CATALOG.forEach(function (c) { if (cats.indexOf(c.category) !== -1) c.items.forEach(function (i) { out.push(i); }); });
    return out;
  }
  function catalogPrice(name) {
    for (var i = 0; i < CATALOG.length; i++) {
      var its = CATALOG[i].items;
      for (var j = 0; j < its.length; j++) if (its[j].name === name) return its[j].price || 0;
    }
    return 0;
  }
  function savedPrice(name) {
    try {
      var sp = JSON.parse(localStorage.getItem("novaCatalogPrices") || "{}");
      if (sp && typeof sp[name] === "number") return sp[name];
    } catch (e) { /* sin storage */ }
    return catalogPrice(name);
  }
  function currentSize() {
    return SIZES.filter(function (s) { return s.id === state.sizeId; })[0] || SIZES[0];
  }
  function baseUnitName(size) {
    return "8' x " + size.length + "' Food Trailer - Unidad base";
  }
  function newItem(name) {
    return { name: name, w: specFor(name).w, price: savedPrice(name) };
  }
  function defaultSys() {
    return { ac: true, heater: true, tanks: true, propane: true, generator: false, fss: true };
  }
  function presetRTG() {
    return {
      sizeId: "16x8", titulo: "Food Trailer 16' × 8' · Ready-to-Go",
      items: [
        newItem("Plancha 36\" acero inoxidable"), newItem("Estufa 2 quemadores"),
        newItem("Freidora doble canasta 40 lb"), Object.assign(newItem("Mesa de vapor 4 espacios con tapas"), { w: 1.5 }),
        newItem("Fregadero 3 tarjas + lavamanos"),
      ],
      hoodFt: 8,
      sys: { ac: true, heater: true, tanks: true, propane: true, generator: false, fss: true },
      windows: 2, door: "left", axles: 2, cliente: "", folio: "", showPrices: false,
    };
  }
  function presetStandard(sizeId) {
    var size = SIZES.filter(function (s) { return s.id === sizeId; })[0] || SIZES[0];
    var names = (size.equipment && size.equipment.back ? size.equipment.back : []).map(function (e) {
      // convierte el nombre del catalogo de tamanos al mas parecido del catalogo de precios
      var all = catalogItems(EQUIP_CATS);
      var exact = all.filter(function (i) { return i.name === e.name; })[0];
      if (exact) return exact.name;
      var key = e.name.toLowerCase().split(" ").slice(0, 2).join(" ");
      var near = all.filter(function (i) { return i.name.toLowerCase().indexOf(key) === 0; })[0];
      return near ? near.name : e.name;
    });
    return {
      sizeId: size.id, titulo: "Food Trailer " + size.label,
      items: names.map(newItem), sys: defaultSys(),
      windows: size.serviceWindows || 1, door: "left", axles: size.axles || 2, cliente: "", folio: "", showPrices: false,
    };
  }

  function totals() {
    var size = currentSize();
    var rows = [];
    var base = savedPrice(baseUnitName(size));
    rows.push({ name: baseUnitName(size), price: base });
    state.items.forEach(function (it) { rows.push({ name: it.name, price: it.price || 0 }); });
    SYSTEMS.forEach(function (s) { if (state.sys[s.id]) rows.push({ name: s.catalog, price: savedPrice(s.catalog) }); });
    var total = rows.reduce(function (a, r) { return a + (r.price || 0); }, 0);
    return { rows: rows, total: total };
  }

  function renderControls() {
    var size = currentSize();
    els.size.innerHTML = SIZES.map(function (s) {
      return '<option value="' + esc(s.id) + '"' + (s.id === state.sizeId ? " selected" : "") + ">" + esc(s.label) + "</option>";
    }).join("");
    els.win.value = String(state.windows);
    els.door.value = state.door;
    els.axles.value = String(state.axles);
    els.hood.value = state.hoodFt > 0 ? String(state.hoodFt) : "";
    els.cliente.value = state.cliente;
    els.folio.value = state.folio;
    els.showPrices.checked = !!state.showPrices;

    var list = els.items;
    list.innerHTML = "";
    state.items.forEach(function (it, i) {
      var row = document.createElement("div");
      row.className = "bp-row";
      row.innerHTML =
        '<span class="bp-num">' + (i + 1) + "</span>" +
        '<span class="bp-name">' + esc(it.name) + "</span>" +
        '<label class="bp-mini">Ancho (ft)<input type="number" step="0.25" min="0.5" value="' + esc(it.w) + '" data-k="w"></label>' +
        '<label class="bp-mini">Precio<input type="number" step="50" min="0" value="' + esc(it.price) + '" data-k="price"></label>' +
        '<span class="bp-btns"><button type="button" data-a="up" title="Subir">↑</button><button type="button" data-a="down" title="Bajar">↓</button><button type="button" data-a="del" title="Quitar">✕</button></span>';
      row.querySelectorAll("input").forEach(function (inp) {
        inp.addEventListener("input", function () {
          var v = parseFloat(inp.value);
          it[inp.dataset.k] = isNaN(v) ? 0 : v;
          refresh(false);
        });
      });
      row.querySelectorAll("button").forEach(function (b) {
        b.addEventListener("click", function () {
          var a = b.dataset.a;
          if (a === "del") state.items.splice(i, 1);
          if (a === "up" && i > 0) { var t = state.items[i - 1]; state.items[i - 1] = state.items[i]; state.items[i] = t; }
          if (a === "down" && i < state.items.length - 1) { var t2 = state.items[i + 1]; state.items[i + 1] = state.items[i]; state.items[i] = t2; }
          refresh(true);
        });
      });
      list.appendChild(row);
    });
    if (!state.items.length) list.innerHTML = '<div class="hint">Sin equipo todavía. Agrega equipo con el selector de abajo.</div>';

    els.sys.innerHTML = "";
    SYSTEMS.forEach(function (s) {
      var lab = document.createElement("label");
      lab.className = "bp-check";
      lab.innerHTML = '<input type="checkbox"' + (state.sys[s.id] ? " checked" : "") + "> " + esc(s.label);
      lab.querySelector("input").addEventListener("change", function (e) { state.sys[s.id] = e.target.checked; refresh(false); });
      els.sys.appendChild(lab);
    });
    void size;
  }

  function renderTotals() {
    var t = totals();
    var pl = placeItems(state, currentSize().length);
    var html = '<table class="crm bp-table"><tbody>' +
      t.rows.map(function (r) { return "<tr><td>" + esc(r.name) + '</td><td style="text-align:right">' + (r.price ? money(r.price) : "—") + "</td></tr>"; }).join("") +
      '<tr class="bp-total"><td>Total</td><td style="text-align:right">' + money(t.total) + "</td></tr></tbody></table>";
    if (t.rows.some(function (r) { return !r.price; })) html += '<div class="hint">Los renglones en "—" no tienen precio en el catálogo: escríbelo en el equipo o en el catálogo del Cotizador.</div>';
    els.totals.innerHTML = html;
    els.fit.textContent = pl.free < -0.01
      ? "⚠ El equipo suma " + fmtFt(pl.used) + " y la pared mide " + fmtFt(currentSize().length - 1) + ". No cabe."
      : "Equipo " + fmtFt(pl.used) + " de " + fmtFt(currentSize().length - 1) + " · libre " + fmtFt(Math.max(0, pl.free));
    els.fit.className = "bp-fit" + (pl.free < -0.01 ? " bad" : "");
  }

  function refresh(rebuildControls) {
    var size = currentSize();
    if (rebuildControls) renderControls();
    els.preview.innerHTML = renderSheet(state, size);
    renderTotals();
  }

  function sheetSvgString() {
    return renderSheet(state, currentSize());
  }

  function fetchFontB64(url) {
    return fetch(url).then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (buf) {
      if (!buf) return "";
      var bytes = new Uint8Array(buf), bin = "";
      for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin);
    }).catch(function () { return ""; });
  }
  function downloadPng() {
    var base = "../assets/fonts-pdf/";
    Promise.all([fetchFontB64(base + "Barlow-400.ttf"), fetchFontB64(base + "Barlow-700.ttf")]).then(function (f) {
      var css = "";
      if (f[0]) css += "@font-face{font-family:Barlow;font-weight:400;src:url(data:font/ttf;base64," + f[0] + ")}";
      if (f[1]) css += "@font-face{font-family:Barlow;font-weight:700;src:url(data:font/ttf;base64," + f[1] + ")}";
      var svg = sheetSvgString().replace("<rect width=", "<defs><style>" + css + "</style></defs><rect width=");
      var m = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);
      var w = parseInt(m[1], 10), h = parseInt(m[2], 10);
      var img = new Image();
      img.onload = function () {
        var cv = document.createElement("canvas");
        cv.width = w * 2; cv.height = h * 2;
        var ctx = cv.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        cv.toBlob(function (blob) {
          var a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "tryla-blueprint-" + state.sizeId + ".png";
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
        }, "image/png");
      };
      img.onerror = function () { alert("No se pudo generar el PNG en este navegador."); };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    });
  }
  function printSheet() {
    var w = window.open("", "_blank");
    if (!w) { alert("El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para este sitio."); return; }
    var base = location.href.replace(/crm\/.*$/, "assets/fonts-pdf/");
    w.document.write(
      "<!doctype html><html><head><meta charset=utf-8><title>Blueprint " + esc(state.sizeId) + "</title><style>" +
      "@font-face{font-family:Barlow;font-weight:400;src:url(" + base + "Barlow-400.ttf)}" +
      "@font-face{font-family:Barlow;font-weight:700;src:url(" + base + "Barlow-700.ttf)}" +
      "@page{size:letter portrait;margin:6mm}html,body{margin:0}svg{width:100%;height:auto}</style></head><body>" +
      sheetSvgString() + "</body></html>"
    );
    w.document.close();
    w.focus();
    setTimeout(function () { w.print(); }, 500);
  }
  function addToQuote() {
    var api = window.TrylaQuote;
    if (!api || !api.addLineItem) { alert("El cotizador no está listo todavía."); return; }
    var t = totals();
    t.rows.forEach(function (r) { api.addLineItem(r.name, r.price || 0, 1); });
    if (state.cliente && api.setClient) api.setClient(state.cliente);
    if (api.switchTab) api.switchTab("quote");
  }

  function init() {
    var root = document.getElementById("tab-blueprint");
    if (!root || !SIZES.length) return;
    els.size = document.getElementById("bpSize");
    els.win = document.getElementById("bpWindows");
    els.door = document.getElementById("bpDoor");
    els.axles = document.getElementById("bpAxles");
    els.hood = document.getElementById("bpHood");
    els.cliente = document.getElementById("bpCliente");
    els.folio = document.getElementById("bpFolio");
    els.showPrices = document.getElementById("bpShowPrices");
    els.items = document.getElementById("bpItems");
    els.sys = document.getElementById("bpSystems");
    els.add = document.getElementById("bpAddSelect");
    els.totals = document.getElementById("bpTotals");
    els.fit = document.getElementById("bpFit");
    els.preview = document.getElementById("bpPreview");

    els.add.innerHTML = '<option value="">Agregar equipo…</option>' + catalogItems(EQUIP_CATS).map(function (i) {
      return '<option value="' + esc(i.name) + '">' + esc(i.name) + "</option>";
    }).join("");

    state = presetRTG();
    els.size.addEventListener("change", function () {
      var keep = state.items;
      state.sizeId = els.size.value;
      var sz = currentSize();
      state.windows = Math.min(state.windows, 3) || sz.serviceWindows || 1;
      state.axles = sz.axles || 2;
      state.titulo = "Food Trailer " + sz.label;
      void keep;
      refresh(true);
    });
    els.win.addEventListener("change", function () { state.windows = parseInt(els.win.value, 10); refresh(false); });
    els.door.addEventListener("change", function () { state.door = els.door.value; refresh(false); });
    els.hood.addEventListener("input", function () { var v = parseFloat(els.hood.value); state.hoodFt = isNaN(v) ? 0 : v; refresh(false); });
    els.axles.addEventListener("change", function () { state.axles = parseInt(els.axles.value, 10) || 2; refresh(false); });
    els.cliente.addEventListener("input", function () { state.cliente = els.cliente.value; refresh(false); });
    els.folio.addEventListener("input", function () { state.folio = els.folio.value; refresh(false); });
    els.showPrices.addEventListener("change", function () { state.showPrices = els.showPrices.checked; refresh(false); });
    els.add.addEventListener("change", function () {
      if (!els.add.value) return;
      state.items.push(newItem(els.add.value));
      els.add.value = "";
      refresh(true);
    });
    document.getElementById("bpPresetRTG").addEventListener("click", function () { state = presetRTG(); refresh(true); });
    document.getElementById("bpPresetStd").addEventListener("click", function () {
      var keepC = state.cliente, keepF = state.folio;
      state = presetStandard(state.sizeId);
      state.cliente = keepC; state.folio = keepF;
      refresh(true);
    });
    document.getElementById("bpPng").addEventListener("click", downloadPng);
    document.getElementById("bpPrint").addEventListener("click", printSheet);
    document.getElementById("bpAddQuote").addEventListener("click", addToQuote);
    refresh(true);
  }

  window.TrylaBlueprint = {
    specFor: specFor,
    renderSheet: renderSheet,
    getState: function () { return state; },
    refresh: function () { if (state) refresh(true); },
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
