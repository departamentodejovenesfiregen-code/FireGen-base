/**
 * FireGen — js/firebase-tesoreria-config.js
 * ─────────────────────────────────────────────────────────────
 * CONFIGURACIÓN CENTRALIZADA DE FIREBASE SECUNDARIO (TESORERÍA)
 *
 * Este proyecto de Firebase es EXCLUSIVO para almacenar datos
 * financieros y accesos del módulo de Tesorería.
 * ─────────────────────────────────────────────────────────────
 */

// Configuradas con credenciales reales del Firebase de Tesorería
const treasuryFirebaseConfig = {
    apiKey:            "AIzaSyDLlMm2RJ9E7e_B_lGdhW97Mf9kg0tm908",
    authDomain:        "firegen-tesoreria.firebaseapp.com",
    databaseURL:       "https://firegen-tesoreria-default-rtdb.firebaseio.com",
    projectId:         "firegen-tesoreria",
    storageBucket:     "firegen-tesoreria.firebasestorage.app",
    messagingSenderId: "327504138033",
    appId:             "1:327504138033:web:9f92161476354970e36a10",
    measurementId:     "G-0N5Q2C7KBF"
};

// Inicializar app secundaria (nombre 'treasury')
let treasuryApp, treasuryDb, treasuryAuth;

if (!firebase.apps.find(app => app.name === 'treasury')) {
    treasuryApp = firebase.initializeApp(treasuryFirebaseConfig, 'treasury');
} else {
    treasuryApp = firebase.app('treasury');
}

// Instancias globales para el módulo de tesorería
treasuryDb = treasuryApp.database();
treasuryAuth = treasuryApp.auth();

// Configurar persistencia LOCAL para el auth secundario
treasuryAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(err => {
    console.warn("[FireGen Treasury] No se pudo configurar persistencia de sesión:", err.message);
});

/**
 * Función para asegurar que el usuario tenga acceso anónimo a la base de Tesorería
 * si no está logueado formalmente como tesorero/admin.
 */
function ensureTreasuryAnonymousLogin() {
    return new Promise((resolve, reject) => {
        const unsubscribe = treasuryAuth.onAuthStateChanged(user => {
            unsubscribe();
            if (user) {
                // Ya hay un usuario (puede ser formal o anónimo)
                resolve(user);
            } else {
                // No hay sesión, iniciar anónimamente
                treasuryAuth.signInAnonymously()
                    .then(cred => resolve(cred.user))
                    .catch(err => {
                        console.error("[FireGen Treasury] Error login anónimo:", err);
                        reject(err);
                    });
            }
        });
    });
}
