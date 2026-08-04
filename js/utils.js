/**
 * FireGen V3.0 — js/utils.js
 * ─────────────────────────────────────────────────────────────
 * UTILIDADES COMPARTIDAS
 * Funciones puras reutilizables por todos los módulos.
 * No tiene dependencias de otros módulos de FireGen.
 * ─────────────────────────────────────────────────────────────
 */

/* ── Constantes globales ── */
const MESES_LABELS = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];
const MESES_KEYS = [
    'enero','febrero','marzo','abril','mayo','junio',
    'julio','agosto','septiembre','octubre','noviembre','diciembre'
];

/**
 * escHtml — Previene XSS escapando caracteres especiales HTML.
 * FIX: SEC-01 — Sanitización obligatoria antes de insertar en innerHTML.
 * @param {*} str - Valor a escapar (cualquier tipo)
 * @returns {string} String seguro para insertar en HTML
 */
function escHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * calculateAge — Calcula la edad correcta a partir de una fecha de nacimiento.
 * FIX: JS-03 — Reemplaza el cálculo incorrecto con diferencia de timestamps.
 * @param {string} b - Fecha en formato YYYY-MM-DD
 * @returns {number} Edad en años
 */
function calculateAge(b) {
    if (!b) return 0;
    // Agregar T00:00:00 evita desfase de zona horaria en Date parsing
    const today = new Date();
    const birth = new Date(b + 'T00:00:00');
    if (isNaN(birth.getTime())) return 0;
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return Math.max(0, age);
}

/**
 * isSafeUrl — Valida que una URL use protocolo HTTPS.
 * FIX: SEC-04 — Previene javascript: URIs en atributos src/href.
 * @param {string} url
 * @returns {boolean}
 */
function isSafeUrl(url) {
    if (!url || typeof url !== 'string') return false;
    try {
        const u = new URL(url);
        return u.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * flashBadge — Muestra brevemente un badge de "Guardado".
 * @param {string} id - ID del elemento .auto-badge
 */
function flashBadge(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2000);
}

/**
 * debounce — Retrasa la ejecución de una función hasta que se deje de llamar.
 * FIX: OPT-02, OPT-03 — Agrupa escrituras Firebase.
 * @param {Function} fn - Función a ejecutar
 * @param {number} ms  - Tiempo de espera en milisegundos
 * @returns {Function} Función con debounce aplicado
 */
function debounce(fn, ms) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), ms);
    };
}

/**
 * downloadCSV — Descarga un string como archivo CSV.
 * @param {string} csv - Contenido del archivo
 * @param {string} fn  - Nombre del archivo
 */
function downloadCSV(csv, fn) {
    const bom = '\uFEFF'; // BOM para compatibilidad con Excel
    const b = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const l = document.createElement('a');
    l.href = URL.createObjectURL(b);
    l.setAttribute('download', fn);
    document.body.appendChild(l);
    l.click();
    document.body.removeChild(l);
    URL.revokeObjectURL(l.href);
}

/**
 * getStatusClass — Clase CSS para el estado espiritual.
 * @param {string} s
 * @returns {string}
 */
function getStatusClass(s) {
    if (s === 'Lider' || s === 'Líder') return 'bg-purple-100 text-purple-700';
    if (s === 'Bautizado')               return 'bg-blue-100 text-blue-700';
    if (s === 'Nuevo')                   return 'bg-orange-100 text-orange-700';
    return 'bg-slate-100 text-slate-600';
}

/**
 * getEngagementClass — Clase CSS para el estado de asistencia.
 * @param {string} s
 * @returns {string}
 */
function getEngagementClass(s) {
    if (s === 'Activo')       return 'eng-activo';
    if (s === 'Inconstante')  return 'eng-inconstante';
    if (s === 'Enfriandose' || s === 'Enfriándose') return 'eng-enfriando';
    if (s === 'Alejado')      return 'eng-alejado';
    return 'bg-slate-100 text-slate-600';
}

/**
 * showConnectionError — Muestra el banner de error de conexión.
 * FIX: JS-07 — Feedback visible al usuario cuando Firebase falla.
 * @param {string} [msg] - Mensaje personalizado
 */
function showConnectionError(msg) {
    let banner = document.getElementById('connectionBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'connectionBanner';
        banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#dc2626;color:white;text-align:center;padding:10px;font-size:0.85rem;font-weight:700;';
        document.body.prepend(banner);
    }
    banner.textContent = msg || '⚠️ Sin conexión a Firebase. Verifica tu internet o las reglas de seguridad.';
    banner.style.transform = 'translateY(0)';
    banner.classList.add('show');
}

function hideConnectionError() {
    const banner = document.getElementById('connectionBanner');
    if (banner) banner.classList.remove('show');
}

console.log("[FireGen] utils.js cargado");
