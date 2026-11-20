/* Tiny offline cache so the installed app opens without a network. */
const CACHE = 'nathaniel-planet-v5';
const FILES = ['./', './index.html', './planet-gen.js', './planet-worker.js', './planet-tile.js', './planet-tile-worker.js', './city-gen.js', './invasion.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => c.add(f).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // network first (so updates arrive), cache as fallback
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(ch => ch.put(e.request, c)); } return r; }).catch(() => caches.match(e.request)));
});
