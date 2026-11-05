// Jednoduchý service worker: hra funguje aj bez internetu.
// Najprv sa skúša internet (aby sa vždy načítala najnovšia verzia), pri výpadku sa použije uložená kópia.
const CACHE = 'manazer-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  // Základ hry sa uloží hneď pri inštalácii
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './icon-192.png'])).catch(() => {}));
});
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r ?? caches.match('./index.html'))),
  );
});
