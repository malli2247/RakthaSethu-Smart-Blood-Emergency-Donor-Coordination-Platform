/**
 * RakthaSethu Production Service Worker
 * Handles Offline App Shell Caching, Web Push Notifications, Action Handling, and Tab Focus Management.
 */

const CACHE_NAME = 'rakthasethu-pwa-v3';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.svg',
  '/icon-512.svg',
];

// 1. Install Event: Cache essential app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Clean up outdated caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Network-first with cache fallback (Never intercept API calls)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Bypass service worker cache for all backend API endpoints
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/');
          }
          return new Response('Offline resource unavailable', {
            status: 503,
            statusText: 'Offline',
            headers: new Headers({ 'Content-Type': 'text/plain' }),
          });
        });
      })
  );
});

// 4. Push Event: Handle background and closed-page Web Push events
self.addEventListener('push', (event) => {
  let payload = {};

  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch (err) {
    try {
      payload = { notification: { title: 'Emergency Blood Alert', body: event.data.text() } };
    } catch {
      payload = {};
    }
  }

  const notificationData = payload.notification || payload || {};
  const title = notificationData.title || '🚨 RakthaSethu Emergency Notification';
  const priority = notificationData.data?.priority || 'NORMAL';

  // Dynamic vibration pattern based on priority
  let vibratePattern = [200];
  if (priority === 'CRITICAL') {
    vibratePattern = [500, 150, 500, 150, 800];
  } else if (priority === 'URGENT') {
    vibratePattern = [400, 150, 400, 150, 600];
  } else if (priority === 'HIGH') {
    vibratePattern = [200, 100, 200];
  }

  const options = {
    body: notificationData.body || 'A new urgent blood notification requires your attention.',
    icon: notificationData.icon || '/icon-192.svg',
    badge: notificationData.badge || '/icon-192.svg',
    tag: notificationData.tag || `rakthasethu-${Date.now()}`,
    renotify: true,
    requireInteraction: priority === 'CRITICAL' || priority === 'URGENT',
    vibrate: notificationData.vibrate || vibratePattern,
    data: {
      url: notificationData.data?.url || '/notifications',
      notificationId: notificationData.data?.notificationId,
      priority,
      timestamp: Date.now(),
    },
    actions: [
      { action: 'open', title: 'Open RakthaSethu' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 5. Notification Click Event: Focus existing tab or open URL without duplicates
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const notifData = event.notification.data || {};
  const relativeUrl = notifData.url || '/notifications';
  const targetUrl = new URL(relativeUrl, self.location.origin).href;

  // Track click asynchronously to backend
  if (notifData.notificationId) {
    fetch('/api/notifications/track-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: notifData.notificationId }),
    }).catch(() => {});
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if an existing RakthaSethu tab is open
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // If no tab is open, open a new window with the target emergency URL
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// 6. Push Subscription Change: Re-subscribe if browser refreshes VAPID subscription
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true })
      .then((newSubscription) => {
        const subJson = newSubscription.toJSON();
        return fetch('/api/notifications/push-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: newSubscription.endpoint,
            keys: subJson.keys,
          }),
        });
      })
      .catch((err) => {
        console.error('[SW] pushsubscriptionchange failed:', err);
      })
  );
});
