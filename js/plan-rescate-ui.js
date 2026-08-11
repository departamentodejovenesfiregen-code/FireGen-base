/**
 * FireGen V3.0 — js/plan-rescate-ui.js
 * ─────────────────────────────────────────────────────────────
 * INTERFAZ: PLAN AL RESCATE Y TAREAS
 * ─────────────────────────────────────────────────────────────
 */

let misPersonas = [];
let rescateCurrentFilter = 'all';

/**
 * renderRescateDashboard — Renderiza el tablero de Plan al Rescate
 */
window.renderRescateDashboard = function() {
    const container = document.getElementById('rescate-container');
    if (!container) return;
    
    // Obtener mis asignados (filtrar miembros cuyo 'lider' sea mi nombre)
    const miNombre = document.getElementById('userEmailDisplay').textContent;
    
    misPersonas = (typeof members !== 'undefined' ? members : []).filter(m => 
        m.lider && m.lider.toLowerCase() === miNombre.toLowerCase()
    );

    // Calcular estadísticas
    let countCritica = 0, countAlta = 0, countSeguimiento = 0, countNormal = 0;
    
    misPersonas.forEach(p => {
        const prio = RescueCore.getPriority(p.estadoAsistencia).level;
        if (prio === 4) countCritica++;
        else if (prio === 3) countAlta++;
        else if (prio === 2) countSeguimiento++;
        else countNormal++;
    });

    const hasRendicion = true; // TODO: Lógica para saber si ya rindió cuentas esta semana

    let html = `
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
            <button onclick="openRendicionCuentasModal()" class="w-full md:w-auto bg-gradient-to-r ${hasRendicion ? 'from-green-500 to-green-600' : 'from-orange-500 to-red-500'} text-white px-4 py-2.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2">
                <i class="fas ${hasRendicion ? 'fa-check-circle' : 'fa-clipboard-list'}"></i> 
                ${hasRendicion ? 'Rendición Semanal Completada' : 'Rendición de Cuentas Pendiente'}
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

    container.innerHTML = html;
};

window.setRescateTab = function(tab) {
    if (tab === 'personas') {
        document.getElementById('rescate-tab-personas').className = "px-4 py-2 border-b-2 border-orange-500 text-orange-600 font-bold text-sm";
        document.getElementById('rescate-tab-tareas').className = "px-4 py-2 border-b-2 border-transparent text-slate-500 font-bold text-sm hover:text-orange-500 transition-all";
        document.getElementById('rescate-content-area').innerHTML = renderPersonasTab();
    } else {
        document.getElementById('rescate-tab-tareas').className = "px-4 py-2 border-b-2 border-orange-500 text-orange-600 font-bold text-sm";
        document.getElementById('rescate-tab-personas').className = "px-4 py-2 border-b-2 border-transparent text-slate-500 font-bold text-sm hover:text-orange-500 transition-all";
        document.getElementById('rescate-content-area').innerHTML = renderTareasTab();
    }
};

window.filterRescate = function(levelName) {
    rescateCurrentFilter = rescateCurrentFilter === levelName ? 'all' : levelName;
    // Si estamos en personas, re-renderizar
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

    return `
    <div class="bg-white rounded-2xl border ${prio.border} shadow-sm overflow-hidden flex flex-col relative">
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
                            <span class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${getStatusClass(p.estadoEspiritual)}">${escHtml(p.estadoEspiritual)}</span>
                            <span class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${prio.bg}">${prio.icon} ${prio.label}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="space-y-2 mb-4">
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
            </div>
            
            <div class="flex gap-2 mt-auto pt-2 border-t border-slate-100">
                <button onclick="openSeguimientoModal('${p.firebaseId}')" class="flex-1 bg-slate-100 hover:bg-orange-50 text-slate-600 hover:text-orange-600 font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1">
                    <i class="fas fa-edit"></i> Registrar
                </button>
                <a ${p.telefono ? `href="https://wa.me/${p.telefono.replace(/\D/g, '')}" target="_blank"` : 'onclick="alert(\'No hay teléfono registrado\')"' } class="w-10 flex-shrink-0 bg-green-50 hover:bg-green-100 text-green-600 font-bold py-2 rounded-xl text-sm transition-all flex items-center justify-center">
                    <i class="fab fa-whatsapp"></i>
                </a>
                <button onclick="openExpediente('${p.firebaseId}')" class="w-10 flex-shrink-0 bg-slate-50 hover:bg-slate-200 text-slate-500 font-bold py-2 rounded-xl text-sm transition-all flex items-center justify-center">
                    <i class="fas fa-user"></i>
                </button>
            </div>
        </div>
    </div>`;
}

function renderTareasTab() {
    // Generar lista de tareas basada en personas con prioridad > 1
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
                    <button onclick="openSeguimientoModal('${p.firebaseId}')" class="bg-orange-50 hover:bg-orange-100 text-orange-600 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex-shrink-0">
                        <i class="fas fa-check mr-1"></i> Completar
                    </button>
                </div>
                `;
            }).join('')}
        </div>
    `;
}

/**
 * openSeguimientoModal — Abre el modal para registrar un seguimiento
 */
window.openSeguimientoModal = function(memberId) {
    document.getElementById('segMemberId').value = memberId;
    document.getElementById('segObs').value = '';
    document.getElementById('segTipo').value = 'whatsapp';
    document.getElementById('seguimientoModal').classList.remove('hidden');
};

window.closeSeguimientoModal = function() {
    document.getElementById('seguimientoModal').classList.add('hidden');
};

window.closeRendicionModal = function() {
    document.getElementById('rendicionModal').classList.add('hidden');
};

/**
 * openRendicionCuentasModal — Abre el modal para la encuesta semanal
 */
window.openRendicionCuentasModal = function() {
    document.getElementById('rendQ1').checked = false;
    document.getElementById('rendQ2').checked = false;
    document.getElementById('rendObs').value = '';
    document.getElementById('rendicionModal').classList.remove('hidden');
};

// Manejar envío del formulario de seguimiento
document.addEventListener('DOMContentLoaded', () => {
    const segForm = document.getElementById('seguimientoForm');
    if (segForm) {
        segForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const memberId = document.getElementById('segMemberId').value;
            const tipo     = document.getElementById('segTipo').value;
            const obs      = document.getElementById('segObs').value.trim();
            const uid      = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.uid : 'anonimo';
            const nombre   = document.getElementById('userEmailDisplay') ? document.getElementById('userEmailDisplay').textContent : '';

            const registro = {
                fecha:   new Date().toISOString(),
                tipo,
                obs,
                liderUid:    uid,
                liderNombre: nombre
            };

            try {
                await db.ref(`seguimientos/${memberId}`).push(registro);
                closeSeguimientoModal();
                showToast('Seguimiento registrado ✓', 'success');
            } catch (err) {
                alert('Error al guardar: ' + err.message);
            }
        });
    }

    const rendForm = document.getElementById('rendicionForm');
    if (rendForm) {
        rendForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const uid    = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.uid : 'anonimo';
            const nombre = document.getElementById('userEmailDisplay') ? document.getElementById('userEmailDisplay').textContent : '';

            // Calcular semana del año como clave única
            const now = new Date();
            const start = new Date(now.getFullYear(), 0, 1);
            const week  = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
            const key   = `${now.getFullYear()}_sem${week}`;

            const rendicion = {
                fecha:          now.toISOString(),
                liderUid:       uid,
                liderNombre:    nombre,
                comunicoTodos:  document.getElementById('rendQ1').checked,
                urgente:        document.getElementById('rendQ2').checked,
                observaciones:  document.getElementById('rendObs').value.trim()
            };

            try {
                await db.ref(`rendicionCuentas/${uid}/${key}`).set(rendicion);
                closeRendicionModal();
                showToast('Rendición de cuentas enviada ✓', 'success');
                if (typeof renderRescateDashboard === 'function') renderRescateDashboard();
            } catch (err) {
                alert('Error al guardar: ' + err.message);
            }
        });
    }
});

/**
 * openExpediente — Abre el expediente del miembro (reutiliza openEditMember si existe)
 */
window.openExpediente = function(memberId) {
    if (typeof openEditMember === 'function') {
        openEditMember(memberId);
    } else {
        alert('Función de expediente no disponible.');
    }
};

/** Utilidad pequeña para mostrar notificaciones emergentes */
function showToast(msg, type = 'info') {
    const colors = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-slate-700' };
    const div = document.createElement('div');
    div.className = `fixed bottom-24 left-1/2 -translate-x-1/2 ${colors[type] || colors.info} text-white font-bold px-6 py-3 rounded-2xl shadow-2xl z-[200] text-sm transition-all`;
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}

