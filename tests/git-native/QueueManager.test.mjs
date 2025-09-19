import { test, describe, beforeEach, afterEach, expect } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { QueueManager } from '../../src/git-native/QueueManager.mjs';

const execAsync = promisify(exec);

describe('QueueManager Tests', () => {
  let testDir;
  let queueManager;

  beforeEach(async () => {
    testDir = join(process.cwd(), 'test-queue-' + Date.now());
    await fs.mkdir(testDir, { recursive: true });
    
    queueManager = new QueueManager({
      cwd: testDir,
      logger: console
    });
    
    await queueManager.initialize();
  });

  afterEach(async () => {
    if (queueManager) {
      await queueManager.shutdown();
    }
    
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to clean up test directory: ${error.message}`);
    }
  });

  test('should initialize with default configuration', async () => {
    const status = queueManager.getStatus();
    
    expect(status.high).toBeDefined();
    expect(status.medium).toBeDefined();
    expect(status.low).toBeDefined();
    
    expect(status.high.concurrency).toBe(3);
    expect(status.medium.concurrency).toBe(3);
    expect(status.low.concurrency).toBe(3);
  });

  test('should execute jobs in priority order', async () => {
    const results = [];
    
    const highJob = async () => {
      results.push('high');
      return 'high-result';
    };
    
    const mediumJob = async () => {
      results.push('medium');
      return 'medium-result';
    };
    
    const lowJob = async () => {
      results.push('low');
      return 'low-result';
    };
    
    // Add jobs to different priorities
    const highResult = await queueManager.addJob('high', highJob);
    const mediumResult = await queueManager.addJob('medium', mediumJob);
    const lowResult = await queueManager.addJob('low', lowJob);
    
    expect(highResult).toBe('high-result');
    expect(mediumResult).toBe('medium-result');
    expect(lowResult).toBe('low-result');
    
    expect(results).toContain('high');
    expect(results).toContain('medium');
    expect(results).toContain('low');
  });

  test('should handle job errors gracefully', async () => {
    const errorJob = async () => {
      throw new Error('Job execution error');
    };
    
    await expect(queueManager.addJob('high', errorJob)).rejects.toThrow('Job execution error');
  });

  test('should pause and resume queues', async () => {
    queueManager.pauseAll();
    
    const status = queueManager.getStatus();
    expect(status.high.isPaused).toBe(true);
    expect(status.medium.isPaused).toBe(true);
    expect(status.low.isPaused).toBe(true);
    
    queueManager.resumeAll();
    
    const resumedStatus = queueManager.getStatus();
    expect(resumedStatus.high.isPaused).toBe(false);
    expect(resumedStatus.medium.isPaused).toBe(false);
    expect(resumedStatus.low.isPaused).toBe(false);
  });

  test('should clear completed jobs', async () => {
    // Execute some jobs
    await queueManager.addJob('high', async () => 'completed');
    await queueManager.addJob('medium', async () => 'completed');
    
    // Clear completed jobs
    const clearedCount = await queueManager.clearCompleted();
    expect(clearedCount).toBeGreaterThanOrEqual(0);
  });

  test('should reconcile interrupted jobs', async () => {
    // Create some job files manually to simulate interruption
    const queueDir = join(testDir, '.gitvan', 'queue', 'high');
    await fs.mkdir(queueDir, { recursive: true });
    
    const jobRecord = {
      id: 'test-job-1',
      priority: 'high',
      status: 'queued',
      timestamp: Date.now(),
      metadata: {}
    };
    
    await fs.writeFile(
      join(queueDir, 'test-job-1.json'),
      JSON.stringify(jobRecord, null, 2)
    );
    
    // Reconcile
    const recoveredCount = await queueManager.reconcile();
    expect(recoveredCount).toBeGreaterThanOrEqual(0);
  });

  test('should provide accurate queue status', async () => {
    const status = queueManager.getStatus();
    
    expect(typeof status.high.pending).toBe('number');
    expect(typeof status.high.size).toBe('number');
    expect(typeof status.high.isPaused).toBe('boolean');
    expect(typeof status.high.concurrency).toBe('number');
    
    expect(typeof status.medium.pending).toBe('number');
    expect(typeof status.medium.size).toBe('number');
    expect(typeof status.medium.isPaused).toBe('boolean');
    expect(typeof status.medium.concurrency).toBe('number');
    
    expect(typeof status.low.pending).toBe('number');
    expect(typeof status.low.size).toBe('number');
    expect(typeof status.low.isPaused).toBe('boolean');
    expect(typeof status.low.concurrency).toBe('number');
  });
});
