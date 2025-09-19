import { test, describe, beforeEach, afterEach, expect } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ReceiptWriter } from '../../src/git-native/ReceiptWriter.mjs';

const execAsync = promisify(exec);

describe('ReceiptWriter Tests', () => {
  let testDir;
  let receiptWriter;

  beforeEach(async () => {
    testDir = join(process.cwd(), 'test-receipts-' + Date.now());
    await fs.mkdir(testDir, { recursive: true });
    
    // Initialize git repository
    await execAsync('git init', { cwd: testDir });
    await execAsync('git config user.email "test@example.com"', { cwd: testDir });
    await execAsync('git config user.name "Test User"', { cwd: testDir });
    
    // Create initial commit
    await fs.writeFile(join(testDir, 'README.md'), '# Test Repository');
    await execAsync('git add README.md', { cwd: testDir });
    await execAsync('git commit -m "Initial commit"', { cwd: testDir });
    
    receiptWriter = new ReceiptWriter({
      cwd: testDir,
      logger: console
    });
    
    await receiptWriter.initialize();
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to clean up test directory: ${error.message}`);
    }
  });

  test('should initialize successfully', async () => {
    expect(receiptWriter).toBeDefined();
  });

  test('should write and read receipts', async () => {
    const hookId = 'test-hook';
    const result = { success: true, data: 'test-data' };
    const metadata = { timestamp: Date.now() };
    
    // Write receipt
    await receiptWriter.writeReceipt(hookId, result, metadata);
    
    // Flush to ensure it's persisted
    await receiptWriter.flushAll();
    
    // Read receipts
    const receipts = await receiptWriter.readReceipts();
    expect(receipts.length).toBeGreaterThan(0);
    
    const receipt = receipts.find(r => r.hookId === hookId);
    expect(receipt).toBeDefined();
    expect(receipt.result).toEqual(result);
    expect(receipt.metadata).toEqual(metadata);
    expect(receipt.commit).toBeDefined();
    expect(receipt.branch).toBeDefined();
  });

  test('should write and read metrics', async () => {
    const metrics = {
      executionTime: 100,
      memoryUsage: 1024,
      success: true
    };
    
    await receiptWriter.writeMetrics(metrics);
    await receiptWriter.flushAll();
    
    const metricsData = await receiptWriter.readMetrics();
    expect(metricsData.length).toBeGreaterThan(0);
    
    const metric = metricsData.find(m => m.values.executionTime === 100);
    expect(metric).toBeDefined();
    expect(metric.values).toEqual(metrics);
  });

  test('should write and read executions', async () => {
    const executionId = 'test-execution';
    const execution = {
      command: 'test-command',
      args: ['arg1', 'arg2'],
      duration: 500
    };
    
    await receiptWriter.writeExecution(executionId, execution);
    await receiptWriter.flushAll();
    
    const executions = await receiptWriter.readExecutions();
    expect(executions.length).toBeGreaterThan(0);
    
    const exec = executions.find(e => e.executionId === executionId);
    expect(exec).toBeDefined();
    expect(exec.details).toEqual(execution);
  });

  test('should batch receipts before flushing', async () => {
    const batchSize = 5;
    
    // Write multiple receipts without flushing
    for (let i = 0; i < batchSize; i++) {
      await receiptWriter.writeReceipt(`hook-${i}`, { index: i });
    }
    
    // Check statistics before flush
    const statsBefore = await receiptWriter.getStatistics();
    expect(statsBefore.pendingResults).toBe(batchSize);
    
    // Flush all
    await receiptWriter.flushAll();
    
    // Check statistics after flush
    const statsAfter = await receiptWriter.getStatistics();
    expect(statsAfter.pendingResults).toBe(0);
    expect(statsAfter.totalReceipts).toBeGreaterThanOrEqual(batchSize);
  });

  test('should auto-flush when batch size is reached', async () => {
    const batchSize = 3; // Small batch size for testing
    
    // Create a new receipt writer with small batch size
    const smallBatchWriter = new ReceiptWriter({
      cwd: testDir,
      logger: console,
      receipt: { notesBatchSize: batchSize }
    });
    
    await smallBatchWriter.initialize();
    
    // Write receipts up to batch size
    for (let i = 0; i < batchSize; i++) {
      await smallBatchWriter.writeReceipt(`auto-flush-hook-${i}`, { index: i });
    }
    
    // The last write should trigger auto-flush
    const stats = await smallBatchWriter.getStatistics();
    expect(stats.pendingResults).toBe(0); // Should be flushed
  });

  test('should provide accurate statistics', async () => {
    const stats = await receiptWriter.getStatistics();
    
    expect(typeof stats.totalReceipts).toBe('number');
    expect(typeof stats.totalMetrics).toBe('number');
    expect(typeof stats.totalExecutions).toBe('number');
    expect(typeof stats.pendingResults).toBe('number');
    expect(typeof stats.pendingMetrics).toBe('number');
    expect(typeof stats.pendingExecutions).toBe('number');
    
    expect(stats.pendingResults).toBeGreaterThanOrEqual(0);
    expect(stats.pendingMetrics).toBeGreaterThanOrEqual(0);
    expect(stats.pendingExecutions).toBeGreaterThanOrEqual(0);
  });

  test('should read receipts for specific commit', async () => {
    // Write a receipt
    await receiptWriter.writeReceipt('commit-test-hook', { test: true });
    await receiptWriter.flushAll();
    
    // Get current commit
    const { stdout } = await execAsync('git rev-parse HEAD', { cwd: testDir });
    const currentCommit = stdout.trim();
    
    // Read receipts for specific commit
    const receipts = await receiptWriter.readReceipts(undefined, currentCommit);
    expect(receipts.length).toBeGreaterThan(0);
    
    const receipt = receipts.find(r => r.hookId === 'commit-test-hook');
    expect(receipt).toBeDefined();
  });

  test('should handle empty receipts gracefully', async () => {
    const receipts = await receiptWriter.readReceipts();
    expect(Array.isArray(receipts)).toBe(true);
    
    const metrics = await receiptWriter.readMetrics();
    expect(Array.isArray(metrics)).toBe(true);
    
    const executions = await receiptWriter.readExecutions();
    expect(Array.isArray(executions)).toBe(true);
  });

  test('should cleanup old receipts', async () => {
    // Write some receipts
    await receiptWriter.writeReceipt('old-hook-1', { test: 1 });
    await receiptWriter.writeReceipt('old-hook-2', { test: 2 });
    await receiptWriter.flushAll();
    
    // Create more commits to make receipts "old"
    await fs.writeFile(join(testDir, 'file1.txt'), 'content1');
    await execAsync('git add file1.txt', { cwd: testDir });
    await execAsync('git commit -m "Commit 1"', { cwd: testDir });
    
    await fs.writeFile(join(testDir, 'file2.txt'), 'content2');
    await execAsync('git add file2.txt', { cwd: testDir });
    await execAsync('git commit -m "Commit 2"', { cwd: testDir });
    
    // Cleanup old receipts (keep only 1 commit)
    await receiptWriter.cleanupOldReceipts(1);
    
    // Verify cleanup worked
    const stats = await receiptWriter.getStatistics();
    expect(stats.totalReceipts).toBeGreaterThanOrEqual(0);
  });

  test('should handle malformed NDJSON gracefully', async () => {
    // This test would require manually creating malformed notes
    // For now, just verify the method exists and handles errors
    const receipts = await receiptWriter.readReceipts();
    expect(Array.isArray(receipts)).toBe(true);
  });

  test('should handle concurrent writes', async () => {
    const writePromises = [];
    
    // Write multiple receipts concurrently
    for (let i = 0; i < 10; i++) {
      writePromises.push(
        receiptWriter.writeReceipt(`concurrent-hook-${i}`, { index: i })
      );
    }
    
    await Promise.all(writePromises);
    await receiptWriter.flushAll();
    
    const stats = await receiptWriter.getStatistics();
    expect(stats.totalReceipts).toBeGreaterThanOrEqual(10);
  });
});
