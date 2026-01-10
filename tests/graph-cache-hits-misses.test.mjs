/**
 * Graph Cache Hits/Misses Tests
 *
 * Tests cache hit/miss tracking and statistics collection.
 * Verifies that statistics accurately reflect cache performance.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useGraphCache } from '../src/composables/useGraphCache.mjs';

describe('Graph Cache Hits and Misses', () => {
  let cache;

  beforeEach(() => {
    cache = useGraphCache({ maxEntries: 100, ttlMs: 60000 });
  });

  it('should track cache hits', () => {
    const key = cache.getCacheKey('SELECT ?s WHERE { ?s a :Person }', {});
    cache.set(key, { results: [{ s: 'person1' }] });

    cache.get(key);
    cache.get(key);
    cache.get(key);

    const stats = cache.stats();
    expect(stats.hits).toBe(3);
  });

  it('should track cache misses', () => {
    cache.get('nonexistent-key-1');
    cache.get('nonexistent-key-2');
    cache.get('nonexistent-key-3');

    const stats = cache.stats();
    expect(stats.misses).toBe(3);
  });

  it('should calculate hit rate correctly', () => {
    const key = 'test-key';
    cache.set(key, { data: 'value' });

    // 3 hits
    cache.get(key);
    cache.get(key);
    cache.get(key);

    // 2 misses
    cache.get('miss-1');
    cache.get('miss-2');

    const stats = cache.stats();
    // 3 / (3 + 2) = 60%
    expect(stats.hitRate).toContain('60.00');
  });

  it('should track hits from different keys separately', () => {
    const key1 = 'query-1';
    const key2 = 'query-2';

    cache.set(key1, { result: 1 });
    cache.set(key2, { result: 2 });

    cache.get(key1);
    cache.get(key1);
    cache.get(key2);

    const stats = cache.stats();
    expect(stats.hits).toBe(3);
  });

  it('should return 0 hit rate when no accesses', () => {
    const stats = cache.stats();
    expect(stats.hitRate).toBe('0.00%');
  });

  it('should return 100 hit rate with only hits', () => {
    const key = 'test-key';
    cache.set(key, { data: 'value' });

    cache.get(key);
    cache.get(key);
    cache.get(key);

    const stats = cache.stats();
    expect(stats.hitRate).toBe('100.00%');
  });

  it('should track independent stats per cache instance', () => {
    const cache1 = useGraphCache({ maxEntries: 100, ttlMs: 60000 });
    const cache2 = useGraphCache({ maxEntries: 100, ttlMs: 60000 });

    const key = 'shared-query';
    cache1.set(key, { value: 1 });
    cache2.set(key, { value: 2 });

    cache1.get(key);
    cache1.get(key);
    cache2.get(key);

    const stats1 = cache1.stats();
    const stats2 = cache2.stats();

    expect(stats1.hits).toBe(2);
    expect(stats2.hits).toBe(1);
  });

  it('should count miss when key does not exist', () => {
    cache.set('key-1', { data: 'value' });

    cache.get('key-1'); // hit
    cache.get('key-2'); // miss
    cache.get('key-3'); // miss

    const stats = cache.stats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(2);
  });

  it('should accurately reflect hit rate with large number of operations', () => {
    const key = 'popular-query';
    cache.set(key, { results: [] });

    // Perform 100 gets on same key (all hits)
    for (let i = 0; i < 100; i++) {
      cache.get(key);
    }

    // Perform 25 misses
    for (let i = 0; i < 25; i++) {
      cache.get(`miss-${i}`);
    }

    const stats = cache.stats();
    // 100 / (100 + 25) = 80%
    expect(stats.hitRate).toContain('80.00');
  });

  it('should show zero stats after clear', () => {
    const key = 'test-key';
    cache.set(key, { data: 'value' });
    cache.get(key);
    cache.get(key);

    cache.clear();

    const stats = cache.stats();
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
    expect(stats.hitRate).toBe('0.00%');
  });

  it('should track hit ratio across multiple keys', () => {
    // Set up cache with 10 keys
    for (let i = 0; i < 10; i++) {
      cache.set(`key-${i}`, { result: i });
    }

    // Access each key multiple times
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 5; j++) {
        cache.get(`key-${i}`);
      }
    }

    // Miss on non-existent keys
    for (let i = 0; i < 10; i++) {
      cache.get(`nonexistent-${i}`);
    }

    const stats = cache.stats();
    // 50 hits / (50 + 10) = 83.33%
    expect(stats.hits).toBe(50);
    expect(stats.misses).toBe(10);
    expect(stats.hitRate).toContain('83.33');
  });

  it('should track both access pattern metrics', () => {
    const key1 = 'sparse-key';
    const key2 = 'popular-key';

    cache.set(key1, { data: 1 });
    cache.set(key2, { data: 2 });

    cache.get(key1); // 1 hit
    for (let i = 0; i < 9; i++) {
      cache.get(key2); // 9 hits
    }

    // 3 misses
    cache.get('miss-1');
    cache.get('miss-2');
    cache.get('miss-3');

    const stats = cache.stats();
    expect(stats.hits).toBe(10);
    expect(stats.misses).toBe(3);
  });
});
