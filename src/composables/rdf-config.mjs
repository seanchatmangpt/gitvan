// src/composables/rdf-config.mjs
// Composable wrapper for RDF configuration with context handling

import { loadRDFConfig } from "../config/rdf-loader.mjs";
import { useGitVan, withGitVan } from "./ctx.mjs";

// Cache for loaded configs
const configCache = new Map();

/**
 * Use RDF configuration composable
 * Provides ergonomic access to RDF-backed configuration with SPARQL queries
 *
 * @param {Object} options - Loading options
 * @param {Object} options.env - Environment object (default: process.env)
 * @param {string} options.envPrefix - Environment variable prefix (default: "GITVAN_")
 * @param {Object} options.configObj - Plain config object to merge
 * @param {string} options.configUri - Base URI for config (default: "urn:gitvan:config")
 * @param {boolean} options.cache - Enable config caching (default: true)
 * @param {string} options.cacheKey - Cache key (default: "default")
 * @returns {Promise<Object>} Config object with methods
 */
export async function useRDFConfig(options = {}) {
  const {
    env = process.env,
    envPrefix = "GITVAN_",
    configObj = {},
    configUri = "urn:gitvan:config",
    cache = true,
    cacheKey = "default",
  } = options;

  // Check cache
  if (cache && configCache.has(cacheKey)) {
    return configCache.get(cacheKey);
  }

  try {
    // Load config within context
    const ctx = useGitVan();
    const config = await withGitVan(ctx, async () => {
      return await loadRDFConfig({
        env,
        envPrefix,
        configObj,
        configUri,
      });
    });

    // Cache if enabled
    if (cache) {
      configCache.set(cacheKey, config);
    }

    return config;
  } catch (error) {
    throw new Error(`Failed to load RDF config: ${error.message}`);
  }
}

/**
 * Create a reactive config getter
 * Provides synchronous access after initial async load
 * @param {Object} config - Config object from useRDFConfig
 * @returns {Object} Reactive config object
 */
export function createReactiveConfig(config) {
  const cache = {};

  return {
    /**
     * Get value with caching
     */
    async getValue(path) {
      if (cache[path] !== undefined) {
        return cache[path];
      }
      const value = await config.get(path);
      cache[path] = value;
      return value;
    },

    /**
     * Get all values
     */
    async getAll() {
      return config.toPOJO();
    },

    /**
     * Clear cache
     */
    clearCache() {
      for (const key of Object.keys(cache)) {
        delete cache[key];
      }
    },

    /**
     * Execute SPARQL query
     */
    async query(sparql) {
      return config.query(sparql);
    },

    /**
     * Validate configuration
     */
    async validate() {
      return config.validate();
    },

    /**
     * Export as Turtle
     */
    async toTurtle() {
      return config.toTurtle();
    },

    /**
     * Get underlying store
     */
    getStore() {
      return config.getStore();
    },
  };
}

/**
 * Clear all cached configs
 */
export function clearConfigCache() {
  configCache.clear();
}

/**
 * Pre-load configuration for performance
 * Useful in application startup
 *
 * @param {Object} options - Loading options (same as useRDFConfig)
 * @returns {Promise<void>}
 */
export async function preloadConfig(options = {}) {
  const cacheKey = options.cacheKey || "default";
  if (!configCache.has(cacheKey)) {
    await useRDFConfig({ ...options, cache: true, cacheKey });
  }
}
