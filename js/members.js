/**
 * FireGen V3.0 — js/members.js
 * ─────────────────────────────────────────────────────────────
 * MÓDULO DE MIEMBROS (Base Maestro)
 * Gestiona el CRUD completo de miembros, el expediente digital
 * y el directorio profesional.
 *
 * Dependencias: firebase-config.js, utils.js
 * ─────────────────────────────────────────────────────────────
 */

/* ── Estado del módulo ── */
let members = [];
let currentExpedienteFid = null;

// Referencia y callback del listener de miembros (para poder desregistrarlo)
let membersRef = null;
let membersCallback = null;

/**
 * initMembersListener — Abre el listener reactivo de Firebase para miembros.
 * FIX: FIR-03 — Guarda referencias para poder hacer .off() preciso.
 * FIX: JS-07 — Incluye handler de error visible.
 * @param {Function} onUpdate - Callback llamado cada vez que cambian los miembros
 */
function initMembersListener(onUpdate) {
    membersRef = db.ref('miembros');
    membersCallback = membersRef.on('value',
        snap => {
            hideConnectionError();
            const data = snap.val();
            members = data
                ? Object.entries(data).map(([k, v]) => ({ ...v, firebaseId: k }))
                : [];
            members.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));
            if (typeof onUpdate === 'function') onUpdate();
        },
        error => {
            console.error('[FireGen Members] Error Firebase:', error.code, error.message);
            showConnectionError('⚠️ Error al cargar miembros. Verifica tu conexión o las reglas de Firebase.');
        }
    );
}

/**
 * destroyMembersListener — Desregistra el listener de miembros.
 * Llamar al hacer logout para liberar recursos.
 */
function destroyMembersListener() {
    if (membersRef && membersCallback) {
        membersRef.off('value', membersCallback);
        membersRef = null;
        membersCallback = null;
    }
}

/**
 * renderMaster — Renderiza la tabla desktop y lista móvil de miembros.
 * FIX: SEC-01 — Todos los datos del usuario se escapan con escHtml().
 * FIX: SEC-03 — Se usan data-fid + event delegation en lugar de onclick inline.
 */
function renderMaster() {
    const search   = (document.getElementById('searchInput').value || '').toLowerCase();
    const filtered = members.filter(m => (m.nombre || '').toLowerCase().includes(search));

    // ── Tabla Desktop ────────────────────────────────────────
    const body  = document.getElementById('masterBody');
    const empty = document.getElementById('emptyMaster');
    body.innerHTML = '';
    empty.classList.toggle('hidden', filtered.length > 0);

    filtered.forEach((m, i) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-slate-50 transition-colors';

        const photoInitial = escHtml((m.nombre || '?').charAt(0).toUpperCase());
        const safePhoto = m.fotoURL && isSafeUrl(m.fotoURL) ? escHtml(m.fotoURL) : '';

        row.innerHTML = `
            <td class="p-4 font-bold text-slate-400 text-sm">${i + 1}</td>
            <td class="p-4">
                <button class="member-name-btn" data-action="expediente" data-fid="${escHtml(m.firebaseId)}">${escHtml(m.nombre)}</button>
            </td>
            <td class="p-4 text-slate-600">${calculateAge(m.fechaNac)} años</td>
            <td class="p-4">
                <div class="text-xs font-bold text-blue-600">${escHtml(m.telefono) || '—'}</div>
                <div class="text-[10px] text-slate-400 italic">${escHtml(m.social) || ''}</div>
            </td>
            <td class="p-4"><span class="status-badge ${getStatusClass(m.estadoEspiritual)}">${escHtml(m.estadoEspiritual)}</span></td>
            <td class="p-4 text-xs text-slate-600">${escHtml(m.areaServicio) || '—'}</td>
            <td class="p-4 font-bold text-slate-500 uppercase text-xs">${escHtml(m.lider) || '—'}</td>
            <td class="p-4"><span class="status-badge ${getEngagementClass(m.estadoAsistencia)}">${escHtml(m.estadoAsistencia) || 'Sin determinar'}</span></td>
            <td class="p-4 no-print">
                <div class="flex items-center gap-2">
                    <button data-action="expediente" data-fid="${escHtml(m.firebaseId)}" title="Ver Perfil"
                        class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-orange-100 text-slate-400 hover:text-orange-600 transition-all">
                        <i class="fas fa-eye text-xs"></i>
                    </button>
                </div>
            </td>`;
        body.appendChild(row);
    });

    // ── Lista Móvil ──────────────────────────────────────────
    const mobileList  = document.getElementById('masterMobileList');
    const mobileEmpty = document.getElementById('emptyMasterMobile');
    Array.from(mobileList.children).forEach(c => { if (c.id !== 'emptyMasterMobile') c.remove(); });
    mobileEmpty.classList.toggle('hidden', filtered.length > 0);

    filtered.forEach(m => {
        const card = document.createElement('div');
        card.className = 'mobile-member-card';
        const safePhoto  = m.fotoURL && isSafeUrl(m.fotoURL) ? escHtml(m.fotoURL) : '';
        const initial    = escHtml((m.nombre || '?').charAt(0).toUpperCase());
        const edad       = calculateAge(m.fechaNac);
        const phone      = (m.telefono || '').replace(/\D/g, '');

        const photoHtml = safePhoto
            ? `<img src="${safePhoto}" class="mobile-member-photo" onerror="this.style.display='none'" alt="Foto">`
            : `<div class="mobile-member-photo-ph">${initial}</div>`;

        card.innerHTML = `
            ${photoHtml}
            <div class="mobile-member-info">
                <div class="mobile-member-name">${escHtml(m.nombre)}</div>
                <div class="mobile-member-sub">${edad} años · ${escHtml(m.areaServicio) || 'Sin área'}</div>
                <div class="flex flex-wrap gap-1 mt-1">
                    <span class="status-badge ${getStatusClass(m.estadoEspiritual)}" style="font-size:0.6rem;padding:2px 6px">${escHtml(m.estadoEspiritual)}</span>
                    <span class="status-badge ${getEngagementClass(m.estadoAsistencia)}" style="font-size:0.6rem;padding:2px 6px">${escHtml(m.estadoAsistencia) || 'Sin determinar'}</span>
                </div>
                <div class="mobile-member-actions">
                    <button data-action="expediente" data-fid="${escHtml(m.firebaseId)}" class="flex items-center gap-1 text-[11px] font-bold bg-orange-50 text-orange-600 px-2 py-1 rounded-lg border border-orange-100">
                        <i class="fas fa-eye text-[10px]"></i> Ver
                    </button>
                    ${phone ? `<a href="https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}" target="_blank" rel="noopener" class="flex items-center gap-1 text-[11px] font-bold bg-green-50 text-green-700 px-2 py-1 rounded-lg border border-green-100"><i class="fab fa-whatsapp text-[10px]"></i> WA</a>` : ''}
                </div>
            </div>`;
        mobileList.appendChild(card);
    });

    updateStats();
}

/**
 * initMasterEventDelegation — Configura event delegation para la tabla y lista móvil.
 * FIX: SEC-03 — Elimina onclick inline, usa data attributes.
 */
function initMasterEventDelegation() {
    function handleAction(e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const { action, fid } = btn.dataset;
        const fromDir = !!btn.closest('#dirBody');

        if (action === 'expediente') {
            if (fromDir) {
                closeDirectorio();
                setTimeout(() => openExpediente(fid), 350);
            } else {
                openExpediente(fid);
            }
        } else if (action === 'edit') {
            if (fromDir) {
                // cerrar directorio primero, luego abrir modal
                closeDirectorio();
                setTimeout(() => editMember(fid), 350);
            } else {
                editMember(fid);
            }
        } else if (action === 'delete') {
            deleteMember(fid);
        }
    }
    document.getElementById('masterBody').addEventListener('click', handleAction);
    document.getElementById('masterMobileList').addEventListener('click', handleAction);
    const dirBody = document.getElementById('dirBody');
    if (dirBody) dirBody.addEventListener('click', handleAction);
}

/* ── CRUD ─────────────────────────────────────────────────── */

function openNewMemberModal() {
    document.getElementById('memberForm').reset();
    document.getElementById('editMemberId').value = '';
    document.getElementById('modalTitle').textContent = 'NUEVO MIEMBRO FIREGEN';
    document.getElementById('fotoPreview').classList.add('hidden');
    document.getElementById('fotoPreviewPlaceholder').classList.remove('hidden');
    
    const fechaInc = document.getElementById('fechaIncorporacionInput');
    if (fechaInc) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        fechaInc.value = `${yyyy}-${mm}-${dd}`;
    }
    
    openModal('userModal');
}

function editMember(fid) {
    const m = members.find(x => x.firebaseId === fid);
    if (!m) return;
    const form = document.getElementById('memberForm');
    form.reset();
    document.getElementById('editMemberId').value = fid;
    document.getElementById('modalTitle').textContent = 'EDITAR MIEMBRO';

    form.querySelector('[name="nombre"]').value              = m.nombre || '';
    form.querySelector('[name="fechaNac"]').value            = m.fechaNac || '';
    form.querySelector('[name="telefono"]').value            = m.telefono || '';
    form.querySelector('[name="social"]').value              = m.social || '';
    form.querySelector('[name="estadoEspiritual"]').value    = m.estadoEspiritual || 'Nuevo';
    form.querySelector('[name="areaServicio"]').value        = m.areaServicio || '';
    form.querySelector('[name="cargo"]').value               = m.cargo || '';
    form.querySelector('[name="lider"]').value               = m.lider || '';
    form.querySelector('[name="estadoAsistencia"]').value    = m.estadoAsistencia || '';
    form.querySelector('[name="fechaBautismo"]').value       = m.fechaBautismo || '';
    form.querySelector('[name="domicilio"]').value           = m.domicilio || '';
    form.querySelector('[name="fotoURL"]').value             = m.fotoURL || '';
    form.querySelector('[name="descripcionPersonal"]').value = m.descripcionPersonal || '';

    const preview     = document.getElementById('fotoPreview');
    const placeholder = document.getElementById('fotoPreviewPlaceholder');
    if (m.fotoURL && isSafeUrl(m.fotoURL)) {
        preview.src = m.fotoURL;
        preview.classList.remove('hidden');
        placeholder.classList.add('hidden');
    } else {
        preview.classList.add('hidden');
        placeholder.classList.remove('hidden');
    }
    // Rellenar campo fechaIncorporacion
    const fechaInc = document.getElementById('fechaIncorporacionInput');
    if (fechaInc) fechaInc.value = m.fechaIncorporacion || '';
    openModal('userModal');
}

function editFromExpediente() {
    const fid = currentExpedienteFid;
    if (!fid) return;
    closeExpediente();
    // esperar animacion de cierre del overlay antes de abrir el modal
    setTimeout(() => editMember(fid), 350);
}

function deleteFromExpediente() {
    if (currentExpedienteFid) {
        const fid = currentExpedienteFid;
        closeExpediente();
        setTimeout(() => deleteMember(fid), 300);
    }
}

function deleteMember(fid) {
    if (!confirm('¿Eliminar este registro permanentemente?')) return;
    db.ref('miembros/' + fid).remove()
        .catch(err => console.error('[FireGen] Error al eliminar:', err));
}

function previewFoto() {
    const val         = document.getElementById('fotoURLInput').value;
    const preview     = document.getElementById('fotoPreview');
    const placeholder = document.getElementById('fotoPreviewPlaceholder');
    if (val && isSafeUrl(val)) {
        preview.src = val;
        preview.classList.remove('hidden');
        placeholder.classList.add('hidden');
    } else {
        preview.classList.add('hidden');
        placeholder.classList.remove('hidden');
    }
}

/* ── Formulario submit ─────────────────────────────────────── */
function initMemberForm() {
    document.getElementById('memberForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const fd     = new FormData(this);
        const editId = document.getElementById('editMemberId').value;
        const fotoURL = fd.get('fotoURL') || '';

        const payload = {
            nombre:              fd.get('nombre'),
            fechaNac:            fd.get('fechaNac'),
            telefono:            fd.get('telefono'),
            social:              fd.get('social'),
            estadoEspiritual:    fd.get('estadoEspiritual'),
            areaServicio:        fd.get('areaServicio'),
            cargo:               fd.get('cargo'),
            lider:               fd.get('lider'),
            estadoAsistencia:    fd.get('estadoAsistencia'),
            fechaBautismo:       fd.get('fechaBautismo'),
            domicilio:           fd.get('domicilio'),
            fotoURL:             isSafeUrl(fotoURL) ? fotoURL : '',
            descripcionPersonal: fd.get('descripcionPersonal')
        };

        // FASE3-S1: Gestionar fechaIncorporacion
        const fechaIncRaw = fd.get('fechaIncorporacion') || '';
        if (editId) {
            // En edición: preservar la fecha existente si el campo está vacío
            const existingMember2 = members.find(m => m.firebaseId === editId);
            payload.fechaIncorporacion = fechaIncRaw ||
                (existingMember2 && existingMember2.fechaIncorporacion) || '';
        } else {
            // En creación: usar la fecha de hoy si no se preinformó
            const today = new Date();
            const yy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            payload.fechaIncorporacion = fechaIncRaw || `${yy}-${mm}-${dd}`;
        }

        if (editId) {
            // Verificar si el estado espiritual o asistencia cambió manualmente para registrar en el historial
            const existingMember = members.find(m => m.firebaseId === editId);
            if (existingMember && existingMember.estadoEspiritual !== payload.estadoEspiritual) {
                if (typeof logHistoryEvent === 'function') {
                    logHistoryEvent(editId, 'Cambio de Estado Espiritual', existingMember.estadoEspiritual || 'Nuevo', payload.estadoEspiritual);
                }
            }
            if (existingMember && existingMember.estadoAsistencia !== payload.estadoAsistencia) {
                if (typeof logHistoryEvent === 'function') {
                    logHistoryEvent(editId, 'Cambio de Asistencia Manual', existingMember.estadoAsistencia || 'Activo', payload.estadoAsistencia);
                }
            }

            db.ref('miembros/' + editId).set(payload)
                .catch(err => console.error('[FireGen] Error al actualizar:', err));
        } else {
            const newRef = db.ref('miembros').push();
            newRef.set(payload)
                .then(() => {
                    if (typeof logHistoryEvent === 'function') {
                        logHistoryEvent(newRef.key, 'Creación de Miembro', '', payload.estadoEspiritual, 'Estado inicial');
                    }
                })
                .catch(err => console.error('[FireGen] Error al crear miembro:', err));
        }
        this.reset();
        closeModal('userModal');
    });

    document.getElementById('fotoURLInput').addEventListener('input', previewFoto);
}

/* ── EXPEDIENTE DIGITAL ────────────────────────────────────── */

function openExpediente(fid) {
    const m = members.find(x => x.firebaseId === fid);
    if (!m) return;
    currentExpedienteFid = fid;

    // Avatar — FIX: SEC-04 validar URL antes de usar en src
    const avatarEl = document.getElementById('expAvatar');
    const initial  = escHtml((m.nombre || '?').charAt(0).toUpperCase());
    if (m.fotoURL && isSafeUrl(m.fotoURL)) {
        avatarEl.innerHTML = `<img src="${escHtml(m.fotoURL)}" alt="Foto" class="exp-avatar" onerror="this.style.display='none'">`;
    } else {
        avatarEl.innerHTML = `<div class="exp-avatar-placeholder">${initial}</div>`;
    }

    // Usar textContent para evitar XSS — FIX: SEC-01
    document.getElementById('expNombre').textContent         = m.nombre || '—';
    document.getElementById('expEstadoEspiritual').textContent = m.estadoEspiritual || '—';

    const badge = document.getElementById('expEngagementBadge');
    badge.textContent = m.estadoAsistencia || 'Sin determinar';
    badge.className   = 'text-xs font-bold px-3 py-1 rounded-full ' + getEngagementClass(m.estadoAsistencia || '');

    document.getElementById('expEdad').textContent     = m.fechaNac ? calculateAge(m.fechaNac) + ' años' : '—';
    document.getElementById('expTelefono').textContent = m.telefono || '—';
    document.getElementById('expSocial').textContent   = m.social || '—';
    document.getElementById('expArea').textContent     = m.areaServicio || '—';
    document.getElementById('expCargo').textContent    = m.cargo || '—';
    document.getElementById('expLider').textContent    = m.lider || '—';
    document.getElementById('expDomicilio').textContent = m.domicilio || 'Sin domicilio registrado';
    document.getElementById('expDesc').textContent     = m.descripcionPersonal || 'Sin notas.';

    if (m.fechaNac) {
        const [y, mo, d] = m.fechaNac.split('-');
        document.getElementById('expFechaNac').textContent = `${d}/${mo}/${y}`;
    } else { document.getElementById('expFechaNac').textContent = '—'; }

    if (m.fechaBautismo) {
        const [y, mo, d] = m.fechaBautismo.split('-');
        document.getElementById('expFechaBautismo').textContent = `${d}/${mo}/${y}`;
    } else { document.getElementById('expFechaBautismo').textContent = '—'; }

    // WhatsApp
    const phone  = (m.telefono || '').replace(/\D/g, '');
    const waLink = document.getElementById('expWhatsapp');
    if (phone) {
        waLink.href = `https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=Hola%20${encodeURIComponent(m.nombre || '')}%2C%20te%20contactamos%20del%20ministerio%20FireGen.`;
        waLink.classList.remove('opacity-50', 'pointer-events-none');
    } else {
        waLink.href = '#';
        waLink.classList.add('opacity-50', 'pointer-events-none');
    }

    // Maps
    const mapsLink = document.getElementById('expMaps');
    if (m.domicilio) {
        mapsLink.href = `https://www.google.com/maps/search/${encodeURIComponent(m.domicilio)}`;
        mapsLink.classList.remove('opacity-50', 'pointer-events-none');
    } else {
        mapsLink.href = '#';
        mapsLink.classList.add('opacity-50', 'pointer-events-none');
    }

    document.getElementById('expedienteOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeExpediente() {
    document.getElementById('expedienteOverlay').classList.remove('active');
    document.body.style.overflow = '';
    currentExpedienteFid = null;
}

function handleExpedienteBackdropClick(e) {
    if (e.target.classList.contains('exp-backdrop') ||
        e.target === document.getElementById('expedienteOverlay')) {
        closeExpediente();
    }
}

/* ── DIRECTORIO PROFESIONAL ────────────────────────────────── */

function openDirectorio() {
    renderDirectorio();
    document.getElementById('directorioOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeDirectorio() {
    document.getElementById('directorioOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

function renderDirectorio() {
    const query    = (document.getElementById('dirSearch').value || '').toLowerCase();
    const filtered = members.filter(m => (m.nombre || '').toLowerCase().includes(query));
    const body     = document.getElementById('dirBody');
    const count    = document.getElementById('dirCount');
    count.textContent = `${filtered.length} jóvenes registrados`;
    body.innerHTML = '';

    if (!filtered.length) {
        body.innerHTML = `<div class="text-center py-20 text-slate-400 italic">No hay resultados para "${escHtml(query)}"</div>`;
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4';

    filtered.forEach(m => {
        const card    = document.createElement('div');
        card.className = 'dir-card';
        const edad    = calculateAge(m.fechaNac);
        const phone   = (m.telefono || '').replace(/\D/g, '');
        const waUrl   = phone
            ? `https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=Hola%20${encodeURIComponent(m.nombre || '')}%2C%20saludos%20del%20ministerio%20FireGen.`
            : null;

        const safePhoto = m.fotoURL && isSafeUrl(m.fotoURL) ? escHtml(m.fotoURL) : '';
        const initial   = escHtml((m.nombre || '?').charAt(0).toUpperCase());
        const photoHtml = safePhoto
            ? `<img src="${safePhoto}" class="dir-photo" onerror="this.style.display='none'" alt="Foto">`
            : `<div class="dir-photo-placeholder">${initial}</div>`;

        let bautismoStr = '';
        if (m.fechaBautismo) {
            const [y, mo, d] = m.fechaBautismo.split('-');
            bautismoStr = `· Bautizado ${d}/${mo}/${y}`;
        }

        // Construir card usando textContent donde sea posible
        card.innerHTML = `
            ${photoHtml}
            <div class="dir-info">
                <div class="dir-name">${escHtml(m.nombre)}</div>
                <div class="dir-meta">
                    <span>${edad} años</span>
                    ${m.domicilio ? `<span>· ${escHtml(m.domicilio)}</span>` : ''}
                </div>
                <div class="flex flex-wrap gap-1 mb-1">
                    <span class="dir-badge ${getStatusClass(m.estadoEspiritual)}">${escHtml(m.estadoEspiritual)}</span>
                    <span class="dir-badge ${getEngagementClass(m.estadoAsistencia)}">${escHtml(m.estadoAsistencia) || 'Sin determinar'}</span>
                </div>
                <div class="dir-spirit">
                    ${m.areaServicio ? `<i class="fas fa-church text-orange-400 text-[10px]"></i> ${escHtml(m.areaServicio)}` : ''}
                    ${m.cargo ? ` · <strong>${escHtml(m.cargo)}</strong>` : ''}
                    ${escHtml(bautismoStr)}
                </div>
                ${waUrl
                    ? `<a href="${waUrl}" target="_blank" rel="noopener" class="dir-wa-btn"><i class="fab fa-whatsapp"></i> ${escHtml(m.telefono)}</a>`
                    : (m.telefono ? `<span class="dir-wa-btn" style="background:#94a3b8;cursor:default">${escHtml(m.telefono)}</span>` : '')
                }
                <div class="mt-2 flex gap-2">
                    <button data-action="expediente" data-fid="${escHtml(m.firebaseId)}" class="flex items-center gap-1 text-[11px] font-bold bg-orange-50 text-orange-600 px-2 py-1 rounded-lg border border-orange-100">
                        <i class="fas fa-eye text-[10px]"></i> Ver
                    </button>
                    <button data-action="edit" data-fid="${escHtml(m.firebaseId)}" class="flex items-center gap-1 text-[11px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                        <i class="fas fa-pencil-alt text-[10px]"></i> Editar
                    </button>
                </div>
            </div>`;
        grid.appendChild(card);
    });
    body.appendChild(grid);
}

/* ── ESTADÍSTICAS ──────────────────────────────────────────── */

function updateStats() {
    document.getElementById('stat-total').textContent     = members.length;
    document.getElementById('stat-lideres').textContent   = members.filter(m => m.estadoEspiritual === 'Líder' || m.estadoEspiritual === 'Lider').length;
    document.getElementById('stat-bautizados').textContent = members.filter(m => m.estadoEspiritual === 'Bautizado').length;
    const estadosRiesgo = ['Inconstante', 'Enfriándose', 'Alejándose'];
    document.getElementById('stat-riesgo').textContent    = members.filter(m => {
        const estado = typeof normalizeAttendanceStatus === 'function' ? normalizeAttendanceStatus(m.estadoAsistencia) : m.estadoAsistencia;
        return estadosRiesgo.includes(estado);
    }).length;
}

function syncServiceCounter() {
    const count = members.filter(m =>
        (m.areaServicio && m.areaServicio.trim() !== '' && m.areaServicio.trim().toLowerCase() !== 'ninguna') ||
        m.estadoEspiritual === 'Líder' || m.estadoEspiritual === 'Lider'
    ).length;
    document.getElementById('inp-servicio').value = count;
    document.getElementById('rep-servicio-total').textContent = count;
    const p = document.getElementById('repPeriodo').value;
    if (p) db.ref('informes/' + p).update({ servicio: count }).catch(() => {});
}

function syncAlejadosCounter() {
    // FASE3-S1: Usar normalizeAttendanceStatus para compatibilidad con datos históricos
    const alejados = members.filter(m => {
        const estado = (typeof normalizeAttendanceStatus === 'function')
            ? normalizeAttendanceStatus(m.estadoAsistencia)
            : m.estadoAsistencia;
        return estado === 'Alejándose';
    }).length;
    document.getElementById('inp-alejados').value = alejados;
    const p = document.getElementById('repPeriodo').value;
    if (p) db.ref('informes/' + p).update({ alejados }).catch(() => {});
}

/* ── EXPORTAR CSV ──────────────────────────────────────────── */

function exportMaster() {
    if (!members.length) return;
    let csv = "ID,Nombre,Edad,Telefono,Social,Estado Espiritual,Cargo,Area Servicio,Lider,Estatus Asistencia,F. Bautismo,Domicilio\n";
    members.forEach((m, i) => {
        csv += `${i + 1},"${m.nombre || ''}",${calculateAge(m.fechaNac)},"${m.telefono || ''}","${m.social || ''}","${m.estadoEspiritual || ''}","${m.cargo || ''}","${m.areaServicio || ''}","${m.lider || ''}","${m.estadoAsistencia || ''}","${m.fechaBautismo || ''}","${m.domicilio || ''}"\n`;
    });
    downloadCSV(csv, "FireGen_BaseMaestro.csv");
}


