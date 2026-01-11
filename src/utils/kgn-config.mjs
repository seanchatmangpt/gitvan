/**
 * @fileoverview GitVan KGN Configuration and Factory
 *
 * Provides KGN-based template engine configuration, caching, and utilities.
 * Parallel to nunjucks-config.mjs but for the new KGN engine.
 *
 * Key Features:
 * - Engine instance caching for performance
 * - Configuration validation
 * - Test environment creation
 * - Cache statistics and management
 *
 * @module src/utils/kgn-config
 * @version 1.0.0
 * @license Apache-2.0
 */

import { GitVanTemplateEngine, resetTemplateEngine } from '../lib/template-engine.mjs';
import { createFilterMap } from '../lib/template-filters.mjs';

/**
 * Engine cache for performance optimization
 * Key: JSON stringified environment configuration
 * Value: Configured GitVanTemplateEngine instance
 */
const _kgnEngineCache = new Map();

/**
 * Generate cache key for engine instances
 * @param {Object} config - Engine configuration
 * @param {string[]} config.paths - Template search paths
 * @param {boolean} config.autoescape - HTML auto-escaping setting
 * @param {boolean} config.enableCache - Template caching setting
 * @param {boolean} config.deterministicMode - Deterministic rendering
 * @returns {string} Cache key
 */
export function envKey(config = {}) {
  return JSON.stringify({
    paths: config.paths || [],
    autoescape: config.autoescape !== false,
    enableCache: config.enableCache !== false,
    deterministicMode: config.deterministicMode !== false
  });
}

/**
 * Create a fully configured KGN engine
 * @param {Object} config - Engine configuration
 * @param {string[]} config.paths - Template search paths (default: [])
 * @param {boolean} config.autoescape - HTML auto-escaping (default: false)
 * @param {boolean} config.enableCache - Enable template caching (default: true)
 * @param {boolean} config.deterministicMode - Enable deterministic mode (default: true)
 * @param {boolean} config.throwOnUndefined - Throw on undefined variables (default: true)
 * @returns {GitVanTemplateEngine} Configured engine instance
 */
export function createKgnEngine(config = {}) {
  const finalConfig = {
    paths: config.paths || [],
    autoescape: config.autoescape !== false,
    enableCache: config.enableCache !== false,
    deterministicMode: config.deterministicMode !== false,
    throwOnUndefined: config.throwOnUndefined !== false,
    ...config
  };

  const engine = new GitVanTemplateEngine(finalConfig);

  return engine;
}

/**
 * Get or create cached engine instance
 * Uses memoization to avoid recreating identical engines
 * @param {Object} config - Engine configuration
 * @returns {GitVanTemplateEngine} Cached or new engine instance
 */
export function getCachedKgnEngine(config = {}) {
  const key = envKey(config);
  let engine = _kgnEngineCache.get(key);

  if (!engine) {
    engine = createKgnEngine(config);
    _kgnEngineCache.set(key, engine);
  }

  return engine;
}

/**
 * Clear the engine cache
 * Useful for testing or when configuration changes
 * @param {string} [key] - Specific cache key to clear (optional, clears all if not provided)
 */
export function clearKgnEngineCache(key = null) {
  if (key) {
    _kgnEngineCache.delete(key);
  } else {
    _kgnEngineCache.clear();
  }
  resetTemplateEngine();
}

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
export function getKgnCacheStats() {
  const entries = Array.from(_kgnEngineCache.entries()).map(([key, engine]) => {
    return {
      key,
      config: JSON.parse(key),
      engineStats: engine.getCacheStats()
    };
  });

  return {
    cacheSize: _kgnEngineCache.size,
    entries
  };
}

/**
 * Validate KGN configuration
 * @param {Object} config - Engine configuration to validate
 * @returns {Object} Validation result { isValid, errors }
 */
export function validateKgnConfig(config = {}) {
  const errors = [];

  // Validate paths
  if (config.paths !== undefined) {
    if (!Array.isArray(config.paths)) {
      errors.push('paths must be an array');
    } else if (config.paths.length === 0 && config.paths !== undefined) {
      // Empty paths is OK for string rendering
    }
  }

  // Validate boolean options
  const booleanOptions = ['autoescape', 'enableCache', 'deterministicMode', 'throwOnUndefined'];
  for (const option of booleanOptions) {
    if (config[option] !== undefined && typeof config[option] !== 'boolean') {
      errors.push(`${option} must be a boolean`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Create a test environment with minimal configuration
 * @param {string[]} paths - Template paths (defaults to empty array)
 * @param {Object} options - Additional options
 * @returns {GitVanTemplateEngine} Test environment
 */
export function createTestKgnEnvironment(paths = [], options = {}) {
  const config = {
    paths,
    autoescape: false,
    enableCache: true,
    deterministicMode: true,
    ...options
  };

  return createKgnEngine(config);
}

/**
 * Ensure a KGN engine with default configuration
 * @param {string} templateDir - Directory containing templates (default: current directory)
 * @param {Object} options - Additional options
 * @returns {GitVanTemplateEngine} Configured KGN engine
 */
export function ensureKgnEngine(templateDir = process.cwd(), options = {}) {
  return getCachedKgnEngine({
    paths: [templateDir],
    autoescape: false,
    enableCache: true,
    ...options
  });
}

/**
 * List all available filters organized by category
 * @returns {Object} Object with filter categories
 */
export function listAvailableFilters() {
  return {
    caseConversion: ['camelCase', 'pascalCase', 'kebabCase', 'snakeCase'],
    string: ['upper', 'lower', 'capitalize', 'slug', 'pad', 'split', 'join', 'length', 'date'],
    array: ['sum', 'max', 'min'],
    type: ['int', 'float', 'string', 'bool', 'json'],
    utility: ['default', 'round', 'abs'],
    safety: ['now', 'random'],
    inflection: [
      'pluralize',
      'singularize',
      'inflect',
      'camelize',
      'underscore',
      'humanize',
      'dasherize',
      'titleize',
      'demodulize',
      'tableize',
      'classify',
      'foreign_key',
      'ordinalize',
      'transform'
    ],
    gitvan: ['gitBranch', 'gitTag', 'workflowId', 'packVersion']
  };
}

/**
 * Get total filter count
 * @returns {number} Total number of filters available
 */
export function getFilterCount() {
  const filtersByCategory = listAvailableFilters();
  return Object.values(filtersByCategory).reduce(
    (total, category) => total + (Array.isArray(category) ? category.length : 0),
    0
  );
}

/**
 * Create a filter map for bulk registration
 * @returns {Object} Map of all filters
 */
export function getFilterMap() {
  return createFilterMap();
}

/**
 * Get engine statistics summary
 * @returns {Object} Summary of all cached engines
 */
export function getEngineStats() {
  const stats = {
    totalEngines: _kgnEngineCache.size,
    totalFilters: getFilterCount(),
    engines: []
  };

  for (const [key, engine] of _kgnEngineCache.entries()) {
    const config = JSON.parse(key);
    stats.engines.push({
      config,
      cache: engine.getCacheStats()
    });
  }

  return stats;
}

/**
 * Reset all KGN configurations and caches
 * WARNING: This clears all cached engines and may affect ongoing operations
 * Use only in testing or development
 */
export function resetAllKgnConfigs() {
  _kgnEngineCache.clear();
  resetTemplateEngine();
}

export default {
  // Factory functions
  createKgnEngine,
  getCachedKgnEngine,
  ensureKgnEngine,
  createTestKgnEnvironment,

  // Cache management
  clearKgnEngineCache,
  getKgnCacheStats,
  resetAllKgnConfigs,

  // Configuration
  envKey,
  validateKgnConfig,

  // Filter utilities
  listAvailableFilters,
  getFilterCount,
  getFilterMap,

  // Statistics
  getEngineStats
};
