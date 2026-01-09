/**
 * @fileoverview Regression Analysis Queries for Performance
 *
 * Provides queries for detecting:
 * - Performance regressions
 * - I/O-bound operations
 *
 * @version 1.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import { createLogger } from '../../utils/logger.mjs';
import { PERF_NS, XSD_NS } from './query-helpers.mjs';

const logger = createLogger('performance:queries:regression');

/**
 * Get Performance Regressions
 *
 * Compares recent performance (last N days) vs baseline to detect slowdowns.
 *
 * @param {object} ks - KnowledgeSubstrate instance
 * @param {number} [days=7] - Days to look back
 * @param {number} [threshold=0.10] - Regression threshold (10% default)
 * @returns {Promise<Array<object>>} Performance regressions
 */
export async function getPerformanceRegression(ks, days = 7, threshold = 0.10) {
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
    logger.error('Performance regression detection failed', { message: error.message });
    return [];
  }
}

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
 */
export async function detectIoBoundness(ks, options = {}) {
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
    logger.error('I/O-bound detection failed', { message: error.message });
    return [];
  }
}
