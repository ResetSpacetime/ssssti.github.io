// sw.js

// 1. 定义缓存名称和版本
// 重要提示：每次更新此文件中的任何核心文件时，请务必更改此版本字符串。
// 推荐使用日期格式，例如 'v-2025-10-11-01'。
const VERSION = 'v-2025-11-10-01'; // <-- 部署前请更新此版本号！
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

// 5. 拦截网络请求 (推荐的策略组合)
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // 忽略非 GET 或跨域请求
  if (event.request.method !== 'GET' || requestUrl.origin !== self.location.origin) {
    return;
  }

  // 策略 1: 导航请求 (HTML 页面) - 使用 "网络优先"
  // 这将立即解决您首页不更新的问题
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          // 拿到新数据，克隆并存入动态缓存
          const responseToCache = networkResponse.clone();
          caches.open(DYNAMIC_CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          // 返回网络响应
          return networkResponse;
        })
        .catch(() => {
          // 网络失败 (离线), 尝试从缓存中读取
          // 这保证了离线可用性
          console.log('[SW] Network failed, matching cache for:', event.request.url);
          return caches.match(event.request).then(cachedResponse => {
            // 如果缓存中也没有 (例如离线状态下首次访问一个新页面), 
            // 您可以在这里返回一个统一的离线页面, 比如 caches.match('/offline.html')
            return cachedResponse;
          });
        })
    );
    return;
  }

  // 策略 2: APP_SHELL 资源 (CSS, 字体等) - "缓存优先"
  // 这些文件已在 APP_SHELL_URLS 列表中，我们相信它们在版本更新前是不变的
  if (APP_SHELL_URLS.includes(requestUrl.pathname)) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        // 缓存有就返回，没有就去网络拿 (理论上 install 阶段都缓存了)
        return cachedResponse || fetch(event.request);
      })
    );
    return;
  }

  // 策略 3: 其他所有请求 (图片, API等) - "过期时重新验证 (Stale-While-Revalidate)"
  // 速度和更新的完美平衡：立即返回缓存，后台默默更新
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      
      // 1. 定义网络请求
      const fetchPromise = fetch(event.request).then(networkResponse => {
        // 检查响应是否有效
        if (!networkResponse || !networkResponse.ok) {
          return networkResponse;
        }

        // 克隆响应并存入动态缓存
        const responseToCache = networkResponse.clone();
        caches.open(DYNAMIC_CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(error => {
        console.error('[SW] SWR Fetch failed:', error);
        // 网络失败时, 我们不抛出错误, 因为可能已经返回了 cachedResponse
      });

      // 2. 立即返回缓存 (如果存在)
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // 3. 如果缓存不存在 (首次加载), 则等待网络响应
      return fetchPromise;
    })
  );
});

