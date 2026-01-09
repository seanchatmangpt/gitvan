/**
 * @fileoverview Query Helper Functions for Performance Analysis
 *
 * Provides utility functions for statistical calculations, pattern verification,
 * and performance analysis.
 *
 * @version 1.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import { createLogger } from '../../utils/logger.mjs';

const logger = createLogger('performance:queries:helpers');

// Namespace URIs
export const PERF_NS = 'https://gitvan.dev/performance#';
export const XSD_NS = 'http://www.w3.org/2001/XMLSchema#';
export const RDF_NS = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';

/**
 * Verify memory leak pattern
 * Checks if memory usage consistently increases
 */
export async function verifyMemoryLeakPattern(ks, operation, threshold) {
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
    const measurements = result.results || result.rows || [];
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
}

/**
 * Get recent average duration for an operation
 */
export async function getRecentAverage(ks, operation, count) {
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
    const measurements = result.results || result.rows || [];
    if (measurements.length === 0) return null;

    const sum = measurements.reduce((acc, row) =>
      acc + parseFloat(row.duration.value), 0);
    return sum / measurements.length;
  } catch {
    return null;
  }
}

/**
 * Determine impact level based on correlation
 */
export function determineImpactLevel(correlation) {
  if (correlation >= 0.8) return 'high';
  if (correlation >= 0.6) return 'medium';
  return 'low';
}

/**
 * Calculate linear regression for trend analysis
 */
export function linearRegression(points) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0 };

  const sumX = points.reduce((sum, p) => sum + (p.x || p.timestamp), 0);
  const sumY = points.reduce((sum, p) => sum + (p.y || p.duration), 0);
  const sumXY = points.reduce((sum, p) => sum + (p.x || p.timestamp) * (p.y || p.duration), 0);
  const sumX2 = points.reduce((sum, p) => sum + Math.pow(p.x || p.timestamp, 2), 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - Math.pow(sumX, 2));
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/**
 * Determine optimization reason for an operation
 */
export function determineOptimizationReason(op) {
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
}

/**
 * Estimate parallel speedup using Amdahl's Law
 */
export function estimateParallelSpeedup(avgCpu, avgDuration) {
  // Amdahl's Law approximation
  const parallelPortion = 1 - (avgCpu / 100);
  const cores = 4; // Assume 4 cores
  const speedup = 1 / ((1 - parallelPortion) + (parallelPortion / cores));
  return `${speedup.toFixed(2)}x`;
}

/**
 * Calculate mean of values
 */
export function mean(values) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate percentile from sorted values
 */
export function percentile(sorted, p) {
  const index = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Calculate standard deviation
 */
export function stddev(values) {
  const m = mean(values);
  const squareDiffs = values.map(v => Math.pow(v - m, 2));
  const avgSquareDiff = mean(squareDiffs);
  return Math.sqrt(avgSquareDiff);
}
