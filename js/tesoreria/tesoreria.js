/**
 * FireGen — js/tesoreria.js
 * ─────────────────────────────────────────────────────────────
 * ORQUESTADOR PRINCIPAL DEL MÓDULO DE TESORERÍA
 * Gestiona la autenticación secundaria y la navegación interna.
 * ─────────────────────────────────────────────────────────────
 */

let treasuryUser = null;
let treasuryCurrentPeriod = null; // Formato "YYYY-MM"

// Fallback helpers para Tesorería
window.escHtml = window.escHtml || function(text) {
    if (!text) return '';
    return text.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

window.formatDateShort = window.formatDateShort || function(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch(e) { return dateStr; }
};

function canEditTreasury() {
    const role = window.currentUserRole || 'pendiente';
    return role === 'admin' || role === 'tesorero' || role === 'coordinador' || role === 'vicecoordinador';
}

function initTreasury() {
    if (!hasPermission('tesoreria')) return;
    
    // Escuchar el estado de autenticación secundario
    treasuryAuth.onAuthStateChanged(user => {
        treasuryUser = user;
        renderTreasuryState();
    });
    
    // Si ya hay usuario renderizamos inmediatamente
    if (treasuryAuth.currentUser) {
        treasuryUser = treasuryAuth.currentUser;
        renderTreasuryState();
    } else {
        renderTreasuryLogin();
    }
}

function renderTreasuryState() {
    const status = document.getElementById('treasuryAuthStatus');
    const container = document.getElementById('treasuryContentContainer');
    if (!status || !container) return;

    if (treasuryUser) {
        status.innerHTML = `<i class="fas fa-lock text-green-500"></i> Seguro: ${escHtml(treasuryUser.email)} <button onclick="logoutTreasury()" class="ml-2 hover:text-slate-600"><i class="fas fa-sign-out-alt"></i></button>`;
        renderTreasuryDashboard();
    } else {
        status.innerHTML = `<i class="fas fa-shield-alt text-yellow-500"></i> Requiere Acceso`;
        renderTreasuryLogin();
    }
}

function renderTreasuryLogin() {
    const container = document.getElementById('treasuryContentContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div class="max-w-sm mx-auto mt-10">
            <div class="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center">
                <div class="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                    <i class="fas fa-fingerprint"></i>
                </div>
                <h3 class="font-black text-slate-800 text-lg">Acceso Financiero</h3>
                <p class="text-xs text-slate-500 mb-6">Ingresa tus credenciales exclusivas de Tesorería.</p>
                
                <form id="treasuryLoginForm" class="space-y-4" onsubmit="handleTreasuryLogin(event)">
                    <div>
                        <input type="email" id="tLoginEmail" autocomplete="username" required placeholder="Correo de Tesorería" class="w-full bg-white border border-yellow-200 text-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500">
                    </div>
                    <div>
                        <input type="password" id="tLoginClave" autocomplete="current-password" required placeholder="Contraseña" class="w-full bg-white border border-yellow-200 text-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500">
                    </div>
                    <div id="tLoginError" class="hidden text-xs font-bold text-red-500 bg-red-50 p-2 rounded-lg"></div>
                    <button type="submit" id="tLoginBtn" class="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 rounded-xl transition-colors shadow">
                        Ingresar a Tesorería
                    </button>
                </form>
            </div>
        </div>
    `;
}

async function handleTreasuryLogin(e) {
    e.preventDefault();
    const email = document.getElementById('tLoginEmail').value.trim();
    const clave = document.getElementById('tLoginClave').value;
    const btn = document.getElementById('tLoginBtn');
    const errEl = document.getElementById('tLoginError');
    
    errEl.classList.add('hidden');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Verificando...';
    
    try {
        await treasuryAuth.signInWithEmailAndPassword(email, clave);
        // El onAuthStateChanged se encargará de renderizar
    } catch(err) {
        errEl.textContent = translateAuthError(err.message);
        errEl.classList.remove('hidden');
        btn.disabled = false;
        btn.innerHTML = 'Ingresar a Tesorería';
    }
}

async function logoutTreasury() {
    try {
        await treasuryAuth.signOut();
    } catch(e) {
        console.error('Error cerrando sesión de tesorería:', e);
    }
}

function renderTreasuryDashboard() {
    const container = document.getElementById('treasuryContentContainer');
    if (!container) return;
    
    if (!treasuryCurrentPeriod) {
        const fecha = new Date();
        const m = String(fecha.getMonth() + 1).padStart(2, '0');
        treasuryCurrentPeriod = `${fecha.getFullYear()}-${m}`;
    }
    
    const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const currentYear = parseInt(treasuryCurrentPeriod.split('-')[0]);
    const currentMonthNum = parseInt(treasuryCurrentPeriod.split('-')[1]) - 1;
    const mesActualStr = `${mesesNombres[currentMonthNum]} ${currentYear}`;
    const emailUsuario = treasuryUser ? treasuryUser.email : 'Tesorero';
    
    // Generar opciones de meses dinámicamente para el año actual
    let periodOptions = '';
    for (let i = 0; i < 12; i++) {
        const val = `${currentYear}-${String(i+1).padStart(2, '0')}`;
        const label = `${mesesNombres[i]} ${currentYear}`;
        const selected = val === treasuryCurrentPeriod ? 'selected' : '';
        periodOptions += `<option value="${val}" ${selected}>${label}</option>`;
    }
    
    container.innerHTML = `
        <div class="max-w-4xl mx-auto bg-white shadow-md border border-slate-200 p-6 sm:p-12 rounded-sm print:shadow-none print:border-none print:p-0">
            <!-- ENCABEZADO TIPO INFORME -->
            <div class="flex justify-between items-start border-b-[3px] border-blue-900 pb-6 mb-8">
                <div class="flex gap-4 sm:gap-6 items-stretch">
                    <div class="w-3 bg-blue-900 hidden sm:block"></div>
                    <div>
                        <p class="text-sm tracking-widest text-slate-500 mb-1 uppercase font-semibold">Departamento de Jóvenes</p>
                        <h1 class="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight uppercase">Informe Financiero</h1>
                        <div class="mt-4 text-slate-800 text-sm sm:text-base space-y-2">
                            <div class="flex items-center gap-2">
                                <span class="font-bold">Mes/Período:</span> 
                                <select id="treasuryPeriodSelect" onchange="changeTreasuryPeriod(this.value)" class="bg-slate-50 border border-slate-300 p-1 text-sm font-bold text-slate-900 focus:outline-none print:hidden">
                                    ${periodOptions}
                                </select>
                                <span class="hidden print:inline font-bold">${mesActualStr}</span>
                            </div>
                            <p><span class="font-bold">Responsable:</span> ${emailUsuario}</p>
                            <p><span class="font-bold">Estado del período:</span> <span id="treasuryPeriodStatus" class="font-bold text-blue-900 uppercase">ABIERTO</span></p>
                        </div>
                    </div>
                </div>
                <div class="hidden sm:block">
                    <!-- Logo institucional real -->
                    <img src="assets/logo/logo-institucional.png" alt="Logo" class="w-24 h-24 object-contain">
                </div>
            </div>

            <!-- NAVEGACIÓN DOCUMENTAL -->
            <div class="flex flex-wrap gap-6 mb-8 print:hidden border-b border-slate-300 pb-3 text-sm">
                <button onclick="switchTreasurySubTab('caja')" id="tsub-caja" class="tsub-btn font-bold text-slate-500 hover:text-blue-900 uppercase tracking-wider transition-colors pb-1"><i class="fas fa-file-invoice-dollar mr-1"></i> Resumen & Caja</button>
                <button onclick="switchTreasurySubTab('actividades')" id="tsub-actividades" class="tsub-btn font-bold text-slate-500 hover:text-blue-900 uppercase tracking-wider transition-colors pb-1"><i class="fas fa-store mr-1"></i> Control Gastos</button>
                <button onclick="switchTreasurySubTab('inventario')" id="tsub-inventario" class="tsub-btn font-bold text-slate-500 hover:text-blue-900 uppercase tracking-wider transition-colors pb-1"><i class="fas fa-boxes mr-1"></i> Inventario</button>
                <button onclick="switchTreasurySubTab('informes')" id="tsub-informes" class="tsub-btn font-bold text-slate-500 hover:text-blue-900 uppercase tracking-wider transition-colors pb-1"><i class="fas fa-print mr-1"></i> Cierre/Histórico</button>
            </div>
            
            <div id="treasurySubContent" class="space-y-10 text-slate-800">
                <!-- Contenido -->
            </div>
        </div>
    `;
    
    // Check si el periodo está cerrado (simulado por ahora, luego lo leeremos de DB)
    verificarEstadoPeriodo();
    
    switchTreasurySubTab('caja');
}

function changeTreasuryPeriod(newPeriod) {
    treasuryCurrentPeriod = newPeriod;
    // Volver a renderizar dashboard entero o solo los listeners
    // Como queremos que todo reaccione, recargamos el dashboard entero
    renderTreasuryDashboard();
}

async function verificarEstadoPeriodo() {
    if (!treasuryDb || !treasuryCurrentPeriod) return;
    try {
        const snap = await treasuryDb.ref('periodos/' + treasuryCurrentPeriod + '/estado').once('value');
        const estado = snap.val() || 'ABIERTO';
        const stEl = document.getElementById('treasuryPeriodStatus');
        if (stEl) {
            stEl.textContent = estado;
            if (estado === 'CERRADO') stEl.className = 'font-bold text-slate-900 uppercase';
            else if (estado === 'EN REVISIÓN') stEl.className = 'font-bold text-orange-600 uppercase';
            else stEl.className = 'font-bold text-blue-900 uppercase';
        }
    } catch(e) {
        console.error('Error verificando periodo:', e);
    }
}

function switchTreasurySubTab(tab) {
    document.querySelectorAll('.tsub-btn').forEach(b => {
        b.classList.remove('text-blue-900', 'border-b-2', 'border-blue-900');
        b.classList.add('text-slate-500');
    });
    
    const btn = document.getElementById('tsub-' + tab);
    if (btn) {
        btn.classList.remove('text-slate-500');
        btn.classList.add('text-blue-900', 'border-b-2', 'border-blue-900');
    }
    
    // Cargar contenido según tab
    if (tab === 'caja' && typeof renderTesoreriaCaja === 'function') renderTesoreriaCaja();
    else if (tab === 'actividades' && typeof renderTesoreriaActividades === 'function') renderTesoreriaActividades();
    else if (tab === 'inventario' && typeof renderTesoreriaInventario === 'function') renderTesoreriaInventario();
    else if (tab === 'informes' && typeof renderTesoreriaInformes === 'function') renderTesoreriaInformes();
    else {
        document.getElementById('treasurySubContent').innerHTML = `<div class="p-8 text-center text-slate-400 italic">Módulo ${tab} en construcción.</div>`;
    }
}

/**
 * Función centralizada de Auditoría para el Módulo de Tesorería
 */
async function registrarAuditoriaTesoreria(accion, modulo, descripcion, registroId = '') {
    if (!treasuryUser) return;
    try {
        await treasuryDb.ref('auditoria').push({
            usuarioUid: treasuryUser.uid,
            usuarioEmail: treasuryUser.email,
            fecha: new Date().toISOString(),
            accion: accion,
            modulo: modulo,
            descripcion: descripcion,
            registroId: registroId
        });
    } catch(e) {
        console.error('[Auditoría] No se pudo registrar evento:', e);
    }
}
