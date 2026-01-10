// src/config/rdf-adapter.mjs
// RDF configuration with c12 backward compatibility
// Uses @unrdf/kgc-4d directly - no wrappers

import { klona } from "klona/full";
import { KGCStore } from "@unrdf/kgc-4d";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { loadOptions } from "./loader.mjs";

/**
 * Load GitVan configuration with RDF support and c12 backward compatibility
 * RDF functionality via @unrdf/kgc-4d KGCStore API directly
 *
 * @param {Object} overrides - Configuration overrides
 * @param {Object} opts - Loader options
 * @param {boolean} opts.watch - Enable config watching (default: false)
 * @param {string} opts.rdfConfigUri - Base URI for RDF config (default: "urn:gitvan:config")
 * @returns {Promise<Object>} Configuration object with rdfStore property for direct @unrdf access
 */
export async function loadWithRDFSupport(overrides = {}, opts = {}) {
  const startTime = Date.now();

  const {
    rdfConfigUri = "urn:gitvan:config",
    watch = false,
  } = opts;

  // Load both c12 and RDF config in parallel
  const [c12Config, rdfStore] = await Promise.all([
    loadOptions(overrides, { watch }),
    _loadRDFConfigSafely(overrides, { configUri: rdfConfigUri }),
  ]);

  const loadTimeMs = Date.now() - startTime;

  // Return merged config with direct RDF store access
  const config = klona(c12Config);
  config.rdfStore = rdfStore;
  config.getLoadTimeMs = () => loadTimeMs;

  return config;
}

/**
 * Safely load RDF config store - returns KGCStore directly
 * Applications should use @unrdf/kgc-4d KGCStore API directly
 * No wrappers - direct access to @unrdf capabilities
 * @private
 */
async function _loadRDFConfigSafely(overrides = {}, opts = {}) {
  try {
    const kgcStore = new KGCStore();

    // Load config ontology
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const ontologyPath = join(__dirname, "config-ontology.ttl");

    const content = await readFile(ontologyPath, "utf-8");
    await kgcStore.load(content, { format: "text/turtle" });

    // Return KGCStore directly - applications use @unrdf API
    return kgcStore;
  } catch (error) {
    console.warn(
      `RDF config loading failed (non-fatal): ${error.message}. Continuing with c12 only.`
    );
    return null;
  }
}
