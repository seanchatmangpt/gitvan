/**
 * @fileoverview Statistics Queries for Performance Analysis
 *
 * Provides queries for comprehensive statistical analysis of performance data.
 *
 * @version 1.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import { createLogger } from '../../utils/logger.mjs';
import { PERF_NS, XSD_NS, linearRegression, mean, percentile, stddev } from './query-helpers.mjs';

const logger = createLogger('performance:queries:statistics');

/**
 * Get Operation Statistics
 *
 * Returns comprehensive stats for a specific operation.
 *
 * @param {object} ks - KnowledgeSubstrate instance
 * @param {string} operation - Operation name
 * @returns {Promise<object|null>} Operation statistics
 */
export async function getOperationStats(ks, operation) {
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
        mean: mean(durations),
        median: percentile(durations, 0.5),
        p50: percentile(durations, 0.5),
        p95: percentile(durations, 0.95),
        p99: percentile(durations, 0.99),
        min: Math.min(...durations),
        max: Math.max(...durations),
        stddev: stddev(durations)
      },
      memory: {
        mean: mean(memories),
        median: percentile(memories, 0.5),
        p95: percentile(memories, 0.95),
        min: Math.min(...memories),
        max: Math.max(...memories)
      },
      cpu: {
        mean: mean(cpus),
        median: percentile(cpus, 0.5),
        p95: percentile(cpus, 0.95),
        min: Math.min(...cpus),
        max: Math.max(...cpus)
      }
    };
  } catch (error) {
    logger.error('Operation stats calculation failed', { message: error.message });
    return null;
  }
}

/**
 * Get System Statistics
 *
 * Returns overall system health and performance stats.
 *
 * @param {object} ks - KnowledgeSubstrate instance
 * @returns {Promise<object>} System statistics
 */
export async function getSystemStats(ks) {
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
    logger.error('System stats calculation failed', { message: error.message });
    return { totalMeasurements: 0 };
  }
}

/**
 * Get Capacity Analysis
 *
 * Analyzes resource utilization trends for capacity planning.
 *
 * @param {object} ks - KnowledgeSubstrate instance
 * @param {object} [options] - Query options
 * @param {number} [options.days=90] - Days to analyze
 * @returns {Promise<object>} Capacity analysis
 */
export async function getCapacityAnalysis(ks, options = {}) {
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
    const { slope } = linearRegression(ops);

    const avgOps = mean(measurements.map(m => m.operationsPerHour));
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
    logger.error('Capacity analysis failed', { message: error.message });
    return { utilizationTrend: 'error', avgUtilization: 0 };
  }
}
