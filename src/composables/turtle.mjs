/**
 * @fileoverview GitVan Turtle/RDF Composable
 *
 * RDF store composable using @unrdf/core API.
 * Provides basic store creation and quad operations.
 *
 * @version 5.0.0
 * @license Apache-2.0
 */
import { createStore, addQuad, removeQuad } from "@unrdf/core";

const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";

/**
 * Create an RDF store composable
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Store operations interface
 */
export async function useTurtle(options = {}) {
  const store = await createStore();

  return {
    store,

    /**
     * Get all quads matching a pattern
     */
    findQuads(pattern = {}) {
      return store.getQuads(
        pattern.subject,
        pattern.predicate,
        pattern.object,
        pattern.graph
      );
    },

    /**
     * Add a quad to the store
     */
    addQuad(quad) {
      addQuad(store, quad);
    },

    /**
     * Remove a quad from the store
     */
    removeQuad(quad) {
      removeQuad(store, quad);
    },

    /**
     * Get all subjects with a specific type
     */
    getSubjectsByType(type) {
      return store.getQuads(null, RDF + "type", type)
        .map(q => q.subject);
    },

    /**
     * Check if a subject has a specific type
     */
    hasType(subject, type) {
      return store.getQuads(subject, RDF + "type", type).length > 0;
    },

    /**
     * Get a single object for a subject-predicate pair
     */
    getOne(subject, predicate) {
      const quads = store.getQuads(subject, predicate);
      return quads.length > 0 ? quads[0].object : null;
    },

    /**
     * Get all objects for a subject-predicate pair
     */
    getAll(subject, predicate) {
      return store.getQuads(subject, predicate)
        .map(q => q.object);
    },
  };
}
