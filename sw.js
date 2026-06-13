// ============================================================
// CSMC CHANCO — Service Worker
// Cachea el shell de la app para que cargue rápido y funcione
// sin conexión. El guardado en Google Sheets requiere internet.
// ============================================================

var CACHE_NAME = 'csmc-chanco-v1';
var ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

// Instalar: cachear el shell de la app
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activar: limpiar caches viejas
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: estrategia "network first, cache fallback" para el HTML
// (así siempre se intenta traer la versión más nueva primero),
// y "cache first" para íconos/manifest.
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // No interceptar llamadas a Google Apps Script, OSRM, Leaflet, etc.
  // — esas siempre deben ir directo a la red.
  if (
    url.indexOf('script.google.com') !== -1 ||
    url.indexOf('router.project-osrm.org') !== -1 ||
    url.indexOf('tile.openstreetmap.org') !== -1 ||
    url.indexOf('cdnjs.cloudflare.com') !== -1 ||
    url.indexOf('fonts.googleapis.com') !== -1 ||
    url.indexOf('fonts.gstatic.com') !== -1
  ) {
    return; // dejar pasar tal cual, sin cache
  }

  // HTML principal: network-first
  if (event.request.mode === 'navigate' || url.indexOf('index.html') !== -1) {
    event.respondWith(
      fetch(event.request)
        .then(function(resp) {
          var copy = resp.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, copy);
          });
          return resp;
        })
        .catch(function() {
          return caches.match(event.request).then(function(cached) {
            return cached || caches.match('./index.html');
          });
        })
    );
    return;
  }

  // Otros assets locales: cache-first
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      return cached || fetch(event.request);
    })
  );
});
