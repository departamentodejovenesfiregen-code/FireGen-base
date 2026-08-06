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
            labels: MESES_LABELS,
            datasets: [
                {
                    label: 'Asistencia Promedio',
                    data: Array(12).fill(0),
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#ea580c',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: 'Nuevos',
                    data: Array(12).fill(0),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.4,
                    fill: false,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#2563eb',
                    pointBorderWidth: 2,
                    pointRadius: 3
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
                    displayColors: true
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
                    ticks: { color: '#64748b', font: { size: 10 } }
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
 * FIX: OPT-03 — Incluye debounce para evitar saturar Firebase al tipear rápido.
 */
function refreshChart() {
    if (!growthChart) return;
    
    clearTimeout(chartRefreshDebounce);
    chartRefreshDebounce = setTimeout(() => {
        const yearSel = document.getElementById('chartYearSelect');
        const year = parseInt(yearSel ? yearSel.value : new Date().getFullYear());
        
        db.ref('estrategias/' + year).once('value').then(snap => {
            const data = snap.val() || {};
            const avgData = [];
            const newResData = [];
            
            MESES_KEYS.forEach(mKey => {
                const monthData = data[mKey] || {};
                avgData.push(monthData.avg || 0);
                // "nuevos" en historic table puede llamarse "nuevos"
                newResData.push(monthData.nuevos || 0); 
            });
            
            growthChart.data.datasets[0].data = avgData;
            growthChart.data.datasets[1].data = newResData;
            growthChart.update();
        }).catch(err => console.error('[FireGen Charts] Error al actualizar gráfica:', err));
    }, 300);
}


