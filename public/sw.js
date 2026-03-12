const CACHE_NAME = 'chatlocal-cache-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Basic precache
      return cache.addAll(['/']);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Simple network-first strategy for basic PWA compliance
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
