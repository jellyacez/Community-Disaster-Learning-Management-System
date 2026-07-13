const CACHE_NAME = 'bacolor-lms-cache-v1';

const urlsToCache = [
  '/',
  '/index.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Create a basic SVG placeholder for offline video if we don't have an image
      const svgPlaceholder = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="100%" height="100%" style="background-color:#111827;">
        <rect width="100%" height="100%" fill="#111827"/>
        <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#f3f4f6" font-weight="bold">Video requires an</text>
        <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#f3f4f6" font-weight="bold">active internet connection.</text>
        <text x="50%" y="70%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#9ca3af">You can still read the summary and take the quiz offline.</text>
      </svg>`;
      const response = new Response(svgPlaceholder, {
        headers: { 'Content-Type': 'image/svg+xml' }
      });
      cache.put('/offline-video-placeholder.svg', response);
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // EXPLICITLY IGNORE VIDEO FILES
  if (requestUrl.pathname.match(/\.(mp4|webm|ogg)$/) || requestUrl.hostname.includes('s3.amazonaws.com')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Return the offline placeholder image if video fetch fails (network disconnected)
        return caches.match('/offline-video-placeholder.svg');
      })
    );
    return;
  }

  // Network-first for API requests
  if (requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Stale-While-Revalidate for static assets
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        }).catch(() => {
          // Offline fallback handled silently
        });
        
        return cachedResponse || fetchPromise;
      })
    );
  }
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
