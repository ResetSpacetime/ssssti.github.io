// /source/sw.js

const CACHE_NAME = 'hexo-blog-cache-v1'; // 定义缓存名称
const URLS_TO_CACHE = [
  '/', // 预缓存网站根目录（主页）
  // 你可以根据需要添加更多需要预缓存的资源，例如 css, js 文件
  // '/css/main.css',
];

// 监听 'install' 事件，当 Service Worker 安装时触发
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// 监听 'fetch' 事件，拦截所有网络请求
self.addEventListener('fetch', (event) => {
  event.respondWith(
    // 策略：优先从网络获取。如果失败（例如离线），则从缓存中寻找匹配的资源。
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});