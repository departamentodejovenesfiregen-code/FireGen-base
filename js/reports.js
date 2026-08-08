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
            if (d.serie !== undefined) document.getElementById('repSerie').value = d.serie;

            const saturdays = getOperationalSaturdaysForPeriod(periodo);
            document.querySelectorAll('.row-report-data').forEach((row, i) => {
                const satDate = saturdays[i];
                if (!satDate) {
                    row.style.display = 'none';
                    return;
                }
                row.style.display = '';
                const semLabel = row.querySelector('.rep-sem-label');
                if (semLabel) semLabel.textContent = getSaturdayLabel(satDate);
                
                const fData = (d.fechas && d.fechas[satDate]) ? d.fechas[satDate] : d['sem' + (i + 1)];
                if (!fData) return;
                
                row.querySelector('.rep-tema').value = fData.tema || '';
                row.querySelector('.rep-asist').value = fData.asist || '';
                row.querySelector('.rep-nuevos').value = fData.nuevos || '';
                row.querySelector('.rep-decis').value = fData.decis || '';
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
    document.getElementById('repSerie').value = '';
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
    const saturdays = getOperationalSaturdaysForPeriod(p);
    const satDate = saturdays[idx];
    if (!p || !satDate) return;
    const row = document.querySelectorAll('.row-report-data')[idx];
    
    const updates = {};
    updates[`fechas/${satDate}/tema`] = row.querySelector('.rep-tema').value;
    updates[`fechas/${satDate}/asist`] = parseInt(row.querySelector('.rep-asist').value) || 0;
    updates[`fechas/${satDate}/nuevos`] = parseInt(row.querySelector('.rep-nuevos').value) || 0;
    updates[`fechas/${satDate}/decis`] = row.querySelector('.rep-decis').value;
    
    updates[`sem${idx + 1}/tema`] = row.querySelector('.rep-tema').value;
    updates[`sem${idx + 1}/asist`] = parseInt(row.querySelector('.rep-asist').value) || 0;
    updates[`sem${idx + 1}/nuevos`] = parseInt(row.querySelector('.rep-nuevos').value) || 0;
    updates[`sem${idx + 1}/decis`] = row.querySelector('.rep-decis').value;
    
    db.ref('informes/' + p).update(updates).catch(err => console.error('[FireGen] Error al guardar fila de informe:', err));
    updateMonthlyStats();
}

// FIX: OPT-02 — debounce genérico de 800ms para agrupar escrituras Firebase
// mientras el usuario escribe en los campos manuales del informe.
const saveReportRowDebounced = debounce(saveReportRow, 800);

function bindReportInputs() {
    document.getElementById('repSecretario').addEventListener('input', function () {
        saveReportField('secretario', this.value);
    });
    document.getElementById('repSerie').addEventListener('input', function () {
        saveReportField('serie', this.value);
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
    const saturdays = getOperationalSaturdaysForPeriod(per);
    const serie = document.getElementById('repSerie').value || '';
    let csv = `INFORME MENSUAL FIREGEN - ${per}\nSerie: ${serie.replace(/"/g, '""')}\nSábado,Tema,Asistencia,Nuevos,Decisiones\n`;
    document.querySelectorAll('.row-report-data').forEach((row, i) => {
        if (!saturdays[i]) return;
        const tema = (row.querySelector('.rep-tema').value || '').replace(/"/g, '""');
        const decis = (row.querySelector('.rep-decis').value || '').replace(/"/g, '""');
        csv += `${getSaturdayLabel(saturdays[i])},"${tema}",${row.querySelector('.rep-asist').value || 0},${row.querySelector('.rep-nuevos').value || 0},"${decis}"\n`;
    });
    csv += `\nMETRICAS CLAVE\nBautismos,${document.getElementById('inp-bautismos').value}\nAl Servicio,${document.getElementById('inp-servicio').value}\nAlejados,${document.getElementById('inp-alejados').value}\nRescatados,${document.getElementById('inp-rescatados').value}\nPromedio,${document.getElementById('rep-avg').innerText}\n`;
    downloadCSV(csv, `FireGen_InformeMensual_${per}.csv`);
}
