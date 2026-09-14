const CACHE = 'akari-aio-v1';
const PRECACHE = [
  './',
  './index.html',
  './app.webmanifest',
  './images/favicon.ico',
  './images/logo192.png',
  './vendor/audioConsole-4.2.1.js',
  './engine/audioConsole.js'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (e.request.url.includes('/models/')) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
