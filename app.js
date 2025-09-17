class AdvancedLoadBalancingSimulator {
    constructor() {
        this.servers = [];
        this.tasks = [];
        this.completedTasks = [];
        this.failedTasks = [];
        this.currentTaskId = 1;
        this.simulationTime = 0;
        this.roundRobinCounter = 0;
        this.weightedRoundRobinCounters = [];
        this.simulationState = 'stopped';
        this.simulationInterval = null;
        this.taskGenerationInterval = null;
        this.healthCheckInterval = null;
        this.charts = {};
        
        this.metrics = {
            responseTime: [],
            throughput: [],
            resourceUtilization: [],
            loadFairness: [],
            slaCompliance: [],
            failureRate: [],
            timestamps: [],
            responseTimePercentiles: {
                p50: [],
                p90: [],
                p95: []
            },
            priorityMetrics: {
                high: { sla: [], count: 0 },
                medium: { sla: [], count: 0 },
                low: { sla: [], count: 0 }
            }
        };
        
        this.config = {
            serverCount: 5,
            serverCapacity: 100,
            taskCount: 100,
            taskProcessingTimeMin: 500,
            taskProcessingTimeMax: 3000,
            arrivalRate: 8,
            algorithm: 'roundRobin',
            simulationSpeed: 'normal',
            serverFailureRate: 0.02,
            healthCheckInterval: 3000,
            serverRecoveryTime: 10000,
            priorityDistribution: {
                high: 20,
                medium: 50,
                low: 30
            }
        };
        
        this.algorithmDescriptions = {
            roundRobin: "Distributes tasks sequentially across healthy servers in a circular manner",
            leastLoad: "Assigns tasks to the healthy server with the lowest current load",
            weightedRoundRobin: "Distributes tasks based on server weights and capacity ratios",
            shortestResponseTime: "Assigns tasks to the server with the fastest recent response time",
            randomized: "Random assignment weighted by server load and health status",
            consistentHashing: "Hash-based assignment for session affinity and consistent routing"
        };
        
        this.taskPriorities = {
            high: { slaTarget: 2000, color: '#EF4444' },
            medium: { slaTarget: 5000, color: '#F59E0B' },
            low: { slaTarget: 10000, color: '#10B981' }
        };
        
        this.healthStatuses = {
            healthy: { color: '#10B981', description: 'Server operating normally' },
            degraded: { color: '#F59E0B', description: 'Server experiencing performance issues' },
            failed: { color: '#EF4444', description: 'Server is down and unavailable' },
            recovering: { color: '#6366F1', description: 'Server is coming back online' }
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.initializeCharts();
        this.updateUI();
        this.resetSimulation();
    }
    
    setupEventListeners() {
        // Algorithm selection
        document.querySelectorAll('input[name="algorithm"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.config.algorithm = e.target.value;
                this.updateAlgorithmDescription();
            });
        });
        
        // Configuration controls
        document.getElementById('serverCount').addEventListener('input', (e) => {
            this.config.serverCount = parseInt(e.target.value);
            document.getElementById('serverCountValue').textContent = e.target.value;
            if (this.simulationState === 'stopped') {
                this.resetSimulation();
            }
        });
        
        document.getElementById('serverCapacity').addEventListener('input', (e) => {
            this.config.serverCapacity = parseInt(e.target.value);
        });
        
        document.getElementById('taskCount').addEventListener('input', (e) => {
            this.config.taskCount = parseInt(e.target.value);
        });
        
        document.getElementById('arrivalRate').addEventListener('input', (e) => {
            this.config.arrivalRate = parseInt(e.target.value);
            document.getElementById('arrivalRateValue').textContent = e.target.value;
        });
        
        document.getElementById('processingTimeMin').addEventListener('input', (e) => {
            this.config.taskProcessingTimeMin = parseInt(e.target.value);
        });
        
        document.getElementById('processingTimeMax').addEventListener('input', (e) => {
            this.config.taskProcessingTimeMax = parseInt(e.target.value);
        });
        
        document.getElementById('serverFailureRate').addEventListener('input', (e) => {
            this.config.serverFailureRate = parseFloat(e.target.value) / 100;
            document.getElementById('serverFailureRateValue').textContent = e.target.value + '%';
        });
        
        document.getElementById('healthCheckInterval').addEventListener('input', (e) => {
            this.config.healthCheckInterval = parseInt(e.target.value) * 1000;
            document.getElementById('healthCheckIntervalValue').textContent = e.target.value + 's';
        });
        
        // Priority distribution controls
        const priorityInputs = ['high', 'medium', 'low'];
        priorityInputs.forEach(priority => {
            document.getElementById(`${priority}PriorityPercent`).addEventListener('input', (e) => {
                this.config.priorityDistribution[priority] = parseInt(e.target.value);
                document.getElementById(`${priority}PriorityValue`).textContent = e.target.value + '%';
                this.normalizePriorityDistribution();
            });
        });
        
        document.getElementById('simulationSpeed').addEventListener('change', (e) => {
            this.config.simulationSpeed = e.target.value;
            if (this.simulationState === 'running') {
                this.updateSimulationSpeed();
            }
        });
        
        // Simulation controls
        document.getElementById('startBtn').addEventListener('click', () => this.startSimulation());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pauseSimulation());
        document.getElementById('resumeBtn').addEventListener('click', () => this.resumeSimulation());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetSimulation());
        document.getElementById('stepBtn').addEventListener('click', () => this.stepSimulation());
        
        // Server management
        document.getElementById('simulateFailureBtn').addEventListener('click', () => this.simulateRandomFailure());
        document.getElementById('recoverAllBtn').addEventListener('click', () => this.recoverAllServers());
        
        // Export controls
        document.getElementById('exportJsonBtn').addEventListener('click', () => this.exportData('json'));
        document.getElementById('exportCsvBtn').addEventListener('click', () => this.exportData('csv'));
        document.getElementById('exportReportBtn').addEventListener('click', () => this.exportData('report'));
        
        // Other controls
        document.getElementById('clearLogBtn').addEventListener('click', () => this.clearLog());
        document.getElementById('runComparisonBtn').addEventListener('click', () => this.runComparison());
    }
    
    normalizePriorityDistribution() {
        const total = this.config.priorityDistribution.high + 
                     this.config.priorityDistribution.medium + 
                     this.config.priorityDistribution.low;
        
        if (total !== 100) {
            const diff = 100 - total;
            this.config.priorityDistribution.low += diff;
            this.config.priorityDistribution.low = Math.max(0, Math.min(100, this.config.priorityDistribution.low));
            
            document.getElementById('lowPriorityPercent').value = this.config.priorityDistribution.low;
            document.getElementById('lowPriorityValue').textContent = this.config.priorityDistribution.low + '%';
        }
    }
    
    updateAlgorithmDescription() {
        document.getElementById('algorithmDescription').textContent = 
            this.algorithmDescriptions[this.config.algorithm];
    }
    
    initializeCharts() {
        const chartColors = ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C', '#964325', '#944454', '#13343B'];
        
        // Server Load Chart
        const serverLoadCtx = document.getElementById('serverLoadChart').getContext('2d');
        this.charts.serverLoad = new Chart(serverLoadCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Current Load',
                    data: [],
                    backgroundColor: chartColors[0],
                    borderColor: chartColors[0],
                    borderWidth: 1
                }, {
                    label: 'Capacity',
                    data: [],
                    backgroundColor: chartColors[3],
                    borderColor: chartColors[3],
                    borderWidth: 1,
                    type: 'line'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Load (ms)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Server ID'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            afterLabel: (context) => {
                                const serverIndex = context.dataIndex;
                                const server = this.servers[serverIndex];
                                if (server) {
                                    return `Status: ${server.healthStatus}\nUptime: ${server.uptime.toFixed(1)}%`;
                                }
                                return '';
                            }
                        }
                    }
                }
            }
        });
        
        // Performance Chart
        const performanceCtx = document.getElementById('performanceChart').getContext('2d');
        this.charts.performance = new Chart(performanceCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Avg Response Time (ms)',
                    data: [],
                    borderColor: chartColors[1],
                    backgroundColor: chartColors[1] + '20',
                    fill: false,
                    yAxisID: 'y'
                }, {
                    label: 'Throughput (tasks/s)',
                    data: [],
                    borderColor: chartColors[2],
                    backgroundColor: chartColors[2] + '20',
                    fill: false,
                    yAxisID: 'y1'
                }, {
                    label: 'SLA Compliance (%)',
                    data: [],
                    borderColor: chartColors[4],
                    backgroundColor: chartColors[4] + '20',
                    fill: false,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Response Time (ms)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Throughput / SLA %'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time (s)'
                        }
                    }
                }
            }
        });
        
        // Priority Queue Chart
        const priorityQueueCtx = document.getElementById('priorityQueueChart').getContext('2d');
        this.charts.priorityQueue = new Chart(priorityQueueCtx, {
            type: 'doughnut',
            data: {
                labels: ['High Priority', 'Medium Priority', 'Low Priority', 'Completed'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: ['#EF4444', '#F59E0B', '#10B981', chartColors[0]]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        
        // SLA Compliance Chart
        const slaComplianceCtx = document.getElementById('slaComplianceChart').getContext('2d');
        this.charts.slaCompliance = new Chart(slaComplianceCtx, {
            type: 'radar',
            data: {
                labels: ['High Priority SLA', 'Medium Priority SLA', 'Low Priority SLA', 'Overall Throughput', 'Server Availability', 'Load Balance'],
                datasets: [{
                    label: 'Performance Metrics',
                    data: [100, 100, 100, 0, 100, 100],
                    borderColor: chartColors[0],
                    backgroundColor: chartColors[0] + '20',
                    pointBackgroundColor: chartColors[0],
                    pointBorderColor: chartColors[0],
                    pointHoverBackgroundColor: chartColors[0],
                    pointHoverBorderColor: chartColors[0]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20
                        }
                    }
                }
            }
        });
    }
    
    createServers() {
        this.servers = [];
        this.weightedRoundRobinCounters = [];
        
        for (let i = 1; i <= this.config.serverCount; i++) {
            const weight = Math.random() * 0.5 + 0.75; // Random weight between 0.75-1.25
            this.servers.push({
                id: i,
                currentLoad: 0,
                capacity: this.config.serverCapacity,
                weight: weight,
                healthStatus: 'healthy',
                responseTimeHistory: [],
                taskQueues: {
                    high: [],
                    medium: [],
                    low: []
                },
                processingTasks: [],
                totalProcessed: 0,
                uptime: 100,
                lastHealthCheck: Date.now(),
                failureTime: null,
                recoveryTime: null,
                creationTime: Date.now()
            });
            this.weightedRoundRobinCounters.push(0);
        }
    }
    
    generateTask() {
        const processingTime = Math.floor(Math.random() * 
            (this.config.taskProcessingTimeMax - this.config.taskProcessingTimeMin + 1)) + 
            this.config.taskProcessingTimeMin;
        
        // Determine priority based on distribution
        const rand = Math.random() * 100;
        let priority = 'low';
        
        if (rand < this.config.priorityDistribution.high) {
            priority = 'high';
        } else if (rand < this.config.priorityDistribution.high + this.config.priorityDistribution.medium) {
            priority = 'medium';
        }
        
        const task = {
            id: this.currentTaskId++,
            priority: priority,
            arrivalTime: this.simulationTime,
            processingTime: processingTime,
            remainingTime: processingTime,
            slaDeadline: this.simulationTime + this.taskPriorities[priority].slaTarget,
            assignedServer: null,
            completionTime: null,
            responseTime: null,
            status: 'pending',
            failed: false,
            creationTimestamp: Date.now()
        };
        
        this.tasks.push(task);
        this.assignTask(task);
        
        const priorityClass = priority === 'high' ? 'high-priority' : '';
        this.logEvent(`Task ${task.id} arrived (${priority} priority, ${processingTime}ms processing time)`, priorityClass);
    }
    
    assignTask(task) {
        const healthyServers = this.servers.filter(server => 
            server.healthStatus === 'healthy' || server.healthStatus === 'degraded'
        );
        
        if (healthyServers.length === 0) {
            task.failed = true;
            task.status = 'failed';
            this.failedTasks.push(task);
            this.logEvent(`Task ${task.id} failed - no healthy servers available`, 'server-failure');
            return;
        }
        
        let selectedServer = this.selectServerByAlgorithm(healthyServers, task);
        
        if (!selectedServer) {
            task.failed = true;
            task.status = 'failed';
            this.failedTasks.push(task);
            this.logEvent(`Task ${task.id} failed - server selection failed`, 'server-failure');
            return;
        }
        
        task.assignedServer = selectedServer.id;
        task.status = 'processing';
        
        // Add to appropriate priority queue
        selectedServer.taskQueues[task.priority].push(task);
        selectedServer.processingTasks.push(task);
        selectedServer.currentLoad += task.processingTime;
        
        this.logEvent(`Task ${task.id} assigned to Server ${selectedServer.id} (${task.priority} priority)`, 'task-assigned');
        
        if (selectedServer.currentLoad > selectedServer.capacity * 0.9) {
            this.logEvent(`Server ${selectedServer.id} is near capacity (${Math.round(selectedServer.currentLoad)}/${selectedServer.capacity})`, 'server-overload');
        }
    }
    
    selectServerByAlgorithm(healthyServers, task) {
        switch (this.config.algorithm) {
            case 'roundRobin':
                return this.roundRobinSelection(healthyServers);
            case 'leastLoad':
                return this.leastLoadSelection(healthyServers);
            case 'weightedRoundRobin':
                return this.weightedRoundRobinSelection(healthyServers);
            case 'shortestResponseTime':
                return this.shortestResponseTimeSelection(healthyServers);
            case 'randomized':
                return this.randomizedSelection(healthyServers);
            case 'consistentHashing':
                return this.consistentHashingSelection(healthyServers, task);
            default:
                return healthyServers[0];
        }
    }
    
    roundRobinSelection(servers) {
        if (servers.length === 0) return null;
        const server = servers[this.roundRobinCounter % servers.length];
        this.roundRobinCounter = (this.roundRobinCounter + 1) % servers.length;
        return server;
    }
    
    leastLoadSelection(servers) {
        return servers.reduce((min, server) => 
            server.currentLoad < min.currentLoad ? server : min
        );
    }
    
    weightedRoundRobinSelection(servers) {
        // Find server with highest weight-to-load ratio
        let bestServer = servers[0];
        let bestRatio = bestServer.weight / Math.max(bestServer.currentLoad, 1);
        
        servers.forEach(server => {
            const ratio = server.weight / Math.max(server.currentLoad, 1);
            if (ratio > bestRatio) {
                bestRatio = ratio;
                bestServer = server;
            }
        });
        
        return bestServer;
    }
    
    shortestResponseTimeSelection(servers) {
        let bestServer = servers[0];
        let bestAvgResponseTime = this.getAverageResponseTime(bestServer);
        
        servers.forEach(server => {
            const avgResponseTime = this.getAverageResponseTime(server);
            if (avgResponseTime < bestAvgResponseTime) {
                bestAvgResponseTime = avgResponseTime;
                bestServer = server;
            }
        });
        
        return bestServer;
    }
    
    randomizedSelection(servers) {
        // Weighted random selection based on inverse load
        const weights = servers.map(server => 
            1 / Math.max(server.currentLoad / server.capacity, 0.1)
        );
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        
        let random = Math.random() * totalWeight;
        for (let i = 0; i < servers.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return servers[i];
            }
        }
        
        return servers[servers.length - 1];
    }
    
    consistentHashingSelection(servers, task) {
        // Simple hash based on task ID
        const hash = this.simpleHash(task.id.toString());
        const serverIndex = hash % servers.length;
        return servers[serverIndex];
    }
    
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
    
    getAverageResponseTime(server) {
        if (server.responseTimeHistory.length === 0) return 1000; // Default for new servers
        const recent = server.responseTimeHistory.slice(-10); // Last 10 responses
        return recent.reduce((sum, time) => sum + time, 0) / recent.length;
    }
    
    processSimulationStep() {
        this.simulationTime++;
        
        // Update server health every few steps
        if (this.simulationTime % 3 === 0) {
            this.updateServerHealth();
        }
        
        // Process tasks on each server (priority-based)
        this.servers.forEach(server => {
            this.processServerTasks(server);
        });
        
        // Age tasks (increase priority over time for unprocessed tasks)
        this.ageTasks();
        
        // Update metrics and charts
        this.calculateAdvancedMetrics();
        this.updateCharts();
        this.updateServerHealthDisplay();
        this.updateUI();
        this.updateTaskProgress();
        this.calculateMetrics();
        
        // Check if simulation should end
        const totalTasksGenerated = this.currentTaskId - 1;
        const allTasksProcessed = (this.completedTasks.length + this.failedTasks.length) >= 
            Math.min(totalTasksGenerated, this.config.taskCount);
        
        if (allTasksProcessed && totalTasksGenerated >= this.config.taskCount) {
            this.stopSimulation();
            this.logEvent('Simulation completed - all tasks processed');
        }
    }
    
    processServerTasks(server) {
        if (server.healthStatus === 'failed') {
            // Failed servers can't process tasks - move them to failed
            const allTasks = [...server.taskQueues.high, ...server.taskQueues.medium, ...server.taskQueues.low];
            allTasks.forEach(task => {
                task.failed = true;
                task.status = 'failed';
                this.failedTasks.push(task);
                this.logEvent(`Task ${task.id} failed due to server ${server.id} failure`, 'server-failure');
            });
            
            // Clear all queues
            server.taskQueues.high = [];
            server.taskQueues.medium = [];
            server.taskQueues.low = [];
            server.processingTasks = [];
            server.currentLoad = 0;
            return;
        }
        
        // Process tasks in priority order: high -> medium -> low
        const priorities = ['high', 'medium', 'low'];
        let processedThisStep = 0;
        const maxProcessingPerStep = 3; // Limit processing per step to make it visible
        
        priorities.forEach(priority => {
            if (processedThisStep >= maxProcessingPerStep) return;
            
            server.taskQueues[priority] = server.taskQueues[priority].filter(task => {
                if (processedThisStep >= maxProcessingPerStep) return true;
                if (task.remainingTime <= 0) return true; // Skip already completed
                
                const stepProcessing = Math.min(1000, task.remainingTime); // Process up to 1 second
                task.remainingTime -= stepProcessing;
                processedThisStep++;
                
                if (task.remainingTime <= 0) {
                    // Task completed
                    task.completionTime = this.simulationTime;
                    task.responseTime = task.completionTime - task.arrivalTime;
                    task.status = 'completed';
                    
                    server.currentLoad = Math.max(0, server.currentLoad - task.processingTime);
                    server.totalProcessed++;
                    
                    // Update response time history
                    server.responseTimeHistory.push(task.responseTime);
                    if (server.responseTimeHistory.length > 20) {
                        server.responseTimeHistory.shift();
                    }
                    
                    // Remove from processing tasks
                    const processingIndex = server.processingTasks.findIndex(t => t.id === task.id);
                    if (processingIndex !== -1) {
                        server.processingTasks.splice(processingIndex, 1);
                    }
                    
                    // Check SLA compliance
                    const slaViolation = task.responseTime > this.taskPriorities[task.priority].slaTarget;
                    if (slaViolation) {
                        this.logEvent(`Task ${task.id} SLA violation (${task.responseTime}ms > ${this.taskPriorities[task.priority].slaTarget}ms)`, 'sla-violation');
                    }
                    
                    this.completedTasks.push(task);
                    this.logEvent(`Task ${task.id} completed on Server ${server.id} (${task.responseTime}ms response time)`, 'task-completed');
                    return false; // Remove from queue
                }
                return true; // Keep processing
            });
        });
    }
    
    ageTasks() {
        // Increase priority of tasks that have been waiting too long
        this.tasks.forEach(task => {
            if (task.status === 'processing') {
                const waitingTime = this.simulationTime - task.arrivalTime;
                const slaTimeRemaining = task.slaDeadline - this.simulationTime;
                
                // If task is approaching SLA deadline, increase priority
                if (slaTimeRemaining < this.taskPriorities[task.priority].slaTarget * 0.3) {
                    if (task.priority === 'low') {
                        task.priority = 'medium';
                    } else if (task.priority === 'medium') {
                        task.priority = 'high';
                    }
                }
            }
        });
    }
    
    updateServerHealth() {
        this.servers.forEach(server => {
            const now = Date.now();
            
            // Random failure simulation - higher chance than before for testing
            if (server.healthStatus === 'healthy' && Math.random() < this.config.serverFailureRate * 3) {
                server.healthStatus = 'failed';
                server.failureTime = now;
                server.recoveryTime = now + this.config.serverRecoveryTime;
                this.logEvent(`Server ${server.id} failed due to random failure`, 'server-failure');
            }
            
            // Recovery simulation
            if (server.healthStatus === 'failed' && server.recoveryTime && now >= server.recoveryTime) {
                server.healthStatus = 'recovering';
                setTimeout(() => {
                    if (server.healthStatus === 'recovering') {
                        server.healthStatus = 'healthy';
                        server.failureTime = null;
                        server.recoveryTime = null;
                        this.logEvent(`Server ${server.id} fully recovered`, 'server-recovery');
                    }
                }, 2000);
                this.logEvent(`Server ${server.id} recovering`, 'server-recovery');
            }
            
            // Performance degradation based on load
            if (server.healthStatus === 'healthy') {
                const loadRatio = server.currentLoad / server.capacity;
                if (loadRatio > 80) { // Use raw comparison instead of percentage
                    server.healthStatus = 'degraded';
                    this.logEvent(`Server ${server.id} performance degraded due to high load`, 'server-overload');
                }
            } else if (server.healthStatus === 'degraded') {
                const loadRatio = server.currentLoad / server.capacity;
                if (loadRatio < 60) { // Use raw comparison instead of percentage
                    server.healthStatus = 'healthy';
                }
            }
            
            // Update uptime percentage
            const totalTime = Math.max(1, now - server.creationTime);
            const downTime = server.failureTime ? Math.min(now - server.failureTime, this.config.serverRecoveryTime) : 0;
            server.uptime = Math.max(0, ((totalTime - downTime) / totalTime) * 100);
        });
    }
    
    calculateAdvancedMetrics() {
        const timestamp = this.simulationTime;
        
        // Response Time metrics and percentiles
        const completedResponseTimes = this.completedTasks.map(task => task.responseTime).sort((a, b) => a - b);
        let avgResponseTime = 0;
        let p50 = 0, p90 = 0, p95 = 0;
        
        if (completedResponseTimes.length > 0) {
            avgResponseTime = completedResponseTimes.reduce((sum, time) => sum + time, 0) / completedResponseTimes.length;
            p50 = this.getPercentile(completedResponseTimes, 50);
            p90 = this.getPercentile(completedResponseTimes, 90);
            p95 = this.getPercentile(completedResponseTimes, 95);
        }
        
        // Throughput
        const throughput = this.simulationTime > 0 ? this.completedTasks.length / this.simulationTime : 0;
        
        // SLA Compliance by priority
        const slaCompliance = this.calculateSLACompliance();
        
        // Failure Rate
        const totalTasks = this.completedTasks.length + this.failedTasks.length;
        const failureRate = totalTasks > 0 ? (this.failedTasks.length / totalTasks) * 100 : 0;
        
        // Server Availability
        const avgAvailability = this.servers.reduce((sum, server) => sum + server.uptime, 0) / this.servers.length;
        
        // Load Variance
        const loads = this.servers.map(server => server.currentLoad);
        const avgLoad = loads.reduce((sum, load) => sum + load, 0) / loads.length;
        const variance = loads.reduce((sum, load) => sum + Math.pow(load - avgLoad, 2), 0) / loads.length;
        const loadVariance = Math.sqrt(variance);
        
        // Queue Depth
        const totalQueueSize = this.servers.reduce((sum, server) => {
            return sum + server.taskQueues.high.length + server.taskQueues.medium.length + server.taskQueues.low.length;
        }, 0);
        const avgQueueDepth = totalQueueSize / this.servers.length;
        
        // Jitter (Response time variance)
        const jitter = completedResponseTimes.length > 1 ? 
            Math.sqrt(completedResponseTimes.reduce((sum, time) => sum + Math.pow(time - avgResponseTime, 2), 0) / completedResponseTimes.length) : 0;
        
        // Store metrics
        this.metrics.responseTime.push(avgResponseTime);
        this.metrics.throughput.push(throughput);
        this.metrics.slaCompliance.push(slaCompliance.overall);
        this.metrics.failureRate.push(failureRate);
        this.metrics.timestamps.push(timestamp);
        this.metrics.responseTimePercentiles.p50.push(p50);
        this.metrics.responseTimePercentiles.p90.push(p90);
        this.metrics.responseTimePercentiles.p95.push(p95);
        
        // Update UI elements
        document.getElementById('avgResponseTime').textContent = (avgResponseTime / 1000).toFixed(2) + 's';
        document.getElementById('responseTime50th').textContent = (p50 / 1000).toFixed(2) + 's';
        document.getElementById('responseTime95th').textContent = (p95 / 1000).toFixed(2) + 's';
        document.getElementById('slaCompliance').textContent = slaCompliance.overall.toFixed(1) + '%';
        document.getElementById('slaHigh').textContent = slaCompliance.high.toFixed(1) + '%';
        document.getElementById('slaMedium').textContent = slaCompliance.medium.toFixed(1) + '%';
        document.getElementById('throughput').textContent = throughput.toFixed(2);
        document.getElementById('failureRate').textContent = failureRate.toFixed(1) + '%';
        document.getElementById('serverAvailability').textContent = avgAvailability.toFixed(1) + '%';
        document.getElementById('loadVariance').textContent = loadVariance.toFixed(1);
        document.getElementById('queueDepth').textContent = avgQueueDepth.toFixed(1);
        document.getElementById('jitter').textContent = jitter.toFixed(1) + 'ms';
        document.getElementById('simulationTimeHeader').textContent = this.simulationTime + 's';
    }
    
    getPercentile(sortedArray, percentile) {
        if (sortedArray.length === 0) return 0;
        const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
        return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
    }
    
    calculateSLACompliance() {
        const priorities = ['high', 'medium', 'low'];
        const compliance = { high: 100, medium: 100, low: 100, overall: 100 };
        
        priorities.forEach(priority => {
            const priorityTasks = this.completedTasks.filter(task => task.priority === priority);
            if (priorityTasks.length > 0) {
                const slaTarget = this.taskPriorities[priority].slaTarget;
                const compliantTasks = priorityTasks.filter(task => task.responseTime <= slaTarget);
                compliance[priority] = (compliantTasks.length / priorityTasks.length) * 100;
            }
        });
        
        // Overall compliance
        if (this.completedTasks.length > 0) {
            const totalCompliant = this.completedTasks.filter(task => 
                task.responseTime <= this.taskPriorities[task.priority].slaTarget
            );
            compliance.overall = (totalCompliant.length / this.completedTasks.length) * 100;
        }
        
        return compliance;
    }
    
    updateCharts() {
        // Server Load Chart
        const serverLabels = this.servers.map(server => `Server ${server.id}`);
        const serverLoads = this.servers.map(server => server.currentLoad);
        const serverCapacities = this.servers.map(server => server.capacity);
        
        // Color bars based on health status
        const serverColors = this.servers.map(server => {
            switch (server.healthStatus) {
                case 'healthy': return '#1FB8CD';
                case 'degraded': return '#F59E0B';
                case 'failed': return '#EF4444';
                case 'recovering': return '#6366F1';
                default: return '#1FB8CD';
            }
        });
        
        this.charts.serverLoad.data.labels = serverLabels;
        this.charts.serverLoad.data.datasets[0].data = serverLoads;
        this.charts.serverLoad.data.datasets[0].backgroundColor = serverColors;
        this.charts.serverLoad.data.datasets[1].data = serverCapacities;
        this.charts.serverLoad.update('none');
        
        // Performance Chart
        const maxPoints = 30;
        const startIndex = Math.max(0, this.metrics.timestamps.length - maxPoints);
        
        this.charts.performance.data.labels = this.metrics.timestamps.slice(startIndex);
        this.charts.performance.data.datasets[0].data = this.metrics.responseTime.slice(startIndex);
        this.charts.performance.data.datasets[1].data = this.metrics.throughput.slice(startIndex);
        this.charts.performance.data.datasets[2].data = this.metrics.slaCompliance.slice(startIndex);
        this.charts.performance.update('none');
        
        // Priority Queue Chart
        const highPriorityTasks = this.tasks.filter(task => task.priority === 'high' && task.status !== 'completed' && !task.failed).length;
        const mediumPriorityTasks = this.tasks.filter(task => task.priority === 'medium' && task.status !== 'completed' && !task.failed).length;
        const lowPriorityTasks = this.tasks.filter(task => task.priority === 'low' && task.status !== 'completed' && !task.failed).length;
        const completedTasks = this.completedTasks.length;
        
        this.charts.priorityQueue.data.datasets[0].data = [highPriorityTasks, mediumPriorityTasks, lowPriorityTasks, completedTasks];
        this.charts.priorityQueue.update('none');
        
        // SLA Compliance Radar Chart
        const slaMetrics = this.calculateSLACompliance();
        const avgAvailability = this.servers.reduce((sum, server) => sum + server.uptime, 0) / this.servers.length;
        const loads = this.servers.map(server => server.currentLoad);
        const avgLoad = loads.reduce((sum, load) => sum + load, 0) / loads.length;
        const variance = loads.reduce((sum, load) => sum + Math.pow(load - avgLoad, 2), 0) / loads.length;
        const loadBalance = Math.max(0, 100 - Math.sqrt(variance));
        const currentThroughput = Math.min(100, (this.metrics.throughput[this.metrics.throughput.length - 1] || 0) * 10);
        
        this.charts.slaCompliance.data.datasets[0].data = [
            slaMetrics.high,
            slaMetrics.medium,
            slaMetrics.low,
            currentThroughput,
            avgAvailability,
            loadBalance
        ];
        this.charts.slaCompliance.update('none');
    }
    
    updateServerHealthDisplay() {
        const serverGrid = document.getElementById('serverGrid');
        serverGrid.innerHTML = '';
        
        this.servers.forEach(server => {
            const serverCard = document.createElement('div');
            serverCard.className = `server-card ${server.healthStatus}`;
            
            const loadPercentage = Math.min(100, (server.currentLoad / server.capacity) * 100);
            const queueSize = server.taskQueues.high.length + server.taskQueues.medium.length + server.taskQueues.low.length;
            
            serverCard.innerHTML = `
                <div class="server-header">
                    <span class="server-id">Server ${server.id}</span>
                    <div class="server-status-indicator ${server.healthStatus}"></div>
                </div>
                <div class="server-stats">
                    <div class="server-stat">
                        <span>Status:</span>
                        <span>${server.healthStatus}</span>
                    </div>
                    <div class="server-stat">
                        <span>Load:</span>
                        <span>${loadPercentage.toFixed(1)}%</span>
                    </div>
                    <div class="server-stat">
                        <span>Queue:</span>
                        <span>${queueSize} tasks</span>
                    </div>
                    <div class="server-stat">
                        <span>Uptime:</span>
                        <span>${server.uptime.toFixed(1)}%</span>
                    </div>
                    <div class="server-stat">
                        <span>Processed:</span>
                        <span>${server.totalProcessed}</span>
                    </div>
                </div>
                <div class="server-load-bar">
                    <div class="server-load-fill ${loadPercentage > 80 ? 'high' : loadPercentage > 60 ? 'medium' : ''}" 
                         style="width: ${loadPercentage}%"></div>
                </div>
            `;
            
            serverGrid.appendChild(serverCard);
        });
    }
    
    simulateRandomFailure() {
        const healthyServers = this.servers.filter(server => server.healthStatus === 'healthy' || server.healthStatus === 'degraded');
        if (healthyServers.length > 0) {
            const randomServer = healthyServers[Math.floor(Math.random() * healthyServers.length)];
            randomServer.healthStatus = 'failed';
            randomServer.failureTime = Date.now();
            randomServer.recoveryTime = Date.now() + this.config.serverRecoveryTime;
            this.logEvent(`Manually triggered failure on Server ${randomServer.id}`, 'server-failure');
            this.updateServerHealthDisplay();
        }
    }
    
    recoverAllServers() {
        this.servers.forEach(server => {
            if (server.healthStatus === 'failed' || server.healthStatus === 'recovering') {
                server.healthStatus = 'healthy';
                server.failureTime = null;
                server.recoveryTime = null;
            }
        });
        this.logEvent('All servers manually recovered', 'server-recovery');
        this.updateServerHealthDisplay();
    }
    
    logEvent(message, className = '') {
        const logElement = document.getElementById('taskLog');
        const entry = document.createElement('div');
        entry.className = `log-entry ${className}`;
        entry.textContent = `[${this.simulationTime}s] ${message}`;
        logElement.appendChild(entry);
        logElement.scrollTop = logElement.scrollHeight;
        
        // Keep log size manageable
        if (logElement.children.length > 100) {
            logElement.removeChild(logElement.firstChild);
        }
    }
    
    clearLog() {
        document.getElementById('taskLog').innerHTML = 
            '<div class="log-entry">Log cleared.</div>';
    }
    
    startSimulation() {
        if (this.simulationState === 'stopped') {
            this.resetSimulation();
        }
        
        this.simulationState = 'running';
        this.updateUI();
        this.logEvent('Advanced simulation started with health monitoring and priority queues');
        
        // Start task generation with proper timing
        const taskGenerationRate = 1000 / this.config.arrivalRate;
        let tasksGenerated = 0;
        
        this.taskGenerationInterval = setInterval(() => {
            if (tasksGenerated < this.config.taskCount) {
                this.generateTask();
                tasksGenerated++;
            } else {
                clearInterval(this.taskGenerationInterval);
                this.taskGenerationInterval = null;
                this.logEvent('Task generation completed');
            }
        }, taskGenerationRate);
        
        // Start simulation steps
        this.updateSimulationSpeed();
    }
    
    updateSimulationSpeed() {
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
        }
        
        const speeds = { slow: 2000, normal: 1000, fast: 500, turbo: 100 };
        const interval = speeds[this.config.simulationSpeed];
        
        this.simulationInterval = setInterval(() => {
            this.processSimulationStep();
        }, interval);
    }
    
    pauseSimulation() {
        this.simulationState = 'paused';
        clearInterval(this.simulationInterval);
        if (this.taskGenerationInterval) {
            clearInterval(this.taskGenerationInterval);
        }
        this.updateUI();
        this.logEvent('Simulation paused');
    }
    
    resumeSimulation() {
        this.simulationState = 'running';
        this.updateUI();
        this.logEvent('Simulation resumed');
        
        // Resume task generation if needed
        if (this.currentTaskId - 1 < this.config.taskCount && !this.taskGenerationInterval) {
            const taskGenerationRate = 1000 / this.config.arrivalRate;
            const tasksGenerated = this.currentTaskId - 1;
            
            this.taskGenerationInterval = setInterval(() => {
                if (this.currentTaskId - 1 < this.config.taskCount) {
                    this.generateTask();
                } else {
                    clearInterval(this.taskGenerationInterval);
                    this.taskGenerationInterval = null;
                }
            }, taskGenerationRate);
        }
        
        this.updateSimulationSpeed();
    }
    
    stopSimulation() {
        this.simulationState = 'completed';
        clearInterval(this.simulationInterval);
        if (this.taskGenerationInterval) {
            clearInterval(this.taskGenerationInterval);
        }
        this.updateUI();
    }
    
    resetSimulation() {
        this.simulationState = 'stopped';
        clearInterval(this.simulationInterval);
        if (this.taskGenerationInterval) {
            clearInterval(this.taskGenerationInterval);
        }
        
        this.simulationTime = 0;
        this.currentTaskId = 1;
        this.roundRobinCounter = 0;
        this.tasks = [];
        this.completedTasks = [];
        this.failedTasks = [];
        this.metrics = {
            responseTime: [],
            throughput: [],
            resourceUtilization: [],
            loadFairness: [],
            slaCompliance: [],
            failureRate: [],
            timestamps: [],
            responseTimePercentiles: {
                p50: [],
                p90: [],
                p95: []
            },
            priorityMetrics: {
                high: { sla: [], count: 0 },
                medium: { sla: [], count: 0 },
                low: { sla: [], count: 0 }
            }
        };
        
        this.createServers();
        this.updateCharts();
        this.updateServerHealthDisplay();
        this.updateUI();
        this.clearLog();
        this.logEvent('Advanced Load Balancing Simulator reset - ready to start');
    }
    
    stepSimulation() {
        if (this.simulationState === 'paused' || this.simulationState === 'stopped') {
            if (this.currentTaskId - 1 < this.config.taskCount) {
                this.generateTask();
            }
            this.processSimulationStep();
        }
    }
    
    updateUI() {
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const resumeBtn = document.getElementById('resumeBtn');
        const stepBtn = document.getElementById('stepBtn');
        const statusElement = document.getElementById('simulationStatus');
        
        // Update status
        const statusMap = {
            stopped: { text: 'Stopped', class: 'status--info' },
            running: { text: 'Running', class: 'status--success' },
            paused: { text: 'Paused', class: 'status--warning' },
            completed: { text: 'Completed', class: 'status--success' }
        };
        
        const status = statusMap[this.simulationState];
        statusElement.textContent = status.text;
        statusElement.className = `status ${status.class}`;
        
        // Update buttons
        startBtn.disabled = this.simulationState === 'running';
        pauseBtn.disabled = this.simulationState !== 'running';
        resumeBtn.disabled = this.simulationState !== 'paused';
        stepBtn.disabled = this.simulationState === 'running';
        
        startBtn.textContent = this.simulationState === 'stopped' ? 'Start Simulation' : 'Restart Simulation';
    }
    
    exportData(format) {
        const data = {
            config: this.config,
            simulationTime: this.simulationTime,
            servers: this.servers,
            tasks: this.tasks,
            completedTasks: this.completedTasks,
            failedTasks: this.failedTasks,
            metrics: this.metrics,
            timestamp: new Date().toISOString(),
            algorithm: this.config.algorithm
        };
        
        if (format === 'json') {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            this.downloadFile(blob, `advanced_load_balancing_${this.config.algorithm}_${Date.now()}.json`);
        } else if (format === 'csv') {
            const csv = this.convertToCSV(data);
            const blob = new Blob([csv], { type: 'text/csv' });
            this.downloadFile(blob, `advanced_load_balancing_${this.config.algorithm}_${Date.now()}.csv`);
        } else if (format === 'report') {
            const report = this.generatePerformanceReport(data);
            const blob = new Blob([report], { type: 'text/plain' });
            this.downloadFile(blob, `performance_report_${this.config.algorithm}_${Date.now()}.txt`);
        }
    }
    
    convertToCSV(data) {
        let csv = 'Task ID,Priority,Arrival Time,Processing Time,Assigned Server,Completion Time,Response Time,SLA Violation,Failed\n';
        
        [...data.completedTasks, ...data.failedTasks].forEach(task => {
            const slaTarget = this.taskPriorities[task.priority].slaTarget;
            const slaViolation = task.responseTime > slaTarget;
            csv += `${task.id},${task.priority},${task.arrivalTime},${task.processingTime},${task.assignedServer || 'N/A'},${task.completionTime || 'N/A'},${task.responseTime || 'N/A'},${slaViolation},${task.failed}\n`;
        });
        
        csv += '\n\nServer ID,Total Processed,Current Load,Capacity,Health Status,Uptime %,Weight\n';
        data.servers.forEach(server => {
            csv += `${server.id},${server.totalProcessed},${server.currentLoad},${server.capacity},${server.healthStatus},${server.uptime.toFixed(2)},${server.weight.toFixed(2)}\n`;
        });
        
        return csv;
    }
    
    generatePerformanceReport(data) {
        const slaCompliance = this.calculateSLACompliance();
        const avgResponseTime = data.metrics.responseTime[data.metrics.responseTime.length - 1] || 0;
        const throughput = data.metrics.throughput[data.metrics.throughput.length - 1] || 0;
        const failureRate = data.metrics.failureRate[data.metrics.failureRate.length - 1] || 0;
        const avgAvailability = data.servers.reduce((sum, server) => sum + server.uptime, 0) / data.servers.length;
        
        return `
ADVANCED LOAD BALANCING PERFORMANCE REPORT
==========================================

Algorithm: ${data.algorithm}
Simulation Time: ${data.simulationTime}s
Generated at: ${data.timestamp}

CONFIGURATION
-------------
Servers: ${data.config.serverCount}
Server Capacity: ${data.config.serverCapacity}
Total Tasks: ${data.config.taskCount}
Arrival Rate: ${data.config.arrivalRate} tasks/sec
Processing Time Range: ${data.config.taskProcessingTimeMin}-${data.config.taskProcessingTimeMax}ms
Failure Rate: ${(data.config.serverFailureRate * 100).toFixed(1)}%

PERFORMANCE METRICS
-------------------
Average Response Time: ${(avgResponseTime / 1000).toFixed(2)}s
50th Percentile: ${(this.getPercentile(data.completedTasks.map(t => t.responseTime).sort((a,b) => a-b), 50) / 1000).toFixed(2)}s
95th Percentile: ${(this.getPercentile(data.completedTasks.map(t => t.responseTime).sort((a,b) => a-b), 95) / 1000).toFixed(2)}s
Throughput: ${throughput.toFixed(2)} tasks/sec
Total Throughput: ${data.completedTasks.length} tasks completed

SLA COMPLIANCE
--------------
Overall: ${slaCompliance.overall.toFixed(1)}%
High Priority: ${slaCompliance.high.toFixed(1)}%
Medium Priority: ${slaCompliance.medium.toFixed(1)}%
Low Priority: ${slaCompliance.low.toFixed(1)}%

RELIABILITY
-----------
Failure Rate: ${failureRate.toFixed(1)}%
Server Availability: ${avgAvailability.toFixed(1)}%
Failed Tasks: ${data.failedTasks.length}
Completed Tasks: ${data.completedTasks.length}

SERVER STATISTICS
-----------------
${data.servers.map(server => 
    `Server ${server.id}: ${server.totalProcessed} tasks processed, ${server.uptime.toFixed(1)}% uptime, Status: ${server.healthStatus}`
).join('\n')}

TASK DISTRIBUTION
-----------------
High Priority: ${data.completedTasks.filter(t => t.priority === 'high').length} tasks
Medium Priority: ${data.completedTasks.filter(t => t.priority === 'medium').length} tasks
Low Priority: ${data.completedTasks.filter(t => t.priority === 'low').length} tasks

RECOMMENDATIONS
---------------
${this.generateRecommendations(data, slaCompliance, avgResponseTime, failureRate)}
        `.trim();
    }
    
    generateRecommendations(data, slaCompliance, avgResponseTime, failureRate) {
        const recommendations = [];
        
        if (slaCompliance.overall < 90) {
            recommendations.push("- Consider increasing server capacity or count to improve SLA compliance");
        }
        
        if (avgResponseTime > 3000) {
            recommendations.push("- Response times are high - consider load balancing algorithm optimization");
        }
        
        if (failureRate > 5) {
            recommendations.push("- High failure rate detected - implement better health monitoring and failover");
        }
        
        if (data.config.algorithm === 'roundRobin') {
            recommendations.push("- Round Robin may not be optimal for varying server capacities - consider Weighted Round Robin");
        }
        
        const serverLoads = data.servers.map(s => s.currentLoad);
        const maxLoad = Math.max(...serverLoads);
        const minLoad = Math.min(...serverLoads);
        if (maxLoad - minLoad > data.config.serverCapacity * 0.3) {
            recommendations.push("- Load distribution is uneven - consider Least Load algorithm");
        }
        
        return recommendations.length > 0 ? recommendations.join('\n') : "- System performance is optimal with current configuration";
    }
    
    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    async runComparison() {
        this.logEvent('Starting comprehensive algorithm comparison...');
        document.getElementById('comparisonSection').style.display = 'block';
        
        const originalAlgorithm = this.config.algorithm;
        const algorithms = ['roundRobin', 'leastLoad', 'weightedRoundRobin', 'shortestResponseTime', 'randomized', 'consistentHashing'];
        const results = {};
        
        for (const algorithm of algorithms) {
            this.config.algorithm = algorithm;
            document.querySelector(`input[value="${algorithm}"]`).checked = true;
            this.updateAlgorithmDescription();
            
            // Run simulation
            this.resetSimulation();
            this.simulationState = 'running';
            
            // Generate all tasks quickly
            for (let i = 0; i < this.config.taskCount; i++) {
                this.generateTask();
            }
            
            // Process until completion with some server failures
            let failureSimulated = false;
            while ((this.completedTasks.length + this.failedTasks.length) < this.config.taskCount && this.simulationTime < 200) {
                this.processSimulationStep();
                
                // Simulate a failure halfway through
                if (!failureSimulated && this.simulationTime > 30) {
                    this.simulateRandomFailure();
                    failureSimulated = true;
                }
            }
            
            // Collect results
            const slaCompliance = this.calculateSLACompliance();
            const avgResponseTime = this.metrics.responseTime[this.metrics.responseTime.length - 1] || 0;
            const throughput = this.metrics.throughput[this.metrics.throughput.length - 1] || 0;
            const failureRate = this.metrics.failureRate[this.metrics.failureRate.length - 1] || 0;
            const loadVariance = this.calculateLoadVariance();
            
            results[algorithm] = {
                avgResponseTime: (avgResponseTime / 1000).toFixed(2),
                slaCompliance: slaCompliance.overall.toFixed(1) + '%',
                throughput: throughput.toFixed(2),
                failureRate: failureRate.toFixed(1) + '%',
                loadVariance: loadVariance.toFixed(1)
            };
        }
        
        // Restore original algorithm
        this.config.algorithm = originalAlgorithm;
        document.querySelector(`input[value="${originalAlgorithm}"]`).checked = true;
        this.updateAlgorithmDescription();
        this.resetSimulation();
        
        // Display results
        this.displayComparisonResults(results);
    }
    
    calculateLoadVariance() {
        const loads = this.servers.map(server => server.currentLoad);
        const avgLoad = loads.reduce((sum, load) => sum + load, 0) / loads.length;
        const variance = loads.reduce((sum, load) => sum + Math.pow(load - avgLoad, 2), 0) / loads.length;
        return Math.sqrt(variance);
    }
    
    displayComparisonResults(results) {
        const tbody = document.querySelector('#comparisonTable tbody');
        tbody.innerHTML = '';
        
        const algorithmNames = {
            roundRobin: 'Round Robin',
            leastLoad: 'Least Load',
            weightedRoundRobin: 'Weighted RR',
            shortestResponseTime: 'Shortest Response',
            randomized: 'Randomized',
            consistentHashing: 'Consistent Hash'
        };
        
        Object.entries(results).forEach(([algorithm, metrics]) => {
            const row = tbody.insertRow();
            
            row.insertCell().textContent = algorithmNames[algorithm];
            row.insertCell().textContent = metrics.avgResponseTime + 's';
            row.insertCell().textContent = metrics.slaCompliance;
            row.insertCell().textContent = metrics.throughput + ' tasks/s';
            row.insertCell().textContent = metrics.failureRate;
            row.insertCell().textContent = metrics.loadVariance;
        });
        
        this.logEvent('Algorithm comparison completed');
    }

    updateTaskProgress() {
        const totalTasks = Math.min(this.currentTaskId - 1, this.config.taskCount);
        const pendingTasks = this.tasks.filter(task => task.status === 'pending').length;
        const inProgressTasks = this.tasks.filter(task => task.status === 'processing').length;
        const completedTasks = this.completedTasks.length;
        const failedTasks = this.failedTasks.length;
        
        this.taskProgress = {
            total: this.config.taskCount,
            pending: pendingTasks,
            inProgress: inProgressTasks,
            completed: completedTasks,
            failed: failedTasks,
            completionPercentage: this.config.taskCount > 0 ? ((completedTasks + failedTasks) / this.config.taskCount) * 100 : 0,
            completionRate: this.simulationTime > 0 ? completedTasks / (this.simulationTime * 0.1) : 0,
            successRate: (completedTasks + failedTasks) > 0 ? (completedTasks / (completedTasks + failedTasks)) * 100 : 100
        };
        
        if (this.taskProgress.completionRate > 0 && this.taskProgress.pending + this.taskProgress.inProgress > 0) {
            this.taskProgress.eta = (this.taskProgress.pending + this.taskProgress.inProgress) / this.taskProgress.completionRate;
        } else {
            this.taskProgress.eta = 0;
        }
        
        this.updateTaskProgressUI();
    }
    updateTaskProgressUI() {
        const counters = [
            { id: 'totalTasks', value: this.taskProgress.total },
            { id: 'pendingTasks', value: this.taskProgress.pending },
            { id: 'inProgressTasks', value: this.taskProgress.inProgress },
            { id: 'completedTasks', value: this.taskProgress.completed },
            { id: 'failedTasks', value: this.taskProgress.failed },
            { id: 'completionRate', value: this.taskProgress.completionRate.toFixed(1) }
        ];
        
        counters.forEach(({ id, value }) => {
            const element = document.getElementById(id);
            if (element) {
                const oldValue = element.textContent;
                element.textContent = value;
                
                if (oldValue !== value.toString()) {
                    element.classList.add('updating');
                    setTimeout(() => element.classList.remove('updating'), 300);
                }
            }
        });
        
        const percentage = this.taskProgress.completionPercentage;
        const circularProgress = document.getElementById('circularProgress');
        const progressPercentage = document.getElementById('progressPercentage');
        
        if (circularProgress && progressPercentage) {
            const gradientColor = percentage < 25 ? '#EF4444' : 
                                 percentage < 75 ? '#F59E0B' : '#10B981';
            
            circularProgress.style.background = `conic-gradient(${gradientColor} ${percentage * 3.6}deg, var(--color-secondary) 0deg)`;
            progressPercentage.textContent = Math.round(percentage) + '%';
        }
        
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill && progressText) {
            progressFill.style.width = percentage + '%';
            progressText.textContent = `${Math.round(percentage)}% (${this.taskProgress.completed + this.taskProgress.failed}/${this.taskProgress.total})`;
        }
        
        const etaElement = document.getElementById('etaValue');
        if (etaElement) {
            if (this.taskProgress.eta > 0) {
                const minutes = Math.floor(this.taskProgress.eta / 60);
                const seconds = Math.round(this.taskProgress.eta % 60);
                etaElement.textContent = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
            } else {
                etaElement.textContent = '--';
            }
        }
    }
    calculateMetrics() {
        const timestamp = this.simulationTime;
        
        let avgResponseTime = 0;
        if (this.completedTasks.length > 0) {
            const totalResponseTime = this.completedTasks.reduce((sum, task) => 
                sum + (task.responseTime || 0), 0);
            avgResponseTime = totalResponseTime / this.completedTasks.length;
        }
        
        const throughput = this.taskProgress.completionRate;
        
        const healthyServers = this.servers.filter(s => s.healthStatus === 'healthy');
        const totalCapacity = healthyServers.reduce((sum, server) => sum + server.capacity, 0);
        const totalLoad = healthyServers.reduce((sum, server) => sum + server.currentLoad, 0);
        const resourceUtilization = totalCapacity > 0 ? (totalLoad / totalCapacity) * 100 : 0;
        
        const loads = healthyServers.map(server => server.currentLoad);
        const avgLoad = loads.reduce((sum, load) => sum + load, 0) / Math.max(loads.length, 1);
        const variance = loads.reduce((sum, load) => sum + Math.pow(load - avgLoad, 2), 0) / Math.max(loads.length, 1);
        const standardDeviation = Math.sqrt(variance);
        
        const successRate = this.taskProgress.successRate;
        
        this.metrics.responseTime.push(avgResponseTime);
        this.metrics.throughput.push(throughput);
        this.metrics.resourceUtilization.push(resourceUtilization);
        this.metrics.loadFairness.push(standardDeviation);
        this.metrics.successRate.push(successRate);
        this.metrics.completionVelocity.push(throughput);
        this.metrics.timestamps.push(timestamp);
        
        document.getElementById('avgResponseTime').textContent = (avgResponseTime / 1000).toFixed(2) + 's';
        document.getElementById('throughput').textContent = throughput.toFixed(2);
        document.getElementById('resourceUtilization').textContent = Math.round(resourceUtilization) + '%';
        
        let fairnessText = 'Perfect';
        if (standardDeviation > 2000) fairnessText = 'Poor';
        else if (standardDeviation > 1000) fairnessText = 'Fair';
        else if (standardDeviation > 500) fairnessText = 'Good';
        document.getElementById('loadFairness').textContent = fairnessText;
        
        document.getElementById('successRate').textContent = Math.round(successRate) + '%';
        document.getElementById('simulationTime').textContent = Math.round(this.simulationTime * 0.1) + 's';
    }
}

// Initialize the simulator when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AdvancedLoadBalancingSimulator();
});