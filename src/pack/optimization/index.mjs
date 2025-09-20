// GitVan v3.0.0 - Pack Optimization System
// Provides pack caching, optimization, and profiling functionality

import { PackCache } from './cache.mjs';
import { PackOptimizer } from './optimizer.mjs';
import { PackProfiler } from './profiler.mjs';

// Re-export all optimization components
export { PackCache } from './cache.mjs';
export { PackOptimizer } from './optimizer.mjs';
export { PackProfiler } from './profiler.mjs';

// Main optimization manager
export class PackOptimizationManager {
  constructor(options = {}) {
    this.cache = new PackCache(options.cache || {});
    this.optimizer = new PackOptimizer(options.optimizer || {});
    this.profiler = new PackProfiler(options.profiler || {});
  }

  /**
   * Initialize the optimization system
   */
  async initialize() {
    await this.cache.initialize();
    await this.optimizer.initialize();
    await this.profiler.initialize();
  }

  /**
   * Optimize a pack
   * @param {string} packPath - Path to the pack
   * @returns {Object} Optimization results
   */
  async optimizePack(packPath) {
    const profile = await this.profiler.profilePack(packPath);
    const optimization = await this.optimizer.optimizePack(packPath, profile);
    await this.cache.cachePack(packPath, optimization);
    
    return {
      profile,
      optimization,
      cached: true,
    };
  }

  /**
   * Get optimization statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      cache: this.cache.getStats(),
      optimizer: this.optimizer.getStats(),
      profiler: this.profiler.getStats(),
    };
  }
}

// Default export
export default PackOptimizationManager;