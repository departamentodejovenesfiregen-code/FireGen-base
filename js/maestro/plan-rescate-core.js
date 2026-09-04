/**
 * FireGen V3.0 — js/plan-rescate-core.js
 * ─────────────────────────────────────────────────────────────
 * MOTOR DE LÓGICA: PLAN AL RESCATE Y RUTAS DE ACOMPAÑAMIENTO
 * Etapa 5.2 / Build B3.275
 *
 * Estados espirituales: Nuevo | Oidor | Convertido | Reconciliado | Bautizado | Líder
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
            'Nuevo': 'Integración + fundamentos + acompañamiento.',
            'Nuevo creyente': 'Integración + fundamentos + acompañamiento.',
            'Oidor': 'Evangelización + acompañamiento + participación.',
            'Creyente': 'Evangelización + acompañamiento + participación.',
            'Convertido': 'Consolidación + discipulado inicial + fundamentos + crecimiento.',
            'Reconciliado': 'Restauración + consolidación + continuidad.',
            'Bautizado': 'Crecimiento + madurez + formación + servicio.',
            'Líder': 'Liderazgo + formación + multiplicación.'
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
        if (state.includes('sin determinar')) {
            return { level: 1, label: 'En evaluación', color: 'slate', icon: '⏳', bg: 'bg-slate-50 text-slate-600', border: 'border-slate-200' };
        }
        return { level: 1, label: 'Normal', color: 'green', icon: '🟢', bg: 'bg-green-50 text-green-700', border: 'border-green-200' };
    },

    /**
     * Devuelve la Ruta de Acompañamiento según el estado de asistencia
     */
    getAccompanimentRoute(estadoAsistencia) {
        const state = (estadoAsistencia || '').toLowerCase();
        if (state.includes('sin determinar')) return 'Evaluación inicial';
        
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
            } else if (esp === 'convertido') {
                objetivo = 'Restauración y recuperación — consolidación.';
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
            } else if (esp === 'oidor') {
                objetivo = 'Detectar necesidad — evangelización.';
            } else if (esp === 'convertido') {
                objetivo = 'Detectar necesidad — consolidación.';
            } else if (esp === 'reconciliado') {
                objetivo = 'Restauración, fortalecimiento y continuidad.';
                tareas = [
                    { id: 'registrar_resultado', label: 'Registrar resultado', type: 'required' },
                    { id: 'orar', label: 'Orar', type: 'recommended' },
                    { id: 'acompanar', label: 'Acompañar', type: 'recommended' },
                    { id: 'conversar', label: 'Conversar', type: 'recommended' },
                    { id: 'detectar_necesidad', label: 'Detectar necesidad', type: 'recommended' },
                    { id: 'fortalecer_continuidad', label: 'Fortalecer continuidad', type: 'recommended' },
                    { id: 'invitar', label: 'Invitar cuando corresponda', type: 'recommended' },
                    { id: 'visita', label: 'Visita (opcional)', type: 'optional' },
                    { id: 'otra_accion', label: 'Otra acción realizada', type: 'optional' }
                ];
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

            // Matiz según estado espiritual
            if (esp === 'nuevo') {
                objetivo = 'Recuperar constancia — orientación de integración inicial.';
            } else if (esp === 'oidor') {
                objetivo = 'Recuperar constancia — acompañamiento y evangelización.';
                tareas.push({ id: 'evangelizacion', label: 'Evangelización / Participación', type: 'recommended' });
            } else if (esp === 'convertido') {
                objetivo = 'Recuperar constancia — consolidación y discipulado.';
                tareas.push({ id: 'consolidar', label: 'Consolidación / Discipulado', type: 'recommended' });
            } else if (esp === 'reconciliado') {
                objetivo = 'Recuperar constancia — restauración y continuidad.';
                tareas.push({ id: 'restauracion', label: 'Restauración / Continuidad', type: 'recommended' });
            } else if (esp === 'bautizado') {
                objetivo = 'Recuperar constancia — crecimiento y acompañamiento.';
                tareas.push({ id: 'crecimiento', label: 'Crecimiento / Acompañamiento', type: 'recommended' });
            } else if (esp === 'líder' || esp === 'lider') {
                objetivo = 'Recuperar constancia — liderazgo y acompañamiento.';
                tareas.push({ id: 'liderazgo', label: 'Liderazgo / Acompañamiento', type: 'recommended' });
            }
        // ── SIN DETERMINAR (En evaluación) ──────────────────────
        } else if (asis.includes('sin determinar')) {
            nivel = 'En evaluación';
            tareas = [
                { id: 'registrar_resultado', label: 'Registrar resultado', type: 'required' },
                { id: 'orar', label: 'Orar', type: 'recommended' },
                { id: 'acompanar', label: 'Acompañar', type: 'recommended' },
                { id: 'conversar', label: 'Conversar', type: 'optional' },
                { id: 'otra_accion', label: 'Otra acción realizada', type: 'optional' }
            ];
            objetivo = 'Acompañamiento inicial y observación.';

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
                objetivo = 'Evangelización, acompañamiento y participación.';
                tareas.push(
                    { id: 'evangelizacion', label: 'Evangelización', type: 'recommended' },
                    { id: 'animar_avanzar', label: 'Animar a avanzar', type: 'recommended' },
                    { id: 'conversar', label: 'Conversar', type: 'optional' }
                );
            } else if (esp === 'convertido') {
                objetivo = 'Discipulado, consolidación y crecimiento.';
                tareas.push(
                    { id: 'discipulado', label: 'Discipulado', type: 'recommended' },
                    { id: 'consolidar', label: 'Consolidar', type: 'recommended' },
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
     * Ejecutar una sola vez. Idempotente mediante localStorage.
     */
    migrateEstadosEspirituales() {
        if (typeof db === 'undefined') {
            console.warn('[RescueCore] db no disponible para migración.');
            return Promise.resolve(0);
        }
        if (localStorage.getItem('firegen_migration_estados_v3') === 'true') {
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
            });
            if (count === 0) {
                console.log('[RescueCore] Migración: nada que migrar, todos actualizados.');
                localStorage.setItem('firegen_migration_estados_v3', 'true');
                return 0;
            }
            return db.ref().update(updates).then(() => {
                console.log(`[RescueCore] Migración completada: ${count} miembros actualizados.`);
                localStorage.setItem('firegen_migration_estados_v3', 'true');
                return count;
            }).catch(err => {
                console.warn('[RescueCore] Error en migración (quizá falta de permisos, ignorar si no es admin):', err);
                return 0;
            });
        });
    },

    /**
     * Paso A - Normalizar datos de líderes.
     * Si un miembro tiene 'lider' pero no 'liderMiembroId', busca si existe una correspondencia
     * exacta e inequívoca con un miembro existente para completar 'liderMiembroId'.
     */
    normalizeLiderMiembroId() {
        if (typeof db === 'undefined') return Promise.resolve(0);
        if (localStorage.getItem('firegen_norm_liderid_v1') === 'true') return Promise.resolve(0);

        return db.ref('miembros').once('value').then(snap => {
            const data = snap.val();
            if (!data) return 0;

            const miembrosArray = Object.keys(data).map(k => ({ ...data[k], key: k }));
            const updates = {};
            let count = 0;

            miembrosArray.forEach(m => {
                if (!m.liderMiembroId && m.lider && m.lider !== 'No aplica') {
                    // Buscar coincidencia exacta de nombre
                    const matches = miembrosArray.filter(potencial => 
                        potencial.nombre && potencial.nombre.toLowerCase() === m.lider.toLowerCase()
                    );

                    // Solo actualizar si hay una correspondencia INEQUÍVOCA (única)
                    if (matches.length === 1) {
                        updates[`miembros/${m.key}/liderMiembroId`] = matches[0].key;
                        count++;
                    }
                }
            });

            if (count === 0) {
                localStorage.setItem('firegen_norm_liderid_v1', 'true');
                return 0;
            }

            return db.ref().update(updates).then(() => {
                console.log(`[RescueCore] Normalización liderMiembroId completada: ${count} actualizados.`);
                localStorage.setItem('firegen_norm_liderid_v1', 'true');
                return count;
            }).catch(err => {
                console.warn('[RescueCore] Error en normalización (quizá falta permisos):', err);
                return 0;
            });
        });
    },

    /**
     * FASE 3 - Etapa 5.2 - MIGRACIÓN DEL PLAN SEMANAL ANTIGUO (Point 8)
     * Lee miembros/{miembroId}/planSemanal y lo migra a planesDiscipulado/{miembroId}/...
     * No borra el original, es idempotente, no sobreescribe.
     */
    migratePlanSemanal() {
        if (typeof db === 'undefined') return Promise.resolve(0);
        if (localStorage.getItem('firegen_migr_plansemanal_v1') === 'true') return Promise.resolve(0);

        return Promise.all([
            db.ref('miembros').once('value'),
            db.ref('planesDiscipulado').once('value')
        ]).then(([mSnap, pSnap]) => {
            const miembros = mSnap.val();
            const planesExistentes = pSnap.val() || {};
            if (!miembros) return 0;

            const updates = {};
            let count = 0;

            Object.keys(miembros).forEach(mId => {
                const m = miembros[mId];
                if (m.planSemanal) {
                    Object.keys(m.planSemanal).forEach(semanaKey => {
                        // Solo migramos si el destino no existe, para no sobrescribir uno nuevo
                        if (!(planesExistentes[mId] && planesExistentes[mId][semanaKey])) {
                            updates[`planesDiscipulado/${mId}/${semanaKey}`] = m.planSemanal[semanaKey];
                            count++;
                        }
                    });
                }
            });

            if (count === 0) {
                localStorage.setItem('firegen_migr_plansemanal_v1', 'true');
                return 0;
            }

            return db.ref().update(updates).then(() => {
                console.log(`[RescueCore] Migración planesDiscipulado completada: ${count} semanas migradas.`);
                localStorage.setItem('firegen_migr_plansemanal_v1', 'true');
                return count;
            }).catch(err => {
                console.warn('[RescueCore] Error al migrar planesDiscipulado:', err);
                return 0;
            });
        });
    }
};

// Auto-ejecutar la migración al cargar de forma diferida
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (typeof db !== 'undefined' && typeof window.currentUserData !== 'undefined') {
                // Solo intentar si es un rol con permisos de escritura masiva (admin o coordinador)
                if (window.currentUserData.rol === 'admin' || window.currentUserData.rol === 'coordinador') {
                    RescueCore.migrateEstadosEspirituales();
                    RescueCore.normalizeLiderMiembroId();
                    RescueCore.migratePlanSemanal();
                }
            }
        }, 5000);
    });
}
