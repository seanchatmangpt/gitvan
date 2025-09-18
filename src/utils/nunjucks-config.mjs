// src/utils/nunjucks-config.mjs
// GitVan v2 — Nunjucks Environment Configuration
// Centralized configuration for all Nunjucks environment manipulation

import nunjucks from "nunjucks";
import * as inflection from "inflection";

/**
 * Environment cache for performance optimization
 * Key: JSON stringified environment configuration
 * Value: Configured Nunjucks Environment instance
 */
const _envCache = new Map();

/**
 * Generate cache key for environment instances
 * @param {Object} config - Environment configuration
 * @param {string[]} config.paths - Template search paths
 * @param {boolean} config.autoescape - HTML auto-escaping setting
 * @param {boolean} config.noCache - Template caching setting
 * @returns {string} Cache key
 */
export function envKey({ paths, autoescape, noCache }) {
  return JSON.stringify({ paths, autoescape, noCache });
}

/**
 * Add determinism guards to prevent non-deterministic operations
 * @param {nunjucks.Environment} env - Nunjucks environment instance
 */
function addDeterminismGuards(env) {
  // Prevent non-deterministic operations that would break reproducible builds
  env.addGlobal("now", () => {
    throw new Error("Templates must not call now(); inject a value.");
  });

  env.addGlobal("random", () => {
    throw new Error("Templates must not use random(); inject values.");
  });
}

/**
 * Add built-in pure filters to the environment
 * @param {nunjucks.Environment} env - Nunjucks environment instance
 */
function addBuiltInFilters(env) {
  // JSON serialization with configurable spacing
  env.addFilter("json", (v, space = 0) => JSON.stringify(v, null, space));

  // URL-safe slug generation
  env.addFilter("slug", (s) =>
    String(s)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, ""),
  );

  // String case transformations
  env.addFilter("upper", (s) => String(s).toUpperCase());
  env.addFilter("lower", (s) => String(s).toLowerCase());

  // String padding utility
  env.addFilter("pad", (s, n = 2, ch = "0") => String(s).padStart(n, ch));
}

/**
 * Add inflection filters for string transformations
 * @param {nunjucks.Environment} env - Nunjucks environment instance
 */
function addInflectionFilters(env) {
  // Pluralization and singularization
  env.addFilter("pluralize", (s, plural) =>
    inflection.pluralize(String(s), plural),
  );
  env.addFilter("singularize", (s, singular) =>
    inflection.singularize(String(s), singular),
  );

  // Count-based inflection
  env.addFilter("inflect", (s, count, singular, plural) =>
    inflection.inflect(String(s), Number(count), singular, plural),
  );

  // Case transformations
  env.addFilter("camelize", (s, lowFirst = false) =>
    inflection.camelize(String(s), !!lowFirst),
  );
  env.addFilter("underscore", (s, allUpper = false) =>
    inflection.underscore(String(s), !!allUpper),
  );
  env.addFilter("humanize", (s, lowFirst = false) =>
    inflection.humanize(String(s), !!lowFirst),
  );

  // String formatting
  env.addFilter("capitalize", (s) => inflection.capitalize(String(s)));
  env.addFilter("dasherize", (s) => inflection.dasherize(String(s)));
  env.addFilter("titleize", (s) => inflection.titleize(String(s)));

  // Module and class transformations
  env.addFilter("demodulize", (s) => inflection.demodulize(String(s)));
  env.addFilter("tableize", (s) => inflection.tableize(String(s)));
  env.addFilter("classify", (s) => inflection.classify(String(s)));

  // Database-related transformations
  env.addFilter("foreign_key", (s, dropIdUBar = false) =>
    inflection.foreign_key(String(s), !!dropIdUBar),
  );

  // Ordinal number formatting
  env.addFilter("ordinalize", (s) => inflection.ordinalize(String(s)));

  // Transform with array of operations
  env.addFilter("transform", (s, arr = []) =>
    inflection.transform(String(s), Array.isArray(arr) ? arr : [arr]),
  );
}

/**
 * Create a fully configured Nunjucks environment
 * @param {Object} config - Environment configuration
 * @param {string[]} config.paths - Template search paths
 * @param {boolean} config.autoescape - HTML auto-escaping setting
 * @param {boolean} config.noCache - Template caching setting
 * @returns {nunjucks.Environment} Configured Nunjucks environment
 */
export function createNunjucksEnvironment({ paths, autoescape, noCache }) {
  // Create file system loader with template paths
  const loader = new nunjucks.FileSystemLoader(paths, { noCache });

  // Create environment with configuration
  const env = new nunjucks.Environment(loader, {
    autoescape,
    throwOnUndefined: true, // Fail fast on undefined variables
  });

  // Add all filter categories
  addDeterminismGuards(env);
  addBuiltInFilters(env);
  addInflectionFilters(env);

  return env;
}

/**
 * Get or create cached environment instance
 * @param {Object} config - Environment configuration
 * @returns {nunjucks.Environment} Cached or new environment instance
 */
export function getCachedEnvironment(config) {
  const key = envKey(config);
  let env = _envCache.get(key);

  if (!env) {
    env = createNunjucksEnvironment(config);
    _envCache.set(key, env);
  }

  return env;
}

/**
 * Clear the environment cache
 * Useful for testing or when configuration changes
 */
export function clearEnvironmentCache() {
  _envCache.clear();
}

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
export function getCacheStats() {
  return {
    size: _envCache.size,
    keys: Array.from(_envCache.keys()),
  };
}

/**
 * Validate environment configuration
 * @param {Object} config - Environment configuration to validate
 * @returns {Object} Validation result with errors array
 */
export function validateEnvironmentConfig(config) {
  const errors = [];

  if (!Array.isArray(config.paths) || config.paths.length === 0) {
    errors.push("paths must be a non-empty array");
  }

  if (typeof config.autoescape !== "boolean") {
    errors.push("autoescape must be a boolean");
  }

  if (typeof config.noCache !== "boolean") {
    errors.push("noCache must be a boolean");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Create a test environment with minimal configuration
 * @param {string[]} paths - Template paths (defaults to empty array)
 * @returns {nunjucks.Environment} Test environment
 */
export function createTestEnvironment(paths = []) {
  const env = createNunjucksEnvironment({
    paths,
    autoescape: false,
    noCache: true,
  });

  // Ensure autoescape property is accessible
  Object.defineProperty(env, "autoescape", {
    value: false,
    writable: false,
    enumerable: true,
    configurable: false,
  });

  return env;
}

/**
 * Ensure a Nunjucks environment with default configuration
 * @param {string} templateDir - Directory containing templates
 * @returns {nunjucks.Environment} Configured Nunjucks environment
 */
export function ensureNunjucksEnv(templateDir = process.cwd()) {
  return getCachedEnvironment({
    paths: [templateDir],
    autoescape: false,
    noCache: true
  });
}

/**
 * List all available filters
 * @returns {Object} Object with filter categories and their filters
 */
export function listAvailableFilters() {
  return {
    builtIn: ["json", "slug", "upper", "lower", "pad"],
    inflection: [
      "pluralize",
      "singularize",
      "inflect",
      "camelize",
      "underscore",
      "humanize",
      "capitalize",
      "dasherize",
      "titleize",
      "demodulize",
      "tableize",
      "classify",
      "foreign_key",
      "ordinalize",
      "transform",
    ],
    guards: ["now", "random"], // These throw errors when called
  };
}
