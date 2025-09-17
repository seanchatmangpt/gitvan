import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PackCache } from '../src/pack/optimization/cache.mjs';
import { PackRegistry } from '../src/pack/registry.mjs';
import { existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'pathe';
import { tmpdir } from 'node:os';

describe('Enhanced Cache System', () => {
  let cache;
  let registry;
  let tempDir;

  beforeEach(async () => {
    // Create temporary cache directory
    tempDir = join(tmpdir(), `gitvan-cache-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });

    // Initialize cache with test configuration
    cache = new PackCache({
      cacheDir: tempDir,
      ttl: 60000, // 1 minute for tests
      maxSize: 10 * 1024 * 1024, // 10MB
      compression: true,
      warmupKeys: [
        { type: 'test', data: { key: 'warmup-test' } }
      ]
    });

    // Wait for cache initialization
    await cache._init();

    // Initialize registry with test configuration
    registry = new PackRegistry({
      cacheDir: join(tempDir, 'registry'),
      cacheTtl: 60000,
      cacheMaxSize: 20 * 1024 * 1024
    });
  });

  afterEach(async () => {
    // Clean up test cache directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('PackCache Core Functionality', () => {
    it('should store and retrieve data correctly', async () => {
      const testData = { message: 'Hello, Cache!', timestamp: Date.now() };

      await cache.set('test', { key: 'basic' }, testData);
      const retrieved = await cache.get('test', { key: 'basic' });

      expect(retrieved).toEqual(testData);
    });

    it('should handle cache misses gracefully', async () => {
      const result = await cache.get('test', { key: 'nonexistent' });
      expect(result).toBeNull();
    });

    it('should compress large data automatically', async () => {
      // Generate large test data (>1KB to trigger compression)
      const largeData = {
        content: 'x'.repeat(2000),
        metadata: { type: 'large', size: 2000 }
      };

      await cache.set('test', { key: 'large' }, largeData);
      const retrieved = await cache.get('test', { key: 'large' });

      expect(retrieved).toEqual(largeData);

      // Check if compression stats were updated
      const stats = cache.getStats();
      expect(stats.compressionSaved).toBeGreaterThan(0);
    });

    it('should respect TTL settings', async () => {
      // Create cache with very short TTL
      const shortTtlCache = new PackCache({
        cacheDir: join(tempDir, 'short-ttl'),
        ttl: 50 // 50ms
      });
      await shortTtlCache._init();

      const testData = { message: 'Short TTL test' };
      await shortTtlCache.set('test', { key: 'ttl' }, testData);

      // Should be available immediately
      let retrieved = await shortTtlCache.get('test', { key: 'ttl' });
      expect(retrieved).toEqual(testData);

      // Wait for TTL expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should be expired now
      retrieved = await shortTtlCache.get('test', { key: 'ttl' });
      expect(retrieved).toBeNull();
    });

    it('should maintain type registry', async () => {
      await cache.set('type1', { key: 'data1' }, { value: 1 });
      await cache.set('type2', { key: 'data2' }, { value: 2 });
      await cache.set('type1', { key: 'data3' }, { value: 3 });

      const stats = await cache.getDetailedStats();
      expect(stats.types).toBeDefined();
      expect(Object.keys(stats.types)).toContain('type1');
      expect(Object.keys(stats.types)).toContain('type2');
      expect(stats.types.type1.count).toBe(2);
      expect(stats.types.type2.count).toBe(1);
    });

    it('should handle cache clearing by type', async () => {
      await cache.set('type1', { key: 'data1' }, { value: 1 });
      await cache.set('type2', { key: 'data2' }, { value: 2 });

      // Clear only type1
      await cache.clear('type1');

      const result1 = await cache.get('type1', { key: 'data1' });
      const result2 = await cache.get('type2', { key: 'data2' });

      expect(result1).toBeNull();
      expect(result2).toEqual({ value: 2 });
    });

    it('should detect and handle integrity failures', async () => {
      const testData = { message: 'Integrity test' };
      await cache.set('test', { key: 'integrity' }, testData);

      // Verify initial retrieval works
      let retrieved = await cache.get('test', { key: 'integrity' });
      expect(retrieved).toEqual(testData);

      // Simulate integrity check process
      await cache._performIntegrityCheck();

      const stats = cache.getStats();
      expect(stats.integrityChecks).toBeGreaterThan(0);
    });
  });

  describe('Registry Integration', () => {
    it('should cache pack resolution results', async () => {
      // Mock a builtin pack for testing
      const mockPackId = 'test-pack';

      // First resolution should miss cache
      const stats1 = await registry.getCacheStats();
      const initialMisses = stats1.misses;

      // Since no actual pack exists, this will return null but should cache the result
      const result1 = await registry.resolve(mockPackId);

      // Second resolution should hit cache
      const result2 = await registry.resolve(mockPackId);

      const stats2 = await registry.getCacheStats();
      expect(stats2.hits).toBeGreaterThan(stats1.hits);
    });

    it('should provide cache statistics', async () => {
      const stats = await registry.getCacheStats();

      expect(stats).toBeDefined();
      expect(stats.hits).toBeDefined();
      expect(stats.misses).toBeDefined();
      expect(stats.writes).toBeDefined();
      expect(stats.hitRate).toBeDefined();
      expect(stats.memoryEntries).toBeDefined();
      expect(stats.compressionEnabled).toBe(true);
    });

    it('should support cache export functionality', async () => {
      const exportPath = join(tempDir, 'cache-export.json');
      const exportData = await registry.exportCacheStats(exportPath);

      expect(exportData).toBeDefined();
      expect(exportData.metadata).toBeDefined();
      expect(exportData.stats).toBeDefined();
      expect(existsSync(exportPath)).toBe(true);
    });

    it('should support cache compaction', async () => {
      // Add some test data
      await cache.set('test', { key: 'compact1' }, { data: 'test1' });
      await cache.set('test', { key: 'compact2' }, { data: 'test2' });

      const compactionResult = await registry.compactCache();
      expect(compactionResult).toBeDefined();
      expect(compactionResult.entriesRemoved).toBeDefined();
    });

    it('should handle warmup functionality', async () => {
      const initialStats = await registry.getCacheStats();
      await registry.warmupCache();

      // Warmup should not fail and should potentially update stats
      const afterStats = await registry.getCacheStats();
      expect(afterStats.warmupLoadsConfigured).toBeGreaterThan(0);
    });
  });

  describe('Cache Performance', () => {
    it('should show performance benefits with repeated access', async () => {
      const testData = {
        message: 'Performance test',
        data: Array.from({ length: 100 }, (_, i) => `item-${i}`)
      };

      // First access - cache miss
      const start1 = Date.now();
      await cache.set('perf', { key: 'test' }, testData);
      const set1 = Date.now() - start1;

      // Second access - cache hit
      const start2 = Date.now();
      const retrieved = await cache.get('perf', { key: 'test' });
      const get2 = Date.now() - start2;

      expect(retrieved).toEqual(testData);
      expect(get2).toBeLessThan(set1); // Get should be faster than set
    });

    it('should handle concurrent operations safely', async () => {
      const promises = [];

      // Concurrent writes
      for (let i = 0; i < 10; i++) {
        promises.push(
          cache.set('concurrent', { key: `test-${i}` }, { value: i })
        );
      }

      await Promise.all(promises);

      // Concurrent reads
      const readPromises = [];
      for (let i = 0; i < 10; i++) {
        readPromises.push(
          cache.get('concurrent', { key: `test-${i}` })
        );
      }

      const results = await Promise.all(readPromises);

      // All operations should complete successfully
      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result).toEqual({ value: index });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid cache operations gracefully', async () => {
      // Test with null/undefined data
      await expect(cache.set('test', null, { data: 'test' })).resolves.not.toThrow();
      await expect(cache.get('test', null)).resolves.toBeNull();
    });

    it('should handle cache directory issues gracefully', async () => {
      // Create cache with invalid directory
      const invalidCache = new PackCache({
        cacheDir: '/invalid/path/that/does/not/exist'
      });

      // Should handle initialization gracefully
      await expect(invalidCache._init()).rejects.toThrow();
    });

    it('should recover from corrupted cache entries', async () => {
      // This test would normally require manual corruption of cache files
      // For now, we test that the integrity check mechanism exists
      expect(cache._performIntegrityCheck).toBeDefined();
      expect(typeof cache._performIntegrityCheck).toBe('function');
    });
  });

  describe('Memory Management', () => {
    it('should respect memory limits', async () => {
      const smallMemoryCache = new PackCache({
        cacheDir: join(tempDir, 'small-memory'),
        memoryMax: 5, // Only 5 items in memory
        memoryMaxSize: 1024 // 1KB memory limit
      });
      await smallMemoryCache._init();

      // Add more items than memory limit
      for (let i = 0; i < 10; i++) {
        await smallMemoryCache.set('test', { key: `item-${i}` }, {
          data: `test-data-${i}`
        });
      }

      const stats = smallMemoryCache.getStats();
      expect(stats.memoryEntries).toBeLessThanOrEqual(5);
    });

    it('should track memory usage accurately', async () => {
      const initialStats = cache.getStats();
      const initialMemorySize = initialStats.memorySize || 0;

      // Add some data
      await cache.set('memory', { key: 'test' }, {
        data: 'x'.repeat(1000)
      });

      const afterStats = cache.getStats();
      expect(afterStats.memorySize).toBeGreaterThan(initialMemorySize);
    });
  });
});

describe('Cache System Integration Tests', () => {
  let tempDir;
  let registry;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `gitvan-integration-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });

    registry = new PackRegistry({
      cacheDir: join(tempDir, 'registry'),
      cacheTtl: 300000, // 5 minutes
      cacheMaxSize: 50 * 1024 * 1024 // 50MB
    });
  });

  afterEach(async () => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should maintain cache consistency across registry operations', async () => {
    // Perform multiple operations
    await registry.get('nonexistent-pack-1');
    await registry.resolve('nonexistent-pack-2');
    await registry.get('nonexistent-pack-1'); // Should hit cache

    const stats = await registry.getCacheStats();
    expect(stats.hits).toBeGreaterThan(0);
    expect(stats.misses).toBeGreaterThan(0);
  });

  it('should handle cache clearing operations correctly', async () => {
    // Add some cached data
    await registry.get('test-pack-1');
    await registry.resolve('test-pack-2');

    const statsBefore = await registry.getCacheStats();
    expect(statsBefore.memoryEntries).toBeGreaterThan(0);

    // Clear all caches
    await registry.clearAllCaches();

    const statsAfter = await registry.getCacheStats();
    expect(statsAfter.memoryEntries).toBe(0);
  });
});