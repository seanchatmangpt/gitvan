// src/config/rdf-loader.mjs
// RDF configuration loader with SPARQL query support and SHACL validation
// CRITICAL: This module requires unrdf. It will FAIL FAST if unrdf is unavailable.
// No fallbacks. No n3. Either unrdf works or the system fails clearly.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { configToQuads, envToQuads, CONFIG_NS } from "./config-parser.mjs";

// FAIL FAST: Import unrdf or die
let unrdf = null;
try {
  unrdf = await import("unrdf");
} catch (error) {
  throw new Error(
    `CRITICAL STARTUP ERROR: unrdf module not available.\n` +
    `GitVan RDF layer requires unrdf@4.2.3+ to be fully functional.\n` +
    `Error details: ${error.message}\n` +
    `Fix: npm install unrdf --save or resolve npm dependency issues\n` +
    `Do not attempt to use GitVan without working unrdf support.`
  );
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RDF_NS = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const XSD_NS = "http://www.w3.org/2001/XMLSchema#";

/**
 * Load and parse the configuration ontology using unrdf
 * @returns {Promise<Store>} Store containing ontology definitions
 */
async function loadConfigOntology() {
  try {
    const ontologyPath = join(__dirname, "config-ontology.ttl");
    const content = await readFile(ontologyPath, "utf-8");

    // Use unrdf to parse Turtle
    if (!unrdf.parseTurtle) {
      throw new Error("unrdf does not export parseTurtle function");
    }

    return await unrdf.parseTurtle(content);
  } catch (error) {
    throw new Error(`Failed to load config ontology: ${error.message}`);
  }
}

/**
 * Load RDF configuration from environment and ontology
 * @param {Object} options - Loading options
 * @param {Object} options.env - Environment object (default: process.env)
 * @param {string} options.envPrefix - Environment variable prefix (default: "GITVAN_")
 * @param {Object} options.configObj - Plain config object to merge
 * @param {string} options.configUri - Base URI for config (default: "urn:gitvan:config")
 * @returns {Promise<Object>} Config object with query methods
 */
export async function loadRDFConfig(options = {}) {
  const {
    env = process.env,
    envPrefix = "GITVAN_",
    configObj = {},
    configUri = "urn:gitvan:config",
  } = options;

  // Load ontology via unrdf
  const ontologyStore = await loadConfigOntology();

  // Create main config store
  const configStore = unrdf.createStore ? unrdf.createStore() : ontologyStore;

  // Add ontology quads to config store
  for (const quad of ontologyStore.match()) {
    configStore.add(quad);
  }

  // Add config quads from env vars
  const envQuads = envToQuads(env, envPrefix, configUri);
  for (const quad of envQuads) {
    configStore.add(quad);
  }

  // Add config quads from plain object
  const objQuads = configToQuads(configObj, configUri);
  for (const quad of objQuads) {
    configStore.add(quad);
  }

  // Create and return config object
  return createConfigObject(configStore, configUri);
}

/**
 * Create the configuration object with methods
 * @param {Store} store - RDF store containing config
 * @param {string} configUri - Base URI for config
 * @returns {Object} Config object
 */
function createConfigObject(store, configUri = "urn:gitvan:config") {
  return {
    /**
     * Get configuration value by path via SPARQL query
     * @param {string} path - Path like "ai.provider" or "runtime.timezone"
     * @returns {Promise<any>} Configuration value
     */
    async get(path) {
      const predicate = pathToPredicate(path);
      if (!predicate) {
        return undefined;
      }

      try {
        // Use unrdf to execute SPARQL query
        if (!unrdf.query) {
          throw new Error("unrdf does not export query function");
        }

        const sparql = `
          SELECT ?value WHERE {
            <${configUri}> <${predicate}> ?value
          }
        `;

        const results = await unrdf.query(sparql, store);
        if (results.length === 0) return undefined;

        return termToValue(results[0].value);
      } catch (error) {
        console.error(`Error getting config value for ${path}:`, error.message);
        return undefined;
      }
    },

    /**
     * Execute SPARQL query against config store
     * @param {string} sparql - SPARQL query string
     * @returns {Promise<Object>} Query results
     */
    async query(sparql) {
      if (!unrdf.query) {
        throw new Error("unrdf query engine not available");
      }

      try {
        return await unrdf.query(sparql, store);
      } catch (error) {
        throw new Error(`SPARQL query failed: ${error.message}`);
      }
    },

    /**
     * Validate config against SHACL shapes in ontology
     * @returns {Promise<Object>} Validation result { valid: boolean, results: Array }
     */
    async validate() {
      if (!unrdf.validate) {
        throw new Error("unrdf validation engine not available");
      }

      try {
        const result = await unrdf.validate(store);
        return {
          valid: result.conforms,
          results: result.results || [],
        };
      } catch (error) {
        throw new Error(`SHACL validation failed: ${error.message}`);
      }
    },

    /**
     * Export configuration as Turtle using unrdf
     * @returns {Promise<string>} Turtle representation
     */
    async toTurtle() {
      if (!unrdf.toTurtle) {
        throw new Error("unrdf Turtle export not available");
      }

      try {
        return await unrdf.toTurtle(store);
      } catch (error) {
        throw new Error(`Failed to convert to Turtle: ${error.message}`);
      }
    },

    /**
     * Export configuration as plain JavaScript object
     * @returns {Promise<Object>} Plain object representation
     */
    async toPOJO() {
      try {
        const obj = {};
        const quads = store.match(unrdf.namedNode(configUri));

        for (const quad of quads) {
          const predUri = quad.predicate.value;
          const value = termToValue(quad.object);
          const path = predicateToPath(predUri);

          if (path && predUri !== `${RDF_NS}type`) {
            setNestedProperty(obj, path, value);
          }
        }

        return obj;
      } catch (error) {
        throw new Error(`Failed to convert to POJO: ${error.message}`);
      }
    },

    /**
     * Get the underlying RDF store (unrdf)
     * @returns {Store} The unrdf store
     */
    getStore() {
      return store;
    },

    /**
     * Get all configuration paths
     * @returns {Promise<Array<string>>} List of all config paths
     */
    async paths() {
      try {
        const paths = new Set();
        const quads = store.match(unrdf.namedNode(configUri));

        for (const quad of quads) {
          const predUri = quad.predicate.value;
          if (predUri !== `${RDF_NS}type`) {
            const path = predicateToPath(predUri);
            if (path) {
              paths.add(path);
            }
          }
        }

        return Array.from(paths);
      } catch (error) {
        console.error("Error getting config paths:", error.message);
        return [];
      }
    },

    /**
     * Get all configuration values
     * @returns {Promise<Object>} All config values
     */
    async all() {
      return this.toPOJO();
    },
  };
}

/**
 * Convert a config path to SPARQL predicate URI
 * @param {string} path - Config path like "ai.provider"
 * @returns {string|null} Predicate URI or null if not found
 */
function pathToPredicate(path) {
  const map = {
    rootDir: `${CONFIG_NS}hasRootDir`,
    "jobs.dir": `${CONFIG_NS}jobsDir`,
    "jobs.scan.patterns": `${CONFIG_NS}jobScanPatterns`,
    "jobs.scan.ignore": `${CONFIG_NS}jobIgnorePatterns`,
    "templates.engine": `${CONFIG_NS}templateEngine`,
    "templates.dirs": `${CONFIG_NS}templateDirs`,
    "templates.autoescape": `${CONFIG_NS}templateAutoescape`,
    "templates.noCache": `${CONFIG_NS}templateNoCache`,
    "templates.filters": `${CONFIG_NS}templateFilters`,
    "receipts.ref": `${CONFIG_NS}receiptRef`,
    "receipts.enabled": `${CONFIG_NS}receiptEnabled`,
    "receipts.compress": `${CONFIG_NS}receiptCompress`,
    "locks.ref": `${CONFIG_NS}lockRef`,
    "locks.timeout": `${CONFIG_NS}lockTimeout`,
    "locks.retries": `${CONFIG_NS}lockRetries`,
    "ai.provider": `${CONFIG_NS}aiProvider`,
    "ai.model": `${CONFIG_NS}aiModel`,
    "ai.baseUrl": `${CONFIG_NS}aiBaseUrl`,
    "ai.temperature": `${CONFIG_NS}aiTemperature`,
    "ai.maxTokens": `${CONFIG_NS}aiMaxTokens`,
    "ai.topP": `${CONFIG_NS}aiTopP`,
    "ai.topK": `${CONFIG_NS}aiTopK`,
    "ai.repeatPenalty": `${CONFIG_NS}aiRepeatPenalty`,
    "ai.apiKey": `${CONFIG_NS}aiApiKey`,
    "runtime.timezone": `${CONFIG_NS}runtimeTimezone`,
    "runtime.locale": `${CONFIG_NS}runtimeLocale`,
    "runtime.deterministic": `${CONFIG_NS}runtimeDeterministic`,
    "runtime.sandbox": `${CONFIG_NS}runtimeSandbox`,
    "daemon.pollMs": `${CONFIG_NS}daemonPollMs`,
    "daemon.lookback": `${CONFIG_NS}daemonLookback`,
    "daemon.maxPerTick": `${CONFIG_NS}daemonMaxPerTick`,
    "events.directory": `${CONFIG_NS}eventsDirectory`,
    "graph.dir": `${CONFIG_NS}graphDir`,
    "graph.snapshotsDir": `${CONFIG_NS}graphSnapshotsDir`,
    "graph.uriRoots": `${CONFIG_NS}graphUriRoots`,
    "graph.autoLoad": `${CONFIG_NS}graphAutoLoad`,
    "graph.validateOnLoad": `${CONFIG_NS}graphValidateOnLoad`,
  };

  return map[path] || null;
}

/**
 * Convert SPARQL predicate URI to config path
 * @param {string} predicateUri - URI like "https://gitvan.dev/ontology/config#aiProvider"
 * @returns {string|null} Config path like "ai.provider" or null if not found
 */
function predicateToPath(predicateUri) {
  const reverseMap = {
    [`${CONFIG_NS}hasRootDir`]: "rootDir",
    [`${CONFIG_NS}jobsDir`]: "jobs.dir",
    [`${CONFIG_NS}jobScanPatterns`]: "jobs.scan.patterns",
    [`${CONFIG_NS}jobIgnorePatterns`]: "jobs.scan.ignore",
    [`${CONFIG_NS}templateEngine`]: "templates.engine",
    [`${CONFIG_NS}templateDirs`]: "templates.dirs",
    [`${CONFIG_NS}templateAutoescape`]: "templates.autoescape",
    [`${CONFIG_NS}templateNoCache`]: "templates.noCache",
    [`${CONFIG_NS}templateFilters`]: "templates.filters",
    [`${CONFIG_NS}receiptRef`]: "receipts.ref",
    [`${CONFIG_NS}receiptEnabled`]: "receipts.enabled",
    [`${CONFIG_NS}receiptCompress`]: "receipts.compress",
    [`${CONFIG_NS}lockRef`]: "locks.ref",
    [`${CONFIG_NS}lockTimeout`]: "locks.timeout",
    [`${CONFIG_NS}lockRetries`]: "locks.retries",
    [`${CONFIG_NS}aiProvider`]: "ai.provider",
    [`${CONFIG_NS}aiModel`]: "ai.model",
    [`${CONFIG_NS}aiBaseUrl`]: "ai.baseUrl",
    [`${CONFIG_NS}aiTemperature`]: "ai.temperature",
    [`${CONFIG_NS}aiMaxTokens`]: "ai.maxTokens",
    [`${CONFIG_NS}aiTopP`]: "ai.topP",
    [`${CONFIG_NS}aiTopK`]: "ai.topK",
    [`${CONFIG_NS}aiRepeatPenalty`]: "ai.repeatPenalty",
    [`${CONFIG_NS}aiApiKey`]: "ai.apiKey",
    [`${CONFIG_NS}runtimeTimezone`]: "runtime.timezone",
    [`${CONFIG_NS}runtimeLocale`]: "runtime.locale",
    [`${CONFIG_NS}runtimeDeterministic`]: "runtime.deterministic",
    [`${CONFIG_NS}runtimeSandbox`]: "runtime.sandbox",
    [`${CONFIG_NS}daemonPollMs`]: "daemon.pollMs",
    [`${CONFIG_NS}daemonLookback`]: "daemon.lookback",
    [`${CONFIG_NS}daemonMaxPerTick`]: "daemon.maxPerTick",
    [`${CONFIG_NS}eventsDirectory`]: "events.directory",
    [`${CONFIG_NS}graphDir`]: "graph.dir",
    [`${CONFIG_NS}graphSnapshotsDir`]: "graph.snapshotsDir",
    [`${CONFIG_NS}graphUriRoots`]: "graph.uriRoots",
    [`${CONFIG_NS}graphAutoLoad`]: "graph.autoLoad",
    [`${CONFIG_NS}graphValidateOnLoad`]: "graph.validateOnLoad",
  };

  return reverseMap[predicateUri] || null;
}

/**
 * Convert RDF term to JavaScript value
 * @param {Object} term - RDF term (Literal, NamedNode, etc.)
 * @returns {any} JavaScript value
 */
function termToValue(term) {
  if (!term) return null;

  if (term.termType === "Literal") {
    const value = term.value;
    if (term.datatype) {
      const datatypeUri = term.datatype.value;
      if (datatypeUri === `${XSD_NS}boolean`) {
        return value === "true";
      }
      if (datatypeUri === `${XSD_NS}integer`) {
        return parseInt(value, 10);
      }
      if (datatypeUri === `${XSD_NS}decimal`) {
        return parseFloat(value);
      }
    }
    return value;
  }

  if (term.termType === "NamedNode") {
    return term.value;
  }

  if (term.value !== undefined) {
    return term.value;
  }

  return String(term);
}

/**
 * Set nested property on object
 * @param {Object} obj - Target object
 * @param {string} path - Nested path like "ai.provider"
 * @param {any} value - Value to set
 */
function setNestedProperty(obj, path, value) {
  const parts = path.split(".");
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part]) {
      current[part] = {};
    }
    current = current[part];
  }

  current[parts[parts.length - 1]] = value;
}

export { createConfigObject };
