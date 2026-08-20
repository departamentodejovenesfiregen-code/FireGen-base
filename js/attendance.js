/**
 * FireGen V3.0 — js/attendance.js
 * ─────────────────────────────────────────────────────────────
 * MÓDULO DE ASISTENCIA
 * FASE3-S1: Nómina basada en sábados reales del calendario.
 *
 * Cambios FASE3-S1:
 *  - Las columnas representan sábados operativos reales (Sáb DD).
 *  - El número de columnas varía según el mes (1 a 5 sábados).
 *  - El motor de engagement usa fechas reales, incorporación individual y
 *    excluye el estado ? (=3) de todos los cálculos.
 *  - Recuperación sostenida (≥4 asistencias consecutivas) → Activo.
 *  - Prioridad: Alejándose > Enfriándose > recuperación > Inconstante > Activo.
 *
 * Dependencias: firebase-config.js, utils.js, members.js
 * ─────────────────────────────────────────────────────────────
 */

/* ── Estado del módulo ── */
let currentAttData = {};
let currentAttNotes = {};
let currentAttPeriod = '';

// Sábados actuales del período renderizado (cache para no recalcular en cada click)
let currentSaturdays = [];

// Referencia y callback del listener de asistencia (para .off() preciso)
let attendanceRef = null;
let attendanceCallback = null;

/**
 * syncAttendance — Abre el listener reactivo de Firebase para el periodo dado.
 * FASE3-S1: Usa getOperationalSaturdaysForPeriod() para conocer cuántas semanas hay.
 * @param {string} periodo - Formato YYYY-MM
 */
function syncAttendance(periodo) {
    if (!AppConfig.isMonthInPeriod(periodo)) {
        showConnectionError('⚠️ El mes seleccionado está fuera del periodo oficial de gestión.');
        return;
    }

    if (attendanceRef && attendanceCallback) {
        attendanceRef.off('value', attendanceCallback);
    }
    currentAttPeriod = periodo;
    currentAttData = {};
    currentAttNotes = {};
    currentFechasSinCulto = {};

    // FASE3-S1: Calcular sábados operativos de este período
    currentSaturdays = getOperationalSaturdaysForPeriod(periodo);

    attendanceRef = db.ref('asistencias/' + periodo);
    attendanceCallback = attendanceRef.on('value',
        snap => {
            hideConnectionError();
            const d = snap.val() || {};
            currentAttData = {};
            currentAttNotes = {};
            currentFechasSinCulto = (d.config && d.config.fechasSinCulto) ? d.config.fechasSinCulto : {};
            const n = currentSaturdays.length;
            Object.keys(d).forEach(fid => {
                if (fid === 'config') return;
                const member = members.find(m => m.firebaseId === fid);
                const rawFechas = d[fid].fechas;
                const rawSemanas = d[fid].semanas || [];
                const sem = Array.from({ length: n }, (_, i) => {
                    const satDate = currentSaturdays[i];
                    let estado = 3;
                    if (rawFechas && rawFechas[satDate] !== undefined) {
                        estado = rawFechas[satDate];
                    } else if (rawSemanas[i] !== undefined) {
                        estado = rawSemanas[i];
                    }
                    if (member && typeof isSaturdayBeforeIncorporation === 'function' && isSaturdayBeforeIncorporation(member, satDate) && estado === 3) {
                        return 4;
                    }
                    if (currentFechasSinCulto[satDate]) {
                        return 5; // Estado 5 = Sin Culto
                    }
                    return estado;
                });
                currentAttData[fid] = sem;
                currentAttNotes[fid] = d[fid].nota || '';
            });
            renderAttendance();
            pushAttendanceToReport();
        },
        error => {
            console.error('[FireGen Attendance] Error Firebase:', error.code, error.message);
            showConnectionError('⚠️ Error al cargar asistencia. Verifica tu conexión o las reglas de Firebase.');
        }
    );
}

/**
 * destroyAttendanceListener — Desregistra el listener de asistencia.
 */
function destroyAttendanceListener() {
    if (attendanceRef && attendanceCallback) {
        attendanceRef.off('value', attendanceCallback);
        attendanceRef = null;
        attendanceCallback = null;
    }
}

/**
 * renderAttendance — Renderiza la tabla desktop y la lista móvil de asistencia.
 * FASE3-S1: Genera columnas dinámicas con etiquetas "Sáb DD" según sábados reales.
 */
function renderAttendance() {
    const periodo = document.getElementById('attMonthSelector').value;
    const saturdays = getOperationalSaturdaysForPeriod(periodo);
    const n = saturdays.length;

    // ── Actualizar encabezados de tabla desktop ──────────────
    const thead = document.getElementById('attTableHeaders');
    if (thead) {
        let hHtml = `<th class="p-4 border-b font-bold w-64">Nombre del Joven</th>`;
        saturdays.forEach(sat => {
            const isNoCulto = currentFechasSinCulto[sat];
            const textClass = isNoCulto ? 'text-red-500 line-through' : 'text-slate-600';
            const btnClass = isNoCulto ? 'text-red-500' : 'text-slate-400';
            const icon = isNoCulto ? 'fa-ban' : 'fa-power-off';
            hHtml += `<th class="p-2 border-b text-center">
                <div class="flex flex-col items-center gap-1">
                    <span class="${textClass}">${getSaturdayLabel(sat)}</span>
                    <button onclick="toggleSinCulto('${sat}')" title="Marcar/Desmarcar Sin Culto" class="text-[10px] hover:text-red-600 transition-colors ${btnClass}"><i class="fas ${icon}"></i></button>
                </div>
            </th>`;
        });
        hHtml += `<th class="p-4 border-b text-center bg-orange-50 text-orange-700 font-black">TOTAL</th>`;
        hHtml += `<th class="p-4 border-b">Observación</th>`;
        thead.innerHTML = hHtml;
    }

    // ── Tabla Desktop ────────────────────────────────────────
    const body = document.getElementById('attendanceBody');
    const empty = document.getElementById('emptyAttendance');
    body.innerHTML = '';
    empty.classList.toggle('hidden', members.length > 0);

    members.forEach(m => {
        let sem = currentAttData[m.firebaseId];
        if (!sem) {
            sem = Array.from({ length: n }, (_, i) => {
                const satDate = saturdays[i];
                return (typeof isSaturdayBeforeIncorporation === 'function' && isSaturdayBeforeIncorporation(m, satDate)) ? 4 : 3;
            });
        }
        const nota = currentAttNotes[m.firebaseId] || '';
        const total = sem.reduce((a, s) => a + (s === 1 || s === 2 ? 1 : 0), 0);
        const row = document.createElement('tr');

        let c = `<td class="p-4 font-bold text-slate-800">${escHtml(m.nombre)}</td>`;
        sem.forEach((st, i) => {
            const satDate = saturdays[i] || '';
            c += `<td class="p-4 text-center"><div data-action="toggle-att" data-fid="${escHtml(m.firebaseId)}" data-week="${i}" data-periodo="${escHtml(periodo)}" data-satdate="${escHtml(satDate)}" class="btn-attendance mx-auto ${getAttClass(st)}">${getAttIcon(st)}</div></td>`;
        });
        c += `<td class="p-4 text-center bg-orange-50 font-black text-orange-700 text-lg">${total}</td>`;
        c += `<td class="p-4"><input type="text" value="${escHtml(nota)}" data-action="att-note" data-fid="${escHtml(m.firebaseId)}" data-periodo="${escHtml(periodo)}" class="w-full bg-transparent outline-none text-xs italic text-slate-400" placeholder="Nota..."></td>`;
        row.innerHTML = c;
        body.appendChild(row);
    });

    // ── Lista Móvil ──────────────────────────────────────────
    const mobileList = document.getElementById('attendanceMobileList');
    const mobileEmpty = document.getElementById('emptyAttendanceMobile');
    Array.from(mobileList.children).forEach(c => {
        if (!c.classList.contains('flex') && c.id !== 'emptyAttendanceMobile' && c.id !== 'sin-culto-mobile-wrapper') c.remove();
    });

    if (!members.length) {
        mobileEmpty.classList.remove('hidden');
        return;
    }
    mobileEmpty.classList.add('hidden');

    members.forEach(m => {
        let sem = currentAttData[m.firebaseId];
        if (!sem) {
            sem = Array.from({ length: n }, (_, i) => {
                const satDate = saturdays[i];
                return (typeof isSaturdayBeforeIncorporation === 'function' && isSaturdayBeforeIncorporation(m, satDate)) ? 4 : 3;
            });
        }
        const nota = currentAttNotes[m.firebaseId] || '';
        const total = sem.reduce((a, s) => a + (s === 1 || s === 2 ? 1 : 0), 0);
        const card = document.createElement('div');
        card.className = 'mobile-att-card';

        let weeksHtml = '';
        sem.forEach((st, i) => {
            const satDate = saturdays[i] || '';
            const isNoCulto = currentFechasSinCulto[satDate];
            const label = getSaturdayLabel(satDate);
            const lblStyle = isNoCulto ? 'text-decoration:line-through;color:#ef4444' : 'color:#94a3b8';
            weeksHtml += `<div style="text-align:center;margin:0 2px"><div style="font-size:9px;margin-bottom:2px;${lblStyle}">${escHtml(label)}</div><div data-action="toggle-att" data-fid="${escHtml(m.firebaseId)}" data-week="${i}" data-periodo="${escHtml(periodo)}" data-satdate="${escHtml(satDate)}" class="btn-attendance ${getAttClass(st)}" style="width:30px;height:30px;font-size:12px">${getAttIcon(st)}</div></div>`;
        });

        card.innerHTML = `
            <div class="mobile-att-info">
                <div class="mobile-att-name">${escHtml(m.nombre)}</div>
                <div class="mobile-att-weeks" style="display:flex;align-items:flex-end;gap:4px;flex-wrap:wrap;margin:6px 0">${weeksHtml}
                    <div style="text-align:center;margin:0 2px"><div style="font-size:9px;color:#94a3b8;margin-bottom:2px">Total</div><div class="btn-attendance" style="width:30px;height:30px;font-size:11px;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;font-weight:900">${total}</div></div>
                </div>
                <input type="text" value="${escHtml(nota)}" data-action="att-note" data-fid="${escHtml(m.firebaseId)}" data-periodo="${escHtml(periodo)}"
                    class="w-full bg-transparent outline-none text-xs italic text-slate-400 mt-2 border-b border-dashed border-slate-200" placeholder="Observación…">
            </div>`;
        mobileList.appendChild(card);
    });
}

/**
 * initAttendanceEventDelegation — Configura event delegation para la tabla y lista móvil.
 */
function initAttendanceEventDelegation() {
    function handleClick(e) {
        const el = e.target.closest('[data-action="toggle-att"]');
        if (!el) return;
        const { fid, week, periodo } = el.dataset;
        toggleAtt(fid, parseInt(week, 10), periodo);
    }
    function handleInput(e) {
        const el = e.target.closest('[data-action="att-note"]');
        if (!el) return;
        const { fid, periodo } = el.dataset;
        saveAttNote(fid, periodo, el.value);
    }
    const body = document.getElementById('attendanceBody');
    const mobileList = document.getElementById('attendanceMobileList');
    body.addEventListener('click', handleClick);
    body.addEventListener('input', handleInput);
    mobileList.addEventListener('click', handleClick);
    mobileList.addEventListener('input', handleInput);
}

function isSaturdayBeforeIncorporation(member, satDate) {
    if (!member || !member.fechaIncorporacion) return false;
    return new Date(satDate + 'T00:00:00') < new Date(member.fechaIncorporacion + 'T00:00:00');
}

/**
 * toggleAtt — Cicla el estado de un miembro en un sábado.
 * FASE3-S1: El array sem tiene longitud N (sábados reales), no siempre 5.
 */
function toggleAtt(fid, week, periodo) {
    const member = members.find(m => m.firebaseId === fid);
    const satDate = currentSaturdays[week];

    if (member && isSaturdayBeforeIncorporation(member, satDate)) {
        return;
    }

    if (currentFechasSinCulto[satDate]) {
        // Día cerrado por "Sin Culto", no se puede alternar.
        return;
    }

    const n = currentSaturdays.length || 5;
    let sem = currentAttData[fid];
    if (!sem) {
        sem = Array.from({ length: n }, (_, i) => {
            const sd = currentSaturdays[i];
            return isSaturdayBeforeIncorporation(member, sd) ? 4 : 3;
        });
    } else {
        sem = sem.slice();
    }

    sem[week] = (sem[week] === 4) ? 4 : (sem[week] + 1) % 4;
    currentAttData[fid] = sem;

    const updates = {};
    updates[`fechas/${satDate}`] = sem[week];
    updates[`semanas`] = sem;

    db.ref('asistencias/' + periodo + '/' + fid).update(updates)
        .catch(err => console.error('[FireGen] Error al guardar asistencia:', err));
    updateEngagementStatusDebounced(fid);
    flashBadge('attSyncBadge');
    renderAttendance();
}

// OPT-07 — debounce sobre updateEngagementStatus
const updateEngagementStatusDebounced = debounce(updateEngagementStatus, 600);

// OPT-02 — debounce de 800ms para notas
const saveAttNote = debounce(function (fid, periodo, val) {
    db.ref('asistencias/' + periodo + '/' + fid).update({ nota: val })
        .catch(err => console.error('[FireGen] Error al guardar nota:', err));
}, 800);

function getAttClass(s) { return s === 5 ? 'att-not-applicable bg-slate-200' : s === 4 ? 'att-not-applicable' : s === 1 ? 'att-present' : s === 0 ? 'att-absent' : s === 2 ? 'att-new' : 'att-empty'; }
function getAttIcon(s) { return s === 5 ? '<i class="fas fa-ban"></i>' : s === 4 ? '-' : s === 1 ? '✓' : s === 0 ? '✗' : s === 2 ? 'N' : '?'; }

window.toggleSinCulto = function (satDate) {
    const periodo = document.getElementById('attMonthSelector').value;
    const isNowSinCulto = !currentFechasSinCulto[satDate];
    db.ref(`asistencias/${periodo}/config/fechasSinCulto/${satDate}`).set(isNowSinCulto)
        .catch(err => console.error('[FireGen] Error toggleSinCulto:', err));
};

/**
 * toggleSinCultoPanel — Muestra/oculta el panel de selección de "Sin Culto" en móvil.
 * Construye dinámicamente los chips de cada sábado del mes actual.
 */
window.toggleSinCultoPanel = function () {
    const panel = document.getElementById('sin-culto-panel');
    const chevron = document.getElementById('sin-culto-chevron');
    if (!panel) return;
    const isOpen = !panel.classList.contains('hidden');
    if (isOpen) {
        panel.classList.add('hidden');
        if (chevron) chevron.style.transform = '';
    } else {
        refreshSinCultoPanel();
        panel.classList.remove('hidden');
        if (chevron) chevron.style.transform = 'rotate(180deg)';
    }
};

function refreshSinCultoPanel() {
    const container = document.getElementById('sin-culto-sat-list');
    if (!container) return;
    const periodo = document.getElementById('attMonthSelector').value;
    const saturdays = getOperationalSaturdaysForPeriod(periodo);
    container.innerHTML = '';
    if (!saturdays.length) {
        container.innerHTML = '<span class="text-xs text-slate-400">No hay sábados en este mes.</span>';
        return;
    }
    saturdays.forEach(satDate => {
        const isNoCulto = !!currentFechasSinCulto[satDate];
        const label = getSaturdayLabel(satDate);
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = isNoCulto
            ? 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-500 text-white border border-red-600'
            : 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-slate-600 border border-slate-300';
        chip.innerHTML = `<i class="fas ${isNoCulto ? 'fa-ban' : 'fa-calendar-check'}"></i> ${escHtml(label)}`;
        chip.onclick = () => {
            toggleSinCulto(satDate);
            // Actualizar el chip localmente de inmediato (el listener de FB actualizará todo)
            setTimeout(refreshSinCultoPanel, 300);
        };
        container.appendChild(chip);
    });
}


function changeAttendanceMonth() {
    updateAttDisplayDate();
    syncAttendance(document.getElementById('attMonthSelector').value);
}

function updateAttDisplayDate() {
    const v = document.getElementById('attMonthSelector').value;
    if (!v) return;
    const [y, m] = v.split('-');
    document.getElementById('attCurrentMonthDisplay').innerText =
        new Date(y, m - 1).toLocaleString('es-ES', { month: 'long' }) + ' ' + y;
}

/* ── ASISTENCIA → INFORME: sincronización automática ────────── */

/**
 * pushAttendanceToReport — Sincroniza totales al informe mensual.
 * FASE3-S1: Itera sobre los sábados reales, oculta filas sin sábado.
 */
function pushAttendanceToReport() {
    const repPeriodoEl = document.getElementById('repPeriodo');
    const periodo = repPeriodoEl ? repPeriodoEl.value : currentAttPeriod;
    if (!periodo || periodo !== currentAttPeriod) return;

    const saturdays = getOperationalSaturdaysForPeriod(periodo);
    const n = saturdays.length;

    const presentes = Array(n).fill(0);
    const nuevos = Array(n).fill(0);
    members.forEach(m => {
        const sem = currentAttData[m.firebaseId] || Array(n).fill(3);
        sem.forEach((s, i) => {
            if (s === 1) presentes[i]++;
            if (s === 2) { presentes[i]++; nuevos[i]++; }
        });
    });

    const rows = document.querySelectorAll('.row-report-data');
    const updates = {};
    rows.forEach((row, i) => {
        if (i >= n) {
            row.style.display = 'none';
            return;
        }
        row.style.display = '';
        const asistEl = row.querySelector('.rep-asist');
        const nuevosEl = row.querySelector('.rep-nuevos');
        const satDate = saturdays[i];
        const isNoCulto = currentFechasSinCulto[satDate] || false;

        if (isNoCulto) {
            if (asistEl) { asistEl.value = ''; asistEl.dataset.sinculto = "true"; }
            if (nuevosEl) nuevosEl.value = '';
        } else {
            if (asistEl) { asistEl.value = presentes[i] || ''; asistEl.dataset.sinculto = "false"; }
            if (nuevosEl) nuevosEl.value = nuevos[i] || '';
        }

        updates[`fechas/${satDate}/asist`] = presentes[i] || 0;
        updates[`fechas/${satDate}/nuevos`] = nuevos[i] || 0;
        updates[`fechas/${satDate}/sinCulto`] = isNoCulto;
        updates[`sem${i + 1}/asist`] = presentes[i] || 0;
        updates[`sem${i + 1}/nuevos`] = nuevos[i] || 0;

        // Actualizar etiqueta de semana en el informe si existe el elemento
        const semLabel = row.querySelector('.rep-sem-label');
        if (semLabel) {
            semLabel.textContent = getSaturdayLabel(satDate);
            if (isNoCulto) {
                semLabel.style.textDecoration = 'line-through';
                semLabel.style.color = '#ef4444';
            } else {
                semLabel.style.textDecoration = 'none';
                semLabel.style.color = '';
            }
        }
    });

    if (periodo && hasPermission('editarInformeMensual')) {
        db.ref('informes/' + periodo).update(updates)
            .catch(err => console.error('[FireGen] Error al sincronizar informe:', err));
    }
    updateMonthlyStats();
    flashBadge('attSyncBadge');
}

/* ── MOTOR DE ENGAGEMENT (FASE3-S1) ─────────────────────────── */

/**
 * updateEngagementStatus — Motor de clasificación de asistencia individual.
 *
 * FASE3-S1 — Lógica reescrita:
 *  1. Obtiene sábados reales de los últimos 2 meses.
 *  2. Filtra desde la fecha de incorporación del miembro.
 *  3. Excluye ? (=3) de todos los cálculos.
 *  4. Calcula: porcentaje, racha de faltas recientes, racha de asistencias recientes.
 *  5. Prioridad: Alejándose (≥5) > Enfriándose (3-4) > recuperación (≥4) > Inconstante (<50%) > Activo.
 *  6. No clasifica agresivamente con < 4 sábados evaluables.
 *
 * @param {string} memberId
 */
function updateEngagementStatus(memberId) {
    const member = members.find(x => x.firebaseId === memberId);
    if (!member) return;
    // Obtener fecha de incorporación o fallback
    const periodStart = (AppConfig.current && AppConfig.current.period && AppConfig.current.period.start)
        ? AppConfig.current.period.start : AppConfig.defaults.period.start;
    const incorporationStr = member.fechaIncorporacion || periodStart;
    const incorporationDate = new Date(incorporationStr + 'T00:00:00');

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const periodos = [];
    let cursor = new Date(incorporationDate.getFullYear(), incorporationDate.getMonth(), 1);
    while (cursor <= today) {
        const periodo = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
        periodos.push(periodo);
        cursor.setMonth(cursor.getMonth() + 1);
    }

    const promises = [];
    periodos.forEach(p => {
        promises.push(db.ref(`asistencias/${p}/config/fechasSinCulto`).once('value'));
        promises.push(db.ref(`asistencias/${p}/${memberId}`).once('value'));
    });

    Promise.all(promises)
        .then(snaps => {
            const recordMap = {};
            for (let i = 0; i < periodos.length; i++) {
                const periodo = periodos[i];
                const [y, m] = periodo.split('-').map(Number);
                const saturdays = getOperationalSaturdays(y, m);

                const configSnap = snaps[i * 2];
                const memberSnap = snaps[i * 2 + 1];

                const fechasSinCulto = configSnap.val() || {};
                const data = memberSnap.val() || {};
                const rawFechas = data.fechas || {};
                const rawSemanas = Array.isArray(data.semanas) ? data.semanas : [];

                saturdays.forEach((satDate, j) => {
                    const sat = new Date(satDate + 'T00:00:00');
                    if (sat < incorporationDate) return;
                    if (sat > today) return;

                    if (fechasSinCulto[satDate]) return; // Omitir completamente días "Sin Culto"

                    let estado;
                    if (Object.prototype.hasOwnProperty.call(rawFechas, satDate)) {
                        estado = rawFechas[satDate];
                    } else if (rawSemanas[j] !== undefined) {
                        estado = rawSemanas[j];
                    } else {
                        estado = 3;
                    }
                    recordMap[satDate] = Number(estado);
                });
            }

            // ── Filtrar 0, 1, 2 (evaluables) y calcular rachas ──
            const evaluables = Object.keys(recordMap)
                .sort()
                .map(date => recordMap[date])
                .filter(s => s === 0 || s === 1 || s === 2);

            let recentAbsentStreak = 0, recentPresentStreak = 0;
            let countingAbsent = true, countingPresent = true;
            for (let i = evaluables.length - 1; i >= 0; i--) {
                const s = evaluables[i];
                if (countingAbsent) {
                    if (s === 0) recentAbsentStreak++;
                    else countingAbsent = false;
                }
                if (countingPresent) {
                    if (s === 1 || s === 2) recentPresentStreak++;
                    else countingPresent = false;
                }
                if (!countingAbsent && !countingPresent) break;
            }

            const estadoActual = normalizeAttendanceStatus(member.estadoAsistencia);
            let nuevoEstado = estadoActual;

            if (evaluables.length < 8) {
                // Ventana incompleta: aplicar rachas críticas, pero sin clasificar por porcentaje
                if (recentAbsentStreak >= 5) {
                    nuevoEstado = 'Alejándose';
                } else if (recentAbsentStreak >= 3) {
                    nuevoEstado = 'Enfriándose';
                } else if (estadoActual !== 'Activo' && recentPresentStreak >= 4) {
                    nuevoEstado = 'Activo';
                }
                // Si no hay racha clara, mantener estado actual (no clasificar por porcentaje con pocos datos)
            } else {
                // Ventana completa (últimos 8 evaluables)
                const window = evaluables.slice(-8);
                const asistencias = window.filter(s => s === 1 || s === 2).length;
                const porcentaje = asistencias / 8;

                if (recentAbsentStreak >= 5) nuevoEstado = 'Alejándose';
                else if (recentAbsentStreak >= 3) nuevoEstado = 'Enfriándose';
                else if (recentPresentStreak >= 4) nuevoEstado = 'Activo';
                else if (porcentaje < 0.5) nuevoEstado = 'Inconstante';
                else nuevoEstado = 'Activo';
            }

            // ── Aplicar si cambió ──
            if (estadoActual !== nuevoEstado) {
                if (typeof logHistoryEvent === 'function') {
                    logHistoryEvent(memberId, 'Cambio de Asistencia Automático', estadoActual, nuevoEstado, 'Motor FASE3-S1');
                }
                db.ref('miembros/' + memberId).update({ estadoAsistencia: nuevoEstado })
                    .catch(err => console.error('[FireGen] Error al actualizar estado:', err));
                if (nuevoEstado === 'Alejándose') triggerRetentionAlert(member);
            }
        })
        .catch(err => console.error('[FireGen Engagement] Error al leer historial:', err));
}

/* ── MÓDULO DE RETENCIÓN ─────────────────────────────────────── */

function triggerRetentionAlert(member) {
    // PUNTO 1 FIX: usar AppConfig como fuente de verdad del período activo.
    // No depender del input DOM repPeriodo que puede estar vacío si el usuario
    // no abrió la pestaña de Informe en esa sesión.
    const now = new Date();
    const periodo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (!periodo) return;
    const alertKey = 'alertasRescate/' + periodo + '/' + member.firebaseId;

    let recomendacion = 'Restauración y acompañamiento general';
    const esp = (member.estadoEspiritual || 'Nuevo').toLowerCase();
    
    if (esp === 'oidor' || esp === 'creyente') {
        recomendacion = 'Acompañamiento y evangelización';
    } else if (esp === 'convertido') {
        recomendacion = 'Restauración y consolidación';
    } else if (esp === 'reconciliado') {
        recomendacion = 'Restauración y fortalecimiento';
    } else if (esp === 'bautizado') {
        recomendacion = 'Restauración y crecimiento';
    } else if (esp === 'líder' || esp === 'lider') {
        recomendacion = 'Restauración y acompañamiento de liderazgo';
    } else if (esp === 'nuevo' || esp === 'nuevo creyente') {
        recomendacion = 'Restauración e integración';
    }

    db.ref(alertKey).once('value').then(snap => {
        if (snap.exists()) return;
        db.ref(alertKey).set({ 
            nombre: member.nombre, 
            telefono: member.telefono || '', 
            timestamp: Date.now(),
            recomendacion: recomendacion,
            estadoEspiritual: member.estadoEspiritual || 'Nuevo'
        }).catch(err => console.error('[FireGen] Error al crear alerta:', err));
        addRescueChip(member.firebaseId, member.nombre, member.telefono || '', recomendacion);
    }).catch(err => console.error('[FireGen] Error al verificar alerta:', err));
}

/**
 * addRescueChip — Agrega un chip visual de alerta de rescate.
 */
function addRescueChip(fid, nombre, telefono, recomendacion) {
    const container = document.getElementById('rescue-alerts');
    const badge = document.getElementById('rescue-count-badge');
    const emptyMsg = container.querySelector('p');
    if (emptyMsg) emptyMsg.remove();
    if (document.getElementById('chip-' + fid)) return;

    const phone = (telefono || '').replace(/\D/g, '');
    const waUrl = phone
        ? `https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=Hola%20${encodeURIComponent(nombre || '')}%2C%20te%20extra%C3%B1amos%20en%20FireGen.`
        : '#';
    const chip = document.createElement('div');
    chip.id = 'chip-' + fid;
    chip.className = 'rescue-chip';
    chip.innerHTML = `
        <div class="flex-1 min-w-0">
            <p class="chip-name truncate">${escHtml(nombre)}</p>
            <p class="chip-phone">${escHtml(telefono) || 'Sin teléfono'}</p>
            ${recomendacion ? `<p class="text-[9px] text-orange-600 font-bold leading-tight mt-1 bg-orange-50 p-1 rounded border border-orange-100">${escHtml(recomendacion)}</p>` : ''}
        </div>
        ${phone ? `<a href="${waUrl}" target="_blank" rel="noopener" class="flex-shrink-0 bg-green-500 text-white rounded-lg p-1.5 hover:bg-green-600 transition-colors"><i class="fab fa-whatsapp text-sm"></i></a>` : ''}`;
    container.appendChild(chip);
    const count = container.querySelectorAll('.rescue-chip').length;
    badge.textContent = count;
    badge.classList.remove('hidden');
}

function loadRescueAlerts(periodo) {
    db.ref('alertasRescate/' + periodo).once('value').then(snap => {
        const data = snap.val();
        if (!data) return;
        Object.entries(data).forEach(([fid, info]) => addRescueChip(fid, info.nombre, info.telefono || '', info.recomendacion || ''));
    }).catch(err => console.error('[FireGen] Error al cargar alertas:', err));
}

/* ── EXPORTAR CSV ─────────────────────────────────────────────── */

/**
 * exportAttendance — Exporta la asistencia a CSV con fechas reales.
 * FASE3-S1: Encabezados "Sáb DD" en lugar de "Semana N".
 */
function exportAttendance() {
    if (!members.length) return;
    const period = document.getElementById('attMonthSelector').value;
    const saturdays = getOperationalSaturdaysForPeriod(period);
    const headers = saturdays.map(getSaturdayLabel).join(',');
    let csv = `Control Asistencia - Periodo ${period}\nNombre,${headers},Total Mes\n`;
    members.forEach(m => {
        const n = saturdays.length;
        const sem = currentAttData[m.firebaseId] || Array(n).fill(3);
        const r = [m.nombre, ...sem.map(getAttIcon)];
        r.push(sem.reduce((a, s) => a + (s === 1 || s === 2 ? 1 : 0), 0));
        csv += `"${r.join('","')}"\n`;
    });
    downloadCSV(csv, `FireGen_Asistencia_${period}.csv`);
}
