// Offline cache and the WhatsApp share target. Plain JS (not type-stripped); scripts/build.ts
// stamps the version and the list of files to precache.
const VERSION = '__VERSION__';
const CACHE = 'gabay-' + VERSION;
const SHARE_CACHE = 'gabay-share';
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('gabay-') && k !== CACHE && k !== SHARE_CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.pathname.endsWith('/share')) {
    event.respondWith((async () => {
      const form = await event.request.formData();
      const file = form.get('file');
      if (file && typeof file !== 'string') {
        const cache = await caches.open(SHARE_CACHE);
        await cache.put('shared-file', new Response(file, { headers: { 'X-File-Name': encodeURIComponent(file.name) } }));
      }
      return Response.redirect(new URL('./#import', self.registration.scope).href, 303);
    })());
    return;
  }
  if (event.request.method !== 'GET' || url.origin !== location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Navigations (with ?demo=1 etc.) are answered with the app shell.
    const hit = await cache.match(event.request, { ignoreSearch: event.request.mode === 'navigate' })
      ?? (event.request.mode === 'navigate' ? await cache.match('./') : undefined);
    return hit ?? fetch(event.request);
  })());
});
