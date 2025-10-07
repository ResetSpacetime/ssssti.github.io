// sw.js

// 1. Define Cache Names and Version
// IMPORTANT: Change this version string every time you update any of the app shell files.
// A good practice is to use a date-based version like 'v-2025-10-06-01'.
const VERSION = 'v-2025-10-06-01';
const STATIC_CACHE_NAME = `arlmy-static-${VERSION}`;
const DYNAMIC_CACHE_NAME = `arlmy-dynamic-${VERSION}`;

// 2. Define the "App Shell" - the core files your site needs to run.
// These are cached permanently during installation.
const APP_SHELL_URLS = [
  '/', // The root of your site
  '/css/style.css?v=1.0.0',
  '/img/avatar.webp',
  '/favicon.ico',
  // Add other critical CSS/JS files here. From your report, these are important:
  'https://unpkg.com/purecss@2.0.6/build/pure-min.css',
  'https://unpkg.com/purecss@2.0.6/build/grids-responsive-min.css',
  'https://unpkg.com/normalize.css@8.0.1/normalize.css',
  'https://netdna.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css'
];

// 3. Install Service Worker and Cache the App Shell
self.addEventListener('install', event => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching App Shell...');
        // Make sure all URLs are correct, otherwise addAll will fail.
        return cache.addAll(APP_SHELL_URLS);
      })
      .catch(error => {
        console.error('[SW] Failed to cache App Shell:', error);
      })
  );
});

// 4. Activate Service Worker and Clean Up Old Caches
self.addEventListener('activate', event => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        // Delete all caches that are not the current static or dynamic cache
        if (key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
          console.log('[SW] Deleting old cache:', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

// 5. Intercept Network Requests
self.addEventListener('fetch', event => {
  // Use a "Cache First" strategy for the app shell files
  const urlPath = new URL(event.request.url).pathname;
  if (APP_SHELL_URLS.some(path => urlPath.endsWith(path.split('?')[0]))) {
      event.respondWith(caches.match(event.request));
      return;
  }

  // Use a "Stale-While-Revalidate" strategy for everything else (posts, images, etc.)
  event.respondWith(
    caches.open(DYNAMIC_CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        // Fetch from network in the background to update the cache for next time
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // If we get a valid response, clone it and put it in the dynamic cache
          if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });

        // Return the cached response immediately if available, otherwise wait for the network.
        // If both fail, the fetch will naturally fail and the browser will show its offline page.
        return cachedResponse || fetchPromise;
      });
    })
  );
});