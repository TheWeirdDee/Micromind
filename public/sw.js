// MicroMind service worker.
//
// Two jobs:
//  1. Web Push delivery for the daily reminder feature (unchanged from before).
//  2. Runtime caching so the app shell loads fast on repeat visits and keeps
//     working with no connection — cache-as-you-go rather than a build-time
//     precache list, so it never depends on knowing Next.js's hashed asset
//     filenames in advance (those change on every deploy).
//
// Deliberately NEVER caches: the agent API, Supabase, or any cross-origin
// request — those must always hit the network so payments, AI responses, and
// auth stay live and correct. Journal entries themselves are already
// local-first via localStorage (see src/lib/journal.ts) independent of this
// service worker; this only makes the app SHELL (JS/CSS/fonts/icons/pages)
// available offline.

const CACHE_VERSION = 'micromind-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGES_CACHE = `${CACHE_VERSION}-pages`;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('micromind-') && !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

function isOwnOrigin(url) {
  return url.origin === self.location.origin;
}

// Next.js's hashed build output — content-addressed, so once cached it's
// always safe to keep serving without re-checking the network.
function isImmutableStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/');
}

// Same-origin images/fonts/icons — change rarely; cache-first is fine, but
// we still refresh the cache in the background on each hit (stale-while-revalidate)
// so an updated logo/image eventually shows up without needing a hard reset.
function isCacheableAsset(url) {
  return /\.(png|jpg|jpeg|webp|svg|gif|ico|woff2?|ttf)$/i.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!isOwnOrigin(url)) return; // never touch cross-origin (agent, Supabase, etc.)
  if (url.pathname.startsWith('/api/')) return; // never cache Next.js API routes either

  if (isImmutableStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  if (isCacheableAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const networkFetch = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    );
    return;
  }

  // Navigations (actual page loads) — network-first so users always get the
  // latest build when online, falling back to the last cached copy of that
  // exact page (or the app shell) when there's no connection at all.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGES_CACHE);
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          return (await cache.match(request)) || (await cache.match('/app')) || Response.error();
        }
      })()
    );
  }
});

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
