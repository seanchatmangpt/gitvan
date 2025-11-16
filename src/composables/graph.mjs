/**
 * src/composables/graph.mjs
 * RDF graph composable using unrdf's RdfEngine
 * Provides high-level API for SPARQL queries, serialization, and graph operations
 * Fail-fast error handling with error codes and error.cause chains
 */

import { Store } from 'n3';
import { RdfEngine } from 'unrdf';

/**
 * Create an RDF graph composable interface
 * Wraps unrdf's RdfEngine with structured error handling
 *
 * @param {import('n3').Store} store - N3.Store instance to work with
 * @returns {Promise<Object>} Graph operations API
 * @throws {Error} If store is invalid
 *
 * @example
 * const store = new Store();
 * const graph = await useGraph(store);
 * const results = await graph.select('SELECT ?s ?p ?o WHERE { ?s ?p ?o }');
 */
export async function useGraph(store) {
  // Fail-fast: validate input
  if (!store) {
    const error = new Error('[useGraph] Store is required');
    error.code = 'INVALID_STORE';
    throw error;
  }

  if (typeof store.getQuads !== 'function') {
    const error = new Error(
      '[useGraph] Invalid store: must have getQuads method. Did you pass an N3.Store?'
    );
    error.code = 'INVALID_STORE_TYPE';
    throw error;
  }

  // Initialize RdfEngine with the provided store
  let engine = null;
  const initEngine = async () => {
    if (!engine) {
      try {
        engine = new RdfEngine();
        // Load quads from input store into engine's store
        const quads = Array.from(store);
        if (quads.length > 0) {
          engine.store.addQuads(quads);
        }
      } catch (err) {
        const error = new Error(`[useGraph] Failed to initialize RdfEngine: ${err.message}`);
        error.code = 'INIT_FAILED';
        error.cause = err;
        throw error;
      }
    }
    return engine;
  };

  // Return the graph operations API
  return {
    store,

    /**
     * Execute SPARQL query (SELECT, ASK, or CONSTRUCT)
     * @param {string} sparql - SPARQL query string
     * @param {Object} [opts] - Query options
     * @returns {Promise<{type, rows?, boolean?, store?, variables?}>} Query result
     * @throws {Error} If query is invalid or execution fails
     */
    async query(sparql, opts = {}) {
      if (!sparql || typeof sparql !== 'string') {
        const error = new Error('[useGraph.query] sparql must be non-empty string');
        error.code = 'INVALID_QUERY';
        throw error;
      }

      try {
        const eng = await initEngine();
        return await eng.query(sparql);
      } catch (err) {
        if (err.code === 'INVALID_QUERY') throw err;
        const error = new Error(`[useGraph.query] SPARQL execution failed: ${err.message}`);
        error.code = 'QUERY_FAILED';
        error.cause = err;
        error.query = sparql;
        throw error;
      }
    },

    /**
     * Execute SELECT query
     * @param {string} sparql - SELECT query string
     * @returns {Promise<Array>} Result rows
     * @throws {Error} If not a SELECT query or execution fails
     */
    async select(sparql) {
      try {
        const result = await this.query(sparql);
        if (result.type !== 'select') {
          const error = new Error(
            `[useGraph.select] Query must be SELECT. Got: ${result.type}`
          );
          error.code = 'WRONG_QUERY_TYPE';
          error.queryType = result.type;
          throw error;
        }
        return result.rows || [];
      } catch (err) {
        if (err.code === 'WRONG_QUERY_TYPE') throw err;
        const error = new Error(`[useGraph.select] SELECT failed: ${err.message}`);
        error.code = 'SELECT_FAILED';
        error.cause = err;
        throw error;
      }
    },

    /**
     * Execute ASK query
     * @param {string} sparql - ASK query string
     * @returns {Promise<boolean>} Boolean result
     * @throws {Error} If not an ASK query or execution fails
     */
    async ask(sparql) {
      try {
        const result = await this.query(sparql);
        if (result.type !== 'ask') {
          const error = new Error(
            `[useGraph.ask] Query must be ASK. Got: ${result.type}`
          );
          error.code = 'WRONG_QUERY_TYPE';
          error.queryType = result.type;
          throw error;
        }
        return result.boolean || false;
      } catch (err) {
        if (err.code === 'WRONG_QUERY_TYPE') throw err;
        const error = new Error(`[useGraph.ask] ASK failed: ${err.message}`);
        error.code = 'ASK_FAILED';
        error.cause = err;
        throw error;
      }
    },

    /**
     * Validate SHACL shapes
     * @param {string} shapesInput - Turtle shapes or path
     * @returns {Promise<{conforms: boolean, results: Array}>} Validation report
     * @throws {Error} If validation fails
     */
    async validate(shapesInput) {
      if (!shapesInput) {
        const error = new Error('[useGraph.validate] Shapes input is required');
        error.code = 'INVALID_SHAPES';
        throw error;
      }

      try {
        const eng = await initEngine();
        // Parse shapes if string provided
        let shapesStore = shapesInput;
        if (typeof shapesInput === 'string') {
          shapesStore = eng.parseTurtle(shapesInput);
        }

        // Run SHACL validation
        const validation = await eng.validate(shapesStore);
        return {
          conforms: validation.conforms || false,
          results: validation.results || []
        };
      } catch (err) {
        const error = new Error(`[useGraph.validate] SHACL validation failed: ${err.message}`);
        error.code = 'VALIDATION_FAILED';
        error.cause = err;
        throw error;
      }
    },

    /**
     * Serialize graph to Turtle or N-Quads
     * @param {Object} [opts] - Serialization options
     * @param {string} [opts.format='Turtle'] - Format: 'Turtle' or 'N-Quads'
     * @param {Object} [opts.prefixes] - Optional prefix declarations
     * @returns {Promise<string>} Serialized graph
     * @throws {Error} If serialization fails
     */
    async serialize(opts = {}) {
      const format = opts.format || 'Turtle';

      try {
        const eng = await initEngine();
        if (format === 'Turtle') {
          return eng.serializeTurtle(eng.store, opts);
        } else if (format === 'N-Quads') {
          return eng.serializeNQuads(eng.store);
        } else {
          const error = new Error(`[useGraph.serialize] Unsupported format: ${format}`);
          error.code = 'UNSUPPORTED_FORMAT';
          error.format = format;
          throw error;
        }
      } catch (err) {
        if (err.code === 'UNSUPPORTED_FORMAT') throw err;
        const error = new Error(`[useGraph.serialize] Serialization failed: ${err.message}`);
        error.code = 'SERIALIZE_FAILED';
        error.cause = err;
        error.format = format;
        throw error;
      }
    },

    /**
     * Get Clownface pointer for graph traversal
     * @returns {Promise<Object>} Clownface instance
     * @throws {Error} If pointer creation fails
     */
    async pointer() {
      try {
        const eng = await initEngine();
        // Create clownface instance from store
        const { clownface } = await import('clownface');
        return clownface({ dataset: eng.store });
      } catch (err) {
        const error = new Error(`[useGraph.pointer] Failed to create pointer: ${err.message}`);
        error.code = 'POINTER_FAILED';
        error.cause = err;
        throw error;
      }
    },

    /**
     * Get graph statistics
     * @returns {Object} Statistics object
     */
    get stats() {
      try {
        const quads = Array.from(store);
        const subjects = new Set();
        const predicates = new Set();
        const objects = new Set();
        const graphs = new Set();

        for (const quad of quads) {
          subjects.add(quad.subject.value);
          predicates.add(quad.predicate.value);
          objects.add(quad.object.value);
          graphs.add(quad.graph.value || 'default');
        }

        return {
          quads: quads.length,
          subjects: subjects.size,
          predicates: predicates.size,
          objects: objects.size,
          graphs: graphs.size
        };
      } catch (err) {
        const error = new Error(`[useGraph.stats] Failed to compute statistics: ${err.message}`);
        error.code = 'STATS_FAILED';
        error.cause = err;
        throw error;
      }
    },

    /**
     * Check if two graphs are isomorphic
     * @param {Object} otherGraph - Other graph instance or Store
     * @returns {Promise<boolean>} True if isomorphic
     * @throws {Error} If comparison fails
     */
    async isIsomorphic(otherGraph) {
      if (!otherGraph) {
        const error = new Error('[useGraph.isIsomorphic] Other graph is required');
        error.code = 'MISSING_GRAPH';
        throw error;
      }

      try {
        const otherStore = otherGraph.store || otherGraph;
        // Simple isomorphism check: same number of quads
        const q1 = Array.from(store);
        const q2 = Array.from(otherStore);
        return q1.length === q2.length;
      } catch (err) {
        const error = new Error(`[useGraph.isIsomorphic] Comparison failed: ${err.message}`);
        error.code = 'ISOMORPHIC_FAILED';
        error.cause = err;
        throw error;
      }
    },

    /**
     * Union with other graphs
     * @param {...Object} otherGraphs - Other graph instances or Stores
     * @returns {Promise<Object>} New useGraph instance with union result
     * @throws {Error} If union operation fails
     */
    async union(...otherGraphs) {
      try {
        if (otherGraphs.length === 0) {
          return await useGraph(store);
        }

        const resultStore = new Store([...store]);
        for (const g of otherGraphs) {
          const otherStore = g.store || g;
          for (const q of otherStore) {
            resultStore.add(q);
          }
        }

        return await useGraph(resultStore);
      } catch (err) {
        const error = new Error(`[useGraph.union] Union operation failed: ${err.message}`);
        error.code = 'UNION_FAILED';
        error.cause = err;
        throw error;
      }
    },

    /**
     * Difference with another graph
     * @param {Object} otherGraph - Other graph instance or Store
     * @returns {Promise<Object>} New useGraph instance with difference
     * @throws {Error} If difference operation fails
     */
    async difference(otherGraph) {
      if (!otherGraph) {
        const error = new Error('[useGraph.difference] Other graph is required');
        error.code = 'MISSING_GRAPH';
        throw error;
      }

      try {
        const otherStore = otherGraph.store || otherGraph;
        const resultStore = new Store();

        for (const q of store) {
          let found = false;
          for (const oq of otherStore) {
            if (q.equals(oq)) {
              found = true;
              break;
            }
          }
          if (!found) {
            resultStore.add(q);
          }
        }

        return await useGraph(resultStore);
      } catch (err) {
        const error = new Error(`[useGraph.difference] Difference operation failed: ${err.message}`);
        error.code = 'DIFFERENCE_FAILED';
        error.cause = err;
        throw error;
      }
    },

    /**
     * Intersection with another graph
     * @param {Object} otherGraph - Other graph instance or Store
     * @returns {Promise<Object>} New useGraph instance with intersection
     * @throws {Error} If intersection operation fails
     */
    async intersection(otherGraph) {
      if (!otherGraph) {
        const error = new Error('[useGraph.intersection] Other graph is required');
        error.code = 'MISSING_GRAPH';
        throw error;
      }

      try {
        const otherStore = otherGraph.store || otherGraph;
        const resultStore = new Store();

        for (const q of store) {
          for (const oq of otherStore) {
            if (q.equals(oq)) {
              resultStore.add(q);
              break;
            }
          }
        }

        return await useGraph(resultStore);
      } catch (err) {
        const error = new Error(`[useGraph.intersection] Intersection operation failed: ${err.message}`);
        error.code = 'INTERSECTION_FAILED';
        error.cause = err;
        throw error;
      }
    }
  };
}

/**
 * Export re-usable utilities from unrdf
 */
export { RdfEngine } from 'unrdf';
