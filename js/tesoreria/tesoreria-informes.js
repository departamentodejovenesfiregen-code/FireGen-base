
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
    
    // Obtener nombre del responsable (desde db principal)
    let responsableName = treasuryUser.email;
    try {
        const snap = await db.ref('usuarios').orderByChild('correo').equalTo(treasuryUser.email).once('value');
        if (snap.exists()) {
            const userObj = Object.values(snap.val())[0];
            if (userObj.nombre) responsableName = userObj.nombre;
        }
    } catch(e) {
        console.warn("No se pudo obtener el nombre real del usuario:", e);
    }
    
    const saldoIn = currentCaja ? parseFloat(currentCaja.saldoInicial) || 0 : 0;
    const movs = Object.values(currentMovimientos || {}).filter(m => m.estado === 'CONFIRMADO');
    
    // 1. OFRENDAS
    const ofrendas = movs.filter(m => m.tipo === 'INGRESO' && m.categoria.toLowerCase().includes('ofrenda'));
    let totalOfrendas = 0;
    ofrendas.forEach(o => totalOfrendas += parseFloat(o.monto));
    const diezmoOfrendas = totalOfrendas * 0.10;
    const ofrendaTotal = totalOfrendas - diezmoOfrendas;
    
    let htmlOfrendas = '';
    if (ofrendas.length === 0) {
        htmlOfrendas = `<tr><td class="p-2 border border-black text-center" colspan="4">No hubo ofrendas en este mes</td></tr>`;
    } else {
        ofrendas.forEach((o, index) => {
            const montoOfrenda = parseFloat(o.monto);
            htmlOfrendas += `<tr>
                <td class="p-2 border border-black text-center">${formatDateShort(o.fecha)}</td>
                <td class="p-2 border border-black text-center">$ ${montoOfrenda.toFixed(2).replace('.', ',')}</td>`;
            if (index === 0) {
                htmlOfrendas += `
                <td class="p-2 border border-black text-center font-bold align-middle" rowspan="${ofrendas.length}">$ ${diezmoOfrendas.toFixed(2).replace('.', ',')}</td>
                <td class="p-2 border border-black text-center font-bold align-middle" rowspan="${ofrendas.length}">$ ${ofrendaTotal.toFixed(2).replace('.', ',')}</td>
                </tr>`;
            } else {
                htmlOfrendas += `</tr>`;
            }
        });
    }
    
    // 2. ACTIVIDADES
    const acts = Object.values(currentActividadesCaja || {}).filter(a => a.estado === 'CERRADA');
    let htmlActs = '';
    let stringGananciasSuma = '';
    let totalActGanancias = 0;
    
    if(acts.length === 0) {
        htmlActs = `<tr><td colspan="4" class="p-2 border border-black text-center italic">Sin actividades.</td></tr>`;
        stringGananciasSuma = `$ 0,00`;
    } else {
        acts.forEach((a, index) => {
            let inv = 0;
            if(a.gastos) {
                Object.values(a.gastos).forEach(g => {
                    if(g.comprado) inv += parseFloat(g.cantidad) * parseFloat(g.precio);
                });
            }
            const ing = (a.platosCobrados||0) * (parseFloat(a.precio)||0);
            const gan = ing - inv;
            totalActGanancias += gan;
            
            htmlActs += `
                <tr>
                    <td class="p-2 border border-black text-center">${escHtml(a.nombre)}</td>
                    <td class="p-2 border border-black text-center">$ ${inv.toFixed(2).replace('.', ',')}</td>
                    <td class="p-2 border border-black text-center">$ ${ing.toFixed(2).replace('.', ',')}</td>
                    <td class="p-2 border border-black text-center">$ ${gan.toFixed(2).replace('.', ',')}</td>
                </tr>
            `;
            
            stringGananciasSuma += `$ ${gan.toFixed(2).replace('.', ',')}`;
            if (index < acts.length - 1) stringGananciasSuma += ' + ';
        });
    }
    
    const diezmoGanancias = totalActGanancias * 0.10;
    const gananciaRestante = totalActGanancias - diezmoGanancias;
    
    // 3. DIEZMO TOTAL
    const diezmoTotal = diezmoGanancias + diezmoOfrendas;
    
    // 4. OBSERVACIONES (Egresos manuales)
    const egresosManuales = movs.filter(m => m.tipo === 'EGRESO' && !m.categoria.toLowerCase().includes('actividad') && !m.categoria.toLowerCase().includes('diezmo'));
    let htmlObs = '';
    let totalEgresosReales = 0;
    if (egresosManuales.length === 0) {
        htmlObs = `<li>No hay observaciones adicionales de gastos.</li>`;
    } else {
        egresosManuales.forEach(e => {
            const monto = parseFloat(e.monto);
            totalEgresosReales += monto;
            htmlObs += `<li>Se realizó un gasto de $${monto.toFixed(2).replace('.', ',')} para ${escHtml(e.descripcion)}.</li>`;
        });
    }
    
    // 5. NOTA (Pendientes de cobro)
    let htmlNota = '';
    let pendientesDeCobroTotal = 0;
    acts.forEach(a => {
        const pendientes = (a.platosVendidos||0) - (a.platosCobrados||0);
        if (pendientes > 0) pendientesDeCobroTotal += pendientes * (parseFloat(a.precio)||0);
    });
    if (pendientesDeCobroTotal > 0) {
        htmlNota = `<strong>7. Nota:</strong> Existe un valor pendiente de cobro de $ ${pendientesDeCobroTotal.toFixed(2).replace('.', ',')} correspondiente a actividades económicas de este mes.`;
    } else {
        htmlNota = `<strong>7. Nota:</strong> No existen valores pendientes de cobro este mes.`;
    }
    
    // 6. SALDO FINAL
    const saldoFinal = saldoIn + gananciaRestante + ofrendaTotal - totalEgresosReales;
    
    // Helper formats
    const mesesNombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    let mesActualStr = '';
    if(treasuryCurrentPeriod) {
        const p = treasuryCurrentPeriod.split('-');
        mesActualStr = `${mesesNombres[parseInt(p[1])-1]} ${p[0]}`;
    }
    const fd = new Date();
    const footerDateStr = `${mesesNombres[fd.getMonth()]}, ${fd.getFullYear()}`;
    
    // HIDE original padding of container since we want exact pdf layout
    c.classList.remove('p-12');
    c.style.padding = '0';
    
    c.innerHTML = `
        <div class="print-container text-black bg-white" style="font-family: Arial, Helvetica, sans-serif; max-width: 800px; margin: auto; padding: 40px; position: relative; color: #111;">
            
            <div class="absolute right-10 top-10 w-24">
                <img src="assets/logo/logo-institucional.png" alt="Logo" class="w-full object-contain">
            </div>

            <div class="border-l-[6px] border-blue-900 pl-4 mb-6">
                <div class="text-sm tracking-widest text-slate-700 uppercase" style="font-size: 0.85rem;">Departamento de Jóvenes</div>
                <h1 class="font-black uppercase tracking-tighter" style="font-size: 2.2rem; color: #222;">Informe Financiero</h1>
            </div>
            
            <div class="mb-6" style="font-size: 1.1rem;">
                <div><strong style="font-weight: 800;">Mes:</strong> ${mesActualStr}</div>
                <div><strong style="font-weight: 800;">Responsable:</strong> ${escHtml(responsableName)} - Tesorería</div>
            </div>
            
            <div class="mb-6" style="font-size: 1.1rem;">
                <h2 class="font-bold mb-2" style="font-weight: 800;">1. Saldo inicial</h2>
                <ul class="list-disc pl-8">
                    <li>Saldo del mes anterior: $ ${saldoIn.toFixed(2).replace('.', ',')}</li>
                </ul>
            </div>
            
            <div class="mb-6" style="font-size: 1.1rem;">
                <h2 class="font-bold mb-2" style="font-weight: 800;">2. Registro del mes</h2>
                <table class="w-full border-collapse border-[2px] border-black font-semibold text-center mb-6">
                    <thead>
                        <tr>
                            <th class="p-2 border border-black bg-white">Fecha</th>
                            <th class="p-2 border border-black bg-white">Ofrenda</th>
                            <th class="p-2 border border-black bg-white">Diezmo</th>
                            <th class="p-2 border border-black bg-white">Ofrenda Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${htmlOfrendas}
                    </tbody>
                </table>

                <div class="border-[2px] border-black bg-slate-100 text-center font-bold p-1 mb-2">
                    Actividades económicas
                </div>
                
                <table class="w-full border-collapse border-[2px] border-black font-semibold text-center">
                    <thead>
                        <tr>
                            <th class="p-2 border border-black bg-white">Actividad</th>
                            <th class="p-2 border border-black bg-white">Egreso/Gasto</th>
                            <th class="p-2 border border-black bg-white">Ingreso</th>
                            <th class="p-2 border border-black bg-white">Ganancia</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${htmlActs}
                    </tbody>
                </table>
            </div>

            <div class="mb-6" style="font-size: 1.1rem;">
                <h2 class="font-bold mb-2" style="font-weight: 800;">3. Diezmo de las ganancias de actividades económicas</h2>
                <p class="mb-6 pl-4">${stringGananciasSuma} = $ ${totalActGanancias.toFixed(2).replace('.', ',')} % 10 de Diezmo es = <strong style="font-weight: 900;">$ ${diezmoGanancias.toFixed(2).replace('.', ',')}</strong></p>

                <h2 class="font-bold mb-2" style="font-weight: 800;">4. Ganancia/ Ingreso restante de las Actividades</h2>
                <p class="mb-6 pl-4">$ ${totalActGanancias.toFixed(2).replace('.', ',')} - $ ${diezmoGanancias.toFixed(2).replace('.', ',')} = <strong style="font-weight: 900;">$ ${gananciaRestante.toFixed(2).replace('.', ',')}</strong></p>

                <h2 class="font-bold mb-2" style="font-weight: 800;">5. Diezmo Total del mes</h2>
                <p class="mb-6 pl-4">$ ${diezmoGanancias.toFixed(2).replace('.', ',')} Actividades + $ ${diezmoOfrendas.toFixed(2).replace('.', ',')} Ofrendas = <strong style="font-weight: 900;">$ ${diezmoTotal.toFixed(2).replace('.', ',')}</strong></p>
            </div>

            <div class="mb-6" style="font-size: 1.1rem;">
                <h2 class="font-bold mb-2" style="font-weight: 800;">6. Observaciones</h2>
                <ul class="list-disc pl-8 mb-6">
                    ${htmlObs}
                </ul>

                <p class="mb-6">${htmlNota}</p>

                <h2 class="font-bold mb-2" style="font-weight: 800;">8. Saldo final</h2>
                <p class="pl-4 mb-8">
                    Saldo inicial $ ${saldoIn.toFixed(2).replace('.', ',')} + Ganancias/Ingreso de Actividades <br>
                    $ ${gananciaRestante.toFixed(2).replace('.', ',')} + Ofrendas $ ${ofrendaTotal.toFixed(2).replace('.', ',')} - Egresos $ ${totalEgresosReales.toFixed(2).replace('.', ',')} = $ ${saldoFinal.toFixed(2).replace('.', ',')}
                </p>

                <div class="font-bold italic my-12" style="font-size: 1.8rem; color: #1e3a8a;">
                    Saldo disponible – ${mesActualStr} = $ ${saldoFinal.toFixed(2).replace('.', ',')}
                </div>
            </div>

            <div class="mt-24">
                <div class="font-bold text-sm mb-12">Responsables:</div>
                <div class="grid grid-cols-3 gap-8 text-center text-sm mb-12 font-medium">
                    <div>
                        <div class="border-b-[2px] border-black w-full mb-1 h-8"></div>
                        Coord Hno. Aaron Armijos
                    </div>
                    <div>
                        <div class="border-b-[2px] border-black w-full mb-1 h-8"></div>
                        Sub Coord Hno. Josue Arevalo
                    </div>
                    <div>
                        <div class="border-b-[2px] border-black w-full mb-1 h-8"></div>
                        Tesorera Hna. Dayanna Ortiz
                    </div>
                </div>

                <div class="font-bold text-sm mb-12 mt-16">Recibido por.</div>
                <div class="w-[45%] text-center text-sm font-medium">
                    <div class="border-b-[2px] border-black w-full mb-1 h-8"></div>
                    Pastor Víctor Cañar
                </div>
            </div>
            
            <div class="flex justify-between text-xs mt-16 pt-4 border-t-[2px] border-slate-300 text-slate-500 font-bold">
                <div>${footerDateStr}</div>
                <div class="uppercase">Departamento de Jóvenes</div>
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
    const actsAbiertas = Object.values(currentActividadesCaja || {}).filter(a => a.estado !== 'CERRADA');
    if (actsAbiertas.length > 0) {
        const nombres = actsAbiertas.map(a => '• ' + a.nombre).join('\n');
        if(!confirm(`ADVERTENCIA: Hay ${actsAbiertas.length} actividad(es) sin cerrar:\n\n${nombres}\n\nSus ingresos NO serán registrados en la caja si no están cerradas.\n\n¿Deseas cerrar el período de todas formas?`)) return;
    }
    
    // Verificar consumos sin confirmar
    const actsConConsumoPendiente = Object.values(currentActividadesCaja || {}).filter(a => 
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
