/* Bump VERSION whenever a bundled file changes. Updates activate on request. */
const VERSION = '4.1.0';
const root = new URL('./', self.registration.scope);
const PREFIX = `ppl-training:${root.pathname}:`;
const CACHE = `${PREFIX}${VERSION}`;
const SHELL = [
  './index.html', './styles.css', './boot.js', './app.js', './core.js', './offline.js',
  './manifest.webmanifest', './icon.svg', './icons/icon-192.png',
  './icons/icon-512.png', './icons/apple-touch-icon.png'
];
const shellURLs = SHELL.map(path => new URL(path, root).href);
const indexURL = new URL('./index.html', root).href;

async function usable(response, url) {
  if (!response.ok || response.redirected || response.type === 'opaque') return false;
  const type = response.headers.get('content-type') || '';
  if (url.endsWith('.js')) return /(?:javascript|ecmascript)/i.test(type);
  if (url.endsWith('.css')) return /text\/css/i.test(type);
  if (url.endsWith('.json') || url.endsWith('.webmanifest')) return /(?:json|manifest)/i.test(type);
  if (url.endsWith('.png')) return /image\/png/i.test(type);
  if (url.endsWith('.svg')) return /image\/svg\+xml/i.test(type);
  if (url === indexURL) return /text\/html/i.test(type) && (await response.clone().text()).includes('data-ppl-shell="1"');
  return false;
}

async function prepare() {
  // Check every response first. An authentication page must never become the app.
  const responses = await Promise.all(shellURLs.map(async url => {
    const response = await fetch(new Request(url, {credentials:'same-origin', cache:'reload', redirect:'error'}));
    if (!await usable(response, url)) throw new Error('Offline-Datei noch nicht verfügbar');
    return response;
  }));
  const cache = await caches.open(CACHE);
  try {
    await Promise.all(shellURLs.map((url, index) => cache.put(url, responses[index])));
  } catch (error) {
    await caches.delete(CACHE);
    throw error;
  }
}

self.addEventListener('install', event => event.waitUntil(prepare()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
  await self.clients.claim();
})()));

async function fromShell(request, key) {
  const cache = await caches.open(CACHE);
  const saved = await cache.match(key);
  // Start immediately from the complete installed version, even with slow Wi-Fi,
  // an expired online session, or a network that returns an error page.
  if (saved) return saved;
  try {
    const response = await fetch(request);
    if (await usable(response, key)) {
      await cache.put(key, response.clone());
      return response;
    }
  } catch {}
  return new Response('PPL ist auf diesem Gerät noch nicht vollständig offline vorbereitet. Öffne die App einmal mit Internet und prüfe unter „Mehr“ den Offline-Status.', {
    status:503, headers:{'Content-Type':'text/plain;charset=utf-8'}
  });
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== root.origin) return;
  // Other project paths on this GitHub Pages origin stay outside this app.
  if (request.mode === 'navigate') {
    if (url.pathname !== root.pathname && url.pathname !== new URL(indexURL).pathname) return;
    event.respondWith(fromShell(request, indexURL));
    return;
  }
  const key = shellURLs.find(item => new URL(item).pathname === url.pathname);
  if (key) event.respondWith(fromShell(request, key));
});

self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') {
    event.waitUntil(self.skipWaiting());
  } else if (event.data?.type === 'CHECK_OFFLINE') {
    event.waitUntil((async () => {
      try {
        const cache = await caches.open(CACHE);
        const found = await Promise.all(shellURLs.map(url => cache.match(url)));
        const missing = SHELL.filter((_, index) => !found[index]);
        event.ports[0]?.postMessage({ready:missing.length === 0, version:VERSION, total:SHELL.length, cached:SHELL.length-missing.length});
      } catch {
        event.ports[0]?.postMessage({ready:false, version:VERSION, total:SHELL.length, cached:0});
      }
    })());
  }
});
