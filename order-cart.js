// ============================================================
//  ORDER CART — carrito + checkout del sitio publico de un
//  restaurante (sites/index.html). Requiere que ese archivo ya
//  haya creado el cliente de Supabase (sb) y cargado el sitio
//  (site) antes de llamar a TrylaOrderCart.mount(site, sb).
//
//  El pago se procesa con la Edge Function "create-checkout-session"
//  (nunca aqui: el precio real y la clave secreta de Stripe viven
//  del lado del servidor). Este archivo solo junta el carrito y
//  redirige al Checkout alojado por Stripe.
// ============================================================
(function () {
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }
  function money(n) { return "$" + (Math.round(n * 100) / 100).toFixed(2); }

  let site = null;
  let sb = null;
  let cart = {}; // { itemName: qty }
  let itemsByName = {};
  let fulfillment = "pickup";

  function storageKey() { return "tryla_cart_" + site.subdomain; }
  function loadCart() {
    try {
      const raw = localStorage.getItem(storageKey());
      cart = raw ? JSON.parse(raw) : {};
    } catch (e) { cart = {}; }
  }
  function saveCart() {
    try { localStorage.setItem(storageKey(), JSON.stringify(cart)); } catch (e) {}
  }

  function cartCount() {
    return Object.values(cart).reduce((sum, q) => sum + q, 0);
  }
  function cartTotal() {
    return Object.entries(cart).reduce((sum, [name, qty]) => {
      const item = itemsByName[name];
      return item ? sum + parseFloat(item.price) * qty : sum;
    }, 0);
  }

  // ---- HTML insertado dentro de cada .menuItem por sites/index.html ----
  function menuActionHtml(item) {
    const price = parseFloat(item.price);
    if (!Number.isFinite(price) || price <= 0) return "";
    const qty = cart[item.name] || 0;
    const key = escapeHtml(item.name);
    return (
      '<div class="tcart-item-actions" data-tcart-item="' + key + '">' +
      (qty > 0
        ? '<div class="tcart-stepper">' +
            '<button type="button" class="dec" data-tcart-dec="' + key + '">−</button>' +
            '<span>' + qty + "</span>" +
            '<button type="button" data-tcart-inc="' + key + '">+</button>' +
          "</div>"
        : '<button type="button" class="tcart-add-btn" data-tcart-inc="' + key + '">Agregar</button>') +
      "</div>"
    );
  }

  function refreshItemActions(name) {
    const wrap = document.querySelector('.tcart-item-actions[data-tcart-item="' + CSS.escape(name) + '"]');
    if (wrap) wrap.outerHTML = menuActionHtml(itemsByName[name]);
    refreshFab();
  }

  function refreshFab() {
    const fab = document.getElementById("tcartFab");
    if (!fab) return;
    const count = cartCount();
    fab.classList.toggle("show", count > 0);
    fab.querySelector(".tcart-count").textContent = count;
    fab.querySelector(".tcart-fab-total").textContent = money(cartTotal());
  }

  function renderDrawerItems() {
    const list = document.getElementById("tcartItems");
    const entries = Object.entries(cart).filter(([, q]) => q > 0);
    if (!entries.length) {
      list.innerHTML = '<div class="tcart-empty">Tu carrito esta vacio.</div>';
      return;
    }
    list.innerHTML = entries.map(([name, qty]) => {
      const item = itemsByName[name];
      if (!item) return "";
      const key = escapeHtml(name);
      return (
        '<div class="tcart-row">' +
          '<div><div class="tcart-row-name">' + escapeHtml(name) + '</div><div class="tcart-row-price">' + money(parseFloat(item.price)) + " c/u</div></div>" +
          '<div class="tcart-stepper">' +
            '<button type="button" class="dec" data-tcart-dec="' + key + '">−</button>' +
            '<span>' + qty + "</span>" +
            '<button type="button" data-tcart-inc="' + key + '">+</button>' +
          "</div>" +
        "</div>"
      );
    }).join("");
  }

  function openDrawer() {
    renderDrawerItems();
    document.getElementById("tcartTotal").textContent = money(cartTotal());
    document.getElementById("tcartOverlay").classList.add("open");
  }
  function closeDrawer() {
    document.getElementById("tcartOverlay").classList.remove("open");
  }

  function buildDrawerHtml() {
    return (
      '<div class="tcart-overlay" id="tcartOverlay">' +
        '<div class="tcart-sheet">' +
          '<button type="button" class="tcart-close" id="tcartCloseBtn">&times;</button>' +
          "<h3>Tu pedido</h3>" +
          '<div class="tcart-sub">' + escapeHtml(site.restaurant_name) + "</div>" +
          '<div id="tcartItems"></div>' +
          '<div class="tcart-total"><span>Total</span><span id="tcartTotal">$0.00</span></div>' +

          '<div class="tcart-fulfill" id="tcartFulfill">' +
            '<button type="button" class="active" data-fulfill="pickup">Recoger</button>' +
            '<button type="button" data-fulfill="delivery">Entrega</button>' +
          "</div>" +
          '<div class="tcart-field" id="tcartAddressField" style="display:none;"><label>Direccion de entrega</label><input type="text" id="tcartAddress" placeholder="Calle, numero, ciudad"></div>' +
          '<div class="tcart-field"><label>Tu nombre</label><input type="text" id="tcartName" placeholder="Nombre completo"></div>' +
          '<div class="tcart-field"><label>Telefono</label><input type="tel" id="tcartPhone" placeholder="(555) 555-5555"></div>' +
          '<div class="tcart-field"><label>Notas (opcional)</label><textarea id="tcartNotes" placeholder="Alergias, instrucciones especiales..."></textarea></div>' +

          '<button type="button" class="tcart-pay-btn" id="tcartPayBtn">Pagar con tarjeta →</button>' +
          '<div class="tcart-error" id="tcartError"></div>' +
          '<div class="tcart-secure">🔒 Pago seguro procesado por Stripe</div>' +
        "</div>" +
      "</div>" +
      '<button type="button" class="tcart-fab" id="tcartFab">' +
        '<span class="tcart-count">0</span> Ver pedido <span class="tcart-fab-total">$0.00</span>' +
      "</button>"
    );
  }

  function showError(msg) {
    const el = document.getElementById("tcartError");
    el.textContent = msg;
    el.classList.add("show");
  }
  function clearError() {
    document.getElementById("tcartError").classList.remove("show");
  }

  async function handlePay() {
    clearError();
    const entries = Object.entries(cart).filter(([, q]) => q > 0);
    if (!entries.length) return showError("Agrega al menos un articulo.");

    const name = document.getElementById("tcartName").value.trim();
    const phone = document.getElementById("tcartPhone").value.trim();
    const address = document.getElementById("tcartAddress").value.trim();
    const notes = document.getElementById("tcartNotes").value.trim();

    if (!name) return showError("Falta tu nombre.");
    if (!phone) return showError("Falta tu telefono.");
    if (fulfillment === "delivery" && !address) return showError("Falta la direccion de entrega.");

    const btn = document.getElementById("tcartPayBtn");
    btn.disabled = true;
    btn.textContent = "Conectando con Stripe...";

    try {
      const baseUrl = location.origin + location.pathname;
      const { data, error } = await sb.functions.invoke("create-checkout-session", {
        body: {
          subdomain: site.subdomain,
          items: entries.map(([itemName, qty]) => ({ name: itemName, qty })),
          fulfillment,
          delivery_address: address,
          customer_name: name,
          customer_phone: phone,
          notes,
          success_url: baseUrl,
          cancel_url: baseUrl,
        },
      });
      if (error) throw error;
      if (data && data.error) throw new Error(data.error);
      if (!data || !data.url) throw new Error("No se pudo iniciar el pago.");
      localStorage.removeItem(storageKey());
      location.href = data.url;
    } catch (e) {
      console.warn("[TrylaOrderCart] checkout error:", e);
      showError(e && e.message ? e.message : "No se pudo iniciar el pago. Intenta de nuevo.");
      btn.disabled = false;
      btn.textContent = "Pagar con tarjeta →";
    }
  }

  function wireDrawerEvents() {
    document.getElementById("tcartFab").addEventListener("click", openDrawer);
    document.getElementById("tcartCloseBtn").addEventListener("click", closeDrawer);
    document.getElementById("tcartOverlay").addEventListener("click", function (e) {
      if (e.target.id === "tcartOverlay") closeDrawer();
    });
    document.getElementById("tcartFulfill").addEventListener("click", function (e) {
      const btn = e.target.closest("button[data-fulfill]");
      if (!btn) return;
      fulfillment = btn.dataset.fulfill;
      this.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
      document.getElementById("tcartAddressField").style.display = fulfillment === "delivery" ? "" : "none";
    });
    document.getElementById("tcartPayBtn").addEventListener("click", handlePay);

    document.body.addEventListener("click", function (e) {
      const inc = e.target.closest("[data-tcart-inc]");
      const dec = e.target.closest("[data-tcart-dec]");
      if (inc) {
        const name = inc.dataset.tcartInc;
        cart[name] = (cart[name] || 0) + 1;
        saveCart();
        refreshItemActions(name);
        if (document.getElementById("tcartOverlay").classList.contains("open")) openDrawer();
      } else if (dec) {
        const name = dec.dataset.tcartDec;
        cart[name] = Math.max(0, (cart[name] || 0) - 1);
        saveCart();
        refreshItemActions(name);
        if (document.getElementById("tcartOverlay").classList.contains("open")) openDrawer();
      }
    });
  }

  function mount(siteData, sbClient) {
    site = siteData;
    sb = sbClient;
    itemsByName = {};
    (site.menu || []).forEach((m) => { itemsByName[m.name] = m; });
    loadCart();
    // Descarta del carrito cualquier articulo que ya no exista en el menu.
    Object.keys(cart).forEach((name) => { if (!itemsByName[name]) delete cart[name]; });

    document.body.insertAdjacentHTML("beforeend", buildDrawerHtml());
    wireDrawerEvents();
    refreshFab();
  }

  // ---- Confirmacion de pedido: thetryla.com/sites/?s=...&order=<id> ----
  const STATUS_LABEL = {
    nuevo: "Pedido recibido",
    preparando: "Preparando tu pedido",
    listo: "¡Listo!",
    completado: "Entregado",
    cancelado: "Pedido cancelado",
  };
  const STATUS_STEP = { nuevo: 1, preparando: 2, listo: 3, completado: 4, cancelado: 0 };

  async function fetchOrderStatus(orderId, subdomain, sbClient) {
    const { data, error } = await sbClient.rpc("get_order_public_status", {
      p_order_id: orderId,
      p_subdomain: subdomain,
    });
    if (error || !data || !data.length) return null;
    return data[0];
  }

  function renderConfirmCard(order) {
    const step = STATUS_STEP[order.status] || 1;
    const steps = [1, 2, 3, 4].map((n) => '<span class="' + (n <= step ? "done" : "") + '"></span>').join("");
    const items = (order.items || []).map((it) =>
      '<div class="tcart-confirm-row"><span>' + it.qty + "x " + escapeHtml(it.name) + "</span><span>" + money(it.price * it.qty) + "</span></div>"
    ).join("");
    return (
      '<div class="tcart-confirm-card">' +
        '<div class="tcart-confirm-icon"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg></div>' +
        '<div class="tcart-confirm-status">' + (STATUS_LABEL[order.status] || order.status) + "</div>" +
        '<div class="tcart-confirm-sub">' + (order.fulfillment === "delivery" ? "Entrega a domicilio" : "Para recoger") + "</div>" +
        (order.status !== "cancelado" ? '<div class="tcart-steps">' + steps + "</div>" : "") +
        '<div class="tcart-confirm-items">' + items + "</div>" +
        '<div class="tcart-confirm-total"><span>Total</span><span>' + money(order.total) + "</span></div>" +
      "</div>"
    );
  }

  async function showOrderConfirmation(orderId, subdomain, sbClient) {
    document.getElementById("loading").style.display = "none";
    document.getElementById("app").style.display = "none";
    const root = document.createElement("div");
    root.id = "tcartConfirm";
    root.innerHTML = '<div class="tcart-confirm-card"><div class="tcart-confirm-sub">Cargando tu pedido...</div></div>';
    document.body.appendChild(root);

    async function refresh() {
      const order = await fetchOrderStatus(orderId, subdomain, sbClient);
      if (!order) {
        root.innerHTML = '<div class="tcart-confirm-card"><div class="tcart-confirm-status">Pedido no encontrado</div></div>';
        return;
      }
      root.innerHTML = renderConfirmCard(order);
      return order.status;
    }

    const status = await refresh();
    if (status && status !== "completado" && status !== "cancelado") {
      const poll = setInterval(async () => {
        const s = await refresh();
        if (!s || s === "completado" || s === "cancelado") clearInterval(poll);
      }, 8000);
    }
  }

  window.TrylaOrderCart = { mount, menuActionHtml, showOrderConfirmation };
})();
