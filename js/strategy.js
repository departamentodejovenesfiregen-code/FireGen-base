/**
 * FireGen V3.0 — js/strategy.js
 * ─────────────────────────────────────────────────────────────
 * MÓDULO DE ESTRATEGIAS
 * Tabla de crecimiento histórico (solo lectura, alimentada
 * automáticamente desde el Informe Mensual) y Análisis Ministerial.
 *
 * Dependencias: firebase-config.js, utils.js, members.js
 * ─────────────────────────────────────────────────────────────
 */

/* ── Estado del módulo ── */
let activeStrategyYear = null;

// Referencia y callback del listener de estrategia (para .off() preciso)
// FIX: FIR-03
let strategyRef = null;
let strategyCallback = null;

/**
 * buildHistoricTable — Construye las 12 filas (una por mes) de la tabla histórica.
 * Se llama una única vez en la inicialización.
 */
function buildHistoricTable() {
    const tbody = document.getElementById('historicTbody');
    MESES_LABELS.forEach((mes, i) => {
        const tr = document.createElement('tr');
        tr.id = 'hist-row-' + i;
        tr.innerHTML = `
            <td class="p-3 border font-bold text-slate-700">${escHtml(mes)}</td>
            <td class="p-3 border text-center" id="h-avg-${i}"><span class="hist-readonly">—</span></td>
            <td class="p-3 border text-center" id="h-new-${i}"><span class="hist-readonly">—</span></td>
            <td class="p-3 border text-center" id="h-bau-${i}"><span class="hist-readonly">—</span></td>
            <td class="p-3 border text-center" id="h-res-${i}"><span class="hist-readonly">—</span></td>
            <td class="p-3 border text-center" id="h-tot-${i}"><span class="hist-readonly">—</span></td>`;
        tbody.appendChild(tr);
    });
}

/**
 * setHistoricCell — Actualiza una celda de la tabla histórica.
 * FIX: SEC-01 — El valor se escapa antes de insertarse.
 */
function setHistoricCell(col, monthIdx, val) {
    const el = document.getElementById(`h-${col}-${monthIdx}`);
    if (el) el.innerHTML = `<span class="hist-readonly">${val !== undefined && val !== '' ? escHtml(val) : '—'}</span>`;
}

/**
 * syncHistoricalFromReport — Recalcula la fila histórica del mes del informe
 * dado y la persiste en Firebase (rama `estrategias/<año>`).
 * FIX: JS-05 — Lee promedios y nuevos desde el estado JS renderizado en el
 * DOM del informe actual, no desde valores potencialmente obsoletos.
 * @param {string} periodo - Formato YYYY-MM
 * @param {object} data - Datos parciales del informe (bautismos, rescatados, etc.)
 */
function syncHistoricalFromReport(periodo, data) {
    if (!periodo) return;
    const [year, monthStr] = periodo.split('-');
    const mi = parseInt(monthStr, 10) - 1;

    if (data.bautismos !== undefined) setHistoricCell('bau', mi, data.bautismos);
    if (data.rescatados !== undefined) setHistoricCell('res', mi, data.rescatados);

    setHistoricCell('tot', mi, members.length);

    const repPeriodoEl = document.getElementById('repPeriodo');
    if (periodo === (repPeriodoEl ? repPeriodoEl.value : '')) {
        let sum = 0, cnt = 0;
        document.querySelectorAll('.rep-asist').forEach(inp => {
            const v = parseInt(inp.value);
            if (v > 0) { sum += v; cnt++; }
        });
        if (cnt > 0) setHistoricCell('avg', mi, Math.round(sum / cnt));

        let totalNuevos = 0;
        document.querySelectorAll('.rep-nuevos').forEach(inp => { totalNuevos += parseInt(inp.value) || 0; });
        setHistoricCell('new', mi, totalNuevos);
    }

    const mesKey = MESES_KEYS[mi];
    if (mesKey && year === activeStrategyYear) {
        const avgEl = document.getElementById(`h-avg-${mi}`);
        const newEl = document.getElementById(`h-new-${mi}`);
        const bauEl = document.getElementById(`h-bau-${mi}`);
        const resEl = document.getElementById(`h-res-${mi}`);
        const u = {};
        u[mesKey] = {
            avg: avgEl ? (avgEl.innerText === '—' ? 0 : parseInt(avgEl.innerText) || 0) : 0,
            nw: newEl ? (newEl.innerText === '—' ? 0 : parseInt(newEl.innerText) || 0) : 0,
            bau: bauEl ? (bauEl.innerText === '—' ? 0 : parseInt(bauEl.innerText) || 0) : 0,
            res: resEl ? (resEl.innerText === '—' ? 0 : parseInt(resEl.innerText) || 0) : 0,
            tot: members.length
        };
        db.ref('estrategias/' + activeStrategyYear).update(u)
            .catch(err => console.error('[FireGen] Error al sincronizar estrategia:', err));
    }
    refreshChart();
}

function bindStrategyInputs() {
    // Tabla histórica es solo lectura — no hay inputs manuales que enlazar.
}

/**
 * syncStrategy — Abre el listener reactivo de Firebase para el año dado
 * (rama `estrategias/<año>`) y repuebla la tabla histórica.
 * FIX: FIR-03 — Guarda referencia y callback exactos para .off() preciso.
 * FIX: JS-07 — Handler de error visible.
 * @param {string} periodo - Año (ej. "2026")
 */
function syncStrategy(periodo) {
    if (strategyRef && strategyCallback) {
        strategyRef.off('value', strategyCallback);
    }
    activeStrategyYear = periodo;

    strategyRef = db.ref('estrategias/' + periodo);
    strategyCallback = strategyRef.on('value',
        snap => {
            hideConnectionError();
            const d = snap.val();
            if (!d) return;
            MESES_KEYS.forEach((mes, i) => {
                if (!d[mes]) return;
                setHistoricCell('avg', i, d[mes].avg || '—');
                setHistoricCell('new', i, d[mes].nw || '—');
                setHistoricCell('bau', i, d[mes].bau || '—');
                setHistoricCell('res', i, d[mes].res || '—');
                setHistoricCell('tot', i, d[mes].tot || '—');
            });
            refreshChart();
        },
        error => {
            console.error('[FireGen Strategy] Error Firebase:', error.code, error.message);
            showConnectionError('⚠️ Error al cargar estrategias. Verifica tu conexión o las reglas de Firebase.');
        }
    );
}

/**
 * destroyStrategyListener — Desregistra el listener de estrategia.
 * Llamar al hacer logout para liberar recursos.
 */
function destroyStrategyListener() {
    if (strategyRef && strategyCallback) {
        strategyRef.off('value', strategyCallback);
        strategyRef = null;
        strategyCallback = null;
    }
}

/* ── ANÁLISIS MINISTERIAL ─────────────────────────────────────── */

function initAnalysisMonthSelect() {
    const sel = document.getElementById('analysisMonthSelect');
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = label.charAt(0).toUpperCase() + label.slice(1);
        sel.appendChild(opt);
    }
    loadAnalysis();

    // FIX: OPT-02 — debounce de 800ms compartido vía utils.js
    document.getElementById('analysisTextarea').addEventListener('input', debounce(saveAnalysis, 800));
}

function loadAnalysis() {
    const mes = document.getElementById('analysisMonthSelect').value;
    db.ref('analisis/' + mes).once('value').then(snap => {
        document.getElementById('analysisTextarea').value = snap.val() || '';
    }).catch(err => console.error('[FireGen] Error al cargar análisis:', err));
}

function saveAnalysis() {
    const mes = document.getElementById('analysisMonthSelect').value;
    const text = document.getElementById('analysisTextarea').value;
    db.ref('analisis/' + mes).set(text)
        .then(() => flashBadge('analysisSaveBadge'))
        .catch(err => console.error('[FireGen] Error al guardar análisis:', err));
}

/* ── EXPORTAR CSV ─────────────────────────────────────────────── */

function exportStrategy() {
    let csv = "Mes,Asistencia Promedio,Nuevos,Bautismos,Rescatados,Total Miembros\n";
    MESES_LABELS.forEach((mes, i) => {
        const avg = document.getElementById(`h-avg-${i}`) ? document.getElementById(`h-avg-${i}`).innerText : '—';
        const nw = document.getElementById(`h-new-${i}`) ? document.getElementById(`h-new-${i}`).innerText : '—';
        const bau = document.getElementById(`h-bau-${i}`) ? document.getElementById(`h-bau-${i}`).innerText : '—';
        const res = document.getElementById(`h-res-${i}`) ? document.getElementById(`h-res-${i}`).innerText : '—';
        const tot = document.getElementById(`h-tot-${i}`) ? document.getElementById(`h-tot-${i}`).innerText : '—';
        csv += `${mes},${avg},${nw},${bau},${res},${tot}\n`;
    });
    downloadCSV(csv, "FireGen_CrecimientoHistorico.csv");
}
