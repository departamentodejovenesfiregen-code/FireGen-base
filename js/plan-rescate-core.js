/**
 * FireGen V3.0 — js/plan-rescate-core.js
 * ─────────────────────────────────────────────────────────────
 * MOTOR DE LÓGICA: PLAN AL RESCATE Y RUTAS DE ACOMPAÑAMIENTO
 * Define reglas puras para prioridades, rutas de formación,
 * rutas de acompañamiento y acciones recomendadas, evitando
 * duplicidad en la UI.
 * ─────────────────────────────────────────────────────────────
 */

const RescueCore = {

    /**
     * Devuelve la Ruta de Formación según el Estado Espiritual
     */
    getFormationRoute(estadoEspiritual) {
        const map = {
            'Nuevo creyente': 'Discipulado inicial / integración',
            'Nuevo': 'Discipulado inicial / integración', // Compatibilidad histórica
            'Creyente': 'Discipulado de crecimiento',
            'Convertido': 'Formación / consolidación y crecimiento',
            'Reconciliado': 'Restauración y consolidación',
            'Bautizado': 'Formación y preparación para servir',
            'Líder': 'Formación de liderazgo / multiplicación'
        };
        return map[estadoEspiritual] || 'Formación general';
    },

    /**
     * Devuelve el nivel de prioridad (1-4) y su etiqueta según asistencia
     * 1: Normal, 2: Seguimiento, 3: Alta, 4: Crítica
     */
    getPriority(estadoAsistencia) {
        const state = (estadoAsistencia || '').toLowerCase();
        if (state.includes('alejándos') || state.includes('alejado')) {
            return { level: 4, label: 'Crítica', color: 'red', icon: '🔴', bg: 'bg-red-50 text-red-600', border: 'border-red-200' };
        }
        if (state.includes('enfriándos') || state.includes('enfriado')) {
            return { level: 3, label: 'Alta', color: 'orange', icon: '🟠', bg: 'bg-orange-50 text-orange-600', border: 'border-orange-200' };
        }
        if (state.includes('inconstante')) {
            return { level: 2, label: 'Seguimiento', color: 'yellow', icon: '🟡', bg: 'bg-yellow-50 text-yellow-700', border: 'border-yellow-200' };
        }
        return { level: 1, label: 'Normal', color: 'green', icon: '🟢', bg: 'bg-green-50 text-green-700', border: 'border-green-200' };
    },

    /**
     * Devuelve la Ruta de Acompañamiento según el estado de asistencia
     */
    getAccompanimentRoute(estadoAsistencia) {
        const prio = this.getPriority(estadoAsistencia).level;
        if (prio === 4) return 'Plan al Rescate / Intervención prioritaria';
        if (prio === 3) return 'Seguimiento prioritario';
        if (prio === 2) return 'Seguimiento preventivo';
        return 'Acompañamiento normal';
    },

    /**
     * Devuelve acciones recomendadas basadas en la combinación de estados
     */
    getRecommendedActions(estadoEspiritual, estadoAsistencia) {
        const prio = this.getPriority(estadoAsistencia).level;
        const isNew = estadoEspiritual === 'Nuevo creyente' || estadoEspiritual === 'Nuevo';

        if (prio === 4) {
            return [
                'Contactar hoy',
                'Orar',
                'Conversar personalmente',
                isNew ? 'Programar seguimiento' : 'Seguimiento de restauración'
            ];
        } else if (prio === 3) {
            return [
                'Orar esta semana',
                'Escribir por WhatsApp',
                'Revisar si necesita apoyo'
            ];
        } else if (prio === 2) {
            return [
                'Saludar en la reunión',
                'Estar pendiente de su próxima asistencia'
            ];
        } else {
            return [
                'Seguimiento normal',
                'Mantener contacto esporádico'
            ];
        }
    },

    /**
     * Genera la etiqueta principal de la "Siguiente Tarea"
     */
    getNextTaskLabel(estadoEspiritual, estadoAsistencia) {
        const actions = this.getRecommendedActions(estadoEspiritual, estadoAsistencia);
        return actions[0] || 'Revisar';
    }
};
