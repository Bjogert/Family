// Service Worker for Family Hub PWA
// Minimal caching - only for PWA installability and offline fallback
// All data fetched fresh to ensure real-time sync works correctly
const CACHE_VERSION = 'family-hub-v4';
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
