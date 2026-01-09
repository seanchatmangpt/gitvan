/**
 * @fileoverview Trend Analysis Queries for Performance
 *
 * Provides queries for analyzing performance trends and peak usage patterns.
 *
 * @version 1.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import { createLogger } from '../../utils/logger.mjs';
import { PERF_NS, XSD_NS, linearRegression } from './query-helpers.mjs';

const logger = createLogger('performance:queries:trends');

/**
 * Get Trend Line
 *
 * Returns performance trend for an operation over time.
 *
 * @param {object} ks - KnowledgeSubstrate instance
 * @param {string} operation - Operation name
 * @param {number} [days=90] - Days to analyze
 * @returns {Promise<object|null>} Trend analysis
 */
export async function getTrendLine(ks, operation, days = 90) {
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
    const { slope, intercept } = linearRegression(measurements);
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
    logger.error('Trend line calculation failed', { message: error.message });
    return null;
  }
}

/**
 * Get Peak Usage Times
 *
 * Identifies when system is busiest (most operations/highest load).
 *
 * @param {object} ks - KnowledgeSubstrate instance
 * @param {object} [options] - Query options
 * @param {number} [options.days=30] - Days to analyze
 * @returns {Promise<Array<object>>} Peak usage windows
 */
export async function getPeakUsageTimes(ks, options = {}) {
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
    const measurements = result.results || result.rows || [];

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
    logger.error('Peak usage detection failed', { message: error.message });
    return [];
  }
}
