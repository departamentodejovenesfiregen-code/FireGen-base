/**
 * FireGen V3.0 — js/coordinacion.js
 * ─────────────────────────────────────────────────────────────
 * CENTRO DEL COORDINADOR
 * Vista exclusiva para Coordinadores y Administradores.
 * Muestra resumen de progreso por líder y rendiciones de cuentas.
 * ─────────────────────────────────────────────────────────────
 */

/**
 * renderCoordinacionDashboard — Renderiza el panel del coordinador
 */
window.renderCoordinacionDashboard = function() {
    const container = document.getElementById('coordinacion-container');
    if (!container) return;

    container.innerHTML = `
    <div class="p-4 md:p-6 max-w-7xl mx-auto space-y-6 pb-24">

        <!-- Header -->
        <div class="border-b pb-4">
            <h2 class="text-2xl font-black text-slate-800 flex items-center gap-2">
                <i class="fas fa-binoculars text-orange-500"></i> Centro del Coordinador
            </h2>
            <p class="text-sm font-bold text-slate-500 mt-1 uppercase tracking-wider">Supervisión del equipo de líderes</p>
        </div>

        <!-- KPIs rápidos -->
        <div id="coord-kpis" class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
                <i class="fas fa-users text-orange-400 text-xl mb-1 block"></i>
                <div class="text-2xl font-black text-slate-800" id="coord-total-lideres">–</div>
                <div class="text-[10px] font-bold uppercase text-slate-400">Líderes</div>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
                <i class="fas fa-user-check text-green-400 text-xl mb-1 block"></i>
                <div class="text-2xl font-black text-slate-800" id="coord-con-asignados">–</div>
                <div class="text-[10px] font-bold uppercase text-slate-400">Con asignados</div>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
                <i class="fas fa-clipboard-check text-blue-400 text-xl mb-1 block"></i>
                <div class="text-2xl font-black text-slate-800" id="coord-rindieron">–</div>
                <div class="text-[10px] font-bold uppercase text-slate-400">Rindieron esta semana</div>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
                <i class="fas fa-exclamation-triangle text-red-400 text-xl mb-1 block"></i>
                <div class="text-2xl font-black text-slate-800" id="coord-urgentes">–</div>
                <div class="text-[10px] font-bold uppercase text-slate-400">Casos urgentes</div>
            </div>
        </div>

        <!-- Tabla de líderes -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-4 border-b flex items-center justify-between flex-wrap gap-3">
                <h3 class="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <i class="fas fa-table text-slate-400"></i> Progreso por Líder
                </h3>
                <div class="relative">
                    <i class="fas fa-search absolute left-3 top-2.5 text-slate-400 text-xs"></i>
                    <input type="text" id="coordSearch" oninput="filtrarLideres()" placeholder="Buscar líder…"
                        class="pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 w-48">
                </div>
            </div>
            <div id="coord-lideres-tabla" class="divide-y divide-slate-100">
                <div class="text-center py-10 text-slate-400 text-sm italic">
                    <i class="fas fa-circle-notch fa-spin mr-2"></i> Cargando datos…
                </div>
            </div>
        </div>

        <!-- Rendiciones de cuenta recientes -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-4 border-b">
                <h3 class="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <i class="fas fa-history text-slate-400"></i> Rendiciones de Cuentas (Esta Semana)
                </h3>
            </div>
            <div id="coord-rendiciones-lista" class="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                <div class="text-center py-10 text-slate-400 text-sm italic">
                    <i class="fas fa-circle-notch fa-spin mr-2"></i> Cargando…
                </div>
            </div>
        </div>

    </div>`;

    // Cargar datos desde Firebase
    cargarDatosCoordinacion();
};

/** Carga datos cruzados de usuarios, miembros y rendicionCuentas */
async function cargarDatosCoordinacion() {
    try {
        // Semana actual
        const now   = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const week  = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
        const keyActual = `${now.getFullYear()}_sem${week}`;

        const [snapUsuarios, snapMiembros, snapRendicion] = await Promise.all([
            db.ref('usuarios').once('value'),
            db.ref('miembros').once('value'),
            db.ref('rendicionCuentas').once('value'),
        ]);

        const usuarios   = snapUsuarios.val()  || {};
        const miembros   = snapMiembros.val()  || {};
        const rendiciones = snapRendicion.val() || {};

        // Solo líderes (con rol 'lider')
        const lideres = Object.entries(usuarios).filter(([, v]) =>
            (v.rol || 'lider') === 'lider' && v.activo !== false
        );

        const miembrosArr = Object.values(miembros);
        let conAsignados = 0, urgentes = 0, rindieron = 0;

        const filas = lideres.map(([uid, lider]) => {
            const nombre = lider.nombre || lider.email || uid;
            const asignados = miembrosArr.filter(m =>
                m.lider && m.lider.toLowerCase() === nombre.toLowerCase()
            );

            const criticos = asignados.filter(m => {
                const s = (m.estadoAsistencia || '').toLowerCase();
                return s.includes('alejándos') || s.includes('alejado');
            });

            const rindioCuentas = rendiciones[uid] && rendiciones[uid][keyActual];

            if (asignados.length > 0) conAsignados++;
            if (criticos.length > 0)  urgentes += criticos.length;
            if (rindioCuentas)         rindieron++;

            return { uid, nombre, asignados: asignados.length, criticos: criticos.length, rindioCuentas };
        });

        // Ordenar: más críticos primero, sin rendición primero
        filas.sort((a, b) => b.criticos - a.criticos || (a.rindioCuentas ? 1 : -1));

        // Actualizar KPIs
        document.getElementById('coord-total-lideres').textContent = lideres.length;
        document.getElementById('coord-con-asignados').textContent = conAsignados;
        document.getElementById('coord-rindieron').textContent     = rindieron;
        document.getElementById('coord-urgentes').textContent      = urgentes;

        // Render tabla
        window._coordFilas = filas;
        filtrarLideres();

        // Render rendiciones
        renderRendicionesLista(rendiciones, usuarios, keyActual);

    } catch (e) {
        const t = document.getElementById('coord-lideres-tabla');
        if (t) t.innerHTML = `<div class="text-center py-8 text-red-500 font-bold text-sm">Error: ${e.message}</div>`;
    }
}

window.filtrarLideres = function() {
    const q = (document.getElementById('coordSearch')?.value || '').toLowerCase();
    const filas = (window._coordFilas || []).filter(f => f.nombre.toLowerCase().includes(q));
    const tbody = document.getElementById('coord-lideres-tabla');
    if (!tbody) return;

    if (filas.length === 0) {
        tbody.innerHTML = `<div class="text-center py-8 text-slate-400 text-sm italic">Sin resultados</div>`;
        return;
    }

    tbody.innerHTML = filas.map(f => `
    <div class="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors gap-4">
        <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-orange-700 font-black text-base flex-shrink-0">
                ${escHtml((f.nombre || '?').charAt(0).toUpperCase())}
            </div>
            <div class="min-w-0">
                <p class="font-bold text-slate-800 text-sm truncate">${escHtml(f.nombre)}</p>
                <p class="text-[10px] text-slate-400">${f.asignados} persona${f.asignados !== 1 ? 's' : ''} asignada${f.asignados !== 1 ? 's' : ''}</p>
            </div>
        </div>
        <div class="flex items-center gap-3 flex-shrink-0">
            ${f.criticos > 0
                ? `<span class="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full uppercase">🔴 ${f.criticos} crítico${f.criticos > 1 ? 's' : ''}</span>`
                : ''}
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${f.rindioCuentas ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}">
                ${f.rindioCuentas ? '✓ Rindió' : '⏳ Pendiente'}
            </span>
        </div>
    </div>`).join('');
};

function renderRendicionesLista(rendiciones, usuarios, keyActual) {
    const lista = document.getElementById('coord-rendiciones-lista');
    if (!lista) return;

    const items = [];
    Object.entries(rendiciones).forEach(([uid, semanas]) => {
        const dataSemana = semanas[keyActual];
        if (dataSemana) {
            const nombreLider = usuarios[uid]?.nombre || uid;
            items.push({ ...dataSemana, nombreLider });
        }
    });

    if (items.length === 0) {
        lista.innerHTML = `<div class="text-center py-8 text-slate-400 text-sm italic">Ningún líder ha rendido cuentas esta semana.</div>`;
        return;
    }

    lista.innerHTML = items.map(r => `
    <div class="px-4 py-3 flex items-start gap-3">
        <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-black text-sm flex-shrink-0 mt-0.5">
            ${escHtml((r.nombreLider || '?').charAt(0).toUpperCase())}
        </div>
        <div class="flex-1 min-w-0">
            <p class="font-bold text-sm text-slate-800">${escHtml(r.nombreLider)}</p>
            <div class="flex gap-3 mt-1 flex-wrap">
                <span class="text-[10px] ${r.comunicoTodos ? 'text-green-600' : 'text-red-500'} font-bold">
                    ${r.comunicoTodos ? '✓' : '✗'} Comunicó con todos
                </span>
                ${r.urgente ? `<span class="text-[10px] text-red-600 font-bold">⚠ Caso urgente</span>` : ''}
            </div>
            ${r.observaciones ? `<p class="text-xs text-slate-500 mt-1 italic">"${escHtml(r.observaciones)}"</p>` : ''}
        </div>
        <span class="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0 mt-1">
            ${new Date(r.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
        </span>
    </div>`).join('');
}
