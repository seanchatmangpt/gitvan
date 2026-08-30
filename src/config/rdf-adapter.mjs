/**
 * RDF configuration adapter.
 *
 * The canonical configuration ontology and quad manufacture live in
 * config-parser.mjs. This module owns persistence/reconstruction only; it must
 * not manufacture a second configuration graph vocabulary.
 */

import { createLogger } from "../utils/logger.mjs";
import { unrdfStore } from "../core/unrdf-store.mjs";
import {
  configToQuads,
  CONFIG_NS,
  CONFIG_PROPERTY_MAP,
} from "./config-parser.mjs";

const logger = createLogger("config:rdf-adapter");

const NAMESPACES = Object.freeze({
  gitvan: CONFIG_NS,
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
});

export const CONFIG_BASE_IRI = CONFIG_NS;

/**
 * Convert GitVan configuration to canonical RDF quads.
 * @param {Object} configObj
 * @param {string} configUri
 * @returns {Array<Object>}
 */
export function configToRdf(configObj, configUri = "urn:gitvan:config") {
  return configToQuads(configObj, configUri);
}

/** Historical capitalization retained as a compatibility alias. */
export const configToRDF = configToRdf;

/**
 * Reconstruct scalar configuration values from canonical config quads.
 * RDF collections are intentionally not guessed here; the c12 configuration
 * remains authoritative for complete reconstruction.
 */
export function rdfToConfig(quads) {
  const config = {};
  const predicateToPath = new Map(
    Object.entries(CONFIG_PROPERTY_MAP).map(([path, predicate]) => [predicate, path])
  );

  for (const item of quads || []) {
    if (item?.object?.termType !== "Literal") continue;
    const path = predicateToPath.get(item.predicate?.value);
    if (!path) continue;
    _setPath(config, path, _literalToValue(item.object));
  }

  return config;
}

/**
 * Persist canonical config quads to the RDF store.
 */
export async function persistConfigToRdf(
  configObj,
  { configUri = "urn:gitvan:config", refPath = "refs/rdf/config/main" } = {}
) {
  try {
    if (!unrdfStore.initialized) await unrdfStore.initialize();
    const quads = configToRdf(configObj, configUri);
    await unrdfStore.insert(quads, refPath);
    logger.info(`Persisted ${quads.length} config quads to RDF store`);
    return quads;
  } catch (error) {
    logger.error("Failed to persist config to RDF:", error);
    throw error;
  }
}

/**
 * Load scalar configuration values from the canonical RDF subject.
 * Failure is non-fatal because c12 is the configuration source of truth.
 */
export async function loadConfigFromRdf(configUri = "urn:gitvan:config") {
  try {
    if (!unrdfStore.initialized) await unrdfStore.initialize();

    const results = await unrdfStore.sparql(`
      SELECT ?predicate ?value
      WHERE {
        <${configUri}> ?predicate ?value .
        FILTER(isLiteral(?value))
      }
    `);

    return rdfToConfig(_bindingsToQuads(results, configUri));
  } catch (error) {
    logger.warn("Could not load config from RDF:", error);
    return {};
  }
}

function _bindingsToQuads(results, configUri) {
  if (!Array.isArray(results)) return [];
  return results
    .map((binding) => {
      const predicate = binding?.predicate || binding?.get?.("predicate");
      const value = binding?.value || binding?.get?.("value");
      if (!predicate || !value) return null;
      return {
        subject: { termType: "NamedNode", value: configUri },
        predicate,
        object: value,
      };
    })
    .filter(Boolean);
}

function _literalToValue(term) {
  const datatype = term.datatype?.value || "";
  if (datatype.endsWith("#boolean")) return term.value === "true";
  if (datatype.endsWith("#integer")) return Number.parseInt(term.value, 10);
  if (datatype.endsWith("#decimal") || datatype.endsWith("#double")) {
    return Number.parseFloat(term.value);
  }
  return term.value;
}

function _setPath(target, path, value) {
  const parts = path.split(".");
  let current = target;
  for (const key of parts.slice(0, -1)) {
    current[key] ||= {};
    current = current[key];
  }
  current[parts.at(-1)] = value;
}

export { NAMESPACES, CONFIG_NS };

// Backward-compatible public projection; implementation remains owned by loader.mjs.
export { loadWithRDFSupport } from "./loader.mjs";
