// Quickwell Play offline worker. Scope: /play/ only, so no other page on the site is affected.
// - Never touches /api/* (billing and access checks always go to the network), other origins, or non-GET requests.
// - Pages: network first (you always get the latest), cached copy when offline.
// - Game files: also network first (a fresh page never runs with stale scripts); the cache is the offline copy.
// Bump VERSION when files change shape; old caches are deleted on activate.
const VERSION = 'play-v1';
const CORE = [
  '/play/', '/play/echo/', '/play/swift/', '/play/linkr/',
  '/play/css/play.css', '/play/manifest.webmanifest',
  '/play/js/core.mjs', '/play/js/ui.mjs', '/play/js/echo.mjs', '/play/js/swift.mjs', '/play/js/linkr.mjs',
  '/play/js/hub-app.mjs', '/play/js/echo-app.mjs', '/play/js/swift-app.mjs', '/play/js/linkr-app.mjs',
  '/play/icons/icon-192.png', '/play/icons/apple-touch-icon.png', '/js/pro.js', '/favicon.ico',
];
const OURS = (p) => p.startsWith('/play/') || p === '/js/pro.js' || p === '/favicon.ico';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('play-') && k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
const keep = (res) => res && res.ok && res.type === 'basic' && !res.redirected;
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || !OURS(url.pathname)) return;
  if (req.mode === 'navigate') {
    // Cache key ignores the query (?ref=…, ?play=daily, ?session_id=…) so one copy serves every link.
    e.respondWith(fetch(req).then((res) => {
      if (keep(res)) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(url.pathname, copy)); }
      return res;
    }).catch(() => caches.match(url.pathname).then((hit) => hit || caches.match('/play/'))));
    return;
  }
  // Game files: network first too, so a new page never runs with old scripts; the cache is the offline copy.
  e.respondWith(fetch(req).then((res) => {
    if (keep(res)) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || Response.error())));
});
