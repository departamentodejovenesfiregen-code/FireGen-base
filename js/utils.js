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
    setTimeout(() => el.classList.remove('show'), 1000);
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
    if (s === 'Reconciliado')            return 'bg-teal-100 text-teal-700';
    if (s === 'Oidor' || s === 'Creyente' || s === 'Convertido') return 'bg-emerald-100 text-emerald-700';
    if (s === 'Nuevo' || s === 'Nuevo creyente') return 'bg-orange-100 text-orange-700';
    return 'bg-slate-100 text-slate-600';
}

/**
 * getEngagementClass — Clase CSS para el estado de asistencia.
 * FASE3-S1: Reconoce 'Alejándose' y 'Alejado' (compatibilidad con datos históricos).
 * @param {string} s
 * @returns {string}
 */
function getEngagementClass(s) {
    if (s === 'Activo')       return 'eng-activo';
    if (s === 'Inconstante')  return 'eng-inconstante';
    if (s === 'Enfriandose' || s === 'Enfriándose') return 'eng-enfriando';
    if (s === 'Alejándose' || s === 'Alejando' || s === 'Alejado') return 'eng-alejado';
    return 'bg-slate-100 text-slate-600';
}

let connectionAlertTimer = null;

/**
 * showConnectionError — Muestra el banner de error de conexión.
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
    
    clearTimeout(connectionAlertTimer);
    connectionAlertTimer = setTimeout(() => {
        hideConnectionError();
    }, 1000);
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
    if (status === 'alejándose' || status === 'alejandose' || status === 'alejando' || status === 'alejado') return 'Rescate';
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
    if (status === 'alejándose' || status === 'alejandose' || status === 'alejando' || status === 'alejado') return 'Plan al Rescate';
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

/* ── FASE 3 · SUBETAPA 1: CALENDARIO DE SÁBADOS Y NORMALIZACIÓN ── */

/**
 * getOperationalSaturdays — Devuelve los sábados operativos de un mes.
 * Un sábado es "operativo" si cae dentro del período de gestión configurado.
 *
 * FASE3-S1: Fuente de verdad para todas las columnas de la nómina.
 *
 * @param {number} year  - Año (ej. 2026)
 * @param {number} month - Mes 1-indexed (ej. 8 = agosto)
 * @returns {string[]} Array de fechas "YYYY-MM-DD" correspondientes a los sábados operativos
 *
 * Ejemplos:
 *   getOperationalSaturdays(2026, 7) → ["2026-07-25"]
 *   getOperationalSaturdays(2026, 8) → ["2026-08-01","2026-08-08","2026-08-15","2026-08-22","2026-08-29"]
 *   getOperationalSaturdays(2026, 9) → ["2026-09-05","2026-09-12","2026-09-19","2026-09-26"]
 */
function getOperationalSaturdays(year, month) {
    // Obtener fechas de inicio y fin del período desde AppConfig
    const periodStart = (AppConfig.current && AppConfig.current.period && AppConfig.current.period.start)
        ? AppConfig.current.period.start
        : (AppConfig.defaults.period.start);
    const periodEnd = (AppConfig.current && AppConfig.current.period && AppConfig.current.period.end)
        ? AppConfig.current.period.end
        : (AppConfig.defaults.period.end);

    const start = new Date(periodStart + 'T00:00:00');
    const end   = new Date(periodEnd   + 'T00:00:00');

    // Primer día del mes solicitado
    const firstDay = new Date(year, month - 1, 1);
    // Último día del mes solicitado
    const lastDay  = new Date(year, month, 0);

    const saturdays = [];

    // Encontrar el primer sábado del mes (día de semana 6 = sábado)
    const d = new Date(firstDay);
    const dayOfWeek = d.getDay(); // 0=Dom…6=Sáb
    const daysToSaturday = (6 - dayOfWeek + 7) % 7;
    d.setDate(d.getDate() + daysToSaturday);

    // Iterar todos los sábados del mes
    while (d <= lastDay) {
        // Sólo incluir si está dentro del período de gestión
        if (d >= start && d <= end) {
            const yyyy = d.getFullYear();
            const mm   = String(d.getMonth() + 1).padStart(2, '0');
            const dd   = String(d.getDate()).padStart(2, '0');
            saturdays.push(`${yyyy}-${mm}-${dd}`);
        }
        d.setDate(d.getDate() + 7);
    }

    return saturdays;
}

/**
 * getOperationalSaturdaysForPeriod — Wrapper que acepta un string "YYYY-MM".
 * @param {string} periodo - Formato "YYYY-MM"
 * @returns {string[]} Array de fechas sábado operativas
 */
function getOperationalSaturdaysForPeriod(periodo) {
    if (!periodo) return [];
    const [y, m] = periodo.split('-').map(Number);
    return getOperationalSaturdays(y, m);
}

/**
 * normalizeAttendanceStatus — Normaliza valores históricos de estadoAsistencia.
 * Convierte valores legacy ('Alejado') al nuevo estándar ('Alejándose').
 * No modifica Firebase; solo normaliza en memoria para UI y cálculos.
 *
 * FASE3-S1: Compatibilidad con registros existentes.
 *
 * @param {string} s - Valor de estadoAsistencia desde Firebase
 * @returns {string} Valor normalizado
 */
function normalizeAttendanceStatus(s) {
    if (!s) return '';
    if (s === 'Alejado' || s === 'Alejando') return 'Alejándose';
    if (s === 'Enfriandose') return 'Enfriándose';
    return s;
}

/**
 * getSaturdayLabel — Genera la etiqueta "Sáb DD" para una fecha de sábado.
 * @param {string} dateStr - Fecha en formato "YYYY-MM-DD"
 * @returns {string} Etiqueta formateada, ej. "Sáb 01"
 */
function getSaturdayLabel(dateStr) {
    if (!dateStr) return 'Sáb ?';
    const day = dateStr.split('-')[2];
    return `Sáb ${day}`;
}

