// GitVan v3.0.0 - Pack Registry Core
// Core pack registry functionality

import { createLogger } from "../utils/logger.mjs";
import { sha256Hex, fingerprint } from "../utils/crypto.mjs";
import { join, resolve, dirname } from "pathe";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  statSync,
  copyFileSync,
  rmSync,
} from "node:fs";
import { homedir } from "node:os";
import { execSync } from "node:child_process";
import { exec } from "node:child_process";
import { setTimeout } from "node:timers/promises";
import { PackCache } from "./pack-cache.mjs";
import Fuse from "fuse.js";
import { PackInfoSchema, SearchFiltersSchema } from "./schemas.mjs";

export class PackRegistry {
  constructor(options = {}) {
    this.options = options;
    this.logger = createLogger("pack:registry");
    this.cacheDir = options.cacheDir || join(homedir(), ".gitvan", "packs");
    this.localPacksDir = options.localPacksDir || join(process.cwd(), "packs");
    this.builtinDir = join(this.localPacksDir, "builtin");
    this.registryUrl = this.validateRegistryUrl(options.registryUrl);
    this.timeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries || 3;
    this.index = null;
    this.searchIndex = null;
    this.fuse = null;
    this.rateLimiter = new Map();
    this.githubToken = process.env.GITHUB_TOKEN || options.githubToken;
    this.githubApiCache = new Map();
    this.githubApiRateLimit = {
      limit: 5000,
      remaining: 5000,
      reset: Date.now() + 60 * 60 * 1000, // 1 hour from now
    };

    // Initialize enhanced cache system
    this.packCache = new PackCache({
      cacheDir: join(this.cacheDir, "enhanced"),
      ttl: options.cacheTtl || 3600000, // 1 hour
      maxSize: options.cacheMaxSize || 200 * 1024 * 1024, // 200MB
      compression: options.cacheCompression !== false,
      warmupKeys: [
        { type: "registry", data: { url: this.registryUrl } },
        { type: "builtin", data: { dir: this.builtinDir } },
      ],
    });

    this.initializeCache();
    this.initializeBuiltins();
  }

  validateRegistryUrl(url) {
    if (!url) {
      return "https://registry.gitvan.dev";
    }

    // Validate URL format
    try {
      const parsedUrl = new URL(url);

      // Only allow HTTPS URLs for security
      if (parsedUrl.protocol !== "https:") {
        this.logger.warn(
          `Insecure registry URL detected: ${url}, falling back to secure default`
        );
        return "https://registry.gitvan.dev";
      }

      return url;
    } catch (error) {
      this.logger.warn(
        `Invalid registry URL: ${url}, falling back to secure default`
      );
      return "https://registry.gitvan.dev";
    }
  }

  async initializeCache() {
    try {
      await this.packCache.initialize();
      this.logger.info("Enhanced pack cache initialized");
    } catch (error) {
      this.logger.warn(`Failed to initialize enhanced cache: ${error.message}`);
    }
  }

  async initializeBuiltins() {
    try {
      if (!existsSync(this.builtinDir)) {
        mkdirSync(this.builtinDir, { recursive: true });
      }
      this.logger.info("Builtin packs directory initialized");
    } catch (error) {
      this.logger.warn(`Failed to initialize builtin directory: ${error.message}`);
    }
  }

  // Core registry methods would go here
  // This is a simplified version - the full implementation would include
  // all the methods from the original registry.mjs file
}