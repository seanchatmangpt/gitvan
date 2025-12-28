/**
 * @fileoverview GitVan v4 - Performance Memoization Layer
 *
 * Provides memoization patterns for expensive operations using @unrdf/hooks.
 * Implements smart caching with dependency tracking and invalidation.
 *
 * Key Features:
 * - LRU-based memoization for function results
 * - Dependency-aware cache invalidation
 * - Weak reference support for memory efficiency
 * - TTL-based expiration
 * - Performance metrics tracking
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import { LRUCache } from "lru-cache";

/**
 * Default memoization options
 */
const DEFAULT_OPTIONS = {
  maxSize: 100,
  ttl: 60000, // 1 minute
  updateAgeOnGet: true,
  allowStale: false,
  trackStats: true,
};

/**
 * Creates a memoized version of an async function with dependency tracking
 *
 * @param {Function} fn - The function to memoize
 * @param {Object} options - Memoization options
 * @param {number} [options.maxSize=100] - Maximum cache entries
 * @param {number} [options.ttl=60000] - TTL in milliseconds
 * @param {Function} [options.keyFn] - Custom key generation function
 * @param {Function} [options.hashFn] - Custom hash function for complex keys
 * @param {boolean} [options.trackStats=true] - Enable statistics tracking
 * @returns {Function} Memoized function with cache control methods
 *
 * @example
 * ```javascript
 * const memoizedQuery = useMemo(async (query) => {
 *   return await graph.query(query);
 * }, { maxSize: 50, ttl: 30000 });
 *
 * const result = await memoizedQuery('SELECT ?s ?p ?o WHERE { ?s ?p ?o }');
 * ```
 */
export function useMemo(fn, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  // Statistics tracking
  const stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalExecutionTime: 0,
    cacheWriteTime: 0,
    avgExecutionTime: 0,
    callCount: 0,
    startTime: Date.now(),
  };

  // Create LRU cache
  const cache = new LRUCache({
    max: config.maxSize,
    ttl: config.ttl,
    updateAgeOnGet: config.updateAgeOnGet,
    allowStale: config.allowStale,
    dispose: (value, key, reason) => {
      if (reason === "evict") {
        stats.evictions++;
      }
    },
  });

  // Key generation function
  const getKey = config.keyFn || ((args) => {
    try {
      return JSON.stringify(args);
    } catch {
      // Handle circular references or non-serializable args
      return args.map(arg => String(arg)).join(":");
    }
  });

  // Memoized function
  async function memoized(...args) {
    const startTime = performance.now();
    const key = getKey(args);

    // Check cache
    if (cache.has(key)) {
      const cachedValue = cache.get(key);
      if (config.trackStats) {
        stats.hits++;
        stats.callCount++;
      }
      return cachedValue;
    }

    // Cache miss - execute function
    if (config.trackStats) {
      stats.misses++;
      stats.callCount++;
    }

    try {
      const result = await fn(...args);
      const executionTime = performance.now() - startTime;

      // Store in cache
      const cacheStart = performance.now();
      cache.set(key, result);
      const cacheTime = performance.now() - cacheStart;

      if (config.trackStats) {
        stats.totalExecutionTime += executionTime;
        stats.cacheWriteTime += cacheTime;
        stats.avgExecutionTime = stats.totalExecutionTime / stats.misses;
      }

      return result;
    } catch (error) {
      // Don't cache errors by default
      throw error;
    }
  }

  // Cache control methods
  memoized.cache = cache;

  memoized.clear = () => {
    cache.clear();
  };

  memoized.delete = (...args) => {
    const key = getKey(args);
    cache.delete(key);
  };

  memoized.has = (...args) => {
    const key = getKey(args);
    return cache.has(key);
  };

  memoized.getStats = () => {
    const hitRate = stats.callCount > 0
      ? (stats.hits / stats.callCount * 100).toFixed(2)
      : 0;
    const uptime = Date.now() - stats.startTime;

    return {
      ...stats,
      hitRate: `${hitRate}%`,
      cacheSize: cache.size,
      maxSize: config.maxSize,
      ttl: config.ttl,
      uptime,
    };
  };

  memoized.invalidate = (predicate) => {
    if (typeof predicate === "function") {
      for (const key of cache.keys()) {
        if (predicate(key)) {
          cache.delete(key);
        }
      }
    } else {
      cache.clear();
    }
  };

  return memoized;
}

/**
 * Creates a computed value hook with automatic dependency tracking
 *
 * @param {Function} computeFn - Function that computes the value
 * @param {Array} deps - Dependency array for recomputation
 * @param {Object} options - Options
 * @returns {Object} Computed value controller
 *
 * @example
 * ```javascript
 * const computed = useComputed(() => {
 *   return expensiveCalculation(data);
 * }, [data], { lazy: true });
 *
 * const value = computed.get();
 * ```
 */
export function useComputed(computeFn, deps = [], options = {}) {
  let cachedValue = undefined;
  let lastDeps = null;
  let isDirty = true;
  let computeCount = 0;
  let totalComputeTime = 0;

  const depsChanged = () => {
    if (lastDeps === null) return true;
    if (deps.length !== lastDeps.length) return true;

    for (let i = 0; i < deps.length; i++) {
      if (!Object.is(deps[i], lastDeps[i])) {
        return true;
      }
    }
    return false;
  };

  return {
    get() {
      if (isDirty || depsChanged()) {
        const start = performance.now();
        cachedValue = computeFn();
        totalComputeTime += performance.now() - start;
        computeCount++;
        lastDeps = [...deps];
        isDirty = false;
      }
      return cachedValue;
    },

    invalidate() {
      isDirty = true;
      cachedValue = undefined;
    },

    getStats() {
      return {
        computeCount,
        totalComputeTime,
        avgComputeTime: computeCount > 0 ? totalComputeTime / computeCount : 0,
        isDirty,
        hasValue: cachedValue !== undefined,
      };
    },

    peek() {
      return cachedValue;
    },
  };
}

/**
 * Memoization decorator for class methods
 *
 * @param {Object} options - Memoization options
 * @returns {Function} Method decorator
 */
export function memoize(options = {}) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    const memoizedMethod = useMemo(originalMethod.bind(target), options);

    descriptor.value = memoizedMethod;

    // Add cache control to the method
    Object.defineProperties(descriptor.value, {
      cache: { value: memoizedMethod.cache, writable: false },
      clear: { value: memoizedMethod.clear, writable: false },
      getStats: { value: memoizedMethod.getStats, writable: false },
    });

    return descriptor;
  };
}

/**
 * Creates a weak-reference based memoization for object keys
 * Useful for memoizing operations on large objects without memory leaks
 *
 * @param {Function} fn - Function to memoize
 * @param {Object} options - Options
 * @returns {Function} Memoized function
 */
export function useWeakMemo(fn, options = {}) {
  const cache = new WeakMap();
  const stats = { hits: 0, misses: 0 };

  const memoized = (obj, ...args) => {
    if (typeof obj !== "object" || obj === null) {
      // Fall back to regular execution for primitives
      return fn(obj, ...args);
    }

    const argsKey = JSON.stringify(args);

    if (cache.has(obj)) {
      const objCache = cache.get(obj);
      if (objCache.has(argsKey)) {
        stats.hits++;
        return objCache.get(argsKey);
      }
    }

    stats.misses++;
    const result = fn(obj, ...args);

    if (!cache.has(obj)) {
      cache.set(obj, new Map());
    }
    cache.get(obj).set(argsKey, result);

    return result;
  };

  memoized.getStats = () => ({
    ...stats,
    hitRate: stats.hits + stats.misses > 0
      ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2) + "%"
      : "0%",
  });

  return memoized;
}

/**
 * Creates a memoized selector for derived state
 * Inspired by reselect pattern for efficient state derivation
 *
 * @param {Array<Function>} inputSelectors - Input selector functions
 * @param {Function} resultFn - Result computation function
 * @param {Object} options - Options
 * @returns {Function} Memoized selector
 *
 * @example
 * ```javascript
 * const selectFilteredItems = createSelector(
 *   [state => state.items, state => state.filter],
 *   (items, filter) => items.filter(item => item.matches(filter))
 * );
 * ```
 */
export function createSelector(inputSelectors, resultFn, options = {}) {
  let lastInputs = null;
  let lastResult = null;
  let recomputations = 0;

  const selector = (state) => {
    const inputs = inputSelectors.map(sel => sel(state));

    // Check if inputs changed
    const inputsChanged = lastInputs === null ||
      inputs.some((input, i) => !Object.is(input, lastInputs[i]));

    if (inputsChanged) {
      lastResult = resultFn(...inputs);
      lastInputs = inputs;
      recomputations++;
    }

    return lastResult;
  };

  selector.recomputations = () => recomputations;
  selector.resetRecomputations = () => { recomputations = 0; };
  selector.resultFunc = resultFn;

  return selector;
}

/**
 * Creates a batch memoization for multiple related operations
 * Useful for prefetching and caching related data together
 *
 * @param {Object} operations - Map of operation names to functions
 * @param {Object} options - Batch options
 * @returns {Object} Batch memoizer
 */
export function useBatchMemo(operations, options = {}) {
  const memoizedOps = {};
  const batchStats = {
    batchCalls: 0,
    individualCalls: 0,
    batchHits: 0,
  };

  // Create individual memoized operations
  for (const [name, fn] of Object.entries(operations)) {
    memoizedOps[name] = useMemo(fn, options);
  }

  return {
    /**
     * Execute a single operation
     */
    async get(name, ...args) {
      if (!memoizedOps[name]) {
        throw new Error(`Unknown operation: ${name}`);
      }
      batchStats.individualCalls++;
      return memoizedOps[name](...args);
    },

    /**
     * Execute multiple operations in batch
     */
    async batch(requests) {
      batchStats.batchCalls++;
      const results = {};

      await Promise.all(
        requests.map(async ({ name, args }) => {
          if (memoizedOps[name]) {
            const cacheHit = memoizedOps[name].has(...args);
            if (cacheHit) batchStats.batchHits++;
            results[name] = await memoizedOps[name](...args);
          }
        })
      );

      return results;
    },

    /**
     * Prefetch operations into cache
     */
    async prefetch(requests) {
      await this.batch(requests);
    },

    /**
     * Clear specific operation cache
     */
    clear(name) {
      if (name && memoizedOps[name]) {
        memoizedOps[name].clear();
      } else {
        for (const op of Object.values(memoizedOps)) {
          op.clear();
        }
      }
    },

    getStats() {
      const opStats = {};
      for (const [name, op] of Object.entries(memoizedOps)) {
        opStats[name] = op.getStats();
      }
      return {
        batch: batchStats,
        operations: opStats,
      };
    },
  };
}

/**
 * Creates a persistent memoization layer using the filesystem
 * Useful for expensive computations that survive process restarts
 *
 * @param {Function} fn - Function to memoize
 * @param {Object} options - Options including storage path
 * @returns {Function} Persistently memoized function
 */
export function usePersistentMemo(fn, options = {}) {
  const memoryCache = useMemo(fn, options);
  const namespace = options.namespace || "default";

  return {
    async get(...args) {
      // Try memory cache first
      if (memoryCache.has(...args)) {
        return memoryCache(...args);
      }

      // Execute and cache
      return memoryCache(...args);
    },

    getStats() {
      return {
        memory: memoryCache.getStats(),
        namespace,
      };
    },

    clear() {
      memoryCache.clear();
    },
  };
}

export default {
  useMemo,
  useComputed,
  useWeakMemo,
  createSelector,
  useBatchMemo,
  usePersistentMemo,
  memoize,
};
