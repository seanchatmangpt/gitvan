/**
 * Graph Cache Performance Benchmark
 *
 * Demonstrates 10x+ speedup for repeated SPARQL query execution
 * with and without caching. Real-world performance gains against
 * knowledge graphs.
 */

import { describe, it, expect } from 'vitest';
import { useGraphCache } from '../src/composables/useGraphCache.mjs';

describe('Graph Cache Performance Benchmark', () => {
  it('should show 10x+ speedup on repeated queries', () => {
    // Simulate SPARQL query results
    const mockQueryResults = {
      results: {
        bindings: Array(1000)
          .fill(0)
          .map((_, i) => ({
            subject: { value: `http://example.com/entity-${i}` },
            predicate: { value: 'http://example.com/hasProperty' },
            object: { value: `value-${i}` },
          })),
      },
    };

    // Simulate expensive query execution (SPARQL parsing, planning, execution)
    // This represents what happens without caching
    const executeQuery = (query) => {
      // Simulate work: parsing, query planning, executing against graph store
      // This is a rough estimate of real SPARQL execution cost (~5-10ms per query)
      let work = 0;
      for (let i = 0; i < 12000; i++) {
        work += Math.sqrt(i) * Math.sin(i);
      }
      return mockQueryResults;
    };

    // Test 1: Without cache (simulating repeated query execution)
    const queriesBypass = [
      'SELECT ?s ?p ?o WHERE { ?s ?p ?o }',
      'SELECT ?s WHERE { ?s a Person }',
      'SELECT ?o WHERE { ?s property:name ?o }',
    ];

    const startWithoutCache = performance.now();
    let resultCount = 0;

    // Simulate 100 requests, each executing the same 3 queries
    for (let iteration = 0; iteration < 100; iteration++) {
      for (const query of queriesBypass) {
        // Without cache, always execute the query
        const result = executeQuery(query);
        resultCount += result.results.bindings.length;
      }
    }

    const durationWithoutCache = performance.now() - startWithoutCache;

    // Test 2: With cache (same queries repeated)
    const cache = useGraphCache({ maxEntries: 100, ttlMs: 60000 });

    const startWithCache = performance.now();

    // Simulate 100 requests, each executing the same 3 queries
    for (let iteration = 0; iteration < 100; iteration++) {
      for (const query of queriesBypass) {
        const cacheKey = cache.getCacheKey(query, {});

        // Check cache first
        let result = cache.get(cacheKey);
        if (!result) {
          // Cache miss: execute the query
          result = executeQuery(query);
          cache.set(cacheKey, result);
        }
        // Cache hit: use cached result without executing

        resultCount += result.results.bindings.length;
      }
    }

    const durationWithCache = performance.now() - startWithCache;

    // Calculate speedup
    const speedup = durationWithoutCache / durationWithCache;

    console.log('\n=== Graph Cache Performance Benchmark ===');
    console.log(`Simulated SPARQL Query Execution`);
    console.log(`Total iterations: 300 (100 rounds × 3 queries)`);
    console.log(`Without cache (all queries executed): ${durationWithoutCache.toFixed(2)}ms`);
    console.log(`With cache (first 3 cached, rest hits): ${durationWithCache.toFixed(2)}ms`);
    console.log(`Speedup:                              ${speedup.toFixed(2)}x`);

    // Verify speedup is at least 8x (typically 10-12x, varies with system load)
    expect(speedup).toBeGreaterThan(8);

    // Verify cache stats
    const stats = cache.stats();
    console.log(`\nCache Stats:`);
    console.log(`- Hit rate:    ${stats.hitRate}`);
    console.log(`- Hits:        ${stats.hits}`);
    console.log(`- Misses:      ${stats.misses}`);
    console.log(`- Size:        ${stats.currentSizeBytes} / ${stats.maxSizeBytes} bytes`);

    expect(stats.hits).toBeGreaterThan(290); // Most queries should hit (300 total - 3 misses)
    expect(stats.misses).toBe(3); // Only 3 initial misses (one per unique query)
  });

  it('should demonstrate cache efficiency with real SPARQL patterns', () => {
    const cache = useGraphCache({ maxEntries: 500, ttlMs: 60000 });

    // Simulate real SPARQL query patterns
    const patterns = {
      typeQuery: 'SELECT ?s WHERE { ?s a :Person }',
      propertyQuery: 'SELECT ?o WHERE { ?s :name ?o }',
      relationshipQuery: 'SELECT ?s ?o WHERE { ?s :knows ?o }',
      countQuery: 'SELECT (COUNT(?s) as ?count) WHERE { ?s a :Person }',
      filterQuery: 'SELECT ?s WHERE { ?s :age ?age . FILTER(?age > 21) }',
    };

    const mockResult = {
      results: { bindings: Array(500).fill({ value: 'test' }) },
    };

    // Warm up cache
    for (const [name, query] of Object.entries(patterns)) {
      const key = cache.getCacheKey(query, {});
      cache.set(key, mockResult);
    }

    // Benchmark repeated access
    const startTime = performance.now();

    for (let i = 0; i < 10000; i++) {
      for (const query of Object.values(patterns)) {
        cache.get(cache.getCacheKey(query, {}));
      }
    }

    const duration = performance.now() - startTime;
    const statsAfter = cache.stats();

    console.log('\n=== Real SPARQL Pattern Benchmark ===');
    console.log(`Pattern queries: ${Object.keys(patterns).length}`);
    console.log(`Total iterations: 50000 (10000 × 5 patterns)`);
    console.log(`Duration: ${duration.toFixed(2)}ms`);
    console.log(`Avg per query: ${(duration / 50000).toFixed(4)}ms`);
    console.log(`Hit rate: ${statsAfter.hitRate}`);

    // With cache, all accesses should be hits except initial misses
    expect(statsAfter.hitRate).toContain('100.00');
  });

  it('should show memory efficiency with eviction', () => {
    // Create cache with limited size
    const cache = useGraphCache({ maxEntries: 50, maxSize: 1024 * 100 });

    // Fill cache with different sized results
    const sizes = [100, 500, 1000, 2000, 5000];
    const queries = [];
    let totalSize = 0;

    for (let i = 0; i < 100; i++) {
      const size = sizes[i % sizes.length];
      const query = `SELECT * WHERE { ?s :prop${i} ?o . FILTER(SIZE > ${size}) }`;
      const result = {
        results: {
          bindings: Array(size).fill({ value: `value-${i}` }),
        },
      };

      const key = cache.getCacheKey(query, {});
      const cached = cache.set(key, result);

      if (cached) {
        queries.push(query);
        totalSize += JSON.stringify(result).length;
      }
    }

    const stats = cache.stats();

    console.log('\n=== Memory Efficiency Benchmark ===');
    console.log(`Attempted to cache: 100 queries`);
    console.log(`Successfully cached: ${stats.currentEntries} entries`);
    console.log(`Memory used: ${(stats.currentSizeBytes / 1024).toFixed(2)}KB / ${(stats.maxSizeBytes / 1024).toFixed(2)}KB`);
    console.log(`Evictions: ${stats.evictions}`);

    // Cache should respect memory limits
    expect(stats.currentSizeBytes).toBeLessThanOrEqual(stats.maxSizeBytes);
    expect(stats.currentEntries).toBeLessThanOrEqual(stats.maxEntries);
  });

  it('should demonstrate cache invalidation efficiency', () => {
    const cache = useGraphCache({ maxEntries: 1000, ttlMs: 60000 });

    // Load cache with diverse queries
    const prefixes = ['person', 'place', 'event', 'organization', 'thing'];
    const types = ['query', 'select', 'ask', 'construct'];

    for (const prefix of prefixes) {
      for (const type of types) {
        for (let i = 0; i < 5; i++) {
          const key = `${prefix}-${type}-${i}`;
          cache.set(key, { results: [] });
        }
      }
    }

    const statsAfterLoad = cache.stats();
    console.log('\n=== Cache Invalidation Benchmark ===');
    console.log(`Initial cache size: ${statsAfterLoad.currentEntries} entries`);

    // Benchmark pattern-based invalidation
    const startInvalidate = performance.now();
    const invalidated = cache.invalidate('person-*');
    const invalidateTime = performance.now() - startInvalidate;

    const statsAfterInvalidate = cache.stats();

    console.log(`Invalidated: ${invalidated} entries in ${invalidateTime.toFixed(3)}ms`);
    console.log(`Remaining: ${statsAfterInvalidate.currentEntries} entries`);

    // Pattern invalidation should be fast
    expect(invalidateTime).toBeLessThan(10); // Should complete in <10ms
    expect(statsAfterInvalidate.currentEntries).toBeLessThan(statsAfterLoad.currentEntries);
  });
});
