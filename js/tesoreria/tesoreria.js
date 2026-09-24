/**
 * FireGen — js/tesoreria.js
 * ORQUESTADOR PRINCIPAL DEL MÓDULO DE TESORERÍA
 */

let treasuryUser = null;
let treasuryCurrentPeriod = null;
let treasuryAuthListenerAttached = false;
let treasuryRenderId = 0;

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
        const d = new Date(dateStr + 'T12:00:00');
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch(e) { return dateStr; }
};

// REGLA 1: Solo admin y tesorero pueden editar tesorería
function canEditTreasury() {
    const role = window.currentUserRole || 'pendiente';
    return role === 'admin' || role === 'tesorero';
}

window.getActiveTreasuryContainer = function() {
    const opView = document.getElementById('view-operaciones');
    if (opView && !opView.classList.contains('hidden')) {
        return document.getElementById('operacionesSubContent');
    }
    return document.getElementById('treasurySubContent');
};

function initTreasury() {
    if (!hasPermission('tesoreria')) return;
    
    if (!treasuryAuthListenerAttached) {
        treasuryAuth.onAuthStateChanged(user => {
            treasuryUser = user;
            renderTreasuryState();
        });
        treasuryAuthListenerAttached = true;
    }
    
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

// Variable global del modal para no pisar el dashboard
let modalSelectedPeriod = null;

async function renderTreasuryDashboard() {
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
    
    // Injectar el contenedor del modal si no existe
    if (!document.getElementById('tSeleccionarMesModal')) {
        const modalHtml = `
        <div id="tSeleccionarMesModal" class="fixed inset-0 bg-black/60 z-[100] hidden items-center justify-center p-4">
            <div class="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
                <div class="bg-blue-900 text-white p-4 flex justify-between items-center">
                    <h3 class="font-black text-lg flex items-center gap-2"><i class="fas fa-calendar-alt"></i> SELECCIONAR MES</h3>
                    <button onclick="cerrarModalSeleccionarMes()" class="text-white hover:text-red-200 transition-colors">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                <div id="tSeleccionarMesModalContent" class="p-6">
                    <div class="text-center text-slate-500 py-8">Cargando...</div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
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
                                <span class="font-bold print:inline mr-2 text-lg text-blue-900">${mesActualStr}</span>
                                <button id="btnSeleccionarMes" onclick="abrirModalSeleccionarMes()" class="bg-blue-100 hover:bg-blue-200 text-blue-900 text-xs font-bold py-1 px-3 rounded shadow transition-colors print:hidden">
                                    <i class="fas fa-calendar mr-1"></i> SELECCIONAR MES
                                </button>
                            </div>
                            <p><span class="font-bold">Responsable:</span> ${emailUsuario}</p>
                            <p class="flex items-center gap-3">
                                <span class="font-bold">Estado del período:</span> 
                                <span id="treasuryPeriodStatus" class="font-bold text-slate-500 uppercase">VERIFICANDO...</span>
                            </p>
                        </div>
                    </div>
                </div>
                <div class="hidden sm:block">
                    <!-- Logo institucional real -->
                    <img src="assets/logo/logo-institucional.png" alt="Logo" class="w-24 h-24 object-contain">
                </div>
            </div>

            <!-- NAVEGACIÓN DOCUMENTAL -->
            <div class="flex flex-wrap gap-4 sm:gap-6 mb-8 print:hidden border-b border-slate-300 pb-3 text-sm">
                <button onclick="switchTreasurySubTab('caja')" id="tsub-caja" class="tsub-btn font-bold text-slate-500 hover:text-blue-900 uppercase tracking-wider transition-colors pb-1"><i class="fas fa-file-invoice-dollar mr-1"></i> Caja</button>
                <button onclick="switchTreasurySubTab('actividades')" id="tsub-actividades" class="tsub-btn font-bold text-slate-500 hover:text-blue-900 uppercase tracking-wider transition-colors pb-1"><i class="fas fa-store mr-1"></i> Actividades</button>
                <button onclick="switchTreasurySubTab('inventario')" id="tsub-inventario" class="tsub-btn font-bold text-slate-500 hover:text-blue-900 uppercase tracking-wider transition-colors pb-1"><i class="fas fa-boxes mr-1"></i> Inventario</button>
                <button onclick="switchTreasurySubTab('informes')" id="tsub-informes" class="tsub-btn font-bold text-slate-500 hover:text-blue-900 uppercase tracking-wider transition-colors pb-1"><i class="fas fa-print mr-1"></i> Informes</button>
            </div>
            
            <div id="treasurySubContent" class="space-y-10 text-slate-800">
                <!-- Contenido -->
            </div>
        </div>
    `;
    
    await verificarEstadoPeriodo();
    switchTreasurySubTab('caja');
}

async function verificarEstadoPeriodo() {
    const stEl = document.getElementById('treasuryPeriodStatus');
    const btnComenzar = document.getElementById('btnComenzarMes');

    if (!treasuryDb) {
        if (stEl) {
            stEl.textContent = 'ERROR DE CONFIGURACIÓN';
            stEl.className = 'font-bold text-red-600 uppercase';
        }
        if (btnComenzar) btnComenzar.style.display = 'none';
        return;
    }
    
    if (typeof treasuryAuth === 'undefined' || !treasuryAuth) {
        if (stEl) {
            stEl.textContent = 'ERROR DE AUTENTICACIÓN';
            stEl.className = 'font-bold text-red-600 uppercase';
        }
        if (btnComenzar) btnComenzar.style.display = 'none';
        return;
    }

    if (!treasuryAuth.currentUser) {
        if (stEl) {
            stEl.textContent = 'ESPERANDO AUTENTICACIÓN DE TESORERÍA...';
            stEl.className = 'font-bold text-slate-500 uppercase';
        }
        if (btnComenzar) btnComenzar.style.display = 'none';
        return;
    }

    if (!treasuryCurrentPeriod) return;

    try {
        const snap = await treasuryDb.ref('periodos/' + treasuryCurrentPeriod).once('value');
        if (snap.exists()) {
            const estado = snap.val().estado || 'ABIERTO';
            if (btnComenzar) btnComenzar.style.display = 'none';
            if (stEl) {
                stEl.textContent = `MES ${estado}`;
                if (estado === 'CERRADO') stEl.className = 'font-bold text-slate-700 uppercase';
                else stEl.className = 'font-bold text-blue-900 uppercase';
            }
        } else {
            if (stEl) {
                stEl.textContent = 'MES NO INICIADO';
                stEl.className = 'font-bold text-red-600 uppercase';
            }
            if (btnComenzar) btnComenzar.style.display = 'inline-block';
        }
    } catch(e) {
        console.error('Error verificando periodo:', e);
        if (stEl) {
            stEl.textContent = 'ERROR AL CONSULTAR EL PERÍODO';
            stEl.className = 'font-bold text-red-600 uppercase';
        }
        if (btnComenzar) btnComenzar.style.display = 'none';
    }
}

function abrirModalSeleccionarMes() {
    const modal = document.getElementById('tSeleccionarMesModal');
    if(modal) {
        modal.style.display = 'flex';
        modalSelectedPeriod = treasuryCurrentPeriod; // Por defecto el actual
        actualizarSeleccionModalMes(modalSelectedPeriod);
    }
}

function cerrarModalSeleccionarMes() {
    const m = document.getElementById('tSeleccionarMesModal');
    if(m) m.style.display = 'none';
}

function verMes(periodo) {
    treasuryCurrentPeriod = periodo;
    cerrarModalSeleccionarMes();
    renderTreasuryDashboard();
}

async function actualizarSeleccionModalMes(nuevoPeriodo) {
    if (!treasuryAuth || !treasuryAuth.currentUser) {
        console.warn('actualizarSeleccionModalMes: No hay usuario autenticado en Tesorería.');
        return;
    }
    
    modalSelectedPeriod = nuevoPeriodo;
    const content = document.getElementById('tSeleccionarMesModalContent');
    if (!content) return;
    
    content.innerHTML = `<div class="text-center text-slate-500 py-8"><i class="fas fa-spinner fa-spin text-3xl mb-3"></i><br>Consultando...</div>`;

    const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    // Generar opciones para el select del modal
    const cy = new Date().getFullYear();
    let periodOptions = '';
    for (let yr = cy - 2; yr <= cy + 1; yr++) {
        for (let i = 0; i < 12; i++) {
            const val = `${yr}-${String(i+1).padStart(2, '0')}`;
            const label = `${mesesNombres[i]} ${yr}`;
            const selected = val === modalSelectedPeriod ? 'selected' : '';
            periodOptions += `<option value="${val}" ${selected}>${label}</option>`;
        }
    }

    try {
        // Consultar el estado del mes seleccionado
        const snap = await treasuryDb.ref('periodos/' + modalSelectedPeriod).once('value');
        let estadoSeleccionado = 'NO_INICIADO';
        if (snap.exists()) {
            estadoSeleccionado = snap.val().estado || 'ABIERTO';
        }

        const selYear = parseInt(modalSelectedPeriod.split('-')[0]);
        const selMonth = parseInt(modalSelectedPeriod.split('-')[1]) - 1;
        const nombreMes = `${mesesNombres[selMonth]} ${selYear}`;

        let estadoHTML = '';
        let disableComenzar = false;
        
        if (estadoSeleccionado === 'NO_INICIADO') {
            estadoHTML = '<span class="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded">MES NO INICIADO</span>';
        } else if (estadoSeleccionado === 'ABIERTO') {
            estadoHTML = '<span class="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">MES ABIERTO</span>';
            disableComenzar = true;
        } else if (estadoSeleccionado === 'CERRADO') {
            estadoHTML = '<span class="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-1 rounded">MES CERRADO</span>';
            disableComenzar = true;
        } else {
            estadoHTML = `<span class="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded">MES ${estadoSeleccionado}</span>`;
            disableComenzar = true;
        }

        let infoSaldo = '';
        // Si no está iniciado, pre-calcular la información de inicio
        if (estadoSeleccionado === 'NO_INICIADO') {
            // Regla 13: Buscar si hay periodos pasados
            const pastPeriodsToCheck = [];
            for (let yr = cy - 2; yr <= cy + 1; yr++) {
                for (let i = 0; i < 12; i++) {
                    const val = `${yr}-${String(i+1).padStart(2, '0')}`;
                    if (val < modalSelectedPeriod) pastPeriodsToCheck.push(val);
                }
            }
            
            const periodosData = {};
            const fetchPromises = pastPeriodsToCheck.map(async (periodoId) => {
                try {
                    const s = await treasuryDb.ref(`periodos/${periodoId}`).once('value');
                    if (s.exists()) periodosData[periodoId] = s.val();
                } catch (e) {}
            });
            await Promise.all(fetchPromises);

            const pastKeys = Object.keys(periodosData).sort();
            let hasAbierto = false;
            let lastCerradoSaldo = null;
            let lastCerradoPeriodo = null;
            let openPeriodNombre = '';
            
            // Identificar el periodo exactamente anterior
            const prevDate = new Date(modalSelectedPeriod + '-01T00:00:00Z');
            prevDate.setUTCMonth(prevDate.getUTCMonth() - 1);
            const prevMonthId = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, '0')}`;

            for (let i = pastKeys.length - 1; i >= 0; i--) {
                const pk = pastKeys[i];
                const pData = periodosData[pk];
                if (pData.estado === 'ABIERTO') {
                    hasAbierto = true;
                    openPeriodNombre = pk;
                    break;
                } else if (pData.estado === 'CERRADO' && lastCerradoSaldo === null) {
                    lastCerradoSaldo = parseFloat(pData.saldoFinal || 0);
                    lastCerradoPeriodo = pk;
                }
            }

            if (hasAbierto) {
                disableComenzar = true;
                infoSaldo = `
                    <div class="bg-red-50 border border-red-200 p-3 rounded-lg text-xs text-red-800 mb-4">
                        <i class="fas fa-lock mr-1"></i> No puedes comenzar este mes porque existe un período anterior abierto (${openPeriodNombre}). Cierra primero el período anterior.
                    </div>`;
            } else if (pastKeys.length > 0 && lastCerradoPeriodo !== prevMonthId) {
                disableComenzar = true;
                infoSaldo = `
                    <div class="bg-red-50 border border-red-200 p-3 rounded-lg text-xs text-red-800 mb-4">
                        <i class="fas fa-lock mr-1"></i> No puedes comenzar este mes (${modalSelectedPeriod}) sin haber cerrado el mes anterior (${prevMonthId}).
                    </div>`;
            } else if (lastCerradoSaldo !== null) {
                infoSaldo = `
                    <div class="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-4 text-xs text-blue-800 text-center">
                        <i class="fas fa-info-circle mr-1"></i> Saldo inicial heredado del último mes cerrado: <strong>$${lastCerradoSaldo.toFixed(2)}</strong>
                    </div>`;
            } else {
                // No hay periodos cerrados, revisar config/fondoInicialSistema
                let fondoInicial = null;
                try {
                    const sf = await treasuryDb.ref('config/fondoInicialSistema').once('value');
                    if (sf.exists()) fondoInicial = parseFloat(sf.val());
                } catch(e) {}
                
                if (fondoInicial !== null && !isNaN(fondoInicial)) {
                    infoSaldo = `
                        <div class="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-4 text-xs text-blue-800 text-center">
                            <i class="fas fa-info-circle mr-1"></i> Fondo inicial del sistema: <strong>$${fondoInicial.toFixed(2)}</strong>
                        </div>`;
                } else {
                    infoSaldo = `
                        <div class="bg-slate-50 border border-slate-200 p-3 rounded-lg mb-4 text-xs">
                            <label class="block font-bold text-slate-700 mb-1">FONDO INICIAL DEL SISTEMA ($)</label>
                            <input type="number" id="inputFondoInicial" step="0.01" min="0" required class="w-full bg-white border border-slate-300 rounded px-2 py-2 font-bold text-center mb-1" placeholder="0.00">
                            <p class="text-[10px] text-slate-500">Este monto representa el dinero existente antes de comenzar el registro digital. No es un ingreso.</p>
                        </div>`;
                }
            }
        }

        content.innerHTML = `
            <div class="mb-4">
                <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Seleccionar Período</label>
                <select id="modalMesSelect" onchange="actualizarSeleccionModalMes(this.value)" class="w-full bg-slate-50 border border-slate-300 p-3 text-sm font-bold text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    ${periodOptions}
                </select>
            </div>
            
            <div class="text-center mb-4">
                <p class="font-bold text-slate-800 mb-1">Mes seleccionado: <span class="text-blue-900">${nombreMes}</span></p>
                ${estadoHTML}
            </div>
            
            ${infoSaldo}

            <div class="space-y-2 mt-6">
                <button id="btnModalComenzar" onclick="comenzarMes(event)" class="w-full bg-blue-900 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg shadow transition-colors" ${disableComenzar ? 'disabled' : ''}>
                    <i class="fas fa-play mr-1"></i> COMENZAR MES
                </button>
                <button onclick="verMes('${modalSelectedPeriod}')" class="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 rounded-lg transition-colors">
                    <i class="fas fa-eye mr-1"></i> VER MES
                </button>
            </div>
        `;
    } catch(err) {
        content.innerHTML = `<div class="p-4 text-center text-red-600 font-bold">Error al consultar los períodos.</div>
        <div class="px-4 text-xs text-red-400 text-center mb-2 break-words">${err.message || err}</div>`;
    }
}

async function comenzarMes(e) {
    if (e) e.preventDefault();
    const btn = document.getElementById('btnModalComenzar');
    
    if (!treasuryAuth || !treasuryAuth.currentUser) {
        alert('No hay usuario autenticado en Tesorería.');
        return;
    }
    
    if (btn) btn.disabled = true;

    try {
        // Regla 7: comprobar si existe
        const snapExist = await treasuryDb.ref('periodos/' + modalSelectedPeriod).once('value');
        if (snapExist.exists()) {
            alert("Este período ya fue iniciado.");
            actualizarSeleccionModalMes(modalSelectedPeriod);
            return;
        }

        // Revisar pasados
        const pastPeriodsToCheck = [];
        const cy = new Date().getFullYear();
        for (let yr = cy - 2; yr <= cy + 1; yr++) {
            for (let i = 0; i < 12; i++) {
                const val = `${yr}-${String(i+1).padStart(2, '0')}`;
                if (val < modalSelectedPeriod) pastPeriodsToCheck.push(val);
            }
        }
        
        let hasAbierto = false;
        let lastCerradoSaldo = null;
        let lastCerradoPeriodo = null;
        
        const periodosData = {};
        const fetchPromises = pastPeriodsToCheck.map(async (periodoId) => {
            try {
                const snap = await treasuryDb.ref(`periodos/${periodoId}`).once('value');
                if (snap.exists()) periodosData[periodoId] = snap.val();
            } catch (e) {}
        });
        await Promise.all(fetchPromises);

        const pastKeys = Object.keys(periodosData).sort();
        
        // Identificar el periodo exactamente anterior
        const prevDate = new Date(modalSelectedPeriod + '-01T00:00:00Z');
        prevDate.setUTCMonth(prevDate.getUTCMonth() - 1);
        const prevMonthId = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, '0')}`;

        for (let i = pastKeys.length - 1; i >= 0; i--) {
            const pk = pastKeys[i];
            const pData = periodosData[pk];
            if (pData.estado === 'ABIERTO') {
                hasAbierto = true;
                break;
            } else if (pData.estado === 'CERRADO' && lastCerradoSaldo === null) {
                lastCerradoSaldo = parseFloat(pData.saldoFinal || 0);
                lastCerradoPeriodo = pk;
            }
        }

        if (hasAbierto) {
            alert("No puedes comenzar este mes porque existe un período anterior abierto.");
            if (btn) btn.disabled = false;
            return;
        }
        
        // Regla: No permitir saltos. Si hay ALGUN periodo anterior, el Inmediatamente Anterior debe estar cerrado.
        if (pastKeys.length > 0 && lastCerradoPeriodo !== prevMonthId) {
            alert(`No puedes comenzar ${modalSelectedPeriod} sin haber cerrado ${prevMonthId}.`);
            if (btn) btn.disabled = false;
            return;
        }

        let saldoInicial = 0;
        let fuenteSaldoInicial = '';

        if (lastCerradoSaldo !== null) {
            saldoInicial = lastCerradoSaldo;
            fuenteSaldoInicial = 'SALDO_PERIODO_CERRADO';
        } else {
            let fondoInicial = null;
            try {
                const snapFondo = await treasuryDb.ref('config/fondoInicialSistema').once('value');
                if (snapFondo.exists()) {
                    fondoInicial = parseFloat(snapFondo.val());
                }
            } catch (e) {}

            if (fondoInicial !== null && !isNaN(fondoInicial)) {
                saldoInicial = fondoInicial;
                fuenteSaldoInicial = 'FONDO_INICIAL_SISTEMA';
            } else {
                const inputEl = document.getElementById('inputFondoInicial');
                if (!inputEl) {
                    alert("No se encontró el campo de fondo inicial.");
                    if(btn) btn.disabled = false;
                    return;
                }
                const montoParseado = parseFloat(inputEl.value);
                if (isNaN(montoParseado) || montoParseado < 0) {
                    alert("Monto inválido para el fondo inicial.");
                    if(btn) btn.disabled = false;
                    return;
                }
                
                try {
                    await treasuryDb.ref('config/fondoInicialSistema').set(montoParseado);
                    await registrarAuditoriaTesoreria(
                        'CONFIGURACIÓN FONDO INICIAL', 
                        'Configuración', 
                        `Fondo inicial del sistema configurado en $${montoParseado}`, 
                        'global'
                    );
                } catch(e) {
                    alert("Error guardando el fondo inicial en Firebase.");
                    if(btn) btn.disabled = false;
                    return;
                }
                
                saldoInicial = montoParseado;
                fuenteSaldoInicial = 'FONDO_INICIAL_SISTEMA';
            }
        }

        // Crear período
        await treasuryDb.ref('periodos/' + modalSelectedPeriod).set({
            periodoId: modalSelectedPeriod,
            estado: 'ABIERTO',
            saldoInicial: saldoInicial,
            fuenteSaldoInicial: fuenteSaldoInicial,
            usuarioApertura: treasuryUser.email,
            fechaApertura: new Date().toISOString()
        });
        
        await registrarAuditoriaTesoreria(
            'APERTURA PERÍODO', 
            'Períodos', 
            `Período ${modalSelectedPeriod} comenzado con saldo inicial de $${saldoInicial} (${fuenteSaldoInicial})`, 
            modalSelectedPeriod
        );

        // Actualizar visualización
        verMes(modalSelectedPeriod);

    } catch (err) {
        console.error("Error comenzando el mes:", err);
        alert("Error al iniciar el mes. Revisa la consola para más detalles.");
        if (btn) btn.disabled = false;
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
    
    if (tab === 'caja' && typeof renderTesoreriaCaja === 'function') renderTesoreriaCaja();
    else if (tab === 'actividades' && typeof renderTesoreriaActividades === 'function') renderTesoreriaActividades();
    else if (tab === 'checklist' && typeof renderTesoreriaChecklist === 'function') renderTesoreriaChecklist();
    else if (tab === 'cobros' && typeof renderTesoreriaCobros === 'function') renderTesoreriaCobros();
    else if (tab === 'inventario' && typeof renderTesoreriaInventario === 'function') renderTesoreriaInventario();
    else if (tab === 'informes' && typeof renderTesoreriaInformes === 'function') renderTesoreriaInformes();
    else {
        document.getElementById('treasurySubContent').innerHTML = `<div class="p-8 text-center text-slate-400 italic">Módulo ${tab} en construcción.</div>`;
    }
}

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

// === EXPORTS GLOBALES ===
window.logoutTreasury = logoutTreasury;
window.handleTreasuryLogin = handleTreasuryLogin;
window.switchTreasurySubTab = switchTreasurySubTab;
window.canEditTreasury = canEditTreasury;

window.changeTreasuryPeriod = function(newPeriod) {
    treasuryCurrentPeriod = newPeriod;
    renderTreasuryDashboard();
};

window.abrirModalSeleccionarMes = abrirModalSeleccionarMes;
window.cerrarModalSeleccionarMes = cerrarModalSeleccionarMes;
window.actualizarSeleccionModalMes = actualizarSeleccionModalMes;
window.comenzarMes = comenzarMes;
window.verMes = verMes;
