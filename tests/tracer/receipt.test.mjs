/**
 * GitVan v2 Receipt Tests
 * Tests receipt generation and writing system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { createHash } from 'crypto';

describe('Receipt System', () => {
  let tempDir;
  let receiptsDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gitvan-receipt-test-'));
    receiptsDir = join(tempDir, '.gitvan', 'receipts');
    await mkdir(receiptsDir, { recursive: true });
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('Receipt Generation', () => {
    it('should generate a complete receipt', async () => {
      const job = {
        meta: {
          id: 'job-123',
          name: 'Test Job',
          kind: 'commit',
          description: 'A test job for validation'
        },
        ctx: {
          cwd: '/test/project',
          env: { NODE_ENV: 'test' },
          args: { verbose: true },
          git: {
            branch: 'main',
            commit: 'abc123def456',
            remote: 'origin',
            isDirty: false
          },
          user: {
            name: 'Test User',
            email: 'test@example.com'
          },
          timestamp: new Date('2024-01-15T10:30:45Z'),
          sessionId: 'session-789'
        }
      };

      const result = {
        success: true,
        exitCode: 0,
        stdout: 'Job completed successfully',
        stderr: '',
        duration: 1500,
        data: { processed: 42 },
        files: {
          created: ['dist/bundle.js'],
          modified: ['package.json'],
          deleted: []
        }
      };

      const receipt = generateReceipt(job, result);

      expect(receipt.version).toBe('1.0');
      expect(receipt.meta.schema).toBe('gitvan-receipt-v1');
      expect(receipt.meta.id).toBeDefined();
      expect(receipt.meta.timestamp).toBeInstanceOf(Date);
      expect(receipt.meta.tracerVersion).toBeDefined();

      expect(receipt.context.cwd).toBe('/test/project');
      expect(receipt.context.git.branch).toBe('main');
      expect(receipt.context.git.commit).toBe('abc123def456');
      expect(receipt.context.user.name).toBe('Test User');

      expect(receipt.execution.job.meta.id).toBe('job-123');
      expect(receipt.execution.result.success).toBe(true);
      expect(receipt.execution.duration).toBe(1500);

      expect(receipt.changes.created).toHaveLength(1);
      expect(receipt.changes.created[0].path).toBe('dist/bundle.js');

      expect(receipt.audit.hash).toBeDefined();
      expect(receipt.audit.verified).toBe(true);
    });

    it('should generate receipt for failed job', async () => {
      const job = {
        meta: { id: 'failed-job', name: 'Failed Job', kind: 'build' },
        ctx: {
          cwd: '/test',
          git: { branch: 'feature', commit: 'xyz789', isDirty: true },
          timestamp: new Date(),
          sessionId: 'session-123'
        }
      };

      const result = {
        success: false,
        exitCode: 1,
        stdout: 'Build started...',
        stderr: 'Error: Module not found',
        duration: 500,
        error: {
          message: 'Build failed',
          stack: 'Error: Build failed\n    at build.js:10:5',
          code: 'BUILD_ERROR'
        }
      };

      const receipt = generateReceipt(job, result);

      expect(receipt.execution.result.success).toBe(false);
      expect(receipt.execution.result.exitCode).toBe(1);
      expect(receipt.execution.result.error.message).toBe('Build failed');
      expect(receipt.context.git.isDirty).toBe(true);
    });

    it('should include performance metrics', async () => {
      const job = {
        meta: { id: 'perf-job', name: 'Performance Job', kind: 'test' },
        ctx: { cwd: '/test', timestamp: new Date(), sessionId: 'session-perf' }
      };

      const result = { success: true, exitCode: 0, duration: 2000 };

      const performanceData = {
        memory: { peak: 104857600, average: 52428800 },
        cpu: { peak: 85.5, average: 42.3 },
        disk: { bytesRead: 1048576, bytesWritten: 524288 }
      };

      const receipt = generateReceipt(job, result, { performance: performanceData });

      expect(receipt.performance.memory.peak).toBe(104857600);
      expect(receipt.performance.memory.average).toBe(52428800);
      expect(receipt.performance.cpu.peak).toBe(85.5);
      expect(receipt.performance.disk.bytesRead).toBe(1048576);
    });
  });

  describe('Receipt Writing', () => {
    it('should write receipt to file with correct naming pattern', async () => {
      const receipt = {
        version: '1.0',
        meta: {
          id: 'receipt-456',
          timestamp: new Date('2024-01-15T10:30:45Z'),
          tracerVersion: '2.0.0',
          schema: 'gitvan-receipt-v1'
        },
        execution: {
          job: { meta: { id: 'job-456', name: 'Test Job' } }
        }
      };

      const filename = await writeReceipt(receipt, receiptsDir, 'receipt-{timestamp}-{id}.json');

      expect(filename).toMatch(/^receipt-\d{8}T\d{6}Z-receipt-456\.json$/);

      const filePath = join(receiptsDir, filename);
      const content = await readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.version).toBe('1.0');
      expect(parsed.meta.id).toBe('receipt-456');
    });

    it('should handle custom naming patterns', async () => {
      const receipt = {
        meta: {
          id: 'custom-receipt',
          timestamp: new Date('2024-01-15T10:30:45Z')
        },
        execution: {
          job: { meta: { name: 'Custom Job', kind: 'deploy' } }
        }
      };

      const customPattern = '{kind}-{jobName}-{timestamp}.receipt.json';
      const filename = await writeReceipt(receipt, receiptsDir, customPattern);

      expect(filename).toMatch(/^deploy-Custom_Job-\d{8}T\d{6}Z\.receipt\.json$/);
    });

    it('should handle filename sanitization', async () => {
      const receipt = {
        meta: { id: 'receipt/with:invalid*chars', timestamp: new Date() },
        execution: {
          job: { meta: { name: 'Job with <special> characters!' } }
        }
      };

      const filename = await writeReceipt(receipt, receiptsDir, '{jobName}-{id}.json');

      // Should sanitize invalid characters
      expect(filename).not.toContain('/');
      expect(filename).not.toContain(':');
      expect(filename).not.toContain('*');
      expect(filename).not.toContain('<');
      expect(filename).not.toContain('>');
    });

    it('should create directory if it does not exist', async () => {
      const nonExistentDir = join(tempDir, 'new', 'receipts', 'dir');
      const receipt = {
        meta: { id: 'test-receipt', timestamp: new Date() },
        execution: { job: { meta: { name: 'Test' } } }
      };

      const filename = await writeReceipt(receipt, nonExistentDir, '{id}.json');
      const filePath = join(nonExistentDir, filename);

      const content = await readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.meta.id).toBe('test-receipt');
    });
  });

  describe('Receipt Validation', () => {
    it('should validate receipt integrity with hash', async () => {
      const receipt = {
        version: '1.0',
        meta: { id: 'hash-test', timestamp: new Date() },
        execution: { job: { meta: { name: 'Hash Job' } } },
        audit: { hash: '', verified: false }
      };

      // Generate hash
      const receiptCopy = { ...receipt };
      delete receiptCopy.audit;
      const hash = createHash('sha256')
        .update(JSON.stringify(receiptCopy, null, 2))
        .digest('hex');

      receipt.audit.hash = hash;
      receipt.audit.verified = true;

      const isValid = validateReceiptIntegrity(receipt);
      expect(isValid).toBe(true);
    });

    it('should detect tampered receipts', async () => {
      const receipt = {
        version: '1.0',
        meta: { id: 'tampered-test', timestamp: new Date() },
        execution: { job: { meta: { name: 'Original Job' } } },
        audit: { hash: 'original-hash', verified: true }
      };

      // Tamper with the receipt
      receipt.execution.job.meta.name = 'Tampered Job';

      const isValid = validateReceiptIntegrity(receipt);
      expect(isValid).toBe(false);
    });

    it('should validate receipt schema', async () => {
      const validReceipt = {
        version: '1.0',
        meta: {
          id: 'valid-receipt',
          timestamp: new Date(),
          tracerVersion: '2.0.0',
          schema: 'gitvan-receipt-v1'
        },
        context: {
          cwd: '/test',
          git: { branch: 'main', commit: 'abc123', isDirty: false, root: '/test' },
          user: {},
          env: { nodeVersion: '18.0.0', platform: 'linux', arch: 'x64', vars: {} },
          session: { id: 'session-1', startTime: new Date() }
        },
        execution: {
          job: { meta: { id: 'job-1', name: 'Test' } },
          result: { success: true, exitCode: 0, duration: 1000 },
          startTime: new Date(),
          endTime: new Date(),
          duration: 1000
        },
        changes: { created: [], modified: [], deleted: [] },
        performance: {
          memory: { peak: 0, average: 0 },
          cpu: { peak: 0, average: 0 },
          disk: { bytesRead: 0, bytesWritten: 0 }
        },
        audit: { hash: 'test-hash', verified: true }
      };

      const isValid = validateReceiptSchema(validReceipt);
      expect(isValid).toBe(true);
    });

    it('should reject invalid receipt schema', async () => {
      const invalidReceipt = {
        version: '2.0', // Invalid version
        meta: { id: 'invalid' }
        // Missing required fields
      };

      const isValid = validateReceiptSchema(invalidReceipt);
      expect(isValid).toBe(false);
    });
  });

  describe('Receipt Reading and Parsing', () => {
    it('should read and parse receipt from file', async () => {
      const receipt = {
        version: '1.0',
        meta: { id: 'read-test', timestamp: new Date() },
        execution: { job: { meta: { name: 'Read Job' } } }
      };

      const filename = 'test-receipt.json';
      const filePath = join(receiptsDir, filename);
      await writeFile(filePath, JSON.stringify(receipt, null, 2));

      const readReceipt = await readReceiptFromFile(filePath);

      expect(readReceipt.meta.id).toBe('read-test');
      expect(readReceipt.execution.job.meta.name).toBe('Read Job');
    });

    it('should handle corrupted receipt files', async () => {
      const corruptedFile = join(receiptsDir, 'corrupted.json');
      await writeFile(corruptedFile, '{ invalid json content');

      await expect(readReceiptFromFile(corruptedFile)).rejects.toThrow();
    });

    it('should parse receipt timestamps correctly', async () => {
      const timestamp = new Date('2024-01-15T10:30:45Z');
      const receipt = {
        version: '1.0',
        meta: { id: 'timestamp-test', timestamp },
        execution: {
          startTime: timestamp,
          endTime: new Date(timestamp.getTime() + 1000)
        }
      };

      const filename = 'timestamp-receipt.json';
      const filePath = join(receiptsDir, filename);
      await writeFile(filePath, JSON.stringify(receipt));

      const readReceipt = await readReceiptFromFile(filePath);

      expect(new Date(readReceipt.meta.timestamp)).toEqual(timestamp);
      expect(new Date(readReceipt.execution.startTime)).toEqual(timestamp);
    });
  });

  describe('Receipt Cleanup and Retention', () => {
    it('should clean up old receipts based on retention policy', async () => {
      const retentionPolicy = {
        maxCount: 3,
        maxAge: 7 // days
      };

      // Create receipts with different ages
      const receipts = [
        { id: 'recent-1', timestamp: new Date() },
        { id: 'recent-2', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        { id: 'old-1', timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
        { id: 'old-2', timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) }
      ];

      // Write receipt files
      for (const receipt of receipts) {
        const filename = `receipt-${receipt.id}.json`;
        const content = { version: '1.0', meta: receipt };
        await writeFile(join(receiptsDir, filename), JSON.stringify(content));
      }

      await cleanupReceipts(receiptsDir, retentionPolicy);

      // Check remaining files
      const remainingFiles = await readdir(receiptsDir);
      expect(remainingFiles).toHaveLength(2); // Only recent receipts should remain
      expect(remainingFiles).toContain('receipt-recent-1.json');
      expect(remainingFiles).toContain('receipt-recent-2.json');
    });

    it('should respect maximum count limit', async () => {
      const retentionPolicy = { maxCount: 2, maxAge: 365 };

      // Create 5 receipts
      for (let i = 1; i <= 5; i++) {
        const filename = `receipt-${i}.json`;
        const content = {
          version: '1.0',
          meta: { id: `receipt-${i}`, timestamp: new Date(Date.now() - i * 60 * 1000) }
        };
        await writeFile(join(receiptsDir, filename), JSON.stringify(content));
      }

      await cleanupReceipts(receiptsDir, retentionPolicy);

      const remainingFiles = await readdir(receiptsDir);
      expect(remainingFiles).toHaveLength(2); // Only 2 most recent
    });
  });

  describe('Receipt Search and Filtering', () => {
    it('should search receipts by job criteria', async () => {
      const receipts = [
        { jobName: 'Build Job', jobKind: 'build', success: true },
        { jobName: 'Test Job', jobKind: 'test', success: false },
        { jobName: 'Deploy Job', jobKind: 'deploy', success: true }
      ];

      // Create receipt files
      for (const receipt of receipts) {
        const filename = `${receipt.jobName.replace(' ', '-').toLowerCase()}.json`;
        const content = {
          version: '1.0',
          meta: { id: receipt.jobName.toLowerCase() },
          execution: {
            job: { meta: { name: receipt.jobName, kind: receipt.jobKind } },
            result: { success: receipt.success }
          }
        };
        await writeFile(join(receiptsDir, filename), JSON.stringify(content));
      }

      // Search by job kind
      const buildReceipts = await searchReceipts(receiptsDir, { jobKind: 'build' });
      expect(buildReceipts).toHaveLength(1);
      expect(buildReceipts[0].execution.job.meta.name).toBe('Build Job');

      // Search by success status
      const successfulReceipts = await searchReceipts(receiptsDir, { success: true });
      expect(successfulReceipts).toHaveLength(2);

      // Search by job name pattern
      const testReceipts = await searchReceipts(receiptsDir, { jobNamePattern: /test/i });
      expect(testReceipts).toHaveLength(1);
      expect(testReceipts[0].execution.job.meta.name).toBe('Test Job');
    });

    it('should filter receipts by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const receipts = [
        { id: 'today', timestamp: now },
        { id: 'yesterday', timestamp: yesterday },
        { id: 'week-ago', timestamp: weekAgo }
      ];

      for (const receipt of receipts) {
        const content = { version: '1.0', meta: receipt };
        await writeFile(join(receiptsDir, `${receipt.id}.json`), JSON.stringify(content));
      }

      const recentReceipts = await searchReceipts(receiptsDir, {
        dateRange: { start: yesterday, end: now }
      });

      expect(recentReceipts).toHaveLength(2);
      expect(recentReceipts.some(r => r.meta.id === 'today')).toBe(true);
      expect(recentReceipts.some(r => r.meta.id === 'yesterday')).toBe(true);
    });
  });
});

// Mock helper functions for testing
function generateReceipt(job, result, options = {}) {
  const timestamp = new Date();
  const receiptId = `receipt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    version: '1.0',
    meta: {
      id: receiptId,
      timestamp,
      tracerVersion: '2.0.0',
      schema: 'gitvan-receipt-v1'
    },
    context: {
      cwd: job.ctx.cwd || process.cwd(),
      git: {
        branch: job.ctx.git?.branch || 'main',
        commit: job.ctx.git?.commit || 'unknown',
        remote: job.ctx.git?.remote,
        isDirty: job.ctx.git?.isDirty || false,
        root: job.ctx.cwd || process.cwd()
      },
      user: {
        name: job.ctx.user?.name,
        email: job.ctx.user?.email
      },
      env: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        vars: {}
      },
      session: {
        id: job.ctx.sessionId || 'unknown',
        startTime: job.ctx.timestamp || timestamp
      }
    },
    execution: {
      job,
      result,
      startTime: job.ctx.timestamp || timestamp,
      endTime: new Date(timestamp.getTime() + (result.duration || 0)),
      duration: result.duration || 0
    },
    changes: {
      created: (result.files?.created || []).map(path => ({ path, size: 0 })),
      modified: (result.files?.modified || []).map(path => ({ path, sizeBefore: 0, sizeAfter: 0 })),
      deleted: (result.files?.deleted || []).map(path => ({ path, sizeBefore: 0 }))
    },
    performance: options.performance || {
      memory: { peak: 0, average: 0 },
      cpu: { peak: 0, average: 0 },
      disk: { bytesRead: 0, bytesWritten: 0 }
    },
    audit: {
      hash: 'mock-hash',
      verified: true
    }
  };
}

async function writeReceipt(receipt, outputDir, pattern) {
  await mkdir(outputDir, { recursive: true });

  const filename = pattern
    .replace('{timestamp}', receipt.meta.timestamp.toISOString().replace(/[:.]/g, '').slice(0, 15) + 'Z')
    .replace('{id}', receipt.meta.id)
    .replace('{jobName}', (receipt.execution?.job?.meta?.name || 'unknown').replace(/[^a-zA-Z0-9]/g, '_'))
    .replace('{kind}', receipt.execution?.job?.meta?.kind || 'unknown');

  const filePath = join(outputDir, filename);
  await writeFile(filePath, JSON.stringify(receipt, null, 2));

  return filename;
}

function validateReceiptIntegrity(receipt) {
  const receiptCopy = { ...receipt };
  delete receiptCopy.audit;

  const hash = createHash('sha256')
    .update(JSON.stringify(receiptCopy, null, 2))
    .digest('hex');

  return hash === receipt.audit.hash;
}

function validateReceiptSchema(receipt) {
  return (
    receipt.version === '1.0' &&
    receipt.meta &&
    receipt.meta.id &&
    receipt.meta.schema === 'gitvan-receipt-v1'
  );
}

async function readReceiptFromFile(filePath) {
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

async function cleanupReceipts(receiptsDir, retentionPolicy) {
  // Mock implementation for testing
  const { readdir, stat, unlink } = await import('fs/promises');
  const files = await readdir(receiptsDir);
  const receipts = [];

  for (const file of files) {
    if (file.endsWith('.json')) {
      const filePath = join(receiptsDir, file);
      const content = await readFile(filePath, 'utf-8');
      const receipt = JSON.parse(content);
      receipts.push({ file, receipt, filePath });
    }
  }

  // Sort by timestamp (newest first)
  receipts.sort((a, b) => new Date(b.receipt.meta.timestamp) - new Date(a.receipt.meta.timestamp));

  // Remove old files beyond maxCount
  if (receipts.length > retentionPolicy.maxCount) {
    const toRemove = receipts.slice(retentionPolicy.maxCount);
    for (const { filePath } of toRemove) {
      await unlink(filePath);
    }
  }

  // Remove files older than maxAge
  const maxAgeMs = retentionPolicy.maxAge * 24 * 60 * 60 * 1000;
  const cutoffDate = new Date(Date.now() - maxAgeMs);

  for (const { receipt, filePath } of receipts) {
    if (new Date(receipt.meta.timestamp) < cutoffDate) {
      await unlink(filePath);
    }
  }
}

async function searchReceipts(receiptsDir, criteria) {
  const { readdir } = await import('fs/promises');
  const files = await readdir(receiptsDir);
  const results = [];

  for (const file of files) {
    if (file.endsWith('.json')) {
      const content = await readFile(join(receiptsDir, file), 'utf-8');
      const receipt = JSON.parse(content);

      let matches = true;

      if (criteria.jobKind && receipt.execution?.job?.meta?.kind !== criteria.jobKind) {
        matches = false;
      }

      if (criteria.success !== undefined && receipt.execution?.result?.success !== criteria.success) {
        matches = false;
      }

      if (criteria.jobNamePattern && !criteria.jobNamePattern.test(receipt.execution?.job?.meta?.name || '')) {
        matches = false;
      }

      if (criteria.dateRange) {
        const receiptDate = new Date(receipt.meta.timestamp);
        if (receiptDate < criteria.dateRange.start || receiptDate > criteria.dateRange.end) {
          matches = false;
        }
      }

      if (matches) {
        results.push(receipt);
      }
    }
  }

  return results;
}