/**
 * FireGen V3.0 — js/records.js
 * ─────────────────────────────────────────────────────────────
 * MÓDULO RÉCORD Y RECONOCIMIENTOS
 * Períodos por fecha real · NextGen · Invitaciones · Premios
 * ─────────────────────────────────────────────────────────────
 */

const MIN_OPORTUNIDADES_CONSTANCIA = 8;

// Estado del módulo
let currentPeriod = null;      // período activo seleccionado
let allPeriods = [];           // todos los períodos cargados
let recordsStats = [];         // estadísticas calculadas
let recordsData = {
    members: {},
    nextGen: {},
    asistencias: {},         // { 'YYYY-MM': { memberId: { fechas: { dateStr: st } } } }
    asistNextGen: {},        // { 'YYYY-MM': { ngId: { fechas: { dateStr: true } } } }
    fechasSinCulto: {},      // { dateStr: true }
    invitaciones: {},        // { invId: { fecha, invitadorId, ... } }
    reconocimientos: {}      // { recId: { personaId, ... } }
};

// ─────────────────────────────────────────────────────────────
// UTILIDADES DE FECHA
// ─────────────────────────────────────────────────────────────

function getSaturdaysBetween(start, end) {
    if (!start || !end) return [];
    const result = [];
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T23:59:59');
    // Avanzar al primer sábado >= start
    const day = s.getDay(); // 0=dom,6=sab
    const daysToSat = (6 - day + 7) % 7;
    const cur = new Date(s);
    cur.setDate(cur.getDate() + daysToSat);
    while (cur <= e) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        result.push(`${y}-${m}-${d}`);
        cur.setDate(cur.getDate() + 7);
    }
    return result;
}

function getMonthsBetween(start, end) {
    if (!start || !end) return [];
    const months = new Set();
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    const cur = new Date(s.getFullYear(), s.getMonth(), 1);
    while (cur <= e) {
        months.add(`${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}`);
        cur.setMonth(cur.getMonth() + 1);
    }
    return Array.from(months);
}

function formatDateEs(isoDate) {
    if (!isoDate) return '—';
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
}

// ─────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────

function renderRecordsError(msg) {
    const dash = document.getElementById('recordsDashboard');
    if (dash) {
        dash.innerHTML = `<div class="col-span-full p-6 text-center text-red-600 bg-red-50 border border-red-200 rounded-xl">
            <i class="fas fa-exclamation-triangle text-3xl mb-3 block"></i>
            <h3 class="font-bold text-lg mb-1">Error de Sistema</h3>
            <p class="text-sm">${msg}</p>
            <p class="text-xs text-red-400 mt-2">Posibles causas: conexión, permisos o sesión expirada.</p>
        </div>`;
    }
}

function initRecords() {
    if (typeof db === 'undefined' || !db) {
        console.error('[Records] Error: Firebase (db) no está disponible.');
        renderRecordsError('No se pudo cargar Récord y Reconocimientos.');
        return;
    }

    db.ref('recordPeriods').once('value').then(snap => {
        allPeriods = [];
        const data = snap.val() || {};
        Object.keys(data).forEach(k => allPeriods.push({ id: k, ...data[k] }));
        allPeriods.sort((a, b) => (b.fechaInicio || '').localeCompare(a.fechaInicio || ''));

        renderPeriodUI();
    }).catch(error => {
        console.error('[Records] Error cargando períodos:', error);
        renderRecordsError('No se pudo cargar Récord y Reconocimientos.');
    });
}
window.initRecords = initRecords;

function renderPeriodUI() {
    const noPeriodMsg = document.getElementById('noPeriodMsg');
    const activePeriodPanel = document.getElementById('activePeriodPanel');
    const periodFormPanel = document.getElementById('periodFormPanel');

    if (!allPeriods.length) {
        noPeriodMsg.classList.remove('hidden');
        activePeriodPanel.classList.add('hidden');
        periodFormPanel.classList.remove('hidden'); // Show form directly
        clearRecordsUI();
        return;
    }

    noPeriodMsg.classList.add('hidden');
    activePeriodPanel.classList.remove('hidden');

    // Fill period selector
    const sel = document.getElementById('periodSelector');
    if (sel) {
        sel.innerHTML = '';
        allPeriods.forEach(p => {
            const op = document.createElement('option');
            op.value = p.id;
            op.textContent = `${p.nombre || p.id} ${p.cerrado ? '🔒' : '✅'} (${formatDateEs(p.fechaInicio)} → ${p.fechaFin ? formatDateEs(p.fechaFin) : 'Abierto'})`;
            sel.appendChild(op);
        });
    }

    // Load most recent open period, or most recent if all closed
    const open = allPeriods.find(p => !p.cerrado);
    const toLoad = open || allPeriods[0];
    if (sel) sel.value = toLoad.id;

    loadPeriodData();
}

function loadPeriodData() {
    const sel = document.getElementById('periodSelector');
    const pid = sel ? sel.value : (allPeriods[0] ? allPeriods[0].id : null);
    if (!pid) return;

    currentPeriod = allPeriods.find(p => p.id === pid) || null;
    if (!currentPeriod) return;

    // Update active period display
    const apNombre = document.getElementById('activePeriodNombre');
    const apRango = document.getElementById('activePeriodRango');
    if (apNombre) apNombre.textContent = currentPeriod.nombre || currentPeriod.id;
    if (apRango) {
        const end = currentPeriod.cerrado ? currentPeriod.fechaFin || currentPeriod.fechaCierre : (currentPeriod.fechaFin || 'Hoy');
        apRango.textContent = `${formatDateEs(currentPeriod.fechaInicio)} → ${currentPeriod.fechaFin ? formatDateEs(currentPeriod.fechaFin) : 'Hoy (Abierto)'}`;
    }

    // Calculate date range
    const curDate = new Date();
    const todayLocal = `${curDate.getFullYear()}-${String(curDate.getMonth() + 1).padStart(2, '0')}-${String(curDate.getDate()).padStart(2, '0')}`;
    const start = currentPeriod.fechaInicio;
    const end = currentPeriod.cerrado
        ? (currentPeriod.fechaFin || currentPeriod.fechaCierre || todayLocal)
        : (currentPeriod.fechaFin || todayLocal);


    const months = getMonthsBetween(start, end);

    // Load all data
    const requests = [
        { key: 'members', path: 'miembros' },
        { key: 'nextGen', path: 'adolescentesApoyo' },
        { key: 'invitaciones', path: `invitaciones/${pid}` },
        { key: 'reconocimientos', path: `reconocimientos/${pid}` }
    ];

    months.forEach(m => {
        requests.push({ key: `asistencias_${m}`, path: `asistencias/${m}` });
        requests.push({ key: `asistNextGen_${m}`, path: `asistenciaNextGen/${m}` });
        requests.push({ key: `fechasSinCulto_${m}`, path: `asistencias/${m}/config/fechasSinCulto` });
    });

    const promises = requests.map(req => db.ref(req.path).once('value'));

    Promise.allSettled(promises).then(results => {
        recordsData.members = {};
        recordsData.nextGen = {};
        recordsData.invitaciones = {};
        recordsData.reconocimientos = {};
        recordsData.asistencias = {};
        recordsData.asistNextGen = {};
        recordsData.fechasSinCulto = {};

        results.forEach((res, i) => {
            const req = requests[i];
            if (res.status === 'rejected') {
                console.error('[Records] Ruta falló:', req.path, res.reason);
            } else {
                const val = res.value.val() || {};
                if (req.key === 'members') recordsData.members = val;
                else if (req.key === 'nextGen') recordsData.nextGen = val;
                else if (req.key === 'invitaciones') recordsData.invitaciones = val;
                else if (req.key === 'reconocimientos') recordsData.reconocimientos = val;
                else if (req.key.startsWith('asistencias_')) {
                    const m = req.key.split('_')[1];
                    recordsData.asistencias[m] = val;
                }
                else if (req.key.startsWith('asistNextGen_')) {
                    const m = req.key.split('_')[1];
                    recordsData.asistNextGen[m] = val;
                }
                else if (req.key.startsWith('fechasSinCulto_')) {
                    Object.assign(recordsData.fechasSinCulto, val);
                }
            }
        });

        // Add firebaseId to each member
        Object.keys(recordsData.members || {}).forEach(k => {
            if (!recordsData.members[k].eliminado) {
                recordsData.members[k].firebaseId = k;
            }
        });

        calculateRecords(start, end);
    });
}
window.loadPeriodData = loadPeriodData;

function clearRecordsUI() {
    const dash = document.getElementById('recordsDashboard');
    if (dash) dash.innerHTML = '<div class="text-slate-400 text-sm col-span-full text-center py-4">Sin período configurado</div>';
    const tbody = document.getElementById('individualRecordsList');
    if (tbody) tbody.innerHTML = '';
    const ng = document.getElementById('nextGenTableBody');
    if (ng) ng.innerHTML = '';
    const inv = document.getElementById('invitacionesList');
    if (inv) inv.innerHTML = '';
}

// ─────────────────────────────────────────────────────────────
// CÁLCULO CENTRAL
// ─────────────────────────────────────────────────────────────

function calculateRecords(startDate, endDate) {
    recordsStats = [];
    const periodoSabs = getSaturdaysBetween(startDate, endDate);
    const opSabs = periodoSabs.filter(d => !recordsData.fechasSinCulto[d]);

    // Jóvenes
    Object.keys(recordsData.members).forEach(fid => {
        const m = recordsData.members[fid];
        if (m.eliminado) return;
        const st = calcJovenStats(fid, m.fechaIncorporacion || '', opSabs, periodoSabs);
        if (st.oportunidades >= 0) {
            recordsStats.push({ id: fid, nombre: m.nombre, tipo: 'joven', ...st });
        }
    });

    // NextGen
    Object.keys(recordsData.nextGen).forEach(ngId => {
        const ng = recordsData.nextGen[ngId];
        const st = calcNextGenStats(ngId, opSabs, periodoSabs);
        recordsStats.push({ id: ngId, nombre: ng.nombreCompleto || ng.nombre, desc: ng.descripcion || ng.desc || '', tipo: 'nextgen', ...st });
    });

    // Contar invitaciones por persona (usando datos guardados)
    recordsStats.forEach(s => s.invitacionesCount = 0);
    Object.values(recordsData.invitaciones).forEach(inv => {
        const p = recordsStats.find(s => s.id === inv.invitadorId);
        if (p) p.invitacionesCount++;
    });

    // Cargar reconocimientos ganados
    recordsStats.forEach(s => { s.premios = []; });
    Object.keys(recordsData.reconocimientos).forEach(recId => {
        const rec = recordsData.reconocimientos[recId];
        const p = recordsStats.find(s => s.id === rec.personaId);
        if (p) p.premios.push({ tipo: rec.tipoPremio, fecha: rec.fechaPremio });
    });

    renderRecordsDashboard();
    renderNextGenTable(periodoSabs, opSabs);
    renderInvitacionesTable();
    renderIndividualRecords();
}

function calcJovenStats(fid, fechaIncorporacion, opSabs, allSabs) {
    // Build flat attendance map from monthly data
    const attMap = {};
    Object.keys(recordsData.asistencias).forEach(m => {
        const mData = recordsData.asistencias[m][fid];
        if (!mData) return;
        if (mData.fechas) {
            Object.keys(mData.fechas).forEach(d => { attMap[d] = mData.fechas[d]; });
        } else if (Array.isArray(mData.semanas)) {
            // Legacy format - need operational saturdays for that month
            const [y, mo] = m.split('-').map(Number);
            if (typeof getOperationalSaturdays === 'function') {
                const sats = getOperationalSaturdays(y, mo);
                mData.semanas.forEach((st, i) => { if (sats[i]) attMap[sats[i]] = st; });
            }
        }
    });

    let asistencias = 0;
    let oportunidades = 0;
    let rachaActual = 0;
    let rachaMax = 0;

    // Sort operational saturdays to process chronologically
    const sortedSabs = [...opSabs].sort();

    sortedSabs.forEach(d => {
        // Skip dates before incorporation
        if (fechaIncorporacion && d < fechaIncorporacion) return;

        oportunidades++;
        const st = attMap.hasOwnProperty(d) ? Number(attMap[d]) : 3;

        if (st === 1 || st === 2) {
            asistencias++;
            rachaActual++;
            if (rachaActual > rachaMax) rachaMax = rachaActual;
        } else if (st === 0) {
            // Falta - rompe racha
            rachaActual = 0;
        }
        // st === 3 (?): neutral - no aumenta ni rompe
    });

    const constancia = oportunidades > 0 ? (asistencias / oportunidades) * 100 : 0;
    return { asistencias, oportunidades, constancia, rachaMax };
}

function calcNextGenStats(ngId, opSabs, allSabs) {
    // Build attendance map from monthly nextgen data
    const attMap = {};
    Object.keys(recordsData.asistNextGen).forEach(m => {
        const mData = recordsData.asistNextGen[m][ngId];
        if (!mData || !mData.fechas) return;
        Object.keys(mData.fechas).forEach(d => { attMap[d] = mData.fechas[d]; });
    });

    let asistencias = 0;
    let oportunidades = opSabs.length;
    let rachaActual = 0;
    let rachaMax = 0;

    const sortedSabs = [...opSabs].sort();
    sortedSabs.forEach(d => {
        const val = attMap[d];
        if (val === true || val === 1) {
            asistencias++;
            rachaActual++;
            if (rachaActual > rachaMax) rachaMax = rachaActual;
        } else {
            // ausencia - rompe racha
            rachaActual = 0;
        }
    });

    const constancia = oportunidades > 0 ? (asistencias / oportunidades) * 100 : 0;
    return { asistencias, oportunidades, constancia, rachaMax };
}

// ─────────────────────────────────────────────────────────────
// RECONOCIMIENTOS DASHBOARD (con empates)
// ─────────────────────────────────────────────────────────────

function getWinners(list, getValue, minCondition) {
    const eligible = minCondition ? list.filter(minCondition) : list;
    if (!eligible.length) return [];
    const maxVal = Math.max(...eligible.map(getValue));
    if (maxVal <= 0) return [];
    return eligible.filter(s => getValue(s) === maxVal);
}

function renderRecordsDashboard() {
    const dash = document.getElementById('recordsDashboard');
    if (!dash) return;

    const jovenes = recordsStats.filter(s => s.tipo === 'joven');
    const nextgens = recordsStats.filter(s => s.tipo === 'nextgen');

    const majAsist = getWinners(jovenes, s => s.asistencias, s => s.asistencias > 0);
    const majConst = getWinners(jovenes, s => s.constancia, s => s.oportunidades >= MIN_OPORTUNIDADES_CONSTANCIA);
    const majRacha = getWinners(jovenes, s => s.rachaMax, s => s.rachaMax > 0);
    const majInv   = getWinners(recordsStats, s => s.invitacionesCount, s => s.invitacionesCount > 0);
    const ngAsist  = getWinners(nextgens, s => s.asistencias, s => s.asistencias > 0);
    const ngRacha  = getWinners(nextgens, s => s.rachaMax, s => s.rachaMax > 0);

    const cards = [
        { icon: 'fa-star text-yellow-500', title: '🥇 Mayor Asistencia', winners: majAsist, val: s => `${s.asistencias} cultos` },
        { icon: 'fa-shield-heart text-red-400', title: '⭐ Mayor Constancia', winners: majConst, val: s => `${s.constancia.toFixed(1)}% (${s.oportunidades} oport.)`, note: `Mín ${MIN_OPORTUNIDADES_CONSTANCIA} oportunidades` },
        { icon: 'fa-fire text-orange-500', title: '🔥 Mayor Racha', winners: majRacha, val: s => `${s.rachaMax} consecutivos` },
        { icon: 'fa-bullseye text-blue-500', title: '🎯 Más Invitaciones', winners: majInv, val: s => `${s.invitacionesCount} invitaciones` },
        { icon: 'fa-user-astronaut text-purple-500', title: '🔥 NextGen — Asistencia', winners: ngAsist, val: s => `${s.asistencias} apoyos` },
        { icon: 'fa-bolt text-purple-400', title: '🔥 NextGen — Racha', winners: ngRacha, val: s => `${s.rachaMax} seguidos` },
    ];

    dash.innerHTML = cards.map(c => {
        if (!c.winners.length) {
            return `<div class="bg-white border border-slate-200 p-4 rounded-xl shadow-sm opacity-50">
                <div class="flex items-center gap-2 mb-2"><i class="fas ${c.icon}"></i><span class="text-xs font-black text-slate-500 uppercase">${c.title}</span></div>
                <p class="text-slate-400 text-xs">Sin datos</p>
            </div>`;
        }
        const names = c.winners.map(w => `<div class="font-black text-slate-800">${w.nombre} <span class="text-slate-500 font-normal text-xs">— ${c.val(w)}</span></div>`).join('');
        return `<div class="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-center gap-2 mb-2"><i class="fas ${c.icon}"></i><span class="text-xs font-black text-slate-500 uppercase">${c.title}</span></div>
            ${names}
            ${c.note ? `<p class="text-[10px] text-slate-400 mt-1">${c.note}</p>` : ''}
        </div>`;
    }).join('');
}

// ─────────────────────────────────────────────────────────────
// RÉCORD INDIVIDUAL
// ─────────────────────────────────────────────────────────────

function renderIndividualRecords() {
    const tbody = document.getElementById('individualRecordsList');
    if (!tbody) return;
    const filter = document.getElementById('recordsFilterType')?.value || 'all';

    let data = [...recordsStats];

    if (filter === 'joven') data = data.filter(s => s.tipo === 'joven');
    else if (filter === 'nextgen') data = data.filter(s => s.tipo === 'nextgen');
    else if (filter === 'premiados') data = data.filter(s => s.premios && s.premios.length > 0);
    else if (filter === 'no-premiados') data = data.filter(s => !s.premios || s.premios.length === 0);

    data.sort((a, b) => b.constancia - a.constancia || b.asistencias - a.asistencias);

    tbody.innerHTML = data.map(s => {
        const tipoBadge = s.tipo === 'joven'
            ? '<span class="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-bold">Joven</span>'
            : '<span class="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">NextGen</span>';

        const premiosHtml = (s.premios && s.premios.length > 0)
            ? s.premios.map(p => `<div class="text-[10px] text-yellow-700 bg-yellow-50 rounded px-1">${p.tipo} ${p.fecha ? '('+formatDateEs(p.fecha)+')' : ''}</div>`).join('')
            : '<span class="text-slate-300 text-[10px]">—</span>';

        return `<tr class="hover:bg-slate-50 transition-colors">
            <td class="p-2 border-b font-bold text-slate-800">${s.nombre}</td>
            <td class="p-2 border-b">${tipoBadge}</td>
            <td class="p-2 border-b text-center font-bold">${s.asistencias}</td>
            <td class="p-2 border-b text-center text-slate-500">${s.oportunidades}</td>
            <td class="p-2 border-b text-center font-bold">${s.constancia.toFixed(1)}%</td>
            <td class="p-2 border-b text-center"><i class="fas fa-fire text-orange-400 mr-0.5"></i>${s.rachaMax}</td>
            <td class="p-2 border-b text-center font-bold text-blue-600">${s.invitacionesCount}</td>
            <td class="p-2 border-b">${premiosHtml}</td>
            <td class="p-2 border-b text-center"><button type="button" onclick="openPremioModal('${s.id}','${s.tipo}')" title="Registrar premio" class="text-yellow-500 hover:text-yellow-700 text-base"><i class="fas fa-award"></i></button></td>
        </tr>`;
    }).join('') || '<tr><td colspan="9" class="p-4 text-center text-slate-400">Sin datos en este período</td></tr>';
}
window.renderIndividualRecords = renderIndividualRecords;

// ─────────────────────────────────────────────────────────────
// NEXTGEN TABLE
// ─────────────────────────────────────────────────────────────

function renderNextGenTable(periodoSabs, opSabs) {
    const thead = document.getElementById('nextGenTableHead');
    const tbody = document.getElementById('nextGenTableBody');
    const empty = document.getElementById('nextGenEmpty');
    if (!thead || !tbody) return;

    const ngList = Object.keys(recordsData.nextGen).map(id => ({
        id, ...recordsData.nextGen[id]
    }));

    if (!ngList.length) {
        tbody.innerHTML = '';
        thead.innerHTML = '';
        if (empty) empty.classList.remove('hidden');
        return;
    }
    if (empty) empty.classList.add('hidden');

    let sortedSabs = [];
    if (!periodoSabs && typeof currentPeriod !== 'undefined' && currentPeriod) {
        const curDate = new Date();
        const todayLocal = `${curDate.getFullYear()}-${String(curDate.getMonth() + 1).padStart(2, '0')}-${String(curDate.getDate()).padStart(2, '0')}`;
        const start = currentPeriod.fechaInicio;
        const end = currentPeriod.cerrado ? (currentPeriod.fechaFin || currentPeriod.fechaCierre || todayLocal) : (currentPeriod.fechaFin || todayLocal);
        periodoSabs = getSaturdaysBetween(start, end);
    }
    
    // Apply month filter
    const monthSelector = document.getElementById('nextGenMonthSelector');
    const mobileSelector = document.getElementById('nextGenMonthSelectorMobile');
    
    if (monthSelector && !monthSelector.value) {
        const d = new Date();
        const curM = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthSelector.value = curM;
        if (mobileSelector) mobileSelector.value = curM;
    }
    
    const selectedMonth = monthSelector ? monthSelector.value : '';
    
    if (periodoSabs) {
        sortedSabs = [...periodoSabs].sort();
        if (selectedMonth) {
            sortedSabs = sortedSabs.filter(d => d.startsWith(selectedMonth));
        }
    }

    // Build header
    let thHtml = '<tr><th class="p-2 border-b text-left">Adolescente</th><th class="p-2 border-b">Descripción</th>';
    sortedSabs.forEach(d => {
        const nc = recordsData.fechasSinCulto[d];
        const style = nc ? 'color:#ef4444;text-decoration:line-through' : '';
        const dd = d.split('-');
        thHtml += `<th class="p-2 border-b text-center" title="${d}" style="${style}">${dd[2]}/${dd[1]}</th>`;
    });
    thHtml += '<th class="p-2 border-b text-center">Total</th><th class="p-2 border-b text-center">Racha</th><th class="p-2 border-b"></th></tr>';
    thead.innerHTML = thHtml;

    // Build body
    tbody.innerHTML = ngList.map(ng => {
        const attMap = {};
        Object.keys(recordsData.asistNextGen).forEach(m => {
            const mData = recordsData.asistNextGen[m][ng.id];
            if (!mData || !mData.fechas) return;
            Object.keys(mData.fechas).forEach(d => { attMap[d] = mData.fechas[d]; });
        });

        let totalAsist = 0;
        let rachaAct = 0;
        let rachaMax = 0;

        let tds = sortedSabs.map(d => {
            const nc = recordsData.fechasSinCulto[d];
            if (nc) {
                // SIN CULTO — neutral, no cuenta para racha
                return `<td class="p-2 border-b text-center text-red-300 text-[10px] bg-red-50">NC</td>`;
            }
            const val = attMap[d];
            const presente = val === true || val === 1;
            if (presente) {
                totalAsist++;
                rachaAct++;
                if (rachaAct > rachaMax) rachaMax = rachaAct;
            } else {
                rachaAct = 0;
            }
            const btnCls = presente
                ? 'text-green-600 bg-green-50 cursor-pointer hover:bg-green-100'
                : 'text-slate-300 cursor-pointer hover:bg-slate-50';
            const icon = presente ? '<i class="fas fa-check"></i>' : '—';
            return `<td class="p-2 border-b text-center ${btnCls}" onclick="toggleNextGenAtt('${ng.id}','${d}',${presente})">${icon}</td>`;
        }).join('');

        // Reset racha calculation for display
        rachaAct = 0;
        rachaMax = 0;
        totalAsist = 0;
        sortedSabs.forEach(d => {
            if (recordsData.fechasSinCulto[d]) return; // SIN CULTO neutral
            const val = attMap[d];
            const presente = val === true || val === 1;
            if (presente) {
                totalAsist++;
                rachaAct++;
                if (rachaAct > rachaMax) rachaMax = rachaAct;
            } else {
                rachaAct = 0;
            }
        });

        return `<tr class="hover:bg-slate-50 transition-colors">
            <td class="p-2 border-b font-bold text-slate-800 whitespace-nowrap">${ng.nombreCompleto || ng.nombre}</td>
            <td class="p-2 border-b text-slate-500 text-[11px]">${ng.descripcion || ng.desc || ''}</td>
            ${tds}
            <td class="p-2 border-b text-center font-black text-slate-700">${totalAsist}</td>
            <td class="p-2 border-b text-center font-bold text-orange-500">${rachaMax}</td>
            <td class="p-2 border-b text-center">
                <button type="button" onclick="editNextGen('${ng.id}')" class="text-slate-400 hover:text-blue-500 mr-1"><i class="fas fa-edit"></i></button>
                <button type="button" onclick="deleteNextGen('${ng.id}')" class="text-slate-400 hover:text-red-500"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
}

function toggleNextGenAtt(ngId, date, currentlyPresent) {
    if (!currentPeriod) return;
    const monthKey = date.substring(0, 7);
    const ref = db.ref(`asistenciaNextGen/${monthKey}/${ngId}/fechas/${date}`);
    if (currentlyPresent) {
        ref.remove().then(() => initRecords()).catch(err => {
            console.error('[Records][NextGen] Error toggle:', err);
            alert('No se pudo guardar la asistencia de NextGen.');
        });
    } else {
        ref.set(true).then(() => initRecords()).catch(err => {
            console.error('[Records][NextGen] Error toggle:', err);
            alert('No se pudo guardar la asistencia de NextGen.');
        });
    }
}
window.toggleNextGenAtt = toggleNextGenAtt;

// ─────────────────────────────────────────────────────────────
// NEXTGEN MODAL
// ─────────────────────────────────────────────────────────────

function openNextGenModal(id) {
    const isEdit = !!id;
    document.getElementById('nextGenId').value = id || '';
    document.getElementById('nextGenNombre').value = isEdit && recordsData.nextGen[id] ? (recordsData.nextGen[id].nombreCompleto || recordsData.nextGen[id].nombre) : '';
    document.getElementById('nextGenDesc').value = isEdit && recordsData.nextGen[id] ? (recordsData.nextGen[id].descripcion || recordsData.nextGen[id].desc || '') : '';
    document.getElementById('nextGenModalTitle').textContent = isEdit ? 'Editar Adolescente' : 'Registrar Adolescente';
    openModalAnim('nextGenModal', 'nextGenModalContent');
}
window.openNextGenModal = openNextGenModal;

function editNextGen(id) { openNextGenModal(id); }
window.editNextGen = editNextGen;

function closeNextGenModal() { closeModalAnim('nextGenModal', 'nextGenModalContent'); }
window.closeNextGenModal = closeNextGenModal;

function saveNextGen() {
    const id = document.getElementById('nextGenId').value || db.ref('adolescentesApoyo').push().key;
    const nombre = document.getElementById('nextGenNombre').value.trim();
    const desc = document.getElementById('nextGenDesc').value.trim();
    if (!nombre) return alert('El nombre es obligatorio');
    db.ref('adolescentesApoyo/' + id).set({ nombreCompleto: nombre, descripcion: desc }).then(() => {
        closeNextGenModal();
        initRecords();
    }).catch(error => {
        console.error('[Records][NextGen] Error:', error);
        alert('No se pudo guardar el adolescente.');
    });
}
window.saveNextGen = saveNextGen;

function deleteNextGen(id) {
    if (!confirm('¿Eliminar este registro de NextGen? Los datos de asistencia guardados NO se eliminan.')) return;
    db.ref('adolescentesApoyo/' + id).remove().then(() => initRecords()).catch(error => {
        console.error('[Records][NextGen] Error:', error);
        alert('No se pudo eliminar el adolescente.');
    });
}
window.deleteNextGen = deleteNextGen;

// ─────────────────────────────────────────────────────────────
// INVITACIONES
// ─────────────────────────────────────────────────────────────

function renderInvitacionesTable() {
    const tbody = document.getElementById('invitacionesList');
    const empty = document.getElementById('invitacionesEmpty');
    if (!tbody) return;

    const data = Object.keys(recordsData.invitaciones).map(k => ({ id: k, ...recordsData.invitaciones[k] }));
    data.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

    if (!data.length) {
        tbody.innerHTML = '';
        if (empty) empty.classList.remove('hidden');
        return;
    }
    if (empty) empty.classList.add('hidden');

    tbody.innerHTML = data.map(inv => {
        const tipo = inv.invitadorTipo === 'nextgen'
            ? '<span class="px-1 py-0.5 rounded bg-purple-100 text-purple-700 text-[10px] font-bold">NG</span>'
            : '<span class="px-1 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-bold">J</span>';
        return `<tr class="hover:bg-slate-50 transition-colors">
            <td class="p-2 border-b text-slate-500">${formatDateEs(inv.fecha)}</td>
            <td class="p-2 border-b font-bold text-slate-700">${inv.invitadorNombreSnapshot || inv.invitadorId}</td>
            <td class="p-2 border-b">${tipo}</td>
            <td class="p-2 border-b font-bold text-blue-600">${inv.invitadoNombre || '—'}</td>
            <td class="p-2 border-b text-slate-500 text-xs">${inv.evento || '—'}</td>
            <td class="p-2 border-b text-right"><button type="button" onclick="deleteInvitacion('${inv.id}')" class="text-red-400 hover:text-red-600"><i class="fas fa-trash"></i></button></td>
        </tr>`;
    }).join('');
}

function openInvitacionModal() {
    if (!currentPeriod) return alert('Primero crea un período de récord.');
    document.getElementById('invitacionId').value = '';
    document.getElementById('invFecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('invNombre').value = '';
    document.getElementById('invEvento').value = 'Culto de Jóvenes';

    const sel = document.getElementById('invInvitador');
    sel.innerHTML = '<option value="">-- Seleccionar --</option>';
    const sorted = [...recordsStats].sort((a,b) => a.nombre.localeCompare(b.nombre));
    sorted.forEach(s => {
        const op = document.createElement('option');
        op.value = s.id;
        op.dataset.tipo = s.tipo;
        op.dataset.nombre = s.nombre;
        op.textContent = `${s.nombre} (${s.tipo === 'joven' ? 'Joven' : 'NextGen'})`;
        sel.appendChild(op);
    });

    openModalAnim('invitacionModal', 'invitacionModalContent');
}
window.openInvitacionModal = openInvitacionModal;

function closeInvitacionModal() { closeModalAnim('invitacionModal', 'invitacionModalContent'); }
window.closeInvitacionModal = closeInvitacionModal;

function saveInvitacion() {
    if (!currentPeriod) return;
    const invId = document.getElementById('invitacionId').value || db.ref(`invitaciones/${currentPeriod.id}`).push().key;
    const fecha = document.getElementById('invFecha').value;
    const sel = document.getElementById('invInvitador');
    const invitadorId = sel.value;
    const selOpt = sel.options[sel.selectedIndex];
    const invitadorTipo = selOpt ? selOpt.dataset.tipo : '';
    const invitadorNombreSnapshot = selOpt ? selOpt.dataset.nombre : '';
    const invitadoNombre = document.getElementById('invNombre').value.trim();
    const evento = document.getElementById('invEvento').value.trim();

    if (!fecha || !invitadorId || !invitadoNombre) return alert('Completa fecha, invitador e invitado.');

    db.ref(`invitaciones/${currentPeriod.id}/${invId}`).set({
        fecha, invitadorId, invitadorTipo, invitadorNombreSnapshot, invitadoNombre, evento
    }).then(() => {
        closeInvitacionModal();
        initRecords();
    }).catch(error => {
        console.error('[Records][Invitaciones] Error:', error);
        alert('No se pudo guardar la invitación.');
    });
}
window.saveInvitacion = saveInvitacion;

function deleteInvitacion(id) {
    if (!currentPeriod || !confirm('¿Eliminar esta invitación?')) return;
    db.ref(`invitaciones/${currentPeriod.id}/${id}`).remove().then(() => initRecords()).catch(error => {
        console.error('[Records][Invitaciones] Error:', error);
        alert('No se pudo eliminar la invitación.');
    });
}
window.deleteInvitacion = deleteInvitacion;

// ─────────────────────────────────────────────────────────────
// PREMIOS
// ─────────────────────────────────────────────────────────────

function openPremioModal(personaId, personaTipo) {
    if (!currentPeriod) return alert('No hay período activo.');
    const p = recordsStats.find(s => s.id === personaId);
    if (!p) return;

    document.getElementById('premioPersonaId').value = personaId;
    document.getElementById('premioPersonaTipo').value = personaTipo;
    document.getElementById('premioPersonaNombre').textContent = p.nombre;
    document.getElementById('premioFecha').value = new Date().toISOString().split('T')[0];

    openModalAnim('premioModal', 'premioModalContent');
}
window.openPremioModal = openPremioModal;

function closePremioModal() { closeModalAnim('premioModal', 'premioModalContent'); }
window.closePremioModal = closePremioModal;

function savePremio() {
    if (!currentPeriod) return;
    const personaId = document.getElementById('premioPersonaId').value;
    const personaTipo = document.getElementById('premioPersonaTipo').value;
    const p = recordsStats.find(s => s.id === personaId);
    const personaNombreSnapshot = p ? p.nombre : '';
    const tipoPremio = document.getElementById('premioTipo').value.trim();
    const fechaPremio = document.getElementById('premioFecha').value;

    if (!tipoPremio) return alert('Indica el tipo de premio.');

    const recId = db.ref(`reconocimientos/${currentPeriod.id}`).push().key;
    db.ref(`reconocimientos/${currentPeriod.id}/${recId}`).set({
        personaId, personaTipo, personaNombreSnapshot, tipoPremio, fechaPremio
    }).then(() => {
        closePremioModal();
        initRecords();
    }).catch(error => {
        console.error('[Records][Premios] Error:', error);
        alert('No se pudo guardar el premio.');
    });
}
window.savePremio = savePremio;

// ─────────────────────────────────────────────────────────────
// PERÍODOS
// ─────────────────────────────────────────────────────────────

function showNewPeriodForm() {
    document.getElementById('periodFormPanel').classList.remove('hidden');
    if (currentPeriod && !currentPeriod.cerrado) {
        document.getElementById('rpNombre').value = currentPeriod.nombre || '';
        document.getElementById('rpFechaInicio').value = currentPeriod.fechaInicio || '';
        document.getElementById('rpFechaFin').value = currentPeriod.fechaFin || '';
    } else {
        document.getElementById('rpNombre').value = '';
        document.getElementById('rpFechaInicio').value = '';
        document.getElementById('rpFechaFin').value = '';
    }
}
window.showNewPeriodForm = showNewPeriodForm;

function hidePeriodForm() {
    document.getElementById('periodFormPanel').classList.add('hidden');
}
window.hidePeriodForm = hidePeriodForm;

function saveRecordPeriod() {
    const nombre = document.getElementById('rpNombre').value.trim();
    const fechaInicio = document.getElementById('rpFechaInicio').value;
    const fechaFin = document.getElementById('rpFechaFin').value;

    if (!fechaInicio) return alert('La fecha de inicio es obligatoria.');

    const data = { nombre: nombre || `Período ${fechaInicio}`, fechaInicio, fechaFin: fechaFin || null };

    // If editing current open period
    if (currentPeriod && !currentPeriod.cerrado) {
        db.ref(`recordPeriods/${currentPeriod.id}`).update(data).then(() => {
            hidePeriodForm();
            initRecords();
        }).catch(err => {
            console.error('[Records] Error al guardar período:', err);
            alert('Error al guardar el período. Verifique permisos.');
        });
    } else {
        // Create new
        const id = db.ref('recordPeriods').push().key;
        data.cerrado = false;
        db.ref(`recordPeriods/${id}`).set(data).then(() => {
            hidePeriodForm();
            initRecords();
        }).catch(err => {
            console.error('[Records] Error al crear período:', err);
            alert('Error al crear el período. Verifique permisos.');
        });
    }
}
window.saveRecordPeriod = saveRecordPeriod;

function closeRecordPeriod() {
    if (!currentPeriod || currentPeriod.cerrado) return;
    if (!confirm(`¿Cerrar el período "${currentPeriod.nombre}"? Esto lo marcará como finalizado.`)) return;
    const curDate = new Date();
    const todayLocal = `${curDate.getFullYear()}-${String(curDate.getMonth() + 1).padStart(2, '0')}-${String(curDate.getDate()).padStart(2, '0')}`;
    db.ref(`recordPeriods/${currentPeriod.id}`).update({
        cerrado: true,
        fechaCierre: todayLocal,
        fechaFin: currentPeriod.fechaFin || todayLocal
    }).then(() => initRecords()).catch(err => {
        console.error('[Records] Error al cerrar período:', err);
        alert('Error al cerrar el período. Verifique permisos.');
    });
}
window.closeRecordPeriod = closeRecordPeriod;

// ─────────────────────────────────────────────────────────────
// HELPERS MODAL ANIMACIÓN
// ─────────────────────────────────────────────────────────────

function openModalAnim(modalId, contentId) {
    const modal = document.getElementById(modalId);
    const content = document.getElementById(contentId);
    if (!modal) return;
    modal.classList.remove('hidden');
    if (content) setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function closeModalAnim(modalId, contentId) {
    const modal = document.getElementById(modalId);
    const content = document.getElementById(contentId);
    if (!modal) return;
    if (content) {
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');
    }
    setTimeout(() => modal.classList.add('hidden'), 200);
}
