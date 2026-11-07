/* Idioma de la interfaz del CRM (ES/EN). Solo traduce la UI; NO toca la cotizacion
   (idioma de la cotizacion = #langToggle/#fIdioma, vista previa, PDF, catalogo ni datos). */
(function () {
  "use strict";
  var KEY = "crmUiLang";
  var D = {
    "Cotizador": "Quote Builder", "Clientes": "Clients", "Pipeline": "Pipeline", "Tareas": "Tasks",
    "Cotizaciones": "Quotes", "Blueprints": "Blueprints", "Location Intelligence": "Location Intelligence",
    "Financiamiento": "Financing", "Invoices": "Invoices", "Sitios Web": "Websites", "Resumen": "Summary",
    "Sitio": "Site", "Portal de clientes": "Client portal", "Navegacion principal": "Main navigation",
    "C R M  —  I N T E R N O": "C R M  —  I N T E R N A L",
    "Cotizacion rapida": "Quick quote",
    "Escribe el nombre de un componente (te sugiere del catalogo mientras escribes) y agregalo con su precio en un clic. Si no existe, se agrega como linea nueva.": "Type a component name (it suggests from the catalog as you type) and add it with its price in one click. If it doesn't exist, it is added as a new line.",
    "+ Agregar": "+ Add", "+ Agregar campo": "+ Add field", "+ Agregar cliente": "+ Add client",
    "+ Agregar linea personalizada": "+ Add custom line", "+ Agregar paso": "+ Add step", "+ Agregar platillo": "+ Add dish",
    "+ Incluir en cotización": "+ Include in quote", "+ Registrar pago": "+ Record payment", "+ Agregar nota": "+ Add note",
    "+ Agregar tarea": "+ Add task", "+ Finance": "+ Finance",
    "-- nuevo cliente --": "-- new client --", "-- selecciona una cotizacion --": "-- select a quote --",
    "-- selecciona una cotizacion guardada --": "-- select a saved quote --", "-- seleccionar tamano --": "-- select size --",
    "Accion": "Action", "Actividad reciente": "Recent activity", "Actualizado": "Updated",
    "Agrega campos extra que necesites guardar por cliente, ej. \"Presupuesto estimado\" o \"Tamano de trailer\".": "Add extra fields you need to store per client, e.g. \"Estimated budget\" or \"Trailer size\".",
    "Ajuste demográfico": "Demographic fit", "Analizar una ubicación": "Analyze a location", "Analizar →": "Analyze →",
    "Análisis guardados": "Saved analyses",
    "Arrastra el icono ⠇ para reordenar los componentes.": "Drag the ⠇ icon to reorder components.",
    "Arrastra una tarjeta a otra columna para cambiar su etapa, o usa el selector rapido dentro de la tarjeta. Click en una tarjeta para ver toda su info. El valor de cada columna suma las cotizaciones abiertas (sin invoice) de esos clientes.": "Drag a card to another column to change its stage, or use the quick selector inside the card. Click a card to see all its info. Each column's value adds up the open quotes (without invoice) of those clients.",
    "Asignado a": "Assigned to", "Asiática": "Asian", "Avisos de hoy": "Today's reminders", "BBQ": "BBQ",
    "Brecha de cocina (gap)": "Kitchen gap",
    "Buscar por cliente o numero...": "Search by client or number...", "Buscar por cliente o texto de la tarea...": "Search by client or task text...",
    "Buscar por nombre o subdominio...": "Search by name or subdomain...", "Buscar por nombre, negocio, ciudad, contacto...": "Search by name, business, city, contact...",
    "Buscar por nombre, negocio, ciudad...": "Search by name, business, city...",
    "Cada restaurante obtiene su propio sitio en": "Each restaurant gets its own site at",
    "Café / Postres": "Café / Desserts", "Campos personalizados": "Custom fields", "Cancelar edicion": "Cancel editing",
    "Cant.": "Qty.", "Capital": "Principal", "Capital a financiar (USD)": "Amount to finance (USD)",
    "Cargar specs de un tamano como lineas con precio": "Load a size's specs as priced lines",
    "Cash": "Cash", "Catalogo de componentes": "Component catalog", "Cerrar": "Close", "Ciudad": "City", "Ciudad / Estado": "City / State",
    "Ciudad / Fuente": "City / Source", "Cliente": "Client", "Cliente (CRM)": "Client (CRM)", "Cliente / lead (opcional)": "Client / lead (optional)",
    "Clientes por estatus": "Clients by status", "Closed": "Closed", "Cocina": "Kitchen", "Cold": "Cold", "Componente": "Component",
    "Componentes de la cotizacion": "Quote components", "Concepto": "Item", "Concepto / metodo (opcional)": "Item / method (optional)",
    "Contacto": "Contact", "Convertir a invoice": "Convert to invoice", "Convertir cotizacion a invoice": "Convert quote to invoice",
    "Correo": "Email", "Cotizacion": "Quote", "Cotizacion (sin invoice todavia)": "Quote (no invoice yet)",
    "Crear / editar plan de financiamiento": "Create / edit financing plan",
    "Cuentales de que se trata el restaurante...": "Tell them what the restaurant is about...",
    "Datos de la cotizacion": "Quote details", "Descripcion": "Description", "Desde": "From", "Dias promedio": "Average days",
    "Dias promedio que un cliente permanece en cada etapa antes de avanzar (o desde que entro, si sigue ahi).": "Average days a client stays in each stage before moving on (or since entering, if still there).",
    "Direccion / ubicacion": "Address / location", "Dirección": "Address", "Dirección o zona a evaluar": "Address or area to evaluate",
    "Donde encuentran el trailer": "Where to find the trailer", "Accion ": "Action",
    "Editar en Cotizador": "Edit in Quote Builder", "Ej. 1200 Main St, Dallas, TX": "E.g. 1200 Main St, Dallas, TX",
    "Ej. Abono en efectivo, transferencia...": "E.g. Cash payment, transfer...", "Ej. Freidora doble canasta 60 lb": "E.g. Double-basket fryer 60 lb",
    "Ej. Presupuesto estimado": "E.g. Estimated budget", "Ej. Seguimiento estandar": "E.g. Standard follow-up",
    "Ej. Tacos, Pizza, Mariscos...": "E.g. Tacos, Pizza, Seafood...",
    "El catalogo se muestra en el idioma seleccionado en \"Idioma de la cotizacion\". Cambialo a English y los equipos se agregan en ingles.": "The catalog is shown in the language selected in \"Quote language\". Switch it to English and equipment is added in English.",
    "El financiamiento y los pagos/invoice de esta cotizacion se manejan en las pestañas": "Financing and payments/invoice for this quote are handled in the tabs",
    "Embudo de conversion": "Conversion funnel", "Entendido": "Got it", "Entrega (ciudad, estado)": "Delivery (city, state)",
    "Eslogan": "Tagline", "Espacio vs. competencia": "Space vs. competition", "Estatus": "Status",
    "Estatus en el pipeline": "Pipeline status", "Etapa": "Stage", "Exportar CSV": "Export CSV", "Facebook": "Facebook",
    "Fecha": "Date", "Fecha del pago": "Payment date", "Fecha/hora": "Date/time", "Filtrar...": "Filter...", "Filtros": "Filters",
    "Finance": "Finance",
    "Financiamiento propio de Tryla (no un tercero). Elige una cotizacion guardada y define su plan. Metodo add-on: el interes total se calcula sobre el capital y se reparte en partes iguales entre los meses del plazo.": "Tryla's own financing (not a third party). Pick a saved quote and define its plan. Add-on method: total interest is computed on the principal and split evenly across the months of the term.",
    "Foto actual:": "Current photo:", "Foto principal (hero)": "Main photo (hero)", "Fuente": "Source",
    "Galeria de fotos (puedes seleccionar varias)": "Photo gallery (you can select several)", "Garantia": "Warranty",
    "Generar cotizacion": "Generate quote", "Generar invoice / estado de cuenta": "Generate invoice / statement",
    "Guardar análisis": "Save analysis", "Guardar cotizacion": "Save quote", "Guardar plan": "Save plan",
    "Guardar secuencia": "Save sequence", "Guardar sitio": "Save site", "HOT": "HOT", "Hamburguesas": "Burgers", "Hasta": "To",
    "Haz click en cualquier punto del mapa para analizarlo, o escribe una dirección arriba. Los íconos muestran los lugares reales cercanos.": "Click any point on the map to analyze it, or type an address above. Icons show real nearby places.",
    "Historial local de ubicaciones evaluadas para leads y clientes.": "Local history of locations evaluated for leads and clients.",
    "Horario": "Hours", "Idioma de la cotizacion": "Quote language", "Cambiar idioma de la cotizacion": "Change quote language",
    "Importar CSV": "Import CSV", "Imprimir / Guardar PDF": "Print / Save PDF", "Imprimir / PDF": "Print / PDF",
    "Incluir esta tabla de amortizacion (Exhibit C) en el PDF de la cotizacion": "Include this amortization table (Exhibit C) in the quote PDF",
    "Incluye kit del trailer": "Includes trailer kit", "Instagram": "Instagram", "Interes": "Interest", "Interes total": "Total interest",
    "Invoices / saldos por cliente": "Invoices / balances by client", "Kit Classic (con fotos del trailer)": "Classic kit (with trailer photos)",
    "Leads por fuente": "Leads by source", "Limpiar": "Clear", "Limpiar todo": "Clear all", "Logo": "Logo", "Logo actual:": "Current logo:",
    "Los 5 invoices con mas saldo por cobrar.": "The 5 invoices with the highest balance due.",
    "Lost": "Lost", "Mapa de ubicaciones": "Location map", "Mariscos": "Seafood", "Mayores saldos pendientes": "Largest outstanding balances",
    "Menu": "Menu", "Mes": "Month", "Mis leads": "My leads",
    "Mismo motor de datos reales que la app del cliente: lugares reales cercanos (Supabase), censo real por tract, y mapa real de OpenStreetMap. Si no hay cobertura de datos para la zona, cae automaticamente a un estimado ilustrativo.": "Same real-data engine as the client app: real nearby places (Supabase), real census by tract, and a real OpenStreetMap map. If there is no data coverage for the area, it automatically falls back to an illustrative estimate.",
    "Monto": "Amount", "Monto (USD)": "Amount (USD)", "Mostrar zonas de oportunidad (8-10) para esta cocina": "Show opportunity zones (8-10) for this kitchen",
    "Más": "More", "Más secciones": "More sections", "Negocio": "Business", "No.": "No.", "No. de cotizacion": "Quote no.",
    "Nombre": "Name", "Nombre de la secuencia": "Sequence name", "Nombre del campo": "Field name", "Nombre del cliente": "Client name",
    "Nombre del restaurante": "Restaurant name", "Notas": "Notes", "Notas / especificaciones adicionales (sin precio)": "Additional notes / specifications (no price)",
    "Notas sobre el cliente, tamano de interes, etc.": "Notes about the client, size of interest, etc.",
    "Nuevo cliente": "New client", "Nuevo sitio web": "New website", "Numero": "Number", "Opportunity Score": "Opportunity Score",
    "Otro / General": "Other / General", "Pagado": "Paid", "Pago": "Payment", "Pago mensual": "Monthly payment",
    "Pagos de la invoice": "Invoice payments", "Periodo": "Period", "Pipeline (cotizaciones sin invoice)": "Pipeline (quotes without invoice)",
    "Pipeline de leads": "Lead pipeline", "Pipeline y ventas": "Pipeline & sales", "Pizza": "Pizza",
    "Planes de financiamiento activos": "Active financing plans", "Plantilla": "Template",
    "Plantillas de tareas encadenadas (ej. llamar el dia 0, correo el dia 2, llamar de nuevo el dia 5...) que puedes aplicar a cualquier cliente desde su ficha -- crean tareas con fecha, no envian nada automaticamente.": "Chained task templates (e.g. call on day 0, email on day 2, call again on day 5...) you can apply to any client from their profile -- they create dated tasks, they don't send anything automatically.",
    "Plazo (meses)": "Term (months)", "Porcentaje de clientes que ha llegado a cada etapa del pipeline.": "Percentage of clients that have reached each pipeline stage.",
    "Precio": "Price", "Principal": "Main", "Publicado (visible al publico)": "Published (publicly visible)", "Quien": "Who",
    "Radio de analisis: 1.5 millas (3 millas de diametro). Click en el mapa para elegir otro punto.": "Analysis radius: 1.5 miles (3-mile diameter). Click the map to pick another point.",
    "Restaurante": "Restaurant", "Saldo": "Balance", "Saldo pendiente total": "Total outstanding balance", "Saldo restante": "Remaining balance",
    "Score": "Score", "Secuencias de seguimiento": "Follow-up sequences", "Sitio thetryla.com": "thetryla.com site", "Sitios": "Sites",
    "Solo cotizaciones ya convertidas a invoice.": "Only quotes already converted to invoice.", "Subdominio": "Subdomain", "Subtotal": "Subtotal",
    "Tacos / Mexicana": "Tacos / Mexican", "Tareas y recordatorios": "Tasks & reminders", "Tasa / Plazo": "Rate / Term",
    "Tasa add-on (%)": "Add-on rate (%)", "Tel. o correo": "Phone or email", "Telefono": "Phone", "Telefono / Email": "Phone / Email",
    "Texto": "Text", "Tiempo promedio por etapa": "Average time per stage", "TikTok": "TikTok", "Tipo": "Type", "Tipo de cocina": "Cuisine type",
    "Todas": "All", "Todas las tareas pendientes de todos los clientes, ordenadas por fecha limite. Marca el check cuando la termines.": "All pending tasks for all clients, sorted by due date. Tick the check when you finish.",
    "Todo el tiempo": "All time", "Todos": "All", "Todos los leads": "All leads", "Total": "Total", "Total a pagar": "Total to pay",
    "Total a pagar (financiado)": "Total to pay (financed)", "Total cobrado": "Total collected", "Total de la venta": "Sale total",
    "Total facturado": "Total invoiced", "Total pagado (deposito + abonos)": "Total paid (deposit + payments)", "Total venta": "Sale total",
    "Trash": "Trash", "Tráfico peatonal & demanda": "Foot traffic & demand", "Ultimas acciones registradas (quien y cuando).": "Latest recorded actions (who and when).",
    "Ultimo mes": "Last month", "Ultimos 3 meses": "Last 3 months", "Ultimos 7 dias": "Last 7 days",
    "Una cotizacion NO se convierte en invoice automaticamente. Elige una cotizacion guardada (solo se muestran las que aun no tienen invoice) y conviertela, o registra directamente su primer pago para convertirla al instante.": "A quote is NOT converted to an invoice automatically. Pick a saved quote (only those without an invoice are shown) and convert it, or record its first payment directly to convert it instantly.",
    "Una linea por nota/especificacion (se muestran sin precio en la cotizacion)": "One line per note/specification (shown without price in the quote)",
    "Valor": "Value", "Vegana / Saludable": "Vegan / Healthy", "Ver completadas": "View completed", "Ver todas las tareas": "View all tasks",
    "Vista de solo lectura del pipeline completo.": "Read-only view of the full pipeline.", "Vista del pipeline": "Pipeline view",
    "Vista previa Exhibit C": "Exhibit C preview", "Warm": "Warm", "correo del vendedor": "salesperson email", "ver": "view",
    "↻ Usar saldo restante": "↻ Use remaining balance", "▦ Tablero": "▦ Board", "☰ Lista": "☰ List",
    "(despues de guardarla).": "(after saving it).", "Cerrar ": "Close",
    "Aplicar": "Apply", "Aplicar secuencia...": "Apply sequence...", "Cargar": "Load",
    "Cliente existente: su etapa se cambia desde el Pipeline.": "Existing client: change their stage from the Pipeline.",
    "Correos": "Emails", "Duplicar": "Duplicate", "Editar": "Edit", "Editar cliente": "Edit client", "Editar plan": "Edit plan",
    "Eliminar": "Delete", "Eliminar invoice": "Delete invoice", "Guardar": "Save", "Guardar cambios": "Save changes", "Guardar nota": "Save note",
    "Historial de notas": "Note history", "Llamadas": "Calls", "Nota de la llamada": "Call note", "Notas de perfil": "Profile notes",
    "Portal de Fundadores": "Founders portal", "Registrar pago": "Record payment", "Resultado de la llamada": "Call result",
    "Sin actividad registrada todavia": "No activity recorded yet", "Sin clientes todavia": "No clients yet",
    "Sin cotizaciones guardadas todavia": "No saved quotes yet", "Sin cotizaciones todavia": "No quotes yet", "Sin datos": "No data",
    "Sin invoices todavia. Convierte una cotizacion o registra su primer pago arriba.": "No invoices yet. Convert a quote or record its first payment above.",
    "Sin leads aqui": "No leads here", "Sin leads todavia": "No leads yet", "Sin notas en el historial todavia": "No notes in the history yet",
    "Sin resultados para tu busqueda": "No results for your search", "Sin saldos pendientes": "No outstanding balances",
    "Sin secuencias guardadas todavia": "No saved sequences yet", "Sin tareas todavia": "No tasks yet",
    "Telefono / contacto": "Phone / contact", "Valor en pipeline": "Pipeline value", "Valor:": "Value:", "Ver Exhibit C": "View Exhibit C",
    "Ver invoice": "View invoice", "dias": "days",
    "✅ Contestó": "✅ Answered", "✉️ Registrar correo": "✉️ Log email", "🏦 Financiamiento": "🏦 Financing", "📝 Dejar nota": "📝 Leave note",
    "📞 Llamar": "📞 Call", "📞 Registrar llamada": "📞 Log call", "📬 Buzón": "📬 Voicemail", "🔇 No contestó": "🔇 No answer",
    "🧾 Hacer cotizacion": "🧾 Make quote",
    // pipeline / estados
    "Nuevo": "New", "Contactado": "Contacted", "Cotizado": "Quoted", "Negociacion": "Negotiation", "Negociación": "Negotiation",
    "Ganado": "Won", "Perdido": "Lost", "Caliente": "Hot", "Tibio": "Warm", "Frio": "Cold", "Frío": "Cold",
    // alerts / confirm
    "Agrega al menos un paso con texto": "Add at least one step with text",
    "Compartir requiere estar conectado a la nube (Supabase).": "Sharing requires a cloud connection (Supabase).",
    "Cotizacion guardada.": "Quote saved.", "El archivo esta vacio.": "The file is empty.",
    "Escribe el nombre de la secuencia": "Enter the sequence name", "Escribe el nombre del campo": "Enter the field name",
    "Escribe el nombre del cliente": "Enter the client name", "Escribe un monto de pago mayor a cero.": "Enter a payment amount greater than zero.",
    "Plan de financiamiento guardado en la cotizacion.": "Financing plan saved to the quote.",
    "Selecciona o convierte una cotizacion primero.": "Select or convert a quote first.",
    "Selecciona una cotizacion para convertir.": "Select a quote to convert.", "Selecciona una cotizacion primero.": "Select a quote first.",
    "Captura capital, tasa add-on y plazo (mayores a cero) para calcular el plan de financiamiento antes de generar el Exhibit C.": "Enter principal, add-on rate and term (greater than zero) to compute the financing plan before generating Exhibit C.",
    "Esto borrara los datos de la cotizacion actual (no afecta el catalogo, clientes ni cotizaciones guardadas). Continuar?": "This will clear the current quote's data (it doesn't affect the catalog, clients or saved quotes). Continue?",
    "El CSV debe tener una columna 'Nombre' (usa el mismo formato que 'Exportar CSV').": "The CSV must have a 'Nombre' column (use the same format as 'Export CSV').",
    // Blueprints
    "Seleccionar / mover": "Select / move", "⬉ Mover": "⬉ Move", "✎ Lápiz": "✎ Pencil", "╱ Línea": "╱ Line", "➜ Flecha": "➜ Arrow",
    "▭ Cuadro": "▭ Box", "◯ Elipse": "◯ Ellipse", "T Texto": "T Text", "Buscar componente…": "Search component…",
    "Pared según el equipo": "Wall by equipment", "Pared derecha": "Right wall", "Pared izquierda": "Left wall",
    "Lista y total": "List & total", "Mostrar precios en la hoja": "Show prices on the sheet", "Agregar a la cotización": "Add to quote",
    "Hoja": "Sheet", "Título": "Title", "Guardar y exportar": "Save & export", "Descargar PNG": "Download PNG",
    "Borrar": "Delete", "Abrir": "Open", "Hoja nueva": "New sheet", "Molde desde la cotización": "Mold from quote", "Exportar .json": "Export .json",
    "Línea": "Line", "Relleno": "Fill", "Grosor": "Width", "punteada": "dashed", "sin": "none", "Línea punteada": "Dashed line", "Sin relleno": "No fill",
    "Rectángulo": "Rectangle", "Duplicar ": "Duplicate", "Al frente": "To front", "Al fondo": "To back"
  };
  // Cotizaciones guardadas -> ahora solo "Cotizaciones" (se traduce igual)
  D["Cotizaciones guardadas"] = "Quotes";
  // normaliza llaves (espacios) una sola vez
  var M = {};
  Object.keys(D).forEach(function (k) { M[k.replace(/\s+/g, " ").trim()] = D[k]; });
  var R = {}; Object.keys(M).forEach(function (k) { R[M[k]] = k; });
  // algunas inversas ambiguas: el idioma base es ES
  R["Quotes"] = "Cotizaciones"; R["All"] = "Todos"; R["Save"] = "Guardar"; R["Quote"] = "Cotizacion"; R["Sale total"] = "Total venta";
  R["Close"] = "Cerrar"; R["Clients"] = "Clientes"; R["Delete"] = "Eliminar"; R["Type"] = "Tipo"; R["Value"] = "Valor";

  var SKIP = "script,style,textarea,input,#previewWrap,#previewDoc,#langToggle,#fIdioma,[data-no-i18n],.bp-stage,#bpStage,svg";
  var lang = "es", busy = false;
  try { lang = localStorage.getItem(KEY) || "es"; } catch (e) { /* ok */ }
  var origText = new WeakMap(), origAttr = new WeakMap();

  function tr(txt, to) {
    var core = txt.replace(/\s+/g, " ").trim(); if (!core) return null;
    var t = (to === "en" ? M : R)[core];
    if (t == null && to === "en") { var m = /^(.*?)(\s*[:·—-]?\s*)$/.exec(core); if (m && M[m[1]]) t = M[m[1]] + m[2]; }
    if (t == null) return null;
    return (/^\s/.test(txt) ? " " : "") + t + (/\s$/.test(txt) ? " " : "");
  }
  function skip(el) { return el.closest && el.closest(SKIP); }
  function doText(n) {
    var p = n.parentElement; if (!p || skip(p)) return;
    var cur = n.nodeValue, base = origText.get(n);
    if (base != null && cur !== base && cur !== origText.get(n + "")) { /* texto cambió por la app */ }
    var src = origText.has(n) && n.__trTr === cur ? origText.get(n) : cur;
    if (lang === "en") { var t = tr(src, "en"); if (t != null) { origText.set(n, src); n.__trTr = t; if (n.nodeValue !== t) n.nodeValue = t; } }
    else if (origText.has(n) && n.__trTr === cur) { n.nodeValue = origText.get(n); origText.delete(n); n.__trTr = null; }
  }
  var ATTRS = ["placeholder", "title", "aria-label"];
  function doAttrs(el) {
    if (skip(el) && el.id !== "uiLangToggle") return;
    ATTRS.forEach(function (a) {
      var v = el.getAttribute(a); if (v == null) return;
      var key = "_tr_" + a, rec = el[key];
      if (lang === "en") {
        var src = rec && rec.out === v ? rec.src : v, t = tr(src, "en");
        if (t != null) { el[key] = { src: src, out: t }; if (v !== t) el.setAttribute(a, t); }
      } else if (rec && rec.out === v) { el.setAttribute(a, rec.src); el[key] = null; }
    });
  }
  function walk(root) {
    if (busy) return; busy = true;
    try {
      var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n, arr = [];
      while ((n = w.nextNode())) arr.push(n);
      arr.forEach(doText);
      if (root.nodeType === 1) { doAttrs(root); root.querySelectorAll("[placeholder],[title],[aria-label]").forEach(doAttrs); }
    } finally { busy = false; }
  }
  function apply() {
    document.documentElement.setAttribute("data-ui-lang", lang);
    var b = document.getElementById("uiLangToggle");
    if (b) { b.setAttribute("aria-checked", lang === "en" ? "true" : "false"); var th = b.querySelector(".ls-thumb"); if (th) th.textContent = lang.toUpperCase(); }
    walk(document.body);
    // alert/confirm/prompt
  }
  function setLang(l) {
    lang = l === "en" ? "en" : "es";
    try { localStorage.setItem(KEY, lang); } catch (e) { /* ok */ }
    apply();
  }
  // diálogos nativos
  ["alert", "confirm", "prompt"].forEach(function (fn) {
    var o = window[fn].bind(window);
    window[fn] = function (msg) {
      var a = arguments;
      if (lang === "en" && typeof msg === "string") { var t = tr(msg, "en"); if (t != null) { a = Array.prototype.slice.call(arguments); a[0] = t; } }
      return o.apply(window, a);
    };
  });
  function init() {
    var b = document.getElementById("uiLangToggle");
    if (b) b.addEventListener("click", function () { setLang(lang === "en" ? "es" : "en"); });
    var pending = null;
    new MutationObserver(function (muts) {
      if (busy || lang !== "en") return;
      if (pending) return;
      pending = setTimeout(function () { pending = null; walk(document.body); }, 60);
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    apply();
  }
  window.TrylaUiLang = { set: setLang, get: function () { return lang; }, tr: function (s) { return lang === "en" ? (tr(s, "en") || s) : s; } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
