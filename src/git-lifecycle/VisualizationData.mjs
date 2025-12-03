/**
 * @fileoverview Visualization Data for Git Lifecycle Knowledge Hooks
 * Formats metrics and statistics for dashboard rendering
 * @module git-lifecycle/VisualizationData
 */

/**
 * @typedef {Object} ChartData
 * @property {string} type - Chart type (line, bar, pie, etc.)
 * @property {string} title - Chart title
 * @property {Object} data - Chart data
 * @property {Object} options - Chart options
 */

/**
 * @typedef {Object} PerformanceMetrics
 * @property {number} avgResponseTime - Average response time
 * @property {number} p95ResponseTime - 95th percentile response time
 * @property {number} p99ResponseTime - 99th percentile response time
 * @property {number} throughput - Operations per second
 * @property {number} errorRate - Error rate (0-1)
 */

/**
 * @typedef {Object} SLOStatus
 * @property {string} name - SLO name
 * @property {number} target - Target value
 * @property {number} current - Current value
 * @property {string} status - Status (meeting, at-risk, violated)
 * @property {number} budget - Error budget remaining
 */

/**
 * Visualization Data formatter for dashboards
 * @class
 */
export class VisualizationData {
  /**
   * @param {Object} options - Visualization options
   * @param {import('./DashboardAggregator.mjs').DashboardAggregator} options.aggregator - Dashboard aggregator
   */
  constructor({ aggregator }) {
    /** @type {import('./DashboardAggregator.mjs').DashboardAggregator} */
    this.aggregator = aggregator;

    /** @type {Map<string, Function>} */
    this.formatters = new Map();

    // Register default formatters
    this._registerDefaultFormatters();
  }

  /**
   * Register default data formatters
   * @private
   */
  _registerDefaultFormatters() {
    // Commit activity timeline
    this.registerFormatter('commit-timeline', (data) => {
      const timeSeries = this.aggregator.getTimeSeries('commits');
      if (!timeSeries) {
        return this._emptyChart('line', 'Commit Timeline');
      }

      return {
        type: 'line',
        title: 'Commit Activity',
        data: {
          labels: timeSeries.data.map(d => new Date(d.timestamp).toLocaleTimeString()),
          datasets: [{
            label: 'Commits',
            data: timeSeries.data.map(d => d.value),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'top' },
            title: { display: true, text: 'Commits per Hour' }
          },
          scales: {
            y: { beginAtZero: true, title: { display: true, text: 'Commits' } },
            x: { title: { display: true, text: 'Time' } }
          }
        }
      };
    });

    // Event type distribution
    this.registerFormatter('event-distribution', (data) => {
      const metrics = this.aggregator.getMetrics();
      if (!metrics) {
        return this._emptyChart('pie', 'Event Distribution');
      }

      const eventTypes = Array.from(metrics.eventTypeCounts.entries());

      return {
        type: 'pie',
        title: 'Event Distribution',
        data: {
          labels: eventTypes.map(([type]) => type),
          datasets: [{
            data: eventTypes.map(([, count]) => count),
            backgroundColor: [
              'rgba(255, 99, 132, 0.8)',
              'rgba(54, 162, 235, 0.8)',
              'rgba(255, 206, 86, 0.8)',
              'rgba(75, 192, 192, 0.8)',
              'rgba(153, 102, 255, 0.8)',
              'rgba(255, 159, 64, 0.8)'
            ]
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'right' },
            title: { display: true, text: 'Events by Type' }
          }
        }
      };
    });

    // Branch activity
    this.registerFormatter('branch-activity', (data) => {
      const metrics = this.aggregator.getMetrics();
      if (!metrics) {
        return this._emptyChart('bar', 'Branch Activity');
      }

      const branches = Array.from(metrics.branchActivity.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      return {
        type: 'bar',
        title: 'Branch Activity',
        data: {
          labels: branches.map(([branch]) => branch),
          datasets: [{
            label: 'Events',
            data: branches.map(([, count]) => count),
            backgroundColor: 'rgba(54, 162, 235, 0.8)',
            borderColor: 'rgb(54, 162, 235)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            title: { display: true, text: 'Top 10 Active Branches' }
          },
          scales: {
            y: { beginAtZero: true, title: { display: true, text: 'Events' } },
            x: { title: { display: true, text: 'Branch' } }
          }
        }
      };
    });

    // Author contributions
    this.registerFormatter('author-contributions', (data) => {
      const metrics = this.aggregator.getMetrics();
      if (!metrics) {
        return this._emptyChart('bar', 'Author Contributions');
      }

      const authors = Array.from(metrics.authorContributions.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      return {
        type: 'bar',
        title: 'Author Contributions',
        data: {
          labels: authors.map(([email]) => email.replace('mailto:', '')),
          datasets: [{
            label: 'Commits',
            data: authors.map(([, count]) => count),
            backgroundColor: 'rgba(153, 102, 255, 0.8)',
            borderColor: 'rgb(153, 102, 255)',
            borderWidth: 1
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          plugins: {
            legend: { display: false },
            title: { display: true, text: 'Top Contributors' }
          },
          scales: {
            x: { beginAtZero: true, title: { display: true, text: 'Commits' } }
          }
        }
      };
    });

    // Trend indicators
    this.registerFormatter('trends', (data) => {
      const trends = this.aggregator.getAllTrends();

      const trendData = Array.from(trends.values()).map(trend => ({
        metric: trend.metric,
        current: trend.current,
        previous: trend.previous,
        change: trend.change,
        percentChange: trend.percentChange.toFixed(1),
        direction: trend.direction,
        icon: trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→',
        color: trend.direction === 'up' ? 'green' : trend.direction === 'down' ? 'red' : 'gray'
      }));

      return {
        type: 'table',
        title: 'Trends',
        data: trendData,
        options: {
          columns: [
            { key: 'metric', label: 'Metric', sortable: true },
            { key: 'current', label: 'Current', sortable: true },
            { key: 'previous', label: 'Previous', sortable: true },
            { key: 'change', label: 'Change', sortable: true },
            { key: 'percentChange', label: 'Change %', sortable: true },
            { key: 'icon', label: 'Trend', sortable: false }
          ]
        }
      };
    });
  }

  /**
   * Register a custom data formatter
   * @param {string} name - Formatter name
   * @param {Function} formatter - Formatter function
   */
  registerFormatter(name, formatter) {
    this.formatters.set(name, formatter);
  }

  /**
   * Format data for visualization
   * @param {string} formatterName - Formatter to use
   * @param {Object} data - Input data
   * @returns {ChartData} Formatted chart data
   */
  format(formatterName, data = {}) {
    const formatter = this.formatters.get(formatterName);

    if (!formatter) {
      throw new Error(`No formatter registered for: ${formatterName}`);
    }

    return formatter(data);
  }

  /**
   * Get all available formatters
   * @returns {string[]} Formatter names
   */
  getAvailableFormatters() {
    return Array.from(this.formatters.keys());
  }

  /**
   * Create empty chart placeholder
   * @private
   * @param {string} type - Chart type
   * @param {string} title - Chart title
   * @returns {ChartData} Empty chart
   */
  _emptyChart(type, title) {
    return {
      type,
      title,
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: `${title} (No Data)` }
        }
      }
    };
  }

  /**
   * Format performance metrics
   * @param {import('./AsyncEventProcessor.mjs').ProcessorMetrics} metrics - Processor metrics
   * @returns {PerformanceMetrics} Performance metrics
   */
  formatPerformanceMetrics(metrics) {
    return {
      avgResponseTime: metrics.averageProcessingTime,
      p95ResponseTime: metrics.p95ProcessingTime,
      p99ResponseTime: metrics.p99ProcessingTime,
      throughput: metrics.totalProcessed / (Date.now() / 1000),
      errorRate: metrics.totalFailed / (metrics.totalProcessed + metrics.totalFailed)
    };
  }

  /**
   * Format SLO status
   * @param {Object} slos - SLO configuration
   * @param {PerformanceMetrics} performance - Performance metrics
   * @returns {SLOStatus[]} SLO statuses
   */
  formatSLOStatus(slos, performance) {
    const statuses = [];

    // Response time SLO
    if (slos.responseTime) {
      const target = slos.responseTime.target;
      const current = performance.p95ResponseTime;
      const status = this._determineSLOStatus(current, target, slos.responseTime.threshold);
      const budget = Math.max(0, 1 - (current / target));

      statuses.push({
        name: 'Response Time (p95)',
        target,
        current,
        status,
        budget
      });
    }

    // Error rate SLO
    if (slos.errorRate) {
      const target = slos.errorRate.target;
      const current = performance.errorRate;
      const status = this._determineSLOStatus(current, target, slos.errorRate.threshold);
      const budget = Math.max(0, 1 - (current / target));

      statuses.push({
        name: 'Error Rate',
        target,
        current,
        status,
        budget
      });
    }

    // Throughput SLO
    if (slos.throughput) {
      const target = slos.throughput.target;
      const current = performance.throughput;
      const status = current >= target ? 'meeting' : current >= (target * 0.9) ? 'at-risk' : 'violated';
      const budget = current / target;

      statuses.push({
        name: 'Throughput',
        target,
        current,
        status,
        budget
      });
    }

    return statuses;
  }

  /**
   * Determine SLO status
   * @private
   * @param {number} current - Current value
   * @param {number} target - Target value
   * @param {number} threshold - Warning threshold
   * @returns {string} Status
   */
  _determineSLOStatus(current, target, threshold = 0.9) {
    if (current <= target) {
      return 'meeting';
    }
    if (current <= target * threshold) {
      return 'at-risk';
    }
    return 'violated';
  }

  /**
   * Format author contribution graph
   * @param {string} authorEmail - Author email
   * @returns {ChartData} Contribution graph
   */
  async formatAuthorGraph(authorEmail) {
    const metrics = this.aggregator.getMetrics();
    if (!metrics) {
      return this._emptyChart('line', 'Author Contributions');
    }

    const authorCommits = metrics.authorContributions.get(authorEmail) ?? 0;
    const totalCommits = Array.from(metrics.authorContributions.values())
      .reduce((sum, count) => sum + count, 0);

    const percentage = totalCommits > 0 ? (authorCommits / totalCommits * 100).toFixed(1) : 0;

    return {
      type: 'card',
      title: `${authorEmail.replace('mailto:', '')}`,
      data: {
        commits: authorCommits,
        percentage,
        rank: this._getAuthorRank(authorEmail, metrics.authorContributions)
      },
      options: {
        icon: '👤',
        color: this._getAuthorColor(authorCommits, totalCommits)
      }
    };
  }

  /**
   * Get author rank
   * @private
   * @param {string} authorEmail - Author email
   * @param {Map<string, number>} contributions - All contributions
   * @returns {number} Author rank
   */
  _getAuthorRank(authorEmail, contributions) {
    const sorted = Array.from(contributions.entries())
      .sort((a, b) => b[1] - a[1]);

    return sorted.findIndex(([email]) => email === authorEmail) + 1;
  }

  /**
   * Get author color based on contribution
   * @private
   * @param {number} commits - Author commits
   * @param {number} total - Total commits
   * @returns {string} Color
   */
  _getAuthorColor(commits, total) {
    const percentage = total > 0 ? commits / total : 0;

    if (percentage > 0.3) return 'green';
    if (percentage > 0.1) return 'blue';
    if (percentage > 0.05) return 'orange';
    return 'gray';
  }

  /**
   * Format health dashboard
   * @returns {Object} Health dashboard data
   */
  formatHealthDashboard() {
    const metrics = this.aggregator.getMetrics();
    const health = this.aggregator.getHealthScore();
    const trends = this.aggregator.getAllTrends();

    return {
      score: health.score,
      indicators: health.indicators,
      timestamp: health.timestamp,
      metrics: metrics ? {
        commits: metrics.totalCommits,
        pushes: metrics.totalPushes,
        merges: metrics.totalMerges,
        branches: metrics.totalBranches,
        authors: metrics.activeAuthors,
        commitsPerDay: metrics.commitsPerDay.toFixed(2),
        mergeSuccessRate: (metrics.mergeSuccessRate * 100).toFixed(1) + '%'
      } : null,
      trends: Array.from(trends.values()).map(trend => ({
        metric: trend.metric,
        direction: trend.direction,
        percentChange: trend.percentChange.toFixed(1) + '%'
      }))
    };
  }

  /**
   * Format real-time updates
   * @returns {Object} Real-time update data
   */
  formatRealTimeUpdates() {
    const metrics = this.aggregator.getMetrics();

    return {
      timestamp: Date.now(),
      metrics: metrics ? {
        totalEvents: Array.from(metrics.eventTypeCounts.values())
          .reduce((sum, count) => sum + count, 0),
        activeAuthors: metrics.activeAuthors,
        activeBranches: metrics.totalBranches,
        commitRate: metrics.commitsPerDay.toFixed(2)
      } : null
    };
  }

  /**
   * Export data for external visualization tools
   * @param {string} format - Export format (json, csv, etc.)
   * @returns {Object} Exported data
   */
  exportData(format = 'json') {
    const metrics = this.aggregator.getMetrics();
    const timeSeries = this.aggregator.getAllTimeSeries();
    const trends = this.aggregator.getAllTrends();

    const data = {
      metrics: metrics ? {
        totalCommits: metrics.totalCommits,
        totalPushes: metrics.totalPushes,
        totalMerges: metrics.totalMerges,
        totalBranches: metrics.totalBranches,
        activeAuthors: metrics.activeAuthors,
        commitsPerDay: metrics.commitsPerDay,
        mergeSuccessRate: metrics.mergeSuccessRate,
        averageCommitSize: metrics.averageCommitSize,
        eventTypeCounts: Object.fromEntries(metrics.eventTypeCounts),
        branchActivity: Object.fromEntries(metrics.branchActivity),
        authorContributions: Object.fromEntries(metrics.authorContributions)
      } : null,
      timeSeries: Object.fromEntries(
        Array.from(timeSeries.entries()).map(([key, series]) => [
          key,
          {
            metric: series.metric,
            interval: series.interval,
            data: series.data
          }
        ])
      ),
      trends: Object.fromEntries(trends)
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }

    if (format === 'csv') {
      return this._convertToCSV(data);
    }

    throw new Error(`Unsupported export format: ${format}`);
  }

  /**
   * Convert data to CSV format
   * @private
   * @param {Object} data - Data to convert
   * @returns {string} CSV string
   */
  _convertToCSV(data) {
    const lines = [];

    // Metrics section
    if (data.metrics) {
      lines.push('Metric,Value');
      for (const [key, value] of Object.entries(data.metrics)) {
        if (typeof value !== 'object') {
          lines.push(`${key},${value}`);
        }
      }
    }

    return lines.join('\n');
  }
}

/**
 * Create a new visualization data formatter
 * @param {Object} options - Visualization options
 * @returns {VisualizationData} Visualization data instance
 */
export function createVisualizationData(options) {
  return new VisualizationData(options);
}
