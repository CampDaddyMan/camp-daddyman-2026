// Camp DaddyMan Service Worker
//
// INVARIANT: this worker is network-authoritative and caches NOTHING.
// Do not add asset/HTML caching here — the app relies on Vercel's hashed assets
// and revalidated HTML for freshness. Caching here would risk serving users a
// stale version after a deploy. (Update behavior is driven by ServiceWorkerRegistrar.)

// Activate updates immediately and take control of open pages.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

// Push notification handler
self.addEventListener('push', function (event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Camp DaddyMan';
  const options = {
    body: data.body || 'New content is available',
    icon: '/CAMPDADDYMAN_GOLD_MEMBERSHIP_LOGO-V4.png',
    badge: '/CAMPDADDYMAN_GOLD_MEMBERSHIP_LOGO-V4.png',
    data: { url: data.url || '/' },
    tag: data.tag || 'camp-daddyman',
    renotify: true,
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});

// Passthrough fetch — intentionally no respondWith(), so every request hits the
// network. Present only to satisfy PWA installability; never serves from cache.
self.addEventListener('fetch', function () {});
