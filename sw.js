/* Bethany Hope Leeman — Portfolio 2026 Service Worker:
   Lets the ONE central app (index.html) install and open offline as a PWA.
   Pages are fetched fresh when online (so updates appear), cached copy used when offline.
   Bump VERSION whenever you change the files to clear old caches. */
const VERSION = 'v1795592343';
const CACHE = 'bethany-portfolio-2026-' + VERSION;
const SHELL = [
  'index.html',
  'admin.html',
  'admin.js',
  'data.js',
  'firebase-config.js',
  'manifest.json',
  'icon.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('index.html')))
  );
});
