const CACHE_NAME = "finanzas-chc-v5";
const PRECACHE = ["/", "/index.html", "/manifest.json", "/finanzasJEC.png"];

function esApiFirebase(url) {
  return [
    "firebaseio.com",
    "googleapis.com",
    "firebasestorage.app",
    "google.com",
  ].some((dominio) => url.hostname.includes(dominio));
}

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // No interceptar POST ni las llamadas a Firebase: el SDK de Firestore
  // gestiona el modo offline con su propia cache persistente.
  if (request.method !== "GET" || esApiFirebase(url)) return;

  // Navegacion: network-first para que los nuevos deploys se vean al instante.
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put("/index.html", clone));
          return response;
        })
        .catch(() => caches.match("/index.html")),
    );
    return;
  }

  // Assets: cache-first con actualizacion en segundo plano.
  e.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    }),
  );
});
