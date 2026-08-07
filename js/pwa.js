/**
 * FireGen V3 — js/pwa.js
 * ─────────────────────────────────────────────────────────────
 * Único responsable del ciclo PWA en el cliente:
 *   registro SW → detección → SKIP_WAITING → controllerchange → 1 reload
 *
 * La actualización es silenciosa: no deja el modal "Actualizando" visible.
 * No borra caches desde la página (eso lo hace el SW en activate).
 * Dependencia: js/version.js (APP_VERSION)
 * ─────────────────────────────────────────────────────────────
 */

var FiregenPWA = (function () {
    'use strict';

    var RELOAD_FLAG = 'firegen_pending_reload';
    var promoting = false;
    var reloading = false;

    function appVersion() {
        return (typeof APP_VERSION !== 'undefined' && APP_VERSION) ? String(APP_VERSION) : '0';
    }

    function hideUpdateBanner() {
        var el = document.getElementById('updateModal');
        if (!el) return;
        el.classList.remove('show');
        el.setAttribute('aria-hidden', 'true');
        el.hidden = true;
    }

    /**
     * Pide al SW en waiting/installing que pase a active.
     * Silencioso: sin modal permanente.
     */
    function promoteWorker(worker) {
        if (!worker || promoting || reloading) return;

        try {
            if (sessionStorage.getItem(RELOAD_FLAG) === appVersion()) return;
        } catch (e) { /* ignore */ }

        promoting = true;
        hideUpdateBanner();
        console.log('[PWA] Promoviendo build', appVersion());

        try {
            worker.postMessage({ type: 'SKIP_WAITING' });
        } catch (err) {
            console.error('[PWA] SKIP_WAITING falló:', err);
            promoting = false;
            hideUpdateBanner();
            return;
        }

        // Si no llega controllerchange, soltar el candado sin molestar al usuario
        setTimeout(function () {
            if (reloading) return;
            console.warn('[PWA] Activación no completada; se mantiene la versión actual');
            promoting = false;
            hideUpdateBanner();
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

        // Siempre ocultar el aviso al cargar (evita que quede pegado)
        hideUpdateBanner();

        try {
            var pending = sessionStorage.getItem(RELOAD_FLAG);
            if (pending !== null) {
                sessionStorage.removeItem(RELOAD_FLAG);
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

        navigator.serviceWorker.addEventListener('controllerchange', function () {
            if (reloading) return;
            reloading = true;
            hideUpdateBanner();
            try {
                sessionStorage.setItem(RELOAD_FLAG, version);
            } catch (e) { /* ignore */ }
            console.log('[PWA] Nuevo controlador — recarga única');
            window.location.reload();
        });

        navigator.serviceWorker.register('./service-worker.js')
            .then(function (reg) {
                console.log('[PWA] SW registrado · build', version, reg.scope);
                hideUpdateBanner();

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
