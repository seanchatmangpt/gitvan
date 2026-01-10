/**
 * GitVan Turtle Serializer
 * Optimized serialization with delta tracking, LRU cache, and compression
 * Provides performance improvements for persistence operations
 */

import crypto from "node:crypto";
import { promisify } from "node:util";
import { gzip as zlibGzip, gunzip as zlibGunzip } from "node:zlib";
import { consola } from "consola";

const gzip = promisify(zlibGzip);
const gunzip = promisify(zlibGunzip);

/**
 * LRU Cache implementation for parsed stores
 */
export class LRUCache {
  constructor(maxSize = 100, ttl = 3600000) {
    this.maxSize = maxSize;
    this.ttl = ttl; // Time to live in milliseconds (default 1 hour)
    this.cache = new Map();
    this.accessOrder = [];
  }

  /**
   * Get item from cache
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter((k) => k !== key);
      return null;
    }

    // Update access order (move to end)
    this.accessOrder = this.accessOrder.filter((k) => k !== key);
    this.accessOrder.push(key);

    item.hits++;
    return item.value;
  }

  /**
   * Set item in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {object} metadata - Additional metadata
   */
  set(key, value, metadata = {}) {
    if (this.cache.has(key)) {
      this.accessOrder = this.accessOrder.filter((k) => k !== key);
    }

    // Evict LRU item if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const lruKey = this.accessOrder.shift();
      this.cache.delete(lruKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      hits: 0,
      size: this.estimateSize(value),
      ...metadata,
    });

    this.accessOrder.push(key);
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache statistics
   * @returns {object}
   */
  getStats() {
    const items = Array.from(this.cache.values());
    return {
      itemCount: this.cache.size,
      maxSize: this.maxSize,
      totalSize: items.reduce((sum, item) => sum + item.size, 0),
      totalHits: items.reduce((sum, item) => sum + item.hits, 0),
      avgHits: items.length > 0 ? items.reduce((sum, item) => sum + item.hits, 0) / items.length : 0,
      ttl: this.ttl,
      utilizationPercent: (this.cache.size / this.maxSize) * 100,
    };
  }

  /**
   * Estimate object size in bytes
   * @private
   */
  estimateSize(obj) {
    if (typeof obj === "string") return obj.length * 2;
    if (typeof obj === "number") return 8;
    if (typeof obj === "boolean") return 4;
    if (Array.isArray(obj)) {
      return obj.reduce((sum, item) => sum + this.estimateSize(item), 0);
    }
    if (obj && typeof obj === "object") {
      return Object.values(obj).reduce((sum, val) => sum + this.estimateSize(val), 0);
    }
    return 0;
  }
}

/**
 * Delta-aware persistence tracker
 */
export class DeltaTracker {
  constructor() {
    this.lastSerialized = null;
    this.lastHash = null;
    this.deltaCache = new Map();
  }

  /**
   * Hash a store/quads for change detection
   * @param {any} store - RDF store or quads array
   * @returns {string} SHA256 hash
   */
  hashStore(store) {
    try {
      const quads = Array.isArray(store)
        ? store.map((q) => q.toString()).sort()
        : Array.from(store).map((q) => q.toString()).sort();

      return crypto.createHash("sha256").update(quads.join("\n")).digest("hex");
    } catch (error) {
      consola.error("Error hashing store:", error);
      return null;
    }
  }

  /**
   * Check if store has changed
   * @param {any} store - Current store
   * @returns {boolean}
   */
  hasChanged(store) {
    const currentHash = this.hashStore(store);
    if (!currentHash) return true; // Assume changed on error

    if (this.lastHash === null) {
      this.lastHash = currentHash;
      return true;
    }

    const changed = currentHash !== this.lastHash;
    if (changed) {
      this.lastHash = currentHash;
    }

    return changed;
  }

  /**
   * Compute delta between two stores
   * @param {any} oldStore - Previous store
   * @param {any} newStore - Current store
   * @returns {object} Delta with added/removed quads
   */
  computeDelta(oldStore, newStore) {
    try {
      const oldQuads = new Set(
        Array.isArray(oldStore)
          ? oldStore.map((q) => q.toString())
          : Array.from(oldStore).map((q) => q.toString())
      );

      const newQuads = new Set(
        Array.isArray(newStore)
          ? newStore.map((q) => q.toString())
          : Array.from(newStore).map((q) => q.toString())
      );

      return {
        added: new Set([...newQuads].filter((q) => !oldQuads.has(q))),
        removed: new Set([...oldQuads].filter((q) => !newQuads.has(q))),
        unchanged: new Set([...newQuads].filter((q) => oldQuads.has(q))),
      };
    } catch (error) {
      consola.error("Error computing delta:", error);
      return { added: new Set(), removed: new Set(), unchanged: new Set() };
    }
  }

  /**
   * Reset tracking state
   */
  reset() {
    this.lastSerialized = null;
    this.lastHash = null;
    this.deltaCache.clear();
  }
}

/**
 * Optimized Turtle Serializer
 */
export class TurtleSerializer {
  constructor(options = {}) {
    this.logger = options.logger || consola;
    this.parseCache = new LRUCache(options.cacheSize || 100, options.cacheTTL || 3600000);
    this.deltaTracker = new DeltaTracker();
    this.enableCompression = options.enableCompression !== false;
    this.compressionThreshold = options.compressionThreshold || 10000; // 10KB
    this.blankNodeCompression = options.blankNodeCompression !== false;
  }

  /**
   * Optimize Turtle content with compression and formatting
   * @param {string} turtle - Turtle content
   * @param {object} options - Optimization options
   * @returns {Promise<object>} Optimized result
   */
  async optimizeTurtle(turtle, options = {}) {
    const startTime = performance.now();
    const {
      sortQuads = false,
      compress = this.enableCompression,
      compressBlankNodes = this.blankNodeCompression,
    } = options;

    try {
      let content = turtle;

      // Apply blank node compression
      if (compressBlankNodes) {
        content = this.compressBlankNodes(content);
      }

      // Sort quads for consistency (optional)
      if (sortQuads) {
        content = this.sortTurtleQuads(content);
      }

      // Apply compression if needed
      let result = {
        data: content,
        compressed: false,
        size: content.length,
        originalSize: turtle.length,
        duration: performance.now() - startTime,
      };

      if (compress && content.length > this.compressionThreshold) {
        try {
          const compressed = await gzip(Buffer.from(content, "utf-8"));
          result.data = compressed;
          result.compressed = true;
          result.compressedSize = compressed.length;
          result.ratio = (compressed.length / content.length).toFixed(2);
        } catch (error) {
          this.logger.warn("Compression failed, using uncompressed:", error);
        }
      }

      return result;
    } catch (error) {
      this.logger.error("Optimization error:", error);
      throw new Error(`Failed to optimize Turtle: ${error.message}`);
    }
  }

  /**
   * Check if content has been cached
   * @param {string} content - Turtle content
   * @returns {boolean}
   */
  isCached(content) {
    const hash = crypto.createHash("sha256").update(content).digest("hex");
    return this.parseCache.cache.has(hash);
  }

  /**
   * Cache Turtle content for future parsing
   * @param {string} content - Turtle content
   * @param {any} store - Parsed store result
   * @returns {object} Cache entry
   */
  cacheContent(content, store) {
    const hash = crypto.createHash("sha256").update(content).digest("hex");
    this.parseCache.set(hash, store, { contentSize: content.length });
    return { hash, cached: true, size: content.length };
  }

  /**
   * Get cached parsed store if available
   * @param {string} content - Turtle content
   * @returns {any|null} Cached store or null
   */
  getCachedStore(content) {
    const hash = crypto.createHash("sha256").update(content).digest("hex");
    const cached = this.parseCache.get(hash);
    if (cached) {
      this.logger.debug("Turtle parse cache hit");
      return cached;
    }
    return null;
  }

  /**
   * Decompress Turtle content if needed
   * @param {string|Buffer} content - Turtle content (possibly compressed)
   * @returns {Promise<string>} Decompressed content
   */
  async decompressIfNeeded(content) {
    try {
      if (Buffer.isBuffer(content)) {
        const decompressed = await gunzip(content);
        return decompressed.toString("utf-8");
      }
      return content;
    } catch (error) {
      this.logger.warn("Decompression failed, treating as uncompressed:", error);
      return typeof content === "string" ? content : content.toString("utf-8");
    }
  }

  /**
   * Compute delta between Turtle serializations
   * @param {string} oldContent - Previous Turtle content
   * @param {string} newContent - Current Turtle content
   * @returns {object} Delta information
   */
  computeTurtleDelta(oldContent, newContent) {
    const oldLines = oldContent.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
    const newLines = newContent.split("\n").filter((l) => l.trim() && !l.startsWith("#"));

    const oldSet = new Set(oldLines);
    const newSet = new Set(newLines);

    return {
      added: new Set([...newSet].filter((l) => !oldSet.has(l))),
      removed: new Set([...oldSet].filter((l) => !newSet.has(l))),
      unchanged: new Set([...newSet].filter((l) => oldSet.has(l))),
      changePercent: ((1 - [...newSet].filter((l) => oldSet.has(l)).length / Math.max(newSet.size, 1)) * 100).toFixed(1),
    };
  }

  /**
   * Generate prefix hints from store
   * @private
   */
  generatePrefixHints(store) {
    const namespaceFrequency = new Map();

    try {
      const quads = Array.isArray(store) ? store : Array.from(store);

      for (const quad of quads) {
        if (!quad) continue;

        [quad.subject, quad.predicate, quad.object, quad.graph].forEach((term) => {
          if (term && term.termType === "NamedNode") {
            const ns = this.getNamespace(term.value);
            if (ns) {
              namespaceFrequency.set(ns, (namespaceFrequency.get(ns) || 0) + 1);
            }
          }
        });
      }

      // Return top 20 most frequent namespaces
      const hints = Object.fromEntries(
        Array.from(namespaceFrequency)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([ns]) => [this.getPrefix(ns), ns])
      );

      return hints;
    } catch (error) {
      this.logger.warn("Failed to generate prefix hints:", error);
      return {};
    }
  }

  /**
   * Get namespace from IRI
   * @private
   */
  getNamespace(iri) {
    try {
      const lastHashIndex = iri.lastIndexOf("#");
      const lastSlashIndex = iri.lastIndexOf("/");
      const splitIndex = Math.max(lastHashIndex, lastSlashIndex);

      if (splitIndex === -1) return null;
      return iri.substring(0, splitIndex + 1);
    } catch {
      return null;
    }
  }

  /**
   * Get suggested prefix for namespace
   * @private
   */
  getPrefix(namespace) {
    const prefixMap = {
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#": "rdf",
      "http://www.w3.org/2000/01/rdf-schema#": "rdfs",
      "http://www.w3.org/2002/07/owl#": "owl",
      "http://www.w3.org/2001/XMLSchema#": "xsd",
      "http://www.w3.org/ns/shacl#": "sh",
      "http://www.w3.org/ns/prov#": "prov",
      "http://purl.org/dc/terms/": "dct",
      "http://xmlns.com/foaf/0.1/": "foaf",
      "https://gitvan.dev/ontology#": "gv",
      "https://gitvan.dev/ontology/git#": "gitv",
      "https://gitvan.dev/graph-hook#": "gh",
      "https://gitvan.dev/op#": "op",
      "https://gitvan.dev/performance#": "perf",
      "https://gitvan.dev/queue#": "queue",
      "https://gitvan.dev/pack#": "pack",
    };

    return prefixMap[namespace] || "ns" + Math.random().toString(36).substring(7);
  }

  /**
   * Compress blank node identifiers
   * @private
   */
  compressBlankNodes(turtle) {
    const blankNodeMap = new Map();
    let counter = 0;

    return turtle.replace(/_:b\d+/g, (match) => {
      if (!blankNodeMap.has(match)) {
        blankNodeMap.set(match, `_:b${counter++}`);
      }
      return blankNodeMap.get(match);
    });
  }

  /**
   * Sort Turtle quads for deterministic output
   * @private
   */
  sortTurtleQuads(turtle) {
    const lines = turtle.split("\n");
    const prefixes = [];
    const statements = [];
    const comments = [];

    for (const line of lines) {
      if (line.startsWith("@prefix")) {
        prefixes.push(line);
      } else if (line.startsWith("#")) {
        comments.push(line);
      } else if (line.trim()) {
        statements.push(line);
      }
    }

    prefixes.sort();
    statements.sort();

    return [...prefixes, "", ...statements, ...comments].join("\n");
  }

  /**
   * Get serializer statistics
   * @returns {object}
   */
  getStats() {
    return {
      cache: this.parseCache.getStats(),
      deltaTracker: {
        hasLastState: this.deltaTracker.lastSerialized !== null,
        lastHash: this.deltaTracker.lastHash,
      },
    };
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.parseCache.clear();
    this.deltaTracker.reset();
  }
}

/**
 * Global serializer instance
 */
export const turtleSerializer = new TurtleSerializer();

/**
 * Create a serializer instance
 * @param {object} options - Serializer options
 * @returns {TurtleSerializer}
 */
export function createTurtleSerializer(options = {}) {
  return new TurtleSerializer(options);
}
