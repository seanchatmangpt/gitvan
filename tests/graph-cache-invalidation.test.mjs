/**
 * Graph Cache Invalidation Tests
 *
 * Tests cache invalidation with wildcard patterns, specific key removal,
 * and bulk invalidation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useGraphCache } from '../src/composables/useGraphCache.mjs';

describe('Graph Cache Invalidation', () => {
  let cache;

  beforeEach(() => {
    cache = useGraphCache({ maxEntries: 100, ttlMs: 60000 });
  });

  it('should clear entire cache with wildcard pattern', () => {
    for (let i = 0; i < 10; i++) {
      cache.set(`query-${i}`, { result: i });
    }

    cache.invalidate('*');

    const stats = cache.stats();
    expect(stats.currentEntries).toBe(0);
  });

  it('should invalidate all entries and track invalidations', () => {
    cache.set('key-1', { data: 1 });
    cache.set('key-2', { data: 2 });
    cache.set('key-3', { data: 3 });

    const invalidated = cache.invalidate('*');

    expect(invalidated).toBe(3);
    const stats = cache.stats();
    expect(stats.invalidations).toBe(3);
  });

  it('should invalidate entries matching exact key', () => {
    cache.set('query-1', { data: 1 });
    cache.set('query-2', { data: 2 });
    cache.set('query-3', { data: 3 });

    const invalidated = cache.invalidate('query-1');

    expect(invalidated).toBe(1);
    expect(cache.get('query-1')).toBeNull();
    expect(cache.get('query-2')).not.toBeNull();
    expect(cache.get('query-3')).not.toBeNull();
  });

  it('should invalidate entries with prefix wildcard', () => {
    cache.set('sparql-query-1', { type: 'select' });
    cache.set('sparql-query-2', { type: 'select' });
    cache.set('sparql-ask-1', { type: 'ask' });
    cache.set('construct-query-1', { type: 'construct' });

    const invalidated = cache.invalidate('sparql-*');

    expect(invalidated).toBe(3);
    expect(cache.get('sparql-query-1')).toBeNull();
    expect(cache.get('sparql-query-2')).toBeNull();
    expect(cache.get('sparql-ask-1')).toBeNull();
    expect(cache.get('construct-query-1')).not.toBeNull();
  });

  it('should invalidate entries with suffix wildcard', () => {
    cache.set('query-1-select', { type: 'select' });
    cache.set('query-2-select', { type: 'select' });
    cache.set('query-3-ask', { type: 'ask' });

    const invalidated = cache.invalidate('*-select');

    expect(invalidated).toBe(2);
    expect(cache.get('query-1-select')).toBeNull();
    expect(cache.get('query-2-select')).toBeNull();
    expect(cache.get('query-3-ask')).not.toBeNull();
  });

  it('should invalidate entries with middle wildcard', () => {
    cache.set('select-person-query', { data: 1 });
    cache.set('select-place-query', { data: 2 });
    cache.set('construct-person-query', { data: 3 });
    cache.set('select-person-ask', { data: 4 });

    const invalidated = cache.invalidate('select-*-query');

    expect(invalidated).toBe(2);
    expect(cache.get('select-person-query')).toBeNull();
    expect(cache.get('select-place-query')).toBeNull();
    expect(cache.get('construct-person-query')).not.toBeNull();
  });

  it('should support no-match patterns', () => {
    cache.set('query-1', { data: 1 });
    cache.set('query-2', { data: 2 });

    const invalidated = cache.invalidate('nonexistent-*');

    expect(invalidated).toBe(0);
    expect(cache.get('query-1')).not.toBeNull();
    expect(cache.get('query-2')).not.toBeNull();
  });

  it('should track memory cleanup on invalidation', () => {
    const largeValue = { results: Array(100).fill({ value: 'x'.repeat(100) }) };

    cache.set('large-query-1', largeValue);
    cache.set('large-query-2', largeValue);
    cache.set('other-query', { value: 'small' });

    const statsBeforeInvalidate = cache.stats();
    const sizeBeforeInvalidate = statsBeforeInvalidate.currentSizeBytes;

    cache.invalidate('large-*');

    const statsAfterInvalidate = cache.stats();
    const sizeAfterInvalidate = statsAfterInvalidate.currentSizeBytes;

    expect(sizeAfterInvalidate).toBeLessThan(sizeBeforeInvalidate);
    expect(statsAfterInvalidate.currentEntries).toBe(1);
  });

  it('should return count of invalidated entries', () => {
    for (let i = 0; i < 5; i++) {
      cache.set(`key-${i}`, { data: i });
    }

    const count = cache.invalidate('key-*');
    expect(count).toBe(5);
  });

  it('should handle overlapping patterns correctly', () => {
    cache.set('sparql-select-query', { type: 'select' });
    cache.set('sparql-select-ask', { type: 'ask' });
    cache.set('sparql-construct-query', { type: 'construct' });

    // Invalidate all sparql-select-*
    let invalidated = cache.invalidate('sparql-select-*');
    expect(invalidated).toBe(2);

    // Verify remaining
    expect(cache.get('sparql-construct-query')).not.toBeNull();
  });

  it('should preserve entries not matching pattern', () => {
    cache.set('person-query-1', { data: 1 });
    cache.set('person-query-2', { data: 2 });
    cache.set('place-query-1', { data: 3 });
    cache.set('event-query-1', { data: 4 });

    cache.invalidate('person-*');

    expect(cache.get('person-query-1')).toBeNull();
    expect(cache.get('person-query-2')).toBeNull();
    expect(cache.get('place-query-1')).not.toBeNull();
    expect(cache.get('event-query-1')).not.toBeNull();
  });

  it('should support cache invalidation on graph mutations', () => {
    const queryCache = 'SELECT * WHERE { ?s ?p ?o }';

    cache.set(queryCache, { results: [] });

    // Simulate graph mutation - invalidate all SPARQL results
    const invalidated = cache.invalidate('*');

    expect(invalidated).toBe(1);
    expect(cache.get(queryCache)).toBeNull();
  });

  it('should handle case-sensitive pattern matching', () => {
    cache.set('Query-1', { data: 1 });
    cache.set('query-2', { data: 2 });

    cache.invalidate('Query-*');

    expect(cache.get('Query-1')).toBeNull();
    expect(cache.get('query-2')).not.toBeNull();
  });

  it('should reset stats after invalidation', () => {
    cache.set('key-1', { data: 1 });
    cache.get('key-1'); // hit

    cache.invalidate('*');

    const stats = cache.stats();
    expect(stats.currentEntries).toBe(0);
    expect(stats.totalSizeBytes).toBe(0);
  });

  it('should support wildcard at start, middle, and end', () => {
    cache.set('aabbcc', { data: 1 });
    cache.set('aabbdd', { data: 2 });
    cache.set('xxbbcc', { data: 3 });

    // Test *cc pattern (suffix)
    let invalidated = cache.invalidate('*cc');
    expect(invalidated).toBe(2);

    // Reset
    cache.clear();

    cache.set('aabbcc', { data: 1 });
    cache.set('aabbdd', { data: 2 });
    cache.set('aaxxcc', { data: 3 });

    // Test aa* pattern (prefix)
    invalidated = cache.invalidate('aa*');
    expect(invalidated).toBe(3);
  });
});
