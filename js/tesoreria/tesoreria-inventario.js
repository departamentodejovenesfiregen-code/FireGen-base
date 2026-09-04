/**
 * FireGen — js/tesoreria-inventario.js
 * MÓDULO DE INVENTARIO (TESORERÍA)
 */

let inventarioListener = null;
let itemsInventario = [];

function renderTesoreriaInventario() {
    const container = document.getElementById('treasurySubContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="mb-8 flex justify-between items-end border-b-[3px] border-slate-900 pb-2">
            <h2 class="text-xl font-bold text-slate-900 uppercase">5. Inventario de Materiales</h2>
            ${canEditTreasury() ? `
            <button onclick="abrirModalInventario()" class="bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 text-sm font-bold shadow-sm print:hidden">
                + Añadir Artículo
            </button>
            ` : ''}
        </div>
        
        <div class="mb-10">
            <div class="bg-[#faeadd] border-2 border-slate-900 border-b-0 p-3 text-center">
                <h3 class="font-bold text-slate-900 uppercase tracking-widest text-sm">Existencias Actuales</h3>
            </div>
            
            <table class="w-full text-left border-collapse border-2 border-slate-900">
                <thead>
                    <tr class="bg-[#faeadd]">
                        <th class="border border-slate-900 p-2 text-slate-800 font-semibold text-sm w-1/4">Categoría</th>
                        <th class="border border-slate-900 p-2 text-slate-800 font-semibold text-sm w-1/2">Artículo / Descripción</th>
                        <th class="border border-slate-900 p-2 text-slate-800 font-semibold text-sm w-16 text-center">Cant.</th>
                        ${canEditTreasury() ? '<th class="border border-slate-900 p-2 text-slate-800 font-semibold text-sm w-24 text-center print:hidden">Acción</th>' : ''}
                    </tr>
                </thead>
                <tbody id="tInventarioBody" class="bg-white">
                    <tr><td colspan="4" class="p-8 text-center text-slate-500 italic">Cargando inventario...</td></tr>
                </tbody>
            </table>
        </div>

        <!-- MODAL: NUEVO/EDITAR ITEM INVENTARIO -->
        <div id="tInventarioModal" class="hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[300]">
            <div class="bg-white max-w-md w-full p-8 shadow-2xl border-t-4 border-blue-900">
                <h3 class="text-xl font-bold text-slate-900 mb-6 flex justify-between items-center uppercase tracking-wide">
                    <span id="tInvModalTitle">Añadir Artículo</span>
                    <button type="button" onclick="cerrarModalInventario()" class="text-slate-400 hover:text-red-600"><i class="fas fa-times text-lg"></i></button>
                </h3>
                <form id="tInventarioForm" class="space-y-4" onsubmit="guardarItemInventario(event)">
                    <input type="hidden" id="tInvId">
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Categoría</label>
                        <select id="tInvCat" required class="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm focus:border-blue-900">
                            <option value="Equipos">Equipos / Herramientas</option>
                            <option value="Desechables">Desechables / Empaques</option>
                            <option value="Ingredientes">Ingredientes no perecibles</option>
                            <option value="Limpieza">Limpieza</option>
                            <option value="Otros">Otros</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Artículo</label>
                        <input type="text" id="tInvDesc" required placeholder="Ej: Vasos plásticos 8oz" class="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm focus:border-blue-900">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Cantidad Inicial / Actual</label>
                        <input type="number" id="tInvCant" required min="0" class="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm focus:border-blue-900">
                    </div>
                    <div class="pt-4">
                        <button type="submit" class="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 uppercase tracking-wide">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
        
        <!-- MODAL: ACTUALIZAR STOCK -->
        <div id="tStockModal" class="hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[300]">
            <div class="bg-white max-w-sm w-full p-8 shadow-2xl border-t-4 border-orange-500">
                <h3 class="text-xl font-bold text-slate-900 mb-6 flex justify-between items-center uppercase tracking-wide">
                    <span>Actualizar Stock</span>
                    <button type="button" onclick="cerrarModalStock()" class="text-slate-400 hover:text-red-600"><i class="fas fa-times text-lg"></i></button>
                </h3>
                <form id="tStockForm" class="space-y-4" onsubmit="guardarStock(event)">
                    <input type="hidden" id="tStockId">
                    <div class="text-center mb-4">
                        <p class="text-xs text-slate-500 font-bold uppercase mb-1">Stock Actual</p>
                        <p class="text-4xl font-black text-slate-900" id="tStockActualVal">0</p>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nuevo Stock Físico</label>
                        <input type="number" id="tStockNuevo" required min="0" class="w-full bg-slate-50 border border-slate-300 p-2.5 text-xl font-bold text-center text-blue-900 focus:border-blue-900">
                    </div>
                    <div class="pt-4">
                        <button type="submit" class="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 uppercase tracking-wide">Actualizar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    iniciarListenerInventario();
}

function iniciarListenerInventario() {
    if (!treasuryDb) return;
    
    if (inventarioListener) treasuryDb.ref('inventario').off('value', inventarioListener);
    
    inventarioListener = treasuryDb.ref('inventario').on('value', snap => {
        const data = snap.val() || {};
        itemsInventario = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        actualizarUIInventario();
    });
}

function actualizarUIInventario() {
    const tbody = document.getElementById('tInventarioBody');
    if (!tbody) return;
    
    if (itemsInventario.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-500 italic">El inventario está vacío.</td></tr>';
        return;
    }
    
    // Agrupar por categoría
    const grupos = {};
    itemsInventario.forEach(i => {
        if (!grupos[i.categoria]) grupos[i.categoria] = [];
        grupos[i.categoria].push(i);
    });
    
    let html = '';
    
    for (const [cat, items] of Object.entries(grupos)) {
        html += `
            <tr class="bg-slate-100">
                <td colspan="${canEditTreasury() ? 4 : 3}" class="border border-slate-900 p-2 text-xs font-bold uppercase text-slate-600 bg-slate-200">${cat}</td>
            </tr>
        `;
        
        items.forEach(item => {
            const lowStock = parseInt(item.cantidad) <= 5;
            const cantClass = lowStock ? 'text-red-600 font-black' : 'font-bold text-slate-900';
            
            html += `
                <tr class="bg-white hover:bg-slate-50 transition-colors">
                    <td class="border border-slate-900 p-2 text-sm text-slate-500">${item.categoria}</td>
                    <td class="border border-slate-900 p-2 text-sm font-medium text-slate-800">${escHtml(item.descripcion)}</td>
                    <td class="border border-slate-900 p-2 text-center ${cantClass} text-lg">${item.cantidad}</td>
                    ${canEditTreasury() ? `<td class="border border-slate-900 p-2 text-center print:hidden">
                        <button onclick="abrirModalStock('${item.id}', ${item.cantidad})" class="text-blue-600 hover:text-blue-800 font-bold text-xs mx-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded">STOCK</button>
                        <button onclick="eliminarItemInventario('${item.id}')" class="text-red-500 hover:text-red-700 font-bold text-xs mx-1"><i class="fas fa-trash"></i></button>
                    </td>` : ''}
                </tr>
            `;
        });
    }
    
    tbody.innerHTML = html;
}

function abrirModalInventario() {
    document.getElementById('tInventarioForm').reset();
    document.getElementById('tInvId').value = '';
    document.getElementById('tInvModalTitle').textContent = 'Añadir Artículo';
    document.getElementById('tInventarioModal').classList.remove('hidden');
}

function cerrarModalInventario() { document.getElementById('tInventarioModal').classList.add('hidden'); }

async function guardarItemInventario(e) {
    e.preventDefault();
    if (!treasuryDb) return;
    
    const id = document.getElementById('tInvId').value;
    const data = {
        categoria: document.getElementById('tInvCat').value,
        descripcion: document.getElementById('tInvDesc').value.trim(),
        cantidad: parseInt(document.getElementById('tInvCant').value),
        actualizadoEn: new Date().toISOString()
    };
    
    try {
        if (id) {
            await treasuryDb.ref('inventario/' + id).update(data);
        } else {
            await treasuryDb.ref('inventario').push(data);
        }
        cerrarModalInventario();
    } catch(err) {
        alert(err.message);
    }
}

function abrirModalStock(id, actual) {
    document.getElementById('tStockId').value = id;
    document.getElementById('tStockActualVal').textContent = actual;
    document.getElementById('tStockNuevo').value = actual;
    document.getElementById('tStockModal').classList.remove('hidden');
}

function cerrarModalStock() { document.getElementById('tStockModal').classList.add('hidden'); }

async function guardarStock(e) {
    e.preventDefault();
    if (!treasuryDb) return;
    
    const id = document.getElementById('tStockId').value;
    const nuevo = parseInt(document.getElementById('tStockNuevo').value);
    
    try {
        await treasuryDb.ref('inventario/' + id).update({
            cantidad: nuevo,
            actualizadoEn: new Date().toISOString()
        });
        cerrarModalStock();
    } catch(err) {
        alert(err.message);
    }
}

async function eliminarItemInventario(id) {
    if(!confirm('¿Eliminar artículo del inventario de forma permanente?')) return;
    if (!treasuryDb) return;
    try {
        await treasuryDb.ref('inventario/' + id).remove();
    } catch(err) {
        alert(err.message);
    }
}
