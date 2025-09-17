import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'pathe';
import { createLogger } from '../../utils/logger.mjs';

export class PackCache {
  constructor(options = {}) {
    this.options = options;
    this.logger = createLogger('pack:cache');
    this.cacheDir = options.cacheDir || '.gitvan/cache';
    this.ttl = options.ttl || 3600000; // 1 hour default
    this.maxSize = options.maxSize || 100 * 1024 * 1024; // 100MB
    this.cache = new Map();
    this.keyTypeMap = new Map(); // Track which keys belong to which types
    this.stats = {
      hits: 0,
      misses: 0,
      writes: 0,
      evictions: 0
    };
  }

  sortObjectKeys(obj) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      return obj;
    }

    const sorted = {};
    Object.keys(obj).sort().forEach(key => {
      sorted[key] = this.sortObjectKeys(obj[key]);
    });
    return sorted;
  }

  generateKey(type, data) {
    // Sort keys to ensure consistent hashing
    const sortedData = this.sortObjectKeys(data);
    const input = JSON.stringify({ type, data: sortedData });
    const key = createHash('sha256').update(input).digest('hex').slice(0, 16);

    // Track type for this key
    this.keyTypeMap.set(key, type);

    return key;
  }

  async get(type, data) {
    const key = this.generateKey(type, data);

    // Check memory cache first
    if (this.cache.has(key)) {
      const entry = this.cache.get(key);
      if (Date.now() - entry.timestamp < this.ttl) {
        this.stats.hits++;
        this.logger.debug(`Cache hit: ${key}`);
        return entry.value;
      } else {
        this.cache.delete(key);
        this.keyTypeMap.delete(key);
      }
    }

    // Check disk cache
    const cachePath = join(this.cacheDir, type, `${key}.json`);
    if (existsSync(cachePath)) {
      try {
        const content = JSON.parse(readFileSync(cachePath, 'utf8'));
        if (Date.now() - content.timestamp < this.ttl) {
          this.cache.set(key, content);
          this.keyTypeMap.set(key, type);
          this.stats.hits++;
          this.logger.debug(`Disk cache hit: ${key}`);
          return content.value;
        }
      } catch (e) {
        this.logger.warn(`Invalid cache file: ${cachePath}`);
      }
    }

    this.stats.misses++;
    return null;
  }

  async set(type, data, value) {
    const key = this.generateKey(type, data);
    const entry = {
      value,
      timestamp: Date.now(),
      size: JSON.stringify(value).length
    };

    // Check size limit
    if (entry.size > this.maxSize / 10) {
      this.logger.warn(`Cache entry too large: ${entry.size} bytes`);
      return;
    }

    // Store in memory
    this.cache.set(key, entry);
    this.keyTypeMap.set(key, type);

    // Store on disk
    const cacheDir = join(this.cacheDir, type);
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }

    const cachePath = join(cacheDir, `${key}.json`);
    writeFileSync(cachePath, JSON.stringify(entry, null, 2));

    this.stats.writes++;
    this.logger.debug(`Cache write: ${key}`);

    // Evict old entries if needed
    await this.evictIfNeeded();
  }

  async evictIfNeeded() {
    const totalSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);

    if (totalSize > this.maxSize) {
      // Evict oldest entries
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      let evicted = 0;
      let currentSize = totalSize;

      for (const [key, entry] of entries) {
        if (currentSize <= this.maxSize * 0.8) break;

        this.cache.delete(key);
        this.keyTypeMap.delete(key);
        currentSize -= entry.size;
        evicted++;
      }

      this.stats.evictions += evicted;
      this.logger.debug(`Evicted ${evicted} cache entries`);
    }
  }

  async clear(type = null) {
    if (type) {
      // Clear specific type from memory cache
      const keysToDelete = [];
      for (const [key, keyType] of this.keyTypeMap.entries()) {
        if (keyType === type) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach(key => {
        this.cache.delete(key);
        this.keyTypeMap.delete(key);
      });

      // Clear disk cache
      const cacheDir = join(this.cacheDir, type);
      if (existsSync(cacheDir)) {
        const { rmSync } = await import('node:fs');
        rmSync(cacheDir, { recursive: true, force: true });
      }
    } else {
      // Clear all
      this.cache.clear();
      this.keyTypeMap.clear();

      if (existsSync(this.cacheDir)) {
        const { rmSync } = await import('node:fs');
        rmSync(this.cacheDir, { recursive: true, force: true });
      }
    }

    this.logger.info('Cache cleared');
  }

  getStats() {
    const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) || 0;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) + '%',
      memoryEntries: this.cache.size,
      memorySize: Array.from(this.cache.values())
        .reduce((sum, entry) => sum + entry.size, 0)
    };
  }
}