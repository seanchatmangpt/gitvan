/**
 * GitVan Marketplace - Cache Management
 * Handles caching of marketplace results
 */

/**
 * MarketplaceCache - Simple in-memory cache with expiration
 */
export class MarketplaceCache {
  constructor(defaultTimeout = 300000) {
    // 5 minutes default
    this.cache = new Map();
    this.defaultTimeout = defaultTimeout;
  }

  /**
   * Generate cache key from operation and parameters
   * @param {string} operation - Operation name
   * @param {Object} params - Parameters object
   * @returns {string} Cache key
   */
  generateKey(operation, params) {
    const normalized = JSON.stringify(params, Object.keys(params).sort());
    return `${operation}:${normalized}`;
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or null if expired/missing
   */
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expires) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   * @param {number} timeout - Cache timeout in milliseconds
   */
  set(key, data, timeout = this.defaultTimeout) {
    this.cache.set(key, {
      data,
      expires: Date.now() + timeout,
    });

    // Clean up expired entries periodically
    if (this.cache.size > 1000) {
      this.cleanup();
    }
  }

  /**
   * Clean up expired cache entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const entry of this.cache.values()) {
      if (now > entry.expires) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: this.cache.size,
      active,
      expired,
    };
  }
}
