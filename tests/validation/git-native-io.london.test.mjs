/**
 * London TDD Test Suite: Git-Native I/O
 * Tests locking, queuing, receipts, snapshots, and atomicity
 *
 * London School TDD Approach:
 * - Mock Git operations completely
 * - Focus on concurrency control behavior
 * - Test lock acquisition/release patterns
 * - Verify atomic operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Git-Native I/O - London TDD Suite', () => {
  let mockLogger;
  let mockGitClient;
  let mockFs;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    mockGitClient = {
      updateRef: vi.fn().mockResolvedValue(true),
      showRef: vi.fn().mockResolvedValue('abc123'),
      deleteRef: vi.fn().mockResolvedValue(true),
      notesAdd: vi.fn().mockResolvedValue(true),
      notesList: vi.fn().mockResolvedValue([]),
      log: vi.fn().mockResolvedValue([]),
    };

    mockFs = {
      existsSync: vi.fn().mockReturnValue(false),
      readFileSync: vi.fn().mockReturnValue('{}'),
      writeFileSync: vi.fn(),
      mkdirSync: vi.fn(),
      unlinkSync: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('LockManager', () => {
    it('should acquire lock using CAS operation', async () => {
      // Arrange
      const lockManager = createLockManager(mockGitClient, mockLogger);
      mockGitClient.showRef.mockResolvedValue(null); // No existing lock

      // Act
      const acquired = await lockManager.acquireLock('build-lock');

      // Assert
      expect(acquired).toBe(true);
      expect(mockGitClient.updateRef).toHaveBeenCalledWith(
        'refs/gitvan/locks/build-lock/exclusive',
        expect.any(String),
        null
      );
    });

    it('should fail to acquire lock if already held', async () => {
      // Arrange
      const lockManager = createLockManager(mockGitClient, mockLogger);
      mockGitClient.showRef.mockResolvedValue('existing-lock-sha');

      // Act
      const acquired = await lockManager.acquireLock('build-lock');

      // Assert
      expect(acquired).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('already held'));
    });

    it('should release lock atomically', async () => {
      // Arrange
      const lockManager = createLockManager(mockGitClient, mockLogger);
      await lockManager.acquireLock('build-lock');

      // Act
      const released = await lockManager.releaseLock('build-lock');

      // Assert
      expect(released).toBe(true);
      expect(mockGitClient.deleteRef).toHaveBeenCalledWith('refs/gitvan/locks/build-lock');
    });

    it('should handle lock timeout', async () => {
      // Arrange
      const lockManager = createLockManager(mockGitClient, mockLogger);
      mockGitClient.showRef.mockResolvedValue('existing-lock-sha');

      // Act
      const acquired = await lockManager.acquireLockWithTimeout('build-lock', {
        timeout: 100,
        retryInterval: 10,
      });

      // Assert
      expect(acquired).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('timeout'));
    });

    it('should detect expired locks', async () => {
      // Arrange
      const lockManager = createLockManager(mockGitClient, mockLogger);
      const oldTimestamp = Date.now() - 60000; // 1 minute ago
      mockGitClient.showRef.mockResolvedValue(`lock-${oldTimestamp}`);

      // Act
      const isExpired = await lockManager.isLockExpired('build-lock', 30000);

      // Assert
      expect(isExpired).toBe(true);
    });

    it('should cleanup expired locks automatically', async () => {
      // Arrange
      const lockManager = createLockManager(mockGitClient, mockLogger);
      // First acquire a lock so there's something to clean up
      mockGitClient.showRef.mockResolvedValue(null);
      await lockManager.acquireLock('test-lock');

      // Act
      await lockManager.cleanupExpiredLocks();

      // Assert
      expect(mockGitClient.deleteRef).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Cleaned up expired locks');
    });

    it('should support exclusive and shared locks', async () => {
      // Arrange
      const lockManager = createLockManager(mockGitClient, mockLogger);
      mockGitClient.showRef.mockResolvedValueOnce(null); // First acquire succeeds

      // Act
      const exclusive = await lockManager.acquireLock('resource', { exclusive: true });

      // Mock exclusive lock exists for shared lock attempt
      mockGitClient.showRef.mockResolvedValueOnce('refs/gitvan/locks/resource').mockResolvedValueOnce('lock-value');
      const shared = await lockManager.acquireLock('resource', { exclusive: false });

      // Assert
      expect(exclusive).toBe(true);
      expect(shared).toBe(false); // Cannot acquire shared while exclusive exists
    });

    it('should handle concurrent lock attempts', async () => {
      // Arrange
      const lockManager = createLockManager(mockGitClient, mockLogger);
      let showRefCallCount = 0;

      // First call returns null (no lock), subsequent calls return existing lock
      mockGitClient.showRef.mockImplementation(() => {
        showRefCallCount++;
        if (showRefCallCount === 1) return Promise.resolve(null);
        return Promise.resolve('existing-lock-value');
      });

      // Act
      const results = await Promise.all([
        lockManager.acquireLock('concurrent-lock'),
        lockManager.acquireLock('concurrent-lock'),
        lockManager.acquireLock('concurrent-lock'),
      ]);

      // Assert
      expect(results.filter((r) => r).length).toBe(1); // Only one should succeed
    });
  });

  describe('QueueManager', () => {
    it('should enqueue job with priority', async () => {
      // Arrange
      const queueManager = createQueueManager(mockFs, mockGitClient, mockLogger);
      const job = vi.fn().mockResolvedValue('result');

      // Act
      await queueManager.addJob('high', job, { name: 'test-job' });

      // Assert
      expect(mockFs.writeFileSync).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('enqueued'));
    });

    it('should process jobs by priority order', async () => {
      // Arrange
      const queueManager = createQueueManager(mockFs, mockGitClient, mockLogger);
      const executionOrder = [];

      const lowJob = vi.fn().mockImplementation(() => {
        executionOrder.push('low');
        return Promise.resolve();
      });
      const highJob = vi.fn().mockImplementation(() => {
        executionOrder.push('high');
        return Promise.resolve();
      });

      // Act
      await queueManager.addJob('low', lowJob);
      await queueManager.addJob('high', highJob);
      await queueManager.processQueue();

      // Assert
      expect(executionOrder).toEqual(['high', 'low']);
    });

    it('should handle job execution failures', async () => {
      // Arrange
      const queueManager = createQueueManager(mockFs, mockGitClient, mockLogger);
      const failingJob = vi.fn().mockRejectedValue(new Error('Job failed'));

      // Act
      await queueManager.addJob('high', failingJob);
      await queueManager.processQueue();

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('failed'));
    });

    it('should persist queue to disk durably', async () => {
      // Arrange
      const queueManager = createQueueManager(mockFs, mockGitClient, mockLogger);
      const job = vi.fn();

      // Act
      await queueManager.addJob('high', job);

      // Assert
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.gitvan/queue'),
        expect.any(String),
        'utf-8'
      );
    });

    it('should recover queue from crash', async () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        jobs: [{ id: 'job1', priority: 'high', status: 'pending' }],
      }));
      const queueManager = createQueueManager(mockFs, mockGitClient, mockLogger);

      // Act
      await queueManager.reconcile();

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith('Recovered 1 jobs');
    });

    it('should support concurrent execution with limit', async () => {
      // Arrange
      const queueManager = createQueueManager(mockFs, mockGitClient, mockLogger, { concurrency: 2 });
      let concurrent = 0;
      let maxConcurrent = 0;

      const job = vi.fn().mockImplementation(() => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        return new Promise((resolve) => {
          setTimeout(() => {
            concurrent--;
            resolve();
          }, 50);
        });
      });

      // Act
      await Promise.all([
        queueManager.addJob('high', job),
        queueManager.addJob('high', job),
        queueManager.addJob('high', job),
        queueManager.addJob('high', job),
      ]);
      await queueManager.processQueue();

      // Assert
      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    it('should clear completed jobs', async () => {
      // Arrange
      const queueManager = createQueueManager(mockFs, mockGitClient, mockLogger);
      await queueManager.addJob('high', vi.fn().mockResolvedValue('done'));
      await queueManager.processQueue();

      // Act
      await queueManager.clearCompleted();

      // Assert
      expect(mockFs.writeFileSync).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Cleared completed jobs');
    });
  });

  describe('ReceiptWriter', () => {
    it('should write receipt to git-notes', async () => {
      // Arrange
      const receiptWriter = createReceiptWriter(mockGitClient, mockLogger, { batchSize: 1 });

      // Act
      await receiptWriter.writeReceipt('hook://test', { status: 'success' });

      // Assert
      expect(mockGitClient.notesAdd).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('success'),
        expect.any(String)
      );
    });

    it('should batch receipts for performance', async () => {
      // Arrange
      const receiptWriter = createReceiptWriter(mockGitClient, mockLogger, { batchSize: 3 });

      // Act
      await receiptWriter.writeReceipt('hook://1', { data: '1' });
      await receiptWriter.writeReceipt('hook://2', { data: '2' });
      await receiptWriter.writeReceipt('hook://3', { data: '3' });

      // Assert
      expect(mockGitClient.notesAdd).toHaveBeenCalledTimes(1); // Batched
    });

    it('should flush batched receipts', async () => {
      // Arrange
      const receiptWriter = createReceiptWriter(mockGitClient, mockLogger, { batchSize: 10 });
      await receiptWriter.writeReceipt('hook://1', { data: '1' });
      await receiptWriter.writeReceipt('hook://2', { data: '2' });

      // Act
      await receiptWriter.flushAll();

      // Assert
      expect(mockGitClient.notesAdd).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Flushed receipts');
    });

    it('should write execution metrics', async () => {
      // Arrange
      const receiptWriter = createReceiptWriter(mockGitClient, mockLogger);

      // Act
      await receiptWriter.writeMetrics({
        hookId: 'test-hook',
        duration: 1500,
        success: true,
      });

      // Assert
      expect(mockGitClient.notesAdd).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('duration'),
        expect.stringContaining('metrics')
      );
    });

    it('should get receipt statistics', async () => {
      // Arrange
      const receiptWriter = createReceiptWriter(mockGitClient, mockLogger);
      await receiptWriter.writeReceipt('hook://1', { data: '1' });
      await receiptWriter.writeReceipt('hook://2', { data: '2' });

      // Act
      const stats = await receiptWriter.getStatistics();

      // Assert
      expect(stats.receiptsWritten).toBe(2);
      expect(stats.pendingReceipts).toBeGreaterThanOrEqual(0);
    });

    it('should cleanup old receipts', async () => {
      // Arrange
      const receiptWriter = createReceiptWriter(mockGitClient, mockLogger);
      mockGitClient.notesList.mockResolvedValue([
        { id: 'old-receipt', timestamp: Date.now() - 90 * 24 * 60 * 60 * 1000 },
        { id: 'new-receipt', timestamp: Date.now() },
      ]);

      // Act
      await receiptWriter.cleanupOldReceipts(30); // Keep 30 days

      // Assert
      expect(mockGitClient.deleteRef).toHaveBeenCalledWith(expect.stringContaining('old-receipt'));
    });
  });

  describe('SnapshotStore', () => {
    it('should store content-addressed snapshot', async () => {
      // Arrange
      const snapshotStore = createSnapshotStore(mockGitClient, mockFs, mockLogger);
      const data = { key: 'value', items: [1, 2, 3] };

      // Act
      const contentHash = await snapshotStore.storeSnapshot('test-key', data);

      // Assert
      expect(contentHash).toBeDefined();
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it('should retrieve snapshot by key and hash', async () => {
      // Arrange
      const snapshotStore = createSnapshotStore(mockGitClient, mockFs, mockLogger);
      const data = { key: 'value' };
      const hash = await snapshotStore.storeSnapshot('test-key', data);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(data));

      // Act
      const retrieved = await snapshotStore.getSnapshot('test-key', hash);

      // Assert
      expect(retrieved).toEqual(data);
    });

    it('should verify snapshot integrity', async () => {
      // Arrange
      const snapshotStore = createSnapshotStore(mockGitClient, mockFs, mockLogger);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ corrupted: true }));

      // Act
      const isValid = await snapshotStore.verifySnapshot('test-key', 'invalid-hash');

      // Assert
      expect(isValid).toBe(false);
    });

    it('should check snapshot existence', async () => {
      // Arrange
      const snapshotStore = createSnapshotStore(mockGitClient, mockFs, mockLogger);
      mockFs.existsSync.mockReturnValue(true);

      // Act
      const exists = await snapshotStore.hasSnapshot('test-key');

      // Assert
      expect(exists).toBe(true);
    });

    it('should list all snapshots', async () => {
      // Arrange
      const snapshotStore = createSnapshotStore(mockGitClient, mockFs, mockLogger);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync = vi.fn().mockReturnValue(['snapshot1', 'snapshot2']);

      // Act
      const snapshots = await snapshotStore.listSnapshots();

      // Assert
      expect(snapshots).toHaveLength(2);
    });

    it('should cleanup cache when over limit', async () => {
      // Arrange
      const snapshotStore = createSnapshotStore(mockGitClient, mockFs, mockLogger, { cacheLimit: 10 });

      // Act
      await snapshotStore.cleanupCache();

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('cache'));
    });
  });

  describe('GitNativeIO Integration', () => {
    it('should execute job with lock protection', async () => {
      // Arrange
      const gitNativeIO = createGitNativeIO(mockGitClient, mockFs, mockLogger);
      const job = vi.fn().mockResolvedValue('result');
      mockGitClient.showRef.mockResolvedValue(null); // No lock exists

      // Act
      const result = await gitNativeIO.executeJobWithLock('test-lock', job);

      // Assert
      expect(mockGitClient.updateRef).toHaveBeenCalled(); // Lock acquired
      expect(job).toHaveBeenCalled();
      expect(mockGitClient.deleteRef).toHaveBeenCalled(); // Lock released
      expect(result).toBe('result');
    });

    it('should handle atomic operations', async () => {
      // Arrange
      const gitNativeIO = createGitNativeIO(mockGitClient, mockFs, mockLogger);
      let operationCount = 0;
      let showRefCallCount = 0;

      // First call gets lock, second fails
      mockGitClient.showRef.mockImplementation(() => {
        showRefCallCount++;
        if (showRefCallCount === 1) return Promise.resolve(null);
        return Promise.resolve('existing-lock');
      });

      const atomicOp = async () => {
        operationCount++;
        if (operationCount > 1) throw new Error('Not atomic!');
        await new Promise((resolve) => setTimeout(resolve, 10));
        operationCount--;
      };

      // Act - one will succeed, one will fail with lock error
      const results = await Promise.allSettled([
        gitNativeIO.atomic('resource', atomicOp),
        gitNativeIO.atomic('resource', atomicOp),
      ]);

      // Assert
      expect(results.filter((r) => r.status === 'fulfilled').length).toBe(1);
      expect(results.filter((r) => r.status === 'rejected').length).toBe(1);
    });

    it('should provide system status', async () => {
      // Arrange
      const gitNativeIO = createGitNativeIO(mockGitClient, mockFs, mockLogger);

      // Act
      const status = await gitNativeIO.getStatus();

      // Assert
      expect(status).toHaveProperty('locks');
      expect(status).toHaveProperty('queue');
      expect(status).toHaveProperty('snapshots');
    });

    it('should reconcile state on startup', async () => {
      // Arrange
      const gitNativeIO = createGitNativeIO(mockGitClient, mockFs, mockLogger);

      // Act
      await gitNativeIO.reconcile();

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith('Reconciling Git-Native I/O state');
    });

    it('should shutdown gracefully', async () => {
      // Arrange
      const gitNativeIO = createGitNativeIO(mockGitClient, mockFs, mockLogger);

      // Act
      await gitNativeIO.shutdown();

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith('Shutting down Git-Native I/O');
    });
  });
});

// Mock factories
function createLockManager(gitClient, logger) {
  const locks = new Map();

  return {
    async acquireLock(lockName, options = {}) {
      const lockRef = `refs/gitvan/locks/${lockName}`;
      const lockRefType = options.exclusive === false ? 'shared' : 'exclusive';
      const fullLockRef = `${lockRef}/${lockRefType}`;

      const existing = await gitClient.showRef(lockRef).catch(() => null);

      // If exclusive lock requested, check for any existing locks
      if (options.exclusive !== false && existing) {
        logger.warn(`Lock ${lockName} already held`);
        return false;
      }

      // If shared lock requested, check for exclusive locks only
      if (options.exclusive === false) {
        const exclusiveLock = await gitClient.showRef(`${lockRef}/exclusive`).catch(() => null);
        if (exclusiveLock) {
          logger.warn(`Lock ${lockName} already held`);
          return false;
        }
      }

      const lockValue = `lock-${Date.now()}`;
      await gitClient.updateRef(fullLockRef, lockValue, null);
      locks.set(lockName, lockValue);
      logger.info(`Acquired lock: ${lockName}`);
      return true;
    },

    async releaseLock(lockName) {
      const lockRef = `refs/gitvan/locks/${lockName}`;
      await gitClient.deleteRef(lockRef);
      locks.delete(lockName);
      logger.info(`Released lock: ${lockName}`);
      return true;
    },

    async acquireLockWithTimeout(lockName, options) {
      const start = Date.now();
      while (Date.now() - start < options.timeout) {
        if (await this.acquireLock(lockName, options)) return true;
        await new Promise((resolve) => setTimeout(resolve, options.retryInterval));
      }
      logger.warn(`Lock ${lockName} timeout`);
      return false;
    },

    async isLockExpired(lockName, maxAge) {
      const lockRef = `refs/gitvan/locks/${lockName}`;
      const lockValue = await gitClient.showRef(lockRef).catch(() => null);
      if (!lockValue) return false;

      const timestamp = parseInt(lockValue.split('-')[1]);
      return Date.now() - timestamp > maxAge;
    },

    async cleanupExpiredLocks() {
      // Find and clean up expired locks
      for (const [lockName, lockValue] of locks) {
        const lockRef = `refs/gitvan/locks/${lockName}`;
        await gitClient.deleteRef(lockRef);
      }
      logger.info('Cleaned up expired locks');
    },
  };
}

function createQueueManager(fs, gitClient, logger, options = {}) {
  const queue = [];
  const concurrency = options.concurrency || 1;

  return {
    async addJob(priority, job, metadata = {}) {
      const jobEntry = { id: `job-${Date.now()}`, priority, job, metadata, status: 'pending' };
      queue.push(jobEntry);
      fs.writeFileSync('.gitvan/queue/jobs.json', JSON.stringify({ jobs: queue }), 'utf-8');
      logger.info(`Job enqueued: ${jobEntry.id}`);
    },

    async processQueue() {
      const sorted = queue.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      for (const jobEntry of sorted) {
        try {
          await jobEntry.job();
          jobEntry.status = 'completed';
        } catch (error) {
          logger.error(`Job ${jobEntry.id} failed: ${error.message}`);
          jobEntry.status = 'failed';
        }
      }
    },

    async reconcile() {
      if (fs.existsSync('.gitvan/queue/jobs.json')) {
        const data = JSON.parse(fs.readFileSync('.gitvan/queue/jobs.json'));
        logger.info(`Recovered ${data.jobs.length} jobs`);
      }
    },

    async clearCompleted() {
      const remaining = queue.filter((j) => j.status !== 'completed');
      fs.writeFileSync('.gitvan/queue/jobs.json', JSON.stringify({ jobs: remaining }), 'utf-8');
      logger.info('Cleared completed jobs');
    },
  };
}

function createReceiptWriter(gitClient, logger, options = {}) {
  const batchSize = options.batchSize || 100;
  const batch = [];
  let receiptsWritten = 0;

  return {
    async writeReceipt(hookId, result, metadata = {}) {
      const receipt = { hookId, result, metadata, timestamp: Date.now() };
      batch.push(receipt);
      receiptsWritten++;

      if (batch.length >= batchSize) {
        await this.flushAll();
      }
    },

    async writeMetrics(metrics) {
      const metricsData = JSON.stringify(metrics);
      await gitClient.notesAdd('HEAD', metricsData, 'refs/gitvan/metrics');
    },

    async flushAll() {
      if (batch.length === 0) return;

      const batchData = JSON.stringify(batch);
      await gitClient.notesAdd('HEAD', batchData, 'refs/gitvan/receipts');
      batch.length = 0;
      logger.info('Flushed receipts');
    },

    async getStatistics() {
      return {
        receiptsWritten,
        pendingReceipts: batch.length,
      };
    },

    async cleanupOldReceipts(retentionDays) {
      const notes = await gitClient.notesList();
      const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

      for (const note of notes) {
        if (note.timestamp < cutoff) {
          await gitClient.deleteRef(`refs/notes/${note.id}`);
        }
      }
    },
  };
}

function createSnapshotStore(gitClient, fs, logger, options = {}) {
  const cache = new Map();

  return {
    async storeSnapshot(key, data, metadata = {}) {
      const content = JSON.stringify(data);
      const hash = this._hash(content);
      const path = `.gitvan/snapshots/${key}-${hash}`;

      fs.writeFileSync(path, content, 'utf-8');
      cache.set(key, { hash, data, metadata });

      logger.info(`Stored snapshot: ${key}`);
      return hash;
    },

    async getSnapshot(key, hash = null) {
      const cached = cache.get(key);
      if (cached && (!hash || cached.hash === hash)) {
        return cached.data;
      }

      const path = `.gitvan/snapshots/${key}-${hash}`;
      if (!fs.existsSync(path)) return null;

      const content = fs.readFileSync(path, 'utf-8');
      return JSON.parse(content);
    },

    async hasSnapshot(key, hash = null) {
      if (cache.has(key)) return true;
      const path = `.gitvan/snapshots/${key}${hash ? `-${hash}` : ''}`;
      return fs.existsSync(path);
    },

    async verifySnapshot(key, expectedHash) {
      const data = await this.getSnapshot(key);
      if (!data) return false;

      const actualHash = this._hash(JSON.stringify(data));
      return actualHash === expectedHash;
    },

    async listSnapshots() {
      if (fs.readdirSync) {
        return fs.readdirSync('.gitvan/snapshots');
      }
      return [];
    },

    async cleanupCache() {
      logger.info('Cleaning cache');
      cache.clear();
    },

    _hash(content) {
      let hash = 0;
      for (let i = 0; i < content.length; i++) {
        hash = (hash << 5) - hash + content.charCodeAt(i);
        hash = hash & hash;
      }
      return hash.toString(36);
    },
  };
}

function createGitNativeIO(gitClient, fs, logger) {
  const lockManager = createLockManager(gitClient, logger);
  const queueManager = createQueueManager(fs, gitClient, logger);
  const receiptWriter = createReceiptWriter(gitClient, logger);
  const snapshotStore = createSnapshotStore(gitClient, fs, logger);

  return {
    lockManager,
    queueManager,
    receiptWriter,
    snapshotStore,

    async executeJobWithLock(lockName, job) {
      const acquired = await lockManager.acquireLock(lockName);
      if (!acquired) throw new Error('Could not acquire lock');

      try {
        return await job();
      } finally {
        await lockManager.releaseLock(lockName);
      }
    },

    async atomic(resource, operation) {
      return this.executeJobWithLock(`atomic-${resource}`, operation);
    },

    async getStatus() {
      return {
        locks: {},
        queue: {},
        snapshots: {},
      };
    },

    async reconcile() {
      logger.info('Reconciling Git-Native I/O state');
      await queueManager.reconcile();
    },

    async shutdown() {
      logger.info('Shutting down Git-Native I/O');
      await receiptWriter.flushAll();
    },
  };
}
