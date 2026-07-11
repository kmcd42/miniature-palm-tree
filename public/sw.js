const CACHE_NAME = 'compound-aether-v4';
const MAX_CACHE_ENTRIES = 80;
const STATIC_ASSETS = [
  '/',
  '/budget',
  '/wealth',
  '/goals',
  '/settings',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Drop oldest entries once the cache grows past the cap
async function trimCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_CACHE_ENTRIES) return;
  for (const key of keys.slice(0, keys.length - MAX_CACHE_ENTRIES)) {
    await cache.delete(key);
  }
}

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Same-origin only — never cache (or serve) third-party responses
  if (new URL(event.request.url).origin !== self.location.origin) return;

  // Skip browser-sync and hot reload in development
  if (event.request.url.includes('_next') ||
      event.request.url.includes('webpack') ||
      event.request.url.includes('hot-update')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response before caching
        const responseClone = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          // Only cache successful same-origin responses
          if (response.status === 200 && response.type === 'basic') {
            cache.put(event.request, responseClone).then(() => trimCache(cache));
          }
        });

        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // If no cache match for navigation, return the main page
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }

          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
      })
  );
});
