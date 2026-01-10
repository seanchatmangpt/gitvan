// src/config/rdf-adapter.mjs
// RDF-aware configuration adapter with c12 backward compatibility
// Provides 100% backward compatible passthrough to c12 with optional RDF features

import { klona } from "klona/full";
import { loadOptions } from "./loader.mjs";
import { loadRDFConfig } from "./rdf-loader.mjs";
import { validateConfigConsistency } from "./config-consistency-validator.mjs";

/**
 * Load GitVan configuration with RDF support and c12 backward compatibility
 *
 * @param {Object} overrides - Configuration overrides
 * @param {Object} opts - Loader options
 * @param {boolean} opts.watch - Enable config watching (default: false)
 * @param {boolean} opts.validateConsistency - Validate c12/RDF consistency (default: false)
 * @param {boolean} opts.preferRDF - Prefer RDF values over c12 (default: false)
 * @param {boolean} opts.dualWrite - Write to both c12 and RDF (default: false, Phase 2)
 * @param {string} opts.rdfConfigUri - Base URI for RDF config (default: "urn:gitvan:config")
 * @returns {Promise<Object>} Merged configuration object with c12 and RDF interfaces
 */
export async function loadWithRDFSupport(overrides = {}, opts = {}) {
  const startTime = Date.now();

  const {
    validateConsistency = false,
    preferRDF = false,
    dualWrite = false,
    rdfConfigUri = "urn:gitvan:config",
    watch = false,
  } = opts;

  // Load both c12 and RDF config in parallel
  const [c12Config, rdfConfig] = await Promise.all([
    loadOptions(overrides, { watch }),
    _loadRDFConfigSafely(overrides, { configUri: rdfConfigUri }),
  ]);

  const loadTimeMs = Date.now() - startTime;

  // Validate consistency if requested
  let consistencyReport = null;
  if (validateConsistency && rdfConfig) {
    const c12Pojo = klona(c12Config);
    // Remove non-serializable runtime config before comparison
    if (c12Pojo.runtimeConfig) {
      delete c12Pojo.runtimeConfig;
    }

    const rdfPojo = await rdfConfig.toPOJO();
    consistencyReport = validateConfigConsistency(c12Pojo, rdfPojo);
  }

  // Merge configs with preferRDF option
  const mergedConfig = preferRDF && rdfConfig
    ? await _mergeWithRDFPreference(c12Config, rdfConfig)
    : klona(c12Config);

  // Create adapter object with dual interface
  const adapter = _createAdapterProxy(
    mergedConfig,
    rdfConfig,
    consistencyReport,
    loadTimeMs,
    dualWrite
  );

  return adapter;
}

/**
 * Safely load RDF config with fallback to empty config
 * @private
 */
async function _loadRDFConfigSafely(overrides = {}, opts = {}) {
  try {
    const env = process.env;
    const configObj = _extractConfigForRDF(overrides);
    return await loadRDFConfig({
      env,
      configObj,
      configUri: opts.configUri,
    });
  } catch (error) {
    console.warn(
      `RDF config loading failed (non-fatal): ${error.message}. Continuing with c12 only.`
    );
    return null;
  }
}

/**
 * Extract relevant config values for RDF conversion
 * @private
 */
function _extractConfigForRDF(config) {
  // Extract properties that map to RDF predicates
  const result = {};

  const rdfMappedKeys = [
    "rootDir",
    "jobs",
    "templates",
    "receipts",
    "locks",
    "ai",
    "runtime",
    "daemon",
    "events",
    "graph",
  ];

  for (const key of rdfMappedKeys) {
    if (key in config) {
      result[key] = klona(config[key]);
    }
  }

  return result;
}

/**
 * Merge c12 config with RDF values (RDF takes precedence)
 * @private
 */
async function _mergeWithRDFPreference(c12Config, rdfConfig) {
  const merged = klona(c12Config);
  const rdfPojo = await rdfConfig.toPOJO();

  // Deep merge RDF values into c12 config
  _deepMergeRDF(merged, rdfPojo);

  return merged;
}

/**
 * Deep merge RDF POJO values into target object
 * @private
 */
function _deepMergeRDF(target, source, depth = 0) {
  // Prevent infinite recursion
  if (depth > 10) return;

  for (const key of Object.keys(source)) {
    const sourceValue = source[key];

    if (sourceValue === null || sourceValue === undefined) {
      continue;
    }

    if (
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue) &&
      sourceValue.constructor === Object
    ) {
      if (!target[key]) {
        target[key] = {};
      }
      if (typeof target[key] === "object" && target[key] !== null) {
        _deepMergeRDF(target[key], sourceValue, depth + 1);
      } else {
        target[key] = klona(sourceValue);
      }
    } else {
      target[key] = klona(sourceValue);
    }
  }
}

/**
 * Create adapter proxy object with dual interface
 * @private
 */
function _createAdapterProxy(
  config,
  rdfConfig,
  consistencyReport,
  loadTimeMs,
  dualWrite
) {
  // Proxy to intercept property access
  // All existing c12 properties work transparently
  const handler = {
    get(target, prop, receiver) {
      // Special properties for RDF interface
      if (prop === "rdf") {
        return _createRDFInterface(rdfConfig, consistencyReport);
      }

      if (prop === "getRDF") {
        return _createGetRDFMethod(rdfConfig);
      }

      if (prop === "getConsistencyReport") {
        return () => consistencyReport;
      }

      if (prop === "getLoadTimeMs") {
        return () => loadTimeMs;
      }

      // Fall back to c12 config
      return Reflect.get(target, prop, receiver);
    },

    has(target, prop) {
      if (
        prop === "rdf" ||
        prop === "getRDF" ||
        prop === "getConsistencyReport" ||
        prop === "getLoadTimeMs"
      ) {
        return true;
      }
      return Reflect.has(target, prop);
    },

    ownKeys(target) {
      const keys = Reflect.ownKeys(target);
      return [
        ...keys,
        "rdf",
        "getRDF",
        "getConsistencyReport",
        "getLoadTimeMs",
      ];
    },

    getOwnPropertyDescriptor(target, prop) {
      if (
        prop === "rdf" ||
        prop === "getRDF" ||
        prop === "getConsistencyReport" ||
        prop === "getLoadTimeMs"
      ) {
        return {
          configurable: true,
          enumerable: true,
          value: this.get(target, prop),
        };
      }
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
  };

  return new Proxy(config, handler);
}

/**
 * Create RDF interface object for querying and validation
 * @private
 */
function _createRDFInterface(rdfConfig, consistencyReport) {
  if (!rdfConfig) {
    return _createDisabledRDFInterface();
  }

  return {
    /**
     * Execute SPARQL query on RDF config
     */
    async query(sparql) {
      return rdfConfig.query(sparql);
    },

    /**
     * Validate RDF config against SHACL
     */
    async validate() {
      return rdfConfig.validate();
    },

    /**
     * Export config as Turtle
     */
    async toTurtle() {
      return rdfConfig.toTurtle();
    },

    /**
     * Export config as plain object
     */
    async toPOJO() {
      return rdfConfig.toPOJO();
    },

    /**
     * Get all config paths in RDF
     */
    async paths() {
      return rdfConfig.paths();
    },

    /**
     * Get all config values in RDF
     */
    async all() {
      return rdfConfig.all();
    },

    /**
     * Get specific value from RDF
     */
    async get(path) {
      return rdfConfig.get(path);
    },

    /**
     * Get consistency report if available
     */
    getConsistencyReport() {
      return consistencyReport;
    },

    /**
     * Check if RDF config is available
     */
    isAvailable() {
      return true;
    },
  };
}

/**
 * Create stub RDF interface when RDF loading failed
 * @private
 */
function _createDisabledRDFInterface() {
  return {
    async query() {
      throw new Error("RDF config not available");
    },
    async validate() {
      throw new Error("RDF config not available");
    },
    async toTurtle() {
      throw new Error("RDF config not available");
    },
    async toPOJO() {
      throw new Error("RDF config not available");
    },
    async paths() {
      throw new Error("RDF config not available");
    },
    async all() {
      throw new Error("RDF config not available");
    },
    async get() {
      throw new Error("RDF config not available");
    },
    getConsistencyReport() {
      return null;
    },
    isAvailable() {
      return false;
    },
  };
}

/**
 * Create getRDF method for accessing RDF values directly
 * @private
 */
function _createGetRDFMethod(rdfConfig) {
  return async function getRDF(path) {
    if (!rdfConfig) {
      throw new Error("RDF config not available");
    }
    return rdfConfig.get(path);
  };
}
