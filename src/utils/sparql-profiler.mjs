/**
 * @fileoverview SPARQL Query Profiler & Optimization Utility
 *
 * Comprehensive profiling and optimization tools for SPARQL queries including:
 * - Query parsing and analysis
 * - Pattern detection (N+1 queries, missing indexes)
 * - Execution plan caching
 * - Performance profiling and metrics
 *
 * Based on SPARQL_CAPABILITIES_ANALYSIS.md Phase 1 Week 3-4 requirements
 *
 * @version 1.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import { createHash } from 'node:crypto'

/**
 * Query pattern detection for common anti-patterns
 * @private
 */
const PATTERNS = {
  // N+1 query pattern: multiple single-item queries in a loop
  N_PLUS_ONE: {
    indicators: ['recursive', 'loop-based', 'repeated-queries'],
    regex: /(?:for|while|async\s+\w+.*for)\s*\([^)]*of\s+(\w+)\)/gi,
  },
  // Missing indexes: queries on high-cardinality predicates
  MISSING_INDEX: {
    indicators: ['full-table-scan', 'unbounded-predicate', 'expensive-filter'],
    predicates: ['perf:duration', 'perf:timestamp', 'pack:version', 'pack:rating'],
  },
  // Subquery materialization: nested SELECT in WHERE
  SUBQUERY_MATERIALIZATION: {
    regex: /WHERE\s*\{[^}]*SELECT\s+.*\{/gi,
  },
  // Property path explosion: unbounded traversal
  PROPERTY_PATH_UNBOUNDED: {
    regex: /\w+:\w+\+(?!\})/g,
  },
}

/**
 * Query execution plan cache entry
 */
class ExecutionPlan {
  constructor(query, parseResult) {
    this.query = query
    this.normalized = normalizeQuery(query)
    this.hash = hashQuery(query)
    this.parseResult = parseResult
    this.patterns = []
    this.metrics = {
      estimatedComplexity: 0,
      estimatedCardinality: 0,
      subqueryCount: 0,
      joinPoints: 0,
      filterPoints: 0,
    }
    this.optimizations = []
    this.estimatedTime = 0
    this.createdAt = Date.now()
  }

  isStale(ttl = 3600000) {
    return Date.now() - this.createdAt > ttl
  }
}

/**
 * Normalize a SPARQL query for consistent comparison
 * @param {string} query - SPARQL query string
 * @returns {string} Normalized query
 */
export function normalizeQuery(query) {
  return query
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}()\[\]])\s*/g, '$1')
    .trim()
    .toLowerCase()
}

/**
 * Generate a SHA256 hash of a query
 * @param {string} query - SPARQL query string
 * @returns {string} Query hash (hex)
 */
export function hashQuery(query) {
  return createHash('sha256')
    .update(normalizeQuery(query))
    .digest('hex')
    .slice(0, 24)
}

/**
 * Parse SPARQL query structure
 * @param {string} query - SPARQL query string
 * @returns {Object} Parse result with structure details
 */
export function parseQuery(query) {
  const normalized = normalizeQuery(query)

  const result = {
    type: null, // SELECT, ASK, CONSTRUCT, DESCRIBE
    prefixes: new Map(),
    patterns: [],
    subqueries: [],
    services: [],
    filters: [],
    joins: [],
    groupByVars: [],
    orderByVars: [],
    limit: null,
    offset: null,
    distinct: false,
    optional: false,
    union: false,
    complexity: 0,
  }

  // Detect query type
  const typeMatch = /^\s*(select|ask|construct|describe)\b/i.exec(query)
  if (typeMatch) {
    result.type = typeMatch[1].toUpperCase()
  }

  // Extract prefixes
  const prefixRegex = /prefix\s+(\w+):\s*<([^>]+)>/gi
  let match
  while ((match = prefixRegex.exec(query)) !== null) {
    result.prefixes.set(match[1], match[2])
  }

  // Detect DISTINCT
  if (/\bdistinct\b/i.test(query)) {
    result.distinct = true
  }

  // Count and extract subqueries
  const subqueryRegex = /\{\s*select\b[^}]*\}/gi
  let subqueryCount = 0
  while ((match = subqueryRegex.exec(query)) !== null) {
    subqueryCount++
    result.subqueries.push(match[0])
  }

  // Detect SERVICE endpoints (federation)
  const serviceRegex = /service\s*<([^>]+)>/gi
  while ((match = serviceRegex.exec(query)) !== null) {
    result.services.push(match[1])
  }

  // Count filters
  const filterRegex = /filter\s*\(/gi
  result.filters = []
  while ((match = filterRegex.exec(query)) !== null) {
    result.filters.push(match[0])
  }

  // Detect OPTIONAL patterns
  if (/\boptional\b/i.test(query)) {
    result.optional = true
  }

  // Detect UNION
  if (/\bunion\b/i.test(query)) {
    result.union = true
  }

  // Extract GROUP BY variables
  const groupByMatch = /group\s+by\s+([^}]*?)(?:having|order|limit|$)/i.exec(query)
  if (groupByMatch) {
    result.groupByVars = groupByMatch[1]
      .split(/[\s,]+/)
      .filter(v => v.trim().length > 0)
  }

  // Extract ORDER BY
  const orderByMatch = /order\s+by\s+([^}]*?)(?:limit|$)/i.exec(query)
  if (orderByMatch) {
    result.orderByVars = orderByMatch[1]
      .split(/[\s,]+/)
      .filter(v => v.trim().length > 0)
  }

  // Extract LIMIT
  const limitMatch = /limit\s+(\d+)/i.exec(query)
  if (limitMatch) {
    result.limit = parseInt(limitMatch[1], 10)
  }

  // Extract OFFSET
  const offsetMatch = /offset\s+(\d+)/i.exec(query)
  if (offsetMatch) {
    result.offset = parseInt(offsetMatch[1], 10)
  }

  // Estimate complexity
  result.complexity = calculateComplexity(result)

  return result
}

/**
 * Calculate query complexity score
 * @param {Object} parseResult - Result from parseQuery()
 * @returns {number} Complexity score (0-100)
 */
export function calculateComplexity(parseResult) {
  let score = 0

  // Base complexity by type
  const typeComplexity = {
    SELECT: 10,
    ASK: 5,
    CONSTRUCT: 20,
    DESCRIBE: 25,
  }
  score += typeComplexity[parseResult.type] || 10

  // Subqueries add complexity
  score += parseResult.subqueries.length * 15

  // Filters add modest complexity
  score += parseResult.filters.length * 5

  // OPTIONAL increases complexity
  if (parseResult.optional) score += 10

  // UNION increases complexity
  if (parseResult.union) score += 15

  // Federation (SERVICE) adds complexity
  score += parseResult.services.length * 20

  // GROUP BY/ORDER BY add complexity
  score += (parseResult.groupByVars.length + parseResult.orderByVars.length) * 3

  // DISTINCT adds complexity
  if (parseResult.distinct) score += 5

  return Math.min(score, 100)
}

/**
 * Detect anti-patterns in SPARQL queries
 * @param {string} query - SPARQL query string
 * @param {Object} parseResult - Result from parseQuery()
 * @returns {Array<Object>} Detected anti-patterns
 */
export function detectAntiPatterns(query, parseResult) {
  const antiPatterns = []

  // Detect N+1 patterns (subqueries without bulk loading)
  if (parseResult.subqueries.length > 0) {
    antiPatterns.push({
      type: 'SUBQUERY_MATERIALIZATION',
      severity: 'HIGH',
      message: 'Query uses subqueries which may cause materialization',
      count: parseResult.subqueries.length,
      suggestion: 'Consider using BIND or aggregate functions instead of subqueries',
      impact: `Potential ${parseResult.subqueries.length * 2}x performance cost`,
    })
  }

  // Detect unbounded property paths (+ or * without bounds)
  const propertyPathRegex = /:[a-zA-Z]\w*[\+\*]|[?]?\w+[\+\*](?!\})|[\+\*](?!\})/gi
  const hasUnboundedPath = propertyPathRegex.test(query) &&
    (query.match(/:\w+\+/) || query.match(/:\w+\*/) ||
     query.match(/\w+\+/) || query.match(/\w+\*/) ||
     (query.match(/\+/) && !query.match(/\{.*,.*\}/)))

  if (hasUnboundedPath) {
    antiPatterns.push({
      type: 'UNBOUNDED_PROPERTY_PATH',
      severity: 'HIGH',
      message: 'Query uses unbounded property paths (+, *)',
      suggestion: 'Limit traversal depth: use {1,3} instead of + or *',
      impact: 'Unbounded graph traversal can be extremely slow',
    })
  }

  // Detect high-cardinality filter patterns
  for (const predicate of PATTERNS.MISSING_INDEX.predicates) {
    if (query.includes(predicate)) {
      const filterPattern = new RegExp(`(?:filter|having).*${predicate}`, 'i')
      if (filterPattern.test(query)) {
        antiPatterns.push({
          type: 'UNINDEXED_FILTER',
          severity: 'MEDIUM',
          message: `Query filters on high-cardinality predicate: ${predicate}`,
          predicate,
          suggestion: 'Consider adding an index on this predicate',
          impact: 'Full table scans on large datasets',
        })
      }
    }
  }

  // Detect expensive aggregations without GROUP BY
  if (
    /(count|sum|avg|min|max)\s*\(/i.test(query) &&
    !parseResult.groupByVars.length
  ) {
    antiPatterns.push({
      type: 'UNGROUPED_AGGREGATION',
      severity: 'LOW',
      message: 'Query uses aggregate function without GROUP BY',
      suggestion: 'Use HAVING clause for filtering aggregates',
      impact: 'Client-side post-processing required',
    })
  }

  // Detect FILTER on unbound variables
  const filterPattern = /filter\s*\(([^)]+)\)/gi
  let match
  while ((match = filterPattern.exec(query)) !== null) {
    const vars = match[1].match(/\?[\w]+/g) || []
    if (vars.length > 0) {
      antiPatterns.push({
        type: 'FILTER_UNBIND_RISK',
        severity: 'MEDIUM',
        message: `FILTER may reference unbound variables: ${vars.join(', ')}`,
        variables: vars,
        suggestion: 'Ensure all variables are bound before filtering',
        impact: 'Query may return empty results',
      })
    }
  }

  return antiPatterns
}

/**
 * Generate optimization recommendations
 * @param {string} query - SPARQL query string
 * @param {Object} parseResult - Result from parseQuery()
 * @param {Array<Object>} antiPatterns - Anti-patterns detected
 * @returns {Array<Object>} Optimization recommendations
 */
export function generateOptimizations(query, parseResult, antiPatterns = []) {
  const optimizations = []

  // Recommendation 1: Use HAVING instead of subqueries
  if (antiPatterns.some(p => p.type === 'SUBQUERY_MATERIALIZATION')) {
    optimizations.push({
      priority: 'HIGH',
      effort: 'MEDIUM',
      improvement: '40-50%',
      description: 'Replace subqueries with HAVING clause aggregations',
      example: `Use: GROUP BY ... HAVING(COUNT(*) > 10)
Instead of: Subquery with COUNT in WHERE clause`,
    })
  }

  // Recommendation 2: Limit property paths
  if (antiPatterns.some(p => p.type === 'UNBOUNDED_PROPERTY_PATH')) {
    optimizations.push({
      priority: 'HIGH',
      effort: 'LOW',
      improvement: '5-10x',
      description: 'Limit property path traversal depth',
      example: `Use: pack:dependsOn{1,3} ?dep
Instead of: pack:dependsOn+ ?dep`,
    })
  }

  // Recommendation 3: Add indexes
  const unindexedFilters = antiPatterns.filter(p => p.type === 'UNINDEXED_FILTER')
  if (unindexedFilters.length > 0) {
    optimizations.push({
      priority: 'MEDIUM',
      effort: 'HIGH',
      improvement: '50-80%',
      description: 'Create RDF indexes on frequently filtered predicates',
      predicates: unindexedFilters.map(p => p.predicate),
    })
  }

  // Recommendation 4: Use CONSTRUCT for bulk loading
  if (query.includes('SELECT') && parseResult.filters.length > 2) {
    optimizations.push({
      priority: 'MEDIUM',
      effort: 'MEDIUM',
      improvement: '30-40%',
      description: 'Use CONSTRUCT for materializing result graphs',
      rationale: 'Reduces serialization overhead for multiple results',
    })
  }

  // Recommendation 5: Query push-down for federation
  if (parseResult.services.length > 0 && parseResult.filters.length > 0) {
    optimizations.push({
      priority: 'HIGH',
      effort: 'LOW',
      improvement: '20-50%',
      description: 'Move FILTER clauses inside SERVICE blocks',
      rationale: 'Reduces data transfer from remote endpoints',
      services: parseResult.services,
    })
  }

  // Recommendation 6: Temporal bucketing
  if (query.includes('timestamp') || query.includes('datetime')) {
    optimizations.push({
      priority: 'MEDIUM',
      effort: 'MEDIUM',
      improvement: '60-80%',
      description: 'Use temporal bucketing for time-series queries',
      example: `Use: BIND(FLOOR(HOURS(?timestamp) / 24) AS ?dayBucket)
Instead of: Full timestamp comparison`,
    })
  }

  return optimizations
}

/**
 * Analyze N+1 query patterns in code (for JavaScript implementations)
 * @param {string} code - JavaScript code containing query execution
 * @returns {Array<Object>} N+1 patterns found
 */
export function analyzeN1Patterns(code) {
  const patterns = []
  const lines = code.split('\n')

  // Look for loop patterns with query execution
  const loopPattern = /(?:for|while)\s*\([^)]*(?:of|in)\s+(\w+)\)[\s\{]*\n(?:[^}]*\n)*.*(?:query|ks\.query|execute)/gi

  let lineNum = 0
  for (const line of lines) {
    lineNum++

    // Check for async for loops with awaits
    if (/(for|while)\s*\([^)]*of\s+/.test(line)) {
      // Look ahead for query execution
      let hasQuery = false
      for (let i = lineNum; i < Math.min(lineNum + 10, lines.length); i++) {
        if (
          /(?:query|execute|ks\.query|graph\.query)/i.test(lines[i]) &&
          /await/i.test(lines[i])
        ) {
          hasQuery = true
          break
        }
      }

      if (hasQuery) {
        patterns.push({
          line: lineNum,
          type: 'LOOP_WITH_QUERY',
          severity: 'HIGH',
          description: 'Loop contains query execution',
          suggestion: 'Use bulk query or CONSTRUCT to load all items at once',
          code: line.trim(),
        })
      }
    }
  }

  return patterns
}

/**
 * Create SPARQL profiler instance
 * @param {Object} options - Configuration options
 * @returns {Object} Profiler instance
 *
 * @example
 * ```javascript
 * const profiler = createProfiler({ cacheSize: 100, ttl: 3600000 })
 * const profile = profiler.profile(query)
 * console.log(profile.antiPatterns)
 * console.log(profile.optimizations)
 * ```
 */
export function createProfiler(options = {}) {
  const config = {
    cacheSize: options.cacheSize || 100,
    ttl: options.ttl || 3600000, // 1 hour
    trackMetrics: options.trackMetrics !== false,
  }

  const cache = new Map()
  const metrics = {
    queriesProfiled: 0,
    totalAnalysisTime: 0,
    avgAnalysisTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    antiPatternsFound: 0,
    optimizationsGenerated: 0,
  }

  return {
    /**
     * Profile a SPARQL query
     * @param {string} query - SPARQL query to analyze
     * @returns {Object} Profile result with analysis
     */
    profile(query) {
      const startTime = performance.now()
      const queryHash = hashQuery(query)

      // Check cache
      if (cache.has(queryHash)) {
        const cached = cache.get(queryHash)
        if (!cached.isStale(config.ttl)) {
          metrics.cacheHits++
          return cached
        }
      }

      metrics.cacheMisses++

      // Parse query
      const parseResult = parseQuery(query)

      // Detect anti-patterns
      const antiPatterns = detectAntiPatterns(query, parseResult)

      // Generate optimizations
      const optimizations = generateOptimizations(query, parseResult, antiPatterns)

      // Create execution plan
      const plan = new ExecutionPlan(query, parseResult)
      plan.patterns = antiPatterns
      plan.optimizations = optimizations

      // Estimate execution time based on complexity
      plan.estimatedTime = plan.parseResult.complexity * 10 // Rough estimate

      // Record metrics
      const analysisTime = performance.now() - startTime
      metrics.queriesProfiled++
      metrics.totalAnalysisTime += analysisTime
      metrics.avgAnalysisTime = metrics.totalAnalysisTime / metrics.queriesProfiled
      metrics.antiPatternsFound += antiPatterns.length
      metrics.optimizationsGenerated += optimizations.length

      // Cache result
      if (cache.size >= config.cacheSize) {
        // Simple eviction: remove oldest
        const oldestKey = cache.keys().next().value
        cache.delete(oldestKey)
      }
      cache.set(queryHash, plan)

      return {
        query: normalizeQuery(query),
        hash: queryHash,
        parseResult,
        antiPatterns,
        optimizations,
        estimatedComplexity: plan.parseResult.complexity,
        estimatedTime: plan.estimatedTime,
        analysisTime,
      }
    },

    /**
     * Batch analyze multiple queries
     * @param {Array<string>} queries - Queries to analyze
     * @returns {Array<Object>} Profile results
     */
    profileBatch(queries) {
      return queries.map(q => this.profile(q))
    },

    /**
     * Get profiler statistics
     * @returns {Object} Metrics and statistics
     */
    getStats() {
      return {
        ...metrics,
        cacheSize: cache.size,
        maxCacheSize: config.cacheSize,
        cacheHitRate:
          metrics.queriesProfiled > 0
            ? `${((metrics.cacheHits / metrics.queriesProfiled) * 100).toFixed(2)}%`
            : '0%',
      }
    },

    /**
     * Clear the cache
     */
    clear() {
      cache.clear()
    },

    /**
     * Generate optimization report
     * @param {Array<string>} queries - Queries to analyze
     * @returns {Object} Comprehensive report
     */
    generateReport(queries) {
      const profiles = this.profileBatch(queries)

      const report = {
        summary: {
          queriesAnalyzed: profiles.length,
          totalAntiPatterns: profiles.reduce((sum, p) => sum + p.antiPatterns.length, 0),
          totalOptimizations: profiles.reduce((sum, p) => sum + p.optimizations.length, 0),
          avgComplexity:
            profiles.length > 0
              ? (
                  profiles.reduce((sum, p) => sum + p.estimatedComplexity, 0) /
                  profiles.length
                ).toFixed(2)
              : 0,
          totalEstimatedTime: profiles.reduce((sum, p) => sum + p.estimatedTime, 0),
        },
        profiles,
        highPriorityIssues: profiles
          .flatMap(p =>
            p.antiPatterns
              .filter(ap => ap.severity === 'HIGH')
              .map(ap => ({ ...ap, query: p.query }))
          )
          .slice(0, 5),
        highImpactOptimizations: profiles
          .flatMap(p =>
            p.optimizations
              .filter(o => o.priority === 'HIGH')
              .map(o => ({ ...o, query: p.query }))
          )
          .slice(0, 5),
        stats: this.getStats(),
      }

      return report
    },

    /**
     * Export cache as JSON for inspection
     * @returns {Array<Object>} Cached plans
     */
    exportCache() {
      return Array.from(cache.values()).map(plan => ({
        hash: plan.hash,
        query: plan.normalized,
        complexity: plan.parseResult.complexity,
        patterns: plan.patterns.length,
        optimizations: plan.optimizations.length,
        createdAt: plan.createdAt,
      }))
    },
  }
}

export default {
  createProfiler,
  normalizeQuery,
  hashQuery,
  parseQuery,
  calculateComplexity,
  detectAntiPatterns,
  generateOptimizations,
  analyzeN1Patterns,
}
