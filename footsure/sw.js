// Footsure service worker: keeps the page and, once downloaded, the pinned pose-model files
// available offline for monthly re-checks. It never caches /api calls and never sees camera video.
const SHELL = 'footsure-shell-v1';
const MODEL = 'footsure-model-v1';
const FILES = ['./', 'index.html', 'privacy.html', 'cutoffs.json', 'manifest.webmanifest', 'icon.svg', 'css/app.css',
  'js/app.mjs', 'js/pose.mjs', 'js/camera.mjs', 'js/cutoffs.mjs', 'js/share.mjs', 'js/ics.mjs', 'js/store.mjs', 'js/chart.mjs', '/js/pro.js'];
// Versioned (immutable) model URLs only.
const MODEL_HOSTS = [/^https:\/\/cdn\.jsdelivr\.net\/npm\/@mediapipe\/tasks-vision@\d+\.\d+\.\d+\//, /^https:\/\/storage\.googleapis\.com\/mediapipe-models\/pose_landmarker\/pose_landmarker_lite\/float16\/1\//];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => Promise.all(FILES.map((f) => c.add(f).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => ![SHELL, MODEL].includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (MODEL_HOSTS.some((re) => re.test(req.url))) {
    e.respondWith(caches.open(MODEL).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }
  if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  // Network first (so cutoff and wording fixes arrive at once), cache as the offline fallback.
  e.respondWith(fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(SHELL).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))));
});
