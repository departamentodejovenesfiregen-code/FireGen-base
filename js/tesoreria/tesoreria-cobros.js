
// tesoreria-cobros.js
let cobrosListener = null;
let currentDeudasGlobal = {};

function renderTesoreriaCobros() {
    const container = document.getElementById('treasurySubContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="mb-6 flex justify-between items-end">
            <div>
                <h2 class="text-2xl font-black text-slate-800"><i class="fas fa-hand-holding-usd text-orange-500 mr-2"></i> Pendientes de Cobro</h2>
                <p class="text-sm text-slate-500">Gestión de deudas e ingresos pendientes inter-mensuales.</p>
            </div>
            <button onclick="abrirModalNuevaDeuda()" class="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg shadow transition-colors text-sm">
                <i class="fas fa-plus"></i> Nueva Deuda
            </button>
        </div>
        
        <div id="tCobrosList" class="space-y-4">
            <div class="text-center py-10 text-slate-400 italic">Cargando deudas...</div>
        </div>
        
        <!-- Modal Nueva Deuda -->
        <div id="tDeudaModal" class="fixed inset-0 bg-slate-900/60 z-[300] hidden flex items-center justify-center p-4">
            <div class="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
                <div class="bg-orange-500 px-6 py-4 flex justify-between items-center text-white shrink-0">
                    <h3 class="font-bold text-lg"><i class="fas fa-plus mr-2"></i> Registrar Deuda</h3>
                    <button onclick="cerrarModalDeuda()" class="text-white/70 hover:text-white"><i class="fas fa-times text-xl"></i></button>
                </div>
                <div class="p-6">
                    <form onsubmit="guardarNuevaDeuda(event)">
                        <div class="space-y-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Deudor (Nombre)</label>
                                <input type="text" id="tDeudaNombre" required class="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Concepto / Actividad</label>
                                <input type="text" id="tDeudaConcepto" required class="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Monto Original ($)</label>
                                <input type="number" id="tDeudaMonto" step="0.01" min="0.01" required class="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm font-bold">
                            </div>
                        </div>
                        <div class="mt-6 flex justify-end gap-2">
                            <button type="button" onclick="cerrarModalDeuda()" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300">Cancelar</button>
                            <button type="submit" class="px-4 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600">Guardar Deuda</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        
        <!-- Modal Pago Parcial -->
        <div id="tPagoModal" class="fixed inset-0 bg-slate-900/60 z-[300] hidden flex items-center justify-center p-4">
            <div class="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
                <div class="bg-green-600 px-6 py-4 flex justify-between items-center text-white shrink-0">
                    <h3 class="font-bold text-lg"><i class="fas fa-money-bill-wave mr-2"></i> Registrar Pago</h3>
                    <button onclick="cerrarModalPago()" class="text-white/70 hover:text-white"><i class="fas fa-times text-xl"></i></button>
                </div>
                <div class="p-6">
                    <form onsubmit="guardarPagoDeuda(event)">
                        <input type="hidden" id="tPagoDeudaId">
                        <div class="bg-slate-50 p-3 rounded-lg mb-4 text-sm text-slate-700 border border-slate-200">
                            Pendiente Actual: <strong id="tPagoPendienteMax" class="text-lg text-orange-600"></strong>
                        </div>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Monto a Pagar ($)</label>
                                <input type="number" id="tPagoMonto" step="0.01" min="0.01" required class="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-lg font-black text-center text-green-700">
                            </div>
                            <div class="text-[10px] text-slate-500 text-center font-bold">
                                Al confirmar, se creará un Ingreso Confirmado en la CAJA de ${treasuryCurrentPeriod}.
                            </div>
                        </div>
                        <div class="mt-6 flex justify-end gap-2">
                            <button type="button" onclick="cerrarModalPago()" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300">Cancelar</button>
                            <button type="submit" class="px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">Confirmar Pago</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    iniciarListenerCobros();
}

function iniciarListenerCobros() {
    if (!treasuryDb) return;
    if (cobrosListener) treasuryDb.ref('deudas').off('value', cobrosListener);
    
    // Las deudas son globales para poder rastrear meses anteriores.
    cobrosListener = treasuryDb.ref('deudas').on('value', snap => {
        const d = snap.val();
        currentDeudasGlobal = d || {};
        actualizarUICobros();
    });
}

function actualizarUICobros() {
    const list = document.getElementById('tCobrosList');
    if (!list) return;
    
    const deudas = Object.values(currentDeudasGlobal).filter(d => d.estado !== 'PAGADA');
    deudas.sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
    
    if (deudas.length === 0) {
        list.innerHTML = `<div class="bg-green-50 text-green-800 p-6 rounded-xl border border-green-200 text-center"><i class="fas fa-check-double text-3xl mb-3 opacity-50 block"></i> No hay pendientes de cobro registrados.</div>`;
        return;
    }
    
    let html = '';
    deudas.forEach(d => {
        const pagado = parseFloat(d.montoPagado) || 0;
        const orig = parseFloat(d.montoOriginal) || 0;
        const pend = orig - pagado;
        const badge = d.periodoOrigen === treasuryCurrentPeriod 
            ? `<span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[9px] font-bold uppercase">Mes Actual</span>`
            : `<span class="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[9px] font-bold uppercase">Historico: ${d.periodoOrigen}</span>`;
            
        html += `
        <div class="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center shadow-sm">
            <div>
                <div class="flex items-center gap-2 mb-1">
                    <h4 class="font-black text-slate-800 uppercase text-sm">${escHtml(d.deudor)}</h4>
                    ${badge}
                </div>
                <div class="text-xs text-slate-500 font-bold mb-1">${escHtml(d.concepto)}</div>
                <div class="text-[10px] text-slate-400">Total orig: $${orig.toFixed(2)} | Pagado: $${pagado.toFixed(2)}</div>
            </div>
            <div class="text-right flex flex-col items-end">
                <div class="text-lg font-black text-orange-600 mb-2">-$${pend.toFixed(2)}</div>
                ${canEditTreasury() ? `<button onclick="abrirModalPago('${d.id}', ${pend})" class="bg-green-100 hover:bg-green-200 text-green-800 font-bold py-1 px-3 rounded text-xs transition-colors shadow-sm border border-green-300">Registrar Pago</button>` : ''}
            </div>
        </div>
        `;
    });
    list.innerHTML = html;
}

window.abrirModalNuevaDeuda = function() {
    document.getElementById('tDeudaModal').classList.remove('hidden');
}
window.cerrarModalDeuda = function() {
    document.getElementById('tDeudaModal').classList.add('hidden');
}

window.guardarNuevaDeuda = async function(e) {
    e.preventDefault();
    
    // FASE 17: Verificar periodo abierto
    const pSnap = await treasuryDb.ref(`periodos/${treasuryCurrentPeriod}`).once('value');
    if (!pSnap.exists() || pSnap.val().estado !== 'ABIERTO') {
        alert("El período actual no está abierto. No se pueden crear deudas.");
        return;
    }
    
    const ref = treasuryDb.ref('deudas').push();
    await ref.set({
        id: ref.key,
        deudor: document.getElementById('tDeudaNombre').value,
        concepto: document.getElementById('tDeudaConcepto').value,
        montoOriginal: parseFloat(document.getElementById('tDeudaMonto').value),
        montoPagado: 0,
        estado: 'PENDIENTE',
        periodoOrigen: treasuryCurrentPeriod,
        periodo: treasuryCurrentPeriod,
        fecha: new Date().toISOString(),
        creadoPor: treasuryUser.email
    });
    cerrarModalDeuda();
}

window.abrirModalPago = function(deudaId, pendienteMax) {
    document.getElementById('tPagoDeudaId').value = deudaId;
    document.getElementById('tPagoPendienteMax').innerText = '$' + pendienteMax.toFixed(2);
    const mInput = document.getElementById('tPagoMonto');
    mInput.max = pendienteMax;
    mInput.value = pendienteMax; // Sugiere pago total por defecto
    document.getElementById('tPagoModal').classList.remove('hidden');
}
window.cerrarModalPago = function() {
    document.getElementById('tPagoModal').classList.add('hidden');
}

window.guardarPagoDeuda = async function(e) {
    e.preventDefault();
    const dId = document.getElementById('tPagoDeudaId').value;
    const pago = parseFloat(document.getElementById('tPagoMonto').value);
    
    if (isNaN(pago) || pago <= 0) {
        alert('Monto de pago inválido.');
        return;
    }
    
    // FASE 16: Verificar periodo abierto
    const pSnap = await treasuryDb.ref(`periodos/${treasuryCurrentPeriod}`).once('value');
    if (!pSnap.exists() || pSnap.val().estado !== 'ABIERTO') {
        alert("El período actual no está abierto. No se pueden registrar pagos.");
        return;
    }
    
    const dSnap = await treasuryDb.ref(`deudas/${dId}`).once('value');
    if (!dSnap.exists()) return;
    const d = dSnap.val();
    
    const maxPendiente = Math.round((parseFloat(d.montoOriginal) - parseFloat(d.montoPagado)) * 100) / 100;
    const pagoRedondeado = Math.round(pago * 100) / 100;
    
    if (pagoRedondeado > maxPendiente) {
        alert("El pago supera el saldo pendiente.");
        return;
    }
    
    const nuevoEstado = (pagoRedondeado === maxPendiente) ? 'PAGADA' : 'PENDIENTE';
    const movRefKey = treasuryDb.ref().push().key;
    
    // FASE 14 y 15: Transacción Atómica Distribuida
    const updates = {};
    updates[`deudas/${dId}/montoPagado`] = firebase.database.ServerValue.increment(pagoRedondeado);
    updates[`deudas/${dId}/estado`] = nuevoEstado;
    
    updates[`movimientos/${treasuryCurrentPeriod}/${movRefKey}`] = {
        id: movRefKey,
        tipo: 'INGRESO',
        categoria: 'Cobro de Deuda',
        descripcion: `Pago de ${d.deudor}: ${d.concepto}`,
        monto: pagoRedondeado,
        estado: 'CONFIRMADO',
        referenciaId: dId,
        origen: 'deuda',
        periodo: treasuryCurrentPeriod,
        fecha: new Date().toISOString(),
        usuario: treasuryUser.email,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    try {
        await treasuryDb.ref().update(updates);
    } catch(err) {
        console.error(err);
        alert("El pago fue rechazado. Posibles causas:\n- El pago supera el saldo original por otro pago concurrente.\n- El período actual está cerrado.");
        return;
    }
    
    await registrarAuditoriaTesoreria(
        'COBRO DE DEUDA', 
        'Cobros', 
        `Pago registrado de ${d.deudor} por $${pagoRedondeado}. Estado de deuda: ${nuevoEstado}`, 
        movRefKey
    );
    
    alert('Pago registrado e ingresado a Caja exitosamente.');
    cerrarModalPago();
}
