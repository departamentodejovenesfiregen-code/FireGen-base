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
 * applyPWAUpdate — Activa el Service Worker pendiente y recarga.
 * Usado por el modal de actualización (HTML + JS).
 */
function applyPWAUpdate() {
    if (!('serviceWorker' in navigator)) {
        window.location.reload();
        return;
    }
    navigator.serviceWorker.getRegistration().then(reg => {
        const waiting = reg && reg.waiting;
        if (waiting) {
            waiting.postMessage({ type: 'SKIP_WAITING' });
            return;
        }
        window.location.reload();
    }).catch(() => window.location.reload());
}

/**
 * initPWA — Inicializa el Service Worker, monitor de conexión y polling de versión.
 * IMPORTANTE: NO esperar a window.load — initPWA corre después de auth async,
 * cuando load ya ocurrió; si se escucha load aquí, las actualizaciones nunca se detectan.
 */
function initPWA() {
    // 1. Quitar splash screen
    const splash = document.getElementById('splashScreen');
    if (splash) {
        setTimeout(() => splash.classList.add('fade-out'), 500);
    }
    
    const appBody = document.getElementById('appBody');
    if (appBody) appBody.style.display = 'block';

    // 2. Registro y Actualización de Service Worker (inmediato)
    let newWorker;
    if ('serviceWorker' in navigator) {
        const showUpdateModal = (worker) => {
            const updateModal = document.getElementById('updateModal');
            if (!updateModal) return;
            updateModal.classList.add('show');
            const updateBtn = updateModal.querySelector('button');
            if (updateBtn) {
                updateBtn.onclick = function () {
                    if (worker) worker.postMessage({ type: 'SKIP_WAITING' });
                    else applyPWAUpdate();
                };
            }
        };

        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => {
                console.log('[PWA] Service Worker registrado', reg.scope);

                // Ya hay un SW esperando (p. ej. tras visita previa)
                if (reg.waiting && navigator.serviceWorker.controller) {
                    showUpdateModal(reg.waiting);
                }

                reg.addEventListener('updatefound', () => {
                    newWorker = reg.installing;
                    if (!newWorker) return;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showUpdateModal(newWorker);
                        }
                    });
                });

                // Forzar búsqueda de nueva versión al abrir la app
                reg.update().catch(() => {});

                // Revisar periódicamente (celulares con PWA instalada suelen no refrescar)
                setInterval(() => {
                    reg.update().catch(() => {});
                }, 60 * 60 * 1000);
            })
            .catch(err => console.error('[PWA] Error SW:', err));

        let refreshing;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            refreshing = true;
            window.location.reload();
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
}
