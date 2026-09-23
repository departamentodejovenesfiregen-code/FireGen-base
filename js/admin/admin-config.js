/**
 * FireGen V3.0 — js/admin-config.js
 * ─────────────────────────────────────────────────────────────
 * MÓDULO DE CONFIGURACIÓN DEL SISTEMA (Recomendación implementada)
 * Permite al administrador editar nombre, fechas y logos dinámicamente.
 * ─────────────────────────────────────────────────────────────
 */

document.addEventListener('DOMContentLoaded', () => {
    // Escuchar cuando la config global esté lista para poblar el formulario
    window.addEventListener('configLoaded', populateConfigForm);
    const configForm = document.getElementById('adminConfigForm');
    if (configForm) {
        configForm.addEventListener('submit', handleConfigSubmit);
    }
});

function populateConfigForm() {
    if (!AppConfig || !AppConfig.current) return;

    const cfg = AppConfig.current;
    document.getElementById('cfgAppName').value = cfg.appName || '';
    document.getElementById('cfgMinistryName').value = cfg.ministryName || '';
    document.getElementById('cfgChurchName').value = cfg.churchName || '';
    document.getElementById('cfgAdminEmail').value = cfg.adminEmail || '';

    if (cfg.period) {
        document.getElementById('cfgPeriodStart').value = cfg.period.start || '';
        document.getElementById('cfgPeriodEnd').value = cfg.period.end || '';
    }
}

function handleConfigSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('cfgSubmitBtn');
    submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Guardando...';
    submitBtn.disabled = true;

    const newConfig = {
        appName: document.getElementById('cfgAppName').value.trim(),
        ministryName: document.getElementById('cfgMinistryName').value.trim(),
        churchName: document.getElementById('cfgChurchName').value.trim(),
        adminEmail: document.getElementById('cfgAdminEmail').value.trim(),
        period: {
            start: document.getElementById('cfgPeriodStart').value,
            end: document.getElementById('cfgPeriodEnd').value
        }
    };

    db.ref('configuracion').update(newConfig)
        .then(() => {
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Configuración Guardada';
            submitBtn.classList.replace('from-orange-500', 'from-green-500');
            submitBtn.classList.replace('to-orange-600', 'to-green-600');

            // Recargar la página después de 1 segundo para aplicar todos los cambios globales
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        })
        .catch(err => {
            console.error('Error al guardar configuración:', err);
            alert('Error al guardar: ' + err.message);
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
            submitBtn.disabled = false;
        });
}

// ====== GESTIÓN DE TESORERÍA (ADMIN) ======
async function cargarDatosTesoreriaAdmin() {
    if (!window.treasuryDb) return;
    
    // Cargar Fondo Inicial
    try {
        const snapFondo = await treasuryDb.ref('config/fondoInicialSistema').once('value');
        if (snapFondo.exists()) {
            document.getElementById('cfgFondoInicialSistema').value = parseFloat(snapFondo.val()).toFixed(2);
        } else {
            document.getElementById('cfgFondoInicialSistema').value = '';
        }
    } catch(e) {
        console.warn("No se pudo cargar el fondo inicial de tesorería", e);
    }
    
    // Cargar Períodos
    try {
        const snapPeriodos = await treasuryDb.ref('periodos').once('value');
        const select = document.getElementById('cfgDeletePeriodSelect');
        select.innerHTML = '<option value="">— Seleccionar Período —</option>';
        if (snapPeriodos.exists()) {
            const periodos = snapPeriodos.val();
            const keys = Object.keys(periodos).sort((a,b) => b.localeCompare(a));
            keys.forEach(k => {
                select.innerHTML += `<option value="${k}">${k} (${periodos[k].estado})</option>`;
            });
        }
    } catch(e) {
        console.warn("No se pudieron cargar los períodos de tesorería", e);
    }
}

// Escuchar cambios de tab para cargar datos al entrar a config
document.addEventListener('DOMContentLoaded', () => {
    // Escucharemos cuando el menú cambie a config
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.id === 'view-config' && !mutation.target.classList.contains('hidden')) {
                cargarDatosTesoreriaAdmin();
            }
        });
    });
    const configView = document.getElementById('view-config');
    if (configView) {
        observer.observe(configView, { attributes: true, attributeFilter: ['class'] });
    }
});

async function guardarFondoInicialSistema() {
    if (!window.treasuryDb) return;
    const input = document.getElementById('cfgFondoInicialSistema');
    const fb = document.getElementById('fondoInicialFeedback');
    const val = parseFloat(input.value);
    
    if (isNaN(val) || val < 0) {
        fb.textContent = 'Monto inválido';
        fb.className = 'mt-3 text-xs font-bold p-2 rounded-lg bg-red-50 text-red-600';
        fb.classList.remove('hidden');
        return;
    }
    
    try {
        await treasuryDb.ref('config/fondoInicialSistema').set(val);
        fb.textContent = 'Fondo guardado correctamente';
        fb.className = 'mt-3 text-xs font-bold p-2 rounded-lg bg-green-50 text-green-700';
        fb.classList.remove('hidden');
        setTimeout(() => fb.classList.add('hidden'), 3000);
    } catch (e) {
        fb.textContent = 'Error: ' + e.message;
        fb.className = 'mt-3 text-xs font-bold p-2 rounded-lg bg-red-50 text-red-600';
        fb.classList.remove('hidden');
    }
}

async function eliminarPeriodoDesdeConfig() {
    if (!window.treasuryDb) return;
    const select = document.getElementById('cfgDeletePeriodSelect');
    const periodo = select.value;
    const fb = document.getElementById('deletePeriodFeedback');
    
    if (!periodo) {
        fb.textContent = 'Selecciona un período primero';
        fb.className = 'mt-3 text-xs font-bold p-2 rounded-lg bg-red-50 text-red-600';
        fb.classList.remove('hidden');
        return;
    }
    
    if (!confirm(`⚠️ ALERTA DE ZONA DE PELIGRO ⚠️\n\n¿Estás seguro de que deseas ELIMINAR COMPLETAMENTE el período ${periodo}?\n\nEsta acción borrará:\n- Todos los movimientos (ingresos/egresos)\n- El registro del período en la base de datos\n\n¡ESTO NO SE PUEDE DESHACER!`)) {
        return;
    }
    
    try {
        // Verificar si la fuente fue FONDO_INICIAL_SISTEMA para eliminarlo también
        const snap = await treasuryDb.ref(`periodos/${periodo}`).once('value');
        if (snap.exists()) {
            const pData = snap.val();
            if (pData.fuenteSaldoInicial === 'FONDO_INICIAL_SISTEMA') {
                await treasuryDb.ref('config/fondoInicialSistema').remove();
                document.getElementById('cfgFondoInicialSistema').value = '';
            }
        }
        
        // Borrar el periodo
        await treasuryDb.ref(`periodos/${periodo}`).remove();
        
        // Borrar movimientos asociados a este periodo
        const movsSnap = await treasuryDb.ref('movimientos').orderByChild('periodoId').equalTo(periodo).once('value');
        if (movsSnap.exists()) {
            const updates = {};
            movsSnap.forEach(child => {
                updates[child.key] = null;
            });
            await treasuryDb.ref('movimientos').update(updates);
        }
        
        fb.textContent = `Período ${periodo} eliminado exitosamente.`;
        fb.className = 'mt-3 text-xs font-bold p-2 rounded-lg bg-green-50 text-green-700';
        fb.classList.remove('hidden');
        
        // Recargar la lista
        cargarDatosTesoreriaAdmin();
        setTimeout(() => fb.classList.add('hidden'), 5000);
        
    } catch (e) {
        fb.textContent = 'Error: ' + e.message;
        fb.className = 'mt-3 text-xs font-bold p-2 rounded-lg bg-red-50 text-red-600';
        fb.classList.remove('hidden');
    }
}
