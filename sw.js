// sw.js

// 1. 定义缓存的名称和需要缓存的文件列表
const CACHE_NAME = 'arlmy-cache-v1'; // 每次更新 sw.js 时，建议更改版本号来触发更新
const urlsToCache = [
  '/', // 必须缓存 start_url，对于您的网站就是根目录
  '/offline.html', // 建议创建一个专门的离线提示页面
  // 在下面添加您网站的核心 CSS, JS, 图片等资源
  // 例如:
  // '/css/style.css',
  // '/js/main.js',
  // '/pics/logo.png'
];

// 2. 安装 Service Worker 并缓存文件
self.addEventListener('install', event => {
  // event.waitUntil() 会等待内部的代码执行完毕
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching app shell');
        return cache.addAll(urlsToCache);
      })
  );
});

// 3. 拦截网络请求并从缓存中返回响应
self.addEventListener('fetch', event => {
  event.respondWith(
    // caches.match() 尝试在缓存中寻找匹配的请求
    caches.match(event.request)
      .then(response => {
        // 如果在缓存中找到了匹配的响应，则直接返回它
        if (response) {
          return response;
        }

        // 如果缓存中没有，则正常发起网络请求
        return fetch(event.request).catch(() => {
          // 如果网络请求也失败了（比如真的离线了），
          // 就返回一个预先缓存好的离线提示页面
          return caches.match('/offline.html');
        });
      })
  );
});

// (可选) 4. 清理旧缓存
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});