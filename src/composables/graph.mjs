// src/composables/graph.mjs
// Provides a high-level, ergonomic API to operate on an in-memory RDF graph using @unrdf/core.

import {
  executeQuery,
  canonicalize,
  addQuad,
  removeQuad,
  countQuads,
} from "@unrdf/core";
import { useQueryOptimizer } from "./useQueryOptimizer.mjs";
import { useQueryPlanner } from "./useQueryPlanner.mjs";

/**
 * Creates an operational interface for a given RDF graph store.
 * This is the primary composable for performing SPARQL queries, SHACL validation,
 * set operations, and other graph manipulations.
 *
 * @param {Store} store - An @unrdf Store instance
 * @returns {object} An API object for operating on the graph.
 */
export function useGraph(store) {
  if (!store || typeof store.getQuads !== "function") {
    throw new Error("[useGraph] A Store instance must be provided.");
  }

  // Initialize optimizer and planner for Dark Matter query optimization
  const optimizer = useQueryOptimizer();
  const planner = useQueryPlanner();

  const self = {
    /**
     * The raw Store instance being operated on.
     * @type {Store}
     */
    get store() {
      return store;
    },

    /**
     * Executes a SPARQL query.
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
      if (!pattern) return store.getQuads();
      return store.getQuads(
        pattern.subject,
        pattern.predicate,
        pattern.object,
        pattern.graph
      );
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
     * Returns a canonical representation of the graph.
     * @returns {string} Canonical N-Triples string
     */
    canonicalize() {
      return canonicalize(store);
    },

    /**
     * Count quads matching a pattern.
     * @param {object} pattern - Optional quad pattern
     * @returns {number} Count of matching quads
     */
    countQuads(pattern) {
      if (!pattern) return countQuads(store);
      return countQuads(store, pattern.subject, pattern.predicate, pattern.object, pattern.graph);
    },

    /**
     * Dark Matter Query Optimization API
     * Analyzes a SPARQL query for optimization opportunities
     *
     * @param {string} sparql - The SPARQL query string
     * @returns {Object} Query analysis with patterns and selectivity
     */
    analyzeQuery(sparql) {
      return optimizer.analyzeQuery(sparql);
    },

    /**
     * Generate an optimized execution plan for a SPARQL query
     *
     * @param {string} sparql - The SPARQL query string
     * @param {Object} [schema={}] - Optional schema information
     * @returns {Object} Execution plan with reordered patterns and steps
     */
    planQuery(sparql, schema = {}) {
      return planner.planQuery(sparql, schema);
    },

    /**
     * Get human-readable explanation of a query plan
     *
     * @param {Object} plan - Execution plan from planQuery()
     * @returns {string} Explanation text
     */
    explainPlan(plan) {
      return planner.explainPlan(plan);
    },

    /**
     * Estimate selectivity of a triple pattern
     *
     * @param {Object} pattern - Triple pattern
     * @returns {number} Selectivity estimate (0.0-1.0)
     */
    estimateSelectivity(pattern) {
      return optimizer.estimateSelectivity(pattern);
    },
  };

  return self;
}
