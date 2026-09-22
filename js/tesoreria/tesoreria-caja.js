
// tesoreria-caja.js
let cajaListener = null;
let movsListener = null;
let currentCaja = {};
let currentMovimientos = {};
let currentDeudas = {}; // Usaremos otra ruta para deudas

function renderTesoreriaCaja() {
    const container = document.getElementById('treasurySubContent');
    if (!container) return;
    
    container.innerHTML = `
        <div id="cajaStatusLoader" class="text-center py-10 text-slate-400 italic">Verificando estado de la caja...</div>
    `;
    
    iniciarListenerCaja();
}

function iniciarListenerCaja() {
    if (!treasuryDb || !treasuryCurrentPeriod) return;
    
    if (cajaListener) treasuryDb.ref('periodos/' + treasuryCurrentPeriod).off('value', cajaListener);
    if (movsListener) treasuryDb.ref('movimientos/' + treasuryCurrentPeriod).off('value', movsListener);
    
    cajaListener = treasuryDb.ref('periodos/' + treasuryCurrentPeriod).on('value', snap => {
        currentCaja = snap.val() || null;
        verificarRenderCaja();
    });
    
    movsListener = treasuryDb.ref('movimientos/' + treasuryCurrentPeriod).on('value', snap => {
        currentMovimientos = snap.val() || {};
        verificarRenderCaja();
    });
}

function verificarRenderCaja() {
    const c = document.getElementById('treasurySubContent');
    if(!c) return;
    
    if(!currentCaja) {
        renderMesNoAbierto(c);
    } else {
        renderCajaOperativa(c);
    }
}

function renderMesNoAbierto(container) {
    container.innerHTML = `
        <div class="max-w-md mx-auto bg-slate-50 border border-slate-200 p-8 rounded-xl text-center shadow-sm">
            <div class="w-16 h-16 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                <i class="fas fa-lock"></i>
            </div>
            <h2 class="text-xl font-black text-slate-800 uppercase mb-2">Mes Bloqueado</h2>
            <p class="text-sm text-slate-600 mb-6">El período <b>${treasuryCurrentPeriod}</b> aún no ha sido activado.</p>
            <div class="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-xs font-bold text-yellow-800 text-left">
                <i class="fas fa-exclamation-triangle mr-1"></i> 
                Usa el botón <b>"COMENZAR MES"</b> en la parte superior para activar este período y poder registrar movimientos.
            </div>
        </div>
    `;
}

function renderCajaOperativa(container) {
    // Calculo CAJA REAL
    let ingresos = 0;
    let egresos = 0;
    
    const movs = Object.values(currentMovimientos).filter(m => m.estado === 'CONFIRMADO');
    movs.forEach(m => {
        if(m.tipo === 'INGRESO') ingresos += parseFloat(m.monto);
        else if(m.tipo === 'EGRESO') egresos += parseFloat(m.monto);
    });
    
    const saldoIn = parseFloat(currentCaja.saldoInicial) || 0;
    const saldoDisp = saldoIn + ingresos - egresos;
    
    let htmlMovs = '';
    if(movs.length === 0) {
        htmlMovs = `<div class="text-center py-6 text-slate-400 italic">No hay movimientos confirmados.</div>`;
    } else {
        movs.sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).forEach(m => {
            const isIngreso = m.tipo === 'INGRESO';
            htmlMovs += `
                <div class="flex justify-between items-center py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors px-2 rounded">
                    <div>
                        <div class="font-bold text-slate-800 text-sm">${escHtml(m.descripcion)}</div>
                        <div class="text-[10px] text-slate-400 font-bold">${formatDateShort(m.fecha)} | ${escHtml(m.categoria)} | <i class="fas fa-user"></i> ${escHtml(m.usuario.split('@')[0])}</div>
                    </div>
                    <div class="font-black ${isIngreso ? 'text-green-600' : 'text-red-600'}">
                        ${isIngreso ? '+' : '-'}$${parseFloat(m.monto).toFixed(2)}
                    </div>
                </div>
            `;
        });
    }
    
    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Saldo Inicial</div>
                <div class="text-2xl font-black text-slate-700">$${saldoIn.toFixed(2)}</div>
                <div class="text-[9px] text-slate-400 mt-1 uppercase">${currentCaja.fuenteSaldoInicial}</div>
            </div>
            <div class="bg-green-50 p-6 rounded-2xl border border-green-200">
                <div class="text-xs font-bold text-green-700 uppercase tracking-wider mb-1">Ingresos (Conf.)</div>
                <div class="text-2xl font-black text-green-700">+$${ingresos.toFixed(2)}</div>
            </div>
            <div class="bg-red-50 p-6 rounded-2xl border border-red-200">
                <div class="text-xs font-bold text-red-700 uppercase tracking-wider mb-1">Egresos (Conf.)</div>
                <div class="text-2xl font-black text-red-700">-$${egresos.toFixed(2)}</div>
            </div>
        </div>
        
        <div class="bg-blue-900 text-white p-6 rounded-2xl shadow-lg flex justify-between items-center mb-8">
            <div>
                <div class="text-xs font-bold text-blue-200 uppercase tracking-widest mb-1">Saldo Oficial Disponible</div>
                <div class="text-5xl font-black">$${saldoDisp.toFixed(2)}</div>
            </div>
            <div class="text-blue-300 opacity-50 hidden sm:block">
                <i class="fas fa-wallet text-6xl"></i>
            </div>
        </div>
        
        <div class="bg-white rounded-xl shadow-sm border border-slate-200">
            <div class="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 class="font-black text-slate-800 text-lg uppercase">Movimientos Confirmados</h3>
            </div>
            <div class="p-4 max-h-[400px] overflow-y-auto">
                ${htmlMovs}
            </div>
        </div>
    `;
}
