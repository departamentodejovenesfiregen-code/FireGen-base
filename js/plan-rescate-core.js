/**
 * FireGen V3.0 — js/plan-rescate-core.js
 * ─────────────────────────────────────────────────────────────
 * MOTOR DE LÓGICA: PLAN AL RESCATE Y RUTAS DE ACOMPAÑAMIENTO
 * Etapa 5.2 / Build B3.275
 *
 * Estados espirituales: Nuevo | Oidor | Reconciliado | Bautizado | Líder
 * Estados de asistencia: Activo | Inconstante | Enfriándose | Alejándose
 *
 * Modelo de acciones: required | recommended | optional
 * ─────────────────────────────────────────────────────────────
 */

const RescueCore = {

    /**
     * Devuelve la Ruta de Formación según el Estado Espiritual
     */
    getFormationRoute(estadoEspiritual) {
        const map = {
            'Nuevo': 'Integración y fundamentos',
            'Nuevo creyente': 'Integración y fundamentos', // Compat legacy
            'Oidor': 'Acompañamiento y crecimiento',
            'Creyente': 'Acompañamiento y crecimiento',    // Compat legacy
            'Convertido': 'Formación y consolidación',     // Compat legacy
            'Reconciliado': 'Restauración y consolidación',
            'Bautizado': 'Formación y preparación para servir',
            'Líder': 'Formación de liderazgo y multiplicación'
        };
        return map[estadoEspiritual] || 'Formación general';
    },

    /**
     * Devuelve el nivel de prioridad (1-5) y su etiqueta según asistencia
     * 1: Normal, 2: Seguimiento, 3: Alta, 4: Crítica, 5: Prospecto
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
            return { level: 5, label: 'Prospecto', color: 'indigo', icon: '👤', bg: 'bg-indigo-50 text-indigo-700', border: 'border-indigo-200' };
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
     * Normaliza el estadoEspiritual a los nuevos valores.
     * Convierte legacy → actual de forma transparente.
     */
    normalizeEstadoEspiritual(esp) {
        if (!esp) return 'Nuevo';
        if (esp === 'Nuevo creyente') return 'Nuevo';
        if (esp === 'Creyente') return 'Oidor';
        if (esp === 'Convertido') return 'Oidor';
        return esp;
    },

    /**
     * Devuelve acciones recomendadas (compatibilidad con UI legacy).
     * Usa getWeeklyDiscipleshipPlan internamente.
     */
    getRecommendedActions(estadoEspiritual, estadoAsistencia) {
        const plan = this.getWeeklyDiscipleshipPlan(estadoAsistencia, estadoEspiritual);
        // Devuelve solo las etiquetas de acciones required + recommended
        return plan.tareas
            .filter(t => t.type === 'required' || t.type === 'recommended')
            .map(t => t.label);
    },

    /**
     * Genera la etiqueta principal de la "Siguiente Tarea"
     */
    getNextTaskLabel(estadoEspiritual, estadoAsistencia) {
        const plan = this.getWeeklyDiscipleshipPlan(estadoAsistencia, estadoEspiritual);
        const first = plan.tareas.find(t => t.type === 'required');
        return first ? first.label : 'Revisar';
    },

    /**
     * ═══════════════════════════════════════════════════════════
     * MOTOR CENTRAL DE DISCIPULADO SEMANAL
     * Fuente única de verdad para planes de acompañamiento.
     *
     * Cada tarea tiene:
     *   id:    identificador único
     *   label: texto legible
     *   type:  'required' | 'recommended' | 'optional'
     * ═══════════════════════════════════════════════════════════
     */
    getWeeklyDiscipleshipPlan(estadoAsistencia, estadoEspiritual) {
        const asis = (estadoAsistencia || '').toLowerCase();
        const espNorm = this.normalizeEstadoEspiritual(estadoEspiritual);
        const esp = (espNorm || '').toLowerCase();

        let nivel = 'Normal';
        let objetivo = 'Acompañamiento normal y crecimiento.';
        let tareas = [];

        // ── ALEJÁNDOSE (Crítica) ────────────────────────────────
        if (asis.includes('alejándos') || asis.includes('alejado')) {
            nivel = 'Crítico';
            objetivo = 'Restauración y recuperación.';
            tareas = [
                { id: 'registrar_resultado', label: 'Registrar resultado', type: 'required' },
                { id: 'orar', label: 'Orar', type: 'recommended' },
                { id: 'contactar', label: 'Contactar', type: 'recommended' },
                { id: 'escuchar', label: 'Escuchar', type: 'recommended' },
                { id: 'conversar', label: 'Conversar', type: 'recommended' },
                { id: 'detectar_causa', label: 'Detectar causa', type: 'recommended' },
                { id: 'invitar_regresar', label: 'Invitar a regresar', type: 'recommended' },
                { id: 'acompanamiento_personal', label: 'Acompañamiento personal', type: 'recommended' },
                { id: 'visita', label: 'Visita (opcional)', type: 'optional' },
                { id: 'otra_accion', label: 'Otra acción realizada', type: 'optional' }
            ];

            // Matiz según estado espiritual
            if (esp === 'nuevo') {
                objetivo = 'Restauración y recuperación — fundamentos e integración.';
            } else if (esp === 'oidor') {
                objetivo = 'Restauración y recuperación — acompañamiento y crecimiento.';
            } else if (esp === 'bautizado') {
                objetivo = 'Restauración y recuperación — crecimiento y servicio.';
            } else if (esp === 'líder' || esp === 'lider') {
                objetivo = 'Restauración y recuperación — liderazgo y acompañamiento.';
            } else if (esp === 'reconciliado') {
                objetivo = 'Restauración y recuperación — fortalecimiento y continuidad.';
            }

        // ── ENFRIÁNDOSE (Alta) ──────────────────────────────────
        } else if (asis.includes('enfriándos') || asis.includes('enfriado')) {
            nivel = 'Prioridad alta';
            objetivo = 'Detectar necesidad y fortalecer el vínculo.';
            tareas = [
                { id: 'registrar_resultado', label: 'Registrar resultado', type: 'required' },
                { id: 'orar', label: 'Orar', type: 'recommended' },
                { id: 'contactar', label: 'Contactar', type: 'recommended' },
                { id: 'conversar', label: 'Conversar', type: 'recommended' },
                { id: 'detectar_necesidad', label: 'Detectar necesidad', type: 'recommended' },
                { id: 'ofrecer_apoyo', label: 'Ofrecer apoyo', type: 'recommended' },
                { id: 'invitar', label: 'Invitar', type: 'recommended' },
                { id: 'visita', label: 'Visita (opcional)', type: 'optional' },
                { id: 'otra_accion', label: 'Otra acción realizada', type: 'optional' }
            ];

            // Matiz según estado espiritual
            if (esp === 'nuevo') {
                objetivo = 'Detectar necesidad — integración y fundamentos.';
            } else if (esp === 'bautizado') {
                objetivo = 'Fortalecer crecimiento y vínculo.';
            } else if (esp === 'líder' || esp === 'lider') {
                objetivo = 'Fortalecer vínculo — liderazgo y acompañamiento.';
            }

        // ── INCONSTANTE (Seguimiento) ───────────────────────────
        } else if (asis.includes('inconstante')) {
            nivel = 'Seguimiento preventivo';
            objetivo = 'Recuperar constancia.';
            tareas = [
                { id: 'registrar_resultado', label: 'Registrar resultado', type: 'required' },
                { id: 'orar', label: 'Orar', type: 'recommended' },
                { id: 'acompanar', label: 'Acompañar', type: 'recommended' },
                { id: 'enviar_mensaje', label: 'Enviar mensaje', type: 'recommended' },
                { id: 'llamar', label: 'Llamar', type: 'recommended' },
                { id: 'revisar_proxima', label: 'Revisar próxima asistencia', type: 'recommended' },
                { id: 'identificar_dificultad', label: 'Identificar dificultad', type: 'recommended' },
                { id: 'visita', label: 'Visita (opcional)', type: 'optional' },
                { id: 'otra_accion', label: 'Otra acción realizada', type: 'optional' }
            ];

        // ── ACTIVO (Normal) ─────────────────────────────────────
        } else {
            nivel = 'Normal';
            tareas = [
                { id: 'registrar_resultado', label: 'Registrar resultado', type: 'required' },
                { id: 'orar', label: 'Orar', type: 'recommended' },
                { id: 'acompanar', label: 'Acompañar', type: 'recommended' }
            ];

            // Adaptar según estado espiritual
            if (esp === 'nuevo') {
                objetivo = 'Integración y fortalecimiento de fundamentos.';
                tareas.push(
                    { id: 'discipulado', label: 'Discipulado', type: 'recommended' },
                    { id: 'enviar_mensaje', label: 'Enviar mensaje', type: 'optional' },
                    { id: 'conversar', label: 'Conversar', type: 'optional' }
                );
            } else if (esp === 'oidor') {
                objetivo = 'Acompañamiento y fortalecimiento de participación.';
                tareas.push(
                    { id: 'discipulado', label: 'Discipulado', type: 'recommended' },
                    { id: 'animar_avanzar', label: 'Animar a avanzar', type: 'recommended' },
                    { id: 'conversar', label: 'Conversar', type: 'optional' }
                );
            } else if (esp === 'reconciliado') {
                objetivo = 'Restauración y fortalecimiento de continuidad.';
                tareas.push(
                    { id: 'fortalecer', label: 'Fortalecer continuidad', type: 'recommended' },
                    { id: 'enviar_mensaje', label: 'Enviar mensaje', type: 'optional' },
                    { id: 'conversar', label: 'Conversar', type: 'optional' }
                );
            } else if (esp === 'bautizado') {
                objetivo = 'Crecimiento, formación y servicio.';
                tareas.push(
                    { id: 'formacion', label: 'Formación', type: 'recommended' },
                    { id: 'servicio', label: 'Estimular servicio', type: 'recommended' },
                    { id: 'conversar', label: 'Conversar', type: 'optional' }
                );
            } else if (esp === 'líder' || esp === 'lider') {
                objetivo = 'Liderazgo, multiplicación y formación.';
                tareas.push(
                    { id: 'liderazgo', label: 'Fortalecer liderazgo', type: 'recommended' },
                    { id: 'multiplicacion', label: 'Estimular multiplicación', type: 'recommended' },
                    { id: 'formacion', label: 'Formación', type: 'optional' }
                );
            } else {
                // Fallback
                objetivo = 'Acompañamiento normal y crecimiento.';
                tareas.push(
                    { id: 'discipulado', label: 'Discipulado', type: 'recommended' },
                    { id: 'conversar', label: 'Conversar', type: 'optional' }
                );
            }

            // Acciones opcionales comunes para Activo
            tareas.push(
                { id: 'visita', label: 'Visita (opcional)', type: 'optional' },
                { id: 'actividad_especial', label: 'Actividad especial', type: 'optional' },
                { id: 'otra_accion', label: 'Otra acción realizada', type: 'optional' }
            );
        }

        return {
            nivel,
            objetivo,
            tareas
        };
    },

    /**
     * Migra datos legacy de estadoEspiritual en Firebase.
     * Ejecutar una sola vez. Idempotente.
     */
    migrateEstadosEspirituales() {
        if (typeof db === 'undefined') {
            console.warn('[RescueCore] db no disponible para migración.');
            return Promise.resolve(0);
        }
        return db.ref('miembros').once('value').then(snap => {
            const data = snap.val();
            if (!data) return 0;
            const updates = {};
            let count = 0;
            Object.keys(data).forEach(key => {
                const m = data[key];
                if (m.estadoEspiritual === 'Nuevo creyente') {
                    updates[`miembros/${key}/estadoEspiritual`] = 'Nuevo';
                    count++;
                } else if (m.estadoEspiritual === 'Creyente') {
                    updates[`miembros/${key}/estadoEspiritual`] = 'Oidor';
                    count++;
                }
                // FASE3-S5.2: NO convertir Convertido → Oidor automáticamente.
                // Convertido se mantiene salvo justificación expresa del modelo de datos.
            });
            if (count === 0) {
                console.log('[RescueCore] Migración: nada que migrar, todos actualizados.');
                return 0;
            }
            return db.ref().update(updates).then(() => {
                console.log(`[RescueCore] Migración completada: ${count} miembros actualizados.`);
                return count;
            });
        });
    }
};
