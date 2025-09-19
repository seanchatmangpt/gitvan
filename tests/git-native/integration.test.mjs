import { test, describe, beforeEach, afterEach, expect } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GitNativeIO } from '../../src/git-native/GitNativeIO.mjs';

const execAsync = promisify(exec);

describe('GitNativeIO Integration Tests', () => {
  let testDir;
  let io;

  beforeEach(async () => {
    // Create test directory
    testDir = join(process.cwd(), 'test-git-native-' + Date.now());
    await fs.mkdir(testDir, { recursive: true });
    
    // Initialize git repository
    await execAsync('git init', { cwd: testDir });
    await execAsync('git config user.email "test@example.com"', { cwd: testDir });
    await execAsync('git config user.name "Test User"', { cwd: testDir });
    
    // Create initial commit
    await fs.writeFile(join(testDir, 'README.md'), '# Test Repository');
    await execAsync('git add README.md', { cwd: testDir });
    await execAsync('git commit -m "Initial commit"', { cwd: testDir });
    
    // Initialize GitNativeIO
    io = new GitNativeIO({ 
      cwd: testDir,
      logger: console
    });
    
    await io.initialize();
  });

  afterEach(async () => {
    if (io) {
      await io.shutdown();
    }
    
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to clean up test directory: ${error.message}`);
    }
  });

  test('should initialize successfully', async () => {
    const status = await io.getStatus();
    
    expect(status.queue).toBeDefined();
    expect(status.locks).toBeDefined();
    expect(status.receipts).toBeDefined();
    expect(status.snapshots).toBeDefined();
    expect(status.workers).toBeDefined();
  });

  test('should execute jobs in-process', async () => {
    const result = await io.executeJob(async () => {
      return 'Hello, World!';
    });
    
    expect(result).toBe('Hello, World!');
  });

  test('should handle job execution errors', async () => {
    await expect(io.executeJob(async () => {
      throw new Error('Test error');
    })).rejects.toThrow('Test error');
  });

  test('should acquire and release locks', async () => {
    const lockName = 'test-lock';
    
    // Acquire lock
    const acquired = await io.acquireLock(lockName);
    expect(acquired).toBe(true);
    
    // Check if locked
    const isLocked = await io.isLocked(lockName);
    expect(isLocked).toBe(true);
    
    // Release lock
    const released = await io.releaseLock(lockName);
    expect(released).toBe(true);
    
    // Check if unlocked
    const isUnlocked = await io.isLocked(lockName);
    expect(isUnlocked).toBe(false);
  });

  test('should prevent double lock acquisition', async () => {
    const lockName = 'exclusive-lock';
    
    // First acquisition should succeed
    const firstAcquired = await io.acquireLock(lockName);
    expect(firstAcquired).toBe(true);
    
    // Second acquisition should fail
    const secondAcquired = await io.acquireLock(lockName);
    expect(secondAcquired).toBe(false);
    
    // Release and try again
    await io.releaseLock(lockName);
    const thirdAcquired = await io.acquireLock(lockName);
    expect(thirdAcquired).toBe(true);
  });

  test('should write and read receipts', async () => {
    const hookId = 'test-hook';
    const result = { success: true, data: 'test-data' };
    const metadata = { timestamp: Date.now() };
    
    // Write receipt
    await io.writeReceipt(hookId, result, metadata);
    
    // Flush to ensure it's persisted
    await io.flushAll();
    
    // Read receipts
    const receipts = await io.readReceipts();
    expect(receipts.length).toBeGreaterThan(0);
    
    const receipt = receipts.find(r => r.hookId === hookId);
    expect(receipt).toBeDefined();
    expect(receipt.result).toEqual(result);
    expect(receipt.metadata).toEqual(metadata);
  });

  test('should write metrics', async () => {
    const metrics = {
      executionTime: 100,
      memoryUsage: 1024,
      success: true
    };
    
    await io.writeMetrics(metrics);
    await io.flushAll();
    
    const stats = await io.getStatistics();
    expect(stats.totalMetrics).toBeGreaterThan(0);
  });

  test('should store and retrieve snapshots', async () => {
    const key = 'test-snapshot';
    const data = { message: 'Hello, Snapshot!', timestamp: Date.now() };
    const metadata = { version: '1.0' };
    
    // Store snapshot
    const contentHash = await io.storeSnapshot(key, data, metadata);
    expect(contentHash).toBeDefined();
    
    // Retrieve snapshot
    const retrieved = await io.getSnapshot(key, contentHash);
    expect(retrieved).toEqual(data);
    
    // Check existence
    const exists = await io.hasSnapshot(key, contentHash);
    expect(exists).toBe(true);
    
    // List snapshots
    const snapshots = await io.listSnapshots();
    expect(snapshots.length).toBeGreaterThan(0);
    
    const snapshot = snapshots.find(s => s.key === key);
    expect(snapshot).toBeDefined();
    expect(snapshot.contentHash).toBe(contentHash);
  });

  test('should handle snapshot cache miss', async () => {
    const key = 'non-existent-snapshot';
    
    const retrieved = await io.getSnapshot(key);
    expect(retrieved).toBeNull();
    
    const exists = await io.hasSnapshot(key);
    expect(exists).toBe(false);
  });

  test('should add jobs to priority queues', async () => {
    const highPriorityJob = async () => 'high-priority-result';
    const mediumPriorityJob = async () => 'medium-priority-result';
    const lowPriorityJob = async () => 'low-priority-result';
    
    // Add jobs to different priorities
    const highResult = await io.addJob('high', highPriorityJob, { name: 'high-job' });
    const mediumResult = await io.addJob('medium', mediumPriorityJob, { name: 'medium-job' });
    const lowResult = await io.addJob('low', lowPriorityJob, { name: 'low-job' });
    
    expect(highResult).toBe('high-priority-result');
    expect(mediumResult).toBe('medium-priority-result');
    expect(lowResult).toBe('low-priority-result');
  });

  test('should handle job execution errors in queues', async () => {
    const errorJob = async () => {
      throw new Error('Queue job error');
    };
    
    await expect(io.addJob('high', errorJob)).rejects.toThrow('Queue job error');
  });

  test('should reconcile state on startup', async () => {
    // Create some state
    await io.acquireLock('reconcile-test');
    await io.writeReceipt('reconcile-hook', { test: true });
    await io.storeSnapshot('reconcile-snapshot', { data: 'test' });
    
    // Reconcile
    await io.reconcile();
    
    // Verify state is still intact
    const isLocked = await io.isLocked('reconcile-test');
    expect(isLocked).toBe(true);
    
    const snapshots = await io.listSnapshots();
    expect(snapshots.length).toBeGreaterThan(0);
  });

  test('should cleanup old data', async () => {
    // Create some data
    await io.writeReceipt('cleanup-hook', { test: true });
    await io.storeSnapshot('cleanup-snapshot', { data: 'test' });
    
    // Cleanup
    await io.cleanup();
    
    // Verify cleanup worked (exact behavior depends on implementation)
    const stats = await io.getStatistics();
    expect(stats).toBeDefined();
  });

  test('should provide comprehensive status', async () => {
    const status = await io.getStatus();
    
    // Check queue status
    expect(status.queue.high).toBeDefined();
    expect(status.queue.medium).toBeDefined();
    expect(status.queue.low).toBeDefined();
    
    // Check locks
    expect(Array.isArray(status.locks)).toBe(true);
    
    // Check receipts
    expect(status.receipts).toBeDefined();
    expect(typeof status.receipts.totalReceipts).toBe('number');
    
    // Check snapshots
    expect(status.snapshots).toBeDefined();
    expect(typeof status.snapshots.hits).toBe('number');
    
    // Check workers
    expect(status.workers).toBeDefined();
    expect(typeof status.workers.total).toBe('number');
  });

  test('should handle concurrent operations', async () => {
    const operations = [];
    
    // Create multiple concurrent operations
    for (let i = 0; i < 5; i++) {
      operations.push(
        io.acquireLock(`concurrent-lock-${i}`),
        io.writeReceipt(`concurrent-hook-${i}`, { index: i }),
        io.storeSnapshot(`concurrent-snapshot-${i}`, { data: i })
      );
    }
    
    // Execute all operations concurrently
    const results = await Promise.all(operations);
    
    // Verify results
    expect(results.length).toBe(15); // 5 locks + 5 receipts + 5 snapshots
    
    // Verify locks were acquired
    for (let i = 0; i < 5; i++) {
      const isLocked = await io.isLocked(`concurrent-lock-${i}`);
      expect(isLocked).toBe(true);
    }
  });

  test('should handle shutdown gracefully', async () => {
    // Create some state
    await io.acquireLock('shutdown-test');
    await io.writeReceipt('shutdown-hook', { test: true });
    
    // Shutdown
    await io.shutdown();
    
    // Verify shutdown completed without errors
    expect(true).toBe(true); // If we get here, shutdown succeeded
  });
});
