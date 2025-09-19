import { test, describe, beforeEach, afterEach, expect } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { SnapshotStore } from '../../src/git-native/SnapshotStore.mjs';

const execAsync = promisify(exec);

describe('SnapshotStore Tests', () => {
  let testDir;
  let snapshotStore;

  beforeEach(async () => {
    testDir = join(process.cwd(), 'test-snapshots-' + Date.now());
    await fs.mkdir(testDir, { recursive: true });
    
    // Initialize git repository
    await execAsync('git init', { cwd: testDir });
    await execAsync('git config user.email "test@example.com"', { cwd: testDir });
    await execAsync('git config user.name "Test User"', { cwd: testDir });
    
    // Create initial commit
    await fs.writeFile(join(testDir, 'README.md'), '# Test Repository');
    await execAsync('git add README.md', { cwd: testDir });
    await execAsync('git commit -m "Initial commit"', { cwd: testDir });
    
    snapshotStore = new SnapshotStore({
      cwd: testDir,
      logger: console
    });
    
    await snapshotStore.initialize();
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to clean up test directory: ${error.message}`);
    }
  });

  test('should initialize successfully', async () => {
    expect(snapshotStore).toBeDefined();
  });

  test('should store and retrieve snapshots', async () => {
    const key = 'test-snapshot';
    const data = { message: 'Hello, Snapshot!', timestamp: Date.now() };
    const metadata = { version: '1.0' };
    
    // Store snapshot
    const contentHash = await snapshotStore.storeSnapshot(key, data, metadata);
    expect(contentHash).toBeDefined();
    expect(typeof contentHash).toBe('string');
    expect(contentHash.length).toBe(64); // SHA-256 hex length
    
    // Retrieve snapshot
    const retrieved = await snapshotStore.getSnapshot(key, contentHash);
    expect(retrieved).toEqual(data);
    
    // Check existence
    const exists = await snapshotStore.hasSnapshot(key, contentHash);
    expect(exists).toBe(true);
  });

  test('should retrieve snapshot by key only', async () => {
    const key = 'key-only-snapshot';
    const data = { test: 'data' };
    
    const contentHash = await snapshotStore.storeSnapshot(key, data);
    
    // Retrieve without specifying content hash
    const retrieved = await snapshotStore.getSnapshot(key);
    expect(retrieved).toEqual(data);
    
    const exists = await snapshotStore.hasSnapshot(key);
    expect(exists).toBe(true);
  });

  test('should handle non-existent snapshots', async () => {
    const key = 'non-existent-snapshot';
    
    const retrieved = await snapshotStore.getSnapshot(key);
    expect(retrieved).toBeNull();
    
    const exists = await snapshotStore.hasSnapshot(key);
    expect(exists).toBe(false);
  });

  test('should handle non-existent content hash', async () => {
    const key = 'test-key';
    const fakeHash = 'a'.repeat(64); // Fake SHA-256 hash
    
    const retrieved = await snapshotStore.getSnapshot(key, fakeHash);
    expect(retrieved).toBeNull();
    
    const exists = await snapshotStore.hasSnapshot(key, fakeHash);
    expect(exists).toBe(false);
  });

  test('should list all snapshots', async () => {
    // Store multiple snapshots
    await snapshotStore.storeSnapshot('snapshot-1', { data: 1 });
    await snapshotStore.storeSnapshot('snapshot-2', { data: 2 });
    await snapshotStore.storeSnapshot('snapshot-3', { data: 3 });
    
    const snapshots = await snapshotStore.listSnapshots();
    expect(snapshots.length).toBe(3);
    
    const keys = snapshots.map(s => s.key);
    expect(keys).toContain('snapshot-1');
    expect(keys).toContain('snapshot-2');
    expect(keys).toContain('snapshot-3');
    
    // Check snapshot structure
    const snapshot = snapshots[0];
    expect(snapshot.key).toBeDefined();
    expect(snapshot.contentHash).toBeDefined();
    expect(typeof snapshot.timestamp).toBe('number');
    expect(snapshot.metadata).toBeDefined();
    expect(snapshot.commit).toBeDefined();
    expect(snapshot.branch).toBeDefined();
  });

  test('should remove snapshots', async () => {
    const key = 'removable-snapshot';
    const data = { test: 'data' };
    
    const contentHash = await snapshotStore.storeSnapshot(key, data);
    
    // Verify it exists
    const existsBefore = await snapshotStore.hasSnapshot(key, contentHash);
    expect(existsBefore).toBe(true);
    
    // Remove snapshot
    const removed = await snapshotStore.removeSnapshot(key, contentHash);
    expect(removed).toBe(true);
    
    // Verify it's gone
    const existsAfter = await snapshotStore.hasSnapshot(key, contentHash);
    expect(existsAfter).toBe(false);
    
    const retrieved = await snapshotStore.getSnapshot(key, contentHash);
    expect(retrieved).toBeNull();
  });

  test('should remove snapshot by key only', async () => {
    const key = 'key-removable-snapshot';
    const data = { test: 'data' };
    
    await snapshotStore.storeSnapshot(key, data);
    
    // Remove without specifying content hash
    const removed = await snapshotStore.removeSnapshot(key);
    expect(removed).toBe(true);
    
    // Verify it's gone
    const exists = await snapshotStore.hasSnapshot(key);
    expect(exists).toBe(false);
  });

  test('should handle removal of non-existent snapshot', async () => {
    const removed = await snapshotStore.removeSnapshot('non-existent');
    expect(removed).toBe(false);
  });

  test('should provide accurate statistics', async () => {
    const stats = snapshotStore.getStatistics();
    
    expect(typeof stats.hits).toBe('number');
    expect(typeof stats.misses).toBe('number');
    expect(typeof stats.size).toBe('number');
    expect(typeof stats.entries).toBe('number');
    expect(typeof stats.hitRate).toBe('number');
    expect(typeof stats.maxSize).toBe('number');
    expect(typeof stats.sizeMB).toBe('number');
    
    expect(stats.hits).toBeGreaterThanOrEqual(0);
    expect(stats.misses).toBeGreaterThanOrEqual(0);
    expect(stats.size).toBeGreaterThanOrEqual(0);
    expect(stats.entries).toBeGreaterThanOrEqual(0);
    expect(stats.hitRate).toBeGreaterThanOrEqual(0);
    expect(stats.hitRate).toBeLessThanOrEqual(1);
  });

  test('should update statistics on cache hits and misses', async () => {
    const key = 'stats-test-snapshot';
    const data = { test: 'data' };
    
    // Store snapshot
    await snapshotStore.storeSnapshot(key, data);
    
    const statsBefore = snapshotStore.getStatistics();
    const initialMisses = statsBefore.misses;
    
    // Retrieve snapshot (should be a hit)
    const retrieved = await snapshotStore.getSnapshot(key);
    expect(retrieved).toEqual(data);
    
    const statsAfter = snapshotStore.getStatistics();
    expect(statsAfter.hits).toBe(statsBefore.hits + 1);
    
    // Try to retrieve non-existent snapshot (should be a miss)
    await snapshotStore.getSnapshot('non-existent');
    
    const statsFinal = snapshotStore.getStatistics();
    expect(statsFinal.misses).toBe(initialMisses + 1);
  });

  test('should cleanup cache by age', async () => {
    const key = 'old-snapshot';
    const data = { test: 'data' };
    
    await snapshotStore.storeSnapshot(key, data);
    
    // Cleanup with very short age (1ms)
    const removedCount = await snapshotStore.cleanupCache(1);
    expect(removedCount).toBeGreaterThanOrEqual(0);
    
    // Verify snapshot is gone
    const exists = await snapshotStore.hasSnapshot(key);
    expect(exists).toBe(false);
  });

  test('should cleanup cache by size', async () => {
    // Store multiple snapshots
    for (let i = 0; i < 5; i++) {
      await snapshotStore.storeSnapshot(`size-test-${i}`, { data: i });
    }
    
    // Set very small max size to force cleanup
    snapshotStore.maxCacheSize = 100; // 100 bytes
    
    const removedCount = await snapshotStore.cleanupCache();
    expect(removedCount).toBeGreaterThanOrEqual(0);
    
    const stats = snapshotStore.getStatistics();
    expect(stats.size).toBeLessThanOrEqual(snapshotStore.maxCacheSize);
  });

  test('should clear all cache', async () => {
    // Store multiple snapshots
    await snapshotStore.storeSnapshot('clear-1', { data: 1 });
    await snapshotStore.storeSnapshot('clear-2', { data: 2 });
    await snapshotStore.storeSnapshot('clear-3', { data: 3 });
    
    const statsBefore = snapshotStore.getStatistics();
    expect(statsBefore.entries).toBe(3);
    
    // Clear all cache
    const removedCount = await snapshotStore.clearCache();
    expect(removedCount).toBe(3);
    
    const statsAfter = snapshotStore.getStatistics();
    expect(statsAfter.entries).toBe(0);
    expect(statsAfter.size).toBe(0);
    expect(statsAfter.hits).toBe(0);
    expect(statsAfter.misses).toBe(0);
  });

  test('should handle identical content with different keys', async () => {
    const data = { identical: 'content' };
    
    const hash1 = await snapshotStore.storeSnapshot('key-1', data);
    const hash2 = await snapshotStore.storeSnapshot('key-2', data);
    
    // Should have same content hash
    expect(hash1).toBe(hash2);
    
    // Both should be retrievable
    const retrieved1 = await snapshotStore.getSnapshot('key-1');
    const retrieved2 = await snapshotStore.getSnapshot('key-2');
    
    expect(retrieved1).toEqual(data);
    expect(retrieved2).toEqual(data);
  });

  test('should handle different content with same key', async () => {
    const key = 'same-key';
    const data1 = { version: 1 };
    const data2 = { version: 2 };
    
    const hash1 = await snapshotStore.storeSnapshot(key, data1);
    const hash2 = await snapshotStore.storeSnapshot(key, data2);
    
    // Should have different content hashes
    expect(hash1).not.toBe(hash2);
    
    // Both should be retrievable with their respective hashes
    const retrieved1 = await snapshotStore.getSnapshot(key, hash1);
    const retrieved2 = await snapshotStore.getSnapshot(key, hash2);
    
    expect(retrieved1).toEqual(data1);
    expect(retrieved2).toEqual(data2);
  });

  test('should handle concurrent operations', async () => {
    const operations = [];
    
    // Create multiple concurrent operations
    for (let i = 0; i < 10; i++) {
      operations.push(
        snapshotStore.storeSnapshot(`concurrent-${i}`, { index: i })
      );
    }
    
    // Execute all operations concurrently
    const results = await Promise.all(operations);
    
    // Verify results
    expect(results.length).toBe(10);
    results.forEach(hash => {
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64);
    });
    
    // Verify all snapshots exist
    const snapshots = await snapshotStore.listSnapshots();
    expect(snapshots.length).toBe(10);
  });
});
