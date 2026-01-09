/**
 * @fileoverview Optimization Queries for Performance Analysis
 *
 * Provides queries for identifying optimization opportunities and parallelization potential.
 *
 * @version 1.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import { createLogger } from '../../utils/logger.mjs';
import { PERF_NS, XSD_NS, determineOptimizationReason, estimateParallelSpeedup } from './query-helpers.mjs';

const logger = createLogger('performance:queries:optimization');

/**
 * Get Optimization Opportunities
 *
 * Identifies operations that would benefit most from optimization.
 *
 * @param {object} ks - KnowledgeSubstrate instance
 * @param {object} [options] - Query options
 * @param {number} [options.limit=10] - Max results
 * @returns {Promise<Array<object>>} Optimization opportunities
 */
export async function getOptimizationOpportunities(ks, options = {}) {
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
        reason: determineOptimizationReason(op)
      };
    });

    return opportunities
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (error) {
    logger.error('Optimization opportunity detection failed', { message: error.message });
    return [];
  }
}

/**
 * Find Parallelizable Operations
 *
 * Identifies operations that could benefit from parallelization (low CPU usage).
 *
 * @param {object} ks - KnowledgeSubstrate instance
 * @param {object} [options] - Query options
 * @param {number} [options.cpuThreshold=40] - Max CPU% to consider
 * @returns {Promise<Array<object>>} Parallelizable operations
 */
export async function findParallelizableOps(ks, options = {}) {
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
        estimatedSpeedup: estimateParallelSpeedup(avgCpu, avgDuration)
      };
    });
  } catch (error) {
    logger.error('Parallelizable operation detection failed', { message: error.message });
    return [];
  }
}
