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
let activeReportClosed = false;

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
    if (!AppConfig.isMonthInPeriod(periodo)) {
        showConnectionError('⚠️ El mes seleccionado está fuera del periodo oficial de gestión.');
        return;
    }

    if (reportRef && reportCallback) {
        reportRef.off('value', reportCallback);
    }
    activeReportPeriod = periodo;
    populateLideresSelect();
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

                const dirigeSelect = row.querySelector('.rep-dirige');
                if (fData.dirigeId) {
                    dirigeSelect.dataset.savedId = fData.dirigeId;
                    dirigeSelect.value = fData.dirigeId;
                } else {
                    dirigeSelect.dataset.savedId = '';
                    dirigeSelect.value = '';
                }
                row.querySelector('.rep-tema').value = fData.tema || '';
                row.querySelector('.rep-predicador').value = fData.predicador || '';
                row.querySelector('.rep-cita').value = fData.citaBiblica || '';
                row.querySelector('.rep-asist').value = fData.asist || '';
                row.querySelector('.rep-nuevos').value = fData.nuevos || '';
                // Compatibilidad con datos legacy (campo decis)
                row.querySelector('.rep-observaciones').value =
                    fData.observaciones !== undefined ? fData.observaciones : (fData.decis || '');
            });
            if (d.bautismos !== undefined) document.getElementById('inp-bautismos').value = d.bautismos;
            if (d.servicio !== undefined) {
                document.getElementById('inp-servicio').value = d.servicio;
                document.getElementById('rep-servicio-total').innerText = d.servicio;
            }
            if (d.alejados !== undefined) document.getElementById('inp-alejados').value = d.alejados;
            if (d.rescatados !== undefined) document.getElementById('inp-rescatados').value = d.rescatados;
            updateMonthlyStats();
            // syncHistoricalFromReport ya no se ejecuta reactivamente para evitar sobrescribir historicoMensual
            checkIfMonthClosed(periodo);

            if (!hasPermission('editarInformeMensual')) {
                const inputs = document.querySelectorAll('#view-report input, #view-report textarea, #view-report select');
                inputs.forEach(el => el.disabled = true);
            }
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
        const dirigeSelect = r.querySelector('.rep-dirige');
        dirigeSelect.value = '';
        delete dirigeSelect.dataset.savedId;
        r.querySelector('.rep-tema').value = '';
        r.querySelector('.rep-predicador').value = '';
        r.querySelector('.rep-cita').value = '';
        r.querySelector('.rep-asist').value = '';
        r.querySelector('.rep-nuevos').value = '';
        r.querySelector('.rep-observaciones').value = '';
    });
    ['inp-bautismos', 'inp-servicio', 'inp-alejados', 'inp-rescatados'].forEach(id => {
        document.getElementById(id).value = 0;
    });
    updateMonthlyStats();
}

/**
 * populateLideresSelect — Llena los campos select de Dirige con los líderes registrados.
 */
function populateLideresSelect() {
    const selects = document.querySelectorAll('.rep-dirige');
    if (!selects.length) return;
    
    // Filtro para líderes
    const lideres = (typeof members !== 'undefined' ? members : []).filter(m => 
        m.estadoEspiritual === 'Líder' || m.estadoEspiritual === 'Lider'
    ).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    
    let optionsHtml = '<option value="">Seleccionar líder…</option>';
    if (lideres.length === 0) {
        optionsHtml = '<option value="">No hay líderes registrados.</option>';
    } else {
        optionsHtml += lideres.map(l => `<option value="${l.firebaseId}">${escHtml(l.nombre)}</option>`).join('');
    }
    
    selects.forEach(select => {
        const currentVal = select.dataset.savedId || select.value;
        select.innerHTML = optionsHtml;
        if (currentVal) select.value = currentVal;
    });
}

function saveReportField(field, val) {
    if (!hasPermission('editarInformeMensual')) return;
    const p = document.getElementById('repPeriodo').value;
    if (!p || activeReportClosed) return;
    const u = {};
    u[field] = val;
    db.ref('informes/' + p).update(u)
        .catch(err => console.error('[FireGen] Error al guardar campo de informe:', err));
}

function saveReportRow(idx) {
    if (!hasPermission('editarInformeMensual')) return;
    if (activeReportClosed) return;
    const p = document.getElementById('repPeriodo').value;
    const saturdays = getOperationalSaturdaysForPeriod(p);
    const satDate = saturdays[idx];
    if (!p || !satDate) return;
    const row = document.querySelectorAll('.row-report-data')[idx];

    const dirigeSelect = row.querySelector('.rep-dirige');
    const dirigeId = dirigeSelect ? dirigeSelect.value : '';
    const dirigeNombreSnapshot = dirigeId && dirigeSelect.selectedIndex >= 0 ? dirigeSelect.options[dirigeSelect.selectedIndex].text : '';
    
    const tema = row.querySelector('.rep-tema').value;
    const predicador = row.querySelector('.rep-predicador').value;
    const citaBiblica = row.querySelector('.rep-cita').value;
    const asist = parseInt(row.querySelector('.rep-asist').value) || 0;
    const nuevos = parseInt(row.querySelector('.rep-nuevos').value) || 0;
    const observaciones = row.querySelector('.rep-observaciones').value;

    const updates = {};
    updates[`fechas/${satDate}/dirigeId`] = dirigeId;
    updates[`fechas/${satDate}/dirigeNombreSnapshot`] = dirigeNombreSnapshot;
    updates[`fechas/${satDate}/tema`] = tema;
    updates[`fechas/${satDate}/predicador`] = predicador;
    updates[`fechas/${satDate}/citaBiblica`] = citaBiblica;
    updates[`fechas/${satDate}/asist`] = asist;
    updates[`fechas/${satDate}/nuevos`] = nuevos;
    updates[`fechas/${satDate}/observaciones`] = observaciones;
    updates[`sem${idx + 1}/dirigeId`] = dirigeId;
    updates[`sem${idx + 1}/dirigeNombreSnapshot`] = dirigeNombreSnapshot;
    updates[`sem${idx + 1}/tema`] = tema;
    updates[`sem${idx + 1}/predicador`] = predicador;
    updates[`sem${idx + 1}/citaBiblica`] = citaBiblica;
    updates[`sem${idx + 1}/asist`] = asist;
    updates[`sem${idx + 1}/nuevos`] = nuevos;
    updates[`sem${idx + 1}/observaciones`] = observaciones;

    db.ref('informes/' + p).update(updates).catch(err => console.error('[FireGen] Error al guardar fila de informe:', err));
    updateMonthlyStats();
}

/**
 * checkIfMonthClosed — Verifica si el mes está cerrado en Firebase
 * y deshabilita el botón correspondientemente.
 */
function checkIfMonthClosed(periodo) {
    db.ref('historicoMensual/' + periodo).once('value').then(snap => {
        const d = snap.val();
        const btn = document.getElementById('btn-cerrar-mes');
        const statusEl = document.getElementById('cierre-status');
        activeReportClosed = !!(d && d.cerrado);
        const canEdit = hasPermission('editarInformeMensual');
        const inputs = document.querySelectorAll('#view-report input, #view-report textarea, #view-report select');
        const shouldDisable = activeReportClosed || !canEdit;
        inputs.forEach(el => {
            if (el.id === 'repPeriodo') return;
            el.disabled = shouldDisable;
            el.classList.toggle('opacity-60', shouldDisable);
            el.classList.toggle('cursor-not-allowed', shouldDisable);
        });

        // Ocultar botón de cierre si mes ya está cerrado o si el usuario no puede editar
        if (btn) btn.style.display = (d && d.cerrado) || !canEdit ? 'none' : 'flex';

        if (d && d.cerrado) {
            if (statusEl) {
                statusEl.classList.remove('hidden');
                statusEl.textContent = '🔒 Mes cerrado: informe histórico en solo lectura.';
            }
        } else if (!canEdit) {
            if (statusEl) {
                statusEl.classList.remove('hidden');
                statusEl.textContent = 'Solo lectura';
            }
        } else {
            if (statusEl) {
                statusEl.classList.add('hidden');
                statusEl.textContent = '';
            }
        }
    }).catch(err => console.error(err));
}

/**
 * cerrarMesSnapshot — Genera el snapshot final en historicoMensual.
 */
function cerrarMesSnapshot() {
    const periodo = document.getElementById('repPeriodo').value;
    if (!periodo || !AppConfig.isMonthInPeriod(periodo)) return;
    if (activeReportClosed) {
        alert('Este mes ya está cerrado.');
        return;
    }
    if (!confirm('¿Estás seguro de CERRAR el mes de ' + periodo + '? Esto generará un snapshot histórico inmutable usado para Estrategias.')) return;

    const [year, month] = periodo.split('-').map(Number);
    const periodEnd = new Date(year, month, 0);
    const totalMiembrosAlCierre = members.filter(member => {
        const incStr = member.fechaIncorporacion;
        if (!incStr) return true;
        const fecha = new Date(incStr);
        return !Number.isNaN(fecha.getTime()) && fecha <= periodEnd;
    }).length;

    const u = {
        // El total mensual representa el estado del mes cerrado, no el total actual.
        totalMiembros: totalMiembrosAlCierre,
        nuevos: parseInt(document.getElementById('rep-nuevos-total').innerText) || 0,
        bautismos: parseInt(document.getElementById('inp-bautismos').value) || 0,
        rescatados: parseInt(document.getElementById('inp-rescatados').value) || 0,
        enRiesgo: parseInt(document.getElementById('inp-alejados').value) || 0,
        asistenciaPromedio: parseInt(document.getElementById('rep-avg').innerText) || 0,
        cerrado: true,
        fechaCierre: Date.now()
    };

    // Transaction: si ya existe un cierre, nunca lo sobrescribe.
    db.ref('historicoMensual/' + periodo).transaction(current => {
        if (current && current.cerrado) return;
        return u;
    }).then(result => {
        if (!result.committed) {
            activeReportClosed = true;
            checkIfMonthClosed(periodo);
            alert('El mes ya estaba cerrado y no fue modificado.');
            return;
        }

        alert('Mes cerrado exitosamente.');
        checkIfMonthClosed(periodo);

        if (typeof syncStrategy === 'function' && typeof activeStrategyYear !== 'undefined') {
            const year = periodo.split('-')[0];
            if (activeStrategyYear === year) syncStrategy(year);
        }
    }).catch(err => {
        alert('Error al cerrar el mes: ' + err.message);
        console.error(err);
    });
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
        if (typeof hasPermission === 'function' && hasPermission('verInformeMensual')) {
            syncReport(this.value);
        }
    });
    document.querySelectorAll('.row-report-data').forEach((row, i) => {
        row.querySelector('.rep-dirige').addEventListener('change', () => saveReportRowDebounced(i));
        row.querySelector('.rep-tema').addEventListener('input', () => saveReportRowDebounced(i));
        row.querySelector('.rep-predicador').addEventListener('input', () => saveReportRowDebounced(i));
        row.querySelector('.rep-cita').addEventListener('input', () => saveReportRowDebounced(i));
        row.querySelector('.rep-observaciones').addEventListener('input', () => saveReportRowDebounced(i));
    });
    document.getElementById('inp-bautismos').addEventListener('input', function () {
        const val = parseInt(this.value) || 0;
        saveReportField('bautismos', val);
    });
    document.getElementById('inp-rescatados').addEventListener('input', function () {
        const val = parseInt(this.value) || 0;
        saveReportField('rescatados', val);
    });
}

/* ── ESTADÍSTICAS DEL INFORME ─────────────────────────────────── */

function updateMonthlyStats() {
    document.getElementById('rep-active').innerText = members.length;
    let sum = 0, cnt = 0, totalNuevos = 0;
    document.querySelectorAll('.row-report-data').forEach(row => {
        if (row.style.display === 'none') return;
        const asistEl = row.querySelector('.rep-asist');
        if (asistEl && asistEl.dataset.sinculto !== "true") {
            const v = parseInt(asistEl.value);
            if (!isNaN(v) && v > 0) {
                sum += v;
                cnt++;
            }
        }
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
    const secretario = document.getElementById('repSecretario').value || '';
    const q = s => '"' + (s || '').replace(/"/g, '""') + '"';

    let csv = `INFORME MENSUAL FIREGEN - ${per}\n`;
    csv += `Serie: ${q(serie)}\n`;
    csv += `Secretario: ${q(secretario)}\n\n`;
    csv += `S\u00e1bado,Dirige,Tema Predicado,Predicador,Cita B\u00edblica,Asistencia,Nuevos,Observaciones\n`;

    document.querySelectorAll('.row-report-data').forEach((row, i) => {
        if (!saturdays[i]) return;
        const dirigeSelect = row.querySelector('.rep-dirige');
        const dirige = q(dirigeSelect && dirigeSelect.value ? dirigeSelect.options[dirigeSelect.selectedIndex].text : '');
        const tema = q(row.querySelector('.rep-tema').value);
        const pred = q(row.querySelector('.rep-predicador').value);
        const cita = q(row.querySelector('.rep-cita').value);
        const asist = row.querySelector('.rep-asist').value || 0;
        const nuevos = row.querySelector('.rep-nuevos').value || 0;
        const obs = q(row.querySelector('.rep-observaciones').value);
        csv += `${getSaturdayLabel(saturdays[i])},${dirige},${tema},${pred},${cita},${asist},${nuevos},${obs}\n`;
    });

    csv += `\nMETRICAS CLAVE\n`;
    csv += `Bautismos,${document.getElementById('inp-bautismos').value}\n`;
    csv += `Al Servicio,${document.getElementById('inp-servicio').value}\n`;
    csv += `Alejados,${document.getElementById('inp-alejados').value}\n`;
    csv += `Rescatados,${document.getElementById('inp-rescatados').value}\n`;
    csv += `Promedio,${document.getElementById('rep-avg').innerText}\n`;

    // ── DIRECTORIO DE J\u00d3VENES ──
    csv += `\nDIRECTORIO DE J\u00d3VENES\n`;
    csv += `N\u00b0,Nombre,Edad,Tel\u00e9fono,Redes,Estado Espiritual,\u00c1rea Servicio,Cargo,Responsable,Estado Asistencia,F. Bautismo,Domicilio\n`;
    (members || []).forEach((m, idx) => {
        const edad = m.fechaNac ? calculateAge(m.fechaNac) : '';
        const bautismo = m.fechaBautismo ? m.fechaBautismo.split('-').reverse().join('/') : '';
        const row = [
            idx + 1,
            q(m.nombre),
            edad,
            q(m.telefono),
            q(m.social),
            q(m.estadoEspiritual),
            q(m.areaServicio),
            q(m.cargo),
            q(m.lider),
            q(m.estadoAsistencia),
            bautismo,
            q(m.domicilio)
        ];
        csv += row.join(',') + '\n';
    });

    downloadCSV(csv, `FireGen_InformeMensual_${per}.csv`);
}

/* ── PDF OFICIAL — Vista de impresi\u00f3n controlada ─────────────── */

async function generateMonthlyReportPDF() {
    const per = document.getElementById('repPeriodo').value || '';
    const serie = document.getElementById('repSerie').value || '';
    const secretario = document.getElementById('repSecretario').value || '';
    const saturdays = getOperationalSaturdaysForPeriod(per);

    // Construir filas del informe con espaciado mejorado (11.5px, padding 8px 10px)
    let rowsHtml = '';
    document.querySelectorAll('.row-report-data').forEach((row, i) => {
        if (!saturdays[i] || row.style.display === 'none') return;
        const label = getSaturdayLabel(saturdays[i]);
        const dirigeSelect = row.querySelector('.rep-dirige');
        const dirige = escHtml(dirigeSelect && dirigeSelect.value ? dirigeSelect.options[dirigeSelect.selectedIndex].text : '\u2014');
        const tema = escHtml(row.querySelector('.rep-tema').value || '\u2014');
        const pred = escHtml(row.querySelector('.rep-predicador').value || '\u2014');
        const cita = escHtml(row.querySelector('.rep-cita').value || '\u2014');
        const asist = row.querySelector('.rep-asist').value || '0';
        const nuevos = row.querySelector('.rep-nuevos').value || '0';
        const obs = escHtml(row.querySelector('.rep-observaciones').value || '');
        rowsHtml += `<tr>
            <td style="padding:10px 12px;border:1px solid #e2e8f0;font-weight:bold;white-space:nowrap;font-size:12px">${label}</td>
            <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:12px;word-wrap:break-word">${dirige}</td>
            <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:12px;word-wrap:break-word">${tema}</td>
            <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:12px;word-wrap:break-word">${pred}</td>
            <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:12px;word-wrap:break-word">${cita}</td>
            <td style="padding:10px 12px;border:1px solid #e2e8f0;text-align:center;font-weight:bold;font-size:12px">${asist}</td>
            <td style="padding:10px 12px;border:1px solid #e2e8f0;text-align:center;font-weight:bold;font-size:12px">${nuevos}</td>
            <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:12px;word-wrap:break-word">${obs}</td>
        </tr>`;
    });

    // Construir directorio
    let dirRows = '';
    (members || []).forEach((m, idx) => {
        const edad = m.fechaNac ? calculateAge(m.fechaNac) : '\u2014';
        const bautismo = m.fechaBautismo ? m.fechaBautismo.split('-').reverse().join('/') : '\u2014';
        dirRows += `<tr>
            <td style="padding:4px 6px;border:1px solid #e2e8f0;text-align:center">${idx + 1}</td>
            <td style="padding:4px 6px;border:1px solid #e2e8f0;font-weight:bold">${escHtml(m.nombre || '')}</td>
            <td style="padding:4px 6px;border:1px solid #e2e8f0;text-align:center">${edad}</td>
            <td style="padding:4px 6px;border:1px solid #e2e8f0">${escHtml(m.telefono || '')}</td>
            <td style="padding:4px 6px;border:1px solid #e2e8f0">${escHtml(m.social || '')}</td>
            <td style="padding:4px 6px;border:1px solid #e2e8f0">${escHtml(m.estadoEspiritual || '')}</td>
            <td style="padding:4px 6px;border:1px solid #e2e8f0">${escHtml(m.areaServicio || '')}</td>
            <td style="padding:4px 6px;border:1px solid #e2e8f0">${escHtml(m.cargo || '')}</td>
            <td style="padding:4px 6px;border:1px solid #e2e8f0">${escHtml(m.lider || '')}</td>
            <td style="padding:4px 6px;border:1px solid #e2e8f0">${escHtml(m.estadoAsistencia || '')}</td>
            <td style="padding:4px 6px;border:1px solid #e2e8f0;text-align:center">${bautismo}</td>
            <td style="padding:4px 6px;border:1px solid #e2e8f0">${escHtml(m.domicilio || '')}</td>
        </tr>`;
    });

    const thStyle = 'padding:10px 12px;background:#f8fafc;border:1px solid #cbd5e1;font-size:11px;text-transform:uppercase;letter-spacing:0.05em';
    const thStyleSm = 'padding:4px 6px;background:#f8fafc;border:1px solid #cbd5e1;font-size:9px;text-transform:uppercase;letter-spacing:0.05em';

    const fechaGen = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });

    const printHtml = `
        <div style="font-family:sans-serif;color:#1e293b;padding:20px;display:flex;flex-direction:column;min-height:calc(297mm - 24mm);">
            <div style="flex-grow:1;">
                <div style="border-top:3px solid #ea580c;padding-top:20px;margin-bottom:32px;display:flex;align-items:center;gap:16px">
                    <img src="assets/logo/logo-principal.png" alt="FireGen" style="width:58px;height:58px;object-fit:contain;" />
                    <div>
                        <h1 style="font-size:22px;font-weight:900;margin:0;text-transform:uppercase;color:#1e293b;">FIREGEN <span style="font-weight:400">|</span> INFORME MENSUAL</h1>
                        <p style="margin:8px 0 0;font-size:12px;color:#64748b;font-weight:600;letter-spacing:0.02em">PER\u00cdODO: ${escHtml(per)} &nbsp;|&nbsp; SERIE: ${escHtml(serie)} &nbsp;|&nbsp; SECRETARIO: ${escHtml(secretario)}</p>
                    </div>
                </div>

                <table style="width:100%;border-collapse:collapse;margin-bottom:40px;">
                    <thead><tr>
                        <th style="${thStyle};width:8%">S\u00e1bado</th>
                        <th style="${thStyle};width:12%">Dirige</th>
                        <th style="${thStyle};width:18%">Tema Predicado</th>
                        <th style="${thStyle};width:13%">Predicador</th>
                        <th style="${thStyle};width:13%">Cita B\u00edblica</th>
                        <th style="${thStyle};width:7%">Asist.</th>
                        <th style="${thStyle};width:7%">Nuevos</th>
                        <th style="${thStyle};width:22%">Observaciones</th>
                    </tr></thead>
                    <tbody>${rowsHtml}</tbody>
                </table>

                <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:16px;">
                    <div style="border:1px solid #fed7aa;background:#fff7ed;padding:14px 16px;border-radius:10px">
                        <div style="font-size:11px;font-weight:900;color:#c2410c;text-transform:uppercase;margin-bottom:6px">Bautismos</div>
                        <div style="font-size:26px;font-weight:900;color:#7c2d12">${document.getElementById('inp-bautismos').value || 0}</div>
                    </div>
                    <div style="border:1px solid #bfdbfe;background:#eff6ff;padding:14px 16px;border-radius:10px">
                        <div style="font-size:11px;font-weight:900;color:#1d4ed8;text-transform:uppercase;margin-bottom:6px">Al Servicio</div>
                        <div style="font-size:26px;font-weight:900;color:#1e3a8a">${document.getElementById('inp-servicio').value || 0}</div>
                    </div>
                    <div style="border:1px solid #fecaca;background:#fef2f2;padding:14px 16px;border-radius:10px">
                        <div style="font-size:11px;font-weight:900;color:#b91c1c;text-transform:uppercase;margin-bottom:6px">Alejados</div>
                        <div style="font-size:26px;font-weight:900;color:#7f1d1d">${document.getElementById('inp-alejados').value || 0}</div>
                    </div>
                    <div style="border:1px solid #bbf7d0;background:#f0fdf4;padding:14px 16px;border-radius:10px">
                        <div style="font-size:11px;font-weight:900;color:#15803d;text-transform:uppercase;margin-bottom:6px">Rescatados</div>
                        <div style="font-size:26px;font-weight:900;color:#14532d">${document.getElementById('inp-rescatados').value || 0}</div>
                    </div>
                    <div style="border:1px solid #e2e8f0;background:#f8fafc;padding:14px 16px;border-radius:10px">
                        <div style="font-size:11px;font-weight:900;color:#475569;text-transform:uppercase;margin-bottom:6px">Prom. Asist.</div>
                        <div style="font-size:26px;font-weight:900;color:#1e293b">${document.getElementById('rep-avg').innerText || 0}</div>
                    </div>
                </div>
            </div>
            <div style="text-align:center;padding-top:20px;border-top:1px solid #e2e8f0;margin-top:auto;font-size:10px;color:#94a3b8;text-transform:uppercase;font-weight:bold;letter-spacing:0.05em">
                FireGen \u2022 Informe Mensual \u2022 Generado el ${fechaGen}
            </div>

            <div style="break-before:page;page-break-before:always;padding-top:16px">
                <div style="border-bottom:2px solid #ea580c;padding-bottom:8px;margin-bottom:16px;display:flex;align-items:center;gap:10px">
                    <img src="assets/logo/logo-principal.png" alt="FireGen" style="width:32px;height:32px;object-fit:contain;" />
                    <h2 style="font-size:16px;font-weight:900;text-transform:uppercase;margin:0;color:#1e293b;letter-spacing:0.02em">DIRECTORIO DE J\u00d3VENES</h2>
                </div>
                <table style="width:100%;border-collapse:collapse;font-size:8.5px">
                    <thead><tr>
                        <th style="${thStyleSm}">N\u00b0</th>
                        <th style="${thStyleSm}">Nombre</th>
                        <th style="${thStyleSm}">Edad</th>
                        <th style="${thStyleSm}">Tel\u00e9fono</th>
                        <th style="${thStyleSm}">Redes</th>
                        <th style="${thStyleSm}">Est. Espiritual</th>
                        <th style="${thStyleSm}">&Aacute;rea</th>
                        <th style="${thStyleSm}">Cargo</th>
                        <th style="${thStyleSm}">Responsable</th>
                        <th style="${thStyleSm}">Est. Asistencia</th>
                        <th style="${thStyleSm}">Bautismo</th>
                        <th style="${thStyleSm}">Domicilio</th>
                    </tr></thead>
                    <tbody>${dirRows}</tbody>
                </table>
            </div>
        </div>`;

    const container = document.getElementById('monthlyReportPrint');
    container.innerHTML = printHtml;

    document.body.classList.add('firegen-printing');

    const restorePrintMode = () => {
        document.body.classList.remove('firegen-printing');
        container.innerHTML = '';
        container.style.display = 'none';
    };

    window.addEventListener('afterprint', restorePrintMode, { once: true });
    
    // Esperar imágenes antes de imprimir
    const images = [...container.querySelectorAll('img')];
    await Promise.all(images.map(img => {
        if (img.complete && img.naturalWidth > 0) {
            return img.decode ? img.decode().catch(() => {}) : Promise.resolve();
        }
        return new Promise(resolve => {
            const done = () => resolve();
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
        });
    }));

    window.print();
}
