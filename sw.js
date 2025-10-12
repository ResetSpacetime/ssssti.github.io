// sw.js

// 1. 定义缓存名称和版本
// 重要提示：每次更新此文件中的任何核心文件时，请务必更改此版本字符串。
// 推荐使用日期格式，例如 'v-2025-10-11-01'。
const VERSION = 'v-2025-10-12-07'; // <-- 部署前请更新此版本号！
const STATIC_CACHE_NAME = `arlmy-static-${VERSION}`;
const DYNAMIC_CACHE_NAME = `arlmy-dynamic-${VERSION}`;

// 2. 定义 "App Shell" - 网站运行所需的核心文件
// 这些文件会在安装过程中被永久缓存。
const APP_SHELL_URLS = [
  '/', // 网站根目录
  '/css/style.css?v=1.0.0',
  '/img/avatar.webp',
  '/favicon.ico',
  // 其他重要的 CSS/JS 文件
  'https://unpkg.com/purecss@2.0.6/build/pure-min.css',
  'https://unpkg.com/purecss@2.0.6/build/grids-responsive-min.css',
  'https://unpkg.com/normalize.css@8.0.1/normalize.css',
  'https://netdna.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css'
];

// 3. 安装 Service Worker 并缓存 App Shell
self.addEventListener('install', event => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching App Shell...');
        return cache.addAll(APP_SHELL_URLS);
      })
      .catch(error => {
        console.error('[SW] Failed to cache App Shell:', error);
      })
  );
});

// 4. 激活 Service Worker 并清理旧缓存
self.addEventListener('activate', event => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        // 删除所有不是当前版本的静态或动态缓存
        if (key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
          console.log('[SW] Deleting old cache:', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

// 5. 拦截网络请求 (最终健壮版)
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  if (event.request.method !== 'GET' || requestUrl.origin !== self.location.origin) {
    return;
  }
  
  if (APP_SHELL_URLS.includes(requestUrl.pathname)) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        return cachedResponse || fetch(event.request);
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        // --- 关键修复在这里 ---
        // 1. 检查网络响应是否有效
        if (!networkResponse || !networkResponse.ok) {
          return networkResponse; // 如果无效，直接返回，不进行缓存
        }

        // 2. 立刻克隆响应体
        const responseToCache = networkResponse.clone();

        // 3. 将克隆的响应放入缓存
        caches.open(DYNAMIC_CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        // 4. 将原始的响应返回给浏览器
        return networkResponse;
        // --- 修复结束 ---
      }).catch(error => {
        console.error('[SW] Fetch failed:', error);
        throw error;
      });

      return cachedResponse || fetchPromise;
    })
  );
});