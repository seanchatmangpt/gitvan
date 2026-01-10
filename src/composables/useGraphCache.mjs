/**
 * @fileoverview GitVan Core RDF Cache Layer
 *
 * LRU cache factory for SPARQL query results with TTL expiration,
 * memory bounds, and invalidation patterns. Provides 10-50x speedup
 * for repeated queries against the same graph.
 *
 * Key Features:
 * - LRU eviction (configurable max entries: 1000 default)
 * - Memory bounds (configurable max size: 50MB default)
 * - TTL expiration (configurable: 5 minutes default)
 * - Smart invalidation patterns (wildcard matching)
 * - Stats tracking (hits, misses, evictions)
 * - Deterministic cache keys from SPARQL + bindings
 *
 * @version 1.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import crypto from 'node:crypto';

/**
 * Calculate SHA256 hash of a string for cache key generation
 * @param {string} data - Data to hash
 * @returns {string} Hash hex string
 */
function hashData(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Get approximate size of a JavaScript value in bytes
 * @param {*} value - Value to measure
 * @returns {number} Approximate size in bytes
 */
function estimateSize(value) {
  const json = JSON.stringify(value);
  return Buffer.byteLength(json, 'utf8');
}

/**
 * LRU Cache with TTL expiration and memory bounds
 *
 * Implements Least Recently Used eviction policy with support for:
 * - Maximum entry count (default 1000)
 * - Maximum total size (default 50MB)
 * - TTL per entry (default 5 minutes)
 * - Query result hashing for deterministic keys
 * - Comprehensive statistics
 */
class LRUCache {
  constructor(options = {}) {
    // Configuration
    this.maxEntries = options.maxEntries || 1000;
    this.maxSize = options.maxSize || 50 * 1024 * 1024; // 50MB default
    this.ttlMs = options.ttlMs || 5 * 60 * 1000; // 5 minutes default

    // Data structures
    this.cache = new Map(); // key -> { value, timestamp, size, accessCount, sequence }
    this.accessOrder = new Map(); // key -> { timestamp, sequence } (for LRU)
    this._sequence = 0; // Monotonic counter for tie-breaking

    // Stats
    this._stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      invalidations: 0,
      totalSizeBytes: 0,
      entryCount: 0,
    };
  }

  /**
   * Generate cache key from SPARQL query and bindings
   * Uses SHA256 hash of combined query + serialized bindings
   *
   * @param {string} sparql - SPARQL query string
   * @param {object} bindings - Query parameter bindings
   * @returns {string} Cache key
   */
  getCacheKey(sparql, bindings = {}) {
    const normalized = `${sparql}|${JSON.stringify(bindings)}`;
    return hashData(normalized);
  }

  /**
   * Get value from cache
   * Updates access order for LRU tracking
   * Checks TTL expiration
   *
   * @param {string} key - Cache key
   * @returns {*} Cached value or null if not found/expired
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this._stats.misses++;
      return null;
    }

    // Check TTL expiration
    const now = Date.now();
    if (now - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      this._stats.totalSizeBytes -= entry.size;
      this._stats.entryCount--;
      this._stats.misses++;
      return null;
    }

    // Update LRU tracking with sequence for tie-breaking
    this._sequence++;
    this.accessOrder.set(key, { timestamp: now, sequence: this._sequence });
    this._stats.hits++;
    return entry.value;
  }

  /**
   * Set value in cache
   * Enforces max entries and max size constraints
   * May evict least recently used entries
   *
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @returns {boolean} True if set successfully
   */
  set(key, value) {
    const now = Date.now();
    const size = estimateSize(value);

    // Check if value fits in cache
    if (size > this.maxSize) {
      // Single value exceeds max size, don't cache it
      return false;
    }

    // If key exists, remove old entry first
    if (this.cache.has(key)) {
      const oldEntry = this.cache.get(key);
      this._stats.totalSizeBytes -= oldEntry.size;
    }

    // Evict entries if needed to make space
    while (
      this.cache.size >= this.maxEntries ||
      this._stats.totalSizeBytes + size > this.maxSize
    ) {
      if (!this._evictLRU()) {
        break;
      }
    }

    // Increment sequence for new entry
    this._sequence++;

    // Store new entry
    this.cache.set(key, {
      value,
      timestamp: now,
      size,
      accessCount: 1,
    });
    this.accessOrder.set(key, { timestamp: now, sequence: this._sequence });
    this._stats.totalSizeBytes += size;
    this._stats.entryCount = this.cache.size;

    return true;
  }

  /**
   * Evict least recently used entry
   * @private
   * @returns {boolean} True if entry was evicted
   */
  _evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;
    let oldestSequence = Infinity;

    for (const [key, accessInfo] of this.accessOrder.entries()) {
      // Compare by timestamp first, then by sequence for tie-breaking
      // Older timestamp = lower priority (should be evicted first)
      // If timestamps equal, older sequence = lower priority
      const { timestamp, sequence } = accessInfo;
      if (timestamp < oldestTime ||
          (timestamp === oldestTime && sequence < oldestSequence)) {
        oldestTime = timestamp;
        oldestSequence = sequence;
        oldestKey = key;
      }
    }

    if (oldestKey !== null) {
      const entry = this.cache.get(oldestKey);
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
      this._stats.totalSizeBytes -= entry.size;
      this._stats.evictions++;
      this._stats.entryCount = this.cache.size;
      return true;
    }

    return false;
  }

  /**
   * Invalidate cache entries matching pattern
   * Supports wildcard patterns (prefix matching)
   *
   * @param {string} pattern - Pattern to match (can include *)
   * @returns {number} Number of entries invalidated
   */
  invalidate(pattern = '*') {
    if (pattern === '*') {
      // Clear entire cache
      const count = this.cache.size;
      this._stats.totalSizeBytes = 0;
      this._stats.entryCount = 0;
      this._stats.invalidations += count;
      this.cache.clear();
      this.accessOrder.clear();
      return count;
    }

    // Wildcard pattern matching
    const isWildcard = pattern.includes('*');
    const regex = isWildcard
      ? new RegExp(`^${pattern.replace(/\*/g, '.*')}$`)
      : null;

    let invalidated = 0;
    for (const key of this.cache.keys()) {
      const matches = regex ? regex.test(key) : key === pattern;
      if (matches) {
        const entry = this.cache.get(key);
        this.cache.delete(key);
        this.accessOrder.delete(key);
        this._stats.totalSizeBytes -= entry.size;
        invalidated++;
      }
    }

    this._stats.invalidations += invalidated;
    this._stats.entryCount = this.cache.size;
    return invalidated;
  }

  /**
   * Get cache statistics
   *
   * @returns {object} Statistics object with hits, misses, evictions, etc.
   */
  stats() {
    const hitRate = this._stats.hits + this._stats.misses === 0
      ? 0
      : (this._stats.hits / (this._stats.hits + this._stats.misses)) * 100;

    return {
      ...this._stats,
      hitRate: hitRate.toFixed(2) + '%',
      maxEntries: this.maxEntries,
      maxSizeBytes: this.maxSize,
      ttlMs: this.ttlMs,
      currentSizeBytes: this._stats.totalSizeBytes,
      currentEntries: this._stats.entryCount,
    };
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.accessOrder.clear();
    this._stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      invalidations: 0,
      totalSizeBytes: 0,
      entryCount: 0,
    };
  }
}

/**
 * Composable factory for graph cache instances
 *
 * Creates isolated LRU cache instances with configurable behavior.
 * Designed for SPARQL query result caching with automatic invalidation.
 *
 * @param {object} options - Cache configuration
 * @param {number} [options.maxEntries=1000] - Maximum cache entries
 * @param {number} [options.maxSize=52428800] - Maximum size in bytes (50MB)
 * @param {number} [options.ttlMs=300000] - TTL in milliseconds (5 min)
 * @returns {object} Cache API with get, set, invalidate, stats methods
 *
 * @example
 * const cache = useGraphCache({ maxEntries: 500 })
 * const key = cache.getCacheKey('SELECT * WHERE { ?s ?p ?o }', {})
 * cache.set(key, results)
 * const cached = cache.get(key)
 * cache.invalidate('*') // clear all
 * const stats = cache.stats()
 */
export function useGraphCache(options = {}) {
  const lru = new LRUCache(options);

  return {
    /**
     * Generate deterministic cache key from query and bindings
     * @param {string} sparql - SPARQL query
     * @param {object} bindings - Query bindings
     * @returns {string} Cache key
     */
    getCacheKey(sparql, bindings = {}) {
      return lru.getCacheKey(sparql, bindings);
    },

    /**
     * Get cached value
     * @param {string} key - Cache key
     * @returns {*} Cached value or null
     */
    get(key) {
      return lru.get(key);
    },

    /**
     * Set cache value
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     * @returns {boolean} Success
     */
    set(key, value) {
      return lru.set(key, value);
    },

    /**
     * Invalidate cache entries by pattern
     * @param {string} pattern - Pattern (supports *)
     * @returns {number} Entries invalidated
     */
    invalidate(pattern = '*') {
      return lru.invalidate(pattern);
    },

    /**
     * Get cache statistics
     * @returns {object} Stats object
     */
    stats() {
      return lru.stats();
    },

    /**
     * Clear all cache entries
     */
    clear() {
      lru.clear();
    },
  };
}

/**
 * Export LRUCache class for direct instantiation if needed
 */
export { LRUCache };
