/**
 * @fileoverview GitVan Composable Registry
 * Central registry for discovering and managing composables
 *
 * Features:
 * - Auto-discovery from src/composables/use*.mjs
 * - Lifecycle tracking (count, performance)
 * - Hot reload support
 * - Dependency resolution
 *
 * @version 1.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import { readdirSync, statSync } from "node:fs";
import { extname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { createLogger } from "../utils/logger.mjs";

const logger = createLogger('composable-registry');

/**
 * Composable Registry
 * Manages discovery, registration, and lifecycle of composables
 */
export class ComposableRegistry {
  constructor(options = {}) {
    this.composables = new Map();
    this.metrics = new Map();
    this.dependencies = new Map();
    this.options = {
      autoDiscover: options.autoDiscover ?? true,
      composablesDir: options.composablesDir || this._getComposablesDir(),
      maxCacheSize: options.maxCacheSize ?? 100,
    };
  }

  /**
   * Get the composables directory path
   * Resolves from the module location
   *
   * @private
   * @returns {string} Path to composables directory
   */
  _getComposablesDir() {
    try {
      const __dirname = dirname(fileURLToPath(import.meta.url));
      return __dirname;
    } catch {
      // Fallback for test environments
      return process.cwd() + '/src/composables';
    }
  }

  /**
   * Discover composables from filesystem
   * Scans for files matching use*.mjs pattern
   *
   * @async
   * @returns {Promise<string[]>} Array of discovered composable names
   */
  async discover() {
    const discovered = [];

    try {
      const files = readdirSync(this.options.composablesDir);

      for (const file of files) {
        // Match use*.mjs pattern
        if (file.startsWith('use') && file.endsWith('.mjs')) {
          const composableName = file.replace('.mjs', '');
          discovered.push(composableName);
        }
      }

      logger.debug(`Discovered ${discovered.length} composables`, {
        composables: discovered.join(', '),
      });

      return discovered;
    } catch (error) {
      logger.error('Failed to discover composables', { error: error.message });
      return [];
    }
  }

  /**
   * Register a composable in the registry
   *
   * @param {string} name - Composable name (e.g., 'useGit')
   * @param {*} composable - Composable factory or instance
   * @param {Object} [metadata] - Optional metadata
   * @returns {Object} Registration confirmation
   */
  register(name, composable, metadata = {}) {
    if (!name || typeof name !== 'string') {
      throw new Error(`Composable name must be a non-empty string, got: ${typeof name}`);
    }

    if (!composable) {
      throw new Error(`Composable must be defined for ${name}`);
    }

    const entry = {
      name,
      composable,
      metadata: {
        registered: new Date().toISOString(),
        usageCount: 0,
        totalExecutionTime: 0,
        averageExecutionTime: 0,
        ...metadata,
      },
      performanceHistory: [],
    };

    this.composables.set(name, entry);
    this.metrics.set(name, {
      calls: 0,
      errors: 0,
      totalTime: 0,
    });

    logger.debug(`Registered composable: ${name}`);

    return {
      success: true,
      name,
      registered: entry.metadata.registered,
    };
  }

  /**
   * Get a registered composable
   *
   * @param {string} name - Composable name
   * @returns {*} Composable factory or instance, or undefined if not found
   */
  get(name) {
    const entry = this.composables.get(name);
    return entry?.composable;
  }

  /**
   * Check if a composable is registered
   *
   * @param {string} name - Composable name
   * @returns {boolean} True if composable is registered
   */
  has(name) {
    return this.composables.has(name);
  }

  /**
   * List all registered composables
   *
   * @returns {string[]} Array of composable names
   */
  list() {
    return Array.from(this.composables.keys());
  }

  /**
   * List all registered composables with metadata
   *
   * @returns {Object[]} Array of composable entries with metadata
   */
  listWithMetadata() {
    return Array.from(this.composables.values()).map((entry) => ({
      name: entry.name,
      metadata: entry.metadata,
      metrics: this.metrics.get(entry.name),
    }));
  }

  /**
   * Register a dependency between composables
   *
   * @param {string} dependent - Composable that depends on another
   * @param {string} dependency - Composable that is depended upon
   */
  registerDependency(dependent, dependency) {
    if (!this.dependencies.has(dependent)) {
      this.dependencies.set(dependent, []);
    }

    const deps = this.dependencies.get(dependent);
    if (!deps.includes(dependency)) {
      deps.push(dependency);
    }

    logger.debug(`Registered dependency: ${dependent} -> ${dependency}`);
  }

  /**
   * Get dependencies for a composable
   *
   * @param {string} name - Composable name
   * @returns {string[]} Array of dependency names
   */
  getDependencies(name) {
    return this.dependencies.get(name) || [];
  }

  /**
   * Resolve dependency order (topological sort)
   * Returns composables in dependency resolution order
   *
   * @param {string[]} names - Composable names to resolve
   * @returns {string[]} Composables in dependency order
   */
  resolveDependencies(names) {
    const resolved = [];
    const visiting = new Set();
    const visited = new Set();

    const visit = (name) => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected: ${name}`);
      }

      visiting.add(name);

      // Visit dependencies first
      const deps = this.getDependencies(name);
      for (const dep of deps) {
        if (names.includes(dep)) {
          visit(dep);
        }
      }

      visiting.delete(name);
      visited.add(name);
      resolved.push(name);
    };

    for (const name of names) {
      visit(name);
    }

    return resolved;
  }

  /**
   * Record composable usage metrics
   * Called after composable execution
   *
   * @param {string} name - Composable name
   * @param {number} executionTime - Execution time in milliseconds
   * @param {boolean} [error=false] - Whether execution failed
   */
  recordUsage(name, executionTime, error = false) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, { calls: 0, errors: 0, totalTime: 0 });
    }

    const metric = this.metrics.get(name);
    const entry = this.composables.get(name);

    metric.calls++;
    metric.totalTime += executionTime;

    if (error) {
      metric.errors++;
    }

    // Update entry metadata
    if (entry) {
      entry.metadata.usageCount = metric.calls;
      entry.metadata.totalExecutionTime = metric.totalTime;
      entry.metadata.averageExecutionTime = metric.totalTime / metric.calls;

      // Keep performance history (last 100 samples)
      entry.performanceHistory.push({
        timestamp: Date.now(),
        duration: executionTime,
        error,
      });

      if (entry.performanceHistory.length > 100) {
        entry.performanceHistory.shift();
      }
    }
  }

  /**
   * Get metrics for a composable
   *
   * @param {string} name - Composable name
   * @returns {Object} Metrics object with calls, errors, totalTime, averageTime
   */
  getMetrics(name) {
    const metric = this.metrics.get(name);
    if (!metric) {
      return null;
    }

    return {
      ...metric,
      averageTime: metric.calls > 0 ? metric.totalTime / metric.calls : 0,
      errorRate: metric.calls > 0 ? (metric.errors / metric.calls) * 100 : 0,
    };
  }

  /**
   * Get metrics for all composables
   *
   * @returns {Object} Map of composable names to metrics
   */
  getAllMetrics() {
    const all = {};
    for (const [name, metric] of this.metrics.entries()) {
      all[name] = {
        ...metric,
        averageTime: metric.calls > 0 ? metric.totalTime / metric.calls : 0,
        errorRate: metric.calls > 0 ? (metric.errors / metric.calls) * 100 : 0,
      };
    }
    return all;
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clearMetrics() {
    for (const metric of this.metrics.values()) {
      metric.calls = 0;
      metric.errors = 0;
      metric.totalTime = 0;
    }

    for (const entry of this.composables.values()) {
      entry.metadata.usageCount = 0;
      entry.metadata.totalExecutionTime = 0;
      entry.metadata.averageExecutionTime = 0;
      entry.performanceHistory = [];
    }
  }

  /**
   * Get summary statistics for the registry
   *
   * @returns {Object} Registry statistics
   */
  getStats() {
    const metrics = this.getAllMetrics();
    const totalCalls = Object.values(metrics).reduce((sum, m) => sum + m.calls, 0);
    const totalErrors = Object.values(metrics).reduce((sum, m) => sum + m.errors, 0);
    const totalTime = Object.values(metrics).reduce((sum, m) => sum + m.totalTime, 0);

    return {
      registeredCount: this.composables.size,
      discoveredCount: 0,
      totalCalls,
      totalErrors,
      totalTime,
      averageCallTime: totalCalls > 0 ? totalTime / totalCalls : 0,
      errorRate: totalCalls > 0 ? (totalErrors / totalCalls) * 100 : 0,
    };
  }

  /**
   * Reset the registry (clear all registrations)
   * Useful for testing
   */
  reset() {
    this.composables.clear();
    this.metrics.clear();
    this.dependencies.clear();
    logger.debug('Composable registry reset');
  }
}

/**
 * Global singleton registry instance
 */
let globalRegistry = null;

/**
 * Get or create the global registry
 *
 * @param {Object} [options] - Registry options
 * @returns {ComposableRegistry} Global registry instance
 */
export function getComposableRegistry(options = {}) {
  if (!globalRegistry) {
    globalRegistry = new ComposableRegistry(options);
  }
  return globalRegistry;
}

/**
 * Reset the global registry (mainly for testing)
 */
export function resetComposableRegistry() {
  if (globalRegistry) {
    globalRegistry.reset();
    globalRegistry = null;
  }
}
