// Minimal service worker — only handles Web Push delivery for the daily
// reminder feature. No offline caching/fetch interception is implemented;
// this intentionally isn't a full PWA service worker.

self.addEventListener('push', (event) => {
  let data = { title: 'MicroMind', body: 'Time to reflect?' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // ignore malformed payloads, fall back to defaults
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/logo.png',
      badge: '/logo.png',
      data: { url: data.url || '/app/journal' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/app/journal';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
