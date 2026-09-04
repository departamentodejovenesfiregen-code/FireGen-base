/**
 * FireGen — js/tesoreria-accesos.js
 * ─────────────────────────────────────────────────────────────
 * MÓDULO DE GESTIÓN DE ACCESOS DE TESORERÍA (Admin)
 * Permite al administrador crear cuentas en el Firebase secundario
 * de Tesorería usando REST API para no cerrar su sesión actual.
 * Guarda la relación administrativa en la base de datos principal.
 * ─────────────────────────────────────────────────────────────
 */

const TREASURY_API_KEY = treasuryFirebaseConfig.apiKey;

let accesosTesoreria = [];
let accesosListenerAttached = false;

function initAccesosTesoreriaListener() {
    if (accesosListenerAttached || !hasPermission('administracion')) return;
    
    db.ref('tesoreria_accesos').on('value', snap => {
        const data = snap.val() || {};
        accesosTesoreria = Object.entries(data).map(([id, v]) => ({ id, ...v }));
        renderAccesosTesoreria();
    }, err => {
        console.error('[TesoreriaAccesos] Error cargando accesos:', err);
    });
    
    accesosListenerAttached = true;
    populateMiembroTesoreriaSelect();
}

function populateMiembroTesoreriaSelect() {
    const sel = document.getElementById('newTesoreriaMiembroId');
    if (!sel) return;

    const mArr = (typeof members !== 'undefined') ? members : [];
    // En Tesorería pueden tener acceso aquellos con roles operativos (no solo Líderes)
    // Se recomienda cualquier miembro registrado
    const registrados = mArr.filter(m => m.estadoEspiritual && m.estadoEspiritual !== '');
    registrados.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));

    sel.innerHTML = '<option value="">— Seleccionar Miembro —</option>' +
        registrados.map(m =>
            `<option value="${escHtml(m.firebaseId)}">${escHtml(m.nombre)}</option>`
        ).join('');
}

function onTesoreriaMiembroSelectChange() {
    const sel = document.getElementById('newTesoreriaMiembroId');
    const emailInput = document.getElementById('newTesoreriaEmail');
    const memberId = sel.value;
    
    if (memberId) {
        // Autocompletar el correo si el miembro ya tiene usuario en la plataforma
        if (typeof usuariosData !== 'undefined') {
            const userAsoc = usuariosData.find(u => u.miembroId === memberId);
            if (userAsoc && userAsoc.email) {
                emailInput.value = userAsoc.email;
            }
        }
    }
}

async function createTreasuryAccess(e) {
    e.preventDefault();

    if (!hasPermission('administracion')) {
        alert("No tienes permisos para crear accesos a Tesorería.");
        return;
    }

    const miembroId = document.getElementById('newTesoreriaMiembroId').value;
    const email     = document.getElementById('newTesoreriaEmail').value.trim();
    const clave     = document.getElementById('newTesoreriaClave').value;

    if (!miembroId || !email || !clave) return;

    const btn = document.getElementById('createTesoreriaBtn');
    const errEl = document.getElementById('createTesoreriaError');
    errEl.classList.add('hidden');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Creando...';

    try {
        // 1. Crear cuenta en Firebase Auth Secundario via REST API
        if (TREASURY_API_KEY === "AIzaSy_TREASURY_API_KEY_PLACEHOLDER") {
            throw new Error("La API Key del Firebase de Tesorería no está configurada.");
        }

        const res = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${TREASURY_API_KEY}`,
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

        const treasuryAuthUid = data.localId;

        // 2. Guardar relación administrativa en la BD Principal (no en la de Tesorería)
        const accesoData = {
            miembroId: miembroId,
            email: email,
            treasuryAuthUid: treasuryAuthUid,
            estado: 'activo',
            creadoPor: currentUserUid,
            creadoEn: new Date().toISOString(),
            modificadoEn: new Date().toISOString()
        };

        await db.ref('tesoreria_accesos').push(accesoData);

        // 3. Limpiar
        document.getElementById('newTesoreriaForm').reset();
        btn.innerHTML = '<i class="fas fa-check"></i> ¡Creado!';
        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-key"></i> Otorgar Acceso';
        }, 2000);

    } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-key"></i> Otorgar Acceso';
        console.error('[TesoreriaAccesos] Error creando acceso:', err);
    }
}

function renderAccesosTesoreria() {
    const container = document.getElementById('tesoreriaAccesosList');
    if (!container) return;

    if (!accesosTesoreria.length) {
        container.innerHTML = `
            <div class="text-center py-6 text-slate-400 italic text-sm">
                <i class="fas fa-shield-alt text-2xl mb-2 block"></i>
                Ningún acceso a tesorería configurado
            </div>`;
        return;
    }

    container.innerHTML = accesosTesoreria.map(u => {
        const isActive = u.estado === 'activo';
        const activeClass = !isActive ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600';
        const activeLabel = !isActive ? 'Inactivo' : 'Activo';

        // Buscar miembro
        const mArr = (typeof members !== 'undefined') ? members : [];
        const m = mArr.find(x => x.firebaseId === u.miembroId);
        const nombreMiembro = m ? m.nombre : 'ID: ' + u.miembroId;

        return `
        <div class="flex flex-col bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 mb-2 gap-2">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                        <i class="fas fa-coins"></i>
                    </div>
                    <div class="min-w-0">
                        <div class="font-bold text-slate-800 text-sm truncate">${escHtml(nombreMiembro)}</div>
                        <div class="text-xs text-slate-400 truncate">${escHtml(u.email)}</div>
                        <div class="flex items-center gap-2 mt-1 flex-wrap">
                            <span class="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded ${activeClass}">${activeLabel}</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-2 ml-3 flex-shrink-0">
                    <button onclick="toggleTesoreriaAccess('${escHtml(u.id)}', ${isActive})"
                        class="w-8 h-8 flex items-center justify-center rounded-lg ${isActive ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-500 hover:bg-green-100'} transition-all"
                        title="${isActive ? 'Revocar acceso' : 'Reactivar acceso'}">
                        <i class="fas ${isActive ? 'fa-ban' : 'fa-check'} text-xs"></i>
                    </button>
                    <button onclick="deleteTesoreriaAccess('${escHtml(u.id)}', '${escHtml(u.email)}')"
                        class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-200 text-slate-600 hover:bg-red-500 hover:text-white transition-all" title="Eliminar registro">
                        <i class="fas fa-trash text-xs"></i>
                    </button>
                </div>
            </div>
            <div class="text-[10px] text-slate-400 pl-1 mt-1">
                Auth UID (Tesorería): ${escHtml(u.treasuryAuthUid)}
            </div>
        </div>`;
    }).join('');
}

async function toggleTesoreriaAccess(id, isActive) {
    if (!confirm(`¿Deseas ${isActive ? 'revocar' : 'reactivar'} el acceso a Tesorería?`)) return;
    try {
        await db.ref('tesoreria_accesos/' + id).update({
            estado: isActive ? 'inactivo' : 'activo',
            modificadoEn: new Date().toISOString()
        });
        showUserFeedback('Estado de acceso actualizado.', 'success');
    } catch(e) {
        showUserFeedback('Error: ' + e.message, 'error');
    }
}

async function deleteTesoreriaAccess(id, email) {
    if (!confirm(`¿Eliminar el registro de acceso de "${email}"?\n\nNota: Esto elimina la vinculación, pero la cuenta de autenticación en Tesorería continuará existiendo en el Firebase secundario.`)) return;
    try {
        await db.ref('tesoreria_accesos/' + id).remove();
        showUserFeedback('Acceso eliminado.', 'info');
    } catch (err) {
        showUserFeedback('Error al eliminar: ' + err.message, 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('newTesoreriaForm');
    if (form) form.addEventListener('submit', createTreasuryAccess);

    const select = document.getElementById('newTesoreriaMiembroId');
    if (select) select.addEventListener('change', onTesoreriaMiembroSelectChange);
    
    // Inicializar listener cuando se abra la tab config (se enganchará en app.js o auth.js)
    window.addEventListener('configTabOpened', () => {
        const r = normalizeRole(window.currentUserRole || 'pendiente');
        if (r === 'admin') {
            initAccesosTesoreriaListener();
        }
    });
});
