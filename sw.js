/* Tiny offline cache so the installed app opens without a network. */
const CACHE = 'nathaniel-planet-v5';

// Files saved on install so the app can start offline.
const FILES = [
  './', './index.html', './planet-gen.js', './planet-worker.js', './planet-tile.js', './planet-tile-worker.js',
  './city-gen.js', './invasion.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js',
];

// On install: save every file (a file that fails to download is skipped) and take over straight away.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.all(FILES.map(file => cache.add(file).catch(() => {}))))
      .then(() => self.skipWaiting()));
});

// On activate: delete caches left by older versions.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(name => name !== CACHE).map(name => caches.delete(name))))
      .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  // network first (so updates arrive), cache as fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request)));
});
