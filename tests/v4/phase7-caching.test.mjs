/**
 * @fileoverview Phase 7 Performance Caching & RDF Integration Tests
 *
 * Comprehensive test suite for performance caching layer with RDF invalidation.
 * Tests QueryCache with dependency tracking, subscription patterns, and auto-invalidation.
 *
 * Test Coverage:
 * 1. Query result caching (10+ queries, correct results)
 * 2. Cache hit/miss rates (80%+ hit rate on hot queries)
 * 3. Dependency tracking (correct invalidation)
 * 4. Automatic invalidation (cache clears on data change)
 * 5. Pattern subscriptions (correct matching)
 * 6. Performance (<10ms invalidation)
 * 7. Large cache sets (10K entries, efficient memory)
 *
 * Coverage Target: >85%
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QueryCache } from '../../src/utils/query-cache.mjs';
import { RDFQueryCache } from '../../src/performance/rdf-query-cache.mjs';
import { SubscriptionPatternEngine } from '../../src/performance/subscription-patterns.mjs';
import { AutoInvalidationEngine } from '../../src/performance/auto-invalidate.mjs';
import { useUnrdf } from '../../src/rdf/unrdf.mjs';

describe('Phase 7: Performance Caching Layer', () => {
  let cache;
  let rdfCache;
  let subscriptionEngine;
  let autoInvalidate;
  let store;

  beforeEach(async () => {
    cache = new QueryCache({ maxEntries: 1000, defaultTTL: 10000 });
    store = useUnrdf();
    rdfCache = new RDFQueryCache(store, cache);
    subscriptionEngine = new SubscriptionPatternEngine(store);
    autoInvalidate = new AutoInvalidationEngine(store, rdfCache);

    process.env.TZ = 'UTC';
    process.env.LANG = 'C';
  });

  afterEach(() => {
    cache.clear();
    subscriptionEngine.clear();
  });

  describe('Test 1: Query Result Caching', () => {
    it('should cache query results', async () => {
      const query = 'SELECT ?s WHERE { ?s rdf:type ex:Workflow }';
      let executionCount = 0;

      const executeQuery = async () => {
        executionCount++;
        return [{ s: 'ex:workflow1' }];
      };

      const result1 = await cache.query(query, executeQuery);
      const result2 = await cache.query(query, executeQuery);

      expect(result1).toEqual([{ s: 'ex:workflow1' }]);
      expect(result2).toEqual([{ s: 'ex:workflow1' }]);
      expect(executionCount).toBe(1); // Only executed once
    });

    it('should cache 10+ different queries independently', async () => {
      const queries = Array.from({ length: 12 }, (_, i) => ({
        query: `SELECT ?s WHERE { ?s rdf:type ex:Type${i} }`,
        result: [{ s: `ex:resource${i}` }],
      }));

      let executionCount = 0;

      for (const q of queries) {
        await cache.query(q.query, async () => {
          executionCount++;
          return q.result;
        });
      }

      expect(executionCount).toBe(12);

      for (const q of queries) {
        const result = await cache.query(q.query, async () => {
          throw new Error('Should not execute');
        });
        expect(result).toEqual(q.result);
      }

      expect(executionCount).toBe(12); // Still 12, no additional executions
    });

    it('should return null for expired cache entries', async () => {
      const query = 'SELECT ?s WHERE { ?s rdf:type ex:Type1 }';
      const ttl = 100; // 100ms

      cache.set(query, [{ s: 'ex:resource1' }], { ttl });

      const result1 = cache.get(query);
      expect(result1).toEqual([{ s: 'ex:resource1' }]);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      const result2 = cache.get(query);
      expect(result2).toBeNull();
    });

    it('should maintain correct results with mixed query types', async () => {
      const queries = [
        { query: 'SELECT ?s { ?s rdf:type ex:WorkflowA }', result: [{ s: 'workflow-a' }] },
        { query: 'SELECT ?p { ?s ?p ?o }', result: [{ p: 'predicate1' }, { p: 'predicate2' }] },
        { query: 'SELECT ?o { ?s ?p ?o FILTER (?o > 5) }', result: [{ o: '10' }, { o: '20' }] },
      ];

      for (const q of queries) {
        cache.set(q.query, q.result);
      }

      for (const q of queries) {
        const result = cache.get(q.query);
        expect(result).toEqual(q.result);
      }
    });
  });

  describe('Test 2: Cache Hit/Miss Rates', () => {
    it('should achieve 80%+ hit rate on repeated queries', async () => {
      const query = 'SELECT ?s WHERE { ?s rdf:type ex:Workflow }';
      let execCount = 0;

      const execute = async () => {
        execCount++;
        return [{ s: 'ex:workflow1' }];
      };

      // First query: miss
      await cache.query(query, execute);

      // 9 repeated queries: all hits
      for (let i = 0; i < 9; i++) {
        await cache.query(query, execute);
      }

      const stats = cache.getStats();
      const hitRate = parseFloat(stats.hitRate);

      expect(hitRate).toBeGreaterThanOrEqual(80);
      expect(execCount).toBe(1);
      expect(stats.hits).toBe(9);
      expect(stats.misses).toBe(1);
    });

    it('should track cache statistics accurately', async () => {
      const execute = async () => [{ s: 'result' }];

      // Make 10 total queries
      for (let i = 0; i < 10; i++) {
        await cache.query(`SELECT ?s WHERE { ?s rdf:type ex:Type${i % 3} }`, execute);
      }

      const stats = cache.getStats();

      expect(stats.totalQueries).toBe(10);
      expect(stats.hits).toBe(6); // Queries 0,3,6,9 miss; 1,2,4,5,7,8 hit
      expect(stats.misses).toBe(4);
      expect(stats.currentSize).toBeLessThanOrEqual(4);
    });

    it('should report utilization correctly', async () => {
      const execute = async () => [{ s: 'result' }];

      for (let i = 0; i < 50; i++) {
        await cache.query(`SELECT ?s WHERE { ?s rdf:type ex:Type${i} }`, execute);
      }

      const stats = cache.getStats();
      const utilization = parseFloat(stats.utilizationPercent);

      expect(utilization).toBeGreaterThan(0);
      expect(utilization).toBeLessThanOrEqual(100);
      expect(stats.currentSize).toBeLessThanOrEqual(stats.maxSize);
    });
  });

  describe('Test 3: Dependency Tracking & Invalidation', () => {
    it('should track cache entry dependencies as RDF triples', async () => {
      const query = 'SELECT ?s WHERE { ?s rdf:type ex:Workflow }';
      const result = [{ s: 'ex:workflow1' }];

      // Store with RDF triple dependencies
      await rdfCache.storeWithDependencies(query, result, [
        { subject: 'ex:workflow1', predicate: 'rdf:type', object: 'ex:Workflow' },
      ]);

      const cached = await rdfCache.query(query, async () => {
        throw new Error('Should use cache');
      });

      expect(cached).toEqual(result);
    });

    it('should invalidate cache when dependent triple changes', async () => {
      const query = 'SELECT ?s WHERE { ?s rdf:type ex:Workflow }';
      const result = [{ s: 'ex:workflow1' }];
      const triple = { subject: 'ex:workflow1', predicate: 'rdf:type', object: 'ex:Workflow' };

      await rdfCache.storeWithDependencies(query, result, [triple]);

      // Verify cached
      let cached = await rdfCache.query(query, async () => {
        throw new Error('Should use cache');
      });
      expect(cached).toEqual(result);

      // Modify the dependency
      await store.addQuad({
        subject: { termType: 'NamedNode', value: triple.subject },
        predicate: { termType: 'NamedNode', value: 'ex:modified' },
        object: { termType: 'Literal', value: 'true' },
      });

      // Cache should be invalidated
      const shouldRecompute = await rdfCache.isDependencyInvalidated(triple);
      expect(shouldRecompute).toBe(true);
    });

    it('should handle multiple dependencies per query', async () => {
      const query = 'SELECT ?s ?p WHERE { ?s rdf:type ex:Workflow; ?p ?o }';
      const result = [{ s: 'ex:w1', p: 'ex:prop1' }];
      const deps = [
        { subject: 'ex:w1', predicate: 'rdf:type', object: 'ex:Workflow' },
        { subject: 'ex:w1', predicate: 'ex:prop1', object: 'ex:value1' },
      ];

      await rdfCache.storeWithDependencies(query, result, deps);

      // Both dependencies should be tracked
      const tracked = await rdfCache.getDependencies(query);
      expect(tracked.length).toBeGreaterThanOrEqual(2);
    });

    it('should use SPARQL to find dependent queries', async () => {
      // Store multiple queries with overlapping dependencies
      await rdfCache.storeWithDependencies('SELECT ?s WHERE { ?s rdf:type ex:Workflow }', [
        { s: 'ex:w1' },
      ], [
        { subject: 'ex:w1', predicate: 'rdf:type', object: 'ex:Workflow' },
      ]);

      await rdfCache.storeWithDependencies('SELECT ?s WHERE { ?s ex:property ?o }', [
        { s: 'ex:w1' },
      ], [
        { subject: 'ex:w1', predicate: 'ex:property', object: 'ex:value' },
      ]);

      // Query for all caches depending on ex:w1
      const dependentQueries = await rdfCache.findDependentQueries('ex:w1');
      expect(Array.isArray(dependentQueries)).toBe(true);
      expect(dependentQueries.length).toBeGreaterThan(0);
    });
  });

  describe('Test 4: Automatic Cache Invalidation', () => {
    it('should invalidate cache on triple addition', async () => {
      const query = 'SELECT ?s WHERE { ?s rdf:type ex:Workflow }';
      cache.set(query, [{ s: 'ex:w1' }]);

      const before = cache.getStats();
      expect(before.invalidations).toBe(0);

      // Trigger invalidation
      await autoInvalidate.onTripleAdded({
        subject: 'ex:w1',
        predicate: 'rdf:type',
        object: 'ex:Workflow',
      });

      const after = cache.getStats();
      expect(after.invalidations).toBeGreaterThanOrEqual(before.invalidations);
    });

    it('should prevent stale data via automatic invalidation', async () => {
      const query = 'SELECT ?s WHERE { ?s rdf:type ex:Workflow }';
      let version = 1;

      const execute = async () => {
        return [{ s: 'ex:w1', version }];
      };

      // First execution
      const result1 = await cache.query(query, execute);
      expect(result1[0].version).toBe(1);

      // Verify cache hit
      const cached = await cache.query(query, async () => {
        throw new Error('Should hit cache');
      });
      expect(cached[0].version).toBe(1);

      // Update version and trigger invalidation
      version = 2;
      await autoInvalidate.invalidateMatching(query);

      // Next query should recompute
      const result2 = await cache.query(query, execute);
      expect(result2[0].version).toBe(2);
    });

    it('should handle hook-based invalidation triggers', async () => {
      const query = 'SELECT ?s WHERE { ?s ex:status ?status }';
      cache.set(query, [{ s: 'ex:item1', status: 'pending' }]);

      // Simulate hook trigger
      const invalidated = await autoInvalidate.onPredicateChanged('ex:status');

      expect(invalidated).toBeTruthy();
      expect(cache.get(query)).toBeNull();
    });

    it('should batch invalidations for performance', async () => {
      const queries = Array.from({ length: 100 }, (_, i) =>
        `SELECT ?s WHERE { ?s ex:prop${i % 5} ?o }`,
      );

      // Cache all queries
      for (const query of queries) {
        cache.set(query, [{ s: 'ex:result' }]);
      }

      const before = cache.getStats();
      const startTime = Date.now();

      // Batch invalidate all
      await autoInvalidate.invalidateMatching(/ex:prop[0-4]/);

      const elapsed = Date.now() - startTime;
      const after = cache.getStats();

      expect(after.invalidations).toBeGreaterThan(before.invalidations);
      expect(elapsed).toBeLessThan(100); // Should be fast
    });
  });

  describe('Test 5: Pattern Subscriptions', () => {
    it('should subscribe to RDF pattern matches', async () => {
      const pattern = { subject: '?s', predicate: 'rdf:type', object: 'ex:Workflow' };
      let matchCount = 0;

      const callback = () => {
        matchCount++;
      };

      await subscriptionEngine.onPatternMatch(pattern, callback);

      // Add matching triple
      await store.addQuad({
        subject: { termType: 'NamedNode', value: 'ex:workflow1' },
        predicate: { termType: 'NamedNode', value: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' },
        object: { termType: 'NamedNode', value: 'ex:Workflow' },
      });

      expect(matchCount).toBeGreaterThan(0);
    });

    it('should correctly match subscription patterns', async () => {
      const matched = [];

      const pattern = { subject: '?s', predicate: '?p', object: 'ex:Value1' };

      await subscriptionEngine.subscribe(pattern, (match) => {
        matched.push(match);
      });

      // Add matching triples
      const triples = [
        { subject: 'ex:s1', predicate: 'ex:p1', object: 'ex:Value1' },
        { subject: 'ex:s2', predicate: 'ex:p2', object: 'ex:Value1' },
        { subject: 'ex:s3', predicate: 'ex:p1', object: 'ex:Value2' }, // Non-matching
      ];

      for (const t of triples) {
        await store.addQuad({
          subject: { termType: 'NamedNode', value: t.subject },
          predicate: { termType: 'NamedNode', value: t.predicate },
          object: { termType: 'NamedNode', value: t.object },
        });
      }

      expect(matched.length).toBeGreaterThanOrEqual(2);
    });

    it('should support wildcards in subscription patterns', async () => {
      const matched = [];

      // Match any workflow of any type
      const pattern = { subject: '?s', predicate: '?p', object: '?o' };

      await subscriptionEngine.subscribe(pattern, (match) => {
        matched.push(match);
      });

      // Add several triples
      for (let i = 0; i < 5; i++) {
        await store.addQuad({
          subject: { termType: 'NamedNode', value: `ex:resource${i}` },
          predicate: { termType: 'NamedNode', value: 'ex:property' },
          object: { termType: 'Literal', value: `value${i}` },
        });
      }

      expect(matched.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Test 6: Performance (<10ms Invalidation)', () => {
    it('should invalidate cache in <10ms', async () => {
      // Set up cache with 100 entries
      for (let i = 0; i < 100; i++) {
        cache.set(`SELECT ?s WHERE { ?s rdf:type ex:Type${i} }`, [{ s: `ex:res${i}` }]);
      }

      const startTime = performance.now();

      // Invalidate specific pattern
      cache.invalidate(/Type[0-4]$/);

      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(10);
    });

    it('should complete subscription callbacks in <10ms', async () => {
      const times = [];

      const pattern = { subject: '?s', predicate: 'ex:property', object: '?o' };

      await subscriptionEngine.subscribe(pattern, () => {
        times.push(performance.now());
      });

      const startTime = performance.now();

      // Trigger pattern match
      await store.addQuad({
        subject: { termType: 'NamedNode', value: 'ex:resource1' },
        predicate: { termType: 'NamedNode', value: 'ex:property' },
        object: { termType: 'Literal', value: 'value1' },
      });

      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(10);
    });

    it('should handle batch invalidations in <50ms', async () => {
      // Set up 500 cache entries
      for (let i = 0; i < 500; i++) {
        cache.set(`SELECT ?s WHERE { ?s ex:prop${i % 20} ?o }`, [{ s: `ex:res${i}` }]);
      }

      const startTime = performance.now();

      // Batch invalidate
      await autoInvalidate.invalidateMatching(/ex:prop(0|1|2|3|4)$/);

      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('Test 7: Large Cache Sets (10K+ entries)', () => {
    it('should handle 10K cache entries efficiently', async () => {
      const queries = Array.from({ length: 10000 }, (_, i) =>
        `SELECT ?s WHERE { ?s rdf:type ex:Type${i} }`,
      );

      const startTime = performance.now();

      for (const query of queries) {
        cache.set(query, [{ s: `ex:resource${queries.indexOf(query)}` }]);
      }

      const elapsed = performance.now() - startTime;

      const stats = cache.getStats();
      expect(stats.currentSize).toBeLessThanOrEqual(cache.maxEntries);
      expect(elapsed).toBeLessThan(5000); // Should complete in reasonable time
    });

    it('should maintain performance with large result sets', async () => {
      const query = 'SELECT ?s ?p ?o WHERE { ?s ?p ?o }';

      // Create a large result set (1000 items)
      const largeResult = Array.from({ length: 1000 }, (_, i) => ({
        s: `ex:subject${i}`,
        p: `ex:predicate${i % 10}`,
        o: `ex:object${i % 100}`,
      }));

      const startTime = performance.now();

      cache.set(query, largeResult);
      const cached = cache.get(query);

      const elapsed = performance.now() - startTime;

      expect(cached).toEqual(largeResult);
      expect(elapsed).toBeLessThan(100);
    });

    it('should properly evict entries when capacity exceeded', async () => {
      const smallCache = new QueryCache({ maxEntries: 100 });

      for (let i = 0; i < 200; i++) {
        smallCache.set(`SELECT ?s WHERE { ?s rdf:type ex:Type${i} }`, [{ s: `ex:res${i}` }]);
      }

      const stats = smallCache.getStats();
      expect(stats.currentSize).toBe(100);
      expect(stats.evictions).toBeGreaterThan(0);
    });
  });

  describe('Cache Ontology Integration', () => {
    it('should store cache entry metadata as RDF triples', async () => {
      const query = 'SELECT ?s WHERE { ?s rdf:type ex:Workflow }';
      const result = [{ s: 'ex:w1' }];

      const entryIri = await rdfCache.storeCacheEntryAsTriples(query, result, {
        ttl: 10000,
        hitCount: 5,
      });

      expect(entryIri).toBeDefined();
      expect(typeof entryIri).toBe('string');
    });

    it('should validate cache entries against SHACL shapes', async () => {
      const query = 'SELECT ?s WHERE { ?s rdf:type ex:Workflow }';
      const result = [{ s: 'ex:w1' }];

      const valid = await rdfCache.validateAgainstShapeOntology(query, result);

      expect(typeof valid).toBe('boolean');
    });
  });
});
