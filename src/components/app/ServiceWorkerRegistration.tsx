'use client';

import { useEffect } from 'react';

/** Registers the caching service worker on every visit (not just from
 * Settings, which only handles the separate push-notification opt-in) so the
 * app shell is available offline and loads fast on repeat visits. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[SW] Registration failed:', err);
    });
  }, []);

  return null;
}
