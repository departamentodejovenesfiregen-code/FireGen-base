/**
 * FireGen — Versión visible para la UI / logs del cliente.
 *
 * NO controla el Service Worker.
 * La versión del SW está en service-worker.js → BUILD_VERSION.
 *
 * Al publicar (ej. 3.7.3):
 * 1. Cambia BUILD_VERSION en service-worker.js  (OBLIGATORIO)
 * 2. Cambia APP_VERSION aquí al mismo valor
 * 3. Reemplaza TODOS los ?v=... en index.html y login.html
 * 4. Despliega
 */
var APP_VERSION = '3.7.5';

