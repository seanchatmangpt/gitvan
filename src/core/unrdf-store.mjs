/**
 * @unrdf/core Store Wrapper - Central RDF persistence layer
 *
 * Dual-backend architecture:
 * - Git refs (refs/rdf/*) for permanent, versioned storage
 * - In-memory quad store for blazing-fast queries
 *
 * Sync strategy: Git is source of truth, in-memory is query cache
 * Write flow: Git → In-memory (synchronous)
 * Read flow: In-memory (with fallback to Git)
 *
 * NOTE: Foundation spike uses simplified in-memory store.
 * Full @unrdf/core integration comes in Phase 2.
 */

import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('unrdf:store');

/**
 * Singleton store instance with dual backends
 */
class UnrdfStore {
  constructor() {
    this.store = null;
    this.queryEngine = null;
    this.initialized = false;
    this.stats = {
      quadsWritten: 0,
      quadsRead: 0,
      queriesExecuted: 0,
    };
  }

  /**
   * Initialize store with Git-backed persistence
   * Loads existing RDF data from Git refs/rdf/* into in-memory store
   */
  async initialize() {
    try {
      logger.info('Initializing UnRDF store with Git persistence...');

      // Create simple in-memory quad store
      // TODO: Replace with @unrdf/core KGCStore in Phase 2
      this.store = new Map(); // quadId -> quad object

      // Load existing RDF data from Git refs
      await this.loadFromGit();

      this.initialized = true;
      logger.info('✅ UnRDF store initialized successfully');
      return this;
    } catch (error) {
      logger.error('Failed to initialize UnRDF store:', error);
      throw new Error(`Store initialization failed: ${error.message}`);
    }
  }

  /**
   * Load RDF data from Git refs/rdf/* into store
   * Partitioned by domain: config, jobs, hooks, workflows, events
   *
   * TODO: Implement Git persistence layer integration
   * For now, store starts empty and grows as data is inserted
   */
  async loadFromGit() {
    try {
      // TODO: Integrate with git composable to load refs/rdf/*
      logger.debug('Git persistence layer not yet integrated - store starting empty');
      logger.info(`Loaded RDF data from Git refs (${this.stats.quadsRead} quads)`);
    } catch (error) {
      logger.warn('Could not load RDF from Git:', error.message);
      // Non-fatal - store can start empty
    }
  }

  /**
   * Ingest Turtle data into the store
   * Foundation spike: simple parsing (full Turtle parser in Phase 2)
   */
  async ingestTurtle(turtleData, sourceRef) {
    try {
      // TODO: Implement proper Turtle parser in Phase 2
      // For now, skip Turtle parsing - quads added via insert()
      logger.debug(
        `[TODO] Parse Turtle from ${sourceRef} (${turtleData.length} bytes)`
      );
    } catch (error) {
      logger.warn(`Could not parse Turtle from ${sourceRef}:`, error.message);
    }
  }

  /**
   * Execute SPARQL query against store
   * Foundation spike: returns empty results (full SPARQL in Phase 2)
   *
   * TODO: Integrate @unrdf/core SPARQL engine in Phase 2
   */
  async sparql(query, options = {}) {
    if (!this.initialized) {
      throw new Error('Store not initialized - call initialize() first');
    }

    try {
      this.stats.queriesExecuted++;

      logger.debug(`SPARQL query (${query.substring(0, 50)}...)`);

      // TODO: Execute actual SPARQL queries with @unrdf/core engine
      // For foundation spike, return empty results
      return { bindings: [] };
    } catch (error) {
      logger.error('SPARQL query failed:', error);
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }

  /**
   * Insert RDF triples
   * Writes to in-memory store (Git persistence TODO)
   *
   * TODO: Integrate Git persistence - write to refs/rdf/* refs
   */
  async insert(quads, refPath) {
    if (!this.initialized) {
      throw new Error('Store not initialized');
    }

    try {
      // Add to in-memory store
      for (const quad of quads) {
        // Create quad ID from subject + predicate + object
        const quadId = `${quad.subject.value}|${quad.predicate.value}|${
          quad.object.value
        }`;
        this.store.set(quadId, quad);
        this.stats.quadsWritten++;
      }

      // TODO: Persist to Git ref when git composable is integrated
      if (refPath) {
        logger.debug(
          `[TODO] Persisting ${quads.length} quads to ${refPath} in Git refs`
        );
      }

      return { success: true, count: quads.length };
    } catch (error) {
      logger.error('Failed to insert quads:', error);
      throw new Error(`Insert failed: ${error.message}`);
    }
  }

  /**
   * Delete RDF triples
   */
  async delete(quads, refPath) {
    if (!this.initialized) {
      throw new Error('Store not initialized');
    }

    try {
      for (const quad of quads) {
        const quadId = `${quad.subject.value}|${quad.predicate.value}|${
          quad.object.value
        }`;
        if (this.store.has(quadId)) {
          this.store.delete(quadId);
        }
      }

      // TODO: Update Git ref when persistence is integrated
      if (refPath) {
        logger.debug(
          `[TODO] Updating ${refPath} in Git refs to remove ${quads.length} quads`
        );
      }

      return { success: true, count: quads.length };
    } catch (error) {
      logger.error('Failed to delete quads:', error);
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Convert quads to Turtle format for Git storage
   */
  quadsToTurtle(quads) {
    try {
      // Convert each quad to N-Triples, then aggregate to Turtle
      const ntriples = quads.map((quad) => {
        const s = this.termToNT(quad.subject);
        const p = this.termToNT(quad.predicate);
        const o = this.termToNT(quad.object);
        return `${s} ${p} ${o} .`;
      });

      return ntriples.join('\n') + '\n';
    } catch (error) {
      logger.error('Failed to convert quads to Turtle:', error);
      return '';
    }
  }

  /**
   * Convert RDF term to N-Triples format
   */
  termToNT(term) {
    if (term.termType === 'NamedNode') {
      return `<${term.value}>`;
    } else if (term.termType === 'Literal') {
      const escaped = term.value.replace(/"/g, '\\"');
      if (term.datatype) {
        return `"${escaped}"^^<${term.datatype.value}>`;
      }
      return `"${escaped}"`;
    } else if (term.termType === 'BlankNode') {
      return `_:${term.value}`;
    }
    return '';
  }

  /**
   * Get store statistics
   */
  getStats() {
    return {
      ...this.stats,
      totalQuads: this.store instanceof Map ? this.store.size : 0,
      initialized: this.initialized,
    };
  }

  /**
   * Reset store (for testing)
   */
  async reset() {
    this.store = null;
    this.queryEngine = null;
    this.initialized = false;
    this.stats = {
      quadsWritten: 0,
      quadsRead: 0,
      queriesExecuted: 0,
    };
  }
}

// Singleton instance
const unrdfStore = new UnrdfStore();

export { unrdfStore, UnrdfStore };
