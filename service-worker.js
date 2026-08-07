/**
 * FireGen V3.0 — service-worker.js
 * ─────────────────────────────────────────────────────────────
 * PWA Service Worker — Network-First para JS/CSS (evita código
 * obsoleto en celulares/PCs), Cache-First para assets estáticos,
 * Network-First para navegación. Compatible con GitHub Pages.
 * ─────────────────────────────────────────────────────────────
 */

const CACHE_VERSION = 'firegen-v3.5-auto-update';
const OFFLINE_URL = 'offline.html';

// Assets locales a pre-cachear (rutas relativas al SW)
const STATIC_ASSETS = [
  './',
  'index.html',
  'login.html',
  'offline.html',
  'css/styles.css',
  'js/config.js',
  'js/firebase-config.js',
  'js/auth.js',
  'js/app.js',
  'js/admin-config.js',
  'js/user-management.js',
  'js/members.js',
  'js/attendance.js',
  'js/reports.js',
  'js/strategy.js',
  'js/charts.js',
  'js/utils.js'
];

function isCodeAsset(url) {
  return /\.(js|css)(\?|$)/i.test(url.pathname) || url.pathname.endsWith('/service-worker.js');
}

// ── INSTALL: Pre-cachear solo assets locales ──────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => {
        return Promise.allSettled(
          STATIC_ASSETS.map(url => cache.add(url).catch(err => {
            console.warn(`[SW] No se pudo cachear: ${url}`, err);
          }))
        );
      })
  );
  // Activar de inmediato para que todos los dispositivos reciban la corrección
  self.skipWaiting();
});

async function clearOldFiregenCaches(keepCurrent) {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter(name => name.startsWith('firegen-') && (!keepCurrent || name !== CACHE_VERSION))
      .map(name => {
        console.log(`[SW] Eliminando caché: ${name}`);
        return caches.delete(name);
      })
  );
}

// ── LISTENERS DE MENSAJES ─────────────────────────────────────────────
self.addEventListener('message', event => {
  const type = event.data && event.data.type;
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (type === 'CLEAR_CACHES') {
    event.waitUntil(clearOldFiregenCaches(false));
  }
});

// ── ACTIVATE: Limpiar cachés antiguas y tomar control ─────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    clearOldFiregenCaches(true).then(() => self.clients.claim())
  );
});

// ── FETCH: Estrategia inteligente según el tipo de petición ──────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // ① Ignorar completamente peticiones a Firebase y APIs externas (Cross-origin)
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname !== self.location.hostname
  ) {
    return;
  }

  // ② Ignorar peticiones que no sean GET
  if (event.request.method !== 'GET') return;

  // ③ Peticiones de navegación HTML: Network-First
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          const clone = networkResponse.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
          return networkResponse;
        })
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // ④ JS/CSS: Network-First (evita que celulares queden con lógica vieja)
  if (isCodeAsset(url)) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
            const clone = networkResponse.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // ⑤ Otros assets estáticos locales: Cache-First
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
              const clone = networkResponse.clone();
              caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
            }
            return networkResponse;
          })
          .catch(() => {
            if (event.request.destination === 'document') {
              return caches.match(OFFLINE_URL);
            }
          });
      })
  );
});
