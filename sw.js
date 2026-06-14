// ============================================================
// CSMC CHANCO — Service Worker v2
// ============================================================

var CACHE_NAME = 'csmc-chanco-v2';
var ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
            .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // SIEMPRE pasar directo a red — sin cache para estas URLs externas
  var externas = [
    'script.google.com',
    'script.googleusercontent.com',
    'router.project-osrm.org',
    'tile.openstreetmap.org',
    'cdnjs.cloudflare.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com'
  ];

  for (var i = 0; i < externas.length; i++) {
    if (url.indexOf(externas[i]) !== -1) {
      // Explicitamente pasar a la red sin tocar el cache
      e.respondWith(fetch(e.request));
      return;
    }
  }

  // index.html: network-first
  if (e.request.mode === 'navigate' || url.indexOf('index.html') !== -1) {
    e.respondWith(
      fetch(e.request)
        .then(function(resp) {
          var copy = resp.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, copy);
          });
          return resp;
        })
        .catch(function() {
          return caches.match(e.request).then(function(c) {
            return c || caches.match('./index.html');
          });
        })
    );
    return;
  }

  // Assets locales: cache-first
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request);
    })
  );
});
