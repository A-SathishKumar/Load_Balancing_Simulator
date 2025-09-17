# CloudLoad Optimizer - Advanced Load Balancing Optimization Simulator

## Overview
CloudLoad Optimizer is a comprehensive, interactive web-based simulator designed to model and optimize load balancing algorithms in distributed cloud environments. It offers an educational and practical platform for demonstrating how different load balancing strategies affect performance, resource utilization, and task completion across multiple servers under varying workload conditions.

This simulator supports advanced features including server health monitoring, task prioritization with SLA compliance, dynamic failure simulation, and detailed real-time performance metrics. It enables users to experiment with and understand the behavior and efficiency of multiple load balancing algorithms in a controlled, visual environment.

---

## Features

### Load Balancing Algorithms
- **Round Robin**: Sequential task distribution in a cyclic manner.
- **Least Load**: Assigns tasks to the least loaded healthy server.
- **Weighted Round Robin**: Distributes tasks according to servers' capacity weights.
- **Shortest Response Time**: Assigns tasks to the server with the fastest recent response.
- **Randomized Load Balancing**: Weighted random task assignment based on server load and health.
- **Consistent Hashing**: Hash-based assignment for session affinity and consistent routing.

### Server Configuration & Health Management
- Configurable number of servers (1 to 10) with adjustable capacity.
- Simulates server health states: Healthy, Degraded, Failed, Recovering.
- Automated and configurable periodic health checks.
- Randomized server failure and recovery simulation.
- Load balancing skips failed or unhealthy servers.
- Visual health dashboard with color-coded status and detailed metrics (uptime, processed tasks).

### Task Management & Prioritization
- User-defined total task count and dynamic arrival rates.
- Tasks have three priority levels: High, Medium, and Low, each with configurable SLA targets.
- Priority queues per server enabling priority-based scheduling.
- Task aging mechanism that escalates priority if tasks wait too long.
- Adjustable priority task distribution controls.

### Progress Tracking & Real-Time Visualization
- Live counters for total, pending, in-progress, completed, and failed tasks.
- Animated progress bar indicating completion percentage with color-coded thresholds.
- Real-time completion rate (tasks per second), success rate, average response time, and ETA.
- Server load bar charts and task velocity line charts.
- SLA compliance donut charts by task priority.
- Dynamic server health grid with load and processed task statistics.

### Simulation Controls & Export
- Start, pause, resume, reset with speed controls (slow, normal, fast).
- On-the-fly configuration adjustments before starting simulations.
- Export simulation data and metrics as CSV or JSON for further analysis.
- Restart simulations easily with new configurations.

### User Interface
- Intuitive and responsive design suitable for desktop and tablet use.
- Clear labeling with tooltips explaining concepts, algorithms, and metrics.
- Organized sidebar controls and dashboard view for metrics and visualizations.
- Color-coded visual feedback for task states and server health.
- Smooth animations and easy-to-read charts provide a seamless user experience.

---

## Technical Details

- **Frontend**: HTML, CSS, JavaScript, and Chart.js for interactive charts.
- **Load Balancer Logic**: Implements algorithms using arrays, loops, and counters for task assignment and server load simulation.
- **Server Health Simulation**: Timed intervals simulate failures and recoveries affecting load balancing decisions.
- **Priority Queues**: Tasks categorized and scheduled based on priority per server.
- **Metrics Calculation**: Real-time percentile calculations, jitter measurements, SLA compliance, and load fairness.
- **Progress Tracking**: Live tracking of task states with performance analytics and ETA prediction.
- **Export Functionality**: Data outputs include full simulation state and metrics.

---

## Getting Started

1. Clone the repository.
2. Open the `index.html` file in a modern web browser.
3. Configure servers, tasks, algorithm, and health parameters.
4. Click **Start** to run the simulation.
5. Monitor real-time visualizations and metrics to analyze system performance.
6. Use export options to save simulation results.

---

## Use Cases

- Educational tool for teaching load balancing concepts in cloud and distributed systems.
- Research and experimentation with load balancing algorithms under fault conditions.
- Performance analysis of task prioritization and resource utilization strategies.
- Demonstration platform for cloud infrastructure optimization techniques.

---

## Future Enhancements

- Integration with backend services for persistent storage and complex workloads.
- Support for more advanced algorithms and real-world network topologies.
- Inclusion of cost and energy consumption metrics.
- Multi-tenant simulation and workload differentiation.
- Enhanced user feedback and recommendations for load balancing improvements.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Contact

For questions or feature requests, please open an issue or contact the project maintainer.

---

**CloudLoad Optimizer** — Exploring load balancing for optimized cloud performance.

