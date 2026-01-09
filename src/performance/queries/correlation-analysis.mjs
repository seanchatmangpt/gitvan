/**
 * @fileoverview Correlation Analysis Queries for Performance
 *
 * Provides queries for discovering correlations and dependencies between operations.
 *
 * @version 1.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import { createLogger } from '../../utils/logger.mjs';
import { PERF_NS, XSD_NS, determineImpactLevel } from './query-helpers.mjs';

const logger = createLogger('performance:queries:correlation');

/**
 * Find Correlated Operations
 *
 * Discovers operations that affect each other's performance.
 *
 * @param {object} ks - KnowledgeSubstrate instance
 * @param {object} [options] - Query options
 * @param {number} [options.minCorrelation=0.7] - Minimum correlation (-1 to 1)
 * @returns {Promise<Array<object>>} Correlated operation pairs
 */
export async function findCorrelatedOperations(ks, options = {}) {
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
    logger.error('Correlation detection failed', { message: error.message });
    return [];
  }
}

/**
 * Get Resource Chain Impact
 *
 * Analyzes impact: if operation A is slow, what else suffers?
 *
 * @param {object} ks - KnowledgeSubstrate instance
 * @param {string} [operation] - Root operation to analyze
 * @returns {Promise<Array<object>>} Impact chain
 */
export async function getResourceChainImpact(ks, operation) {
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
        impact: determineImpactLevel(parseFloat(row.avgCorrelation.value))
      }));
    } catch (error) {
      logger.error('Resource chain impact failed', { message: error.message });
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
      impact: determineImpactLevel(parseFloat(row.correlation.value))
    }));
  } catch (error) {
    logger.error('Resource chain impact failed', { message: error.message });
    return [];
  }
}
