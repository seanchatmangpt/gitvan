/**
 * Queue Manager Migration Adapter
 * Bridges JSON-based QueueManager and RDF-based implementation
 */

import { BaseMigrationAdapter } from './BaseMigrationAdapter.mjs';

export class RDFQueueManagerAdapter extends BaseMigrationAdapter {
  /**
   * @param {import('./QueueManager.mjs').QueueManager} jsonQueueManager
   * @param {import('./QueueManager.mjs').QueueManager} rdfQueueManager
   * @param {Object} [options]
   */
  constructor(jsonQueueManager, rdfQueueManager, options = {}) {
    super(options.logger, options.mode || 'dual-write');
    this.jsonQueue = jsonQueueManager;
    this.rdfQueue = rdfQueueManager;
  }

  async initialize() {
    this._logEvent('initialize');
    await Promise.all([
      this.jsonQueue.initialize(),
      this.rdfQueue.initialize()
    ]);
  }

  /**
   * Add job to queue(s)
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

    const result = await this.rdfQueue.addJob(priority, job, metadata);

    // Track in JSON for monitoring (fire and forget)
    this.jsonQueue.addJob(priority, async () => result, metadata).catch(e => {
      this.stats.jsonErrors++;
      this.logger.warn(`JSON queue tracking failed: ${e.message}`);
    });

    return result;
  }

  getStatus() {
    if (this.migrationMode === 'rdf-only') {
      return this.rdfQueue.getStatus();
    }

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

  pauseAll() {
    this.rdfQueue.pauseAll();
    if (this.migrationMode !== 'rdf-only') {
      this.jsonQueue.pauseAll();
    }
  }

  resumeAll() {
    this.rdfQueue.resumeAll();
    if (this.migrationMode !== 'rdf-only') {
      this.jsonQueue.resumeAll();
    }
  }

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
