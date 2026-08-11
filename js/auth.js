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
 *   3. Si HAY usuario → carga su nombre desde Firebase y app.
 *   4. logout() destruye la sesión y redirige a login.html.
 * ─────────────────────────────────────────────────────────────
 */

/** Usuario actualmente autenticado */
let currentUser = null;

/** true si el usuario es el administrador principal */
let isAdmin = false;

/**
 * initAuth — Inicializa el listener de autenticación.
 * @param {Function} onAuthenticated - Callback cuando el usuario está autenticado
 */
function initAuth(onAuthenticated) {
    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.replace('login.html');
            return;
        }

        currentUser = user;

        // Determinar si es admin comparando con adminEmail configurado
        const adminEmail = (AppConfig && AppConfig.current && AppConfig.current.adminEmail)
            ? AppConfig.current.adminEmail.toLowerCase()
            : 'departamentodejovenesfiregen@gmail.com';
        isAdmin = user.email.toLowerCase() === adminEmail;

        // Ocultar tab Config para no-admins (única restricción de UI)
        const tabConfig = document.getElementById('tab-config');
        if (tabConfig) tabConfig.style.display = isAdmin ? '' : 'none';
        
        const bnConfig = document.getElementById('bn-config');
        if (bnConfig) bnConfig.style.display = isAdmin ? '' : 'none';

        // Cargar nombre y rol del usuario desde Firebase (usuarios/{uid})
        db.ref('usuarios/' + user.uid).once('value')
            .then(snap => {
                const data = snap.val() || {};
                const nombre = data.nombre || user.email;
                window.currentUserRole = isAdmin ? 'administrador' : (data.rol || 'lider');
                
                const emailDisplay = document.getElementById('userEmailDisplay');
                if (emailDisplay) emailDisplay.textContent = nombre;

                applyRolePermissions(window.currentUserRole);
            })
            .catch(() => {
                // Fallback
                window.currentUserRole = isAdmin ? 'administrador' : 'lider';
                const emailDisplay = document.getElementById('userEmailDisplay');
                if (emailDisplay) emailDisplay.textContent = user.email;
                applyRolePermissions(window.currentUserRole);
            });

        // Mostrar el cuerpo de la app
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
 */
function logout() {
    if (!confirm('¿Cerrar sesión en FireGen?')) return;
    auth.signOut()
        .then(() => {
            window.location.replace('login.html');
        })
        .catch(err => {
            console.error('[FireGen Auth] Error al cerrar sesión:', err);
            window.location.replace('login.html');
        });
}
/**
 * applyRolePermissions — Muestra los botones flotantes (FABs) según el rol.
 * Roles: administrador | coordinador | secretario | lider
 */
function applyRolePermissions(rol) {
    const r = (rol || 'lider').toLowerCase();

    // Solo mostrar los botones flotantes si estamos en la pestaña de Estrategias
    const viewStrategy = document.getElementById('view-strategy');
    const isStrategyView = viewStrategy && !viewStrategy.classList.contains('hidden');

    // FAB Rescate: todos los roles con acceso (solo en strategy)
    const fabRescate = document.getElementById('fab-rescate');
    if (fabRescate) {
        const verRescate = ['lider','secretario','coordinador','administrador'].includes(r);
        fabRescate.style.display = (verRescate && isStrategyView) ? 'flex' : 'none';
    }

    // FAB Coordinación: solo coordinador y admin (solo en strategy)
    const fabCoord = document.getElementById('fab-coordinacion');
    if (fabCoord) {
        const verCoord = ['coordinador','administrador'].includes(r);
        fabCoord.style.display = (verCoord && isStrategyView) ? 'flex' : 'none';
    }

    // Tab Config: solo admin
    const tabConfig = document.getElementById('tab-config');
    if (tabConfig) tabConfig.style.display = r === 'administrador' ? '' : 'none';
    const bnConfig = document.getElementById('bn-config');
    if (bnConfig) bnConfig.style.display = r === 'administrador' ? '' : 'none';
    
    // Auto abrir rescate para líderes
    if (r === 'lider') {
        setTimeout(() => {
            if (!window._rescateRedirected) {
                window._rescateRedirected = true;
                if (typeof openRescateOverlay === 'function') openRescateOverlay();
            }
        }, 300);
    }
}
