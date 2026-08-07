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

/** Evita lanzar la auto-actualización más de una vez por sesión de página */
let pwaUpdateInProgress = false;

/**
 * showUpdatingUI — Aviso breve mientras se activa la nueva versión.
 */
function showUpdatingUI() {
    const updateModal = document.getElementById('updateModal');
    if (!updateModal) return;
    updateModal.innerHTML = `
        <h3 class="font-bold text-slate-800">
            <i class="fas fa-sync-alt fa-spin text-orange-500 mr-1"></i> Actualizando FireGen
        </h3>
        <p class="text-sm text-slate-500 mt-2">Nueva versión lista. Recargando…</p>
    `;
    updateModal.classList.add('show');
}

/**
 * applyPWAUpdate — Activa el SW nuevo y deja que el SW borre solo cachés viejas.
 * NO borra la caché actual desde el cliente (eso dejaba el celular sin JS).
 */
function applyPWAUpdate(worker) {
    if (pwaUpdateInProgress) return;
    pwaUpdateInProgress = true;
    showUpdatingUI();

    try {
        sessionStorage.setItem('firegen_updating', '1');
    } catch (e) { /* private mode */ }

    const target = worker;
    if (target) {
        target.postMessage({ type: 'CLEAR_OLD_CACHES' });
        target.postMessage({ type: 'SKIP_WAITING' });
        // Si en 4s no hubo controllerchange, forzar reload
        setTimeout(() => {
            if (sessionStorage.getItem('firegen_updating') === '1') {
                window.location.reload();
            }
        }, 4000);
        return;
    }

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(reg => {
            const waiting = reg && reg.waiting;
            if (waiting) {
                waiting.postMessage({ type: 'CLEAR_OLD_CACHES' });
                waiting.postMessage({ type: 'SKIP_WAITING' });
                return;
            }
            window.location.reload();
        }).catch(() => window.location.reload());
        return;
    }

    window.location.reload();
}

/**
 * initPWA — Service Worker, conexión y auto-update seguro.
 */
function initPWA() {
    // 1. Quitar splash screen
    const splash = document.getElementById('splashScreen');
    if (splash) {
        setTimeout(() => splash.classList.add('fade-out'), 500);
    }

    const appBody = document.getElementById('appBody');
    if (appBody) appBody.style.display = 'block';

    // Tras una recarga por update: no volver a disparar update en esta carga
    let skipUpdateThisLoad = false;
    try {
        if (sessionStorage.getItem('firegen_updating') === '1') {
            sessionStorage.removeItem('firegen_updating');
            console.log('[PWA] Actualización aplicada correctamente');
        }
        if (sessionStorage.getItem('firegen_just_updated') === '1') {
            sessionStorage.removeItem('firegen_just_updated');
            skipUpdateThisLoad = true;
        }
    } catch (e) { /* ignore */ }

    // 2. Registro + auto-update
    if ('serviceWorker' in navigator) {
        const onNewVersionReady = (worker) => {
            if (skipUpdateThisLoad) return;
            console.log('[PWA] Nueva versión detectada — activando…');
            applyPWAUpdate(worker);
        };

        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => {
                console.log('[PWA] Service Worker registrado', reg.scope);

                if (reg.waiting && navigator.serviceWorker.controller) {
                    onNewVersionReady(reg.waiting);
                }

                reg.addEventListener('updatefound', () => {
                    const installing = reg.installing;
                    if (!installing) return;
                    installing.addEventListener('statechange', () => {
                        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                            onNewVersionReady(installing);
                        }
                    });
                });

                reg.update().catch(() => {});

                setInterval(() => {
                    if (navigator.onLine) reg.update().catch(() => {});
                }, 30 * 60 * 1000);
            })
            .catch(err => console.error('[PWA] Error SW:', err));

        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            refreshing = true;
            try {
                sessionStorage.setItem('firegen_just_updated', '1');
            } catch (e) { /* ignore */ }
            window.location.reload();
        });
    }

    // 3. Online / Offline
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
