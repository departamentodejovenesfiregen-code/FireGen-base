/**
 * FireGen — js/tesoreria-caja.js
 * ─────────────────────────────────────────────────────────────
 * MÓDULO DE CAJA (TESORERÍA)
 * Gestiona ingresos, egresos, diezmos y el cálculo de saldo.
 * Todo ocurre en la base secundaria `treasuryDb`.
 * ─────────────────────────────────────────────────────────────
 */

let movimientosCaja = [];
let cajaListener = null;

function renderTesoreriaCaja() {
    const container = document.getElementById('treasurySubContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between">
                <div>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fondo Actual</p>
                    <h3 class="text-2xl font-black text-slate-800" id="tCajaSaldo">$0.00</h3>
                </div>
                <div class="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-lg"><i class="fas fa-wallet"></i></div>
            </div>
            <div class="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between">
                <div>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ingresos del Mes</p>
                    <h3 class="text-xl font-black text-slate-800" id="tCajaIngresos">$0.00</h3>
                </div>
                <div class="w-8 h-8 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center"><i class="fas fa-arrow-down"></i></div>
            </div>
            <div class="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between">
                <div>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Egresos del Mes</p>
                    <h3 class="text-xl font-black text-slate-800" id="tCajaEgresos">$0.00</h3>
                </div>
                <div class="w-8 h-8 bg-red-100 text-red-500 rounded-full flex items-center justify-center"><i class="fas fa-arrow-up"></i></div>
            </div>
        </div>

        <div class="mb-8">
            <h2 class="text-xl font-bold text-slate-900 mb-2">1. Saldo inicial</h2>
            <ul class="list-disc list-inside text-slate-700 pl-2">
                <li>Saldo del mes anterior: <span class="font-medium" id="tSaldoInicialVal">$ 0.00</span></li>
            </ul>
        </div>

        <div class="mb-8">
            <div class="flex justify-between items-end mb-4">
                <h2 class="text-xl font-bold text-slate-900">2. Registro del mes</h2>
                ${canEditTreasury() ? `
                <button onclick="document.getElementById('tMovimientoModal').classList.remove('hidden')" class="bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 text-sm font-bold shadow-sm print:hidden">
                    + Registrar Movimiento
                </button>
                ` : ''}
            </div>
            
            <div class="border-2 border-slate-900 overflow-x-auto">
                <table class="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                        <tr class="bg-slate-100 border-b-2 border-slate-900">
                            <th class="p-3 font-bold text-slate-900 border-r border-slate-300">Fecha</th>
                            <th class="p-3 font-bold text-slate-900 border-r border-slate-300">Concepto</th>
                            <th class="p-3 font-bold text-slate-900 border-r border-slate-300">Ingreso</th>
                            <th class="p-3 font-bold text-slate-900 border-r border-slate-300">Egreso</th>
                            <th class="p-3 font-bold text-slate-900 text-center border-r border-slate-300">Estado</th>
                            <th class="p-3 font-bold text-slate-900 text-center print:hidden">Acción</th>
                        </tr>
                    </thead>
                    <tbody id="tCajaBody" class="divide-y divide-slate-300">
                        <tr><td colspan="6" class="p-8 text-center text-slate-500 italic"><i class="fas fa-circle-notch fa-spin mr-1"></i> Cargando registros...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- SALDO DISPONIBLE DESTACADO -->
        <div class="mt-12 border-t-[3px] border-slate-900 pt-6">
            <div class="flex justify-end">
                <div class="text-right">
                    <p class="text-lg font-bold text-blue-900 uppercase tracking-widest mb-1">Saldo disponible</p>
                    <h3 id="tFondoCaja" class="text-5xl font-black text-blue-900">$0.00</h3>
                    <p class="text-xs text-slate-500 mt-2 italic">* El saldo se calcula en base a movimientos CERRADOS.</p>
                </div>
            </div>
        </div>

        <!-- MODAL: NUEVO MOVIMIENTO -->
        <div id="tMovimientoModal" class="hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[300]">
            <div class="bg-white max-w-md w-full p-8 shadow-2xl border-t-4 border-blue-900">
                <h3 class="text-xl font-bold text-slate-900 mb-6 flex justify-between items-center uppercase tracking-wide">
                    <span>Registrar Movimiento</span>
                    <button type="button" onclick="cerrarModalMovimiento()" class="text-slate-400 hover:text-red-600"><i class="fas fa-times text-lg"></i></button>
                </h3>
                <form id="tMovimientoForm" class="space-y-5" onsubmit="guardarMovimiento(event)">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo</label>
                            <select id="tMovTipo" onchange="cambiarCategoriasMovimiento()" required class="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm font-medium focus:border-blue-900 focus:outline-none focus:ring-0">
                                <option value="ingreso">Ingreso (+)</option>
                                <option value="egreso">Egreso (-)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Categoría</label>
                            <select id="tMovCategoria" required class="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm focus:border-blue-900 focus:outline-none focus:ring-0">
                                <!-- Llenado por JS -->
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción / Concepto</label>
                        <input type="text" id="tMovDesc" required placeholder="Ej: Ofrenda Culto Jóvenes" class="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm focus:border-blue-900 focus:outline-none focus:ring-0">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                                Monto ($)
                                <span class="group relative cursor-help text-blue-600 ml-1">
                                    <i class="fas fa-question-circle"></i>
                                    <div class="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-48 bg-slate-800 text-white text-[10px] p-2 rounded shadow-lg z-10 text-center">
                                        Use punto o coma decimal
                                    </div>
                                </span>
                            </label>
                            <input type="number" step="0.01" min="0" id="tMovMonto" required placeholder="0.00" class="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm font-bold text-slate-900 focus:border-blue-900 focus:outline-none focus:ring-0">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha</label>
                            <input type="date" id="tMovFecha" required class="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm focus:border-blue-900 focus:outline-none focus:ring-0">
                        </div>
                    </div>
                    
                    <div class="pt-4">
                        <button type="submit" class="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 uppercase tracking-wide transition-colors">
                            Guardar Registro
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Set fecha actual
    const today = new Date();
    document.getElementById('tMovFecha').value = today.toISOString().split('T')[0];
    cambiarCategoriasMovimiento();
    
    iniciarListenerCaja();
}

const CATEGORIAS_CAJA = {
    ingreso: ['Ofrenda', 'Diezmo', 'Venta Actividad', 'Donación', 'Otro'],
    egreso: ['Consumo Caja', 'Compra Imprevista', 'Premios', 'Atención/Café', 'Transporte', 'Materiales', 'Diezmo', 'Donación/Ayuda', 'Otro']
};

function cambiarCategoriasMovimiento() {
    const tipo = document.getElementById('tMovTipo').value;
    const catSel = document.getElementById('tMovCategoria');
    if(!catSel) return;
    
    const cats = CATEGORIAS_CAJA[tipo] || [];
    catSel.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

let cajaRef = null;

function iniciarListenerCaja() {
    if (!treasuryDb) return;
    
    if (cajaRef && cajaListener) {
        cajaRef.off('value', cajaListener);
    }
    
    cajaRef = treasuryDb.ref('caja');
    cajaListener = cajaRef.on('value', snap => {
        const data = snap.val() || {};
        const todosMovimientos = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        
        // Filtramos solo los del periodo seleccionado para visualizar en la tabla
        movimientosCaja = todosMovimientos.filter(m => m.periodo === treasuryCurrentPeriod || (m.fecha && m.fecha.startsWith(treasuryCurrentPeriod)));
        movimientosCaja.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
        
        // Pero pasamos todos los movimientos a calcularSaldoCaja para arrastrar saldos anteriores
        calcularSaldoCaja(todosMovimientos);
        actualizarUIListadoCaja();
    });
}

function actualizarUIListadoCaja() {
    const tbody = document.getElementById('tCajaBody');
    if (!tbody) return;
    
    if (movimientosCaja.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500 italic">No hay movimientos registrados en este período.</td></tr>';
        return;
    }
    
    tbody.innerHTML = movimientosCaja.map(m => {
        const isIngreso = m.tipo === 'ingreso';
        const color = isIngreso ? 'text-blue-900' : 'text-slate-900';
        const ingresoVal = isIngreso ? `$${Number(m.monto).toFixed(2)}` : '';
        const egresoVal = !isIngreso ? `$${Number(m.monto).toFixed(2)}` : '';
        
        // Estado documental en lugar de badge colorido
        let estadoLabel = m.cerrado 
            ? '<span class="text-slate-900 font-bold">Cerrado</span>' 
            : '<span class="text-orange-600 font-bold flex items-center justify-center gap-1"><i class="fas fa-exclamation-triangle"></i> Pendiente</span>';
        
        return `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="p-3 text-slate-700 border-r border-slate-300 border-b">${formatDateShort(m.fecha)}</td>
            <td class="p-3 text-slate-800 border-r border-slate-300 border-b">
                <span class="font-bold text-xs uppercase text-slate-500 block mb-0.5">${m.categoria}</span>
                ${escHtml(m.descripcion)}
            </td>
            <td class="p-3 text-right font-medium ${color} border-r border-slate-300 border-b">${ingresoVal}</td>
            <td class="p-3 text-right font-medium border-r border-slate-300 border-b">${egresoVal}</td>
            <td class="p-3 text-center border-r border-slate-300 border-b">${estadoLabel}</td>
            <td class="p-3 text-center border-b print:hidden">
                ${!m.cerrado ? 
                    (canEditTreasury() ? `
                        <button onclick="cerrarMovimiento('${m.id}')" class="text-blue-900 hover:text-blue-700 p-1 mx-1 font-bold text-xs underline" title="Verificar/Cerrar">Cerrar</button>
                        <button onclick="eliminarMovimiento('${m.id}')" class="text-red-600 hover:text-red-800 p-1 mx-1 font-bold text-xs underline" title="Eliminar">Borrar</button>
                    ` : '<i class="fas fa-eye-slash text-slate-300" title="Sin permisos"></i>')
                : '<i class="fas fa-lock text-slate-300" title="Cerrado permanentemente"></i>'}
            </td>
        </tr>`;
    }).join('');
}

function calcularSaldoCaja(todosMovimientos) {
    let fondoGlobal = 0; // Hasta hoy, solo confirmados
    let saldoInicial = 0; // Confirmados hasta antes de este periodo
    let ingPeriodo = 0; // Confirmados en el periodo
    let egrPeriodo = 0; // Confirmados en el periodo
    
    if (!todosMovimientos) todosMovimientos = movimientosCaja; // Fallback
    
    todosMovimientos.forEach(m => {
        const monto = parseFloat(m.monto) || 0;
        const per = m.periodo || (m.fecha ? m.fecha.substring(0, 7) : '');
        
        if (m.cerrado) {
            // Impacta fondo global
            if (m.tipo === 'ingreso') fondoGlobal += monto;
            else if (m.tipo === 'egreso') fondoGlobal -= monto;
            
            // Si es de un mes anterior al actual, impacta el saldo inicial
            if (per < treasuryCurrentPeriod) {
                if (m.tipo === 'ingreso') saldoInicial += monto;
                else if (m.tipo === 'egreso') saldoInicial -= monto;
            }
            
            // Si es de este mes, suma a las estadisticas del mes
            if (per === treasuryCurrentPeriod) {
                if (m.tipo === 'ingreso') ingPeriodo += monto;
                else if (m.tipo === 'egreso') egrPeriodo += monto;
            }
        }
    });
    
    const elFondo = document.getElementById('tFondoCaja');
    const elSaldoInicial = document.getElementById('tSaldoInicialVal');
    const elCajaSaldo = document.getElementById('tCajaSaldo');
    const elIng = document.getElementById('tCajaIngresos');
    const elEgr = document.getElementById('tCajaEgresos');
    
    if (elFondo) elFondo.textContent = `$${fondoGlobal.toFixed(2)}`;
    if (elSaldoInicial) elSaldoInicial.textContent = `$${saldoInicial.toFixed(2)}`;
    if (elCajaSaldo) elCajaSaldo.textContent = `$${fondoGlobal.toFixed(2)}`;
    if (elIng) elIng.textContent = `$${ingPeriodo.toFixed(2)}`;
    if (elEgr) elEgr.textContent = `$${egrPeriodo.toFixed(2)}`;
}

function abrirModalMovimiento() {
    document.getElementById('tMovimientoForm').reset();
    document.getElementById('tMovFecha').value = new Date().toISOString().split('T')[0];
    cambiarCategoriasMovimiento();
    document.getElementById('tMovimientoModal').classList.remove('hidden');
}

function cerrarModalMovimiento() {
    document.getElementById('tMovimientoModal').classList.add('hidden');
}

async function guardarMovimiento(e) {
    e.preventDefault();
    if (!treasuryDb) return;
    
    // Verificamos estado del periodo
    const snap = await treasuryDb.ref('periodos/' + treasuryCurrentPeriod + '/estado').once('value');
    if (snap.val() === 'CERRADO') {
        alert('Este periodo ya está cerrado. No se pueden agregar nuevos movimientos.');
        return;
    }
    
    const data = {
        periodo: treasuryCurrentPeriod,
        tipo: document.getElementById('tMovTipo').value,
        categoria: document.getElementById('tMovCategoria').value,
        descripcion: document.getElementById('tMovDesc').value.trim(),
        monto: parseFloat(document.getElementById('tMovMonto').value),
        fecha: document.getElementById('tMovFecha').value,
        creadoPor: treasuryUser ? treasuryUser.email : 'desconocido',
        creadoEn: new Date().toISOString(),
        cerrado: false // REGLA: Ningún movimiento nace cerrado
    };
    
    try {
        await treasuryDb.ref('caja').push(data);
        cerrarModalMovimiento();
        registrarAuditoriaTesoreria('CREAR_MOVIMIENTO', 'CAJA', `${data.tipo.toUpperCase()}: $${data.monto} (${data.categoria})`);
    } catch(err) {
        alert('Error al guardar: ' + err.message);
    }
}

async function cerrarMovimiento(id) {
    if (!confirm('¿Cerrar y verificar este movimiento? Una vez cerrado, el monto afectará el fondo oficial y no se podrá eliminar ni modificar.')) return;
    if (!treasuryDb || !treasuryUser) return;
    
    const snap = await treasuryDb.ref('periodos/' + treasuryCurrentPeriod + '/estado').once('value');
    if (snap.val() === 'CERRADO') {
        alert('El periodo está cerrado, no se pueden cerrar movimientos.');
        return;
    }
    
    try {
        await treasuryDb.ref('caja/' + id).update({
            cerrado: true,
            cerradoPor: treasuryUser.email,
            cerradoEn: new Date().toISOString()
        });
        registrarAuditoriaTesoreria('CERRAR_MOVIMIENTO', 'CAJA', 'Movimiento verificado y cerrado', id);
    } catch(err) {
        alert('Error al cerrar: ' + err.message);
    }
}

async function eliminarMovimiento(id) {
    if (!confirm('¿Eliminar este movimiento pendiente?')) return;
    if (!treasuryDb) return;
    
    const snap = await treasuryDb.ref('periodos/' + treasuryCurrentPeriod + '/estado').once('value');
    if (snap.val() === 'CERRADO') {
        alert('El periodo está cerrado, no se pueden eliminar movimientos.');
        return;
    }
    
    try {
        await treasuryDb.ref('caja/' + id).remove();
        registrarAuditoriaTesoreria('ELIMINAR_MOVIMIENTO', 'CAJA', 'Movimiento eliminado', id);
    } catch(err) {
        alert('Error al eliminar: ' + err.message);
    }
}
