// Quickwell Pilot offline shell: network first, cached copy when offline. Letters are never cached (they are read in
// the page, never requested from the network). The OCR files (vendor/) are cached by tesseract.js itself, not here.
const CACHE = 'pilot-v1';
const SHELL = ['./', 'index.html', 'css/app.css', 'js/app.mjs', 'js/extract.mjs', 'js/card.mjs', 'js/ics.mjs', 'js/replies.mjs', 'js/store.mjs', 'js/i18n.mjs', 'js/sample.mjs', 'js/ocr.mjs', 'icon.svg', 'manifest.webmanifest', '/js/pro.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/') || u.pathname.includes('/vendor/')) return;
  e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
