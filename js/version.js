/**
 * FireGen — Única fuente de verdad de versión de build.
 *
 * Al publicar una nueva versión:
 * 1. Cambia APP_VERSION aquí (ej. "3.7.1")
 * 2. Actualiza TODOS los ?v=APP_VERSION en index.html y login.html
 *    al mismo valor (buscar ?v= y reemplazar).
 * 3. Despliega. El Service Worker usa este valor vía importScripts.
 */
var APP_VERSION = '3.7.1';
