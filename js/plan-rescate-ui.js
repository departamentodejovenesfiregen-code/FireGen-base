/**
 * FireGen — js/plan-rescate-ui.js
 * ─────────────────────────────────────────────────────────────
 * INTERFAZ: PLAN AL RESCATE Y TAREAS — Etapa 4 / Build B3.275
 *
 * Identidad del responsable:
 *   Firebase Auth UID → usuarios/{uid}/miembroId → miembros/{miembroId}
 *   NUNCA por nombre.
 *
 * Asignación de miembros:
 *   miembro.liderMiembroId === currentUserMemberId  (ID estable)
 *   con fallback a miembro.lider === nombre (compatibilidad)
 *
 * Rendición de cuentas:
 *   Lee rendicionCuentas/{uid}/{semanaKey} real desde Firebase.
 *   NUNCA usa valores fijos (hasRendicion = true).
 * ─────────────────────────────────────────────────────────────
 */

let misPersonas = [];
let rescateCurrentFilter = 'all';

/**
 * getCurrentSemanaKey — Calcula la clave semanal estable del año actual.
 * Formato: YYYY_semNN — función compartida para evitar duplicación.
 * (también usada en coordinacion.js)
 */
function getCurrentSemanaKey() {
    const now   = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const week  = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
    return `${now.getFullYear()}_sem${week}`;
}

/**
 * renderRescateDashboard — Renderiza el tablero de Plan al Rescate.
 *
 * Flujo de identidad:
 *   window.currentUserUid → usuarios/{uid}/miembroId → miembros/{miembroId}
 *   → buscar miembros cuyo liderMiembroId === currentUserMemberId
 *     (fallback: m.lider === nombre del usuario, para datos históricos)
 */
window.renderRescateDashboard = function() {
    const container = document.getElementById('rescate-container');
    if (!container) return;

    container.innerHTML = '<div class="flex items-center justify-center py-16 text-slate-400"><i class="fas fa-circle-notch fa-spin text-2xl mr-3"></i>Cargando...</div>';

    const uid = window.currentUserUid || (typeof currentUser !== 'undefined' && currentUser ? currentUser.uid : null);

    if (!uid) {
        container.innerHTML = _buildRescateError('No hay sesión activa. Por favor recarga la aplicación.');
        return;
    }

    // Obtener miembroId del usuario actual
    const miembroId = window.currentUserMemberId || null;

    if (!miembroId) {
        // Usuario sin miembro vinculado — mostrar estado informativo
        _buildRescateDashboardHtml(container, [], uid, null, null);
        return;
    }

    // Verificar rendición de la semana actual y cargar prospectos
    const semanaKey = getCurrentSemanaKey();
    Promise.all([
        db.ref(`rendicionCuentas/${uid}/${semanaKey}`).once('value'),
        db.ref('rescateProspectos').orderByChild('responsableMiembroId').equalTo(miembroId).once('value')
    ]).then(([snapRendicion, snapProspectos]) => {
        const hasRendicion = snapRendicion.exists();
        const prospectosRaw = snapProspectos.val() || {};
        const prospectosAsignados = Object.entries(prospectosRaw).map(([id, p]) => ({
            ...p,
            firebaseId: id, // uniform naming
            isProspecto: true,
            estadoAsistencia: 'Prospecto', // so priority logic treats it nicely (will be Normal priority or similar, but we can override in getPriority)
            estadoEspiritual: 'No Miembro'
        }));
        
        _buildRescateDashboardHtml(container, [], uid, miembroId, hasRendicion, prospectosAsignados);
    }).catch((e) => {
        console.error(e);
        _buildRescateDashboardHtml(container, [], uid, miembroId, false, []);
    });
};

function _buildRescateError(msg) {
    return `<div class="p-8 text-center text-red-500 font-bold"><i class="fas fa-exclamation-triangle text-2xl mb-2 block"></i>${escHtml(msg)}</div>`;
}

function _buildRescateDashboardHtml(container, _ignored, uid, miembroId, hasRendicion, prospectosAsignados = []) {
    const mArr = (typeof members !== 'undefined') ? members : [];

    if (!miembroId) {
        // Sin vínculo
        misPersonas = [];
        container.innerHTML = `
        <div class="p-4 md:p-6 max-w-7xl mx-auto space-y-6 pb-24">
            <div class="border-b pb-4">
                <h2 class="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <i class="fas fa-life-ring text-orange-500"></i> Plan al Rescate
                </h2>
            </div>
            <div class="text-center py-12 bg-amber-50 rounded-2xl border border-amber-200">
                <i class="fas fa-link-slash text-3xl text-amber-400 mb-3 block"></i>
                <h3 class="text-lg font-bold text-amber-700 mb-1">Sin miembro vinculado</h3>
                <p class="text-sm text-amber-600">Este usuario todavía no está vinculado a un miembro de la Base Maestro.<br>
                Contacta al administrador para que configure la vinculación.</p>
            </div>
        </div>`;
        return;
    }

    // Filtrar miembros asignados a este responsable
    // Prioridad: liderMiembroId (ID estable) → fallback lider por nombre
    const miembroActual = mArr.find(x => x.firebaseId === miembroId);
    const miNombre = miembroActual ? miembroActual.nombre : '';

    misPersonas = mArr.filter(m => {
        if (m.liderMiembroId && m.liderMiembroId === miembroId) return true;
        if (!m.liderMiembroId && m.lider && miNombre && m.lider.toLowerCase() === miNombre.toLowerCase()) return true;
        return false;
    }).map(m => ({ ...m, isProspecto: false }));

    // Agregar prospectos asignados a la lista general
    misPersonas = misPersonas.concat(prospectosAsignados);

    // Calcular estadísticas
    let countCritica = 0, countAlta = 0, countSeguimiento = 0, countNormal = 0;
    misPersonas.forEach(p => {
        const prio = RescueCore.getPriority(p.estadoAsistencia).level;
        if (prio === 4) countCritica++;
        else if (prio === 3) countAlta++;
        else if (prio === 2) countSeguimiento++;
        else countNormal++;
    });

    const rendBtnClass = hasRendicion
        ? 'from-green-500 to-green-600'
        : 'from-orange-500 to-red-500';
    const rendIcon = hasRendicion ? 'fa-check-circle' : 'fa-clipboard-list';
    const rendLabel = hasRendicion ? 'Rendición Semanal Completada' : 'Rendición de Cuentas Pendiente';

    container.innerHTML = `
    <div class="p-4 md:p-6 max-w-7xl mx-auto space-y-6 pb-24">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-4">
            <div>
                <h2 class="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <i class="fas fa-life-ring text-orange-500"></i> Plan al Rescate
                </h2>
                <p class="text-sm font-bold text-slate-500 mt-1 uppercase tracking-wider">Tus personas asignadas y tareas prioritarias</p>
            </div>
            <!-- Botón Rendición de Cuentas (Weekly) -->
            <button onclick="openRendicionCuentasModal()" class="w-full md:w-auto bg-gradient-to-r ${rendBtnClass} text-white px-4 py-2.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2">
                <i class="fas ${rendIcon}"></i>
                ${rendLabel}
            </button>
        </div>

        <!-- KPIs Resumen -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div class="bg-white p-4 rounded-2xl border border-red-200 shadow-sm flex flex-col items-center justify-center cursor-pointer hover:bg-red-50 transition-all" onclick="filterRescate('critica')">
                <span class="text-3xl mb-1">🔴</span>
                <span class="text-2xl font-black text-red-600">${countCritica}</span>
                <span class="text-[10px] font-bold text-slate-500 uppercase">Crítica</span>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-orange-200 shadow-sm flex flex-col items-center justify-center cursor-pointer hover:bg-orange-50 transition-all" onclick="filterRescate('alta')">
                <span class="text-3xl mb-1">🟠</span>
                <span class="text-2xl font-black text-orange-500">${countAlta}</span>
                <span class="text-[10px] font-bold text-slate-500 uppercase">Alta</span>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-yellow-200 shadow-sm flex flex-col items-center justify-center cursor-pointer hover:bg-yellow-50 transition-all" onclick="filterRescate('seguimiento')">
                <span class="text-3xl mb-1">🟡</span>
                <span class="text-2xl font-black text-yellow-500">${countSeguimiento}</span>
                <span class="text-[10px] font-bold text-slate-500 uppercase">Seguimiento</span>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-green-200 shadow-sm flex flex-col items-center justify-center cursor-pointer hover:bg-green-50 transition-all" onclick="filterRescate('normal')">
                <span class="text-3xl mb-1">🟢</span>
                <span class="text-2xl font-black text-green-500">${countNormal}</span>
                <span class="text-[10px] font-bold text-slate-500 uppercase">Normal</span>
            </div>
        </div>

        <!-- Pestañas Mis Personas / Mis Tareas -->
        <div class="flex gap-2 border-b">
            <button onclick="setRescateTab('personas')" id="rescate-tab-personas" class="px-4 py-2 border-b-2 border-orange-500 text-orange-600 font-bold text-sm">Mis Personas (${misPersonas.length})</button>
            <button onclick="setRescateTab('tareas')" id="rescate-tab-tareas" class="px-4 py-2 border-b-2 border-transparent text-slate-500 font-bold text-sm hover:text-orange-500 transition-all">Mis Tareas</button>
        </div>

        <div id="rescate-content-area">
            ${renderPersonasTab()}
        </div>
    </div>`;
}

window.setRescateTab = function(tab) {
    const tabPersonas = document.getElementById('rescate-tab-personas');
    const tabTareas = document.getElementById('rescate-tab-tareas');
    const contentArea = document.getElementById('rescate-content-area');
    if (!tabPersonas || !tabTareas || !contentArea) return;

    if (tab === 'personas') {
        tabPersonas.className = 'px-4 py-2 border-b-2 border-orange-500 text-orange-600 font-bold text-sm';
        tabTareas.className = 'px-4 py-2 border-b-2 border-transparent text-slate-500 font-bold text-sm hover:text-orange-500 transition-all';
        contentArea.innerHTML = renderPersonasTab();
    } else {
        tabTareas.className = 'px-4 py-2 border-b-2 border-orange-500 text-orange-600 font-bold text-sm';
        tabPersonas.className = 'px-4 py-2 border-b-2 border-transparent text-slate-500 font-bold text-sm hover:text-orange-500 transition-all';
        contentArea.innerHTML = renderTareasTab();
    }
};

window.filterRescate = function(levelName) {
    rescateCurrentFilter = rescateCurrentFilter === levelName ? 'all' : levelName;
    setRescateTab('personas');
};

function renderPersonasTab() {
    if (misPersonas.length === 0) {
        return `
            <div class="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
                <i class="fas fa-users text-4xl text-slate-300 mb-3 block"></i>
                <h3 class="text-lg font-bold text-slate-600 mb-1">Aún no tienes personas asignadas</h3>
                <p class="text-sm text-slate-500">Contacta a tu coordinador para que te asigne miembros a discipular.</p>
            </div>
        `;
    }

    // Ordenar por prioridad (4 a 1)
    let list = [...misPersonas].sort((a, b) => {
        const pA = RescueCore.getPriority(a.estadoAsistencia).level;
        const pB = RescueCore.getPriority(b.estadoAsistencia).level;
        return pB - pA;
    });

    if (rescateCurrentFilter !== 'all') {
        const levels = { 'critica': 4, 'alta': 3, 'seguimiento': 2, 'normal': 1 };
        const reqLevel = levels[rescateCurrentFilter];
        list = list.filter(m => RescueCore.getPriority(m.estadoAsistencia).level === reqLevel);
    }

    if (list.length === 0) {
        return `<div class="text-center py-8 text-slate-400 italic font-bold">Ninguna persona en esta categoría.</div>`;
    }

    return `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${list.map(p => renderPersonaCard(p)).join('')}
        </div>
    `;
}

function renderPersonaCard(p) {
    const prio = RescueCore.getPriority(p.estadoAsistencia);
    const formRoute = RescueCore.getFormationRoute(p.estadoEspiritual);
    const accRoute = RescueCore.getAccompanimentRoute(p.estadoAsistencia);
    const nextTask = RescueCore.getNextTaskLabel(p.estadoEspiritual, p.estadoAsistencia);
    const initial = (p.nombre || '?').charAt(0).toUpperCase();

    const isProspecto = p.isProspecto === true;
    const semanaKey = getCurrentSemanaKey();
    let planHtml = '';
    
    if (isProspecto) {
        const plan = (p.planSemanal && p.planSemanal[semanaKey]) ? p.planSemanal[semanaKey] : {};
        const orarCheck = plan.orar ? '✓' : '☐';
        const invitarCheck = plan.invitar ? '✓' : '☐';
        const contactarCheck = plan.contactar ? (plan.seContacto ? '✓' : '—') : '☐';
        const encuestaPill = plan.encuestaCompletada 
            ? '<span class="text-green-600">🟢 Encuesta completada</span>' 
            : '<span class="text-orange-500">🟠 Encuesta pendiente</span>';
        
        planHtml = `
            <div class="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-600">
                <div class="font-bold text-slate-800 mb-1 border-b border-slate-200 pb-1">Plan de esta semana</div>
                <div class="grid grid-cols-2 gap-1 mt-2">
                    <div><span class="font-bold text-slate-800 w-4 inline-block">${orarCheck}</span> Orar</div>
                    <div><span class="font-bold text-slate-800 w-4 inline-block">${contactarCheck}</span> Contactar (opc)</div>
                    <div><span class="font-bold text-slate-800 w-4 inline-block">${invitarCheck}</span> Invitar</div>
                    <div class="col-span-2 mt-1 font-bold">${encuestaPill}</div>
                </div>
            </div>
        `;
    }

    return `
    <div class="bg-white rounded-2xl border ${prio.border} shadow-sm overflow-hidden flex flex-col relative ${isProspecto ? 'ring-2 ring-indigo-500/20' : ''}">
        <div class="absolute top-0 left-0 w-1.5 h-full ${prio.bg.split(' ')[0]}"></div>
        <div class="p-4 pl-5">
            <div class="flex justify-between items-start mb-3">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-black text-lg shadow-inner flex-shrink-0">
                        ${escHtml(initial)}
                    </div>
                    <div class="min-w-0">
                        <h3 class="font-bold text-slate-800 truncate leading-tight">${escHtml(p.nombre)}</h3>
                        <div class="flex items-center gap-2 mt-1 flex-wrap">
                            <span class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${isProspecto ? 'bg-indigo-100 text-indigo-700' : getStatusClass(p.estadoEspiritual)}">${escHtml(p.estadoEspiritual)}</span>
                            <span class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${prio.bg}">${prio.icon} ${prio.label}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="space-y-2 mb-4">
                ${!isProspecto ? `
                <div class="flex items-center gap-2 text-xs text-slate-600">
                    <i class="fas fa-route text-slate-400 w-4 text-center"></i>
                    <span class="truncate" title="${escHtml(formRoute)}">${escHtml(formRoute)}</span>
                </div>
                <div class="flex items-center gap-2 text-xs text-slate-600">
                    <i class="fas fa-hands-helping text-slate-400 w-4 text-center"></i>
                    <span class="truncate text-orange-600 font-semibold" title="${escHtml(accRoute)}">${escHtml(accRoute)}</span>
                </div>
                <div class="flex items-center gap-2 text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <i class="fas fa-tasks text-orange-500 w-4 text-center"></i>
                    <span class="font-bold text-slate-700 truncate">Tarea: ${escHtml(nextTask)}</span>
                </div>
                ` : planHtml}
            </div>

            <div class="flex gap-2 mt-auto pt-2 border-t border-slate-100 flex-wrap">
                ${isProspecto ? `
                <button onclick="openPlanSemanalModal('${p.firebaseId}')" class="flex-1 bg-slate-100 hover:bg-orange-50 text-slate-600 hover:text-orange-600 font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1">
                    <i class="fas fa-calendar-check"></i> Plan
                </button>
                <button onclick="openEncuestaProspectoModal('${p.firebaseId}')" class="flex-1 bg-green-50 hover:bg-green-100 text-green-600 font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1">
                    <i class="fas fa-clipboard-list"></i> Encuesta
                </button>
                ` : `
                <button onclick="openPlanSemanalModal('${p.firebaseId}')" class="flex-1 bg-slate-100 hover:bg-orange-50 text-slate-600 hover:text-orange-600 font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1">
                    <i class="fas fa-edit"></i> Plan Semanal
                </button>
                `}
                <a ${p.telefono ? `href="https://wa.me/${p.telefono.replace(/\D/g, '')}" target="_blank"` : 'onclick="alert(\'No hay teléfono registrado\')"' } class="w-10 flex-shrink-0 bg-green-50 hover:bg-green-100 text-green-600 font-bold py-2 rounded-xl text-sm transition-all flex items-center justify-center">
                    <i class="fab fa-whatsapp"></i>
                </a>
                ${!isProspecto ? `<button onclick="openExpediente('${p.firebaseId}')" class="w-10 flex-shrink-0 bg-slate-50 hover:bg-slate-200 text-slate-500 font-bold py-2 rounded-xl text-sm transition-all flex items-center justify-center">
                    <i class="fas fa-user"></i>
                </button>` : ''}
            </div>
        </div>
    </div>`;
}

function renderTareasTab() {
    const tareas = misPersonas.filter(m => RescueCore.getPriority(m.estadoAsistencia).level > 1)
        .sort((a, b) => RescueCore.getPriority(b.estadoAsistencia).level - RescueCore.getPriority(a.estadoAsistencia).level);

    if (tareas.length === 0) {
        return `
            <div class="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
                <i class="fas fa-check-circle text-4xl text-green-500 mb-3 block"></i>
                <h3 class="text-lg font-bold text-slate-600 mb-1">¡Al día!</h3>
                <p class="text-sm text-slate-500">No hay tareas prioritarias pendientes. Sigue así.</p>
            </div>
        `;
    }

    return `
        <div class="space-y-3">
            <h3 class="text-xs font-black uppercase tracking-wider text-slate-500 mb-4 ml-1">Tareas Sugeridas (${tareas.length})</h3>
            ${tareas.map(p => {
                const prio = RescueCore.getPriority(p.estadoAsistencia);
                const nextTask = RescueCore.getNextTaskLabel(p.estadoEspiritual, p.estadoAsistencia);
                const accRoute = RescueCore.getAccompanimentRoute(p.estadoAsistencia);
                return `
                <div class="bg-white p-3 md:p-4 rounded-xl border ${prio.border} flex items-center justify-between gap-3 shadow-sm hover:shadow-md transition-shadow">
                    <div class="flex items-center gap-3 md:gap-4 min-w-0">
                        <div class="w-10 h-10 rounded-full ${prio.bg} flex items-center justify-center font-black text-xl flex-shrink-0">
                            ${prio.icon}
                        </div>
                        <div class="min-w-0">
                            <h4 class="font-bold text-slate-800 text-sm truncate">${escHtml(p.nombre)}</h4>
                            <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-0.5">
                                <span class="text-xs font-bold text-orange-600 truncate">${escHtml(nextTask)}</span>
                                <span class="hidden sm:inline text-slate-300">•</span>
                                <span class="text-[10px] text-slate-500 truncate uppercase">${escHtml(accRoute)}</span>
                            </div>
                        </div>
                    </div>
                    <button onclick="openPlanSemanalModal('${p.firebaseId}')" class="bg-orange-50 hover:bg-orange-100 text-orange-600 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex-shrink-0">
                        <i class="fas fa-calendar-check"></i> Plan
                    </button>
                </div>
                `;
            }).join('')}
        </div>
    `;
}

/**
 * openPlanSemanalModal — Abre el modal para registrar el plan semanal
 */
window.openPlanSemanalModal = function(personaId) {
    const modal = document.getElementById('planSemanalModal');
    if (!modal) return;
    
    document.getElementById('planSemanalProspectoId').value = personaId;
    
    // Buscar los datos actuales de esta persona
    const p = misPersonas.find(x => x.firebaseId === personaId);
    if (!p) return;

    const isMember = !p.isProspecto;
    document.getElementById('planSemanalIsMember').value = isMember ? 'true' : 'false';

    const semanaKey = getCurrentSemanaKey();
    let plan = {};
    if (p.planSemanal && p.planSemanal[semanaKey]) {
        plan = p.planSemanal[semanaKey];
    }
    
    const subtitle = document.getElementById('planSemanalSubtitle');
    const container = document.getElementById('planSemanalTareasContainer');
    const resContainer = document.getElementById('planSemanalResultadosContainer');
    const planRes = document.getElementById('planResultado');
    const planObs = document.getElementById('planObs');

    container.innerHTML = '';

    if (isMember) {
        subtitle.textContent = `Plan de discipulado para ${p.nombre}`;
        resContainer.classList.remove('hidden');
        if (planRes) planRes.value = plan.resultado || '';
        if (planObs) planObs.value = plan.observaciones || '';

        const weekPlan = RescueCore.getWeeklyDiscipleshipPlan(p.estadoAsistencia, p.estadoEspiritual);
        
        weekPlan.tareas.forEach(tarea => {
            const checked = plan.tareas && plan.tareas[tarea.id] && plan.tareas[tarea.id].completada ? 'checked' : '';
            const isReq = tarea.required ? '<span class="text-xs text-red-500 ml-1">*</span>' : '<span class="text-xs text-slate-400 ml-1">(opcional)</span>';
            container.innerHTML += `
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label class="flex items-start gap-3 cursor-pointer">
                        <input type="checkbox" name="planTareaCb" value="${tarea.id}" data-req="${tarea.required}" ${checked} class="w-5 h-5 mt-0.5 rounded text-indigo-500 focus:ring-indigo-500">
                        <span class="text-sm font-semibold text-slate-700">${tarea.label}${isReq}</span>
                    </label>
                </div>
            `;
        });
    } else {
        subtitle.textContent = 'Selecciona las acciones que planeas realizar esta semana.';
        resContainer.classList.add('hidden');

        // Prospectos tienen tareas fijas
        const orarChecked = !!plan.orar ? 'checked' : '';
        const contactarChecked = !!plan.contactar ? 'checked' : '';
        const invitarChecked = !!plan.invitar ? 'checked' : '';
        
        container.innerHTML = `
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label class="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" id="planOrar" ${orarChecked} class="w-5 h-5 mt-0.5 rounded text-indigo-500 focus:ring-indigo-500">
                    <span class="text-sm font-semibold text-slate-700">Orar por esta persona</span>
                </label>
            </div>
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label class="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" id="planContactar" ${contactarChecked} class="w-5 h-5 mt-0.5 rounded text-indigo-500 focus:ring-indigo-500">
                    <span class="text-sm font-semibold text-slate-700">Contactar (opcional)</span>
                </label>
            </div>
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label class="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" id="planInvitar" ${invitarChecked} class="w-5 h-5 mt-0.5 rounded text-indigo-500 focus:ring-indigo-500">
                    <span class="text-sm font-semibold text-slate-700">Invitar a la iglesia</span>
                </label>
            </div>
        `;
    }
    
    modal.classList.remove('hidden');
};

window.closePlanSemanalModal = function() {
    const modal = document.getElementById('planSemanalModal');
    if (modal) modal.classList.add('hidden');
};

/**
 * openEncuestaProspectoModal — Abre el modal para registrar la encuesta semanal de un prospecto
 */
window.openEncuestaProspectoModal = function(prospectoId) {
    const modal = document.getElementById('encuestaProspectoModal');
    if (!modal) return;
    
    document.getElementById('encuestaProspectoId').value = prospectoId;
    
    // Buscar los datos actuales de esta semana
    const p = misPersonas.find(x => x.firebaseId === prospectoId);
    const semanaKey = getCurrentSemanaKey();
    let plan = {};
    if (p && p.planSemanal && p.planSemanal[semanaKey]) {
        plan = p.planSemanal[semanaKey];
    }
    
    // Poblar el formulario
    document.getElementById('encuestaSeContacto').checked = !!plan.seContacto;
    document.getElementById('encuestaSeInvito').checked = !!plan.seInvito;
    document.getElementById('encuestaMedio').value = plan.tipoContacto || '';
    document.getElementById('encuestaResultado').value = plan.resultado || '';
    document.getElementById('encuestaObs').value = plan.observaciones || '';
    
    modal.classList.remove('hidden');
};

window.closeEncuestaProspectoModal = function() {
    const modal = document.getElementById('encuestaProspectoModal');
    if (modal) modal.classList.add('hidden');
};



/**
 * openSeguimientoModal — Abre el modal para registrar un seguimiento
 */
window.openSeguimientoModal = function(memberId, isProspecto = false) {
    const modal = document.getElementById('seguimientoModal');
    if (!modal) return;
    document.getElementById('segMemberId').value = memberId;
    
    // Si es prospecto, agregar opciones de "Orar", "Invitar", "Encuesta"
    const segTipo = document.getElementById('segTipo');
    if (segTipo) {
        if (isProspecto) {
            segTipo.innerHTML = `
                <option value="orar">Oración / Intercesión</option>
                <option value="whatsapp">Contacto / WhatsApp</option>
                <option value="invitar">Invitación</option>
                <option value="encuesta">Encuesta finalizada</option>
            `;
        } else {
            segTipo.innerHTML = `
                <option value="whatsapp">Mensaje WhatsApp</option>
                <option value="llamada">Llamada telefónica</option>
                <option value="visita">Visita presencial</option>
                <option value="encuentro">Encuentro en reunión</option>
                <option value="oracion">Oración específica</option>
            `;
        }
    }
    
    document.getElementById('segObs').value = '';
    modal.classList.remove('hidden');
};

window.closeSeguimientoModal = function() {
    const modal = document.getElementById('seguimientoModal');
    if (modal) modal.classList.add('hidden');
};

window.closeRendicionModal = function() {
    const modal = document.getElementById('rendicionModal');
    if (modal) modal.classList.add('hidden');
};

/**
 * openRendicionCuentasModal — Abre el modal para la encuesta semanal
 */
window.openRendicionCuentasModal = function() {
    const rendQ1 = document.getElementById('rendQ1');
    const rendQ2 = document.getElementById('rendQ2');
    const rendObs = document.getElementById('rendObs');
    const modal = document.getElementById('rendicionModal');
    if (!modal) return;
    if (rendQ1) rendQ1.checked = false;
    if (rendQ2) rendQ2.checked = false;
    if (rendObs) rendObs.value = '';
    modal.classList.remove('hidden');
};

// ── Event handlers para formularios ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const planForm = document.getElementById('planSemanalForm');
    if (planForm) {
        planForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = planForm.querySelector('button[type="submit"]');
            if (btn) btn.disabled = true;

            const prospectoId = document.getElementById('planSemanalProspectoId').value;
            const isMember = document.getElementById('planSemanalIsMember').value === 'true';
            const semanaKey = getCurrentSemanaKey();
            
            const uid = window.currentUserUid || (typeof currentUser !== 'undefined' && currentUser ? currentUser.uid : 'anonimo');
            const displayEl = document.getElementById('userEmailDisplay');
            const nombre = displayEl?.textContent?.trim() || '';

            let data = {};
            let refPath = '';

            if (isMember) {
                refPath = `miembros/${prospectoId}/planSemanal/${semanaKey}`;
                
                // Recopilar tareas generadas dinámicamente
                const tareas = {};
                const checkboxes = planForm.querySelectorAll('input[name="planTareaCb"]');
                checkboxes.forEach(cb => {
                    tareas[cb.value] = {
                        completada: cb.checked,
                        obligatoria: cb.getAttribute('data-req') === 'true'
                    };
                });

                data = {
                    tareas,
                    resultado: document.getElementById('planResultado').value.trim(),
                    observaciones: document.getElementById('planObs').value.trim(),
                    fechaActualizacion: new Date().toISOString(),
                    actualizadoPorUid: uid,
                    actualizadoPorNombre: nombre
                };
            } else {
                refPath = `rescateProspectos/${prospectoId}/planSemanal/${semanaKey}`;
                data = {
                    orar: document.getElementById('planOrar') ? document.getElementById('planOrar').checked : false,
                    contactar: document.getElementById('planContactar') ? document.getElementById('planContactar').checked : false,
                    invitar: document.getElementById('planInvitar') ? document.getElementById('planInvitar').checked : false,
                    fechaActualizacion: new Date().toISOString(),
                    actualizadoPorUid: uid,
                    actualizadoPorNombre: nombre
                };
            }

            try {
                await db.ref(refPath).update(data);
                window.closePlanSemanalModal();
                if (typeof showToast === 'function') showToast('Plan semanal guardado', 'success');
                if (typeof renderRescateDashboard === 'function') {
                    renderRescateDashboard(document.getElementById('rescate-container'));
                }
            } catch (err) {
                if (typeof showToast === 'function') showToast('Error al guardar: ' + err.message, 'error');
                else alert('Error al guardar: ' + err.message);
            } finally {
                if (btn) btn.disabled = false;
            }
        });
    }

    const encuestaForm = document.getElementById('encuestaProspectoForm');
    if (encuestaForm) {
        // Handler comun para guardar
        const guardarEncuesta = async (isCompletada) => {
            const btnSubmit = encuestaForm.querySelector('button[type="submit"]');
            const btnParcial = document.getElementById('btnGuardarParcialEncuesta');
            
            const seContacto = document.getElementById('encuestaSeContacto').checked;
            const seInvito = document.getElementById('encuestaSeInvito').checked;
            const tipoContacto = document.getElementById('encuestaMedio').value;
            const resultado = document.getElementById('encuestaResultado').value.trim();
            const observaciones = document.getElementById('encuestaObs').value.trim();

            if (isCompletada) {
                // Validación estricta para COMPLETADA
                if (seContacto && !tipoContacto) {
                    if (typeof showToast === 'function') showToast('Seleccione el tipo de contacto', 'error');
                    else alert('Seleccione el tipo de contacto');
                    return;
                }
                if (!resultado) {
                    if (typeof showToast === 'function') showToast('El resultado breve es obligatorio para completar', 'error');
                    else alert('El resultado breve es obligatorio para completar');
                    return;
                }
            }

            if (btnSubmit) btnSubmit.disabled = true;
            if (btnParcial) btnParcial.disabled = true;

            const prospectoId = document.getElementById('encuestaProspectoId').value;
            const semanaKey = getCurrentSemanaKey();
            
            const uid = window.currentUserUid || (typeof currentUser !== 'undefined' && currentUser ? currentUser.uid : 'anonimo');
            const displayEl = document.getElementById('userEmailDisplay');
            const nombre = displayEl?.textContent?.trim() || '';

            // Estado de la encuesta: 'PENDIENTE', 'EN PROGRESO', 'COMPLETADA'
            const estadoEncuesta = isCompletada ? 'COMPLETADA' : 'EN PROGRESO';

            const data = {
                seContacto,
                seInvito,
                tipoContacto,
                resultado,
                observaciones,
                encuestaCompletada: isCompletada,
                estadoEncuesta,
                fechaActualizacion: new Date().toISOString(),
                actualizadoPorUid: uid,
                actualizadoPorNombre: nombre
            };

            try {
                await db.ref(`rescateProspectos/${prospectoId}/planSemanal/${semanaKey}`).update(data);
                window.closeEncuestaProspectoModal();
                if (typeof showToast === 'function') showToast(isCompletada ? 'Encuesta completada' : 'Progreso guardado', 'success');
                if (typeof renderRescateDashboard === 'function') {
                    renderRescateDashboard(document.getElementById('rescate-container'));
                }
            } catch (err) {
                if (typeof showToast === 'function') showToast('Error al guardar: ' + err.message, 'error');
                else alert('Error al guardar: ' + err.message);
            } finally {
                if (btnSubmit) btnSubmit.disabled = false;
                if (btnParcial) btnParcial.disabled = false;
            }
        };

        encuestaForm.addEventListener('submit', (e) => {
            e.preventDefault();
            guardarEncuesta(true); // submit = Completar
        });

        const btnParcial = document.getElementById('btnGuardarParcialEncuesta');
        if (btnParcial) {
            btnParcial.addEventListener('click', (e) => {
                e.preventDefault();
                guardarEncuesta(false); // click = Guardar parcial
            });
        }
    }

    const segForm = document.getElementById('seguimientoForm');
    if (segForm) {
        segForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const memberId = document.getElementById('segMemberId')?.value || '';
            const tipo     = document.getElementById('segTipo')?.value || 'whatsapp';
            const obs      = document.getElementById('segObs')?.value.trim() || '';
            const uid      = window.currentUserUid || (typeof currentUser !== 'undefined' && currentUser ? currentUser.uid : 'anonimo');
            const displayEl = document.getElementById('userEmailDisplay');
            const nombre   = displayEl?.textContent?.trim() || '';

            const registro = {
                fecha:      new Date().toISOString(),
                tipo,
                obs,
                liderUid:    uid,
                liderNombre: nombre
            };

            try {
                await db.ref(`seguimientos/${memberId}`).push(registro);
                window.closeSeguimientoModal();
                if (typeof showToast === 'function') showToast('Seguimiento registrado ✓', 'success');
            } catch (err) {
                alert('Error al guardar: ' + err.message);
            }
        });
    }

    const rendForm = document.getElementById('rendicionForm');
    if (rendForm) {
        rendForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const uid = window.currentUserUid || (typeof currentUser !== 'undefined' && currentUser ? currentUser.uid : 'anonimo');
            const displayEl = document.getElementById('userEmailDisplay');
            const nombre = displayEl?.textContent?.trim() || '';

            const semanaKey = getCurrentSemanaKey();

            const rendicion = {
                fecha:         new Date().toISOString(),
                semana:        semanaKey,
                liderUid:      uid,
                liderNombre:   nombre,
                comunicoTodos: document.getElementById('rendQ1')?.checked || false,
                urgente:       document.getElementById('rendQ2')?.checked || false,
                observaciones: document.getElementById('rendObs')?.value.trim() || ''
            };

            try {
                await db.ref(`rendicionCuentas/${uid}/${semanaKey}`).set(rendicion);
                window.closeRendicionModal();
                if (typeof showToast === 'function') showToast('Rendición de cuentas enviada ✓', 'success');
                // Re-renderizar para actualizar el estado del botón
                if (typeof renderRescateDashboard === 'function') renderRescateDashboard();
            } catch (err) {
                alert('Error al guardar: ' + err.message);
            }
        });
    }
});

/**
 * showToast — Muestra notificaciones emergentes (si no está definido en otro módulo)
 */
if (typeof showToast === 'undefined') {
    window.showToast = function(msg, type = 'info') {
        const colors = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-slate-700' };
        const div = document.createElement('div');
        div.className = `fixed bottom-24 left-1/2 -translate-x-1/2 ${colors[type] || colors.info} text-white font-bold px-6 py-3 rounded-2xl shadow-2xl z-[200] text-sm transition-all`;
        div.textContent = msg;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3000);
    };
}
