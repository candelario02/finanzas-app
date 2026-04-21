const CACHE_NAME = "finanzas-chc-v3";

// 1. Instalación: Solo guardamos lo básico que NO cambia
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        "/",
        "/index.html",
        "/manifest.json",
        "/finanzasJEC.png"
      ]);
    })
  );
  self.skipWaiting();
});

// 2. Activación: Borramos cachés viejos para que no haya conflictos
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
});

// 3. Intercepción: Si no hay red, usa el caché. Si hay red, guarda una copia.
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(e.request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          // Solo guardamos archivos de nuestro propio dominio (Vercel)
          if (e.request.url.startsWith(self.location.origin)) {
            cache.put(e.request, networkResponse.clone());
          }
          return networkResponse;
        });
      }).catch(() => {
        // Si no hay red y no está en caché, devolvemos el index.html
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});