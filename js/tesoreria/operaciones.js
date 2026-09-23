/**
 * FireGen — js/tesoreria/operaciones.js
 * ─────────────────────────────────────────────────────────────
 * MÓDULO DE OPERACIONES (INTEGRACIÓN CROSS-DATABASE)
 *
 * Permite a usuarios autenticados de FireGen (base principal)
 * acceder como lectores/operadores a módulos logísticos de la
 * base de Tesorería: Checklist, Cobros, Inventario e Histórico
 * de Actividades, usando auth anónimo en el proyecto secundario.
 * ─────────────────────────────────────────────────────────────
 */

let operacionesInitialized = false;
let opTreasuryUser = null;
let opActsListener = null;
let opInvListener = null;
let opChecklistListener = null;
let opActiveSubTab = 'actividades';
let opCurrentActividades = {};
let opCurrentInventario = {};
let opChecklistItems = [];

async function initOperaciones() {
    const container = document.getElementById('operacionesMainContent');
    if (!container) return;

    if (operacionesInitialized && opTreasuryUser) {
        // Ya inicializado, solo re-renderizar
        renderOperacionesDashboard();
        return;
    }

    container.innerHTML = `
        <div class="text-center py-16">
            <i class="fas fa-circle-notch fa-spin text-orange-500 text-3xl"></i>
            <p class="mt-4 text-slate-500 font-bold text-sm">Conectando con base de operaciones...</p>
        </div>
    `;

    try {
        opTreasuryUser = await ensureTreasuryAnonymousLogin();
        operacionesInitialized = true;
        renderOperacionesDashboard();
    } catch (err) {
        container.innerHTML = `
            <div class="max-w-md mx-auto mt-10 bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
                <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
                <h3 class="font-black text-red-800 text-lg">Error de Conexión</h3>
                <p class="text-sm text-red-600 mt-2">No se pudo conectar con la base de Tesorería.</p>
                <p class="text-xs text-red-400 mt-1">${escHtml(err.message)}</p>
                <button onclick="initOperaciones()" class="mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg text-sm transition-colors">
                    <i class="fas fa-redo mr-1"></i> Reintentar
                </button>
            </div>
        `;
    }
}

function renderOperacionesDashboard() {
    const container = document.getElementById('operacionesMainContent');
    if (!container) return;

    container.innerHTML = `
        <!-- Header de Operaciones -->
        <div class="mb-6">
            <h2 class="text-2xl font-black text-slate-800 flex items-center gap-2">
                <i class="fas fa-boxes text-orange-600"></i> Operaciones
            </h2>
            <p class="text-sm text-slate-500">Logística, inventario y seguimiento de actividades.</p>
        </div>

        <!-- Sub-tabs de Operaciones -->
        <div class="flex bg-white rounded-2xl shadow-sm border p-1.5 mb-6 overflow-x-auto">
            <button onclick="switchOpSubTab('actividades')" id="op-tab-actividades"
                class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${opActiveSubTab === 'actividades' ? 'bg-orange-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}">
                <i class="fas fa-store mr-1"></i> Historial de Actividades
            </button>
            <button onclick="switchOpSubTab('checklist')" id="op-tab-checklist"
                class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${opActiveSubTab === 'checklist' ? 'bg-orange-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}">
                <i class="fas fa-tasks mr-1"></i> Checklist
            </button>
            <button onclick="switchOpSubTab('inventario')" id="op-tab-inventario"
                class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${opActiveSubTab === 'inventario' ? 'bg-orange-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}">
                <i class="fas fa-boxes mr-1"></i> Inventario
            </button>
            <button onclick="switchOpSubTab('cobros')" id="op-tab-cobros"
                class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${opActiveSubTab === 'cobros' ? 'bg-orange-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}">
                <i class="fas fa-hand-holding-usd mr-1"></i> Cobros
            </button>
        </div>

        <!-- Contenido del sub-tab -->
        <div id="operacionesSubContent">
            <div class="text-center py-10 text-slate-400 italic">Cargando...</div>
        </div>
    `;

    switchOpSubTab(opActiveSubTab);
}

function switchOpSubTab(tab) {
    opActiveSubTab = tab;

    // Actualizar estilo de tabs
    ['actividades', 'checklist', 'inventario', 'cobros'].forEach(t => {
        const btn = document.getElementById('op-tab-' + t);
        if (btn) {
            if (t === tab) {
                btn.className = 'px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 bg-orange-600 text-white shadow';
            } else {
                btn.className = 'px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 text-slate-500 hover:bg-slate-50';
            }
        }
    });

    const subContent = document.getElementById('operacionesSubContent');
    if (!subContent) return;

    subContent.innerHTML = '<div class="text-center py-10 text-slate-400 italic"><i class="fas fa-circle-notch fa-spin mr-2"></i>Cargando...</div>';

    if (tab === 'actividades') renderOpActividades();
    else if (tab === 'checklist') renderOpChecklist();
    else if (tab === 'inventario') renderOpInventario();
    else if (tab === 'cobros') renderOpCobros();
}

// ══════════════════════════════════════════════════════════════
// ACTIVIDADES HISTORIAL (Solo lectura)
// ══════════════════════════════════════════════════════════════

function renderOpActividades() {
    if (!treasuryDb) return;

    if (opActsListener) treasuryDb.ref('actividades').off('value', opActsListener);

    opActsListener = treasuryDb.ref('actividades').on('value', snap => {
        opCurrentActividades = snap.val() || {};
        actualizarUIOpActividades();
    });
}

function actualizarUIOpActividades() {
    const subContent = document.getElementById('operacionesSubContent');
    if (!subContent || opActiveSubTab !== 'actividades') return;

    const actsArr = Object.entries(opCurrentActividades);

    if (actsArr.length === 0) {
        subContent.innerHTML = `
            <div class="bg-slate-50 rounded-2xl p-12 text-center border border-slate-200">
                <i class="fas fa-store text-slate-300 text-5xl mb-4"></i>
                <p class="text-slate-500 font-bold">No hay actividades registradas aún.</p>
            </div>
        `;
        return;
    }

    // Agrupar por periodo
    const porPeriodo = {};
    actsArr.forEach(([id, act]) => {
        const periodo = act.periodo || 'Sin Periodo';
        if (!porPeriodo[periodo]) porPeriodo[periodo] = [];
        porPeriodo[periodo].push({ id, ...act });
    });

    // Ordenar periodos de más reciente a más antiguo
    const periodosOrdenados = Object.keys(porPeriodo).sort((a, b) => b.localeCompare(a));

    let html = '';

    periodosOrdenados.forEach(periodo => {
        const acts = porPeriodo[periodo];
        let totalInversion = 0;
        let totalIngreso = 0;
        let totalGanancia = 0;

        acts.forEach(act => {
            let inversionAct = 0;
            if (act.gastos) {
                Object.values(act.gastos).forEach(g => {
                    if (g.origen === 'comprar' && g.comprado) {
                        inversionAct += parseFloat(g.cantidad) * parseFloat(g.precio);
                    }
                });
            }
            const pCob = parseInt(act.platosCobrados) || 0;
            const precio = parseFloat(act.precio) || 0;
            const ingresoAct = pCob * precio;

            act._inversion = inversionAct;
            act._ingreso = ingresoAct;
            act._ganancia = ingresoAct - inversionAct;

            totalInversion += inversionAct;
            totalIngreso += ingresoAct;
            totalGanancia += act._ganancia;
        });

        html += `
        <div class="mb-8">
            <div class="flex justify-between items-center mb-4">
                <h3 class="font-black text-slate-800 text-lg uppercase tracking-wider flex items-center gap-2">
                    <i class="fas fa-calendar-alt text-orange-500"></i> ${escHtml(periodo)}
                </h3>
                <span class="text-xs font-bold ${totalGanancia >= 0 ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'} px-3 py-1 rounded-full">
                    Rentabilidad: $${totalGanancia.toFixed(2)}
                </span>
            </div>

            <!-- KPIs del periodo -->
            <div class="grid grid-cols-3 gap-3 mb-4">
                <div class="bg-red-50 p-3 rounded-xl border border-red-200 text-center">
                    <div class="text-[10px] font-bold text-red-600 uppercase">Inversión</div>
                    <div class="text-lg font-black text-red-700">$${totalInversion.toFixed(2)}</div>
                </div>
                <div class="bg-green-50 p-3 rounded-xl border border-green-200 text-center">
                    <div class="text-[10px] font-bold text-green-600 uppercase">Ingreso</div>
                    <div class="text-lg font-black text-green-700">$${totalIngreso.toFixed(2)}</div>
                </div>
                <div class="bg-blue-50 p-3 rounded-xl border border-blue-200 text-center">
                    <div class="text-[10px] font-bold text-blue-600 uppercase">Ganancia</div>
                    <div class="text-lg font-black ${totalGanancia >= 0 ? 'text-blue-700' : 'text-red-600'}">$${totalGanancia.toFixed(2)}</div>
                </div>
            </div>

            <!-- Tarjetas de actividades -->
            <div class="space-y-3">
        `;

        acts.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).forEach(act => {
            const estadoBadge = act.estado === 'CERRADA'
                ? '<span class="text-[9px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">✓ CERRADA</span>'
                : act.estado === 'EN_CURSO'
                    ? '<span class="text-[9px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">EN CURSO</span>'
                    : '<span class="text-[9px] font-bold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded">PENDIENTE</span>';

            const platosPrep = parseInt(act.platosPreparados) || 0;
            const platosVend = parseInt(act.platosVendidos) || 0;
            const platosCob = parseInt(act.platosCobrados) || 0;

            html += `
                <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <h4 class="font-black text-slate-800 uppercase text-sm">${escHtml(act.nombre)}</h4>
                            <div class="text-[10px] text-slate-400 font-bold">${act.fecha ? formatDateShort(act.fecha) : 'Sin fecha'}</div>
                        </div>
                        <div class="flex items-center gap-2">
                            ${estadoBadge}
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-2 text-xs mb-3">
                        <div class="bg-slate-50 p-2 rounded-lg text-center">
                            <div class="text-[9px] text-slate-400 uppercase font-bold">Preparados</div>
                            <div class="font-black text-slate-700">${platosPrep}</div>
                        </div>
                        <div class="bg-slate-50 p-2 rounded-lg text-center">
                            <div class="text-[9px] text-slate-400 uppercase font-bold">Vendidos</div>
                            <div class="font-black text-slate-700">${platosVend}</div>
                        </div>
                        <div class="bg-slate-50 p-2 rounded-lg text-center">
                            <div class="text-[9px] text-slate-400 uppercase font-bold">Cobrados</div>
                            <div class="font-black text-slate-700">${platosCob}</div>
                        </div>
                    </div>

                    <div class="flex justify-between items-center border-t border-slate-100 pt-2">
                        <div class="flex gap-4 text-xs">
                            <span class="text-red-600 font-bold"><i class="fas fa-arrow-down mr-0.5"></i>$${act._inversion.toFixed(2)}</span>
                            <span class="text-green-600 font-bold"><i class="fas fa-arrow-up mr-0.5"></i>$${act._ingreso.toFixed(2)}</span>
                        </div>
                        <span class="font-black text-sm ${act._ganancia >= 0 ? 'text-blue-700' : 'text-red-600'}">
                            ${act._ganancia >= 0 ? '+' : ''}$${act._ganancia.toFixed(2)}
                        </span>
                    </div>
                </div>
            `;
        });

        html += `
            </div>
        </div>
        `;
    });

    subContent.innerHTML = html;
}

// ══════════════════════════════════════════════════════════════
// CHECKLIST (Solo lectura — extraída de actividades)
// ══════════════════════════════════════════════════════════════

function renderOpChecklist() {
    if (!treasuryDb) return;

    // Tomar el período actual si existe, o el más reciente
    const periodoRef = treasuryCurrentPeriod || new Date().toISOString().slice(0, 7);

    if (opChecklistListener) treasuryDb.ref('actividades').off('value', opChecklistListener);

    opChecklistListener = treasuryDb.ref('actividades')
        .orderByChild('periodo')
        .equalTo(periodoRef)
        .on('value', snap => {
            const actData = snap.val() || {};
            opChecklistItems = [];

            Object.entries(actData).forEach(([actId, act]) => {
                if (act.gastos) {
                    Object.entries(act.gastos).forEach(([gastoId, g]) => {
                        if (g.origen !== 'inventario') {
                            opChecklistItems.push({
                                actId,
                                actNombre: act.nombre,
                                gastoId,
                                actCerrada: act.estado === 'CERRADA',
                                ...g
                            });
                        }
                    });
                }
            });

            actualizarUIOpChecklist(periodoRef);
        });
}

function actualizarUIOpChecklist(periodo) {
    const subContent = document.getElementById('operacionesSubContent');
    if (!subContent || opActiveSubTab !== 'checklist') return;

    if (opChecklistItems.length === 0) {
        subContent.innerHTML = `
            <div class="bg-slate-50 rounded-2xl p-12 text-center border border-slate-200">
                <i class="fas fa-tasks text-slate-300 text-5xl mb-4"></i>
                <p class="text-slate-500 font-bold">No hay items en la checklist para el período ${escHtml(periodo)}.</p>
                <p class="text-xs text-slate-400 mt-1">Los items se generan automáticamente desde las actividades.</p>
            </div>
        `;
        return;
    }

    // Agrupar por actividad
    const porActividad = {};
    opChecklistItems.forEach(item => {
        if (!porActividad[item.actNombre]) porActividad[item.actNombre] = [];
        porActividad[item.actNombre].push(item);
    });

    let html = `
        <div class="mb-4 flex justify-between items-center">
            <h3 class="font-black text-slate-800 uppercase text-sm">
                <i class="fas fa-tasks text-blue-700 mr-1"></i> Checklist de Preparación — ${escHtml(periodo)}
            </h3>
            <span class="text-xs font-bold text-slate-500">${opChecklistItems.length} ingrediente(s)</span>
        </div>
    `;

    Object.entries(porActividad).forEach(([actNombre, items]) => {
        const todosComprados = items.every(i => i.comprado);

        html += `
        <div class="bg-white border ${todosComprados ? 'border-green-200' : 'border-slate-200'} rounded-xl mb-4 overflow-hidden shadow-sm">
            <div class="px-4 py-3 border-b ${todosComprados ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'} flex justify-between items-center">
                <h4 class="font-black text-sm uppercase ${todosComprados ? 'text-green-800' : 'text-slate-800'}">${escHtml(actNombre)}</h4>
                ${todosComprados ? '<span class="text-[9px] font-bold text-green-700 bg-green-200 px-2 py-0.5 rounded">✓ COMPLETO</span>' : ''}
            </div>
            <div class="p-3 space-y-2">
        `;

        items.forEach(item => {
            const comprado = item.comprado;
            html += `
                <div class="flex items-center gap-3 py-2 px-2 rounded-lg ${comprado ? 'bg-green-50/50' : 'bg-white'} hover:bg-slate-50 transition-colors">
                    <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${comprado ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}">
                        ${comprado ? '<i class="fas fa-check"></i>' : '?'}
                    </div>
                    <div class="flex-1">
                        <div class="font-bold text-slate-800 text-sm ${comprado ? 'line-through text-slate-400' : ''}">${escHtml(item.ingrediente || item.descripcion || 'Sin nombre')}</div>
                        <div class="text-[10px] text-slate-400 font-bold">${item.cantidad || ''} ${item.unidad || ''} | $${(parseFloat(item.precio) || 0).toFixed(2)} c/u</div>
                    </div>
                    <div class="text-right">
                        <div class="text-xs font-black ${comprado ? 'text-green-600' : 'text-slate-600'}">$${((parseFloat(item.cantidad) || 0) * (parseFloat(item.precio) || 0)).toFixed(2)}</div>
                    </div>
                </div>
            `;
        });

        html += `
            </div>
        </div>
        `;
    });

    subContent.innerHTML = html;
}

// ══════════════════════════════════════════════════════════════
// INVENTARIO (Lectura con interacción)
// ══════════════════════════════════════════════════════════════

function renderOpInventario() {
    if (!treasuryDb) return;

    if (opInvListener) treasuryDb.ref('inventario').off('value', opInvListener);

    opInvListener = treasuryDb.ref('inventario').on('value', snap => {
        opCurrentInventario = snap.val() || {};
        actualizarUIOpInventario();
    });
}

function actualizarUIOpInventario() {
    const subContent = document.getElementById('operacionesSubContent');
    if (!subContent || opActiveSubTab !== 'inventario') return;

    const items = Object.entries(opCurrentInventario);

    if (items.length === 0) {
        subContent.innerHTML = `
            <div class="bg-slate-50 rounded-2xl p-12 text-center border border-slate-200">
                <i class="fas fa-box-open text-slate-300 text-5xl mb-4"></i>
                <p class="text-slate-500 font-bold">El inventario está vacío.</p>
                <p class="text-xs text-slate-400 mt-1">Los artículos se gestionan desde Tesorería.</p>
            </div>
        `;
        return;
    }

    let html = `
        <div class="mb-4">
            <h3 class="font-black text-slate-800 uppercase text-sm">
                <i class="fas fa-boxes text-purple-700 mr-1"></i> Inventario de la Tesorería
            </h3>
            <p class="text-xs text-slate-500">${items.length} artículo(s) registrados</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    `;

    items.sort((a, b) => (a[1].descripcion || '').localeCompare(b[1].descripcion || '')).forEach(([id, item]) => {
        const cant = parseFloat(item.cantidad) || 0;
        const stockBajo = cant <= (parseFloat(item.stockMinimo) || 2);

        html += `
            <div class="bg-white p-4 rounded-xl border ${stockBajo ? 'border-red-200 bg-red-50/30' : 'border-slate-200'} shadow-sm">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-black text-slate-800 text-sm uppercase">${escHtml(item.descripcion || 'Sin nombre')}</h4>
                    ${stockBajo ? '<span class="text-[9px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded animate-pulse">BAJO</span>' : ''}
                </div>
                <div class="flex items-baseline gap-1">
                    <span class="text-2xl font-black ${stockBajo ? 'text-red-600' : 'text-slate-800'}">${cant}</span>
                    <span class="text-xs font-bold text-slate-400">${escHtml(item.unidad || 'unidades')}</span>
                </div>
                ${item.categoria ? `<div class="text-[10px] text-slate-400 font-bold mt-1"><i class="fas fa-tag mr-0.5"></i>${escHtml(item.categoria)}</div>` : ''}
            </div>
        `;
    });

    html += '</div>';
    subContent.innerHTML = html;
}

// ══════════════════════════════════════════════════════════════
// COBROS / DEUDAS (Solo lectura)
// ══════════════════════════════════════════════════════════════

function renderOpCobros() {
    if (!treasuryDb) return;

    treasuryDb.ref('deudas').once('value').then(snap => {
        const deudas = snap.val() || {};
        actualizarUIOpCobros(deudas);
    });
}

function actualizarUIOpCobros(deudas) {
    const subContent = document.getElementById('operacionesSubContent');
    if (!subContent || opActiveSubTab !== 'cobros') return;

    const items = Object.entries(deudas);

    if (items.length === 0) {
        subContent.innerHTML = `
            <div class="bg-slate-50 rounded-2xl p-12 text-center border border-slate-200">
                <i class="fas fa-check-circle text-green-300 text-5xl mb-4"></i>
                <p class="text-slate-500 font-bold">No hay cobros pendientes.</p>
            </div>
        `;
        return;
    }

    const pendientes = items.filter(([, d]) => d.estado !== 'PAGADA');
    const pagadas = items.filter(([, d]) => d.estado === 'PAGADA');

    let totalPendiente = 0;
    pendientes.forEach(([, d]) => {
        totalPendiente += (parseFloat(d.montoOriginal) || 0) - (parseFloat(d.montoPagado) || 0);
    });

    let html = `
        <div class="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h3 class="font-black text-slate-800 uppercase text-sm">
                    <i class="fas fa-hand-holding-usd text-orange-600 mr-1"></i> Estado de Cobros
                </h3>
                <p class="text-xs text-slate-500">${pendientes.length} pendiente(s), ${pagadas.length} pagada(s)</p>
            </div>
            <div class="bg-orange-100 text-orange-800 px-4 py-2 rounded-xl font-black text-sm">
                Total Pendiente: $${totalPendiente.toFixed(2)}
            </div>
        </div>
    `;

    if (pendientes.length > 0) {
        html += '<div class="space-y-3 mb-6">';
        pendientes.forEach(([id, d]) => {
            const original = parseFloat(d.montoOriginal) || 0;
            const pagado = parseFloat(d.montoPagado) || 0;
            const restante = original - pagado;
            const progreso = original > 0 ? (pagado / original) * 100 : 0;

            html += `
                <div class="bg-white p-4 rounded-xl border border-orange-200 shadow-sm">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <h4 class="font-black text-slate-800 text-sm">${escHtml(d.nombre || 'Sin nombre')}</h4>
                            <div class="text-[10px] text-slate-400 font-bold">${escHtml(d.concepto || '')}</div>
                        </div>
                        <span class="font-black text-orange-600">$${restante.toFixed(2)}</span>
                    </div>
                    <div class="w-full bg-slate-200 rounded-full h-2 mb-1">
                        <div class="bg-orange-500 h-2 rounded-full transition-all" style="width:${progreso}%"></div>
                    </div>
                    <div class="flex justify-between text-[10px] text-slate-400 font-bold">
                        <span>Pagado: $${pagado.toFixed(2)}</span>
                        <span>Total: $${original.toFixed(2)}</span>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }

    if (pagadas.length > 0) {
        html += `
            <details class="bg-green-50 rounded-xl border border-green-200 overflow-hidden">
                <summary class="px-4 py-3 cursor-pointer text-xs font-black text-green-700 uppercase hover:bg-green-100 transition-colors">
                    <i class="fas fa-check-circle mr-1"></i> Deudas Pagadas (${pagadas.length})
                </summary>
                <div class="p-3 space-y-2">
        `;
        pagadas.forEach(([id, d]) => {
            html += `
                    <div class="flex justify-between items-center py-2 px-3 bg-white rounded-lg border border-green-100">
                        <div>
                            <span class="font-bold text-slate-600 text-sm line-through">${escHtml(d.nombre || '')}</span>
                            <span class="text-[10px] text-slate-400 ml-2">${escHtml(d.concepto || '')}</span>
                        </div>
                        <span class="text-xs font-bold text-green-600">$${(parseFloat(d.montoOriginal) || 0).toFixed(2)}</span>
                    </div>
            `;
        });
        html += '</div></details>';
    }

    subContent.innerHTML = html;
}

// ══════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════

window.initOperaciones = initOperaciones;
window.switchOpSubTab = switchOpSubTab;
