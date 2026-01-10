/**
 * @file useRDFStore.mjs
 * @description Adaptive RDF store selector for GitVan
 * Automatically chooses optimal backend (oxigraph or in-memory)
 * based on workload characteristics
 */

import { useOxigraphStore } from './useOxigraphStore.mjs';

// Thresholds for store selection
const STORE_THRESHOLDS = {
  // Switch to oxigraph when exceeding this quad count
  quadCountThreshold: 10000,
  // Estimate bytes per quad (conservative)
  bytesPerQuad: 200,
};

/**
 * Create an adaptive RDF store that selects optimal backend
 * Uses Oxigraph for large datasets (>10K quads) or frequent queries
 * Falls back to in-memory unrdf Store for small datasets
 *
 * @param {Object} options - Configuration options
 * @param {Array} [options.quads] - Initial quads to populate store
 * @param {string} [options.backend] - Force backend: 'auto' (default), 'oxigraph', or 'memory'
 * @param {number} [options.quadCountThreshold] - Threshold for switching backends
 * @returns {Object} Unified store interface
 *
 * @example
 * // Auto-select based on size
 * const store = useRDFStore();
 *
 * // Force oxigraph backend
 * const store = useRDFStore({ backend: 'oxigraph' });
 */
export function useRDFStore(options = {}) {
  const {
    quads = [],
    backend = 'auto',
    quadCountThreshold = STORE_THRESHOLDS.quadCountThreshold,
  } = options;

  // Determine which backend to use
  const shouldUseOxigraph = () => {
    if (backend === 'oxigraph') return true;
    if (backend === 'memory') return false;

    // Auto-select based on quad count
    return quads.length >= quadCountThreshold;
  };

  let _backend = null;
  let _backendName = null;
  let _selectedBackend = null;

  /**
   * Initialize the store with selected backend
   */
  const initializeBackend = () => {
    if (_backend) return; // Already initialized

    if (shouldUseOxigraph()) {
      _backend = useOxigraphStore({ quads });
      _selectedBackend = 'oxigraph';
    } else {
      // Use basic in-memory store from unrdf
      _backend = createInMemoryStore(quads);
      _selectedBackend = 'memory';
    }
  };

  // Initialize on first access
  initializeBackend();

  return {
    /**
     * Get the selected backend name
     * @returns {string} 'oxigraph' or 'memory'
     */
    get backend() {
      return _selectedBackend;
    },

    /**
     * Get underlying store instance
     * @returns {Object} Raw store object
     */
    get raw() {
      return _backend.raw || _backend;
    },

    /**
     * Add a quad to the store
     * @param {Object|null} quadOrSubject - Quad or subject
     * @param {Object} [predicate] - Predicate
     * @param {Object} [object] - Object
     * @param {Object} [graph] - Graph
     */
    addQuad(quadOrSubject, predicate, object, graph) {
      return _backend.addQuad(quadOrSubject, predicate, object, graph);
    },

    /**
     * Remove a quad from the store
     * @param {Object|null} quadOrSubject - Quad or subject
     * @param {Object} [predicate] - Predicate
     * @param {Object} [object] - Object
     * @param {Object} [graph] - Graph
     */
    removeQuad(quadOrSubject, predicate, object, graph) {
      return _backend.removeQuad(quadOrSubject, predicate, object, graph);
    },

    /**
     * Get quads matching a pattern
     * @param {Object} [subject] - Subject to match
     * @param {Object} [predicate] - Predicate to match
     * @param {Object} [object] - Object to match
     * @param {Object} [graph] - Graph to match
     * @returns {Array<Object>} Matching quads
     */
    getQuads(subject, predicate, object, graph) {
      return _backend.getQuads(subject, predicate, object, graph);
    },

    /**
     * Check if a quad exists
     * @param {Object} quad - Quad to check
     * @returns {boolean}
     */
    hasQuad(quad) {
      if (_backend.hasQuad) {
        return _backend.hasQuad(quad);
      }
      // Fallback for memory store
      return _backend.has?.(quad) ?? false;
    },

    /**
     * Execute a SPARQL query
     * @param {string} sparql - SPARQL query
     * @param {Object} [options] - Query options
     * @returns {Array|boolean|Object} Query results
     */
    query(sparql, options) {
      if (!_backend.query) {
        throw new Error('[useRDFStore] Query not supported by this backend');
      }
      return _backend.query(sparql, options);
    },

    /**
     * Execute a SPARQL UPDATE
     * @param {string} sparql - SPARQL UPDATE
     * @param {Object} [options] - Update options
     */
    update(sparql, options) {
      if (!_backend.update) {
        throw new Error('[useRDFStore] Update not supported by this backend');
      }
      return _backend.update(sparql, options);
    },

    /**
     * Get number of quads in store
     * @returns {number}
     */
    size() {
      if (typeof _backend.size === 'function') {
        return _backend.size();
      }
      return this.getQuads().length;
    },

    /**
     * Bulk add quads
     * @param {Array<Object>} quads - Quads to add
     * @returns {number} Number added
     */
    addQuads(quads) {
      if (_backend.addQuads) {
        return _backend.addQuads(quads);
      }
      // Fallback
      let count = 0;
      for (const quad of quads) {
        this.addQuad(quad);
        count++;
      }
      return count;
    },

    /**
     * Bulk remove quads
     * @param {Array<Object>} quads - Quads to remove
     * @returns {number} Number removed
     */
    removeQuads(quads) {
      if (_backend.removeQuads) {
        return _backend.removeQuads(quads);
      }
      // Fallback
      let count = 0;
      for (const quad of quads) {
        this.removeQuad(quad);
        count++;
      }
      return count;
    },

    /**
     * Export to NQuads format
     * @returns {string} NQuads data
     */
    exportNQuads() {
      if (_backend.exportNQuads) {
        return _backend.exportNQuads();
      }
      throw new Error('[useRDFStore] NQuads export not supported by this backend');
    },

    /**
     * Import from NQuads format
     * @param {string} nquadsData - NQuads data
     * @returns {number} Number imported
     */
    importNQuads(nquadsData) {
      if (_backend.importNQuads) {
        return _backend.importNQuads(nquadsData);
      }
      throw new Error('[useRDFStore] NQuads import not supported by this backend');
    },

    /**
     * Clear all quads
     * @returns {number} Number cleared
     */
    clear() {
      if (_backend.clear) {
        return _backend.clear();
      }
      // Fallback
      const quads = this.getQuads();
      for (const quad of quads) {
        this.removeQuad(quad);
      }
      return quads.length;
    },

    /**
     * Get data factory for creating RDF terms
     * @returns {Object} Data factory
     */
    getDataFactory() {
      if (_backend.getDataFactory) {
        return _backend.getDataFactory();
      }
      throw new Error('[useRDFStore] DataFactory not available for this backend');
    },

    /**
     * Get store metadata (if available)
     * @returns {Object} Metadata object
     */
    get metadata() {
      return {
        backend: _selectedBackend,
        size: this.size(),
        createdAt: new Date().toISOString(),
        ...((_backend.metadata || {})),
      };
    },
  };
}

/**
 * Create a simple in-memory RDF store
 * Used as fallback for small datasets
 * @private
 */
function createInMemoryStore(initialQuads = []) {
  const quads = new Set();

  // Add initial quads
  if (Array.isArray(initialQuads)) {
    for (const quad of initialQuads) {
      quads.add(quad);
    }
  }

  return {
    addQuad(quad) {
      if (!quad) throw new Error('Quad is required');
      quads.add(quad);
    },

    removeQuad(quad) {
      if (!quad) throw new Error('Quad is required');
      quads.delete(quad);
    },

    getQuads(subject, predicate, object, graph) {
      return Array.from(quads).filter(q => {
        if (subject && !termsEqual(q.subject, subject)) return false;
        if (predicate && !termsEqual(q.predicate, predicate)) return false;
        if (object && !termsEqual(q.object, object)) return false;
        if (graph && !termsEqual(q.graph, graph)) return false;
        return true;
      });
    },

    has(quad) {
      if (!quad) return false;
      return quads.has(quad);
    },

    clear() {
      const count = quads.size;
      quads.clear();
      return count;
    },

    size() {
      return quads.size;
    },

    addQuads(quadArray) {
      let count = 0;
      for (const quad of quadArray) {
        quads.add(quad);
        count++;
      }
      return count;
    },

    removeQuads(quadArray) {
      let count = 0;
      for (const quad of quadArray) {
        quads.delete(quad);
        count++;
      }
      return count;
    },

    exportNQuads() {
      // Simple NQuads serialization
      const lines = Array.from(quads)
        .map(q => quadToNQuads(q))
        .filter(l => l.trim());
      return lines.length > 0 ? lines.join('\n') + '\n' : '';
    },

    importNQuads(nquadsData) {
      if (!nquadsData || typeof nquadsData !== 'string') {
        throw new Error('NQuads data must be a non-empty string');
      }
      quads.clear();
      const lines = nquadsData.split('\n').filter(line => line.trim());
      if (lines.length === 0) {
        throw new Error('No valid NQuads lines found');
      }
      let count = 0;
      for (const line of lines) {
        try {
          const quad = parseNQuadsLine(line);
          quads.add(quad);
          count++;
        } catch (error) {
          // Skip invalid lines gracefully
        }
      }
      if (count === 0) {
        throw new Error('Failed to parse any valid quads from NQuads data');
      }
      return count;
    },
  };
}

/**
 * Check if two RDF terms are equal
 * @private
 */
function termsEqual(term1, term2) {
  if (!term1 || !term2) return false;
  if (term1.type !== term2.type) return false;
  if (term1.value !== term2.value) return false;
  return true;
}

/**
 * Convert quad to NQuads string
 * @private
 */
function quadToNQuads(quad) {
  const s = termToNQuads(quad.subject);
  const p = termToNQuads(quad.predicate);
  const o = termToNQuads(quad.object);
  const g = quad.graph?.value ? ` ${termToNQuads(quad.graph)}` : '';
  return `${s} ${p} ${o}${g} .`;
}

/**
 * Convert RDF term to NQuads string
 * @private
 */
function termToNQuads(term) {
  if (!term) return '';
  if (term.type === 'NamedNode') {
    return `<${term.value}>`;
  }
  if (term.type === 'BlankNode') {
    return `_:${term.value}`;
  }
  if (term.type === 'Literal') {
    const value = term.value.replace(/"/g, '\\"');
    if (term.language) {
      return `"${value}"@${term.language}`;
    }
    if (term.datatype?.value) {
      return `"${value}"^^<${term.datatype.value}>`;
    }
    return `"${value}"`;
  }
  if (term.type === 'DefaultGraph') {
    return '';
  }
  return '';
}

/**
 * Parse a single NQuads line
 * @private
 */
function parseNQuadsLine(line) {
  const parts = line.trim().replace(/\s+\.$/, '').split(/\s+/);
  if (parts.length < 3) throw new Error('Invalid NQuads line');

  return {
    subject: parseNQualsTerm(parts[0]),
    predicate: parseNQualsTerm(parts[1]),
    object: parseNQualsTerm(parts[2]),
    graph: parts[3] ? parseNQualsTerm(parts[3]) : { type: 'DefaultGraph' },
  };
}

/**
 * Parse NQuads term
 * @private
 */
function parseNQualsTerm(term) {
  if (term.startsWith('<') && term.endsWith('>')) {
    return { type: 'NamedNode', value: term.slice(1, -1) };
  }
  if (term.startsWith('_:')) {
    return { type: 'BlankNode', value: term.slice(2) };
  }
  if (term.startsWith('"')) {
    // Handle literals (simplified)
    return { type: 'Literal', value: term };
  }
  return { type: 'NamedNode', value: term };
}

export default useRDFStore;
