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
    // FASE3: Las celdas históricas ya no se actualizan en tiempo real desde el informe activo.
    // Solo se reflejan una vez que el mes se "Cierra" mediante cerrarMesSnapshot.
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
    destroyStrategyListener(); // Ya no usaremos un listener en vivo, es de solo lectura.
    activeStrategyYear = periodo;

    const periods = getStrategyOperationalMonths(periodo);

    // Para cada mes operativo: leer historicoMensual y el informe activo en paralelo
    // Prioridad: si existe snapshot cerrado → mostrar ese; si no → mostrar el informe activo.
    const snapshotPromises = periods.map(p => db.ref('historicoMensual/' + p).once('value').catch(() => ({ val: () => null })));
    const reportPromises   = hasPermission('verInformeMensual')
        ? periods.map(p => db.ref('informes/' + p).once('value').catch(() => ({ val: () => null })))
        : periods.map(() => Promise.resolve({ val: () => null }));

    Promise.all([Promise.all(snapshotPromises), Promise.all(reportPromises)]).then(([snapshots, reports]) => {
        hideConnectionError();
        // Limpiar todas las filas de la tabla a '—' primero
        MESES_LABELS.forEach((_, i) => {
            setHistoricCell('avg', i, '—');
            setHistoricCell('new', i, '—');
            setHistoricCell('bau', i, '—');
            setHistoricCell('res', i, '—');
            setHistoricCell('tot', i, '—');
        });

        periods.forEach((p, i) => {
            const snap = snapshots[i].val();
            const report = reports[i].val();
            const monthIdx = Number(p.slice(5, 7)) - 1;

            if (snap && snap.cerrado) {
                // Mes cerrado: mostrar snapshot inmutable
                setHistoricCell('avg', monthIdx, snap.asistenciaPromedio !== undefined ? snap.asistenciaPromedio : '—');
                setHistoricCell('new', monthIdx, snap.nuevos !== undefined ? snap.nuevos : '—');
                setHistoricCell('bau', monthIdx, snap.bautismos !== undefined ? snap.bautismos : '—');
                setHistoricCell('res', monthIdx, snap.rescatados !== undefined ? snap.rescatados : '—');
                setHistoricCell('tot', monthIdx, snap.totalMiembros !== undefined ? snap.totalMiembros : '—');
            } else if (report) {
                // Mes activo (no cerrado): mostrar datos del informe mensual disponibles
                // Calcular promedio desde las fechas del informe
                let totalAsist = 0, countSem = 0, totalNuevos = 0;
                if (report.fechas) {
                    Object.values(report.fechas).forEach(f => {
                        if (f && !f.sinCulto && f.asist !== undefined) {
                            totalAsist += Number(f.asist) || 0;
                            totalNuevos += Number(f.nuevos) || 0;
                            countSem++;
                        }
                    });
                } else {
                    // Fallback a sem1…sem5
                    for (let s = 1; s <= 5; s++) {
                        const f = report['sem' + s];
                        if (f && f.asist !== undefined) {
                            totalAsist += Number(f.asist) || 0;
                            totalNuevos += Number(f.nuevos) || 0;
                            countSem++;
                        }
                    }
                }
                const avgAsist = countSem > 0 ? Math.round(totalAsist / countSem) : '—';
                const nuevosVal = report.nuevos !== undefined ? report.nuevos : totalNuevos;
                const bautismosVal = report.bautismos !== undefined ? report.bautismos : '—';
                const rescatadosVal = report.rescatados !== undefined ? report.rescatados : '—';
                // Total miembros: contar miembros activos incorporados hasta fin del mes
                const [yr, mo] = p.split('-').map(Number);
                const periodEnd = new Date(yr, mo, 0);
                const totM = (typeof members !== 'undefined')
                    ? members.filter(m => {
                        if (!m.fechaIncorporacion) return true;
                        const f = new Date(m.fechaIncorporacion);
                        return !isNaN(f) && f <= periodEnd;
                    }).length
                    : '—';

                setHistoricCell('avg', monthIdx, avgAsist);
                setHistoricCell('new', monthIdx, nuevosVal);
                setHistoricCell('bau', monthIdx, bautismosVal);
                setHistoricCell('res', monthIdx, rescatadosVal);
                setHistoricCell('tot', monthIdx, totM);
            }
        });
        syncAnnualStrategy(periodo);
        refreshChart();
    }).catch(error => {
        console.error('[FireGen Strategy] Error Firebase:', error);
        showConnectionError('⚠️ Error al cargar histórico mensual.');
    });
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

/* ── CIERRE Y RESUMEN ANUAL ─────────────────────────────────── */

function getStrategyOperationalMonths(year) {
    if (typeof AppConfig !== 'undefined' && typeof AppConfig.getOperationalMonths === 'function') {
        return AppConfig.getOperationalMonths(year);
    }
    return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
}

function renderAnnualSummary(dataByPeriod, year) {
    const set = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    const periods = getStrategyOperationalMonths(year);
    const closed = periods.filter(p => dataByPeriod[p + '_snap'] && dataByPeriod[p + '_snap'].cerrado);

    // Acumulados: usar snapshot cerrado si existe, si no usar datos del informe activo.
    // Los acumulados son DINÁMICOS y no requieren cierre anual para visualizarse.
    let sumNuevos = 0, sumBautismos = 0, sumRescatados = 0, sumAsist = 0, countAsist = 0;
    let lastTotalMiembros = '—', lastRiesgo = '—';

    periods.forEach(p => {
        const snap = dataByPeriod[p + '_snap'];
        const report = dataByPeriod[p + '_report'];

        if (snap && snap.cerrado) {
            sumNuevos += Number(snap.nuevos) || 0;
            sumBautismos += Number(snap.bautismos) || 0;
            sumRescatados += Number(snap.rescatados) || 0;
            if (snap.asistenciaPromedio !== undefined) {
                sumAsist += Number(snap.asistenciaPromedio) || 0;
                countAsist++;
            }
            lastTotalMiembros = Number(snap.totalMiembros) || 0;
            lastRiesgo = Number(snap.enRiesgo) || 0;
        } else if (report) {
            // Datos del informe activo (no cerrado)
            sumNuevos += Number(report.nuevos) || 0;
            sumBautismos += Number(report.bautismos) || 0;
            sumRescatados += Number(report.rescatados) || 0;
            // Asistencia promedio aproximada desde las semanas del informe
            let totalA = 0, cntA = 0;
            if (report.fechas) {
                Object.values(report.fechas).forEach(f => {
                    if (f && !f.sinCulto && f.asist !== undefined) { totalA += Number(f.asist) || 0; cntA++; }
                });
            } else {
                for (let s = 1; s <= 5; s++) {
                    const f = report['sem' + s];
                    if (f && f.asist !== undefined) { totalA += Number(f.asist) || 0; cntA++; }
                }
            }
            if (cntA > 0) { sumAsist += Math.round(totalA / cntA); countAsist++; }
        }
    });

    const hasAnyData = closed.length > 0 || periods.some(p => dataByPeriod[p + '_report']);
    const avgAsist = countAsist > 0 ? Math.round(sumAsist / countAsist) : 0;

    // Total miembros y riesgo: representan el último cierre mensual disponible.
    set('annual-total-members', hasAnyData ? lastTotalMiembros : '—');
    set('annual-new-members', hasAnyData ? sumNuevos : '—');
    set('annual-baptisms', hasAnyData ? sumBautismos : '—');
    set('annual-rescued', hasAnyData ? sumRescatados : '—');
    set('annual-risk', hasAnyData ? lastRiesgo : '—');
    set('annual-attendance', countAsist > 0 ? `${avgAsist}%` : '—');

    const status = document.getElementById('annual-close-status');
    const btn = document.getElementById('btn-cerrar-anual');
    const annualClosed = dataByPeriod.__annual && dataByPeriod.__annual.cerrado;
    if (status) {
        status.textContent = annualClosed
            ? `🔒 Cierre anual ${year} realizado.`
            : `Cierres mensuales: ${closed.length} de ${periods.length}.`;
    }
    if (btn) {
        if (hasPermission('cerrarAnio')) {
            btn.style.display = 'inline-flex'; // or whatever its original display is (probably inline-flex/flex)
            btn.disabled = !!annualClosed;
        } else {
            btn.style.display = 'none';
        }
    }
}

function syncAnnualStrategy(year) {
    const periods = getStrategyOperationalMonths(year);
    // Cargar tanto snapshots mensuales (historicoMensual) como informes activos
    const snapRefs   = periods.map(p => db.ref('historicoMensual/' + p).once('value').catch(() => ({ val: () => null })));
    const reportRefs = hasPermission('verInformeMensual')
        ? periods.map(p => db.ref('informes/' + p).once('value').catch(() => ({ val: () => null })))
        : periods.map(() => Promise.resolve({ val: () => null }));
    const annualRef  = db.ref('historicoAnual/' + year).once('value').catch(() => ({ val: () => null }));

    Promise.all([Promise.all(snapRefs), Promise.all(reportRefs), annualRef]).then(([snapSnaps, reportSnaps, annualSnap]) => {
        const dataByPeriod = {};
        periods.forEach((p, i) => {
            dataByPeriod[p + '_snap']   = snapSnaps[i].val();
            dataByPeriod[p + '_report'] = reportSnaps[i].val();
        });
        dataByPeriod.__annual = annualSnap.val();
        renderAnnualSummary(dataByPeriod, year);
    }).catch(err => {
        console.error('[FireGen Strategy] Error resumen anual:', err);
        showConnectionError('⚠️ Error al cargar el resumen anual.');
    });

}

function cerrarAnualSnapshot() {
    if (!hasPermission('cerrarAnio')) {
        alert('No tienes permiso para cerrar el año.');
        return;
    }
    const year = String(document.getElementById('strategyYearSelect')?.value || activeStrategyYear || new Date().getFullYear());
    const periods = getStrategyOperationalMonths(year);

    Promise.all(periods.map(p => db.ref('historicoMensual/' + p).once('value')))
        .then(snaps => {
            const byPeriod = {};
            periods.forEach((p, i) => { byPeriod[p] = snaps[i].val(); });
            const closed = periods.filter(p => byPeriod[p] && byPeriod[p].cerrado);

            if (closed.length !== periods.length) {
                alert(`No se puede cerrar ${year}: primero deben cerrarse todos los meses operativos (${closed.length}/${periods.length}).`);
                return;
            }

            const last = byPeriod[closed[closed.length - 1]];
            const sum = key => closed.reduce((total, p) => total + (Number(byPeriod[p]?.[key]) || 0), 0);
            const avg = Math.round(closed.reduce((total, p) => total + (Number(byPeriod[p]?.asistenciaPromedio) || 0), 0) / closed.length);

            const annual = {
                anio: Number(year),
                totalMiembros: Number(last.totalMiembros) || 0,
                nuevos: sum('nuevos'),
                bautismos: sum('bautismos'),
                rescatados: sum('rescatados'),
                enRiesgo: Number(last.enRiesgo) || 0,
                asistenciaPromedio: avg,
                mesesCerrados: closed.length,
                cerrado: true,
                fechaCierre: Date.now()
            };

            if (!confirm(`¿Cerrar definitivamente el año ${year}? Este cierre no sobrescribirá los cierres mensuales.`)) return;

            db.ref('historicoAnual/' + year).transaction(current => {
                if (current && current.cerrado) return;
                return annual;
            }).then(result => {
                if (!result.committed) {
                    alert('El cierre anual ya existía y no fue modificado.');
                } else {
                    alert(`Cierre anual ${year} realizado correctamente.`);
                }
                syncAnnualStrategy(year);
            });
        })
        .catch(err => {
            console.error('[FireGen Strategy] Error al cerrar año:', err);
            alert('Error al cerrar el año: ' + err.message);
        });
}

/* ── ANÁLISIS MINISTERIAL ─────────────────────────────────────── */

function initStrategyYearSelect() {
    const sel = document.getElementById('strategyYearSelect');
    if (!sel) return;
    const startYear = Number(AppConfig.current.period.start.slice(0, 4));
    const endYear = Number(AppConfig.current.period.end.slice(0, 4));
    const currentYear = new Date().getFullYear();

    sel.innerHTML = '';
    for (let year = startYear; year <= endYear; year++) {
        const opt = document.createElement('option');
        opt.value = String(year);
        opt.textContent = year;
        if (year === currentYear) opt.selected = true;
        sel.appendChild(opt);
    }
    sel.addEventListener('change', () => {
        syncStrategy(sel.value);
    });
}

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

