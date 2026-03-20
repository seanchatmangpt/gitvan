/**
 * Base migration adapter with common functionality
 * Shared by RDFLockManagerAdapter, RDFSnapshotStoreAdapter, RDFQueueManagerAdapter
 */

/** @typedef {'dual-write'|'rdf-primary'|'rdf-only'} MigrationMode */

export class BaseMigrationAdapter {
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
