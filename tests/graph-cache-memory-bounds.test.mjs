/**
 * Graph Cache Memory Bounds Tests
 *
 * Tests that the cache respects memory size limits and correctly
 * evicts entries when approaching maximum memory usage.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useGraphCache } from '../src/composables/useGraphCache.mjs';

describe('Graph Cache Memory Bounds', () => {
  let cache;

  beforeEach(() => {
    // Create cache with 100KB max size for testing
    cache = useGraphCache({ maxEntries: 1000, maxSize: 100 * 1024, ttlMs: 60000 });
  });

  it('should track total size correctly', () => {
    cache.set('key-1', { data: 'x'.repeat(100) });
    cache.set('key-2', { data: 'y'.repeat(100) });

    const stats = cache.stats();
    expect(stats.currentSizeBytes).toBeGreaterThan(0);
  });

  it('should not exceed max size limit', () => {
    // Generate data until we approach max size
    let totalSize = 0;
    for (let i = 0; i < 100; i++) {
      const largeData = { data: 'x'.repeat(500) };
      cache.set(`key-${i}`, largeData);
      totalSize += JSON.stringify(largeData).length * 1.5; // rough estimate
    }

    const stats = cache.stats();
    expect(stats.currentSizeBytes).toBeLessThanOrEqual(stats.maxSizeBytes);
  });

  it('should evict entries when max size is reached', () => {
    // Fill cache with large values (each ~2KB to trigger size-based eviction at 100KB limit)
    for (let i = 0; i < 100; i++) {
      cache.set(`key-${i}`, { data: 'x'.repeat(2000) });
    }

    const statsAfter = cache.stats();
    expect(statsAfter.evictions).toBeGreaterThan(0);
    expect(statsAfter.currentSizeBytes).toBeLessThanOrEqual(statsAfter.maxSizeBytes);
  });

  it('should prefer entry count limit over size when both would trigger', () => {
    const smallCache = useGraphCache({ maxEntries: 5, maxSize: 1000 * 1024 });

    for (let i = 0; i < 10; i++) {
      smallCache.set(`key-${i}`, { data: 'small' });
    }

    const stats = smallCache.stats();
    expect(stats.currentEntries).toBeLessThanOrEqual(5);
  });

  it('should reject values larger than max size', () => {
    const verySmallCache = useGraphCache({
      maxEntries: 100,
      maxSize: 100, // 100 bytes
      ttlMs: 60000,
    });

    // Create value larger than 100 bytes
    const largeValue = { data: 'x'.repeat(1000) };

    const result = verySmallCache.set('large-key', largeValue);

    expect(result).toBe(false);
    expect(verySmallCache.get('large-key')).toBeNull();
  });

  it('should account for value size in eviction decisions', () => {
    // Create cache with very limited size to force eviction
    const limitedCache = useGraphCache({
      maxEntries: 100,
      maxSize: 200, // 200 bytes - very tight
      ttlMs: 60000,
    });

    // Add entries until cache is nearly full
    for (let i = 0; i < 8; i++) {
      const smallData = { id: i, data: 'x'.repeat(20) };
      limitedCache.set(`small-${i}`, smallData);
    }

    // Add one more entry that should trigger eviction
    const moreData = { data: 'y'.repeat(30) };
    limitedCache.set('more-key', moreData);

    const stats = limitedCache.stats();
    expect(stats.evictions).toBeGreaterThan(0);
    expect(stats.currentSizeBytes).toBeLessThanOrEqual(stats.maxSizeBytes);
  });

  it('should maintain accurate size tracking across operations', () => {
    cache.set('key-1', { data: 'a'.repeat(100) });
    const statsAfterFirstSet = cache.stats();
    const sizeAfterFirstSet = statsAfterFirstSet.currentSizeBytes;

    cache.set('key-2', { data: 'b'.repeat(100) });
    const statsAfterSecondSet = cache.stats();
    const sizeAfterSecondSet = statsAfterSecondSet.currentSizeBytes;

    expect(sizeAfterSecondSet).toBeGreaterThan(sizeAfterFirstSet);
  });

  it('should update size when replacing value', () => {
    cache.set('key-1', { data: 'small' });
    const statsAfterSmall = cache.stats();

    // Replace with larger value
    cache.set('key-1', { data: 'x'.repeat(1000) });
    const statsAfterLarge = cache.stats();

    expect(statsAfterLarge.currentSizeBytes).toBeGreaterThan(statsAfterSmall.currentSizeBytes);
  });

  it('should report correct max size', () => {
    const maxSizeCache = useGraphCache({
      maxEntries: 100,
      maxSize: 50 * 1024 * 1024, // 50MB
      ttlMs: 60000,
    });

    const stats = maxSizeCache.stats();
    expect(stats.maxSizeBytes).toBe(50 * 1024 * 1024);
  });

  it('should handle rapid size changes', () => {
    for (let i = 0; i < 10; i++) {
      cache.set(`key-${i}`, { data: 'x'.repeat(500) });
      const stats = cache.stats();
      expect(stats.currentSizeBytes).toBeLessThanOrEqual(stats.maxSizeBytes);
    }
  });

  it('should clean up memory on get() for expired entries', async () => {
    const cacheWithTTL = useGraphCache({
      maxEntries: 100,
      maxSize: 100 * 1024,
      ttlMs: 100,
    });

    // Add entries with large data
    for (let i = 0; i < 5; i++) {
      cacheWithTTL.set(`key-${i}`, { data: 'x'.repeat(500) });
    }

    const statsBeforeExpire = cacheWithTTL.stats();
    const sizeBeforeExpire = statsBeforeExpire.currentSizeBytes;

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Access expired entries to trigger cleanup
    for (let i = 0; i < 5; i++) {
      cacheWithTTL.get(`key-${i}`);
    }

    const statsAfterExpire = cacheWithTTL.stats();
    expect(statsAfterExpire.currentSizeBytes).toBeLessThan(sizeBeforeExpire);
  });

  it('should not cache value if it would exceed memory', () => {
    const tinyCache = useGraphCache({
      maxEntries: 100,
      maxSize: 200, // 200 bytes
      ttlMs: 60000,
    });

    // Add entry that fits
    tinyCache.set('small', { data: 'x' });

    // Try to add entry that exceeds max size
    const result = tinyCache.set('huge', { data: 'x'.repeat(5000) });

    expect(result).toBe(false);
    expect(tinyCache.get('huge')).toBeNull();
    expect(tinyCache.get('small')).not.toBeNull();
  });

  it('should handle zero remaining space evictions', () => {
    const tightCache = useGraphCache({
      maxEntries: 100,
      maxSize: 1000,
      ttlMs: 60000,
    });

    // Fill cache beyond limit
    for (let i = 0; i < 50; i++) {
      tightCache.set(`key-${i}`, { data: 'x'.repeat(100) });
    }

    const stats = tightCache.stats();
    expect(stats.currentSizeBytes).toBeLessThanOrEqual(stats.maxSizeBytes);
    expect(stats.evictions).toBeGreaterThan(0);
  });

  it('should show accurate memory stats', () => {
    const testCache = useGraphCache({
      maxEntries: 100,
      maxSize: 100 * 1024,
      ttlMs: 60000,
    });

    testCache.set('key-1', { data: 'value' });

    const stats = testCache.stats();
    expect(stats.currentSizeBytes).toBeGreaterThan(0);
    expect(stats.maxSizeBytes).toBe(100 * 1024);
    expect(stats.currentEntries).toBe(1);
    expect(stats.maxEntries).toBe(100);
  });
});
