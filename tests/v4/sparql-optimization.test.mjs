/**
 * @fileoverview SPARQL Query Optimization Tests
 *
 * Comprehensive test suite for SPARQL profiler and optimizations
 * Tests query analysis, anti-pattern detection, and optimized queries
 *
 * Coverage targets: >85% of profiler functionality
 * Performance targets: Demonstrate 5x throughput improvement
 *
 * Based on SPARQL_CAPABILITIES_ANALYSIS.md Phase 1 Week 3-4
 *
 * @author GitVan Team
 * @license Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createProfiler,
  normalizeQuery,
  hashQuery,
  parseQuery,
  calculateComplexity,
  detectAntiPatterns,
  generateOptimizations,
  analyzeN1Patterns,
} from '/home/user/gitvan/src/utils/sparql-profiler.mjs'
import * as optimizedQueries from '/home/user/gitvan/src/performance/sparql-queries-optimized.mjs'

describe('SPARQL Profiler - Query Normalization', () => {
  it('normalizes query whitespace', () => {
    const query1 = `
      PREFIX perf: <https://gitvan.dev/performance#>
      SELECT ?operation
      WHERE {
        ?m a perf:Measurement .
      }
    `
    const query2 = 'PREFIX perf: <https://gitvan.dev/performance#> SELECT ?operation WHERE { ?m a perf:Measurement . }'

    expect(normalizeQuery(query1)).toBe(normalizeQuery(query2))
  })

  it('normalizes to lowercase', () => {
    const query1 = 'SELECT ?x WHERE { ?x a :Type }'
    const query2 = 'select ?x where { ?x a :Type }'

    expect(normalizeQuery(query1)).toBe(normalizeQuery(query2))
  })

  it('removes spaces around braces', () => {
    const query1 = '{ ?x a :Type }'
    const query2 = '{?x a :Type}'

    expect(normalizeQuery(query1)).toBe(normalizeQuery(query2))
  })

  it('handles multiple consecutive spaces', () => {
    const query = 'SELECT   ?x   WHERE  {  ?x  a  :Type  }'
    const normalized = normalizeQuery(query)

    expect(normalized).toContain('select ?x')
    expect(normalized).not.toContain('  ')
  })
})

describe('SPARQL Profiler - Query Hashing', () => {
  it('generates consistent hash for same query', () => {
    const query = 'SELECT ?x WHERE { ?x a :Type }'
    const hash1 = hashQuery(query)
    const hash2 = hashQuery(query)

    expect(hash1).toBe(hash2)
  })

  it('generates different hashes for different queries', () => {
    const query1 = 'SELECT ?x WHERE { ?x a :Type }'
    const query2 = 'SELECT ?y WHERE { ?y a :Type }'

    expect(hashQuery(query1)).not.toBe(hashQuery(query2))
  })

  it('generates same hash for logically identical queries', () => {
    const query1 = 'SELECT ?x WHERE { ?x a :Type }'
    const query2 = 'SELECT ?x WHERE {?x a :Type}'

    expect(hashQuery(query1)).toBe(hashQuery(query2))
  })

  it('hash length is consistent', () => {
    const query = 'SELECT ?x WHERE { ?x a :Type }'
    const hash = hashQuery(query)

    expect(hash.length).toBe(24)
  })
})

describe('SPARQL Profiler - Query Parsing', () => {
  it('detects SELECT query type', () => {
    const query = 'SELECT ?x WHERE { ?x a :Type }'
    const result = parseQuery(query)

    expect(result.type).toBe('SELECT')
  })

  it('detects ASK query type', () => {
    const query = 'ASK { ?x a :Type }'
    const result = parseQuery(query)

    expect(result.type).toBe('ASK')
  })

  it('detects CONSTRUCT query type', () => {
    const query = 'CONSTRUCT { ?x a :Type } WHERE { ?x a :Type }'
    const result = parseQuery(query)

    expect(result.type).toBe('CONSTRUCT')
  })

  it('detects DESCRIBE query type', () => {
    const query = 'DESCRIBE ?x'
    const result = parseQuery(query)

    expect(result.type).toBe('DESCRIBE')
  })

  it('extracts PREFIX declarations', () => {
    const query = `
      PREFIX perf: <https://gitvan.dev/performance#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      SELECT ?x WHERE { ?x a :Type }
    `
    const result = parseQuery(query)

    expect(result.prefixes.has('perf')).toBe(true)
    expect(result.prefixes.has('xsd')).toBe(true)
    expect(result.prefixes.get('perf')).toBe('https://gitvan.dev/performance#')
  })

  it('detects DISTINCT modifier', () => {
    const query = 'SELECT DISTINCT ?x WHERE { ?x a :Type }'
    const result = parseQuery(query)

    expect(result.distinct).toBe(true)
  })

  it('detects OPTIONAL patterns', () => {
    const query = 'SELECT ?x WHERE { ?x a :Type . OPTIONAL { ?x :name ?name } }'
    const result = parseQuery(query)

    expect(result.optional).toBe(true)
  })

  it('detects UNION patterns', () => {
    const query = `
      SELECT ?x WHERE {
        { ?x a :Type1 }
        UNION
        { ?x a :Type2 }
      }
    `
    const result = parseQuery(query)

    expect(result.union).toBe(true)
  })

  it('detects SERVICE endpoints (federation)', () => {
    const query = `
      SELECT ?x WHERE {
        SERVICE <https://remote.example.com/sparql> {
          ?x a :Type .
        }
      }
    `
    const result = parseQuery(query)

    expect(result.services.length).toBe(1)
    expect(result.services[0]).toBe('https://remote.example.com/sparql')
  })

  it('counts FILTER clauses', () => {
    const query = `
      SELECT ?x WHERE {
        ?x a :Type .
        FILTER(?x > 10)
        FILTER(?x < 100)
      }
    `
    const result = parseQuery(query)

    expect(result.filters.length).toBe(2)
  })

  it('extracts GROUP BY variables', () => {
    const query = `
      SELECT ?operation (COUNT(?x) AS ?count) WHERE {
        ?x a :Type ; :operation ?operation .
      }
      GROUP BY ?operation
    `
    const result = parseQuery(query)

    expect(result.groupByVars.length).toBeGreaterThan(0)
    expect(result.groupByVars.join(' ')).toContain('operation')
  })

  it('extracts ORDER BY variables', () => {
    const query = `
      SELECT ?x WHERE { ?x a :Type }
      ORDER BY DESC(?x)
    `
    const result = parseQuery(query)

    expect(result.orderByVars.length).toBeGreaterThan(0)
  })

  it('extracts LIMIT value', () => {
    const query = 'SELECT ?x WHERE { ?x a :Type } LIMIT 100'
    const result = parseQuery(query)

    expect(result.limit).toBe(100)
  })

  it('extracts OFFSET value', () => {
    const query = 'SELECT ?x WHERE { ?x a :Type } OFFSET 50'
    const result = parseQuery(query)

    expect(result.offset).toBe(50)
  })

  it('counts subqueries', () => {
    const query = `
      SELECT ?x WHERE {
        ?x a :Type .
        {
          SELECT ?y WHERE { ?y a :SubType }
        }
      }
    `
    const result = parseQuery(query)

    expect(result.subqueries.length).toBeGreaterThan(0)
  })
})

describe('SPARQL Profiler - Complexity Calculation', () => {
  it('assigns low complexity to simple SELECT', () => {
    const result = parseQuery('SELECT ?x WHERE { ?x a :Type }')
    const complexity = calculateComplexity(result)

    expect(complexity).toBeLessThan(30)
  })

  it('assigns medium complexity to CONSTRUCT', () => {
    const result = parseQuery('CONSTRUCT { ?x a :Type } WHERE { ?x a :Type }')
    const complexity = calculateComplexity(result)

    expect(complexity).toBeGreaterThan(15)
    expect(complexity).toBeLessThan(50)
  })

  it('adds complexity for subqueries', () => {
    const simpleQuery = 'SELECT ?x WHERE { ?x a :Type }'
    const complexQuery = `
      SELECT ?x WHERE {
        ?x a :Type .
        {
          SELECT ?y WHERE { ?y a :SubType }
        }
      }
    `

    const simpleComplexity = calculateComplexity(parseQuery(simpleQuery))
    const complexComplexity = calculateComplexity(parseQuery(complexQuery))

    expect(complexComplexity).toBeGreaterThan(simpleComplexity)
  })

  it('adds complexity for FILTER clauses', () => {
    const noFilterQuery = 'SELECT ?x WHERE { ?x a :Type }'
    const filterQuery = `
      SELECT ?x WHERE {
        ?x a :Type ; :value ?v .
        FILTER(?v > 10)
        FILTER(?v < 100)
      }
    `

    const noFilterComplexity = calculateComplexity(parseQuery(noFilterQuery))
    const filterComplexity = calculateComplexity(parseQuery(filterQuery))

    expect(filterComplexity).toBeGreaterThan(noFilterComplexity)
  })

  it('adds complexity for federation (SERVICE)', () => {
    const localQuery = 'SELECT ?x WHERE { ?x a :Type }'
    const federatedQuery = `
      SELECT ?x WHERE {
        SERVICE <https://remote.example.com/sparql> {
          ?x a :Type .
        }
      }
    `

    const localComplexity = calculateComplexity(parseQuery(localQuery))
    const federatedComplexity = calculateComplexity(parseQuery(federatedQuery))

    expect(federatedComplexity).toBeGreaterThan(localComplexity)
  })

  it('caps complexity at 100', () => {
    const complexQuery = `
      SELECT DISTINCT ?x WHERE {
        SERVICE <https://endpoint1/sparql> {
          ?x a :Type .
          {
            SELECT ?y WHERE {
              ?y a :SubType ;
                 :related ?x .
              FILTER(?y > 10)
            }
          }
        }
      }
      GROUP BY ?x
      ORDER BY ?x
    `

    const complexity = calculateComplexity(parseQuery(complexQuery))

    expect(complexity).toBeLessThanOrEqual(100)
  })
})

describe('SPARQL Profiler - Anti-Pattern Detection', () => {
  it('detects subquery materialization', () => {
    const query = `
      SELECT ?x WHERE {
        ?x a :Type .
        {
          SELECT ?y WHERE { ?y a :SubType }
        }
      }
    `
    const parseResult = parseQuery(query)
    const patterns = detectAntiPatterns(query, parseResult)

    expect(patterns.some(p => p.type === 'SUBQUERY_MATERIALIZATION')).toBe(true)
  })

  it('detects unbounded property paths', () => {
    const query = `
      SELECT ?x ?ancestor WHERE {
        ?x :childOf+ ?ancestor .
      }
    `
    const parseResult = parseQuery(query)
    const patterns = detectAntiPatterns(query, parseResult)

    expect(patterns.some(p => p.type === 'UNBOUNDED_PROPERTY_PATH')).toBe(true)
  })

  it('detects unindexed filters on high-cardinality predicates', () => {
    const query = `
      SELECT ?m WHERE {
        ?m a perf:Measurement ;
           perf:duration ?d .
        FILTER(?d > 1000)
      }
    `
    const parseResult = parseQuery(query)
    const patterns = detectAntiPatterns(query, parseResult)

    expect(patterns.some(p => p.type === 'UNINDEXED_FILTER')).toBe(true)
  })

  it('detects ungrouped aggregations', () => {
    const query = `
      SELECT (COUNT(?x) AS ?count) WHERE {
        ?x a :Type .
      }
    `
    const parseResult = parseQuery(query)
    const patterns = detectAntiPatterns(query, parseResult)

    expect(patterns.some(p => p.type === 'UNGROUPED_AGGREGATION')).toBe(true)
  })

  it('returns empty array for well-formed queries', () => {
    const query = `
      PREFIX perf: <https://gitvan.dev/performance#>
      SELECT ?operation (COUNT(?m) AS ?count) WHERE {
        ?m a perf:Measurement ; perf:operation ?operation .
      }
      GROUP BY ?operation
    `
    const parseResult = parseQuery(query)
    const patterns = detectAntiPatterns(query, parseResult)

    expect(patterns.length).toBe(0)
  })
})

describe('SPARQL Profiler - Optimization Generation', () => {
  it('recommends using HAVING instead of subqueries', () => {
    const query = `
      CONSTRUCT { ?m a perf:Anomaly }
      WHERE {
        ?m a perf:Measurement ; perf:duration ?d .
        { SELECT ?op (AVG(?duration) AS ?avg) WHERE { } GROUP BY ?op }
        FILTER(?d > ?avg * 1.5)
      }
    `
    const parseResult = parseQuery(query)
    const patterns = detectAntiPatterns(query, parseResult)
    const optimizations = generateOptimizations(query, parseResult, patterns)

    expect(
      optimizations.some(o =>
        o.description.toLowerCase().includes('having')
      )
    ).toBe(true)
  })

  it('recommends limiting property paths', () => {
    const query = 'SELECT ?x ?ancestor WHERE { ?x :childOf+ ?ancestor }'
    const parseResult = parseQuery(query)
    const patterns = detectAntiPatterns(query, parseResult)
    const optimizations = generateOptimizations(query, parseResult, patterns)

    expect(
      optimizations.some(o =>
        o.description.toLowerCase().includes('limit') &&
        o.description.toLowerCase().includes('path')
      )
    ).toBe(true)
  })

  it('recommends query push-down for federation', () => {
    const query = `
      SELECT ?x WHERE {
        SERVICE <https://remote/sparql> {
          ?x a :Type .
        }
        FILTER(?x > 10)
      }
    `
    const parseResult = parseQuery(query)
    const optimizations = generateOptimizations(query, parseResult)

    expect(
      optimizations.some(o =>
        o.description.toLowerCase().includes('push-down') ||
        o.description.toLowerCase().includes('push down')
      )
    ).toBe(true)
  })

  it('recommends temporal bucketing for time-series', () => {
    const query = `
      SELECT ?timestamp ?duration WHERE {
        ?m a perf:Measurement ; perf:timestamp ?timestamp ; perf:duration ?duration .
      }
    `
    const parseResult = parseQuery(query)
    const optimizations = generateOptimizations(query, parseResult)

    expect(
      optimizations.some(o =>
        o.description.toLowerCase().includes('temporal')
      )
    ).toBe(true)
  })
})

describe('SPARQL Profiler - N+1 Pattern Analysis', () => {
  it('detects loop with query execution', () => {
    const code = `
      for (const dep of dependencies) {
        const result = await ks.query(someQuery);
      }
    `
    const patterns = analyzeN1Patterns(code)

    expect(patterns.some(p => p.type === 'LOOP_WITH_QUERY')).toBe(true)
  })

  it('detects async loop with await query', () => {
    const code = `
      for (const item of items) {
        const result = await graph.query(buildQuery(item));
      }
    `
    const patterns = analyzeN1Patterns(code)

    expect(patterns.length).toBeGreaterThan(0)
  })

  it('ignores code without loops', () => {
    const code = `
      const result = await ks.query(query);
      return result;
    `
    const patterns = analyzeN1Patterns(code)

    expect(patterns.length).toBe(0)
  })

  it('ignores loops without queries', () => {
    const code = `
      for (const item of items) {
        processItem(item);
      }
    `
    const patterns = analyzeN1Patterns(code)

    expect(patterns.length).toBe(0)
  })
})

describe('SPARQL Profiler - Profiler Instance', () => {
  let profiler

  beforeEach(() => {
    profiler = createProfiler({ cacheSize: 50, ttl: 600000 })
  })

  afterEach(() => {
    profiler.clear()
  })

  it('profiles a query', () => {
    const query = 'SELECT ?x WHERE { ?x a :Type }'
    const profile = profiler.profile(query)

    expect(profile).toHaveProperty('query')
    expect(profile).toHaveProperty('hash')
    expect(profile).toHaveProperty('parseResult')
    expect(profile).toHaveProperty('antiPatterns')
    expect(profile).toHaveProperty('optimizations')
    expect(profile).toHaveProperty('estimatedComplexity')
    expect(profile).toHaveProperty('analysisTime')
  })

  it('caches profiles', () => {
    const query = 'SELECT ?x WHERE { ?x a :Type }'

    profiler.profile(query)
    profiler.profile(query)

    const stats = profiler.getStats()

    expect(stats.cacheHits).toBeGreaterThan(0)
  })

  it('tracks statistics', () => {
    const query1 = 'SELECT ?x WHERE { ?x a :Type }'
    const query2 = 'SELECT ?y WHERE { ?y a :Type }'

    profiler.profile(query1)
    profiler.profile(query2)

    const stats = profiler.getStats()

    expect(stats.queriesProfiled).toBe(2)
    expect(stats.avgAnalysisTime).toBeGreaterThan(0)
  })

  it('batch profiles multiple queries', () => {
    const queries = [
      'SELECT ?x WHERE { ?x a :Type }',
      'SELECT ?y WHERE { ?y a :Type }',
      'CONSTRUCT { ?z a :Type } WHERE { ?z a :Type }',
    ]

    const profiles = profiler.profileBatch(queries)

    expect(profiles.length).toBe(3)
    expect(profiles.every(p => p.hash)).toBe(true)
  })

  it('generates optimization report', () => {
    const queries = [
      'SELECT ?x WHERE { ?x a :Type }',
      `
        CONSTRUCT { ?m a perf:Anomaly }
        WHERE {
          ?m a perf:Measurement ; perf:duration ?d .
          { SELECT ?op (AVG(?duration) AS ?avg) WHERE { } GROUP BY ?op }
          FILTER(?d > ?avg * 1.5)
        }
      `,
    ]

    const report = profiler.generateReport(queries)

    expect(report).toHaveProperty('summary')
    expect(report).toHaveProperty('profiles')
    expect(report).toHaveProperty('highPriorityIssues')
    expect(report).toHaveProperty('highImpactOptimizations')
    expect(report.summary.queriesAnalyzed).toBe(2)
  })

  it('exports cache', () => {
    profiler.profile('SELECT ?x WHERE { ?x a :Type }')
    profiler.profile('SELECT ?y WHERE { ?y a :Type }')

    const cached = profiler.exportCache()

    expect(cached.length).toBeGreaterThan(0)
    expect(cached[0]).toHaveProperty('hash')
    expect(cached[0]).toHaveProperty('complexity')
  })

  it('clears cache', () => {
    profiler.profile('SELECT ?x WHERE { ?x a :Type }')

    let stats = profiler.getStats()
    expect(stats.cacheSize).toBeGreaterThan(0)

    profiler.clear()

    stats = profiler.getStats()
    expect(stats.cacheSize).toBe(0)
  })
})

describe('Optimized SPARQL Queries', () => {
  it('generates anomaly detection optimized query', () => {
    const query = optimizedQueries.anomalyDetectionQuery()

    expect(query).toContain('HAVING')
    expect(query).toContain('GROUP BY')
    expect(query).toContain('COUNT')
    expect(query).not.toContain('{')
  })

  it('generates anomaly detection CONSTRUCT query', () => {
    const query = optimizedQueries.anomalyDetectionConstructOptimized()

    expect(query).toContain('CONSTRUCT')
    expect(query).toContain('perf:Anomaly')
    expect(query).toContain('HAVING')
  })

  it('generates temporal bucketing query', () => {
    const query = optimizedQueries.slowOperationsOptimized('*', '2026-01-10T00:00:00', 'hour')

    expect(query).toContain('GROUP BY')
    expect(query).toContain('FLOOR')
    expect(query).toContain('HOURS')
  })

  it('generates memory leak detection optimized query', () => {
    const query = optimizedQueries.memoryLeakDetectionOptimized(7)

    expect(query).toContain('HAVING')
    expect(query).toContain('perf:memoryUsed')
    expect(query).toContain('GROUP BY')
  })

  it('generates performance percentiles query', () => {
    const query = optimizedQueries.performancePercentilesOptimized('test-op')

    expect(query).toContain('CEIL')
    expect(query).toContain('COUNT')
    expect(query).toContain('GROUP BY')
  })

  it('generates correlation discovery optimized query', () => {
    const query = optimizedQueries.correlationDiscoveryOptimized(0.8)

    expect(query).toContain('AVG')
    expect(query).toContain('SQRT')
    expect(query).toContain('GROUP BY')
  })

  it('generates high variance operations query', () => {
    const query = optimizedQueries.highVarianceOperationsOptimized(20, 0.5)

    expect(query).toContain('HAVING')
    expect(query).toContain('coefficientOfVariation')
  })

  it('generates regression detection optimized query', () => {
    const query = optimizedQueries.regressionDetectionOptimized(
      'test-op',
      '2026-01-10T00:00:00',
      '2026-01-09T00:00:00'
    )

    expect(query).toContain('IF')
    expect(query).toContain('?isRecent')
    expect(query).toContain('?isHistorical')
  })

  it('generates concurrent operations optimized query', () => {
    const query = optimizedQueries.concurrentOperationsOptimized(1000, 10)

    expect(query).toContain('DISTINCT')
    expect(query).toContain('?windowId')
  })
})

describe('Performance Benchmarks', () => {
  it('profiler analyzes 100 queries in reasonable time', () => {
    const profiler = createProfiler()
    const queries = Array(100)
      .fill(0)
      .map(
        (_, i) =>
          `SELECT ?x WHERE { ?x a :Type${i} . ${i % 2 === 0 ? 'FILTER(?x > 10)' : ''} }`
      )

    const startTime = performance.now()
    profiler.profileBatch(queries)
    const elapsed = performance.now() - startTime

    // Should analyze 100 queries in < 500ms
    expect(elapsed).toBeLessThan(500)

    profiler.clear()
  })

  it('profiler cache hit rate improves with repeated queries', () => {
    const profiler = createProfiler()
    const query = 'SELECT ?x WHERE { ?x a :Type }'

    // Initial profile (cache miss)
    profiler.profile(query)
    let stats = profiler.getStats()
    const initialHitRate = parseFloat(stats.cacheHitRate)

    // Repeated profiles (cache hits)
    for (let i = 0; i < 10; i++) {
      profiler.profile(query)
    }
    stats = profiler.getStats()
    const finalHitRate = parseFloat(stats.cacheHitRate)

    expect(finalHitRate).toBeGreaterThan(initialHitRate)

    profiler.clear()
  })
})

describe('Integration Tests', () => {
  it('profiles real-world performance query', () => {
    const profiler = createProfiler()
    const query = `
      PREFIX perf: <https://gitvan.dev/performance#>

      SELECT ?operation (COUNT(?m) AS ?count)
      WHERE {
        ?m a perf:Measurement ;
           perf:operation ?operation ;
           perf:duration ?duration .
        ?budget perf:forOperation ?operation ;
                perf:maxDuration ?max .
        FILTER(?duration > ?max)
      }
      GROUP BY ?operation
      ORDER BY DESC(?count)
    `

    const profile = profiler.profile(query)

    expect(profile.parseResult.type).toBe('SELECT')
    expect(profile.parseResult.groupByVars.length).toBeGreaterThan(0)
    expect(profile.estimatedComplexity).toBeGreaterThan(0)

    profiler.clear()
  })

  it('profiles real-world pack dependency query', () => {
    const profiler = createProfiler()
    const query = `
      PREFIX pack: <https://gitvan.dev/pack#>

      SELECT ?dependency ?targetPack ?versionRange WHERE {
        ?pack a pack:Pack ;
              pack:name "react" ;
              pack:dependsOn ?dep .
        ?dep pack:targetPack ?targetPack ;
             pack:versionRange ?versionRange .
      }
    `

    const profile = profiler.profile(query)

    expect(profile.parseResult.type).toBe('SELECT')
    expect(profile.estimatedComplexity).toBeGreaterThan(0)

    profiler.clear()
  })

  it('detects N+1 in recursive pack resolution', () => {
    const profiler = createProfiler()
    const code = `
      async function resolveDependencies(packName) {
        const results = await ks.query(getDepsQuery(packName));
        const tree = { pack: packName, deps: [] };
        for (const dep of results) {
          const subtree = await ks.query(getDepsQuery(dep.target));
          tree.deps.push(subtree);
        }
        return tree;
      }
    `

    const patterns = analyzeN1Patterns(code)

    expect(patterns.length).toBeGreaterThan(0)
    expect(patterns.some(p => p.severity === 'HIGH')).toBe(true)
  })
})
