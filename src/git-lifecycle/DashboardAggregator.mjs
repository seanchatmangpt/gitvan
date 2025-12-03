/**
 * @fileoverview Dashboard Aggregator for Git Lifecycle Knowledge Hooks
 * Computes metrics, statistics, and trends for dashboard visualization
 * @module git-lifecycle/DashboardAggregator
 */

import { EventEmitter } from 'node:events';

/**
 * @typedef {Object} DashboardMetrics
 * @property {number} totalCommits - Total commits
 * @property {number} totalPushes - Total pushes
 * @property {number} totalMerges - Total merges
 * @property {number} totalBranches - Total branches
 * @property {number} activeAuthors - Active authors count
 * @property {number} commitsPerDay - Average commits per day
 * @property {number} mergeSuccessRate - Merge success rate (0-1)
 * @property {number} averageCommitSize - Average commit size in lines
 * @property {Map<string, number>} eventTypeCounts - Counts by event type
 * @property {Map<string, number>} branchActivity - Activity by branch
 * @property {Map<string, number>} authorContributions - Contributions by author
 */

/**
 * @typedef {Object} TimeSeriesData
 * @property {string} metric - Metric name
 * @property {Array<{timestamp: number, value: number}>} data - Time series data points
 * @property {string} interval - Data interval (hourly, daily, weekly)
 */

/**
 * @typedef {Object} TrendAnalysis
 * @property {string} metric - Metric name
 * @property {number} current - Current value
 * @property {number} previous - Previous period value
 * @property {number} change - Absolute change
 * @property {number} percentChange - Percent change
 * @property {string} direction - Trend direction (up, down, stable)
 */

/**
 * Dashboard Aggregator for computing metrics and statistics
 * @class
 * @extends EventEmitter
 */
export class DashboardAggregator extends EventEmitter {
  /**
   * @param {Object} options - Aggregator options
   * @param {import('../engines/RdfEngine.mjs').RdfEngine} options.rdfEngine - RDF engine instance
   * @param {import('../core/KnowledgeSubstrateCore.mjs').KnowledgeSubstrateCore} options.substrateCore - Substrate core
   * @param {number} [options.updateIntervalMs] - Update interval in milliseconds
   */
  constructor({ rdfEngine, substrateCore, updateIntervalMs = 60000 }) {
    super();

    /** @type {import('../engines/RdfEngine.mjs').RdfEngine} */
    this.rdfEngine = rdfEngine;

    /** @type {import('../core/KnowledgeSubstrateCore.mjs').KnowledgeSubstrateCore} */
    this.substrateCore = substrateCore;

    /** @type {number} */
    this.updateIntervalMs = updateIntervalMs;

    /** @type {DashboardMetrics|null} */
    this.currentMetrics = null;

    /** @type {Map<string, TimeSeriesData>} */
    this.timeSeries = new Map();

    /** @type {Map<string, TrendAnalysis>} */
    this.trends = new Map();

    /** @type {NodeJS.Timeout|null} */
    this.updateTimer = null;

    /** @type {boolean} */
    this.isRunning = false;

    /** @type {Map<string, any>} */
    this.cache = new Map();

    /** @type {number} */
    this.cacheExpiryMs = 30000;
  }

  /**
   * Start real-time metric updates
   */
  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Initial update
    this.update().catch(error => {
      this.emit('error', error);
    });

    // Schedule periodic updates
    this.updateTimer = setInterval(() => {
      this.update().catch(error => {
        this.emit('error', error);
      });
    }, this.updateIntervalMs);

    this.emit('started');
  }

  /**
   * Stop metric updates
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    this.emit('stopped');
  }

  /**
   * Update all metrics
   */
  async update() {
    try {
      const startTime = Date.now();

      // Compute metrics in transaction for atomicity
      await this.substrateCore.executeInTransaction(async () => {
        // Compute current metrics
        this.currentMetrics = await this._computeCurrentMetrics();

        // Update time series
        await this._updateTimeSeries();

        // Compute trends
        await this._computeTrends();
      });

      const duration = Date.now() - startTime;

      this.emit('updated', {
        metrics: this.currentMetrics,
        duration
      });

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Compute current dashboard metrics
   * @private
   * @returns {Promise<DashboardMetrics>} Current metrics
   */
  async _computeCurrentMetrics() {
    const cacheKey = 'current-metrics';
    const cached = this._getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const query = `
      PREFIX git: <http://gitvan.dev/ontology/git#>
      PREFIX lifecycle: <http://gitvan.dev/ontology/lifecycle#>
      PREFIX foaf: <http://xmlns.com/foaf/0.1/>

      SELECT
        (COUNT(DISTINCT ?commit) AS ?totalCommits)
        (COUNT(DISTINCT ?push) AS ?totalPushes)
        (COUNT(DISTINCT ?merge) AS ?totalMerges)
        (COUNT(DISTINCT ?branch) AS ?totalBranches)
        (COUNT(DISTINCT ?author) AS ?activeAuthors)
      WHERE {
        OPTIONAL {
          ?commit a lifecycle:Event ;
                  lifecycle:eventType "commit" .
        }
        OPTIONAL {
          ?push a lifecycle:Event ;
                lifecycle:eventType "push" .
        }
        OPTIONAL {
          ?merge a lifecycle:Event ;
                 lifecycle:eventType "merge" .
        }
        OPTIONAL {
          ?event git:branch ?branch .
        }
        OPTIONAL {
          ?event git:author ?author .
        }
      }
    `;

    const results = await this.rdfEngine.query(query);
    const result = results[0] ?? {};

    // Additional metrics queries
    const [eventTypeCounts, branchActivity, authorContributions, commitStats] = await Promise.all([
      this._computeEventTypeCounts(),
      this._computeBranchActivity(),
      this._computeAuthorContributions(),
      this._computeCommitStats()
    ]);

    const metrics = {
      totalCommits: parseInt(result.totalCommits?.value ?? '0'),
      totalPushes: parseInt(result.totalPushes?.value ?? '0'),
      totalMerges: parseInt(result.totalMerges?.value ?? '0'),
      totalBranches: parseInt(result.totalBranches?.value ?? '0'),
      activeAuthors: parseInt(result.activeAuthors?.value ?? '0'),
      commitsPerDay: commitStats.commitsPerDay,
      mergeSuccessRate: commitStats.mergeSuccessRate,
      averageCommitSize: commitStats.averageCommitSize,
      eventTypeCounts,
      branchActivity,
      authorContributions
    };

    this._setCache(cacheKey, metrics);
    return metrics;
  }

  /**
   * Compute event type counts
   * @private
   * @returns {Promise<Map<string, number>>} Event type counts
   */
  async _computeEventTypeCounts() {
    const query = `
      PREFIX lifecycle: <http://gitvan.dev/ontology/lifecycle#>

      SELECT ?eventType (COUNT(?event) AS ?count)
      WHERE {
        ?event a lifecycle:Event ;
               lifecycle:eventType ?eventType .
      }
      GROUP BY ?eventType
      ORDER BY DESC(?count)
    `;

    const results = await this.rdfEngine.query(query);
    const counts = new Map();

    for (const result of results) {
      counts.set(
        result.eventType?.value ?? 'unknown',
        parseInt(result.count?.value ?? '0')
      );
    }

    return counts;
  }

  /**
   * Compute branch activity
   * @private
   * @returns {Promise<Map<string, number>>} Branch activity
   */
  async _computeBranchActivity() {
    const query = `
      PREFIX git: <http://gitvan.dev/ontology/git#>
      PREFIX lifecycle: <http://gitvan.dev/ontology/lifecycle#>

      SELECT ?branch (COUNT(?event) AS ?activity)
      WHERE {
        ?event a lifecycle:Event ;
               git:branch ?branch .
      }
      GROUP BY ?branch
      ORDER BY DESC(?activity)
    `;

    const results = await this.rdfEngine.query(query);
    const activity = new Map();

    for (const result of results) {
      activity.set(
        result.branch?.value ?? 'unknown',
        parseInt(result.activity?.value ?? '0')
      );
    }

    return activity;
  }

  /**
   * Compute author contributions
   * @private
   * @returns {Promise<Map<string, number>>} Author contributions
   */
  async _computeAuthorContributions() {
    const query = `
      PREFIX git: <http://gitvan.dev/ontology/git#>
      PREFIX lifecycle: <http://gitvan.dev/ontology/lifecycle#>
      PREFIX foaf: <http://xmlns.com/foaf/0.1/>

      SELECT ?authorEmail (COUNT(?commit) AS ?commits)
      WHERE {
        ?commit a lifecycle:Event ;
                lifecycle:eventType "commit" ;
                git:author ?author .

        ?author foaf:mbox ?authorEmail .
      }
      GROUP BY ?authorEmail
      ORDER BY DESC(?commits)
    `;

    const results = await this.rdfEngine.query(query);
    const contributions = new Map();

    for (const result of results) {
      contributions.set(
        result.authorEmail?.value ?? 'unknown',
        parseInt(result.commits?.value ?? '0')
      );
    }

    return contributions;
  }

  /**
   * Compute commit statistics
   * @private
   * @returns {Promise<Object>} Commit statistics
   */
  async _computeCommitStats() {
    const query = `
      PREFIX git: <http://gitvan.dev/ontology/git#>
      PREFIX lifecycle: <http://gitvan.dev/ontology/lifecycle#>

      SELECT
        (MIN(?timestamp) AS ?firstCommit)
        (MAX(?timestamp) AS ?lastCommit)
        (COUNT(?commit) AS ?totalCommits)
        (AVG(?additions + ?deletions) AS ?avgSize)
      WHERE {
        ?commit a lifecycle:Event ;
                lifecycle:eventType "commit" ;
                lifecycle:timestamp ?timestamp .

        OPTIONAL {
          ?commit git:additions ?additions ;
                  git:deletions ?deletions .
        }
      }
    `;

    const results = await this.rdfEngine.query(query);
    const result = results[0] ?? {};

    const firstCommit = parseInt(result.firstCommit?.value ?? '0');
    const lastCommit = parseInt(result.lastCommit?.value ?? Date.now().toString());
    const totalCommits = parseInt(result.totalCommits?.value ?? '0');
    const avgSize = parseFloat(result.avgSize?.value ?? '0');

    const durationDays = (lastCommit - firstCommit) / (1000 * 60 * 60 * 24);
    const commitsPerDay = durationDays > 0 ? totalCommits / durationDays : 0;

    // Compute merge success rate
    const mergeQuery = `
      PREFIX lifecycle: <http://gitvan.dev/ontology/lifecycle#>
      PREFIX git: <http://gitvan.dev/ontology/git#>

      SELECT
        (COUNT(?merge) AS ?totalMerges)
        (COUNT(?success) AS ?successfulMerges)
      WHERE {
        ?merge a lifecycle:Event ;
               lifecycle:eventType "merge" .

        OPTIONAL {
          ?merge git:status ?status .
          FILTER(?status = "success")
          BIND(?merge AS ?success)
        }
      }
    `;

    const mergeResults = await this.rdfEngine.query(mergeQuery);
    const mergeResult = mergeResults[0] ?? {};

    const totalMerges = parseInt(mergeResult.totalMerges?.value ?? '1');
    const successfulMerges = parseInt(mergeResult.successfulMerges?.value ?? '0');
    const mergeSuccessRate = totalMerges > 0 ? successfulMerges / totalMerges : 1.0;

    return {
      commitsPerDay,
      mergeSuccessRate,
      averageCommitSize: avgSize
    };
  }

  /**
   * Update time series data
   * @private
   */
  async _updateTimeSeries() {
    const metrics = ['commits', 'pushes', 'merges', 'authors'];

    for (const metric of metrics) {
      await this._updateMetricTimeSeries(metric);
    }
  }

  /**
   * Update time series for specific metric
   * @private
   * @param {string} metric - Metric name
   */
  async _updateMetricTimeSeries(metric) {
    const query = `
      PREFIX lifecycle: <http://gitvan.dev/ontology/lifecycle#>

      SELECT
        ((?timestamp - (?timestamp % 3600000)) AS ?hour)
        (COUNT(?event) AS ?count)
      WHERE {
        ?event a lifecycle:Event ;
               lifecycle:eventType "${metric.slice(0, -1)}" ;
               lifecycle:timestamp ?timestamp .

        FILTER(?timestamp > ${Date.now() - 86400000})
      }
      GROUP BY ?hour
      ORDER BY ?hour
    `;

    const results = await this.rdfEngine.query(query);

    const dataPoints = results.map(result => ({
      timestamp: parseInt(result.hour?.value ?? '0'),
      value: parseInt(result.count?.value ?? '0')
    }));

    const timeSeries = {
      metric,
      data: dataPoints,
      interval: 'hourly'
    };

    this.timeSeries.set(metric, timeSeries);
  }

  /**
   * Compute trend analysis
   * @private
   */
  async _computeTrends() {
    const metrics = ['commits', 'pushes', 'merges', 'authors'];

    for (const metric of metrics) {
      await this._computeMetricTrend(metric);
    }
  }

  /**
   * Compute trend for specific metric
   * @private
   * @param {string} metric - Metric name
   */
  async _computeMetricTrend(metric) {
    const now = Date.now();
    const dayMs = 86400000;

    const query = `
      PREFIX lifecycle: <http://gitvan.dev/ontology/lifecycle#>

      SELECT
        (COUNT(?current) AS ?currentCount)
        (COUNT(?previous) AS ?previousCount)
      WHERE {
        OPTIONAL {
          ?current a lifecycle:Event ;
                   lifecycle:eventType "${metric.slice(0, -1)}" ;
                   lifecycle:timestamp ?currentTime .
          FILTER(?currentTime > ${now - dayMs} && ?currentTime <= ${now})
        }
        OPTIONAL {
          ?previous a lifecycle:Event ;
                    lifecycle:eventType "${metric.slice(0, -1)}" ;
                    lifecycle:timestamp ?previousTime .
          FILTER(?previousTime > ${now - (2 * dayMs)} && ?previousTime <= ${now - dayMs})
        }
      }
    `;

    const results = await this.rdfEngine.query(query);
    const result = results[0] ?? {};

    const current = parseInt(result.currentCount?.value ?? '0');
    const previous = parseInt(result.previousCount?.value ?? '0');

    const change = current - previous;
    const percentChange = previous > 0 ? (change / previous) * 100 : 0;

    let direction = 'stable';
    if (Math.abs(percentChange) > 5) {
      direction = percentChange > 0 ? 'up' : 'down';
    }

    const trend = {
      metric,
      current,
      previous,
      change,
      percentChange,
      direction
    };

    this.trends.set(metric, trend);
  }

  /**
   * Get current metrics
   * @returns {DashboardMetrics|null} Current metrics
   */
  getMetrics() {
    return this.currentMetrics;
  }

  /**
   * Get time series data
   * @param {string} metric - Metric name
   * @returns {TimeSeriesData|null} Time series data
   */
  getTimeSeries(metric) {
    return this.timeSeries.get(metric) ?? null;
  }

  /**
   * Get all time series
   * @returns {Map<string, TimeSeriesData>} All time series
   */
  getAllTimeSeries() {
    return new Map(this.timeSeries);
  }

  /**
   * Get trend analysis
   * @param {string} metric - Metric name
   * @returns {TrendAnalysis|null} Trend analysis
   */
  getTrend(metric) {
    return this.trends.get(metric) ?? null;
  }

  /**
   * Get all trends
   * @returns {Map<string, TrendAnalysis>} All trends
   */
  getAllTrends() {
    return new Map(this.trends);
  }

  /**
   * Get repository health score
   * @returns {Object} Health score and indicators
   */
  getHealthScore() {
    if (!this.currentMetrics) {
      return { score: 0, indicators: [] };
    }

    const indicators = [];
    let score = 100;

    // Check commit frequency
    if (this.currentMetrics.commitsPerDay < 1) {
      indicators.push({ type: 'warning', message: 'Low commit frequency' });
      score -= 10;
    }

    // Check merge success rate
    if (this.currentMetrics.mergeSuccessRate < 0.8) {
      indicators.push({ type: 'error', message: 'Low merge success rate' });
      score -= 20;
    }

    // Check active contributors
    if (this.currentMetrics.activeAuthors < 2) {
      indicators.push({ type: 'warning', message: 'Limited contributors' });
      score -= 10;
    }

    // Check branch count
    if (this.currentMetrics.totalBranches > 20) {
      indicators.push({ type: 'info', message: 'Many active branches' });
      score -= 5;
    }

    return {
      score: Math.max(0, score),
      indicators,
      timestamp: Date.now()
    };
  }

  /**
   * Get from cache
   * @private
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null
   */
  _getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    if (Date.now() - cached.timestamp > this.cacheExpiryMs) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  /**
   * Set cache value
   * @private
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   */
  _setCache(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

/**
 * Create a new dashboard aggregator
 * @param {Object} options - Aggregator options
 * @returns {DashboardAggregator} Aggregator instance
 */
export function createDashboardAggregator(options) {
  return new DashboardAggregator(options);
}
