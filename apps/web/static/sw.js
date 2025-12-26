// Service Worker for Family Hub PWA
// Handles caching, offline fallback, and push notifications
const CACHE_VERSION = 'family-hub-v6';
const OFFLINE_URL = '/offline';

// Only cache the offline page - everything else is fetched fresh
const STATIC_CACHE_URLS = ['/offline'];

// Install event - cache only offline page
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      console.log('[SW] Caching offline page');
      return cache.addAll(STATIC_CACHE_URLS).catch((err) => {
        console.error('[SW] Failed to cache:', err);
      });
    })
  );

  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_VERSION) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  // Take control immediately
  self.clients.claim();
});

// Fetch event - always fetch fresh, only use cache for offline fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip WebSocket requests
  if (request.url.includes('/api/ws')) {
    return;
  }

  // For navigation requests (page loads), try network first, fallback to offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  // For everything else (API, assets), just fetch normally - no caching
  // This ensures data is always fresh and real-time sync works correctly
});

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('[SW] Push received but no data');
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    console.error('[SW] Failed to parse push data:', e);
    return;
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: data.tag || 'default',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
  };

  console.log('[SW] Showing notification:', data.title);

  event.waitUntil(
    self.registration.showNotification(data.title || 'Familjehubben', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Try to focus an existing window
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => {
            if ('navigate' in client) {
              return client.navigate(url);
            }
          });
        }
      }
      // Open new window if no existing window found
      return clients.openWindow(url);
    })
  );
});

// Handle notification close (for analytics if needed)
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
});
