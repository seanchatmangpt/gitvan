/**
 * @unrdf/core Store Wrapper - Central RDF persistence layer
 *
 * Dual-backend architecture:
 * - Git refs (refs/rdf/*) for permanent, versioned storage (via @unrdf/kgc-4d)
 * - Oxigraph in-memory store for blazing-fast queries (@unrdf/core)
 *
 * Integration:
 * - UnrdfStore wraps @unrdf/core.UnrdfStore (Oxigraph backend)
 * - KGCStore wraps event logging + Git persistence
 * - GitBackbone provides isomorphic-git integration
 *
 * Sync strategy:
 * - Write flow: Memory → Git (atomic commits)
 * - Read flow: Memory (with optional Git sync on startup)
 * - Queries: Synchronous SPARQL via @unrdf/core
 */

import {
  UnrdfStore as OxigraphStore,
  namedNode,
  literal,
  blankNode,
  quad,
  executeQuerySync,
} from '@unrdf/core';
import { KGCStore, GitBackbone } from '@unrdf/kgc-4d';
import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('unrdf:store');

/**
 * UnRDF Store - Wrapper around @unrdf/core + @unrdf/kgc-4d
 *
 * Provides:
 * - Oxigraph-backed RDF store (synchronous operations)
 * - Event logging with KGC-4D
 * - Git persistence with GitBackbone
 */
class UnrdfStore {
  constructor() {
    // @unrdf/core Oxigraph store (primary query engine)
    this.store = null;

    // @unrdf/kgc-4d event log (audit trail + time-travel)
    this.kgcStore = null;

    // Git persistence layer
    this.git = null;

    // Store state
    this.initialized = false;
    this.stats = {
      quadsWritten: 0,
      quadsRead: 0,
      queriesExecuted: 0,
      eventsLogged: 0,
    };
  }

  /**
   * Initialize @unrdf/core store with optional Git and KGC-4D
   */
  async initialize(options = {}) {
    try {
      logger.info('Initializing UnRDF store with @unrdf/core + @unrdf/kgc-4d...');

      // Create Oxigraph-backed store (@unrdf/core)
      this.store = new OxigraphStore();
      logger.debug('✓ Created Oxigraph store');

      // Initialize KGC-4D for event logging
      this.kgcStore = new KGCStore();
      logger.debug('✓ Created KGCStore for event logging');

      // Initialize Git persistence if configured
      if (options.gitRepo) {
        try {
          this.git = new GitBackbone(options.gitRepo);
          logger.debug(`✓ Initialized Git persistence at ${options.gitRepo}`);

          // Load existing RDF from Git refs
          await this.loadFromGit();
        } catch (error) {
          logger.warn(`Git persistence unavailable: ${error.message}`);
          this.git = null;
        }
      }

      this.initialized = true;
      logger.info('✅ UnRDF store initialized successfully');
      return this;
    } catch (error) {
      logger.error('Failed to initialize UnRDF store:', error);
      throw new Error(`Store initialization failed: ${error.message}`);
    }
  }

  /**
   * Load RDF data from Git refs/rdf/* into Oxigraph store
   * Partitioned by domain: config, jobs, hooks, workflows, events
   */
  async loadFromGit() {
    if (!this.git) return;

    try {
      const refPatterns = [
        'refs/rdf/config',
        'refs/rdf/jobs',
        'refs/rdf/hooks',
        'refs/rdf/workflows',
        'refs/rdf/events',
      ];

      for (const pattern of refPatterns) {
        try {
          // TODO: Implement git composable integration to list refs by pattern
          logger.debug(`Checking Git ref pattern: ${pattern}`);
        } catch (error) {
          // Ref pattern may not exist yet - this is fine
          logger.debug(`Git ref pattern ${pattern} not yet populated`);
        }
      }

      logger.info(`Loaded RDF data from Git refs (${this.stats.quadsRead} quads)`);
    } catch (error) {
      logger.warn('Could not load RDF from Git:', error.message);
      // Non-fatal - store can start empty
    }
  }

  /**
   * Execute SPARQL query using @unrdf/core synchronous engine
   *
   * @param {string} query - SPARQL query (SELECT, ASK, CONSTRUCT, DESCRIBE)
   * @param {Object} options - Query options
   * @returns {Promise<Array|boolean|Quad[]>} Query results
   */
  async sparql(query, options = {}) {
    if (!this.initialized) {
      throw new Error('Store not initialized - call initialize() first');
    }

    try {
      this.stats.queriesExecuted++;

      logger.debug(`SPARQL query: ${query.substring(0, 60)}...`);

      // Execute synchronously using @unrdf/core
      const results = executeQuerySync(this.store, query);

      logger.debug(`Query returned ${Array.isArray(results) ? results.length : 1} result(s)`);
      return results;
    } catch (error) {
      logger.error('SPARQL query failed:', error);
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }

  /**
   * Insert RDF quads into store
   *
   * @param {Quad[]} quads - RDF quads to insert
   * @param {string} refPath - Optional Git ref path for persistence
   * @returns {Promise<Object>} { success: boolean, count: number }
   */
  async insert(quads, refPath) {
    if (!this.initialized) {
      throw new Error('Store not initialized');
    }

    try {
      // Add to Oxigraph store
      for (const quad of quads) {
        this.store.add(quad);
        this.stats.quadsWritten++;
      }

      // Log event in KGC-4D for audit trail
      if (this.kgcStore) {
        await this.kgcStore.appendEvent(
          {
            type: 'INSERT',
            count: quads.length,
            ref: refPath,
          },
          quads.map((q) => ({ type: 'add', ...q }))
        );
        this.stats.eventsLogged++;
      }

      // Persist to Git ref if configured
      if (refPath && this.git) {
        try {
          await this.persistToGit(quads, refPath, 'Add quads');
        } catch (error) {
          logger.warn(`Failed to persist to Git: ${error.message}`);
          // Non-fatal - continue with in-memory store
        }
      }

      return { success: true, count: quads.length };
    } catch (error) {
      logger.error('Failed to insert quads:', error);
      throw new Error(`Insert failed: ${error.message}`);
    }
  }

  /**
   * Delete RDF quads from store
   *
   * @param {Quad[]} quads - RDF quads to delete
   * @param {string} refPath - Optional Git ref path for persistence
   * @returns {Promise<Object>} { success: boolean, count: number }
   */
  async delete(quads, refPath) {
    if (!this.initialized) {
      throw new Error('Store not initialized');
    }

    try {
      // Remove from Oxigraph store
      for (const quad of quads) {
        this.store.delete(quad);
      }

      // Log event in KGC-4D
      if (this.kgcStore) {
        await this.kgcStore.appendEvent(
          {
            type: 'DELETE',
            count: quads.length,
            ref: refPath,
          },
          quads.map((q) => ({ type: 'remove', ...q }))
        );
        this.stats.eventsLogged++;
      }

      // Update Git ref if configured
      if (refPath && this.git) {
        try {
          await this.persistToGit([], refPath, 'Delete quads');
        } catch (error) {
          logger.warn(`Failed to persist deletion to Git: ${error.message}`);
        }
      }

      return { success: true, count: quads.length };
    } catch (error) {
      logger.error('Failed to delete quads:', error);
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Persist quads to Git ref in N-Quads format
   *
   * @private
   */
  async persistToGit(quads, refPath, message) {
    if (!this.git) return;

    try {
      // Convert to N-Quads format
      const nquads = quads
        .map((q) => `${this.termToNT(q.subject)} ${this.termToNT(q.predicate)} ${this.termToNT(q.object)} .`)
        .join('\n');

      // Commit to Git
      const commit = await this.git.commitSnapshot(nquads, refPath, {
        author: { name: 'GitVan', email: 'bot@gitvan.ai' },
        message: `${message} to ${refPath}`,
      });

      logger.debug(`Persisted ${quads.length} quads to Git: ${commit.slice(0, 8)}`);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Convert RDF term to N-Triples format
   *
   * @private
   */
  termToNT(term) {
    if (term.termType === 'NamedNode') {
      return `<${term.value}>`;
    } else if (term.termType === 'Literal') {
      const escaped = term.value.replace(/"/g, '\\"');
      const lang = term.language ? `@${term.language}` : '';
      const type = term.datatype && term.datatype.value !== 'http://www.w3.org/2001/XMLSchema#string'
        ? `^^<${term.datatype.value}>`
        : '';
      return `"${escaped}"${lang}${type}`;
    } else if (term.termType === 'BlankNode') {
      return `_:${term.value}`;
    } else if (term.termType === 'Variable') {
      return `?${term.value}`;
    }
    return '';
  }

  /**
   * Get store statistics
   */
  getStats() {
    return {
      ...this.stats,
      totalQuads: this.store?.size?.() || 0,
      storeType: '@unrdf/core (Oxigraph)',
      hasGit: !!this.git,
      hasKGC: !!this.kgcStore,
      initialized: this.initialized,
    };
  }

  /**
   * Create term factories for convenient RDF creation
   */
  terms() {
    return {
      namedNode,
      literal,
      blankNode,
      quad,
    };
  }

  /**
   * Reset store (for testing)
   */
  async reset() {
    this.store = null;
    this.kgcStore = null;
    this.git = null;
    this.initialized = false;
    this.stats = {
      quadsWritten: 0,
      quadsRead: 0,
      queriesExecuted: 0,
      eventsLogged: 0,
    };
  }
}

// Singleton instance
const unrdfStore = new UnrdfStore();

// Export term factories for convenience
export { unrdfStore, UnrdfStore, namedNode, literal, blankNode, quad };
