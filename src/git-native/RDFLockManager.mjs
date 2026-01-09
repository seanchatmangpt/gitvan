import { LockManager } from './LockManager.mjs';
import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('git-native:RDFLockManager');

/**
 * RDF-Enhanced Lock Manager
 *
 * Extends LockManager with RDF/SPARQL capabilities for:
 * - Semantic deadlock detection (circular dependencies)
 * - Lock duration analysis
 * - Resource contention queries
 * - Provenance tracking
 *
 * Implementation Strategy:
 * - Git refs remain "write" side (durable, atomic)
 * - RDF becomes "read" side (queryable, semantic)
 * - Dual-write pattern: write to both Git and RDF
 * - Graceful degradation if KnowledgeSubstrate unavailable
 *
 * @class RDFLockManager
 * @extends LockManager
 */
export class RDFLockManager extends LockManager {
  /**
   * Create RDF Lock Manager
   * @param {Object} [options] - Configuration options
   * @param {string} [options.cwd] - Working directory
   * @param {Console} [options.logger] - Logger instance
   * @param {Object} [options.lock] - Lock configuration
   */
  constructor(options = {}) {
    super(options);

    this.knowledgeSubstrate = null;
    this.rdfEnabled = false;
    this.ontologyNamespace = 'https://gitvan.dev/lock#';

    // SPARQL query cache
    this._queryCache = new Map();
  }

  /**
   * Initialize with KnowledgeSubstrate integration
   *
   * @param {Object} knowledgeSubstrate - UnRDF KnowledgeSubstrate instance
   * @param {Object} [options] - Initialization options
   * @param {boolean} [options.validateOntology=true] - Validate lock ontology is loaded
   * @param {boolean} [options.enableRDF=true] - Enable RDF features
   * @returns {Promise<void>}
   *
   * @example
   * const lockManager = new RDFLockManager({ cwd: '/repo' });
   * await lockManager.initialize(knowledgeSubstrate, {
   *   validateOntology: true,
   *   enableRDF: true
   * });
   */
  async initialize(knowledgeSubstrate, options = {}) {
    const {
      validateOntology = true,
      enableRDF = true,
    } = options;

    // Initialize base LockManager
    await super.initialize();

    if (!knowledgeSubstrate) {
      logger.warn('No KnowledgeSubstrate provided - RDF features disabled');
      this.rdfEnabled = false;
      return;
    }

    try {
      this.knowledgeSubstrate = knowledgeSubstrate;

      // Validate lock ontology is loaded
      if (validateOntology) {
        await this._validateLockOntology();
      }

      this.rdfEnabled = enableRDF;
      logger.info('RDFLockManager initialized with KnowledgeSubstrate');
    } catch (error) {
      logger.error(`Failed to initialize RDF features: ${error.message}`);
      this.rdfEnabled = false;
      // Continue - graceful degradation to JSON-only mode
    }
  }

  /**
   * Acquire lock with RDF storage
   *
   * Dual-write pattern:
   * 1. Write to Git ref (atomic, durable)
   * 2. Write to RDF store (queryable, semantic)
   *
   * @param {string} lockName - Lock name
   * @param {import("../types.js").LockOptions} [options] - Lock options
   * @returns {Promise<boolean>} True if acquired
   */
  async acquireLock(lockName, options = {}) {
    // Acquire via base Git implementation (write side)
    const acquired = await super.acquireLock(lockName, options);

    if (!acquired) {
      return false;
    }

    // Write to RDF (read side) if enabled
    if (this.rdfEnabled && this.knowledgeSubstrate) {
      try {
        const lockInfo = await super.getLockInfo(lockName);
        if (lockInfo) {
          await this._storeLockInRDF(lockInfo);
        }
      } catch (error) {
        logger.warn(`Failed to store lock in RDF: ${error.message}`);
        // Continue - lock is already acquired in Git
      }
    }

    return true;
  }

  /**
   * Release lock with RDF cleanup
   *
   * @param {string} lockName - Lock name
   * @returns {Promise<boolean>} True if released
   */
  async releaseLock(lockName) {
    // Get lock info before release
    let lockInfo = null;
    if (this.rdfEnabled && this.knowledgeSubstrate) {
      try {
        lockInfo = await super.getLockInfo(lockName);
      } catch (error) {
        logger.debug(`Failed to get lock info for RDF cleanup: ${error.message}`);
      }
    }

    // Release via base Git implementation
    const released = await super.releaseLock(lockName);

    // Update RDF state
    if (released && this.rdfEnabled && this.knowledgeSubstrate && lockInfo) {
      try {
        await this._releaseLockInRDF(lockInfo);
      } catch (error) {
        logger.warn(`Failed to release lock in RDF: ${error.message}`);
        // Continue - lock is already released in Git
      }
    }

    return released;
  }

  /**
   * Detect deadlocks using SPARQL query
   *
   * Query: Find circular lock dependencies (A blocks B, B blocks A)
   *
   * @returns {Promise<boolean>} True if deadlock detected
   *
   * @example
   * const hasDeadlock = await lockManager.detectDeadlocks();
   * if (hasDeadlock) {
   *   console.warn('Deadlock detected!');
   * }
   */
  async detectDeadlocks() {
    if (!this._ensureRDFEnabled()) {
      logger.debug('RDF not enabled, skipping deadlock detection');
      return false;
    }

    const query = `
      PREFIX lock: <${this.ontologyNamespace}>

      ASK WHERE {
        ?lock1 lock:blockedBy ?lock2 .
        ?lock2 lock:blockedBy+ ?lock1 .
      }
    `;

    try {
      const result = await this._executeQuery(query, 'deadlock-detection');
      return result === true || result?.boolean === true;
    } catch (error) {
      logger.error(`Deadlock detection query failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get all locks blocking a specific resource
   *
   * @param {string} resourceId - Resource identifier
   * @returns {Promise<Array<Object>>} Blocking locks with owner and duration
   *
   * @example
   * const blockingLocks = await lockManager.getBlockingLocks('workflow-123');
   * blockingLocks.forEach(lock => {
   *   console.log(`Lock ${lock.lockId} held by ${lock.owner} for ${lock.duration}ms`);
   * });
   */
  async getBlockingLocks(resourceId) {
    if (!this._ensureRDFEnabled()) {
      logger.debug('RDF not enabled, returning empty blocking locks');
      return [];
    }

    const query = `
      PREFIX lock: <${this.ontologyNamespace}>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

      SELECT ?lock ?owner ?duration WHERE {
        ?lock lock:resourceId ?resource ;
              lock:owner ?owner ;
              lock:acquiredAt ?acquiredAt .

        BIND(xsd:integer((NOW() - ?acquiredAt) * 1000) AS ?duration)
        FILTER(?resource = "${resourceId}")
      }
      ORDER BY DESC(?duration)
    `;

    try {
      const results = await this._executeQuery(query, `blocking-locks-${resourceId}`);
      return this._parseSparqlResults(results);
    } catch (error) {
      logger.error(`Blocking locks query failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Get abnormally long-running locks
   *
   * @param {number} maxDurationMs - Maximum duration threshold (ms)
   * @returns {Promise<Array<Object>>} Long-running locks
   *
   * @example
   * const longLocks = await lockManager.getAbnormallyLongLocks(60000); // > 1 minute
   * longLocks.forEach(lock => {
   *   console.warn(`Lock ${lock.lockId} running for ${lock.duration}ms`);
   * });
   */
  async getAbnormallyLongLocks(maxDurationMs) {
    if (!this._ensureRDFEnabled()) {
      logger.debug('RDF not enabled, returning empty long locks');
      return [];
    }

    const query = `
      PREFIX lock: <${this.ontologyNamespace}>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

      SELECT ?lock ?lockId ?owner ?duration WHERE {
        ?lock lock:lockId ?lockId ;
              lock:owner ?owner ;
              lock:acquiredAt ?acquiredAt ;
              lock:expiresAt ?expiresAt .

        BIND(xsd:integer((?expiresAt - ?acquiredAt) * 1000) AS ?duration)
        FILTER(?duration > ${maxDurationMs})
      }
      ORDER BY DESC(?duration)
    `;

    try {
      const results = await this._executeQuery(query, `long-locks-${maxDurationMs}`);
      return this._parseSparqlResults(results);
    } catch (error) {
      logger.error(`Long locks query failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Get lock information with RDF enrichment
   *
   * Falls back to Git-based info if RDF unavailable
   *
   * @param {string} lockName - Lock name
   * @returns {Promise<import("../types.js").LockRecord|null>} Lock info
   */
  async getLockInfo(lockName) {
    // Always get Git-based info (source of truth)
    const gitInfo = await super.getLockInfo(lockName);

    if (!gitInfo) {
      return null;
    }

    // Enrich with RDF data if available
    if (this.rdfEnabled && this.knowledgeSubstrate) {
      try {
        const rdfInfo = await this._getLockInfoFromRDF(lockName);
        if (rdfInfo) {
          return { ...gitInfo, ...rdfInfo, source: 'git+rdf' };
        }
      } catch (error) {
        logger.debug(`Failed to enrich lock info with RDF: ${error.message}`);
      }
    }

    return { ...gitInfo, source: 'git' };
  }

  /**
   * List all active locks with graph structure
   *
   * @returns {Promise<Array<import("../types.js").LockRecord>>} Active locks
   */
  async listLocks() {
    // Get Git-based locks (source of truth)
    const gitLocks = await super.listLocks();

    // Enrich with RDF relationships if available
    if (this.rdfEnabled && this.knowledgeSubstrate && gitLocks.length > 0) {
      try {
        const rdfEnhancements = await this._getLocksGraphStructure();
        return gitLocks.map(lock => ({
          ...lock,
          ...rdfEnhancements[lock.name],
          source: 'git+rdf'
        }));
      } catch (error) {
        logger.debug(`Failed to enrich locks with RDF: ${error.message}`);
      }
    }

    return gitLocks;
  }

  /**
   * Cleanup expired locks (Git and RDF)
   *
   * @returns {Promise<number>} Number of locks cleaned
   */
  async cleanupExpiredLocks() {
    const cleanedCount = await super.cleanupExpiredLocks();

    // Cleanup RDF entries for expired locks
    if (this.rdfEnabled && this.knowledgeSubstrate && cleanedCount > 0) {
      try {
        await this._cleanupExpiredLocksInRDF();
      } catch (error) {
        logger.warn(`Failed to cleanup expired locks in RDF: ${error.message}`);
      }
    }

    return cleanedCount;
  }

  /**
   * Store lock in RDF graph
   *
   * @private
   * @param {import("../types.js").LockRecord} lockInfo - Lock information
   * @returns {Promise<void>}
   */
  async _storeLockInRDF(lockInfo) {
    const lockUri = `lock:${lockInfo.id}`;
    const triples = [
      `${lockUri} a lock:Lock .`,
      `${lockUri} lock:lockId "${lockInfo.id}" .`,
      `${lockUri} lock:resourceId "${lockInfo.name}" .`,
      `${lockUri} lock:owner "${lockInfo.pid}@${lockInfo.hostname}" .`,
      `${lockUri} lock:ownerPid ${lockInfo.pid} .`,
      `${lockUri} lock:ownerHostname "${lockInfo.hostname}" .`,
      `${lockUri} lock:acquiredAt "${new Date(lockInfo.acquiredAt).toISOString()}"^^xsd:dateTime .`,
      `${lockUri} lock:expiresAt "${new Date(lockInfo.acquiredAt + lockInfo.timeout).toISOString()}"^^xsd:dateTime .`,
      `${lockUri} lock:timeout ${lockInfo.timeout} .`,
      `${lockUri} lock:fingerprint "${lockInfo.fingerprint}" .`,
      `${lockUri} lock:exclusive ${lockInfo.exclusive} .`,
      `${lockUri} lock:state lock:Active .`,
    ];

    const turtle = `
      PREFIX lock: <${this.ontologyNamespace}>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

      ${triples.join('\n      ')}
    `;

    if (this.knowledgeSubstrate.load) {
      await this.knowledgeSubstrate.load(turtle, {
        format: 'text/turtle',
        baseIRI: this.ontologyNamespace
      });
    }

    logger.debug(`Stored lock ${lockInfo.id} in RDF`);
  }

  /**
   * Release lock in RDF (update state)
   *
   * @private
   * @param {import("../types.js").LockRecord} lockInfo - Lock information
   * @returns {Promise<void>}
   */
  async _releaseLockInRDF(lockInfo) {
    const updateQuery = `
      PREFIX lock: <${this.ontologyNamespace}>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

      DELETE {
        ?lock lock:state lock:Active .
      }
      INSERT {
        ?lock lock:state lock:Released .
        ?lock lock:releasedAt "${new Date().toISOString()}"^^xsd:dateTime .
      }
      WHERE {
        ?lock lock:lockId "${lockInfo.id}" ;
              lock:state lock:Active .
      }
    `;

    if (this.knowledgeSubstrate.update) {
      await this.knowledgeSubstrate.update(updateQuery);
    }

    logger.debug(`Released lock ${lockInfo.id} in RDF`);
  }

  /**
   * Get lock info from RDF
   *
   * @private
   * @param {string} lockName - Lock name
   * @returns {Promise<Object|null>} RDF lock info
   */
  async _getLockInfoFromRDF(lockName) {
    const query = `
      PREFIX lock: <${this.ontologyNamespace}>

      SELECT ?lockId ?state ?blockedBy WHERE {
        ?lock lock:resourceId "${lockName}" ;
              lock:lockId ?lockId ;
              lock:state ?state .
        OPTIONAL { ?lock lock:blockedBy ?blockedBy }
      }
      LIMIT 1
    `;

    const results = await this._executeQuery(query, `lock-info-${lockName}`);
    const parsed = this._parseSparqlResults(results);
    return parsed.length > 0 ? parsed[0] : null;
  }

  /**
   * Get locks graph structure (blocking relationships)
   *
   * @private
   * @returns {Promise<Object>} Map of lock names to graph data
   */
  async _getLocksGraphStructure() {
    const query = `
      PREFIX lock: <${this.ontologyNamespace}>

      SELECT ?lockId ?resourceId ?blockedBy ?blocks WHERE {
        ?lock lock:lockId ?lockId ;
              lock:resourceId ?resourceId .
        OPTIONAL { ?lock lock:blockedBy ?blockedByLock .
                   ?blockedByLock lock:lockId ?blockedBy }
        OPTIONAL { ?lock lock:blocks ?blocksLock .
                   ?blocksLock lock:lockId ?blocks }
      }
    `;

    const results = await this._executeQuery(query, 'locks-graph');
    const parsed = this._parseSparqlResults(results);

    // Group by resourceId
    const graph = {};
    parsed.forEach(row => {
      graph[row.resourceId] = {
        blockedBy: row.blockedBy || null,
        blocks: row.blocks || null
      };
    });

    return graph;
  }

  /**
   * Cleanup expired locks in RDF
   *
   * @private
   * @returns {Promise<void>}
   */
  async _cleanupExpiredLocksInRDF() {
    const updateQuery = `
      PREFIX lock: <${this.ontologyNamespace}>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

      DELETE {
        ?lock lock:state lock:Active .
      }
      INSERT {
        ?lock lock:state lock:Expired .
      }
      WHERE {
        ?lock lock:state lock:Active ;
              lock:expiresAt ?expiresAt .
        FILTER(?expiresAt < NOW())
      }
    `;

    if (this.knowledgeSubstrate.update) {
      await this.knowledgeSubstrate.update(updateQuery);
    }

    logger.debug('Cleaned up expired locks in RDF');
  }

  /**
   * Validate lock ontology is loaded
   *
   * @private
   * @returns {Promise<void>}
   * @throws {Error} If lock ontology not loaded
   */
  async _validateLockOntology() {
    const lockClass = `${this.ontologyNamespace}Lock`;

    if (this.knowledgeSubstrate.getClass) {
      try {
        const classDef = await this.knowledgeSubstrate.getClass(lockClass);
        if (!classDef) {
          throw new Error('Lock ontology not loaded');
        }
        logger.debug('Lock ontology validation passed');
      } catch (error) {
        throw new Error(`Lock ontology validation failed: ${error.message}`);
      }
    } else {
      logger.warn('Cannot validate ontology - KnowledgeSubstrate.getClass not available');
    }
  }

  /**
   * Execute SPARQL query with error handling
   *
   * @private
   * @param {string} query - SPARQL query
   * @param {string} cacheKey - Cache key
   * @returns {Promise<any>} Query results
   */
  async _executeQuery(query, cacheKey) {
    if (!this.knowledgeSubstrate.query) {
      throw new Error('KnowledgeSubstrate.query not available');
    }

    try {
      const result = await this.knowledgeSubstrate.query(query);
      this._queryCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    } catch (error) {
      logger.error(`SPARQL query failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse SPARQL query results
   *
   * @private
   * @param {any} results - Raw SPARQL results
   * @returns {Array<Object>} Parsed results
   */
  _parseSparqlResults(results) {
    if (!results || !results.results || !results.results.bindings) {
      return [];
    }

    return results.results.bindings.map(binding => {
      const row = {};
      for (const [key, value] of Object.entries(binding)) {
        row[key] = value.value;
      }
      return row;
    });
  }

  /**
   * Ensure RDF is enabled
   *
   * @private
   * @returns {boolean} True if RDF enabled
   */
  _ensureRDFEnabled() {
    if (!this.rdfEnabled || !this.knowledgeSubstrate) {
      logger.debug('RDF features not enabled');
      return false;
    }
    return true;
  }
}

export default RDFLockManager;
