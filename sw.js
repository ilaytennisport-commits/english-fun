// Offline support: the app works without internet after the first visit.
const CACHE = 'english-fun-v13';
const MODEL_CACHE = 'english-fun-model';   // filled by the app during the first download
const FILES = ['./', './index.html', './manifest.json', './icon.svg', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== MODEL_CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // The speech model (40MB): hand over the copy the app just downloaded; the engine then keeps its own.
  if (e.request.url.includes('/models/')) {
    if (e.request.cache === 'no-store') return;   // the app's own download
    e.respondWith(caches.open(MODEL_CACHE).then(c => c.match(e.request.url)).then(r => r || fetch(e.request)));
    return;
  }
  const keep = res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  };
  // Pages: try the network first so updates show up, fall back to cache offline.
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(keep).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(keep)));
});
