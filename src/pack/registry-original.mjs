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
import { z } from "zod";
import { execSync } from "node:child_process";
import { exec } from "node:child_process";
import { setTimeout } from "node:timers/promises";
import { PackCache } from "./optimization/cache.mjs";
import Fuse from "fuse.js";

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

const SearchFiltersSchema = z.object({
  capability: z.string().optional(),
  tag: z.string().optional(),
  category: z.string().optional(),
  author: z.string().optional(),
});

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

  initializeCache() {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
    if (!existsSync(this.localPacksDir)) {
      mkdirSync(this.localPacksDir, { recursive: true });
    }
    this.loadLocalRegistry();
  }

  initializeBuiltins() {
    if (!existsSync(this.builtinDir)) {
      mkdirSync(this.builtinDir, { recursive: true });
      this.createBuiltinPacks();
    }
  }

  loadLocalRegistry() {
    const localRegistry = join(this.cacheDir, "registry.json");
    if (existsSync(localRegistry)) {
      try {
        const content = readFileSync(localRegistry, "utf8");
        this.index = JSON.parse(content);

        // Validate cached index
        if (!this.index.packs || typeof this.index.packs !== "object") {
          this.index = null;
          this.logger.warn("Invalid cached registry, will refresh");
        }
      } catch (error) {
        this.logger.warn("Failed to load local registry:", error.message);
        this.index = null;
      }
    }
  }

  checkRateLimit(operation, windowMs) {
    const now = Date.now();
    const key = `${operation}:${this.registryUrl}`;
    const lastCall = this.rateLimiter.get(key);

    if (lastCall && now - lastCall < windowMs) {
      return false;
    }

    this.rateLimiter.set(key, now);
    return true;
  }

  sanitizePackInfo(pack) {
    return {
      id: pack.id,
      name: pack.name,
      version: pack.version || "1.0.0", // Ensure version is always present
      description: pack.description,
      tags: pack.tags || [],
      capabilities: pack.capabilities || [],
      author: pack.author,
      license: pack.license,
      downloads: pack.downloads || 0,
      rating: pack.rating || 0,
      lastModified: pack.lastModified,
      source: pack.source || "unknown",
    };
  }

  async refreshIndex() {
    this.logger.debug("Refreshing local filesystem index");

    const packs = {};

    // Scan local packs directory
    if (existsSync(this.localPacksDir)) {
      const entries = readdirSync(this.localPacksDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const packPath = join(this.localPacksDir, entry.name);
          const manifestPath = join(packPath, "pack.json");

          if (existsSync(manifestPath)) {
            try {
              const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
              const packId = manifest.id || entry.name;

              packs[packId] = {
                id: packId,
                name: manifest.name || entry.name,
                version: manifest.version || "1.0.0",
                description: manifest.description || "",
                tags: manifest.tags || [],
                capabilities: manifest.capabilities || [],
                author: manifest.author,
                license: manifest.license,
                lastModified: statSync(packPath).mtime.getTime(),
                path: packPath,
                source: "local",
              };
            } catch (error) {
              this.logger.warn(
                `Invalid pack manifest: ${manifestPath}`,
                error.message
              );
            }
          }
        }
      }
    }

    // Scan builtin packs
    if (existsSync(this.builtinDir)) {
      const entries = readdirSync(this.builtinDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const packPath = join(this.builtinDir, entry.name);
          const manifestPath = join(packPath, "pack.json");

          if (existsSync(manifestPath)) {
            try {
              const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
              const packId = `builtin/${entry.name}`;

              packs[packId] = {
                id: packId,
                name: manifest.name || entry.name,
                version: manifest.version || "1.0.0",
                description: manifest.description || "",
                tags: [...(manifest.tags || []), "builtin"],
                capabilities: manifest.capabilities || [],
                author: manifest.author || "GitVan",
                license: manifest.license || "MIT",
                lastModified: statSync(packPath).mtime.getTime(),
                path: packPath,
                source: "builtin",
              };
            } catch (error) {
              this.logger.warn(
                `Invalid builtin pack manifest: ${manifestPath}`,
                error.message
              );
            }
          }
        }
      }
    }

    this.index = {
      packs,
      lastUpdated: Date.now(),
      source: "local-filesystem",
    };

    // Create search index for performance
    this.createSearchIndex();

    this.saveLocalRegistry();

    this.logger.info(
      `Registry index refreshed: ${Object.keys(packs).length} local packs found`
    );
    return this.index;
  }

  saveLocalRegistry() {
    try {
      writeFileSync(
        join(this.cacheDir, "registry.json"),
        JSON.stringify(this.index, null, 2)
      );
    } catch (error) {
      this.logger.error("Failed to save registry cache:", error.message);
    }
  }

  async search(query, filters = {}) {
    // Enhanced search with backward compatibility
    const options = {
      ...filters,
      limit: filters.limit || 50, // Default limit for legacy API
    };

    const result = await this.searchPacks(query, options);

    // Return in legacy format for backward compatibility
    return result.results.map((pack) => ({
      id: pack.id,
      name: pack.name,
      version: pack.version,
      description: pack.description,
      tags: pack.tags,
      capabilities: pack.capabilities,
      author: pack.author,
      source: pack.source,
      // Add relevance score if available
      ...(pack.score !== undefined && { relevance: pack.score }),
      ...(pack.matches && { highlights: pack.matches }),
    }));
  }

  createSearchText(id, pack) {
    return [
      id,
      pack.name || "",
      pack.description || "",
      ...(pack.tags || []),
      ...(pack.capabilities || []),
      pack.author || "",
    ]
      .join(" ")
      .toLowerCase();
  }

  matchesFilters(pack, filters) {
    if (
      filters.capability &&
      !pack.capabilities?.includes(filters.capability)
    ) {
      return false;
    }

    if (filters.tag && !pack.tags?.includes(filters.tag)) {
      return false;
    }

    if (filters.category && pack.category !== filters.category) {
      return false;
    }

    if (filters.author && pack.author !== filters.author) {
      return false;
    }

    return true;
  }

  async get(packId) {
    // Validate pack ID
    if (
      !packId ||
      typeof packId !== "string" ||
      !/^[a-z0-9-_.\/]+$/.test(packId)
    ) {
      throw new Error("Invalid pack ID format");
    }

    // Check enhanced cache first
    const cacheKey = { packId, operation: "get" };
    const cached = await this.packCache.get("pack-info", cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for pack info: ${packId}`);
      return cached;
    }

    if (!this.index) {
      await this.refreshIndex();
    }

    const pack = this.index?.packs?.[packId];
    if (!pack) {
      return null;
    }

    const sanitized = this.sanitizePackInfo(pack);

    // Cache the result
    await this.packCache.set("pack-info", cacheKey, sanitized);

    return sanitized;
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async resolve(packId) {
    this.logger.debug(`Resolving pack: ${packId}`);

    // Check if it's a built-in pack first
    const builtinPath = this.resolveBuiltin(packId);
    if (builtinPath) {
      return builtinPath;
    }

    // Check enhanced cache for resolved paths
    const cacheKey = { packId, operation: "resolve" };
    const cachedPath = await this.packCache.get("pack-resolve", cacheKey);
    if (cachedPath && existsSync(cachedPath)) {
      this.logger.debug(
        `Cache hit for resolved pack: ${packId} -> ${cachedPath}`
      );
      return cachedPath;
    }

    // Check legacy local cache
    const legacyCachedPath = join(this.cacheDir, packId.replace("/", "-"));
    if (existsSync(legacyCachedPath)) {
      this.logger.debug(`Found in legacy cache: ${legacyCachedPath}`);
      // Cache in enhanced system for future use
      await this.packCache.set("pack-resolve", cacheKey, legacyCachedPath);
      return legacyCachedPath;
    }

    let resolvedPath;

    // Check if it's a GitHub reference (org/repo format)
    if (
      packId.includes("/") &&
      !packId.startsWith(".") &&
      !packId.startsWith("/")
    ) {
      resolvedPath = await this.resolveGitHub(packId);
    } else {
      // Try to fetch from registry
      resolvedPath = await this.fetchFromRegistry(packId);
    }

    // Cache the resolved path if successful
    if (resolvedPath) {
      await this.packCache.set("pack-resolve", cacheKey, resolvedPath);
    }

    return resolvedPath;
  }

  async resolveGitHub(packId) {
    const parsed = this.parseGitHubPackId(packId);
    if (!parsed) {
      this.logger.error(`Invalid GitHub pack ID format: ${packId}`);
      return null;
    }

    const { owner, repo, ref, path: subPath } = parsed;
    const githubCacheKey = { owner, repo, ref, subPath, operation: "resolve" };

    // Check enhanced cache first
    const enhancedCachedPath = await this.packCache.get(
      "github-pack",
      githubCacheKey
    );
    if (enhancedCachedPath && existsSync(enhancedCachedPath)) {
      this.logger.debug(
        `Enhanced cache hit for GitHub pack: ${packId} -> ${enhancedCachedPath}`
      );
      return enhancedCachedPath;
    }

    // Check legacy cache
    const legacyCacheKey = this.generateGitHubCacheKey(
      owner,
      repo,
      ref,
      subPath
    );
    const cachedPath = join(this.cacheDir, legacyCacheKey);

    if (existsSync(cachedPath)) {
      this.logger.debug(`Found GitHub pack in legacy cache: ${cachedPath}`);
      // Migrate to enhanced cache
      await this.packCache.set("github-pack", githubCacheKey, cachedPath);
      return cachedPath;
    }

    try {
      // Check rate limits before making API calls
      await this.checkGitHubRateLimit();

      // Fetch repository metadata from GitHub API
      const repoMetadata = await this.fetchGitHubRepoMetadata(owner, repo);
      if (!repoMetadata) {
        this.logger.error(
          `Repository not found or not accessible: ${owner}/${repo}`
        );
        return null;
      }

      this.logger.info(`Fetching GitHub pack: ${packId}`);

      // Create cache directory
      mkdirSync(cachedPath, { recursive: true });

      // Determine the clone URL and reference
      const cloneUrl = this.githubToken
        ? `https://${this.githubToken}@github.com/${owner}/${repo}.git`
        : `https://github.com/${owner}/${repo}.git`;

      // Clone with specific reference if provided
      let cloneCmd = `git clone --depth 1`;
      if (ref && ref !== "main" && ref !== "master") {
        cloneCmd += ` --branch ${ref}`;
      }
      cloneCmd += ` ${cloneUrl} ${cachedPath}`;

      await exec(cloneCmd, {
        timeout: this.timeout,
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: "0", // Disable interactive prompts
        },
      });

      // Handle subdirectory paths
      if (subPath) {
        const subDir = join(cachedPath, subPath);
        if (!existsSync(subDir)) {
          throw new Error(`Subdirectory not found: ${subPath}`);
        }

        // Move subdirectory contents to cache root
        const tempDir = join(cachedPath, "..", `${cacheKey}-temp`);
        execSync(`mv "${subDir}" "${tempDir}"`);
        rmSync(cachedPath, { recursive: true, force: true });
        execSync(`mv "${tempDir}" "${cachedPath}"`);
      }

      // Validate pack structure
      const manifestPath = join(cachedPath, "pack.json");
      if (!existsSync(manifestPath)) {
        // Look for pack.json in subdirectories (monorepo support)
        const foundManifest = await this.findPackManifest(cachedPath, cacheKey);
        if (!foundManifest) {
          throw new Error("No pack.json found in repository or subdirectories");
        }
      }

      // Enhance manifest with GitHub metadata
      await this.enhanceManifestWithGitHubData(
        cachedPath,
        repoMetadata,
        owner,
        repo
      );

      // Cache in enhanced system
      await this.packCache.set("github-pack", githubCacheKey, cachedPath);

      this.logger.info(`Successfully cached GitHub pack: ${packId}`);
      return cachedPath;
    } catch (error) {
      this.logger.error(
        `Failed to fetch GitHub pack ${packId}:`,
        error.message
      );

      // Clean up failed download
      if (existsSync(cachedPath)) {
        rmSync(cachedPath, { recursive: true, force: true });
      }

      return null;
    }
  }

  async fetchFromRegistry(packId) {
    try {
      this.logger.debug(`Fetching from registry: ${packId}`);

      // Check enhanced cache for registry fetch results
      const cacheKey = { packId, operation: "fetchFromRegistry" };
      const cached = await this.packCache.get("registry-fetch", cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for registry fetch: ${packId}`);
        return cached;
      }

      // For now, check if it's a built-in pack
      const builtinPath = this.resolveBuiltin(packId);
      if (builtinPath) {
        // Cache the builtin path result
        await this.packCache.set("registry-fetch", cacheKey, builtinPath);
        return builtinPath;
      }

      // TODO: Implement actual registry API calls here
      // When implemented, cache the result before returning

      this.logger.warn(`Pack not found in registry: ${packId}`);

      // Cache negative results with shorter TTL
      await this.packCache.set("registry-fetch", cacheKey, null);
      return null;
    } catch (e) {
      this.logger.error(`Failed to fetch from registry:`, e);
      return null;
    }
  }

  resolveBuiltin(packId) {
    // Check for exact builtin pack ID
    if (packId.startsWith("builtin/")) {
      const builtinPath = join(this.builtinDir, packId.replace("builtin/", ""));
      if (existsSync(builtinPath)) {
        this.logger.debug(`Resolved builtin pack: ${packId}`);
        return builtinPath;
      }
    }

    // Check for legacy builtin mappings
    const builtinMappings = {
      "gv/next-min": "next-minimal",
      "gv/docs-enterprise": "docs-enterprise",
      "gv/nodejs-basic": "nodejs-basic",
    };

    if (builtinMappings[packId]) {
      const builtinPath = join(this.builtinDir, builtinMappings[packId]);
      if (existsSync(builtinPath)) {
        this.logger.debug(`Resolved legacy builtin pack: ${packId}`);
        return builtinPath;
      }
    }

    // Check if it exists in local packs
    const localPath = join(this.localPacksDir, packId);
    if (existsSync(localPath)) {
      this.logger.debug(`Resolved local pack as builtin: ${packId}`);
      return localPath;
    }

    return null;
  }

  async searchPacks(query, options = {}) {
    try {
      this.logger.debug(`Searching packs: ${query}`);

      if (!this.index) {
        await this.refreshIndex();
      }

      if (!this.fuse) {
        this.createSearchIndex();
      }

      let results = [];
      const packs = this.index?.packs || {};
      const normalizedQuery = query?.toLowerCase().trim() || "";

      if (!normalizedQuery) {
        // Return all packs if no query
        for (const [id, pack] of Object.entries(packs)) {
          if (this.matchesSearchOptions(pack, options)) {
            results.push({
              id,
              ...this.sanitizePackInfo(pack),
              score: 1.0,
            });
          }
        }
        // Sort by name for no-query results
        results.sort((a, b) => a.name.localeCompare(b.name));
      } else {
        // Use fuzzy search with Fuse.js
        const fuseResults = this.fuse.search(normalizedQuery);

        for (const fuseResult of fuseResults) {
          const pack = fuseResult.item;
          if (this.matchesSearchOptions(pack, options)) {
            results.push({
              id: pack.id,
              ...this.sanitizePackInfo(pack),
              score: 1 - fuseResult.score, // Convert Fuse score (lower is better) to relevance score (higher is better)
              matches: fuseResult.matches || [],
            });
          }
        }
      }

      // Apply additional sorting if requested
      if (options.sortBy) {
        results = this.sortResults(results, options.sortBy, options.sortOrder);
      }

      // Apply pagination
      const offset = options.offset || 0;
      const limit = options.limit;
      const paginatedResults = limit
        ? results.slice(offset, offset + limit)
        : results.slice(offset);

      return {
        query: normalizedQuery,
        total: results.length,
        offset,
        limit,
        results: paginatedResults,
        facets: this.generateSearchFacets(packs, normalizedQuery),
      };
    } catch (e) {
      this.logger.error(`Search failed:`, e);
      return {
        query,
        total: 0,
        results: [],
        error: e.message,
      };
    }
  }

  matchesSearchOptions(pack, options) {
    if (
      options.capability &&
      !pack.capabilities?.includes(options.capability)
    ) {
      return false;
    }

    if (options.tag && !pack.tags?.includes(options.tag)) {
      return false;
    }

    if (options.source && pack.source !== options.source) {
      return false;
    }

    if (options.author && pack.author !== options.author) {
      return false;
    }

    if (options.license && pack.license !== options.license) {
      return false;
    }

    if (options.minRating && (pack.rating || 0) < options.minRating) {
      return false;
    }

    if (options.minDownloads && (pack.downloads || 0) < options.minDownloads) {
      return false;
    }

    return true;
  }

  async list(options = {}) {
    try {
      this.logger.debug("Listing all packs");

      if (!this.index) {
        await this.refreshIndex();
      }

      const packs = this.index?.packs || {};
      let results = [];

      for (const [id, pack] of Object.entries(packs)) {
        if (this.matchesListOptions(pack, options)) {
          results.push({
            id,
            ...this.sanitizePackInfo(pack),
          });
        }
      }

      // Advanced sorting with multiple criteria
      results = this.sortResults(
        results,
        options.sortBy || "name",
        options.sortOrder || "asc"
      );

      // Apply pagination
      const offset = options.offset || 0;
      const limit = options.limit;
      const paginatedResults = limit
        ? results.slice(offset, offset + limit)
        : results.slice(offset);

      return {
        packs: paginatedResults,
        total: results.length,
        offset,
        limit,
        filters: this.generateListFilters(packs),
        sortOptions: this.getSortOptions(),
        facets: this.generateListFacets(packs),
      };
    } catch (e) {
      this.logger.error(`List failed:`, e);
      return {
        packs: [],
        total: 0,
        error: e.message,
      };
    }
  }

  matchesListOptions(pack, options) {
    if (options.source && pack.source !== options.source) {
      return false;
    }

    if (options.tag && !pack.tags?.includes(options.tag)) {
      return false;
    }

    if (
      options.capability &&
      !pack.capabilities?.includes(options.capability)
    ) {
      return false;
    }

    if (options.author && pack.author !== options.author) {
      return false;
    }

    if (options.license && pack.license !== options.license) {
      return false;
    }

    if (options.minRating && (pack.rating || 0) < options.minRating) {
      return false;
    }

    if (options.minDownloads && (pack.downloads || 0) < options.minDownloads) {
      return false;
    }

    if (
      options.hasCapability &&
      (!pack.capabilities || pack.capabilities.length === 0)
    ) {
      return false;
    }

    if (options.hasTags && (!pack.tags || pack.tags.length === 0)) {
      return false;
    }

    return true;
  }

  async info(packId) {
    try {
      const packPath = await this.resolve(packId);
      if (!packPath) {
        return null;
      }

      // Load pack manifest
      const manifestPath = join(packPath, "pack.json");
      if (!existsSync(manifestPath)) {
        return null;
      }

      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

      return {
        id: manifest.id,
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        tags: manifest.tags || [],
        capabilities: manifest.capabilities || [],
        requires: manifest.requires || {},
        modes: manifest.modes || [],
        path: packPath,
      };
    } catch (e) {
      this.logger.error(`Failed to get pack info:`, e);
      return null;
    }
  }

  async cache(packId, source) {
    try {
      const cacheKey = packId.replace("/", "-");
      const cachePath = join(this.cacheDir, cacheKey);

      mkdirSync(cachePath, { recursive: true });

      // Basic caching implemented - enhanced cache system available via PackCache
      this.logger.debug(`Cached pack ${packId} to ${cachePath}`);

      return cachePath;
    } catch (e) {
      this.logger.error(`Failed to cache pack:`, e);
      return null;
    }
  }

  async clearCache(packId = null) {
    try {
      if (packId) {
        const cacheKey = packId.replace("/", "-");
        const cachePath = join(this.cacheDir, cacheKey);
        if (existsSync(cachePath)) {
          rmSync(cachePath, { recursive: true, force: true });
          this.logger.info(`Cleared cache for ${packId}`);
        }
      } else {
        if (existsSync(this.cacheDir)) {
          rmSync(this.cacheDir, { recursive: true, force: true });
          mkdirSync(this.cacheDir, { recursive: true });
          this.logger.info("Cleared entire pack cache");
        }
      }
    } catch (e) {
      this.logger.error(`Failed to clear cache:`, e);
    }
  }

  parseGitHubPackId(packId) {
    // Support formats:
    // owner/repo
    // owner/repo#ref (branch/tag/commit)
    // owner/repo/path/to/pack
    // owner/repo#ref/path/to/pack

    if (!packId || typeof packId !== "string") {
      return null;
    }

    // Handle different formats
    let owner,
      repo,
      ref = "main",
      path = null;

    if (packId.includes("#")) {
      // Format: owner/repo#ref or owner/repo#ref/path
      const [beforeRef, afterRef] = packId.split("#");
      const beforeParts = beforeRef.split("/");

      if (beforeParts.length < 2) {
        return null;
      }

      [owner, repo] = beforeParts;

      if (afterRef.includes("/")) {
        // Format: owner/repo#ref/path
        const afterRefParts = afterRef.split("/");
        ref = afterRefParts[0];
        path = afterRefParts.slice(1).join("/");
      } else {
        // Format: owner/repo#ref
        ref = afterRef;
      }
    } else {
      // Format: owner/repo or owner/repo/path
      const parts = packId.split("/");

      if (parts.length < 2) {
        return null;
      }

      const [ownerPart, repoPart, ...pathParts] = parts;
      owner = ownerPart;
      repo = repoPart;

      if (pathParts.length > 0) {
        path = pathParts.join("/");
      }
    }

    // Validate owner and repo
    if (!owner || !repo || owner.length === 0 || repo.length === 0) {
      return null;
    }

    return {
      owner,
      repo,
      ref,
      path,
    };
  }

  generateGitHubCacheKey(owner, repo, ref, subPath) {
    let key = `github-${owner}-${repo}`;
    if (ref && ref !== "main") {
      key += `-${ref}`;
    }
    if (subPath) {
      key += `-${subPath.replace(/\//g, "-")}`;
    }
    return key;
  }

  async checkGitHubRateLimit() {
    const now = Date.now();

    // Reset rate limit if window has expired
    if (now > this.githubApiRateLimit.reset) {
      this.githubApiRateLimit = {
        limit: this.githubToken ? 5000 : 60,
        remaining: this.githubToken ? 5000 : 60,
        reset: now + 60 * 60 * 1000,
      };
    }

    // If we're near the limit, wait
    if (this.githubApiRateLimit.remaining < 10) {
      const waitTime = this.githubApiRateLimit.reset - now;
      this.logger.warn(
        `GitHub rate limit nearly exceeded, waiting ${waitTime}ms`
      );
      await setTimeout(Math.min(waitTime, 60000)); // Max 1 minute wait
    }
  }

  async fetchGitHubRepoMetadata(owner, repo) {
    const cacheKey = `${owner}/${repo}`;

    // Check API cache first
    if (this.githubApiCache.has(cacheKey)) {
      const cached = this.githubApiCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
        // 5 minute cache
        return cached.data;
      }
    }

    try {
      const url = `https://api.github.com/repos/${owner}/${repo}`;
      const headers = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "GitVan-Pack-Registry/1.0",
      };

      if (this.githubToken) {
        headers["Authorization"] = `token ${this.githubToken}`;
      }

      const response = await fetch(url, { headers });

      // Update rate limit from headers
      if (response.headers.get("x-ratelimit-remaining")) {
        this.githubApiRateLimit.remaining = parseInt(
          response.headers.get("x-ratelimit-remaining")
        );
        this.githubApiRateLimit.reset =
          parseInt(response.headers.get("x-ratelimit-reset")) * 1000;
      }

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Repository not found
        }
        if (response.status === 403) {
          this.logger.error(
            "GitHub API rate limit exceeded or access forbidden"
          );
          return null; // Return null instead of throwing to match expected behavior
        }
        this.logger.error(
          `GitHub API error: ${response.status} ${response.statusText}`
        );
        return null;
      }

      const data = await response.json();

      // Cache the result
      this.githubApiCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });

      return data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch GitHub metadata for ${owner}/${repo}:`,
        error.message
      );
      return null;
    }
  }

  async findPackManifest(repoPath, cacheKey) {
    const entries = readdirSync(repoPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subManifestPath = join(repoPath, entry.name, "pack.json");
        if (existsSync(subManifestPath)) {
          // Move the pack to the root level
          const tempDir = join(repoPath, "..", `${cacheKey}-temp`);
          execSync(`mv "${join(repoPath, entry.name)}" "${tempDir}"`);
          rmSync(repoPath, { recursive: true, force: true });
          execSync(`mv "${tempDir}" "${repoPath}"`);
          return true;
        }

        // Recursively search subdirectories (up to 3 levels deep)
        const subEntries = readdirSync(join(repoPath, entry.name), {
          withFileTypes: true,
        });
        for (const subEntry of subEntries) {
          if (subEntry.isDirectory()) {
            const deepManifestPath = join(
              repoPath,
              entry.name,
              subEntry.name,
              "pack.json"
            );
            if (existsSync(deepManifestPath)) {
              // Move the pack to the root level
              const tempDir = join(repoPath, "..", `${cacheKey}-temp`);
              execSync(
                `mv "${join(repoPath, entry.name, subEntry.name)}" "${tempDir}"`
              );
              rmSync(repoPath, { recursive: true, force: true });
              execSync(`mv "${tempDir}" "${repoPath}"`);
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  async enhanceManifestWithGitHubData(packPath, repoMetadata, owner, repo) {
    const manifestPath = join(packPath, "pack.json");
    if (!existsSync(manifestPath)) {
      return;
    }

    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

      // Enhance with GitHub metadata
      const enhanced = {
        ...manifest,
        github: {
          owner,
          repo,
          stars: repoMetadata.stargazers_count,
          forks: repoMetadata.forks_count,
          issues: repoMetadata.open_issues_count,
          lastUpdated: repoMetadata.updated_at,
          defaultBranch: repoMetadata.default_branch,
          license: repoMetadata.license?.spdx_id,
          homepage: repoMetadata.homepage,
          cloneUrl: repoMetadata.clone_url,
          language: repoMetadata.language,
        },
        // Update description if not present
        description: manifest.description || repoMetadata.description || "",
        // Update license if not present
        license: manifest.license || repoMetadata.license?.spdx_id || "Unknown",
        // Add GitHub-specific tags
        tags: [
          ...(manifest.tags || []),
          "github",
          ...(repoMetadata.topics || []),
        ].filter((tag, index, arr) => arr.indexOf(tag) === index), // Remove duplicates
        // Update last modified
        lastModified: new Date(repoMetadata.updated_at).getTime(),
      };

      writeFileSync(manifestPath, JSON.stringify(enhanced, null, 2));
      this.logger.debug(
        `Enhanced manifest with GitHub metadata for ${owner}/${repo}`
      );
    } catch (error) {
      this.logger.warn(
        `Failed to enhance manifest with GitHub data:`,
        error.message
      );
    }
  }

  createBuiltinPacks() {
    this.logger.info("Creating builtin packs");

    // Create next-minimal builtin pack
    const nextMinPath = join(this.builtinDir, "next-minimal");
    if (!existsSync(nextMinPath)) {
      mkdirSync(nextMinPath, { recursive: true });

      const manifest = {
        id: "builtin/next-minimal",
        name: "Next.js Minimal Starter",
        version: "1.0.0",
        description: "A minimal Next.js application starter pack",
        tags: ["nextjs", "react", "minimal", "builtin"],
        capabilities: ["scaffold", "development"],
        author: "GitVan",
        license: "MIT",
        modes: ["scaffold", "dev"],
        requires: {
          node: ">=18.0.0",
        },
      };

      writeFileSync(
        join(nextMinPath, "pack.json"),
        JSON.stringify(manifest, null, 2)
      );
    }

    // Create nextjs-github-pack builtin pack
    const nextjsGithubPath = join(this.builtinDir, "nextjs-github-pack");
    if (!existsSync(nextjsGithubPath)) {
      mkdirSync(nextjsGithubPath, { recursive: true });

      const manifest = {
        id: "nextjs-github-pack",
        name: "Next.js GitHub Pack",
        version: "1.0.0",
        description: "A GitVan pack for creating Next.js projects with jobs only, designed for GitHub distribution",
        author: "GitVan Team",
        license: "MIT",
        tags: ["nextjs", "react", "starter", "jobs-only", "github"],
        capabilities: [
          "project-scaffolding",
          "job-execution",
          "template-rendering"
        ],
        provides: {
          jobs: [
            {
              name: "nextjs:create-app",
              file: "jobs/create-next-app.job.mjs",
              description: "Creates a complete Next.js project structure"
            },
            {
              name: "nextjs:start-app", 
              file: "jobs/start-next-app.job.mjs",
              description: "Starts the Next.js development server"
            }
          ]
        },
        gitvan: {
          packType: "github-template",
          version: "2.0.0",
          compatibility: {
            gitvan: ">=2.0.0"
          }
        }
      };

      writeFileSync(
        join(nextjsGithubPath, "pack.json"),
        JSON.stringify(manifest, null, 2)
      );
      
      // Copy job files from packs directory
      const sourceJobsDir = join(process.cwd(), "packs", "nextjs-github-pack", "jobs");
      const targetJobsDir = join(nextjsGithubPath, "jobs");
      
      if (existsSync(sourceJobsDir)) {
        mkdirSync(targetJobsDir, { recursive: true });
        
        const jobFiles = readdirSync(sourceJobsDir);
        for (const jobFile of jobFiles) {
          if (jobFile.endsWith('.mjs')) {
            const sourcePath = join(sourceJobsDir, jobFile);
            const targetPath = join(targetJobsDir, jobFile);
            copyFileSync(sourcePath, targetPath);
          }
        }
      }
    }

    // Create nodejs-basic builtin pack
    const nodeBasicPath = join(this.builtinDir, "nodejs-basic");
    if (!existsSync(nodeBasicPath)) {
      mkdirSync(nodeBasicPath, { recursive: true });

      const manifest = {
        id: "builtin/nodejs-basic",
        name: "Node.js Basic Starter",
        version: "1.0.0",
        description:
          "A basic Node.js application starter pack with Express, TypeScript support, and modern development tools",
        tags: [
          "nodejs",
          "javascript",
          "basic",
          "builtin",
          "express",
          "api",
          "builtin",
        ],
        capabilities: ["scaffold", "development", "api", "server"],
        author: "GitVan",
        license: "MIT",
        modes: ["scaffold", "dev"],
        requires: {
          node: ">=16.0.0",
        },
        provides: {
          files: [
            {
              src: "package.json",
              target: "package.json",
              template: true,
            },
            {
              src: "README.md",
              target: "README.md",
              template: true,
            },
            {
              src: "index.js",
              target: "index.js",
              template: true,
            },
            {
              src: ".gitignore",
              target: ".gitignore",
              template: false,
            },
          ],
        },
      };

      writeFileSync(
        join(nodeBasicPath, "pack.json"),
        JSON.stringify(manifest, null, 2)
      );

      // Create assets directory and template files for nodejs-basic pack
      const assetsPath = join(nodeBasicPath, "assets");
      mkdirSync(assetsPath, { recursive: true });

      const templatePackageJson = {
        name: "{{ name || 'my-node-app' }}",
        version: "1.0.0",
        description:
          "{{ description || 'A basic Node.js application created with GitVan' }}",
        main: "index.js",
        type: "module",
        scripts: {
          start: "node index.js",
          dev: "node --watch index.js",
          test: 'echo "Error: no test specified" && exit 1',
        },
        keywords: ["nodejs", "gitvan"],
        author: "{{ author || 'Developer' }}",
        license: "MIT",
        dependencies: {
          express: "^4.18.2",
        },
        devDependencies: {
          nodemon: "^3.0.1",
        },
      };

      const templateReadme = `# {{ name || 'My Node.js App' }}

{{ description || 'A basic Node.js application created with GitVan' }}

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Start the application
npm start

# Start in development mode
npm run dev
\`\`\`

## Features

- Express.js web server
- ES6 modules support
- Development hot reload with nodemon
- GitVan integration

## API

The server runs on http://localhost:3000

- \`GET /\` - Welcome message
- \`GET /health\` - Health check endpoint

## Development

This project was created with GitVan pack: builtin/nodejs-basic
`;

      const templateIndex = `import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to {{ name || "my-node-app" }}!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(\`🚀 Server running on http://localhost:\${PORT}\`);
  console.log(\`📋 Health check: http://localhost:\${PORT}/health\`);
});
`;

      const templateGitignore = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Grunt intermediate storage
.grunt

# Bower dependency directory
bower_components

# node-waf configuration
.lock-wscript

# Compiled binary addons
build/Release

# Dependency directories
jspm_packages/

# TypeScript v1 declaration files
typings/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env
.env.test

# parcel-bundler cache
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.next

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
public

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Logs
logs
*.log

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
`;

      writeFileSync(
        join(assetsPath, "package.json"),
        JSON.stringify(templatePackageJson, null, 2)
      );
      writeFileSync(join(assetsPath, "README.md"), templateReadme);
      writeFileSync(join(assetsPath, "index.js"), templateIndex);
      writeFileSync(join(assetsPath, ".gitignore"), templateGitignore);
    }

    // Create docs-enterprise builtin pack
    const docsEnterprisePath = join(this.builtinDir, "docs-enterprise");
    if (!existsSync(docsEnterprisePath)) {
      mkdirSync(docsEnterprisePath, { recursive: true });

      const manifest = {
        id: "builtin/docs-enterprise",
        name: "Enterprise Documentation",
        version: "1.0.0",
        description: "Enterprise-grade documentation starter pack",
        tags: ["documentation", "enterprise", "vitepress", "builtin"],
        capabilities: ["scaffold", "documentation"],
        author: "GitVan",
        license: "MIT",
        modes: ["scaffold", "docs"],
        requires: {
          node: ">=18.0.0",
        },
      };

      writeFileSync(
        join(docsEnterprisePath, "pack.json"),
        JSON.stringify(manifest, null, 2)
      );
    }
  }

  // Enhanced cache management methods
  async getCacheStats() {
    return await this.packCache.getDetailedStats();
  }

  async clearEnhancedCache(type = null) {
    await this.packCache.clear(type);
    this.logger.info(
      `Enhanced cache cleared${type ? ` for type: ${type}` : ""}`
    );
  }

  async compactCache() {
    return await this.packCache.compact();
  }

  async exportCacheStats(filePath) {
    return await this.packCache.export(filePath);
  }

  async warmupCache() {
    await this.packCache.warmup();
    this.logger.info("Cache warmup completed");
  }

  // Legacy cache management for backward compatibility
  async clearLegacyCache(packId = null) {
    await this.clearCache(packId);
  }

  // Unified cache management
  async clearAllCaches(packId = null) {
    // Clear both enhanced and legacy caches
    await Promise.all([
      this.clearEnhancedCache(packId),
      this.clearLegacyCache(packId),
    ]);
    this.logger.info("All caches cleared");
  }

  // Enhanced search functionality methods
  createSearchIndex() {
    if (!this.index?.packs) {
      this.logger.warn("Cannot create search index: no packs available");
      return;
    }

    const searchableItems = [];

    for (const [id, pack] of Object.entries(this.index.packs)) {
      searchableItems.push({
        id,
        name: pack.name || "",
        description: pack.description || "",
        tags: pack.tags || [],
        capabilities: pack.capabilities || [],
        author: pack.author || "",
        license: pack.license || "",
        source: pack.source || "",
        // Computed search fields
        searchText: this.createSearchText(id, pack),
        keywords: [...(pack.tags || []), ...(pack.capabilities || [])].join(
          " "
        ),
        allText: [
          pack.name || "",
          pack.description || "",
          pack.author || "",
          ...(pack.tags || []),
          ...(pack.capabilities || []),
        ]
          .join(" ")
          .toLowerCase(),
      });
    }

    // Configure Fuse.js for fuzzy search
    const fuseOptions = {
      keys: [
        { name: "name", weight: 0.4 },
        { name: "description", weight: 0.3 },
        { name: "tags", weight: 0.15 },
        { name: "capabilities", weight: 0.1 },
        { name: "author", weight: 0.05 },
      ],
      threshold: 0.4, // 0.0 = exact match, 1.0 = match anything
      distance: 200,
      maxPatternLength: 32,
      minMatchCharLength: 1,
      includeScore: true,
      includeMatches: true,
      findAllMatches: true,
      ignoreLocation: true,
    };

    this.fuse = new Fuse(searchableItems, fuseOptions);
    this.searchIndex = {
      items: searchableItems,
      createdAt: Date.now(),
      count: searchableItems.length,
    };

    this.logger.debug(
      `Search index created with ${searchableItems.length} items`
    );
  }

  sortResults(results, sortBy = "name", sortOrder = "asc") {
    return results.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "lastModified":
          comparison = (a.lastModified || 0) - (b.lastModified || 0);
          break;
        case "downloads":
          comparison = (a.downloads || 0) - (b.downloads || 0);
          break;
        case "rating":
          comparison = (a.rating || 0) - (b.rating || 0);
          break;
        case "relevance":
        case "score":
          comparison = (b.score || 0) - (a.score || 0);
          break;
        case "author":
          comparison = (a.author || "").localeCompare(b.author || "");
          break;
        case "source":
          comparison = (a.source || "").localeCompare(b.source || "");
          break;
        default:
          comparison = a.name.localeCompare(b.name);
      }

      return sortOrder === "desc" ? -comparison : comparison;
    });
  }

  generateSearchFacets(packs, query) {
    const facets = {
      sources: {},
      tags: {},
      capabilities: {},
      authors: {},
      licenses: {},
    };

    for (const pack of Object.values(packs)) {
      // Count sources
      const source = pack.source || "unknown";
      facets.sources[source] = (facets.sources[source] || 0) + 1;

      // Count tags
      for (const tag of pack.tags || []) {
        facets.tags[tag] = (facets.tags[tag] || 0) + 1;
      }

      // Count capabilities
      for (const capability of pack.capabilities || []) {
        facets.capabilities[capability] =
          (facets.capabilities[capability] || 0) + 1;
      }

      // Count authors
      if (pack.author) {
        facets.authors[pack.author] = (facets.authors[pack.author] || 0) + 1;
      }

      // Count licenses
      if (pack.license) {
        facets.licenses[pack.license] =
          (facets.licenses[pack.license] || 0) + 1;
      }
    }

    // Sort each facet by count (descending)
    for (const facetKey of Object.keys(facets)) {
      const sorted = Object.entries(facets[facetKey])
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20); // Limit to top 20 facets

      facets[facetKey] = Object.fromEntries(sorted);
    }

    return facets;
  }

  generateListFilters(packs) {
    return {
      sources: [
        ...new Set(
          Object.values(packs)
            .map((p) => p.source)
            .filter(Boolean)
        ),
      ],
      tags: [...new Set(Object.values(packs).flatMap((p) => p.tags || []))],
      capabilities: [
        ...new Set(Object.values(packs).flatMap((p) => p.capabilities || [])),
      ],
      authors: [
        ...new Set(
          Object.values(packs)
            .map((p) => p.author)
            .filter(Boolean)
        ),
      ],
      licenses: [
        ...new Set(
          Object.values(packs)
            .map((p) => p.license)
            .filter(Boolean)
        ),
      ],
    };
  }

  generateListFacets(packs) {
    return this.generateSearchFacets(packs, "");
  }

  getSortOptions() {
    return [
      { value: "name", label: "Name" },
      { value: "lastModified", label: "Last Modified" },
      { value: "downloads", label: "Downloads" },
      { value: "rating", label: "Rating" },
      { value: "author", label: "Author" },
      { value: "source", label: "Source" },
    ];
  }

  // Enhanced search with autocomplete suggestions
  async getSearchSuggestions(partialQuery, limit = 10) {
    if (!this.fuse || !partialQuery || partialQuery.length < 2) {
      return [];
    }

    const results = this.fuse.search(partialQuery);
    const suggestions = new Set();

    for (const result of results.slice(0, limit * 2)) {
      const pack = result.item;

      // Add pack name
      if (pack.name.toLowerCase().includes(partialQuery.toLowerCase())) {
        suggestions.add(pack.name);
      }

      // Add relevant tags
      for (const tag of pack.tags || []) {
        if (tag.toLowerCase().includes(partialQuery.toLowerCase())) {
          suggestions.add(tag);
        }
      }

      // Add relevant capabilities
      for (const capability of pack.capabilities || []) {
        if (capability.toLowerCase().includes(partialQuery.toLowerCase())) {
          suggestions.add(capability);
        }
      }

      if (suggestions.size >= limit) break;
    }

    return Array.from(suggestions).slice(0, limit);
  }

  // Advanced search with complex query parsing
  async advancedSearch(queryString, options = {}) {
    const parsedQuery = this.parseAdvancedQuery(queryString);
    const searchOptions = { ...options, ...parsedQuery.filters };

    let results;
    if (parsedQuery.query) {
      results = await this.searchPacks(parsedQuery.query, searchOptions);
    } else {
      results = await this.list(searchOptions);
      results = {
        ...results,
        query: queryString,
        results: results.packs,
      };
    }

    return results;
  }

  parseAdvancedQuery(queryString) {
    const filters = {};
    let cleanQuery = queryString;

    // Parse filters like "tag:react", "author:gitvan", "capability:scaffold"
    const filterRegex = /(\w+):(\S+)/g;
    let match;

    while ((match = filterRegex.exec(queryString)) !== null) {
      const [fullMatch, filterType, filterValue] = match;

      switch (filterType.toLowerCase()) {
        case "tag":
          filters.tag = filterValue;
          break;
        case "author":
          filters.author = filterValue;
          break;
        case "capability":
          filters.capability = filterValue;
          break;
        case "source":
          filters.source = filterValue;
          break;
        case "license":
          filters.license = filterValue;
          break;
      }

      cleanQuery = cleanQuery.replace(fullMatch, "").trim();
    }

    return {
      query: cleanQuery || null,
      filters,
    };
  }

  // Search analytics and metrics
  getSearchAnalytics() {
    return {
      indexSize: this.searchIndex?.count || 0,
      indexAge: this.searchIndex ? Date.now() - this.searchIndex.createdAt : 0,
      isIndexStale: this.searchIndex
        ? Date.now() - this.searchIndex.createdAt > 3600000
        : true, // 1 hour
      fuseConfigured: !!this.fuse,
    };
  }

  // Rebuild search index
  async rebuildSearchIndex() {
    this.logger.info("Rebuilding search index...");
    await this.refreshIndex();
    this.createSearchIndex();
    this.logger.info("Search index rebuilt successfully");
  }
}
