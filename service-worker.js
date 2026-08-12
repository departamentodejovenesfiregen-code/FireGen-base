/**
 * FireGen V3 — service-worker.js
 * ─────────────────────────────────────────────────────────────
 * IMPORTANTE: BUILD_VERSION vive AQUÍ.
 * Cada release DEBE cambiar este valor para que el navegador
 * detecte un Service Worker nuevo (byte-diff obligatorio).
 *
 * Ciclo:
 *   INSTALL  → crear firegen-{BUILD_VERSION}, precache (sin skipWaiting)
 *   MESSAGE  → SKIP_WAITING (única vía de activación anticipada)
 *   ACTIVATE → borrar caches firegen-* antiguas → clients.claim()
 *
 * JS/CSS: Network-First + fallback EXACTO (nunca quitar ?v=).
 * HTML: Network-First → cache exacta → offline.html
 * Firebase/CDN: no se interceptan.
 * ─────────────────────────────────────────────────────────────
 */

/** Cambiar en CADA publicación junto con ?v= en HTML y js/version.js */
var BUILD_VERSION = '3.7.6';
var CACHE_NAME = 'firegen-' + BUILD_VERSION;
var OFFLINE_URL = 'offline.html';
var V = BUILD_VERSION;

/** Precache atómico: mismas URLs versionadas que index.html / login.html */
var PRECACHE_URLS = [
  'index.html',
  'login.html',
  OFFLINE_URL,
  'css/styles.css?v=' + V,
  'js/version.js?v=' + V,
  'js/pwa.js?v=' + V,
  'js/firebase-config.js?v=' + V,
  'js/config.js?v=' + V,
  'js/utils.js?v=' + V,
  'js/charts.js?v=' + V,
  'js/members.js?v=' + V,
  'js/attendance.js?v=' + V,
  'js/reports.js?v=' + V,
  'js/strategy.js?v=' + V,
  'js/auth.js?v=' + V,
  'js/plan-rescate-core.js?v=' + V,
  'js/plan-rescate-ui.js?v=' + V,
  'js/coordinacion.js?v=' + V,
  'js/admin-config.js?v=' + V,
  'js/user-management.js?v=' + V,
  'js/app.js?v=' + V
];

function isExternal(url) {
  return (
    url.hostname !== self.location.hostname ||
    url.hostname.indexOf('firebaseio.com') !== -1 ||
    url.hostname.indexOf('googleapis.com') !== -1 ||
    url.hostname.indexOf('gstatic.com') !== -1 ||
    url.hostname.indexOf('firebaseapp.com') !== -1 ||
    url.hostname.indexOf('jsdelivr.net') !== -1 ||
    url.hostname.indexOf('cdnjs.cloudflare.com') !== -1 ||
    url.hostname.indexOf('tailwindcss.com') !== -1 ||
    url.hostname.indexOf('fonts.googleapis.com') !== -1 ||
    url.hostname.indexOf('fonts.gstatic.com') !== -1
  );
}

function isCodeAsset(url) {
  return /\.(js|css)$/i.test(url.pathname);
}

function putExact(request, response) {
  if (!response || !response.ok || response.type === 'opaque') return;
  var clone = response.clone();
  caches.open(CACHE_NAME).then(function (cache) {
    return cache.put(request, clone);
  }).catch(function () { /* ignore quota */ });
}

// ── INSTALL: solo precache de ESTE build ──────────────────────────────
self.addEventListener('install', function (event) {
  console.log('[SW] install', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.allSettled(
        PRECACHE_URLS.map(function (url) {
          return cache.add(url).catch(function (err) {
            console.warn('[SW] precache omitido:', url, err && err.message);
          });
        })
      );
    })
    // NO skipWaiting aquí — lo solicita pwa.js vía postMessage
  );
});

// ── MESSAGE: única vía de skipWaiting ─────────────────────────────────
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING', CACHE_NAME);
    self.skipWaiting();
  }
});

// ── ACTIVATE: limpiar generaciones viejas + tomar control ─────────────
self.addEventListener('activate', function (event) {
  console.log('[SW] activate', CACHE_NAME);
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names
          .filter(function (name) {
            return name.indexOf('firegen-') === 0 && name !== CACHE_NAME;
          })
          .map(function (name) {
            console.log('[SW] eliminando cache antigua:', name);
            return caches.delete(name);
          })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// ── FETCH ─────────────────────────────────────────────────────────────
self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url = new URL(request.url);

  if (isExternal(url)) return;

  // El propio SW siempre desde red (sin cache HTTP del SW script)
  if (url.pathname.indexOf('service-worker.js') !== -1) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  // HTML: Network-First → cache exacta → offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(function (networkResponse) {
          if (networkResponse && networkResponse.ok) {
            // Solo la URL real de la navegación (index/login/etc).
            // Nunca reescribir bajo la clave fija 'index.html'.
            putExact(request, networkResponse);
          }
          return networkResponse;
        })
        .catch(function () {
          return caches.match(request).then(function (cached) {
            if (cached) return cached;
            return caches.match('index.html').then(function (indexCached) {
              if (indexCached) return indexCached;
              return caches.match(OFFLINE_URL);
            });
          });
        })
    );
    return;
  }

  // JS/CSS: Network-First, fallback SOLO a la URL exacta (incluye ?v=)
  if (isCodeAsset(url)) {
    event.respondWith(
      fetch(request)
        .then(function (networkResponse) {
          if (networkResponse && networkResponse.ok) {
            putExact(request, networkResponse);
            return networkResponse;
          }
          return caches.match(request).then(function (cached) {
            return cached || networkResponse;
          });
        })
        .catch(function () {
          return caches.match(request);
        })
    );
    return;
  }

  // Otros assets locales: Cache-First exacto
  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (networkResponse) {
        if (networkResponse && networkResponse.ok) {
          putExact(request, networkResponse);
        }
        return networkResponse;
      });
    })
  );
});
