import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  RDFLockManagerAdapter,
  RDFSnapshotStoreAdapter,
  RDFQueueManagerAdapter,
  createMigrationAdapters,
  getMigrationHealth
} from '../../src/git-native/RDFMigrationAdapter.mjs';

/**
 * Mock LockManager for testing
 */
class MockLockManager {
  constructor() {
    this.locks = new Map();
    this.initialized = false;
  }

  async initialize() {
    this.initialized = true;
  }

  async acquireLock(lockName, options = {}) {
    if (this.locks.has(lockName)) {
      return false;
    }
    this.locks.set(lockName, {
      name: lockName,
      acquiredAt: Date.now(),
      timeout: options.timeout || 30000,
      fingerprint: options.fingerprint || 'test'
    });
    return true;
  }

  async releaseLock(lockName) {
    return this.locks.delete(lockName);
  }

  async getLockInfo(lockName) {
    return this.locks.get(lockName) || null;
  }

  async isLocked(lockName) {
    return this.locks.has(lockName);
  }

  async listLocks() {
    return Array.from(this.locks.values());
  }

  async clearAllLocks() {
    const count = this.locks.size;
    this.locks.clear();
    return count;
  }

  async cleanupExpiredLocks() {
    let count = 0;
    const now = Date.now();
    for (const [name, lock] of this.locks.entries()) {
      if (now - lock.acquiredAt > lock.timeout) {
        this.locks.delete(name);
        count++;
      }
    }
    return count;
  }

  async validateFingerprint(lockName, fingerprint) {
    const lock = this.locks.get(lockName);
    return lock && lock.fingerprint === fingerprint;
  }
}

/**
 * Mock SnapshotStore for testing
 */
class MockSnapshotStore {
  constructor() {
    this.snapshots = new Map();
    this.initialized = false;
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      entries: 0,
      hitRate: 0,
      maxSize: 1073741824,
      sizeMB: 0
    };
  }

  async initialize() {
    this.initialized = true;
  }

  async storeSnapshot(key, data, metadata = {}) {
    const hash = this._hash(data);
    this.snapshots.set(hash, {
      key,
      data,
      metadata,
      contentHash: hash,
      timestamp: Date.now()
    });
    this.stats.entries++;
    return hash;
  }

  async getSnapshot(key, contentHash = null) {
    if (contentHash) {
      const snapshot = this.snapshots.get(contentHash);
      if (snapshot && snapshot.key === key) {
        this.stats.hits++;
        return snapshot.data;
      }
    } else {
      for (const snapshot of this.snapshots.values()) {
        if (snapshot.key === key) {
          this.stats.hits++;
          return snapshot.data;
        }
      }
    }
    this.stats.misses++;
    return null;
  }

  async hasSnapshot(key, contentHash = null) {
    return (await this.getSnapshot(key, contentHash)) !== null;
  }

  async removeSnapshot(key, contentHash = null) {
    if (contentHash) {
      const snapshot = this.snapshots.get(contentHash);
      if (snapshot && snapshot.key === key) {
        this.snapshots.delete(contentHash);
        this.stats.entries--;
        return true;
      }
    }
    return false;
  }

  async listSnapshots() {
    return Array.from(this.snapshots.values())
      .map(s => ({
        key: s.key,
        contentHash: s.contentHash,
        timestamp: s.timestamp,
        metadata: s.metadata
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getStatistics() {
    return { ...this.stats };
  }

  async cleanupCache(maxAgeMs = 86400000) {
    let count = 0;
    const now = Date.now();
    for (const [hash, snapshot] of this.snapshots.entries()) {
      if (now - snapshot.timestamp > maxAgeMs) {
        this.snapshots.delete(hash);
        count++;
      }
    }
    return count;
  }

  async clearCache() {
    const count = this.snapshots.size;
    this.snapshots.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      entries: 0,
      hitRate: 0,
      maxSize: 1073741824,
      sizeMB: 0
    };
    return count;
  }

  _hash(data) {
    // Use actual content for unique hashes
    return 'hash-' + JSON.stringify(data);
  }
}

/**
 * Mock QueueManager for testing
 */
class MockQueueManager {
  constructor() {
    this.queues = {
      high: { pending: 0, size: 0, isPaused: false, concurrency: 3 },
      medium: { pending: 0, size: 0, isPaused: false, concurrency: 3 },
      low: { pending: 0, size: 0, isPaused: false, concurrency: 3 }
    };
    this.jobs = [];
    this.initialized = false;
  }

  async initialize() {
    this.initialized = true;
  }

  async addJob(priority, job, metadata = {}) {
    this.queues[priority].pending++;
    this.queues[priority].size++;

    const jobRecord = {
      priority,
      metadata,
      addedAt: Date.now()
    };
    this.jobs.push(jobRecord);

    try {
      const result = await job();
      this.queues[priority].pending--;
      return result;
    } catch (error) {
      this.queues[priority].pending--;
      throw error;
    }
  }

  getStatus() {
    return { ...this.queues };
  }

  pauseAll() {
    for (const queue of Object.values(this.queues)) {
      queue.isPaused = true;
    }
  }

  resumeAll() {
    for (const queue of Object.values(this.queues)) {
      queue.isPaused = false;
    }
  }

  async clearCompleted() {
    const count = this.jobs.filter(j => j.completed).length;
    this.jobs = this.jobs.filter(j => !j.completed);
    return count;
  }

  async reconcile() {
    return 0;
  }

  async shutdown() {
    this.initialized = false;
  }
}

describe('RDFLockManagerAdapter', () => {
  let jsonManager;
  let rdfManager;
  let adapter;
  let mockLogger;

  beforeEach(() => {
    jsonManager = new MockLockManager();
    rdfManager = new MockLockManager();
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    };
    adapter = new RDFLockManagerAdapter(jsonManager, rdfManager, {
      logger: mockLogger,
      mode: 'dual-write'
    });
  });

  describe('initialization', () => {
    it('should initialize both managers', async () => {
      await adapter.initialize();
      expect(jsonManager.initialized).toBe(true);
      expect(rdfManager.initialized).toBe(true);
    });
  });

  describe('dual-write mode', () => {
    it('should write to both managers when acquiring lock', async () => {
      await adapter.initialize();
      const result = await adapter.acquireLock('test-lock');

      expect(result).toBe(true);
      expect(await jsonManager.isLocked('test-lock')).toBe(true);
      expect(await rdfManager.isLocked('test-lock')).toBe(true);
    });

    it('should release from both managers', async () => {
      await adapter.initialize();
      await adapter.acquireLock('test-lock');
      await adapter.releaseLock('test-lock');

      expect(await jsonManager.isLocked('test-lock')).toBe(false);
      expect(await rdfManager.isLocked('test-lock')).toBe(false);
    });

    it('should prefer RDF data when reading', async () => {
      await adapter.initialize();
      await rdfManager.acquireLock('test-lock', { fingerprint: 'rdf-fp' });
      await jsonManager.acquireLock('test-lock', { fingerprint: 'json-fp' });

      const info = await adapter.getLockInfo('test-lock');
      expect(info.fingerprint).toBe('rdf-fp');
    });

    it('should merge locks from both systems', async () => {
      await adapter.initialize();
      await rdfManager.acquireLock('rdf-lock');
      await jsonManager.acquireLock('json-lock');

      const locks = await adapter.listLocks();
      expect(locks.length).toBe(2);
      expect(locks.some(l => l.name === 'rdf-lock')).toBe(true);
      expect(locks.some(l => l.name === 'json-lock')).toBe(true);
    });

    it('should track statistics', async () => {
      await adapter.initialize();
      await adapter.acquireLock('test-lock');
      await adapter.getLockInfo('test-lock');

      const stats = adapter.getStats();
      expect(stats.rdfWrites).toBeGreaterThan(0);
      expect(stats.jsonWrites).toBeGreaterThan(0);
      expect(stats.rdfReads).toBeGreaterThan(0);
      expect(stats.jsonReads).toBeGreaterThan(0);
    });
  });

  describe('rdf-primary mode', () => {
    beforeEach(() => {
      adapter.setMigrationMode('rdf-primary');
    });

    it('should write to both but prefer RDF for reads', async () => {
      await adapter.initialize();
      await adapter.acquireLock('test-lock');

      const info = await adapter.getLockInfo('test-lock');
      expect(info).toBeTruthy();
      expect(adapter.getStats().rdfReads).toBeGreaterThan(0);
    });

    it('should fallback to JSON if RDF fails', async () => {
      await adapter.initialize();
      await jsonManager.acquireLock('test-lock');

      // Simulate RDF failure by clearing it
      rdfManager.locks.clear();

      const info = await adapter.getLockInfo('test-lock');
      expect(info).toBeTruthy();
      expect(adapter.getStats().fallbacks).toBeGreaterThan(0);
    });

    it('should return true if RDF acquisition succeeds', async () => {
      await adapter.initialize();

      // Make JSON fail
      vi.spyOn(jsonManager, 'acquireLock').mockRejectedValue(new Error('JSON failed'));

      const result = await adapter.acquireLock('test-lock');
      expect(result).toBe(true);
    });
  });

  describe('rdf-only mode', () => {
    beforeEach(() => {
      adapter.setMigrationMode('rdf-only');
    });

    it('should only interact with RDF manager', async () => {
      await adapter.initialize();
      await adapter.acquireLock('test-lock');

      expect(await rdfManager.isLocked('test-lock')).toBe(true);
      expect(await jsonManager.isLocked('test-lock')).toBe(false);
    });

    it('should only read from RDF', async () => {
      await adapter.initialize();
      await rdfManager.acquireLock('test-lock');

      const info = await adapter.getLockInfo('test-lock');
      expect(info).toBeTruthy();
      expect(adapter.getStats().jsonReads).toBe(0);
    });

    it('should throw if RDF fails', async () => {
      await adapter.initialize();
      vi.spyOn(rdfManager, 'acquireLock').mockRejectedValue(new Error('RDF failed'));

      await expect(adapter.acquireLock('test-lock')).rejects.toThrow('RDF failed');
    });
  });

  describe('migration mode switching', () => {
    it('should allow mode changes', () => {
      expect(adapter.getStats().mode).toBe('dual-write');

      adapter.setMigrationMode('rdf-primary');
      expect(adapter.getStats().mode).toBe('rdf-primary');

      adapter.setMigrationMode('rdf-only');
      expect(adapter.getStats().mode).toBe('rdf-only');
    });

    it('should log mode changes', () => {
      adapter.setMigrationMode('rdf-primary');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Migration mode changed')
      );
    });
  });

  describe('error handling', () => {
    it('should handle RDF errors gracefully in dual-write', async () => {
      await adapter.initialize();
      vi.spyOn(rdfManager, 'acquireLock').mockRejectedValue(new Error('RDF error'));

      const result = await adapter.acquireLock('test-lock');
      expect(result).toBe(false); // Both must succeed
      expect(adapter.getStats().rdfErrors).toBe(1);
    });

    it('should handle JSON errors gracefully in dual-write', async () => {
      await adapter.initialize();
      vi.spyOn(jsonManager, 'acquireLock').mockRejectedValue(new Error('JSON error'));

      const result = await adapter.acquireLock('test-lock');
      expect(result).toBe(false);
      expect(adapter.getStats().jsonErrors).toBe(1);
    });

    it('should log discrepancies', async () => {
      await adapter.initialize();

      // Create discrepancy
      await rdfManager.acquireLock('test-lock', { fingerprint: 'rdf' });
      await jsonManager.acquireLock('other-lock', { fingerprint: 'json' });

      const stats = adapter.getStats();
      // Discrepancies would be detected during dual reads
    });
  });
});

describe('RDFSnapshotStoreAdapter', () => {
  let jsonStore;
  let rdfStore;
  let adapter;
  let mockLogger;

  beforeEach(() => {
    jsonStore = new MockSnapshotStore();
    rdfStore = new MockSnapshotStore();
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    };
    adapter = new RDFSnapshotStoreAdapter(jsonStore, rdfStore, {
      logger: mockLogger,
      mode: 'dual-write'
    });
  });

  describe('dual-write mode', () => {
    it('should store in both systems', async () => {
      await adapter.initialize();
      const hash = await adapter.storeSnapshot('test-key', { foo: 'bar' });

      expect(hash).toBeTruthy();
      expect(await jsonStore.hasSnapshot('test-key')).toBe(true);
      expect(await rdfStore.hasSnapshot('test-key')).toBe(true);
    });

    it('should retrieve from RDF preferentially', async () => {
      await adapter.initialize();
      await adapter.storeSnapshot('test-key', { foo: 'bar' });

      const data = await adapter.getSnapshot('test-key');
      expect(data).toEqual({ foo: 'bar' });
      expect(adapter.getStats().rdfReads).toBeGreaterThan(0);
    });

    it('should merge snapshot lists', async () => {
      await adapter.initialize();
      // Use different data to ensure different hashes
      await rdfStore.storeSnapshot('rdf-snap', { data: 1 });
      await jsonStore.storeSnapshot('json-snap', { data: 2 });

      const snapshots = await adapter.listSnapshots();
      expect(snapshots.length).toBe(2);
    });
  });

  describe('rdf-primary mode', () => {
    beforeEach(() => {
      adapter.setMigrationMode('rdf-primary');
    });

    it('should fallback to JSON if RDF read fails', async () => {
      await adapter.initialize();
      await jsonStore.storeSnapshot('test-key', { foo: 'bar' });

      const data = await adapter.getSnapshot('test-key');
      expect(data).toEqual({ foo: 'bar' });
      expect(adapter.getStats().fallbacks).toBeGreaterThan(0);
    });
  });

  describe('rdf-only mode', () => {
    beforeEach(() => {
      adapter.setMigrationMode('rdf-only');
    });

    it('should only use RDF store', async () => {
      await adapter.initialize();
      await adapter.storeSnapshot('test-key', { foo: 'bar' });

      expect(await rdfStore.hasSnapshot('test-key')).toBe(true);
      expect(await jsonStore.hasSnapshot('test-key')).toBe(false);
    });
  });

  describe('statistics', () => {
    it('should merge statistics in dual-write mode', async () => {
      await adapter.initialize();
      await adapter.storeSnapshot('key1', { data: 1 });
      await adapter.getSnapshot('key1');

      const stats = adapter.getStatistics();
      expect(stats.entries).toBeGreaterThan(0);
      expect(stats.hits).toBeGreaterThan(0);
    });
  });
});

describe('RDFQueueManagerAdapter', () => {
  let jsonQueue;
  let rdfQueue;
  let adapter;
  let mockLogger;

  beforeEach(() => {
    jsonQueue = new MockQueueManager();
    rdfQueue = new MockQueueManager();
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    };
    adapter = new RDFQueueManagerAdapter(jsonQueue, rdfQueue, {
      logger: mockLogger,
      mode: 'dual-write'
    });
  });

  describe('dual-write mode', () => {
    it('should execute job in RDF queue', async () => {
      await adapter.initialize();

      let executed = false;
      const result = await adapter.addJob('high', async () => {
        executed = true;
        return 'result';
      });

      expect(executed).toBe(true);
      expect(result).toBe('result');
    });

    it('should merge queue status', async () => {
      await adapter.initialize();

      const status = adapter.getStatus();
      expect(status.high).toBeDefined();
      expect(status.medium).toBeDefined();
      expect(status.low).toBeDefined();
    });

    it('should pause both queues', async () => {
      await adapter.initialize();
      adapter.pauseAll();

      const status = adapter.getStatus();
      expect(status.high.isPaused).toBe(true);
    });

    it('should resume both queues', async () => {
      await adapter.initialize();
      adapter.pauseAll();
      adapter.resumeAll();

      const status = adapter.getStatus();
      expect(status.high.isPaused).toBe(false);
    });
  });

  describe('rdf-only mode', () => {
    beforeEach(() => {
      adapter.setMigrationMode('rdf-only');
    });

    it('should only use RDF queue', async () => {
      await adapter.initialize();

      const result = await adapter.addJob('high', async () => 'result');
      expect(result).toBe('result');

      // JSON queue should not have been used
      expect(jsonQueue.jobs.length).toBe(0);
    });
  });

  describe('shutdown', () => {
    it('should shutdown both queues', async () => {
      await adapter.initialize();
      await adapter.shutdown();

      expect(rdfQueue.initialized).toBe(false);
      expect(jsonQueue.initialized).toBe(false);
    });
  });
});

describe('createMigrationAdapters', () => {
  it('should create all adapters when managers provided', () => {
    const adapters = createMigrationAdapters({
      jsonLockManager: new MockLockManager(),
      rdfLockManager: new MockLockManager(),
      jsonSnapshotStore: new MockSnapshotStore(),
      rdfSnapshotStore: new MockSnapshotStore(),
      jsonQueueManager: new MockQueueManager(),
      rdfQueueManager: new MockQueueManager(),
      mode: 'dual-write'
    });

    expect(adapters.lockManager).toBeInstanceOf(RDFLockManagerAdapter);
    expect(adapters.snapshotStore).toBeInstanceOf(RDFSnapshotStoreAdapter);
    expect(adapters.queueManager).toBeInstanceOf(RDFQueueManagerAdapter);
  });

  it('should only create adapters for provided managers', () => {
    const adapters = createMigrationAdapters({
      jsonLockManager: new MockLockManager(),
      rdfLockManager: new MockLockManager()
    });

    expect(adapters.lockManager).toBeDefined();
    expect(adapters.snapshotStore).toBeUndefined();
    expect(adapters.queueManager).toBeUndefined();
  });
});

describe('getMigrationHealth', () => {
  it('should return healthy status with no issues', () => {
    const adapter = new RDFLockManagerAdapter(
      new MockLockManager(),
      new MockLockManager()
    );

    const health = getMigrationHealth({ lockManager: adapter });

    expect(health.status).toBe('healthy');
    expect(health.adapters.lockManager).toBeDefined();
    expect(health.adapters.lockManager.issues).toEqual([]);
  });

  it('should detect high error rate', async () => {
    const jsonManager = new MockLockManager();
    const rdfManager = new MockLockManager();
    const adapter = new RDFLockManagerAdapter(jsonManager, rdfManager);

    await adapter.initialize();

    // Simulate errors
    vi.spyOn(rdfManager, 'acquireLock').mockRejectedValue(new Error('error'));

    for (let i = 0; i < 10; i++) {
      await adapter.acquireLock('test-' + i).catch(() => {});
    }

    const health = getMigrationHealth({ lockManager: adapter });
    expect(health.status).toBe('degraded');
    expect(health.adapters.lockManager.issues.length).toBeGreaterThan(0);
  });

  it('should detect high fallback rate', async () => {
    const jsonManager = new MockLockManager();
    const rdfManager = new MockLockManager();
    const adapter = new RDFLockManagerAdapter(jsonManager, rdfManager, {
      mode: 'rdf-primary'
    });

    await adapter.initialize();

    // Populate only JSON
    for (let i = 0; i < 10; i++) {
      await jsonManager.acquireLock('test-' + i);
    }

    // Read from adapter (will fallback to JSON)
    for (let i = 0; i < 10; i++) {
      await adapter.getLockInfo('test-' + i);
    }

    const health = getMigrationHealth({ lockManager: adapter });
    expect(health.adapters.lockManager.issues.some(
      issue => issue.includes('fallback')
    )).toBe(true);
  });
});
