
// tesoreria-caja.js
let cajaListener = null;
let movsListener = null;
let actsListenerCaja = null;
let currentCaja = {};
let currentMovimientos = {};
let currentDeudas = {};
let currentActividadesCaja = {};
let editandoMovId = null; // Para saber si estamos editando

function renderTesoreriaCaja() {
    const container = document.getElementById('treasurySubContent');
    if (!container) return;
    
    container.innerHTML = `
        <div id="cajaStatusLoader" class="text-center py-10 text-slate-400 italic">Verificando estado de la caja...</div>
    `;
    
    iniciarListenerCaja();
}

function iniciarListenerCaja() {
    if (!treasuryDb || !treasuryCurrentPeriod) return;
    
    if (cajaListener) treasuryDb.ref('periodos/' + treasuryCurrentPeriod).off('value', cajaListener);
    if (movsListener) treasuryDb.ref('movimientos/' + treasuryCurrentPeriod).off('value', movsListener);
    if (actsListenerCaja) treasuryDb.ref('actividades').off('value', actsListenerCaja);
    
    cajaListener = treasuryDb.ref('periodos/' + treasuryCurrentPeriod).on('value', snap => {
        currentCaja = snap.val() || null;
        verificarRenderCaja();
    });
    
    movsListener = treasuryDb.ref('movimientos/' + treasuryCurrentPeriod).on('value', snap => {
        currentMovimientos = snap.val() || {};
        verificarRenderCaja();
    });
    
    actsListenerCaja = treasuryDb.ref('actividades').orderByChild('periodo').equalTo(treasuryCurrentPeriod).on('value', snap => {
        currentActividadesCaja = snap.val() || {};
        verificarRenderCaja();
    });
}

function verificarRenderCaja() {
    const c = document.getElementById('treasurySubContent');
    if(!c) return;
    
    // Solo renderizar si la pestaña activa es Caja
    const btnCaja = document.getElementById('tsub-caja');
    if (!btnCaja || !btnCaja.classList.contains('border-blue-900')) return;
    
    if(!currentCaja) {
        renderMesNoAbierto(c);
    } else {
        renderCajaOperativa(c);
    }
}

function renderMesNoAbierto(container) {
    container.innerHTML = `
        <div class="max-w-md mx-auto bg-slate-50 border border-slate-200 p-8 rounded-xl text-center shadow-sm">
            <div class="w-16 h-16 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                <i class="fas fa-lock"></i>
            </div>
            <h2 class="text-xl font-black text-slate-800 uppercase mb-2">Mes Bloqueado</h2>
            <p class="text-sm text-slate-600 mb-6">El período <b>${treasuryCurrentPeriod}</b> aún no ha sido activado.</p>
            <div class="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-xs font-bold text-yellow-800 text-left">
                <i class="fas fa-exclamation-triangle mr-1"></i> 
                Usa el botón <b>"COMENZAR MES"</b> en la parte superior para activar este período y poder registrar movimientos.
            </div>
        </div>
    `;
}

function renderCajaOperativa(container) {
    // ============ CALCULAR MOVIMIENTOS ============
    let ingresos = 0;
    let egresos = 0;
    
    const allMovs = Object.entries(currentMovimientos);
    const movsConfirmados = allMovs.filter(([k, m]) => m.estado === 'CONFIRMADO').map(([k, m]) => ({...m, _key: k}));
    const movsPendientes = allMovs.filter(([k, m]) => m.estado === 'PENDIENTE' && m.origen === 'manual').map(([k, m]) => ({...m, _key: k}));
    
    movsConfirmados.forEach(m => {
        if(m.tipo === 'INGRESO') ingresos += parseFloat(m.monto);
        else if(m.tipo === 'EGRESO') egresos += parseFloat(m.monto);
    });
    
    const saldoIn = parseFloat(currentCaja.saldoInicial) || 0;
    const saldoDisp = saldoIn + ingresos - egresos;
    
    // ============ CALCULAR OFRENDAS ============
    const movsOfrendas = movsConfirmados.filter(m => m.categoria === 'Ofrenda' && m.tipo === 'INGRESO');
    const totalOfrendas = movsOfrendas.reduce((s, m) => s + parseFloat(m.monto), 0);
    const diezmoExtraidoOfrendas = movsConfirmados.filter(m => m.categoria === 'Diezmo de Ofrendas').reduce((s, m) => {
        return s + (m.tipo === 'EGRESO' ? parseFloat(m.monto) : -parseFloat(m.monto));
    }, 0);
    const diezmoFaltanteOfrendas = (totalOfrendas * 0.10) - diezmoExtraidoOfrendas;
    
    // ============ CALCULAR GANANCIAS DE ACTIVIDADES ============
    const actsArr = Object.entries(currentActividadesCaja);
    let totalGananciasActs = 0;
    let actividadesConGanancia = [];
    
    actsArr.forEach(([id, act]) => {
        if (act.estado === 'CERRADA' || act.consumoConfirmado) {
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
            const gananciaAct = ingresoAct - inversionAct;
            
            actividadesConGanancia.push({
                id, nombre: act.nombre, fecha: act.fecha,
                inversion: inversionAct, ingreso: ingresoAct,
                ganancia: gananciaAct, cerrada: act.estado === 'CERRADA'
            });
            totalGananciasActs += gananciaAct;
        }
    });
    
    const diezmoExtraidoActividades = movsConfirmados.filter(m => m.categoria === 'Diezmo de Actividades').reduce((s, m) => {
        return s + (m.tipo === 'EGRESO' ? parseFloat(m.monto) : -parseFloat(m.monto));
    }, 0);
    const diezmoFaltanteActividades = (totalGananciasActs > 0 ? totalGananciasActs * 0.10 : 0) - diezmoExtraidoActividades;
    
    // ============ RENDER MOVIMIENTOS CONFIRMADOS ============
    let htmlMovs = '';
    if(movsConfirmados.length === 0) {
        htmlMovs = `<div class="text-center py-6 text-slate-400 italic">No hay movimientos confirmados.</div>`;
    } else {
        movsConfirmados.sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).forEach(m => {
            const isIngreso = m.tipo === 'INGRESO';
            const esManual = m.origen === 'manual';
            htmlMovs += `
                <div class="flex justify-between items-center py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors px-2 rounded">
                    <div class="flex-1">
                        <div class="font-bold text-slate-800 text-sm">${escHtml(m.descripcion)}</div>
                        <div class="text-[10px] text-slate-400 font-bold">${formatDateShort(m.fecha)} | ${escHtml(m.categoria)} | <i class="fas fa-user"></i> ${escHtml(m.usuario.split('@')[0])}</div>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="font-black ${isIngreso ? 'text-green-600' : 'text-red-600'}">
                            ${isIngreso ? '+' : '-'}$${parseFloat(m.monto).toFixed(2)}
                        </div>
                        ${(esManual || m.origen === 'diezmo') && canEditTreasury() ? `
                            ${esManual ? `<button onclick="abrirEditarMovimiento('${m._key}')" class="text-blue-500 hover:text-blue-700 text-xs" title="Editar"><i class="fas fa-edit"></i></button>` : ''}
                            ${m.origen === 'diezmo' ? `<button onclick="eliminarMovimientoManual('${m._key}')" class="text-red-400 hover:text-red-600 text-xs" title="Eliminar Diezmo"><i class="fas fa-trash"></i></button>` : ''}
                        ` : ''}
                    </div>
                </div>
            `;
        });
    }
    
    // ============ RENDER MOVIMIENTOS PENDIENTES ============
    let htmlPendientes = '';
    if (movsPendientes.length > 0) {
        movsPendientes.sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).forEach(m => {
            const isIngreso = m.tipo === 'INGRESO';
            htmlPendientes += `
                <div class="flex justify-between items-center py-3 border-b border-yellow-100 px-2 rounded bg-yellow-50/50">
                    <div class="flex-1">
                        <div class="font-bold text-slate-800 text-sm">${escHtml(m.descripcion)}</div>
                        <div class="text-[10px] text-slate-400 font-bold">${formatDateShort(m.fecha)} | ${escHtml(m.categoria)} | <i class="fas fa-user"></i> ${escHtml(m.usuario.split('@')[0])}</div>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="font-black ${isIngreso ? 'text-green-600' : 'text-red-600'} text-sm">
                            ${isIngreso ? '+' : '-'}$${parseFloat(m.monto).toFixed(2)}
                        </div>
                        <span class="bg-yellow-200 text-yellow-800 text-[9px] font-bold px-1.5 py-0.5 rounded">PENDIENTE</span>
                        ${canEditTreasury() ? `
                        <button onclick="confirmarMovimientoManual('${m._key}')" class="text-green-600 hover:text-green-800 text-xs" title="Confirmar"><i class="fas fa-check-circle"></i></button>
                        <button onclick="abrirEditarMovimiento('${m._key}')" class="text-blue-500 hover:text-blue-700 text-xs" title="Editar"><i class="fas fa-edit"></i></button>
                        <button onclick="eliminarMovimientoManual('${m._key}')" class="text-red-500 hover:text-red-700 text-xs" title="Eliminar"><i class="fas fa-trash"></i></button>
                        ` : ''}
                    </div>
                </div>
            `;
        });
    }
    
    // ============ HTML PRINCIPAL ============
    container.innerHTML = `
        <!-- Resumen de Saldos -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Saldo Inicial</div>
                <div class="text-2xl font-black text-slate-700">$${saldoIn.toFixed(2)}</div>
                <div class="text-[9px] text-slate-400 mt-1 uppercase">${currentCaja.fuenteSaldoInicial || ''}</div>
            </div>
            <div class="bg-green-50 p-6 rounded-2xl border border-green-200">
                <div class="text-xs font-bold text-green-700 uppercase tracking-wider mb-1">Ingresos (Conf.)</div>
                <div class="text-2xl font-black text-green-700">+$${ingresos.toFixed(2)}</div>
            </div>
            <div class="bg-red-50 p-6 rounded-2xl border border-red-200">
                <div class="text-xs font-bold text-red-700 uppercase tracking-wider mb-1">Egresos (Conf.)</div>
                <div class="text-2xl font-black text-red-700">-$${egresos.toFixed(2)}</div>
            </div>
        </div>
        
        <!-- Saldo Oficial -->
        <div class="bg-blue-900 text-white p-6 rounded-2xl shadow-lg flex justify-between items-center mb-8">
            <div>
                <div class="text-xs font-bold text-blue-200 uppercase tracking-widest mb-1">Saldo Oficial Disponible</div>
                <div class="text-5xl font-black">$${saldoDisp.toFixed(2)}</div>
            </div>
            <div class="text-blue-300 opacity-50 hidden sm:block">
                <i class="fas fa-wallet text-6xl"></i>
            </div>
        </div>
        
        <!-- ====== BLOQUES DE FONDOS (Ofrendas y Actividades) ====== -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            
            <!-- BLOQUE OFRENDAS -->
            <div class="bg-yellow-50 p-5 rounded-2xl border-2 border-yellow-200 shadow-sm">
                <div class="flex justify-between items-center mb-3">
                    <h4 class="font-black text-yellow-800 uppercase text-sm"><i class="fas fa-pray mr-1"></i> Fondo de Ofrendas</h4>
                    <span class="text-xs font-bold text-yellow-600">${movsOfrendas.length} ofrenda(s)</span>
                </div>
                <div class="text-3xl font-black text-yellow-800 mb-3">$${totalOfrendas.toFixed(2)}</div>
                ${movsOfrendas.length > 1 ? `
                <div class="text-xs text-yellow-700 mb-2 font-bold">Total acumulado de ${movsOfrendas.length} ofrendas</div>
                ` : ''}
                <div class="border-t border-yellow-200 pt-3 flex flex-col gap-2">
                    <div class="flex justify-between items-center">
                        <span class="text-xs font-bold text-yellow-800">Diezmo Ideal (10%):</span>
                        <span class="font-black text-yellow-900">$${(totalOfrendas * 0.10).toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-xs font-bold text-green-700">Diezmo Extraído:</span>
                        <span class="font-black text-green-800">$${diezmoExtraidoOfrendas.toFixed(2)}</span>
                    </div>
                    ${diezmoFaltanteOfrendas > 0.01 && canEditTreasury() ? `
                    <button onclick="extraerDiezmo('ofrendas', ${diezmoFaltanteOfrendas})" class="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-3 rounded-lg text-xs shadow transition-colors mt-2">
                        <i class="fas fa-hand-holding-usd mr-1"></i> Extraer Diferencia ($${diezmoFaltanteOfrendas.toFixed(2)})
                    </button>
                    ` : diezmoFaltanteOfrendas < -0.01 && canEditTreasury() ? `
                    <button onclick="revertirDiezmo('ofrendas', ${Math.abs(diezmoFaltanteOfrendas)})" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-lg text-xs shadow transition-colors mt-2">
                        <i class="fas fa-undo mr-1"></i> Revertir Exceso ($${Math.abs(diezmoFaltanteOfrendas).toFixed(2)})
                    </button>
                    ` : (totalOfrendas > 0 && Math.abs(diezmoFaltanteOfrendas) <= 0.01) ? `
                    <div class="bg-green-100 text-green-700 p-2 rounded-lg text-xs font-bold text-center mt-2">
                        <i class="fas fa-check-circle"></i> Diezmo al día
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- BLOQUE GANANCIAS ACTIVIDADES -->
            <div class="bg-blue-50 p-5 rounded-2xl border-2 border-blue-200 shadow-sm">
                <div class="flex justify-between items-center mb-3">
                    <h4 class="font-black text-blue-800 uppercase text-sm"><i class="fas fa-store mr-1"></i> Ganancias de Actividades</h4>
                    <span class="text-xs font-bold text-blue-600">${actividadesConGanancia.length} actividad(es)</span>
                </div>
                <div class="text-3xl font-black ${totalGananciasActs >= 0 ? 'text-blue-800' : 'text-red-600'} mb-3">$${totalGananciasActs.toFixed(2)}</div>
                ${actividadesConGanancia.length >= 2 ? `
                <div class="text-xs text-blue-700 mb-2 font-bold">Total consolidado de ${actividadesConGanancia.length} actividades</div>
                ` : ''}
                <div class="border-t border-blue-200 pt-3 flex flex-col gap-2">
                    ${actividadesConGanancia.length > 0 ? `
                    <button onclick="verDetalleActividadesCaja()" class="w-full bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold py-2 px-3 rounded-lg text-xs shadow-sm transition-colors">
                        <i class="fas fa-eye mr-1"></i> Ver Detalle de Actividades
                    </button>
                    ` : ''}
                    <div class="flex justify-between items-center">
                        <span class="text-xs font-bold text-blue-800">Diezmo Ideal (10%):</span>
                        <span class="font-black text-blue-900">$${(totalGananciasActs > 0 ? totalGananciasActs * 0.10 : 0).toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-xs font-bold text-green-700">Diezmo Extraído:</span>
                        <span class="font-black text-green-800">$${diezmoExtraidoActividades.toFixed(2)}</span>
                    </div>
                    ${diezmoFaltanteActividades > 0.01 && canEditTreasury() ? `
                    <button onclick="extraerDiezmo('actividades', ${diezmoFaltanteActividades})" class="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-3 rounded-lg text-xs shadow transition-colors mt-2">
                        <i class="fas fa-hand-holding-usd mr-1"></i> Extraer Diferencia ($${diezmoFaltanteActividades.toFixed(2)})
                    </button>
                    ` : diezmoFaltanteActividades < -0.01 && canEditTreasury() ? `
                    <button onclick="revertirDiezmo('actividades', ${Math.abs(diezmoFaltanteActividades)})" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-lg text-xs shadow transition-colors mt-2">
                        <i class="fas fa-undo mr-1"></i> Revertir Exceso ($${Math.abs(diezmoFaltanteActividades).toFixed(2)})
                    </button>
                    ` : (totalGananciasActs > 0 && Math.abs(diezmoFaltanteActividades) <= 0.01) ? `
                    <div class="bg-green-100 text-green-700 p-2 rounded-lg text-xs font-bold text-center mt-2">
                        <i class="fas fa-check-circle"></i> Diezmo al día
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
        
        <!-- Movimientos Pendientes de Confirmación -->
        ${movsPendientes.length > 0 ? `
        <div class="bg-yellow-50 rounded-xl shadow-sm border-2 border-yellow-300 mb-6">
            <div class="px-6 py-4 border-b border-yellow-200 bg-yellow-100 flex justify-between items-center">
                <h3 class="font-black text-yellow-800 text-sm uppercase"><i class="fas fa-clock mr-1"></i> Movimientos Pendientes de Confirmación (${movsPendientes.length})</h3>
            </div>
            <div class="p-4 max-h-[300px] overflow-y-auto">
                ${htmlPendientes}
            </div>
        </div>
        ` : ''}
        
        <!-- Lista de movimientos confirmados -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200">
            <div class="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 class="font-black text-slate-800 text-lg uppercase">Movimientos Confirmados</h3>
                ${canEditTreasury() ? `
                <button onclick="abrirModalMovimientoManual()" class="bg-blue-900 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded-lg text-xs shadow transition-colors">
                    <i class="fas fa-plus mr-1"></i> Nuevo Movimiento
                </button>
                ` : ''}
            </div>
            <div class="p-4 max-h-[400px] overflow-y-auto">
                ${htmlMovs}
            </div>
        </div>
        
        <!-- MODAL: NUEVO / EDITAR MOVIMIENTO MANUAL -->
        <div id="cajaMovModal" class="hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4 overflow-y-auto">
            <div class="bg-white max-w-md w-full rounded-xl shadow-2xl border-t-4 border-blue-900">
                <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                    <h3 id="cajaMovModalTitle" class="font-black text-slate-800 uppercase">Registrar Movimiento</h3>
                    <button onclick="cerrarModalMovManual()" class="text-slate-400 hover:text-slate-600"><i class="fas fa-times text-xl"></i></button>
                </div>
                <form id="cajaMovForm" onsubmit="guardarMovimientoManual(event)" class="p-6 space-y-4">
                    <input type="hidden" id="cajaMovEditId" value="">
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo</label>
                        <select id="cajaMovTipo" required class="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-bold" onchange="actualizarCategoriasMovManual()">
                            <option value="INGRESO">Ingreso</option>
                            <option value="EGRESO">Egreso</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Categoría</label>
                        <select id="cajaMovCategoria" required class="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-bold">
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha</label>
                        <input type="date" id="cajaMovFecha" required class="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-bold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción</label>
                        <input type="text" id="cajaMovDesc" required placeholder="Ej: Ofrenda del culto dominical" class="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Monto ($)</label>
                        <input type="number" id="cajaMovMonto" step="0.01" min="0.01" required class="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-bold">
                    </div>
                    <div class="pt-4 flex gap-3">
                        <button type="button" onclick="cerrarModalMovManual()" class="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 rounded-lg">Cancelar</button>
                        <button type="button" id="cajaMovEliminarBtn" onclick="eliminarDesdeModal()" class="hidden bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg" title="Eliminar"><i class="fas fa-trash"></i></button>
                        <button type="submit" id="cajaMovSubmitBtn" class="flex-1 bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 rounded-lg">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
        
        <!-- MODAL: DETALLE DE ACTIVIDADES -->
        <div id="cajaDetActModal" class="hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4 overflow-y-auto">
            <div class="bg-white max-w-lg w-full rounded-xl shadow-2xl border-t-4 border-blue-700">
                <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                    <h3 class="font-black text-slate-800 uppercase">Detalle de Actividades</h3>
                    <button onclick="cerrarModalDetAct()" class="text-slate-400 hover:text-slate-600"><i class="fas fa-times text-xl"></i></button>
                </div>
                <div id="cajaDetActBody" class="p-6"></div>
            </div>
        </div>
    `;
    
    // Configurar fecha del modal al día actual
    const hoy = new Date().toISOString().split('T')[0];
    const fechaInput = document.getElementById('cajaMovFecha');
    if (fechaInput) fechaInput.value = hoy;
    
    actualizarCategoriasMovManual();
}

// ============== MOVIMIENTOS MANUALES ==============

function abrirModalMovimientoManual() {
    editandoMovId = null;
    document.getElementById('cajaMovEditId').value = '';
    document.getElementById('cajaMovModalTitle').textContent = 'Registrar Movimiento';
    document.getElementById('cajaMovSubmitBtn').textContent = 'Guardar';
    document.getElementById('cajaMovTipo').value = 'INGRESO';
    document.getElementById('cajaMovTipo').disabled = false;
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('cajaMovFecha').value = hoy;
    document.getElementById('cajaMovDesc').value = '';
    document.getElementById('cajaMovMonto').value = '';
    actualizarCategoriasMovManual();
    document.getElementById('cajaMovEliminarBtn').classList.add('hidden');
    document.getElementById('cajaMovModal').classList.remove('hidden');
}

function abrirEditarMovimiento(movKey) {
    const mov = currentMovimientos[movKey];
    if (!mov) return;
    
    // Solo se pueden editar movimientos manuales
    if (mov.origen !== 'manual') {
        alert('Solo se pueden editar movimientos registrados manualmente.');
        return;
    }
    
    editandoMovId = movKey;
    document.getElementById('cajaMovEditId').value = movKey;
    document.getElementById('cajaMovModalTitle').textContent = 'Editar Movimiento';
    document.getElementById('cajaMovSubmitBtn').textContent = 'Actualizar';
    
    // Llenar campos con datos existentes
    document.getElementById('cajaMovTipo').value = mov.tipo;
    document.getElementById('cajaMovTipo').disabled = true; // No se puede cambiar el tipo al editar
    actualizarCategoriasMovManual();
    
    // Esperar a que las opciones estén cargadas, luego seleccionar la categoría
    setTimeout(() => {
        document.getElementById('cajaMovCategoria').value = mov.categoria;
    }, 50);
    
    // Fecha: convertir ISO a formato date input
    const fechaVal = mov.fecha ? mov.fecha.split('T')[0] : new Date().toISOString().split('T')[0];
    document.getElementById('cajaMovFecha').value = fechaVal;
    document.getElementById('cajaMovDesc').value = mov.descripcion || '';
    document.getElementById('cajaMovMonto').value = parseFloat(mov.monto) || '';
    
    document.getElementById('cajaMovEliminarBtn').classList.remove('hidden');
    document.getElementById('cajaMovModal').classList.remove('hidden');
}

function cerrarModalMovManual() {
    document.getElementById('cajaMovModal').classList.add('hidden');
    document.getElementById('cajaMovTipo').disabled = false;
    editandoMovId = null;
}

function actualizarCategoriasMovManual() {
    const tipo = document.getElementById('cajaMovTipo').value;
    const sel = document.getElementById('cajaMovCategoria');
    
    let opciones = [];
    if (tipo === 'INGRESO') {
        opciones = ['Ofrenda', 'Donación', 'Otros Ingresos'];
    } else {
        opciones = ['Ofrenda Zonal', 'Gastos Generales', 'Gastos de Sábado', 'Otros Egresos'];
    }
    
    sel.innerHTML = opciones.map(o => `<option value="${o}">${o}</option>`).join('');
}

async function guardarMovimientoManual(e) {
    e.preventDefault();
    
    if (!canEditTreasury()) {
        alert('No tienes permisos para registrar movimientos.');
        return;
    }
    
    const tipo = document.getElementById('cajaMovTipo').value;
    const categoria = document.getElementById('cajaMovCategoria').value;
    const fecha = document.getElementById('cajaMovFecha').value;
    const desc = document.getElementById('cajaMovDesc').value.trim();
    const monto = parseFloat(document.getElementById('cajaMovMonto').value);
    const editId = document.getElementById('cajaMovEditId').value;
    
    if (!desc || monto <= 0) {
        alert('Completa todos los campos correctamente.');
        return;
    }
    
    try {
        if (editId) {
            // ====== MODO EDICIÓN ======
            const movExistente = currentMovimientos[editId];
            if (!movExistente) {
                alert('Movimiento no encontrado.');
                return;
            }
            
            await treasuryDb.ref(`movimientos/${treasuryCurrentPeriod}/${editId}`).update({
                categoria: categoria,
                descripcion: desc,
                monto: monto,
                fecha: fecha,
                ultimaEdicion: new Date().toISOString(),
                editadoPor: treasuryUser.email
            });
            
            await registrarAuditoriaTesoreria(
                'EDICIÓN MOVIMIENTO',
                'Caja',
                `Movimiento editado: ${desc} por $${monto.toFixed(2)} (${categoria})`,
                editId
            );
            
            cerrarModalMovManual();
            alert('Movimiento actualizado correctamente.');
        } else {
            // ====== MODO CREACIÓN (PENDIENTE) ======
            const newKey = treasuryDb.ref(`movimientos/${treasuryCurrentPeriod}`).push().key;
            
            await treasuryDb.ref(`movimientos/${treasuryCurrentPeriod}/${newKey}`).set({
                id: newKey,
                tipo: tipo,
                categoria: categoria,
                descripcion: desc,
                monto: monto,
                estado: 'PENDIENTE',
                origen: 'manual',
                periodo: treasuryCurrentPeriod,
                fecha: fecha,
                usuario: treasuryUser.email,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            
            await registrarAuditoriaTesoreria(
                tipo === 'INGRESO' ? 'INGRESO MANUAL (PENDIENTE)' : 'EGRESO MANUAL (PENDIENTE)',
                'Caja',
                `${tipo} pendiente: ${desc} por $${monto.toFixed(2)} (${categoria})`,
                newKey
            );
            
            cerrarModalMovManual();
        }
    } catch(err) {
        console.error("Error guardando movimiento:", err);
        alert('Error al guardar el movimiento: ' + err.message);
    }
}

// ============== CONFIRMAR / ELIMINAR MOVIMIENTOS ==============

async function confirmarMovimientoManual(movKey) {
    const mov = currentMovimientos[movKey];
    if (!mov) return;
    
    if (confirm(`¿Confirmar este movimiento?\n\n${mov.tipo}: ${mov.descripcion}\nMonto: $${parseFloat(mov.monto).toFixed(2)}\n\nAl confirmar, se reflejará en el saldo de la Caja.`)) {
        try {
            await treasuryDb.ref(`movimientos/${treasuryCurrentPeriod}/${movKey}`).update({
                estado: 'CONFIRMADO',
                fechaConfirmacion: new Date().toISOString(),
                confirmadoPor: treasuryUser.email
            });
            
            await registrarAuditoriaTesoreria(
                'CONFIRMACIÓN MOVIMIENTO',
                'Caja',
                `Movimiento confirmado: ${mov.descripcion} por $${parseFloat(mov.monto).toFixed(2)}`,
                movKey
            );
        } catch(err) {
            console.error("Error confirmando movimiento:", err);
            alert('Error al confirmar: ' + err.message);
        }
    }
}

async function eliminarMovimientoManual(movKey) {
    const mov = currentMovimientos[movKey];
    if (!mov) return;
    
    if (mov.origen !== 'manual' && mov.origen !== 'diezmo') {
        alert('Este movimiento no se puede eliminar.');
        return;
    }
    
    if (confirm(`¿Eliminar permanentemente este movimiento?\n\n${mov.descripcion} - $${parseFloat(mov.monto).toFixed(2)}`)) {
        try {
            await treasuryDb.ref(`movimientos/${treasuryCurrentPeriod}/${movKey}`).remove();
            
            await registrarAuditoriaTesoreria(
                'ELIMINACIÓN MOVIMIENTO',
                'Caja',
                `Movimiento eliminado: ${mov.descripcion} por $${parseFloat(mov.monto).toFixed(2)}`,
                movKey
            );
        } catch(err) {
            console.error("Error eliminando movimiento:", err);
            alert('Error al eliminar: ' + err.message);
        }
    }
}

async function eliminarDesdeModal() {
    const editId = document.getElementById('cajaMovEditId').value;
    if (editId) {
        await eliminarMovimientoManual(editId);
        cerrarModalMovManual();
    }
}

// ============== DIEZMOS ==============

async function extraerDiezmo(fuente, montoFaltante) {
    const fuenteLabel = fuente === 'ofrendas' ? 'Ofrendas' : 'Actividades';
    const categoriaLabel = fuente === 'ofrendas' ? 'Diezmo de Ofrendas' : 'Diezmo de Actividades';
    
    if (!confirm(`¿Confirmar extracción del Diezmo de ${fuenteLabel}?\n\nMonto a extraer: $${montoFaltante.toFixed(2)}\n\nEsto generará un egreso automático en la Caja.`)) {
        return;
    }
    
    try {
        const movKey = treasuryDb.ref(`movimientos/${treasuryCurrentPeriod}`).push().key;
        
        await treasuryDb.ref(`movimientos/${treasuryCurrentPeriod}/${movKey}`).set({
            id: movKey,
            tipo: 'EGRESO',
            categoria: categoriaLabel,
            descripcion: `Diezmo de ${fuenteLabel} del período ${treasuryCurrentPeriod}`,
            monto: montoFaltante,
            estado: 'CONFIRMADO',
            origen: 'diezmo',
            periodo: treasuryCurrentPeriod,
            fecha: new Date().toISOString(),
            usuario: treasuryUser.email,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        
        await registrarAuditoriaTesoreria(
            'DIEZMO EXTRAÍDO',
            'Caja',
            `Diezmo de ${fuenteLabel}: $${montoFaltante.toFixed(2)}`,
            movKey
        );
        
        alert(`Diezmo de ${fuenteLabel} extraído correctamente: $${montoFaltante.toFixed(2)}`);
    } catch(err) {
        console.error("Error extrayendo diezmo:", err);
        alert('Error al registrar el diezmo: ' + err.message);
    }
}

async function revertirDiezmo(fuente, montoExceso) {
    const fuenteLabel = fuente === 'ofrendas' ? 'Ofrendas' : 'Actividades';
    const categoriaLabel = fuente === 'ofrendas' ? 'Diezmo de Ofrendas' : 'Diezmo de Actividades';
    
    if (!confirm(`¿Confirmar reversión de exceso de Diezmo de ${fuenteLabel}?\n\nMonto a devolver: $${montoExceso.toFixed(2)}\n\nEsto generará un ingreso automático en la Caja para cuadrar el saldo.`)) {
        return;
    }
    
    try {
        const movKey = treasuryDb.ref(`movimientos/${treasuryCurrentPeriod}`).push().key;
        
        await treasuryDb.ref(`movimientos/${treasuryCurrentPeriod}/${movKey}`).set({
            id: movKey,
            tipo: 'INGRESO', // Reintegro a caja
            categoria: categoriaLabel,
            descripcion: `Reintegro de exceso de Diezmo de ${fuenteLabel}`,
            monto: montoExceso,
            estado: 'CONFIRMADO',
            origen: 'diezmo',
            periodo: treasuryCurrentPeriod,
            fecha: new Date().toISOString(),
            usuario: treasuryUser.email,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        
        await registrarAuditoriaTesoreria(
            'REVERSIÓN DE DIEZMO',
            'Caja',
            `Reintegro de diezmo de ${fuenteLabel}: $${montoExceso.toFixed(2)}`,
            movKey
        );
        
        alert(`Reintegro por exceso de diezmo completado.`);
    } catch(err) {
        console.error("Error revirtiendo diezmo:", err);
        alert('Error al revertir diezmo: ' + err.message);
    }
}

// ============== DETALLE DE ACTIVIDADES ==============

function verDetalleActividadesCaja() {
    const actsArr = Object.entries(currentActividadesCaja);
    let html = '';
    let totalGan = 0;
    
    actsArr.forEach(([id, act]) => {
        if (act.estado === 'CERRADA' || act.consumoConfirmado) {
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
            const gananciaAct = ingresoAct - inversionAct;
            totalGan += gananciaAct;
            
            html += `
            <div class="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-3">
                <div class="flex justify-between items-center mb-2">
                    <h5 class="font-black text-slate-800 uppercase text-sm">${escHtml(act.nombre)}</h5>
                    <span class="text-[10px] font-bold ${act.estado === 'CERRADA' ? 'text-green-600 bg-green-100' : 'text-yellow-600 bg-yellow-100'} px-2 py-0.5 rounded">${act.estado === 'CERRADA' ? '✓ EN CAJA' : 'PENDIENTE DE CIERRE'}</span>
                </div>
                <div class="grid grid-cols-3 gap-2 text-xs">
                    <div>
                        <div class="text-slate-500">Inversión</div>
                        <div class="font-bold text-red-600">$${inversionAct.toFixed(2)}</div>
                    </div>
                    <div>
                        <div class="text-slate-500">Ingreso</div>
                        <div class="font-bold text-green-600">$${ingresoAct.toFixed(2)}</div>
                    </div>
                    <div>
                        <div class="text-slate-500">Ganancia</div>
                        <div class="font-black ${gananciaAct >= 0 ? 'text-blue-700' : 'text-red-600'}">$${gananciaAct.toFixed(2)}</div>
                    </div>
                </div>
            </div>
            `;
        }
    });
    
    if (!html) {
        html = `<div class="text-center text-slate-400 italic py-6">No hay actividades cerradas/confirmadas en este período.</div>`;
    } else {
        html += `
        <div class="bg-blue-900 text-white p-4 rounded-lg text-center mt-4">
            <div class="text-xs text-blue-200 uppercase font-bold mb-1">Total Ganancias Consolidadas</div>
            <div class="text-2xl font-black">$${totalGan.toFixed(2)}</div>
        </div>
        `;
    }
    
    document.getElementById('cajaDetActBody').innerHTML = html;
    document.getElementById('cajaDetActModal').classList.remove('hidden');
}

function cerrarModalDetAct() {
    document.getElementById('cajaDetActModal').classList.add('hidden');
}

// === EXPORTS GLOBALES ===
window.renderTesoreriaCaja = renderTesoreriaCaja;
window.abrirModalMovimientoManual = abrirModalMovimientoManual;
window.abrirEditarMovimiento = abrirEditarMovimiento;
window.cerrarModalMovManual = cerrarModalMovManual;
window.actualizarCategoriasMovManual = actualizarCategoriasMovManual;
window.guardarMovimientoManual = guardarMovimientoManual;
window.confirmarMovimientoManual = confirmarMovimientoManual;
window.eliminarMovimientoManual = eliminarMovimientoManual;
window.eliminarDesdeModal = eliminarDesdeModal;
window.extraerDiezmo = extraerDiezmo;
window.revertirDiezmo = revertirDiezmo;
window.verDetalleActividadesCaja = verDetalleActividadesCaja;
window.cerrarModalDetAct = cerrarModalDetAct;
