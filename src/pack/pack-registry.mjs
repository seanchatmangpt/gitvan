// GitVan v3.0.0 - Pack Registry Core
// Core pack registry functionality

import { createLogger } from "../utils/logger.mjs";
import { sha256Hex, fingerprint } from "../utils/crypto.mjs";
import { join, resolve, dirname } from "pathe";
import {
import { homedir } from "node:os";
import { z } from "zod";
import { execSync } from "node:child_process";
import { exec } from "node:child_process";
import { setTimeout } from "node:timers/promises";
import { PackCache } from "./optimization/cache.mjs";
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

export { PackRegistry };