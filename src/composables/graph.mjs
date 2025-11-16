/**
 * src/composables/graph.mjs
 * Pure unrdf composable - direct RDF graph operations
 * Fail-fast error handling: errors bubble up immediately
 */

import {
  createDarkMatterCore,
  parseTurtle as unrdfParseTurtle,
  toTurtle,
  toNQuads,
  defineHook,
  namedNode,
  literal,
  quad,
  blankNode,
  defaultGraph,
  variable,
  Store
} from 'unrdf';

/**
 * Create an operational interface for RDF graph operations
 * Uses unrdf's Dark Matter 80/20 optimizations (caching, batching)
 *
 * @param {import('n3').Store} store - N3.Store instance
 * @returns {Promise<object>} API object for graph operations
 * @throws {Error} If store is invalid or operations fail
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

  // Initialize unrdf Dark Matter Core (lazy, shared)
  let system = null;
  const initSystem = async () => {
    if (!system) {
      try {
        system = await createDarkMatterCore();
      } catch (err) {
        const error = new Error(`[useGraph] Failed to initialize unrdf: ${err.message}`);
        error.code = 'INIT_FAILED';
        error.cause = err;
        throw error;
      }
    }
    return system;
  };

  // Helper: ensure store data is loaded into system
  const ensureLoaded = async () => {
    const sys = await initSystem();
    try {
      const quads = [...store];
      if (quads.length > 0) {
        sys.store.addQuads(quads);
      }
    } catch (err) {
      const error = new Error(`[useGraph] Failed to load quads into unrdf: ${err.message}`);
      error.code = 'LOAD_FAILED';
      error.cause = err;
      throw error;
    }
  };

  return {
    /**
     * The raw N3.Store instance
     */
    get store() {
      return store;
    },

    /**
     * Execute SPARQL query (SELECT, ASK, CONSTRUCT, DESCRIBE)
     * Uses unrdf query caching for performance
     * @param {string} sparql - SPARQL query string
     * @param {object} [opts] - Query options
     * @returns {Promise<object>} Query result
     * @throws {Error} If query is invalid or execution fails
     */
    async query(sparql, opts = {}) {
      if (!sparql || typeof sparql !== 'string') {
        const error = new Error('[useGraph.query] sparql must be non-empty string');
        error.code = 'INVALID_QUERY';
        throw error;
      }

      try {
        await ensureLoaded();
        const sys = await initSystem();
        return await sys.query({
          query: sparql,
          limit: opts.limit,
          type: opts.type // auto-detected if not provided
        });
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
     * Execute SELECT query (convenience)
     * @param {string} sparql - SELECT query
     * @returns {Promise<Array>} Result rows
     * @throws {Error} If not a SELECT query or execution fails
     */
    async select(sparql) {
      try {
        const result = await this.query(sparql);
        if (result.type !== 'select') {
          const error = new Error(
            '[useGraph.select] Query must be SELECT. Got: ' + result.type
          );
          error.code = 'WRONG_QUERY_TYPE';
          error.queryType = result.type;
          throw error;
        }
        return result.results || [];
      } catch (err) {
        if (err.code === 'WRONG_QUERY_TYPE') throw err;
        const error = new Error(`[useGraph.select] SELECT failed: ${err.message}`);
        error.code = 'SELECT_FAILED';
        error.cause = err;
        throw error;
      }
    },

    /**
     * Execute ASK query (convenience)
     * @param {string} sparql - ASK query
     * @returns {Promise<boolean>} Boolean result
     * @throws {Error} If not an ASK query or execution fails
     */
    async ask(sparql) {
      try {
        const result = await this.query(sparql);
        if (result.type !== 'ask') {
          const error = new Error(
            '[useGraph.ask] Query must be ASK. Got: ' + result.type
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
     * Validate graph against SHACL shapes
     * @param {string|Store} shapesInput - SHACL shapes (Turtle or Store)
     * @returns {Promise<object>} Validation report
     * @throws {Error} If validation setup or execution fails
     */
    async validate(shapesInput) {
      if (!shapesInput) {
        const error = new Error('[useGraph.validate] SHACL shapes are required');
        error.code = 'MISSING_SHAPES';
        throw error;
      }

      try {
        await ensureLoaded();
        const sys = await initSystem();

        // Parse shapes if provided as Turtle string
        let shapesStore = shapesInput;
        if (typeof shapesInput === 'string') {
          try {
            shapesStore = await unrdfParseTurtle(shapesInput);
          } catch (err) {
            const error = new Error(
              `[useGraph.validate] Failed to parse SHACL shapes: ${err.message}`
            );
            error.code = 'INVALID_SHAPES';
            error.cause = err;
            throw error;
          }
        }

        return await sys.validate({
          dataGraph: store,
          shapesGraph: shapesStore
        });
      } catch (err) {
        if (err.code && err.code.startsWith('INVALID_') || err.code === 'MISSING_SHAPES') {
          throw err;
        }
        const error = new Error(`[useGraph.validate] SHACL validation failed: ${err.message}`);
        error.code = 'VALIDATION_FAILED';
        error.cause = err;
        throw error;
      }
    },

    /**
     * Serialize graph to string
     * @param {{format: 'Turtle'|'N-Quads', prefixes?: object}} opts - Serialization options
     * @returns {Promise<string>} Serialized RDF
     * @throws {Error} If serialization fails
     */
    async serialize(opts = {}) {
      const format = opts.format || 'Turtle';

      if (!['Turtle', 'N-Quads'].includes(format)) {
        const error = new Error(
          `[useGraph.serialize] Unsupported format: ${format}. Use 'Turtle' or 'N-Quads'`
        );
        error.code = 'INVALID_FORMAT';
        error.format = format;
        throw error;
      }

      try {
        if (format === 'Turtle') {
          return await toTurtle(store, { prefixes: opts.prefixes });
        } else {
          return await toNQuads(store);
        }
      } catch (err) {
        const error = new Error(
          `[useGraph.serialize] Serialization to ${format} failed: ${err.message}`
        );
        error.code = 'SERIALIZE_FAILED';
        error.cause = err;
        error.format = format;
        throw error;
      }
    },

    /**
     * Get Clownface pointer for graph traversal
     * @returns {object} Clownface instance
     * @throws {Error} If pointer creation fails
     */
    pointer() {
      try {
        // Use unrdf's clownface support
        const sys = await initSystem();
        return sys.getClownface?.(store) || store;
      } catch (err) {
        const error = new Error(`[useGraph.pointer] Failed to create pointer: ${err.message}`);
        error.code = 'POINTER_FAILED';
        error.cause = err;
        throw error;
      }
    },

    /**
     * Get graph statistics
     * @returns {{quads: number, subjects: number, predicates: number, objects: number, graphs: number}}
     */
    get stats() {
      try {
        const quads = [...store];
        const subjects = new Set();
        const predicates = new Set();
        const objects = new Set();
        const graphs = new Set();

        for (const q of quads) {
          subjects.add(q.subject.value);
          predicates.add(q.predicate.value);
          objects.add(q.object.value);
          graphs.add(q.graph.value);
        }

        return {
          quads: quads.length,
          subjects: subjects.size,
          predicates: predicates.size,
          objects: objects.size,
          graphs: graphs.size
        };
      } catch (err) {
        const error = new Error(`[useGraph.stats] Failed to compute stats: ${err.message}`);
        error.code = 'STATS_FAILED';
        error.cause = err;
        throw error;
      }
    },

    /**
     * Check if isomorphic to another graph
     * @param {object} otherGraph - Another graph instance or Store
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
        await ensureLoaded();
        const sys = await initSystem();

        // Compare canonical forms
        const canon1 = await sys.canonicalize?.(store);
        const canon2 = await sys.canonicalize?.(otherStore);
        return canon1 === canon2;
      } catch (err) {
        const error = new Error(`[useGraph.isIsomorphic] Comparison failed: ${err.message}`);
        error.code = 'COMPARISON_FAILED';
        error.cause = err;
        throw error;
      }
    },

    /**
     * Union with other graphs
     * @param {...object} otherGraphs - Other graph instances or Stores
     * @returns {object} New useGraph instance with union result
     * @throws {Error} If union operation fails
     */
    union(...otherGraphs) {
      try {
        if (otherGraphs.length === 0) {
          return useGraph(store);
        }

        const resultStore = new Store([...store]);
        for (const g of otherGraphs) {
          const otherStore = g.store || g;
          for (const q of otherStore) {
            resultStore.add(q);
          }
        }

        return useGraph(resultStore);
      } catch (err) {
        const error = new Error(`[useGraph.union] Union operation failed: ${err.message}`);
        error.code = 'UNION_FAILED';
        error.cause = err;
        throw error;
      }
    },

    /**
     * Difference with another graph
     * @param {object} otherGraph - Other graph instance or Store
     * @returns {object} New useGraph instance with difference
     * @throws {Error} If difference operation fails
     */
    difference(otherGraph) {
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

        return useGraph(resultStore);
      } catch (err) {
        const error = new Error(`[useGraph.difference] Difference operation failed: ${err.message}`);
        error.code = 'DIFFERENCE_FAILED';
        error.cause = err;
        throw error;
      }
    },

    /**
     * Intersection with another graph
     * @param {object} otherGraph - Other graph instance or Store
     * @returns {object} New useGraph instance with intersection
     * @throws {Error} If intersection operation fails
     */
    intersection(otherGraph) {
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

        return useGraph(resultStore);
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
 * RDF term constructors (re-exported from unrdf for convenience)
 */
export {
  namedNode,
  literal,
  quad,
  blankNode,
  defaultGraph,
  variable,
  Store,
  defineHook,
  parseTurtle as unrdfParseTurtle,
  toTurtle,
  toNQuads
};
