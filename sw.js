// sw.js

// 1. 定义缓存名称和版本
// 重要提示：每次更新此文件中的任何核心文件时，请务必更改此版本字符串。
// 推荐使用日期格式，例如 'v-2025-10-11-01'。
const VERSION = 'v-2025-10-11-01'; // <-- 部署前请更新此版本号！
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

// 5. 拦截网络请求 (修正整合版)
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // 忽略非同源请求 (例如分析脚本) 和非 GET 请求，因为我们无法缓存它们。
  if (event.request.method !== 'GET' || requestUrl.origin !== self.location.origin) {
    return;
  }
  
  // 策略 1: 对 App Shell 文件采用 "缓存优先，网络备用" 策略
  // 注意：这里的匹配方式需要 APP_SHELL_URLS 里的路径是精确的相对路径
  if (APP_SHELL_URLS.includes(requestUrl.pathname)) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        // 如果在缓存中找到，则从缓存返回；否则，从网络获取 (这是关键修复！)
        return cachedResponse || fetch(event.request);
      })
    );
    return; // 对 App Shell 文件处理到此为止
  }

  // 策略 2: 对其他所有资源采用 "边用边更新" (Stale-While-Revalidate) 策略
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // 在后台从网络获取最新版本以更新缓存
      const fetchPromise = fetch(event.request).then(networkResponse => {
        // 打开动态缓存来存储新的响应
        caches.open(DYNAMIC_CACHE_NAME).then(cache => {
          // 检查响应是否有效，然后存入缓存
          if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
        });
        return networkResponse; // 返回网络响应
      }).catch(error => {
        // 添加 .catch 来优雅地处理网络错误
        console.error('[SW] Fetch failed:', error);
        // 这里可以让浏览器自己处理失败的请求
        throw error;
      });

      // 如果缓存中有内容，立即返回缓存版本，同时让网络请求在后台进行；
      // 如果缓存中没有，则等待网络请求的结果。
      return cachedResponse || fetchPromise;
    })
  );
});