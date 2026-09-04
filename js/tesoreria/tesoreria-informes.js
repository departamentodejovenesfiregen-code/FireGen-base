/**
 * FireGen — js/tesoreria-informes.js
 * MÓDULO DE INFORMES FINANCIEROS Y CIERRE (TESORERÍA)
 */

async function renderTesoreriaInformes() {
    const container = document.getElementById('treasurySubContent');
    if (!container) return;
    
    container.innerHTML = '<div class="p-8 text-center text-slate-500 italic"><i class="fas fa-circle-notch fa-spin mr-1"></i> Generando informe financiero...</div>';
    
    try {
        const estadoSnap = await treasuryDb.ref('periodos/' + treasuryCurrentPeriod).once('value');
        const estadoObj = estadoSnap.val() || {};
        const estado = estadoObj.estado || 'ABIERTO';
        
        const cajaSnap = await treasuryDb.ref('caja').once('value');
        const todasCaja = cajaSnap.val() || {};
        const arrCaja = Object.entries(todasCaja).map(([id, val]) => ({ id, ...val }));
        
        let saldoInicial = 0;
        let movimientosMes = [];
        
        arrCaja.forEach(m => {
            const monto = parseFloat(m.monto) || 0;
            const per = m.periodo || m.fecha.substring(0, 7);
            
            if (m.cerrado) {
                if (per < treasuryCurrentPeriod) {
                    if (m.tipo === 'ingreso') saldoInicial += monto;
                    else if (m.tipo === 'egreso') saldoInicial -= monto;
                }
                if (per === treasuryCurrentPeriod) {
                    movimientosMes.push(m);
                }
            }
        });
        
        movimientosMes.sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
        
        // 2. REGISTRO DEL MES (Ofrendas por fecha)
        let ofrendasPorFecha = {};
        let totalOfrendasBrutas = 0;
        let egresosObservaciones = [];
        let totalEgresosVarios = 0;
        
        movimientosMes.forEach(m => {
            if (m.tipo === 'ingreso' && m.categoria !== 'Venta Actividad') {
                if (!ofrendasPorFecha[m.fecha]) ofrendasPorFecha[m.fecha] = 0;
                ofrendasPorFecha[m.fecha] += parseFloat(m.monto);
                totalOfrendasBrutas += parseFloat(m.monto);
            } else if (m.tipo === 'egreso' && m.categoria !== 'Consumo Caja') {
                if (!m.descripcion.includes('Gastos de actividad:')) {
                    egresosObservaciones.push(m);
                    totalEgresosVarios += parseFloat(m.monto);
                }
            }
        });
        
        let htmlOfrendas = '';
        let totalOfrendaNeta = 0;
        let totalDiezmoOfrenda = 0;
        
        if (Object.keys(ofrendasPorFecha).length > 0) {
            htmlOfrendas = Object.entries(ofrendasPorFecha).map(([fecha, monto]) => {
                const diezmo = monto * 0.10;
                const neta = monto - diezmo;
                totalDiezmoOfrenda += diezmo;
                totalOfrendaNeta += neta;
                return `
                    <tr>
                        <td class="border border-slate-900 p-1">${formatDateShort(fecha)}</td>
                        <td class="border border-slate-900 p-1">$${monto.toFixed(2)}</td>
                        <td class="border border-slate-900 p-1 text-red-700 font-medium">$${diezmo.toFixed(2)}</td>
                        <td class="border border-slate-900 p-1 font-bold">$${neta.toFixed(2)}</td>
                    </tr>
                `;
            }).join('');
        } else {
            htmlOfrendas = '<tr><td colspan="4" class="border border-slate-900 p-2 text-slate-500 italic">No hay ofrendas registradas en este mes.</td></tr>';
        }
        
        // 3. ACTIVIDADES ECONÓMICAS
        const actSnap = await treasuryDb.ref('actividades').orderByChild('periodo').equalTo(treasuryCurrentPeriod).once('value');
        const actData = actSnap.val() || {};
        const actividadesMes = Object.entries(actData).map(([id, val]) => ({ id, ...val }));
        
        let actsResumen = [];
        let cuentasPorCobrar = 0;
        
        actividadesMes.forEach(act => {
            if (act.cerrada) {
                let egreso = 0;
                if (act.gastos) {
                    // Sumamos gastos. Ignoramos origen="INVENTARIO" si existe para que no suba el egreso. 
                    Object.values(act.gastos).forEach(g => {
                        if(g.origen !== 'INVENTARIO') {
                            egreso += parseFloat(g.total || 0);
                        }
                    });
                }
                let ingreso = (act.cobrados || 0) * act.precio;
                let ganancia = ingreso - egreso;
                
                actsResumen.push({
                    nombre: act.nombre,
                    egreso: egreso,
                    ingreso: ingreso,
                    ganancia: ganancia
                });
            }
            
            if (act.deudas) {
                Object.values(act.deudas).forEach(d => {
                    if (!d.pagado) cuentasPorCobrar += (d.cantidad * d.precio);
                });
            }
        });
        
        let gananciaBrutaActividades = 0;
        let htmlActividades = '';
        let formulaGananciasStr = [];
        
        if (actsResumen.length > 0) {
            htmlActividades = actsResumen.map(a => {
                gananciaBrutaActividades += a.ganancia;
                formulaGananciasStr.push(`$${a.ganancia.toFixed(2)}`);
                return `
                    <tr>
                        <td class="border border-slate-900 p-1 text-left px-2">${escHtml(a.nombre)}</td>
                        <td class="border border-slate-900 p-1 text-red-700">$${a.egreso.toFixed(2)}</td>
                        <td class="border border-slate-900 p-1 text-blue-700">$${a.ingreso.toFixed(2)}</td>
                        <td class="border border-slate-900 p-1 font-bold">$${a.ganancia.toFixed(2)}</td>
                    </tr>
                `;
            }).join('');
        } else {
            htmlActividades = '<tr><td colspan="4" class="border border-slate-900 p-2 text-slate-500 italic">No hay actividades cerradas registradas.</td></tr>';
            formulaGananciasStr.push('$0.00');
        }
        
        const diezmoActividades = gananciaBrutaActividades * 0.10;
        const ingresoRestanteActividades = gananciaBrutaActividades - diezmoActividades;
        const diezmoTotalMes = totalDiezmoOfrenda + diezmoActividades;
        const saldoFinalCalculado = saldoInicial + totalOfrendaNeta + ingresoRestanteActividades - totalEgresosVarios;
        
        // 7. OBSERVACIONES
        let htmlObs = '';
        if (egresosObservaciones.length > 0) {
            htmlObs = '<ul class="list-disc list-inside mt-1 ml-2 text-slate-800">';
            egresosObservaciones.forEach(e => {
                htmlObs += `<li>${escHtml(e.descripcion)}: <span class="font-bold text-red-600">$${parseFloat(e.monto).toFixed(2)}</span></li>`;
            });
            htmlObs += '</ul>';
        } else {
            htmlObs = ' <span class="text-slate-500 italic">Sin observaciones o egresos adicionales.</span>';
        }
        
        // Mes String
        const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const currentYear = parseInt(treasuryCurrentPeriod.split('-')[0]);
        const currentMonthNum = parseInt(treasuryCurrentPeriod.split('-')[1]) - 1;
        const mesActualStr = `${mesesNombres[currentMonthNum]} ${currentYear}`;
        const emailUsuario = treasuryUser ? treasuryUser.email : 'Tesorero';

        const btnCerrarMes = (estado !== 'CERRADO' && canEditTreasury()) ? `
            <div class="mt-8 pt-4 border-t-2 border-slate-200 text-center print:hidden">
                <button onclick="cerrarMesOficial()" class="bg-red-700 hover:bg-red-800 text-white font-bold py-3 px-8 text-sm tracking-widest shadow-md uppercase">
                    <i class="fas fa-lock mr-2"></i> Cerrar Mes Oficialmente
                </button>
                <p class="text-[10px] text-slate-500 mt-2 font-bold">Atención: El cierre del mes impedirá futuras modificaciones en este período.</p>
            </div>
        ` : '';
        
        container.innerHTML = `
            <div class="flex justify-between items-center mb-4 print:hidden">
                <h2 class="text-xl font-bold text-slate-900 uppercase">Informe Financiero</h2>
                <button onclick="window.print()" class="bg-slate-800 text-white px-4 py-2 text-sm font-bold shadow-sm">
                    <i class="fas fa-print mr-1"></i> Imprimir PDF
                </button>
            </div>
            
            ${estado === 'CERRADO' ? '<div class="bg-red-100 text-red-800 border-l-4 border-red-600 p-4 mb-6 font-bold print:hidden">Este período ha sido CERRADO. El informe es definitivo y de solo lectura.</div>' : ''}
            
            <div class="max-w-4xl mx-auto bg-white border-2 border-slate-900 p-8 print:p-0 print:border-none">
                <!-- CABECERA PDF -->
                <div class="text-center mb-8">
                    ${/* Usamos el logo institucional real según lo solicitado */ ''}
                    <img src="assets/logo/logo-institucional.png" alt="Logo FireGen" class="h-20 mx-auto mb-3 object-contain" onerror="this.style.display='none'">
                    <h2 class="text-2xl font-black uppercase text-slate-900">Departamento de Jóvenes</h2>
                    <h3 class="text-xl font-semibold uppercase tracking-[0.2em] mt-1 text-slate-800">Informe Financiero</h3>
                </div>
                
                <div class="flex justify-between text-sm font-bold border-b-[3px] border-slate-900 pb-3 mb-6">
                    <div>Mes: <span class="uppercase">${mesActualStr}</span></div>
                    <div>Responsable: <span class="font-normal">${emailUsuario}</span></div>
                </div>
                
                <!-- 1. SALDO INICIAL -->
                <div class="mb-6">
                    <h4 class="font-bold text-slate-900 text-sm mb-1 uppercase tracking-wider">1. Saldo Inicial</h4>
                    <p class="text-sm ml-4">Saldo del mes anterior: <span class="font-bold border-b border-slate-400 px-2">$${saldoInicial.toFixed(2)}</span></p>
                </div>
                
                <!-- 2. REGISTRO DEL MES -->
                <div class="mb-6">
                    <h4 class="font-bold text-slate-900 text-sm mb-2 uppercase tracking-wider">2. Registro del Mes (Ofrendas)</h4>
                    <table class="w-full border-collapse border border-slate-900 text-sm text-center">
                        <thead>
                            <tr class="bg-slate-100 uppercase tracking-widest text-xs">
                                <th class="border border-slate-900 p-2 w-1/4">Fecha</th>
                                <th class="border border-slate-900 p-2 w-1/4">Ofrenda</th>
                                <th class="border border-slate-900 p-2 w-1/4">Diezmo</th>
                                <th class="border border-slate-900 p-2 w-1/4">Ofrenda Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${htmlOfrendas}
                        </tbody>
                        <tfoot>
                            <tr class="bg-slate-50 font-bold text-slate-900">
                                <td class="border border-slate-900 p-2 text-right uppercase tracking-wider">Total</td>
                                <td class="border border-slate-900 p-2">$${totalOfrendasBrutas.toFixed(2)}</td>
                                <td class="border border-slate-900 p-2 text-red-700">$${totalDiezmoOfrenda.toFixed(2)}</td>
                                <td class="border border-slate-900 p-2 text-blue-900">$${totalOfrendaNeta.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                
                <!-- 3. ACTIVIDADES ECONÓMICAS -->
                <div class="mb-6">
                    <h4 class="font-bold text-slate-900 text-sm mb-2 uppercase tracking-wider">3. Actividades Económicas</h4>
                    <table class="w-full border-collapse border border-slate-900 text-sm text-center">
                        <thead>
                            <tr class="bg-slate-100 uppercase tracking-widest text-xs">
                                <th class="border border-slate-900 p-2 w-2/5">Actividad</th>
                                <th class="border border-slate-900 p-2 w-1/5">Egreso/Gasto</th>
                                <th class="border border-slate-900 p-2 w-1/5">Ingreso</th>
                                <th class="border border-slate-900 p-2 w-1/5">Ganancia</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${htmlActividades}
                        </tbody>
                    </table>
                </div>
                
                <!-- 4. DIEZMO DE LAS GANANCIAS -->
                <div class="mb-6 text-sm flex gap-2 items-baseline text-slate-900">
                    <h4 class="font-bold uppercase tracking-wider w-3/5">4. Diezmo de las Ganancias de Actividades Económicas:</h4>
                    <div class="font-medium text-right w-2/5 border-b border-dashed border-slate-400">
                        (${formulaGananciasStr.join(' + ')}) = $${gananciaBrutaActividades.toFixed(2)} × 10% = <span class="font-bold">$${diezmoActividades.toFixed(2)}</span>
                    </div>
                </div>
                
                <!-- 5. GANANCIA / INGRESO RESTANTE -->
                <div class="mb-6 text-sm flex gap-2 items-baseline text-slate-900">
                    <h4 class="font-bold uppercase tracking-wider w-3/5">5. Ganancia / Ingreso Restante de las Actividades:</h4>
                    <div class="font-medium text-right w-2/5 border-b border-dashed border-slate-400">
                        Ganancias $${gananciaBrutaActividades.toFixed(2)} - Diezmo $${diezmoActividades.toFixed(2)} = <span class="font-bold">$${ingresoRestanteActividades.toFixed(2)}</span>
                    </div>
                </div>
                
                <!-- 6. DIEZMO TOTAL -->
                <div class="mb-6 text-sm flex gap-2 items-baseline text-slate-900">
                    <h4 class="font-bold uppercase tracking-wider w-3/5">6. Diezmo Total del Mes:</h4>
                    <div class="font-medium text-right w-2/5 border-b border-dashed border-slate-400">
                        Diezmo Act. $${diezmoActividades.toFixed(2)} + Diezmo Ofr. $${totalDiezmoOfrenda.toFixed(2)} = <span class="font-bold text-red-700">$${diezmoTotalMes.toFixed(2)}</span>
                    </div>
                </div>
                
                <!-- 7. OBSERVACIONES -->
                <div class="mb-6 text-sm">
                    <h4 class="font-bold uppercase tracking-wider inline">7. Observaciones:</h4>
                    ${htmlObs}
                </div>
                
                <!-- 8. NOTA -->
                <div class="mb-8 text-sm text-slate-800 p-3 bg-slate-50 border border-slate-200">
                    <h4 class="font-bold uppercase tracking-wider inline mr-2 text-slate-900">8. Nota:</h4> Existe un valor pendiente de cobro de <span class="font-bold bg-orange-200 px-1 text-orange-900">$${cuentasPorCobrar.toFixed(2)}</span> correspondiente a actividades económicas de este mes.
                </div>
                
                <!-- 9. SALDO FINAL -->
                <div class="mb-8 text-sm">
                    <h4 class="font-bold uppercase tracking-wider mb-2 text-slate-900">9. Saldo Final</h4>
                    <div class="border-2 border-slate-900 p-3 font-medium bg-white text-center">
                        <span class="inline-block mx-1">Saldo Inicial <span class="font-bold">$${saldoInicial.toFixed(2)}</span></span> +
                        <span class="inline-block mx-1">Ofrendas netas <span class="font-bold">$${totalOfrendaNeta.toFixed(2)}</span></span> +
                        <span class="inline-block mx-1">Ganancias netas <span class="font-bold">$${ingresoRestanteActividades.toFixed(2)}</span></span> -
                        <span class="inline-block mx-1">Egresos <span class="font-bold text-red-700">$${totalEgresosVarios.toFixed(2)}</span></span>
                        = <span class="font-bold">$${saldoFinalCalculado.toFixed(2)}</span>
                    </div>
                    <div class="mt-6 text-center border-t border-b border-slate-900 py-4 bg-slate-100">
                        <span class="font-black text-xl uppercase tracking-widest text-slate-900">SALDO DISPONIBLE – ${mesActualStr.toUpperCase()}: $${saldoFinalCalculado.toFixed(2)}</span>
                    </div>
                </div>
                
                <!-- FIRMAS -->
                <div class="mt-16 pt-8 grid grid-cols-3 gap-8 text-center text-xs font-bold text-slate-800 uppercase print:mt-12">
                    <div>
                        <div class="border-t border-slate-900 mx-4 pt-2">Elaborado Por<br>(Tesorera)</div>
                    </div>
                    <div>
                        <div class="border-t border-slate-900 mx-4 pt-2">Revisado Por<br>(Directiva)</div>
                    </div>
                    <div>
                        <div class="border-t border-slate-900 mx-4 pt-2">Aprobado Por<br>(Pastor/a)</div>
                    </div>
                </div>
            </div>
            
            ${btnCerrarMes}
        `;
        
    } catch(err) {
        container.innerHTML = `<div class="p-8 text-center text-red-500 font-bold">Error al generar informe: ${err.message}</div>`;
    }
}

async function cerrarMesOficial() {
    if(!confirm('¿Estás seguro de cerrar el mes oficialmente? \\n\\nEsta acción CONGELARÁ el estado de la tesorería de este período y no se podrán agregar más ingresos, egresos ni cerrar actividades pasadas.\\n\\nLas cuentas por cobrar pendientes se mantendrán y podrán ser pagadas en el MES ACTUAL en curso.')) return;
    
    try {
        await treasuryDb.ref('periodos/' + treasuryCurrentPeriod).update({
            estado: 'CERRADO',
            cerradoPor: treasuryUser.email,
            cerradoEn: new Date().toISOString()
        });
        
        alert('El período se ha cerrado oficialmente. El informe ahora es inmutable.');
        renderTesoreriaInformes();
    } catch(err) {
        alert(err.message);
    }
}

