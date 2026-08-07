// Configuración Global de la Aplicación FireGen V3.0

const AppConfig = {
    // Valores por defecto
    defaults: {
        appName: "FireGen V3.0",
        ministryName: "Jóvenes FireGen",
        churchName: "La Casa de Dios - 2da Iglesia Cuadrangular",
        adminEmail: "departamentodejovenesfiregen@gmail.com",
        period: {
            start: "2026-07-25", // 25 de julio de 2026
            end: "2029-07-31"    // 31 de julio de 2029
        },
        colors: {
            primary: "#f97316",
            secondary: "#ea580c"
        },
        logos: {
            main: "assets/logo/logo-principal.png",
            institutional: "assets/logo/logo-institucional.png"
        }
    },

    // Objeto donde se almacenará la configuración actual (puede ser sobreescrita por Firebase)
    current: {},

    // Inicializar configuración
    async init() {
        // Cargar defaults inicialmente
        this.current = { ...this.defaults };

        try {
            // Intentar cargar configuración desde Firebase si auth está listo
            if (typeof db !== 'undefined' && db && typeof auth !== 'undefined' && auth) {
                auth.onAuthStateChanged(async (user) => {
                    if (user) {
                        try {
                            const snapshot = await db.ref('configuracion').once('value');
                            if (snapshot.exists()) {
                                const dbConfig = snapshot.val();
                                // Fusionar configuración (Firebase sobrescribe defaults)
                                this.current = { ...this.defaults, ...dbConfig };

                                // Asegurar que el periodo siempre se mantenga si no está en Firebase
                                if (!dbConfig.period) {
                                    this.current.period = this.defaults.period;
                                }
                            }
                        } catch (e) {
                            console.error("Error cargando configuración de Firebase:", e);
                        }
                    }
                    this.applyPeriodLimits();
                    window.dispatchEvent(new Event('configLoaded'));
                });
            } else {
                this.applyPeriodLimits();
                window.dispatchEvent(new Event('configLoaded'));
            }
        } catch (error) {
            console.error("Error inicializando config:", error);
            this.applyPeriodLimits();
            window.dispatchEvent(new Event('configLoaded'));
        }
    },

    // Aplicar límites a los inputs de fecha según el periodo
    applyPeriodLimits() {
        if (!this.current.period) return;

        const startMonth = this.current.period.start.substring(0, 7);
        const endMonth = this.current.period.end.substring(0, 7);

        document.querySelectorAll('input[type="month"]').forEach(input => {
            input.min = startMonth;
            input.max = endMonth;
            if (input.value && input.value < startMonth) input.value = startMonth;
            if (input.value && input.value > endMonth) input.value = endMonth;
        });
    },

    // Validar si una fecha está dentro del periodo oficial
    isDateInPeriod(dateString) {
        const checkDate = new Date(dateString);
        const startDate = new Date(this.current.period.start);
        const endDate = new Date(this.current.period.end);

        // Retorna true si la fecha está entre start y end
        return checkDate >= startDate && checkDate <= endDate;
    }
};

// Inicializar la configuración global inmediatamente
AppConfig.init();
