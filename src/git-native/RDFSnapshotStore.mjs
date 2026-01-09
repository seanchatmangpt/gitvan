import { SnapshotStore } from './SnapshotStore.mjs';
import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('git-native:RDFSnapshotStore');

/**
 * RDFSnapshotStore - Snapshot storage with RDF semantic metadata
 *
 * Extends SnapshotStore to add RDF provenance tracking and queryable metadata.
 * Uses dual-write pattern: JSON for content, RDF for relationships/lineage.
 *
 * Features:
 * - Immutable snapshot chains with previousSnapshot links
 * - PROV-O provenance tracking (wasGeneratedBy, wasAttributedTo)
 * - SPARQL queries for lineage discovery and timeline analysis
 * - Backward compatible with existing SnapshotStore
 *
 * @example
 * const store = new RDFSnapshotStore({ cwd: '/repo' });
 * await store.initialize(knowledgeSubstrate);
 *
 * const hash = await store.storeSnapshot('workflow-state', data, {
 *   operation: 'workflow-execution',
 *   user: 'system'
 * });
 *
 * const lineage = await store.getSnapshotLineage('workflow-state');
 * const timeline = await store.getSnapshotTimeline('workflow-state');
 *
 * @module git-native/RDFSnapshotStore
 */
export class RDFSnapshotStore extends SnapshotStore {
  /**
   * @param {Object} [options] - Configuration options
   * @param {string} [options.cwd] - Working directory
   * @param {Console} [options.logger] - Logger instance
   * @param {Object} [options.snapshot] - Snapshot configuration
   */
  constructor(options = {}) {
    super(options);

    this.knowledgeSubstrate = null;
    this.rdfEnabled = false;
    this.baseIRI = 'https://gitvan.dev/snapshot/';
    this.provIRI = 'http://www.w3.org/ns/prov#';

    // RDF statistics
    this._rdfStats = {
      triplesWritten: 0,
      queriesExecuted: 0,
      lineageChains: 0,
      provRecords: 0
    };
  }

  /**
   * Initialize RDF snapshot store with KnowledgeSubstrate
   *
   * @param {Object} knowledgeSubstrate - UnRDF KnowledgeSubstrateCore instance
   * @param {Object} [options] - Initialization options
   * @param {boolean} [options.enableRDF=true] - Enable RDF storage
   * @returns {Promise<void>}
   */
  async initialize(knowledgeSubstrate, options = {}) {
    // Initialize base SnapshotStore
    await super.initialize();

    const { enableRDF = true } = options;

    if (enableRDF && knowledgeSubstrate) {
      this.knowledgeSubstrate = knowledgeSubstrate;
      this.rdfEnabled = true;

      logger.info('RDFSnapshotStore initialized with RDF backend');
    } else {
      logger.warn('RDFSnapshotStore initialized WITHOUT RDF (compatibility mode)');
    }
  }

  /**
   * Store snapshot with RDF metadata and provenance
   *
   * Dual-write pattern:
   * 1. Store content in JSON (via parent SnapshotStore)
   * 2. Store metadata as RDF triples with provenance
   *
   * @param {string} key - Snapshot key
   * @param {any} data - Snapshot data
   * @param {Object} [metadata] - Additional metadata
   * @param {string} [metadata.operation] - Operation that created snapshot
   * @param {string} [metadata.user] - User/agent responsible
   * @param {string} [metadata.description] - Human-readable description
   * @param {string[]} [metadata.tags] - Searchable tags
   * @returns {Promise<string>} Content hash
   */
  async storeSnapshot(key, data, metadata = {}) {
    // 1. Store via parent (JSON + Git)
    const contentHash = await super.storeSnapshot(key, data, metadata);

    // 2. Store RDF metadata (if enabled)
    if (this.rdfEnabled && this.knowledgeSubstrate) {
      try {
        await this._storeRDFMetadata(key, contentHash, data, metadata);
      } catch (error) {
        logger.error(`Failed to store RDF metadata: ${error.message}`);
        // Don't fail the entire operation - JSON is primary
      }
    }

    return contentHash;
  }

  /**
   * Get snapshot with RDF-enriched metadata
   *
   * @param {string} key - Snapshot key
   * @param {string|null} [contentHash] - Optional content hash
   * @returns {Promise<any|null>} Snapshot data
   */
  async getSnapshot(key, contentHash = null) {
    const data = await super.getSnapshot(key, contentHash);

    if (data && this.rdfEnabled && this.knowledgeSubstrate) {
      try {
        // Enrich with RDF metadata
        const rdfMetadata = await this._getRDFMetadata(key, contentHash);
        if (rdfMetadata) {
          data._rdf = rdfMetadata;
        }
      } catch (error) {
        logger.debug(`RDF enrichment failed: ${error.message}`);
      }
    }

    return data;
  }

  /**
   * Get complete snapshot lineage chain using SPARQL DESCRIBE
   *
   * Returns full provenance graph including:
   * - All previous snapshots in chain
   * - Generation activities
   * - Attribution to agents
   * - Derivation relationships
   *
   * @param {string} key - Snapshot key
   * @returns {Promise<Object>} Lineage graph
   */
  async getSnapshotLineage(key) {
    if (!this.rdfEnabled || !this.knowledgeSubstrate) {
      logger.warn('RDF not enabled, returning empty lineage');
      return { snapshots: [], totalChain: 0 };
    }

    try {
      const query = `
        PREFIX snap: <https://gitvan.dev/snapshot#>
        PREFIX prov: <http://www.w3.org/ns/prov#>

        DESCRIBE ?snapshot ?earlier WHERE {
          ?snapshot snap:key "${key}" ;
                   snap:previousSnapshot* ?earlier .
          OPTIONAL {
            ?snapshot prov:wasGeneratedBy ?operation .
          }
          OPTIONAL {
            ?snapshot prov:wasAttributedTo ?user .
          }
        }
      `;

      const result = await this._executeSparqlQuery(query);

      this._rdfStats.lineageChains++;

      return this._parseLineageResult(result);
    } catch (error) {
      logger.error(`Lineage query failed: ${error.message}`);
      return { snapshots: [], totalChain: 0, error: error.message };
    }
  }

  /**
   * Get snapshot timeline using SPARQL SELECT
   *
   * Returns ordered list of snapshots with:
   * - Timestamps
   * - Operations that created them
   * - Content hashes
   * - Provenance information
   *
   * @param {string} key - Snapshot key
   * @returns {Promise<Array>} Timeline entries
   */
  async getSnapshotTimeline(key) {
    if (!this.rdfEnabled || !this.knowledgeSubstrate) {
      logger.warn('RDF not enabled, returning empty timeline');
      return [];
    }

    try {
      const query = `
        PREFIX snap: <https://gitvan.dev/snapshot#>
        PREFIX prov: <http://www.w3.org/ns/prov#>
        PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

        SELECT ?timestamp ?operation ?content ?commit ?branch WHERE {
          ?snapshot snap:key "${key}" ;
                   snap:timestamp ?timestamp ;
                   snap:contentHash ?content .

          OPTIONAL {
            ?snapshot prov:wasGeneratedBy ?operation .
          }
          OPTIONAL {
            ?snapshot snap:commit ?commit .
          }
          OPTIONAL {
            ?snapshot snap:branch ?branch .
          }
        }
        ORDER BY DESC(?timestamp)
      `;

      const result = await this._executeSparqlQuery(query);

      return this._parseTimelineResult(result);
    } catch (error) {
      logger.error(`Timeline query failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Get enhanced statistics including RDF metrics
   *
   * @returns {Object} Combined statistics
   */
  async getStatistics() {
    const baseStats = super.getStatistics();

    return {
      ...baseStats,
      rdf: {
        enabled: this.rdfEnabled,
        triplesWritten: this._rdfStats.triplesWritten,
        queriesExecuted: this._rdfStats.queriesExecuted,
        lineageChains: this._rdfStats.lineageChains,
        provRecords: this._rdfStats.provRecords
      }
    };
  }

  /**
   * Store RDF metadata for snapshot
   *
   * @private
   * @param {string} key - Snapshot key
   * @param {string} contentHash - Content hash
   * @param {any} data - Snapshot data
   * @param {Object} metadata - Metadata
   * @returns {Promise<void>}
   */
  async _storeRDFMetadata(key, contentHash, data, metadata) {
    const snapshotIRI = `${this.baseIRI}${contentHash}`;
    const timestamp = new Date().toISOString();

    // Build RDF triples
    const triples = [
      // Core snapshot properties
      `<${snapshotIRI}> a <https://gitvan.dev/snapshot#Snapshot> .`,
      `<${snapshotIRI}> <https://gitvan.dev/snapshot#key> "${key}" .`,
      `<${snapshotIRI}> <https://gitvan.dev/snapshot#contentHash> "${contentHash}" .`,
      `<${snapshotIRI}> <https://gitvan.dev/snapshot#timestamp> "${timestamp}"^^<http://www.w3.org/2001/XMLSchema#dateTime> .`,
      `<${snapshotIRI}> <https://gitvan.dev/snapshot#generationTime> "${timestamp}"^^<http://www.w3.org/2001/XMLSchema#dateTime> .`,
      `<${snapshotIRI}> <https://gitvan.dev/snapshot#checksumAlgorithm> "SHA-256" .`,
      `<${snapshotIRI}> <https://gitvan.dev/snapshot#size> "${JSON.stringify(data).length}"^^<http://www.w3.org/2001/XMLSchema#integer> .`,
      `<${snapshotIRI}> <https://gitvan.dev/snapshot#status> <https://gitvan.dev/snapshot#Active> .`
    ];

    // Git context
    const commit = await this._getCurrentCommit();
    const branch = await this._getCurrentBranch();

    if (commit !== 'unknown') {
      triples.push(`<${snapshotIRI}> <https://gitvan.dev/snapshot#commit> "${commit}" .`);
    }
    if (branch !== 'unknown') {
      triples.push(`<${snapshotIRI}> <https://gitvan.dev/snapshot#branch> "${branch}" .`);
    }

    // Link to previous snapshot (immutable chain)
    const previousSnapshot = await this._findPreviousSnapshot(key);
    if (previousSnapshot) {
      const prevIRI = `${this.baseIRI}${previousSnapshot.contentHash}`;
      triples.push(`<${snapshotIRI}> <https://gitvan.dev/snapshot#previousSnapshot> <${prevIRI}> .`);
    }

    // Provenance: wasGeneratedBy (operation)
    if (metadata.operation) {
      const operationIRI = `${this.baseIRI}operation/${metadata.operation}`;
      triples.push(`<${snapshotIRI}> <${this.provIRI}wasGeneratedBy> <${operationIRI}> .`);
      this._rdfStats.provRecords++;
    }

    // Provenance: wasAttributedTo (user/agent)
    if (metadata.user) {
      const userIRI = `${this.baseIRI}agent/${metadata.user}`;
      triples.push(`<${snapshotIRI}> <${this.provIRI}wasAttributedTo> <${userIRI}> .`);
    }

    // Optional: description
    if (metadata.description) {
      triples.push(`<${snapshotIRI}> <https://gitvan.dev/snapshot#description> "${metadata.description}" .`);
    }

    // Optional: tags
    if (metadata.tags && Array.isArray(metadata.tags)) {
      triples.push(`<${snapshotIRI}> <https://gitvan.dev/snapshot#tags> "${metadata.tags.join(',')}" .`);
    }

    // Insert triples into KnowledgeSubstrate
    const turtle = triples.join('\n');

    try {
      await this.knowledgeSubstrate.load(turtle, {
        format: 'text/turtle',
        baseIRI: this.baseIRI
      });

      this._rdfStats.triplesWritten += triples.length;

      logger.debug(`Stored ${triples.length} RDF triples for snapshot ${contentHash}`);
    } catch (error) {
      logger.error(`Failed to insert RDF triples: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get RDF metadata for snapshot
   *
   * @private
   * @param {string} key - Snapshot key
   * @param {string|null} contentHash - Content hash
   * @returns {Promise<Object|null>} RDF metadata
   */
  async _getRDFMetadata(key, contentHash) {
    // Simple implementation - can be enhanced with SPARQL
    return {
      rdfEnabled: true,
      baseIRI: this.baseIRI,
      contentHash
    };
  }

  /**
   * Find previous snapshot for linking
   *
   * @private
   * @param {string} key - Snapshot key
   * @returns {Promise<Object|null>} Previous snapshot header
   */
  async _findPreviousSnapshot(key) {
    const snapshots = await this.listSnapshots();
    const matchingSnapshots = snapshots.filter(s => s.key === key);

    if (matchingSnapshots.length > 0) {
      // Return most recent
      return matchingSnapshots[0];
    }

    return null;
  }

  /**
   * Execute SPARQL query
   *
   * @private
   * @param {string} query - SPARQL query
   * @returns {Promise<any>} Query result
   */
  async _executeSparqlQuery(query) {
    if (!this.knowledgeSubstrate || !this.knowledgeSubstrate.query) {
      throw new Error('KnowledgeSubstrate does not support SPARQL queries');
    }

    this._rdfStats.queriesExecuted++;

    return await this.knowledgeSubstrate.query(query);
  }

  /**
   * Parse lineage DESCRIBE result
   *
   * @private
   * @param {any} result - SPARQL result
   * @returns {Object} Parsed lineage
   */
  _parseLineageResult(result) {
    // Simplified parser - actual implementation depends on UnRDF result format
    return {
      snapshots: result?.snapshots || [],
      totalChain: result?.snapshots?.length || 0,
      provenance: result?.provenance || {}
    };
  }

  /**
   * Parse timeline SELECT result
   *
   * @private
   * @param {any} result - SPARQL result
   * @returns {Array} Parsed timeline
   */
  _parseTimelineResult(result) {
    // Simplified parser - actual implementation depends on UnRDF result format
    if (!result || !result.bindings) {
      return [];
    }

    return result.bindings.map(binding => ({
      timestamp: binding.timestamp?.value || null,
      operation: binding.operation?.value || null,
      contentHash: binding.content?.value || null,
      commit: binding.commit?.value || null,
      branch: binding.branch?.value || null
    }));
  }
}

export default RDFSnapshotStore;
