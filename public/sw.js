// Grosspi Service Worker — auto-reload on chunk errors
const CACHE = 'grosspi-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  // Only intercept Next.js chunk requests
  if (!e.request.url.includes('/_next/static/')) return;

  e.respondWith(
    fetch(e.request).then(res => {
      // If chunk returns 404, tell all clients to reload
      if (res.status === 404) {
        self.clients.matchAll().then(clients => {
          clients.forEach(c => c.postMessage({ type: 'CHUNK_ERROR' }));
        });
      }
      return res;
    }).catch(() => {
      self.clients.matchAll().then(clients => {
        clients.forEach(c => c.postMessage({ type: 'CHUNK_ERROR' }));
      });
    })
  );
});
