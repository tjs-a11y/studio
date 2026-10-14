// Quickwell Shield offline shell: network first, cached copy when offline. Messages are never cached or sent: they are
// checked in the page. Shares from other apps (Web Share Target) are received HERE, on the device, and handed to the
// page through the local Cache Storage; the shared text never goes to the network.
const CACHE = 'shield-v1';
const SHARE = 'shield-share';
const SHELL = ['./', 'index.html', 'css/app.css', 'js/app.mjs', 'js/check.mjs', 'js/rules.mjs', 'js/url.mjs', 'js/i18n.mjs', 'js/kit.mjs', 'js/tips.mjs', 'icon.svg', 'manifest.webmanifest', '/js/pro.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k !== SHARE).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method === 'POST' && u.origin === location.origin && u.pathname === '/shield/share-target') {
    e.respondWith((async () => {
      try {
        const f = await e.request.formData();
        const pick = (k) => String(f.get(k) || '').slice(0, 20000);
        const c = await caches.open(SHARE);
        await c.put('/shield/__shared', new Response(JSON.stringify({ title: pick('title'), text: pick('text'), url: pick('url') }), { headers: { 'content-type': 'application/json' } }));
      } catch (err) { /* nothing usable was shared */ }
      return Response.redirect('/shield/?shared=1', 303);
    })());
    return;
  }
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
