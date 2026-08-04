/**
 * FireGen V3.0 — service-worker.js
 * ─────────────────────────────────────────────────────────────
 * PWA Service Worker — Estrategia: Cache-First para assets estáticos,
 * Network-First para navegación. Compatible con GitHub Pages.
 * 
 * IMPORTANTE: Todas las rutas son RELATIVAS para funcionar
 * correctamente bajo cualquier subdirectorio de GitHub Pages.
 * ─────────────────────────────────────────────────────────────
 */

// ── Incrementar este número en cada deploy para forzar actualización ──
const CACHE_VERSION = 'firegen-v3.1';
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
  'js/members.js',
  'js/attendance.js',
  'js/reports.js',
  'js/strategy.js',
  'js/charts.js',
  'js/utils.js',
  'version.json'
];

// ── INSTALL: Pre-cachear solo assets locales ──────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => {
        // addAll falla si uno falla; usamos Promise.allSettled para robustez
        return Promise.allSettled(
          STATIC_ASSETS.map(url => cache.add(url).catch(() => {
            console.warn(`[SW] No se pudo cachear: ${url}`);
          }))
        );
      })
      .then(() => {
        // Forzar activación inmediata sin esperar a que cierren las pestañas
        return self.skipWaiting();
      })
  );
});

// ── ACTIVATE: Limpiar cachés antiguas y tomar control ─────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_VERSION)
          .map(name => {
            console.log(`[SW] Eliminando caché antigua: ${name}`);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Tomar control inmediato de todas las pestañas abiertas
      return self.clients.claim();
    })
  );
});

// ── FETCH: Estrategia inteligente según el tipo de petición ──────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // ① Ignorar completamente peticiones a Firebase (Auth + Database)
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('firebaseapp.com')
  ) {
    return; // Dejar pasar sin interceptar
  }

  // ② Ignorar peticiones que no sean GET
  if (event.request.method !== 'GET') return;

  // ③ Peticiones de navegación HTML (ir a una URL): Network-First
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Sin red: devolver la página offline
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // ④ Assets estáticos locales: Cache-First (rápido + offline)
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // No está en caché: ir a la red y agregar al caché
        return fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
              const clone = networkResponse.clone();
              caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
            }
            return networkResponse;
          })
          .catch(() => {
            // Sin red y sin caché: para imágenes devolver nothing, para navegación devolver offline
            if (event.request.destination === 'document') {
              return caches.match(OFFLINE_URL);
            }
          });
      })
  );
});
