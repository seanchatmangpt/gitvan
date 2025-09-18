import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  statSync,
} from "node:fs";
import { join, dirname } from "pathe";
import { LRUCache } from "lru-cache";
import * as cacache from "cacache";
import { gzip, gunzip } from "node:zlib";
import cron from "node-cron";
import { createLogger } from "../../utils/logger.mjs";

// Cache schema version for handling migrations
const CACHE_SCHEMA_VERSION = "2.0.0";
const CACHE_INTEGRITY_SALT = "gitvan-cache-integrity";

export class PackCache {
  constructor(options = {}) {
    this.options = options;
    this.logger = createLogger("pack:cache");
    this.cacheDir = options.cacheDir || ".gitvan/cache";
    this.ttl = options.ttl || 3600000; // 1 hour default
    this.maxSize = options.maxSize || 100 * 1024 * 1024; // 100MB
    this.compression = options.compression !== false; // Enable by default
    this.warmupKeys = options.warmupKeys || [];

    // Initialize LRU cache for hot data
    this.memoryCache = new LRUCache({
      max: options.memoryMax || 500,
      maxSize: options.memoryMaxSize || 50 * 1024 * 1024, // 50MB
      sizeCalculation: (value) => JSON.stringify(value).length,
      ttl: this.ttl,
      allowStale: false,
      updateAgeOnGet: true,
      updateAgeOnHas: true,
    });

    // Statistics tracking
    this.stats = {
      hits: 0,
      misses: 0,
      writes: 0,
      evictions: 0,
      compressionSaved: 0,
      integrityChecks: 0,
      integrityFailures: 0,
      warmupLoads: 0,
      startTime: Date.now(),
    };

    // Cache type registry for organized storage
    this.typeRegistry = new Map();
    this.keyTypeMap = new Map();

    // Initialize cache system
    this._init();
  }

  async _init() {
    try {
      // Ensure cache directories exist
      if (!existsSync(this.cacheDir)) {
        mkdirSync(this.cacheDir, { recursive: true });
      }

      // Initialize cacache storage
      this.diskCache = this.cacheDir;

      // Load or create cache metadata
      await this._loadCacheMetadata();

      // Start background maintenance tasks
      this._startMaintenanceTasks();

      // Perform cache warming if configured
      if (this.warmupKeys.length > 0) {
        await this._performWarmup();
      }

      this.logger.info("Cache system initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize cache system:", error);
      throw error;
    }
  }

  async _loadCacheMetadata() {
    const metadataPath = join(this.cacheDir, "metadata.json");

    try {
      if (existsSync(metadataPath)) {
        const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));

        // Check schema version compatibility
        if (metadata.schemaVersion !== CACHE_SCHEMA_VERSION) {
          this.logger.warn(
            `Cache schema version mismatch. Expected ${CACHE_SCHEMA_VERSION}, found ${metadata.schemaVersion}. Clearing cache.`
          );
          await this.clear();
          await this._createCacheMetadata();
        } else {
          // Load existing type registry
          if (metadata.typeRegistry) {
            for (const [type, config] of Object.entries(
              metadata.typeRegistry
            )) {
              this.typeRegistry.set(type, config);
            }
          }
          this.logger.debug("Loaded cache metadata successfully");
        }
      } else {
        await this._createCacheMetadata();
      }
    } catch (error) {
      this.logger.warn(
        "Failed to load cache metadata, recreating:",
        error.message
      );
      await this._createCacheMetadata();
    }
  }

  async _createCacheMetadata() {
    const metadata = {
      schemaVersion: CACHE_SCHEMA_VERSION,
      createdAt: new Date().toISOString(),
      typeRegistry: Object.fromEntries(this.typeRegistry),
      lastMaintenance: new Date().toISOString(),
    };

    const metadataPath = join(this.cacheDir, "metadata.json");
    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    this.logger.debug("Created cache metadata");
  }

  _startMaintenanceTasks() {
    // Run cache maintenance every hour
    cron.schedule(
      "0 * * * *",
      async () => {
        await this._performMaintenance();
      },
      {
        name: "cache-maintenance",
        timezone: "UTC",
      }
    );

    // Run integrity checks daily
    cron.schedule(
      "0 2 * * *",
      async () => {
        await this._performIntegrityCheck();
      },
      {
        name: "cache-integrity-check",
        timezone: "UTC",
      }
    );

    this.logger.debug("Cache maintenance tasks scheduled");
  }

  async _performMaintenance() {
    this.logger.info("Starting cache maintenance");

    try {
      // Clean expired entries from disk cache
      await cacache.verify(this.diskCache, {
        filter: (entry) => {
          const age = Date.now() - entry.time;
          return age < this.ttl;
        },
      });

      // Update metadata
      await this._createCacheMetadata();

      this.logger.info("Cache maintenance completed");
    } catch (error) {
      this.logger.error("Cache maintenance failed:", error);
    }
  }

  async _performIntegrityCheck() {
    this.logger.info("Starting cache integrity check");
    let checked = 0;
    let failed = 0;

    try {
      const entries = await cacache.ls(this.diskCache);

      for (const [key, entry] of Object.entries(entries)) {
        try {
          await cacache.get(this.diskCache, key);
          checked++;
          this.stats.integrityChecks++;
        } catch (error) {
          this.logger.warn(
            `Integrity check failed for key ${key}:`,
            error.message
          );
          await cacache.rm.entry(this.diskCache, key);
          failed++;
          this.stats.integrityFailures++;
        }
      }

      this.logger.info(
        `Integrity check completed: ${checked} verified, ${failed} removed`
      );
    } catch (error) {
      this.logger.error("Integrity check failed:", error);
    }
  }

  async _performWarmup() {
    this.logger.info(
      `Starting cache warmup for ${this.warmupKeys.length} keys`
    );

    for (const { type, data } of this.warmupKeys) {
      try {
        await this.get(type, data);
        this.stats.warmupLoads++;
      } catch (error) {
        this.logger.warn(`Warmup failed for ${type}:`, error.message);
      }
    }

    this.logger.info(
      `Cache warmup completed: ${this.stats.warmupLoads} keys loaded`
    );
  }

  sortObjectKeys(obj) {
    if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
      return obj;
    }

    const sorted = {};
    Object.keys(obj)
      .sort()
      .forEach((key) => {
        sorted[key] = this.sortObjectKeys(obj[key]);
      });
    return sorted;
  }

  generateKey(type, data) {
    // Sort keys to ensure consistent hashing
    const sortedData = this.sortObjectKeys(data);
    const input = JSON.stringify({
      type,
      data: sortedData,
      version: CACHE_SCHEMA_VERSION,
    });
    const key = createHash("sha256").update(input).digest("hex").slice(0, 16);

    // Track type for this key
    this.keyTypeMap.set(key, type);

    // Register type configuration if new
    if (!this.typeRegistry.has(type)) {
      this.typeRegistry.set(type, {
        count: 0,
        totalSize: 0,
        lastAccess: Date.now(),
      });
    }

    return key;
  }

  _generateIntegrityHash(data) {
    const content = JSON.stringify(data) + CACHE_INTEGRITY_SALT;
    return createHash("sha256").update(content).digest("hex");
  }

  async get(type, data) {
    const key = this.generateKey(type, data);

    // Check memory cache first (LRU)
    if (this.memoryCache.has(key)) {
      const entry = this.memoryCache.get(key);
      this.stats.hits++;
      this.logger.debug(`Memory cache hit: ${key}`);

      // Update type registry
      const typeConfig = this.typeRegistry.get(type);
      if (typeConfig) {
        typeConfig.lastAccess = Date.now();
      }

      return entry.value;
    }

    // Check disk cache (cacache)
    try {
      const result = await cacache.get(this.diskCache, key);
      const entry = JSON.parse(result.data.toString());

      // Verify integrity
      const expectedHash = this._generateIntegrityHash(entry.value);
      if (entry.integrityHash !== expectedHash) {
        this.logger.warn(
          `Integrity check failed for key ${key}, removing from cache`
        );
        await cacache.rm.entry(this.diskCache, key);
        this.stats.integrityFailures++;
        this.stats.misses++;
        return null;
      }

      // Check TTL
      const age = Date.now() - entry.timestamp;
      if (age >= this.ttl) {
        await cacache.rm.entry(this.diskCache, key);
        this.stats.misses++;
        return null;
      }

      // Decompress if needed
      let value = entry.value;
      if (entry.compressed && this.compression) {
        try {
          const decompressed = await gunzip(Buffer.from(entry.value, "base64"));
          value = JSON.parse(decompressed.toString());
        } catch (error) {
          this.logger.warn(
            `Decompression failed for key ${key}:`,
            error.message
          );
          this.stats.misses++;
          return null;
        }
      }

      // Store in memory cache for fast access
      this.memoryCache.set(key, { value, timestamp: entry.timestamp });

      // Update type registry
      const typeConfig = this.typeRegistry.get(type);
      if (typeConfig) {
        typeConfig.lastAccess = Date.now();
      }

      this.stats.hits++;
      this.logger.debug(`Disk cache hit: ${key}`);
      return value;
    } catch (error) {
      if (error.code !== "ENOENT") {
        this.logger.warn(`Cache get error for key ${key}:`, error.message);
      }
    }

    this.stats.misses++;
    return null;
  }

  async set(type, data, value) {
    const key = this.generateKey(type, data);
    const timestamp = Date.now();

    // Prepare entry data
    let entryValue = value;
    let compressed = false;
    let originalSize = JSON.stringify(value).length;

    // Compress large entries if enabled
    if (this.compression && originalSize > 1024) {
      // Compress if > 1KB
      try {
        const compressed_data = await gzip(JSON.stringify(value));
        const compressedSize = compressed_data.length;

        if (compressedSize < originalSize * 0.8) {
          // Only use if 20%+ savings
          entryValue = compressed_data.toString("base64");
          compressed = true;
          this.stats.compressionSaved += originalSize - compressedSize;
          this.logger.debug(
            `Compressed entry ${key}: ${originalSize} → ${compressedSize} bytes`
          );
        }
      } catch (error) {
        this.logger.warn(`Compression failed for key ${key}:`, error.message);
      }
    }

    const entry = {
      value: entryValue,
      timestamp,
      compressed,
      size: originalSize,
      integrityHash: this._generateIntegrityHash(value),
    };

    // Check size limit
    if (entry.size > this.maxSize / 10) {
      this.logger.warn(
        `Cache entry too large: ${entry.size} bytes for key ${key}`
      );
      return;
    }

    try {
      // Store in disk cache with cacache
      await cacache.put(this.diskCache, key, JSON.stringify(entry));

      // Store in memory cache
      this.memoryCache.set(key, { value, timestamp });

      // Update type registry
      const typeConfig = this.typeRegistry.get(type);
      if (typeConfig) {
        typeConfig.count++;
        typeConfig.totalSize += entry.size;
        typeConfig.lastAccess = Date.now();
      }

      this.stats.writes++;
      this.logger.debug(
        `Cache write: ${key} (${entry.size} bytes, compressed: ${compressed})`
      );
    } catch (error) {
      this.logger.error(`Cache write failed for key ${key}:`, error);
    }
  }

  async has(type, data) {
    const key = this.generateKey(type, data);

    // Check memory cache first
    if (this.memoryCache.has(key)) {
      return true;
    }

    // Check disk cache
    try {
      const info = await cacache.get.info(this.diskCache, key);
      if (!info) return false;

      // Check TTL
      const age = Date.now() - info.time;
      return age < this.ttl;
    } catch (error) {
      return false;
    }
  }

  async delete(type, data) {
    const key = this.generateKey(type, data);

    // Remove from memory cache
    this.memoryCache.delete(key);

    // Remove from disk cache
    try {
      await cacache.rm.entry(this.diskCache, key);
      this.keyTypeMap.delete(key);
      this.logger.debug(`Cache entry deleted: ${key}`);
    } catch (error) {
      this.logger.warn(`Failed to delete cache entry ${key}:`, error.message);
    }
  }

  async clear(type = null) {
    if (type) {
      // Clear specific type
      const keysToDelete = [];
      for (const [key, keyType] of this.keyTypeMap.entries()) {
        if (keyType === type) {
          keysToDelete.push(key);
        }
      }

      // Remove from memory cache
      keysToDelete.forEach((key) => {
        this.memoryCache.delete(key);
        this.keyTypeMap.delete(key);
      });

      // Remove from disk cache
      for (const key of keysToDelete) {
        try {
          await cacache.rm.entry(this.diskCache, key);
        } catch (error) {
          this.logger.warn(
            `Failed to remove cache entry ${key}:`,
            error.message
          );
        }
      }

      // Update type registry
      this.typeRegistry.delete(type);

      this.logger.info(`Cache cleared for type: ${type}`);
    } else {
      // Clear all caches
      this.memoryCache.clear();
      this.keyTypeMap.clear();
      this.typeRegistry.clear();

      try {
        await cacache.rm.all(this.diskCache);
        await this._createCacheMetadata();
        this.logger.info("All caches cleared");
      } catch (error) {
        this.logger.error("Failed to clear disk cache:", error);
      }
    }
  }

  async compact() {
    this.logger.info("Starting cache compaction");

    try {
      const before = await cacache.verify(this.diskCache);
      const after = await cacache.verify(this.diskCache, { filter: false });

      const sizeSaved = before.totalEntries - after.totalEntries;
      this.logger.info(`Cache compacted: removed ${sizeSaved} expired entries`);

      return { entriesRemoved: sizeSaved };
    } catch (error) {
      this.logger.error("Cache compaction failed:", error);
      throw error;
    }
  }

  addWarmupKey(type, data) {
    this.warmupKeys.push({ type, data });
    this.logger.debug(`Added warmup key for type: ${type}`);
  }

  removeWarmupKey(type, data) {
    const key = this.generateKey(type, data);
    this.warmupKeys = this.warmupKeys.filter(
      (item) => this.generateKey(item.type, item.data) !== key
    );
  }

  async warmup() {
    await this._performWarmup();
  }

  getStats() {
    const hitRate =
      this.stats.hits / (this.stats.hits + this.stats.misses) || 0;
    const uptime = Date.now() - this.stats.startTime;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) + "%",
      memoryEntries: this.memoryCache.size,
      memorySize: this.memoryCache.calculatedSize,
      memoryMaxSize: this.memoryCache.maxSize,
      diskCacheDir: this.diskCache,
      compressionEnabled: this.compression,
      typeCount: this.typeRegistry.size,
      uptime: uptime,
      warmupKeysConfigured: this.warmupKeys.length,
    };
  }

  async getDetailedStats() {
    const basicStats = this.getStats();

    try {
      // Get disk cache info
      const diskEntries = await cacache.ls(this.diskCache);
      const diskStats = Object.values(diskEntries).reduce(
        (acc, entry) => {
          acc.totalEntries++;
          acc.totalSize += entry.size;
          return acc;
        },
        { totalEntries: 0, totalSize: 0 }
      );

      // Get type breakdown
      const typeBreakdown = Object.fromEntries(
        Array.from(this.typeRegistry.entries()).map(([type, config]) => [
          type,
          {
            ...config,
            lastAccessAgo: Date.now() - config.lastAccess,
          },
        ])
      );

      return {
        ...basicStats,
        disk: diskStats,
        types: typeBreakdown,
      };
    } catch (error) {
      this.logger.warn("Failed to get detailed stats:", error.message);
      return basicStats;
    }
  }

  async export(filePath) {
    try {
      const stats = await this.getDetailedStats();
      const entries = await cacache.ls(this.diskCache);

      const exportData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          schemaVersion: CACHE_SCHEMA_VERSION,
          cacheDir: this.diskCache,
        },
        stats,
        entries: Object.keys(entries).length,
        types: Array.from(this.typeRegistry.keys()),
      };

      writeFileSync(filePath, JSON.stringify(exportData, null, 2));
      this.logger.info(`Cache data exported to: ${filePath}`);

      return exportData;
    } catch (error) {
      this.logger.error("Cache export failed:", error);
      throw error;
    }
  }

  // Event hooks for integration
  onHit(callback) {
    this._onHit = callback;
  }

  onMiss(callback) {
    this._onMiss = callback;
  }

  onWrite(callback) {
    this._onWrite = callback;
  }

  onEviction(callback) {
    this._onEviction = callback;
  }
}

// Export convenience functions
export async function createCache(options = {}) {
  const cache = new PackCache(options);
  await cache._init();
  return cache;
}

export function createMemoryOnlyCache(options = {}) {
  return new PackCache({
    ...options,
    cacheDir: null, // Disable disk cache
    compression: false,
  });
}
