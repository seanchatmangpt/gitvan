import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PackCache } from '../src/pack/optimization/cache.mjs';
import { existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'pathe';
import { tmpdir } from 'node:os';

describe('Basic Cache Functionality', () => {
  let cache;
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
      compression: true
    });

    // Wait for cache initialization
    await cache._init();
  });

  afterEach(async () => {
    // Clean up test cache directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

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

  it('should provide basic statistics', async () => {
    await cache.set('test', { key: 'stats' }, { data: 'test' });
    await cache.get('test', { key: 'stats' });

    const stats = cache.getStats();
    expect(stats).toBeDefined();
    expect(stats.hits).toBeGreaterThan(0);
    expect(stats.writes).toBeGreaterThan(0);
    expect(stats.hitRate).toBeDefined();
  });

  it('should support cache clearing', async () => {
    await cache.set('test', { key: 'clear' }, { data: 'test' });

    // Verify data exists
    let result = await cache.get('test', { key: 'clear' });
    expect(result).toEqual({ data: 'test' });

    // Clear cache
    await cache.clear();

    // Verify data is gone
    result = await cache.get('test', { key: 'clear' });
    expect(result).toBeNull();
  });

  it('should compress large data', async () => {
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
});

describe('Cache System Production Readiness', () => {
  it('should initialize with default settings', async () => {
    const tempDir = join(tmpdir(), `gitvan-prod-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });

    try {
      const prodCache = new PackCache({ cacheDir: tempDir });
      await prodCache._init();

      const stats = prodCache.getStats();
      expect(stats.compressionEnabled).toBe(true);
      expect(stats.memoryMaxSize).toBeGreaterThan(0);
      expect(stats.uptime).toBeGreaterThan(0);

      // Test that it can handle operations
      await prodCache.set('prod', { test: true }, { data: 'production ready' });
      const result = await prodCache.get('prod', { test: true });
      expect(result).toEqual({ data: 'production ready' });

    } finally {
      if (existsSync(tempDir)) {
        rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });

  it('should maintain integrity across operations', async () => {
    const tempDir = join(tmpdir(), `gitvan-integrity-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });

    try {
      const cache = new PackCache({ cacheDir: tempDir });
      await cache._init();

      // Perform multiple operations
      for (let i = 0; i < 10; i++) {
        await cache.set('integrity', { key: `test-${i}` }, { value: i });
      }

      // Verify all data
      for (let i = 0; i < 10; i++) {
        const result = await cache.get('integrity', { key: `test-${i}` });
        expect(result).toEqual({ value: i });
      }

      const stats = cache.getStats();
      expect(stats.hits).toBe(10);
      expect(stats.writes).toBe(10);

    } finally {
      if (existsSync(tempDir)) {
        rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });
});