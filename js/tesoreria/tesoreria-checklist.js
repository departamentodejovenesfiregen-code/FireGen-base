/**
 * FireGen — js/tesoreria-checklist.js
 * MÓDULO DE CHECKLIST SECUNDARIA
 * Generado automáticamente desde los ingredientes/materiales de las actividades.
 */

let checklistListenerActividades = null;
let checklistItemsGlobal = [];

function renderTesoreriaChecklist() {
    const container = document.getElementById('treasurySubContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="mb-8 flex justify-between items-end border-b-[3px] border-slate-900 pb-2">
            <div>
                <h2 class="text-xl font-bold text-slate-900 uppercase">Herramienta: Checklist de Preparación</h2>
                <p class="text-xs text-slate-500 font-bold uppercase mt-1">Extraída automáticamente de las actividades del período</p>
            </div>
        </div>
        
        <div class="mb-10">
            <div class="bg-[#faeadd] border-2 border-slate-900 border-b-0 p-3 text-center">
                <h3 class="font-bold text-slate-900 uppercase tracking-widest text-sm">Lista de Compras y Materiales</h3>
            </div>
            
            <table class="w-full text-left border-collapse border-2 border-slate-900">
                <thead>
                    <tr class="bg-[#faeadd]">
                        <th class="border border-slate-900 p-2 text-slate-800 font-semibold text-sm w-16 text-center">Estado</th>
                        <th class="border border-slate-900 p-2 text-slate-800 font-semibold text-sm w-48">Actividad</th>
                        <th class="border border-slate-900 p-2 text-slate-800 font-semibold text-sm">Artículo</th>
                        <th class="border border-slate-900 p-2 text-slate-800 font-semibold text-sm w-32">Cant.</th>
                        <th class="border border-slate-900 p-2 text-slate-800 font-semibold text-sm w-32">Ubicación</th>
                    </tr>
                </thead>
                <tbody id="tChecklistBody" class="bg-white">
                    <tr><td colspan="5" class="p-8 text-center text-slate-500 italic">Cargando checklist desde actividades...</td></tr>
                </tbody>
            </table>
        </div>

        <!-- MODAL: MARCAR COMPRADO (ACTUALIZA ACTIVIDAD) -->
        <div id="tCompradoModal" class="hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[350] overflow-y-auto">
            <div class="bg-white max-w-md w-full p-8 shadow-2xl border-t-4 border-green-600">
                <h3 class="text-xl font-bold text-slate-900 mb-2 uppercase tracking-wide">Confirmar Compra Real</h3>
                <p class="text-sm text-slate-500 mb-6 font-bold" id="tCompradoDescLbl"></p>
                
                <form id="tCompradoForm" class="space-y-4" onsubmit="guardarCompraChecklistGlobal(event)">
                    <input type="hidden" id="tCompradoActId">
                    <input type="hidden" id="tCompradoGastoId">
                    
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1 text-green-700">Precio Unitario Real ($)</label>
                        <input type="number" step="0.01" min="0" id="tCompradoPrecioU" required class="w-full bg-green-50 border border-green-300 p-2.5 text-sm font-bold focus:border-green-600">
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Proveedor</label>
                            <input type="text" id="tCompradoProv" class="w-full bg-slate-50 border border-slate-300 p-2 text-sm focus:border-green-600">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Ubicación</label>
                            <input type="text" id="tCompradoUbic" class="w-full bg-slate-50 border border-slate-300 p-2 text-sm focus:border-green-600">
                        </div>
                    </div>
                    
                    <p class="text-xs text-orange-600 bg-orange-50 p-2 border border-orange-200 mt-2 rounded font-bold">
                        <i class="fas fa-info-circle"></i> Al confirmar, pasará al "Consumo Pendiente" de la actividad correspondiente. No genera egreso de Caja hasta que se confirme en la actividad.
                    </p>
                    
                    <div class="pt-4 flex gap-2">
                        <button type="button" onclick="cerrarModalCompradoGlobal()" class="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 uppercase">Cancelar</button>
                        <button type="submit" class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 uppercase">Confirmar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    iniciarListenerChecklistActividades();
}

function iniciarListenerChecklistActividades() {
    if (!treasuryDb || !treasuryCurrentPeriod) return;
    if (checklistListenerActividades) treasuryDb.ref('actividades').off('value', checklistListenerActividades);
    
    checklistListenerActividades = treasuryDb.ref('actividades')
        .orderByChild('periodo')
        .equalTo(treasuryCurrentPeriod)
        .on('value', snap => {
            const actData = snap.val() || {};
            checklistItemsGlobal = [];
            
            Object.entries(actData).forEach(([actId, act]) => {
                if (act.gastos) {
                    Object.entries(act.gastos).forEach(([gastoId, g]) => {
                        // REGLA 21: Solo mostrar cosas para comprar o del inventario
                        if (g.origen !== 'inventario') {
                            checklistItemsGlobal.push({
                                actId: actId,
                                actNombre: act.nombre,
                                gastoId: gastoId,
                                actConsumoConfirmado: act.consumoConfirmado,
                                actCerrada: act.estado === 'CERRADA',
                                ...g
                            });
                        }
                    });
                }
            });
            
            actualizarUIChecklistGlobal();
        });
}

function actualizarUIChecklistGlobal() {
    const tbody = document.getElementById('tChecklistBody');
    if (!tbody) return;
    
    if (checklistItemsGlobal.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-500 italic">No hay ingredientes/materiales registrados en las actividades de este período.</td></tr>';
        return;
    }
    
    tbody.innerHTML = checklistItemsGlobal.map(item => {
        const rowClass = item.comprado ? 'bg-slate-100 text-slate-500 line-through opacity-75' : 'bg-white text-slate-800';
        let chkIcon = '';
        
        if (item.actConsumoConfirmado || item.actCerrada) {
            chkIcon = item.comprado ? '<i class="fas fa-check-square text-green-600 text-lg"></i>' : '<i class="fas fa-lock text-slate-400 text-lg" title="Bloqueado por confirmación"></i>';
        } else {
            chkIcon = item.comprado ? '<i class="fas fa-check-square text-green-600 text-lg"></i>' : '<i class="far fa-square text-slate-400 text-lg"></i>';
        }
        
        const btnHtml = (!item.comprado && !item.actConsumoConfirmado && !item.actCerrada && canEditTreasury()) 
            ? `<button onclick="iniciarCompraChecklistGlobal('${item.actId}', '${item.gastoId}')">${chkIcon}</button>` 
            : chkIcon;
            
        return `
            <tr class="${rowClass}">
                <td class="border border-slate-900 p-2 text-center">${btnHtml}</td>
                <td class="border border-slate-900 p-2 text-xs font-bold text-blue-900">${escHtml(item.actNombre)}</td>
                <td class="border border-slate-900 p-2 text-sm"><span class="font-bold text-xs mr-2 text-slate-500">[${item.categoria}]</span> ${escHtml(item.descripcion)}</td>
                <td class="border border-slate-900 p-2 text-sm font-bold">${item.cantidad} ${item.unidad}</td>
                <td class="border border-slate-900 p-2 text-xs text-slate-500">${escHtml(item.ubicacion || '-')}</td>
            </tr>
        `;
    }).join('');
}

function iniciarCompraChecklistGlobal(actId, gastoId) {
    const item = checklistItemsGlobal.find(i => i.actId === actId && i.gastoId === gastoId);
    if (!item) return;
    
    document.getElementById('tCompradoActId').value = actId;
    document.getElementById('tCompradoGastoId').value = gastoId;
    document.getElementById('tCompradoDescLbl').textContent = `Comprando: ${item.cantidad} ${item.unidad} de ${item.descripcion}`;
    
    document.getElementById('tCompradoPrecioU').value = item.precio || 0;
    document.getElementById('tCompradoProv').value = item.proveedor || '';
    document.getElementById('tCompradoUbic').value = item.ubicacion || '';
    
    document.getElementById('tCompradoModal').classList.remove('hidden');
}

function cerrarModalCompradoGlobal() {
    document.getElementById('tCompradoModal').classList.add('hidden');
}

async function guardarCompraChecklistGlobal(e) {
    e.preventDefault();
    const actId = document.getElementById('tCompradoActId').value;
    const gastoId = document.getElementById('tCompradoGastoId').value;
    
    const precioU = parseFloat(document.getElementById('tCompradoPrecioU').value) || 0;
    const prov = document.getElementById('tCompradoProv').value;
    const ubic = document.getElementById('tCompradoUbic').value;
    
    const item = checklistItemsGlobal.find(i => i.actId === actId && i.gastoId === gastoId);
    if (!item) return;
    
    const totalReal = item.cantidad * precioU;
    
    try {
        await treasuryDb.ref(`actividades/${actId}/gastos/${gastoId}`).update({
            comprado: true,
            precio: precioU,
            proveedor: prov,
            ubicacion: ubic,
            fechaCompra: new Date().toISOString(),
            usuarioCompra: treasuryUser.email
        });
        
        cerrarModalCompradoGlobal();
    } catch(err) {
        alert('Error al registrar compra: ' + err.message);
    }
}

// === EXPORTS GLOBALES ===
window.renderTesoreriaChecklist = renderTesoreriaChecklist;
window.iniciarCompraChecklistGlobal = iniciarCompraChecklistGlobal;
window.cerrarModalCompradoGlobal = cerrarModalCompradoGlobal;
window.guardarCompraChecklistGlobal = guardarCompraChecklistGlobal;
