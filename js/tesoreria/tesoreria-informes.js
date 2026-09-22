
// tesoreria-informes.js

function renderTesoreriaInformes() {
    const container = document.getElementById('treasurySubContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="mb-6">
            <h2 class="text-2xl font-black text-slate-800"><i class="fas fa-file-invoice text-teal-700 mr-2"></i> Cierre de Informe</h2>
            <p class="text-sm text-slate-500">Visualización de documento final y cierre de mes.</p>
        </div>
        
        <div class="flex gap-2 mb-6">
            <button onclick="generarVistaPreviaInforme()" class="bg-teal-700 hover:bg-teal-800 text-white font-bold py-2 px-4 rounded-lg shadow transition-colors text-sm">
                <i class="fas fa-eye"></i> Generar Vista Previa
            </button>
            <button onclick="imprimirInformeTesoreria()" id="btnImprimirInforme" class="hidden bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-4 rounded-lg shadow transition-colors text-sm">
                <i class="fas fa-print"></i> Imprimir / PDF
            </button>
            ${canEditTreasury() ? `
            <button onclick="cerrarInformeMensualTesoreria()" id="btnCerrarInforme" class="hidden ml-auto bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow transition-colors text-sm">
                <i class="fas fa-lock"></i> Cerrar Período Oficialmente
            </button>
            ` : ''}
        </div>
        
        <div id="vistaPreviaInformeContainer" class="bg-white border border-slate-200 rounded-sm shadow-lg overflow-hidden hidden max-w-[800px] mx-auto p-12 text-slate-900" style="font-family: Arial, sans-serif;">
            <!-- Documento Renderizado -->
        </div>
    `;
    
    // Auto generar si ya está cerrado
    if(currentCaja && currentCaja.estado === 'CERRADO') {
        generarVistaPreviaInforme();
    }
}

async function generarVistaPreviaInforme() {
    const c = document.getElementById('vistaPreviaInformeContainer');
    c.classList.remove('hidden');
    document.getElementById('btnImprimirInforme').classList.remove('hidden');
    
    const isCerrado = currentCaja && currentCaja.estado === 'CERRADO';
    if(!isCerrado) {
        document.getElementById('btnCerrarInforme').classList.remove('hidden');
    }
    
    // Obtener datos
    const saldoIn = currentCaja ? parseFloat(currentCaja.saldoInicial) || 0 : 0;
    
    // Movimientos (Ofrendas, Diezmos, etc) excluyendo actividades si las podemos separar
    const movs = Object.values(currentMovimientos || {}).filter(m => m.estado === 'CONFIRMADO');
    
    // Actividades
    const acts = Object.values(currentActividades || {}).filter(a => a.estado === 'CERRADA' || a.consumoConfirmado);
    
    let htmlActs = '';
    let totalActEgresos = 0;
    let totalActIngresos = 0;
    let totalActGanancias = 0;
    
    if(acts.length === 0) {
        htmlActs = `<tr><td colspan="4" class="text-center py-2 text-xs italic">Sin actividades.</td></tr>`;
    } else {
        acts.forEach(a => {
            // Re-calcular inversión de gastos confirmados (comprados)
            let inv = 0;
            if(a.gastos) {
                Object.values(a.gastos).forEach(g => {
                    if(g.comprado) inv += parseFloat(g.cantidad) * parseFloat(g.precio);
                });
            }
            const ing = (a.platosCobrados||0) * (a.precio||0);
            const gan = ing - inv;
            
            totalActEgresos += inv;
            totalActIngresos += ing;
            totalActGanancias += gan;
            
            htmlActs += `
                <tr class="border-b border-slate-300 text-sm">
                    <td class="py-1 uppercase">${escHtml(a.nombre)}</td>
                    <td class="py-1 text-center">$${inv.toFixed(2)}</td>
                    <td class="py-1 text-center">$${ing.toFixed(2)}</td>
                    <td class="py-1 text-right font-bold">$${gan.toFixed(2)}</td>
                </tr>
            `;
        });
    }
    
    // Calcular Saldo Final desde movimientos de caja reales (La caja oficial)
    let totalIng = 0;
    let totalEgr = 0;
    movs.forEach(m => {
        if(m.tipo === 'INGRESO') totalIng += parseFloat(m.monto);
        else if(m.tipo === 'EGRESO') totalEgr += parseFloat(m.monto);
    });
    const saldoFinal = saldoIn + totalIng - totalEgr;
    const diezmoTotal = (totalIng * 0.10).toFixed(2); // Ejemplo si aplica al ingreso total o de ganancia
    const diezmoGanancias = (totalActGanancias * 0.10).toFixed(2);
    
    c.innerHTML = `
        <div class="text-center border-b-[3px] border-black pb-4 mb-6">
            <h1 class="text-2xl font-black uppercase mb-1">Departamento de Jóvenes</h1>
            <h2 class="text-xl font-bold uppercase tracking-widest">Informe Financiero</h2>
        </div>
        
        <div class="flex justify-between mb-8 font-bold text-sm">
            <div>Mes: <span class="border-b border-black font-normal px-2">${treasuryCurrentPeriod}</span></div>
            <div>Responsable: <span class="border-b border-black font-normal px-2">${escHtml(treasuryUser.email)}</span></div>
            <div class="text-red-700">${isCerrado ? 'CERRADO Y AUDITADO' : 'VISTA PREVIA (ABIERTO)'}</div>
        </div>
        
        <div class="mb-6 text-sm">
            <div class="font-bold mb-2">1. SALDO INICIAL: <span class="font-normal">$${saldoIn.toFixed(2)}</span></div>
        </div>
        
        <div class="mb-6">
            <div class="font-bold mb-2 text-sm">2. REGISTRO DEL MES (Ingresos/Egresos directos)</div>
            <table class="w-full border border-black text-sm text-left">
                <thead class="bg-slate-100 border-b border-black">
                    <tr><th class="p-1 border-r border-black">Fecha</th><th class="p-1 border-r border-black">Detalle</th><th class="p-1 text-right border-r border-black">Ingreso</th><th class="p-1 text-right">Egreso</th></tr>
                </thead>
                <tbody>
                    ${movs.map(m => `<tr>
                        <td class="p-1 border-r border-b border-black">${formatDateShort(m.fecha)}</td>
                        <td class="p-1 border-r border-b border-black">${escHtml(m.descripcion)}</td>
                        <td class="p-1 border-r border-b border-black text-right">${m.tipo==='INGRESO' ? '$'+parseFloat(m.monto).toFixed(2) : ''}</td>
                        <td class="p-1 border-b border-black text-right">${m.tipo==='EGRESO' ? '$'+parseFloat(m.monto).toFixed(2) : ''}</td>
                    </tr>`).join('')}
                    ${movs.length===0?'<tr><td colspan="4" class="p-1 text-center italic border-b border-black">Sin registros.</td></tr>':''}
                </tbody>
            </table>
        </div>
        
        <div class="mb-6">
            <div class="font-bold mb-2 text-sm">3. ACTIVIDADES ECONÓMICAS</div>
            <table class="w-full border-b-[2px] border-black text-sm text-left">
                <thead class="border-y-[2px] border-black">
                    <tr><th class="py-1">Actividad</th><th class="py-1 text-center">Egreso/Gasto</th><th class="py-1 text-center">Ingreso</th><th class="py-1 text-right">Ganancia</th></tr>
                </thead>
                <tbody>
                    ${htmlActs}
                </tbody>
            </table>
        </div>
        
        <div class="mb-6 text-sm grid grid-cols-2 gap-4">
            <div>
                <div class="mb-1"><strong>4. DIEZMO DE LAS GANANCIAS:</strong> $${diezmoGanancias}</div>
                <div class="mb-1"><strong>5. GANANCIA RESTANTE:</strong> $${(totalActGanancias - parseFloat(diezmoGanancias)).toFixed(2)}</div>
                <div class="mb-1"><strong>6. DIEZMO TOTAL:</strong> $${diezmoTotal}</div>
            </div>
            <div>
                <div class="mb-1"><strong>7. OBSERVACIONES:</strong></div>
                <div class="border-b border-black w-full mb-4 h-4"></div>
                <div class="mb-1"><strong>8. NOTA / PENDIENTES:</strong></div>
                <div class="border-b border-black w-full h-4"></div>
            </div>
        </div>
        
        <div class="text-right mt-12 mb-6">
            <div class="inline-block text-center border-t-2 border-black pt-2 min-w-[200px]">
                <div class="font-black text-lg">9. SALDO FINAL</div>
                <div class="font-black text-2xl">$${saldoFinal.toFixed(2)}</div>
            </div>
        </div>
    `;
    
    // Preparar contenedor print
    document.getElementById('monthlyReportPrint').innerHTML = c.innerHTML;
}

window.imprimirInformeTesoreria = function() {
    window.print();
}

window.cerrarInformeMensualTesoreria = async function() {
    // Verificar que no esté ya cerrado
    if (currentCaja && currentCaja.estado === 'CERRADO') {
        alert('Este período ya está cerrado.');
        return;
    }
    
    // FASE 30: Integridad — verificar actividades
    const actsAbiertas = Object.values(currentActividades || {}).filter(a => a.estado !== 'CERRADA');
    if (actsAbiertas.length > 0) {
        const nombres = actsAbiertas.map(a => '• ' + a.nombre).join('\n');
        if(!confirm(`ADVERTENCIA: Hay ${actsAbiertas.length} actividad(es) sin cerrar:\n\n${nombres}\n\nSus ingresos NO serán registrados en la caja si no están cerradas.\n\n¿Deseas cerrar el período de todas formas?`)) return;
    }
    
    // Verificar consumos sin confirmar
    const actsConConsumoPendiente = Object.values(currentActividades || {}).filter(a => 
        !a.consumoConfirmado && a.gastos && Object.values(a.gastos).some(g => g.comprado)
    );
    if (actsConConsumoPendiente.length > 0) {
        const nombres2 = actsConConsumoPendiente.map(a => '• ' + a.nombre).join('\n');
        if(!confirm(`ADVERTENCIA: Hay ${actsConConsumoPendiente.length} actividad(es) con gastos comprados pero sin consumo confirmado:\n\n${nombres2}\n\nSus egresos NO impactarán la caja.\n\n¿Deseas cerrar el período de todas formas?`)) return;
    }
    
    if(!confirm('¿CERRAR MES DEFINITIVAMENTE?\n\nAl cerrar, se guardará el saldo final. Todos los datos quedarán en solo lectura.')) return;
    
    const movs = Object.values(currentMovimientos || {}).filter(m => m.estado === 'CONFIRMADO');
    let totalIng = 0;
    let totalEgr = 0;
    movs.forEach(m => {
        if(m.tipo === 'INGRESO') totalIng += parseFloat(m.monto);
        else if(m.tipo === 'EGRESO') totalEgr += parseFloat(m.monto);
    });
    const saldoIn = parseFloat(currentCaja.saldoInicial) || 0;
    const saldoFinal = saldoIn + totalIng - totalEgr;
    
    try {
        await treasuryDb.ref('periodos/' + treasuryCurrentPeriod).update({
            estado: 'CERRADO',
            saldoFinal: saldoFinal,
            totalIngresos: totalIng,
            totalEgresos: totalEgr,
            usuarioCierre: treasuryUser.email,
            fechaCierre: new Date().toISOString()
        });
        
        await registrarAuditoriaTesoreria(
            'CIERRE DE PERÍODO',
            'Informes',
            'Período ' + treasuryCurrentPeriod + ' cerrado. Saldo final: $' + saldoFinal.toFixed(2),
            treasuryCurrentPeriod
        );
        
        alert('Período cerrado exitosamente.');
        document.getElementById('btnCerrarInforme').classList.add('hidden');
        verificarEstadoPeriodo();
    } catch (e) {
        console.error("Error cerrando período:", e);
        alert('Error al cerrar el período: ' + e.message);
    }
}

// === EXPORTS GLOBALES ===
window.generarVistaPreviaInforme = generarVistaPreviaInforme;
