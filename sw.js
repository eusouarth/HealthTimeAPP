// sw.js
const CACHE_NAME = 'healthtime-v1';
const assets = [
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/simulation.js',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets);
    })
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      return response || fetch(e.request);
    })
  );
});