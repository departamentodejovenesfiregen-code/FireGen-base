/**
 * FireGen V3.0 — js/firebase-config.js
 * ─────────────────────────────────────────────────────────────
 * CONFIGURACIÓN CENTRALIZADA DE FIREBASE
 *
 * Este archivo es la ÚNICA fuente de verdad para la configuración de Firebase.
 * No duplicar esta configuración en ningún otro archivo.
 *
 * Seguridad de la API Key:
 *   La API Key de Firebase para aplicaciones web es pública por diseño.
 *   La seguridad real se implementa a través de:
 *     1. Reglas de Realtime Database (firebase-rules.json)
 *     2. Firebase Authentication (auth.js)
 *     3. Restricciones de dominio en Google Cloud Console
 *
 * Para cambiar de proyecto Firebase, solo editar este archivo.
 * ─────────────────────────────────────────────────────────────
 */

const firebaseConfig = {
    apiKey:            "AIzaSyApvlSVSK6j3CbXJ9Z_jDv60Z6XpvfpAlY",
    authDomain:        "firegen-admin.firebaseapp.com",
    databaseURL:       "https://firegen-admin-default-rtdb.firebaseio.com",
    projectId:         "firegen-admin",
    storageBucket:     "firegen-admin.firebasestorage.app",
    messagingSenderId: "664551518980",
    appId:             "1:664551518980:web:7a8298b4bb7a8f50c01651",
    measurementId:     "G-PQLC5L80N2"
};

// Inicializar Firebase (solo una vez por sesión)
firebase.initializeApp(firebaseConfig);

// Instancias globales — importadas por todos los demás módulos
const db   = firebase.database();
const auth = firebase.auth();

// Configurar persistencia de sesión: LOCAL = sobrevive cierres del navegador
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(err => {
    console.warn("[FireGen] No se pudo configurar persistencia de sesión:", err.message);
});


