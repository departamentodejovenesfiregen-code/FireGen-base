
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
        
        <div class="w-full overflow-x-auto pb-4 bg-slate-100/50 p-2 sm:p-6 rounded">
            <div id="vistaPreviaInformeContainer" class="bg-white border border-slate-300 rounded shadow-lg hidden mx-auto text-slate-900 print:shadow-none print:border-none print:m-0 print:p-0" style="font-family: Arial, sans-serif; width: 794px; min-width: 794px; min-height: 1123px; padding: 48px; box-sizing: border-box;">
                <!-- Documento Renderizado -->
            </div>
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
        htmlOfrendas = `<tr><td style="border: 1.5px solid #000; padding: 8px 12px; text-align: center;" colspan="4">No hubo ofrendas en este mes</td></tr>`;
    } else {
        ofrendas.forEach((o, index) => {
            const montoOfrenda = parseFloat(o.monto);
            htmlOfrendas += `<tr>
                <td style="border: 1.5px solid #000; padding: 8px 12px; text-align: center;">${formatDateShort(o.fecha)}</td>
                <td style="border: 1.5px solid #000; padding: 8px 12px; text-align: center;">$ ${montoOfrenda.toFixed(2).replace('.', ',')}</td>`;
            if (index === 0) {
                htmlOfrendas += `
                <td style="border: 1.5px solid #000; padding: 8px 12px; text-align: center; font-weight: 700; vertical-align: middle;" rowspan="${ofrendas.length}">$ ${diezmoOfrendas.toFixed(2).replace('.', ',')}</td>
                <td style="border: 1.5px solid #000; padding: 8px 12px; text-align: center; font-weight: 700; vertical-align: middle;" rowspan="${ofrendas.length}">$ ${ofrendaTotal.toFixed(2).replace('.', ',')}</td>
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
        htmlActs = `<tr><td colspan="4" style="border: 1.5px solid #000; padding: 8px 12px; text-align: center; font-style: italic;">Sin actividades.</td></tr>`;
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
                    <td style="border: 1.5px solid #000; padding: 8px 12px; text-align: center;">${escHtml(a.nombre)}</td>
                    <td style="border: 1.5px solid #000; padding: 8px 12px; text-align: center;">$${inv.toFixed(2).replace('.', ',')}</td>
                    <td style="border: 1.5px solid #000; padding: 8px 12px; text-align: center;">$ ${ing.toFixed(2).replace('.', ',')}</td>
                    <td style="border: 1.5px solid #000; padding: 8px 12px; text-align: center;">$ ${gan.toFixed(2).replace('.', ',')}</td>
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
    
    // Get previous month name for "Saldo del mes anterior (MesAnterior)"
    let mesAnteriorStr = '';
    if(treasuryCurrentPeriod) {
        const p = treasuryCurrentPeriod.split('-');
        const prevMonthIdx = (parseInt(p[1]) - 2 + 12) % 12;
        mesAnteriorStr = mesesNombres[prevMonthIdx];
    }

    c.innerHTML = `
        <div style="font-family: 'Segoe UI', Arial, Helvetica, sans-serif; max-width: 794px; margin: auto; padding: 50px 50px 30px 50px; position: relative; color: #000; background: #fff; line-height: 1.5;">
            
            <!-- LOGO TOP RIGHT -->
            <img src="assets/logo/logo-institucional.png" alt="Logo" style="position: absolute; right: 50px; top: 40px; width: 90px; height: auto;">

            <!-- HEADER -->
            <div style="border-left: 5px solid #1e3a5f; padding-left: 14px; margin-bottom: 20px;">
                <div style="font-size: 14px; letter-spacing: 2px; color: #333; margin-bottom: 2px;">DEPARTAMENTO DE JOVENES</div>
                <div style="font-size: 32px; font-weight: 900; color: #000; letter-spacing: -1px; line-height: 1.1;">INFORME FINANCIERO</div>
            </div>
            
            <!-- MES / RESPONSABLE -->
            <div style="font-size: 15px; margin-bottom: 16px;">
                <div><strong style="font-weight: 800;">Mes:</strong> ${mesActualStr}</div>
                <div><strong style="font-weight: 800;">Responsable:</strong> ${escHtml(responsableName)} - Tesorera</div>
            </div>
            
            <!-- 1. SALDO INICIAL -->
            <div style="font-size: 15px; margin-bottom: 14px;">
                <div style="font-weight: 800; margin-bottom: 4px;">1. Saldo inicial</div>
                <ul style="margin: 0; padding-left: 28px;">
                    <li>Saldo del mes anterior (${mesAnteriorStr}): $ ${saldoIn.toFixed(2).replace('.', ',')}</li>
                </ul>
            </div>
            
            <!-- 2. REGISTRO DEL MES -->
            <div style="font-size: 15px; margin-bottom: 6px;">
                <div style="font-weight: 800; margin-bottom: 8px;">2. Registro del mes</div>
                
                <!-- TABLA OFRENDAS -->
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 14px;">
                    <thead>
                        <tr>
                            <th style="border: 1.5px solid #000; padding: 8px 12px; text-align: center; font-weight: 700;">Fecha</th>
                            <th style="border: 1.5px solid #000; padding: 8px 12px; text-align: center; font-weight: 700;">Ofrenda</th>
                            <th style="border: 1.5px solid #000; padding: 8px 12px; text-align: center; font-weight: 700;">Diezmo</th>
                            <th style="border: 1.5px solid #000; padding: 8px 12px; text-align: center; font-weight: 700;">Ofrenda Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${htmlOfrendas}
                    </tbody>
                </table>

                <!-- BANNER ACTIVIDADES -->
                <div style="border: 1.5px solid #000; text-align: center; font-weight: 700; padding: 6px 0; margin-bottom: 4px; font-size: 14px;">
                    Actividades económicas
                </div>
                
                <!-- TABLA ACTIVIDADES -->
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
                    <thead>
                        <tr>
                            <th style="border: 1.5px solid #000; padding: 8px 12px; text-align: center; font-weight: 700;">Actividad</th>
                            <th style="border: 1.5px solid #000; padding: 8px 12px; text-align: center; font-weight: 700;">Egreso/Gasto</th>
                            <th style="border: 1.5px solid #000; padding: 8px 12px; text-align: center; font-weight: 700;">Ingreso</th>
                            <th style="border: 1.5px solid #000; padding: 8px 12px; text-align: center; font-weight: 700;">Ganancia</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${htmlActs}
                    </tbody>
                </table>
            </div>

            <!-- 3. DIEZMO GANANCIAS -->
            <div style="font-size: 15px; margin-bottom: 14px;">
                <div style="font-weight: 800; margin-bottom: 4px;">3. Diezmo de las ganancias de actividades económicas</div>
                <div style="padding-left: 8px;">${stringGananciasSuma} = $ ${totalActGanancias.toFixed(2).replace('.', ',')} % 10 de Diezmo es = <strong style="font-weight: 900;">$ ${diezmoGanancias.toFixed(2).replace('.', ',')}</strong></div>
            </div>

            <!-- 4. GANANCIA RESTANTE -->
            <div style="font-size: 15px; margin-bottom: 14px;">
                <div style="font-weight: 800; margin-bottom: 4px;">4. Ganacia/ Ingreso restante de las Actividades</div>
                <div style="padding-left: 8px;">$ ${totalActGanancias.toFixed(2).replace('.', ',')} − $ ${diezmoGanancias.toFixed(2).replace('.', ',')} = <strong style="font-weight: 900;">$ ${gananciaRestante.toFixed(2).replace('.', ',')}</strong></div>
            </div>

            <!-- 5. DIEZMO TOTAL -->
            <div style="font-size: 15px; margin-bottom: 14px;">
                <div style="font-weight: 800; margin-bottom: 4px;">5. Diezmo Total del mes</div>
                <div style="padding-left: 16px;">$ ${diezmoGanancias.toFixed(2).replace('.', ',')} Actividades + $ ${diezmoOfrendas.toFixed(2).replace('.', ',')} Ofrendas = <strong style="font-weight: 900;">$ ${diezmoTotal.toFixed(2).replace('.', ',')}</strong></div>
            </div>

            <!-- 6. OBSERVACIONES -->
            <div style="font-size: 15px; margin-bottom: 14px;">
                <div style="font-weight: 800; margin-bottom: 4px;">6. Observaciones</div>
                <ul style="margin: 0 0 12px 0; padding-left: 28px;">
                    ${htmlObs}
                </ul>
            </div>

            <!-- 7. NOTA -->
            <div style="font-size: 18px; margin-bottom: 20px; padding-left: 8px;">
                ${htmlNota}
            </div>

            <!-- 8. SALDO FINAL -->
            <div style="font-size: 15px; margin-bottom: 8px;">
                <div style="font-weight: 800; margin-bottom: 4px;">8. Saldo final</div>
                <div style="padding-left: 8px;">
                    Saldo inicial $ ${saldoIn.toFixed(2).replace('.', ',')}  + Ganancias/Ingreso de Actividades<br>
                    &nbsp;&nbsp;&nbsp;$ ${gananciaRestante.toFixed(2).replace('.', ',')} + Ofrendas $ ${ofrendaTotal.toFixed(2).replace('.', ',')} - Egresos $ ${totalEgresosReales.toFixed(2).replace('.', ',')}  =  $ ${saldoFinal.toFixed(2).replace('.', ',')}
                </div>
            </div>

            <!-- SALDO DISPONIBLE BIG -->
            <div style="font-size: 28px; font-weight: 900; font-style: italic; color: #1e3a5f; margin: 30px 0 50px 0; line-height: 1.2;">
                Saldo disponible – ${mesActualStr}  =  $ ${saldoFinal.toFixed(2).replace('.', ',')}
            </div>

            <!-- FIRMAS -->
            <div style="margin-top: 60px;">
                <div style="font-weight: 700; font-style: italic; font-size: 13px; margin-bottom: 30px;">Responsables:</div>
                <div style="display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px;">
                    <div style="flex: 1; text-align: center;">
                        <div style="border-bottom: 1.5px solid #000; height: 30px; margin-bottom: 4px;"></div>
                        <div style="font-size: 12px; font-style: italic;">Coord Hno. Aaron Armijos</div>
                    </div>
                    <div style="flex: 1; text-align: center;">
                        <div style="border-bottom: 1.5px solid #000; height: 30px; margin-bottom: 4px;"></div>
                        <div style="font-size: 12px; font-style: italic;">Sub Coord Hno. Josue Arevalo</div>
                    </div>
                    <div style="flex: 1; text-align: center;">
                        <div style="border-bottom: 1.5px solid #000; height: 30px; margin-bottom: 4px;"></div>
                        <div style="font-size: 12px; font-style: italic;">Tesorera Hna. Dayanna Ortiz</div>
                    </div>
                </div>

                <div style="font-weight: 700; font-style: italic; font-size: 13px; margin-top: 30px; margin-bottom: 20px;">Recibido por:</div>
                <div style="width: 40%; text-align: center; margin-left: 30%;">
                    <div style="border-bottom: 1.5px solid #000; height: 30px; margin-bottom: 4px;"></div>
                    <div style="font-size: 12px; font-style: italic;">Pastor Víctor Cañar</div>
                </div>
            </div>
            
            <!-- FOOTER -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 50px; padding-top: 8px; border-top: 1.5px solid #ccc; font-size: 11px; color: #666;">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 14px; height: 14px; background: #2563eb; border-radius: 2px;"></div>
                    <span>${footerDateStr}</span>
                </div>
                <div style="letter-spacing: 1px;">DEPARTAMENTO DE JOVENES</div>
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
