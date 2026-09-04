/**
 * FireGen — js/tesoreria-actividades.js
 * MÓDULO DE CAMPAÑAS, ACTIVIDADES Y CHECKLIST
 */

let campanasListener = null;
let actividadesListener = null;
let campanasCaja = [];
let actividadesCaja = [];

function renderTesoreriaActividades() {
    const container = document.getElementById('treasurySubContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="mb-8 flex justify-between items-end border-b-[3px] border-slate-900 pb-2">
            <h2 class="text-xl font-bold text-slate-900 uppercase">Campañas y Actividades</h2>
            ${canEditTreasury() ? `
            <button onclick="abrirModalNuevaCampana()" class="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-sm font-bold shadow-sm print:hidden">
                + Nueva Campaña
            </button>
            ` : ''}
        </div>
        
        <div id="tCampanasList" class="space-y-12">
            <div class="p-8 text-center text-slate-500 italic"><i class="fas fa-circle-notch fa-spin mr-1"></i> Cargando campañas...</div>
        </div>

        <!-- MODAL: NUEVA CAMPAÑA -->
        <div id="tCampanaModal" class="hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[300]">
            <div class="bg-white max-w-md w-full p-8 shadow-2xl border-t-4 border-slate-900">
                <h3 class="text-xl font-bold text-slate-900 mb-6 flex justify-between items-center uppercase tracking-wide">
                    <span>Crear Campaña</span>
                    <button type="button" onclick="cerrarModalNuevaCampana()" class="text-slate-400 hover:text-red-600"><i class="fas fa-times text-lg"></i></button>
                </h3>
                <form id="tNuevaCampanaForm" class="space-y-5" onsubmit="guardarNuevaCampana(event)">
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre de la Campaña / Semana</label>
                        <input type="text" id="tCampNombre" required placeholder="Ej: Semana de actividad - Agosto 2026" class="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm uppercase focus:border-slate-900 focus:outline-none focus:ring-0">
                    </div>
                    <div class="pt-4">
                        <button type="submit" class="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 uppercase tracking-wide transition-colors">Crear Campaña</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- MODAL: NUEVA ACTIVIDAD -->
        <div id="tActividadModal" class="hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[300]">
            <div class="bg-white max-w-md w-full p-8 shadow-2xl border-t-4 border-blue-900">
                <h3 class="text-xl font-bold text-slate-900 mb-6 flex justify-between items-center uppercase tracking-wide">
                    <span>Crear Actividad</span>
                    <button type="button" onclick="cerrarModalNuevaActividad()" class="text-slate-400 hover:text-red-600"><i class="fas fa-times text-lg"></i></button>
                </h3>
                <form id="tNuevaActividadForm" class="space-y-5" onsubmit="guardarNuevaActividad(event)">
                    <input type="hidden" id="tActCampanaId">
                    
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Modo de Creación</label>
                        <select id="tActModo" onchange="toggleModoCreacionAct()" class="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm uppercase focus:border-blue-900 focus:outline-none focus:ring-0">
                            <option value="NUEVA">Crear desde cero</option>
                            <option value="COPIAR">Usar actividad anterior (Histórica)</option>
                        </select>
                    </div>
                    
                    <div id="tActBoxCopiar" class="hidden">
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Seleccionar Actividad Base</label>
                        <select id="tActBaseHist" class="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm uppercase focus:border-blue-900 focus:outline-none focus:ring-0">
                            <option value="">Cargando historial...</option>
                        </select>
                        <p class="text-[10px] text-slate-500 mt-1">Solo se copiará el nombre, precio, checklist e ingredientes base sugeridos.</p>
                    </div>

                    <div id="tActBoxNueva">
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre de la actividad</label>
                        <input type="text" id="tActNombre" placeholder="Ej: VENTA DE CORVICHES" class="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm uppercase focus:border-blue-900 focus:outline-none focus:ring-0">
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Precio Unitario ($)</label>
                            <input type="number" step="0.01" min="0" id="tActPrecio" class="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm focus:border-blue-900 focus:outline-none focus:ring-0">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha Programada</label>
                            <input type="date" id="tActFecha" required class="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm focus:border-blue-900 focus:outline-none focus:ring-0">
                        </div>
                    </div>
                    <div class="pt-4">
                        <button type="submit" class="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 uppercase tracking-wide transition-colors">Crear</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- MODAL: AGREGAR GASTO / INGREDIENTE (CONTROL GASTO) -->
        <div id="tGastoModal" class="hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[350] overflow-y-auto">
            <div class="bg-white max-w-lg w-full p-8 shadow-2xl border-t-4 border-blue-900 my-8">
                <h3 class="text-xl font-bold text-slate-900 mb-6 flex justify-between items-center uppercase tracking-wide">
                    <span>Registro Control de Gasto</span>
                    <button type="button" onclick="cerrarModalGasto()" class="text-slate-400 hover:text-red-600"><i class="fas fa-times text-lg"></i></button>
                </h3>
                <form id="tNuevoGastoForm" class="space-y-4" onsubmit="guardarGastoActividad(event)">
                    <input type="hidden" id="tGastoActividadId">
                    
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Origen del Insumo</label>
                        <select id="tGastoOrigen" required onchange="toggleGastoOrigen()" class="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm font-medium focus:border-blue-900 focus:outline-none focus:ring-0">
                            <option value="COMPRAR">Comprar (Genera Consumo)</option>
                            <option value="INVENTARIO">Tomar del Inventario (Sin Egreso)</option>
                        </select>
                        <p id="tGastoInventarioAviso" class="hidden text-xs text-orange-600 mt-1 font-bold"><i class="fas fa-info-circle"></i> Este material se tomará del inventario y no generará egreso de caja.</p>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Categoría</label>
                            <select id="tGastoCat" required class="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm font-medium focus:border-blue-900 focus:outline-none focus:ring-0">
                                <option value="Materia Prima">Materia Prima</option>
                                <option value="Empaque">Empaque / Desechables</option>
                                <option value="Logística">Logística / Transporte</option>
                                <option value="Otros">Otros</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción / Insumo</label>
                            <input type="text" id="tGastoDesc" required class="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm focus:border-blue-900 focus:outline-none focus:ring-0">
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-3 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Cantidad</label>
                            <input type="number" step="0.01" min="0.01" id="tGastoCant" required oninput="calcularTotalGasto()" class="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm focus:border-blue-900 focus:outline-none focus:ring-0">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Unidad</label>
                            <input type="text" id="tGastoUnidad" placeholder="kg, lb, und..." required class="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm focus:border-blue-900 focus:outline-none focus:ring-0">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">P. Unitario ($)</label>
                            <input type="number" step="0.01" min="0" id="tGastoPUnit" required oninput="calcularTotalGasto()" class="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm focus:border-blue-900 focus:outline-none focus:ring-0">
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1 text-blue-900">Total a Pagar ($)</label>
                        <input type="number" id="tGastoTotal" readonly class="w-full bg-blue-50 border border-blue-300 p-2.5 text-sm font-bold focus:outline-none cursor-not-allowed">
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Proveedor / Lugar</label>
                            <input type="text" id="tGastoProv" class="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm focus:border-blue-900 focus:outline-none focus:ring-0">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha de Compra</label>
                            <input type="date" id="tGastoFecha" class="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm focus:border-blue-900 focus:outline-none focus:ring-0">
                        </div>
                    </div>
                    
                    <div class="pt-4">
                        <button type="submit" class="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 uppercase tracking-wide transition-colors">Guardar en Consumo</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- MODAL: ACTUALIZAR PLATOS -->
        <div id="tCobrosModal" class="hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[350]">
            <div class="bg-white max-w-md w-full p-8 shadow-2xl border-t-4 border-blue-900">
                <h3 class="text-xl font-bold text-slate-900 mb-6 flex justify-between items-center uppercase tracking-wide">
                    <span>Actualizar Platos</span>
                    <button type="button" onclick="cerrarModalCobros()" class="text-slate-400 hover:text-red-600"><i class="fas fa-times text-lg"></i></button>
                </h3>
                <form id="tCobrosForm" class="space-y-4" onsubmit="guardarCobrosActividad(event)">
                    <input type="hidden" id="tCobrosActId">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Platos Preparados</label>
                            <input type="number" min="0" id="tCobrosPrep" required class="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm focus:border-blue-900 focus:outline-none focus:ring-0">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Platos Vendidos</label>
                            <input type="number" min="0" id="tCobrosVend" required class="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm focus:border-blue-900 focus:outline-none focus:ring-0">
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1 text-blue-700">Cobrados (Efectivo)</label>
                            <input type="number" min="0" id="tCobrosCob" required oninput="calcularPlatosPendientes()" class="w-full bg-blue-50 border border-blue-300 p-2.5 text-sm font-bold focus:border-blue-900 focus:outline-none focus:ring-0">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1 text-orange-600">Pendientes de Cobro</label>
                            <input type="number" id="tCobrosPend" readonly class="w-full bg-orange-50 border border-orange-300 p-2.5 text-sm font-bold cursor-not-allowed">
                        </div>
                    </div>
                    <p class="text-[10px] text-slate-500 mt-1">El ingreso se calculará como: Cobrados × Precio Unitario.</p>
                    <div class="pt-4">
                        <button type="submit" class="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 uppercase tracking-wide transition-colors">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
        
        <!-- MODAL: REGISTRAR DEUDA PENDIENTE -->
        <div id="tDeudaModal" class="hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[350]">
            <div class="bg-white max-w-md w-full p-8 shadow-2xl border-t-4 border-orange-500">
                <h3 class="text-xl font-bold text-slate-900 mb-6 flex justify-between items-center uppercase tracking-wide">
                    <span>Registrar Cuenta por Cobrar</span>
                    <button type="button" onclick="cerrarModalDeuda()" class="text-slate-400 hover:text-red-600"><i class="fas fa-times text-lg"></i></button>
                </h3>
                <form id="tDeudaForm" class="space-y-4" onsubmit="guardarDeuda(event)">
                    <input type="hidden" id="tDeudaActId">
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Hermano/a</label>
                        <input type="text" id="tDeudaNombre" required class="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm focus:border-blue-900 focus:outline-none focus:ring-0">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Cant. Platos</label>
                            <input type="number" min="1" id="tDeudaCant" required class="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm focus:border-blue-900 focus:outline-none focus:ring-0">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Precio Unit.</label>
                            <input type="number" step="0.01" id="tDeudaPrecio" required class="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm focus:border-blue-900 focus:outline-none focus:ring-0">
                        </div>
                    </div>
                    <div class="pt-4">
                        <button type="submit" class="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 uppercase tracking-wide transition-colors">Guardar Cuenta por Cobrar</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- MODAL: CHECKLIST (HERRAMIENTA SECUNDARIA) -->
        <div id="tChecklistModal" class="hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[400]">
            <div class="bg-white max-w-2xl w-full p-8 shadow-2xl border-t-4 border-slate-800 overflow-y-auto max-h-[90vh]">
                <h3 class="text-xl font-bold text-slate-900 mb-6 flex justify-between items-center uppercase tracking-wide">
                    <span>Checklist de Preparación</span>
                    <button type="button" onclick="cerrarModalChecklistSec()" class="text-slate-400 hover:text-red-600"><i class="fas fa-times text-lg"></i></button>
                </h3>
                
                <input type="hidden" id="tChkSecActId">

                <div class="mb-6 flex gap-2 border-b border-slate-200 pb-4">
                    <button type="button" onclick="mostrarFormNuevoItemChecklist()" class="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 border border-slate-300 flex-1">
                        + Añadir Tarea / Item
                    </button>
                    <button type="button" onclick="mostrarFormCompraImprevista()" class="text-xs font-bold bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-2 border border-blue-300 flex-1">
                        + Compra Imprevista Rápida
                    </button>
                </div>
                
                <div id="tChkNuevoItemFormContainer" class="hidden mb-6 bg-slate-50 p-4 border border-slate-200">
                    <form onsubmit="guardarItemChecklistSec(event)" class="space-y-4">
                        <h4 class="font-bold text-xs uppercase text-slate-500 mb-2">Añadir a Checklist</h4>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-[10px] font-bold text-slate-700 uppercase mb-1">Acción</label>
                                <select id="tChkSecAccion" required class="w-full bg-white border border-slate-300 p-2 text-sm focus:border-slate-800">
                                    <option value="COMPRAR">Comprar (Generará Gasto)</option>
                                    <option value="INVENTARIO">Tomar de Inventario</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-slate-700 uppercase mb-1">Categoría</label>
                                <input type="text" id="tChkSecCat" required placeholder="Ej: Verduras" class="w-full bg-white border border-slate-300 p-2 text-sm">
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-700 uppercase mb-1">Descripción y Cantidad</label>
                            <input type="text" id="tChkSecDesc" required placeholder="Ej: 2 Libras de Cebolla" class="w-full bg-white border border-slate-300 p-2 text-sm">
                        </div>
                        <div class="text-right">
                            <button type="submit" class="bg-slate-800 text-white text-xs font-bold px-4 py-2 uppercase">Guardar Item</button>
                        </div>
                    </form>
                </div>
                
                <div id="tChkImprevistoFormContainer" class="hidden mb-6 bg-blue-50 p-4 border border-blue-200">
                    <form onsubmit="guardarCompraImprevistaSec(event)" class="space-y-4">
                        <h4 class="font-bold text-xs uppercase text-blue-800 mb-2">Compra Imprevista (Se añade directo a Consumo)</h4>
                        <div class="grid grid-cols-2 gap-4">
                            <div class="col-span-2">
                                <label class="block text-[10px] font-bold text-slate-700 uppercase mb-1">Descripción</label>
                                <input type="text" id="tImpDesc" required placeholder="Ej: Aceite (Faltó)" class="w-full bg-white border border-slate-300 p-2 text-sm">
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-slate-700 uppercase mb-1">Cantidad</label>
                                <input type="number" step="0.01" min="0.01" id="tImpCant" required value="1" oninput="calcularTotalImprevisto()" class="w-full bg-white border border-slate-300 p-2 text-sm">
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-slate-700 uppercase mb-1">Precio Unitario</label>
                                <input type="number" step="0.01" min="0.01" id="tImpPrecio" required oninput="calcularTotalImprevisto()" class="w-full bg-white border border-slate-300 p-2 text-sm">
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-700 uppercase mb-1">Total a Agregar</label>
                            <input type="text" id="tImpTotal" readonly class="w-full bg-blue-100 border border-blue-300 p-2 text-sm font-bold">
                        </div>
                        <div class="text-right">
                            <button type="submit" class="bg-blue-800 text-white text-xs font-bold px-4 py-2 uppercase">Agregar a Consumo PENDIENTE</button>
                        </div>
                    </form>
                </div>

                <div id="tChecklistItemsList" class="space-y-2">
                    <!-- Lista de items del checklist de esta actividad -->
                </div>
            </div>
        </div>

        <!-- MODAL: MARCAR COMPRADO (Checklist -> Consumo) -->
        <div id="tCompradoSecModal" class="hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[500] overflow-y-auto">
            <div class="bg-white max-w-sm w-full p-6 shadow-2xl border-t-4 border-green-600">
                <h3 class="text-lg font-bold text-slate-900 mb-2 uppercase tracking-wide">Completar Tarea</h3>
                <p class="text-sm text-slate-500 mb-4" id="tCompradoSecDescLbl"></p>
                
                <form id="tCompradoSecForm" class="space-y-4" onsubmit="confirmarCompradoSec(event)">
                    <input type="hidden" id="tCompradoSecId">
                    
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Proveedor / Ubicación (Opcional)</label>
                        <input type="text" id="tCompradoSecProv" class="w-full bg-slate-50 border border-slate-300 p-2 text-sm">
                    </div>
                    
                    <div id="tCompradoSecCostoBox">
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1 text-green-700">Costo Total Pagado ($)</label>
                        <input type="number" step="0.01" min="0" id="tCompradoSecCosto" class="w-full bg-green-50 border border-green-300 p-2 text-sm font-bold">
                    </div>
                    
                    <p class="text-[10px] text-slate-500 mt-2">Esta acción pasará el costo directamente al Consumo Pendiente de la actividad.</p>
                    
                    <div class="pt-2 flex gap-2">
                        <button type="button" onclick="document.getElementById('tCompradoSecModal').classList.add('hidden')" class="flex-1 bg-slate-200 text-slate-800 font-bold py-2 text-xs uppercase">Cancelar</button>
                        <button type="submit" class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 text-xs uppercase">Confirmar Compra</button>
                    </div>
                </form>
            </div>
        </div>

    `;
    
    iniciarListenerCampanas();
}

function iniciarListenerCampanas() {
    if (!treasuryDb) return;
    
    if (campanasListener) treasuryDb.ref('campanas').off('value', campanasListener);
    if (actividadesListener) treasuryDb.ref('actividades').off('value', actividadesListener);
    
    campanasListener = treasuryDb.ref('campanas').orderByChild('periodo').equalTo(treasuryCurrentPeriod).on('value', snap => {
        const data = snap.val() || {};
        campanasCaja = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        campanasCaja.sort((a,b) => new Date(a.fechaCreacion) - new Date(b.fechaCreacion));
        
        actividadesListener = treasuryDb.ref('actividades').orderByChild('periodo').equalTo(treasuryCurrentPeriod).on('value', snapAct => {
            const actData = snapAct.val() || {};
            actividadesCaja = Object.entries(actData).map(([id, val]) => ({ id, ...val }));
            actualizarUICampanas();
        });
    });
}

function actualizarUICampanas() {
    const list = document.getElementById('tCampanasList');
    if (!list) return;
    
    if (campanasCaja.length === 0) {
        list.innerHTML = '<div class="p-8 text-center text-slate-500 italic">No hay campañas/semanas registradas en este período.</div>';
        return;
    }
    
    list.innerHTML = campanasCaja.map(campana => {
        const actsDeCampana = actividadesCaja.filter(a => a.campanaId === campana.id);
        actsDeCampana.sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
        
        const htmlActividades = actsDeCampana.length > 0 
            ? actsDeCampana.map(act => generarHtmlActividad(act)).join('')
            : '<div class="p-4 text-center text-slate-500 text-sm">No hay actividades en esta campaña.</div>';
            
        return `
        <div class="mb-12 border-4 border-slate-900 bg-white">
            <div class="bg-slate-900 text-white p-4 flex justify-between items-center">
                <h3 class="font-black uppercase tracking-widest text-lg">${escHtml(campana.nombre)}</h3>
                ${canEditTreasury() ? `
                <button onclick="abrirModalNuevaActividad('${campana.id}')" class="bg-white text-slate-900 text-xs font-bold px-3 py-1 uppercase shadow-sm">
                    + Agregar Día de Actividad
                </button>
                ` : ''}
            </div>
            <div class="p-4 bg-slate-50 space-y-8">
                ${htmlActividades}
            </div>
        </div>
        `;
    }).join('');
}

function generarHtmlActividad(act) {
    const gastosArr = act.gastos ? Object.entries(act.gastos).map(([id, g]) => ({id, ...g})) : [];
    let totalGasto = 0;
    
    const gastosHtml = gastosArr.map(g => {
        const esInventario = g.origen === 'INVENTARIO';
        if (!esInventario) totalGasto += parseFloat(g.total || 0);
        
        return `
            <tr>
                <td class="border border-slate-900 p-2 text-xs text-center">
                    ${esInventario ? '<span class="bg-orange-100 text-orange-800 px-1 py-0.5 rounded font-bold uppercase">Inv.</span>' : '<span class="bg-blue-100 text-blue-800 px-1 py-0.5 rounded font-bold uppercase">Compra</span>'}
                </td>
                <td class="border border-slate-900 p-2 text-xs">${escHtml(g.descripcion)}</td>
                <td class="border border-slate-900 p-2 text-xs text-center">${g.cantidad} ${g.unidad}</td>
                <td class="border border-slate-900 p-2 text-xs text-right">${esInventario ? '-' : '$'+Number(g.precioUnitario).toFixed(2)}</td>
                <td class="border border-slate-900 p-2 text-xs text-right font-bold">${esInventario ? '$0.00' : '$'+Number(g.total).toFixed(2)}</td>
                ${!act.cerrada && canEditTreasury() ? `<td class="border border-slate-900 p-1 text-center print:hidden"><button onclick="eliminarGasto('${act.id}', '${g.id}')" class="text-red-600 hover:text-red-800 text-[10px] font-bold"><i class="fas fa-times"></i></button></td>` : (!act.cerrada ? '<td class="border border-slate-900 print:hidden"></td>' : '')}
            </tr>
        `;
    }).join('');
    
    const deudasArr = act.deudas ? Object.entries(act.deudas).map(([id, d]) => ({id, ...d})) : [];
    
    const deudasHtml = deudasArr.length > 0 ? `
        <div class="mt-4 border border-orange-500 bg-orange-50 p-3 page-break-inside-avoid">
            <h4 class="font-bold text-orange-800 text-xs uppercase mb-2">Pendientes de Cobro</h4>
            <table class="w-full text-xs text-left">
                ${deudasArr.map(d => {
                    return `<tr class="border-b border-orange-200">
                        <td class="py-1 text-slate-800">${d.nombre} (${d.cantidad} pl)</td>
                        <td class="py-1 text-slate-800 font-bold">$${(d.cantidad * d.precio).toFixed(2)}</td>
                        <td class="py-1 text-right">
                            ${d.pagado ? '<span class="text-green-600 font-bold text-[10px] uppercase">PAGADO</span>' : (canEditTreasury() ? `<button onclick="marcarDeudaPagada('${act.id}', '${d.id}')" class="bg-green-600 text-white px-2 py-0.5 text-[10px] uppercase font-bold rounded">Marcar Pago</button>` : '<span class="text-orange-600 font-bold text-[10px] uppercase">PENDIENTE</span>')}
                        </td>
                    </tr>`;
                }).join('')}
            </table>
        </div>
    ` : '';

    const estadoLabel = act.cerrada 
        ? '<span class="text-slate-900 border border-slate-900 px-2 py-1 bg-white font-bold text-[10px] uppercase"><i class="fas fa-lock"></i> CERRADA</span>' 
        : '<span class="text-orange-600 border border-orange-600 px-2 py-1 bg-white font-bold text-[10px] uppercase flex items-center gap-1"><i class="fas fa-exclamation-triangle"></i> PENDIENTE</span>';
    
    const colspanDesc = act.cerrada ? 4 : 4; 
    
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const fechaObj = new Date(act.fecha + 'T12:00:00');
    const diaStr = dias[fechaObj.getDay()];

    const ingreso = (act.cobrados || 0) * act.precio;
    const inversion = totalGasto;
    const ganancia = ingreso - inversion;
    let rentabilidad = 0;
    if (inversion > 0) {
        rentabilidad = (ganancia / inversion) * 100;
    }
    
    return `
    <div class="mb-4 bg-white border border-slate-300 shadow-sm page-break-inside-avoid">
        <div class="bg-[#faeadd] border-b border-slate-300 p-2 flex justify-between items-center">
            <h4 class="font-bold text-slate-900 uppercase text-sm">${diaStr}, ${formatDateShort(act.fecha)} - ${escHtml(act.nombre)}</h4>
            ${estadoLabel}
        </div>
        
        <div class="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border-b border-slate-200">
            <div class="bg-slate-50 p-2 border border-slate-200 text-center">
                <div class="text-slate-500 uppercase font-bold mb-1">Producción</div>
                <div>Prep: ${act.preparados || 0} | Vend: ${act.vendidos || 0}</div>
            </div>
            <div class="bg-blue-50 p-2 border border-blue-200 text-center">
                <div class="text-blue-800 uppercase font-bold mb-1">Cobrados ($)</div>
                <div class="font-black text-blue-900 text-sm">$${ingreso.toFixed(2)}</div>
                <div class="text-[10px] text-slate-500">${act.cobrados || 0} platos a $${Number(act.precio).toFixed(2)}</div>
            </div>
            <div class="bg-red-50 p-2 border border-red-200 text-center">
                <div class="text-red-800 uppercase font-bold mb-1">Inversión</div>
                <div class="font-black text-red-900 text-sm">$${inversion.toFixed(2)}</div>
            </div>
            <div class="bg-green-50 p-2 border border-green-200 text-center">
                <div class="text-green-800 uppercase font-bold mb-1">Rentabilidad</div>
                <div class="font-black text-green-900 text-sm">$${ganancia.toFixed(2)}</div>
                ${inversion > 0 ? `<div class="text-[10px] text-green-700 font-bold">${rentabilidad.toFixed(1)}%</div>` : ''}
            </div>
        </div>

        <div class="p-3">
            <h5 class="text-xs font-bold text-slate-900 uppercase mb-2">Control de Gastos / Consumo Pendiente</h5>
            <table class="w-full text-center border-collapse border border-slate-300 mb-2">
                <thead>
                    <tr class="bg-slate-100">
                        <th class="border border-slate-300 p-1 text-slate-800 font-semibold text-[10px] uppercase">Origen</th>
                        <th class="border border-slate-300 p-1 text-slate-800 font-semibold text-[10px] uppercase">Descripción</th>
                        <th class="border border-slate-300 p-1 text-slate-800 font-semibold text-[10px] uppercase">Cant.</th>
                        <th class="border border-slate-300 p-1 text-slate-800 font-semibold text-[10px] uppercase">P. Unit</th>
                        <th class="border border-slate-300 p-1 text-slate-800 font-semibold text-[10px] uppercase">Total</th>
                        ${!act.cerrada ? '<th class="border border-slate-300 p-1 print:hidden"></th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${gastosArr.length > 0 ? gastosHtml : `<tr><td colspan="${!act.cerrada ? 6 : 5}" class="border border-slate-300 p-2 text-slate-500 italic text-xs">No hay consumo registrado</td></tr>`}
                </tbody>
            </table>
            
            ${deudasHtml}
        </div>
        
        <!-- Botonera -->
        <div class="bg-slate-50 p-2 border-t border-slate-300 flex flex-wrap gap-2 print:hidden items-center">
            ${!act.cerrada && canEditTreasury() ? `
            <button onclick="abrirModalGasto('${act.id}')" class="text-[10px] font-bold bg-white hover:bg-slate-100 text-slate-700 px-3 py-1.5 border border-slate-300 shadow-sm uppercase">
                <i class="fas fa-plus mr-1"></i> Control Gasto
            </button>
            <button onclick="abrirModalChecklistSec('${act.id}')" class="text-[10px] font-bold bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1.5 border border-yellow-300 shadow-sm uppercase">
                <i class="fas fa-tasks mr-1"></i> Checklist
            </button>
            <button onclick="abrirModalCobros('${act.id}', ${act.preparados||0}, ${act.vendidos||0}, ${act.cobrados||0})" class="text-[10px] font-bold bg-white hover:bg-slate-100 text-slate-700 px-3 py-1.5 border border-slate-300 shadow-sm uppercase">
                <i class="fas fa-utensils mr-1"></i> Actualizar Platos
            </button>
            <button onclick="abrirModalDeuda('${act.id}', ${act.precio})" class="text-[10px] font-bold bg-orange-100 hover:bg-orange-200 text-orange-800 px-3 py-1.5 border border-orange-300 shadow-sm uppercase">
                <i class="fas fa-hand-holding-usd mr-1"></i> Pendientes de Cobro
            </button>
            
            <div class="flex-grow"></div>
            
            <button onclick="cerrarActividad('${act.id}', ${totalGasto}, ${ingreso})" class="text-[10px] font-bold bg-blue-900 hover:bg-blue-800 text-white px-3 py-1.5 uppercase shadow-sm">
                Cerrar Consumo
            </button>
            ` : ''}
        </div>
    </div>
    `;
}

// -----------------------------------------------------
// CAMPAÑAS
// -----------------------------------------------------

function abrirModalNuevaCampana() {
    document.getElementById('tNuevaCampanaForm').reset();
    document.getElementById('tCampanaModal').classList.remove('hidden');
}
function cerrarModalNuevaCampana() { document.getElementById('tCampanaModal').classList.add('hidden'); }

async function guardarNuevaCampana(e) {
    e.preventDefault();
    if (!treasuryDb) return;
    const data = {
        periodo: treasuryCurrentPeriod,
        nombre: document.getElementById('tCampNombre').value.trim(),
        fechaCreacion: new Date().toISOString()
    };
    try {
        await treasuryDb.ref('campanas').push(data);
        cerrarModalNuevaCampana();
    } catch(err) { alert(err.message); }
}

// -----------------------------------------------------
// ACTIVIDADES
// -----------------------------------------------------

async function abrirModalNuevaActividad(campanaId) {
    document.getElementById('tNuevaActividadForm').reset();
    document.getElementById('tActCampanaId').value = campanaId;
    document.getElementById('tActFecha').value = new Date().toISOString().split('T')[0];
    
    // Cargar historial
    const snap = await treasuryDb.ref('actividades').once('value');
    const all = snap.val() || {};
    const arr = Object.entries(all).map(([id, val]) => ({id, ...val})).sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
    
    const sel = document.getElementById('tActBaseHist');
    sel.innerHTML = '<option value="">Seleccione una actividad histórica</option>' + arr.map(a => `<option value="${a.id}">${a.periodo} - ${a.nombre}</option>`).join('');
    
    toggleModoCreacionAct();
    document.getElementById('tActividadModal').classList.remove('hidden');
}

function toggleModoCreacionAct() {
    const modo = document.getElementById('tActModo').value;
    if (modo === 'COPIAR') {
        document.getElementById('tActBoxCopiar').classList.remove('hidden');
        document.getElementById('tActBoxNueva').classList.add('hidden');
        document.getElementById('tActBaseHist').setAttribute('required', 'true');
        document.getElementById('tActNombre').removeAttribute('required');
    } else {
        document.getElementById('tActBoxCopiar').classList.add('hidden');
        document.getElementById('tActBoxNueva').classList.remove('hidden');
        document.getElementById('tActBaseHist').removeAttribute('required');
        document.getElementById('tActNombre').setAttribute('required', 'true');
    }
}

function cerrarModalNuevaActividad() { document.getElementById('tActividadModal').classList.add('hidden'); }

async function guardarNuevaActividad(e) {
    e.preventDefault();
    if (!treasuryDb) return;
    
    const campanaId = document.getElementById('tActCampanaId').value;
    const modo = document.getElementById('tActModo').value;
    
    let nombre = '';
    let precio = parseFloat(document.getElementById('tActPrecio').value) || 0;
    let checklistHist = null;
    
    if (modo === 'COPIAR') {
        const histId = document.getElementById('tActBaseHist').value;
        const snap = await treasuryDb.ref('actividades/' + histId).once('value');
        const d = snap.val();
        if (!d) return alert('No se pudo leer la actividad base.');
        nombre = d.nombre;
        if(document.getElementById('tActPrecio').value === '') precio = d.precio; // Mantiene el sugerido
        if(d.checklist) checklistHist = d.checklist; // Copiamos el checklist (solo la estructura, lo limpiamos luego)
    } else {
        nombre = document.getElementById('tActNombre').value.trim();
    }

    const data = {
        campanaId: campanaId,
        periodo: treasuryCurrentPeriod,
        nombre: nombre,
        precio: precio,
        fecha: document.getElementById('tActFecha').value,
        preparados: 0,
        vendidos: 0,
        cobrados: 0,
        pendientes: 0,
        cerrada: false,
        creadoPor: treasuryUser ? treasuryUser.email : 'desc'
    };
    
    // Si copiamos checklist, limpiamos los estados de "comprado"
    if (checklistHist) {
        data.checklist = {};
        Object.entries(checklistHist).forEach(([key, val]) => {
            data.checklist[key] = {
                accion: val.accion,
                categoria: val.categoria,
                descripcion: val.descripcion,
                comprado: false
            };
        });
    }
    
    try {
        await treasuryDb.ref('actividades').push(data);
        cerrarModalNuevaActividad();
    } catch(err) { alert(err.message); }
}

// -----------------------------------------------------
// GASTOS (CONSUMO)
// -----------------------------------------------------

function abrirModalGasto(actId) {
    document.getElementById('tNuevoGastoForm').reset();
    document.getElementById('tGastoActividadId').value = actId;
    document.getElementById('tGastoOrigen').value = 'COMPRAR';
    toggleGastoOrigen();
    document.getElementById('tGastoFecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('tGastoModal').classList.remove('hidden');
}
function cerrarModalGasto() { document.getElementById('tGastoModal').classList.add('hidden'); }

function toggleGastoOrigen() {
    const origen = document.getElementById('tGastoOrigen').value;
    const aviso = document.getElementById('tGastoInventarioAviso');
    const total = document.getElementById('tGastoTotal');
    const pUnit = document.getElementById('tGastoPUnit');
    
    if (origen === 'INVENTARIO') {
        aviso.classList.remove('hidden');
        pUnit.value = 0;
        total.value = 0;
        pUnit.readOnly = true;
    } else {
        aviso.classList.add('hidden');
        pUnit.readOnly = false;
        calcularTotalGasto();
    }
}

function calcularTotalGasto() {
    if (document.getElementById('tGastoOrigen').value === 'INVENTARIO') {
        document.getElementById('tGastoTotal').value = 0;
        return;
    }
    const c = parseFloat(document.getElementById('tGastoCant').value) || 0;
    const p = parseFloat(document.getElementById('tGastoPUnit').value) || 0;
    document.getElementById('tGastoTotal').value = (c * p).toFixed(2);
}

async function guardarGastoActividad(e) {
    e.preventDefault();
    const actId = document.getElementById('tGastoActividadId').value;
    const data = {
        origen: document.getElementById('tGastoOrigen').value,
        categoria: document.getElementById('tGastoCat').value,
        descripcion: document.getElementById('tGastoDesc').value,
        cantidad: parseFloat(document.getElementById('tGastoCant').value),
        unidad: document.getElementById('tGastoUnidad').value,
        precioUnitario: parseFloat(document.getElementById('tGastoPUnit').value) || 0,
        total: parseFloat(document.getElementById('tGastoTotal').value) || 0,
        proveedor: document.getElementById('tGastoProv').value.trim(),
        fechaCompra: document.getElementById('tGastoFecha').value
    };
    try {
        await treasuryDb.ref(`actividades/${actId}/gastos`).push(data);
        cerrarModalGasto();
    } catch(err) { alert(err.message); }
}

async function eliminarGasto(actId, gastoId) {
    if(!confirm('¿Eliminar insumo del consumo?')) return;
    try { await treasuryDb.ref(`actividades/${actId}/gastos/${gastoId}`).remove(); } catch(e) {}
}

// -----------------------------------------------------
// PLATOS Y DEUDAS
// -----------------------------------------------------
function abrirModalCobros(actId, p, v, c) {
    document.getElementById('tCobrosActId').value = actId;
    document.getElementById('tCobrosPrep').value = p;
    document.getElementById('tCobrosVend').value = v;
    document.getElementById('tCobrosCob').value = c;
    calcularPlatosPendientes();
    document.getElementById('tCobrosModal').classList.remove('hidden');
}
function cerrarModalCobros() { document.getElementById('tCobrosModal').classList.add('hidden'); }

function calcularPlatosPendientes() {
    const v = parseInt(document.getElementById('tCobrosVend').value) || 0;
    const c = parseInt(document.getElementById('tCobrosCob').value) || 0;
    let pend = v - c;
    if(pend < 0) pend = 0;
    document.getElementById('tCobrosPend').value = pend;
}

async function guardarCobrosActividad(e) {
    e.preventDefault();
    const actId = document.getElementById('tCobrosActId').value;
    const p = parseInt(document.getElementById('tCobrosPrep').value);
    const v = parseInt(document.getElementById('tCobrosVend').value);
    const c = parseInt(document.getElementById('tCobrosCob').value);
    const pend = parseInt(document.getElementById('tCobrosPend').value);
    
    try {
        await treasuryDb.ref(`actividades/${actId}`).update({ preparados: p, vendidos: v, cobrados: c, pendientes: pend });
        cerrarModalCobros();
    } catch(err) { alert(err.message); }
}

function abrirModalDeuda(actId, precio) {
    document.getElementById('tDeudaForm').reset();
    document.getElementById('tDeudaActId').value = actId;
    document.getElementById('tDeudaPrecio').value = precio;
    document.getElementById('tDeudaModal').classList.remove('hidden');
}
function cerrarModalDeuda() { document.getElementById('tDeudaModal').classList.add('hidden'); }

async function guardarDeuda(e) {
    e.preventDefault();
    const actId = document.getElementById('tDeudaActId').value;
    const data = {
        nombre: document.getElementById('tDeudaNombre').value.trim(),
        cantidad: parseInt(document.getElementById('tDeudaCant').value),
        precio: parseFloat(document.getElementById('tDeudaPrecio').value),
        pagado: false,
        fecha: new Date().toISOString()
    };
    try {
        await treasuryDb.ref(`actividades/${actId}/deudas`).push(data);
        cerrarModalDeuda();
    } catch(err) { alert(err.message); }
}

async function marcarDeudaPagada(actId, deudaId) {
    if(!confirm('¿Marcar cuenta como pagada e ingresar el dinero a la CAJA DEL MES ACTUAL?')) return;
    try {
        const snap = await treasuryDb.ref(`actividades/${actId}/deudas/${deudaId}`).once('value');
        const d = snap.val();
        if(!d) return;
        
        const total = d.cantidad * d.precio;
        
        // 1. Marcar pagado
        await treasuryDb.ref(`actividades/${actId}/deudas/${deudaId}`).update({
            pagado: true,
            pagadoEn: new Date().toISOString(),
            pagadoEnPeriodo: treasuryCurrentPeriod
        });
        
        // 2. Sumar a los "cobrados" original
        const actSnap = await treasuryDb.ref(`actividades/${actId}`).once('value');
        const actVal = actSnap.val();
        const cobradosActual = actVal.cobrados || 0;
        let pendientesActual = actVal.pendientes || 0;
        
        pendientesActual = pendientesActual - d.cantidad;
        if(pendientesActual < 0) pendientesActual = 0;
        
        await treasuryDb.ref(`actividades/${actId}`).update({
            cobrados: cobradosActual + d.cantidad,
            pendientes: pendientesActual
        });
        
        // 3. Ingreso en caja del periodo actual
        await treasuryDb.ref('caja').push({
            periodo: treasuryCurrentPeriod,
            tipo: 'ingreso',
            categoria: 'Venta Actividad',
            descripcion: `Cobro pendiente de: ${d.nombre}`,
            monto: total,
            fecha: new Date().toISOString().split('T')[0],
            creadoPor: treasuryUser.email,
            cerrado: false
        });
        
        alert('Pago registrado. Se ha generado un ingreso en la caja del periodo actual.');
    } catch(e) { alert(e.message); }
}

// -----------------------------------------------------
// CIERRE DE ACTIVIDAD
// -----------------------------------------------------
async function cerrarActividad(actId, gastoTotal, ingresoTotal) {
    if(!confirm('¿Cerrar actividad definitivamente? \\n\\nSe creará UN SOLO EGRESO por $'+gastoTotal+' y UN SOLO INGRESO por $'+ingresoTotal+' en la caja de este mes. \\nEsta acción no se puede deshacer.')) return;
    
    try {
        const act = actividadesCaja.find(a => a.id === actId);
        
        if (gastoTotal > 0) {
            await treasuryDb.ref('caja').push({
                periodo: treasuryCurrentPeriod,
                tipo: 'egreso',
                categoria: 'Consumo Caja',
                descripcion: `Gastos de actividad: ${act.nombre}`,
                monto: gastoTotal,
                fecha: act.fecha,
                creadoPor: treasuryUser.email,
                cerrado: true
            });
        }
        
        if (ingresoTotal > 0) {
            await treasuryDb.ref('caja').push({
                periodo: treasuryCurrentPeriod,
                tipo: 'ingreso',
                categoria: 'Venta Actividad',
                descripcion: `Ingreso por actividad: ${act.nombre}`,
                monto: ingresoTotal,
                fecha: act.fecha,
                creadoPor: treasuryUser.email,
                cerrado: true
            });
        }
        
        await treasuryDb.ref(`actividades/${actId}`).update({
            cerrada: true,
            cerradaPor: treasuryUser.email,
            cerradaEn: new Date().toISOString()
        });
        
        alert('Actividad cerrada. Totales transferidos a la Caja Oficial.');
    } catch(err) { alert(err.message); }
}

// -----------------------------------------------------
// CHECKLIST ESPECÍFICA DE LA ACTIVIDAD
// -----------------------------------------------------

function abrirModalChecklistSec(actId) {
    document.getElementById('tChkSecActId').value = actId;
    document.getElementById('tChkNuevoItemFormContainer').classList.add('hidden');
    document.getElementById('tChkImprevistoFormContainer').classList.add('hidden');
    renderizarChecklistActividad(actId);
    document.getElementById('tChecklistModal').classList.remove('hidden');
}

function cerrarModalChecklistSec() {
    document.getElementById('tChecklistModal').classList.add('hidden');
}

function mostrarFormNuevoItemChecklist() {
    document.getElementById('tChkImprevistoFormContainer').classList.add('hidden');
    document.getElementById('tChkNuevoItemFormContainer').classList.toggle('hidden');
}

function mostrarFormCompraImprevista() {
    document.getElementById('tChkNuevoItemFormContainer').classList.add('hidden');
    document.getElementById('tChkImprevistoFormContainer').classList.toggle('hidden');
}

async function guardarItemChecklistSec(e) {
    e.preventDefault();
    const actId = document.getElementById('tChkSecActId').value;
    const data = {
        accion: document.getElementById('tChkSecAccion').value,
        categoria: document.getElementById('tChkSecCat').value,
        descripcion: document.getElementById('tChkSecDesc').value,
        comprado: false
    };
    try {
        await treasuryDb.ref(`actividades/${actId}/checklist`).push(data);
        document.getElementById('tChkNuevoItemFormContainer').classList.add('hidden');
        renderizarChecklistActividad(actId);
    } catch(e) { alert(e.message); }
}

function renderizarChecklistActividad(actId) {
    const act = actividadesCaja.find(a => a.id === actId);
    const container = document.getElementById('tChecklistItemsList');
    if (!act || !act.checklist) {
        container.innerHTML = '<div class="p-4 text-center text-slate-500 text-sm">El checklist está vacío.</div>';
        return;
    }
    
    const itemsArr = Object.entries(act.checklist).map(([id, val]) => ({id, ...val}));
    
    container.innerHTML = itemsArr.map(item => {
        const icon = item.comprado ? '<i class="fas fa-check-square text-green-600"></i>' : '<i class="far fa-square text-slate-400"></i>';
        const st = item.comprado ? 'line-through text-slate-500 bg-slate-50' : 'text-slate-800 bg-white';
        const lbl = item.accion === 'INVENTARIO' ? '<span class="text-[10px] bg-orange-100 text-orange-800 px-1 font-bold">INV</span>' : '<span class="text-[10px] bg-blue-100 text-blue-800 px-1 font-bold">COMP</span>';
        
        return `
        <div class="flex items-center gap-3 p-2 border-b border-slate-200 ${st}">
            <button onclick="intentarCompletarChecklist('${actId}', '${item.id}', ${item.comprado}, '${item.accion}', '${item.categoria}', '${item.descripcion}')" class="text-xl">${icon}</button>
            <div class="flex-1 text-sm">${lbl} [${escHtml(item.categoria)}] ${escHtml(item.descripcion)}</div>
            ${!item.comprado && canEditTreasury() ? `<button onclick="eliminarChecklistAct('${actId}', '${item.id}')" class="text-red-500"><i class="fas fa-trash"></i></button>` : ''}
        </div>
        `;
    }).join('');
}

function intentarCompletarChecklist(actId, itemId, estaComprado, accion, cat, desc) {
    if (estaComprado) {
        alert('Este elemento ya fue comprado y su gasto registrado en el consumo. Para deshacerlo, elimina el elemento en el Control de Gastos manualmente.');
        return;
    }
    
    document.getElementById('tCompradoSecId').value = itemId;
    document.getElementById('tCompradoSecDescLbl').textContent = desc;
    
    if (accion === 'INVENTARIO') {
        document.getElementById('tCompradoSecCostoBox').classList.add('hidden');
        document.getElementById('tCompradoSecCosto').removeAttribute('required');
        document.getElementById('tCompradoSecCosto').value = 0;
    } else {
        document.getElementById('tCompradoSecCostoBox').classList.remove('hidden');
        document.getElementById('tCompradoSecCosto').setAttribute('required', 'true');
        document.getElementById('tCompradoSecCosto').value = '';
    }
    
    document.getElementById('tCompradoSecModal').classList.remove('hidden');
}

async function confirmarCompradoSec(e) {
    e.preventDefault();
    const actId = document.getElementById('tChkSecActId').value;
    const itemId = document.getElementById('tCompradoSecId').value;
    
    // Buscar los datos del item
    const act = actividadesCaja.find(a => a.id === actId);
    const item = act.checklist[itemId];
    
    const prov = document.getElementById('tCompradoSecProv').value.trim();
    const costo = parseFloat(document.getElementById('tCompradoSecCosto').value) || 0;
    
    try {
        // 1. Agregar a Control de Gastos (Consumo) de la actividad
        const gasto = {
            origen: item.accion,
            categoria: item.categoria,
            descripcion: `[Chk] ${item.descripcion}`,
            cantidad: 1,
            unidad: 'Variado',
            precioUnitario: costo,
            total: costo,
            proveedor: prov,
            fechaCompra: new Date().toISOString().split('T')[0]
        };
        await treasuryDb.ref(`actividades/${actId}/gastos`).push(gasto);
        
        // 2. Marcar como completado en el checklist
        await treasuryDb.ref(`actividades/${actId}/checklist/${itemId}`).update({ comprado: true });
        
        document.getElementById('tCompradoSecModal').classList.add('hidden');
        renderizarChecklistActividad(actId);
    } catch(err) { alert(err.message); }
}

async function eliminarChecklistAct(actId, itemId) {
    if(!confirm('¿Eliminar tarea del checklist?')) return;
    try { 
        await treasuryDb.ref(`actividades/${actId}/checklist/${itemId}`).remove();
        renderizarChecklistActividad(actId);
    } catch(e) {}
}

// -----------------------------------------------------
// COMPRA IMPREVISTA (DIRECTO A CONSUMO)
// -----------------------------------------------------

function calcularTotalImprevisto() {
    const c = parseFloat(document.getElementById('tImpCant').value) || 0;
    const p = parseFloat(document.getElementById('tImpPrecio').value) || 0;
    document.getElementById('tImpTotal').value = (c * p).toFixed(2);
}

async function guardarCompraImprevistaSec(e) {
    e.preventDefault();
    const actId = document.getElementById('tChkSecActId').value;
    const cant = parseFloat(document.getElementById('tImpCant').value) || 1;
    const precio = parseFloat(document.getElementById('tImpPrecio').value) || 0;
    const total = cant * precio;
    const desc = document.getElementById('tImpDesc').value;
    
    try {
        const gasto = {
            origen: 'COMPRAR',
            categoria: 'Otros',
            descripcion: `[Imprevisto] ${desc}`,
            cantidad: cant,
            unidad: 'Variado',
            precioUnitario: precio,
            total: total,
            proveedor: '',
            fechaCompra: new Date().toISOString().split('T')[0]
        };
        await treasuryDb.ref(`actividades/${actId}/gastos`).push(gasto);
        
        document.getElementById('tChkImprevistoFormContainer').classList.add('hidden');
        alert('Imprevisto agregado directamente al consumo de la actividad.');
    } catch(err) { alert(err.message); }
}

