/**
 * @fileoverview GitVan Dark Matter Query Optimizer
 *
 * Analyzes SPARQL queries for optimization opportunities using 80/20 methodology:
 * - Pattern analysis (triple pattern extraction)
 * - Selectivity estimation (what % of quads will match)
 * - Expensive pattern detection (cross-joins, nested queries)
 * - Optimization hints generation
 *
 * Deterministic, no external dependencies, pure functional operations.
 *
 * @version 1.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

/**
 * Query Optimizer Composable
 * Analyzes SPARQL queries for patterns, selectivity, and optimization hints
 *
 * @returns {Object} Query optimizer API
 */
export function useQueryOptimizer() {
  /**
   * Extract triple patterns from a SPARQL query
   * Identifies all ?subject ?predicate ?object patterns
   *
   * @private
   * @param {string} sparql - SPARQL query
   * @returns {Array<Object>} Triple patterns with positions
   */
  function extractTriplePatterns(sparql) {
    const patterns = [];
    const lines = sparql.split('\n');
    let inWhereClause = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Detect WHERE clause
      if (/^\{/.test(line) || /WHERE\s*\{/.test(line)) {
        inWhereClause = true;        continue;
      }

      if (inWhereClause && /^\}/.test(line)) {
        inWhereClause = false;
        break;
      }

      if (!inWhereClause) continue;

      // Skip comments and filters
      if (line.startsWith('#') || /FILTER\s*\(/.test(line)) continue;

      // Match triple patterns: ?s ?p ?o or URI/Literal ?p ?o etc
      // Pattern: (variable|URI|literal) (variable|URI) (variable|URI|literal)
      const tripleRegex = /([?a-zA-Z0-9:<>#_\-/.]+)\s+([?a-zA-Z0-9:<>#_\-/.]+)\s+([?a-zA-Z0-9:<>#_\-/."';]+)/g;
      let match;

      while ((match = tripleRegex.exec(line)) !== null) {
        const [, subject, predicate, object] = match;

        // Skip malformed patterns
        if (!subject || !predicate || !object) continue;

        patterns.push({
          subject: subject.trim(),
          predicate: predicate.trim(),
          object: object.trim(),
          lineNumber: i + 1,
          isVariable: {
            subject: subject.startsWith('?'),
            predicate: predicate.startsWith('?'),
            object: object.startsWith('?'),
          },
        });
      }
    }

    return patterns;
  }

  /**
   * Estimate selectivity of a triple pattern
   * Returns percentage of quads expected to match (0.0 to 1.0)
   *
   * 80/20 heuristics:
   * - All variables: 100% (matches everything)
   * - Fixed subject: 10% (assumes uniform distribution)
   * - Fixed predicate: 5% (predicates are more selective)
   * - Fixed object: 10%
   * - Multiple fixed: multiply probabilities
   *
   * @param {Object} pattern - Triple pattern
   * @returns {number} Selectivity estimate (0.0-1.0)
   */
  function estimatePatternSelectivity(pattern) {
    const { isVariable } = pattern;
    let selectivity = 1.0;

    // Fixed subject reduces selectivity by ~90%
    if (!isVariable.subject) selectivity *= 0.1;

    // Fixed predicate reduces selectivity by ~95%
    if (!isVariable.predicate) selectivity *= 0.05;

    // Fixed object reduces selectivity by ~90%
    if (!isVariable.object) selectivity *= 0.1;

    // All variables: no reduction
    // selectivity remains as calculated

    return Math.max(selectivity, 0.0001); // Minimum 0.01%
  }

  /**
   * Identify expensive patterns in a query
   * Returns cost analysis and optimization hints
   *
   * Expensive patterns:
   * - All variables (full scan)
   * - Multiple patterns with same variable (joins)
   * - OPTIONAL clauses (cross products)
   * - Subqueries
   *
   * @param {Array<Object>} patterns - Triple patterns
   * @param {string} sparql - Full SPARQL query
   * @returns {Object} Expensive patterns and hints
   */
  function identifyExpensivePatterns(patterns, sparql) {
    const expensive = [];
    const variableFrequency = new Map();
    const hints = [];

    // Count variable occurrences
    for (const pattern of patterns) {
      const vars = [];
      if (pattern.isVariable.subject) vars.push(pattern.subject);
      if (pattern.isVariable.predicate) vars.push(pattern.predicate);
      if (pattern.isVariable.object) vars.push(pattern.object);

      for (const v of vars) {
        variableFrequency.set(v, (variableFrequency.get(v) || 0) + 1);
      }
    }

    // Detect all-variable patterns (full scans)
    for (const pattern of patterns) {
      if (pattern.isVariable.subject &&
          pattern.isVariable.predicate &&
          pattern.isVariable.object) {
        expensive.push({
          type: 'fullScan',
          pattern,
          cost: 'very_high',
          reason: 'All variables - matches entire dataset',
        });
        hints.push('Add constraints: fix subject or predicate to reduce scan');
      }
    }

    // Detect low-selectivity patterns
    for (const pattern of patterns) {
      const selectivity = estimatePatternSelectivity(pattern);
      if (selectivity > 0.5) {
        expensive.push({
          type: 'lowSelectivity',
          pattern,
          cost: 'high',
          selectivity,
          reason: `Only ${(selectivity * 100).toFixed(1)}% expected matches`,
        });
      }
    }

    // Detect cross joins (variables appearing in multiple patterns)
    const joinVariables = new Map();
    for (const pattern of patterns) {
      const vars = [];
      if (pattern.isVariable.subject) vars.push(pattern.subject);
      if (pattern.isVariable.object) vars.push(pattern.object);

      for (const v of vars) {
        const count = joinVariables.get(v) || 0;
        joinVariables.set(v, count + 1);
      }
    }

    for (const [variable, count] of joinVariables) {
      if (count >= 2) {
        const joinCost = Math.pow(0.5, count - 1); // Exponential degradation
        expensive.push({
          type: 'join',
          variable,
          patternCount: count,
          cost: count > 3 ? 'very_high' : count > 2 ? 'high' : 'medium',
          joinCost,
          reason: `${variable} appears in ${count} patterns - creates joins`,
        });
      }
    }

    // Detect OPTIONAL clauses (can cause cross products)
    if (sparql.toUpperCase().includes('OPTIONAL')) {
      expensive.push({
        type: 'optional',
        cost: 'high',
        reason: 'OPTIONAL clauses can cause cross products',
      });
      hints.push('OPTIONAL patterns may produce large intermediate results');
    }

    // Detect nested queries
    const openBraces = (sparql.match(/\{/g) || []).length;
    const closeBraces = (sparql.match(/\}/g) || []).length;
    const nestLevel = Math.max(openBraces, closeBraces);

    if (nestLevel > 2) {
      expensive.push({
        type: 'nested',
        nestLevel,
        cost: 'high',
        reason: `Nested query structure (depth ${nestLevel})`,
      });
      hints.push('Consider flattening nested queries');
    }

    // Detect GROUP BY without HAVING (full aggregation)
    if (/GROUP\s+BY/.test(sparql.toUpperCase()) &&
        !/HAVING/.test(sparql.toUpperCase())) {
      hints.push('Add HAVING clause to filter grouped results early');
    }

    // Detect UNION patterns
    if (/UNION/.test(sparql.toUpperCase())) {
      hints.push('UNION executes both branches - consider restructuring');
    }

    return {
      expensivePatterns: expensive,
      variableFrequency: Object.fromEntries(variableFrequency),
      optimizationHints: [...new Set(hints)],
    };
  }

  return {
    /**
     * Analyze a SPARQL query for optimization opportunities
     *
     * @param {string} sparql - SPARQL query string
     * @returns {Object} Query analysis results
     */
    analyzeQuery(sparql) {
      if (!sparql || typeof sparql !== 'string') {
        throw new Error('Invalid SPARQL query: must be non-empty string');
      }

      const patterns = extractTriplePatterns(sparql);
      const expensive = identifyExpensivePatterns(patterns, sparql);

      // Calculate overall query cost
      let totalSelectivity = 1.0;
      for (const pattern of patterns) {
        totalSelectivity *= estimatePatternSelectivity(pattern);
      }

      return {
        patterns,
        totalSelectivity: Math.max(totalSelectivity, 0.0001),
        ...expensive,
        queryType: this.getQueryType(sparql),
        complexity: this.estimateComplexity(patterns, sparql),
      };
    },

    /**
     * Estimate selectivity of a single triple pattern
     *
     * @param {Object} pattern - Triple pattern with subject/predicate/object
     * @returns {number} Selectivity estimate (0.0-1.0)
     */
    estimateSelectivity(pattern) {
      if (!pattern || typeof pattern !== 'object') {
        throw new Error('Pattern must be an object');
      }

      // Ensure isVariable structure exists
      if (!pattern.isVariable) {
        pattern.isVariable = {
          subject: String(pattern.subject).startsWith('?'),
          predicate: String(pattern.predicate).startsWith('?'),
          object: String(pattern.object).startsWith('?'),
        };
      }

      return estimatePatternSelectivity(pattern);
    },

    /**
     * Identify expensive patterns in a query
     *
     * @param {Array<Object>} patterns - Triple patterns
     * @param {string} sparql - Full SPARQL query
     * @returns {Object} Expensive patterns and hints
     */
    identifyExpensive(patterns, sparql) {
      if (!Array.isArray(patterns)) {
        throw new Error('Patterns must be an array');
      }

      return identifyExpensivePatterns(patterns, sparql);
    },

    /**
     * Get query type (SELECT, ASK, CONSTRUCT, DESCRIBE)
     *
     * @param {string} sparql - SPARQL query
     * @returns {string} Query type
     */
    getQueryType(sparql) {
      // Remove PREFIX declarations and whitespace
      const normalized = sparql
        .replace(/PREFIX\s+\w*:\s*<[^>]+>\s*/gi, '')
        .toUpperCase()
        .trim();

      if (/^SELECT/.test(normalized)) return 'SELECT';
      if (/^ASK/.test(normalized)) return 'ASK';
      if (/^CONSTRUCT/.test(normalized)) return 'CONSTRUCT';
      if (/^DESCRIBE/.test(normalized)) return 'DESCRIBE';
      return 'UNKNOWN';
    },

    /**
     * Estimate query complexity (LOW, MEDIUM, HIGH, VERY_HIGH)
     *
     * @param {Array<Object>} patterns - Triple patterns
     * @param {string} sparql - Full SPARQL query
     * @returns {string} Complexity level
     */
    estimateComplexity(patterns, sparql) {
      const analysis = identifyExpensivePatterns(patterns, sparql);
      const expensiveCount = analysis.expensivePatterns.length;

      if (expensiveCount === 0 && patterns.length <= 2) return 'LOW';
      if (expensiveCount === 0 && patterns.length <= 5) return 'MEDIUM';
      if (expensiveCount <= 2 && patterns.length <= 8) return 'HIGH';
      return 'VERY_HIGH';
    },

    /**
     * Extract triple patterns from query
     *
     * @param {string} sparql - SPARQL query
     * @returns {Array<Object>} Triple patterns
     */
    getPatterns(sparql) {
      return extractTriplePatterns(sparql);
    },
  };
}
