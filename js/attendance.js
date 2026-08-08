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
let currentAttData  = {};
let currentAttNotes = {};
let currentAttPeriod = '';

// Sábados actuales del período renderizado (cache para no recalcular en cada click)
let currentSaturdays = [];

// Referencia y callback del listener de asistencia (para .off() preciso)
let attendanceRef      = null;
let attendanceCallback = null;

/**
 * syncAttendance — Abre el listener reactivo de Firebase para el periodo dado.
 * FASE3-S1: Usa getOperationalSaturdaysForPeriod() para conocer cuántas semanas hay.
 * @param {string} periodo - Formato YYYY-MM
 */
function syncAttendance(periodo) {
    if (!AppConfig.isDateInPeriod(periodo + '-01')) {
        showConnectionError('⚠️ El mes seleccionado está fuera del periodo oficial de gestión.');
        return;
    }

    if (attendanceRef && attendanceCallback) {
        attendanceRef.off('value', attendanceCallback);
    }
    currentAttPeriod = periodo;
    currentAttData   = {};
    currentAttNotes  = {};

    // FASE3-S1: Calcular sábados operativos de este período
    currentSaturdays = getOperationalSaturdaysForPeriod(periodo);

    attendanceRef = db.ref('asistencias/' + periodo);
    attendanceCallback = attendanceRef.on('value',
        snap => {
            hideConnectionError();
            const d = snap.val() || {};
            currentAttData  = {};
            currentAttNotes = {};
            const n = currentSaturdays.length;
            Object.keys(d).forEach(fid => {
                // Compatibilidad: ajustar array al número real de sábados
                const raw = d[fid].semanas || [];
                const sem = Array.from({ length: n }, (_, i) =>
                    (raw[i] !== undefined) ? raw[i] : 3
                );
                currentAttData[fid]  = sem;
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
    const periodo   = document.getElementById('attMonthSelector').value;
    const saturdays = getOperationalSaturdaysForPeriod(periodo);
    const n         = saturdays.length;

    // ── Actualizar encabezados de tabla desktop ──────────────
    const thead = document.getElementById('attTableHeaders');
    if (thead) {
        let hHtml = `<th class="p-4 border-b font-bold w-64">Nombre del Joven</th>`;
        saturdays.forEach(sat => {
            hHtml += `<th class="p-4 border-b text-center">${getSaturdayLabel(sat)}</th>`;
        });
        hHtml += `<th class="p-4 border-b text-center bg-orange-50 text-orange-700 font-black">TOTAL</th>`;
        hHtml += `<th class="p-4 border-b">Observación</th>`;
        thead.innerHTML = hHtml;
    }

    // ── Tabla Desktop ────────────────────────────────────────
    const body  = document.getElementById('attendanceBody');
    const empty = document.getElementById('emptyAttendance');
    body.innerHTML = '';
    empty.classList.toggle('hidden', members.length > 0);

    members.forEach(m => {
        const sem  = currentAttData[m.firebaseId] || Array(n).fill(3);
        const nota = currentAttNotes[m.firebaseId] || '';
        const total = sem.reduce((a, s) => a + (s === 1 || s === 2 ? 1 : 0), 0);
        const row   = document.createElement('tr');

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
    const mobileList  = document.getElementById('attendanceMobileList');
    const mobileEmpty = document.getElementById('emptyAttendanceMobile');
    Array.from(mobileList.children).forEach(c => {
        if (!c.classList.contains('flex') && c.id !== 'emptyAttendanceMobile') c.remove();
    });

    if (!members.length) {
        mobileEmpty.classList.remove('hidden');
        return;
    }
    mobileEmpty.classList.add('hidden');

    members.forEach(m => {
        const sem  = currentAttData[m.firebaseId] || Array(n).fill(3);
        const nota = currentAttNotes[m.firebaseId] || '';
        const total = sem.reduce((a, s) => a + (s === 1 || s === 2 ? 1 : 0), 0);
        const card  = document.createElement('div');
        card.className = 'mobile-att-card';

        let weeksHtml = '';
        sem.forEach((st, i) => {
            const satDate = saturdays[i] || '';
            const label   = getSaturdayLabel(satDate);
            weeksHtml += `<div style="text-align:center;margin:0 2px"><div style="font-size:9px;color:#94a3b8;margin-bottom:2px">${escHtml(label)}</div><div data-action="toggle-att" data-fid="${escHtml(m.firebaseId)}" data-week="${i}" data-periodo="${escHtml(periodo)}" data-satdate="${escHtml(satDate)}" class="btn-attendance ${getAttClass(st)}" style="width:30px;height:30px;font-size:12px">${getAttIcon(st)}</div></div>`;
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
    const body       = document.getElementById('attendanceBody');
    const mobileList = document.getElementById('attendanceMobileList');
    body.addEventListener('click', handleClick);
    body.addEventListener('input', handleInput);
    mobileList.addEventListener('click', handleClick);
    mobileList.addEventListener('input', handleInput);
}

/**
 * toggleAtt — Cicla el estado de un miembro en un sábado.
 * FASE3-S1: El array sem tiene longitud N (sábados reales), no siempre 5.
 */
function toggleAtt(fid, week, periodo) {
    const n   = currentSaturdays.length || 5;
    const sem = (currentAttData[fid] || Array(n).fill(3)).slice();
    sem[week] = (sem[week] + 1) % 4;
    currentAttData[fid] = sem;
    db.ref('asistencias/' + periodo + '/' + fid).update({ semanas: sem })
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

function getAttClass(s) { return s === 1 ? 'att-present' : s === 0 ? 'att-absent' : s === 2 ? 'att-new' : 'att-empty'; }
function getAttIcon(s)  { return s === 1 ? '✔' : s === 0 ? '✖' : s === 2 ? 'N' : '?'; }

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
    const n         = saturdays.length;

    const presentes = Array(n).fill(0);
    const nuevos    = Array(n).fill(0);
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
        const asistEl  = row.querySelector('.rep-asist');
        const nuevosEl = row.querySelector('.rep-nuevos');
        if (asistEl)  asistEl.value  = presentes[i] || '';
        if (nuevosEl) nuevosEl.value = nuevos[i]    || '';
        updates[`sem${i + 1}/asist`]  = presentes[i] || 0;
        updates[`sem${i + 1}/nuevos`] = nuevos[i]    || 0;

        // Actualizar etiqueta de semana en el informe si existe el elemento
        const semLabel = row.querySelector('.rep-sem-label');
        if (semLabel) semLabel.textContent = getSaturdayLabel(saturdays[i]);
    });

    if (periodo) {
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

    const periodStart = (AppConfig.current && AppConfig.current.period && AppConfig.current.period.start)
        ? AppConfig.current.period.start
        : AppConfig.defaults.period.start;
    const incorporacion = new Date((member.fechaIncorporacion || periodStart) + 'T00:00:00');

    const now = new Date();
    const periodos = [];
    for (let i = 0; i < 2; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        periodos.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    Promise.all(periodos.map(p => db.ref('asistencias/' + p + '/' + memberId).once('value')))
        .then(snaps => {
            // Construir mapa fecha → estado
            const recordMap = {};
            snaps.forEach((snap, idx) => {
                const p = periodos[idx];
                const [y, m] = p.split('-').map(Number);
                const sats = getOperationalSaturdays(y, m);
                const d    = snap.val();
                const sem  = (d && d.semanas) ? d.semanas : [];
                sats.forEach((satDate, i) => {
                    recordMap[satDate] = (sem[i] !== undefined) ? sem[i] : 3;
                });
            });

            // Filtrar sólo desde la incorporación del miembro, ordenados cronológicamente
            const evaluableDates = Object.keys(recordMap)
                .filter(dateStr => new Date(dateStr + 'T00:00:00') >= incorporacion)
                .sort();

            const history = evaluableDates.map(d => recordMap[d]);

            // Historial insuficiente → no cambiar estado automáticamente
            const realCount = history.filter(s => s !== 3).length;
            if (realCount < 4) return;

            // ── Racha RECIENTE de faltas (desde el final, ignorando ?) ──
            let recentAbsentStreak = 0, recentPresentStreak = 0;
            let countingAbsent = true, countingPresent = true;
            for (let i = history.length - 1; i >= 0; i--) {
                const s = history[i];
                if (s === 3) continue;
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

            // ── Porcentaje de asistencia (excluye ?) ──
            let asistencias = 0, evaluables = 0;
            history.forEach(s => {
                if (s === 3) return;
                evaluables++;
                if (s === 1 || s === 2) asistencias++;
            });
            const porcentaje = evaluables > 0 ? asistencias / evaluables : 1;

            // ── Clasificación por prioridad ──
            let nuevoEstado;
            if (recentAbsentStreak >= 5)      nuevoEstado = 'Alejándose';
            else if (recentAbsentStreak >= 3)  nuevoEstado = 'Enfriándose';
            else if (recentPresentStreak >= 4) nuevoEstado = 'Activo';
            else if (porcentaje < 0.5)         nuevoEstado = 'Inconstante';
            else                               nuevoEstado = 'Activo';

            // ── Aplicar si cambió ──
            const estadoActual = normalizeAttendanceStatus(member.estadoAsistencia);
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
    const periodo = document.getElementById('repPeriodo').value || activeReportPeriod;
    if (!periodo) return;
    const alertKey = 'alertasRescate/' + periodo + '/' + member.firebaseId;
    db.ref(alertKey).once('value').then(snap => {
        if (snap.exists()) return;
        db.ref(alertKey).set({ nombre: member.nombre, telefono: member.telefono || '', timestamp: Date.now() })
            .catch(err => console.error('[FireGen] Error al crear alerta:', err));
        addRescueChip(member.firebaseId, member.nombre, member.telefono || '');
    }).catch(err => console.error('[FireGen] Error al verificar alerta:', err));
}

/**
 * addRescueChip — Agrega un chip visual de alerta de rescate.
 */
function addRescueChip(fid, nombre, telefono) {
    const container = document.getElementById('rescue-alerts');
    const badge     = document.getElementById('rescue-count-badge');
    const emptyMsg  = container.querySelector('p');
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
        Object.entries(data).forEach(([fid, info]) => addRescueChip(fid, info.nombre, info.telefono || ''));
    }).catch(err => console.error('[FireGen] Error al cargar alertas:', err));
}

/* ── EXPORTAR CSV ─────────────────────────────────────────────── */

/**
 * exportAttendance — Exporta la asistencia a CSV con fechas reales.
 * FASE3-S1: Encabezados "Sáb DD" en lugar de "Semana N".
 */
function exportAttendance() {
    if (!members.length) return;
    const period    = document.getElementById('attMonthSelector').value;
    const saturdays = getOperationalSaturdaysForPeriod(period);
    const headers   = saturdays.map(getSaturdayLabel).join(',');
    let csv = `Control Asistencia - Periodo ${period}\nNombre,${headers},Total Mes\n`;
    members.forEach(m => {
        const n   = saturdays.length;
        const sem = currentAttData[m.firebaseId] || Array(n).fill(3);
        const r   = [m.nombre, ...sem.map(getAttIcon)];
        r.push(sem.reduce((a, s) => a + (s === 1 || s === 2 ? 1 : 0), 0));
        csv += `"${r.join('","')}"\n`;
    });
    downloadCSV(csv, `FireGen_Asistencia_${period}.csv`);
}
