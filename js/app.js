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

/** Evita lanzar la auto-actualización más de una vez por sesión */
let pwaUpdateInProgress = false;

/**
 * showUpdatingUI — Aviso breve mientras se limpia caché y se recarga.
 */
function showUpdatingUI() {
    const updateModal = document.getElementById('updateModal');
    if (!updateModal) return;
    updateModal.innerHTML = `
        <h3 class="font-bold text-slate-800">
            <i class="fas fa-sync-alt fa-spin text-orange-500 mr-1"></i> Actualizando FireGen
        </h3>
        <p class="text-sm text-slate-500 mt-2">Limpiando caché y cargando la nueva versión…</p>
    `;
    updateModal.classList.add('show');
}

/**
 * clearAppCaches — Elimina residuos de caché FireGen en el navegador.
 */
async function clearAppCaches() {
    if (!('caches' in window)) return;
    try {
        const names = await caches.keys();
        await Promise.all(
            names
                .filter(name => name.startsWith('firegen-'))
                .map(name => caches.delete(name))
        );
        console.log('[PWA] Cachés FireGen eliminadas');
    } catch (err) {
        console.warn('[PWA] No se pudieron limpiar cachés:', err);
    }
}

/**
 * applyPWAUpdate — Limpia caché/residuos, activa el SW nuevo y recarga.
 * Se dispara sola al detectar actualización (también usable desde el botón).
 */
async function applyPWAUpdate(worker) {
    if (pwaUpdateInProgress) return;
    pwaUpdateInProgress = true;
    showUpdatingUI();

    try {
        await clearAppCaches();

        if (worker) {
            worker.postMessage({ type: 'CLEAR_CACHES' });
            worker.postMessage({ type: 'SKIP_WAITING' });
            return; // controllerchange → reload
        }

        if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.getRegistration();
            const waiting = reg && reg.waiting;
            if (waiting) {
                waiting.postMessage({ type: 'CLEAR_CACHES' });
                waiting.postMessage({ type: 'SKIP_WAITING' });
                return;
            }
        }
    } catch (err) {
        console.warn('[PWA] Error aplicando actualización:', err);
    }

    window.location.reload();
}

/**
 * initPWA — Inicializa el Service Worker, monitor de conexión y auto-update.
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

    // 2. Registro + actualización automática del Service Worker
    if ('serviceWorker' in navigator) {
        const onNewVersionReady = (worker) => {
            console.log('[PWA] Nueva versión detectada — limpiando caché y actualizando…');
            applyPWAUpdate(worker);
        };

        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => {
                console.log('[PWA] Service Worker registrado', reg.scope);

                // SW ya esperando (visita previa sin activar)
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

                // Buscar nueva versión al abrir la app
                reg.update().catch(() => {});

                // Revisión periódica (PWA instalada en celular casi no se refresca sola)
                setInterval(() => {
                    if (navigator.onLine) reg.update().catch(() => {});
                }, 30 * 60 * 1000);
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
