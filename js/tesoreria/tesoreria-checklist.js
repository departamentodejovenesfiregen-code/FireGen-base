/**
 * FireGen — js/tesoreria-checklist.js
 * MÓDULO DE CHECKLIST SECUNDARIA
 */

let checklistListener = null;
let itemsChecklist = [];

function renderTesoreriaChecklist() {
    const container = document.getElementById('treasurySubContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="mb-8 flex justify-between items-end border-b-[3px] border-slate-900 pb-2">
            <h2 class="text-xl font-bold text-slate-900 uppercase">Herramienta: Checklist de Preparación</h2>
            ${canEditTreasury() ? `
            <button onclick="abrirModalChecklist()" class="bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 text-sm font-bold shadow-sm print:hidden">
                + Nuevo Elemento
            </button>
            ` : ''}
        </div>
        
        <div class="mb-10">
            <div class="bg-[#faeadd] border-2 border-slate-900 border-b-0 p-3 text-center">
                <h3 class="font-bold text-slate-900 uppercase tracking-widest text-sm">Lista de Compras y Materiales Pendientes</h3>
            </div>
            
            <table class="w-full text-left border-collapse border-2 border-slate-900">
                <thead>
                    <tr class="bg-[#faeadd]">
                        <th class="border border-slate-900 p-2 text-slate-800 font-semibold text-sm w-16 text-center">Estado</th>
                        <th class="border border-slate-900 p-2 text-slate-800 font-semibold text-sm w-32">Acción</th>
                        <th class="border border-slate-900 p-2 text-slate-800 font-semibold text-sm">Artículo</th>
                        ${canEditTreasury() ? '<th class="border border-slate-900 p-2 text-slate-800 font-semibold text-sm w-16 text-center print:hidden">Del</th>' : ''}
                    </tr>
                </thead>
                <tbody id="tChecklistBody" class="bg-white">
                    <tr><td colspan="4" class="p-8 text-center text-slate-500 italic">Cargando checklist...</td></tr>
                </tbody>
            </table>
        </div>

        <!-- MODAL: NUEVO ITEM -->
        <div id="tChecklistModal" class="hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[300]">
            <div class="bg-white max-w-md w-full p-8 shadow-2xl border-t-4 border-blue-900">
                <h3 class="text-xl font-bold text-slate-900 mb-6 flex justify-between items-center uppercase tracking-wide">
                    <span>Añadir a Checklist</span>
                    <button type="button" onclick="cerrarModalChecklist()" class="text-slate-400 hover:text-red-600"><i class="fas fa-times text-lg"></i></button>
                </h3>
                <form id="tChecklistForm" class="space-y-4" onsubmit="guardarItemChecklist(event)">
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Acción Requerida</label>
                        <select id="tChkAccion" required class="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm font-medium focus:border-blue-900 focus:outline-none">
                            <option value="COMPRAR">Comprar (Genera Egreso)</option>
                            <option value="INVENTARIO">Tomar del Inventario</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Categoría</label>
                        <select id="tChkCat" required class="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm focus:border-blue-900">
                            <option value="Materia Prima">Materia Prima / Ingredientes</option>
                            <option value="Empaque">Empaque / Desechables</option>
                            <option value="Limpieza">Limpieza</option>
                            <option value="Otros">Otros</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Artículo y Cantidad</label>
                        <input type="text" id="tChkDesc" required placeholder="Ej: 2 Libras de Maní" class="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm focus:border-blue-900">
                    </div>
                    <div class="pt-4">
                        <button type="submit" class="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 uppercase tracking-wide">Añadir</button>
                    </div>
                </form>
            </div>
        </div>
        
        <!-- MODAL: MARCAR COMPRADO (ASIGNAR A ACTIVIDAD) -->
        <div id="tCompradoModal" class="hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[350] overflow-y-auto">
            <div class="bg-white max-w-md w-full p-8 shadow-2xl border-t-4 border-green-600">
                <h3 class="text-xl font-bold text-slate-900 mb-2 uppercase tracking-wide">Registrar Compra</h3>
                <p class="text-sm text-slate-500 mb-6" id="tCompradoDescLbl"></p>
                
                <form id="tCompradoForm" class="space-y-4" onsubmit="guardarCompraChecklist(event)">
                    <input type="hidden" id="tCompradoId">
                    <input type="hidden" id="tCompradoOrigen">
                    <input type="hidden" id="tCompradoCat">
                    <input type="hidden" id="tCompradoDesc">
                    
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Asignar a Actividad</label>
                        <select id="tCompradoActividad" required class="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm focus:border-green-600">
                            <!-- Llenado dinámico -->
                        </select>
                    </div>
                    
                    <div id="tCompradoCostoContainer">
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1 text-green-700">Costo Total ($)</label>
                        <input type="number" step="0.01" min="0" id="tCompradoCosto" class="w-full bg-green-50 border border-green-300 p-2.5 text-sm font-bold focus:border-green-600">
                    </div>
                    
                    <div class="pt-4 flex gap-2">
                        <button type="button" onclick="cerrarModalComprado()" class="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 uppercase">Cancelar</button>
                        <button type="submit" class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 uppercase">Confirmar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    iniciarListenerChecklist();
}

function iniciarListenerChecklist() {
    if (!treasuryDb) return;
    if (checklistListener) treasuryDb.ref('checklist').off('value', checklistListener);
    
    checklistListener = treasuryDb.ref('checklist').on('value', snap => {
        const data = snap.val() || {};
        itemsChecklist = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        actualizarUIChecklist();
    });
}

function actualizarUIChecklist() {
    const tbody = document.getElementById('tChecklistBody');
    if (!tbody) return;
    
    const mostrar = itemsChecklist.filter(item => {
        if (!item.comprado) return true;
        return item.periodoComprado === treasuryCurrentPeriod;
    });
    
    if (mostrar.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-500 italic">El checklist está vacío.</td></tr>';
        return;
    }
    
    tbody.innerHTML = mostrar.map(item => {
        const rowClass = item.comprado ? 'bg-slate-100 text-slate-500 line-through' : 'bg-white text-slate-800';
        const chkIcon = item.comprado ? '<i class="fas fa-check-square text-green-600 text-lg"></i>' : '<i class="far fa-square text-slate-400 text-lg"></i>';
        
        const origenLabel = item.accion === 'INVENTARIO' 
            ? '<span class="bg-orange-100 text-orange-800 px-1 py-0.5 text-[10px] font-bold rounded uppercase">Inventario</span>'
            : '<span class="bg-blue-100 text-blue-800 px-1 py-0.5 text-[10px] font-bold rounded uppercase">Comprar</span>';
            
        return `
            <tr class="${rowClass}">
                <td class="border border-slate-900 p-2 text-center">
                    ${canEditTreasury() ? `<button onclick="iniciarToggleChecklist('${item.id}', ${item.comprado})">${chkIcon}</button>` : chkIcon}
                </td>
                <td class="border border-slate-900 p-2 text-center">${origenLabel}</td>
                <td class="border border-slate-900 p-2 text-sm"><span class="font-bold text-xs mr-2 text-slate-500">[${item.categoria}]</span> ${escHtml(item.descripcion)}</td>
                ${canEditTreasury() ? `<td class="border border-slate-900 p-2 text-center print:hidden">
                    <button onclick="eliminarChecklist('${item.id}')" class="text-red-500 hover:text-red-700 font-bold text-xs"><i class="fas fa-trash"></i></button>
                </td>` : ''}
            </tr>
        `;
    }).join('');
}

function abrirModalChecklist() {
    document.getElementById('tChecklistForm').reset();
    document.getElementById('tChecklistModal').classList.remove('hidden');
}

function cerrarModalChecklist() { document.getElementById('tChecklistModal').classList.add('hidden'); }

async function guardarItemChecklist(e) {
    e.preventDefault();
    if (!treasuryDb) return;
    
    const data = {
        accion: document.getElementById('tChkAccion').value,
        categoria: document.getElementById('tChkCat').value,
        descripcion: document.getElementById('tChkDesc').value.trim(),
        comprado: false,
        fechaCreacion: new Date().toISOString()
    };
    
    try {
        await treasuryDb.ref('checklist').push(data);
        cerrarModalChecklist();
    } catch(err) { alert(err.message); }
}

async function iniciarToggleChecklist(id, currentState) {
    if (!treasuryDb) return;
    
    if (currentState === true) {
        // Desmarcar (solo actualizar estado, no eliminamos el gasto asociado para evitar complejidad, el tesorero lo borra manual)
        if(!confirm('¿Desmarcar este elemento? (Nota: Si se asoció un gasto a una actividad, deberás eliminar el gasto manualmente en la actividad)')) return;
        try {
            await treasuryDb.ref('checklist/' + id).update({ comprado: false, periodoComprado: null });
        } catch(err) { alert(err.message); }
        return;
    }
    
    // Marcar como completado
    const item = itemsChecklist.find(i => i.id === id);
    if (!item) return;
    
    // Cargar actividades abiertas del periodo
    const snap = await treasuryDb.ref('actividades').orderByChild('periodo').equalTo(treasuryCurrentPeriod).once('value');
    const actData = snap.val() || {};
    const actividades = Object.entries(actData).map(([aid, val]) => ({ aid, ...val })).filter(a => !a.cerrada);
    
    if (actividades.length === 0) {
        alert('No hay actividades abiertas en este período para asignar el consumo. Por favor crea una actividad primero.');
        return;
    }
    
    const sel = document.getElementById('tCompradoActividad');
    sel.innerHTML = actividades.map(a => `<option value="${a.aid}">${escHtml(a.nombre)}</option>`).join('');
    
    document.getElementById('tCompradoId').value = id;
    document.getElementById('tCompradoOrigen').value = item.accion;
    document.getElementById('tCompradoCat').value = item.categoria;
    document.getElementById('tCompradoDesc').value = item.descripcion;
    
    document.getElementById('tCompradoDescLbl').textContent = item.descripcion;
    
    if (item.accion === 'INVENTARIO') {
        document.getElementById('tCompradoCostoContainer').classList.add('hidden');
        document.getElementById('tCompradoCosto').removeAttribute('required');
        document.getElementById('tCompradoCosto').value = 0;
    } else {
        document.getElementById('tCompradoCostoContainer').classList.remove('hidden');
        document.getElementById('tCompradoCosto').setAttribute('required', 'true');
        document.getElementById('tCompradoCosto').value = '';
    }
    
    document.getElementById('tCompradoModal').classList.remove('hidden');
}

function cerrarModalComprado() { document.getElementById('tCompradoModal').classList.add('hidden'); }

async function guardarCompraChecklist(e) {
    e.preventDefault();
    const itemId = document.getElementById('tCompradoId').value;
    const actId = document.getElementById('tCompradoActividad').value;
    const origen = document.getElementById('tCompradoOrigen').value;
    const cat = document.getElementById('tCompradoCat').value;
    const desc = document.getElementById('tCompradoDesc').value;
    const costo = parseFloat(document.getElementById('tCompradoCosto').value) || 0;
    
    try {
        // 1. Guardar en el control de gastos de la actividad
        const gastoData = {
            origen: origen,
            categoria: cat,
            descripcion: `[Checklist] ${desc}`,
            cantidad: 1,
            unidad: 'Lote/Variado',
            precioUnitario: costo,
            total: costo,
            proveedor: '',
            fechaCompra: new Date().toISOString().split('T')[0]
        };
        await treasuryDb.ref(`actividades/${actId}/gastos`).push(gastoData);
        
        // 2. Marcar en checklist
        await treasuryDb.ref('checklist/' + itemId).update({
            comprado: true,
            periodoComprado: treasuryCurrentPeriod,
            actividadAsociada: actId
        });
        
        cerrarModalComprado();
        
    } catch(err) {
        alert('Error registrando compra: ' + err.message);
    }
}

async function eliminarChecklist(id) {
    if(!confirm('¿Eliminar de la lista?')) return;
    if (!treasuryDb) return;
    try { await treasuryDb.ref('checklist/' + id).remove(); } catch(err) { alert(err.message); }
}

