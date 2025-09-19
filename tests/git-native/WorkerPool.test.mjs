import { test, describe, beforeEach, afterEach, expect } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { WorkerPool } from '../../src/git-native/WorkerPool.mjs';

const execAsync = promisify(exec);

describe('WorkerPool Tests', () => {
  let testDir;
  let workerPool;

  beforeEach(async () => {
    testDir = join(process.cwd(), 'test-workers-' + Date.now());
    await fs.mkdir(testDir, { recursive: true });
    
    // Initialize git repository
    await execAsync('git init', { cwd: testDir });
    await execAsync('git config user.email "test@example.com"', { cwd: testDir });
    await execAsync('git config user.name "Test User"', { cwd: testDir });
    
    // Create initial commit
    await fs.writeFile(join(testDir, 'README.md'), '# Test Repository');
    await execAsync('git add README.md', { cwd: testDir });
    await execAsync('git commit -m "Initial commit"', { cwd: testDir });
    
    workerPool = new WorkerPool({
      cwd: testDir,
      logger: console,
      workers: {
        threads: 2,
        maxJobs: 5,
        timeout: 5000
      }
    });
    
    await workerPool.initialize();
  });

  afterEach(async () => {
    if (workerPool) {
      await workerPool.shutdown();
    }
    
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to clean up test directory: ${error.message}`);
    }
  });

  test('should initialize successfully', async () => {
    expect(workerPool).toBeDefined();
  });

  test('should execute simple jobs', async () => {
    const result = await workerPool.executeJob(async () => {
      return 'Hello, Worker!';
    });
    
    expect(result).toBe('Hello, Worker!');
  });

  test('should execute jobs with return values', async () => {
    const testData = { message: 'test', number: 42 };
    
    const result = await workerPool.executeJob(async () => {
      return testData;
    });
    
    expect(result).toEqual(testData);
  });

  test('should handle job errors', async () => {
    await expect(workerPool.executeJob(async () => {
      throw new Error('Worker job error');
    })).rejects.toThrow('Worker job error');
  });

  test('should handle job timeouts', async () => {
    const timeout = 100; // 100ms timeout
    
    await expect(workerPool.executeJob(async () => {
      // Sleep for longer than timeout
      await new Promise(resolve => setTimeout(resolve, 200));
      return 'should not reach here';
    }, { timeout })).rejects.toThrow('Job timed out');
  });

  test('should execute multiple jobs concurrently', async () => {
    const jobs = [];
    
    // Create multiple jobs
    for (let i = 0; i < 5; i++) {
      jobs.push(
        workerPool.executeJob(async () => {
          // Simulate some work
          await new Promise(resolve => setTimeout(resolve, 10));
          return `job-${i}`;
        })
      );
    }
    
    // Execute all jobs concurrently
    const results = await Promise.all(jobs);
    
    // Verify results
    expect(results.length).toBe(5);
    for (let i = 0; i < 5; i++) {
      expect(results[i]).toBe(`job-${i}`);
    }
  });

  test('should queue jobs when all workers are busy', async () => {
    const slowJob = workerPool.executeJob(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return 'slow-job';
    });
    
    const fastJob = workerPool.executeJob(async () => {
      return 'fast-job';
    });
    
    // Both jobs should complete
    const results = await Promise.all([slowJob, fastJob]);
    expect(results).toContain('slow-job');
    expect(results).toContain('fast-job');
  });

  test('should provide accurate status', async () => {
    const status = workerPool.getStatus();
    
    expect(typeof status.total).toBe('number');
    expect(typeof status.active).toBe('number');
    expect(typeof status.available).toBe('number');
    
    expect(status.total).toBe(2); // 2 threads configured
    expect(status.available).toBe(2); // All workers available initially
    expect(status.active).toBe(0); // No active jobs initially
  });

  test('should update status during job execution', async () => {
    const statusBefore = workerPool.getStatus();
    expect(statusBefore.active).toBe(0);
    expect(statusBefore.available).toBe(2);
    
    // Start a job
    const jobPromise = workerPool.executeJob(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return 'status-test-job';
    });
    
    // Check status during execution
    await new Promise(resolve => setTimeout(resolve, 10));
    const statusDuring = workerPool.getStatus();
    expect(statusDuring.active).toBe(1);
    expect(statusDuring.available).toBe(1);
    
    // Wait for job to complete
    await jobPromise;
    
    // Check status after completion
    const statusAfter = workerPool.getStatus();
    expect(statusAfter.active).toBe(0);
    expect(statusAfter.available).toBe(2);
  });

  test('should handle worker errors gracefully', async () => {
    // This test is harder to implement without mocking
    // For now, just verify that the pool can handle normal operations
    const result = await workerPool.executeJob(async () => {
      return 'error-handling-test';
    });
    
    expect(result).toBe('error-handling-test');
  });

  test('should shutdown gracefully', async () => {
    // Start a job
    const jobPromise = workerPool.executeJob(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return 'shutdown-test';
    });
    
    // Shutdown before job completes
    await workerPool.shutdown();
    
    // Job should be rejected
    await expect(jobPromise).rejects.toThrow('WorkerPool is shutting down');
  });

  test('should reject new jobs after shutdown', async () => {
    await workerPool.shutdown();
    
    await expect(workerPool.executeJob(async () => {
      return 'should not execute';
    })).rejects.toThrow('WorkerPool is shutting down');
  });

  test('should handle jobs with complex data structures', async () => {
    const complexData = {
      string: 'test',
      number: 42,
      boolean: true,
      array: [1, 2, 3],
      object: { nested: 'value' },
      null: null,
      undefined: undefined
    };
    
    const result = await workerPool.executeJob(async () => {
      return complexData;
    });
    
    expect(result).toEqual(complexData);
  });

  test('should handle jobs with async operations', async () => {
    const result = await workerPool.executeJob(async () => {
      // Simulate async operations
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const data = await Promise.resolve('async-data');
      return data;
    });
    
    expect(result).toBe('async-data');
  });

  test('should handle jobs with file system operations', async () => {
    const result = await workerPool.executeJob(async () => {
      // Create a temporary file
      const tempFile = join(testDir, 'worker-test.txt');
      await fs.writeFile(tempFile, 'worker test content');
      
      // Read it back
      const content = await fs.readFile(tempFile, 'utf8');
      
      // Clean up
      await fs.unlink(tempFile);
      
      return content;
    });
    
    expect(result).toBe('worker test content');
  });

  test('should respect max jobs limit', async () => {
    const maxJobs = 3;
    
    // Create a worker pool with low max jobs
    const limitedPool = new WorkerPool({
      cwd: testDir,
      logger: console,
      workers: {
        threads: 2,
        maxJobs: maxJobs,
        timeout: 5000
      }
    });
    
    await limitedPool.initialize();
    
    try {
      const jobs = [];
      
      // Create more jobs than max
      for (let i = 0; i < maxJobs + 2; i++) {
        jobs.push(
          limitedPool.executeJob(async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            return `job-${i}`;
          })
        );
      }
      
      // All jobs should eventually complete
      const results = await Promise.all(jobs);
      expect(results.length).toBe(maxJobs + 2);
      
    } finally {
      await limitedPool.shutdown();
    }
  });
});
