/**
 * @fileoverview UnRDF Loader - Central import wrapper for vendor/unrdf
 *
 * This module provides a centralized import point for all unrdf functionality.
 * It imports from the vendor/unrdf git submodule and re-exports everything.
 *
 * This abstraction layer allows us to:
 * 1. Use unrdf from vendor submodule instead of npm
 * 2. Have a single place to update if the vendor path changes
 * 3. Maintain clean imports throughout the codebase
 *
 * @module src/lib/unrdf-loader
 * @version 3.0.0
 */

// Import all unrdf exports from the vendor submodule monorepo
// The vendor/unrdf directory is a git submodule containing a monorepo with multiple packages
// We import from the core package which provides the main RDF functionality

export {
  // Core Knowledge Substrate
  createKnowledgeSubstrateCore,

  // RDF Parsing and Serialization
  parseTurtle,
  toTurtle,
  toNQuads,
  toJsonLd,

  // RDF Data Factory (terms and quads)
  namedNode,
  blankNode,
  literal,
  defaultGraph,
  quad,
  variable,

  // Store Operations
  getStoreStats,
  mergeStores,
  differenceStores,
  intersectStores,

  // Querying
  query,
  sparqlQuery,

  // Validation and Reasoning
  validateShacl,
  reason,

  // Graph Operations
  isIsomorphic,
  canonicalize,

  // Store class (if exported)
  Store,
} from "../../vendor/unrdf/packages/core/src/index.mjs";

// Re-export everything as default for convenience
import * as unrdf from "../../vendor/unrdf/packages/core/src/index.mjs";
export default unrdf;
