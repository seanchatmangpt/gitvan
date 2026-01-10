/**
 * Graph Cache TTL Expiration Tests
 *
 * Tests that the cache correctly expires entries after TTL period
 * and that expired entries are not returned from cache.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGraphCache } from '../src/composables/useGraphCache.mjs';

describe('Graph Cache TTL Expiration', () => {
  let cache;

  beforeEach(() => {
    // Create cache with 100ms TTL for fast testing
    cache = useGraphCache({ maxEntries: 100, ttlMs: 100 });
  });

  it('should return cached value before TTL expires', () => {
    const key = cache.getCacheKey('SELECT * WHERE { ?s ?p ?o }', {});
    const value = { results: [{ s: 'http://example.com/subject' }] };

    cache.set(key, value);
    const retrieved = cache.get(key);

    expect(retrieved).toEqual(value);
  });

  it('should return null for expired entries', async () => {
    const key = cache.getCacheKey('SELECT * WHERE { ?s ?p ?o }', {});
    const value = { results: [] };

    cache.set(key, value);

    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 150));

    const retrieved = cache.get(key);
    expect(retrieved).toBeNull();
  });

  it('should update entry timestamp on set', async () => {
    const key = 'test-key';
    cache.set(key, { data: 'value1' });

    // Wait 50ms (half TTL)
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Set again with new value
    cache.set(key, { data: 'value2' });

    // Wait another 50ms (another half TTL)
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should still be there because we reset the timestamp
    const retrieved = cache.get(key);
    expect(retrieved).not.toBeNull();
    expect(retrieved.data).toBe('value2');
  });

  it('should report misses for expired entries', async () => {
    const key = cache.getCacheKey('SELECT ?s WHERE { ?s ?p ?o }', {});
    cache.set(key, { results: [] });

    const statsAfterSet = cache.stats();
    const hitsBeforeExpire = statsAfterSet.hits;

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Try to get expired entry
    cache.get(key);

    const statsAfterExpire = cache.stats();
    expect(statsAfterExpire.misses).toBeGreaterThan(0);
  });

  it('should clean up memory when entries expire', async () => {
    const key1 = cache.getCacheKey('query1', {});
    const key2 = cache.getCacheKey('query2', {});

    const largeData = { results: Array(100).fill({ value: 'x'.repeat(100) }) };

    cache.set(key1, largeData);
    cache.set(key2, largeData);

    const statsBeforeExpire = cache.stats();
    const sizeBeforeExpire = statsBeforeExpire.currentSizeBytes;

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Access expired entries to trigger cleanup
    cache.get(key1);
    cache.get(key2);

    const statsAfterExpire = cache.stats();
    expect(statsAfterExpire.currentSizeBytes).toBeLessThan(sizeBeforeExpire);
  });

  it('should handle mixed expired and active entries', async () => {
    const key1 = 'old-query';
    const key2 = 'new-query';

    cache.set(key1, { data: 'old' });

    // Wait for first entry to expire
    await new Promise((resolve) => setTimeout(resolve, 120));

    cache.set(key2, { data: 'new' });

    // Old entry should be expired
    expect(cache.get(key1)).toBeNull();

    // New entry should still be active
    expect(cache.get(key2)).not.toBeNull();
  });

  it('should not return expired entries in stats', async () => {
    for (let i = 0; i < 5; i++) {
      cache.set(`key-${i}`, { data: i });
    }

    let stats = cache.stats();
    expect(stats.currentEntries).toBe(5);

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Access all expired entries
    for (let i = 0; i < 5; i++) {
      cache.get(`key-${i}`);
    }

    stats = cache.stats();
    // Entries should be cleaned up from memory
    expect(stats.currentEntries).toBe(0);
  });

  it('should respect different TTL for different cache instances', async () => {
    const cache1 = useGraphCache({ maxEntries: 100, ttlMs: 150 });
    const cache2 = useGraphCache({ maxEntries: 100, ttlMs: 200 });

    const key = 'shared-key';
    cache1.set(key, { value: 1 });
    cache2.set(key, { value: 2 });

    // Wait 160ms
    await new Promise((resolve) => setTimeout(resolve, 160));

    // cache1 should be expired, cache2 should not
    expect(cache1.get(key)).toBeNull();
    expect(cache2.get(key)).not.toBeNull();
  });

  it('should continue expiring entries during extended cache usage', async () => {
    cache.set('key-1', { data: 1 });
    expect(cache.get('key-1')).not.toBeNull();

    // Wait 50ms
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Add more entries
    cache.set('key-2', { data: 2 });
    cache.set('key-3', { data: 3 });

    // key-1 is now 50ms old
    expect(cache.get('key-1')).not.toBeNull();

    // Wait another 60ms (key-1 is now 110ms old, expired)
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(cache.get('key-1')).toBeNull();
    expect(cache.get('key-2')).not.toBeNull();
    expect(cache.get('key-3')).not.toBeNull();
  });
});
