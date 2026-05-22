// Camp DaddyMan Service Worker

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

// Passthrough fetch (no caching — server is authoritative)
self.addEventListener('fetch', function () {});
