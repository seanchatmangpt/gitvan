/**
 * @file useOxigraphStore.mjs
 * @description Oxigraph SPARQL store adapter for GitVan
 * Provides a high-performance RDF store with SPARQL support,
 * NQuads serialization, and 100K+ quad handling
 */

import oxigraph from 'oxigraph';

/**
 * Create an Oxigraph-backed RDF store composable
 * Supports SPARQL queries, quad operations, and NQuads import/export
 *
 * @param {Object} options - Configuration options
 * @param {Array} [options.quads] - Initial quads to populate store
 * @returns {Object} Store operations interface
 *
 * @example
 * const store = useOxigraphStore();
 * store.addQuad({
 *   subject: { type: 'NamedNode', value: 'http://example.org/s' },
 *   predicate: { type: 'NamedNode', value: 'http://example.org/p' },
 *   object: { type: 'NamedNode', value: 'http://example.org/o' },
 *   graph: { type: 'DefaultGraph' }
 * });
 * const quads = store.getQuads();
 */
export function useOxigraphStore(options = {}) {
  // Create the underlying Oxigraph store
  const oxStore = new oxigraph.Store(options.quads || []);

  // Track metadata
  let _metadata = {
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    quadCount: 0,
  };

  return {
    /**
     * Get the underlying Oxigraph store instance
     * @returns {Object} The raw oxigraph.Store instance
     */
    get raw() {
      return oxStore;
    },

    /**
     * Get metadata about the store
     * @returns {Object} Metadata object
     */
    get metadata() {
      return {
        ..._metadata,
        quadCount: this.getQuads().length,
      };
    },

    /**
     * Add a single quad to the store
     * Supports two patterns:
     * 1. addQuad(quadObject)
     * 2. addQuad(subject, predicate, object, graph?)
     *
     * @param {Object|null} quadOrSubject - RDF quad object or subject term
     * @param {Object} [predicate] - Predicate term (if using separate args)
     * @param {Object} [object] - Object term (if using separate args)
     * @param {Object} [graph] - Graph term (if using separate args)
     * @returns {void}
     */
    addQuad(quadOrSubject, predicate, object, graph) {
      // Build quad from separate args if predicate provided
      if (predicate !== undefined) {
        const quad = oxigraph.quad(
          quadOrSubject,
          predicate,
          object,
          graph || oxigraph.defaultGraph()
        );
        oxStore.add(quad);
      } else {
        // Otherwise treat first arg as complete quad object
        oxStore.add(quadOrSubject);
      }
      _metadata.lastModified = new Date().toISOString();
    },

    /**
     * Remove a single quad from the store
     * Supports two patterns:
     * 1. removeQuad(quadObject)
     * 2. removeQuad(subject, predicate, object, graph?)
     *
     * @param {Object|null} quadOrSubject - RDF quad object or subject term
     * @param {Object} [predicate] - Predicate term (if using separate args)
     * @param {Object} [object] - Object term (if using separate args)
     * @param {Object} [graph] - Graph term (if using separate args)
     * @returns {void}
     */
    removeQuad(quadOrSubject, predicate, object, graph) {
      // Build quad from separate args if predicate provided
      if (predicate !== undefined) {
        const quad = oxigraph.quad(
          quadOrSubject,
          predicate,
          object,
          graph || oxigraph.defaultGraph()
        );
        oxStore.delete(quad);
      } else {
        // Otherwise treat first arg as complete quad object
        oxStore.delete(quadOrSubject);
      }
      _metadata.lastModified = new Date().toISOString();
    },

    /**
     * Get quads matching a pattern
     * All parameters are optional for wildcard matching
     *
     * @param {Object} [subject] - Subject to match (null for wildcard)
     * @param {Object} [predicate] - Predicate to match (null for wildcard)
     * @param {Object} [object] - Object to match (null for wildcard)
     * @param {Object} [graph] - Graph to match (null for wildcard)
     * @returns {Array<Object>} Array of matching quads
     */
    getQuads(subject, predicate, object, graph) {
      try {
        const result = oxStore.match(subject, predicate, object, graph);
        return Array.from(result || []);
      } catch (error) {
        throw new Error(`[useOxigraphStore] getQuads failed: ${error.message}`);
      }
    },

    /**
     * Check if a quad exists in the store
     *
     * @param {Object} quad - RDF quad to check
     * @returns {boolean} True if quad exists
     */
    hasQuad(quad) {
      try {
        return oxStore.has(quad);
      } catch (error) {
        throw new Error(`[useOxigraphStore] hasQuad failed: ${error.message}`);
      }
    },

    /**
     * Execute a SPARQL query (SELECT, ASK, CONSTRUCT, DESCRIBE)
     *
     * @param {string} sparql - SPARQL query string
     * @param {Object} [options] - Query options
     * @returns {Array|boolean|Object} Query results (depends on query type)
     * @throws {Error} If query is invalid
     */
    query(sparql, options = {}) {
      if (!sparql || typeof sparql !== 'string') {
        throw new Error('[useOxigraphStore] SPARQL query must be a non-empty string');
      }

      try {
        return oxStore.query(sparql, options);
      } catch (error) {
        throw new Error(`[useOxigraphStore] Query failed: ${error.message}`);
      }
    },

    /**
     * Execute a SPARQL UPDATE query (INSERT, DELETE, etc.)
     *
     * @param {string} sparql - SPARQL UPDATE query string
     * @param {Object} [options] - Update options
     * @returns {void}
     * @throws {Error} If update is invalid
     */
    update(sparql, options = {}) {
      if (!sparql || typeof sparql !== 'string') {
        throw new Error('[useOxigraphStore] SPARQL UPDATE must be a non-empty string');
      }

      try {
        oxStore.update(sparql, options);
        _metadata.lastModified = new Date().toISOString();
      } catch (error) {
        throw new Error(`[useOxigraphStore] Update failed: ${error.message}`);
      }
    },

    /**
     * Get the number of quads in the store
     *
     * @returns {number} Total quad count
     */
    size() {
      return this.getQuads().length;
    },

    /**
     * Bulk add multiple quads to the store
     * More efficient than repeated addQuad calls
     *
     * @param {Array<Object>} quads - Array of quad objects
     * @returns {number} Number of quads added
     */
    addQuads(quads) {
      if (!Array.isArray(quads)) {
        throw new Error('[useOxigraphStore] addQuads requires an array');
      }

      let added = 0;
      for (const quad of quads) {
        try {
          oxStore.add(quad);
          added++;
        } catch (error) {
          throw new Error(
            `[useOxigraphStore] Failed to add quad ${added + 1}: ${error.message}`
          );
        }
      }
      _metadata.lastModified = new Date().toISOString();
      return added;
    },

    /**
     * Bulk remove multiple quads from the store
     *
     * @param {Array<Object>} quads - Array of quad objects
     * @returns {number} Number of quads removed
     */
    removeQuads(quads) {
      if (!Array.isArray(quads)) {
        throw new Error('[useOxigraphStore] removeQuads requires an array');
      }

      let removed = 0;
      for (const quad of quads) {
        try {
          oxStore.delete(quad);
          removed++;
        } catch (error) {
          throw new Error(
            `[useOxigraphStore] Failed to remove quad ${removed + 1}: ${error.message}`
          );
        }
      }
      _metadata.lastModified = new Date().toISOString();
      return removed;
    },

    /**
     * Export store to NQuads format
     * Native RDF serialization format
     *
     * @returns {string} NQuads-formatted RDF data
     */
    exportNQuads() {
      try {
        return oxStore.dump({ format: 'nq' });
      } catch (error) {
        throw new Error(`[useOxigraphStore] Export failed: ${error.message}`);
      }
    },

    /**
     * Import NQuads data into the store
     * Clears existing data before import
     *
     * @param {string} nquadsData - NQuads-formatted RDF data
     * @returns {number} Number of quads imported
     */
    importNQuads(nquadsData) {
      if (!nquadsData || typeof nquadsData !== 'string') {
        throw new Error('[useOxigraphStore] NQuads data must be a non-empty string');
      }

      try {
        // Create fresh store for clean import
        const newStore = new oxigraph.Store();
        newStore.load(nquadsData, { format: 'nq' });

        // Replace internal store
        const newQuads = Array.from(newStore.match());
        oxStore.clear?.();

        for (const quad of newQuads) {
          oxStore.add(quad);
        }

        _metadata.lastModified = new Date().toISOString();
        return newQuads.length;
      } catch (error) {
        throw new Error(`[useOxigraphStore] Import failed: ${error.message}`);
      }
    },

    /**
     * Clear all quads from the store
     *
     * @returns {number} Number of quads cleared
     */
    clear() {
      const quads = this.getQuads();
      const count = quads.length;

      for (const quad of quads) {
        oxStore.delete(quad);
      }

      _metadata.lastModified = new Date().toISOString();
      return count;
    },

    /**
     * Get data factory for creating RDF terms
     * Use for constructing quads programmatically
     *
     * @returns {Object} Data factory with namedNode, literal, etc.
     */
    getDataFactory() {
      return {
        namedNode: oxigraph.namedNode,
        blankNode: oxigraph.blankNode,
        literal: oxigraph.literal,
        defaultGraph: oxigraph.defaultGraph,
        quad: oxigraph.quad,
        triple: oxigraph.triple,
      };
    },
  };
}

export default useOxigraphStore;
