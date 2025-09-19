/**
 * Pack Loading Module
 * Handles loading, validation, and caching of pack data
 */

import { createLogger } from "../utils/logger.mjs";
import { sha256Hex, fingerprint } from "../utils/crypto.mjs";
import { join } from "pathe";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { z } from "zod";
import { PackCache } from "./optimization/cache.mjs";

// Input validation schemas
const PackInfoSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-_.\/]+$/),
  name: z.string().min(1).max(200),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().max(500),
  tags: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  source: z
    .object({
      url: z.string().url(),
      hash: z.string().length(64).optional(),
      signature: z.string().optional(),
    })
    .optional(),
});

export class PackLoader {
  constructor(options = {}) {
    this.logger = createLogger("pack:loader");
    this.cacheDir = options.cacheDir || join(homedir(), ".gitvan", "packs");
    this.localPacksDir = options.localPacksDir || join(process.cwd(), "packs");
    this.builtinDir = join(this.localPacksDir, "builtin");

    // Initialize enhanced cache system
    this.packCache = new PackCache({
      cacheDir: join(this.cacheDir, "enhanced"),
      ttl: options.cacheTtl || 3600000, // 1 hour
      maxSize: options.cacheMaxSize || 200 * 1024 * 1024, // 200MB
      compression: options.cacheCompression !== false,
    });

    this.initializeCache();
  }

  /**
   * Initialize cache directory
   */
  initializeCache() {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Load pack from local filesystem
   * @param {string} packId Pack identifier
   * @returns {Object|null} Loaded pack data or null if not found
   */
  async loadLocalPack(packId) {
    try {
      // Check cache first
      const cacheKey = { packId, operation: "loadLocal" };
      const cached = await this.packCache.get("pack-load", cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for local pack: ${packId}`);
        return cached;
      }

      const packPath = this.resolvePackPath(packId);
      if (!packPath) {
        return null;
      }

      const packData = this.loadPackFromPath(packPath);
      if (packData) {
        // Cache the result
        await this.packCache.set("pack-load", cacheKey, packData);
      }

      return packData;
    } catch (error) {
      this.logger.error(`Failed to load local pack ${packId}:`, error);
      return null;
    }
  }

  /**
   * Load pack from remote registry
   * @param {string} packId Pack identifier
   * @returns {Object|null} Loaded pack data or null if not found
   */
  async loadRemotePack(packId) {
    try {
      // Check cache first
      const cacheKey = { packId, operation: "loadRemote" };
      const cached = await this.packCache.get("pack-load", cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for remote pack: ${packId}`);
        return cached;
      }

      // TODO: Implement actual remote pack loading
      // For now, return null as remote loading is not implemented
      this.logger.warn(`Remote pack loading not implemented: ${packId}`);
      return null;
    } catch (error) {
      this.logger.error(`Failed to load remote pack ${packId}:`, error);
      return null;
    }
  }

  /**
   * Resolve pack path from pack ID
   * @param {string} packId Pack identifier
   * @returns {string|null} Path to pack or null if not found
   */
  resolvePackPath(packId) {
    // Check local packs
    const localPath = join(this.localPacksDir, packId);
    if (existsSync(localPath)) {
      return localPath;
    }

    // Check builtin packs
    const builtinPath = join(this.builtinDir, packId);
    if (existsSync(builtinPath)) {
      return builtinPath;
    }

    return null;
  }

  /**
   * Load pack data from filesystem path
   * @param {string} packPath Path to pack directory
   * @returns {Object|null} Pack data or null if invalid
   */
  loadPackFromPath(packPath) {
    try {
      const packJsonPath = join(packPath, "pack.json");

      if (!existsSync(packJsonPath)) {
        this.logger.warn(`pack.json not found in ${packPath}`);
        return null;
      }

      const packJson = JSON.parse(readFileSync(packJsonPath, "utf8"));

      // Validate pack data
      const validationResult = PackInfoSchema.safeParse(packJson);
      if (!validationResult.success) {
        this.logger.warn(
          `Invalid pack.json in ${packPath}:`,
          validationResult.error
        );
        return null;
      }

      const packData = validationResult.data;

      // Add metadata
      packData.path = packPath;
      packData.hash = this.calculatePackHash(packPath);
      packData.fingerprint = fingerprint(packData);

      return packData;
    } catch (error) {
      this.logger.error(`Failed to load pack from ${packPath}:`, error);
      return null;
    }
  }

  /**
   * Calculate hash for pack directory
   * @param {string} packPath Path to pack directory
   * @returns {string} SHA256 hash of pack contents
   */
  calculatePackHash(packPath) {
    try {
      // Simple hash calculation based on pack.json content
      const packJsonPath = join(packPath, "pack.json");
      if (existsSync(packJsonPath)) {
        const content = readFileSync(packJsonPath, "utf8");
        return sha256Hex(content);
      }
      return "";
    } catch (error) {
      this.logger.warn(`Failed to calculate hash for ${packPath}:`, error);
      return "";
    }
  }

  /**
   * Validate pack data against schema
   * @param {Object} packData Pack data to validate
   * @returns {Object} Validation result with success flag and data/error
   */
  validatePackData(packData) {
    try {
      const result = PackInfoSchema.safeParse(packData);
      return {
        success: result.success,
        data: result.success ? result.data : null,
        error: result.success ? null : result.error,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error,
      };
    }
  }

  /**
   * Save pack data to cache
   * @param {string} packId Pack identifier
   * @param {Object} packData Pack data to cache
   */
  async saveToCache(packId, packData) {
    try {
      const cacheKey = { packId, operation: "save" };
      await this.packCache.set("pack-save", cacheKey, packData);
    } catch (error) {
      this.logger.warn(`Failed to save pack to cache: ${packId}`, error);
    }
  }

  /**
   * Clear pack cache
   * @param {string} packId Optional pack ID to clear specific pack
   */
  async clearCache(packId = null) {
    try {
      if (packId) {
        const cacheKey = { packId, operation: "clear" };
        await this.packCache.delete("pack-clear", cacheKey);
      } else {
        await this.packCache.clear();
      }
    } catch (error) {
      this.logger.warn(`Failed to clear pack cache:`, error);
    }
  }
}
