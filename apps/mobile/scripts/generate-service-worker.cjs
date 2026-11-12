const { createHash } = require('node:crypto');
const { readdirSync, readFileSync, writeFileSync } = require('node:fs');
const { join, resolve } = require('node:path');

const dist = resolve('dist');

function listFiles(directory) {
  return readdirSync(join(dist, directory), { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

const files = [
  'index.html',
  ...listFiles('_expo/static').filter((path) => /\.(js|css)$/.test(path)),
  ...listFiles('assets'),
].sort();
const hash = createHash('sha256');
for (const path of files) {
  hash.update(path);
  hash.update(readFileSync(join(dist, path)));
}

const paths = files.map((path) =>
  path === 'index.html' ? '/' : `/${path.split('/').map(encodeURIComponent).join('/')}`,
);

writeFileSync(
  join(dist, 'service-worker.js'),
  `const CACHE_PREFIX = 'bowling-app-';
const CACHE = CACHE_PREFIX + '${hash.digest('hex').slice(0, 16)}';
const PATHS = new Map(${JSON.stringify(paths)}.map((path) => [decodeURIComponent(path), path]));

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) =>
    cache.addAll(Array.from(PATHS.values(), (path) => new Request(path, { cache: 'reload' }))),
  ));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(CACHE);
      return (await cache.match('/')) ?? Response.error();
    }));
    return;
  }

  const path = PATHS.get(decodeURIComponent(url.pathname));
  if (path) {
    event.respondWith(caches.open(CACHE).then(async (cache) =>
      (await cache.match(path)) ?? fetch(request),
    ));
  }
});
`,
);
