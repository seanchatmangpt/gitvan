/**
 * RDF Migration Adapters for backward compatibility
 *
 * Provides bridge between JSON-based and RDF-based implementations during
 * the migration period. Supports three migration modes:
 * - dual-write: Write to both RDF and JSON (safe rollback)
 * - rdf-primary: Read from RDF, fallback to JSON (transition)
 * - rdf-only: Read/write RDF only (full migration)
 *
 * Split into sub-modules for maintainability:
 * - BaseMigrationAdapter.mjs: shared base class
 * - RDFLockManagerAdapter.mjs: lock manager bridge
 * - RDFSnapshotStoreAdapter.mjs: snapshot store bridge
 * - RDFQueueManagerAdapter.mjs: queue manager bridge
 */

import { RDFLockManagerAdapter } from './RDFLockManagerAdapter.mjs';
import { RDFSnapshotStoreAdapter } from './RDFSnapshotStoreAdapter.mjs';
import { RDFQueueManagerAdapter } from './RDFQueueManagerAdapter.mjs';

export { BaseMigrationAdapter } from './BaseMigrationAdapter.mjs';
export { RDFLockManagerAdapter } from './RDFLockManagerAdapter.mjs';
export { RDFSnapshotStoreAdapter } from './RDFSnapshotStoreAdapter.mjs';
export { RDFQueueManagerAdapter } from './RDFQueueManagerAdapter.mjs';

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
      jsonLockManager, rdfLockManager, { mode, logger }
    );
  }

  if (jsonSnapshotStore && rdfSnapshotStore) {
    adapters.snapshotStore = new RDFSnapshotStoreAdapter(
      jsonSnapshotStore, rdfSnapshotStore, { mode, logger }
    );
  }

  if (jsonQueueManager && rdfQueueManager) {
    adapters.queueManager = new RDFQueueManagerAdapter(
      jsonQueueManager, rdfQueueManager, { mode, logger }
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
