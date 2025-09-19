/**
 * Pack Registry Management Module
 * Handles registry operations, indexing, and search functionality
 */

import { createLogger } from "../utils/logger.mjs";
import { join } from "pathe";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { z } from "zod";
import Fuse from "fuse.js";

const SearchFiltersSchema = z.object({
  capability: z.string().optional(),
  tag: z.string().optional(),
  category: z.string().optional(),
  author: z.string().optional(),
});

export class PackRegistryManager {
  constructor(options = {}) {
    this.logger = createLogger("pack:registry-manager");
    this.cacheDir = options.cacheDir || join(homedir(), ".gitvan", "packs");
    this.registryUrl = this.validateRegistryUrl(options.registryUrl);
    this.timeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries || 3;
    this.index = null;
    this.searchIndex = null;
    this.fuse = null;
    this.rateLimiter = new Map();

    this.initializeRegistry();
  }

  /**
   * Validate registry URL
   * @param {string} url Registry URL
   * @returns {string} Validated registry URL
   */
  validateRegistryUrl(url) {
    if (!url) {
      return "https://registry.gitvan.dev";
    }

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
      this.logger.warn(`Invalid registry URL: ${url}, using default`);
      return "https://registry.gitvan.dev";
    }
  }

  /**
   * Initialize registry
   */
  initializeRegistry() {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }

    this.loadLocalRegistry();
  }

  /**
   * Load local registry index
   */
  loadLocalRegistry() {
    const localRegistry = join(this.cacheDir, "registry.json");
    if (existsSync(localRegistry)) {
      try {
        const data = JSON.parse(readFileSync(localRegistry, "utf8"));

        if (!data.packs || typeof data.packs !== "object") {
          this.index = null;
          this.logger.warn("Invalid cached registry, will refresh");
          return;
        }

        this.index = data;
        this.logger.debug(
          `Loaded local registry with ${Object.keys(data.packs).length} packs`
        );
      } catch (error) {
        this.logger.warn("Failed to load local registry:", error);
        this.index = null;
      }
    }
  }

  /**
   * Save local registry index
   */
  saveLocalRegistry() {
    if (!this.index) {
      return;
    }

    try {
      const localRegistry = join(this.cacheDir, "registry.json");
      writeFileSync(localRegistry, JSON.stringify(this.index, null, 2));
      this.logger.debug("Saved local registry index");
    } catch (error) {
      this.logger.error("Failed to save local registry:", error);
    }
  }

  /**
   * Refresh registry index from local filesystem
   * @param {Array} localPacks Array of local pack information
   */
  async refreshIndex(localPacks = []) {
    this.logger.debug("Refreshing local filesystem index");

    this.index = {
      packs: {},
      lastUpdated: Date.now(),
      version: "1.0.0",
    };

    // Add local packs to index
    for (const pack of localPacks) {
      if (pack && pack.id) {
        this.index.packs[pack.id] = {
          ...pack,
          source: "local",
          lastSeen: Date.now(),
        };
      }
    }

    this.saveLocalRegistry();
    this.buildSearchIndex();
  }

  /**
   * Build search index for fuzzy searching
   */
  buildSearchIndex() {
    if (!this.index || !this.index.packs) {
      return;
    }

    const packs = Object.values(this.index.packs);

    this.searchIndex = packs.map((pack) => ({
      ...pack,
      searchText: this.createSearchText(pack.id, pack),
    }));

    // Initialize Fuse.js for fuzzy search
    this.fuse = new Fuse(this.searchIndex, {
      keys: ["id", "name", "description", "tags", "searchText"],
      threshold: 0.3,
      includeScore: true,
    });

    this.logger.debug(`Built search index with ${packs.length} packs`);
  }

  /**
   * Create searchable text from pack information
   * @param {string} id Pack ID
   * @param {Object} pack Pack information
   * @returns {string} Searchable text
   */
  createSearchText(id, pack) {
    const parts = [
      id,
      pack.name || "",
      pack.description || "",
      ...(pack.tags || []),
      ...(pack.capabilities || []),
      pack.category || "",
      pack.author || "",
    ];

    return parts.join(" ").toLowerCase();
  }

  /**
   * Search packs with query and filters
   * @param {string} query Search query
   * @param {Object} filters Search filters
   * @returns {Array} Array of matching packs
   */
  async search(query, filters = {}) {
    try {
      // Validate filters
      const filterResult = SearchFiltersSchema.safeParse(filters);
      if (!filterResult.success) {
        this.logger.warn("Invalid search filters:", filterResult.error);
        return [];
      }

      const validatedFilters = filterResult.data;

      if (!this.searchIndex || !this.fuse) {
        this.logger.warn("Search index not built, returning empty results");
        return [];
      }

      let results = [];

      if (query && query.trim()) {
        // Use fuzzy search
        const fuseResults = this.fuse.search(query);
        results = fuseResults.map((result) => result.item);
      } else {
        // Return all packs if no query
        results = [...this.searchIndex];
      }

      // Apply filters
      if (Object.keys(validatedFilters).length > 0) {
        results = results.filter((pack) =>
          this.matchesFilters(pack, validatedFilters)
        );
      }

      return results.slice(0, 100); // Limit results
    } catch (error) {
      this.logger.error("Search failed:", error);
      return [];
    }
  }

  /**
   * Check if pack matches filters
   * @param {Object} pack Pack information
   * @param {Object} filters Search filters
   * @returns {boolean} True if pack matches filters
   */
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

  /**
   * Get pack by ID
   * @param {string} packId Pack identifier
   * @returns {Object|null} Pack information or null if not found
   */
  async get(packId) {
    try {
      if (!this.index || !this.index.packs) {
        this.logger.warn("Registry index not available");
        return null;
      }

      const pack = this.index.packs[packId];
      if (!pack) {
        this.logger.debug(`Pack not found in registry: ${packId}`);
        return null;
      }

      return pack;
    } catch (error) {
      this.logger.error(`Failed to get pack ${packId}:`, error);
      return null;
    }
  }

  /**
   * Check rate limit for operation
   * @param {string} operation Operation name
   * @param {number} windowMs Time window in milliseconds
   * @returns {boolean} True if operation is allowed
   */
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

  /**
   * Get registry statistics
   * @returns {Object} Registry statistics
   */
  getStats() {
    if (!this.index) {
      return {
        totalPacks: 0,
        lastUpdated: null,
        sources: {},
      };
    }

    const sources = {};
    Object.values(this.index.packs).forEach((pack) => {
      const source = pack.source || "unknown";
      sources[source] = (sources[source] || 0) + 1;
    });

    return {
      totalPacks: Object.keys(this.index.packs).length,
      lastUpdated: this.index.lastUpdated,
      sources,
    };
  }
}
