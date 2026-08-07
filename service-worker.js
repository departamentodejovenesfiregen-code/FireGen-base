/**
 * FireGen V3.0 — service-worker.js
 * ─────────────────────────────────────────────────────────────
 * PWA Service Worker seguro:
 * - Al actualizar: elimina SOLO cachés viejas (nunca la nueva)
 * - JS/CSS: Network-First con fallback a caché
 * - Navegación: Network-First con fallback a index/offline
 * ─────────────────────────────────────────────────────────────
 */

const CACHE_VERSION = 'firegen-v3.6-safe-update';
const OFFLINE_URL = 'offline.html';

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
  return /\.(js|css)(\?|$)/i.test(url.pathname);
}

/** Busca en caché por URL exacta o sin query (?v=…) */
async function matchCache(request) {
  const exact = await caches.match(request);
  if (exact) return exact;

  const url = new URL(request.url);
  if (!url.search) return undefined;

  url.search = '';
  return caches.match(url.href);
}

async function putInCache(request, response) {
  if (!response || response.status !== 200 || response.type === 'opaque') return;
  try {
    const cache = await caches.open(CACHE_VERSION);
    await cache.put(request, response.clone());
  } catch (err) {
    console.warn('[SW] No se pudo guardar en caché:', err);
  }
}

async function deleteOldCaches() {
  const names = await caches.keys();
  await Promise.all(
    names
      .filter(name => name.startsWith('firegen-') && name !== CACHE_VERSION)
      .map(name => {
        console.log('[SW] Eliminando caché antigua:', name);
        return caches.delete(name);
      })
  );
}

// ── INSTALL ───────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache =>
      Promise.allSettled(
        STATIC_ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('[SW] No se pudo cachear:', url, err))
        )
      )
    ).then(() => self.skipWaiting())
  );
});

// ── MENSAJES ──────────────────────────────────────────────────────────
self.addEventListener('message', event => {
  const type = event.data && event.data.type;
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  // Solo limpia versiones viejas — NUNCA borra la caché actual (rompe la app)
  if (type === 'CLEAR_OLD_CACHES') {
    event.waitUntil(deleteOldCaches());
  }
});

// ── ACTIVATE ──────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    deleteOldCaches().then(() => self.clients.claim())
  );
});

// ── FETCH ─────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // No interceptar Firebase / CDN / externos
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('jsdelivr.net') ||
    url.hostname.includes('cdnjs.cloudflare.com') ||
    url.hostname.includes('tailwindcss.com') ||
    url.hostname !== self.location.hostname
  ) {
    return;
  }

  if (event.request.method !== 'GET') return;

  // Nunca cachear el propio service-worker.js (debe verse siempre fresco)
  if (url.pathname.endsWith('/service-worker.js') || url.pathname.endsWith('service-worker.js')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // HTML: Network-First → caché index → offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(async networkResponse => {
          if (networkResponse && networkResponse.ok) {
            await putInCache(event.request, networkResponse);
            const cache = await caches.open(CACHE_VERSION);
            await cache.put('index.html', networkResponse.clone()).catch(() => {});
          }
          return networkResponse;
        })
        .catch(async () => {
          return (
            (await matchCache(event.request)) ||
            (await caches.match('index.html')) ||
            (await caches.match(OFFLINE_URL))
          );
        })
    );
    return;
  }

  // JS/CSS: Network-First con fallback a caché (incluye match sin ?v=)
  if (isCodeAsset(url)) {
    event.respondWith(
      fetch(event.request)
        .then(async networkResponse => {
          if (networkResponse && networkResponse.ok) {
            await putInCache(event.request, networkResponse);
            // También guardar sin query para fallback estable
            const clean = new URL(event.request.url);
            if (clean.search) {
              clean.search = '';
              const cache = await caches.open(CACHE_VERSION);
              await cache.put(clean.href, networkResponse.clone()).catch(() => {});
            }
          }
          // Si la red responde mal, preferir caché
          if (!networkResponse || !networkResponse.ok) {
            const cached = await matchCache(event.request);
            if (cached) return cached;
          }
          return networkResponse;
        })
        .catch(() => matchCache(event.request))
    );
    return;
  }

  // Otros assets: Cache-First
  event.respondWith(
    matchCache(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(async networkResponse => {
        if (networkResponse && networkResponse.ok) {
          await putInCache(event.request, networkResponse);
        }
        return networkResponse;
      });
    })
  );
});
