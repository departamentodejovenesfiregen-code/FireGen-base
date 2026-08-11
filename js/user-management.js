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

let usersListenerAttached = false;

/**
 * initUsersListener — Escucha cambios en usuarios/ de Firebase.
 * Solo se activa cuando el tab Config está visible.
 */
function initUsersListener() {
    if (usersListenerAttached) return;
    
    db.ref('usuarios').on('value', snap => {
        const data = snap.val() || {};
        usuariosData = Object.entries(data).map(([uid, v]) => ({ uid, ...v }));
        renderUsersList();
        if (typeof populateAssignmentSelects === 'function') populateAssignmentSelects();
    }, error => {
        const container = document.getElementById('usersList');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-6 text-red-500 font-bold text-sm">
                    <i class="fas fa-exclamation-triangle mr-1"></i> Error de permisos: No se pudieron cargar los líderes.<br>
                    <span class="text-xs font-normal text-slate-500">¿Actualizaste las Reglas en Firebase Console?</span>
                </div>`;
        }
        console.error("Error cargando usuarios:", error);
    });
    usersListenerAttached = true;
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
                Ningún usuario registrado aún
            </div>`;
        return;
    }

    container.innerHTML = usuariosData.map(u => {
        const rolLabel = u.rol ? u.rol.charAt(0).toUpperCase() + u.rol.slice(1) : 'Líder';
        const activeClass = u.activo === false ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600';
        const activeLabel = u.activo === false ? 'Inactivo' : 'Activo';
        
        return `
        <div class="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 mb-2">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                    ${escHtml((u.nombre || u.email || '?').charAt(0).toUpperCase())}
                </div>
                <div class="min-w-0">
                    <div class="font-bold text-slate-800 text-sm truncate">${escHtml(u.nombre || '—')}</div>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="text-[10px] text-slate-500 font-medium uppercase bg-slate-200 px-1.5 py-0.5 rounded">${escHtml(rolLabel)}</span>
                        <span class="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded ${activeClass}">${activeLabel}</span>
                        <span class="text-xs text-slate-400 truncate">${escHtml(u.email || '—')}</span>
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-2 ml-3 flex-shrink-0">
                <button onclick="editLeaderName('${escHtml(u.uid)}', '${escHtml(u.nombre || '')}')"
                    class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-orange-100 hover:text-orange-600 transition-all" title="Editar nombre">
                    <i class="fas fa-pencil-alt text-xs"></i>
                </button>
                <button onclick="toggleUserStatus('${escHtml(u.uid)}', ${u.activo !== false})"
                    class="w-8 h-8 flex items-center justify-center rounded-lg ${u.activo !== false ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-500 hover:bg-green-100'} transition-all" title="${u.activo !== false ? 'Desactivar usuario' : 'Activar usuario'}">
                    <i class="fas ${u.activo !== false ? 'fa-ban' : 'fa-check'} text-xs"></i>
                </button>
                <button onclick="deleteLeaderAccount('${escHtml(u.uid)}', '${escHtml(u.email)}')"
                    class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-200 text-slate-600 hover:bg-red-500 hover:text-white transition-all" title="Eliminar registro">
                    <i class="fas fa-trash text-xs"></i>
                </button>
            </div>
        </div>`;
    }).join('');
}

window.toggleUserStatus = async function(uid, currentStatus) {
    if (!confirm(`¿Estás seguro de que deseas ${currentStatus ? 'desactivar' : 'activar'} este usuario?`)) return;
    try {
        await db.ref('usuarios/' + uid + '/activo').set(!currentStatus);
    } catch(e) {
        alert('Error: ' + e.message);
    }
};

/**
 * editLeaderName — Permite editar el nombre de un líder en la base de datos.
 */
async function editLeaderName(uid, currentName) {
    const newName = prompt('Editar nombre del líder:', currentName);
    if (newName === null || newName.trim() === currentName) return;

    if (!newName.trim()) {
        alert('El nombre no puede estar vacío.');
        return;
    }

    try {
        await db.ref('usuarios/' + uid + '/nombre').set(newName.trim());
    } catch (err) {
        alert('Error al actualizar el nombre: ' + err.message);
    }
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
    const rol    = document.getElementById('newUserRol') ? document.getElementById('newUserRol').value : 'lider';

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

        // 2. Guardar nombre y rol en Firebase Database
        await db.ref('usuarios/' + uid).set({ 
            nombre, 
            email,
            rol: rol,
            activo: true,
            createdAt: new Date().toISOString()
        });

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
    return map[code] || code;
}

/**
 * populateAssignmentSelects — Llena los selectores de líderes y miembros para las Asignaciones Rápidas.
 */
window.populateAssignmentSelects = function() {
    const leaderSelect = document.getElementById('assignLeaderSelect');
    const memberSelect = document.getElementById('assignMemberSelect');
    if (!leaderSelect || !memberSelect) return;

    // Solo líderes activos o con rol de líder/coordinador
    const lideres = usuariosData.filter(u => u.activo !== false);

    leaderSelect.innerHTML = '<option value="">-- Seleccionar Líder --</option>' + 
        lideres.map(l => `<option value="${escHtml(l.nombre)}">${escHtml(l.nombre)}</option>`).join('');

    // Miembros que no son líderes
    const miembrosElegibles = (typeof members !== 'undefined' ? members : []).filter(m => m.estadoEspiritual !== 'Líder' && m.estadoEspiritual !== 'Lider');
    
    // Sort alphabetically
    miembrosElegibles.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    memberSelect.innerHTML = '<option value="">-- Seleccionar Miembro --</option>' + 
        miembrosElegibles.map(m => {
            const hasLeader = m.lider && m.lider !== 'No aplica' && m.lider.trim() !== '';
            const leaderText = hasLeader ? ` (Actual: ${m.lider})` : ' (Sin líder)';
            return `<option value="${escHtml(m.firebaseId)}">${escHtml(m.nombre)}${leaderText}</option>`;
        }).join('');
};

/**
 * assignLeaderToMember — Guarda la asignación en la base de datos
 */
window.assignLeaderToMember = async function() {
    const leaderSelect = document.getElementById('assignLeaderSelect');
    const memberSelect = document.getElementById('assignMemberSelect');
    
    const leaderName = leaderSelect.value;
    const memberId = memberSelect.value;
    
    if (!leaderName || !memberId) {
        alert('Por favor, selecciona un Líder y un Miembro.');
        return;
    }

    try {
        await db.ref(`miembros/${memberId}/lider`).set(leaderName);
        alert('Asignación guardada correctamente.');
        populateAssignmentSelects(); // Refrescar la lista
        if (typeof renderMaster === 'function') renderMaster(); // Refrescar la tabla si es necesario
    } catch (e) {
        alert('Error al asignar: ' + e.message);
    }
};

// Inicializar cuando el admin abre la sección Config
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('newUserForm');
    if (form) form.addEventListener('submit', createLeaderAccount);

    // Escuchar cuando se cambia al tab Config para cargar datos
    window.addEventListener('configTabOpened', () => {
        if (isAdmin) initUsersListener();
    });
});
