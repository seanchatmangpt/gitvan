/**
 * Pack Discovery Module
 * Handles discovery of packs from various sources (local, builtin, registry)
 */

import { createLogger } from "../utils/logger.mjs";
import { join, resolve } from "pathe";
import { existsSync, readdirSync, statSync, readFileSync } from "node:fs";
import { homedir } from "node:os";

export class PackDiscovery {
  constructor(options = {}) {
    this.logger = createLogger("pack:discovery");
    this.localPacksDir = options.localPacksDir || join(process.cwd(), "packs");
    this.builtinDir = join(this.localPacksDir, "builtin");
    this.cacheDir = options.cacheDir || join(homedir(), ".gitvan", "packs");
  }

  /**
   * Discover all available packs from local filesystem
   * @returns {Array} Array of discovered pack information
   */
  discoverLocalPacks() {
    const packs = [];

    if (!existsSync(this.localPacksDir)) {
      this.logger.debug("Local packs directory does not exist");
      return packs;
    }

    try {
      const entries = readdirSync(this.localPacksDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const packPath = join(this.localPacksDir, entry.name);
          const packInfo = this.readPackInfo(packPath);

          if (packInfo) {
            packs.push({
              ...packInfo,
              source: "local",
              path: packPath,
            });
          }
        }
      }
    } catch (error) {
      this.logger.error("Failed to discover local packs:", error);
    }

    return packs;
  }

  /**
   * Discover builtin packs
   * @returns {Array} Array of builtin pack information
   */
  discoverBuiltinPacks() {
    const packs = [];

    if (!existsSync(this.builtinDir)) {
      this.logger.debug("Builtin packs directory does not exist");
      return packs;
    }

    try {
      const entries = readdirSync(this.builtinDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const packPath = join(this.builtinDir, entry.name);
          const packInfo = this.readPackInfo(packPath);

          if (packInfo) {
            packs.push({
              ...packInfo,
              source: "builtin",
              path: packPath,
            });
          }
        }
      }
    } catch (error) {
      this.logger.error("Failed to discover builtin packs:", error);
    }

    return packs;
  }

  /**
   * Read pack information from a directory
   * @param {string} packPath Path to pack directory
   * @returns {Object|null} Pack information or null if invalid
   */
  readPackInfo(packPath) {
    try {
      const packJsonPath = join(packPath, "pack.json");

      if (!existsSync(packJsonPath)) {
        return null;
      }

      const packJson = JSON.parse(readFileSync(packJsonPath, "utf8"));

      // Validate basic pack structure
      if (!packJson.id || !packJson.name || !packJson.version) {
        this.logger.warn(`Invalid pack.json in ${packPath}`);
        return null;
      }

      return {
        id: packJson.id,
        name: packJson.name,
        version: packJson.version,
        description: packJson.description || "",
        tags: packJson.tags || [],
        capabilities: packJson.capabilities || [],
        category: packJson.category || "general",
        author: packJson.author || "unknown",
      };
    } catch (error) {
      this.logger.warn(
        `Failed to read pack info from ${packPath}:`,
        error.message
      );
      return null;
    }
  }

  /**
   * Resolve a pack ID to its local path
   * @param {string} packId Pack identifier
   * @returns {string|null} Path to pack or null if not found
   */
  resolveLocalPack(packId) {
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
   * Get all available pack sources
   * @returns {Object} Object with pack arrays by source
   */
  getAllPacks() {
    return {
      local: this.discoverLocalPacks(),
      builtin: this.discoverBuiltinPacks(),
    };
  }
}
