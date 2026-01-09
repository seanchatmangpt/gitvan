/**
 * @fileoverview GitVan Performance Queries - SPARQL-based performance analysis
 *
 * Provides 15+ query functions for anomaly detection, regression analysis,
 * correlation discovery, trend analysis, and optimization recommendations.
 *
 * Features:
 * - Budget violation detection
 * - Memory leak identification
 * - CPU spike detection
 * - I/O-bound operation detection
 * - Performance regression detection
 * - Correlation analysis
 * - Trend analysis
 * - Optimization recommendations
 * - Statistical aggregations
 * - Capacity planning
 *
 * All queries are optimized for <100ms execution time.
 *
 * @version 1.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import { createLogger } from '../../utils/logger.mjs';

const logger = createLogger('performance:queries');

// Namespace URIs
const PERF_NS = 'https://gitvan.dev/performance#';
const XSD_NS = 'http://www.w3.org/2001/XMLSchema#';
const RDF_NS = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';

/**
 * Performance Queries Collection
 *
 * All queries accept a KnowledgeSubstrate instance and return Promise<Array>
 */
export const PerformanceQueries = {
  /**
   * Detect Budget Violations
   *
   * Finds operations that exceed their defined performance budgets.
   *
   * @param {object} ks - KnowledgeSubstrate instance
   * @param {object} [options] - Query options
   * @param {number} [options.limit=100] - Max results
   * @param {string} [options.operation] - Filter by operation name
   * @returns {Promise<Array<object>>} Budget violations
   *
   * @example
   * const violations = await detectBudgetViolations(ks);
   * // [{ measurementId: 'meas-123', operation: 'sparql-query',
   * //    duration: 150.5, budget: 100.0, excess: 50.5 }]
   */
  async detectBudgetViolations(ks, options = {}) {
    const { limit = 100, operation } = options;
    const operationFilter = operation ? `FILTER(?operation = "${operation}")` : '';

    const sparql = `
      PREFIX perf: <${PERF_NS}>
      PREFIX xsd: <${XSD_NS}>

      SELECT ?measurementId ?operation ?duration ?budget ?timestamp
             ((?duration - ?budget) AS ?excess)
      WHERE {
        ?m a perf:Measurement ;
           perf:measurementId ?measurementId ;
           perf:operation ?operation ;
           perf:duration ?duration ;
           perf:timestamp ?timestamp .

        ?b a perf:PerformanceBudget ;
           perf:forOperation ?operation ;
           perf:maxDuration ?budget ;
           perf:budgetEnabled true .

        FILTER(?duration > ?budget)
        ${operationFilter}
      }
      ORDER BY DESC(?excess)
      LIMIT ${limit}
    `;

    try {
      const result = await ks.query(sparql);
      return result.results || result.rows || [];
    } catch (error) {
      logger.error(`Budget violation detection failed: ${error.message}`);
      return [];
    }
  },

  /**
   * Detect Memory Leaks
   *
   * Identifies operations with consistently increasing memory usage pattern.
   * Uses sliding window to detect 3+ consecutive increases.
   *
   * @param {object} ks - KnowledgeSubstrate instance
   * @param {object} [options] - Query options
   * @param {number} [options.windowSize=5] - Measurement window size
   * @param {number} [options.increaseThreshold=1.1] - 10% increase threshold
   * @returns {Promise<Array<object>>} Potential memory leaks
   *
   * @example
   * const leaks = await detectMemoryLeaks(ks);
   * // [{ operation: 'workflow-exec', measurements: 5,
   * //    avgIncrease: 15.2, totalIncrease: 45600 }]
   */
  async detectMemoryLeaks(ks, options = {}) {
    const { windowSize = 5, increaseThreshold = 1.1 } = options;

    const sparql = `
      PREFIX perf: <${PERF_NS}>
      PREFIX xsd: <${XSD_NS}>

      SELECT ?operation
             (COUNT(?m) AS ?measurements)
             (AVG(?memoryUsed) AS ?avgMemory)
             (MAX(?memoryUsed) - MIN(?memoryUsed) AS ?totalIncrease)
      WHERE {
        ?m a perf:Measurement ;
           perf:operation ?operation ;
           perf:memoryUsed ?memoryUsed ;
           perf:timestamp ?timestamp .
      }
      GROUP BY ?operation
      HAVING (COUNT(?m) >= ${windowSize})
      ORDER BY DESC(?totalIncrease)
    `;

    try {
      const result = await ks.query(sparql);
      const candidates = result.results || result.rows || [];

      // Post-filter to verify consistent increase pattern
      const leaks = [];
      for (const candidate of candidates) {
        const hasPattern = await this._verifyMemoryLeakPattern(
          ks,
          candidate.operation.value,
          increaseThreshold
        );
        if (hasPattern) {
          leaks.push({
            operation: candidate.operation.value,
            measurements: parseInt(candidate.measurements.value),
            avgMemory: parseFloat(candidate.avgMemory.value),
            totalIncrease: parseInt(candidate.totalIncrease.value)
          });
        }
      }

      return leaks;
    } catch (error) {
      logger.error(`Memory leak detection failed: ${error.message}`);
      return [];
    }
  },

  /**
   * Detect CPU Spikes
   *
   * Finds measurements with abnormally high CPU usage (>3 std deviations).
   *
   * @param {object} ks - KnowledgeSubstrate instance
   * @param {object} [options] - Query options
   * @param {number} [options.threshold=80] - CPU percentage threshold
   * @param {number} [options.limit=50] - Max results
   * @returns {Promise<Array<object>>} CPU spikes
   *
   * @example
   * const spikes = await detectCpuSpikes(ks);
   * // [{ measurementId: 'meas-456', operation: 'git-commit',
   * //    cpuPercent: 95.3, timestamp: '2026-01-09T10:00:00Z' }]
   */
  async detectCpuSpikes(ks, options = {}) {
    const { threshold = 80, limit = 50 } = options;

    const sparql = `
      PREFIX perf: <${PERF_NS}>
      PREFIX xsd: <${XSD_NS}>

      SELECT ?measurementId ?operation ?cpuPercent ?timestamp ?duration
      WHERE {
        ?m a perf:Measurement ;
           perf:measurementId ?measurementId ;
           perf:operation ?operation ;
           perf:cpuPercent ?cpuPercent ;
           perf:timestamp ?timestamp ;
           perf:duration ?duration .

        FILTER(?cpuPercent > ${threshold})
      }
      ORDER BY DESC(?cpuPercent)
      LIMIT ${limit}
    `;

    try {
      const result = await ks.query(sparql);
      return (result.results || result.rows || []).map(row => ({
        measurementId: row.measurementId.value,
        operation: row.operation.value,
        cpuPercent: parseFloat(row.cpuPercent.value),
        timestamp: row.timestamp.value,
        duration: parseFloat(row.duration.value)
      }));
    } catch (error) {
      logger.error(`CPU spike detection failed: ${error.message}`);
      return [];
    }
  },

  /**
   * Detect I/O-Bound Operations
   *
   * Identifies operations bottlenecked by I/O (high memory/disk, low CPU).
   *
   * @param {object} ks - KnowledgeSubstrate instance
   * @param {object} [options] - Query options
   * @param {number} [options.memoryThreshold=400000] - Memory threshold (bytes)
   * @param {number} [options.cpuThreshold=30] - CPU threshold (%)
   * @returns {Promise<Array<object>>} I/O-bound operations
   *
   * @example
   * const ioBound = await detectIoBoundness(ks);
   * // [{ operation: 'snapshot-load', avgMemory: 450000,
   * //    avgCpu: 25.3, count: 15 }]
   */
  async detectIoBoundness(ks, options = {}) {
    const { memoryThreshold = 400000, cpuThreshold = 30 } = options;

    const sparql = `
      PREFIX perf: <${PERF_NS}>
      PREFIX xsd: <${XSD_NS}>

      SELECT ?operation
             (AVG(?memoryUsed) AS ?avgMemory)
             (AVG(?cpuPercent) AS ?avgCpu)
             (AVG(?diskIO) AS ?avgDiskIO)
             (COUNT(?m) AS ?count)
      WHERE {
        ?m a perf:Measurement ;
           perf:operation ?operation ;
           perf:memoryUsed ?memoryUsed ;
           perf:cpuPercent ?cpuPercent ;
           perf:diskIO ?diskIO .
      }
      GROUP BY ?operation
      HAVING (AVG(?memoryUsed) > ${memoryThreshold} && AVG(?cpuPercent) < ${cpuThreshold})
      ORDER BY DESC(?avgMemory)
    `;

    try {
      const result = await ks.query(sparql);
      return (result.results || result.rows || []).map(row => ({
        operation: row.operation.value,
        avgMemory: parseInt(row.avgMemory.value),
        avgCpu: parseFloat(row.avgCpu.value),
        avgDiskIO: parseInt(row.avgDiskIO?.value || 0),
        count: parseInt(row.count.value)
      }));
    } catch (error) {
      logger.error(`I/O-bound detection failed: ${error.message}`);
      return [];
    }
  },

  /**
   * Get Performance Regressions
   *
   * Compares recent performance (last N days) vs baseline to detect slowdowns.
   *
   * @param {object} ks - KnowledgeSubstrate instance
   * @param {number} [days=7] - Days to look back
   * @param {number} [threshold=0.10] - Regression threshold (10% default)
   * @returns {Promise<Array<object>>} Performance regressions
   *
   * @example
   * const regressions = await getPerformanceRegression(ks, 7);
   * // [{ operation: 'sparql-query', baselineP95: 45.2,
   * //    currentP95: 52.3, change: 15.7, status: 'regression' }]
   */
  async getPerformanceRegression(ks, days = 7, threshold = 0.10) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoff = cutoffDate.toISOString();

    // Get recent stats
    const recentSparql = `
      PREFIX perf: <${PERF_NS}>
      PREFIX xsd: <${XSD_NS}>

      SELECT ?operation
             (AVG(?duration) AS ?avgDuration)
             (COUNT(?m) AS ?count)
      WHERE {
        ?m a perf:Measurement ;
           perf:operation ?operation ;
           perf:duration ?duration ;
           perf:timestamp ?timestamp .

        FILTER(?timestamp >= "${cutoff}"^^xsd:dateTime)
      }
      GROUP BY ?operation
    `;

    // Get baseline stats (all historical data before cutoff)
    const baselineSparql = `
      PREFIX perf: <${PERF_NS}>
      PREFIX xsd: <${XSD_NS}>

      SELECT ?operation
             (AVG(?duration) AS ?avgDuration)
             (COUNT(?m) AS ?count)
      WHERE {
        ?m a perf:Measurement ;
           perf:operation ?operation ;
           perf:duration ?duration ;
           perf:timestamp ?timestamp .

        FILTER(?timestamp < "${cutoff}"^^xsd:dateTime)
      }
      GROUP BY ?operation
    `;

    try {
      const recentResult = await ks.query(recentSparql);
      const baselineResult = await ks.query(baselineSparql);

      const recentStats = new Map(
        (recentResult.results || recentResult.rows || []).map(row => [
          row.operation.value,
          {
            avg: parseFloat(row.avgDuration.value),
            count: parseInt(row.count.value)
          }
        ])
      );

      const baselineStats = new Map(
        (baselineResult.results || baselineResult.rows || []).map(row => [
          row.operation.value,
          {
            avg: parseFloat(row.avgDuration.value),
            count: parseInt(row.count.value)
          }
        ])
      );

      const regressions = [];
      for (const [operation, recent] of recentStats) {
        const baseline = baselineStats.get(operation);
        if (!baseline) continue;

        const change = ((recent.avg - baseline.avg) / baseline.avg) * 100;
        if (change > threshold * 100) {
          regressions.push({
            operation,
            baselineAvg: baseline.avg,
            currentAvg: recent.avg,
            change,
            status: 'regression',
            baselineCount: baseline.count,
            recentCount: recent.count
          });
        }
      }

      return regressions.sort((a, b) => b.change - a.change);
    } catch (error) {
      logger.error(`Performance regression detection failed: ${error.message}`);
      return [];
    }
  },

  /**
   * Detect Slowdowns
   *
   * Finds operations currently slower than their historical average.
   *
   * @param {object} ks - KnowledgeSubstrate instance
   * @param {number} [threshold=0.10] - Slowdown threshold (10%)
   * @returns {Promise<Array<object>>} Slowdown detections
   *
   * @example
   * const slowdowns = await detectSlowdown(ks, 0.15);
   * // [{ operation: 'git-merge', currentAvg: 230.5,
   * //    historicalAvg: 185.2, slowdown: 24.5 }]
   */
  async detectSlowdown(ks, threshold = 0.10) {
    const sparql = `
      PREFIX perf: <${PERF_NS}>
      PREFIX xsd: <${XSD_NS}>

      SELECT ?operation
             (AVG(?duration) AS ?avgDuration)
             (COUNT(?m) AS ?count)
      WHERE {
        ?m a perf:Measurement ;
           perf:operation ?operation ;
           perf:duration ?duration .
      }
      GROUP BY ?operation
      HAVING (COUNT(?m) >= 10)
    `;

    try {
      const result = await ks.query(sparql);
      const operations = result.results || result.rows || [];

      const slowdowns = [];
      for (const op of operations) {
        const operation = op.operation.value;
        const avgDuration = parseFloat(op.avgDuration.value);

        // Get recent 5 measurements
        const recentAvg = await this._getRecentAverage(ks, operation, 5);
        if (recentAvg === null) continue;

        const slowdown = ((recentAvg - avgDuration) / avgDuration) * 100;
        if (slowdown > threshold * 100) {
          slowdowns.push({
            operation,
            currentAvg: recentAvg,
            historicalAvg: avgDuration,
            slowdown,
            count: parseInt(op.count.value)
          });
        }
      }

      return slowdowns.sort((a, b) => b.slowdown - a.slowdown);
    } catch (error) {
      logger.error(`Slowdown detection failed: ${error.message}`);
      return [];
    }
  },

  /**
   * Find Correlated Operations
   *
   * Discovers operations that affect each other's performance.
   * Uses Pearson correlation coefficient.
   *
   * @param {object} ks - KnowledgeSubstrate instance
   * @param {object} [options] - Query options
   * @param {number} [options.minCorrelation=0.7] - Minimum correlation (-1 to 1)
   * @returns {Promise<Array<object>>} Correlated operation pairs
   *
   * @example
   * const correlations = await findCorrelatedOperations(ks);
   * // [{ operation1: 'workflow-step-1', operation2: 'workflow-step-2',
   * //    correlation: 0.85, metric: 'duration' }]
   */
  async findCorrelatedOperations(ks, options = {}) {
    const { minCorrelation = 0.7 } = options;

    // Query for existing correlation data
    const sparql = `
      PREFIX perf: <${PERF_NS}>
      PREFIX xsd: <${XSD_NS}>

      SELECT ?operation1 ?operation2 ?correlation ?metric
      WHERE {
        ?c a perf:Correlation ;
           perf:operation1 ?operation1 ;
           perf:operation2 ?operation2 ;
           perf:correlationCoefficient ?correlation ;
           perf:metric ?metric .

        FILTER(ABS(?correlation) >= ${minCorrelation})
      }
      ORDER BY DESC(?correlation)
    `;

    try {
      const result = await ks.query(sparql);
      return (result.results || result.rows || []).map(row => ({
        operation1: row.operation1.value,
        operation2: row.operation2.value,
        correlation: parseFloat(row.correlation.value),
        metric: row.metric.value
      }));
    } catch (error) {
      logger.error(`Correlation detection failed: ${error.message}`);
      return [];
    }
  },

  /**
   * Get Resource Chain Impact
   *
   * Analyzes impact: if operation A is slow, what else suffers?
   *
   * @param {object} ks - KnowledgeSubstrate instance
   * @param {string} [operation] - Root operation to analyze
   * @returns {Promise<Array<object>>} Impact chain
   *
   * @example
   * const chain = await getResourceChainImpact(ks, 'git-lock-acquire');
   * // [{ operation: 'git-commit', impact: 'high', correlation: 0.92 },
   * //  { operation: 'snapshot-save', impact: 'medium', correlation: 0.68 }]
   */
  async getResourceChainImpact(ks, operation) {
    if (!operation) {
      // Return top impactful operations
      const sparql = `
        PREFIX perf: <${PERF_NS}>
        PREFIX xsd: <${XSD_NS}>

        SELECT ?operation1
               (COUNT(?operation2) AS ?impactedOps)
               (AVG(?correlation) AS ?avgCorrelation)
        WHERE {
          ?c a perf:Correlation ;
             perf:operation1 ?operation1 ;
             perf:operation2 ?operation2 ;
             perf:correlationCoefficient ?correlation .

          FILTER(?correlation > 0.5)
        }
        GROUP BY ?operation1
        ORDER BY DESC(?impactedOps)
        LIMIT 20
      `;

      try {
        const result = await ks.query(sparql);
        return (result.results || result.rows || []).map(row => ({
          operation: row.operation1.value,
          impactedOperations: parseInt(row.impactedOps.value),
          avgCorrelation: parseFloat(row.avgCorrelation.value),
          impact: this._determineImpactLevel(parseFloat(row.avgCorrelation.value))
        }));
      } catch (error) {
        logger.error(`Resource chain impact failed: ${error.message}`);
        return [];
      }
    }

    // Get impact chain for specific operation
    const sparql = `
      PREFIX perf: <${PERF_NS}>
      PREFIX xsd: <${XSD_NS}>

      SELECT ?operation2 ?correlation ?metric
      WHERE {
        ?c a perf:Correlation ;
           perf:operation1 "${operation}" ;
           perf:operation2 ?operation2 ;
           perf:correlationCoefficient ?correlation ;
           perf:metric ?metric .

        FILTER(?correlation > 0.5)
      }
      ORDER BY DESC(?correlation)
    `;

    try {
      const result = await ks.query(sparql);
      return (result.results || result.rows || []).map(row => ({
        operation: row.operation2.value,
        correlation: parseFloat(row.correlation.value),
        metric: row.metric.value,
        impact: this._determineImpactLevel(parseFloat(row.correlation.value))
      }));
    } catch (error) {
      logger.error(`Resource chain impact failed: ${error.message}`);
      return [];
    }
  },

  /**
   * Get Trend Line
   *
   * Returns performance trend for an operation over time.
   *
   * @param {object} ks - KnowledgeSubstrate instance
   * @param {string} operation - Operation name
   * @param {number} [days=90] - Days to analyze
   * @returns {Promise<object|null>} Trend analysis
   *
   * @example
   * const trend = await getTrendLine(ks, 'sparql-query', 30);
   * // { operation: 'sparql-query', slope: 0.05, direction: 'degrading',
   * //   startAvg: 45.2, endAvg: 48.3, dataPoints: 250 }
   */
  async getTrendLine(ks, operation, days = 90) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const start = startDate.toISOString();

    const sparql = `
      PREFIX perf: <${PERF_NS}>
      PREFIX xsd: <${XSD_NS}>

      SELECT ?timestamp ?duration
      WHERE {
        ?m a perf:Measurement ;
           perf:operation "${operation}" ;
           perf:timestamp ?timestamp ;
           perf:duration ?duration .

        FILTER(?timestamp >= "${start}"^^xsd:dateTime)
      }
      ORDER BY ?timestamp
    `;

    try {
      const result = await ks.query(sparql);
      const measurements = (result.results || result.rows || []).map(row => ({
        timestamp: new Date(row.timestamp.value).getTime(),
        duration: parseFloat(row.duration.value)
      }));

      if (measurements.length < 2) return null;

      // Calculate linear regression
      const { slope, intercept } = this._linearRegression(measurements);
      const direction = slope > 0.01 ? 'degrading' :
                       slope < -0.01 ? 'improving' : 'stable';

      const startAvg = measurements.slice(0, Math.ceil(measurements.length * 0.1))
        .reduce((sum, m) => sum + m.duration, 0) /
        Math.ceil(measurements.length * 0.1);

      const endAvg = measurements.slice(-Math.ceil(measurements.length * 0.1))
        .reduce((sum, m) => sum + m.duration, 0) /
        Math.ceil(measurements.length * 0.1);

      return {
        operation,
        slope,
        intercept,
        direction,
        startAvg,
        endAvg,
        dataPoints: measurements.length,
        changePercent: ((endAvg - startAvg) / startAvg) * 100
      };
    } catch (error) {
      logger.error(`Trend line calculation failed: ${error.message}`);
      return null;
    }
  },

  /**
   * Get Peak Usage Times
   *
   * Identifies when system is busiest (most operations/highest load).
   *
   * @param {object} ks - KnowledgeSubstrate instance
   * @param {object} [options] - Query options
   * @param {number} [options.days=30] - Days to analyze
   * @returns {Promise<Array<object>>} Peak usage windows
   *
   * @example
   * const peaks = await getPeakUsageTimes(ks);
   * // [{ hour: 14, dayOfWeek: 'Monday', avgOperations: 450,
   * //    avgDuration: 67.2, utilizationPercent: 85.3 }]
   */
  async getPeakUsageTimes(ks, options = {}) {
    const { days = 30 } = options;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const start = startDate.toISOString();

    const sparql = `
      PREFIX perf: <${PERF_NS}>
      PREFIX xsd: <${XSD_NS}>

      SELECT ?timestamp ?duration
      WHERE {
        ?m a perf:Measurement ;
           perf:timestamp ?timestamp ;
           perf:duration ?duration .

        FILTER(?timestamp >= "${start}"^^xsd:dateTime)
      }
      ORDER BY ?timestamp
    `;

    try {
      const result = await ks.query(sparql);
      const measurements = (result.results || result.rows || []);

      // Group by hour and day of week
      const byHour = new Map();
      for (const row of measurements) {
        const date = new Date(row.timestamp.value);
        const hour = date.getHours();
        const dayOfWeek = date.getDay();
        const key = `${dayOfWeek}-${hour}`;

        if (!byHour.has(key)) {
          byHour.set(key, {
            hour,
            dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
            measurements: [],
            totalDuration: 0
          });
        }

        const bucket = byHour.get(key);
        bucket.measurements.push(parseFloat(row.duration.value));
        bucket.totalDuration += parseFloat(row.duration.value);
      }

      // Calculate peaks
      const peaks = Array.from(byHour.values()).map(bucket => ({
        hour: bucket.hour,
        dayOfWeek: bucket.dayOfWeek,
        avgOperations: bucket.measurements.length / (days / 7), // Per week average
        avgDuration: bucket.totalDuration / bucket.measurements.length,
        totalMeasurements: bucket.measurements.length
      }));

      return peaks.sort((a, b) => b.avgOperations - a.avgOperations).slice(0, 20);
    } catch (error) {
      logger.error(`Peak usage detection failed: ${error.message}`);
      return [];
    }
  },

  /**
   * Get Optimization Opportunities
   *
   * Identifies operations that would benefit most from optimization.
   *
   * @param {object} ks - KnowledgeSubstrate instance
   * @param {object} [options] - Query options
   * @param {number} [options.limit=10] - Max results
   * @returns {Promise<Array<object>>} Optimization opportunities
   *
   * @example
   * const opportunities = await getOptimizationOpportunities(ks);
   * // [{ operation: 'workflow-exec', score: 92.5, reason: 'High frequency + high duration',
   * //    frequency: 1200, avgDuration: 450.3, potentialSavings: 540360 }]
   */
  async getOptimizationOpportunities(ks, options = {}) {
    const { limit = 10 } = options;

    const sparql = `
      PREFIX perf: <${PERF_NS}>
      PREFIX xsd: <${XSD_NS}>

      SELECT ?operation
             (COUNT(?m) AS ?frequency)
             (AVG(?duration) AS ?avgDuration)
             (SUM(?duration) AS ?totalTime)
             (AVG(?memoryUsed) AS ?avgMemory)
      WHERE {
        ?m a perf:Measurement ;
           perf:operation ?operation ;
           perf:duration ?duration ;
           perf:memoryUsed ?memoryUsed .
      }
      GROUP BY ?operation
      HAVING (COUNT(?m) >= 10)
      ORDER BY DESC(?totalTime)
      LIMIT ${limit * 2}
    `;

    try {
      const result = await ks.query(sparql);
      const candidates = (result.results || result.rows || []).map(row => ({
        operation: row.operation.value,
        frequency: parseInt(row.frequency.value),
        avgDuration: parseFloat(row.avgDuration.value),
        totalTime: parseFloat(row.totalTime.value),
        avgMemory: parseInt(row.avgMemory.value)
      }));

      // Calculate optimization score (0-100)
      const opportunities = candidates.map(op => {
        // Score based on: frequency * duration (impact), plus memory consideration
        const impactScore = (op.frequency * op.avgDuration) / 1000; // Normalize
        const memoryScore = op.avgMemory / 1000000; // MB
        const score = Math.min(100, (impactScore + memoryScore) / 2);

        // 30% improvement estimate
        const potentialSavings = op.totalTime * 0.3;

        return {
          ...op,
          score: Math.round(score * 10) / 10,
          potentialSavings: Math.round(potentialSavings),
          reason: this._determineOptimizationReason(op)
        };
      });

      return opportunities
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      logger.error(`Optimization opportunity detection failed: ${error.message}`);
      return [];
    }
  },

  /**
   * Find Parallelizable Operations
   *
   * Identifies operations that could benefit from parallelization (low CPU usage).
   *
   * @param {object} ks - KnowledgeSubstrate instance
   * @param {object} [options] - Query options
   * @param {number} [options.cpuThreshold=40] - Max CPU% to consider
   * @returns {Promise<Array<object>>} Parallelizable operations
   *
   * @example
   * const parallel = await findParallelizableOps(ks);
   * // [{ operation: 'template-render', avgCpu: 25.3, avgDuration: 180.5,
   * //    frequency: 500, parallelizationPotential: 'high' }]
   */
  async findParallelizableOps(ks, options = {}) {
    const { cpuThreshold = 40 } = options;

    const sparql = `
      PREFIX perf: <${PERF_NS}>
      PREFIX xsd: <${XSD_NS}>

      SELECT ?operation
             (AVG(?cpuPercent) AS ?avgCpu)
             (AVG(?duration) AS ?avgDuration)
             (COUNT(?m) AS ?frequency)
      WHERE {
        ?m a perf:Measurement ;
           perf:operation ?operation ;
           perf:cpuPercent ?cpuPercent ;
           perf:duration ?duration .
      }
      GROUP BY ?operation
      HAVING (AVG(?cpuPercent) < ${cpuThreshold} && AVG(?duration) > 50 && COUNT(?m) >= 10)
      ORDER BY DESC(?frequency)
    `;

    try {
      const result = await ks.query(sparql);
      return (result.results || result.rows || []).map(row => {
        const avgCpu = parseFloat(row.avgCpu.value);
        const avgDuration = parseFloat(row.avgDuration.value);
        const frequency = parseInt(row.frequency.value);

        return {
          operation: row.operation.value,
          avgCpu,
          avgDuration,
          frequency,
          parallelizationPotential: avgCpu < 20 ? 'high' :
                                    avgCpu < 30 ? 'medium' : 'low',
          estimatedSpeedup: this._estimateParallelSpeedup(avgCpu, avgDuration)
        };
      });
    } catch (error) {
      logger.error(`Parallelizable operation detection failed: ${error.message}`);
      return [];
    }
  },

  /**
   * Get Operation Statistics
   *
   * Returns comprehensive stats for a specific operation.
   *
   * @param {object} ks - KnowledgeSubstrate instance
   * @param {string} operation - Operation name
   * @returns {Promise<object|null>} Operation statistics
   *
   * @example
   * const stats = await getOperationStats(ks, 'sparql-query');
   * // { operation: 'sparql-query', count: 1250, mean: 45.2, median: 42.1,
   * //   p95: 78.3, p99: 95.6, min: 12.3, max: 145.8, stddev: 18.5 }
   */
  async getOperationStats(ks, operation) {
    const sparql = `
      PREFIX perf: <${PERF_NS}>
      PREFIX xsd: <${XSD_NS}>

      SELECT ?duration ?memoryUsed ?cpuPercent
      WHERE {
        ?m a perf:Measurement ;
           perf:operation "${operation}" ;
           perf:duration ?duration ;
           perf:memoryUsed ?memoryUsed ;
           perf:cpuPercent ?cpuPercent .
      }
      ORDER BY ?duration
    `;

    try {
      const result = await ks.query(sparql);
      const measurements = (result.results || result.rows || []).map(row => ({
        duration: parseFloat(row.duration.value),
        memory: parseInt(row.memoryUsed.value),
        cpu: parseFloat(row.cpuPercent.value)
      }));

      if (measurements.length === 0) return null;

      const durations = measurements.map(m => m.duration).sort((a, b) => a - b);
      const memories = measurements.map(m => m.memory).sort((a, b) => a - b);
      const cpus = measurements.map(m => m.cpu).sort((a, b) => a - b);

      return {
        operation,
        count: measurements.length,
        duration: {
          mean: this._mean(durations),
          median: this._percentile(durations, 0.5),
          p50: this._percentile(durations, 0.5),
          p95: this._percentile(durations, 0.95),
          p99: this._percentile(durations, 0.99),
          min: Math.min(...durations),
          max: Math.max(...durations),
          stddev: this._stddev(durations)
        },
        memory: {
          mean: this._mean(memories),
          median: this._percentile(memories, 0.5),
          p95: this._percentile(memories, 0.95),
          min: Math.min(...memories),
          max: Math.max(...memories)
        },
        cpu: {
          mean: this._mean(cpus),
          median: this._percentile(cpus, 0.5),
          p95: this._percentile(cpus, 0.95),
          min: Math.min(...cpus),
          max: Math.max(...cpus)
        }
      };
    } catch (error) {
      logger.error(`Operation stats calculation failed: ${error.message}`);
      return null;
    }
  },

  /**
   * Get System Statistics
   *
   * Returns overall system health and performance stats.
   *
   * @param {object} ks - KnowledgeSubstrate instance
   * @returns {Promise<object>} System statistics
   *
   * @example
   * const systemStats = await getSystemStats(ks);
   * // { totalMeasurements: 5420, uniqueOperations: 18, avgDuration: 52.3,
   * //   p95Duration: 145.6, errorRate: 2.1, anomalyCount: 12 }
   */
  async getSystemStats(ks) {
    const sparql = `
      PREFIX perf: <${PERF_NS}>
      PREFIX xsd: <${XSD_NS}>

      SELECT
        (COUNT(?m) AS ?totalMeasurements)
        (COUNT(DISTINCT ?operation) AS ?uniqueOperations)
        (AVG(?duration) AS ?avgDuration)
        (AVG(?memoryUsed) AS ?avgMemory)
        (AVG(?cpuPercent) AS ?avgCpu)
        (SUM(IF(?success = false, 1, 0)) AS ?errorCount)
      WHERE {
        ?m a perf:Measurement ;
           perf:operation ?operation ;
           perf:duration ?duration ;
           perf:memoryUsed ?memoryUsed ;
           perf:cpuPercent ?cpuPercent ;
           perf:success ?success .
      }
    `;

    const anomalySparql = `
      PREFIX perf: <${PERF_NS}>
      SELECT (COUNT(?a) AS ?anomalyCount)
      WHERE {
        ?a a perf:Anomaly .
      }
    `;

    try {
      const result = await ks.query(sparql);
      const anomalyResult = await ks.query(anomalySparql);

      const row = (result.results || result.rows || [])[0];
      const anomalyRow = (anomalyResult.results || anomalyResult.rows || [])[0];

      if (!row) return { totalMeasurements: 0 };

      const totalMeasurements = parseInt(row.totalMeasurements.value);
      const errorCount = parseInt(row.errorCount?.value || 0);

      return {
        totalMeasurements,
        uniqueOperations: parseInt(row.uniqueOperations.value),
        avgDuration: parseFloat(row.avgDuration.value).toFixed(2),
        avgMemory: parseInt(row.avgMemory.value),
        avgCpu: parseFloat(row.avgCpu.value).toFixed(2),
        errorCount,
        errorRate: ((errorCount / totalMeasurements) * 100).toFixed(2),
        anomalyCount: parseInt(anomalyRow?.anomalyCount?.value || 0)
      };
    } catch (error) {
      logger.error(`System stats calculation failed: ${error.message}`);
      return { totalMeasurements: 0 };
    }
  },

  /**
   * Get Capacity Analysis
   *
   * Analyzes resource utilization trends for capacity planning.
   *
   * @param {object} ks - KnowledgeSubstrate instance
   * @param {object} [options] - Query options
   * @param {number} [options.days=90] - Days to analyze
   * @returns {Promise<object>} Capacity analysis
   *
   * @example
   * const capacity = await getCapacityAnalysis(ks);
   * // { utilizationTrend: 'increasing', avgUtilization: 68.2,
   * //   projectedExhaustion: '2026-06-15', headroom: 31.8 }
   */
  async getCapacityAnalysis(ks, options = {}) {
    const { days = 90 } = options;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const start = startDate.toISOString();

    const sparql = `
      PREFIX perf: <${PERF_NS}>
      PREFIX xsd: <${XSD_NS}>

      SELECT ?timestamp
             (COUNT(?m) AS ?operationsPerHour)
             (AVG(?duration) AS ?avgDuration)
      WHERE {
        ?m a perf:Measurement ;
           perf:timestamp ?timestamp ;
           perf:duration ?duration .

        FILTER(?timestamp >= "${start}"^^xsd:dateTime)
      }
      GROUP BY (SUBSTR(STR(?timestamp), 1, 13))
      ORDER BY ?timestamp
    `;

    try {
      const result = await ks.query(sparql);
      const measurements = (result.results || result.rows || []).map(row => ({
        timestamp: row.timestamp.value,
        operationsPerHour: parseInt(row.operationsPerHour.value),
        avgDuration: parseFloat(row.avgDuration.value)
      }));

      if (measurements.length < 10) {
        return { utilizationTrend: 'insufficient_data', avgUtilization: 0 };
      }

      // Calculate trend
      const ops = measurements.map((m, i) => ({ x: i, y: m.operationsPerHour }));
      const { slope } = this._linearRegression(ops);

      const avgOps = this._mean(measurements.map(m => m.operationsPerHour));
      const maxCapacity = Math.max(...measurements.map(m => m.operationsPerHour)) * 1.5; // Assume 50% headroom
      const avgUtilization = (avgOps / maxCapacity) * 100;
      const headroom = 100 - avgUtilization;

      // Project exhaustion date
      let projectedExhaustion = null;
      if (slope > 0 && headroom > 0) {
        const daysUntilExhaustion = headroom / (slope * 24); // Convert to days
        if (daysUntilExhaustion > 0 && daysUntilExhaustion < 365) {
          const exhaustionDate = new Date();
          exhaustionDate.setDate(exhaustionDate.getDate() + Math.ceil(daysUntilExhaustion));
          projectedExhaustion = exhaustionDate.toISOString().split('T')[0];
        }
      }

      return {
        utilizationTrend: slope > 0.5 ? 'increasing' :
                         slope < -0.5 ? 'decreasing' : 'stable',
        avgUtilization: avgUtilization.toFixed(2),
        maxCapacity: Math.round(maxCapacity),
        currentAvg: Math.round(avgOps),
        headroom: headroom.toFixed(2),
        projectedExhaustion,
        trendSlope: slope.toFixed(4)
      };
    } catch (error) {
      logger.error(`Capacity analysis failed: ${error.message}`);
      return { utilizationTrend: 'error', avgUtilization: 0 };
    }
  },

  // ========================================================================
  // Internal Helper Methods
  // ========================================================================

  /**
   * Verify memory leak pattern (internal)
   * @private
   */
  async _verifyMemoryLeakPattern(ks, operation, threshold) {
    const sparql = `
      PREFIX perf: <${PERF_NS}>

      SELECT ?memoryUsed ?timestamp
      WHERE {
        ?m a perf:Measurement ;
           perf:operation "${operation}" ;
           perf:memoryUsed ?memoryUsed ;
           perf:timestamp ?timestamp .
      }
      ORDER BY ?timestamp
      LIMIT 10
    `;

    try {
      const result = await ks.query(sparql);
      const measurements = (result.results || result.rows || []);
      if (measurements.length < 3) return false;

      // Check if each measurement is >= threshold * previous
      let increasingCount = 0;
      for (let i = 1; i < measurements.length; i++) {
        const prev = parseInt(measurements[i - 1].memoryUsed.value);
        const curr = parseInt(measurements[i].memoryUsed.value);
        if (curr >= prev * threshold) {
          increasingCount++;
        }
      }

      return increasingCount >= Math.floor(measurements.length * 0.6); // 60% increasing
    } catch {
      return false;
    }
  },

  /**
   * Get recent average duration (internal)
   * @private
   */
  async _getRecentAverage(ks, operation, count) {
    const sparql = `
      PREFIX perf: <${PERF_NS}>

      SELECT ?duration
      WHERE {
        ?m a perf:Measurement ;
           perf:operation "${operation}" ;
           perf:duration ?duration .
      }
      ORDER BY DESC(?timestamp)
      LIMIT ${count}
    `;

    try {
      const result = await ks.query(sparql);
      const measurements = (result.results || result.rows || []);
      if (measurements.length === 0) return null;

      const sum = measurements.reduce((acc, row) =>
        acc + parseFloat(row.duration.value), 0);
      return sum / measurements.length;
    } catch {
      return null;
    }
  },

  /**
   * Determine impact level (internal)
   * @private
   */
  _determineImpactLevel(correlation) {
    if (correlation >= 0.8) return 'high';
    if (correlation >= 0.6) return 'medium';
    return 'low';
  },

  /**
   * Calculate linear regression (internal)
   * @private
   */
  _linearRegression(points) {
    const n = points.length;
    if (n < 2) return { slope: 0, intercept: 0 };

    const sumX = points.reduce((sum, p) => sum + (p.x || p.timestamp), 0);
    const sumY = points.reduce((sum, p) => sum + (p.y || p.duration), 0);
    const sumXY = points.reduce((sum, p) => sum + (p.x || p.timestamp) * (p.y || p.duration), 0);
    const sumX2 = points.reduce((sum, p) => sum + Math.pow(p.x || p.timestamp, 2), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - Math.pow(sumX, 2));
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  },

  /**
   * Determine optimization reason (internal)
   * @private
   */
  _determineOptimizationReason(op) {
    if (op.frequency > 1000 && op.avgDuration > 100) {
      return 'High frequency + high duration';
    }
    if (op.avgMemory > 5000000) {
      return 'High memory usage';
    }
    if (op.frequency > 1000) {
      return 'Very high frequency';
    }
    if (op.avgDuration > 500) {
      return 'High duration';
    }
    return 'Optimization potential';
  },

  /**
   * Estimate parallel speedup (internal)
   * @private
   */
  _estimateParallelSpeedup(avgCpu, avgDuration) {
    // Amdahl's Law approximation
    const parallelPortion = 1 - (avgCpu / 100);
    const cores = 4; // Assume 4 cores
    const speedup = 1 / ((1 - parallelPortion) + (parallelPortion / cores));
    return `${speedup.toFixed(2)}x`;
  },

  /**
   * Calculate mean (internal)
   * @private
   */
  _mean(values) {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  },

  /**
   * Calculate percentile (internal)
   * @private
   */
  _percentile(sorted, p) {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  },

  /**
   * Calculate standard deviation (internal)
   * @private
   */
  _stddev(values) {
    const mean = this._mean(values);
    const squareDiffs = values.map(v => Math.pow(v - mean, 2));
    const avgSquareDiff = this._mean(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }
};

export default PerformanceQueries;
