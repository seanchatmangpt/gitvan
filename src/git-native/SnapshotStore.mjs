// src/git-native/SnapshotStore.mjs
// Git-Native Snapshot Store with content-addressed storage

import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";

/**
 * Git-Native Snapshot Store
 * Manages content-addressed cache directories with BLAKE3 keys
 */
export class SnapshotStore {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.logger = options.logger || console;

    // Snapshot configuration
    this.config = {
      cacheDir: ".gitvan/cache",
      tempDir: ".gitvan/tmp",
      maxCacheSize: 1024 * 1024 * 1024, // 1GB default
      compressionEnabled: true,
      ...options.snapshot,
    };

    // Cache statistics
    this.cacheStats = {
      hits: 0,
      misses: 0,
      size: 0,
      entries: 0,
    };
  }

  /**
   * Store a snapshot
   * @param {string} key - Cache key
   * @param {any} data - Data to store
   * @param {object} metadata - Additional metadata
   * @returns {Promise<string>} Content hash
   */
  async storeSnapshot(key, data, metadata = {}) {
    const contentHash = this._generateContentHash(data);
    const cachePath = this._getCachePath(contentHash);

    try {
      // Create cache directory
      await fs.mkdir(cachePath, { recursive: true });

      // Prepare snapshot data
      const snapshot = {
        key,
        contentHash,
        timestamp: Date.now(),
        metadata,
        data,
        commit: await this._getCurrentCommit(),
        branch: await this._getCurrentBranch(),
      };

      // Write snapshot file
      const snapshotFile = join(cachePath, "snapshot.json");
      const tempFile = `${snapshotFile}.tmp`;

      await fs.writeFile(tempFile, JSON.stringify(snapshot, null, 2));
      await fs.rename(tempFile, snapshotFile);

      // Update cache statistics
      this.cacheStats.entries++;
      this.cacheStats.size += JSON.stringify(snapshot).length;

      this.logger.debug(`Stored snapshot ${key} with hash ${contentHash}`);
      return contentHash;
    } catch (error) {
      this.logger.error(`Failed to store snapshot ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieve a snapshot
   * @param {string} key - Cache key
   * @param {string} contentHash - Content hash (optional)
   * @returns {Promise<any>} Stored data or null if not found
   */
  async getSnapshot(key, contentHash = null) {
    try {
      if (contentHash) {
        // Direct lookup by content hash
        const cachePath = this._getCachePath(contentHash);
        const snapshotFile = join(cachePath, "snapshot.json");

        if (await this._fileExists(snapshotFile)) {
          const snapshot = JSON.parse(await fs.readFile(snapshotFile, "utf8"));
          if (snapshot.key === key) {
            this.cacheStats.hits++;
            return snapshot.data;
          }
        }
      } else {
        // Search by key
        const cacheDir = join(this.cwd, this.config.cacheDir);
        const entries = await fs.readdir(cacheDir);

        for (const entry of entries) {
          const cachePath = join(cacheDir, entry);
          const snapshotFile = join(cachePath, "snapshot.json");

          if (await this._fileExists(snapshotFile)) {
            const snapshot = JSON.parse(
              await fs.readFile(snapshotFile, "utf8")
            );
            if (snapshot.key === key) {
              this.cacheStats.hits++;
              return snapshot.data;
            }
          }
        }
      }

      this.cacheStats.misses++;
      return null;
    } catch (error) {
      this.logger.error(`Failed to get snapshot ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * Check if a snapshot exists
   * @param {string} key - Cache key
   * @param {string} contentHash - Content hash (optional)
   * @returns {Promise<boolean>} True if snapshot exists
   */
  async hasSnapshot(key, contentHash = null) {
    const snapshot = await this.getSnapshot(key, contentHash);
    return snapshot !== null;
  }

  /**
   * Remove a snapshot
   * @param {string} key - Cache key
   * @param {string} contentHash - Content hash (optional)
   * @returns {Promise<boolean>} True if snapshot was removed
   */
  async removeSnapshot(key, contentHash = null) {
    try {
      if (contentHash) {
        // Direct removal by content hash
        const cachePath = this._getCachePath(contentHash);
        const snapshotFile = join(cachePath, "snapshot.json");

        if (await this._fileExists(snapshotFile)) {
          const snapshot = JSON.parse(await fs.readFile(snapshotFile, "utf8"));
          if (snapshot.key === key) {
            await fs.rm(cachePath, { recursive: true, force: true });
            this.cacheStats.entries--;
            this.cacheStats.size -= JSON.stringify(snapshot).length;
            return true;
          }
        }
      } else {
        // Search and remove by key
        const cacheDir = join(this.cwd, this.config.cacheDir);
        const entries = await fs.readdir(cacheDir);

        for (const entry of entries) {
          const cachePath = join(cacheDir, entry);
          const snapshotFile = join(cachePath, "snapshot.json");

          if (await this._fileExists(snapshotFile)) {
            const snapshot = JSON.parse(
              await fs.readFile(snapshotFile, "utf8")
            );
            if (snapshot.key === key) {
              await fs.rm(cachePath, { recursive: true, force: true });
              this.cacheStats.entries--;
              this.cacheStats.size -= JSON.stringify(snapshot).length;
              return true;
            }
          }
        }
      }

      return false;
    } catch (error) {
      this.logger.error(`Failed to remove snapshot ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * List all snapshots
   * @returns {Promise<Array>} Array of snapshot information
   */
  async listSnapshots() {
    const snapshots = [];

    try {
      const cacheDir = join(this.cwd, this.config.cacheDir);
      const entries = await fs.readdir(cacheDir);

      for (const entry of entries) {
        const cachePath = join(cacheDir, entry);
        const snapshotFile = join(cachePath, "snapshot.json");

        if (await this._fileExists(snapshotFile)) {
          const snapshot = JSON.parse(await fs.readFile(snapshotFile, "utf8"));
          snapshots.push({
            key: snapshot.key,
            contentHash: snapshot.contentHash,
            timestamp: snapshot.timestamp,
            metadata: snapshot.metadata,
            commit: snapshot.commit,
            branch: snapshot.branch,
          });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to list snapshots: ${error.message}`);
    }

    return snapshots;
  }

  /**
   * Get cache statistics
   * @returns {object} Cache statistics
   */
  getStatistics() {
    return {
      ...this.cacheStats,
      hitRate:
        this.cacheStats.hits /
          (this.cacheStats.hits + this.cacheStats.misses) || 0,
      maxSize: this.config.maxCacheSize,
      sizeMB: Math.round((this.cacheStats.size / (1024 * 1024)) * 100) / 100,
    };
  }

  /**
   * Clean up cache based on size limits
   * @param {number} maxAge - Maximum age in milliseconds
   * @returns {Promise<number>} Number of entries cleaned up
   */
  async cleanupCache(maxAge = 24 * 60 * 60 * 1000) {
    // 24 hours default
    let cleaned = 0;
    const now = Date.now();

    try {
      const snapshots = await this.listSnapshots();

      // Sort by timestamp (oldest first)
      snapshots.sort((a, b) => a.timestamp - b.timestamp);

      for (const snapshot of snapshots) {
        const age = now - snapshot.timestamp;

        // Remove old entries
        if (age > maxAge) {
          await this.removeSnapshot(snapshot.key, snapshot.contentHash);
          cleaned++;
        }
      }

      // If still over size limit, remove oldest entries
      if (this.cacheStats.size > this.config.maxCacheSize) {
        const remainingSnapshots = await this.listSnapshots();
        remainingSnapshots.sort((a, b) => a.timestamp - b.timestamp);

        while (
          this.cacheStats.size > this.config.maxCacheSize &&
          remainingSnapshots.length > 0
        ) {
          const snapshot = remainingSnapshots.shift();
          await this.removeSnapshot(snapshot.key, snapshot.contentHash);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        this.logger.info(`Cleaned up ${cleaned} cache entries`);
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup cache: ${error.message}`);
    }

    return cleaned;
  }

  /**
   * Clear all cache entries
   * @returns {Promise<number>} Number of entries cleared
   */
  async clearCache() {
    let cleared = 0;

    try {
      const cacheDir = join(this.cwd, this.config.cacheDir);
      const entries = await fs.readdir(cacheDir);

      for (const entry of entries) {
        const cachePath = join(cacheDir, entry);
        await fs.rm(cachePath, { recursive: true, force: true });
        cleared++;
      }

      // Reset statistics
      this.cacheStats = {
        hits: 0,
        misses: 0,
        size: 0,
        entries: 0,
      };

      this.logger.info(`Cleared ${cleared} cache entries`);
    } catch (error) {
      this.logger.error(`Failed to clear cache: ${error.message}`);
    }

    return cleared;
  }

  /**
   * Generate content hash
   * @private
   */
  _generateContentHash(data) {
    const content = JSON.stringify(data);
    return createHash("sha256").update(content).digest("hex");
  }

  /**
   * Get cache path for content hash
   * @private
   */
  _getCachePath(contentHash) {
    // Use first 2 characters for directory sharding
    const shard = contentHash.substring(0, 2);
    return join(this.cwd, this.config.cacheDir, shard, contentHash);
  }

  /**
   * Check if file exists
   * @private
   */
  async _fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current commit SHA
   * @private
   */
  async _getCurrentCommit() {
    try {
      return execSync("git rev-parse HEAD", {
        cwd: this.cwd,
        stdio: "pipe",
      })
        .toString()
        .trim();
    } catch (error) {
      return "unknown";
    }
  }

  /**
   * Get current branch name
   * @private
   */
  async _getCurrentBranch() {
    try {
      return execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: this.cwd,
        stdio: "pipe",
      })
        .toString()
        .trim();
    } catch (error) {
      return "unknown";
    }
  }
}

