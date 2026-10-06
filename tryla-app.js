(async function () {
  // Espera a que la nube sincronice los datos (modo local resuelve al instante)
  await (window.__novaReady || Promise.resolve());

  // ===== Tema claro/oscuro (claro es el primario/por defecto) =====
  (function () {
    const btn = document.getElementById("themeToggle");
    if (!btn) return;
    function apply(theme) {
      if (theme === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
        btn.setAttribute("aria-checked", "true");
      } else {
        document.documentElement.removeAttribute("data-theme");
        btn.setAttribute("aria-checked", "false");
      }
    }
    let current = "light";
    try {
      current = localStorage.getItem("trylaTheme") === "dark" ? "dark" : "light";
    } catch (e) {}
    apply(current);
    btn.addEventListener("click", () => {
      current = current === "dark" ? "light" : "dark";
      apply(current);
      try { localStorage.setItem("trylaTheme", current); } catch (e) {}
    });
  })();

  // ===== Idioma de la cotizacion: toggle coqueton ES/EN sobre el <select> real =====
  (function () {
    const toggle = document.getElementById("langToggle");
    const thumb = document.getElementById("langThumb");
    const select = document.getElementById("fIdioma");
    if (!toggle || !select) return;
    function reflect() {
      const isEn = select.value === "en";
      toggle.setAttribute("aria-checked", isEn ? "true" : "false");
      thumb.textContent = isEn ? "EN" : "ES";
    }
    toggle.addEventListener("click", () => {
      select.value = select.value === "en" ? "es" : "en";
      select.dispatchEvent(new Event("change", { bubbles: true }));
      reflect();
    });
    select.addEventListener("change", reflect);
    reflect();
  })();

  // Guarda en localStorage y, si la nube está activa, también la sube.
  // guardWrites=true revisa primero si otro dispositivo cambio este dato desde
  // que se cargo la pagina, y avisa antes de sobreescribirlo (clientes/cotizaciones).
  // Para datos de bajo riesgo (precios, log de actividad) se sube directo.
  function syncSet(key, value, guardWrites) {
    localStorage.setItem(key, value);
    if (!(window.NovaCloud && window.NovaCloud.enabled)) return;
    if (!guardWrites || typeof window.NovaCloud.checkConflict !== "function") {
      window.NovaCloud.push(key, value);
      return;
    }
    window.NovaCloud.checkConflict(key).then((result) => {
      if (result && result.conflict) {
        const proceed = confirm(
          "Estos datos se modificaron en otro dispositivo/navegador desde que cargaste esta pagina.\n\n" +
          "Si guardas ahora, tu version puede sobreescribir esos cambios.\n\n" +
          "Recomendado: cancela y recarga la pagina (F5) para traer lo mas reciente antes de continuar.\n\n" +
          "¿Guardar de todas formas?"
        );
        if (!proceed) return;
      }
      window.NovaCloud.push(key, value);
    });
  }

  const catalogEl = document.getElementById("catalog");
  const lineItemsEl = document.getElementById("lineItems");
  const sizePresetEl = document.getElementById("fSizePreset");
  const specsEl = document.getElementById("fSpecs");

  const fClientSelect = document.getElementById("fClientSelect");
  const fCliente = document.getElementById("fCliente");
  const fContacto = document.getElementById("fContacto");
  const fNumero = document.getElementById("fNumero");
  const fEntrega = document.getElementById("fEntrega");
  const fFecha = document.getElementById("fFecha");
  const fGarantia = document.getElementById("fGarantia");
  const fIdioma = document.getElementById("fIdioma");

  const tSubtotal = document.getElementById("tSubtotal");

  const previewWrap = document.getElementById("previewWrap");
  const previewDoc = document.getElementById("previewDoc");

  const quickAddInput = document.getElementById("quickAddInput");
  const quickAddPrice = document.getElementById("quickAddPrice");
  const catalogList = document.getElementById("catalogList");

  const finPrincipal = document.getElementById("finPrincipal");
  const finTasa = document.getElementById("finTasa");
  const finPlazo = document.getElementById("finPlazo");
  const finIncluirPdf = document.getElementById("finIncluirPdf");
  const finUseSaldoBtn = document.getElementById("finUseSaldoBtn");
  const finSummary = document.getElementById("finSummary");
  const finPagoMensual = document.getElementById("finPagoMensual");
  const finTotalIntereses = document.getElementById("finTotalIntereses");
  const finTotalPagar = document.getElementById("finTotalPagar");
  const finTableWrap = document.getElementById("finTableWrap");
  const finTableBody = document.getElementById("finTableBody");
  const finExhibitBtn = document.getElementById("finExhibitBtn");
  const finQuoteSelect = document.getElementById("finQuoteSelect");
  const finControls = document.getElementById("finControls");
  const finSaveBtn = document.getElementById("finSaveBtn");

  const invQuoteSelect = document.getElementById("invQuoteSelect");
  const invConvertBtn = document.getElementById("invConvertBtn");
  const invActivePanel = document.getElementById("invActivePanel");
  const invActiveLabel = document.getElementById("invActiveLabel");
  const payFecha = document.getElementById("payFecha");
  const payMonto = document.getElementById("payMonto");
  const payConcepto = document.getElementById("payConcepto");
  const payAddBtn = document.getElementById("payAddBtn");
  const payCancelEditBtn = document.getElementById("payCancelEditBtn");

  const clientsSearch = document.getElementById("clientsSearch");
  const clientsDateFrom = document.getElementById("clientsDateFrom");
  const clientsDateTo = document.getElementById("clientsDateTo");
  const pipelineSearch = document.getElementById("pipelineSearch");
  const pipelineDateFrom = document.getElementById("pipelineDateFrom");
  const pipelineDateTo = document.getElementById("pipelineDateTo");
  const quotesSearch = document.getElementById("quotesSearch");
  const invoicesSearch = document.getElementById("invoicesSearch");
  const payTableWrap = document.getElementById("payTableWrap");
  const payTableBody = document.getElementById("payTableBody");
  const payTotalVenta = document.getElementById("payTotalVenta");
  const payTotalPagado = document.getElementById("payTotalPagado");
  const paySaldo = document.getElementById("paySaldo");
  const payInvoiceBtn = document.getElementById("payInvoiceBtn");

  const PRICES_KEY = "novaCatalogPrices";
  const CLIENTS_KEY = "novaClients";
  const QUOTES_KEY = "novaQuotes";
  const ACTIVITY_KEY = "novaActivityLog";
  const ACTIVITY_MAX = 200;

  // Etapas del pipeline de leads (columnas del Kanban y opciones de estatus del cliente)
  const PIPELINE_STAGES = ["Cold", "Warm", "HOT", "Finance", "Cash", "Closed"];

  const savedPrices = JSON.parse(localStorage.getItem(PRICES_KEY) || "{}");
  let clients = JSON.parse(localStorage.getItem(CLIENTS_KEY) || "[]");

  // Migra clientes guardados con el esquema de etapas anterior (Lead/Contactado/Cotizado/
  // Negociacion/Aceptado/Perdido) al nuevo (Cold/Warm/HOT/Finance/Cash/Closed), una sola vez.
  (function migrateClientStatuses() {
    const STATUS_MIGRATION = { Lead: "Cold", Contactado: "Warm", Cotizado: "HOT", Negociacion: "HOT", Aceptado: "Closed", Perdido: "Cold" };
    let migrated = false;
    clients.forEach((c) => {
      if (c.status && PIPELINE_STAGES.indexOf(c.status) === -1 && STATUS_MIGRATION[c.status]) {
        c.status = STATUS_MIGRATION[c.status];
        migrated = true;
      }
    });
    if (migrated) syncSet(CLIENTS_KEY, JSON.stringify(clients));
  })();

  // Rellena createdAt en clientes que no lo tengan (de antes de que existiera el
  // campo): los creados manualmente llevan el timestamp escondido en su id
  // ("c" + Date.now()); los que vinieron del Sheet ("sheet-N") se quedan sin
  // fecha conocida -- no hay forma de recuperarla despues del hecho.
  (function backfillClientDates() {
    let migrated = false;
    clients.forEach((c) => {
      if (!c.createdAt && /^c\d+$/.test(c.id)) {
        c.createdAt = parseInt(c.id.slice(1), 10);
        migrated = true;
      }
    });
    if (migrated) syncSet(CLIENTS_KEY, JSON.stringify(clients));
  })();

  // ---- Fecha de un cliente (para mostrar y filtrar en Clientes/Pipeline) ----
  function formatClientDate(c) {
    return c.createdAt ? new Date(c.createdAt).toLocaleDateString("es-MX", { dateStyle: "medium" }) : "—";
  }
  // El filtro usa fechas (sin hora) en formato yyyy-mm-dd, como entregan los <input type="date">
  function clientInDateRange(c, fromStr, toStr) {
    if (!fromStr && !toStr) return true;
    if (!c.createdAt) return false; // sin fecha conocida: no se puede confirmar que caiga en el rango
    const day = new Date(c.createdAt).toISOString().slice(0, 10);
    if (fromStr && day < fromStr) return false;
    if (toStr && day > toStr) return false;
    return true;
  }

  let quotes = JSON.parse(localStorage.getItem(QUOTES_KEY) || "[]");
  let activityLog = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]");

  // Registra una accion en el historial (quien/cuando/que) y la persiste
  function logActivity(text) {
    const email = (window.NovaCloud && window.NovaCloud.email) || "local";
    activityLog.unshift({ ts: Date.now(), email, text });
    if (activityLog.length > ACTIVITY_MAX) activityLog.length = ACTIVITY_MAX;
    syncSet(ACTIVITY_KEY, JSON.stringify(activityLog));
  }

  function renderActivityTable() {
    const tbody = document.getElementById("activityTable");
    if (!tbody) return;
    if (activityLog.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#7c8aa6;">Sin actividad registrada todavia</td></tr>';
      return;
    }
    tbody.innerHTML = activityLog
      .slice(0, 25)
      .map((a) => {
        const d = new Date(a.ts);
        const when = isNaN(d) ? "" : d.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
        return `
        <tr>
          <td>${escapeHtml(when)}</td>
          <td>${escapeHtml(a.email || "")}</td>
          <td>${escapeHtml(a.text || "")}</td>
        </tr>`;
      })
      .join("");
  }

  let lineItems = [];
  // Deposito historico de la cotizacion cargada (ya no editable desde el formulario;
  // se preserva solo para no romper el saldo de invoices ya facturados).
  let loadedDeposito = 0;
  let payments = []; // pagos de la cotizacion seleccionada en Invoices { id, fecha, monto, concepto }
  let currentQuoteId = null;
  let finSelectedQuoteId = null; // cotizacion seleccionada en la pestaña Financiamiento
  let invSelectedQuoteId = null; // cotizacion seleccionada en la pestaña Invoices
  let editingPaymentId = null; // pago que se esta editando (vs. registrando uno nuevo)
  let currentFinancePlan = null; // { principal, tasa, plazo, totalInterest, totalPayment, basePayment, schedule }

  // Totales derivados de un objeto cotizacion (no del formulario del Cotizador)
  function quoteTotals(q) {
    const subtotal = (q.lineItems || []).reduce((s, l) => s + (parseFloat(l.price) || 0), 0);
    const deposito = parseFloat(q.deposito) || 0;
    return { subtotal, deposito, saldo: subtotal - deposito };
  }

  // ===== Traduccion del contenido de equipos (ES -> EN) =====
  const EQ_I18N = typeof EQUIPMENT_I18N !== "undefined" ? EQUIPMENT_I18N : {};
  // Devuelve el texto del equipo/spec en el idioma de la cotizacion.
  // El nombre canonico (espanol) se mantiene como clave de precio y como valor guardado.
  function trEquip(name) {
    if (fIdioma.value === "en" && EQ_I18N[name]) return EQ_I18N[name];
    return name;
  }

  // ===== Catalogo plano (para autocompletar / cotizacion rapida) =====
  const flatCatalog = [];
  COMPONENT_CATALOG.forEach((cat) => {
    cat.items.forEach((item) => {
      flatCatalog.push({ category: cat.category, name: item.name, price: item.price });
    });
  });

  // ===== Catalogo de componentes (panel) =====
  function renderCatalog() {
    catalogEl.innerHTML = "";
    COMPONENT_CATALOG.forEach((cat) => {
      const catDiv = document.createElement("div");
      catDiv.className = "catalog-cat";

      const h3 = document.createElement("h3");
      h3.textContent = trEquip(cat.category);
      catDiv.appendChild(h3);

      cat.items.forEach((item) => {
        const key = `${cat.category}::${item.name}`;
        const price = savedPrices[key] !== undefined ? savedPrices[key] : item.price;
        item.price = price; // mantener catalogo en memoria sincronizado con precios guardados

        const row = document.createElement("div");
        row.className = "catalog-item";

        const name = document.createElement("span");
        name.className = "name";
        name.textContent = trEquip(item.name);

        const priceInput = document.createElement("input");
        priceInput.type = "number";
        priceInput.className = "price";
        priceInput.min = "0";
        priceInput.step = "10";
        priceInput.value = price;
        priceInput.addEventListener("change", () => {
          const val = parseFloat(priceInput.value) || 0;
          savedPrices[key] = val;
          item.price = val;
          syncSet(PRICES_KEY, JSON.stringify(savedPrices));
        });

        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.textContent = "+";
        addBtn.title = "Agregar a la cotizacion";
        addBtn.addEventListener("click", () => {
          addLineItem(trEquip(item.name), parseFloat(priceInput.value) || 0);
        });

        row.appendChild(name);
        row.appendChild(priceInput);
        row.appendChild(addBtn);
        catDiv.appendChild(row);
      });

      catalogEl.appendChild(catDiv);
    });
  }

  // Datalist para cotizacion rapida (en el idioma seleccionado)
  function renderDatalist() {
    catalogList.innerHTML = "";
    flatCatalog.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = trEquip(item.name);
      opt.label = `${trEquip(item.name)} - $${item.price}`;
      catalogList.appendChild(opt);
    });
  }

  quickAddInput.addEventListener("input", () => {
    const val = quickAddInput.value.toLowerCase();
    const match = flatCatalog.find(
      (i) => i.name.toLowerCase() === val || trEquip(i.name).toLowerCase() === val
    );
    if (match) {
      quickAddPrice.value = match.price;
    }
  });

  // Re-renderiza el catalogo y el autocompletado cuando cambia el idioma
  fIdioma.addEventListener("change", () => {
    renderCatalog();
    renderDatalist();
  });

  document.getElementById("quickAddBtn").addEventListener("click", () => {
    const desc = quickAddInput.value.trim();
    if (!desc) return;
    const price = parseFloat(quickAddPrice.value) || 0;
    addLineItem(desc, price);
    quickAddInput.value = "";
    quickAddPrice.value = 0;
    quickAddInput.focus();
  });

  quickAddInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("quickAddBtn").click();
    }
  });

  // ===== Presets de tamano (specs / equipo como lineas con precio) =====
  TRAILER_SIZES.forEach((size) => {
    const opt = document.createElement("option");
    opt.value = size.id;
    opt.textContent = `Tryla ${size.label}`;
    sizePresetEl.appendChild(opt);
  });

  sizePresetEl.addEventListener("change", () => {
    const size = TRAILER_SIZES.find((s) => s.id === sizePresetEl.value);
    if (!size) return;
    addLineItem(trEquip(`8' x ${size.length}' Food Trailer - Unidad base`), size.price);
    size.specs.forEach((s) => addLineItem(trEquip(s), 0));
    size.equipment.back.forEach((i) => addLineItem(trEquip(i.name), 0));
    sizePresetEl.value = "";
  });

  // ===== Lineas de la cotizacion =====
  function addLineItem(desc, price) {
    lineItems.push({ desc, price });
    renderLineItems();
  }

  let dragSrcIndex = null;

  function renderLineItems() {
    lineItemsEl.innerHTML = "";
    lineItems.forEach((line, idx) => {
      const tr = document.createElement("tr");
      tr.draggable = true;

      tr.addEventListener("dragstart", (e) => {
        dragSrcIndex = idx;
        tr.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      });
      tr.addEventListener("dragend", () => {
        tr.classList.remove("dragging");
      });
      tr.addEventListener("dragover", (e) => {
        e.preventDefault();
        tr.classList.add("drag-over");
      });
      tr.addEventListener("dragleave", () => {
        tr.classList.remove("drag-over");
      });
      tr.addEventListener("drop", (e) => {
        e.preventDefault();
        tr.classList.remove("drag-over");
        if (dragSrcIndex === null || dragSrcIndex === idx) return;
        const moved = lineItems.splice(dragSrcIndex, 1)[0];
        lineItems.splice(idx, 0, moved);
        dragSrcIndex = null;
        renderLineItems();
      });

      const tdHandle = document.createElement("td");
      tdHandle.className = "drag-handle";
      tdHandle.textContent = "⠇";
      tdHandle.title = "Arrastrar para reordenar";
      tr.appendChild(tdHandle);

      const tdDesc = document.createElement("td");
      const descInput = document.createElement("input");
      descInput.type = "text";
      descInput.className = "line-desc";
      descInput.value = line.desc;
      descInput.addEventListener("input", () => {
        lineItems[idx].desc = descInput.value;
      });
      tdDesc.appendChild(descInput);

      const tdPrice = document.createElement("td");
      tdPrice.className = "num";
      const priceInput = document.createElement("input");
      priceInput.type = "number";
      priceInput.className = "line-price";
      priceInput.min = "0";
      priceInput.step = "10";
      priceInput.value = line.price;
      priceInput.addEventListener("input", () => {
        lineItems[idx].price = parseFloat(priceInput.value) || 0;
        updateTotals();
      });
      tdPrice.appendChild(priceInput);

      const tdRemove = document.createElement("td");
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "remove";
      removeBtn.textContent = "x";
      removeBtn.addEventListener("click", () => {
        lineItems.splice(idx, 1);
        renderLineItems();
      });
      tdRemove.appendChild(removeBtn);

      tr.appendChild(tdDesc);
      tr.appendChild(tdPrice);
      tr.appendChild(tdRemove);
      lineItemsEl.appendChild(tr);
    });
    updateTotals();
  }

  function updateTotals() {
    const subtotal = lineItems.reduce((sum, l) => sum + (parseFloat(l.price) || 0), 0);
    const deposito = loadedDeposito || 0;
    const saldo = subtotal - deposito;
    tSubtotal.textContent = formatMoney(subtotal);
    return { subtotal, deposito, saldo };
  }

  document.getElementById("addCustomLine").addEventListener("click", () => {
    addLineItem("", 0);
  });

  function formatMoney(n) {
    return `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // ===== Pagos del cliente (abonos) e invoice — pestaña Invoices =====
  // Una cotizacion NO es un invoice hasta que se convierte explicitamente
  // (boton "Convertir a Invoice" en Cotizaciones guardadas / esta pestaña),
  // o hasta que se le registra su primer pago (conversion automatica).
  function isInvoice(q) {
    return !!(q && q.invoiceCreated);
  }

  function paymentsTotal() {
    return payments.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);
  }

  function invSelectedQuote() {
    return quotes.find((q) => q.id === invSelectedQuoteId) || null;
  }

  // Guarda los pagos actuales en la cotizacion seleccionada y persiste
  function persistInvoicePayments() {
    const q = invSelectedQuote();
    if (!q) return;
    q.payments = payments.map((p) => ({ ...p }));
    q.updatedAt = Date.now();
    persistQuotes();
    renderInvoicesTable();
    renderInvoiceQuoteSelect();
    renderQuotesTable();
  }

  function renderPaymentsTable() {
    payTableBody.innerHTML = "";
    if (payments.length === 0) {
      payTableWrap.style.display = "none";
    } else {
      payTableWrap.style.display = "block";
      payments.forEach((p) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${escapeHtml(p.fecha || "")}</td>
          <td>${escapeHtml(p.concepto || "")}</td>
          <td class="num">${formatMoney(parseFloat(p.monto) || 0)}</td>
          <td class="actions-cell"></td>
        `;
        const actionsTd = tr.children[3];

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "btn-small";
        editBtn.textContent = "Editar";
        editBtn.title = "Editar este pago";
        editBtn.addEventListener("click", () => startEditPayment(p.id));

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "remove";
        delBtn.textContent = "x";
        delBtn.title = "Eliminar pago";
        delBtn.addEventListener("click", () => {
          if (!confirm(`Eliminar el pago de ${formatMoney(parseFloat(p.monto) || 0)} (${p.fecha || ""})?`)) return;
          const q = invSelectedQuote();
          payments = payments.filter((x) => x.id !== p.id);
          if (editingPaymentId === p.id) cancelEditPayment();
          logActivity(`Elimino un pago de ${formatMoney(parseFloat(p.monto) || 0)} de "${q ? q.cliente || q.number : ""}"`);
          renderPaymentsTable();
          updatePaymentsSummary();
          persistInvoicePayments();
        });

        actionsTd.appendChild(editBtn);
        actionsTd.appendChild(delBtn);
        payTableBody.appendChild(tr);
      });
    }
  }

  function startEditPayment(id) {
    const p = payments.find((x) => x.id === id);
    if (!p) return;
    editingPaymentId = id;
    payFecha.value = p.fecha || new Date().toISOString().slice(0, 10);
    payMonto.value = p.monto || 0;
    payConcepto.value = p.concepto || "";
    payAddBtn.textContent = "Guardar cambios";
    payCancelEditBtn.style.display = "block";
    payAddBtn.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function cancelEditPayment() {
    editingPaymentId = null;
    payFecha.value = new Date().toISOString().slice(0, 10);
    payMonto.value = 0;
    payConcepto.value = "";
    payAddBtn.textContent = "+ Registrar pago";
    payCancelEditBtn.style.display = "none";
  }

  function updatePaymentsSummary() {
    const q = invSelectedQuote();
    const totals = q ? quoteTotals(q) : { subtotal: 0, deposito: 0 };
    const totalPagado = (parseFloat(totals.deposito) || 0) + paymentsTotal();
    const saldo = totals.subtotal - totalPagado;
    payTotalVenta.textContent = formatMoney(totals.subtotal);
    payTotalPagado.textContent = formatMoney(totalPagado);
    paySaldo.textContent = formatMoney(saldo);
  }

  // Selector "Convertir cotizacion a invoice": solo cotizaciones SIN invoice todavia
  function renderInvoiceQuoteSelect() {
    const prev = invQuoteSelect.value;
    invQuoteSelect.innerHTML = '<option value="">-- selecciona una cotizacion --</option>';
    quotes
      .filter((q) => !isInvoice(q))
      .slice()
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .forEach((q) => {
        const opt = document.createElement("option");
        opt.value = q.id;
        opt.textContent = `${q.number || "(sin no.)"} — ${q.cliente || "sin cliente"}`;
        invQuoteSelect.appendChild(opt);
      });
    invQuoteSelect.value = prev && quotes.some((q) => q.id === prev && !isInvoice(q)) ? prev : "";
  }

  // Carga una cotizacion (ya convertida o no) en el panel de pagos activo
  function loadActiveInvoice(id) {
    invSelectedQuoteId = id || null;
    const q = invSelectedQuote();
    if (!q) {
      invActivePanel.style.display = "none";
      payments = [];
      return;
    }
    invActivePanel.style.display = "block";
    invActiveLabel.textContent = `${q.number || "(sin no.)"} — ${q.cliente || "sin cliente"}`;
    payments = (q.payments || []).map((p) => ({ ...p }));
    cancelEditPayment();
    renderPaymentsTable();
    updatePaymentsSummary();
  }

  // Convierte una cotizacion en invoice (idempotente) y la deja activa para registrar pagos
  function convertQuoteToInvoice(id) {
    const q = quotes.find((x) => x.id === id);
    if (!q) return;
    if (!isInvoice(q)) {
      q.invoiceCreated = true;
      q.invoiceCreatedAt = Date.now();
      q.updatedAt = Date.now();
      logActivity(`Convirtio a invoice la cotizacion ${q.number || ""} (${q.cliente || ""})`);
      persistQuotes();
      renderQuotesTable();
      renderInvoiceQuoteSelect();
      renderInvoicesTable();
    }
    loadActiveInvoice(q.id);
  }

  invConvertBtn.addEventListener("click", () => {
    if (!invQuoteSelect.value) {
      alert("Selecciona una cotizacion para convertir.");
      return;
    }
    convertQuoteToInvoice(invQuoteSelect.value);
    invActivePanel.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  payAddBtn.addEventListener("click", () => {
    const q = invSelectedQuote();
    if (!q) {
      alert("Selecciona o convierte una cotizacion primero.");
      return;
    }
    const monto = parseFloat(payMonto.value) || 0;
    if (monto <= 0) {
      alert("Escribe un monto de pago mayor a cero.");
      return;
    }
    if (editingPaymentId) {
      const p = payments.find((x) => x.id === editingPaymentId);
      if (p) {
        p.fecha = payFecha.value || new Date().toISOString().slice(0, 10);
        p.monto = monto;
        p.concepto = payConcepto.value.trim();
      }
      logActivity(`Edito un pago de ${formatMoney(monto)} de "${q.cliente || q.number || ""}"`);
    } else {
      payments.push({
        id: "p" + Date.now(),
        fecha: payFecha.value || new Date().toISOString().slice(0, 10),
        monto: monto,
        concepto: payConcepto.value.trim(),
      });
      logActivity(`Registro un pago de ${formatMoney(monto)} de "${q.cliente || q.number || ""}"`);
    }
    // Registrar el primer pago convierte la cotizacion en invoice automaticamente
    if (!isInvoice(q)) {
      q.invoiceCreated = true;
      q.invoiceCreatedAt = Date.now();
    }
    cancelEditPayment();
    renderPaymentsTable();
    updatePaymentsSummary();
    persistInvoicePayments();
  });

  payCancelEditBtn.addEventListener("click", cancelEditPayment);

  // Lista de invoices / saldos por cliente — solo cotizaciones ya convertidas
  function renderInvoicesTable() {
    const tbody = document.getElementById("invoicesTable");
    tbody.innerHTML = "";
    const invoiced = quotes.filter(isInvoice);
    if (invoiced.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#7c8aa6;">Sin invoices todavia. Convierte una cotizacion o registra su primer pago arriba.</td></tr>';
      return;
    }
    const search = (invoicesSearch.value || "").trim().toLowerCase();
    const filtered = search
      ? invoiced.filter((q) => [q.cliente, q.number].some((f) => (f || "").toLowerCase().includes(search)))
      : invoiced;
    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#7c8aa6;">Sin resultados para tu busqueda</td></tr>';
      return;
    }
    filtered
      .slice()
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .forEach((q) => {
        const totals = quoteTotals(q);
        const pagado = totals.deposito + (q.payments || []).reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
        const saldo = totals.subtotal - pagado;
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${escapeHtml(q.cliente || "")}</td>
          <td>${escapeHtml(q.number || "")}</td>
          <td>${formatMoney(totals.subtotal)}</td>
          <td>${formatMoney(pagado)}</td>
          <td>${formatMoney(saldo)}</td>
          <td class="actions-cell"></td>
        `;
        const actionsTd = tr.children[5];

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "btn-small";
        editBtn.textContent = "Registrar pago";
        editBtn.addEventListener("click", () => {
          loadActiveInvoice(q.id);
          invActivePanel.scrollIntoView({ behavior: "smooth", block: "center" });
        });

        const invBtn = document.createElement("button");
        invBtn.type = "button";
        invBtn.className = "btn-small";
        invBtn.textContent = "Ver invoice";
        invBtn.addEventListener("click", () => {
          loadActiveInvoice(q.id);
          buildInvoice(q);
          previewWrap.scrollIntoView({ behavior: "smooth" });
        });

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "btn-small";
        delBtn.textContent = "Eliminar invoice";
        delBtn.title = "Quita el invoice y borra su historial de pagos (la cotizacion en si no se elimina)";
        delBtn.addEventListener("click", () => {
          const warn = pagado > 0
            ? ` Esta invoice tiene ${formatMoney(pagado)} en pagos registrados que tambien se borraran.`
            : "";
          if (!confirm(`Eliminar el invoice de "${q.cliente || q.number || ""}"?${warn} La cotizacion no se borra, solo deja de ser invoice.`)) return;
          q.invoiceCreated = false;
          q.invoiceCreatedAt = null;
          q.payments = [];
          q.updatedAt = Date.now();
          logActivity(`Elimino el invoice de "${q.cliente || q.number || ""}"`);
          persistQuotes();
          if (invSelectedQuoteId === q.id) {
            invActivePanel.style.display = "none";
            invSelectedQuoteId = null;
            payments = [];
            cancelEditPayment();
          }
          renderInvoicesTable();
          renderInvoiceQuoteSelect();
          renderQuotesTable();
        });

        actionsTd.appendChild(editBtn);
        actionsTd.appendChild(invBtn);
        actionsTd.appendChild(delBtn);
        tbody.appendChild(tr);
      });
  }

  // ===== Financiamiento interno (metodo add-on) =====
  // Interes total = capital * tasa% * (plazo/12), repartido en partes iguales entre los meses.
  // El ultimo mes absorbe el residuo de redondeo para que el saldo cierre exactamente en $0.00.
  // (Mismo metodo usado a mano en la tabla de amortizacion de Alex Robles.)
  function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  function computeAddOnAmortization(principal, ratePct, months) {
    const P = Math.max(0, parseFloat(principal) || 0);
    const n = Math.max(1, Math.round(parseFloat(months) || 1));
    const rate = Math.max(0, parseFloat(ratePct) || 0);
    const totalInterest = round2(P * (rate / 100) * (n / 12));
    const totalToPay = round2(P + totalInterest);
    const baseCapital = round2(P / n);
    const baseInterest = round2(totalInterest / n);
    const basePayment = round2(baseCapital + baseInterest);

    const schedule = [];
    let balance = P;
    let paidCapital = 0;
    let paidInterest = 0;
    let paidTotal = 0;

    for (let i = 1; i <= n; i++) {
      let capital, interes, pago;
      if (i < n) {
        capital = baseCapital;
        interes = baseInterest;
        pago = basePayment;
      } else {
        // Ultimo mes: ajusta por el redondeo acumulado de los meses anteriores
        capital = round2(P - paidCapital);
        interes = round2(totalInterest - paidInterest);
        pago = round2(capital + interes);
      }
      balance = i < n ? round2(balance - capital) : 0;
      paidCapital = round2(paidCapital + capital);
      paidInterest = round2(paidInterest + interes);
      paidTotal = round2(paidTotal + pago);
      schedule.push({ n: i, pago, capital, interes, balance, adjusted: i === n });
    }

    const lastAdjust = round2(schedule[schedule.length - 1].pago - basePayment);

    return {
      principal: P,
      ratePct: rate,
      months: n,
      basePayment,
      totalInterest: paidInterest,
      totalToPay: paidTotal,
      lastAdjust,
      schedule,
    };
  }

  function renderFinancePlanTable(plan) {
    if (!plan || plan.principal <= 0 || plan.schedule.length === 0) {
      finSummary.style.display = "none";
      finTableWrap.style.display = "none";
      finTableBody.innerHTML = "";
      return;
    }
    finPagoMensual.textContent = formatMoney(plan.basePayment);
    finTotalIntereses.textContent = formatMoney(plan.totalInterest);
    finTotalPagar.textContent = formatMoney(plan.totalToPay);
    finSummary.style.display = "block";

    finTableBody.innerHTML = plan.schedule
      .map(
        (row) => `
        <tr>
          <td>${row.n}${row.adjusted ? " <span style=\"color:#7c8aa6; font-size:11px;\">(ajuste redondeo)</span>" : ""}</td>
          <td class="num">${formatMoney(row.pago)}</td>
          <td class="num">${formatMoney(row.capital)}</td>
          <td class="num">${formatMoney(row.interes)}</td>
          <td class="num">${formatMoney(row.balance)}</td>
        </tr>`
      )
      .join("");
    finTableWrap.style.display = "block";
  }

  function recalcFinance() {
    const principal = parseFloat(finPrincipal.value) || 0;
    const ratePct = parseFloat(finTasa.value) || 0;
    const months = parseInt(finPlazo.value, 10) || 1;
    if (principal <= 0 || ratePct <= 0) {
      currentFinancePlan = null;
      renderFinancePlanTable(null);
      return;
    }
    currentFinancePlan = computeAddOnAmortization(principal, ratePct, months);
    renderFinancePlanTable(currentFinancePlan);
  }

  finPrincipal.addEventListener("input", recalcFinance);
  finTasa.addEventListener("input", recalcFinance);
  finPlazo.addEventListener("input", recalcFinance);

  function finSelectedQuote() {
    return quotes.find((q) => q.id === finSelectedQuoteId) || null;
  }

  finUseSaldoBtn.addEventListener("click", () => {
    const q = finSelectedQuote();
    if (!q) return;
    const saldo = quoteTotals(q).saldo;
    finPrincipal.value = saldo > 0 ? saldo.toFixed(2) : "0";
    recalcFinance();
  });

  // Poblar el selector de cotizaciones de la pestaña Financiamiento
  function renderFinanceQuoteSelect() {
    const prev = finQuoteSelect.value;
    finQuoteSelect.innerHTML = '<option value="">-- selecciona una cotizacion guardada --</option>';
    quotes
      .slice()
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .forEach((q) => {
        const opt = document.createElement("option");
        opt.value = q.id;
        opt.textContent = `${q.number || "(sin no.)"} — ${q.cliente || "sin cliente"}`;
        finQuoteSelect.appendChild(opt);
      });
    finQuoteSelect.value = prev && quotes.some((q) => q.id === prev) ? prev : "";
  }

  function loadFinanceQuote(id) {
    finSelectedQuoteId = id || null;
    const q = finSelectedQuote();
    if (!q) {
      finControls.style.display = "none";
      currentFinancePlan = null;
      return;
    }
    finControls.style.display = "block";
    const saldo = quoteTotals(q).saldo;
    const fin = q.finance || {};
    // Capital: usa el guardado si existe (>0), si no el saldo de la cotizacion
    const principal = (parseFloat(fin.principal) || 0) > 0 ? fin.principal : (saldo > 0 ? saldo : 0);
    finPrincipal.value = (parseFloat(principal) || 0).toFixed(2);
    finTasa.value = parseFloat(fin.ratePct) || 0;
    finPlazo.value = parseInt(fin.months, 10) || 12;
    finIncluirPdf.checked = !!fin.incluirPdf;
    recalcFinance();
  }

  finQuoteSelect.addEventListener("change", () => {
    loadFinanceQuote(finQuoteSelect.value);
  });

  finSaveBtn.addEventListener("click", () => {
    const q = finSelectedQuote();
    if (!q) {
      alert("Selecciona una cotizacion primero.");
      return;
    }
    q.finance = {
      principal: parseFloat(finPrincipal.value) || 0,
      ratePct: parseFloat(finTasa.value) || 0,
      months: parseInt(finPlazo.value, 10) || 12,
      incluirPdf: finIncluirPdf.checked,
    };
    q.updatedAt = Date.now();
    logActivity(`Guardo el plan de financiamiento de "${q.cliente || q.number || ""}" (${formatMoney(q.finance.principal)} a ${q.finance.ratePct}%)`);
    persistQuotes();
    renderFinanceTable();
    renderQuotesTable();
    alert("Plan de financiamiento guardado en la cotizacion.");
  });

  // ===== CRM: clientes =====
  function persistClients() {
    syncSet(CLIENTS_KEY, JSON.stringify(clients), true);
  }

  function renderClientSelect() {
    fClientSelect.innerHTML = '<option value="">-- nuevo cliente --</option>';
    clients.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      fClientSelect.appendChild(opt);
    });
  }

  fClientSelect.addEventListener("change", () => {
    const client = clients.find((c) => c.id === fClientSelect.value);
    if (!client) return;
    fCliente.value = client.name;
    fContacto.value = client.contacto || "";
    fEntrega.value = client.ciudad || "";
  });

  function renderClientsTable() {
    const tbody = document.getElementById("clientsTable");
    tbody.innerHTML = "";
    if (clients.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:#7c8aa6;">Sin clientes todavia</td></tr>';
      return;
    }
    const q = (clientsSearch.value || "").trim().toLowerCase();
    const fromStr = clientsDateFrom.value;
    const toStr = clientsDateTo.value;
    const filtered = clients.filter((c) => {
      const matchesSearch = !q || [c.name, c.contacto, c.negocio, c.ciudad, c.notas, c.fuente].some((f) => (f || "").toLowerCase().includes(q));
      return matchesSearch && clientInDateRange(c, fromStr, toStr);
    });
    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:#7c8aa6;">Sin resultados para tu busqueda</td></tr>';
      return;
    }
    filtered
      .slice()
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .forEach((c) => {
      const tr = document.createElement("tr");
      const quoteCount = quotes.filter((q) => q.clientId === c.id).length;
      tr.innerHTML = `
        <td style="white-space:nowrap; color:var(--text2); font-size:11.5px;">${formatClientDate(c)}</td>
        <td>${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.contacto || "")}</td>
        <td>${escapeHtml(c.negocio || "")}</td>
        <td>${escapeHtml(c.ciudad || "")}${c.fuente ? ` <span style="color:var(--text2);font-size:10.5px;">· ${escapeHtml(c.fuente)}</span>` : ""}</td>
        <td></td>
        <td>${escapeHtml(c.notas || "")}</td>
        <td>${quoteCount}</td>
        <td class="actions-cell"></td>
      `;
      const statusTd = tr.children[5];
      const statusSelect = document.createElement("select");
      PIPELINE_STAGES.forEach((s) => {
        const o = document.createElement("option");
        o.value = s;
        o.textContent = s;
        if (s === c.status) o.selected = true;
        statusSelect.appendChild(o);
      });
      setStatusClass(statusSelect, c.status || "Cold");
      statusSelect.addEventListener("change", () => {
        c.status = statusSelect.value;
        setStatusClass(statusSelect, c.status);
        persistClients();
      });
      statusTd.appendChild(statusSelect);

      const actionsTd = tr.children[8];
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "btn-small";
      editBtn.textContent = "Editar";
      editBtn.addEventListener("click", () => startEditClient(c.id));
      actionsTd.appendChild(editBtn);

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn-small";
      delBtn.textContent = "Eliminar";
      delBtn.addEventListener("click", () => {
        if (!confirm(`Eliminar al cliente "${c.name}"?`)) return;
        clients = clients.filter((x) => x.id !== c.id);
        persistClients();
        if (editingClientId === c.id) cancelEditClient();
        renderClientsTable();
        renderClientSelect();
      });
      actionsTd.appendChild(delBtn);

      tbody.appendChild(tr);
    });
  }

  let editingClientId = null;
  const btnAddClient = document.getElementById("btnAddClient");
  const btnCancelEditClient = document.getElementById("btnCancelEditClient");

  function startEditClient(id) {
    const c = clients.find((x) => x.id === id);
    if (!c) return;
    editingClientId = id;
    document.getElementById("cNombre").value = c.name || "";
    document.getElementById("cContacto").value = c.contacto || "";
    document.getElementById("cNegocio").value = c.negocio || "";
    document.getElementById("cCiudad").value = c.ciudad || "";
    document.getElementById("cEstatus").value = c.status || "Cold";
    document.getElementById("cNotas").value = c.notas || "";
    btnAddClient.textContent = "Guardar cambios";
    btnCancelEditClient.style.display = "inline-block";
    document.getElementById("cNombre").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function cancelEditClient() {
    editingClientId = null;
    document.getElementById("cNombre").value = "";
    document.getElementById("cContacto").value = "";
    document.getElementById("cNegocio").value = "";
    document.getElementById("cCiudad").value = "";
    document.getElementById("cEstatus").value = "Cold";
    document.getElementById("cNotas").value = "";
    btnAddClient.textContent = "+ Agregar cliente";
    btnCancelEditClient.style.display = "none";
  }

  btnCancelEditClient.addEventListener("click", cancelEditClient);

  // Normaliza un nombre para comparar (espacios/mayusculas no cuentan como cliente distinto)
  function normalizeName(s) {
    return (s || "").trim().replace(/\s+/g, " ").toLowerCase();
  }

  // Busca un cliente con nombre igual o muy parecido (para avisar antes de duplicar)
  function findSimilarClient(name, excludeId) {
    const norm = normalizeName(name);
    if (!norm) return null;
    return (
      clients.find((c) => {
        if (excludeId && c.id === excludeId) return false;
        const cn = normalizeName(c.name);
        if (cn === norm) return true;
        if (norm.length >= 4 && (cn.includes(norm) || norm.includes(cn))) return true;
        return false;
      }) || null
    );
  }

  btnAddClient.addEventListener("click", () => {
    const name = document.getElementById("cNombre").value.trim();
    if (!name) {
      alert("Escribe el nombre del cliente");
      return;
    }
    if (!editingClientId) {
      const dup = findSimilarClient(name);
      if (dup) {
        const seguir = confirm(
          `Ya existe un cliente parecido: "${dup.name}"${dup.contacto ? ` (${dup.contacto})` : ""}.\n\n` +
          `Si es el mismo cliente, cancela esto y usa "Editar" en su fila en vez de crear uno nuevo.\n\n` +
          `¿Crear "${name}" de todas formas como cliente separado?`
        );
        if (!seguir) return;
      }
    }
    if (editingClientId) {
      const c = clients.find((x) => x.id === editingClientId);
      if (c) {
        c.name = name;
        c.contacto = document.getElementById("cContacto").value.trim();
        c.negocio = document.getElementById("cNegocio").value.trim();
        c.ciudad = document.getElementById("cCiudad").value.trim();
        c.status = document.getElementById("cEstatus").value;
        c.notas = document.getElementById("cNotas").value.trim();
      }
      logActivity(`Edito el cliente "${name}"`);
    } else {
      clients.push({
        id: "c" + Date.now(),
        name,
        contacto: document.getElementById("cContacto").value.trim(),
        negocio: document.getElementById("cNegocio").value.trim(),
        ciudad: document.getElementById("cCiudad").value.trim(),
        status: document.getElementById("cEstatus").value,
        notas: document.getElementById("cNotas").value.trim(),
        createdAt: Date.now(),
      });
      logActivity(`Creo el cliente "${name}"`);
    }
    persistClients();
    cancelEditClient();
    renderClientsTable();
    renderClientSelect();
  });

  function findOrCreateClient(name, contacto, ciudad) {
    if (!name) return null;
    const norm = normalizeName(name);
    let client = clients.find((c) => normalizeName(c.name) === norm);
    if (!client) {
      client = {
        id: "c" + Date.now(),
        name,
        contacto: contacto || "",
        ciudad: ciudad || "",
        status: "HOT",
        notas: "",
        createdAt: Date.now(),
      };
      clients.push(client);
    } else {
      if (contacto) client.contacto = contacto;
      if (ciudad) client.ciudad = ciudad;
      if (client.status === "Cold") client.status = "HOT";
    }
    persistClients();
    return client;
  }

  // ===== Pipeline (kanban de leads, estilo HubSpot) =====
  // Valor en pipeline de un cliente: suma de sus cotizaciones abiertas (sin invoice).
  function clientPipelineValue(c) {
    return quotes
      .filter((q) => q.clientId === c.id && !isInvoice(q))
      .reduce((s, q) => s + quoteTotals(q).subtotal, 0);
  }

  function clientInitials(name) {
    const parts = (name || "?").trim().split(/\s+/).filter(Boolean).slice(0, 2);
    return (parts.map((p) => p[0]).join("") || "?").toUpperCase();
  }

  let dragSrcClientId = null;
  // Id del cliente que se acaba de mover, para animar solo esa tarjeta al
  // reconstruir el board (no todas las que ya estaban ahi)
  let lastMovedClientId = null;
  let pipelineView = "board"; // "board" | "list"
  // Id del cliente cuyo drawer esta abierto ahorita, o null -- para saber si
  // hay que refrescar su historial de notas en vivo cuando cambia desde otro lado
  let currentDrawerClientId = null;

  // Pinta un <select> de etapa con los colores de status-<Etapa> (igual a los chips del sheet)
  function setStatusClass(el, status) {
    PIPELINE_STAGES.forEach((s) => el.classList.remove("status-" + s));
    el.classList.add("status-" + status);
  }

  // Deja solo digitos y "+" -- un tel: href no debe llevar texto libre, y de
  // paso evita que el numero rompa el atributo href si trae caracteres raros
  function telHref(contacto) {
    const digits = String(contacto || "").replace(/[^0-9+]/g, "");
    return digits ? "tel:" + digits : "";
  }

  function logCallAttempt(c) {
    c.callCount = (c.callCount || 0) + 1;
    c.lastCallAt = Date.now();
    persistClients();
    logActivity(`Llamo a "${c.name}"`);
  }

  // ---- Notas con fecha (historial, separado del campo "notas" de perfil) ----
  function addNote(c, text) {
    const trimmed = (text || "").trim();
    if (!trimmed) return;
    c.noteLog = c.noteLog || [];
    c.noteLog.unshift({ text: trimmed, at: Date.now() });
    persistClients();
    logActivity(`Nota en "${c.name}": ${trimmed.slice(0, 60)}${trimmed.length > 60 ? "..." : ""}`);
  }
  function formatNoteDate(ts) {
    return new Date(ts).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
  }
  function noteLogHtml(c) {
    const noteLog = c.noteLog || [];
    return noteLog.length
      ? noteLog.map((n) => `<div class="ld-note-entry"><div class="ld-note-date">${formatNoteDate(n.at)}</div><div class="ld-note-text">${escapeHtml(n.text)}</div></div>`).join("")
      : `<div style="font-size:12px; color:var(--text2);">Sin notas en el historial todavia</div>`;
  }

  // ---- Popover de resultado de llamada (sale al darle click a 📞) ----
  let callOutcomeCloseHandler = null;
  function showCallOutcomePopover(anchorEl, c) {
    const pop = document.getElementById("callOutcomePopover");
    if (!pop) return;
    pop.innerHTML = `
      <div class="cop-title">Resultado de la llamada</div>
      <button type="button" class="cop-btn" data-outcome="Contestó">✅ Contestó</button>
      <button type="button" class="cop-btn" data-outcome="No contestó">🔇 No contestó</button>
      <button type="button" class="cop-btn" data-outcome="Buzón">📬 Buzón</button>
      <button type="button" class="cop-btn" data-outcome="nota">📝 Dejar nota</button>
    `;
    pop.querySelectorAll(".cop-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.outcome === "nota") {
          pop.innerHTML = `
            <div class="cop-title">Nota de la llamada</div>
            <textarea placeholder="Que paso en la llamada..."></textarea>
            <button type="button" class="cop-save">Guardar</button>
          `;
          const ta = pop.querySelector("textarea");
          ta.focus();
          pop.querySelector(".cop-save").addEventListener("click", () => {
            addNote(c, "Llamada: " + ta.value.trim());
            hideCallOutcomePopover();
            afterNoteOrCallChange(c);
          });
        } else {
          addNote(c, "Llamada: " + btn.dataset.outcome);
          hideCallOutcomePopover();
          afterNoteOrCallChange(c);
        }
      });
    });

    const rect = anchorEl.getBoundingClientRect();
    pop.style.left = Math.max(10, Math.min(rect.left, window.innerWidth - 220)) + "px";
    pop.style.top = rect.bottom + 8 + "px";
    pop.classList.add("show");

    setTimeout(() => {
      callOutcomeCloseHandler = (e) => {
        if (!pop.contains(e.target) && e.target !== anchorEl) hideCallOutcomePopover();
      };
      document.addEventListener("click", callOutcomeCloseHandler);
    }, 0);
  }
  function hideCallOutcomePopover() {
    const pop = document.getElementById("callOutcomePopover");
    if (pop) pop.classList.remove("show");
    if (callOutcomeCloseHandler) {
      document.removeEventListener("click", callOutcomeCloseHandler);
      callOutcomeCloseHandler = null;
    }
  }

  // Refresca el board y, si esta abierto, el historial de notas del drawer
  // de este mismo cliente -- sin repintar todo el drawer (perderia lo que
  // se este escribiendo en el campo de notas de perfil a medio editar)
  function afterNoteOrCallChange(c) {
    renderPipeline();
    if (currentDrawerClientId === c.id) {
      const logEl = document.querySelector("#leadDrawer .ld-notelog");
      if (logEl) logEl.innerHTML = noteLogHtml(c);
    }
  }

  // ---- Tooltip flotante al dejar el mouse sobre una tarjeta ----
  // Delay de "puente" al salir, para que de tiempo de mover el mouse
  // de la tarjeta al tooltip (para poder escribir una nota ahi) sin que
  // se cierre antes de llegar.
  let tooltipShowTimer = null;
  let tooltipHideTimer = null;
  function renderCardTooltip(card, c) {
    const tip = document.getElementById("cardTooltip");
    if (!tip) return;
    const value = clientPipelineValue(c);
    const quoteCount = quotes.filter((q) => q.clientId === c.id).length;
    tip.innerHTML = `
      <div><b>${escapeHtml(c.name)}</b></div>
      ${c.contacto ? `<div>${escapeHtml(c.contacto)}</div>` : ""}
      ${c.negocio ? `<div>${escapeHtml(c.negocio)}</div>` : ""}
      ${c.ciudad || c.fuente ? `<div>${escapeHtml(c.ciudad || "")}${c.ciudad && c.fuente ? " · " : ""}${escapeHtml(c.fuente || "")}</div>` : ""}
      ${c.notas ? `<div style="margin-top:6px;">${escapeHtml(c.notas)}</div>` : ""}
      ${c.downpayment ? `<div style="margin-top:6px;"><b>DP:</b> ${escapeHtml(c.downpayment)}</div>` : ""}
      ${value > 0 ? `<div style="margin-top:6px;"><b>Valor:</b> ${formatMoney(value)}</div>` : ""}
      <div style="margin-top:6px; opacity:.75;">${quoteCount} cotizaci${quoteCount === 1 ? "on" : "ones"}${c.callCount ? " · " + c.callCount + " llamada" + (c.callCount === 1 ? "" : "s") : ""}${c.noteLog && c.noteLog.length ? " · " + c.noteLog.length + " nota" + (c.noteLog.length === 1 ? "" : "s") : ""}</div>
      <textarea placeholder="Agregar nota rapida..."></textarea>
      <button type="button" class="tip-note-save">Guardar nota</button>
    `;
    tip.querySelector(".tip-note-save").addEventListener("click", () => {
      const ta = tip.querySelector("textarea");
      addNote(c, ta.value);
      ta.value = "";
      renderPipeline();
    });
    const rect = card.getBoundingClientRect();
    tip.style.left = Math.max(10, Math.min(rect.right + 10, window.innerWidth - 270)) + "px";
    tip.style.top = Math.max(10, rect.top) + "px";
    tip.classList.add("show");
  }
  function showCardTooltipFor(card, c) {
    clearTimeout(tooltipHideTimer);
    clearTimeout(tooltipShowTimer);
    tooltipShowTimer = setTimeout(() => renderCardTooltip(card, c), 350);
  }
  function hideCardTooltipSoon() {
    clearTimeout(tooltipShowTimer);
    clearTimeout(tooltipHideTimer);
    tooltipHideTimer = setTimeout(hideCardTooltip, 150);
  }
  function hideCardTooltip() {
    clearTimeout(tooltipShowTimer);
    clearTimeout(tooltipHideTimer);
    const tip = document.getElementById("cardTooltip");
    if (tip) tip.classList.remove("show");
  }

  // ---- Panel lateral: toda la info de un lead ----
  function openLeadDrawer(c) {
    hideCardTooltip();
    hideCallOutcomePopover();
    const drawer = document.getElementById("leadDrawer");
    const backdrop = document.getElementById("leadDrawerBackdrop");
    if (!drawer || !backdrop) return;
    currentDrawerClientId = c.id;

    document.getElementById("ldAvatar").textContent = clientInitials(c.name);
    document.getElementById("ldName").textContent = c.name;
    document.getElementById("ldNegocio").textContent = c.negocio || "";

    const value = clientPipelineValue(c);
    const quoteCount = quotes.filter((q) => q.clientId === c.id).length;
    const needsFinancing = c.status === "Finance" || !!c.needsFinancing;
    const href = telHref(c.contacto);

    const body = document.getElementById("ldBody");
    body.innerHTML = `
      <div class="ld-row"><span class="ld-label">Etapa</span><span class="ld-value"><span class="status-pill status-${escapeHtml(c.status || "Cold")}" style="display:inline-block;">${escapeHtml(c.status || "Cold")}</span></span></div>
      ${c.ciudad ? `<div class="ld-row"><span class="ld-label">Ciudad</span><span class="ld-value">${escapeHtml(c.ciudad)}</span></div>` : ""}
      ${c.fuente ? `<div class="ld-row"><span class="ld-label">Fuente</span><span class="ld-value">${escapeHtml(c.fuente)}</span></div>` : ""}
      ${c.contacto ? `<div class="ld-row"><span class="ld-label">Telefono / contacto</span><span class="ld-value">${escapeHtml(c.contacto)}</span></div>` : ""}
      ${needsFinancing ? `<div class="ld-row"><span class="ld-label">Financiamiento</span><span class="ld-value">🏦 Si${c.downpayment ? " · DP: " + escapeHtml(c.downpayment) : ""}</span></div>` : ""}
      ${value > 0 ? `<div class="ld-row"><span class="ld-label">Valor en pipeline</span><span class="ld-value">${formatMoney(value)}</span></div>` : ""}
      <div class="ld-row"><span class="ld-label">Cotizaciones</span><span class="ld-value">${quoteCount}</span></div>
      ${c.callCount ? `<div class="ld-row"><span class="ld-label">Llamadas</span><span class="ld-value">${c.callCount} intento${c.callCount === 1 ? "" : "s"}${c.lastCallAt ? " · ultima: " + formatNoteDate(c.lastCallAt) : ""}</span></div>` : ""}
      <div class="ld-row">
        <span class="ld-label">Notas de perfil</span>
        <textarea id="ldNotasField" placeholder="Notas generales de este cliente...">${escapeHtml(c.notas || "")}</textarea>
      </div>
      <div class="ld-row">
        <span class="ld-label">Historial de notas</span>
        <div class="ld-notelog">${noteLogHtml(c)}</div>
        <div class="ld-note-form">
          <textarea id="ldNewNote" placeholder="Agregar una nota fechada..."></textarea>
          <button type="button" id="ldAddNote">+ Agregar nota</button>
        </div>
      </div>
      <div class="ld-actions">
        ${href ? `<a href="${href}" class="ld-call">📞 Llamar</a>` : ""}
        <button type="button" class="ld-quote">🧾 Hacer cotizacion</button>
        <button type="button" class="ld-edit">Editar cliente</button>
      </div>
    `;

    const notasField = document.getElementById("ldNotasField");
    notasField.addEventListener("change", () => {
      c.notas = notasField.value.trim();
      persistClients();
    });

    document.getElementById("ldAddNote").addEventListener("click", () => {
      const ta = document.getElementById("ldNewNote");
      if (!ta.value.trim()) return;
      addNote(c, ta.value);
      ta.value = "";
      const logEl = body.querySelector(".ld-notelog");
      if (logEl) logEl.innerHTML = noteLogHtml(c);
      renderPipeline();
    });

    if (href) {
      body.querySelector(".ld-call").addEventListener("click", () => {
        logCallAttempt(c);
        showCallOutcomePopover(body.querySelector(".ld-call"), c);
      });
    }
    body.querySelector(".ld-quote").addEventListener("click", () => {
      closeLeadDrawer();
      switchTab("quote");
      fClientSelect.value = c.id;
      fClientSelect.dispatchEvent(new Event("change"));
    });
    body.querySelector(".ld-edit").addEventListener("click", () => {
      closeLeadDrawer();
      switchTab("clients");
      startEditClient(c.id);
    });

    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    backdrop.classList.add("open");
  }
  function closeLeadDrawer() {
    currentDrawerClientId = null;
    const drawer = document.getElementById("leadDrawer");
    const backdrop = document.getElementById("leadDrawerBackdrop");
    if (drawer) {
      drawer.classList.remove("open");
      drawer.setAttribute("aria-hidden", "true");
    }
    if (backdrop) backdrop.classList.remove("open");
  }

  function buildPipelineCard(c) {
    const card = document.createElement("div");
    const needsFinancing = c.status === "Finance" || !!c.needsFinancing;
    // HOT + ya marcado que necesita financiamiento: tarjeta "apilada" --
    // el detras asoma para decir "esto tambien requiere lo otro"
    const stacked = c.status === "HOT" && !!c.needsFinancing;
    card.className = "pipeline-card" + (stacked ? " pipeline-card-stacked" : "");
    card.draggable = true;
    if (c.id === lastMovedClientId) {
      card.classList.add("card-enter");
      lastMovedClientId = null;
    }

    const value = clientPipelineValue(c);
    const quoteCount = quotes.filter((q) => q.clientId === c.id).length;
    const href = telHref(c.contacto);

    card.innerHTML = `
      ${stacked ? `<span class="pc-finance-tag">+ Finance</span>` : ""}
      <div class="pc-top">
        <span class="pc-avatar">${escapeHtml(clientInitials(c.name))}</span>
        <span class="pc-name">${escapeHtml(c.name)}</span>
      </div>
      ${c.negocio ? `<div class="pc-negocio">${escapeHtml(c.negocio)}</div>` : ""}
      ${c.ciudad || c.fuente ? `<div class="pc-meta">${escapeHtml(c.ciudad || "")}${c.ciudad && c.fuente ? " · " : ""}${escapeHtml(c.fuente || "")}</div>` : ""}
      ${c.createdAt ? `<div class="pc-date">${formatClientDate(c)}</div>` : ""}
      ${value > 0 ? `<div class="pc-value">${formatMoney(value)}</div>` : ""}
      <div class="pc-finance" style="display:none;">
        <span class="pc-finance-label">🏦 Financiamiento</span>
      </div>
      <div class="pc-foot">
        <span>${quoteCount} cotizaci${quoteCount === 1 ? "on" : "ones"}</span>
        ${href ? `<a href="${href}" class="pc-call" title="Llamar">📞${c.callCount ? ` <span class="pc-call-count">${c.callCount}x</span>` : ""}</a>` : ""}
        <button type="button" class="pc-note-btn" title="Agregar nota">📝${c.noteLog && c.noteLog.length ? ` <span class="pc-note-count">${c.noteLog.length}</span>` : ""}</button>
        <button type="button" class="pc-finance-toggle" title="Marcar/quitar que necesita financiamiento">🏦</button>
      </div>
      <div class="pc-note-form" style="display:none;">
        <textarea placeholder="Nota rapida con fecha..."></textarea>
        <button type="button">Guardar</button>
      </div>
      <div class="pc-actions-row">
        <select class="pc-move" aria-label="Mover a otra etapa"></select>
        <button type="button" class="pc-edit">Editar</button>
      </div>
    `;

    const moveSelect = card.querySelector(".pc-move");
    PIPELINE_STAGES.forEach((s) => {
      const o = document.createElement("option");
      o.value = s;
      o.textContent = s;
      if (s === c.status) o.selected = true;
      moveSelect.appendChild(o);
    });
    setStatusClass(moveSelect, c.status || "Cold");
    moveSelect.addEventListener("change", () => {
      setStatusClass(moveSelect, moveSelect.value);
      moveClientToStage(c.id, moveSelect.value);
    });

    const financeToggle = card.querySelector(".pc-finance-toggle");
    financeToggle.classList.toggle("active", !!c.needsFinancing);
    financeToggle.addEventListener("click", () => {
      c.needsFinancing = !c.needsFinancing;
      persistClients();
      renderPipeline();
    });

    const financeBlock = card.querySelector(".pc-finance");
    if (needsFinancing) {
      financeBlock.style.display = "";
      const dpInput = document.createElement("input");
      dpInput.type = "text";
      dpInput.className = "pc-dp-input";
      dpInput.placeholder = "DP: $0";
      dpInput.setAttribute("aria-label", "Enganche / downpayment");
      dpInput.value = c.downpayment || "";
      dpInput.addEventListener("click", (e) => e.stopPropagation());
      dpInput.addEventListener("change", () => {
        c.downpayment = dpInput.value.trim();
        persistClients();
      });
      financeBlock.appendChild(dpInput);
    }

    card.querySelector(".pc-edit").addEventListener("click", () => {
      switchTab("clients");
      startEditClient(c.id);
    });

    const callLink = card.querySelector(".pc-call");
    if (callLink) {
      callLink.addEventListener("click", (e) => {
        e.stopPropagation();
        logCallAttempt(c);
        showCallOutcomePopover(callLink, c);
      });
    }

    const noteBtn = card.querySelector(".pc-note-btn");
    const noteForm = card.querySelector(".pc-note-form");
    noteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const showing = noteForm.style.display !== "none";
      noteForm.style.display = showing ? "none" : "flex";
      if (!showing) noteForm.querySelector("textarea").focus();
    });
    noteForm.querySelector("textarea").addEventListener("click", (e) => e.stopPropagation());
    noteForm.querySelector("button").addEventListener("click", (e) => {
      e.stopPropagation();
      const ta = noteForm.querySelector("textarea");
      if (!ta.value.trim()) return;
      addNote(c, ta.value);
      renderPipeline();
    });

    card.addEventListener("dragstart", (e) => {
      dragSrcClientId = c.id;
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      dragSrcClientId = null;
    });

    card.addEventListener("mouseenter", () => showCardTooltipFor(card, c));
    card.addEventListener("mouseleave", hideCardTooltipSoon);
    card.addEventListener("click", (e) => {
      if (e.target.closest("select, input, button, a")) return;
      openLeadDrawer(c);
    });

    return card;
  }

  function moveClientToStage(clientId, stage) {
    const c = clients.find((x) => x.id === clientId);
    if (!c || c.status === stage) return;
    c.status = stage;
    persistClients();
    logActivity(`Movio a "${c.name}" a la etapa "${stage}"`);
    lastMovedClientId = clientId;
    renderPipeline();
    renderClientsTable();
  }

  // Busqueda de texto + rango de fechas, compartido entre el tablero y la lista del Pipeline
  function filterPipelineClients() {
    const q = (pipelineSearch.value || "").trim().toLowerCase();
    const fromStr = pipelineDateFrom.value;
    const toStr = pipelineDateTo.value;
    return clients.filter((c) => {
      const matchesSearch = !q || [c.name, c.contacto, c.negocio, c.ciudad, c.notas, c.fuente].some((f) => (f || "").toLowerCase().includes(q));
      return matchesSearch && clientInDateRange(c, fromStr, toStr);
    });
  }

  function renderPipeline() {
    const board = document.getElementById("pipelineBoard");
    if (!board) return;
    const filtered = filterPipelineClients();

    board.innerHTML = "";
    PIPELINE_STAGES.forEach((stage) => {
      const stageClients = filtered.filter((c) => (c.status || "Cold") === stage);
      const stageValue = stageClients.reduce((s, c) => s + clientPipelineValue(c), 0);

      const col = document.createElement("div");
      col.className = "pipeline-col";
      col.innerHTML = `
        <div class="pipeline-col-head">
          <span class="pipeline-col-title status-${escapeHtml(stage)}">${escapeHtml(stage)}</span>
          <span class="pipeline-col-count">${stageClients.length}</span>
        </div>
        <div class="pipeline-col-value">${stageValue > 0 ? formatMoney(stageValue) : ""}</div>
        <div class="pipeline-col-body"></div>
      `;

      const body = col.querySelector(".pipeline-col-body");
      if (stageClients.length === 0) {
        body.innerHTML = '<div class="pipeline-empty">Sin leads aqui</div>';
      } else {
        stageClients.forEach((c) => body.appendChild(buildPipelineCard(c)));
      }

      body.addEventListener("dragover", (e) => {
        e.preventDefault();
        body.classList.add("drag-over");
      });
      body.addEventListener("dragleave", () => {
        body.classList.remove("drag-over");
      });
      body.addEventListener("drop", (e) => {
        e.preventDefault();
        body.classList.remove("drag-over");
        if (dragSrcClientId) moveClientToStage(dragSrcClientId, stage);
      });

      board.appendChild(col);
    });

    renderPipelineList();
  }

  function renderPipelineList() {
    const tbody = document.getElementById("pipelineListTable");
    if (!tbody) return;
    const filtered = filterPipelineClients();
    const sorted = filtered.slice().sort((a, b) => {
      const ai = PIPELINE_STAGES.indexOf(a.status || "Cold");
      const bi = PIPELINE_STAGES.indexOf(b.status || "Cold");
      if (ai !== bi) return ai - bi;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    if (!sorted.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#7c8aa6;">Sin leads todavia</td></tr>';
      return;
    }

    tbody.innerHTML = sorted
      .map((c) => {
        const value = clientPipelineValue(c);
        const href = telHref(c.contacto);
        return `
        <tr data-client-id="${escapeHtml(c.id)}" class="pipeline-list-row">
          <td style="white-space:nowrap; color:var(--text2); font-size:11.5px;">${formatClientDate(c)}</td>
          <td>${escapeHtml(c.name)}</td>
          <td>${href ? `<a href="${href}" class="pc-call">📞 ${escapeHtml(c.contacto)}</a>` : ""}</td>
          <td>${escapeHtml(c.ciudad || "")}${c.ciudad && c.fuente ? " · " : ""}${escapeHtml(c.fuente || "")}</td>
          <td><span class="status-pill status-${escapeHtml(c.status || "Cold")}" style="display:inline-block;">${escapeHtml(c.status || "Cold")}</span></td>
          <td>${value > 0 ? formatMoney(value) : ""}</td>
          <td>${escapeHtml(c.notas || "")}</td>
        </tr>`;
      })
      .join("");

    tbody.querySelectorAll(".pipeline-list-row").forEach((tr) => {
      tr.addEventListener("click", (e) => {
        if (e.target.closest("a, button, select, input")) return;
        const c = clients.find((x) => x.id === tr.dataset.clientId);
        if (c) openLeadDrawer(c);
      });
    });
  }

  // ===== Portal de Fundadores (solo lectura) =====
  function buildFounderLeadCard(c) {
    const card = document.createElement("div");
    const needsFinancing = c.status === "Finance" || !!c.needsFinancing;
    const stacked = c.status === "HOT" && !!c.needsFinancing;
    card.className = "pipeline-card" + (stacked ? " pipeline-card-stacked" : "");

    const value = clientPipelineValue(c);
    const quoteCount = quotes.filter((q) => q.clientId === c.id).length;

    card.innerHTML = `
      <div class="pc-top">
        <span class="pc-avatar">${escapeHtml(clientInitials(c.name))}</span>
        <span class="pc-name">${escapeHtml(c.name)}</span>
      </div>
      ${c.negocio ? `<div class="pc-negocio">${escapeHtml(c.negocio)}</div>` : ""}
      ${c.ciudad || c.fuente ? `<div class="pc-meta">${escapeHtml(c.ciudad || "")}${c.ciudad && c.fuente ? " · " : ""}${escapeHtml(c.fuente || "")}</div>` : ""}
      ${c.createdAt ? `<div class="pc-date">${formatClientDate(c)}</div>` : ""}
      ${value > 0 ? `<div class="pc-value">${formatMoney(value)}</div>` : ""}
      ${needsFinancing ? `<div class="pc-finance"><span class="pc-finance-label">🏦 Financiamiento${c.downpayment ? " · DP: " + escapeHtml(c.downpayment) : ""}</span></div>` : ""}
      <div class="pc-foot"><span>${quoteCount} cotizaci${quoteCount === 1 ? "on" : "ones"}</span></div>
    `;
    return card;
  }

  function renderFounderLeads() {
    const board = document.getElementById("founderLeadsBoard");
    if (!board) return;
    board.innerHTML = "";
    PIPELINE_STAGES.forEach((stage) => {
      const stageClients = clients.filter((c) => (c.status || "Cold") === stage);
      const col = document.createElement("div");
      col.className = "pipeline-col";
      col.innerHTML = `
        <div class="pipeline-col-head">
          <span class="pipeline-col-title status-${escapeHtml(stage)}">${escapeHtml(stage)}</span>
          <span class="pipeline-col-count">${stageClients.length}</span>
        </div>
        <div class="pipeline-col-body"></div>
      `;
      const body = col.querySelector(".pipeline-col-body");
      if (!stageClients.length) {
        body.innerHTML = '<div class="pipeline-empty">Sin leads aqui</div>';
      } else {
        stageClients.forEach((c) => body.appendChild(buildFounderLeadCard(c)));
      }
      board.appendChild(col);
    });
  }

  // ===== Cotizaciones guardadas =====
  function persistQuotes() {
    syncSet(QUOTES_KEY, JSON.stringify(quotes), true);
  }

  // Sugiere el siguiente numero de cotizacion: NFT-<año>-XXX (consecutivo por año)
  function nextQuoteNumber() {
    const year = new Date().getFullYear();
    const prefix = `NFT-${year}-`;
    const re = new RegExp(`^${prefix}(\\d+)$`);
    let maxN = 0;
    quotes.forEach((q) => {
      const m = re.exec((q.number || "").trim());
      if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
    });
    return prefix + String(maxN + 1).padStart(3, "0");
  }

  function renderQuotesTable() {
    const tbody = document.getElementById("quotesTable");
    tbody.innerHTML = "";
    if (quotes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#7c8aa6;">Sin cotizaciones guardadas todavia</td></tr>';
      return;
    }
    const search = (quotesSearch.value || "").trim().toLowerCase();
    const filtered = search
      ? quotes.filter((q) => [q.cliente, q.number].some((f) => (f || "").toLowerCase().includes(search)))
      : quotes;
    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#7c8aa6;">Sin resultados para tu busqueda</td></tr>';
      return;
    }
    filtered
      .slice()
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .forEach((q) => {
        const subtotal = q.lineItems.reduce((sum, l) => sum + (parseFloat(l.price) || 0), 0);
        const saldo = subtotal - (parseFloat(q.deposito) || 0);

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${escapeHtml(q.number || "")}</td>
          <td>${escapeHtml(q.cliente || "")}</td>
          <td>${escapeHtml(q.fecha || "")}</td>
          <td>${formatMoney(subtotal)}</td>
          <td>${formatMoney(saldo)}</td>
          <td></td>
          <td class="actions-cell"></td>
        `;

        const statusTd = tr.children[5];
        const statusSelect = document.createElement("select");
        ["Borrador", "Enviada", "Aceptado", "Rechazada"].forEach((s) => {
          const o = document.createElement("option");
          o.value = s;
          o.textContent = s;
          if (s === q.status) o.selected = true;
          statusSelect.appendChild(o);
        });
        statusSelect.addEventListener("change", () => {
          q.status = statusSelect.value;
          q.updatedAt = Date.now();
          persistQuotes();
        });
        statusTd.appendChild(statusSelect);

        const actionsTd = tr.children[6];
        const loadBtn = document.createElement("button");
        loadBtn.type = "button";
        loadBtn.className = "btn-small";
        loadBtn.textContent = "Cargar";
        loadBtn.addEventListener("click", () => loadQuote(q.id));

        const dupBtn = document.createElement("button");
        dupBtn.type = "button";
        dupBtn.className = "btn-small";
        dupBtn.textContent = "Duplicar";
        dupBtn.addEventListener("click", () => duplicateQuote(q.id));

        const invoiceBtn = document.createElement("button");
        invoiceBtn.type = "button";
        invoiceBtn.className = "btn-small";
        invoiceBtn.textContent = isInvoice(q) ? "Ver invoice" : "Convertir a Invoice";
        invoiceBtn.addEventListener("click", () => {
          convertQuoteToInvoice(q.id);
          switchTab("invoices");
          if (isInvoice(q)) {
            buildInvoice(quotes.find((x) => x.id === q.id));
            previewWrap.scrollIntoView({ behavior: "smooth" });
          } else {
            invActivePanel.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        });

        const shareBtn = document.createElement("button");
        shareBtn.type = "button";
        shareBtn.className = "btn-small";
        shareBtn.textContent = q.sharedQuoteId ? "Actualizar link" : "Compartir";
        shareBtn.addEventListener("click", () => shareQuote(q.id));

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "btn-small";
        delBtn.textContent = "Eliminar";
        delBtn.addEventListener("click", () => {
          const pagadoTotal = (parseFloat(q.deposito) || 0) + (q.payments || []).reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
          const warn = isInvoice(q)
            ? ` Esta cotizacion tiene un invoice con ${formatMoney(pagadoTotal)} en pagos registrados — tambien se borraran.`
            : "";
          if (!confirm(`Eliminar la cotizacion ${q.number || ""}?${warn}`)) return;
          quotes = quotes.filter((x) => x.id !== q.id);
          if (finSelectedQuoteId === q.id) { finSelectedQuoteId = null; finControls.style.display = "none"; }
          if (invSelectedQuoteId === q.id) { invSelectedQuoteId = null; invActivePanel.style.display = "none"; cancelEditPayment(); }
          persistQuotes();
          renderQuotesTable();
          renderFinanceTable();
          renderFinanceQuoteSelect();
          renderInvoiceQuoteSelect();
          renderInvoicesTable();
          renderClientsTable();
        });

        actionsTd.appendChild(loadBtn);
        actionsTd.appendChild(dupBtn);
        actionsTd.appendChild(invoiceBtn);
        actionsTd.appendChild(shareBtn);
        actionsTd.appendChild(delBtn);

        tbody.appendChild(tr);
      });
  }

  // ===== Financiamiento: lista de planes activos (uno por cotizacion) =====
  function renderFinanceTable() {
    const tbody = document.getElementById("financeTable");
    tbody.innerHTML = "";
    const financed = quotes.filter(
      (q) => q.finance && (parseFloat(q.finance.principal) || 0) > 0 && (parseFloat(q.finance.ratePct) || 0) > 0
    );
    if (financed.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#7c8aa6;">Sin planes de financiamiento todavia. Captura capital, tasa add-on y plazo en una cotizacion y guardala.</td></tr>';
      return;
    }
    financed
      .slice()
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .forEach((q) => {
        const plan = computeAddOnAmortization(q.finance.principal, q.finance.ratePct, q.finance.months);
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${escapeHtml(q.cliente || "")}</td>
          <td>${escapeHtml(q.number || "")}</td>
          <td>${formatMoney(plan.principal)}</td>
          <td>${plan.ratePct}% / ${plan.months} m</td>
          <td>${formatMoney(plan.basePayment)}</td>
          <td>${formatMoney(plan.totalToPay)}</td>
          <td class="actions-cell"></td>
        `;
        const actionsTd = tr.children[6];

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "btn-small";
        editBtn.textContent = "Editar plan";
        editBtn.addEventListener("click", () => {
          finQuoteSelect.value = q.id;
          loadFinanceQuote(q.id);
          finControls.scrollIntoView({ behavior: "smooth", block: "center" });
        });

        const exhibitBtn = document.createElement("button");
        exhibitBtn.type = "button";
        exhibitBtn.className = "btn-small";
        exhibitBtn.textContent = "Ver Exhibit C";
        exhibitBtn.addEventListener("click", () => {
          finQuoteSelect.value = q.id;
          loadFinanceQuote(q.id);
          if (buildFinanceExhibit(q) !== false) {
            previewWrap.scrollIntoView({ behavior: "smooth" });
          }
        });

        actionsTd.appendChild(editBtn);
        actionsTd.appendChild(exhibitBtn);
        tbody.appendChild(tr);
      });
  }

  function loadQuote(id) {
    const q = quotes.find((x) => x.id === id);
    if (!q) return;
    currentQuoteId = q.id;
    fCliente.value = q.cliente || "";
    fContacto.value = q.contacto || "";
    fNumero.value = q.number || "";
    fEntrega.value = q.entrega || "";
    fFecha.value = q.fecha || "";
    fGarantia.value = q.garantia || "1 Año — Tryla";
    loadedDeposito = q.deposito || 0;
    fIdioma.value = q.idioma || "es";
    fIdioma.dispatchEvent(new Event("change"));
    fClientSelect.value = q.clientId || "";
    specsEl.value = (q.notas || []).join("\n");
    lineItems = (q.lineItems || []).map((l) => ({ ...l }));
    renderCatalog();
    renderDatalist();
    renderLineItems();
    updateTotals();

    switchTab("quote");
    previewWrap.classList.remove("show");
  }

  function duplicateQuote(id) {
    const q = quotes.find((x) => x.id === id);
    if (!q) return;
    loadQuote(id);
    currentQuoteId = null;
    fNumero.value = nextQuoteNumber();
    fFecha.value = new Date().toISOString().slice(0, 10);
    updateTotals();
  }

  document.getElementById("btnSave").addEventListener("click", () => {
    const { subtotal, deposito, saldo } = updateTotals();
    const client = findOrCreateClient(fCliente.value.trim(), fContacto.value.trim(), fEntrega.value.trim());

    // Preserva financiamiento y pagos existentes (se editan en sus propias pestañas)
    const existing = quotes.find((x) => x.id === currentQuoteId);

    const quoteData = {
      id: currentQuoteId || "q" + Date.now(),
      number: fNumero.value.trim(),
      clientId: client ? client.id : (fClientSelect.value || null),
      cliente: fCliente.value.trim(),
      contacto: fContacto.value.trim(),
      entrega: fEntrega.value.trim(),
      fecha: fFecha.value,
      garantia: fGarantia.value,
      idioma: fIdioma.value,
      deposito,
      lineItems: lineItems.map((l) => ({ ...l })),
      notas: specsEl.value.split("\n").map((s) => s.trim()).filter((s) => s !== ""),
      finance: existing && existing.finance ? existing.finance : null,
      payments: existing && existing.payments ? existing.payments : [],
      invoiceCreated: existing ? !!existing.invoiceCreated : false,
      invoiceCreatedAt: existing ? existing.invoiceCreatedAt : null,
      sharedQuoteId: existing ? existing.sharedQuoteId || null : null,
      status: "Borrador",
      updatedAt: Date.now(),
    };

    const existingIdx = quotes.findIndex((x) => x.id === quoteData.id);
    if (existingIdx >= 0) {
      quoteData.status = quotes[existingIdx].status;
      quotes[existingIdx] = quoteData;
      logActivity(`Actualizo la cotizacion ${quoteData.number || ""} (${quoteData.cliente || ""})`);
    } else {
      quotes.push(quoteData);
      logActivity(`Creo la cotizacion ${quoteData.number || ""} (${quoteData.cliente || ""})`);
    }
    currentQuoteId = quoteData.id;
    persistQuotes();
    renderQuotesTable();
    renderFinanceTable();
    renderFinanceQuoteSelect();
    renderInvoiceQuoteSelect();
    renderInvoicesTable();
    renderClientSelect();
    renderClientsTable();
    alert("Cotizacion guardada.");
  });

  // ===== Traducciones del documento =====
  const I18N = {
    es: {
      locale: "es-MX",
      title: "COTIZACION DE VENTA",
      preparedBy: "PREPARADO POR",
      company: "EMPRESA",
      companyName: "Tryla",
      companyAddress: "1111 Ellenwood St, Dallas, TX 75217",
      date: "FECHA",
      quoteNo: "NO. DE COTIZACION",
      clientInfo: "Informacion del cliente",
      client: "CLIENTE",
      contact: "CONTACTO",
      deliverTo: "ENTREGA EN",
      warranty: "GARANTIA",
      components: "Componentes de la cotizacion",
      qty: "CANT",
      description: "DESCRIPCION",
      unitPrice: "PRECIO UNIT.",
      total: "TOTAL",
      noComponents: "Sin componentes agregados",
      notesTitle: "Notas y especificaciones adicionales",
      priceSummary: "Resumen de precio",
      subtotal: "Subtotal",
      termsTitle: "Terminos y notas",
      warrantyNoteTitle: "Garantia",
      warrantyNoteText: "Este trailer incluye la garantia indicada arriba, gestionada a traves de Tryla, cubriendo defectos de fabricacion. La garantia no cubre mal uso, danos accidentales ni desgaste normal.",
      paymentScheduleTitle: "Calendario de pagos",
      paymentScheduleText: "La forma de pago se acuerda directamente entre Tryla y el cliente antes de iniciar la construccion. El pago completo debe realizarse antes de la entrega.",
      constructionTitle: "Construccion y entrega",
      constructionText: (dest) => `La entrega estimada es en ${dest} una vez completada la construccion y liquidado el pago.`,
      destinationFallback: "el destino acordado",
      signaturesTitle: "Aceptacion y firmas",
      signaturesText: "Al firmar a continuacion, ambas partes aceptan los terminos descritos en esta cotizacion.",
      sellerSig: "Marcelo Ramos Schiaffino — Tryla",
      clientSig: "Cliente",
      clientSigFallback: "Cliente",
      financingTitle: "Financiamiento interno — Tabla de amortizacion",
      financingDocTitle: "TABLA DE AMORTIZACION",
      finExhibitLabel: "Exhibit C — Financiamiento a",
      finDebtor: "DEUDOR",
      finPrincipalLabel: "CAPITAL FINANCIADO",
      finRateTerm: "TASA ADD-ON / PLAZO",
      finInterestLabel: "INTERES TOTAL",
      finTotalLabel: "TOTAL A PAGAR",
      finTableMonth: "MES",
      finTablePayment: "PAGO",
      finTableCapital: "CAPITAL",
      finTableInterest: "INTERES",
      finTableBalance: "SALDO RESTANTE",
      finMonthsShort: "meses",
      finAdjustLabel: "ajuste redondeo",
      finAdjustTitle: "Ajuste por redondeo",
      finAdjustText: (month, amt) => `El pago del mes ${month} se ajusta en ${amt} para saldar el capital exactamente en cero, por el redondeo acumulado de los pagos mensuales.`,
      finConfidential: "Documento privado y confidencial",
      finPageLabel: (name) => `Pagina 1 de 1 — Tabla de Amortizacion (${name || "Cliente"})`,
      invoiceDocTitle: "ESTADO DE CUENTA / INVOICE",
      invLabelFor: "Cuenta de",
      invDate: "FECHA",
      invQuoteNo: "NO. DE COTIZACION",
      invClient: "CLIENTE",
      invContact: "CONTACTO",
      invPaymentsTitle: "Pagos recibidos",
      invColDate: "FECHA",
      invColConcept: "CONCEPTO",
      invColAmount: "MONTO",
      invSummaryTitle: "Resumen",
      invTotalSale: "Total de la venta",
      invTotalPaid: "Total pagado",
      invBalance: "SALDO RESTANTE",
      invNoPayments: "Sin pagos registrados",
      invPageLabel: (name) => `Estado de cuenta — ${name || "Cliente"}`,
    },
    en: {
      locale: "en-US",
      title: "SALES QUOTE",
      preparedBy: "PREPARED BY",
      company: "COMPANY",
      companyName: "Tryla",
      companyAddress: "1111 Ellenwood St, Dallas, TX 75217",
      date: "DATE",
      quoteNo: "QUOTE NO.",
      clientInfo: "Customer information",
      client: "CUSTOMER",
      contact: "CONTACT",
      deliverTo: "DELIVERY TO",
      warranty: "WARRANTY",
      components: "Quote components",
      qty: "QTY",
      description: "DESCRIPTION",
      unitPrice: "UNIT PRICE",
      total: "TOTAL",
      noComponents: "No components added",
      notesTitle: "Additional notes and specifications",
      priceSummary: "Price summary",
      subtotal: "Subtotal",
      termsTitle: "Terms and notes",
      warrantyNoteTitle: "Warranty",
      warrantyNoteText: "This trailer includes the warranty indicated above, handled through Tryla, covering manufacturing defects. The warranty does not cover misuse, accidental damage or normal wear and tear.",
      paymentScheduleTitle: "Payment schedule",
      paymentScheduleText: "Payment terms are agreed directly between Tryla and the customer before construction begins. Full payment must be made before delivery.",
      constructionTitle: "Construction and delivery",
      constructionText: (dest) => `Estimated delivery is in ${dest} once construction is complete and payment is settled.`,
      destinationFallback: "the agreed destination",
      signaturesTitle: "Acceptance and signatures",
      signaturesText: "By signing below, both parties accept the terms described in this quote.",
      sellerSig: "Marcelo Ramos Schiaffino — Tryla",
      clientSig: "Customer",
      clientSigFallback: "Customer",
      financingTitle: "In-house financing — Amortization schedule",
      financingDocTitle: "AMORTIZATION SCHEDULE",
      finExhibitLabel: "Exhibit C — Financing for",
      finDebtor: "BORROWER",
      finPrincipalLabel: "FINANCED PRINCIPAL",
      finRateTerm: "ADD-ON RATE / TERM",
      finInterestLabel: "TOTAL INTEREST",
      finTotalLabel: "TOTAL TO PAY",
      finTableMonth: "MONTH",
      finTablePayment: "PAYMENT",
      finTableCapital: "PRINCIPAL",
      finTableInterest: "INTEREST",
      finTableBalance: "REMAINING BALANCE",
      finMonthsShort: "months",
      finAdjustLabel: "rounding adjustment",
      finAdjustTitle: "Rounding adjustment",
      finAdjustText: (month, amt) => `The month ${month} payment is adjusted by ${amt} to settle the principal at exactly zero, due to accumulated rounding in the monthly payments.`,
      finConfidential: "Private and confidential document",
      finPageLabel: (name) => `Page 1 of 1 — Amortization Schedule (${name || "Customer"})`,
      invoiceDocTitle: "STATEMENT / INVOICE",
      invLabelFor: "Account for",
      invDate: "DATE",
      invQuoteNo: "QUOTE NO.",
      invClient: "CUSTOMER",
      invContact: "CONTACT",
      invPaymentsTitle: "Payments received",
      invColDate: "DATE",
      invColConcept: "CONCEPT",
      invColAmount: "AMOUNT",
      invSummaryTitle: "Summary",
      invTotalSale: "Total sale",
      invTotalPaid: "Total paid",
      invBalance: "REMAINING BALANCE",
      invNoPayments: "No payments recorded",
      invPageLabel: (name) => `Statement — ${name || "Customer"}`,
    },
  };

  // ===== Bloque de financiamiento interno (Exhibit C) para el documento =====
  function financeExhibitBody(t, plan, clienteName, opts) {
    if (!plan) return "";
    opts = opts || {};
    const rateTermText = `${plan.ratePct}% / ${plan.months} ${t.finMonthsShort}`;

    const rows = plan.schedule
      .map(
        (row) => `
        <tr>
          <td>${row.n}${row.adjusted ? ` <span style="color:#7c8aa6; font-size:10.5px;">(${t.finAdjustLabel})</span>` : ""}</td>
          <td class="num">${formatMoney(row.pago)}</td>
          <td class="num">${formatMoney(row.capital)}</td>
          <td class="num">${formatMoney(row.interes)}</td>
          <td class="num">${formatMoney(row.balance)}</td>
        </tr>`
      )
      .join("");

    const adjustNote =
      Math.abs(plan.lastAdjust) >= 0.01
        ? `<div class="doc-note"><b>${t.finAdjustTitle}</b>${t.finAdjustText(plan.months, formatMoney(Math.abs(plan.lastAdjust)))}</div>`
        : "";

    return `
      ${opts.hideTitle ? "" : `<div class="doc-section">${t.financingTitle}</div>`}
      <table class="doc-client">
        <tr><td class="label">${t.finDebtor}</td><td>${escapeHtml(clienteName || "-")}</td></tr>
        <tr><td class="label">${t.finPrincipalLabel}</td><td>${formatMoney(plan.principal)}</td></tr>
        <tr><td class="label">${t.finRateTerm}</td><td>${rateTermText}</td></tr>
        <tr><td class="label">${t.finInterestLabel}</td><td>${formatMoney(plan.totalInterest)}</td></tr>
        <tr><td class="label">${t.finTotalLabel}</td><td>${formatMoney(plan.totalToPay)}</td></tr>
      </table>
      <table class="doc-product" style="margin-top:10px;">
        <tr><th>${t.finTableMonth}</th><th class="num">${t.finTablePayment}</th><th class="num">${t.finTableCapital}</th><th class="num">${t.finTableInterest}</th><th class="num">${t.finTableBalance}</th></tr>
        ${rows}
        <tr style="font-weight:800; background:var(--light);">
          <td>${t.total}</td>
          <td class="num">${formatMoney(plan.totalToPay)}</td>
          <td class="num">${formatMoney(plan.principal)}</td>
          <td class="num">${formatMoney(plan.totalInterest)}</td>
          <td class="num"></td>
        </tr>
      </table>
      ${adjustNote}
    `;
  }

  function buildFinanceExhibit(q) {
    if (!currentFinancePlan) {
      alert("Captura capital, tasa add-on y plazo (mayores a cero) para calcular el plan de financiamiento antes de generar el Exhibit C.");
      return false;
    }
    const cliente = q ? q.cliente : (finSelectedQuote() ? finSelectedQuote().cliente : "");
    const t = I18N[(q && q.idioma) || "es"] || I18N.es;
    previewDoc.innerHTML = `
      <div class="doc-header">
        <img src="../assets/tryla_logo.png" alt="Tryla">
        <h1>TRYLA<span style="font-size:0.4em;vertical-align:super;">&reg;</span></h1>
      </div>
      <div style="text-align:center; font-size:11px; letter-spacing:1.5px; color:#5b6b8c; margin:-4px 0 10px;">
        MARCELO RAMOS SCHIAFFINO — DBA NOVA FOOD TRAILER<br>Dallas County, Texas
      </div>
      <div class="doc-title">${t.financingDocTitle}</div>
      <div style="text-align:center; font-size:12px; color:var(--blue); font-weight:700; margin-bottom:18px;">
        ${t.finExhibitLabel} ${escapeHtml(cliente || "-")}
      </div>
      ${financeExhibitBody(t, currentFinancePlan, cliente, { hideTitle: true })}
      <div class="doc-footer">
        <b>Tryla</b> &middot; ${t.companyAddress} &middot; ${t.finConfidential} &middot; ${t.finPageLabel(cliente)}
      </div>
    `;
    previewWrap.classList.add("show");
    return true;
  }

  finExhibitBtn.addEventListener("click", () => {
    const q = finSelectedQuote();
    if (!q) {
      alert("Selecciona una cotizacion primero.");
      return;
    }
    if (buildFinanceExhibit(q) !== false) {
      previewWrap.scrollIntoView({ behavior: "smooth" });
    }
  });

  // ===== Generar invoice / estado de cuenta =====
  // q = objeto cotizacion. Lee todo del objeto (no del formulario del Cotizador).
  function buildInvoice(q) {
    if (!q) return false;
    const t = I18N[q.idioma] || I18N.es;
    const totals = quoteTotals(q);
    const subtotal = totals.subtotal;
    const deposito = totals.deposito;
    const qPayments = q.payments || [];
    const pagadoAbonos = qPayments.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
    const totalPagado = deposito + pagadoAbonos;
    const saldo = subtotal - totalPagado;

    const fechaHoy = new Date().toLocaleDateString(t.locale, { year: "numeric", month: "long", day: "numeric" });

    // Filas: cada abono registrado (el deposito historico, si lo hay, no se
    // desglosa como linea; solo se descuenta del saldo final).
    const rows = [];
    qPayments.forEach((p) => {
      rows.push(`
        <tr>
          <td>${escapeHtml(p.fecha || "")}</td>
          <td>${escapeHtml(p.concepto || "")}</td>
          <td class="num">${formatMoney(parseFloat(p.monto) || 0)}</td>
        </tr>`);
    });
    const rowsHtml = rows.length
      ? rows.join("")
      : `<tr><td colspan="3" style="text-align:center; color:#7c8aa6;">${t.invNoPayments}</td></tr>`;

    // Lo que incluye la cotizacion (mismos componentes que la cotizacion, con precio)
    const productRows = buildProductRows(true, q.lineItems || []);
    const includesSection = productRows
      ? `
      <div class="doc-section">${t.components}</div>
      <table class="doc-product">
        <tr><th>${t.qty}</th><th>${t.description}</th><th class="num">${t.unitPrice}</th><th class="num">${t.total}</th></tr>
        ${productRows}
      </table>`
      : "";

    // Notas / especificaciones sin precio (si hay)
    const specLines = (q.notas || [])
      .map((s) => (s || "").trim())
      .filter((s) => s !== "")
      .map((s) => `<li>${escapeHtml(s)}</li>`)
      .join("");
    const notesSection = specLines
      ? `<div class="doc-section">${t.notesTitle}</div><ul class="doc-list">${specLines}</ul>`
      : "";

    previewDoc.innerHTML = `
      <div class="doc-header">
        <img src="../assets/tryla_logo.png" alt="Tryla">
        <h1>TRYLA<span style="font-size:0.4em;vertical-align:super;">&reg;</span></h1>
      </div>
      <div class="doc-title">${t.invoiceDocTitle}</div>
      <div style="text-align:center; font-size:12px; color:var(--blue); font-weight:700; margin-bottom:18px;">
        ${t.invLabelFor} ${escapeHtml(q.cliente || "-")}
      </div>

      <div class="doc-meta">
        <div>
          <div class="label">${t.invClient}</div>
          <div class="value">${escapeHtml(q.cliente || "-")}</div>
          <div class="label" style="margin-top:6px;">${t.invContact}</div>
          <div class="value">${escapeHtml(q.contacto || "-")}</div>
        </div>
        <div style="text-align:right;">
          <div class="label">${t.invDate}</div>
          <div class="value">${escapeHtml(fechaHoy)}</div>
          <div class="label" style="margin-top:6px;">${t.invQuoteNo}</div>
          <div class="value">${escapeHtml(q.number || "-")}</div>
        </div>
      </div>

      ${includesSection}
      ${notesSection}

      <div class="doc-section">${t.invPaymentsTitle}</div>
      <table class="doc-product">
        <tr><th>${t.invColDate}</th><th>${t.invColConcept}</th><th class="num">${t.invColAmount}</th></tr>
        ${rowsHtml}
      </table>

      <div class="doc-section">${t.invSummaryTitle}</div>
      <table class="doc-pricing">
        <tr><td class="label">${t.invTotalSale}</td><td style="width:150px;">${formatMoney(subtotal)}</td></tr>
        <tr><td class="label">${t.invTotalPaid}</td><td>- ${formatMoney(totalPagado)}</td></tr>
        <tr class="total"><td class="label">${t.invBalance}</td><td>${formatMoney(saldo)}</td></tr>
      </table>

      <div class="doc-footer">
        <b>Tryla</b> &middot; ${t.companyAddress} &middot; ${t.finConfidential} &middot; ${t.invPageLabel(q.cliente)}
      </div>
    `;
    previewWrap.classList.add("show");
    return true;
  }

  payInvoiceBtn.addEventListener("click", () => {
    const q = invSelectedQuote();
    if (!q) {
      alert("Selecciona una cotizacion primero.");
      return;
    }
    buildInvoice(q);
    previewWrap.scrollIntoView({ behavior: "smooth" });
  });

  // ===== Generar documento de cotizacion =====
  // Arma las filas del producto agrupando la unidad base con sus incluidos ($0).
  // showPrice=false oculta las columnas de precio (para el invoice, que solo lista lo incluido).
  function buildProductRows(showPrice, items) {
    const src = items || lineItems;
    const filtered = src.filter((l) => (l.desc || "").trim() !== "");
    const rows = [];
    let i = 0;
    while (i < filtered.length) {
      const l = filtered[i];
      const descLower = l.desc.toLowerCase();
      const priceCells = showPrice
        ? `<td class="num">${formatMoney(l.price)}</td><td class="num">${formatMoney(l.price)}</td>`
        : "";
      if (descLower.includes("unidad base") || descLower.includes("base unit")) {
        const included = [];
        let j = i + 1;
        while (j < filtered.length && (parseFloat(filtered[j].price) || 0) === 0) {
          included.push(filtered[j].desc);
          j++;
        }
        const subList = included.length
          ? `<div class="inc-list">${included.map((d) => escapeHtml(d)).join(" &middot; ")}</div>`
          : "";
        rows.push(`
        <tr>
          <td>1</td>
          <td>${escapeHtml(l.desc)}${subList}</td>
          ${priceCells}
        </tr>`);
        i = j;
      } else {
        rows.push(`
        <tr>
          <td>1</td>
          <td>${escapeHtml(l.desc)}</td>
          ${priceCells}
        </tr>`);
        i++;
      }
    }
    return rows.join("");
  }

  function buildPreview() {
    const { subtotal } = updateTotals();
    const t = I18N[fIdioma.value] || I18N.es;

    const fechaVal = fFecha.value
      ? new Date(fFecha.value + "T00:00:00").toLocaleDateString(t.locale, { year: "numeric", month: "long", day: "numeric" })
      : "";

    const rowsHtml = buildProductRows(true);

    const specLines = specsEl.value
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s !== "")
      .map((s) => `<li>${escapeHtml(s)}</li>`)
      .join("");

    previewDoc.innerHTML = `
      <div class="doc-header">
        <img src="../assets/tryla_logo.png" alt="Tryla">
        <h1>TRYLA<span style="font-size:0.4em;vertical-align:super;">&reg;</span></h1>
      </div>
      <div class="doc-title">${t.title}</div>

      <div class="doc-meta">
        <div>
          <div class="label">${t.preparedBy}</div>
          <div class="value">Marcelo Ramos Schiaffino</div>
          <div class="label" style="margin-top:6px;">${t.company}</div>
          <div class="value">${t.companyName}</div>
          <div style="font-size:11px; color:#5b6b8c; margin-top:2px;">${t.companyAddress}</div>
        </div>
        <div style="text-align:right;">
          <div class="label">${t.date}</div>
          <div class="value">${escapeHtml(fechaVal)}</div>
          <div class="label" style="margin-top:6px;">${t.quoteNo}</div>
          <div class="value">${escapeHtml(fNumero.value)}</div>
        </div>
      </div>

      <div class="doc-section">${t.clientInfo}</div>
      <table class="doc-client">
        <tr><td class="label">${t.client}</td><td>${escapeHtml(fCliente.value)}</td></tr>
        <tr><td class="label">${t.contact}</td><td>${escapeHtml(fContacto.value)}</td></tr>
        <tr><td class="label">${t.deliverTo}</td><td>${escapeHtml(fEntrega.value)}</td></tr>
        <tr><td class="label">${t.warranty}</td><td>${escapeHtml(fGarantia.value)}</td></tr>
      </table>

      <div class="doc-section">${t.components}</div>
      <table class="doc-product">
        <tr><th>${t.qty}</th><th>${t.description}</th><th class="num">${t.unitPrice}</th><th class="num">${t.total}</th></tr>
        ${rowsHtml || `<tr><td colspan="4" style="text-align:center; color:#7c8aa6;">${t.noComponents}</td></tr>`}
      </table>

      ${specLines ? `
      <div class="doc-section">${t.notesTitle}</div>
      <ul class="doc-list">${specLines}</ul>
      ` : ""}

      <div class="doc-section">${t.priceSummary}</div>
      <table class="doc-pricing">
        <tr class="total"><td class="label">${t.total}</td><td style="width:140px;">${formatMoney(subtotal)}</td></tr>
      </table>

      ${finIncluirPdf.checked && currentFinancePlan ? financeExhibitBody(t, currentFinancePlan, fCliente.value) : ""}

      <div class="doc-section">${t.termsTitle}</div>
      <div class="doc-note">
        <b>${t.warrantyNoteTitle}</b>
        ${t.warrantyNoteText}
      </div>
      <div class="doc-note">
        <b>${t.paymentScheduleTitle}</b>
        ${t.paymentScheduleText}
      </div>
      <div class="doc-note">
        <b>${t.constructionTitle}</b>
        ${t.constructionText(escapeHtml(fEntrega.value || t.destinationFallback))}
      </div>

      <div class="doc-section">${t.signaturesTitle}</div>
      <p style="font-size:12.5px; color:#5b6b8c;">${t.signaturesText}</p>
      <div class="doc-signatures">
        <div class="doc-sig">${t.sellerSig}</div>
        <div class="doc-sig">${escapeHtml(fCliente.value || t.clientSigFallback)} — ${t.clientSig}</div>
      </div>

      <div class="doc-footer">
        <b>Tryla</b> &middot; 1111 Ellenwood St, Dallas, TX 75217 &middot; Marcelo Ramos Schiaffino &middot; +1 (645) 235-3186 &middot; marcelo.ramos@thetryla.com
      </div>
    `;

    previewWrap.classList.add("show");
  }

  // ===== Compartir cotizacion por link publico (thetryla.com/?quote=<id>) =====
  async function shareQuote(id) {
    const q = quotes.find((x) => x.id === id);
    if (!q) return;
    if (!window.SharedQuotes || !window.SharedQuotes.ready) {
      alert("Compartir requiere estar conectado a la nube (Supabase).");
      return;
    }
    loadQuote(id);
    buildPreview();
    const html = previewDoc.innerHTML.replace(
      'src="../assets/tryla_logo.png"',
      'src="https://thetryla.app/assets/tryla_logo.png"'
    );
    try {
      const shareId = await window.SharedQuotes.save(html, q.cliente, q.number, q.sharedQuoteId);
      q.sharedQuoteId = shareId;
      persistQuotes();
      renderQuotesTable();
      const link = `https://thetryla.com/?quote=${shareId}`;
      try {
        await navigator.clipboard.writeText(link);
        alert("Link copiado al portapapeles:\n" + link);
      } catch (e) {
        prompt("Copia este link para compartir:", link);
      }
    } catch (e) {
      alert("No se pudo compartir la cotizacion: " + (e.message || e));
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  document.getElementById("btnPreview").addEventListener("click", () => {
    buildPreview();
    previewWrap.scrollIntoView({ behavior: "smooth" });
  });

  document.getElementById("btnPrint").addEventListener("click", () => {
    buildPreview();
    window.print();
  });

  // Boton generico en el panel de documento compartido: imprime/descarga lo
  // que este actualmente mostrado (cotizacion, invoice/estado de cuenta o
  // Exhibit C), sin importar desde que pestana se genero.
  document.getElementById("btnPrintDoc").addEventListener("click", () => {
    window.print();
  });

  document.getElementById("btnReset").addEventListener("click", () => {
    if (!confirm("Esto borrara los datos de la cotizacion actual (no afecta el catalogo, clientes ni cotizaciones guardadas). Continuar?")) return;
    lineItems = [];
    currentQuoteId = null;
    renderLineItems();
    fCliente.value = "";
    fContacto.value = "";
    fNumero.value = nextQuoteNumber();
    fEntrega.value = "";
    fFecha.value = new Date().toISOString().slice(0, 10);
    loadedDeposito = 0;
    fIdioma.value = "es";
    fIdioma.dispatchEvent(new Event("change"));
    fClientSelect.value = "";
    specsEl.value = "";
    sizePresetEl.value = "";
    renderCatalog();
    renderDatalist();
    previewWrap.classList.remove("show");
    updateTotals();
  });

  // ===== Tabs =====
  function switchTab(name) {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === name);
    });
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === `tab-${name}`);
    });
    if (name === "dashboard") renderDashboard();
    if (name === "pipeline") renderPipeline();
  }

  // ===== Resumen / dashboard =====
  function renderDashboard() {
    const nonInvoiced = quotes.filter((q) => !isInvoice(q));
    const invoiced = quotes.filter(isInvoice);

    const pipeline = nonInvoiced.reduce((s, q) => s + quoteTotals(q).subtotal, 0);
    const facturado = invoiced.reduce((s, q) => s + quoteTotals(q).subtotal, 0);
    const balances = invoiced.map((q) => {
      const t = quoteTotals(q);
      const pagosSum = (q.payments || []).reduce((ss, p) => ss + (parseFloat(p.monto) || 0), 0);
      const pagado = t.deposito + pagosSum;
      return { q, subtotal: t.subtotal, pagado, saldo: t.subtotal - pagado };
    });
    const cobrado = balances.reduce((s, b) => s + b.pagado, 0);
    const pendiente = facturado - cobrado;

    document.getElementById("dashPipeline").textContent = formatMoney(pipeline);
    document.getElementById("dashFacturado").textContent = formatMoney(facturado);
    document.getElementById("dashCobrado").textContent = formatMoney(cobrado);
    document.getElementById("dashPendiente").textContent = formatMoney(pendiente);

    const statusOrder = PIPELINE_STAGES;
    const counts = {};
    statusOrder.forEach((s) => (counts[s] = 0));
    clients.forEach((c) => {
      counts[c.status] = (counts[c.status] || 0) + 1;
    });
    document.getElementById("dashClientStatus").innerHTML = statusOrder
      .map((s) => `<div class="dash-card"><div class="n">${counts[s] || 0}</div><div class="l">${escapeHtml(s)}</div></div>`)
      .join("");

    const topBalances = balances
      .filter((b) => b.saldo > 0)
      .sort((a, b) => b.saldo - a.saldo)
      .slice(0, 5);
    const tbody = document.getElementById("dashTopBalances");
    tbody.innerHTML = topBalances.length
      ? topBalances
          .map(
            ({ q, subtotal, pagado, saldo }) => `
        <tr>
          <td>${escapeHtml(q.cliente || "")}</td>
          <td>${escapeHtml(q.number || "")}</td>
          <td>${formatMoney(subtotal)}</td>
          <td>${formatMoney(pagado)}</td>
          <td>${formatMoney(saldo)}</td>
        </tr>`
          )
          .join("")
      : '<tr><td colspan="5" style="text-align:center; color:#7c8aa6;">Sin saldos pendientes</td></tr>';

    renderActivityTable();
  }

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Fecha y numero de cotizacion por defecto
  fFecha.value = new Date().toISOString().slice(0, 10);
  fNumero.value = nextQuoteNumber();
  payFecha.value = new Date().toISOString().slice(0, 10);

  clientsSearch.addEventListener("input", renderClientsTable);
  clientsDateFrom.addEventListener("change", renderClientsTable);
  clientsDateTo.addEventListener("change", renderClientsTable);
  document.getElementById("clientsDateClear").addEventListener("click", () => {
    clientsDateFrom.value = "";
    clientsDateTo.value = "";
    renderClientsTable();
  });
  pipelineSearch.addEventListener("input", renderPipeline);
  pipelineDateFrom.addEventListener("change", renderPipeline);
  pipelineDateTo.addEventListener("change", renderPipeline);
  document.getElementById("pipelineDateClear").addEventListener("click", () => {
    pipelineDateFrom.value = "";
    pipelineDateTo.value = "";
    renderPipeline();
  });
  quotesSearch.addEventListener("input", renderQuotesTable);
  invoicesSearch.addEventListener("input", renderInvoicesTable);

  // ===== Toggle tablero / lista del Pipeline =====
  document.querySelectorAll(".view-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      pipelineView = btn.dataset.view;
      document.querySelectorAll(".view-toggle-btn").forEach((b) => b.classList.toggle("active", b === btn));
      const board = document.getElementById("pipelineBoard");
      const listWrap = document.getElementById("pipelineListWrap");
      if (board) board.style.display = pipelineView === "board" ? "" : "none";
      if (listWrap) listWrap.style.display = pipelineView === "list" ? "" : "none";
    });
  });

  // ===== Panel lateral de un lead: cerrar con la X, el fondo, o Escape =====
  const ldCloseBtn = document.getElementById("ldClose");
  const ldBackdrop = document.getElementById("leadDrawerBackdrop");
  if (ldCloseBtn) ldCloseBtn.addEventListener("click", closeLeadDrawer);
  if (ldBackdrop) ldBackdrop.addEventListener("click", closeLeadDrawer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeLeadDrawer();
      hideCallOutcomePopover();
    }
  });

  // El tooltip mismo tambien pausa su cierre al pasarle el mouse encima,
  // para poder llegar hasta su textarea y escribir una nota sin que se cierre
  const cardTooltipEl = document.getElementById("cardTooltip");
  if (cardTooltipEl) {
    cardTooltipEl.addEventListener("mouseenter", () => clearTimeout(tooltipHideTimer));
    cardTooltipEl.addEventListener("mouseleave", hideCardTooltipSoon);
  }

  renderCatalog();
  renderDatalist();
  renderLineItems();
  renderClientSelect();
  renderClientsTable();
  renderQuotesTable();
  renderFinanceTable();
  renderFinanceQuoteSelect();
  renderInvoiceQuoteSelect();
  renderInvoicesTable();

  // ===== Portal de Fundadores: cuenta de solo lectura, un solo tab =====
  if (window.NovaCloud && window.NovaCloud.isFounder) {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      if (btn.dataset.tab !== "dashboard") btn.style.display = "none";
    });
    const dashBtn = document.querySelector('.tab-btn[data-tab="dashboard"]');
    if (dashBtn) dashBtn.textContent = "Portal de Fundadores";
    const activityPanel = document.getElementById("activityPanel");
    if (activityPanel) activityPanel.style.display = "none";
    const founderLeadsSection = document.getElementById("founderLeadsSection");
    if (founderLeadsSection) founderLeadsSection.style.display = "";
    switchTab("dashboard");
    renderFounderLeads();
  }
})();
