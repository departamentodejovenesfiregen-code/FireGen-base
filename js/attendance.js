/**
 * FireGen V3.0 — js/attendance.js
 * ─────────────────────────────────────────────────────────────
 * MÓDULO DE ASISTENCIA
 * Control nominal de asistencia por periodo (semanas 1-5),
 * sincronización automática hacia el Informe Mensual y motor
 * de estado de engagement.
 *
 * Dependencias: firebase-config.js, utils.js, members.js
 * ─────────────────────────────────────────────────────────────
 */

/* ── Estado del módulo ── */
let currentAttData = {};
let currentAttNotes = {};
let currentAttPeriod = '';

// Referencia y callback del listener de asistencia (para .off() preciso)
let attendanceRef = null;
let attendanceCallback = null;

/**
 * syncAttendance — Abre el listener reactivo de Firebase para el periodo dado.
 * FIX: JS-02 — Guarda la referencia y el callback exactos para desregistrar
 * únicamente ese listener, evitando fugas al cambiar de mes repetidamente.
 * FIX: JS-07 — Handler de error visible.
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
    currentAttData = {};
    currentAttNotes = {};

    attendanceRef = db.ref('asistencias/' + periodo);
    attendanceCallback = attendanceRef.on('value',
        snap => {
            hideConnectionError();
            const d = snap.val() || {};
            currentAttData = {};
            currentAttNotes = {};
            Object.keys(d).forEach(fid => {
                currentAttData[fid] = d[fid].semanas || [3, 3, 3, 3, 3];
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
 * Llamar al hacer logout para liberar recursos.
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
 * FIX: SEC-01 — Nombres escapados con escHtml().
 * FIX: SEC-03 — data-fid + data-week + event delegation en lugar de onclick inline.
 */
function renderAttendance() {
    const periodo = document.getElementById('attMonthSelector').value;

    // ── Tabla Desktop ────────────────────────────────────────
    const body = document.getElementById('attendanceBody');
    const empty = document.getElementById('emptyAttendance');
    body.innerHTML = '';
    empty.classList.toggle('hidden', members.length > 0);

    members.forEach(m => {
        const sem = currentAttData[m.firebaseId] || [3, 3, 3, 3, 3];
        const nota = currentAttNotes[m.firebaseId] || '';
        const total = sem.reduce((a, s) => a + (s === 1 || s === 2 ? 1 : 0), 0);
        const row = document.createElement('tr');

        let c = `<td class="p-4 font-bold text-slate-800">${escHtml(m.nombre)}</td>`;
        sem.forEach((st, i) => {
            c += `<td class="p-4 text-center"><div data-action="toggle-att" data-fid="${escHtml(m.firebaseId)}" data-week="${i}" data-periodo="${escHtml(periodo)}" class="btn-attendance mx-auto ${getAttClass(st)}">${getAttIcon(st)}</div></td>`;
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
        if (!c.classList.contains('flex') && c.id !== 'emptyAttendanceMobile') c.remove();
    });

    if (!members.length) {
        mobileEmpty.classList.remove('hidden');
        return;
    }
    mobileEmpty.classList.add('hidden');

    members.forEach(m => {
        const sem = currentAttData[m.firebaseId] || [3, 3, 3, 3, 3];
        const nota = currentAttNotes[m.firebaseId] || '';
        const total = sem.reduce((a, s) => a + (s === 1 || s === 2 ? 1 : 0), 0);
        const card = document.createElement('div');
        card.className = 'mobile-att-card';

        let weeksHtml = '';
        sem.forEach((st, i) => {
            weeksHtml += `<div data-action="toggle-att" data-fid="${escHtml(m.firebaseId)}" data-week="${i}" data-periodo="${escHtml(periodo)}" class="btn-attendance ${getAttClass(st)}" style="width:30px;height:30px;font-size:12px">${getAttIcon(st)}</div>`;
        });

        card.innerHTML = `
            <div class="mobile-att-info">
                <div class="mobile-att-name">${escHtml(m.nombre)}</div>
                <div class="mobile-att-label">Semanas →</div>
                <div class="mobile-att-weeks">${weeksHtml}
                    <div class="btn-attendance" style="width:30px;height:30px;font-size:11px;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;font-weight:900">${total}</div>
                </div>
                <input type="text" value="${escHtml(nota)}" data-action="att-note" data-fid="${escHtml(m.firebaseId)}" data-periodo="${escHtml(periodo)}"
                    class="w-full bg-transparent outline-none text-xs italic text-slate-400 mt-2 border-b border-dashed border-slate-200" placeholder="Observación…">
            </div>`;
        mobileList.appendChild(card);
    });
}

/**
 * initAttendanceEventDelegation — Configura event delegation para la tabla
 * y la lista móvil de asistencia.
 * FIX: SEC-03 — Elimina onclick/oninput inline.
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

function toggleAtt(fid, week, periodo) {
    const sem = (currentAttData[fid] || [3, 3, 3, 3, 3]).slice();
    sem[week] = (sem[week] + 1) % 4;
    currentAttData[fid] = sem;
    db.ref('asistencias/' + periodo + '/' + fid).update({ semanas: sem })
        .catch(err => console.error('[FireGen] Error al guardar asistencia:', err));
    updateEngagementStatusDebounced(fid);
    flashBadge('attSyncBadge');
    renderAttendance();
}

// FIX: OPT-07 — debounce sobre updateEngagementStatus para evitar ráfagas
// de lecturas Firebase cuando el usuario marca varias semanas seguidas.
const updateEngagementStatusDebounced = debounce(updateEngagementStatus, 600);

// FIX: OPT-02 — debounce de 800ms para no escribir en cada tecla.
const saveAttNote = debounce(function (fid, periodo, val) {
    db.ref('asistencias/' + periodo + '/' + fid).update({ nota: val })
        .catch(err => console.error('[FireGen] Error al guardar nota:', err));
}, 800);

function getAttClass(s) { return s === 1 ? 'att-present' : s === 0 ? 'att-absent' : s === 2 ? 'att-new' : 'att-empty'; }
function getAttIcon(s) { return s === 1 ? '✔' : s === 0 ? '✖' : s === 2 ? 'N' : '?'; }

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

function pushAttendanceToReport() {
    const repPeriodoEl = document.getElementById('repPeriodo');
    const periodo = repPeriodoEl ? repPeriodoEl.value : currentAttPeriod;
    // FIX: JS-04 — guard mejorada: solo sincroniza si el periodo del informe
    // coincide con el periodo de asistencia actualmente cargado.
    if (!periodo || periodo !== currentAttPeriod) return;

    const presentes = [0, 0, 0, 0, 0];
    const nuevos = [0, 0, 0, 0, 0];
    members.forEach(m => {
        const sem = currentAttData[m.firebaseId] || [3, 3, 3, 3, 3];
        sem.forEach((s, i) => {
            if (s === 1) presentes[i]++;
            if (s === 2) { presentes[i]++; nuevos[i]++; }
        });
    });

    const rows = document.querySelectorAll('.row-report-data');
    const updates = {};
    rows.forEach((row, i) => {
        row.querySelector('.rep-asist').value = presentes[i] || '';
        row.querySelector('.rep-nuevos').value = nuevos[i] || '';
        updates[`sem${i + 1}/asist`] = presentes[i] || 0;
        updates[`sem${i + 1}/nuevos`] = nuevos[i] || 0;
    });
    if (periodo) {
        db.ref('informes/' + periodo).update(updates)
            .catch(err => console.error('[FireGen] Error al sincronizar informe:', err));
    }
    updateMonthlyStats();
    flashBadge('attSyncBadge');
}

/* ── MOTOR DE ENGAGEMENT ──────────────────────────────────────── */

function updateEngagementStatus(memberId) {
    const now = new Date();
    const periodos = [];
    for (let i = 0; i < 2; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        periodos.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    Promise.all(periodos.map(p => db.ref('asistencias/' + p + '/' + memberId).once('value')))
        .then(snaps => {
            let allWeeks = [];
            snaps.forEach(snap => {
                const d = snap.val();
                const sem = (d && d.semanas) ? d.semanas : [3, 3, 3, 3, 3];
                allWeeks = allWeeks.concat(sem);
            });
            const last8 = allWeeks.slice(0, 8);
            const total = last8.filter(s => s !== 3).length;
            const present = last8.filter(s => s === 1 || s === 2).length;
            const pct = total > 0 ? present / Math.min(total, 8) : 0;

            const recent = snaps[0].val();
            const prevSnap = snaps[1] && snaps[1].val();
            const recentWeeks = recent && recent.semanas ? recent.semanas : [3, 3, 3, 3, 3];
            const prevWeeks = prevSnap && prevSnap.semanas ? prevSnap.semanas : [3, 3, 3, 3, 3];
            const asistio21 = recentWeeks.filter(s => s !== 3).slice(-3).some(s => s === 1 || s === 2);
            const asistio60 = [...recentWeeks, ...prevWeeks].filter(s => s !== 3).slice(-8).some(s => s === 1 || s === 2);

            let nuevoEstado = 'Activo';
            if (!asistio60) nuevoEstado = 'Alejado';
            else if (!asistio21) nuevoEstado = 'Enfriándose';
            else if (pct < 0.5) nuevoEstado = 'Inconstante';

            const mo = members.find(x => x.firebaseId === memberId);
            if (mo && mo.estadoAsistencia !== nuevoEstado) {
                db.ref('miembros/' + memberId).update({ estadoAsistencia: nuevoEstado })
                    .catch(err => console.error('[FireGen] Error al actualizar estado:', err));
                if (nuevoEstado === 'Alejado') triggerRetentionAlert(mo);
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
 * FIX: SEC-01 — Nombre y teléfono escapados.
 */
function addRescueChip(fid, nombre, telefono) {
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

function exportAttendance() {
    if (!members.length) return;
    const period = document.getElementById('attMonthSelector').value;
    let csv = `Control Asistencia - Periodo ${period}\nNombre,Semana 1,Semana 2,Semana 3,Semana 4,Semana 5,Total Mes\n`;
    members.forEach(m => {
        const sem = currentAttData[m.firebaseId] || [3, 3, 3, 3, 3];
        const r = [m.nombre, ...sem.map(getAttIcon)];
        r.push(sem.reduce((a, s) => a + (s === 1 || s === 2 ? 1 : 0), 0));
        csv += `"${r.join('","')}"\n`;
    });
    downloadCSV(csv, `FireGen_Asistencia_${period}.csv`);
}

console.log("[FireGen] attendance.js cargado");