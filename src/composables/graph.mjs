// src/composables/graph.mjs
// Provides a high-level, ergonomic API to operate on an in-memory RDF graph (N3 Store).

import { RdfEngine } from "../engines/RdfEngine.mjs";

// Create a single, shared instance of the engine for efficiency.
// The engine itself is stateless; its methods operate on the store you provide.
const rdfEngine = new RdfEngine();

/**
 * Creates an operational interface for a given RDF graph store.
 * This is the primary composable for performing SPARQL queries, SHACL validation,
 * set operations, and other graph manipulations.
 *
 * @param {import('n3').Store} store - An N3.Store instance, typically loaded via `useTurtle`.
 * @returns {object} An API object for operating on the graph.
 */
export function useGraph(store) {
  if (!store || typeof store.getQuads !== "function") {
    throw new Error("[useGraph] An N3.Store instance must be provided.");
  }

  const self = {
    /**
     * The raw N3.Store instance being operated on.
     * @type {import('n3').Store}
     */
    get store() {
      return store;
    },

    /**
     * Provides direct access to the underlying RdfEngine singleton.
     * Useful for advanced or low-level operations not exposed on this composable.
     * @type {RdfEngine}
     */
    get engine() {
      return rdfEngine;
    },

    /**
     * Executes any valid SPARQL 1.1 query (SELECT, ASK, CONSTRUCT, DESCRIBE, UPDATE).
     * @param {string} sparql - The SPARQL query string.
     * @param {object} [options] - Options for the query engine.
     * @returns {Promise<object>} A result object with a `type` and other properties.
     */
    query(sparql, options) {
      return rdfEngine.query(store, sparql, options);
    },

    /**
     * A convenience method for SPARQL SELECT queries.
     * @param {string} sparql - The SPARQL SELECT query string.
     * @returns {Promise<Array<object>>} An array of result bindings.
     */
    async select(sparql) {
      const res = await rdfEngine.query(store, sparql);
      if (res.type !== "select")
        throw new Error("Query is not a SELECT query.");
      return res.results;
    },

    /**
     * A convenience method for SPARQL ASK queries.
     * @param {string} sparql - The SPARQL ASK query string.
     * @returns {Promise<boolean>} The boolean result of the query.
     */
    async ask(sparql) {
      const res = await rdfEngine.query(store, sparql);
      if (res.type !== "ask") throw new Error("Query is not an ASK query.");
      return res.boolean;
    },

    /**
     * Validates the graph against a set of SHACL shapes.
     * @param {string|import('n3').Store} shapesInput - The SHACL shapes as a Turtle string or an N3.Store.
     * @returns {Promise<object>} A validation report with `conforms` and `results`.
     */
    validate(shapesInput) {
      return rdfEngine.validateShacl(store, shapesInput);
    },

    /**
     * Serializes the graph to a string in the specified format.
     * @param {{format: 'Turtle'|'N-Quads', prefixes?: object}} options
     * @returns {Promise<string>}
     */
    async serialize({ format = "Turtle", prefixes = {} }) {
      if (format === "Turtle") {
        return await rdfEngine.serializeTurtle(store, { prefixes });
      }
      if (format === "N-Quads") {
        return await rdfEngine.serializeNQuads(store);
      }
      throw new Error(`Unsupported serialization format: ${format}`);
    },

    /**
     * Returns a Clownface instance for fluent, chainable graph traversal and manipulation.
     * @returns {import('@zazuko/env').Clownface}
     */
    pointer() {
      return rdfEngine.getClownface(store);
    },

    /**
     * Basic statistics about the graph (quads, subjects, etc.).
     * @type {{quads: number, subjects: number, predicates: number, objects: number, graphs: number}}
     */
    get stats() {
      return rdfEngine.getStats(store);
    },

    /**
     * Checks if the graph is logically equivalent (isomorphic) to another graph.
     * @param {object} otherGraph - Another `useGraph` instance or a raw N3.Store.
     * @returns {Promise<boolean>}
     */
    isIsomorphic(otherGraph) {
      const otherStore = otherGraph.store || otherGraph;
      return rdfEngine.isIsomorphic(store, otherStore);
    },

    /**
     * Returns a new graph instance containing the union of this graph and others.
     * @param {...object} otherGraphs - Other `useGraph` instances or raw N3.Stores.
     * @returns {object} A new `useGraph` instance with the resulting graph.
     */
    union(...otherGraphs) {
      const otherStores = otherGraphs.map((g) => g.store || g);
      const resultStore = rdfEngine.union(store, ...otherStores);
      return useGraph(resultStore);
    },

    /**
     * Returns a new graph instance containing quads that are in this graph but not in the other.
     * @param {object} otherGraph - Another `useGraph` instance or a raw N3.Store.
     * @returns {object} A new `useGraph` instance with the resulting graph.
     */
    difference(otherGraph) {
      const otherStore = otherGraph.store || otherGraph;
      const resultStore = rdfEngine.difference(store, otherStore);
      return useGraph(resultStore);
    },

    /**
     * Returns a new graph instance containing only the quads that exist in both graphs.
     * @param {object} otherGraph - Another `useGraph` instance or a raw N3.Store.
     * @returns {object} A new `useGraph` instance with the resulting graph.
     */
    intersection(otherGraph) {
      const otherStore = otherGraph.store || otherGraph;
      const resultStore = rdfEngine.intersection(store, otherStore);
      return useGraph(resultStore);
    },
  };

  return self;
}
