/**
 * FireGen V3.0 — js/reports.js
 * ─────────────────────────────────────────────────────────────
 * MÓDULO DE INFORME MENSUAL
 * Formato 2 — Informe Mensual sincronizado reactivamente con
 * Firebase, con auto-sincronización desde Asistencia.
 *
 * Dependencias: firebase-config.js, utils.js, members.js, strategy.js
 * ─────────────────────────────────────────────────────────────
 */

/* ── Estado del módulo ── */
let activeReportPeriod = null;

// Referencia y callback del listener de informe (para .off() preciso)
// FIX: FIR-03
let reportRef = null;
let reportCallback = null;

/**
 * syncReport — Abre el listener reactivo de Firebase para el informe del periodo dado.
 * FIX: FIR-03 — Guarda referencia y callback exactos para .off() preciso.
 * FIX: JS-07 — Handler de error visible.
 * @param {string} periodo - Formato YYYY-MM
 */
function syncReport(periodo) {
    if (!AppConfig.isDateInPeriod(periodo + '-01')) {
        showConnectionError('⚠️ El mes seleccionado está fuera del periodo oficial de gestión.');
        return;
    }

    if (reportRef && reportCallback) {
        reportRef.off('value', reportCallback);
    }
    activeReportPeriod = periodo;
    clearReportFields();

    reportRef = db.ref('informes/' + periodo);
    reportCallback = reportRef.on('value',
        snap => {
            hideConnectionError();
            const d = snap.val();
            if (!d) return;
            if (d.secretario !== undefined) document.getElementById('repSecretario').value = d.secretario;

            document.querySelectorAll('.row-report-data').forEach((row, i) => {
                const sk = 'sem' + (i + 1);
                if (!d[sk]) return;
                row.querySelector('.rep-tema').value = d[sk].tema || '';
                row.querySelector('.rep-asist').value = d[sk].asist || '';
                row.querySelector('.rep-nuevos').value = d[sk].nuevos || '';
                row.querySelector('.rep-decis').value = d[sk].decis || '';
            });
            if (d.bautismos !== undefined) document.getElementById('inp-bautismos').value = d.bautismos;
            if (d.servicio !== undefined) {
                document.getElementById('inp-servicio').value = d.servicio;
                document.getElementById('rep-servicio-total').innerText = d.servicio;
            }
            if (d.alejados !== undefined) document.getElementById('inp-alejados').value = d.alejados;
            if (d.rescatados !== undefined) document.getElementById('inp-rescatados').value = d.rescatados;
            updateMonthlyStats();
            syncHistoricalFromReport(periodo, d);
        },
        error => {
            console.error('[FireGen Reports] Error Firebase:', error.code, error.message);
            showConnectionError('⚠️ Error al cargar el informe. Verifica tu conexión o las reglas de Firebase.');
        }
    );
}

/**
 * destroyReportListener — Desregistra el listener de informe.
 * Llamar al hacer logout para liberar recursos.
 */
function destroyReportListener() {
    if (reportRef && reportCallback) {
        reportRef.off('value', reportCallback);
        reportRef = null;
        reportCallback = null;
    }
}

function clearReportFields() {
    document.getElementById('repSecretario').value = '';
    document.querySelectorAll('.row-report-data').forEach(r => {
        r.querySelector('.rep-tema').value = '';
        r.querySelector('.rep-asist').value = '';
        r.querySelector('.rep-nuevos').value = '';
        r.querySelector('.rep-decis').value = '';
    });
    ['inp-bautismos', 'inp-servicio', 'inp-alejados', 'inp-rescatados'].forEach(id => {
        document.getElementById(id).value = 0;
    });
    updateMonthlyStats();
}

function saveReportField(field, val) {
    const p = document.getElementById('repPeriodo').value;
    if (!p) return;
    const u = {};
    u[field] = val;
    db.ref('informes/' + p).update(u)
        .catch(err => console.error('[FireGen] Error al guardar campo de informe:', err));
}

function saveReportRow(idx) {
    const p = document.getElementById('repPeriodo').value;
    if (!p) return;
    const row = document.querySelectorAll('.row-report-data')[idx];
    db.ref('informes/' + p + '/sem' + (idx + 1)).update({
        tema: row.querySelector('.rep-tema').value,
        asist: parseInt(row.querySelector('.rep-asist').value) || 0,
        nuevos: parseInt(row.querySelector('.rep-nuevos').value) || 0,
        decis: parseInt(row.querySelector('.rep-decis').value) || 0
    }).catch(err => console.error('[FireGen] Error al guardar fila de informe:', err));
    updateMonthlyStats();
}

// FIX: OPT-02 — debounce genérico de 800ms para agrupar escrituras Firebase
// mientras el usuario escribe en los campos manuales del informe.
const saveReportRowDebounced = debounce(saveReportRow, 800);

function bindReportInputs() {
    document.getElementById('repSecretario').addEventListener('input', function () {
        saveReportField('secretario', this.value);
    });
    document.getElementById('repPeriodo').addEventListener('change', function () {
        syncReport(this.value);
    });
    document.querySelectorAll('.row-report-data').forEach((row, i) => {
        row.querySelector('.rep-tema').addEventListener('input', () => saveReportRowDebounced(i));
        row.querySelector('.rep-decis').addEventListener('input', () => saveReportRowDebounced(i));
    });
    document.getElementById('inp-bautismos').addEventListener('input', function () {
        const val = parseInt(this.value) || 0;
        saveReportField('bautismos', val);
        const p = document.getElementById('repPeriodo').value;
        if (p) syncHistoricalFromReport(p, { bautismos: val });
    });
    document.getElementById('inp-rescatados').addEventListener('input', function () {
        const val = parseInt(this.value) || 0;
        saveReportField('rescatados', val);
        const p = document.getElementById('repPeriodo').value;
        if (p) syncHistoricalFromReport(p, { rescatados: val });
    });
}

/* ── ESTADÍSTICAS DEL INFORME ─────────────────────────────────── */

function updateMonthlyStats() {
    document.getElementById('rep-active').innerText = members.length;
    let sum = 0, cnt = 0, totalNuevos = 0;
    document.querySelectorAll('.rep-asist').forEach(inp => {
        const v = parseInt(inp.value);
        if (v > 0) { sum += v; cnt++; }
    });
    document.querySelectorAll('.rep-nuevos').forEach(inp => { totalNuevos += parseInt(inp.value) || 0; });
    document.getElementById('rep-avg').innerText = cnt > 0 ? Math.round(sum / cnt) : 0;
    document.getElementById('rep-nuevos-total').innerText = totalNuevos;
}

/* ── EXPORTAR CSV ─────────────────────────────────────────────── */

function exportMonthlyReport() {
    const per = document.getElementById('repPeriodo').value || 'S_P';
    let csv = `INFORME MENSUAL FIREGEN - ${per}\nSemana,Tema,Asistencia,Nuevos,Decisiones\n`;
    document.querySelectorAll('.row-report-data').forEach((row, i) => {
        csv += `Semana ${i + 1},"${row.querySelector('.rep-tema').value}",${row.querySelector('.rep-asist').value || 0},${row.querySelector('.rep-nuevos').value || 0},${row.querySelector('.rep-decis').value || 0}\n`;
    });
    csv += `\nMETRICAS CLAVE\nBautismos,${document.getElementById('inp-bautismos').value}\nAl Servicio,${document.getElementById('inp-servicio').value}\nAlejados,${document.getElementById('inp-alejados').value}\nRescatados,${document.getElementById('inp-rescatados').value}\nPromedio,${document.getElementById('rep-avg').innerText}\n`;
    downloadCSV(csv, `FireGen_InformeMensual_${per}.csv`);
}

console.log("[FireGen] reports.js cargado");