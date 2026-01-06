import { createLogger } from "../utils/logger.mjs";
const logger = createLogger("performance:index");

/**
 * @fileoverview GitVan v4 - Performance Optimization Module
 *
 * Comprehensive performance optimization layer for @unrdf/hooks.
 * Provides memoization, caching, batching, monitoring, and timing utilities.
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 *
 * @example
 * ```javascript
 * import {
 *   useMemo,
 *   useQueryCache,
 *   usePerformanceMonitor,
 *   useBatchProcessor,
 *   useDebounce
 * } from './performance/index.mjs';
 *
 * // Create optimized hook execution
 * const monitor = usePerformanceMonitor();
 * const queryCache = useQueryCache();
 * const batcher = useBatchProcessor({ processFn: bulkUpdate });
 *
 * // Memoize expensive operations
 * const memoizedQuery = useMemo(async (query) => {
 *   return await queryCache.execute(graph, query);
 * });
 *
 * // Debounce frequent updates
 * const debouncedUpdate = useDebounce(async (data) => {
 *   await batcher.add(data);
 * }, 100);
 *
 * // Track performance
 * const result = await monitor.track('query', () => memoizedQuery(sparql));
 * logger.info(monitor.getReport());
 * ```
 */

// Memoization
export {
  useMemo,
  useComputed,
  useWeakMemo,
  createSelector,
  useBatchMemo,
  usePersistentMemo,
  memoize,
} from "./memoization.mjs";

// Caching
export {
  useQueryCache,
  useResultCache,
  useComputedCache,
  useCacheManager,
} from "./cache-hooks.mjs";

// Subscriptions
export {
  createSelectiveStore,
  createSubscriptionHooks,
  useLazy,
  useDependencyTracker,
} from "./subscriptions.mjs";

// Monitoring
export {
  usePerformanceMonitor,
  createProfilingSession,
  useExecutionTracer,
  createPerformanceContext,
} from "./monitoring.mjs";

// Timing
export {
  useDebounce,
  useThrottle,
  useRateLimiter,
  useCoalescer,
  useAdaptiveTiming,
} from "./timing.mjs";

// Batch Processing
export {
  useBatchProcessor,
  useTransactionalBatch,
  usePriorityBatchQueue,
  useUpdateScheduler,
} from "./batch.mjs";

/**
 * Create a fully optimized hook execution context
 *
 * @param {Object} options - Context options
 * @returns {Object} Optimized execution context
 *
 * @example
 * ```javascript
 * const ctx = createOptimizedContext({
 *   cache: { maxSize: 500 },
 *   monitor: { slowThreshold: 50 },
 *   batch: { maxBatchSize: 100 }
 * });
 *
 * const result = await ctx.execute('myOperation', async () => {
 *   return await expensiveOperation();
 * });
 * ```
 */
export function createOptimizedContext(options = {}) {
  // Import dynamically to avoid circular dependencies
  const { usePerformanceMonitor, createProfilingSession } = require("./monitoring.mjs");
  const { useQueryCache, useCacheManager } = require("./cache-hooks.mjs");
  const { useBatchProcessor } = require("./batch.mjs");
  const { useMemo } = require("./memoization.mjs");
  const { useDebounce, useThrottle } = require("./timing.mjs");

  // Create components
  const monitor = usePerformanceMonitor(options.monitor || {});
  const cacheManager = useCacheManager(options.cache || {});
  const batcher = useBatchProcessor(options.batch || {});

  // Memoization cache for wrapped functions
  const memoizedFns = new Map();

  return {
    monitor,
    cache: cacheManager,
    batcher,

    /**
     * Execute an operation with full optimization
     */
    async execute(name, fn, options = {}) {
      // Check cache first
      if (options.cacheKey) {
        const cached = cacheManager.result.get(options.cacheKey);
        if (cached !== undefined) {
          return cached;
        }
      }

      // Execute with monitoring
      const result = await monitor.track(name, fn, options);

      // Cache result if requested
      if (options.cacheKey && result !== undefined) {
        cacheManager.result.set(options.cacheKey, result, {
          ttl: options.cacheTtl,
        });
      }

      return result;
    },

    /**
     * Create a memoized version of a function
     */
    memoize(name, fn, options = {}) {
      if (memoizedFns.has(name)) {
        return memoizedFns.get(name);
      }

      const memoized = useMemo(fn, options);
      memoizedFns.set(name, memoized);
      return memoized;
    },

    /**
     * Add an item to batch processing
     */
    async batch(item) {
      return batcher.add(item);
    },

    /**
     * Create a debounced function
     */
    debounce(fn, wait, options = {}) {
      return useDebounce(fn, wait, options);
    },

    /**
     * Create a throttled function
     */
    throttle(fn, wait, options = {}) {
      return useThrottle(fn, wait, options);
    },

    /**
     * Start a profiling session
     */
    startProfiling(name) {
      return createProfilingSession(name);
    },

    /**
     * Get comprehensive report
     */
    getReport() {
      return {
        performance: monitor.getReport(),
        cache: cacheManager.getReport(),
        batch: batcher.getStats(),
        timestamp: new Date().toISOString(),
      };
    },

    /**
     * Clear all caches and reset stats
     */
    reset() {
      cacheManager.clearAll();
      monitor.clear();
      batcher.clear();
      memoizedFns.clear();
    },
  };
}

/**
 * Performance optimization presets for common use cases
 */
export const PRESETS = {
  /**
   * High throughput preset - optimized for many small operations
   */
  highThroughput: {
    cache: {
      query: { maxSize: 500, ttl: 60000 },
      result: { maxSize: 1000, ttl: 120000 },
    },
    monitor: {
      slowThreshold: 20,
      warnThreshold: 100,
      sampleRate: 0.1,
    },
    batch: {
      maxBatchSize: 200,
      maxWaitMs: 20,
      concurrency: 4,
    },
  },

  /**
   * Low latency preset - optimized for interactive use
   */
  lowLatency: {
    cache: {
      query: { maxSize: 200, ttl: 30000 },
      result: { maxSize: 500, ttl: 60000 },
    },
    monitor: {
      slowThreshold: 10,
      warnThreshold: 50,
      sampleRate: 0.5,
    },
    batch: {
      maxBatchSize: 50,
      maxWaitMs: 5,
      concurrency: 2,
    },
  },

  /**
   * Memory efficient preset - optimized for limited memory
   */
  memoryEfficient: {
    cache: {
      query: { maxSize: 50, ttl: 30000 },
      result: { maxSize: 100, ttl: 30000 },
    },
    monitor: {
      slowThreshold: 100,
      warnThreshold: 500,
      sampleRate: 0.01,
      maxHistorySize: 100,
    },
    batch: {
      maxBatchSize: 20,
      maxWaitMs: 100,
      concurrency: 1,
    },
  },

  /**
   * Debug preset - full monitoring for development
   */
  debug: {
    cache: {
      query: { maxSize: 100, ttl: 300000 },
      result: { maxSize: 200, ttl: 300000 },
    },
    monitor: {
      slowThreshold: 10,
      warnThreshold: 50,
      sampleRate: 1.0,
      maxHistorySize: 5000,
    },
    batch: {
      maxBatchSize: 10,
      maxWaitMs: 10,
      concurrency: 1,
    },
  },
};

/**
 * Quick performance utilities for common patterns
 */
export const utils = {
  /**
   * Measure execution time of a function
   */
  async measure(fn, label = "operation") {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      const duration = performance.now() - start;
      logger.info(`[${label}] ${duration.toFixed(2)}ms`);
    }
  },

  /**
   * Create a simple timer
   */
  timer() {
    const start = performance.now();
    return {
      elapsed: () => performance.now() - start,
      stop: () => {
        const duration = performance.now() - start;
        return duration;
      },
    };
  },

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  },

  /**
   * Format duration to human readable
   */
  formatDuration(ms) {
    if (ms < 1) return `${(ms * 1000).toFixed(0)}us`;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  },

  /**
   * Get memory usage summary
   */
  getMemoryUsage() {
    if (typeof process !== "undefined" && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        heapUsed: this.formatBytes(usage.heapUsed),
        heapTotal: this.formatBytes(usage.heapTotal),
        external: this.formatBytes(usage.external),
        rss: this.formatBytes(usage.rss),
      };
    }
    return null;
  },
};

export default {
  // Memoization
  useMemo,
  useComputed,
  useWeakMemo,
  createSelector,
  useBatchMemo,
  usePersistentMemo,
  memoize,

  // Caching
  useQueryCache,
  useResultCache,
  useComputedCache,
  useCacheManager,

  // Subscriptions
  createSelectiveStore,
  createSubscriptionHooks,
  useLazy,
  useDependencyTracker,

  // Monitoring
  usePerformanceMonitor,
  createProfilingSession,
  useExecutionTracer,
  createPerformanceContext,

  // Timing
  useDebounce,
  useThrottle,
  useRateLimiter,
  useCoalescer,
  useAdaptiveTiming,

  // Batch
  useBatchProcessor,
  useTransactionalBatch,
  usePriorityBatchQueue,
  useUpdateScheduler,

  // Context & Utils
  createOptimizedContext,
  PRESETS,
  utils,
};
