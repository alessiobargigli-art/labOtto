const VERSION = '2.0.11';
const CACHE_PREFIX = `lab8:${self.registration.scope}:`;
const CACHE_NAME = `${CACHE_PREFIX}${VERSION}`;
const APP_SHELL = ['./', './index.html', './styles.css', './panels.css', './levels.js', './campaign-core.js', './game-v2.js', './world-rules.js', './spawn-patterns.js', './spawn-tuning.js', './bomb-enemy.js', './audio.js', './pin.js', './settings.js', './leaderboard.js', './manifest.webmanifest', './audio/alien-battle-loop.mp3', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
const assetUrl = (path) => new URL(/\.(js|css|mp3)$/.test(path) ? `${path}?v=${VERSION}` : path, self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Bypass the HTTP cache as well as the old service worker's cache.
    await cache.addAll(APP_SHELL.map((path) => new Request(assetUrl(path), { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || !url.href.startsWith(self.registration.scope) || url.pathname.includes('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(new Request(request, { cache: 'no-cache' })).then((response) => {
      const offlineCopy = response.clone();
      event.waitUntil((async () => {
        // Refill after AGGIORNA, without putting another release's HTML
        // alongside this worker's offline assets.
        if (response.ok && (await offlineCopy.clone().text()).includes(`VERSIONE ${VERSION}`)) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(new URL('./index.html', self.registration.scope).href, offlineCopy);
        }
      })().catch(() => {}));
      return response;
    }).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      return (await cache.match(new URL('./index.html', self.registration.scope).href)) || Response.error();
    }));
    return;
  }
  event.respondWith((async () => {
    // Exact URL (including version), in this release's cache only.
    // Legacy lab8-v* caches are deliberately never consulted.
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && APP_SHELL.some((path) => assetUrl(path) === url.href)) {
      event.waitUntil(cache.put(request, response.clone()).catch(() => {}));
    }
    return response;
  })());
});
