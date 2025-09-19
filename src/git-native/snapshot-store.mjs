import { promises as fs } from "fs";
import { join, dirname } from "path";
import { createHash } from "crypto";
import { exec } from "child_process";
import { promisify } from "util";
import { useLog } from "../composables/log.mjs";

const execAsync = promisify(exec);

/**
 * Content-addressed snapshot cache (sharded on disk), keyed by SHA-256 of payload.
 * Each snapshot records key, contentHash, metadata, commit, and branch.
 */
export class SnapshotStore {
  /**
   * @param {{cwd?:string,logger?:Console,snapshot?:import("../types.js").SnapshotOptions}} [options]
   */
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.logger = options.logger || useLog("SnapshotStore");
    this.config = options.snapshot || {};

    // Configuration
    this.cacheDir = this.config.cacheDir || ".gitvan/cache";
    this.tempDir = this.config.tempDir || ".gitvan/tmp";
    this.maxCacheSize = this.config.maxCacheSize || 1073741824; // 1GB
    this.compressionEnabled = this.config.compressionEnabled !== false;

    // Statistics
    this._stats = {
      hits: 0,
      misses: 0,
      size: 0,
      entries: 0,
      hitRate: 0,
      maxSize: this.maxCacheSize,
      sizeMB: 0,
    };

    this._initialized = false;
  }

  /**
   * Initialize snapshot store.
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this._initialized) return;

    this.logger.info("Initializing SnapshotStore...");

    // Create cache directories
    await this._ensureDir(join(this.cwd, this.cacheDir));
    await this._ensureDir(join(this.cwd, this.tempDir));

    // Load existing cache statistics
    await this._loadCacheStats();

    this._initialized = true;
    this.logger.info("SnapshotStore initialized successfully");
  }

  /**
   * Store payload under deterministic content hash.
   * @param {string} key
   * @param {any} data
   * @param {Record<string,any>} [metadata]
   * @returns {Promise<string>} contentHash
   */
  async storeSnapshot(key, data, metadata = {}) {
    await this._ensureInitialized();

    const contentHash = this._computeContentHash(data);
    const snapshotPath = this._getSnapshotPath(contentHash);

    // Create snapshot header
    const header = {
      key,
      contentHash,
      timestamp: Date.now(),
      metadata,
      commit: await this._getCurrentCommit(),
      branch: await this._getCurrentBranch(),
    };

    // Store snapshot data
    const snapshotData = {
      header,
      data,
    };

    // Write to disk
    await fs.writeFile(snapshotPath, JSON.stringify(snapshotData, null, 2));

    // Update statistics
    this._stats.entries++;
    this._stats.size += JSON.stringify(snapshotData).length;
    this._stats.sizeMB = this._stats.size / (1024 * 1024);

    this.logger.debug(`Stored snapshot: ${key} (${contentHash})`);

    return contentHash;
  }

  /**
   * Retrieve payload by key or key+hash.
   * @param {string} key
   * @param {string|null} [contentHash]
   * @returns {Promise<any|null>}
   */
  async getSnapshot(key, contentHash = null) {
    await this._ensureInitialized();

    if (contentHash) {
      // Direct lookup by content hash
      const snapshotPath = this._getSnapshotPath(contentHash);
      try {
        const snapshotData = await this._loadSnapshot(snapshotPath);
        if (snapshotData.header.key === key) {
          this._stats.hits++;
          this._updateHitRate();
          return snapshotData.data;
        }
      } catch (error) {
        this.logger.debug(`Snapshot not found: ${contentHash}`);
      }
    } else {
      // Search by key
      const snapshots = await this.listSnapshots();
      const matchingSnapshot = snapshots.find((s) => s.key === key);

      if (matchingSnapshot) {
        return this.getSnapshot(key, matchingSnapshot.contentHash);
      }
    }

    this._stats.misses++;
    this._updateHitRate();
    return null;
  }

  /**
   * Snapshot existence check.
   * @param {string} key
   * @param {string|null} [contentHash]
   * @returns {Promise<boolean>}
   */
  async hasSnapshot(key, contentHash = null) {
    const snapshot = await this.getSnapshot(key, contentHash);
    return snapshot !== null;
  }

  /**
   * Remove a snapshot.
   * @param {string} key
   * @param {string|null} [contentHash]
   * @returns {Promise<boolean>}
   */
  async removeSnapshot(key, contentHash = null) {
    await this._ensureInitialized();

    if (contentHash) {
      const snapshotPath = this._getSnapshotPath(contentHash);
      try {
        const snapshotData = await this._loadSnapshot(snapshotPath);
        if (snapshotData.header.key === key) {
          await fs.unlink(snapshotPath);

          // Update statistics
          this._stats.entries--;
          this._stats.size -= JSON.stringify(snapshotData).length;
          this._stats.sizeMB = this._stats.size / (1024 * 1024);

          this.logger.debug(`Removed snapshot: ${key} (${contentHash})`);
          return true;
        }
      } catch (error) {
        this.logger.debug(`Failed to remove snapshot: ${contentHash}`);
      }
    } else {
      const snapshots = await this.listSnapshots();
      const matchingSnapshot = snapshots.find((s) => s.key === key);

      if (matchingSnapshot) {
        return this.removeSnapshot(key, matchingSnapshot.contentHash);
      }
    }

    return false;
  }

  /**
   * List snapshot headers (no payload).
   * @returns {Promise<Array<import("../types.js").SnapshotHeader>>}
   */
  async listSnapshots() {
    await this._ensureInitialized();

    const cacheDir = join(this.cwd, this.cacheDir);
    const snapshots = [];

    try {
      const files = await fs.readdir(cacheDir);

      for (const file of files) {
        if (!file.endsWith(".json")) continue;

        const filePath = join(cacheDir, file);
        try {
          const snapshotData = await this._loadSnapshot(filePath);
          snapshots.push(snapshotData.header);
        } catch (error) {
          this.logger.warn(
            `Failed to load snapshot file ${file}: ${error.message}`
          );
        }
      }
    } catch (error) {
      this.logger.debug(`No snapshots found: ${error.message}`);
    }

    return snapshots.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Cache statistics (and derived rates).
   * @returns {import("../types.js").SnapshotStats}
   */
  getStatistics() {
    return { ...this._stats };
  }

  /**
   * TTL + size-cap cleanup.
   * @param {number} [maxAgeMs=86400000]
   * @returns {Promise<number>} removed
   */
  async cleanupCache(maxAgeMs = 24 * 60 * 60 * 1000) {
    await this._ensureInitialized();

    const now = Date.now();
    const snapshots = await this.listSnapshots();
    let removedCount = 0;

    // Remove old snapshots
    for (const snapshot of snapshots) {
      // Safety check for snapshot structure
      if (!snapshot || typeof snapshot.timestamp !== "number") {
        this.logger.warn(
          `Skipping invalid snapshot: ${JSON.stringify(snapshot)}`
        );
        continue;
      }

      if (now - snapshot.timestamp > maxAgeMs) {
        if (await this.removeSnapshot(snapshot.key, snapshot.contentHash)) {
          removedCount++;
        }
      }
    }

    // Remove excess snapshots if over size limit
    if (this._stats.size > this.maxCacheSize) {
      const sortedSnapshots = snapshots.sort(
        (a, b) => a.timestamp - b.timestamp
      );

      while (
        this._stats.size > this.maxCacheSize &&
        sortedSnapshots.length > 0
      ) {
        const oldest = sortedSnapshots.shift();
        if (await this.removeSnapshot(oldest.key, oldest.contentHash)) {
          removedCount++;
        }
      }
    }

    if (removedCount > 0) {
      this.logger.info(`Cleaned up ${removedCount} snapshots`);
    }

    return removedCount;
  }

  /**
   * Nuke all cache entries and reset counters.
   * @returns {Promise<number>} removed
   */
  async clearCache() {
    await this._ensureInitialized();

    const cacheDir = join(this.cwd, this.cacheDir);
    let removedCount = 0;

    try {
      const files = await fs.readdir(cacheDir);

      for (const file of files) {
        if (file.endsWith(".json")) {
          await fs.unlink(join(cacheDir, file));
          removedCount++;
        }
      }
    } catch (error) {
      this.logger.debug(`No cache files to clear: ${error.message}`);
    }

    // Reset statistics
    this._stats = {
      hits: 0,
      misses: 0,
      size: 0,
      entries: 0,
      hitRate: 0,
      maxSize: this.maxCacheSize,
      sizeMB: 0,
    };

    this.logger.info(`Cleared ${removedCount} cache entries`);
    return removedCount;
  }

  /**
   * Ensure the system is initialized.
   * @private
   * @returns {Promise<void>}
   */
  async _ensureInitialized() {
    if (!this._initialized) {
      await this.initialize();
    }
  }

  /**
   * Ensure directory exists.
   * @private
   * @param {string} dirPath
   * @returns {Promise<void>}
   */
  async _ensureDir(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code !== "EEXIST") {
        throw error;
      }
    }
  }

  /**
   * Compute content hash for data.
   * @private
   * @param {any} data
   * @returns {string}
   */
  _computeContentHash(data) {
    const hash = createHash("sha256");
    hash.update(JSON.stringify(data));
    return hash.digest("hex");
  }

  /**
   * Get snapshot file path for content hash.
   * @private
   * @param {string} contentHash
   * @returns {string}
   */
  _getSnapshotPath(contentHash) {
    // Shard by first 2 characters of hash
    const shard = contentHash.substring(0, 2);
    const shardDir = join(this.cwd, this.cacheDir, shard);

    // Ensure shard directory exists
    this._ensureDir(shardDir);

    return join(shardDir, `${contentHash}.json`);
  }

  /**
   * Load snapshot data from file.
   * @private
   * @param {string} filePath
   * @returns {Promise<any>}
   */
  async _loadSnapshot(filePath) {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content);
  }

  /**
   * Update hit rate statistics.
   * @private
   * @returns {void}
   */
  _updateHitRate() {
    const total = this._stats.hits + this._stats.misses;
    this._stats.hitRate = total > 0 ? this._stats.hits / total : 0;
  }

  /**
   * Load cache statistics from disk.
   * @private
   * @returns {Promise<void>}
   */
  async _loadCacheStats() {
    const cacheDir = join(this.cwd, this.cacheDir);

    try {
      const files = await fs.readdir(cacheDir);
      let totalSize = 0;
      let entryCount = 0;

      for (const file of files) {
        if (file.endsWith(".json")) {
          const filePath = join(cacheDir, file);
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
          entryCount++;
        }
      }

      this._stats.size = totalSize;
      this._stats.entries = entryCount;
      this._stats.sizeMB = totalSize / (1024 * 1024);
    } catch (error) {
      this.logger.debug(`No existing cache found: ${error.message}`);
    }
  }

  /**
   * Get current commit hash.
   * @private
   * @returns {Promise<string>}
   */
  async _getCurrentCommit() {
    try {
      const { stdout } = await execAsync("git rev-parse HEAD", {
        cwd: this.cwd,
      });
      return stdout.trim();
    } catch (error) {
      return "unknown";
    }
  }

  /**
   * Get current branch name.
   * @private
   * @returns {Promise<string>}
   */
  async _getCurrentBranch() {
    try {
      const { stdout } = await execAsync("git branch --show-current", {
        cwd: this.cwd,
      });
      return stdout.trim() || "detached";
    } catch (error) {
      return "unknown";
    }
  }
}
