/**
 * FireGen — js/user-management.js
 * ─────────────────────────────────────────────────────────────
 * GESTIÓN DE USUARIOS DE LA PLATAFORMA — Etapa 4 / Build B3.275
 *
 * Roles canónicos (internos, minúscula):
 *   admin | coordinador | vicecoordinador | secretario | tesorero | vocal | pendiente
 *
 * "Líder" NUNCA es un rol de plataforma.
 *
 * Vinculación: usuario ↔ miembroId (miembros con estadoEspiritual === 'Líder')
 *
 * Dependencias: firebase-config.js, auth.js
 * ─────────────────────────────────────────────────────────────
 */

const FIREBASE_API_KEY = 'AIzaSyApvlSVSK6j3CbXJ9Z_jDv60Z6XpvfpAlY';

/** Roles disponibles en la plataforma (nunca incluir 'Líder') */
const PLATFORM_ROLES = [
    { value: 'pendiente',       label: 'Pendiente' },
    { value: 'vocal',           label: 'Vocal' },
    { value: 'secretario',      label: 'Secretario' },
    { value: 'tesorero',        label: 'Tesorero' },
    { value: 'vicecoordinador', label: 'Vicecoordinador' },
    { value: 'coordinador',     label: 'Coordinador' },
    { value: 'admin',           label: 'Admin' }
];

/* ── Lista reactiva de usuarios ── */
let usuariosData = []; // [{uid, email, nombre, rol, activo, miembroId}]
let usersListenerAttached = false;

/**
 * initUsersListener — Escucha cambios en usuarios/ de Firebase.
 * Solo se activa cuando el tab Config está visible.
 */
function initUsersListener() {
    if (usersListenerAttached) return;

    db.ref('usuarios').on('value', snap => {
        const data = snap.val() || {};
        usuariosData = Object.entries(data).map(([uid, v]) => {
            // Migrar rol 'lider' o 'líder' antiguo → 'vocal'
            const rolNorm = (typeof normalizeRole === 'function')
                ? normalizeRole(v.rol || 'pendiente')
                : (v.rol || 'pendiente');
            return { uid, ...v, rol: rolNorm };
        });
        renderUsersList();
        if (typeof populateAssignmentSelects === 'function') populateAssignmentSelects();
    }, error => {
        const container = document.getElementById('usersList');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-6 text-red-500 font-bold text-sm">
                    <i class="fas fa-exclamation-triangle mr-1"></i> Error de permisos: No se pudieron cargar los usuarios.<br>
                    <span class="text-xs font-normal text-slate-500">¿Actualizaste las Reglas en Firebase Console?</span>
                </div>`;
        }
        console.error('[UserMgmt] Error cargando usuarios:', error);
    });
    usersListenerAttached = true;
}

/**
 * renderUsersList — Dibuja la lista de usuarios registrados con su miembro vinculado.
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
        const activeClass = u.activo === false ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600';
        const activeLabel = u.activo === false ? 'Inactivo' : 'Activo';
        const currentRol = u.rol || 'pendiente';

        // Miembro vinculado: buscarlo en members[] por miembroId
        let miembroLabel = '<span class="text-slate-400 italic">Sin miembro vinculado</span>';
        if (u.miembroId) {
            const mArr = (typeof members !== 'undefined') ? members : [];
            const m = mArr.find(x => x.firebaseId === u.miembroId);
            miembroLabel = m
                ? `<span class="text-green-700 font-bold">${escHtml(m.nombre)}</span> <span class="text-slate-400 text-[10px]">(${escHtml(u.miembroId)})</span>`
                : `<span class="text-orange-600 italic">ID: ${escHtml(u.miembroId)}</span>`;

            // Advertencia si estado espiritual ya no es Líder
            if (m && m.estadoEspiritual !== 'Líder') {
                miembroLabel += ` <span class="text-orange-500 text-[10px]">⚠ Estado: ${escHtml(m.estadoEspiritual)}</span>`;
            }
        }

        const roleOptions = PLATFORM_ROLES.map(rp =>
            `<option value="${rp.value}" ${currentRol === rp.value ? 'selected' : ''}>${rp.label}</option>`
        ).join('');

        return `
        <div class="flex flex-col bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 mb-2 gap-2">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                        ${escHtml((u.nombre || u.email || '?').charAt(0).toUpperCase())}
                    </div>
                    <div class="min-w-0">
                        <div class="font-bold text-slate-800 text-sm truncate">${escHtml(u.nombre || '—')}</div>
                        <div class="text-xs text-slate-400 truncate">${escHtml(u.email || '—')}</div>
                        <div class="flex items-center gap-2 mt-1 flex-wrap">
                            <select onchange="updateUserRole('${escHtml(u.uid)}', this.value)"
                                class="text-[10px] text-slate-600 font-bold uppercase bg-slate-200 border-none outline-none rounded cursor-pointer">
                                ${roleOptions}
                            </select>
                            <span class="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded ${activeClass}">${activeLabel}</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-2 ml-3 flex-shrink-0">
                    <button onclick="openEditUserModal('${escHtml(u.uid)}')"
                        class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-orange-100 hover:text-orange-600 transition-all" title="Editar usuario">
                        <i class="fas fa-pencil-alt text-xs"></i>
                    </button>
                    <button onclick="toggleUserStatus('${escHtml(u.uid)}', ${u.activo !== false})"
                        class="w-8 h-8 flex items-center justify-center rounded-lg ${u.activo !== false ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-500 hover:bg-green-100'} transition-all"
                        title="${u.activo !== false ? 'Desactivar usuario' : 'Activar usuario'}">
                        <i class="fas ${u.activo !== false ? 'fa-ban' : 'fa-check'} text-xs"></i>
                    </button>
                    <button onclick="deleteLeaderAccount('${escHtml(u.uid)}', '${escHtml(u.email)}')"
                        class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-200 text-slate-600 hover:bg-red-500 hover:text-white transition-all" title="Eliminar registro DB">
                        <i class="fas fa-trash text-xs"></i>
                    </button>
                </div>
            </div>
            <div class="text-xs text-slate-500 pl-1">
                <span class="font-bold text-slate-600">Miembro vinculado:</span> ${miembroLabel}
            </div>
        </div>`;
    }).join('');
}

/**
 * updateUserRole — Actualiza el rol de un usuario en Firebase.
 * Nunca permite establecer 'líder' como rol.
 */
window.updateUserRole = async function(uid, newRole) {
    const safeRole = (typeof normalizeRole === 'function') ? normalizeRole(newRole) : newRole;
    if (!confirm(`¿Cambiar el rol a "${safeRole}"?`)) {
        renderUsersList();
        return;
    }
    try {
        await db.ref('usuarios/' + uid + '/rol').set(safeRole);
        showUserFeedback('Rol actualizado correctamente.', 'success');
    } catch(e) {
        showUserFeedback('Error: ' + e.message, 'error');
        renderUsersList();
    }
};

window.toggleUserStatus = async function(uid, currentStatus) {
    if (!confirm(`¿Estás seguro de que deseas ${currentStatus ? 'desactivar' : 'activar'} este usuario?`)) return;
    try {
        await db.ref('usuarios/' + uid + '/activo').set(!currentStatus);
        showUserFeedback('Estado actualizado.', 'success');
    } catch(e) {
        showUserFeedback('Error: ' + e.message, 'error');
    }
};

/**
 * openEditUserModal — Abre el modal de edición completa del usuario.
 */
window.openEditUserModal = function(uid) {
    const u = usuariosData.find(x => x.uid === uid);
    if (!u) return;

    document.getElementById('editUserUid').value = uid;
    document.getElementById('editUserNombre').value = u.nombre || '';
    document.getElementById('editUserEmail').value = u.email || '';

    // Poblar select de roles (sin Líder)
    const rolSelect = document.getElementById('editUserRol');
    if (rolSelect) {
        rolSelect.innerHTML = PLATFORM_ROLES.map(rp =>
            `<option value="${rp.value}" ${u.rol === rp.value ? 'selected' : ''}>${rp.label}</option>`
        ).join('');
    }

    // Poblar select de miembro vinculado (solo Líderes espirituales)
    populateMiembroSelect('editUserMiembroId', u.miembroId);

    document.getElementById('editUserModal').classList.remove('hidden');
};

window.closeEditUserModal = function() {
    document.getElementById('editUserModal').classList.add('hidden');
};

/**
 * populateMiembroSelect — Llena un select con miembros cuyo estadoEspiritual === 'Líder'.
 * @param {string} selectId - ID del select
 * @param {string} selectedId - miembroId actualmente seleccionado
 */
function populateMiembroSelect(selectId, selectedId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;

    const mArr = (typeof members !== 'undefined') ? members : [];
    const lideres = mArr.filter(m => m.estadoEspiritual === 'Líder');
    lideres.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));

    sel.innerHTML = '<option value="">— Sin miembro vinculado —</option>' +
        lideres.map(m =>
            `<option value="${escHtml(m.firebaseId)}" ${selectedId === m.firebaseId ? 'selected' : ''}>${escHtml(m.nombre)}</option>`
        ).join('');
}

/**
 * saveEditUser — Guarda los cambios del modal de edición de usuario.
 */
window.saveEditUser = async function(e) {
    if (e) e.preventDefault();

    const uid = document.getElementById('editUserUid').value;
    if (!uid) return;

    const nombre   = document.getElementById('editUserNombre').value.trim();
    const rol      = document.getElementById('editUserRol').value;
    const miembroId = document.getElementById('editUserMiembroId').value || null;

    if (!nombre) {
        showUserFeedback('El nombre no puede estar vacío.', 'error');
        return;
    }

    // Validar que el miembro existe y tiene estadoEspiritual === 'Líder'
    if (miembroId) {
        const mArr = (typeof members !== 'undefined') ? members : [];
        const m = mArr.find(x => x.firebaseId === miembroId);
        if (!m) {
            showUserFeedback('El miembro seleccionado no existe en la Base Maestro.', 'error');
            return;
        }
        if (m.estadoEspiritual !== 'Líder') {
            const proceed = confirm(`Advertencia: el miembro "${m.nombre}" tiene estado espiritual "${m.estadoEspiritual}", no "Líder". ¿Deseas continuar?`);
            if (!proceed) return;
        }
    }

    const safeRol = (typeof normalizeRole === 'function') ? normalizeRole(rol) : rol;

    const updates = { nombre, rol: safeRol, miembroId: miembroId || null };

    const btn = document.getElementById('saveEditUserBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

    try {
        await db.ref('usuarios/' + uid).update(updates);
        showUserFeedback('Usuario actualizado correctamente.', 'success');
        window.closeEditUserModal();
    } catch(err) {
        showUserFeedback('Error al guardar: ' + err.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Guardar cambios'; }
    }
};

/**
 * createLeaderAccount — Crea una cuenta de Firebase Auth para un usuario
 * usando la Firebase Auth REST API (no desautentica al admin).
 */
async function createLeaderAccount(e) {
    e.preventDefault();

    const nombre    = document.getElementById('newUserNombre').value.trim();
    const email     = document.getElementById('newUserEmail').value.trim();
    const clave     = document.getElementById('newUserClave').value;
    const rolRaw    = document.getElementById('newUserRol')?.value || 'vocal';
    const miembroId = document.getElementById('newUserMiembroId')?.value || null;

    if (!nombre || !email || !clave) return;

    // Normalizar rol: nunca 'líder'
    const rol = (typeof normalizeRole === 'function') ? normalizeRole(rolRaw) : rolRaw;

    // Validar vinculación si se seleccionó miembro
    if (miembroId) {
        const mArr = (typeof members !== 'undefined') ? members : [];
        const m = mArr.find(x => x.firebaseId === miembroId);
        if (!m) {
            alert('El miembro seleccionado no existe en la Base Maestro.');
            return;
        }
        if (m.estadoEspiritual !== 'Líder') {
            const ok = confirm(`Advertencia: el miembro "${m.nombre}" tiene estado espiritual "${m.estadoEspiritual}", no "Líder". ¿Deseas continuar?`);
            if (!ok) return;
        }
    }

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

        // 2. Guardar perfil en Firebase Database
        const perfil = {
            nombre,
            email,
            rol,
            activo: true,
            miembroId: miembroId || null,
            createdAt: new Date().toISOString()
        };

        await db.ref('usuarios/' + uid).set(perfil);

        // 3. Limpiar formulario
        document.getElementById('newUserForm').reset();
        btn.innerHTML = '<i class="fas fa-check"></i> ¡Creado!';
        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-user-plus"></i> Crear Acceso';
        }, 2000);

    } catch (err) {
        // Si Auth fue creado pero DB falló, informar claramente
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Crear Acceso';
        console.error('[UserMgmt] Error creando usuario:', err);
    }
}

/**
 * deleteLeaderAccount — Elimina el registro de usuario en DB.
 * NOTA: NO elimina la cuenta en Firebase Authentication.
 * Para eso es necesario usar Firebase Console o un Cloud Function.
 */
async function deleteLeaderAccount(uid, email) {
    if (!confirm(`¿Eliminar el registro de "${email}" de la base de datos?\n\nNota: Esto elimina el perfil de la DB, pero la cuenta de Firebase Authentication continúa existiendo. Para eliminarla completamente, ve a Firebase Console > Authentication.`)) return;

    try {
        await db.ref('usuarios/' + uid).remove();
        showUserFeedback('Registro eliminado de la base de datos. La cuenta de autenticación permanece activa.', 'info');
    } catch (err) {
        showUserFeedback('Error al eliminar: ' + err.message, 'error');
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
 * populateAssignmentSelects — Llena los selectores de responsables y miembros para las Asignaciones Rápidas.
 * Responsables: usuarios activos vinculados a un miembro (con miembroId) y no pendientes.
 * Miembros asignables: todos menos los que tienen estadoEspiritual === 'Líder'.
 */
window.populateAssignmentSelects = function() {
    const leaderSelect = document.getElementById('assignLeaderSelect');
    const memberSelect = document.getElementById('assignMemberSelect');
    if (!leaderSelect || !memberSelect) return;

    // Solo usuarios activos con rol operativo y miembroId vinculado
    const responsables = usuariosData.filter(u =>
        u.activo !== false &&
        u.rol !== 'pendiente' &&
        u.miembroId
    );

    leaderSelect.innerHTML = '<option value="">-- Seleccionar Responsable --</option>' +
        responsables.map(l => {
            const mArr = (typeof members !== 'undefined') ? members : [];
            const m = mArr.find(x => x.firebaseId === l.miembroId);
            const labelNombre = m ? escHtml(m.nombre) : escHtml(l.nombre || l.email);
            return `<option value="${escHtml(l.miembroId)}">${labelNombre} (${escHtml(l.rol)})</option>`;
        }).join('');

    // Miembros que NO son líderes espirituales (pueden ser asignados)
    const mArr = (typeof members !== 'undefined') ? members : [];
    const miembrosElegibles = mArr.filter(m => m.estadoEspiritual !== 'Líder');
    miembrosElegibles.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    memberSelect.innerHTML = '<option value="">-- Seleccionar Miembro --</option>' +
        miembrosElegibles.map(m => {
            const hasResponsable = m.liderMiembroId || m.lider;
            const responsableLabel = hasResponsable ? ` (Asignado)` : ' (Sin responsable)';
            return `<option value="${escHtml(m.firebaseId)}">${escHtml(m.nombre)}${responsableLabel}</option>`;
        }).join('');
};

/**
 * assignLeaderToMember — Guarda la asignación leyendo los selects del panel Admin.
 */
window.assignLeaderToMember = async function() {
    const leaderSelect = document.getElementById('assignLeaderSelect');
    const memberSelect = document.getElementById('assignMemberSelect');

    const liderMiembroId = leaderSelect?.value;
    const memberId = memberSelect?.value;

    if (!liderMiembroId || !memberId) {
        alert('Por favor, selecciona un Responsable y un Miembro.');
        return;
    }

    try {
        await executeMemberAssignment(liderMiembroId, memberId);
        alert('Asignación guardada correctamente.');
        if (leaderSelect) leaderSelect.value = '';
        if (memberSelect) memberSelect.value = '';
        populateAssignmentSelects();
        if (typeof renderMaster === 'function') renderMaster();
    } catch (e) {
        showUserFeedback('Error al asignar: ' + e.message, 'error');
    }
};

/**
 * executeMemberAssignment — Función común para asignar miembro a responsable en Firebase.
 */
window.executeMemberAssignment = async function(liderMiembroId, memberId) {
    // FASE3-S5.2: Verificar permiso antes de asignar
    if (typeof hasPermission === 'function' && !hasPermission('asignarMiembros', window.currentUserRole)) {
        throw new Error('No tienes permiso para asignar responsables.');
    }

    const mArr = (typeof members !== 'undefined') ? members : [];
    const liderMember = mArr.find(x => x.firebaseId === liderMiembroId);
    let liderName = '';
    
    if (liderMember && liderMember.nombre) {
        liderName = liderMember.nombre;
    } else {
        const u = usuariosData.find(x => x.miembroId === liderMiembroId);
        if (u) liderName = u.nombre || u.email;
    }

    const updates = {};
    updates[`miembros/${memberId}/liderMiembroId`] = liderMiembroId;
    updates[`miembros/${memberId}/lider`] = liderName; // Compatibilidad visual

    return db.ref().update(updates);
};

/**
 * showUserFeedback — Muestra un mensaje de estado al usuario.
 */
function showUserFeedback(msg, type = 'info') {
    // Intentar usar el área de feedback del panel de config
    const feedbackEl = document.getElementById('userMgmtFeedback');
    if (feedbackEl) {
        const colors = { success: 'bg-green-100 text-green-700 border-green-200', error: 'bg-red-100 text-red-700 border-red-200', info: 'bg-blue-100 text-blue-700 border-blue-200' };
        feedbackEl.className = `text-xs font-bold p-3 rounded-lg border mb-3 ${colors[type] || colors.info}`;
        feedbackEl.textContent = msg;
        feedbackEl.classList.remove('hidden');
        setTimeout(() => feedbackEl.classList.add('hidden'), 4000);
        return;
    }
    // Fallback: toast
    if (typeof showToast === 'function') {
        showToast(msg, type);
    } else {
        alert(msg);
    }
}

// ── Inicialización ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('newUserForm');
    if (form) form.addEventListener('submit', createLeaderAccount);

    const editForm = document.getElementById('editUserForm');
    if (editForm) editForm.addEventListener('submit', saveEditUser);

    // Poblar select de miembro en el formulario de creación cuando cambia
    const newUserMiembroSel = document.getElementById('newUserMiembroId');
    if (newUserMiembroSel) {
        // Se puebla cuando se abren los usuarios (datos ya disponibles)
    }

    // Escuchar cuando se cambia al tab Config para cargar datos
    window.addEventListener('configTabOpened', () => {
        const r = normalizeRole(window.currentUserRole || 'pendiente');
        if (r === 'admin') {
            initUsersListener();
            // Poblar selects del formulario de nuevo usuario
            setTimeout(() => {
                populateMiembroSelect('newUserMiembroId', null);
            }, 500);
        }
    });
});
