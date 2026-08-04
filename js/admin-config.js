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
