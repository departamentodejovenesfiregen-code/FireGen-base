
// tesoreria-inventario.js
let invListener = null;
let currentInventario = {};

function renderTesoreriaInventario() {
    const container = document.getElementById('treasurySubContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="mb-6 flex justify-between items-end">
            <div>
                <h2 class="text-2xl font-black text-slate-800"><i class="fas fa-boxes text-purple-700 mr-2"></i> Inventario</h2>
                <p class="text-sm text-slate-500">Bienes y materiales de la tesorería.</p>
            </div>
            <button onclick="abrirModalNuevoInventario()" class="bg-purple-700 hover:bg-purple-800 text-white font-bold py-2 px-4 rounded-lg shadow transition-colors text-sm">
                <i class="fas fa-plus"></i> Añadir Artículo
            </button>
        </div>
        
        <div id="tInventarioList" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div class="col-span-full text-center py-10 text-slate-400 italic">Cargando inventario...</div>
        </div>
        
        <!-- Modal Artículo Inventario -->
        <div id="tInvModal" class="fixed inset-0 bg-slate-900/60 z-[300] hidden flex items-center justify-center p-4">
            <div class="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
                <div class="bg-purple-700 px-6 py-4 flex justify-between items-center text-white shrink-0">
                    <h3 id="tInvModalTitle" class="font-bold text-lg"><i class="fas fa-box-open mr-2"></i> Artículo</h3>
                    <button onclick="cerrarModalInv()" class="text-white/70 hover:text-white"><i class="fas fa-times text-xl"></i></button>
                </div>
                <div class="p-6">
                    <form onsubmit="guardarInventario(event)">
                        <input type="hidden" id="tInvId">
                        <div class="space-y-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Descripción</label>
                                <input type="text" id="tInvDesc" required class="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm">
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Cantidad</label>
                                    <input type="number" id="tInvCant" step="0.01" min="0" required class="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Unidad</label>
                                    <select id="tInvUnidad" required class="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm">
                                        <option value="unidad">unidad</option>
                                        <option value="kg">kg</option>
                                        <option value="lb">lb</option>
                                        <option value="paquete">paquete</option>
                                        <option value="caja">caja</option>
                                        <option value="litro">litro</option>
                                        <option value="Otro">Otro</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Estado</label>
                                <select id="tInvEstado" required class="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm">
                                    <option value="ACTIVO">Activo</option>
                                    <option value="AGOTADO">Agotado</option>
                                    <option value="DE BAJA">De baja / Dañado</option>
                                </select>
                            </div>
                        </div>
                        <div class="mt-6 flex justify-end gap-2">
                            <button type="button" onclick="cerrarModalInv()" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300">Cancelar</button>
                            <button type="submit" class="px-4 py-2 bg-purple-700 text-white font-bold rounded-lg hover:bg-purple-800">Guardar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    iniciarListenerInventario();
}

function iniciarListenerInventario() {
    if (!treasuryDb) return;
    if (invListener) treasuryDb.ref('inventario').off('value', invListener);
    
    invListener = treasuryDb.ref('inventario').on('value', snap => {
        currentInventario = snap.val() || {};
        actualizarUIInventario();
    });
}

function actualizarUIInventario() {
    const list = document.getElementById('tInventarioList');
    if (!list) return;
    
    const items = Object.values(currentInventario);
    
    if (items.length === 0) {
        list.innerHTML = `<div class="col-span-full bg-purple-50 text-purple-800 p-6 rounded-xl border border-purple-200 text-center"><i class="fas fa-box-open text-3xl mb-3 opacity-50 block"></i> El inventario está vacío.</div>`;
        return;
    }
    
    let html = '';
    items.forEach(i => {
        let eBadge = '';
        if(i.estado==='ACTIVO') eBadge = '<span class="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[9px] font-bold">ACTIVO</span>';
        else if(i.estado==='AGOTADO') eBadge = '<span class="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-[9px] font-bold">AGOTADO</span>';
        else eBadge = '<span class="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[9px] font-bold">DE BAJA</span>';
        
        html += `
        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div>
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-black text-slate-800 text-sm leading-tight pr-2">${escHtml(i.descripcion)}</h4>
                    ${eBadge}
                </div>
                <div class="text-3xl font-black text-purple-700 my-3 text-center">
                    ${i.cantidad} <span class="text-sm text-purple-400 font-bold">${i.unidad}</span>
                </div>
            </div>
            <div class="pt-3 border-t border-slate-100 mt-2 flex justify-between items-center">
                <div class="text-[9px] text-slate-400 font-bold">Ult. act: ${formatDateShort(i.fechaActualizacion)}</div>
                ${canEditTreasury() ? `<button onclick="editarInventario('${i.id}')" class="text-blue-600 hover:text-blue-800 text-xs font-bold"><i class="fas fa-edit"></i> Editar</button>` : ''}
            </div>
        </div>
        `;
    });
    list.innerHTML = html;
}

window.abrirModalNuevoInventario = function() {
    document.getElementById('tInvModal').classList.remove('hidden');
    document.querySelector('#tInvModal form').reset();
    document.getElementById('tInvId').value = '';
    document.getElementById('tInvModalTitle').innerHTML = '<i class="fas fa-plus mr-2"></i> Nuevo Artículo';
}

window.cerrarModalInv = function() {
    document.getElementById('tInvModal').classList.add('hidden');
}

window.guardarInventario = async function(e) {
    e.preventDefault();
    const id = document.getElementById('tInvId').value;
    const isNew = !id;
    const ref = id ? treasuryDb.ref(`inventario/${id}`) : treasuryDb.ref('inventario').push();
    
    const qty = parseFloat(document.getElementById('tInvCant').value);
    const desc = document.getElementById('tInvDesc').value;
    
    await ref.update({
        id: ref.key,
        descripcion: desc,
        cantidad: qty,
        unidad: document.getElementById('tInvUnidad').value,
        estado: document.getElementById('tInvEstado').value,
        fechaActualizacion: new Date().toISOString(),
        usuario: treasuryUser.email
    });
    
    // FASE 19: Historial de inventario consistente
    await registrarAuditoriaTesoreria(
        isNew ? 'NUEVO INVENTARIO' : 'AJUSTE MANUAL INVENTARIO', 
        'Inventario', 
        `Artículo: ${desc} ajustado a ${qty}.`, 
        ref.key
    );
    
    cerrarModalInv();
}

window.editarInventario = function(id) {
    const i = currentInventario[id];
    if(!i) return;
    document.getElementById('tInvId').value = id;
    document.getElementById('tInvDesc').value = i.descripcion;
    document.getElementById('tInvCant').value = i.cantidad;
    document.getElementById('tInvUnidad').value = i.unidad;
    document.getElementById('tInvEstado').value = i.estado;
    document.getElementById('tInvModalTitle').innerHTML = '<i class="fas fa-edit mr-2"></i> Editar Artículo';
    document.getElementById('tInvModal').classList.remove('hidden');
}
