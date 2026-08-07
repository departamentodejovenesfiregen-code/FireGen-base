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

/* ── LÓGICA DE NEGOCIO: SISTEMA DE DISCIPULADO Y ACOMPAÑAMIENTO ── */

/**
 * getFormationPath — Determina la ruta de formación según el estado espiritual.
 * @param {string} spiritualStatus
 * @returns {string}
 */
function getFormationPath(spiritualStatus) {
    const status = (spiritualStatus || '').toLowerCase();
    if (status === 'nuevo') return 'Discipulado inicial / integración';
    if (status === 'creyente') return 'Discipulado de crecimiento';
    if (status === 'convertido') return 'Consolidación y crecimiento';
    if (status === 'reconciliado') return 'Restauración y consolidación';
    if (status === 'bautizado') return 'Formación y preparación para servir';
    if (status === 'líder' || status === 'lider') return 'Formación de liderazgo y multiplicación';
    return 'Sin ruta asignada';
}

/**
 * getAttentionLevel — Determina el nivel de atención basado en la asistencia.
 * @param {string} attendanceStatus
 * @returns {string}
 */
function getAttentionLevel(attendanceStatus) {
    const status = (attendanceStatus || '').toLowerCase();
    if (status === 'activo') return 'Atención normal';
    if (status === 'inconstante') return 'Atención preventiva';
    if (status === 'enfriándose' || status === 'enfriandose') return 'Atención prioritaria';
    if (status === 'alejándose' || status === 'alejando' || status === 'alejado') return 'Rescate';
    return 'Atención normal'; // Default seguro
}

/**
 * getSupportPlan — Determina el plan de acompañamiento basado en la asistencia.
 * @param {string} attendanceStatus
 * @returns {string}
 */
function getSupportPlan(attendanceStatus) {
    const status = (attendanceStatus || '').toLowerCase();
    if (status === 'activo') return 'Acompañamiento normal';
    if (status === 'inconstante') return 'Acompañamiento preventivo';
    if (status === 'enfriándose' || status === 'enfriandose') return 'Seguimiento prioritario';
    if (status === 'alejándose' || status === 'alejando' || status === 'alejado') return 'Plan al Rescate';
    return 'Acompañamiento normal'; // Default seguro
}

/**
 * getRecommendedActions — Evalúa el miembro y devuelve recomendaciones sugeridas.
 * @param {Object} member - Objeto del miembro
 * @returns {string[]} Array de recomendaciones
 */
function getRecommendedActions(member) {
    const recommendations = [];
    const spiritual = (member.estadoEspiritual || '').toLowerCase();
    const attendance = (member.estadoAsistencia || '').toLowerCase();

    if (spiritual === 'nuevo' && attendance === 'activo') {
        recommendations.push('Revisión espiritual recomendada: Nuevo activo.');
    }
    if (spiritual === 'reconciliado' && attendance === 'activo') {
        recommendations.push('Revisión espiritual recomendada: Reconciliado activo.');
    }
    
    // Si estaba en riesgo o alejamiento pero ahora está activo (esto se puede deducir de su estado actual)
    // El histórico nos diría si estaba alejado, pero de momento evaluamos el estado actual
    
    return recommendations;
}

/**
 * logHistoryEvent — Registra un evento en el historial de un miembro.
 * @param {string} memberId - ID de Firebase del miembro
 * @param {string} action - Acción realizada (ej. 'Cambio de Estado Espiritual')
 * @param {string} oldValue - Valor anterior
 * @param {string} newValue - Valor nuevo
 * @param {string} note - Nota u observación opcional
 */
function logHistoryEvent(memberId, action, oldValue, newValue, note = '') {
    if (!memberId || typeof db === 'undefined') return;
    
    const user = auth.currentUser;
    const responsable = user ? (user.displayName || user.email || 'Sistema') : 'Sistema';
    
    const historyRef = db.ref('historial_cambios/' + memberId).push();
    historyRef.set({
        fecha: Date.now(),
        accion: action,
        valorAnterior: oldValue,
        valorNuevo: newValue,
        responsable: responsable,
        nota: note
    }).catch(err => console.error('[FireGen] Error al guardar historial:', err));
}
