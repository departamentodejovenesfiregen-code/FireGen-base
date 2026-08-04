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
        if (typeof initAnalysisMonthSelect === 'function') initAnalysisMonthSelect();
        if (typeof initChart === 'function') initChart();

        // 5. Vincular listeners principales y lógica de formularios
        if (typeof initMasterEventDelegation === 'function') initMasterEventDelegation();
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

        // Sincronizar sub-módulos para el período actual
        if (typeof syncAttendance === 'function') syncAttendance(cp);
        if (typeof syncReport === 'function') syncReport(cp);
        
        // Sincronización diferida de estrategia para evitar bloqueos
        if (typeof syncStrategy === 'function') {
            setTimeout(() => syncStrategy(cp), 300);
        }
        
        // Inicializar funcionalidades PWA y UI
        initPWA();
        
        console.log("[FireGen] Aplicación inicializada correctamente.");
    });
});

/**
 * initPWA — Inicializa el Service Worker, monitor de conexión y polling de versión.
 */
function initPWA() {
    // 1. Quitar splash screen
    const splash = document.getElementById('splashScreen');
    if (splash) {
        setTimeout(() => splash.classList.add('fade-out'), 500);
    }
    
    const appBody = document.getElementById('appBody');
    if (appBody) appBody.style.display = 'block';

    // 2. Registro de Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then(reg => console.log('[PWA] Service Worker registrado', reg.scope))
                .catch(err => console.error('[PWA] Error SW:', err));
        });
    }

    // 3. Monitor de estado Online / Offline
    const banner = document.getElementById('connectionBanner');
    function updateOnlineStatus() {
        if (!navigator.onLine) {
            if (banner) banner.classList.add('show');
            document.body.classList.add('offline-mode');
        } else {
            if (banner) banner.classList.remove('show');
            document.body.classList.remove('offline-mode');
        }
    }
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    // 4. Polling de Versión (comprueba actualizaciones)
    let currentVersion = null;
    
    function checkVersion() {
        if (!navigator.onLine) return; // No verificar si está offline
        
        fetch('version.json?t=' + new Date().getTime())
            .then(res => res.json())
            .then(data => {
                if (!currentVersion) {
                    currentVersion = data.version;
                } else if (data.version !== currentVersion) {
                    // Nueva versión detectada
                    const updateModal = document.getElementById('updateModal');
                    if (updateModal) updateModal.classList.add('show');
                }
            })
            .catch(err => console.log('[PWA] Error comprobando versión:', err));
    }
    
    // Comprobar versión al inicio y luego cada 5 minutos
    checkVersion();
    setInterval(checkVersion, 5 * 60 * 1000);
    
    // También comprobar al volver a la pestaña
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkVersion();
        }
    });
}
