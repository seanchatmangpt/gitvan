/**
 * @fileoverview Anomaly Detection Queries for Performance Analysis
 *
 * Provides queries for detecting:
 * - Budget violations
 * - Memory leaks
 * - CPU spikes
 * - Performance slowdowns
 *
 * @version 1.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import { createLogger } from '../../utils/logger.mjs';
import { PERF_NS, XSD_NS, verifyMemoryLeakPattern, getRecentAverage } from './query-helpers.mjs';

const logger = createLogger('performance:queries:anomaly');

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
 */
export async function detectBudgetViolations(ks, options = {}) {
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
    logger.error('Budget violation detection failed', { message: error.message });
    return [];
  }
}

/**
 * Detect Memory Leaks
 *
 * Identifies operations with consistently increasing memory usage pattern.
 *
 * @param {object} ks - KnowledgeSubstrate instance
 * @param {object} [options] - Query options
 * @param {number} [options.windowSize=5] - Measurement window size
 * @param {number} [options.increaseThreshold=1.1] - 10% increase threshold
 * @returns {Promise<Array<object>>} Potential memory leaks
 */
export async function detectMemoryLeaks(ks, options = {}) {
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
      const hasPattern = await verifyMemoryLeakPattern(
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
    logger.error('Memory leak detection failed', { message: error.message });
    return [];
  }
}

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
 */
export async function detectCpuSpikes(ks, options = {}) {
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
    logger.error('CPU spike detection failed', { message: error.message });
    return [];
  }
}

/**
 * Detect Slowdowns
 *
 * Finds operations currently slower than their historical average.
 *
 * @param {object} ks - KnowledgeSubstrate instance
 * @param {number} [threshold=0.10] - Slowdown threshold (10%)
 * @returns {Promise<Array<object>>} Slowdown detections
 */
export async function detectSlowdown(ks, threshold = 0.10) {
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
      const recentAvg = await getRecentAverage(ks, operation, 5);
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
    logger.error('Slowdown detection failed', { message: error.message });
    return [];
  }
}
