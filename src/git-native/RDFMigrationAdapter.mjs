/**
 * RDF Migration Adapters for backward compatibility
 *
 * Provides bridge between JSON-based and RDF-based implementations during
 * the migration period. Supports three migration modes:
 * - dual-write: Write to both RDF and JSON (safe rollback)
 * - rdf-primary: Read from RDF, fallback to JSON (transition)
 * - rdf-only: Read/write RDF only (full migration)
 */

import { LockManager } from './LockManager.mjs';
import { SnapshotStore } from './SnapshotStore.mjs';
import { QueueManager } from './QueueManager.mjs';

/** @typedef {'dual-write'|'rdf-primary'|'rdf-only'} MigrationMode */

/**
 * Base migration adapter with common functionality
 */
class BaseMigrationAdapter {
  /**
   * @param {Console} logger
   * @param {MigrationMode} mode
   */
  constructor(logger, mode = 'dual-write') {
    this.logger = logger || console;
    this.migrationMode = mode;
    this.stats = {
      rdfReads: 0,
      jsonReads: 0,
      rdfWrites: 0,
      jsonWrites: 0,
      rdfErrors: 0,
      jsonErrors: 0,
      fallbacks: 0,
      discrepancies: 0
    };
  }

  /**
   * Set migration mode
   * @param {MigrationMode} mode
   */
  setMigrationMode(mode) {
    this.logger.info(`Migration mode changed: ${this.migrationMode} -> ${mode}`);
    this.migrationMode = mode;
  }

  /**
   * Get migration statistics
   * @returns {Object}
   */
  getStats() {
    return {
      ...this.stats,
      mode: this.migrationMode,
      rdfReadRatio: this.stats.rdfReads / (this.stats.rdfReads + this.stats.jsonReads) || 0,
      errorRate: (this.stats.rdfErrors + this.stats.jsonErrors) /
                 (this.stats.rdfReads + this.stats.rdfWrites + this.stats.jsonReads + this.stats.jsonWrites) || 0,
      fallbackRate: this.stats.fallbacks / this.stats.rdfReads || 0
    };
  }

  /**
   * Log discrepancy between RDF and JSON
   * @param {string} operation
   * @param {any} rdfData
   * @param {any} jsonData
   */
  _logDiscrepancy(operation, rdfData, jsonData) {
    this.stats.discrepancies++;
    this.logger.warn(`Data discrepancy detected in ${operation}`, {
      rdfData: JSON.stringify(rdfData).substring(0, 100),
      jsonData: JSON.stringify(jsonData).substring(0, 100),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log migration event
   * @param {string} event
   * @param {any} data
   */
  _logEvent(event, data = {}) {
    this.logger.debug(`[Migration] ${event}`, {
      mode: this.migrationMode,
      ...data,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Lock Manager Migration Adapter
 * Bridges JSON-based LockManager and RDF-based implementation
 */
export class RDFLockManagerAdapter extends BaseMigrationAdapter {
  /**
   * @param {LockManager} jsonLockManager - Original JSON-based manager
   * @param {LockManager} rdfLockManager - New RDF-based manager
   * @param {Object} [options]
   */
  constructor(jsonLockManager, rdfLockManager, options = {}) {
    super(options.logger, options.mode || 'dual-write');
    this.jsonManager = jsonLockManager;
    this.rdfManager = rdfLockManager;
  }

  /**
   * Initialize both managers
   */
  async initialize() {
    this._logEvent('initialize');
    await Promise.all([
      this.jsonManager.initialize(),
      this.rdfManager.initialize()
    ]);
  }

  /**
   * Acquire lock with dual-write or RDF-only
   * @param {string} lockName
   * @param {import("../types.js").LockOptions} [options]
   * @returns {Promise<boolean>}
   */
  async acquireLock(lockName, options = {}) {
    this._logEvent('acquireLock', { lockName, mode: this.migrationMode });

    if (this.migrationMode === 'rdf-only') {
      // RDF-only mode
      try {
        this.stats.rdfWrites++;
        const result = await this.rdfManager.acquireLock(lockName, options);
        return result;
      } catch (error) {
        this.stats.rdfErrors++;
        this.logger.error(`RDF lock acquisition failed: ${error.message}`);
        throw error;
      }
    }

    // dual-write or rdf-primary mode - write to both
    const results = await Promise.allSettled([
      this.rdfManager.acquireLock(lockName, options),
      this.jsonManager.acquireLock(lockName, options)
    ]);

    this.stats.rdfWrites++;
    this.stats.jsonWrites++;

    const rdfResult = results[0].status === 'fulfilled' ? results[0].value : false;
    const jsonResult = results[1].status === 'fulfilled' ? results[1].value : false;

    if (results[0].status === 'rejected') {
      this.stats.rdfErrors++;
      this.logger.error(`RDF lock failed: ${results[0].reason.message}`);
    }

    if (results[1].status === 'rejected') {
      this.stats.jsonErrors++;
      this.logger.error(`JSON lock failed: ${results[1].reason.message}`);
    }

    // Check for discrepancies
    if (rdfResult !== jsonResult && rdfResult !== false && jsonResult !== false) {
      this._logDiscrepancy('acquireLock', rdfResult, jsonResult);
    }

    // Return true only if both succeeded (or RDF succeeded in rdf-primary mode)
    if (this.migrationMode === 'rdf-primary') {
      return rdfResult === true;
    }
    return rdfResult && jsonResult;
  }

  /**
   * Release lock from both systems
   * @param {string} lockName
   * @returns {Promise<boolean>}
   */
  async releaseLock(lockName) {
    this._logEvent('releaseLock', { lockName });

    if (this.migrationMode === 'rdf-only') {
      try {
        return await this.rdfManager.releaseLock(lockName);
      } catch (error) {
        this.stats.rdfErrors++;
        this.logger.error(`RDF lock release failed: ${error.message}`);
        throw error;
      }
    }

    // Release from both
    const results = await Promise.allSettled([
      this.rdfManager.releaseLock(lockName),
      this.jsonManager.releaseLock(lockName)
    ]);

    const rdfResult = results[0].status === 'fulfilled' ? results[0].value : false;
    const jsonResult = results[1].status === 'fulfilled' ? results[1].value : false;

    if (results[0].status === 'rejected') {
      this.stats.rdfErrors++;
      this.logger.error(`RDF release failed: ${results[0].reason.message}`);
    }

    if (results[1].status === 'rejected') {
      this.stats.jsonErrors++;
      this.logger.error(`JSON release failed: ${results[1].reason.message}`);
    }

    return rdfResult || jsonResult;
  }

  /**
   * Get lock info with fallback strategy
   * @param {string} lockName
   * @returns {Promise<null|import("../types.js").LockRecord>}
   */
  async getLockInfo(lockName) {
    this._logEvent('getLockInfo', { lockName });

    if (this.migrationMode === 'rdf-only') {
      this.stats.rdfReads++;
      return await this.rdfManager.getLockInfo(lockName);
    }

    if (this.migrationMode === 'rdf-primary') {
      // Try RDF first, fallback to JSON
      try {
        this.stats.rdfReads++;
        const rdfInfo = await this.rdfManager.getLockInfo(lockName);
        if (rdfInfo !== null) {
          return rdfInfo;
        }
      } catch (error) {
        this.stats.rdfErrors++;
        this.logger.warn(`RDF read failed, falling back to JSON: ${error.message}`);
      }

      // Fallback to JSON
      this.stats.fallbacks++;
      this.stats.jsonReads++;
      return await this.jsonManager.getLockInfo(lockName);
    }

    // dual-write mode - read from both and compare
    this.stats.rdfReads++;
    this.stats.jsonReads++;

    const [rdfInfo, jsonInfo] = await Promise.all([
      this.rdfManager.getLockInfo(lockName).catch(e => {
        this.stats.rdfErrors++;
        return null;
      }),
      this.jsonManager.getLockInfo(lockName).catch(e => {
        this.stats.jsonErrors++;
        return null;
      })
    ]);

    // Check for discrepancies
    if (rdfInfo && jsonInfo) {
      const rdfHash = JSON.stringify(rdfInfo);
      const jsonHash = JSON.stringify(jsonInfo);
      if (rdfHash !== jsonHash) {
        this._logDiscrepancy('getLockInfo', rdfInfo, jsonInfo);
      }
    }

    // Prefer RDF data
    return rdfInfo || jsonInfo;
  }

  /**
   * Check if locked (delegates to getLockInfo)
   * @param {string} lockName
   * @returns {Promise<boolean>}
   */
  async isLocked(lockName) {
    const info = await this.getLockInfo(lockName);
    return info !== null;
  }

  /**
   * List all locks
   * @returns {Promise<Array<import("../types.js").LockRecord>>}
   */
  async listLocks() {
    this._logEvent('listLocks');

    if (this.migrationMode === 'rdf-only') {
      this.stats.rdfReads++;
      return await this.rdfManager.listLocks();
    }

    if (this.migrationMode === 'rdf-primary') {
      try {
        this.stats.rdfReads++;
        return await this.rdfManager.listLocks();
      } catch (error) {
        this.stats.rdfErrors++;
        this.stats.fallbacks++;
        this.stats.jsonReads++;
        this.logger.warn(`RDF list failed, falling back to JSON: ${error.message}`);
        return await this.jsonManager.listLocks();
      }
    }

    // dual-write mode - merge results
    this.stats.rdfReads++;
    this.stats.jsonReads++;

    const [rdfLocks, jsonLocks] = await Promise.all([
      this.rdfManager.listLocks().catch(() => []),
      this.jsonManager.listLocks().catch(() => [])
    ]);

    // Merge and deduplicate by lock name
    const lockMap = new Map();
    for (const lock of rdfLocks) {
      lockMap.set(lock.name, lock);
    }
    for (const lock of jsonLocks) {
      if (!lockMap.has(lock.name)) {
        lockMap.set(lock.name, lock);
      }
    }

    return Array.from(lockMap.values());
  }

  /**
   * Clear all locks
   * @returns {Promise<number>}
   */
  async clearAllLocks() {
    this._logEvent('clearAllLocks');

    if (this.migrationMode === 'rdf-only') {
      return await this.rdfManager.clearAllLocks();
    }

    const [rdfCount, jsonCount] = await Promise.all([
      this.rdfManager.clearAllLocks().catch(() => 0),
      this.jsonManager.clearAllLocks().catch(() => 0)
    ]);

    return Math.max(rdfCount, jsonCount);
  }

  /**
   * Cleanup expired locks
   * @returns {Promise<number>}
   */
  async cleanupExpiredLocks() {
    if (this.migrationMode === 'rdf-only') {
      return await this.rdfManager.cleanupExpiredLocks();
    }

    const [rdfCount, jsonCount] = await Promise.all([
      this.rdfManager.cleanupExpiredLocks().catch(() => 0),
      this.jsonManager.cleanupExpiredLocks().catch(() => 0)
    ]);

    return Math.max(rdfCount, jsonCount);
  }

  /**
   * Validate fingerprint
   * @param {string} lockName
   * @param {string} fingerprint
   * @returns {Promise<boolean>}
   */
  async validateFingerprint(lockName, fingerprint) {
    const lockInfo = await this.getLockInfo(lockName);
    return lockInfo && lockInfo.fingerprint === fingerprint;
  }
}

/**
 * Snapshot Store Migration Adapter
 * Bridges JSON-based SnapshotStore and RDF-based implementation
 */
export class RDFSnapshotStoreAdapter extends BaseMigrationAdapter {
  /**
   * @param {SnapshotStore} jsonSnapshotStore
   * @param {SnapshotStore} rdfSnapshotStore
   * @param {Object} [options]
   */
  constructor(jsonSnapshotStore, rdfSnapshotStore, options = {}) {
    super(options.logger, options.mode || 'dual-write');
    this.jsonStore = jsonSnapshotStore;
    this.rdfStore = rdfSnapshotStore;
  }

  /**
   * Initialize both stores
   */
  async initialize() {
    this._logEvent('initialize');
    await Promise.all([
      this.jsonStore.initialize(),
      this.rdfStore.initialize()
    ]);
  }

  /**
   * Store snapshot in both systems
   * @param {string} key
   * @param {any} data
   * @param {Record<string,any>} [metadata]
   * @returns {Promise<string>}
   */
  async storeSnapshot(key, data, metadata = {}) {
    this._logEvent('storeSnapshot', { key });

    if (this.migrationMode === 'rdf-only') {
      this.stats.rdfWrites++;
      return await this.rdfStore.storeSnapshot(key, data, metadata);
    }

    // dual-write or rdf-primary
    const [rdfHash, jsonHash] = await Promise.all([
      this.rdfStore.storeSnapshot(key, data, metadata).catch(e => {
        this.stats.rdfErrors++;
        this.logger.error(`RDF snapshot store failed: ${e.message}`);
        return null;
      }),
      this.jsonStore.storeSnapshot(key, data, metadata).catch(e => {
        this.stats.jsonErrors++;
        this.logger.error(`JSON snapshot store failed: ${e.message}`);
        return null;
      })
    ]);

    this.stats.rdfWrites++;
    this.stats.jsonWrites++;

    // Both should produce same content hash
    if (rdfHash && jsonHash && rdfHash !== jsonHash) {
      this._logDiscrepancy('storeSnapshot', rdfHash, jsonHash);
    }

    return rdfHash || jsonHash;
  }

  /**
   * Get snapshot with fallback
   * @param {string} key
   * @param {string|null} [contentHash]
   * @returns {Promise<any|null>}
   */
  async getSnapshot(key, contentHash = null) {
    this._logEvent('getSnapshot', { key, contentHash });

    if (this.migrationMode === 'rdf-only') {
      this.stats.rdfReads++;
      return await this.rdfStore.getSnapshot(key, contentHash);
    }

    if (this.migrationMode === 'rdf-primary') {
      try {
        this.stats.rdfReads++;
        const rdfSnapshot = await this.rdfStore.getSnapshot(key, contentHash);
        if (rdfSnapshot !== null) {
          return rdfSnapshot;
        }
      } catch (error) {
        this.stats.rdfErrors++;
        this.logger.warn(`RDF snapshot read failed, falling back: ${error.message}`);
      }

      this.stats.fallbacks++;
      this.stats.jsonReads++;
      return await this.jsonStore.getSnapshot(key, contentHash);
    }

    // dual-write mode - compare both
    this.stats.rdfReads++;
    this.stats.jsonReads++;

    const [rdfSnapshot, jsonSnapshot] = await Promise.all([
      this.rdfStore.getSnapshot(key, contentHash).catch(() => null),
      this.jsonStore.getSnapshot(key, contentHash).catch(() => null)
    ]);

    if (rdfSnapshot && jsonSnapshot) {
      const rdfStr = JSON.stringify(rdfSnapshot);
      const jsonStr = JSON.stringify(jsonSnapshot);
      if (rdfStr !== jsonStr) {
        this._logDiscrepancy('getSnapshot', rdfSnapshot, jsonSnapshot);
      }
    }

    return rdfSnapshot || jsonSnapshot;
  }

  /**
   * Check if snapshot exists
   * @param {string} key
   * @param {string|null} [contentHash]
   * @returns {Promise<boolean>}
   */
  async hasSnapshot(key, contentHash = null) {
    const snapshot = await this.getSnapshot(key, contentHash);
    return snapshot !== null;
  }

  /**
   * Remove snapshot from both systems
   * @param {string} key
   * @param {string|null} [contentHash]
   * @returns {Promise<boolean>}
   */
  async removeSnapshot(key, contentHash = null) {
    this._logEvent('removeSnapshot', { key, contentHash });

    if (this.migrationMode === 'rdf-only') {
      return await this.rdfStore.removeSnapshot(key, contentHash);
    }

    const [rdfResult, jsonResult] = await Promise.all([
      this.rdfStore.removeSnapshot(key, contentHash).catch(() => false),
      this.jsonStore.removeSnapshot(key, contentHash).catch(() => false)
    ]);

    return rdfResult || jsonResult;
  }

  /**
   * List snapshots
   * @returns {Promise<Array<import("../types.js").SnapshotHeader>>}
   */
  async listSnapshots() {
    this._logEvent('listSnapshots');

    if (this.migrationMode === 'rdf-only') {
      this.stats.rdfReads++;
      return await this.rdfStore.listSnapshots();
    }

    if (this.migrationMode === 'rdf-primary') {
      try {
        this.stats.rdfReads++;
        return await this.rdfStore.listSnapshots();
      } catch (error) {
        this.stats.rdfErrors++;
        this.stats.fallbacks++;
        this.stats.jsonReads++;
        return await this.jsonStore.listSnapshots();
      }
    }

    // dual-write - merge results
    this.stats.rdfReads++;
    this.stats.jsonReads++;

    const [rdfSnapshots, jsonSnapshots] = await Promise.all([
      this.rdfStore.listSnapshots().catch(() => []),
      this.jsonStore.listSnapshots().catch(() => [])
    ]);

    // Merge and deduplicate by content hash
    const snapshotMap = new Map();
    for (const snap of rdfSnapshots) {
      snapshotMap.set(snap.contentHash, snap);
    }
    for (const snap of jsonSnapshots) {
      if (!snapshotMap.has(snap.contentHash)) {
        snapshotMap.set(snap.contentHash, snap);
      }
    }

    return Array.from(snapshotMap.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get statistics
   * @returns {import("../types.js").SnapshotStats}
   */
  getStatistics() {
    if (this.migrationMode === 'rdf-only') {
      return this.rdfStore.getStatistics();
    }

    // Merge statistics
    const rdfStats = this.rdfStore.getStatistics();
    const jsonStats = this.jsonStore.getStatistics();

    return {
      hits: rdfStats.hits + jsonStats.hits,
      misses: rdfStats.misses + jsonStats.misses,
      size: rdfStats.size + jsonStats.size,
      entries: rdfStats.entries + jsonStats.entries,
      hitRate: (rdfStats.hits + jsonStats.hits) /
               (rdfStats.hits + jsonStats.hits + rdfStats.misses + jsonStats.misses) || 0,
      maxSize: Math.max(rdfStats.maxSize, jsonStats.maxSize),
      sizeMB: (rdfStats.size + jsonStats.size) / (1024 * 1024)
    };
  }

  /**
   * Cleanup cache
   * @param {number} [maxAgeMs]
   * @returns {Promise<number>}
   */
  async cleanupCache(maxAgeMs) {
    if (this.migrationMode === 'rdf-only') {
      return await this.rdfStore.cleanupCache(maxAgeMs);
    }

    const [rdfCount, jsonCount] = await Promise.all([
      this.rdfStore.cleanupCache(maxAgeMs).catch(() => 0),
      this.jsonStore.cleanupCache(maxAgeMs).catch(() => 0)
    ]);

    return rdfCount + jsonCount;
  }

  /**
   * Clear cache
   * @returns {Promise<number>}
   */
  async clearCache() {
    if (this.migrationMode === 'rdf-only') {
      return await this.rdfStore.clearCache();
    }

    const [rdfCount, jsonCount] = await Promise.all([
      this.rdfStore.clearCache().catch(() => 0),
      this.jsonStore.clearCache().catch(() => 0)
    ]);

    return rdfCount + jsonCount;
  }
}

/**
 * Queue Manager Migration Adapter
 * Bridges JSON-based QueueManager and RDF-based implementation
 */
export class RDFQueueManagerAdapter extends BaseMigrationAdapter {
  /**
   * @param {QueueManager} jsonQueueManager
   * @param {QueueManager} rdfQueueManager
   * @param {Object} [options]
   */
  constructor(jsonQueueManager, rdfQueueManager, options = {}) {
    super(options.logger, options.mode || 'dual-write');
    this.jsonQueue = jsonQueueManager;
    this.rdfQueue = rdfQueueManager;
  }

  /**
   * Initialize both queues
   */
  async initialize() {
    this._logEvent('initialize');
    await Promise.all([
      this.jsonQueue.initialize(),
      this.rdfQueue.initialize()
    ]);
  }

  /**
   * Add job to queue(s)
   * @template T
   * @param {import("../types.js").JobPriority} priority
   * @param {() => Promise<T>} job
   * @param {import("../types.js").JobMetadata} [metadata]
   * @returns {Promise<T>}
   */
  async addJob(priority, job, metadata = {}) {
    this._logEvent('addJob', { priority });

    if (this.migrationMode === 'rdf-only') {
      this.stats.rdfWrites++;
      return await this.rdfQueue.addJob(priority, job, metadata);
    }

    // dual-write mode - add to RDF, track in JSON
    this.stats.rdfWrites++;
    this.stats.jsonWrites++;

    // Execute in RDF queue (primary)
    const result = await this.rdfQueue.addJob(priority, job, metadata);

    // Track in JSON for monitoring (fire and forget)
    this.jsonQueue.addJob(priority, async () => result, metadata).catch(e => {
      this.stats.jsonErrors++;
      this.logger.warn(`JSON queue tracking failed: ${e.message}`);
    });

    return result;
  }

  /**
   * Get queue status
   * @returns {Record<import("../types.js").JobPriority, import("../types.js").QueueStatus>}
   */
  getStatus() {
    if (this.migrationMode === 'rdf-only') {
      return this.rdfQueue.getStatus();
    }

    // Merge status from both
    const rdfStatus = this.rdfQueue.getStatus();
    const jsonStatus = this.jsonQueue.getStatus();

    const merged = {};
    for (const priority of ['high', 'medium', 'low']) {
      merged[priority] = {
        pending: (rdfStatus[priority]?.pending || 0) + (jsonStatus[priority]?.pending || 0),
        size: (rdfStatus[priority]?.size || 0) + (jsonStatus[priority]?.size || 0),
        isPaused: rdfStatus[priority]?.isPaused || false,
        concurrency: Math.max(rdfStatus[priority]?.concurrency || 0, jsonStatus[priority]?.concurrency || 0)
      };
    }

    return merged;
  }

  /**
   * Pause all queues
   */
  pauseAll() {
    this.rdfQueue.pauseAll();
    if (this.migrationMode !== 'rdf-only') {
      this.jsonQueue.pauseAll();
    }
  }

  /**
   * Resume all queues
   */
  resumeAll() {
    this.rdfQueue.resumeAll();
    if (this.migrationMode !== 'rdf-only') {
      this.jsonQueue.resumeAll();
    }
  }

  /**
   * Clear completed jobs
   * @returns {Promise<number>}
   */
  async clearCompleted() {
    if (this.migrationMode === 'rdf-only') {
      return await this.rdfQueue.clearCompleted();
    }

    const [rdfCount, jsonCount] = await Promise.all([
      this.rdfQueue.clearCompleted().catch(() => 0),
      this.jsonQueue.clearCompleted().catch(() => 0)
    ]);

    return rdfCount + jsonCount;
  }

  /**
   * Reconcile queue state
   * @returns {Promise<number>}
   */
  async reconcile() {
    if (this.migrationMode === 'rdf-only') {
      return await this.rdfQueue.reconcile();
    }

    const [rdfCount, jsonCount] = await Promise.all([
      this.rdfQueue.reconcile().catch(() => 0),
      this.jsonQueue.reconcile().catch(() => 0)
    ]);

    return Math.max(rdfCount, jsonCount);
  }

  /**
   * Shutdown both queues
   */
  async shutdown() {
    this._logEvent('shutdown');

    await Promise.all([
      this.rdfQueue.shutdown().catch(e => {
        this.logger.error(`RDF queue shutdown failed: ${e.message}`);
      }),
      this.migrationMode !== 'rdf-only'
        ? this.jsonQueue.shutdown().catch(e => {
            this.logger.error(`JSON queue shutdown failed: ${e.message}`);
          })
        : Promise.resolve()
    ]);
  }
}

/**
 * Create migration adapters with feature flags
 * @param {Object} options
 * @returns {Object}
 */
export function createMigrationAdapters(options = {}) {
  const {
    jsonLockManager,
    rdfLockManager,
    jsonSnapshotStore,
    rdfSnapshotStore,
    jsonQueueManager,
    rdfQueueManager,
    mode = 'dual-write',
    logger = console
  } = options;

  const adapters = {};

  if (jsonLockManager && rdfLockManager) {
    adapters.lockManager = new RDFLockManagerAdapter(
      jsonLockManager,
      rdfLockManager,
      { mode, logger }
    );
  }

  if (jsonSnapshotStore && rdfSnapshotStore) {
    adapters.snapshotStore = new RDFSnapshotStoreAdapter(
      jsonSnapshotStore,
      rdfSnapshotStore,
      { mode, logger }
    );
  }

  if (jsonQueueManager && rdfQueueManager) {
    adapters.queueManager = new RDFQueueManagerAdapter(
      jsonQueueManager,
      rdfQueueManager,
      { mode, logger }
    );
  }

  return adapters;
}

/**
 * Get health check for migration status
 * @param {Object} adapters
 * @returns {Object}
 */
export function getMigrationHealth(adapters) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    adapters: {}
  };

  for (const [name, adapter] of Object.entries(adapters)) {
    const stats = adapter.getStats();
    const adapterHealth = {
      mode: stats.mode,
      stats,
      issues: []
    };

    // Check for issues
    if (stats.errorRate > 0.05) {
      adapterHealth.issues.push(`High error rate: ${(stats.errorRate * 100).toFixed(2)}%`);
      health.status = 'degraded';
    }

    if (stats.discrepancies > 0) {
      adapterHealth.issues.push(`Data discrepancies detected: ${stats.discrepancies}`);
      health.status = 'degraded';
    }

    if (stats.fallbackRate > 0.2) {
      adapterHealth.issues.push(`High fallback rate: ${(stats.fallbackRate * 100).toFixed(2)}%`);
    }

    health.adapters[name] = adapterHealth;
  }

  return health;
}
