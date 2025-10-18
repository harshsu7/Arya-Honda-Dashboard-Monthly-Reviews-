// Chart creation and management utilities

class ChartManager {
    constructor() {
        this.charts = new Map();
    }

    // Create speedometer chart
    createSpeedometer(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        const ctx = canvas.getContext('2d');
        const { location, achievement, target, actual, title } = data;

        // Destroy existing chart if it exists
        if (this.charts.has(canvasId)) {
            this.charts.get(canvasId).destroy();
        }

        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [Math.min(achievement, 100), Math.max(0, 100 - achievement)],
                    backgroundColor: [
                        achievement >= 100 ? '#16a34a' : 
                        achievement >= 70 ? '#eab308' : '#dc2626',
                        '#e5e7eb'
                    ],
                    borderWidth: 0,
                    cutout: '70%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false
                    }
                }
            },
            plugins: [{
                afterDraw: (chart) => {
                    const { ctx, chartArea } = chart;
                    const centerX = (chartArea.left + chartArea.right) / 2;
                    const centerY = (chartArea.top + chartArea.bottom) / 2;

                    ctx.save();
                    ctx.font = 'bold 14px Inter';
                    ctx.fillStyle = '#111827';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(`${achievement.toFixed(1)}%`, centerX, centerY);
                    ctx.restore();
                }
            }]
        });

        this.charts.set(canvasId, chart);
        return chart;
    }

    // Create performance combo chart (bar + line)
    createPerformanceChart(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        const ctx = canvas.getContext('2d');

        // Destroy existing chart if it exists
        if (this.charts.has(canvasId)) {
            this.charts.get(canvasId).destroy();
        }

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.month),
                datasets: [
                    {
                        label: 'Target (₹ Lakhs)',
                        type: 'line',
                        data: data.map(item => item.target),
                        borderColor: '#dc2626',
                        backgroundColor: 'rgba(220, 38, 38, 0.1)',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.1,
                        pointBackgroundColor: '#dc2626',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Actual (₹ Lakhs)',
                        type: 'bar',
                        data: data.map(item => item.actual),
                        backgroundColor: data.map(item => {
                            const achievement = item.target > 0 ? (item.actual / item.target) * 100 : 0;
                            if (achievement >= 100) return 'rgba(34, 197, 94, 0.8)';
                            if (achievement >= 70) return 'rgba(234, 179, 8, 0.8)';
                            return 'rgba(239, 68, 68, 0.8)';
                        }),
                        borderColor: data.map(item => {
                            const achievement = item.target > 0 ? (item.actual / item.target) * 100 : 0;
                            if (achievement >= 100) return '#16a34a';
                            if (achievement >= 70) return '#ca8a04';
                            return '#dc2626';
                        }),
                        borderWidth: 1,
                        yAxisID: 'y'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#111827',
                        bodyColor: '#374151',
                        borderColor: '#e5e7eb',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.y;
                                const label = context.dataset.label;
                                return `${label}: ₹${value.toFixed(1)}L`;
                            },
                            afterBody: function(tooltipItems) {
                                const dataIndex = tooltipItems[0].dataIndex;
                                const actual = data[dataIndex].actual;
                                const target = data[dataIndex].target;
                                const achievement = target > 0 ? (actual / target) * 100 : 0;
                                return `Achievement: ${achievement.toFixed(1)}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#6b7280'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Amount (₹ Lakhs)',
                            color: '#374151'
                        },
                        grid: {
                            color: 'rgba(107, 114, 128, 0.1)'
                        },
                        ticks: {
                            color: '#6b7280',
                            callback: function(value) {
                                return `₹${value}L`;
                            }
                        }
                    }
                }
            }
        });

        this.charts.set(canvasId, chart);
        return chart;
    }

    // Destroy chart
    destroyChart(canvasId) {
        if (this.charts.has(canvasId)) {
            this.charts.get(canvasId).destroy();
            this.charts.delete(canvasId);
        }
    }

    // Destroy all charts
    destroyAllCharts() {
        this.charts.forEach(chart => chart.destroy());
        this.charts.clear();
    }
}

// Global chart manager instance
window.chartManager = new ChartManager();

// Speedometer component creator
function createSpeedometerComponent(data) {
    const { location, achievement, target, actual, title } = data;
    const canvasId = `speedometer-${location.toLowerCase().replace(/\s+/g, '-')}-${title.toLowerCase().replace(/\s+/g, '-')}`;
    
    const achievementClass = achievement >= 100 ? 'achieved' : 
                            achievement >= 70 ? 'below-target' : 'needs-action';
    
    const container = document.createElement('div');
    container.className = 'speedometer-container';
    container.innerHTML = `
        <div class="speedometer-title">${title}</div>
        <div class="speedometer-location">${location}</div>
        <div class="speedometer-chart">
            <canvas id="${canvasId}" width="120" height="120"></canvas>
        </div>
        <div class="speedometer-value ${achievementClass}">
            ${achievement.toFixed(1)}%
        </div>
        <div class="speedometer-details">
            ${title.includes('Sales') ? 
                `₹${(actual / 100000).toFixed(1)}L / ₹${(target / 100000).toFixed(1)}L` :
                `${actual.toLocaleString()} / ${target.toLocaleString()}`
            }
        </div>
    `;
    
    // Create the chart after a small delay to ensure the canvas is in the DOM
    setTimeout(() => {
        window.chartManager.createSpeedometer(canvasId, data);
    }, 10);
    
    return container;
}

// Performance card creator
function createPerformanceCard(data, color = 'blue') {
    const { title, value, subtitle } = data;
    
    const card = document.createElement('div');
    card.className = `performance-card ${color}`;
    card.innerHTML = `
        <p class="text-2xl font-bold text-${color}-600">${value}</p>
        <p class="text-sm text-gray-600">${title}</p>
        <p class="text-xs text-gray-500 mt-1">${subtitle}</p>
    `;
    
    return card;
}

// KPI card creator
function createKPICard(data) {
    const { title, actual, target, unit, format, trend } = data;
    
    let formattedActual, formattedTarget;
    
    switch (format) {
        case 'currency':
            formattedActual = formatCurrency(actual);
            formattedTarget = formatCurrency(target);
            break;
        case 'percentage':
            formattedActual = formatPercentage(actual);
            formattedTarget = formatPercentage(target);
            break;
        default:
            formattedActual = formatNumber(actual);
            formattedTarget = formatNumber(target);
    }
    
    const achievement = target > 0 ? (actual / target) * 100 : 0;
    const achievementClass = getAchievementClass(achievement);
    
    const card = document.createElement('div');
    card.className = 'kpi-card';
    card.innerHTML = `
        <div class="kpi-card-header">
            <div class="kpi-card-title">${title}</div>
            <div class="achievement-badge ${achievementClass}">
                ${formatPercentage(achievement)}
            </div>
        </div>
        <div class="kpi-card-value">${formattedActual}</div>
        <div class="kpi-card-progress">
            <div class="kpi-card-progress-bar ${achievementClass}" 
                 style="width: ${Math.min(achievement, 100)}%"></div>
        </div>
        <div class="kpi-card-details">
            <span>Target: ${formattedTarget}</span>
            <span>Shortfall: ${formatCurrency(Math.max(0, target - actual))}</span>
        </div>
    `;
    
    return card;
}

// Category section creator
function createCategorySection(title, items, color = 'blue', location = '') {
    if (!items || items.length === 0) {
        return createEmptyState(title, `No ${title.toLowerCase()} data available for ${location}`);
    }
    
    const section = document.createElement('div');
    section.className = 'category-section';
    
    const header = document.createElement('div');
    header.className = 'category-header';
    header.innerHTML = `<h3 class="category-title">${title}</h3>`;
    
    const grid = document.createElement('div');
    grid.className = 'category-grid';
    
    items.forEach(item => {
        const metricItem = document.createElement('div');
        metricItem.className = 'metric-item';
        
        const achievement = item.achievement || 0;
        const achievementClass = getAchievementClass(achievement);
        
        metricItem.innerHTML = `
            <div class="metric-info">
                <h4>${item.name}</h4>
                <div class="metric-values">
                    Target: ${item.name.toLowerCase().includes('labour') || item.name.toLowerCase().includes('parts') ? 
                        formatCurrency(item.target) : formatNumber(item.target)} | 
                    Actual: ${item.name.toLowerCase().includes('labour') || item.name.toLowerCase().includes('parts') ? 
                        formatCurrency(item.actual) : formatNumber(item.actual)}
                </div>
            </div>
            <div class="achievement-badge ${achievementClass}">
                ${formatPercentage(achievement)}
            </div>
        `;
        
        grid.appendChild(metricItem);
    });
    
    section.appendChild(header);
    section.appendChild(grid);
    
    return section;
}

// Empty state creator
function createEmptyState(title, message) {
    const emptyState = document.createElement('div');
    emptyState.className = 'card';
    emptyState.innerHTML = `
        <div class="card-content">
            <div class="empty-state">
                <i data-lucide="bar-chart-3" class="h-12 w-12"></i>
                <h3 class="text-lg font-medium text-gray-600 mb-2">${title}</h3>
                <p class="text-gray-500">${message}</p>
            </div>
        </div>
    `;
    
    // Initialize icons
    setTimeout(() => {
        lucide.createIcons();
    }, 10);
    
    return emptyState;
}