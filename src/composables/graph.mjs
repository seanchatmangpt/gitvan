// src/composables/graph.mjs
// Provides a high-level, ergonomic API to operate on an in-memory RDF graph using unrdf.

import {
  query,
  validateShacl,
  isIsomorphic,
  canonicalize,
  reason,
  toJsonLd,
  parseTurtle,
  toTurtle,
  toNQuads,
  getStoreStats,
  mergeStores,
  differenceStores,
  intersectStores,
} from "../lib/unrdf-loader.mjs";

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
     * Executes any valid SPARQL 1.1 query (SELECT, ASK, CONSTRUCT, DESCRIBE, UPDATE).
     * @param {string} sparql - The SPARQL query string.
     * @param {object} [options] - Options for the query engine.
     * @returns {Promise<object>} A result object with a `type` and other properties.
     */
    async query(sparql, options = {}) {
      return query(store, sparql, options);
    },

    /**
     * A convenience method for SPARQL SELECT queries.
     * @param {string} sparql - The SPARQL SELECT query string.
     * @returns {Promise<Array<object>>} An array of result bindings.
     */
    async select(sparql) {
      const res = await query(store, sparql);
      if (res.type !== "select")
        throw new Error("Query is not a SELECT query.");
      return res.results || res.rows || [];
    },

    /**
     * A convenience method for SPARQL ASK queries.
     * @param {string} sparql - The SPARQL ASK query string.
     * @returns {Promise<boolean>} The boolean result of the query.
     */
    async ask(sparql) {
      const res = await query(store, sparql);
      if (res.type !== "ask") throw new Error("Query is not an ASK query.");
      return res.boolean;
    },

    /**
     * Validates the graph against a set of SHACL shapes.
     * @param {string|Store} shapesInput - The SHACL shapes as a Turtle string or a Store.
     * @returns {Promise<object>} A validation report with `conforms` and `results`.
     */
    async validate(shapesInput) {
      const shapesStore =
        typeof shapesInput === "string"
          ? parseTurtle(shapesInput)
          : shapesInput;
      return validateShacl(store, shapesStore);
    },

    /**
     * Serializes the graph to a string in the specified format.
     * @param {{format: 'Turtle'|'N-Quads', prefixes?: object}} options
     * @returns {Promise<string>}
     */
    async serialize({ format = "Turtle", prefixes = {} } = {}) {
      if (format === "Turtle") {
        return toTurtle(store, { prefixes });
      }
      if (format === "N-Quads") {
        return toNQuads(store);
      }
      throw new Error(`Unsupported serialization format: ${format}`);
    },

    /**
     * Basic statistics about the graph (quads, subjects, etc.).
     * @type {{quads: number, subjects: number, predicates: number, objects: number, graphs: number}}
     */
    get stats() {
      return getStoreStats(store);
    },

    /**
     * Checks if the graph is logically equivalent (isomorphic) to another graph.
     * @param {object} otherGraph - Another `useGraph` instance or a raw Store.
     * @returns {Promise<boolean>}
     */
    async isIsomorphic(otherGraph) {
      const otherStore = otherGraph.store || otherGraph;
      return isIsomorphic(store, otherStore);
    },

    /**
     * Returns a new graph instance containing the union of this graph and others.
     * @param {...object} otherGraphs - Other `useGraph` instances or raw Stores.
     * @returns {Promise<object>} A new `useGraph` instance with the resulting graph.
     */
    async union(...otherGraphs) {
      const otherStores = otherGraphs.map((g) => g.store || g);
      const resultStore = mergeStores(store, ...otherStores);
      return useGraph(resultStore);
    },

    /**
     * Returns a new graph instance containing quads that are in this graph but not in the other.
     * @param {object} otherGraph - Another `useGraph` instance or a raw Store.
     * @returns {Promise<object>} A new `useGraph` instance with the resulting graph.
     */
    async difference(otherGraph) {
      const otherStore = otherGraph.store || otherGraph;
      const resultStore = differenceStores(store, otherStore);
      return useGraph(resultStore);
    },

    /**
     * Returns a new graph instance containing only the quads that exist in both graphs.
     * @param {object} otherGraph - Another `useGraph` instance or a raw Store.
     * @returns {Promise<object>} A new `useGraph` instance with the resulting graph.
     */
    async intersection(otherGraph) {
      const otherStore = otherGraph.store || otherGraph;
      const resultStore = intersectStores(store, otherStore);
      return useGraph(resultStore);
    },

    /**
     * Converts the graph to JSON-LD format.
     * @returns {Promise<object>} JSON-LD document
     */
    async toJsonLd() {
      return toJsonLd(store);
    },

    /**
     * Applies N3 reasoning rules to the graph.
     * @param {Store} rulesStore - Store containing N3 rules
     * @returns {Promise<object>} A new useGraph instance with inferred triples
     */
    async reason(rulesStore) {
      const inferredStore = await reason(store, rulesStore);
      return useGraph(inferredStore);
    },

    /**
     * Returns a canonical representation of the graph.
     * @returns {Promise<string>} Canonical N-Quads string
     */
    async canonicalize() {
      return canonicalize(store);
    },
  };

  return self;
}
