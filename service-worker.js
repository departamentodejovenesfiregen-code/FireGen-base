const CACHE_NAME = 'firegen-cache-v3';
const OFFLINE_URL = 'offline.html';

const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/offline.html',
  '/css/styles.css',
  '/js/config.js',
  '/js/firebase-config.js',
  '/js/auth.js',
  '/js/app.js',
  '/js/members.js',
  '/js/attendance.js',
  '/js/reports.js',
  '/js/strategy.js',
  '/js/charts.js',
  '/js/utils.js',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&display=swap'
];

// Instalar el Service Worker y guardar recursos estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Limpiar cachés antiguas cuando se activa un nuevo Service Worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptar peticiones
self.addEventListener('fetch', event => {
  // Ignorar peticiones a Firebase y otras APIs que no deben ir por caché estática
  if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('firebaseio.com')) {
    return;
  }

  // Ignorar peticiones POST, PUT, DELETE, etc.
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Retornar si está en caché
        if (response) {
          return response;
        }

        // Si no está, hacer la petición de red
        return fetch(event.request).catch(() => {
          // Si falla la red y es una petición de navegación (HTML), mostrar offline.html
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
        });
      })
  );
});
