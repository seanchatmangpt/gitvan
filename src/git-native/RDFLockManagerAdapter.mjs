/**
 * Lock Manager Migration Adapter
 * Bridges JSON-based LockManager and RDF-based implementation
 */

import { BaseMigrationAdapter } from './BaseMigrationAdapter.mjs';

export class RDFLockManagerAdapter extends BaseMigrationAdapter {
  /**
   * @param {import('./LockManager.mjs').LockManager} jsonLockManager
   * @param {import('./LockManager.mjs').LockManager} rdfLockManager
   * @param {Object} [options]
   */
  constructor(jsonLockManager, rdfLockManager, options = {}) {
    super(options.logger, options.mode || 'dual-write');
    this.jsonManager = jsonLockManager;
    this.rdfManager = rdfLockManager;
  }

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
   * @param {Object} [options]
   * @returns {Promise<boolean>}
   */
  async acquireLock(lockName, options = {}) {
    this._logEvent('acquireLock', { lockName, mode: this.migrationMode });

    if (this.migrationMode === 'rdf-only') {
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

    if (rdfResult !== jsonResult && rdfResult !== false && jsonResult !== false) {
      this._logDiscrepancy('acquireLock', rdfResult, jsonResult);
    }

    if (this.migrationMode === 'rdf-primary') {
      return rdfResult === true;
    }
    return rdfResult && jsonResult;
  }

  /**
   * Release lock from both systems
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
   */
  async getLockInfo(lockName) {
    this._logEvent('getLockInfo', { lockName });

    if (this.migrationMode === 'rdf-only') {
      this.stats.rdfReads++;
      return await this.rdfManager.getLockInfo(lockName);
    }

    if (this.migrationMode === 'rdf-primary') {
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

    if (rdfInfo && jsonInfo) {
      const rdfHash = JSON.stringify(rdfInfo);
      const jsonHash = JSON.stringify(jsonInfo);
      if (rdfHash !== jsonHash) {
        this._logDiscrepancy('getLockInfo', rdfInfo, jsonInfo);
      }
    }

    return rdfInfo || jsonInfo;
  }

  async isLocked(lockName) {
    const info = await this.getLockInfo(lockName);
    return info !== null;
  }

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

  async validateFingerprint(lockName, fingerprint) {
    const lockInfo = await this.getLockInfo(lockName);
    return lockInfo && lockInfo.fingerprint === fingerprint;
  }
}
