/**
 * FireGen V3 — js/pwa.js
 * ─────────────────────────────────────────────────────────────
 * Único responsable del ciclo PWA en el cliente:
 *   registro SW → detección → SKIP_WAITING → controllerchange → 1 reload
 *
 * No borra caches desde la página (eso lo hace el SW en activate).
 * Dependencia: js/version.js (APP_VERSION)
 * ─────────────────────────────────────────────────────────────
 */

var FiregenPWA = (function () {
    'use strict';

    var RELOAD_FLAG = 'firegen_pending_reload';
    var promoting = false;
    var reloading = false;
    var safetyTimer = null;

    function appVersion() {
        return (typeof APP_VERSION !== 'undefined' && APP_VERSION) ? String(APP_VERSION) : '0';
    }

    function showUpdateBanner() {
        var el = document.getElementById('updateModal');
        if (!el) return;
        el.classList.add('show');
    }

    function hideUpdateBanner() {
        var el = document.getElementById('updateModal');
        if (!el) return;
        el.classList.remove('show');
    }

    function clearSafetyTimer() {
        if (safetyTimer) {
            clearTimeout(safetyTimer);
            safetyTimer = null;
        }
    }

    /**
     * Pide al SW en waiting/installing que pase a active.
     * Una sola vía de skipWaiting (mensaje). Sin reload ciego.
     */
    function promoteWorker(worker) {
        if (!worker || promoting || reloading) return;

        // Si ya completamos reload de este build, no re-promover
        try {
            if (sessionStorage.getItem(RELOAD_FLAG) === appVersion()) return;
        } catch (e) { /* ignore */ }

        promoting = true;
        showUpdateBanner();
        console.log('[PWA] Promoviendo build', appVersion());

        try {
            worker.postMessage({ type: 'SKIP_WAITING' });
        } catch (err) {
            console.error('[PWA] SKIP_WAITING falló:', err);
            promoting = false;
            hideUpdateBanner();
            return;
        }

        // Si no hay controllerchange, NO recargar a ciegas: ocultar UI y reintentar luego
        clearSafetyTimer();
        safetyTimer = setTimeout(function () {
            if (reloading) return;
            console.warn('[PWA] Activación no completada; se mantiene la versión actual');
            hideUpdateBanner();
            promoting = false;
        }, 12000);
    }

    function initConnectionBanner() {
        var banner = document.getElementById('connectionBanner');
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

    function initSplash() {
        var splash = document.getElementById('splashScreen');
        if (splash) {
            setTimeout(function () {
                splash.classList.add('fade-out');
            }, 500);
        }
        var appBody = document.getElementById('appBody');
        if (appBody) appBody.style.display = 'block';
    }

    /**
     * @param {Object} [options]
     * @param {boolean} [options.splash=false]
     * @param {boolean} [options.connectionBanner=true]
     */
    function init(options) {
        options = options || {};
        var version = appVersion();

        // Ciclo de reload completado para este build → estable, sin re-actualizar
        try {
            var pending = sessionStorage.getItem(RELOAD_FLAG);
            if (pending !== null) {
                sessionStorage.removeItem(RELOAD_FLAG);
                hideUpdateBanner();
                clearSafetyTimer();
                promoting = false;
                if (pending === version) {
                    console.log('[PWA] Build estable:', version);
                    try {
                        localStorage.setItem('firegen_active_version', version);
                    } catch (e2) { /* ignore */ }
                }
            }
        } catch (e) { /* ignore */ }

        if (options.splash) initSplash();
        if (options.connectionBanner !== false) initConnectionBanner();

        if (!('serviceWorker' in navigator)) {
            console.warn('[PWA] Service Worker no soportado');
            return;
        }

        // Una sola recarga por transición real de controlador
        navigator.serviceWorker.addEventListener('controllerchange', function () {
            if (reloading) return;
            reloading = true;
            clearSafetyTimer();
            showUpdateBanner();
            try {
                sessionStorage.setItem(RELOAD_FLAG, version);
            } catch (e) { /* ignore */ }
            console.log('[PWA] Nuevo controlador — recarga única');
            window.location.reload();
        });

        navigator.serviceWorker.register('./service-worker.js')
            .then(function (reg) {
                console.log('[PWA] SW registrado · build', version, reg.scope);

                if (reg.waiting) {
                    promoteWorker(reg.waiting);
                }

                reg.addEventListener('updatefound', function () {
                    var installing = reg.installing;
                    if (!installing) return;
                    installing.addEventListener('statechange', function () {
                        if (installing.state === 'installed') {
                            promoteWorker(installing);
                        }
                    });
                });

                if (navigator.onLine) {
                    reg.update().catch(function (err) {
                        console.warn('[PWA] reg.update():', err && err.message);
                    });
                }

                setInterval(function () {
                    if (navigator.onLine) {
                        reg.update().catch(function () { /* silent */ });
                    }
                }, 60 * 60 * 1000);
            })
            .catch(function (err) {
                console.error('[PWA] Registro fallido:', err);
                hideUpdateBanner();
            });
    }

    return {
        init: init,
        hideUpdateBanner: hideUpdateBanner
    };
})();
