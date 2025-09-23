// Main dashboard JavaScript functionality

class Dashboard {
    constructor() {
        this.locations = ['Kalina', 'Sewri', 'Reayroad', 'Bhandup', 'Dockyard Road'];
        this.currentLocation = 'All Locations';
        this.allData = [];
        this.locationData = {};
        this.isLoading = false;
        
        this.init();
    }

    async init() {
        console.log('Initializing dashboard...');
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Load initial data
        await this.loadAllData();
        
        // Update dashboard
        this.updateDashboard();
        
        console.log('Dashboard initialized successfully');
    }

    setupEventListeners() {
        // Location selector
        const locationSelect = document.getElementById('location-select');
        if (locationSelect) {
            locationSelect.addEventListener('change', (e) => {
                this.currentLocation = e.target.value;
                this.updateLocationInfo();
                this.updateDashboard();
            });
        }

        // Tab switching - handled in utils.js
        console.log('Event listeners set up');
    }

    async loadAllData() {
        this.isLoading = true;
        showLoading();
        
        try {
            console.log('Loading KPI data from API...');
            const response = await API.get('/api/kpi-data');
            
            if (response.success && response.data) {
                this.allData = response.data;
                this.processLocationData();
                this.updateConnectionStatus(true);
                console.log('Data loaded successfully:', this.allData.length, 'records');
            } else {
                console.warn('No data received from API');
                this.updateConnectionStatus(false);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            this.updateConnectionStatus(false);
            showToast('Failed to load data from database', 'error');
        } finally {
            this.isLoading = false;
            hideLoading();
        }
    }

    processLocationData() {
        // Group data by location
        this.locationData = {};
        
        this.allData.forEach(record => {
            if (!this.locationData[record.location]) {
                this.locationData[record.location] = [];
            }
            this.locationData[record.location].push(record);
        });
        
        console.log('Processed location data:', Object.keys(this.locationData));
    }

    getCurrentLocationData() {
        if (this.currentLocation === 'All Locations') {
            return this.getAggregatedData();
        } else {
            const data = this.locationData[this.currentLocation] || [];
            return convertCSVToKPIData(data);
        }
    }

    getAggregatedData() {
        return aggregateLocationData(this.locations, this.locationData);
    }

    updateLocationInfo() {
        const locationInfo = document.getElementById('location-info');
        if (locationInfo) {
            locationInfo.textContent = `${this.currentLocation.toUpperCase()} Location`;
        }

        const recordsCount = document.getElementById('records-count');
        if (recordsCount) {
            if (this.currentLocation !== 'All Locations' && this.locationData[this.currentLocation]) {
                recordsCount.textContent = `${this.locationData[this.currentLocation].length} Records`;
                recordsCount.classList.remove('hidden');
            } else {
                recordsCount.classList.add('hidden');
            }
        }
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            if (connected) {
                statusElement.className = 'badge badge-success text-xs';
                statusElement.textContent = 'Database Connected';
            } else {
                statusElement.className = 'badge badge-outline text-xs';
                statusElement.textContent = 'Connection Error';
            }
        }
    }

    updateDashboard() {
        console.log('Updating dashboard for location:', this.currentLocation);
        
        // Update all sections
        this.updateRegionalSummary();
        this.updateSpeedometers();
        this.updateExecutiveSummary();
        this.updateKPICards();
        this.updatePerformanceChart();
        this.updateCategorySections();
        this.updateTabCounters();
    }

    updateRegionalSummary() {
        const container = document.getElementById('regional-summary');
        if (!container) return;

        // Calculate aggregated metrics for all locations
        const allLocationMetrics = this.locations.map(location => ({
            location,
            ...getLocationMetrics(location, this.locationData)
        }));

        const aggregatedMetrics = {
            throughput: {
                target: allLocationMetrics.reduce((sum, metric) => sum + metric.throughput.target, 0),
                actual: allLocationMetrics.reduce((sum, metric) => sum + metric.throughput.actual, 0),
                achievement: 0
            },
            labour: {
                target: allLocationMetrics.reduce((sum, metric) => sum + metric.labour.target, 0),
                actual: allLocationMetrics.reduce((sum, metric) => sum + metric.labour.actual, 0),
                achievement: 0
            },
            parts: {
                target: allLocationMetrics.reduce((sum, metric) => sum + metric.parts.target, 0),
                actual: allLocationMetrics.reduce((sum, metric) => sum + metric.parts.actual, 0),
                achievement: 0
            }
        };

        // Calculate achievement percentages
        aggregatedMetrics.throughput.achievement = aggregatedMetrics.throughput.target > 0 ? 
            (aggregatedMetrics.throughput.actual / aggregatedMetrics.throughput.target) * 100 : 0;
        aggregatedMetrics.labour.achievement = aggregatedMetrics.labour.target > 0 ? 
            (aggregatedMetrics.labour.actual / aggregatedMetrics.labour.target) * 100 : 0;
        aggregatedMetrics.parts.achievement = aggregatedMetrics.parts.target > 0 ? 
            (aggregatedMetrics.parts.actual / aggregatedMetrics.parts.target) * 100 : 0;

        container.innerHTML = `
            <div class="performance-card blue">
                <p class="text-2xl font-bold text-blue-600">${aggregatedMetrics.throughput.achievement.toFixed(1)}%</p>
                <p class="text-sm text-gray-600">Total Throughput</p>
                <p class="text-xs text-gray-500 mt-1">${aggregatedMetrics.throughput.actual.toLocaleString()} / ${aggregatedMetrics.throughput.target.toLocaleString()}</p>
            </div>
            <div class="performance-card green">
                <p class="text-2xl font-bold text-green-600">${aggregatedMetrics.labour.achievement.toFixed(1)}%</p>
                <p class="text-sm text-gray-600">Total Labour Sales</p>
                <p class="text-xs text-gray-500 mt-1">₹${(aggregatedMetrics.labour.actual / 100000).toFixed(1)}L / ₹${(aggregatedMetrics.labour.target / 100000).toFixed(1)}L</p>
            </div>
            <div class="performance-card purple">
                <p class="text-2xl font-bold text-purple-600">${aggregatedMetrics.parts.achievement.toFixed(1)}%</p>
                <p class="text-sm text-gray-600">Total Parts Sales</p>
                <p class="text-xs text-gray-500 mt-1">₹${(aggregatedMetrics.parts.actual / 100000).toFixed(1)}L / ₹${(aggregatedMetrics.parts.target / 100000).toFixed(1)}L</p>
            </div>
            <div class="performance-card orange">
                <p class="text-2xl font-bold text-orange-600">${this.locations.length}</p>
                <p class="text-sm text-gray-600">Active Locations</p>
                <p class="text-xs text-gray-500 mt-1">${Object.keys(this.locationData).length} with data</p>
            </div>
        `;
    }

    updateSpeedometers() {
        // Calculate metrics for all locations
        const allLocationMetrics = this.locations.map(location => ({
            location,
            ...getLocationMetrics(location, this.locationData)
        }));

        // Update throughput speedometers
        this.updateSpeedometerSection('throughput-speedometers', allLocationMetrics, 'throughput', 'Throughput');
        
        // Update labour speedometers
        this.updateSpeedometerSection('labour-speedometers', allLocationMetrics, 'labour', 'Labour Sales');
        
        // Update parts speedometers
        this.updateSpeedometerSection('parts-speedometers', allLocationMetrics, 'parts', 'Parts Sales');
    }

    updateSpeedometerSection(containerId, metrics, metricType, title) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        metrics.filter(metric => metric[metricType].target > 0).forEach(metric => {
            const speedometerData = {
                location: metric.location,
                achievement: metric[metricType].achievement,
                target: metric[metricType].target,
                actual: metric[metricType].actual,
                title: title
            };

            const speedometerElement = createSpeedometerComponent(speedometerData);
            container.appendChild(speedometerElement);
        });
    }

    updateExecutiveSummary() {
        const currentData = this.getCurrentLocationData();
        const counts = calculateCounts(currentData);

        // Update summary counts
        const summaryAchieved = document.getElementById('summary-achieved');
        const summaryBelow = document.getElementById('summary-below');
        const summaryAction = document.getElementById('summary-action');

        if (summaryAchieved) summaryAchieved.textContent = counts.achieved;
        if (summaryBelow) summaryBelow.textContent = counts.belowTarget;
        if (summaryAction) summaryAction.textContent = counts.needsAction;

        // Update executive summary content
        const container = document.getElementById('executive-summary-content');
        if (!container || currentData.length === 0) {
            if (container) {
                container.innerHTML = `
                    <div class="col-span-4 text-center py-8">
                        <i data-lucide="bar-chart-3" class="h-12 w-12 text-gray-400 mx-auto mb-4"></i>
                        <h3 class="text-lg font-medium text-gray-600 mb-2">No Data Available</h3>
                        <p class="text-gray-500">Please upload CSV data for ${this.currentLocation} to view executive summary.</p>
                    </div>
                `;
                setTimeout(() => lucide.createIcons(), 10);
            }
            return;
        }

        // Calculate key metrics
        const inflowData = filterDataByCategory(currentData, 'inflow');
        const labourData = filterDataByCategory(currentData, 'labour');

        const totalThroughputMetric = inflowData.find(item => 
            item.name && item.name.toLowerCase().includes('total throughput')
        );

        const totalLabourMetrics = labourData.find(item => 
            item.name && item.name.toLowerCase().includes('total') && item.name.toLowerCase().includes('labour')
        ) || labourData.reduce((acc, item) => ({
            target: acc.target + item.target,
            actual: acc.actual + item.actual
        }), { target: 0, actual: 0 });

        const throughputAchievement = totalThroughputMetric?.achievement || 0;
        const labourAchievement = totalLabourMetrics.target > 0 ? 
            (totalLabourMetrics.actual / totalLabourMetrics.target) * 100 : 0;

        container.innerHTML = '';

        if (totalThroughputMetric && totalThroughputMetric.target > 0) {
            container.appendChild(createPerformanceCard({
                title: 'Throughput Achievement',
                value: formatPercentage(throughputAchievement),
                subtitle: this.currentLocation
            }, 'orange'));
        }

        if (totalThroughputMetric && totalThroughputMetric.actual > 0) {
            container.appendChild(createPerformanceCard({
                title: 'Vehicles Processed',
                value: formatNumber(totalThroughputMetric.actual),
                subtitle: this.currentLocation
            }, 'blue'));
        }

        if (totalLabourMetrics.actual > 0) {
            container.appendChild(createPerformanceCard({
                title: 'Labour Revenue',
                value: formatCurrency(totalLabourMetrics.actual),
                subtitle: this.currentLocation
            }, 'green'));
        }

        if (totalLabourMetrics.target > 0) {
            container.appendChild(createPerformanceCard({
                title: 'Labour Achievement',
                value: formatPercentage(labourAchievement),
                subtitle: this.currentLocation
            }, 'purple'));
        }
    }

    updateKPICards() {
        const container = document.getElementById('kpi-cards');
        if (!container) return;

        const currentData = this.getCurrentLocationData();
        if (currentData.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = '';

        // Filter data by categories
        const inflowData = filterDataByCategory(currentData, 'inflow');
        const labourData = filterDataByCategory(currentData, 'labour');
        const efficiencyData = filterDataByCategory(currentData, 'efficiency');

        // Total Throughput KPI
        const totalThroughput = inflowData.find(item => 
            item.name.toLowerCase().includes('total throughput')
        );
        if (totalThroughput) {
            const kpiCard = createKPICard({
                title: 'Total Throughput',
                actual: totalThroughput.actual,
                target: totalThroughput.target,
                unit: 'vehicles',
                format: 'number'
            });
            container.appendChild(kpiCard);
        }

        // PM Throughput KPI
        const pmThroughput = inflowData.find(item => 
            item.name.toLowerCase().includes('pm throughput')
        );
        if (pmThroughput) {
            const kpiCard = createKPICard({
                title: 'PM Throughput',
                actual: pmThroughput.actual,
                target: pmThroughput.target,
                unit: 'vehicles',
                format: 'number'
            });
            container.appendChild(kpiCard);
        }

        // Total Labour Sale KPI
        const totalLabour = labourData.find(item => 
            item.name.toLowerCase().includes('total') && item.name.toLowerCase().includes('labour')
        ) || labourData.reduce((acc, item) => ({
            target: acc.target + item.target,
            actual: acc.actual + item.actual
        }), { target: 0, actual: 0 });

        if (totalLabour.target > 0) {
            const kpiCard = createKPICard({
                title: 'Total Labour Sale',
                actual: totalLabour.actual,
                target: totalLabour.target,
                unit: '',
                format: 'currency'
            });
            container.appendChild(kpiCard);
        }

        // Conversion Rate KPI
        const conversionRate = efficiencyData.find(item => 
            item.name.toLowerCase().includes('conversion')
        );
        if (conversionRate) {
            const kpiCard = createKPICard({
                title: 'Conversion Rate',
                actual: conversionRate.actual,
                target: conversionRate.target,
                unit: '',
                format: 'percentage'
            });
            container.appendChild(kpiCard);
        }
    }

    updatePerformanceChart() {
        // Calculate metrics for all locations
        const allLocationMetrics = this.locations.map(location => ({
            location,
            ...getLocationMetrics(location, this.locationData)
        }));

        const chartData = allLocationMetrics
            .filter(metric => metric.totalTarget > 0)
            .map(metric => ({
                month: metric.location,
                actual: metric.totalAchieved / 100000, // Convert to lakhs
                target: metric.totalTarget / 100000 // Convert to lakhs
            }));

        if (chartData.length > 0) {
            window.chartManager.createPerformanceChart('performance-chart', chartData);
        }
    }

    updateCategorySections() {
        const currentData = this.getCurrentLocationData();

        // Update inflow section
        const inflowData = filterDataByCategory(currentData, 'inflow');
        this.updateCategorySection('inflow-content', 'Vehicle Inflow Metrics', inflowData, 'blue');

        // Update labour section
        const labourData = filterDataByCategory(currentData, 'labour');
        this.updateCategorySection('labour-content', 'Labour Sale Performance (₹ Indian Rupees)', labourData, 'green');

        // Update parts section
        const partsData = filterDataByCategory(currentData, 'parts');
        this.updateCategorySection('parts-content', 'Parts Sales & Products (₹ Indian Rupees)', partsData, 'purple');

        // Update efficiency section
        const efficiencyData = filterDataByCategory(currentData, 'efficiency');
        this.updateCategorySection('efficiency-content', 'Efficiency & Other KPIs', efficiencyData, 'orange');
    }

    updateCategorySection(containerId, title, data, color) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        
        if (data.length === 0) {
            const emptyState = createEmptyState(
                `No ${title.split(' ')[0]} Data Available`,
                `Please upload CSV data for ${this.currentLocation} to view ${title.toLowerCase()}.`
            );
            container.appendChild(emptyState);
        } else {
            const section = createCategorySection(title, data, color, this.currentLocation);
            container.appendChild(section);
        }

        // Initialize icons
        setTimeout(() => lucide.createIcons(), 10);
    }

    updateTabCounters() {
        const currentData = this.getCurrentLocationData();

        // Calculate counts for each category
        const inflowData = filterDataByCategory(currentData, 'inflow');
        const labourData = filterDataByCategory(currentData, 'labour');
        const partsData = filterDataByCategory(currentData, 'parts');
        const efficiencyData = filterDataByCategory(currentData, 'efficiency');

        const inflowCounts = calculateCounts(inflowData);
        const labourCounts = calculateCounts(labourData);
        const partsCounts = calculateCounts(partsData);
        const efficiencyCounts = calculateCounts(efficiencyData);

        // Update overall counts
        const allData = [...inflowData, ...labourData, ...partsData, ...efficiencyData];
        const overallCounts = calculateCounts(allData);

        this.updateTabCounter('overview-counter', overallCounts);
        this.updateTabCounter('inflow-counter', inflowCounts);
        this.updateTabCounter('labour-counter', labourCounts);
        this.updateTabCounter('parts-counter', partsCounts);
        this.updateTabCounter('efficiency-counter', efficiencyCounts);
    }

    updateTabCounter(counterId, counts) {
        const counter = document.getElementById(counterId);
        if (!counter) return;

        const achieved = counter.querySelector('.counter-achieved');
        const below = counter.querySelector('.counter-below');
        const action = counter.querySelector('.counter-action');

        if (achieved) achieved.textContent = counts.achieved;
        if (below) below.textContent = counts.belowTarget;
        if (action) action.textContent = counts.needsAction;
    }

    // Public method to refresh data
    async refreshData() {
        await this.loadAllData();
        this.updateDashboard();
        showToast('Dashboard data refreshed successfully');
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.dashboard = new Dashboard();
    
    // Set up periodic refresh (every 5 minutes)
    setInterval(() => {
        if (!window.dashboard.isLoading) {
            window.dashboard.refreshData();
        }
    }, 5 * 60 * 1000);
});