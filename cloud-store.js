// ============================================================
//  NOVA CLOUD STORE
//  Sincroniza el cotizador (clientes, cotizaciones y precios)
//  con Supabase. Si Supabase no está configurado, no hace nada
//  y la herramienta sigue funcionando en modo local.
//
//  Modelo: 3 "blobs" guardados en la tabla nova_store
//    - novaCatalogPrices  -> precios del catálogo
//    - novaClients        -> lista de clientes (CRM)
//    - novaQuotes         -> cotizaciones guardadas
// ============================================================
(function () {
  const cfg = window.NOVA_SUPABASE || {};
  const KEYS = ["novaCatalogPrices", "novaClients", "novaQuotes", "novaActivityLog"];

  const configured =
    cfg.url && cfg.anonKey &&
    !/TU_SUPABASE/.test(cfg.url) &&
    !/TU_SUPABASE/.test(cfg.anonKey);

  // Promesa que cotizador.js espera antes de leer los datos
  let resolveReady;
  window.__novaReady = new Promise((r) => (resolveReady = r));

  // API que usa cotizador.js para empujar cambios a la nube
  window.NovaCloud = {
    enabled: false,
    email: "local",
    push: async function () {},
    checkConflict: async function () { return { conflict: false }; },
  };

  // Ultimo updated_at de la nube que este navegador conoce, por clave.
  // Se usa para detectar si otro dispositivo escribio despues de nuestra
  // ultima lectura (hydrate) o escritura (push), y avisar antes de sobreescribir.
  const remoteVersions = {};

  // --- Sin configurar, o sin librería: modo local ---
  if (!configured) {
    console.log("[Nova] Modo LOCAL (Supabase no configurado).");
    resolveReady("local");
    return;
  }
  if (typeof supabase === "undefined" || !supabase.createClient) {
    console.warn("[Nova] No se pudo cargar Supabase. Modo local de respaldo.");
    resolveReady("local");
    return;
  }

  const sb = supabase.createClient(cfg.url, cfg.anonKey);
  window.NovaCloud.enabled = true;

  // ---- Empujar un blob a la nube (upsert por clave) ----
  let pushChain = Promise.resolve();
  window.NovaCloud.push = function (key, valueStr) {
    // Encadenamos para evitar condiciones de carrera entre guardados
    pushChain = pushChain.then(async () => {
      try {
        const updatedAt = new Date().toISOString();
        await sb.from("nova_store").upsert({
          key: key,
          value: JSON.parse(valueStr),
          updated_at: updatedAt,
        });
        remoteVersions[key] = updatedAt;
      } catch (e) {
        console.warn("[Nova] No se pudo guardar en la nube:", key, e);
      }
    });
    return pushChain;
  };

  // ---- Revisa si la nube tiene una version mas nueva de esta clave que la
  //      que conocemos localmente (alguien mas guardo desde nuestra ultima
  //      lectura/escritura). Falla "abierto" (sin conflicto) ante errores de
  //      red para no bloquear el guardado del usuario.
  window.NovaCloud.checkConflict = async function (key) {
    try {
      const { data, error } = await sb.from("nova_store").select("updated_at").eq("key", key).maybeSingle();
      if (error || !data || !data.updated_at) return { conflict: false };
      const known = remoteVersions[key];
      if (known && new Date(data.updated_at) > new Date(known)) {
        return { conflict: true, remoteUpdatedAt: data.updated_at };
      }
      return { conflict: false, remoteUpdatedAt: data.updated_at };
    } catch (e) {
      return { conflict: false };
    }
  };

  // ---- Traer la nube -> localStorage (y sembrar la nube si está vacía) ----
  async function hydrate() {
    try {
      const { data, error } = await sb.from("nova_store").select("key,value,updated_at");
      if (error) throw error;
      const cloud = {};
      (data || []).forEach((r) => {
        cloud[r.key] = r.value;
        if (r.updated_at) remoteVersions[r.key] = r.updated_at;
      });
      for (const k of KEYS) {
        if (cloud[k] !== undefined && cloud[k] !== null) {
          // La nube manda: sobreescribe lo local
          localStorage.setItem(k, JSON.stringify(cloud[k]));
        } else {
          // La nube no tiene este dato: si hay algo local, lo subimos
          const local = localStorage.getItem(k);
          if (local && local !== "[]" && local !== "{}") {
            await window.NovaCloud.push(k, local);
          }
        }
      }
      console.log("[Nova] Datos sincronizados desde la nube ✓");
    } catch (e) {
      console.warn("[Nova] Error al sincronizar:", e);
    }
  }

  // ---- Insignia de estado + botón de salir ----
  function buildStatusChip(email) {
    const chip = document.createElement("div");
    chip.id = "novaCloudChip";
    chip.style.cssText =
      "position:fixed;bottom:14px;right:14px;z-index:9000;background:#0D2244;color:#fff;" +
      "font:600 12px Arial;padding:8px 12px;border-radius:20px;display:flex;gap:10px;" +
      "align-items:center;box-shadow:0 6px 20px rgba(0,0,0,.25);";
    chip.innerHTML =
      '<span>☁️ Nube · ' + (email || "") + "</span>" +
      '<button id="novaLogout" style="background:#2D6BC4;border:0;color:#fff;cursor:pointer;' +
      'font:700 11px Arial;padding:4px 10px;border-radius:12px;">Salir</button>';
    document.body.appendChild(chip);
    document.getElementById("novaLogout").addEventListener("click", async () => {
      await sb.auth.signOut();
      location.reload();
    });
  }

  // ---- Pantalla de inicio de sesión ----
  function showLogin() {
    return new Promise((resolve) => {
      const ov = document.createElement("div");
      ov.style.cssText =
        "position:fixed;inset:0;z-index:9999;background:linear-gradient(135deg,#0D2244,#1a3a7a);" +
        "display:flex;align-items:center;justify-content:center;font-family:Arial;";
      ov.innerHTML =
        '<div style="background:#fff;border-radius:16px;padding:36px 32px;width:340px;max-width:90vw;' +
        'box-shadow:0 20px 60px rgba(0,0,0,.4);">' +
        '<div style="text-align:center;margin-bottom:22px;">' +
        '<div style="font:800 26px Arial;color:#0D2244;letter-spacing:3px;">NOVA</div>' +
        '<div style="font:600 9px Arial;color:#2D6BC4;letter-spacing:3px;">FOOD TRAILERS · CRM</div>' +
        "</div>" +
        '<input id="novaEmail" type="email" placeholder="Correo" autocomplete="username" ' +
        'style="width:100%;padding:12px;margin-bottom:10px;border:1px solid #ccd;border-radius:8px;font:14px Arial;">' +
        '<input id="novaPass" type="password" placeholder="Contraseña" autocomplete="current-password" ' +
        'style="width:100%;padding:12px;margin-bottom:14px;border:1px solid #ccd;border-radius:8px;font:14px Arial;">' +
        '<button id="novaLoginBtn" style="width:100%;padding:12px;background:#2D6BC4;color:#fff;border:0;' +
        'border-radius:8px;font:700 14px Arial;cursor:pointer;">Entrar</button>' +
        '<div id="novaErr" style="color:#DC2626;font:13px Arial;margin-top:12px;text-align:center;min-height:18px;"></div>' +
        "</div>";
      document.body.appendChild(ov);

      const emailEl = ov.querySelector("#novaEmail");
      const passEl = ov.querySelector("#novaPass");
      const btn = ov.querySelector("#novaLoginBtn");
      const err = ov.querySelector("#novaErr");

      async function attempt() {
        err.textContent = "";
        btn.disabled = true;
        btn.textContent = "Entrando…";
        const { data, error } = await sb.auth.signInWithPassword({
          email: emailEl.value.trim(),
          password: passEl.value,
        });
        if (error) {
          err.textContent = "Correo o contraseña incorrectos.";
          btn.disabled = false;
          btn.textContent = "Entrar";
          return;
        }
        ov.remove();
        resolve(data.user && data.user.email);
      }

      btn.addEventListener("click", attempt);
      passEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") attempt();
      });
      emailEl.focus();
    });
  }

  // ---- Arranque ----
  async function start() {
    let email = null;
    try {
      const { data } = await sb.auth.getSession();
      if (data && data.session) email = data.session.user.email;
    } catch (e) {}

    if (!email) email = await showLogin();

    window.NovaCloud.email = email || "local";
    buildStatusChip(email);
    await hydrate();
    resolveReady("cloud");
  }

  start();
})();
