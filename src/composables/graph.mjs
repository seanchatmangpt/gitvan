// src/composables/graph.mjs
// Provides a high-level, ergonomic API to operate on an in-memory RDF graph using unrdf.

import {
  executeQuery,
  executeSelect,
  executeAsk,
  executeConstruct,
  isIsomorphic,
  canonicalize,
  toNTriples,
  getQuads,
  addQuad,
  removeQuad,
} from "unrdf";

/**
 * Creates an operational interface for a given RDF graph store.
 * This is the primary composable for performing SPARQL queries, SHACL validation,
 * set operations, and other graph manipulations.
 *
 * @param {Store} store - An unrdf Store instance, typically loaded via `useTurtle`.
 * @returns {object} An API object for operating on the graph.
 */
export function useGraph(store) {
  if (!store || typeof store.getQuads !== "function") {
    throw new Error("[useGraph] A Store instance must be provided.");
  }

  const self = {
    /**
     * The raw Store instance being operated on.
     * @type {Store}
     */
    get store() {
      return store;
    },

    /**
     * Executes a SPARQL SELECT query.
     * @param {string} sparql - The SPARQL SELECT query string.
     * @returns {Promise<Array<object>>} An array of result bindings.
     */
    async select(sparql) {
      return executeSelect(store, sparql);
    },

    /**
     * Executes a SPARQL ASK query.
     * @param {string} sparql - The SPARQL ASK query string.
     * @returns {Promise<boolean>} The boolean result of the query.
     */
    async ask(sparql) {
      return executeAsk(store, sparql);
    },

    /**
     * Executes a SPARQL CONSTRUCT query.
     * @param {string} sparql - The SPARQL CONSTRUCT query string.
     * @returns {Promise<Store>} A new store with the constructed quads.
     */
    async construct(sparql) {
      return executeConstruct(store, sparql);
    },

    /**
     * Executes a generic SPARQL query.
     * @param {string} sparql - The SPARQL query string.
     * @returns {Promise<object>} Query result object.
     */
    async query(sparql) {
      return executeQuery(store, sparql);
    },

    /**
     * Returns quads matching the given pattern.
     * @param {object} pattern - Pattern with subject, predicate, object, graph properties.
     * @returns {Array} Matching quads.
     */
    findQuads(pattern) {
      return getQuads(store, pattern);
    },

    /**
     * Adds a quad to the graph.
     * @param {object} quad - The quad to add.
     * @returns {void}
     */
    addQuad(quad) {
      addQuad(store, quad);
    },

    /**
     * Removes a quad from the graph.
     * @param {object} quad - The quad to remove.
     * @returns {void}
     */
    removeQuad(quad) {
      removeQuad(store, quad);
    },

    /**
     * Checks if the graph is logically equivalent (isomorphic) to another graph.
     * @param {object} otherGraph - Another `useGraph` instance or a raw Store.
     * @returns {boolean}
     */
    isIsomorphic(otherGraph) {
      const otherStore = otherGraph.store || otherGraph;
      return isIsomorphic(store, otherStore);
    },

    /**
     * Returns a canonical representation of the graph.
     * @returns {string} Canonical N-Triples string
     */
    canonicalize() {
      return canonicalize(store);
    },

    /**
     * Serializes the graph to N-Triples format.
     * @returns {string} N-Triples representation
     */
    toNTriples() {
      return toNTriples(store);
    },
  };

  return self;
}
