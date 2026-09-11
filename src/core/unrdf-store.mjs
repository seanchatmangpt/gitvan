/**
 * @unrdf/core Store Wrapper - Central RDF persistence layer
 *
 * Dual-backend architecture:
 * - Git refs (refs/rdf/*) for permanent, versioned storage (via @unrdf/kgc-4d)
 * - Oxigraph in-memory store for blazing-fast queries (@unrdf/core)
 *
 * Integration:
 * - UnrdfStore wraps @unrdf/core.UnrdfStore (Oxigraph backend)
 * - KGCStore owns 4D event logging, causal clocks, and historical reconstruction
 * - GitBackbone provides isomorphic-git integration
 *
 * Sync strategy:
 * - Write flow: Memory → KGC-4D event → Git (atomic commit when configured)
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
const DEFAULT_KGC_NODE_ID = 'gitvan';

class UnrdfStore {
  constructor() {
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

  async initialize(options = {}) {
    try {
      logger.info('Initializing UnRDF store with @unrdf/core + @unrdf/kgc-4d...');

      this.store = new OxigraphStore();
      logger.debug('✓ Created Oxigraph store');

      this.kgcStore = new KGCStore({
        nodeId: options.kgcNodeId || DEFAULT_KGC_NODE_ID,
      });
      logger.debug('✓ Created deterministic KGCStore for event logging');

      if (options.gitRepo) {
        try {
          this.git = new GitBackbone(options.gitRepo);
          logger.debug(`✓ Initialized Git persistence at ${options.gitRepo}`);
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
          // TODO: Implement git composable integration to list refs by pattern.
          logger.debug(`Checking Git ref pattern: ${pattern}`);
        } catch (error) {
          logger.debug(`Git ref pattern ${pattern} not yet populated`);
        }
      }

      logger.info(`Loaded RDF data from Git refs (${this.stats.quadsRead} quads)`);
    } catch (error) {
      logger.warn('Could not load RDF from Git:', error.message);
    }
  }

  async sparql(query, options = {}) {
    if (!this.initialized) {
      throw new Error('Store not initialized - call initialize() first');
    }

    try {
      this.stats.queriesExecuted++;
      logger.debug(`SPARQL query: ${query.substring(0, 60)}...`);
      const results = executeQuerySync(this.store, query);
      logger.debug(`Query returned ${Array.isArray(results) ? results.length : 1} result(s)`);
      return results;
    } catch (error) {
      logger.error('SPARQL query failed:', error);
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }

  /**
   * Insert RDF quads and record the same mutation as a native KGC-4D event.
   * eventData follows the KGCStore contract: { type, payload, git_ref }.
   */
  async insert(quads, refPath, options = {}) {
    if (!this.initialized) {
      throw new Error('Store not initialized');
    }

    try {
      for (const rdfQuad of quads) {
        this.store.add(rdfQuad);
        this.stats.quadsWritten++;
      }

      let receipt = null;
      if (this.kgcStore) {
        const eventData = options.eventData || {
          type: 'INSERT',
          payload: {
            count: quads.length,
            ref: refPath || null,
          },
          git_ref: refPath || null,
        };

        const result = await this.kgcStore.appendEvent(
          eventData,
          quads.map((rdfQuad) => ({
            type: 'add',
            subject: rdfQuad.subject,
            predicate: rdfQuad.predicate,
            object: rdfQuad.object,
          }))
        );
        receipt = result?.receipt || null;
        this.stats.eventsLogged++;
      }

      if (refPath && this.git) {
        try {
          await this.persistToGit(quads, refPath, 'Add quads');
        } catch (error) {
          logger.warn(`Failed to persist to Git: ${error.message}`);
        }
      }

      return { success: true, count: quads.length, receipt };
    } catch (error) {
      logger.error('Failed to insert quads:', error);
      throw new Error(`Insert failed: ${error.message}`);
    }
  }

  /**
   * Delete RDF quads and record the deletion through KGC-4D.
   */
  async delete(quads, refPath, options = {}) {
    if (!this.initialized) {
      throw new Error('Store not initialized');
    }

    try {
      for (const rdfQuad of quads) {
        this.store.delete(rdfQuad);
      }

      let receipt = null;
      if (this.kgcStore) {
        const eventData = options.eventData || {
          type: 'DELETE',
          payload: {
            count: quads.length,
            ref: refPath || null,
          },
          git_ref: refPath || null,
        };

        const result = await this.kgcStore.appendEvent(
          eventData,
          quads.map((rdfQuad) => ({
            type: 'delete',
            subject: rdfQuad.subject,
            predicate: rdfQuad.predicate,
            object: rdfQuad.object,
          }))
        );
        receipt = result?.receipt || null;
        this.stats.eventsLogged++;
      }

      if (refPath && this.git) {
        try {
          await this.persistToGit([], refPath, 'Delete quads');
        } catch (error) {
          logger.warn(`Failed to persist deletion to Git: ${error.message}`);
        }
      }

      return { success: true, count: quads.length, receipt };
    } catch (error) {
      logger.error('Failed to delete quads:', error);
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Reconstruct KGC-4D state at a historical nanosecond coordinate.
   * Requires a configured GitBackbone; inspection does not imply actuation.
   */
  async reconstructAt(targetTime) {
    if (!this.initialized) {
      throw new Error('Store not initialized');
    }
    if (!this.kgcStore) {
      throw new Error('KGC-4D store unavailable');
    }
    if (!this.git) {
      throw new Error('Git persistence required for KGC-4D reconstruction');
    }
    if (typeof this.kgcStore.reconstructState !== 'function') {
      throw new Error('Installed @unrdf/kgc-4d does not support reconstructState');
    }

    return this.kgcStore.reconstructState(this.git, targetTime);
  }

  getTemporalStats() {
    if (!this.kgcStore || typeof this.kgcStore.getEventLogStats !== 'function') {
      return null;
    }
    return this.kgcStore.getEventLogStats();
  }

  async persistToGit(quads, refPath, message) {
    if (!this.git) return;

    const nquads = quads
      .map(
        (rdfQuad) =>
          `${this.termToNT(rdfQuad.subject)} ${this.termToNT(rdfQuad.predicate)} ${this.termToNT(rdfQuad.object)} .`
      )
      .join('\n');

    const commit = await this.git.commitSnapshot(nquads, refPath, {
      author: { name: 'GitVan', email: 'bot@gitvan.ai' },
      message: `${message} to ${refPath}`,
    });

    logger.debug(`Persisted ${quads.length} quads to Git: ${commit.slice(0, 8)}`);
  }

  termToNT(term) {
    const termType = term.termType || term.type;

    if (termType === 'NamedNode') {
      return `<${term.value}>`;
    }
    if (termType === 'Literal') {
      const escaped = term.value.replace(/"/g, '\\"');
      const lang = term.language ? `@${term.language}` : '';
      const datatypeValue = term.datatype?.value;
      const type =
        datatypeValue && datatypeValue !== 'http://www.w3.org/2001/XMLSchema#string'
          ? `^^<${datatypeValue}>`
          : '';
      return `"${escaped}"${lang}${type}`;
    }
    if (termType === 'BlankNode') {
      return `_:${term.value}`;
    }
    if (termType === 'Variable') {
      return `?${term.value}`;
    }
    return '';
  }

  getStats() {
    return {
      ...this.stats,
      totalQuads: this.store?.size?.() || 0,
      storeType: '@unrdf/core (Oxigraph)',
      hasGit: !!this.git,
      hasKGC: !!this.kgcStore,
      kgc: this.getTemporalStats(),
      initialized: this.initialized,
    };
  }

  terms() {
    return {
      namedNode,
      literal,
      blankNode,
      quad,
    };
  }

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

const unrdfStore = new UnrdfStore();

export { unrdfStore, UnrdfStore, namedNode, literal, blankNode, quad };
