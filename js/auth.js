/**
 * FireGen — js/auth.js
 * ─────────────────────────────────────────────────────────────
 * SISTEMA DE AUTENTICACIÓN — Etapa 4 / Build B3.275
 *
 * Rol interno canónico (minúscula):
 *   admin | coordinador | vicecoordinador | secretario | tesorero | vocal | pendiente
 *
 * "Líder" NUNCA es un rol de plataforma.
 * "Líder" solo existe como estadoEspiritual en miembros/.
 *
 * Dependencias: firebase-config.js (auth, db)
 *
 * Flujo:
 *   1. onAuthStateChanged detecta el estado de sesión al cargar.
 *   2. Si NO hay usuario → redirige a login.html.
 *   3. Si HAY usuario → carga perfil desde usuarios/{uid}.
 *   4. Aplica matriz de permisos según rol.
 *   5. logout() destruye la sesión y redirige a login.html.
 * ─────────────────────────────────────────────────────────────
 */

/** Usuario actualmente autenticado (Firebase Auth) */
let currentUser = null;

/** true si el usuario es el administrador principal */
let isAdmin = false;

/** UID y miembroId del usuario activo */
let currentUserUid = null;
let currentUserMemberId = null;

/**
 * ÚNICO correo administrativo canónico.
 * No mezclar con otras fuentes de verdad.
 * Si cambia en la DB, se respetará; si no existe, se usa este.
 */
const ADMIN_EMAIL_FALLBACK = 'departamentodejovenesfiregen@gmail.com';

/**
 * isConfiguredAdmin — Determina si un usuario es administrador.
 * Compara contra el correo guardado en configuracion/adminEmail,
 * con fallback al valor hardcoded.
 * @param {Object} user - Firebase Auth user
 * @param {string} adminEmailFromDB - valor de configuracion/adminEmail
 */
function isConfiguredAdmin(user, adminEmailFromDB) {
    if (!user || !user.email) return false;
    const email = user.email.toLowerCase();
    const dbEmail = (adminEmailFromDB || '').toLowerCase();
    return email === ADMIN_EMAIL_FALLBACK.toLowerCase() || (dbEmail && email === dbEmail);
}

/**
 * normalizeRole — Normaliza el rol a minúsculas consistentes.
 * Elimina variantes antiguas de "líder" como rol.
 * @param {string} rol
 */
function normalizeRole(rol) {
    if (!rol) return 'pendiente';
    const r = rol.toLowerCase().trim();
    // "lider" como ROL migra a "vocal"
    if (r === 'lider' || r === 'líder' || r === 'leader') return 'vocal';
    // Roles canónicos válidos
    const valid = ['admin', 'administrador', 'coordinador', 'vicecoordinador', 'secretario', 'tesorero', 'vocal', 'pendiente'];
    if (valid.includes(r)) return r === 'administrador' ? 'admin' : r;
    return 'pendiente';
}

/**
 * PERMISSIONS — Matriz centralizada de permisos por rol.
 * Usar hasPermission() para verificar acceso.
 */
const PERMISSIONS = {
    admin: {
        baseMaestro: true,
        asistencia: true,
        verInformeMensual: true,
        editarInformeMensual: true,

        estrategias: true,
        planRescate: true,
        coordinacion: true,
        editarMiembros: true,
        asignarMiembros: true,
        eliminarMiembros: true,
        configuracion: true,
        administracion: true,
        cerrarAnio: true
    },
    coordinador: {
        baseMaestro: true,
        asistencia: true,
        verInformeMensual: true,
        editarInformeMensual: true,

        estrategias: true,
        planRescate: true,
        coordinacion: true,
        editarMiembros: true,
        asignarMiembros: true,
        eliminarMiembros: true,
        configuracion: false,
        administracion: false,
        cerrarAnio: true
    },
    vicecoordinador: {
        baseMaestro: true,
        asistencia: true,
        verInformeMensual: true,
        editarInformeMensual: true,

        estrategias: true,
        planRescate: true,
        coordinacion: false,
        editarMiembros: true,
        asignarMiembros: true,
        eliminarMiembros: true,
        configuracion: false,
        administracion: false,
        cerrarAnio: false
    },
    secretario: {
        baseMaestro: true,
        asistencia: true,
        verInformeMensual: true,
        editarInformeMensual: true,

        estrategias: true,
        planRescate: true,
        coordinacion: false,
        editarMiembros: true,
        asignarMiembros: false,
        eliminarMiembros: false,
        configuracion: false,
        administracion: false,
        cerrarAnio: true
    },
    tesorero: {
        baseMaestro: true,
        asistencia: true,
        verInformeMensual: true,
        editarInformeMensual: false,

        estrategias: true,
        planRescate: true,
        coordinacion: false,
        editarMiembros: true,
        asignarMiembros: false,
        eliminarMiembros: false,
        configuracion: false,
        administracion: false,
        cerrarAnio: false
    },
    vocal: {
        baseMaestro: true,
        asistencia: true,
        verInformeMensual: true,
        editarInformeMensual: false,

        estrategias: true,
        planRescate: true,
        coordinacion: false,
        editarMiembros: true,
        asignarMiembros: false,
        eliminarMiembros: false,
        configuracion: false,
        administracion: false,
        cerrarAnio: false
    },
    pendiente: {
        baseMaestro: false,
        asistencia: false,
        verInformeMensual: false,
        editarInformeMensual: false,

        estrategias: false,
        planRescate: false,
        coordinacion: false,
        editarMiembros: false,
        asignarMiembros: false,
        eliminarMiembros: false,
        configuracion: false,
        administracion: false,
        cerrarAnio: false
    }
};

/**
 * hasPermission — Verifica si el rol actual tiene un permiso dado.
 * @param {string} permission - clave en PERMISSIONS
 * @param {string} [rol] - opcional, por defecto usa window.currentUserRole
 */
function hasPermission(permission, rol) {
    const r = normalizeRole(rol || window.currentUserRole || 'pendiente');
    const perms = PERMISSIONS[r] || PERMISSIONS.pendiente;
    return !!perms[permission];
}

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
        currentUserUid = user.uid;

        // Mostrar el cuerpo de la app inmediatamente (antes de cargar el rol)
        const appBody = document.getElementById('appBody');
        if (appBody) appBody.style.display = '';

        // Cargar configuración y perfil del usuario
        db.ref('configuracion/adminEmail').once('value').then(configSnap => {
            const adminEmailFromDB = configSnap.val() || '';
            isAdmin = isConfiguredAdmin(user, adminEmailFromDB);

            // Si es admin y el email en DB está desactualizado, corregirlo
            if (isAdmin && adminEmailFromDB !== ADMIN_EMAIL_FALLBACK) {
                db.ref('configuracion/adminEmail').set(ADMIN_EMAIL_FALLBACK)
                    .catch(e => console.warn('[Auth] No se pudo corregir adminEmail:', e));
            }

            return db.ref('usuarios/' + user.uid).once('value');
        }).then(snap => {
            let data = snap.val();

            if (!data) {
                // Usuario existe en Auth pero no en DB — crear perfil mínimo
                data = {
                    nombre: user.displayName || user.email,
                    email: user.email,
                    rol: isAdmin ? 'admin' : 'pendiente',
                    activo: true,
                    miembroId: null,
                    createdAt: new Date().toISOString()
                };
                db.ref('usuarios/' + user.uid).set(data)
                    .catch(e => console.error('[Auth] Error creando perfil inicial:', e));
            }

            // Bloquear usuarios inactivos (excepto admin)
            if (data.activo === false && !isAdmin) {
                alert('Tu cuenta ha sido desactivada. Contacta al administrador.');
                auth.signOut().then(() => window.location.replace('login.html'));
                return;
            }

            const nombre = data.nombre || user.email;
            const rolRaw = isAdmin ? 'admin' : (data.rol || 'pendiente');
            const rol = normalizeRole(rolRaw);

            // Guardar estado global
            window.currentUserRole = rol;
            window.currentUserUid = user.uid;
            window.currentUserMemberId = data.miembroId || null;
            window.currentUserData = data;
            window.currentUserData.rol = rol; // asegurar rol normalizado
            currentUserMemberId = data.miembroId || null;

            // Mostrar nombre en header
            const emailDisplay = document.getElementById('userEmailDisplay');
            if (emailDisplay) emailDisplay.textContent = nombre;

            // Aplicar matriz de permisos a la UI
            applyRolePermissions(rol);

            // Inicializar la aplicación
            if (typeof onAuthenticated === 'function') {
                onAuthenticated(user);
            }

        }).catch(err => {
            console.error('[Auth] Error cargando perfil:', err);
            // Fallback seguro
            const rol = isAdmin ? 'admin' : 'pendiente';
            window.currentUserRole = rol;
            window.currentUserUid = user.uid;
            window.currentUserMemberId = null;
            currentUserMemberId = null;

            const emailDisplay = document.getElementById('userEmailDisplay');
            if (emailDisplay) emailDisplay.textContent = user.email;

            applyRolePermissions(rol);

            if (typeof onAuthenticated === 'function') {
                onAuthenticated(user);
            }
        });
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
 * applyRolePermissions — Aplica visibilidad de elementos según el rol.
 * No usar sólo CSS — aplica también lógica JavaScript.
 * Roles: admin | coordinador | vicecoordinador | secretario | tesorero | vocal | pendiente
 */
function applyRolePermissions(rol) {
    const r = normalizeRole(rol || 'pendiente');

    // ── Tab Config: solo admin ──────────────────────────────────────────
    const tabConfig = document.getElementById('tab-config');
    if (tabConfig) tabConfig.style.display = (r === 'admin') ? '' : 'none';
    const bnConfig = document.getElementById('bn-config');
    if (bnConfig) bnConfig.style.display = (r === 'admin') ? '' : 'none';

    // ── Tab Informe mensual: visible para todos los roles operativos ──
    const tabReport = document.getElementById('tab-report');
    if (tabReport) {
        const verReport = hasPermission('verInformeMensual', r);
        tabReport.style.display = verReport ? '' : 'none';
    }
    const bnReport = document.getElementById('bn-report');
    if (bnReport) {
        const verReport = hasPermission('verInformeMensual', r);
        bnReport.style.display = verReport ? '' : 'none';
    }

    // ── Solo mostrar los botones flotantes si estamos en la pestaña de Estrategias ──
    const viewStrategy = document.getElementById('view-strategy');
    const isStrategyView = viewStrategy && !viewStrategy.classList.contains('hidden');

    // ── FAB Rescate: todos los roles operativos (en strategy) ──────────
    const fabRescate = document.getElementById('fab-rescate');
    if (fabRescate) {
        const verRescate = hasPermission('planRescate', r);
        fabRescate.style.display = (verRescate && isStrategyView) ? 'flex' : 'none';
    }

    // ── FAB Coordinación: solo admin y coordinador (en strategy) ───────
    const fabCoord = document.getElementById('fab-coordinacion');
    if (fabCoord) {
        const verCoord = hasPermission('coordinacion', r);
        fabCoord.style.display = (verCoord && isStrategyView) ? 'flex' : 'none';
    }

    // ── Botones de eliminar/asignar en la UI de miembros ───────────────
    // (se controla también en members.js / renderMaster)
    const deleteButtons = document.querySelectorAll('[data-action="delete"]');
    deleteButtons.forEach(btn => {
        btn.style.display = hasPermission('eliminarMiembros', r) ? '' : 'none';
    });
}
