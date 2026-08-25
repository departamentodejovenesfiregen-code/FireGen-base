/**
 * FireGen V3.0 — js/charts.js
 * ─────────────────────────────────────────────────────────────
 * MÓDULO DE GRÁFICOS
 * Inicializa y actualiza la gráfica de crecimiento anual.
 * Depende de: Chart.js (CDN), utils.js, firebase-config.js
 * ─────────────────────────────────────────────────────────────
 */

let growthChart = null;
let chartRefreshDebounce = null;

function initChart() {
    const ctx = document.getElementById('growthChart');
    if (!ctx) return;
    
    growthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Asistencia Promedio',
                    data: [],
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#ea580c',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    spanGaps: true
                },
                {
                    label: 'Nuevos',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.4,
                    fill: false,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#2563eb',
                    pointBorderWidth: 2,
                    pointRadius: 3,
                    spanGaps: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        color: '#94a3b8',
                        font: { family: "'Inter', sans-serif", size: 11 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleFont: { family: "'Inter', sans-serif", size: 13 },
                    bodyFont: { family: "'Inter', sans-serif", size: 12 },
                    padding: 10,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y;
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
                    ticks: { color: '#64748b', font: { size: 10 } },
                    title: {
                        display: true,
                        text: 'Promedio de asistentes',
                        color: '#64748b',
                        font: { size: 11 }
                    }
                },
                x: {
                    grid: { display: false, drawBorder: false },
                    ticks: { color: '#64748b', font: { size: 10 } }
                }
            }
        }
    });
}

function initChartYearSelect() {
    const sel = document.getElementById('chartYearSelect');
    if (!sel) return;
    sel.innerHTML = '';
    
    let startYear = new Date().getFullYear() - 2;
    let endYear = new Date().getFullYear() + 2;
    const current = new Date().getFullYear();
    
    if (AppConfig && AppConfig.current && AppConfig.current.period) {
        startYear = parseInt(AppConfig.current.period.start.substring(0, 4));
        endYear = parseInt(AppConfig.current.period.end.substring(0, 4));
    }

    for (let i = startYear; i <= endYear; i++) {
        const op = document.createElement('option');
        op.value = i;
        op.textContent = i;
        if (i === current) op.selected = true;
        sel.appendChild(op);
    }
}

/**
 * refreshChart — Carga los datos de Firebase y actualiza la gráfica.
 */
function refreshChart() {
    if (!growthChart) return;
    
    clearTimeout(chartRefreshDebounce);
    chartRefreshDebounce = setTimeout(() => {
        const yearSel = document.getElementById('chartYearSelect');
        const year = parseInt(yearSel ? yearSel.value : new Date().getFullYear());
        
        let opMonths = [];
        if (typeof AppConfig !== 'undefined' && typeof AppConfig.getOperationalMonths === 'function') {
            opMonths = AppConfig.getOperationalMonths(year);
        } else {
            for(let m=1; m<=12; m++) opMonths.push(`${year}-${String(m).padStart(2, '0')}`);
        }

        const labels = opMonths.map(ym => MESES_LABELS[parseInt(ym.split('-')[1]) - 1]);
        
        const promises = opMonths.map(ym => {
            return db.ref(`historicoMensual/${ym}`).once('value').then(snap => {
                const monthData = snap.val();
                if (monthData && monthData.cerrado) {
                    return { ym, avg: monthData.asistenciaPromedio, nuevos: monthData.nuevos };
                }
                // Si no está cerrado, revisar informes activos
                return db.ref(`informes/${ym}`).once('value').then(infSnap => {
                    const inf = infSnap.val();
                    if (!inf) return { ym, avg: null, nuevos: null };
                    
                    let totalAsist = 0;
                    let totalNuevos = 0;
                    let count = 0;

                    // Formato principal: informes/{ym}/fechas/{satDate}/{asist,nuevos}
                    const rows = inf.fechas
                        ? Object.values(inf.fechas)
                        : Object.keys(inf)
                            .filter(k => k.startsWith('sem'))
                            .map(k => inf[k]);

                    rows.forEach(s => {
                        if (s && s.asist !== undefined && s.asist !== '') {
                            totalAsist += parseInt(s.asist) || 0;
                            totalNuevos += parseInt(s.nuevos) || 0;
                            count++;
                        }
                    });
                    
                    if (count === 0) return { ym, avg: null, nuevos: null };
                    return { ym, avg: Math.round(totalAsist / count), nuevos: totalNuevos };
                });
            });
        });

        Promise.all(promises).then(results => {
            const avgData = results.map(r => (r.avg !== null && r.avg !== undefined) ? r.avg : null);
            const newResData = results.map(r => (r.nuevos !== null && r.nuevos !== undefined) ? r.nuevos : null);
            
            growthChart.data.labels = labels;
            growthChart.data.datasets[0].data = avgData;
            growthChart.data.datasets[1].data = newResData;
            growthChart.update();
        }).catch(err => console.error('[FireGen Charts] Error cargando datos de gráfica:', err));
    }, 600);
}
