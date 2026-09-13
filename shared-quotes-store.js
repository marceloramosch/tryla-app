// ============================================================
//  SHARED QUOTES STORE
//  Guarda una "foto" de una cotizacion (el HTML ya renderizado)
//  para compartirla por link publico en thetryla.com/?quote=<id>
//  Requiere haber corrido shared-quotes-schema.sql una vez.
// ============================================================
(function () {
  const cfg = window.NOVA_SUPABASE || {};

  window.SharedQuotes = {
    ready: false,
    save: async function () {
      throw new Error("Supabase no esta configurado.");
    },
  };

  const configured =
    cfg.url && cfg.anonKey &&
    !/TU_SUPABASE/.test(cfg.url) &&
    !/TU_SUPABASE/.test(cfg.anonKey);

  if (!configured || typeof supabase === "undefined" || !supabase.createClient) {
    console.warn("[SharedQuotes] Supabase no configurado o libreria no cargada.");
    return;
  }

  const sb = supabase.createClient(cfg.url, cfg.anonKey);
  window.SharedQuotes.ready = true;

  function randomId() {
    const chars = "23456789abcdefghjkmnpqrstuvwxyz";
    let id = "";
    for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
  }

  // Guarda (o actualiza, si ya existia) la foto de una cotizacion y regresa su id publico.
  window.SharedQuotes.save = async function (docHtml, cliente, number, existingId) {
    const id = existingId || randomId();
    const row = {
      id,
      doc_html: docHtml,
      cliente: cliente || "",
      number: number || "",
      updated_at: new Date().toISOString(),
    };
    const { error } = await sb.from("shared_quotes").upsert(row);
    if (error) throw error;
    return id;
  };
})();
