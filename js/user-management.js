/**
 * FireGen V3.0 — js/user-management.js
 * ─────────────────────────────────────────────────────────────
 * GESTIÓN DE ACCESOS DE LÍDERES
 * Permite al admin crear/eliminar cuentas de líderes con una
 * contraseña compartida. Los nombres se guardan en Firebase
 * bajo usuarios/{uid}/nombre para mostrarse en el header.
 *
 * Dependencias: firebase-config.js, auth.js
 * ─────────────────────────────────────────────────────────────
 */

const FIREBASE_API_KEY = 'AIzaSyApvlSVSK6j3CbXJ9Z_jDv60Z6XpvfpAlY';

/* ── Lista reactiva de usuarios ── */
let usuariosData = []; // [{uid, email, nombre}]

/**
 * initUsersListener — Escucha cambios en usuarios/ de Firebase.
 * Solo se activa cuando el tab Config está visible.
 */
function initUsersListener() {
    db.ref('usuarios').on('value', snap => {
        const data = snap.val() || {};
        usuariosData = Object.entries(data).map(([uid, v]) => ({ uid, ...v }));
        renderUsersList();
    });
}

/**
 * renderUsersList — Dibuja la lista de usuarios registrados.
 */
function renderUsersList() {
    const container = document.getElementById('usersList');
    if (!container) return;

    if (!usuariosData.length) {
        container.innerHTML = `
            <div class="text-center py-8 text-slate-400 italic text-sm">
                <i class="fas fa-users text-2xl mb-2 block"></i>
                Ningún líder registrado aún
            </div>`;
        return;
    }

    container.innerHTML = usuariosData.map(u => `
        <div class="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                    ${escHtml((u.nombre || u.email || '?').charAt(0).toUpperCase())}
                </div>
                <div class="min-w-0">
                    <div class="font-bold text-slate-800 text-sm truncate">${escHtml(u.nombre || '—')}</div>
                    <div class="text-xs text-slate-400 truncate">${escHtml(u.email || '—')}</div>
                </div>
            </div>
            <button onclick="deleteLeaderAccount('${escHtml(u.uid)}', '${escHtml(u.email)}')"
                class="ml-3 flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all" title="Eliminar acceso">
                <i class="fas fa-trash text-xs"></i>
            </button>
        </div>`).join('');
}

/**
 * createLeaderAccount — Crea una cuenta de Firebase Auth para un líder
 * usando la Firebase Auth REST API (no desautentica al admin).
 */
async function createLeaderAccount(e) {
    e.preventDefault();

    const nombre = document.getElementById('newUserNombre').value.trim();
    const email  = document.getElementById('newUserEmail').value.trim();
    const clave  = document.getElementById('newUserClave').value;

    if (!nombre || !email || !clave) return;

    const btn = document.getElementById('createUserBtn');
    const errEl = document.getElementById('createUserError');
    errEl.classList.add('hidden');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Creando...';

    try {
        // 1. Crear cuenta en Firebase Auth via REST API (sin cerrar sesión del admin)
        const res = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: clave, returnSecureToken: true })
            }
        );
        const data = await res.json();

        if (data.error) {
            throw new Error(translateAuthError(data.error.message));
        }

        const uid = data.localId;

        // 2. Guardar nombre en Firebase Database
        await db.ref('usuarios/' + uid).set({ nombre, email });

        // 3. Limpiar formulario
        document.getElementById('newUserForm').reset();
        btn.innerHTML = '<i class="fas fa-check"></i> ¡Creado!';
        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-user-plus"></i> Crear Acceso';
        }, 2000);

    } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Crear Acceso';
    }
}

/**
 * deleteLeaderAccount — Elimina el registro de nombre de un líder.
 * (Solo elimina de la DB; para eliminar Firebase Auth usar Firebase Console)
 */
async function deleteLeaderAccount(uid, email) {
    if (!confirm(`¿Eliminar el acceso de "${email}"?\n\nNota: esto elimina el registro de nombre. Para bloquear completamente el acceso, también elimina al usuario en Firebase Console > Authentication.`)) return;

    try {
        await db.ref('usuarios/' + uid).remove();
    } catch (err) {
        alert('Error al eliminar: ' + err.message);
    }
}

/**
 * translateAuthError — Traduce errores de Firebase Auth al español.
 */
function translateAuthError(code) {
    const map = {
        'EMAIL_EXISTS':            'Este correo ya tiene una cuenta registrada.',
        'INVALID_EMAIL':           'El formato del correo no es válido.',
        'WEAK_PASSWORD':           'La contraseña debe tener al menos 6 caracteres.',
        'OPERATION_NOT_ALLOWED':   'El registro con email/contraseña no está habilitado en Firebase.',
        'TOO_MANY_ATTEMPTS_TRY_LATER': 'Demasiados intentos. Intenta más tarde.',
    };
    for (const key of Object.keys(map)) {
        if (code && code.includes(key)) return map[key];
    }
    return 'Error: ' + code;
}

// Inicializar cuando el admin abre la sección Config
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('newUserForm');
    if (form) form.addEventListener('submit', createLeaderAccount);

    // Escuchar cuando se cambia al tab Config para cargar datos
    window.addEventListener('configTabOpened', () => {
        if (isAdmin) initUsersListener();
    });
});
