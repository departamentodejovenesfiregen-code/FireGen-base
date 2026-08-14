/**
 * FireGen — js/notificaciones.js
 * ─────────────────────────────────────────────────────────────
 * Módulo centralizado de Notificaciones Internas
 * Etapa 4 / Build B3.275
 */

let _notifListenerRef = null;

/* =========================================================================
 * FUNCIONES PARA EL COORDINADOR (ENVÍO)
 * ========================================================================= */
window.toggleAllDestinatarios = function(source) {
    const checkboxes = document.querySelectorAll('input[name="destinatarios"]');
    checkboxes.forEach(cb => cb.checked = source.checked);
};

window.enviarNotificacionMultiple = async function() {
    // Evitar envío doble
    const btn = document.querySelector('button[onclick="enviarNotificacionMultiple()"]');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Enviando...';
    }

    const checkboxes = document.querySelectorAll('input[name="destinatarios"]:checked');
    const destinatarios = Array.from(checkboxes).map(cb => cb.value);
    const titulo = document.getElementById('notifTitulo').value.trim();
    const mensaje = document.getElementById('notifMensaje').value.trim();

    if (destinatarios.length === 0) { 
        if (typeof showToast === 'function') showToast('Selecciona al menos un destinatario.', 'error');
        else alert('Selecciona al menos un destinatario.'); 
        _resetNotifBtn(btn);
        return; 
    }
    if (!titulo || !mensaje) { 
        if (typeof showToast === 'function') showToast('Completa título y mensaje.', 'error');
        else alert('Completa título y mensaje.'); 
        _resetNotifBtn(btn);
        return; 
    }

    const currentUser = auth.currentUser;
    const updates = {};
    const timestamp = Date.now();
    const baseId = db.ref().child('notificaciones').push().key;

    destinatarios.forEach((uid, index) => {
        const notifId = baseId + '_' + index;
        updates[`notificaciones/${uid}/${notifId}`] = {
            titulo, // Estos valores están escapados luego al renderizarse en UI
            mensaje,
            fecha: timestamp,
            leida: false,
            tipo: 'general',
            creadoPorUid: currentUser.uid,
            creadoPorNombre: currentUser.displayName || currentUser.email
        };
    });

    try {
        await db.ref().update(updates);
        if (typeof showToast === 'function') {
            showToast(`Notificación enviada a ${destinatarios.length} usuario(s).`, 'success');
        } else {
            alert(`Notificación enviada a ${destinatarios.length} usuario(s).`);
        }
        document.getElementById('notifTitulo').value = '';
        document.getElementById('notifMensaje').value = '';
        const checkAll = document.getElementById('checkAllDest');
        if (checkAll) checkAll.checked = false;
        toggleAllDestinatarios({checked: false});
    } catch(err) {
        if (typeof showToast === 'function') showToast('Error al enviar: ' + err.message, 'error');
        else alert('Error al enviar notificaciones: ' + err.message);
    } finally {
        _resetNotifBtn(btn);
    }
};

function _resetNotifBtn(btn) {
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane mr-1"></i> Enviar Mensaje';
    }
}

/* =========================================================================
 * FUNCIONES PARA EL USUARIO (NOTIFICACIONES PROPIAS)
 * ========================================================================= */
window.openNotificacionesOverlay = function() {
    const overlay = document.getElementById('notificacionesOverlay');
    if (overlay) overlay.classList.add('active');
    loadNotificacionesPropias();
};

window.closeNotificacionesOverlay = function() {
    const overlay = document.getElementById('notificacionesOverlay');
    if (overlay) overlay.classList.remove('active');
};

window.loadNotificacionesPropias = function() {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const container = document.getElementById('notificaciones-container');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-10"><i class="fas fa-circle-notch fa-spin text-orange-500 text-2xl"></i></div>';

    db.ref(`notificaciones/${uid}`).once('value').then(snap => {
        const data = snap.val() || {};
        const notifs = Object.entries(data).map(([id, n]) => ({ id, ...n }));
        notifs.sort((a,b) => b.fecha - a.fecha);

        if (notifs.length === 0) {
            container.innerHTML = '<div class="text-center py-10 text-slate-500 italic">No tienes notificaciones nuevas.</div>';
            return;
        }

        container.innerHTML = '<div class="space-y-3">' + notifs.map(n => {
            const tituloEscapado = escHtml(n.titulo || 'Sin título');
            const mensajeEscapado = escHtml(n.mensaje || '');
            return `
            <div class="bg-white p-4 rounded-2xl shadow-sm border ${n.leida ? 'border-slate-200 opacity-60' : 'border-orange-300 border-l-4 border-l-orange-500'} relative">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-black text-slate-800 text-sm flex items-center gap-2">
                        <img src="assets/icons/icon-192.png" alt="FireGen" class="w-4 h-4 object-contain opacity-50">
                        ${tituloEscapado}
                    </h4>
                    <span class="text-[10px] text-slate-400">${new Date(n.fecha).toLocaleString()}</span>
                </div>
                <p class="text-xs text-slate-600">${mensajeEscapado}</p>
                ${!n.leida ? `<button onclick="marcarNotificacionLeida('${n.id}')" class="mt-3 text-[10px] font-bold text-orange-500 bg-orange-50 px-3 py-1 rounded-full hover:bg-orange-100 transition-colors">Marcar como leída</button>` : ''}
            </div>
        `;
        }).join('') + '</div>';
    }).catch(err => {
        container.innerHTML = `<div class="text-red-500 text-center py-4">Error al cargar: ${escHtml(err.message)}</div>`;
    });
};

window.marcarNotificacionLeida = async function(id) {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
        await db.ref(`notificaciones/${uid}/${id}/leida`).set(true);
        loadNotificacionesPropias(); // recargar la vista
    } catch(err) {
        if (typeof showToast === 'function') showToast('Error: ' + err.message, 'error');
        else alert('Error: ' + err.message);
    }
};

window.listenNotificacionesCount = function(uid) {
    if (_notifListenerRef) {
        _notifListenerRef.off('value');
    }
    _notifListenerRef = db.ref(`notificaciones/${uid}`);
    
    _notifListenerRef.on('value', snap => {
        const badge = document.getElementById('notifBadge');
        if (!badge) return;
        const data = snap.val() || {};
        let unread = 0;
        Object.values(data).forEach(n => { if (!n.leida) unread++; });
        if (unread > 0) {
            badge.textContent = unread;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    });
};
