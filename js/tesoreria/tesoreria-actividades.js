
// tesoreria-actividades.js
let actsListener = null;
let currentActividades = {};

function renderTesoreriaActividades() {
    const container = document.getElementById('treasurySubContent');
    if (!container) return;
    
    container.innerHTML = `
        <div id="tActividadesView">
            <div class="mb-6 flex justify-between items-end">
                <div>
                    <h2 class="text-2xl font-black text-slate-800"><i class="fas fa-store text-blue-900 mr-2"></i> Actividades (Campaña)</h2>
                    <p class="text-sm text-slate-500">Gestión de actividades económicas del período.</p>
                </div>
                <button onclick="abrirModalNuevaActividad()" class="bg-blue-900 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded-lg shadow transition-colors text-sm">
                    <i class="fas fa-plus"></i> Nueva Actividad
                </button>
            </div>
            <div id="tActividadesList" class="space-y-6">
                <div class="text-center py-10 text-slate-400 italic">Cargando actividades...</div>
            </div>
        </div>

        <!-- Floating Buttons (Checklist and Cobros) -->
        <div class="fixed bottom-24 right-6 flex flex-col gap-3 z-50">
            <button onclick="renderTesoreriaCobros()" class="bg-orange-500 hover:bg-orange-600 text-white shadow-xl shadow-orange-500/30 rounded-full w-14 h-14 flex items-center justify-center transition-transform hover:scale-110 group relative">
                <i class="fas fa-hand-holding-usd text-xl"></i>
                <span class="absolute right-full mr-3 bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">Cobros</span>
            </button>
            <button onclick="renderTesoreriaChecklist()" class="bg-blue-900 hover:bg-blue-800 text-white shadow-xl shadow-blue-900/30 rounded-full w-14 h-14 flex items-center justify-center transition-transform hover:scale-110 group relative">
                <i class="fas fa-tasks text-xl"></i>
                <span class="absolute right-full mr-3 bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">Checklist</span>
            </button>
        </div>
        
        <!-- Modal Nueva Actividad -->
        <div id="tActividadModal" class="fixed inset-0 bg-slate-900/60 z-[300] hidden flex items-center justify-center p-4">
            <div class="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div class="bg-blue-900 px-6 py-4 flex justify-between items-center text-white shrink-0">
                    <h3 class="font-bold text-lg"><i class="fas fa-plus-circle mr-2"></i> Crear Actividad</h3>
                    <button onclick="cerrarModalNuevaActividad()" class="text-white/70 hover:text-white"><i class="fas fa-times text-xl"></i></button>
                </div>
                <div class="p-6 overflow-y-auto grow">
                    <div class="mb-6 flex gap-2">
                        <button id="btnModoNueva" onclick="toggleModoCreacionAct('nueva')" class="flex-1 py-2 font-bold text-sm rounded-lg border-2 border-blue-900 bg-blue-900 text-white transition-colors">Crear desde cero</button>
                        <button id="btnModoPlantilla" onclick="toggleModoCreacionAct('plantilla')" class="flex-1 py-2 font-bold text-sm rounded-lg border-2 border-slate-300 text-slate-600 hover:border-blue-900 transition-colors">Usar plantilla</button>
                    </div>
                    
                    <form id="formNuevaActividad" onsubmit="guardarNuevaActividad(event)">
                        <input type="hidden" id="modoCreacionAct" value="nueva">
                        
                        <div id="panelCreacionNueva" class="space-y-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Nombre de la Actividad</label>
                                <input type="text" id="tActNombre" required placeholder="Ej. Venta de Corviches" class="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Fecha Programada</label>
                                <input type="date" id="tActFecha" required class="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Precio Referencial ($)</label>
                                <input type="number" id="tActPrecio" step="0.01" min="0" required placeholder="Ej. 2.50" class="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Responsable</label>
                                <input type="text" id="tActResponsable" placeholder="Opcional" class="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                            </div>
                        </div>
                        
                        <div id="panelCreacionPlantilla" class="space-y-4 hidden">
                            <div>
                                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Seleccionar Actividad Anterior</label>
                                <select id="tActPlantillaSelect" onchange="mostrarResumenPlantilla()" class="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                                    <option value="">-- Seleccionar --</option>
                                </select>
                            </div>
                            <div id="plantillaResumen" class="bg-blue-50 border border-blue-100 p-4 rounded-lg hidden text-sm text-slate-700">
                            </div>
                            <div class="bg-yellow-50 text-yellow-700 p-3 rounded-lg text-xs font-bold border border-yellow-200 mt-2">
                                <i class="fas fa-info-circle"></i> Se copiará nombre, precio e ingredientes. Los datos financieros, ingresos y egresos NO se copiarán.
                            </div>
                            <div class="mt-4">
                                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Nueva Fecha Programada</label>
                                <input type="date" id="tActPlantillaFecha" class="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                            </div>
                        </div>
                        
                        <div class="mt-6 flex justify-end gap-2 shrink-0">
                            <button type="button" onclick="cerrarModalNuevaActividad()" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300">Cancelar</button>
                            <button type="submit" id="btnGuardarAct" class="px-4 py-2 bg-blue-900 text-white font-bold rounded-lg hover:bg-blue-800">Crear Actividad</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        
        <!-- Modal Control Gasto (Ingrediente) -->
        <div id="tGastoModal" class="fixed inset-0 bg-slate-900/60 z-[300] hidden flex items-center justify-center p-4">
            <div class="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div class="bg-slate-800 px-6 py-4 flex justify-between items-center text-white shrink-0">
                    <h3 id="tGastoModalTitle" class="font-bold text-lg"><i class="fas fa-shopping-basket mr-2"></i> Añadir Ingrediente/Material</h3>
                    <button onclick="cerrarModalGasto()" class="text-white/70 hover:text-white"><i class="fas fa-times text-xl"></i></button>
                </div>
                <div class="p-6 overflow-y-auto grow">
                    <form id="formGastoActividad" onsubmit="guardarGastoActividad(event)">
                        <input type="hidden" id="tGastoActId">
                        <input type="hidden" id="tGastoId">
                        <input type="hidden" id="tGastoImprevisto" value="false">
                        
                        <div class="space-y-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Origen del Material</label>
                                <select id="tGastoOrigen" required onchange="toggleGastoOrigen()" class="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm">
                                    <option value="comprar">Comprar (Añadir a Checklist)</option>
                                    <option value="inventario">Tomar del Inventario</option>
                                </select>
                            </div>
                            
                            <div id="panelGastoInventario" class="hidden">
                                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Artículo de Inventario</label>
                                <select id="tGastoInventarioId" class="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm">
                                    <option value="">-- Seleccionar --</option>
                                </select>
                                <p class="text-[10px] text-blue-600 mt-1 font-bold"><i class="fas fa-info-circle"></i> Este material no generará egreso de caja.</p>
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Categoría</label>
                                <select id="tGastoCategoria" required class="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm">
                                    <option value="Ingrediente">Ingrediente</option>
                                    <option value="Empaque">Empaque / Desechable</option>
                                    <option value="Movilización">Movilización</option>
                                    <option value="Servicio">Servicio</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Descripción</label>
                                <input type="text" id="tGastoDesc" required placeholder="Ej. Plátano Verde" class="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm">
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Cantidad</label>
                                    <input type="number" id="tGastoCant" step="0.01" min="0.01" required class="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm" oninput="calcularTotalGasto()">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Unidad</label>
                                    <select id="tGastoUnidad" required onchange="toggleUnidadOtra()" class="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm">
                                        <option value="kg">kg</option>
                                        <option value="lb">lb</option>
                                        <option value="unidad">unidad</option>
                                        <option value="docena">docena</option>
                                        <option value="paquete">paquete</option>
                                        <option value="funda">funda</option>
                                        <option value="racimo">racimo</option>
                                        <option value="litro">litro</option>
                                        <option value="Otra">Otra...</option>
                                    </select>
                                </div>
                            </div>
                            <div id="panelUnidadOtra" class="hidden">
                                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Especificar Unidad</label>
                                <input type="text" id="tGastoUnidadOtra" placeholder="Ej. Gaveta" class="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm">
                            </div>
                            <div class="grid grid-cols-2 gap-3" id="panelPreciosGasto">
                                <div>
                                    <label class="block text-xs font-bold text-slate-600 uppercase mb-1">P. Unitario ($)</label>
                                    <input type="number" id="tGastoPrecio" step="0.01" min="0" required class="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm" oninput="calcularTotalGasto()">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Total Estimado ($)</label>
                                    <input type="text" id="tGastoTotal" readonly class="w-full bg-slate-200 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm font-bold cursor-not-allowed">
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Proveedor (Opcional)</label>
                                    <input type="text" id="tGastoProv" placeholder="Ej. Mercado X" class="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Ubicación (Opcional)</label>
                                    <input type="text" id="tGastoUbic" placeholder="Ej. Puesto 12" class="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm">
                                </div>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Observación</label>
                                <input type="text" id="tGastoObs" class="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm">
                            </div>
                        </div>
                        <div class="mt-6 flex justify-end gap-2 shrink-0">
                            <button type="button" onclick="cerrarModalGasto()" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300">Cancelar</button>
                            <button type="submit" id="btnGuardarGasto" class="px-4 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700">Guardar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        
        <!-- Modal Producción -->
        <div id="tProdModal" class="fixed inset-0 bg-slate-900/60 z-[300] hidden flex items-center justify-center p-4">
            <div class="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
                <div class="bg-orange-500 px-6 py-4 flex justify-between items-center text-white shrink-0">
                    <h3 class="font-bold text-lg"><i class="fas fa-utensils mr-2"></i> Producción</h3>
                    <button onclick="cerrarModalProd()" class="text-white/70 hover:text-white"><i class="fas fa-times text-xl"></i></button>
                </div>
                <div class="p-6">
                    <form id="formProduccion" onsubmit="guardarProduccion(event)">
                        <input type="hidden" id="tProdActId">
                        <div class="space-y-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Platos Preparados (Total)</label>
                                <input type="number" id="tProdPrep" min="0" required class="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-lg font-bold text-center">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Platos Vendidos</label>
                                <input type="number" id="tProdVend" min="0" required class="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-lg font-bold text-center" oninput="calcularPlatosPendientes()">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Platos Cobrados (Efectivo real)</label>
                                <input type="number" id="tProdCobrados" min="0" required class="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-lg font-bold text-center" oninput="calcularPlatosPendientes()">
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">No Vendidos</label>
                                    <input type="number" id="tProdNoVend" readonly class="w-full bg-slate-200 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 font-bold text-center cursor-not-allowed">
                                </div>
                                <div>
                                    <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">Pendientes de Cobro</label>
                                    <input type="number" id="tProdPend" readonly class="w-full bg-orange-100 border border-orange-200 text-orange-800 rounded-lg px-3 py-2 font-bold text-center cursor-not-allowed">
                                </div>
                            </div>
                        </div>
                        <div class="mt-6 flex justify-end gap-2">
                            <button type="button" onclick="cerrarModalProd()" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300">Cancelar</button>
                            <button type="submit" class="px-4 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600">Guardar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    iniciarListenerActividades();
}

function iniciarListenerActividades() {
    if (!treasuryDb || !treasuryCurrentPeriod) return;
    if (actsListener) treasuryDb.ref('actividades').orderByChild('periodo').equalTo(treasuryCurrentPeriod).off('value', actsListener);
    
    actsListener = treasuryDb.ref('actividades').orderByChild('periodo').equalTo(treasuryCurrentPeriod).on('value', snap => {
        const d = snap.val();
        currentActividades = {};
        if (d) {
            Object.keys(d).forEach(k => {
                currentActividades[k] = { id: k, ...d[k] };
            });
        }
        actualizarUIActividades();
    });
}

function actualizarUIActividades() {
    const list = document.getElementById('tActividadesList');
    
    // Checklist ahora se renderiza como pestaña independiente (tesoreria-checklist.js)
    
    if (!list) return;
    
    const acts = Object.values(currentActividades).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    
    if (acts.length === 0) {
        list.innerHTML = `<div class="bg-blue-50 text-blue-800 p-6 rounded-xl border border-blue-200 text-center"><i class="fas fa-store-slash text-3xl mb-3 opacity-50 block"></i> No hay actividades registradas en este período.</div>`;
        return;
    }
    
    let html = '';
    acts.forEach(act => {
        html += generarHtmlActividad(act);
    });
    list.innerHTML = html;
}

function generarHtmlActividad(act) {
    const cerrada = act.estado === 'CERRADA';
    const consumida = act.consumoConfirmado === true;
    
    // Preparados, Vendidos, Cobrados
    const pPrep = act.platosPreparados || 0;
    const pVend = act.platosVendidos || 0;
    const pCob = act.platosCobrados || 0;
    const precio = parseFloat(act.precio) || 0;
    
    // Inversión: Solo suma gastos confirmados en checklist
    let inversionReal = 0;
    let consumoPendiente = 0;
    const gastosArr = act.gastos ? Object.entries(act.gastos).map(([k,v]) => ({id:k, ...v})) : [];
    
    let htmlGastos = '';
    
    if (gastosArr.length === 0) {
        htmlGastos = `<div class="text-xs text-slate-400 italic py-2">No hay ingredientes registrados.</div>`;
    } else {
        htmlGastos = `<table class="w-full text-xs text-left border-collapse">
            <thead>
                <tr class="border-b border-slate-200 text-slate-500">
                    <th class="py-2">Item</th>
                    <th class="py-2">Cant</th>
                    <th class="py-2">Origen</th>
                    <th class="py-2">Subtotal</th>
                    <th class="py-2 text-center">Estado</th>
                    ${!cerrada && !consumida ? '<th class="py-2 text-right">Acción</th>' : ''}
                </tr>
            </thead>
            <tbody>`;
        gastosArr.forEach(g => {
            const sub = (parseFloat(g.cantidad)*parseFloat(g.precio)).toFixed(2);
            if (g.origen === 'comprar') {
                if (g.comprado) {
                    inversionReal += parseFloat(sub); // Confirmado via checklist
                } else {
                    consumoPendiente += parseFloat(sub);
                }
            }
            
            const badge = g.origen === 'inventario' 
                ? `<span class="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[9px] font-bold">INVENTARIO</span>`
                : g.comprado 
                    ? `<span class="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[9px] font-bold"><i class="fas fa-check"></i> COMPRADO</span>`
                    : `<span class="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-[9px] font-bold">PENDIENTE</span>`;
                    
            htmlGastos += `<tr class="border-b border-slate-100">
                <td class="py-2 font-medium text-slate-800">${escHtml(g.descripcion)}</td>
                <td class="py-2">${g.cantidad} ${g.unidad}</td>
                <td class="py-2">${g.origen === 'inventario' ? 'Inventario' : 'Compra'}</td>
                <td class="py-2 font-bold text-slate-700">$${g.origen === 'inventario' ? '0.00' : sub}</td>
                <td class="py-2 text-center">${badge}</td>
                ${!cerrada && !consumida ? `
                <td class="py-2 text-right">
                    ${!g.comprado ? `
                    <button onclick="editarGasto('${act.id}', '${g.id}')" class="text-blue-500 hover:text-blue-700 mr-2"><i class="fas fa-edit"></i></button>
                    <button onclick="eliminarGasto('${act.id}', '${g.id}')" class="text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button>
                    ` : '<span class="text-slate-300 text-[10px]">Cerrado</span>'}
                </td>` : ''}
            </tr>`;
        });
        htmlGastos += `</tbody></table>`;
    }
    
    // Rentabilidad Productiva (Potencial)
    const valPotencial = pPrep * precio;
    const ganPotencial = valPotencial - inversionReal;
    const rentProd = inversionReal > 0 ? ((ganPotencial / inversionReal) * 100).toFixed(1) : 0;
    
    // Rentabilidad Real (Efectivo)
    const valReal = pCob * precio;
    const ganReal = valReal - inversionReal;
    const rentReal = inversionReal > 0 ? ((ganReal / inversionReal) * 100).toFixed(1) : 0;
    
    const ingresoCobradoConfirmado = valReal; // Se asume ingreso=cobrados. Deudas se gestionan aparte.
    
    const fechaFormat = formatDateShort(act.fecha);
    const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const diaNombre = act.fecha ? dias[new Date(act.fecha+'T12:00:00').getDay()] : '';
    
    return `
    <div class="bg-white border ${cerrada ? 'border-slate-200 opacity-80' : 'border-blue-200'} rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div class="${cerrada ? 'bg-slate-100' : 'bg-blue-50'} px-5 py-3 border-b ${cerrada ? 'border-slate-200' : 'border-blue-100'} flex justify-between items-center flex-wrap gap-2">
            <div>
                <h4 class="font-black text-slate-800 text-lg uppercase">${escHtml(act.nombre)}</h4>
                <div class="text-xs text-slate-500 font-bold"><i class="far fa-calendar-alt"></i> ${diaNombre}, ${fechaFormat} | Resp: ${escHtml(act.responsable || 'N/A')}</div>
            </div>
            <div class="flex gap-2">
                ${!cerrada ? `
                    ${(canEditTreasury() && act.estado !== 'CERRADA' && !act.consumoConfirmado) ? `
                        <button onclick="abrirModalGastoNuevo('${act.id}')" class="bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold px-3 py-1.5 rounded text-xs transition-colors"><i class="fas fa-plus"></i> Añadir Ingred/Mat</button>
                        <button onclick="eliminarActividad('${act.id}')" class="bg-red-100 hover:bg-red-200 text-red-800 font-bold px-3 py-1.5 rounded text-xs transition-colors"><i class="fas fa-trash"></i> Eliminar Actividad</button>
                    ` : ''}
                ` : `<span class="bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold"><i class="fas fa-lock"></i> CERRADA</span>`}
            </div>
        </div>
        
        <div class="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 space-y-4">
                <div id="checklistContenedor-${act.id}"></div>
                <div>
                    <h5 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Control de Gastos</h5>
                    ${htmlGastos}
                </div>
                ${consumoPendiente > 0 && !consumida ? `
                <div class="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-xs font-bold border border-yellow-200 flex justify-between items-center">
                    <span>Consumo pendiente de compra: $${consumoPendiente.toFixed(2)}</span>
                </div>
                ` : ''}
                ${!consumida && inversionReal > 0 && canEditTreasury() ? `
                <div class="mt-4">
                    <button onclick="confirmarConsumoActividad('${act.id}', ${inversionReal}, ${ingresoCobradoConfirmado})" class="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 rounded-lg text-sm transition-colors shadow">
                        <i class="fas fa-check-double mr-1"></i> Confirmar Consumo (Afectar Caja)
                    </button>
                    <p class="text-[10px] text-center text-slate-500 mt-1">Confirmar restará la inversión de la Caja oficial.</p>
                </div>
                ` : consumida ? `
                <div class="bg-green-50 text-green-700 p-3 rounded-lg text-xs font-bold border border-green-200 text-center">
                    <i class="fas fa-check-circle"></i> Consumo confirmado y registrado en Caja.
                </div>
                ` : ''}
            </div>
            
            <div class="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div class="flex justify-between items-center border-b border-slate-200 pb-2">
                    <h5 class="text-xs font-bold text-slate-600 uppercase tracking-wider">Producción & Ingresos</h5>
                    ${!cerrada && canEditTreasury() ? `<button onclick="abrirModalProd('${act.id}')" class="text-blue-600 hover:text-blue-800 text-xs font-bold"><i class="fas fa-edit"></i> Editar</button>` : ''}
                </div>
                <div class="grid grid-cols-2 gap-2 text-sm">
                    <div class="text-slate-500">Precio/u:</div><div class="font-bold text-right text-slate-800">$${precio.toFixed(2)}</div>
                    <div class="text-slate-500">Preparados:</div><div class="font-bold text-right text-slate-800">${pPrep}</div>
                    <div class="text-slate-500">Vendidos:</div><div class="font-bold text-right text-slate-800">${pVend}</div>
                    <div class="text-slate-500">Cobrados:</div><div class="font-bold text-right text-green-600">${pCob}</div>
                    <div class="text-slate-500">No Vendidos:</div><div class="font-bold text-right text-slate-800">${pPrep - pVend}</div>
                    <div class="text-slate-500">Pendientes (Cobro):</div><div class="font-bold text-right text-orange-500">${pVend - pCob}</div>
                </div>
                <div class="border-t border-slate-200 pt-2 grid grid-cols-2 gap-2 text-sm">
                    <div class="text-slate-500 font-bold">Inversión (Gasto):</div><div class="font-bold text-right text-red-600">$${inversionReal.toFixed(2)}</div>
                    <div class="text-slate-500 font-bold">Ingreso Real:</div><div class="font-bold text-right text-green-600">$${ingresoCobradoConfirmado.toFixed(2)}</div>
                    <div class="text-slate-800 font-black">GANANCIA REAL:</div><div class="font-black text-right ${ganReal >= 0 ? 'text-green-600' : 'text-red-600'}">$${ganReal.toFixed(2)}</div>
                </div>
                
                <div class="mt-4 pt-4 border-t border-slate-200">
                    <h5 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Análisis de Rentabilidad</h5>
                    <div class="space-y-2">
                        <div class="flex justify-between items-center">
                            <span class="text-xs text-slate-600">Productiva (Potencial)</span>
                            <span class="text-xs font-bold ${rentProd >= 0 ? 'text-green-600' : 'text-red-600'}">${inversionReal > 0 ? rentProd+'%' : '-'}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-xs text-slate-600">Real (Efectivo)</span>
                            <span class="text-xs font-bold ${rentReal >= 0 ? 'text-green-600' : 'text-red-600'}">${inversionReal > 0 ? rentReal+'%' : '-'}</span>
                        </div>
                    </div>
                </div>
                
                ${!cerrada && consumida && canEditTreasury() ? `
                <div class="mt-4">
                    <button onclick="cerrarActividad('${act.id}', ${inversionReal}, ${ingresoCobradoConfirmado})" class="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-2 rounded-lg text-sm transition-colors shadow">
                        <i class="fas fa-lock mr-1"></i> Cerrar Actividad
                    </button>
                    <p class="text-[10px] text-center text-slate-500 mt-1">Bloquea edición e inyecta ingreso a Caja.</p>
                </div>
                ` : ''}
            </div>
        </div>
    </div>
    `;
}

// RESTO DE FUNCIONES DE ACTIVIDAD...
async function abrirModalNuevaActividad() {
    document.getElementById('tActividadModal').classList.remove('hidden');
    document.getElementById('formNuevaActividad').reset();
    document.getElementById('tActFecha').value = new Date().toISOString().split('T')[0];
    toggleModoCreacionAct('nueva');
    
    // Cargar historial para plantilla
    const snap = await treasuryDb.ref('actividades').once('value');
    const d = snap.val();
    const sel = document.getElementById('tActPlantillaSelect');
    sel.innerHTML = '<option value="">-- Seleccionar --</option>';
    if (d) {
        const sorted = Object.values(d).sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
        sorted.forEach(a => {
            sel.innerHTML += `<option value="${a.id}">${a.fecha} | ${escHtml(a.nombre)}</option>`;
        });
    }
}

function cerrarModalNuevaActividad() {
    document.getElementById('tActividadModal').classList.add('hidden');
}

function toggleModoCreacionAct(modo) {
    document.getElementById('modoCreacionAct').value = modo;
    if (modo === 'nueva') {
        document.getElementById('panelCreacionNueva').classList.remove('hidden');
        document.getElementById('panelCreacionPlantilla').classList.add('hidden');
        document.getElementById('btnModoNueva').className = "flex-1 py-2 font-bold text-sm rounded-lg border-2 border-blue-900 bg-blue-900 text-white transition-colors";
        document.getElementById('btnModoPlantilla').className = "flex-1 py-2 font-bold text-sm rounded-lg border-2 border-slate-300 text-slate-600 hover:border-blue-900 transition-colors";
    } else {
        document.getElementById('panelCreacionNueva').classList.add('hidden');
        document.getElementById('panelCreacionPlantilla').classList.remove('hidden');
        document.getElementById('btnModoNueva').className = "flex-1 py-2 font-bold text-sm rounded-lg border-2 border-slate-300 text-slate-600 hover:border-blue-900 transition-colors";
        document.getElementById('btnModoPlantilla').className = "flex-1 py-2 font-bold text-sm rounded-lg border-2 border-blue-900 bg-blue-900 text-white transition-colors";
    }
}

async function mostrarResumenPlantilla() {
    const id = document.getElementById('tActPlantillaSelect').value;
    const res = document.getElementById('plantillaResumen');
    if(!id) { res.classList.add('hidden'); return; }
    
    const snap = await treasuryDb.ref('actividades/'+id).once('value');
    const act = snap.val();
    if(!act) return;
    
    // Cálculo resumen
    const pPrep = act.platosPreparados||0;
    const pCob = act.platosCobrados||0;
    const precio = act.precio||0;
    let inv = 0;
    if(act.gastos) Object.values(act.gastos).forEach(g => { if(g.comprado) inv += g.cantidad*g.precio; });
    const ing = pCob * precio;
    const gan = ing - inv;
    const rp = inv>0 ? (((pPrep*precio)-inv)/inv*100).toFixed(0) : 0;
    const rr = inv>0 ? ((gan)/inv*100).toFixed(0) : 0;
    
    res.innerHTML = `
        <div class="font-bold mb-2 uppercase border-b border-blue-200 pb-1">${escHtml(act.nombre)}</div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-1">
            <div>Producción: <b>${pPrep}</b></div>
            <div>Cobrados: <b>${pCob}</b></div>
            <div>Inversión: <b>$${inv.toFixed(2)}</b></div>
            <div>Ingreso: <b>$${ing.toFixed(2)}</b></div>
            <div class="col-span-2 border-t border-blue-200 mt-1 pt-1 text-xs">
                Ganancia real: <b>$${gan.toFixed(2)}</b> | Rent. Real: <b>${rr}%</b> | Rent. Prod: <b>${rp}%</b>
            </div>
        </div>
    `;
    res.classList.remove('hidden');
    // Guardar temporalmente los datos para copiarlos
    window.tempPlantilla = act;
}

async function guardarNuevaActividad(e) {
    e.preventDefault();
    
    // Verificar período abierto
    const pSnap = await treasuryDb.ref(`periodos/${treasuryCurrentPeriod}`).once('value');
    if (!pSnap.exists() || pSnap.val().estado !== 'ABIERTO') {
        alert("El período actual no está abierto. No se pueden crear actividades.");
        return;
    }
    
    const modo = document.getElementById('modoCreacionAct').value;
    const ref = treasuryDb.ref('actividades').push();
    
    let obj = {
        id: ref.key,
        periodo: treasuryCurrentPeriod,
        estado: 'ABIERTA',
        consumoConfirmado: false,
        platosPreparados: 0,
        platosVendidos: 0,
        platosCobrados: 0,
        creadoPor: treasuryUser.email,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    if (modo === 'nueva') {
        obj.nombre = document.getElementById('tActNombre').value;
        obj.fecha = document.getElementById('tActFecha').value;
        obj.precio = parseFloat(document.getElementById('tActPrecio').value);
        obj.responsable = document.getElementById('tActResponsable').value;
    } else {
        if(!window.tempPlantilla) return alert('Seleccione una plantilla válida.');
        obj.nombre = window.tempPlantilla.nombre;
        obj.precio = window.tempPlantilla.precio;
        obj.responsable = window.tempPlantilla.responsable;
        obj.fecha = document.getElementById('tActPlantillaFecha').value || new Date().toISOString().split('T')[0];
        
        // Copiar ingredientes NO FINANCIEROS
        if(window.tempPlantilla.gastos) {
            obj.gastos = {};
            Object.entries(window.tempPlantilla.gastos).forEach(([k,g]) => {
                const newGastoId = treasuryDb.ref().push().key;
                obj.gastos[newGastoId] = {
                    id: newGastoId,
                    categoria: g.categoria,
                    descripcion: g.descripcion,
                    cantidad: g.cantidad,
                    unidad: g.unidad,
                    precio: g.precio,
                    origen: g.origen,
                    inventarioItemId: g.inventarioItemId || null,
                    proveedor: g.proveedor || '',
                    ubicacion: g.ubicacion || '',
                    observacion: g.observacion || '',
                    comprado: false // REINICIADO
                };
            });
        }
    }
    
    await ref.set(obj);
    cerrarModalNuevaActividad();
}

// Modal Produccion
function abrirModalProd(actId) {
    const act = currentActividades[actId];
    if(!act) return;
    document.getElementById('tProdActId').value = actId;
    document.getElementById('tProdPrep').value = act.platosPreparados || 0;
    document.getElementById('tProdVend').value = act.platosVendidos || 0;
    document.getElementById('tProdCobrados').value = act.platosCobrados || 0;
    calcularPlatosPendientes();
    document.getElementById('tProdModal').classList.remove('hidden');
}
function cerrarModalProd() { document.getElementById('tProdModal').classList.add('hidden'); }
function calcularPlatosPendientes() {
    const p = parseInt(document.getElementById('tProdPrep').value)||0;
    const v = parseInt(document.getElementById('tProdVend').value)||0;
    const c = parseInt(document.getElementById('tProdCobrados').value)||0;
    
    document.getElementById('tProdNoVend').value = Math.max(0, p - v);
    document.getElementById('tProdPend').value = Math.max(0, v - c);
}
async function guardarProduccion(e) {
    e.preventDefault();
    const actId = document.getElementById('tProdActId').value;
    const prep = parseInt(document.getElementById('tProdPrep').value)||0;
    const vend = parseInt(document.getElementById('tProdVend').value)||0;
    const cobr = parseInt(document.getElementById('tProdCobrados').value)||0;
    
    if (vend > prep) {
        alert("Los platos vendidos no pueden ser mayores a los preparados.");
        return;
    }
    if (cobr > vend) {
        alert("Los platos cobrados no pueden ser mayores a los vendidos.");
        return;
    }
    
    await treasuryDb.ref(`actividades/${actId}`).update({
        platosPreparados: prep,
        platosVendidos: vend,
        platosCobrados: cobr
    });
    cerrarModalProd();
}

// Gastos
function abrirModalGastoNuevo(actId) {
    document.getElementById('formGastoActividad').reset();
    document.getElementById('tGastoActId').value = actId;
    document.getElementById('tGastoId').value = '';
    document.getElementById('tGastoImprevisto').value = 'false';
    document.getElementById('tGastoModalTitle').innerHTML = '<i class="fas fa-shopping-basket mr-2"></i> Añadir Ingrediente/Material';
    toggleGastoOrigen();
    document.getElementById('tGastoModal').classList.remove('hidden');
}
function cerrarModalGasto() { document.getElementById('tGastoModal').classList.add('hidden'); }
function toggleGastoOrigen() {
    const o = document.getElementById('tGastoOrigen').value;
    if(o === 'inventario') {
        document.getElementById('panelGastoInventario').classList.remove('hidden');
        document.getElementById('panelPreciosGasto').classList.add('hidden');
        document.getElementById('tGastoPrecio').value = '0';
        document.getElementById('tGastoPrecio').removeAttribute('required');
        cargarInventarioGastoSelect();
    } else {
        document.getElementById('panelGastoInventario').classList.add('hidden');
        document.getElementById('panelPreciosGasto').classList.remove('hidden');
        document.getElementById('tGastoPrecio').setAttribute('required', 'true');
    }
}
function toggleUnidadOtra() {
    const u = document.getElementById('tGastoUnidad').value;
    if(u==='Otra') document.getElementById('panelUnidadOtra').classList.remove('hidden');
    else document.getElementById('panelUnidadOtra').classList.add('hidden');
}
function calcularTotalGasto() {
    const c = parseFloat(document.getElementById('tGastoCant').value)||0;
    const p = parseFloat(document.getElementById('tGastoPrecio').value)||0;
    document.getElementById('tGastoTotal').value = (c*p).toFixed(2);
}
async function cargarInventarioGastoSelect() {
    const sel = document.getElementById('tGastoInventarioId');
    sel.innerHTML = '<option value="">-- Cargando --</option>';
    const snap = await treasuryDb.ref('inventario').once('value');
    const d = snap.val();
    sel.innerHTML = '<option value="">-- Seleccionar --</option>';
    if(d) {
        Object.entries(d).forEach(([k,v]) => {
            if(v.estado === 'ACTIVO') sel.innerHTML += `<option value="${k}">${escHtml(v.descripcion)} (Disp: ${v.cantidad})</option>`;
        });
    }
}
async function guardarGastoActividad(e) {
    e.preventDefault();
    const actId = document.getElementById('tGastoActId').value;
    const gId = document.getElementById('tGastoId').value;
    const ref = gId ? treasuryDb.ref(`actividades/${actId}/gastos/${gId}`) : treasuryDb.ref(`actividades/${actId}/gastos`).push();
    
    let uni = document.getElementById('tGastoUnidad').value;
    if(uni === 'Otra') uni = document.getElementById('tGastoUnidadOtra').value || 'Otra';
    
    const obj = {
        id: ref.key,
        origen: document.getElementById('tGastoOrigen').value,
        inventarioItemId: document.getElementById('tGastoInventarioId').value || null,
        categoria: document.getElementById('tGastoCategoria').value,
        descripcion: document.getElementById('tGastoDesc').value,
        cantidad: parseFloat(document.getElementById('tGastoCant').value),
        unidad: uni,
        precio: parseFloat(document.getElementById('tGastoPrecio').value) || 0,
        proveedor: document.getElementById('tGastoProv').value,
        ubicacion: document.getElementById('tGastoUbic').value,
        observacion: document.getElementById('tGastoObs').value,
    };
    
    if(!gId) {
        obj.comprado = false; // Checklist inicial
        obj.imprevisto = document.getElementById('tGastoImprevisto').value === 'true';
        if(obj.imprevisto) obj.comprado = true; // Si es imprevisto en checklist, ya se asume comprado.
    }
    
    await ref.update(obj);
    cerrarModalGasto();
}

function editarGasto(actId, gastoId) {
    const act = currentActividades[actId];
    const g = act.gastos[gastoId];
    if(!g) return;
    document.getElementById('formGastoActividad').reset();
    document.getElementById('tGastoActId').value = actId;
    document.getElementById('tGastoId').value = gastoId;
    document.getElementById('tGastoOrigen').value = g.origen;
    toggleGastoOrigen();
    document.getElementById('tGastoInventarioId').value = g.inventarioItemId || '';
    document.getElementById('tGastoCategoria').value = g.categoria;
    document.getElementById('tGastoDesc').value = g.descripcion;
    document.getElementById('tGastoCant').value = g.cantidad;
    
    const uOpt = Array.from(document.getElementById('tGastoUnidad').options).map(o=>o.value);
    if(uOpt.includes(g.unidad)) {
        document.getElementById('tGastoUnidad').value = g.unidad;
        toggleUnidadOtra();
    } else {
        document.getElementById('tGastoUnidad').value = 'Otra';
        toggleUnidadOtra();
        document.getElementById('tGastoUnidadOtra').value = g.unidad;
    }
    
    document.getElementById('tGastoPrecio').value = g.precio;
    document.getElementById('tGastoProv').value = g.proveedor || '';
    document.getElementById('tGastoUbic').value = g.ubicacion || '';
    document.getElementById('tGastoObs').value = g.observacion || '';
    calcularTotalGasto();
    
    document.getElementById('tGastoModalTitle').innerHTML = '<i class="fas fa-edit mr-2"></i> Editar Ingrediente/Material';
    document.getElementById('tGastoModal').classList.remove('hidden');
}

async function eliminarGasto(actId, gastoId) {
    const act = currentActividades[actId];
    if (!act || act.consumoConfirmado || act.estado === 'CERRADA') {
        alert('No se puede modificar una actividad cerrada o con consumo confirmado.');
        return;
    }
    const g = act.gastos ? act.gastos[gastoId] : null;
    if (g && g.comprado) {
        alert('No se puede eliminar un material que ya fue marcado como comprado.');
        return;
    }
    if(confirm('¿Eliminar este material?')) {
        await treasuryDb.ref(`actividades/${actId}/gastos/${gastoId}`).remove();
        await registrarAuditoriaTesoreria(
            'ELIMINACIÓN GASTO',
            'Actividades',
            `Gasto "${g ? g.descripcion : gastoId}" eliminado de actividad ${act.nombre}`,
            actId
        );
    }
}

async function confirmarConsumoActividad(actId, gastoConfirmadoTotal, ingresoCobradoConfirmado) {
    const act = currentActividades[actId];
    if(act.consumoConfirmado) {
        alert('Este consumo ya fue confirmado previamente.');
        return;
    }
    
    // FASE 7: Bloqueo si hay compras pendientes
    if (act.gastos) {
        const pendingPurchases = Object.values(act.gastos).filter(g => g.origen === 'compra' && !g.comprado);
        if (pendingPurchases.length > 0) {
            alert('NO SE PUEDE CONFIRMAR CONSUMO.\nHay compras planificadas que aún no han sido marcadas como compradas en el Checklist.');
            return;
        }
    }
    
    if(!confirm(`¿CONFIRMAR CONSUMO FINANCIERO?\n\nAl confirmar, se descontarán $${gastoConfirmadoTotal} de la CAJA OFICIAL como un Movimiento de Egreso. Si hay materiales de inventario, se descontarán de las existencias. Esta acción NO se puede deshacer y no permite duplicados.`)) return;
    
    try {
        // Transaccionar sobre el inventario primero (si hay)
        if (act.gastos) {
            for (let gId in act.gastos) {
                const g = act.gastos[gId];
                if (g.origen === 'inventario' && g.inventarioItemId) {
                    const txResult = await treasuryDb.ref(`inventario/${g.inventarioItemId}/cantidad`).transaction(currentQty => {
                        if (currentQty === null) return; // Abort
                        const finalQty = currentQty - parseFloat(g.cantidad);
                        if (finalQty < 0) return; // Abort
                        return finalQty;
                    });
                    if (!txResult.committed) {
                        alert(`RECHAZADO: Stock insuficiente para el inventario de ${g.descripcion}.`);
                        return; // Falla la confirmación de la actividad entera
                    }
                }
            }
        }
        
        // Crear movimiento confirmado en caja (idempotente)
        const movKey = `consumo_${actId}`;
        const updates = {};
        
        if (gastoConfirmadoTotal > 0) {
            updates[`movimientos/${treasuryCurrentPeriod}/${movKey}`] = {
                id: movKey,
                tipo: 'EGRESO',
                categoria: 'Gastos de Actividad',
                descripcion: `Inversión: ${act.nombre}`,
                monto: gastoConfirmadoTotal,
                estado: 'CONFIRMADO',
                referenciaId: actId,
                origen: 'actividad',
                periodo: treasuryCurrentPeriod,
                fecha: new Date().toISOString(),
                usuario: treasuryUser.email,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };
        }
        
        updates[`actividades/${actId}/consumoConfirmado`] = true;
        
        await treasuryDb.ref().update(updates);
        
        // Registrar auditoría
        await registrarAuditoriaTesoreria(
            'CONFIRMACIÓN EGRESO E INVENTARIO', 
            'Actividades', 
            `Inversión confirmada para actividad: ${act.nombre} por $${gastoConfirmadoTotal}`, 
            movKey
        );
        
        alert('Consumo confirmado. Caja e Inventario actualizados.');
    } catch (e) {
        console.error("Error confirming consumos:", e);
        alert('Error al procesar el consumo.');
    }
}

async function cerrarActividad(actId, gastoTotal, ingresoTotal) {
    if(!confirm(`¿CERRAR ACTIVIDAD DEFINITIVAMENTE?\n\nAl cerrar, se ingresarán $${ingresoTotal} a la CAJA OFICIAL como Ingreso confirmado. Ya no se podrá editar la actividad.`)) return;
    
    const act = currentActividades[actId];
    if(act.estado === 'CERRADA') return;
    
    try {
        const movKey = `ingreso_${actId}`;
        const updates = {};
        
        if (ingresoTotal > 0) {
            updates[`movimientos/${treasuryCurrentPeriod}/${movKey}`] = {
                id: movKey,
                tipo: 'INGRESO',
                categoria: 'Ingreso de Actividad',
                descripcion: `Ingreso: ${act.nombre}`,
                monto: ingresoTotal,
                estado: 'CONFIRMADO',
                referenciaId: actId,
                origen: 'actividad',
                periodo: treasuryCurrentPeriod,
                fecha: new Date().toISOString(),
                usuario: treasuryUser.email,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };
        }
        
        updates[`actividades/${actId}/estado`] = 'CERRADA';
        
        await treasuryDb.ref().update(updates);
        
        // Registrar auditoría
        await registrarAuditoriaTesoreria(
            'CIERRE ACTIVIDAD / INGRESO', 
            'Actividades', 
            `Actividad cerrada: ${act.nombre}. Ingreso registrado: $${ingresoTotal}`, 
            movKey
        );
        
        alert('Actividad cerrada. Ingreso registrado en Caja.');
    } catch (e) {
        console.error("Error cerrando actividad:", e);
        alert('Error al cerrar actividad.');
    }
}

async function eliminarActividad(actId) {
    if (!canEditTreasury()) {
        alert("No tienes permisos para eliminar actividades.");
        return;
    }
    
    const act = currentActividades[actId];
    if (!act) return;
    
    if (act.estado === 'CERRADA' || act.consumoConfirmado) {
        alert("No se puede eliminar una actividad cerrada o con consumo confirmado.");
        return;
    }
    
    // Verificar si tiene gastos comprados
    if (act.gastos) {
        const tieneCompras = Object.values(act.gastos).some(g => g.comprado);
        if (tieneCompras) {
            alert("No se puede eliminar la actividad porque contiene ingredientes que ya han sido marcados como comprados. Primero debes eliminar o deshacer la compra de esos ingredientes.");
            return;
        }
    }
    
    // Verificar período abierto
    const pSnap = await treasuryDb.ref(`periodos/${treasuryCurrentPeriod}`).once('value');
    if (!pSnap.exists() || pSnap.val().estado !== 'ABIERTO') {
        alert("El período actual no está abierto. No se pueden eliminar actividades.");
        return;
    }
    
    if (confirm(`¿Estás seguro de que deseas eliminar permanentemente la actividad "${act.nombre}"?`)) {
        try {
            await treasuryDb.ref(`actividades/${actId}`).remove();
            
            // Registrar auditoría
            await registrarAuditoriaTesoreria(
                'ELIMINACIÓN ACTIVIDAD', 
                'Actividades', 
                `Se eliminó la actividad abierta: ${act.nombre}`, 
                actId
            );
            
            alert("Actividad eliminada correctamente.");
        } catch (err) {
            console.error("Error al eliminar la actividad:", err);
            alert("Error al eliminar la actividad: " + err.message);
        }
    }
}

// === EXPORTS GLOBALES (inline HTML onclick/onsubmit) ===
window.abrirModalNuevaActividad = abrirModalNuevaActividad;
window.cerrarModalNuevaActividad = cerrarModalNuevaActividad;
window.toggleModoCreacionAct = toggleModoCreacionAct;
window.mostrarResumenPlantilla = mostrarResumenPlantilla;
window.guardarNuevaActividad = guardarNuevaActividad;
window.abrirModalProd = abrirModalProd;
window.cerrarModalProd = cerrarModalProd;
window.calcularPlatosPendientes = calcularPlatosPendientes;
window.guardarProduccion = guardarProduccion;
window.abrirModalGastoNuevo = abrirModalGastoNuevo;
window.cerrarModalGasto = cerrarModalGasto;
window.toggleGastoOrigen = toggleGastoOrigen;
window.toggleUnidadOtra = toggleUnidadOtra;
window.calcularTotalGasto = calcularTotalGasto;
window.guardarGastoActividad = guardarGastoActividad;
window.editarGasto = editarGasto;
window.eliminarGasto = eliminarGasto;
window.eliminarActividad = eliminarActividad;
window.confirmarConsumoActividad = confirmarConsumoActividad;
window.cerrarActividad = cerrarActividad;
window.renderTesoreriaActividades = renderTesoreriaActividades;
