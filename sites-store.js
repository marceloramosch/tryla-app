// ============================================================
//  TRYLA SITES STORE
//  CRUD para los micrositios de restaurantes (tabla tryla_sites)
//  y subida de fotos/logo al bucket "site-images" en Supabase.
//  Requiere haber corrido sites-schema.sql una vez en el proyecto.
// ============================================================
(function () {
  const cfg = window.NOVA_SUPABASE || {};

  window.TrylaSites = {
    ready: false,
    list: async function () {
      return [];
    },
    get: async function () {
      return null;
    },
    save: async function () {
      throw new Error("Supabase no esta configurado.");
    },
    remove: async function () {
      throw new Error("Supabase no esta configurado.");
    },
    uploadImage: async function () {
      throw new Error("Supabase no esta configurado.");
    },
  };

  const configured =
    cfg.url && cfg.anonKey &&
    !/TU_SUPABASE/.test(cfg.url) &&
    !/TU_SUPABASE/.test(cfg.anonKey);

  if (!configured || typeof supabase === "undefined" || !supabase.createClient) {
    console.warn("[TrylaSites] Supabase no configurado o libreria no cargada.");
    return;
  }

  const sb = supabase.createClient(cfg.url, cfg.anonKey);
  window.TrylaSites.ready = true;

  window.TrylaSites.list = async function () {
    const { data, error } = await sb
      .from("tryla_sites")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data || [];
  };

  window.TrylaSites.get = async function (subdomain) {
    const { data, error } = await sb
      .from("tryla_sites")
      .select("*")
      .eq("subdomain", subdomain)
      .maybeSingle();
    if (error) throw error;
    return data;
  };

  window.TrylaSites.save = async function (site) {
    const row = Object.assign({}, site, { updated_at: new Date().toISOString() });
    const { data, error } = await sb
      .from("tryla_sites")
      .upsert(row, { onConflict: "subdomain" })
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  };

  window.TrylaSites.remove = async function (id) {
    const { error } = await sb.from("tryla_sites").delete().eq("id", id);
    if (error) throw error;
  };

  // Sube una imagen al bucket "site-images" bajo una carpeta por subdominio
  // y regresa su URL publica.
  window.TrylaSites.uploadImage = async function (file, subdomain) {
    const safeSub = (subdomain || "sin-asignar").replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${safeSub}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await sb.storage.from("site-images").upload(path, file, {
      upsert: true,
      cacheControl: "3600",
      contentType: file.type || undefined,
    });
    if (error) throw error;
    const { data } = sb.storage.from("site-images").getPublicUrl(path);
    return data.publicUrl;
  };
})();
