/**
 * @fileoverview GitVan v4 - Hook-Based Caching Layer
 *
 * Provides a comprehensive caching system optimized for @unrdf/hooks patterns.
 * Implements multi-tier caching with query, result, and computed value caches.
 *
 * Key Features:
 * - Query result caching with SPARQL awareness
 * - Computed value memoization
 * - Dependency-based invalidation
 * - Cache warming strategies
 * - Tiered caching (L1/L2)
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import { LRUCache } from "lru-cache";
import { createHash } from "node:crypto";

/**
 * Creates a query-aware cache for SPARQL operations
 *
 * @param {Object} options - Cache configuration
 * @returns {Object} Query cache interface
 *
 * @example
 * ```javascript
 * const queryCache = useQueryCache({ maxSize: 200, ttl: 120000 });
 *
 * const result = await queryCache.execute(
 *   graph,
 *   'SELECT ?s WHERE { ?s a :Person }',
 *   { context: 'person-lookup' }
 * );
 * ```
 */
export function useQueryCache(options = {}) {
  const config = {
    maxSize: options.maxSize || 200,
    ttl: options.ttl || 120000, // 2 minutes
    enablePrefixes: options.enablePrefixes !== false,
    normalizeQueries: options.normalizeQueries !== false,
    trackDependencies: options.trackDependencies !== false,
  };

  // L1 Cache - Hot data (faster, smaller)
  const l1Cache = new LRUCache({
    max: Math.min(config.maxSize, 50),
    ttl: config.ttl / 2,
    updateAgeOnGet: true,
  });

  // L2 Cache - Warm data (larger, slower)
  const l2Cache = new LRUCache({
    max: config.maxSize,
    ttl: config.ttl,
    updateAgeOnGet: true,
  });

  // Dependency tracking
  const dependencyGraph = new Map();

  // Statistics
  const stats = {
    l1Hits: 0,
    l2Hits: 0,
    misses: 0,
    executions: 0,
    totalQueryTime: 0,
    avgQueryTime: 0,
    cacheWrites: 0,
    invalidations: 0,
    dependencyInvalidations: 0,
  };

  /**
   * Normalize a SPARQL query for consistent caching
   */
  function normalizeQuery(query) {
    if (!config.normalizeQueries) return query;

    return query
      .replace(/\s+/g, " ")  // Normalize whitespace
      .replace(/\s*([{}\(\)])\s*/g, "$1")  // Remove spaces around braces
      .trim()
      .toLowerCase();
  }

  /**
   * Generate a cache key for a query
   */
  function generateKey(query, graphId, context = {}) {
    const normalized = normalizeQuery(query);
    const contextStr = JSON.stringify(context);
    const input = `${graphId}:${normalized}:${contextStr}`;
    return createHash("sha256").update(input).digest("hex").slice(0, 24);
  }

  /**
   * Extract dependencies from a SPARQL query
   */
  function extractDependencies(query) {
    const deps = new Set();

    // Extract graph patterns
    const graphPattern = /GRAPH\s+<([^>]+)>/gi;
    let match;
    while ((match = graphPattern.exec(query)) !== null) {
      deps.add(match[1]);
    }

    // Extract prefixes used
    const prefixPattern = /(\w+):/g;
    while ((match = prefixPattern.exec(query)) !== null) {
      deps.add(`prefix:${match[1]}`);
    }

    // Extract classes referenced
    const classPattern = /\s+a\s+(\w+:\w+)/gi;
    while ((match = classPattern.exec(query)) !== null) {
      deps.add(`class:${match[1]}`);
    }

    return Array.from(deps);
  }

  return {
    /**
     * Execute a query with caching
     */
    async execute(graph, query, options = {}) {
      const graphId = options.graphId || graph.store?.id || "default";
      const key = generateKey(query, graphId, options.context || {});

      stats.executions++;

      // Check L1 cache
      if (l1Cache.has(key)) {
        stats.l1Hits++;
        return l1Cache.get(key);
      }

      // Check L2 cache
      if (l2Cache.has(key)) {
        stats.l2Hits++;
        const result = l2Cache.get(key);
        // Promote to L1
        l1Cache.set(key, result);
        return result;
      }

      // Cache miss - execute query
      stats.misses++;
      const startTime = performance.now();

      try {
        const result = await graph.query(query, options);
        const queryTime = performance.now() - startTime;

        stats.totalQueryTime += queryTime;
        stats.avgQueryTime = stats.totalQueryTime / stats.misses;
        stats.cacheWrites++;

        // Store in both caches
        l1Cache.set(key, result);
        l2Cache.set(key, result);

        // Track dependencies
        if (config.trackDependencies) {
          const deps = extractDependencies(query);
          for (const dep of deps) {
            if (!dependencyGraph.has(dep)) {
              dependencyGraph.set(dep, new Set());
            }
            dependencyGraph.get(dep).add(key);
          }
        }

        return result;
      } catch (error) {
        // Don't cache errors
        throw error;
      }
    },

    /**
     * Invalidate cache entries by dependency
     */
    invalidateByDependency(dependency) {
      if (!dependencyGraph.has(dependency)) return 0;

      const keys = dependencyGraph.get(dependency);
      let count = 0;

      for (const key of keys) {
        if (l1Cache.delete(key)) count++;
        if (l2Cache.delete(key)) count++;
      }

      dependencyGraph.delete(dependency);
      stats.dependencyInvalidations += count;
      return count;
    },

    /**
     * Invalidate by query pattern
     */
    invalidateByPattern(pattern) {
      const regex = new RegExp(pattern, "i");
      let count = 0;

      for (const key of l1Cache.keys()) {
        if (regex.test(key)) {
          l1Cache.delete(key);
          count++;
        }
      }

      for (const key of l2Cache.keys()) {
        if (regex.test(key)) {
          l2Cache.delete(key);
          count++;
        }
      }

      stats.invalidations += count;
      return count;
    },

    /**
     * Clear all caches
     */
    clear() {
      l1Cache.clear();
      l2Cache.clear();
      dependencyGraph.clear();
      stats.invalidations++;
    },

    /**
     * Get cache statistics
     */
    getStats() {
      const totalHits = stats.l1Hits + stats.l2Hits;
      const totalRequests = totalHits + stats.misses;
      const hitRate = totalRequests > 0
        ? ((totalHits / totalRequests) * 100).toFixed(2)
        : 0;

      return {
        ...stats,
        hitRate: `${hitRate}%`,
        l1HitRate: totalRequests > 0
          ? `${((stats.l1Hits / totalRequests) * 100).toFixed(2)}%`
          : "0%",
        l2HitRate: totalRequests > 0
          ? `${((stats.l2Hits / totalRequests) * 100).toFixed(2)}%`
          : "0%",
        l1Size: l1Cache.size,
        l2Size: l2Cache.size,
        dependencyCount: dependencyGraph.size,
      };
    },

    /**
     * Warm the cache with common queries
     */
    async warmup(graph, queries) {
      const results = [];
      for (const { query, context } of queries) {
        try {
          const result = await this.execute(graph, query, { context });
          results.push({ query, success: true, cached: true });
        } catch (error) {
          results.push({ query, success: false, error: error.message });
        }
      }
      return results;
    },
  };
}

/**
 * Creates a result cache for computed values
 *
 * @param {Object} options - Cache options
 * @returns {Object} Result cache interface
 */
export function useResultCache(options = {}) {
  const config = {
    maxSize: options.maxSize || 500,
    ttl: options.ttl || 300000, // 5 minutes
    serializer: options.serializer || JSON.stringify,
    deserializer: options.deserializer || JSON.parse,
  };

  const cache = new LRUCache({
    max: config.maxSize,
    ttl: config.ttl,
    updateAgeOnGet: true,
  });

  const stats = {
    hits: 0,
    misses: 0,
    writes: 0,
    evictions: 0,
  };

  // Note: LRU cache tracks evictions via dispose callback in constructor options
  // We track stats manually on each operation

  return {
    /**
     * Get a cached result or compute it
     */
    async getOrCompute(key, computeFn, options = {}) {
      const cacheKey = typeof key === "string" ? key : config.serializer(key);

      if (cache.has(cacheKey)) {
        stats.hits++;
        return cache.get(cacheKey);
      }

      stats.misses++;
      const result = await computeFn();

      if (result !== undefined) {
        cache.set(cacheKey, result, { ttl: options.ttl || config.ttl });
        stats.writes++;
      }

      return result;
    },

    /**
     * Set a value directly
     */
    set(key, value, options = {}) {
      const cacheKey = typeof key === "string" ? key : config.serializer(key);
      cache.set(cacheKey, value, { ttl: options.ttl || config.ttl });
      stats.writes++;
    },

    /**
     * Get a value
     */
    get(key) {
      const cacheKey = typeof key === "string" ? key : config.serializer(key);
      if (cache.has(cacheKey)) {
        stats.hits++;
        return cache.get(cacheKey);
      }
      stats.misses++;
      return undefined;
    },

    /**
     * Check if key exists
     */
    has(key) {
      const cacheKey = typeof key === "string" ? key : config.serializer(key);
      return cache.has(cacheKey);
    },

    /**
     * Delete a key
     */
    delete(key) {
      const cacheKey = typeof key === "string" ? key : config.serializer(key);
      return cache.delete(cacheKey);
    },

    /**
     * Clear all entries
     */
    clear() {
      cache.clear();
    },

    /**
     * Get statistics
     */
    getStats() {
      const total = stats.hits + stats.misses;
      return {
        ...stats,
        hitRate: total > 0 ? `${((stats.hits / total) * 100).toFixed(2)}%` : "0%",
        size: cache.size,
        maxSize: config.maxSize,
      };
    },
  };
}

/**
 * Creates a computed value cache with dependency tracking
 *
 * @param {Object} options - Cache options
 * @returns {Object} Computed cache interface
 */
export function useComputedCache(options = {}) {
  const computedValues = new Map();
  const dependencies = new Map();
  const stats = {
    computations: 0,
    cacheHits: 0,
    invalidations: 0,
  };

  return {
    /**
     * Register a computed value
     */
    register(key, computeFn, deps = []) {
      computedValues.set(key, {
        computeFn,
        deps,
        value: undefined,
        isDirty: true,
        lastComputed: 0,
      });

      // Track dependencies
      for (const dep of deps) {
        if (!dependencies.has(dep)) {
          dependencies.set(dep, new Set());
        }
        dependencies.get(dep).add(key);
      }
    },

    /**
     * Get a computed value
     */
    async get(key) {
      const entry = computedValues.get(key);
      if (!entry) {
        throw new Error(`Computed value not found: ${key}`);
      }

      if (entry.isDirty) {
        stats.computations++;
        entry.value = await entry.computeFn();
        entry.isDirty = false;
        entry.lastComputed = Date.now();
      } else {
        stats.cacheHits++;
      }

      return entry.value;
    },

    /**
     * Invalidate computed values by dependency
     */
    invalidate(dep) {
      if (dependencies.has(dep)) {
        for (const key of dependencies.get(dep)) {
          const entry = computedValues.get(key);
          if (entry) {
            entry.isDirty = true;
            stats.invalidations++;
          }
        }
      }
    },

    /**
     * Invalidate a specific computed value
     */
    invalidateKey(key) {
      const entry = computedValues.get(key);
      if (entry) {
        entry.isDirty = true;
        stats.invalidations++;
      }
    },

    /**
     * Invalidate all computed values
     */
    invalidateAll() {
      for (const entry of computedValues.values()) {
        entry.isDirty = true;
        stats.invalidations++;
      }
    },

    /**
     * Get statistics
     */
    getStats() {
      const total = stats.computations + stats.cacheHits;
      return {
        ...stats,
        hitRate: total > 0 ? `${((stats.cacheHits / total) * 100).toFixed(2)}%` : "0%",
        registeredValues: computedValues.size,
        trackedDependencies: dependencies.size,
      };
    },

    /**
     * List all registered computed values
     */
    list() {
      return Array.from(computedValues.entries()).map(([key, entry]) => ({
        key,
        deps: entry.deps,
        isDirty: entry.isDirty,
        lastComputed: entry.lastComputed,
      }));
    },
  };
}

/**
 * Creates a unified cache manager for all caching needs
 *
 * @param {Object} options - Manager options
 * @returns {Object} Cache manager interface
 */
export function useCacheManager(options = {}) {
  const queryCache = useQueryCache(options.query || {});
  const resultCache = useResultCache(options.result || {});
  const computedCache = useComputedCache(options.computed || {});

  return {
    query: queryCache,
    result: resultCache,
    computed: computedCache,

    /**
     * Clear all caches
     */
    clearAll() {
      queryCache.clear();
      resultCache.clear();
      computedCache.invalidateAll();
    },

    /**
     * Get aggregated statistics
     */
    getStats() {
      return {
        query: queryCache.getStats(),
        result: resultCache.getStats(),
        computed: computedCache.getStats(),
        timestamp: Date.now(),
      };
    },

    /**
     * Export cache report
     */
    getReport() {
      const stats = this.getStats();
      return {
        summary: {
          queryHitRate: stats.query.hitRate,
          resultHitRate: stats.result.hitRate,
          computedHitRate: stats.computed.hitRate,
        },
        details: stats,
        recommendations: this._generateRecommendations(stats),
      };
    },

    /**
     * Generate cache optimization recommendations
     */
    _generateRecommendations(stats) {
      const recommendations = [];

      // Query cache recommendations
      const queryHitRate = parseFloat(stats.query.hitRate);
      if (queryHitRate < 50) {
        recommendations.push({
          cache: "query",
          issue: "Low hit rate",
          suggestion: "Consider increasing cache size or TTL",
          priority: "high",
        });
      }

      if (stats.query.l2Size > stats.query.l1Size * 4) {
        recommendations.push({
          cache: "query",
          issue: "L1 cache too small relative to L2",
          suggestion: "Increase L1 cache size for better performance",
          priority: "medium",
        });
      }

      // Result cache recommendations
      const resultHitRate = parseFloat(stats.result.hitRate);
      if (stats.result.evictions > stats.result.hits) {
        recommendations.push({
          cache: "result",
          issue: "High eviction rate",
          suggestion: "Increase cache size or reduce entry count",
          priority: "high",
        });
      }

      // Computed cache recommendations
      if (stats.computed.invalidations > stats.computed.computations * 2) {
        recommendations.push({
          cache: "computed",
          issue: "Excessive invalidations",
          suggestion: "Review dependency structure for over-invalidation",
          priority: "medium",
        });
      }

      return recommendations;
    },
  };
}

export default {
  useQueryCache,
  useResultCache,
  useComputedCache,
  useCacheManager,
};
