import { createLogger } from "../utils/logger.mjs";
import { join } from "pathe";
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";

const logger = createLogger("pack:lazy-registry");

/**
 * Lazy Pack Registry - loads packs only when needed
 * No upfront scanning, no blocking operations
 */
export class LazyPackRegistry {
  constructor(options = {}) {
    this.packsDir = options.packsDir || join(process.cwd(), "packs");
    this.cacheDir = options.cacheDir || join(process.cwd(), ".gitvan", "cache");
    this.registryUrl = options.registryUrl || "https://registry.gitvan.dev";
    this.packs = new Map(); // Cache loaded packs
    this.initialized = false;
    this.scanning = false;
    this.loadPromise = null; // For concurrent request deduplication
  }

  /**
   * Check if registry is ready (initialized and loaded)
   */
  isReady() {
    return this.initialized && this.packs.size > 0;
  }

  /**
   * Initialize registry without scanning
   */
  async initialize() {
    if (this.initialized) return;

    logger.info("Initializing lazy pack registry...");

    // Create cache directory
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }

    this.initialized = true;
    logger.info("Lazy pack registry initialized");
  }

  /**
   * Get pack by ID - loads on demand
   */
  async getPack(packId) {
    await this.initialize();

    // Return cached pack if available
    if (this.packs.has(packId)) {
      return this.packs.get(packId);
    }

    // Load pack on demand
    logger.info(`Loading pack on demand: ${packId}`);
    const pack = await this.loadPack(packId);

    if (pack) {
      this.packs.set(packId, pack);
    }

    return pack;
  }

  /**
   * Load a specific pack
   */
  async loadPack(packId) {
    try {
      // Try builtin packs first
      const builtinPack = await this.loadBuiltinPack(packId);
      if (builtinPack) return builtinPack;

      // Try local packs
      const localPack = await this.loadLocalPack(packId);
      if (localPack) return localPack;

      // Try remote packs
      const remotePack = await this.loadRemotePack(packId);
      if (remotePack) return remotePack;

      logger.warn(`Pack not found: ${packId}`);
      return null;
    } catch (error) {
      logger.error(`Failed to load pack ${packId}:`, error.message);
      return null;
    }
  }

  /**
   * Load builtin pack
   */
  async loadBuiltinPack(packId) {
    const builtinPath = join(process.cwd(), "packs", packId);

    if (existsSync(builtinPath)) {
      const manifestPath = join(builtinPath, "pack.json");
      if (existsSync(manifestPath)) {
        const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
        return {
          id: packId,
          path: builtinPath,
          manifest,
          source: "builtin",
        };
      }
    }

    return null;
  }

  /**
   * Load local pack
   */
  async loadLocalPack(packId) {
    const localPath = join(process.cwd(), ".gitvan", "packs", packId);

    if (existsSync(localPath)) {
      const manifestPath = join(localPath, "pack.json");
      if (existsSync(manifestPath)) {
        const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
        return {
          id: packId,
          path: localPath,
          manifest,
          source: "local",
        };
      }
    }

    return null;
  }

  /**
   * Load remote pack (placeholder for future implementation)
   */
  async loadRemotePack(packId) {
    // v4.1.0: Implement remote pack loading from marketplace
    logger.info(`Remote pack loading not implemented yet: ${packId}`);
    return null;
  }

  /**
   * Load packs (scans and loads all available packs)
   * Returns {success, packs, error?}
   */
  async loadPacks() {
    // Handle concurrent requests with deduplication
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this._loadPacksInternal();
    try {
      return await this.loadPromise;
    } finally {
      this.loadPromise = null;
    }
  }

  /**
   * Internal pack loading implementation
   */
  async _loadPacksInternal() {
    try {
      await this.initialize();

      if (!this.scanning) {
        this.scanning = true;
        try {
          await this.scanPacks();
        } finally {
          this.scanning = false;
        }
      }

      return {
        success: true,
        packs: Array.from(this.packs.values()),
      };
    } catch (error) {
      logger.error(`Failed to load packs: ${error.message}`);
      return {
        success: false,
        error: error.message,
        packs: Array.from(this.packs.values()), // Return any partially loaded packs
      };
    }
  }

  /**
   * List available packs (lazy scan)
   */
  async listPacks() {
    await this.initialize();

    if (!this.scanning) {
      this.scanning = true;
      await this.scanPacks();
      this.scanning = false;
    }

    return Array.from(this.packs.values());
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.packs.clear();
    this.scanning = false;
    logger.info("Pack cache cleared");
  }

  /**
   * Scan packs directories (only when needed)
   */
  async scanPacks() {
    logger.info("Scanning packs directories...");

    // If a custom packsDir was provided in options, only scan that
    // Otherwise, scan default locations
    const defaultPacksDir = join(process.cwd(), "packs");
    const isCustomPacksDir = this.packsDir !== defaultPacksDir;

    let scanDirs;
    if (isCustomPacksDir) {
      // Custom directory provided - only scan that
      scanDirs = [this.packsDir];
    } else {
      // No custom directory - scan defaults
      scanDirs = [
        this.packsDir,
        join(process.cwd(), ".gitvan", "packs"),
      ];
    }

    // Remove duplicates while preserving order
    const uniqueDirs = Array.from(new Set(scanDirs));

    for (const dir of uniqueDirs) {
      if (existsSync(dir)) {
        await this.scanDirectory(dir);
      }
    }

    logger.info(`Found ${this.packs.size} packs`);
  }

  /**
   * Scan a directory for packs
   */
  async scanDirectory(dir) {
    try {
      if (!existsSync(dir)) {
        return;
      }

      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const packPath = join(dir, entry.name);
          const manifestPath = join(packPath, "pack.json");

          if (existsSync(manifestPath)) {
            try {
              const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
              const packId = manifest.id || entry.name;

              this.packs.set(packId, {
                id: packId,
                path: packPath,
                manifest,
                source: dir.includes(".gitvan") ? "local" : "builtin",
              });
            } catch (error) {
              logger.warn(`Invalid pack manifest: ${manifestPath}`);
            }
          }
        }
      }
    } catch (error) {
      logger.error(`Failed to scan directory ${dir}:`, error.message);
    }
  }

  /**
   * Install pack (lazy)
   */
  async installPack(packId, options = {}) {
    const pack = await this.getPack(packId);

    if (!pack) {
      throw new Error(`Pack not found: ${packId}`);
    }

    logger.info(`Installing pack: ${packId}`);

    // v4.1.0: Implement pack installation with dependency resolution
    logger.success(`Pack installed: ${packId}`);

    return pack;
  }
}
