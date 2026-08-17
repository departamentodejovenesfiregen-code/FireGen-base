/**
 * FireGen — js/coordinacion.js
 * ─────────────────────────────────────────────────────────────
 * CENTRO DEL COORDINADOR — Etapa 4 / Build B3.275
 */

window._coordState = {
    tab: 'resumen',
    rendiciones: {},
    usuarios: {},
    prospectos: {}
};

window.renderCoordinacionDashboard = function() {
    const container = document.getElementById('coordinacion-container');
    if (!container) return;

    if (typeof hasPermission === 'function' && !hasPermission('coordinacion')) {
        container.innerHTML = `
        <div class="p-8 text-center text-red-500 font-bold">
            <i class="fas fa-lock text-3xl mb-2 block"></i>
            Acceso restringido. Esta sección es exclusiva para Admin y Coordinadores.
        </div>`;
        return;
    }

    container.innerHTML = `
    <!-- Top Nav Tabs -->
    <div class="bg-white border-b px-4 flex gap-4 overflow-x-auto text-sm">
        <button onclick="switchCoordTab('resumen')" id="coordTab_resumen" class="py-3 font-bold border-b-2 border-orange-500 text-orange-500 whitespace-nowrap"><i class="fas fa-chart-pie mr-1"></i> Resumen</button>
        <button onclick="switchCoordTab('prospectos')" id="coordTab_prospectos" class="py-3 font-bold border-b-2 border-transparent text-slate-500 hover:text-slate-800 whitespace-nowrap"><i class="fas fa-user-plus mr-1"></i> P. por alcanzar</button>
        <button onclick="switchCoordTab('asig_miembros')" id="coordTab_asig_miembros" class="py-3 font-bold border-b-2 border-transparent text-slate-500 hover:text-slate-800 whitespace-nowrap"><i class="fas fa-link mr-1"></i> Asignar Miembros</button>
        <button onclick="switchCoordTab('asig_prospectos')" id="coordTab_asig_prospectos" class="py-3 font-bold border-b-2 border-transparent text-slate-500 hover:text-slate-800 whitespace-nowrap"><i class="fas fa-user-tag mr-1"></i> Asignar P. por alcanzar</button>
        <button onclick="switchCoordTab('notificaciones')" id="coordTab_notificaciones" class="py-3 font-bold border-b-2 border-transparent text-slate-500 hover:text-slate-800 whitespace-nowrap"><i class="fas fa-paper-plane mr-1"></i> Notificar</button>
    </div>
    
    <div class="p-4 md:p-6 max-w-7xl mx-auto pb-24 space-y-6" id="coord-content">
        <div class="text-center py-10"><i class="fas fa-circle-notch fa-spin text-orange-500 text-2xl"></i></div>
    </div>
    
    <!-- Modal Persona por Alcanzar -->
    <div id="prospectoModal" class="hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[120]">
        <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 class="text-xl font-black text-slate-800 mb-4" id="prospectoModalTitle">Agregar Persona</h3>
            <form id="prospectoForm" class="space-y-4">
                <input type="hidden" id="prospectoId">
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre</label>
                    <input type="text" id="prospectoNombre" required class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-sm">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción / Referencia</label>
                    <textarea id="prospectoDesc" rows="3" required class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-sm" placeholder="Ej: Amigo de Juan. Vive cerca..."></textarea>
                </div>
                <div class="flex gap-3 pt-4">
                    <button type="button" onclick="closeProspectoModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-colors">Cancelar</button>
                    <button type="submit" class="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors">Guardar</button>
                </div>
            </form>
    </div>
    
    <!-- Modal Progreso Responsable -->
    <div id="coordProgresoModal" class="hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[120]">
        <div class="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-black text-slate-800" id="coordProgresoModalTitle">Progreso del Responsable</h3>
                <button onclick="closeCoordProgresoModal()" class="text-slate-400 hover:text-slate-600 transition-colors">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            <div id="coordProgresoContent" class="space-y-4 flex-1">
                <div class="text-center py-10"><i class="fas fa-circle-notch fa-spin text-orange-500 text-2xl"></i></div>
            </div>
        </div>
    </div>
    `;

    cargarDatosGlobalesCoordinacion();
};

window.switchCoordTab = function(tabId) {
    window._coordState.tab = tabId;
    ['resumen', 'prospectos', 'asig_miembros', 'asig_prospectos', 'notificaciones'].forEach(t => {
        const btn = document.getElementById('coordTab_' + t);
        if (btn) {
            if (t === tabId) {
                btn.classList.add('border-orange-500', 'text-orange-500');
                btn.classList.remove('border-transparent', 'text-slate-500');
            } else {
                btn.classList.remove('border-orange-500', 'text-orange-500');
                btn.classList.add('border-transparent', 'text-slate-500');
            }
        }
    });

    renderCoordContent();
};

async function cargarDatosGlobalesCoordinacion() {
    try {
        const [snapU, snapR, snapP] = await Promise.all([
            db.ref('usuarios').once('value'),
            db.ref('rendicionCuentas').once('value'),
            db.ref('rescateProspectos').once('value')
        ]);
        window._coordState.usuarios = snapU.val() || {};
        window._coordState.rendiciones = snapR.val() || {};
        window._coordState.prospectos = snapP.val() || {};

        renderCoordContent();
    } catch(e) {
        document.getElementById('coord-content').innerHTML = `<div class="text-red-500 font-bold text-center py-10">Error de permisos o conexión: ${e.message}</div>`;
    }
}

function renderCoordContent() {
    const content = document.getElementById('coord-content');
    if (!content) return;

    const tab = window._coordState.tab;
    if (tab === 'resumen') renderCoordResumen(content);
    else if (tab === 'prospectos') renderCoordProspectos(content);
    else if (tab === 'asig_miembros') renderCoordAsigMiembros(content);
    else if (tab === 'asig_prospectos') renderCoordAsigProspectos(content);
    else if (tab === 'notificaciones') renderCoordNotificaciones(content);
}

function getResponsablesActivos() {
    return Object.entries(window._coordState.usuarios).filter(([, v]) => {
        const rolNorm = typeof normalizeRole === 'function' ? normalizeRole(v.rol) : (v.rol || 'pendiente');
        return v.activo !== false && rolNorm !== 'pendiente' && v.miembroId;
    }).map(([uid, v]) => ({ uid, ...v }));
}

function _resolveNombreResponsable(usuario, mArr) {
    if (usuario.miembroId) {
        const m = mArr.find(x => x.firebaseId === usuario.miembroId);
        if (m && m.nombre) return m.nombre;
    }
    return usuario.nombre || usuario.email || '—';
}

function renderCoordResumen(container) {
    const usuarios = window._coordState.usuarios;
    const rendiciones = window._coordState.rendiciones;
    const mArr = (typeof members !== 'undefined') ? members : [];
    
    const keyActual = (typeof getCurrentSemanaKey === 'function') ? getCurrentSemanaKey() : 'sem';
    const responsables = getResponsablesActivos();

    let conAsignados = 0, urgentes = 0, rindieron = 0;
    
    const filas = responsables.map(usuario => {
        const miembroId = usuario.miembroId;
        const nombreResp = _resolveNombreResponsable(usuario, mArr);
        const asignados = mArr.filter(m => m.liderMiembroId === miembroId);
        const criticos = asignados.filter(m => {
            const s = (m.estadoAsistencia || '').toLowerCase();
            return s.includes('alejándos') || s.includes('alejado');
        });
        const rindioCuentas = rendiciones[usuario.uid] && rendiciones[usuario.uid][keyActual];

        if (asignados.length > 0) conAsignados++;
        if (criticos.length > 0) urgentes += criticos.length;
        if (rindioCuentas) rindieron++;

        return { uid: usuario.uid, miembroId, nombre: nombreResp, asignados: asignados.length, criticos: criticos.length, rindioCuentas };
    });

    filas.sort((a, b) => b.criticos - a.criticos || (a.rindioCuentas ? 1 : -1));

    container.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
                <i class="fas fa-users text-orange-400 text-xl mb-1 block"></i>
                <div class="text-2xl font-black text-slate-800">${responsables.length}</div>
                <div class="text-[10px] font-bold uppercase text-slate-400">Responsables</div>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
                <i class="fas fa-user-check text-green-400 text-xl mb-1 block"></i>
                <div class="text-2xl font-black text-slate-800">${conAsignados}</div>
                <div class="text-[10px] font-bold uppercase text-slate-400">Con asignados</div>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
                <i class="fas fa-clipboard-check text-blue-400 text-xl mb-1 block"></i>
                <div class="text-2xl font-black text-slate-800">${rindieron}</div>
                <div class="text-[10px] font-bold uppercase text-slate-400">Rindieron semana</div>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
                <i class="fas fa-exclamation-triangle text-red-400 text-xl mb-1 block"></i>
                <div class="text-2xl font-black text-slate-800">${urgentes}</div>
                <div class="text-[10px] font-bold uppercase text-slate-400">Casos urgentes</div>
            </div>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
            <div class="p-4 border-b">
                <h3 class="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <i class="fas fa-table text-slate-400"></i> Progreso por Responsable
                </h3>
            </div>
            <div class="divide-y divide-slate-100">
                ${filas.length === 0 ? '<div class="p-6 text-center text-slate-500">No hay responsables.</div>' : ''}
                ${filas.map(f => `
                <div class="flex items-center justify-between px-4 py-3 hover:bg-slate-50 gap-4 cursor-pointer" onclick="openCoordProgresoModal('${f.uid}')">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-orange-700 font-black text-base">
                            ${(f.nombre || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p class="font-bold text-slate-800 text-sm truncate">${f.nombre}</p>
                            <p class="text-[10px] text-slate-400">${f.asignados} persona(s) asignada(s)</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        ${f.criticos > 0 ? `<span class="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full uppercase">🔴 ${f.criticos} crítico(s)</span>` : ''}
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${f.rindioCuentas ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}">
                            ${f.rindioCuentas ? '✓ Rindió' : '⏳ Pendiente'}
                        </span>
                    </div>
                </div>`).join('')}
            </div>
        </div>
    `;
}

function renderCoordProspectos(container) {
    const prospectos = Object.entries(window._coordState.prospectos).map(([id, p]) => ({ id, ...p }));
    prospectos.sort((a, b) => (b.fechaRegistro || 0) - (a.fechaRegistro || 0));

    container.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-black text-slate-800">Personas por alcanzar</h3>
            <button onclick="openProspectoModal()" class="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-xl text-sm shadow-md">
                <i class="fas fa-plus mr-1"></i> Agregar
            </button>
        </div>
        <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            ${prospectos.length === 0 ? '<div class="p-8 text-center text-slate-400 italic">Aún no hay personas registradas.</div>' : ''}
            <div class="divide-y divide-slate-100">
                ${prospectos.map(p => {
                    const semanaKey = getCurrentSemanaKey();
                    let currentPlan = '<span class="text-slate-400 italic">Sin plan esta semana</span>';
                    if (p.planSemanal && p.planSemanal[semanaKey]) {
                        const s = p.planSemanal[semanaKey];
                        currentPlan = `
                            Orar: ${s.orar ? '✓' : '☐'} | 
                            Contactar: ${s.contactar ? (s.seContacto === 'Sí' ? '✓' : (s.seContacto === 'No' ? '❌' : '—')) : '☐'} | 
                            Invitar: ${s.invitar ? '✓' : '☐'} | 
                            Encuesta: ${s.encuestaCompletada ? '🟢' : '🟠'}
                        `;
                    }

                    return `
                    <div class="p-4 flex flex-col md:flex-row justify-between items-start gap-4 hover:bg-slate-50">
                        <div class="flex-1">
                            <h4 class="font-bold text-slate-800 text-sm">${p.nombre}</h4>
                            <p class="text-xs text-slate-500 mt-1">${p.descripcion || 'Sin descripción'}</p>
                            <p class="text-[10px] text-slate-400 mt-2">Fecha de registro: ${new Date(p.fechaRegistro).toLocaleDateString()}</p>
                            <div class="mt-2 text-xs text-slate-600 bg-slate-100 p-2 rounded border border-slate-200">
                                <strong>Semana ${semanaKey}:</strong> ${currentPlan}
                            </div>
                        </div>
                        <div class="flex gap-2 flex-shrink-0 mt-2 md:mt-0">
                            <button onclick="verHistoricoProspecto('${p.id}')" class="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center hover:bg-indigo-100"><i class="fas fa-history mr-1"></i> Histórico</button>
                            <button onclick="openProspectoModal('${p.id}')" class="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-100"><i class="fas fa-edit"></i></button>
                            <button onclick="deleteProspecto('${p.id}')" class="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>
    `;
}

window.verHistoricoProspecto = function(id) {
    const p = window._coordState.prospectos[id];
    if (!p || !p.planSemanal) {
        alert('Este prospecto no tiene planes semanales registrados.');
        return;
    }
    
    const semanasKeys = Object.keys(p.planSemanal).sort().reverse();
    if (semanasKeys.length === 0) {
        alert('Este prospecto no tiene planes semanales registrados.');
        return;
    }
    
    let html = `
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[120]" id="tempHistModal">
            <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl overflow-y-auto max-h-[85vh]">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-black text-slate-800"><i class="fas fa-history text-indigo-500 mr-2"></i> Histórico de Planes</h3>
                    <button onclick="document.getElementById('tempHistModal').remove()" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><i class="fas fa-times"></i></button>
                </div>
                <div class="space-y-4">
    `;
    
    semanasKeys.forEach(sk => {
        const s = p.planSemanal[sk];
        html += `
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 class="font-bold text-slate-800 mb-2 border-b border-slate-200 pb-1">Semana ${sk}</h4>
                <div class="grid grid-cols-2 gap-2 text-sm text-slate-700">
                    <div><strong>Oró:</strong> ${s.orar ? 'Sí' : 'No'}</div>
                    <div><strong>Invitó:</strong> ${s.invitar ? 'Sí' : 'No'}</div>
                    <div><strong>Contactó:</strong> ${s.contactar ? (s.seContacto === 'Sí' ? 'Sí' : (s.seContacto === 'No' ? 'Intentó pero no' : 'Pendiente')) : 'No'}</div>
                    <div><strong>Encuesta:</strong> ${s.encuestaCompletada ? 'Completada' : 'Pendiente'}</div>
                    ${s.tipoContacto ? `<div class="col-span-2"><strong>Medio:</strong> ${s.tipoContacto}</div>` : ''}
                    ${s.resultado ? `<div class="col-span-2"><strong>Resultado:</strong> ${s.resultado}</div>` : ''}
                    ${s.observaciones ? `<div class="col-span-2"><strong>Obs:</strong> ${s.observaciones}</div>` : ''}
                </div>
            </div>
        `;
    });
    
    html += `
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
};

window.openProspectoModal = function(id = null) {
    const form = document.getElementById('prospectoForm');
    if (!form) return;
    form.reset();
    document.getElementById('prospectoId').value = '';
    document.getElementById('prospectoModalTitle').innerHTML = '<i class="fas fa-user-plus text-orange-500 mr-2"></i> Agregar Persona';

    if (id && window._coordState.prospectos[id]) {
        const p = window._coordState.prospectos[id];
        document.getElementById('prospectoId').value = id;
        document.getElementById('prospectoNombre').value = p.nombre || '';
        document.getElementById('prospectoDesc').value = p.descripcion || '';
        document.getElementById('prospectoModalTitle').innerHTML = '<i class="fas fa-edit text-orange-500 mr-2"></i> Editar Persona';
    }

    form.onsubmit = async (e) => {
        e.preventDefault();
        const pId = document.getElementById('prospectoId').value || db.ref().child('rescateProspectos').push().key;
        const currentUser = auth.currentUser;
        
        const data = {
            id: pId,
            nombre: document.getElementById('prospectoNombre').value,
            descripcion: document.getElementById('prospectoDesc').value,
        };

        if (!document.getElementById('prospectoId').value) {
            data.fechaRegistro = Date.now();
            data.creadoPorUid = currentUser.uid;
            data.creadoPorNombre = currentUser.displayName || currentUser.email;
        }

        try {
            await db.ref(`rescateProspectos/${pId}`).update(data);
            window._coordState.prospectos[pId] = { ...window._coordState.prospectos[pId], ...data };
            closeProspectoModal();
            renderCoordContent();
        } catch(err) {
            alert('Error al guardar: ' + err.message);
        }
    };

    document.getElementById('prospectoModal').classList.remove('hidden');
};

window.closeProspectoModal = function() {
    document.getElementById('prospectoModal').classList.add('hidden');
};

window.deleteProspecto = async function(id) {
    if (!confirm('¿Estás seguro de eliminar este prospecto? Ya no aparecerá en el plan de rescate.')) return;
    try {
        await db.ref(`rescateProspectos/${id}`).remove();
        delete window._coordState.prospectos[id];
        renderCoordContent();
    } catch(err) {
        alert('Error al eliminar: ' + err.message);
    }
};

function renderCoordAsigMiembros(container) {
    const responsables = getResponsablesActivos();
    const mArr = (typeof members !== 'undefined') ? members : [];
    const responsablesOpts = responsables.map(l => {
        const nombreResp = _resolveNombreResponsable(l, mArr);
        return `<option value="${l.miembroId}">${nombreResp} (${l.rol})</option>`;
    }).join('');

    const elegibles = mArr.filter(m => m.estadoEspiritual !== 'Líder').sort((a,b) => (a.nombre||'').localeCompare(b.nombre||''));
    const elegiblesOpts = elegibles.map(m => {
        const label = m.liderMiembroId ? '(Asignado)' : '(Sin responsable)';
        return `<option value="${m.firebaseId}">${m.nombre} ${label}</option>`;
    }).join('');

    container.innerHTML = `
        <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-xl mx-auto">
            <h3 class="text-lg font-black text-slate-800 mb-4"><i class="fas fa-link text-orange-500 mr-2"></i> Asignación de Miembros</h3>
            <p class="text-xs text-slate-500 mb-4">Reutilizando lógica global. Asigna un miembro (no líder) a un responsable operativo.</p>
            
            <div class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Responsable</label>
                    <select id="coordAsigMiembroResp" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-sm">
                        <option value="">-- Seleccionar Responsable --</option>
                        ${responsablesOpts}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Miembro Base Maestro</label>
                    <select id="coordAsigMiembroBase" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-sm">
                        <option value="">-- Seleccionar Miembro --</option>
                        ${elegiblesOpts}
                    </select>
                </div>
                <button onclick="doCoordAsigMiembro()" class="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-md">
                    Guardar Asignación
                </button>
            </div>
        </div>
    `;
}

window.doCoordAsigMiembro = async function() {
    const liderMiembroId = document.getElementById('coordAsigMiembroResp').value;
    const memberId = document.getElementById('coordAsigMiembroBase').value;
    if (!liderMiembroId || !memberId) {
        alert("Selecciona responsable y miembro.");
        return;
    }
    if (typeof executeMemberAssignment === 'function') {
        try {
            await executeMemberAssignment(liderMiembroId, memberId);
            alert("Guardado correctamente.");
            renderCoordContent(); // refresh lists
        } catch(e) {
            alert("Error: " + e.message);
        }
    } else {
        alert("executeMemberAssignment no está definido.");
    }
};

function renderCoordAsigProspectos(container) {
    const responsables = getResponsablesActivos();
    const mArr = (typeof members !== 'undefined') ? members : [];
    const responsablesOpts = responsables.map(l => {
        const nombreResp = _resolveNombreResponsable(l, mArr);
        return `<option value="${l.miembroId}">${nombreResp}</option>`;
    }).join('');

    const prospectos = Object.entries(window._coordState.prospectos).map(([id, p]) => ({ id, ...p }));
    prospectos.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    container.innerHTML = `
        <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div class="p-4 border-b">
                <h3 class="text-lg font-black text-slate-800"><i class="fas fa-user-tag text-orange-500 mr-2"></i> Asignar Personas por alcanzar</h3>
            </div>
            <div class="divide-y divide-slate-100">
                ${prospectos.length === 0 ? '<div class="p-8 text-center text-slate-400 italic">No hay personas por alcanzar registradas.</div>' : ''}
                ${prospectos.map(p => {
                    const selectId = `selRespProsp_${p.id}`;
                    return `
                    <div class="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50">
                        <div>
                            <h4 class="font-bold text-slate-800 text-sm">${p.nombre}</h4>
                            <p class="text-[10px] text-slate-400">Asignado actualmente: ${p.responsableMiembroId ? 'Sí' : 'No'}</p>
                        </div>
                        <div class="flex items-center gap-2 w-full md:w-auto">
                            <select id="${selectId}" class="w-full md:w-48 p-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-500">
                                <option value="">-- Sin responsable --</option>
                                ${responsablesOpts.replace(`value="${p.responsableMiembroId}"`, `value="${p.responsableMiembroId}" selected`)}
                            </select>
                            <button onclick="asignarResponsableProspecto('${p.id}', document.getElementById('${selectId}').value)" class="bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold px-4 py-2 rounded-lg text-sm transition-colors">Guardar</button>
                        </div>
                    </div>`
                }).join('')}
            </div>
        </div>
    `;
}

window.asignarResponsableProspecto = async function(prospectoId, responsableMiembroId) {
    try {
        await db.ref(`rescateProspectos/${prospectoId}/responsableMiembroId`).set(responsableMiembroId || null);
        window._coordState.prospectos[prospectoId].responsableMiembroId = responsableMiembroId || null;
        alert('Asignación guardada.');
    } catch(err) {
        alert('Error: ' + err.message);
    }
};

function renderCoordNotificaciones(container) {
    const responsables = getResponsablesActivos();
    const mArr = (typeof members !== 'undefined') ? members : [];
    
    container.innerHTML = `
        <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-2xl mx-auto">
            <h3 class="text-lg font-black text-slate-800 mb-4"><i class="fas fa-paper-plane text-orange-500 mr-2"></i> Enviar Notificación Interna</h3>
            
            <div class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Destinatarios</label>
                    <div class="border border-slate-200 rounded-xl p-3 max-h-48 overflow-y-auto bg-slate-50 space-y-1">
                        <label class="flex items-center gap-2 p-1 hover:bg-slate-200 rounded cursor-pointer">
                            <input type="checkbox" id="checkAllDest" onchange="toggleAllDestinatarios(this)" class="rounded text-orange-500 focus:ring-orange-500">
                            <span class="text-sm font-bold text-slate-800">Seleccionar todos</span>
                        </label>
                        <hr class="my-1 border-slate-200">
                        ${responsables.map(l => {
                            const n = _resolveNombreResponsable(l, mArr);
                            return `<label class="flex items-center gap-2 p-1 hover:bg-slate-200 rounded cursor-pointer">
                                <input type="checkbox" name="destinatarios" value="${l.uid}" class="rounded text-orange-500 focus:ring-orange-500">
                                <span class="text-sm text-slate-700">${n} (${l.rol})</span>
                            </label>`;
                        }).join('')}
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Título</label>
                    <input type="text" id="notifTitulo" placeholder="Ej: Aviso importante" class="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-sm">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Mensaje</label>
                    <textarea id="notifMensaje" rows="3" class="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-sm"></textarea>
                </div>
                <button onclick="enviarNotificacionMultiple()" class="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-md">
                    <i class="fas fa-paper-plane mr-1"></i> Enviar Mensaje
                </button>
            </div>
        </div>
    `;
}

// Funciones de notificaciones movidas a js/notificaciones.js

window.openCoordProgresoModal = function(uid) {
    const modal = document.getElementById('coordProgresoModal');
    const content = document.getElementById('coordProgresoContent');
    const title = document.getElementById('coordProgresoModalTitle');
    if (!modal || !content) return;

    const usuario = window._coordState.usuarios[uid];
    if (!usuario) return;

    const mArr = (typeof members !== 'undefined') ? members : [];
    const nombreResp = _resolveNombreResponsable(usuario, mArr);
    title.textContent = "Progreso: " + nombreResp;

    const asignados = mArr.filter(m => m.liderMiembroId === usuario.miembroId);
    const keyActual = (typeof getCurrentSemanaKey === 'function') ? getCurrentSemanaKey() : 'sem';
    const rendicion = (window._coordState.rendiciones[uid] && window._coordState.rendiciones[uid][keyActual]) || null;

    let html = '';

    // Rendición de cuentas de la semana
    html += `
    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <h4 class="font-bold text-slate-700 text-sm mb-2"><i class="fas fa-clipboard-check text-blue-500 mr-1"></i> Rendición de Cuentas (Semana ${keyActual})</h4>
        ${rendicion ? `
            <div class="space-y-2 text-sm text-slate-600">
                <p><strong>Completó Tareas:</strong> ${rendicion.completoTareas ? '✅ Sí' : '❌ No'}</p>
                <p><strong>Actualizó Estados:</strong> ${rendicion.actualizoEstados ? '✅ Sí' : '❌ No'}</p>
                <p><strong>Oró por Grupo:</strong> ${rendicion.oroPorGrupo ? '✅ Sí' : '❌ No'}</p>
                <p><strong>Observaciones:</strong> ${rendicion.observaciones || '<em>Sin observaciones</em>'}</p>
                <p class="text-[10px] text-slate-400 mt-2">Enviado el ${new Date(rendicion.fecha).toLocaleString()}</p>
            </div>
        ` : `
            <div class="text-orange-500 font-bold text-sm bg-orange-50 p-3 rounded-lg"><i class="fas fa-clock"></i> Pendiente de enviar rendición esta semana.</div>
        `}
    </div>`;

    // Estado de las personas asignadas
    html += `
    <div class="mt-4">
        <h4 class="font-bold text-slate-700 text-sm mb-2"><i class="fas fa-users text-orange-500 mr-1"></i> Personas Asignadas (${asignados.length})</h4>
        ${asignados.length === 0 ? '<p class="text-sm text-slate-500 italic">No tiene personas asignadas.</p>' : `
            <div class="space-y-2 max-h-60 overflow-y-auto pr-2">
                ${asignados.map(m => {
                    const plan = (m.planSemanal && m.planSemanal[keyActual]) || null;
                    const estadoText = m.estadoAsistencia || 'Normal';
                    const estadoColor = estadoText.toLowerCase().includes('alej') ? 'text-red-500 font-bold' : (estadoText.toLowerCase().includes('enfri') ? 'text-orange-500 font-bold' : 'text-slate-600');
                    return `
                    <div class="bg-white p-3 rounded-xl border border-slate-200 text-sm shadow-sm">
                        <div class="flex justify-between items-start mb-1">
                            <span class="font-bold text-slate-800">${m.nombre}</span>
                            <span class="text-[10px] uppercase ${estadoColor}">${estadoText}</span>
                        </div>
                        ${plan ? (plan.tareas ? `
                            <div class="text-xs font-bold text-orange-600 mt-1 mb-1">Obj: ${escHtml(RescueCore.getWeeklyDiscipleshipPlan(m.estadoAsistencia, m.estadoEspiritual).objetivo)}</div>
                            <div class="text-[10px] text-slate-500">
                                ${Object.keys(plan.tareas).map(tid => {
                                    const t = plan.tareas[tid];
                                    return `<span class="inline-block mr-2">${t.completada ? '✅' : '☐'} ${escHtml(tid.replace(/_/g, ' '))}</span>`;
                                }).join('')}
                            </div>
                        ` : `
                            <div class="text-xs text-slate-500 mt-1">
                                Tareas (Prospecto): 
                                Orar ${plan.orar ? '✅' : '☐'} | 
                                Contactar ${plan.contactar ? (plan.seContacto === 'Sí' ? '✓' : (plan.seContacto === 'No' ? '❌' : '—')) : '☐'} | 
                                Invitar ${plan.invitar ? '✅' : '☐'}
                            </div>
                        `) : `
                            <div class="text-xs text-slate-400 mt-1 italic">Sin plan registrado para esta semana.</div>
                        `}
                    </div>
                    `;
                }).join('')}
            </div>
        `}
    </div>`;

    content.innerHTML = html;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

window.closeCoordProgresoModal = function() {
    const modal = document.getElementById('coordProgresoModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
};
