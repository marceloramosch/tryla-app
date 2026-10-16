// Service worker del CRM de Tryla. Solo cachea el "shell" de la app (HTML/CSS/JS/
// fuentes/iconos propios) para que abra al instante como una app instalada. Nunca
// cachea Supabase ni nada fuera de este origen: el CRM siempre debe leer datos
// frescos, el offline es solo para que la app no quede en blanco sin señal.
const CACHE = "tryla-crm-v1";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "../location-intel.css",
  "../fonts/unbounded-800.woff2",
  "../fonts/sora-700.woff2",
  "../fonts/barlow-400.woff2",
  "../fonts/barlow-600.woff2",
  "../fonts/barlow-700.woff2",
  "../assets/favicon-512.png",
  "../assets/apple-touch-icon.png",
  "../tryla-app.js",
  "../cloud-store.js",
  "../sites-store.js",
  "../shared-quotes-store.js",
  "../client-portal-store.js",
  "../sites-builder.js",
  "../location-intel.js",
  "../data/trailers.js",
  "../data/components.js",
  "../data/equipment-i18n.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Nada fuera de este origen (Supabase, CDNs) pasa por el cache: siempre a la red.
  if (url.origin !== self.location.origin) return;

  // Navegacion (abrir/recargar la app): red primero, shell cacheado si no hay señal.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("./index.html")));
    return;
  }

  // Estaticos propios: responde del cache al instante y refresca en segundo plano
  // (la proxima carga ya trae lo nuevo).
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) caches.open(CACHE).then((cache) => cache.put(req, res.clone()));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
