/**
 * Snapshot Store Migration Adapter
 * Bridges JSON-based SnapshotStore and RDF-based implementation
 */

import { BaseMigrationAdapter } from './BaseMigrationAdapter.mjs';

export class RDFSnapshotStoreAdapter extends BaseMigrationAdapter {
  /**
   * @param {import('./SnapshotStore.mjs').SnapshotStore} jsonSnapshotStore
   * @param {import('./SnapshotStore.mjs').SnapshotStore} rdfSnapshotStore
   * @param {Object} [options]
   */
  constructor(jsonSnapshotStore, rdfSnapshotStore, options = {}) {
    super(options.logger, options.mode || 'dual-write');
    this.jsonStore = jsonSnapshotStore;
    this.rdfStore = rdfSnapshotStore;
  }

  async initialize() {
    this._logEvent('initialize');
    await Promise.all([
      this.jsonStore.initialize(),
      this.rdfStore.initialize()
    ]);
  }

  /**
   * Store snapshot in both systems
   */
  async storeSnapshot(key, data, metadata = {}) {
    this._logEvent('storeSnapshot', { key });

    if (this.migrationMode === 'rdf-only') {
      this.stats.rdfWrites++;
      return await this.rdfStore.storeSnapshot(key, data, metadata);
    }

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

    if (rdfHash && jsonHash && rdfHash !== jsonHash) {
      this._logDiscrepancy('storeSnapshot', rdfHash, jsonHash);
    }

    return rdfHash || jsonHash;
  }

  /**
   * Get snapshot with fallback
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

  async hasSnapshot(key, contentHash = null) {
    const snapshot = await this.getSnapshot(key, contentHash);
    return snapshot !== null;
  }

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

  getStatistics() {
    if (this.migrationMode === 'rdf-only') {
      return this.rdfStore.getStatistics();
    }

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
