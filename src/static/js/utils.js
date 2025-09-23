// Utility functions for the dashboard

// Global state
window.dashboardState = {
    currentLocation: 'All Locations',
    allData: [],
    locationData: {},
    isLoading: false
};

// API utilities
class API {
    static async get(endpoint) {
        try {
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API GET error:', error);
            throw error;
        }
    }

    static async post(endpoint, data) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                body: data
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API POST error:', error);
            throw error;
        }
    }
}

// Loading utilities
function showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        window.dashboardState.isLoading = true;
    }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        window.dashboardState.isLoading = false;
    }
}

// Toast notifications
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'check-circle';
    if (type === 'error') icon = 'x-circle';
    if (type === 'warning') icon = 'alert-triangle';
    
    toast.innerHTML = `
        <i data-lucide="${icon}" class="h-5 w-5"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Initialize the icon
    lucide.createIcons();
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
}

// Data processing utilities
function formatCurrency(value) {
    if (value >= 100000) {
        return `₹${(value / 100000).toFixed(1)}L`;
    }
    return `₹${value.toLocaleString()}`;
}

function formatNumber(value) {
    return value.toLocaleString();
}

function formatPercentage(value) {
    return `${value.toFixed(1)}%`;
}

function getAchievementClass(achievement) {
    if (achievement >= 100) return 'achieved';
    if (achievement >= 70) return 'below-target';
    return 'needs-action';
}

function getAchievementBadge(achievement) {
    const className = getAchievementClass(achievement);
    return `<span class="achievement-badge ${className}">${formatPercentage(achievement)}</span>`;
}

// Data filtering and aggregation
function convertCSVToKPIData(csvData) {
    return csvData.map(row => ({
        name: row.parameters || row.tags,
        target: row.monthly_target || row.target_mtd || 0,
        actual: row.actual_as_on_date || 0,
        achievement: row.percentage_ach || 0,
        shortfall: row.shortfall || 0
    }));
}

function filterDataByCategory(data, category) {
    const filters = {
        inflow: ['throughput', 'inflow'],
        labour: ['labour', 'labor'],
        parts: ['parts', 'accessories', 'oil'],
        efficiency: ['conversion', 'efficiency', 'cleaning', 'service', 'nps', 'connect', 
                    'complaints', 'alignment', 'balancing', 'pmc', 'cash', 'insurance']
    };
    
    const categoryFilters = filters[category] || [];
    return data.filter(item => {
        if (!item.name) return false;
        const name = item.name.toLowerCase();
        return categoryFilters.some(filter => name.includes(filter));
    });
}

function calculateCounts(data) {
    const validData = data.filter(item => !isNaN(item.achievement));
    const achieved = validData.filter(item => item.achievement >= 100).length;
    const belowTarget = validData.filter(item => item.achievement < 100 && item.achievement >= 70).length;
    const needsAction = validData.filter(item => item.achievement < 70).length;
    return { achieved, belowTarget, needsAction, total: validData.length };
}

function aggregateLocationData(locations, locationData) {
    const aggregatedData = [];
    
    locations.forEach(location => {
        const data = locationData[location];
        if (!data) return;
        
        const kpiData = convertCSVToKPIData(data);
        kpiData.forEach(item => {
            const existingItem = aggregatedData.find(aggItem => aggItem.name === item.name);
            if (existingItem) {
                existingItem.target += item.target;
                existingItem.actual += item.actual;
                existingItem.shortfall += item.shortfall;
                // Recalculate achievement percentage
                existingItem.achievement = existingItem.target > 0 ? 
                    (existingItem.actual / existingItem.target) * 100 : 0;
            } else {
                aggregatedData.push({ ...item });
            }
        });
    });
    
    return aggregatedData;
}

// Location metrics calculation
function getLocationMetrics(location, locationData) {
    const data = locationData[location];
    if (!data || data.length === 0) {
        return {
            throughput: { target: 0, actual: 0, achievement: 0 },
            labour: { target: 0, actual: 0, achievement: 0 },
            parts: { target: 0, actual: 0, achievement: 0 },
            totalTarget: 0,
            totalAchieved: 0
        };
    }

    // Find specific metrics by parameter name
    const throughputMetric = data.find(row => 
        row.parameters && row.parameters.toLowerCase().includes('total throughput')
    );
    
    const labourMetrics = data.filter(row => 
        row.parameters && row.parameters.toLowerCase().includes('labour') && 
        !row.parameters.toLowerCase().includes('per ro')
    );
    
    const partsMetrics = data.filter(row => 
        row.parameters && row.parameters.toLowerCase().includes('parts') && 
        !row.parameters.toLowerCase().includes('per ro')
    );

    // Calculate throughput metrics
    const throughputTarget = throughputMetric ? (throughputMetric.monthly_target || throughputMetric.target_mtd || 0) : 0;
    const throughputActual = throughputMetric ? (throughputMetric.actual_as_on_date || 0) : 0;
    const throughputAchievement = throughputMetric ? (throughputMetric.percentage_ach || 0) : 0;

    // Calculate labour metrics (sum all labour-related entries)
    const labourTarget = labourMetrics.reduce((sum, row) => sum + (row.monthly_target || row.target_mtd || 0), 0);
    const labourActual = labourMetrics.reduce((sum, row) => sum + (row.actual_as_on_date || 0), 0);
    const labourAchievement = labourTarget > 0 ? (labourActual / labourTarget) * 100 : 0;

    // Calculate parts metrics (sum all parts-related entries)
    const partsTarget = partsMetrics.reduce((sum, row) => sum + (row.monthly_target || row.target_mtd || 0), 0);
    const partsActual = partsMetrics.reduce((sum, row) => sum + (row.actual_as_on_date || 0), 0);
    const partsAchievement = partsTarget > 0 ? (partsActual / partsTarget) * 100 : 0;

    // Calculate overall totals
    const totalTarget = labourTarget + partsTarget;
    const totalAchieved = labourActual + partsActual;

    return {
        throughput: {
            target: throughputTarget,
            actual: throughputActual,
            achievement: throughputAchievement
        },
        labour: {
            target: labourTarget,
            actual: labourActual,
            achievement: labourAchievement
        },
        parts: {
            target: partsTarget,
            actual: partsActual,
            achievement: partsAchievement
        },
        totalTarget,
        totalAchieved
    };
}

// Date utilities
function getCurrentDate() {
    return new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function getCurrentTime() {
    return new Date().toLocaleTimeString();
}

// Tab management utilities
function initializeTabs() {
    // Main tabs
    const mainTabTriggers = document.querySelectorAll('.tab-trigger');
    mainTabTriggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            const tabName = e.currentTarget.dataset.tab;
            switchTab(tabName);
        });
    });
    
    // Sub tabs (for detailed dashboard)
    const subTabTriggers = document.querySelectorAll('[data-tab^="sub-"]');
    subTabTriggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            const tabName = e.currentTarget.dataset.tab;
            switchSubTab(tabName);
        });
    });
}

function switchTab(tabName) {
    // Remove active class from all triggers and contents
    document.querySelectorAll('.tab-trigger').forEach(trigger => {
        trigger.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Add active class to selected trigger and content
    const trigger = document.querySelector(`[data-tab="${tabName}"]`);
    const content = document.getElementById(`tab-${tabName}`);
    
    if (trigger) trigger.classList.add('active');
    if (content) content.classList.add('active');
}

function switchSubTab(tabName) {
    // Remove active class from all sub-tab triggers and contents
    document.querySelectorAll('[data-tab^="sub-"]').forEach(trigger => {
        trigger.classList.remove('active');
    });
    document.querySelectorAll('[id^="sub-tab-"]').forEach(content => {
        content.classList.remove('active');
    });
    
    // Add active class to selected trigger and content
    const trigger = document.querySelector(`[data-tab="${tabName}"]`);
    const content = document.getElementById(tabName);
    
    if (trigger) trigger.classList.add('active');
    if (content) content.classList.add('active');
}

// Initialize utilities when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set current date and time
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
        dateElement.textContent = getCurrentDate();
    }
    
    const timeElement = document.getElementById('last-updated');
    if (timeElement) {
        timeElement.textContent = getCurrentTime();
    }
    
    // Initialize tabs
    initializeTabs();
    
    console.log('Dashboard utilities initialized');
});