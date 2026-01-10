#!/usr/bin/env node

/**
 * Quick validation script for SPARQL profiler
 * Tests core functionality without requiring vitest
 */

import {
  createProfiler,
  normalizeQuery,
  hashQuery,
  parseQuery,
  calculateComplexity,
  detectAntiPatterns,
  generateOptimizations,
} from './src/utils/sparql-profiler.mjs'
import * as optimizedQueries from './src/performance/sparql-queries-optimized.mjs'

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✓ ${name}`)
    passed++
  } catch (err) {
    console.error(`✗ ${name}: ${err.message}`)
    failed++
  }
}

console.log('\n=== SPARQL Profiler Validation Tests ===\n')

// Test: Query Normalization
test('normalizeQuery normalizes whitespace', () => {
  const q1 = `
    SELECT ?x
    WHERE { ?x a :Type }
  `
  const q2 = 'SELECT ?x WHERE { ?x a :Type }'
  if (normalizeQuery(q1) !== normalizeQuery(q2)) throw new Error('Normalization failed')
})

// Test: Query Hashing
test('hashQuery generates consistent hashes', () => {
  const query = 'SELECT ?x WHERE { ?x a :Type }'
  const h1 = hashQuery(query)
  const h2 = hashQuery(query)
  if (h1 !== h2) throw new Error('Hash mismatch')
  if (h1.length !== 24) throw new Error('Hash length wrong')
})

// Test: Query Parsing
test('parseQuery detects SELECT type', () => {
  const result = parseQuery('SELECT ?x WHERE { ?x a :Type }')
  if (result.type !== 'SELECT') throw new Error(`Expected SELECT, got ${result.type}`)
})

test('parseQuery detects CONSTRUCT type', () => {
  const result = parseQuery('CONSTRUCT { ?x a :Type } WHERE { ?x a :Type }')
  if (result.type !== 'CONSTRUCT') throw new Error(`Expected CONSTRUCT, got ${result.type}`)
})

test('parseQuery extracts PREFIXes', () => {
  const query = `
    PREFIX perf: <https://gitvan.dev/performance#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    SELECT ?x WHERE { ?x a :Type }
  `
  const result = parseQuery(query)
  if (!result.prefixes.has('perf')) throw new Error('Missing perf prefix')
  if (!result.prefixes.has('xsd')) throw new Error('Missing xsd prefix')
})

test('parseQuery detects DISTINCT', () => {
  const result = parseQuery('SELECT DISTINCT ?x WHERE { ?x a :Type }')
  if (!result.distinct) throw new Error('DISTINCT not detected')
})

test('parseQuery detects OPTIONAL', () => {
  const result = parseQuery('SELECT ?x WHERE { ?x a :Type . OPTIONAL { ?x :name ?name } }')
  if (!result.optional) throw new Error('OPTIONAL not detected')
})

test('parseQuery detects UNION', () => {
  const result = parseQuery(`
    SELECT ?x WHERE {
      { ?x a :Type1 }
      UNION
      { ?x a :Type2 }
    }
  `)
  if (!result.union) throw new Error('UNION not detected')
})

test('parseQuery detects SERVICE endpoints', () => {
  const result = parseQuery(`
    SELECT ?x WHERE {
      SERVICE <https://remote.example.com/sparql> {
        ?x a :Type .
      }
    }
  `)
  if (result.services.length !== 1) throw new Error('SERVICE not detected')
})

test('parseQuery extracts LIMIT', () => {
  const result = parseQuery('SELECT ?x WHERE { ?x a :Type } LIMIT 100')
  if (result.limit !== 100) throw new Error('LIMIT not extracted')
})

test('parseQuery extracts OFFSET', () => {
  const result = parseQuery('SELECT ?x WHERE { ?x a :Type } OFFSET 50')
  if (result.offset !== 50) throw new Error('OFFSET not extracted')
})

// Test: Complexity Calculation
test('calculateComplexity assigns low score to simple SELECT', () => {
  const result = parseQuery('SELECT ?x WHERE { ?x a :Type }')
  const complexity = calculateComplexity(result)
  if (complexity >= 30) throw new Error(`Complexity too high: ${complexity}`)
})

test('calculateComplexity increases for CONSTRUCT', () => {
  const selectResult = parseQuery('SELECT ?x WHERE { ?x a :Type }')
  const constructResult = parseQuery('CONSTRUCT { ?x a :Type } WHERE { ?x a :Type }')
  const selectComplexity = calculateComplexity(selectResult)
  const constructComplexity = calculateComplexity(constructResult)
  if (constructComplexity <= selectComplexity) throw new Error('CONSTRUCT not more complex')
})

test('calculateComplexity caps at 100', () => {
  const result = parseQuery('SELECT DISTINCT ?x WHERE { ?x a :Type . FILTER(?x > 10) }')
  const complexity = calculateComplexity(result)
  if (complexity > 100) throw new Error(`Complexity capped incorrectly: ${complexity}`)
})

// Test: Anti-Pattern Detection
test('detectAntiPatterns finds subquery materialization', () => {
  const query = `
    SELECT ?x WHERE {
      ?x a :Type .
      { SELECT ?y WHERE { ?y a :SubType } }
    }
  `
  const result = parseQuery(query)
  const patterns = detectAntiPatterns(query, result)
  if (!patterns.some(p => p.type === 'SUBQUERY_MATERIALIZATION')) {
    throw new Error('Subquery materialization not detected')
  }
})

test('detectAntiPatterns finds unbounded property paths', () => {
  const query = 'SELECT ?x ?ancestor WHERE { ?x :childOf+ ?ancestor }'
  const result = parseQuery(query)
  const patterns = detectAntiPatterns(query, result)
  if (!patterns.some(p => p.type === 'UNBOUNDED_PROPERTY_PATH')) {
    throw new Error('Unbounded property path not detected')
  }
})

test('detectAntiPatterns returns empty for well-formed queries', () => {
  const query = `
    PREFIX perf: <https://gitvan.dev/performance#>
    SELECT ?operation (COUNT(?m) AS ?count) WHERE {
      ?m a perf:Measurement ; perf:operation ?operation .
    }
    GROUP BY ?operation
  `
  const result = parseQuery(query)
  const patterns = detectAntiPatterns(query, result)
  if (patterns.length > 0) throw new Error(`Unexpected patterns found: ${patterns.length}`)
})

// Test: Optimization Generation
test('generateOptimizations recommends HAVING for subqueries', () => {
  const query = `
    CONSTRUCT { ?m a perf:Anomaly }
    WHERE {
      ?m a perf:Measurement ; perf:duration ?d .
      { SELECT ?op (AVG(?duration) AS ?avg) WHERE { } GROUP BY ?op }
      FILTER(?d > ?avg * 1.5)
    }
  `
  const result = parseQuery(query)
  const patterns = detectAntiPatterns(query, result)
  const optimizations = generateOptimizations(query, result, patterns)
  if (!optimizations.some(o => o.description.toLowerCase().includes('having'))) {
    throw new Error('HAVING optimization not recommended')
  }
})

// Test: Profiler Instance
test('createProfiler creates instance with expected methods', () => {
  const profiler = createProfiler()
  if (typeof profiler.profile !== 'function') throw new Error('profile method missing')
  if (typeof profiler.profileBatch !== 'function') throw new Error('profileBatch method missing')
  if (typeof profiler.getStats !== 'function') throw new Error('getStats method missing')
  if (typeof profiler.clear !== 'function') throw new Error('clear method missing')
})

test('profiler.profile returns expected properties', () => {
  const profiler = createProfiler()
  const profile = profiler.profile('SELECT ?x WHERE { ?x a :Type }')
  if (!profile.hash) throw new Error('hash missing')
  if (!profile.parseResult) throw new Error('parseResult missing')
  if (!profile.antiPatterns) throw new Error('antiPatterns missing')
  if (!profile.optimizations) throw new Error('optimizations missing')
  profiler.clear()
})

test('profiler caches results', () => {
  const profiler = createProfiler()
  const query = 'SELECT ?x WHERE { ?x a :Type }'
  profiler.profile(query)
  profiler.profile(query)
  const stats = profiler.getStats()
  if (stats.cacheHits !== 1) throw new Error('Cache not working')
  profiler.clear()
})

test('profiler.profileBatch processes multiple queries', () => {
  const profiler = createProfiler()
  const queries = [
    'SELECT ?x WHERE { ?x a :Type }',
    'SELECT ?y WHERE { ?y a :Type }',
    'CONSTRUCT { ?z a :Type } WHERE { ?z a :Type }',
  ]
  const results = profiler.profileBatch(queries)
  if (results.length !== 3) throw new Error(`Expected 3 results, got ${results.length}`)
  profiler.clear()
})

test('profiler.generateReport creates comprehensive report', () => {
  const profiler = createProfiler()
  const queries = [
    'SELECT ?x WHERE { ?x a :Type }',
    `CONSTRUCT { ?m a perf:Anomaly } WHERE { ?m a perf:Measurement ; perf:duration ?d . { SELECT ?op (AVG(?duration) AS ?avg) WHERE { } GROUP BY ?op } FILTER(?d > ?avg * 1.5) }`,
  ]
  const report = profiler.generateReport(queries)
  if (!report.summary) throw new Error('summary missing')
  if (!report.profiles) throw new Error('profiles missing')
  if (report.summary.queriesAnalyzed !== 2) throw new Error('queriesAnalyzed wrong')
  profiler.clear()
})

// Test: Optimized Query Generation
test('optimizedQueries.anomalyDetectionQueryOptimized generates HAVING query', () => {
  const query = optimizedQueries.anomalyDetectionQueryOptimized()
  if (!query.includes('HAVING')) throw new Error('HAVING clause missing')
  if (!query.includes('GROUP BY')) throw new Error('GROUP BY clause missing')
})

test('optimizedQueries.slowOperationsOptimized includes temporal bucketing', () => {
  const query = optimizedQueries.slowOperationsOptimized('*', null, 'hour')
  if (!query.includes('GROUP BY')) throw new Error('GROUP BY missing')
  if (!query.includes('FLOOR')) throw new Error('FLOOR missing for bucketing')
})

test('optimizedQueries.memoryLeakDetectionOptimized uses HAVING', () => {
  const query = optimizedQueries.memoryLeakDetectionOptimized(7)
  if (!query.includes('HAVING')) throw new Error('HAVING missing')
  if (!query.includes('GROUP BY')) throw new Error('GROUP BY missing')
})

test('optimizedQueries.correlationDiscoveryOptimized aggregates efficiently', () => {
  const query = optimizedQueries.correlationDiscoveryOptimized(0.8)
  if (!query.includes('GROUP BY')) throw new Error('GROUP BY missing')
  if (!query.includes('SQRT')) throw new Error('SQRT missing for std dev')
})

console.log(`\n=== Results ===`)
console.log(`Passed: ${passed}`)
console.log(`Failed: ${failed}`)
console.log(`Total: ${passed + failed}\n`)

process.exit(failed > 0 ? 1 : 0)
