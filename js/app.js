/**
 * FireGen V3.0 — js/app.js
 * ─────────────────────────────────────────────────────────────
 * ORQUESTADOR PRINCIPAL
 * Este archivo inicializa la aplicación y conecta todos los módulos.
 * Depende de: todos los módulos (firebase-config, auth, utils, etc.)
 * ─────────────────────────────────────────────────────────────
 */

/**
 * switchTab — Maneja la navegación entre las secciones (tabs y bottom nav).
 * @param {string} tab - ID de la pestaña a mostrar ('master', 'attendance', 'report', 'strategy')
 */
function switchTab(tab) {
    ['master', 'attendance', 'report', 'strategy', 'config'].forEach(s => {
        const view = document.getElementById('view-' + s);
        if (view) view.classList.add('hidden');

        const topBtn = document.getElementById('tab-' + s);
        if (topBtn) topBtn.classList.remove('tab-active');

        const bnBtn = document.getElementById('bn-' + s);
        if (bnBtn) bnBtn.classList.remove('bn-active');
    });

    const targetView = document.getElementById('view-' + tab);
    if (targetView) targetView.classList.remove('hidden');

    const topActive = document.getElementById('tab-' + tab);
    if (topActive) topActive.classList.add('tab-active');

    const bnActive = document.getElementById('bn-' + tab);
    if (bnActive) bnActive.classList.add('bn-active');

    // Cargar datos bajo demanda según el tab seleccionado
    if (tab === 'attendance' && typeof renderAttendance === 'function') renderAttendance();
    if (tab === 'report' && typeof updateMonthlyStats === 'function') updateMonthlyStats();
    if (tab === 'strategy' && typeof refreshChart === 'function') refreshChart();
    if (tab === 'config') window.dispatchEvent(new Event('configTabOpened'));

    // Actualizar visibilidad de botones flotantes (FABs) según la pestaña actual
    if (typeof applyRolePermissions === 'function' && window.currentUserRole) {
        applyRolePermissions(window.currentUserRole);
    }
}

/**
 * openModal / closeModal — Manejo genérico de modales.
 */
function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
}
function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
}

/**
 * Overlays de pantalla completa — Plan al Rescate y Centro del Coordinador
 */
function openRescateOverlay() {
    const ov = document.getElementById('rescateOverlay');
    if (ov) {
        ov.classList.add('active');
        document.body.style.overflow = 'hidden';
        if (typeof renderRescateDashboard === 'function') renderRescateDashboard();
    }
}
function closeRescateOverlay() {
    const ov = document.getElementById('rescateOverlay');
    if (ov) {
        ov.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function openCoordinacionOverlay() {
    const ov = document.getElementById('coordinacionOverlay');
    if (ov) {
        ov.classList.add('active');
        document.body.style.overflow = 'hidden';
        if (typeof renderCoordinacionDashboard === 'function') renderCoordinacionDashboard();
    }
}
function closeCoordinacionOverlay() {
    const ov = document.getElementById('coordinacionOverlay');
    if (ov) {
        ov.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Cerrar overlays con el botón Atrás del navegador
window.addEventListener('popstate', () => {
    closeRescateOverlay();
    closeCoordinacionOverlay();
    if (typeof closeDirectorioOverlay === 'function') closeDirectorioOverlay();
    if (typeof closeNotificacionesOverlay === 'function') closeNotificacionesOverlay();
});


/**
 * Inicialización principal
 * FIX: JS-01 — Centralizado en un único DOMContentLoaded (más rápido que window.onload)
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar autenticación.
    // Solo cuando estemos autenticados inicializamos la app.
    initAuth((user) => {
        console.log(`[FireGen] Usuario autenticado: ${user.email}. Inicializando módulos...`);

        // 2. Variables iniciales (periodo actual = YYYY-MM)
        const now = new Date();
        const cp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // 3. Establecer valores por defecto en selects e inputs
        const attMonthSelector = document.getElementById('attMonthSelector');
        if (attMonthSelector) attMonthSelector.value = cp;

        const repPeriodo = document.getElementById('repPeriodo');
        if (repPeriodo) repPeriodo.value = cp;

        // 4. Inicializar componentes visuales
        if (typeof updateAttDisplayDate === 'function') updateAttDisplayDate();
        if (typeof buildHistoricTable === 'function') buildHistoricTable();
        if (typeof initChartYearSelect === 'function') initChartYearSelect();
        if (typeof initStrategyYearSelect === 'function') initStrategyYearSelect();
        if (typeof initAnalysisMonthSelect === 'function') initAnalysisMonthSelect();
        if (typeof initChart === 'function') initChart();

        // 5. Vincular listeners principales y lógica de formularios
        if (typeof initMasterEventDelegation === 'function') initMasterEventDelegation();
        if (typeof initAttendanceEventDelegation === 'function') initAttendanceEventDelegation();
        if (typeof initMemberForm === 'function') initMemberForm();
        if (typeof bindReportInputs === 'function') bindReportInputs();
        if (typeof bindStrategyInputs === 'function') bindStrategyInputs();

        // 6. Activar listeners de Firebase reactivos
        // El listener de miembros es el principal. Al cargar/actualizar miembros, actualiza tablas y contadores.
        if (typeof initMembersListener === 'function') {
            initMembersListener(() => {
                // onUpdate callback: ejecutado tras procesar members
                if (typeof renderMaster === 'function') renderMaster();
                if (typeof renderAttendance === 'function') renderAttendance();
                if (typeof syncServiceCounter === 'function') syncServiceCounter();
                if (typeof syncAlejadosCounter === 'function') syncAlejadosCounter();
                if (typeof loadRescueAlerts === 'function') loadRescueAlerts(cp);
            });
        }
        
        if (typeof listenNotificacionesCount === 'function' && user.uid) {
            listenNotificacionesCount(user.uid);
        }

        // Sincronizar sub-módulos para el período actual
        if (typeof syncAttendance === 'function') syncAttendance(cp);
        if (typeof syncReport === 'function' && typeof hasPermission === 'function' && hasPermission('verInformeMensual')) {
            syncReport(cp);
        }

        // Sincronización diferida de estrategia para evitar bloqueos
        if (typeof syncStrategy === 'function') {
            setTimeout(() => syncStrategy(String(now.getFullYear())), 300);
        }

        // Inicializar PWA (splash, conexión, auto-update centralizado en pwa.js)
        if (typeof FiregenPWA !== 'undefined') {
            FiregenPWA.init({ splash: true, connectionBanner: true });
        } else {
            const splash = document.getElementById('splashScreen');
            if (splash) setTimeout(() => splash.classList.add('fade-out'), 500);
            const appBody = document.getElementById('appBody');
            if (appBody) appBody.style.display = 'block';
        }

        console.log("[FireGen] Aplicación inicializada correctamente.");
    });
});
