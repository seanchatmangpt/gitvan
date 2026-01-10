/**
 * Graph Cache LRU Eviction Tests
 *
 * Tests that the LRU eviction policy correctly removes least recently used
 * entries when max entries is reached.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useGraphCache } from '../src/composables/useGraphCache.mjs';

describe('Graph Cache LRU Eviction', () => {
  let cache;

  beforeEach(() => {
    // Create cache with small max entries for testing eviction
    cache = useGraphCache({ maxEntries: 5, ttlMs: 60000 });
  });

  it('should store entries up to max limit', () => {
    for (let i = 0; i < 5; i++) {
      const key = `query-${i}`;
      const value = { result: `data-${i}` };
      cache.set(key, value);
    }

    const stats = cache.stats();
    expect(stats.currentEntries).toBe(5);
  });

  it('should evict oldest entry when max entries reached', () => {
    // Add 5 entries
    for (let i = 0; i < 5; i++) {
      cache.set(`query-${i}`, { result: `data-${i}` });
    }

    // Add 6th entry - should trigger eviction
    cache.set('query-5', { result: 'data-5' });

    const stats = cache.stats();
    expect(stats.currentEntries).toBe(5);
    expect(stats.evictions).toBe(1);

    // First entry should be evicted
    expect(cache.get('query-0')).toBeNull();
  });

  it('should maintain LRU order across multiple evictions', () => {
    // Add entries 0-4
    for (let i = 0; i < 5; i++) {
      cache.set(`query-${i}`, { result: `data-${i}` });
    }

    // Access entry 0 to make it most recently used
    cache.get('query-0');

    // Add entries 5-7 which should evict 1, 2, 3
    cache.set('query-5', { result: 'data-5' });
    cache.set('query-6', { result: 'data-6' });
    cache.set('query-7', { result: 'data-7' });

    // Entry 0 and 4 should still exist (0 was accessed)
    expect(cache.get('query-0')).not.toBeNull();
    expect(cache.get('query-4')).not.toBeNull();

    // Entries 1, 2, 3 should be evicted
    expect(cache.get('query-1')).toBeNull();
    expect(cache.get('query-2')).toBeNull();
    expect(cache.get('query-3')).toBeNull();
  });

  it('should count total evictions correctly', () => {
    for (let i = 0; i < 10; i++) {
      cache.set(`query-${i}`, { result: `data-${i}` });
    }

    const stats = cache.stats();
    expect(stats.evictions).toBe(5); // 10 entries added, max is 5
  });

  it('should not evict when under max entries', () => {
    for (let i = 0; i < 3; i++) {
      cache.set(`query-${i}`, { result: `data-${i}` });
    }

    const stats = cache.stats();
    expect(stats.evictions).toBe(0);
    expect(stats.currentEntries).toBe(3);
  });

  it('should track access order correctly', () => {
    // Add entries 0-4
    for (let i = 0; i < 5; i++) {
      cache.set(`query-${i}`, { result: `data-${i}` });
    }

    // Access entries in specific order
    cache.get('query-2'); // Make query-2 recently used
    cache.get('query-1'); // Make query-1 most recently used

    // Add new entries to trigger eviction
    cache.set('query-5', { result: 'data-5' });
    cache.set('query-6', { result: 'data-6' });

    // Entries 0, 3, 4 should be evicted (oldest first)
    expect(cache.get('query-0')).toBeNull();
    expect(cache.get('query-1')).not.toBeNull(); // Recently accessed
    expect(cache.get('query-2')).not.toBeNull(); // Recently accessed
  });

  it('should handle cache replacements correctly', () => {
    cache.set('query-0', { result: 'data-0' });
    cache.set('query-0', { result: 'data-0-updated' });

    const stats = cache.stats();
    // Should not count as eviction when replacing existing key
    expect(stats.evictions).toBe(0);
    expect(stats.currentEntries).toBe(1);
    expect(cache.get('query-0').result).toBe('data-0-updated');
  });

  it('should evict based on access time, not insertion time', () => {
    // Add 5 entries
    for (let i = 0; i < 5; i++) {
      cache.set(`query-${i}`, { result: `data-${i}` });
    }

    // Re-access first entry to make it recent
    cache.get('query-0');

    // Add 3 more entries
    cache.set('query-5', { result: 'data-5' });
    cache.set('query-6', { result: 'data-6' });
    cache.set('query-7', { result: 'data-7' });

    // Entry 0 should still be there because it was accessed recently
    expect(cache.get('query-0')).not.toBeNull();
  });
});
