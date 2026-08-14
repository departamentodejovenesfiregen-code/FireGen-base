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
        if (state === 'prospecto') {
            return { level: 2, label: 'Prospecto', color: 'indigo', icon: '👤', bg: 'bg-indigo-50 text-indigo-700', border: 'border-indigo-200' };
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
            if (estadoAsistencia === 'Prospecto') {
                return [
                    'Orar',
                    'Contactar (opcional)',
                    'Invitar',
                    'Encuesta (opcional)'
                ];
            }
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
    },

    /**
     * Genera el plan semanal de discipulado combinando asistencia y estado espiritual
     */
    getWeeklyDiscipleshipPlan(estadoAsistencia, estadoEspiritual) {
        const asis = (estadoAsistencia || '').toLowerCase();
        const esp = (estadoEspiritual || '').toLowerCase();
        
        let nivel = 'Normal';
        let objetivo = 'Acompañamiento normal';
        let tareas = [];

        // Identificar el nivel base por asistencia
        if (asis.includes('alejándos') || asis.includes('alejado')) {
            nivel = 'Crítico';
            objetivo = 'Restauración y recuperación';
            tareas = [
                { id: 'orar', label: 'Orar', required: true },
                { id: 'contactar', label: 'Contactar', required: true },
                { id: 'conversar', label: 'Escuchar / conversar', required: true },
                { id: 'detectar_causa', label: 'Detectar causa del alejamiento', required: true },
                { id: 'invitar_regresar', label: 'Invitar a regresar', required: true },
                { id: 'planificar_siguiente', label: 'Planificar siguiente acompañamiento', required: true }
            ];
            
            if (esp.includes('nuevo')) {
                objetivo += ' (Fundamentos e integración)';
            } else if (esp.includes('líder') || esp.includes('lider')) {
                objetivo += ' (Liderazgo y responsabilidad)';
            }

        } else if (asis.includes('enfriándos') || asis.includes('enfriado')) {
            nivel = 'Prioridad alta';
            objetivo = 'Detectar el problema antes de un alejamiento mayor';
            tareas = [
                { id: 'orar', label: 'Orar', required: true },
                { id: 'contactar', label: 'Contactar', required: true },
                { id: 'conversar', label: 'Conversar', required: true },
                { id: 'detectar_necesidad', label: 'Detectar necesidad', required: true },
                { id: 'ofrecer_apoyo', label: 'Ofrecer apoyo', required: true }
            ];

        } else if (asis.includes('inconstante')) {
            nivel = 'Seguimiento preventivo';
            objetivo = 'Recuperar constancia';
            tareas = [
                { id: 'orar', label: 'Orar', required: true },
                { id: 'saludar_acompanar', label: 'Saludar / acompañar', required: true },
                { id: 'contactar_opcional', label: 'Contactar cuando corresponda', required: false },
                { id: 'revisar_proxima', label: 'Revisar próxima asistencia', required: true },
                { id: 'identificar_dificultad', label: 'Identificar dificultad', required: true }
            ];

        } else {
            // ACTIVO (default)
            nivel = 'Normal';
            objetivo = 'Acompañamiento y formación';
            
            tareas = [
                { id: 'saludar', label: 'Saludar / recibir bien', required: true },
                { id: 'acompanar', label: 'Acompañar', required: true },
                { id: 'orar', label: 'Orar', required: true }
            ];

            // Ajustar según estado espiritual
            if (esp.includes('nuevo')) {
                objetivo = 'Integración y fundamentos';
                tareas.push({ id: 'revisar_integracion', label: 'Revisar integración', required: true });
                tareas.push({ id: 'discipulado_inicial', label: 'Discipulado inicial', required: true });
            } else if (esp.includes('reconciliado')) {
                objetivo = 'Restauración y consolidación';
                tareas.push({ id: 'revisar_restauracion', label: 'Revisar restauración', required: true });
                tareas.push({ id: 'fortalecer_continuidad', label: 'Fortalecer continuidad', required: true });
            } else if (esp.includes('bautizado')) {
                objetivo = 'Crecimiento, formación y servicio';
                tareas.push({ id: 'fortalecer_formacion', label: 'Fortalecer formación', required: true });
                tareas.push({ id: 'estimular_servicio', label: 'Estimular servicio', required: true });
            } else if (esp.includes('líder') || esp.includes('lider')) {
                objetivo = 'Acompañamiento de liderazgo y multiplicación';
                tareas.push({ id: 'revisar_liderazgo', label: 'Revisar liderazgo', required: true });
                tareas.push({ id: 'estimular_multiplicacion', label: 'Estimular multiplicación', required: true });
            } else {
                // Creyente / Convertido
                objetivo = 'Formación, consolidación y crecimiento';
                tareas.push({ id: 'revisar_crecimiento', label: 'Revisar crecimiento', required: true });
                tareas.push({ id: 'continuar_formacion', label: 'Continuar formación', required: true });
            }
        }

        return {
            nivel,
            objetivo,
            tareas
        };
    }
};
