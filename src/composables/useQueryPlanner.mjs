/**
 * @fileoverview GitVan Dark Matter Query Planner
 *
 * Generates optimized execution plans for SPARQL queries:
 * - Reorders triple patterns for efficiency
 * - Pushes filters early to reduce intermediate results
 * - Splits complex queries into sub-queries
 * - Returns execution plan with step estimates
 *
 * Uses 80/20 heuristics: reordering based on selectivity,
 * filter pushing for cardinality reduction, simple cost model.
 *
 * @version 1.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import { useQueryOptimizer } from './useQueryOptimizer.mjs';

/**
 * Query Planner Composable
 * Generates optimized execution plans for SPARQL queries
 *
 * @returns {Object} Query planner API
 */
export function useQueryPlanner() {
  const optimizer = useQueryOptimizer();

  /**
   * Reorder triple patterns for optimal execution
   * Strategy: Execute most selective patterns first (greedy approach)
   *
   * @private
   * @param {Array<Object>} patterns - Triple patterns
   * @returns {Array<Object>} Reordered patterns
   */
  function reorderPatterns(patterns) {
    if (!Array.isArray(patterns) || patterns.length === 0) {
      return patterns;
    }

    // Create copy to avoid mutation
    const patternsCopy = [...patterns];

    // Score each pattern for execution order
    // Lower score = execute first
    const scored = patternsCopy.map((pattern) => {
      let score = 0;

      // Fixed predicate is most selective (score 0)
      if (!pattern.isVariable.predicate) score += 0;
      else score += 3; // Variable predicate is less selective

      // Fixed subject is selective (score 1)
      if (!pattern.isVariable.subject) score += 1;
      else score += 2;

      // Fixed object is selective (score 1)
      if (!pattern.isVariable.object) score += 1;
      else score += 2;

      // Patterns with fewer variables are executed first
      const varCount = (pattern.isVariable.subject ? 1 : 0) +
                      (pattern.isVariable.predicate ? 1 : 0) +
                      (pattern.isVariable.object ? 1 : 0);
      score += varCount;

      return { pattern, score };
    });

    // Sort by score (ascending = most selective first)
    scored.sort((a, b) => a.score - b.score);

    return scored.map(({ pattern }) => pattern);
  }

  /**
   * Extract filter conditions from SPARQL query
   *
   * @private
   * @param {string} sparql - SPARQL query
   * @returns {Array<Object>} Filter conditions
   */
  function extractFilters(sparql) {
    const filters = [];
    const filterRegex = /FILTER\s*\(\s*([^)]+)\s*\)/g;
    let match;

    while ((match = filterRegex.exec(sparql)) !== null) {
      filters.push({
        condition: match[1].trim(),
        text: match[0],
        position: match.index,
      });
    }

    return filters;
  }

  /**
   * Determine which variables are bound by a pattern
   *
   * @private
   * @param {Object} pattern - Triple pattern
   * @returns {Set<string>} Variables bound by this pattern
   */
  function getBoundVariables(pattern) {
    const bound = new Set();

    if (pattern.isVariable.subject) bound.add(pattern.subject);
    if (pattern.isVariable.predicate) bound.add(pattern.predicate);
    if (pattern.isVariable.object) bound.add(pattern.object);

    return bound;
  }

  /**
   * Split a complex query into sub-queries if beneficial
   * Strategy: Split if query has OPTIONAL or UNION clauses
   *
   * @private
   * @param {string} sparql - SPARQL query
   * @returns {Array<string>} Sub-queries (or single query if not splittable)
   */
  function splitComplexQuery(sparql) {
    const upper = sparql.toUpperCase();

    // Check for UNION - split into separate queries
    if (/\s+UNION\s+/i.test(sparql)) {
      const parts = sparql.split(/\s+UNION\s+/i);
      return parts.map((p) => p.trim()).filter((p) => p.length > 0);
    }

    // Check for OPTIONAL - don't split, but note in plan
    if (/OPTIONAL\s*\{/i.test(sparql)) {
      return [sparql]; // Keep as single query, will be marked in plan
    }

    return [sparql];
  }

  /**
   * Estimate cardinality (number of rows) for a pattern
   *
   * @private
   * @param {Object} pattern - Triple pattern
   * @param {number} storeSize - Estimated total quads in store
   * @returns {number} Estimated cardinality
   */
  function estimateCardinality(pattern, storeSize = 1000000) {
    const selectivity = optimizer.estimateSelectivity(pattern);
    return Math.max(1, Math.round(storeSize * selectivity));
  }

  return {
    /**
     * Plan a SPARQL query for optimal execution
     *
     * @param {string} sparql - SPARQL query
     * @param {Object} [schema={}] - Optional schema information
     * @returns {Object} Execution plan
     */
    planQuery(sparql, schema = {}) {
      if (!sparql || typeof sparql !== 'string') {
        throw new Error('Invalid SPARQL query: must be non-empty string');
      }

      // Analyze the query
      const analysis = optimizer.analyzeQuery(sparql);
      const { patterns } = analysis;

      if (patterns.length === 0) {
        return {
          sparql,
          steps: [],
          cost: 'LOW',
          explanation: 'Empty query pattern',
        };
      }

      // Reorder patterns for efficiency
      const reorderedPatterns = this.reorderPatterns(patterns);

      // Extract filters
      const filters = extractFilters(sparql);

      // Build execution plan with steps
      const steps = [];
      let cumulativeCardinality = 1;
      let boundVariables = new Set();

      for (let i = 0; i < reorderedPatterns.length; i++) {
        const pattern = reorderedPatterns[i];
        const cardinality = estimateCardinality(pattern);
        const patternBound = getBoundVariables(pattern);

        // Check if pattern can be filtered
        const applicableFilters = filters.filter((f) => {
          // Simple heuristic: if filter mentions variables bound by this pattern
          for (const v of patternBound) {
            if (f.condition.includes(v)) return true;
          }
          return false;
        });

        steps.push({
          index: i + 1,
          type: 'TriplePattern',
          pattern: {
            subject: pattern.subject,
            predicate: pattern.predicate,
            object: pattern.object,
          },
          estimatedRows: cardinality,
          selectivity: optimizer.estimateSelectivity(pattern),
          bindingVariables: Array.from(patternBound),
          applicableFilters: applicableFilters.map((f) => f.condition),
        });

        cumulativeCardinality *= (cardinality || 1);
        patternBound.forEach((v) => boundVariables.add(v));
      }

      // Add filter steps after binding
      for (const filter of filters) {
        steps.push({
          index: steps.length + 1,
          type: 'Filter',
          condition: filter.condition,
          estimatedRowReduction: 0.5, // Assume 50% reduction
        });
      }

      // Determine overall cost
      let overallCost = 'LOW';
      if (cumulativeCardinality > 1000000) overallCost = 'VERY_HIGH';
      else if (cumulativeCardinality > 100000) overallCost = 'HIGH';
      else if (cumulativeCardinality > 10000) overallCost = 'MEDIUM';

      return {
        sparql,
        queryType: analysis.queryType,
        patterns,
        reorderedPatterns,
        steps,
        totalEstimatedRows: cumulativeCardinality,
        cost: overallCost,
        complexity: analysis.complexity,
        expensivePatterns: analysis.expensivePatterns,
        optimizationHints: analysis.optimizationHints,
        canBeParallelized: patterns.length > 1,
        parallelGroups: this._identifyParallelGroups(patterns),
      };
    },

    /**
     * Reorder triple patterns for optimal execution
     *
     * @param {Array<Object>} patterns - Triple patterns
     * @returns {Array<Object>} Reordered patterns
     */
    reorderPatterns(patterns) {
      return reorderPatterns(patterns);
    },

    /**
     * Identify groups of patterns that can execute in parallel
     *
     * @private
     * @param {Array<Object>} patterns - Triple patterns
     * @returns {Array<Array<Object>>} Groups of parallel patterns
     */
    _identifyParallelGroups(patterns) {
      if (patterns.length <= 1) return [patterns];

      const groups = [];
      const boundVariables = new Set();

      for (const pattern of patterns) {
        const patternVars = getBoundVariables(pattern);

        // Check if this pattern shares variables with already-bound ones
        let sharesVariables = false;
        for (const v of patternVars) {
          if (boundVariables.has(v)) {
            sharesVariables = true;
            break;
          }
        }

        if (!sharesVariables && groups.length > 0) {
          // Can execute in parallel with current group
          if (!groups[groups.length - 1].parallel) {
            groups[groups.length - 1].parallel = true;
          }
        }

        patternVars.forEach((v) => boundVariables.add(v));
        groups.push(pattern);
      }

      return groups;
    },

    /**
     * Split a complex query into sub-queries
     *
     * @param {string} sparql - SPARQL query
     * @returns {Array<string>} Sub-queries
     */
    splitComplexQuery(sparql) {
      return splitComplexQuery(sparql);
    },

    /**
     * Generate a human-readable explanation of the plan
     *
     * @param {Object} plan - Execution plan from planQuery
     * @returns {string} Explanation text
     */
    explainPlan(plan) {
      if (!plan || !Array.isArray(plan.steps)) {
        return 'Invalid plan';
      }

      let explanation = `Execution Plan (${plan.cost} cost):\n`;

      for (const step of plan.steps) {
        if (step.type === 'TriplePattern') {
          explanation += `  ${step.index}. Query ${step.pattern.subject} ${step.pattern.predicate} ${step.pattern.object}\n`;
          explanation += `     → ~${step.estimatedRows} rows\n`;
          if (step.applicableFilters.length > 0) {
            explanation += `     → Then filter: ${step.applicableFilters.join(', ')}\n`;
          }
        } else if (step.type === 'Filter') {
          explanation += `  ${step.index}. Filter: ${step.condition}\n`;
          explanation += `     → ~50% row reduction\n`;
        }
      }

      if (plan.optimizationHints.length > 0) {
        explanation += '\nOptimization Hints:\n';
        for (const hint of plan.optimizationHints) {
          explanation += `  • ${hint}\n`;
        }
      }

      return explanation;
    },
  };
}
