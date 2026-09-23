// ============================================================
//  CLIENT PORTAL STORE
//  Genera y administra los tokens de acceso de clientes al portal
//  (thetryla.com/?portal=<token>). Requiere haber corrido
//  client-portal-schema.sql una vez.
// ============================================================
(function () {
  const cfg = window.NOVA_SUPABASE || {};

  window.ClientPortal = {
    ready: false,
    generate: async function () {
      throw new Error("Supabase no esta configurado.");
    },
    getForClient: async function () {
      return null;
    },
  };

  const configured =
    cfg.url && cfg.anonKey &&
    !/TU_SUPABASE/.test(cfg.url) &&
    !/TU_SUPABASE/.test(cfg.anonKey);

  if (!configured || typeof supabase === "undefined" || !supabase.createClient) {
    console.warn("[ClientPortal] Supabase no configurado o libreria no cargada.");
    return;
  }

  const sb = supabase.createClient(cfg.url, cfg.anonKey);
  window.ClientPortal.ready = true;

  function randomToken() {
    const chars = "23456789abcdefghjkmnpqrstuvwxyz";
    let id = "";
    for (let i = 0; i < 14; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
  }

  // Ya existe un token para este subdominio? (evita generar dos links
  // distintos para el mismo cliente si le da clic dos veces).
  window.ClientPortal.getForClient = async function (subdomain) {
    const { data, error } = await sb
      .from("client_portal")
      .select("*")
      .eq("site_subdomain", subdomain)
      .maybeSingle();
    if (error) throw error;
    return data;
  };

  // Crea (o reusa) el token de acceso de un cliente a su sitio.
  window.ClientPortal.generate = async function (clientName, subdomain, state) {
    const existing = await window.ClientPortal.getForClient(subdomain);
    if (existing) return existing.token;
    const token = randomToken();
    const { error } = await sb.from("client_portal").insert({
      token,
      client_name: clientName || "",
      site_subdomain: subdomain,
      state: state || null,
    });
    if (error) throw error;
    return token;
  };
})();
