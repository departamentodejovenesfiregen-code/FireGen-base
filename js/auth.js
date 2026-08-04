/**
 * FireGen V3.0 — js/auth.js
 * ─────────────────────────────────────────────────────────────
 * SISTEMA DE AUTENTICACIÓN
 * Gestiona el ciclo de vida de la sesión de usuario.
 *
 * Dependencias: firebase-config.js (auth, db)
 *
 * Flujo:
 *   1. onAuthStateChanged detecta el estado de sesión al cargar.
 *   2. Si NO hay usuario → redirige a login.html.
 *   3. Si HAY usuario → inicializa la aplicación principal.
 *   4. logout() destruye la sesión y redirige a login.html.
 * ─────────────────────────────────────────────────────────────
 */

/**
 * initAuth — Inicializa el listener de autenticación.
 * Debe llamarse como primera acción en app.js antes de cargar datos.
 * @param {Function} onAuthenticated - Callback cuando el usuario está autenticado
 */
function initAuth(onAuthenticated) {
    auth.onAuthStateChanged(user => {
        if (!user) {
            // Sin sesión → redirigir a login
            window.location.replace('login.html');
            return;
        }

        // Sesión válida → mostrar info de usuario y app
        const emailDisplay = document.getElementById('userEmailDisplay');
        if (emailDisplay) emailDisplay.textContent = user.email;

        // Mostrar el cuerpo de la app (oculto por defecto hasta autenticar)
        const appBody = document.getElementById('appBody');
        if (appBody) appBody.style.display = '';

        // Inicializar la aplicación
        if (typeof onAuthenticated === 'function') {
            onAuthenticated(user);
        }
    });
}

/**
 * logout — Cierra la sesión actual y redirige a login.html.
 * Llamada desde el botón "Cerrar sesión" en el header.
 */
function logout() {
    if (!confirm('¿Cerrar sesión en FireGen?')) return;
    auth.signOut()
        .then(() => {
            window.location.replace('login.html');
        })
        .catch(err => {
            console.error('[FireGen Auth] Error al cerrar sesión:', err);
            // Forzar redirección incluso si hay error
            window.location.replace('login.html');
        });
}

console.log("[FireGen] auth.js cargado");
