// src/composables/graph.mjs
// Provides a high-level, ergonomic API to operate on an in-memory RDF graph using unrdf.
// Adapted for unrdf 4.2.3+ composable API

import { useGraph as unrdfUseGraph } from "unrdf";
import { useTurtle } from "unrdf";

/**
 * Creates an operational interface for a given RDF graph store.
 * This is the primary composable for performing SPARQL queries, SHACL validation,
 * set operations, and other graph manipulations.
 *
 * @param {string|Store} input - A Turtle string or a Store instance
 * @returns {object} An API object for operating on the graph.
 */
export async function useGraph(input) {
  let store;

  // Handle both Turtle strings and raw Store instances
  if (typeof input === "string") {
    const turtleGraph = await useTurtle(input);
    store = turtleGraph.store;
  } else {
    store = input;
  }

  if (!store) {
    throw new Error("[useGraph] Unable to create or access store from input.");
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
      const graph = unrdfUseGraph(store);
      return graph.query(sparql, options);
    },

    /**
     * A convenience method for SPARQL SELECT queries.
     * @param {string} sparql - The SPARQL SELECT query string.
     * @returns {Promise<Array<object>>} An array of result bindings.
     */
    async select(sparql) {
      const graph = unrdfUseGraph(store);
      return graph.select(sparql);
    },

    /**
     * A convenience method for SPARQL ASK queries.
     * @param {string} sparql - The SPARQL ASK query string.
     * @returns {Promise<boolean>} The boolean result of the query.
     */
    async ask(sparql) {
      const graph = unrdfUseGraph(store);
      return graph.ask(sparql);
    },

    /**
     * Validates the graph against a set of SHACL shapes.
     * @param {string|Store} shapesInput - The SHACL shapes as a Turtle string or a Store.
     * @returns {Promise<object>} A validation report with `conforms` and `results`.
     */
    async validate(shapesInput) {
      const graph = unrdfUseGraph(store);
      return graph.validate(shapesInput);
    },

    /**
     * Serializes the graph to a string in the specified format.
     * @param {{format: 'Turtle'|'N-Quads', prefixes?: object}} options
     * @returns {Promise<string>}
     */
    async serialize({ format = "Turtle", prefixes = {} } = {}) {
      const graph = unrdfUseGraph(store);
      return graph.serialize({ format, prefixes });
    },

    /**
     * Basic statistics about the graph (quads, subjects, etc.).
     * @type {{quads: number, subjects: number, predicates: number, objects: number, graphs: number}}
     */
    get stats() {
      const graph = unrdfUseGraph(store);
      return graph.stats;
    },

    /**
     * Checks if the graph is logically equivalent (isomorphic) to another graph.
     * @param {object} otherGraph - Another `useGraph` instance or a raw Store.
     * @returns {Promise<boolean>}
     */
    async isIsomorphic(otherGraph) {
      const graph = unrdfUseGraph(store);
      const otherStore = otherGraph?.store || otherGraph;
      return graph.isIsomorphic(otherStore);
    },

    /**
     * Returns a new graph instance containing the union of this graph and others.
     * @param {...object} otherGraphs - Other `useGraph` instances or raw Stores.
     * @returns {Promise<object>} A new `useGraph` instance with the resulting graph.
     */
    async union(...otherGraphs) {
      const graph = unrdfUseGraph(store);
      const otherStores = otherGraphs.map((g) => g.store || g);
      const resultGraph = await graph.union(...otherStores);
      return useGraph(resultGraph.store);
    },

    /**
     * Returns a new graph instance containing quads that are in this graph but not in the other.
     * @param {object} otherGraph - Another `useGraph` instance or a raw Store.
     * @returns {Promise<object>} A new `useGraph` instance with the resulting graph.
     */
    async difference(otherGraph) {
      const graph = unrdfUseGraph(store);
      const otherStore = otherGraph.store || otherGraph;
      const resultGraph = await graph.difference(otherStore);
      return useGraph(resultGraph.store);
    },

    /**
     * Returns a new graph instance containing only the quads that exist in both graphs.
     * @param {object} otherGraph - Another `useGraph` instance or a raw Store.
     * @returns {Promise<object>} A new `useGraph` instance with the resulting graph.
     */
    async intersection(otherGraph) {
      const graph = unrdfUseGraph(store);
      const otherStore = otherGraph.store || otherGraph;
      const resultGraph = await graph.intersection(otherStore);
      return useGraph(resultGraph.store);
    },

    /**
     * Converts the graph to JSON-LD format.
     * @returns {Promise<object>} JSON-LD document
     */
    async toJsonLd() {
      const graph = unrdfUseGraph(store);
      return graph.toJsonLd();
    },

    /**
     * Applies N3 reasoning rules to the graph.
     * @param {Store|string} rulesInput - Store containing N3 rules or Turtle string
     * @returns {Promise<object>} A new useGraph instance with inferred triples
     */
    async reason(rulesInput) {
      const graph = unrdfUseGraph(store);
      const inferredGraph = await graph.reason(rulesInput);
      return useGraph(inferredGraph.store);
    },

    /**
     * Returns a canonical representation of the graph.
     * @returns {Promise<string>} Canonical N-Quads string
     */
    async canonicalize() {
      const graph = unrdfUseGraph(store);
      return graph.canonicalize();
    },
  };

  return self;
}
