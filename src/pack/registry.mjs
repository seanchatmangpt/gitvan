import { createLogger } from '../utils/logger.mjs';
import { sha256Hex, fingerprint } from '../utils/crypto.mjs';
import { join, resolve, dirname } from 'pathe';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { z } from 'zod';

// Input validation schemas
const PackInfoSchema = z.object({
  id: z.string().min(1).max(100).regex(/^[a-z0-9-_.\/]+$/),
  name: z.string().min(1).max(200),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().max(500),
  tags: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  source: z.object({
    url: z.string().url(),
    hash: z.string().length(64).optional(),
    signature: z.string().optional()
  }).optional()
});

const SearchFiltersSchema = z.object({
  capability: z.string().optional(),
  tag: z.string().optional(),
  category: z.string().optional(),
  author: z.string().optional()
});

export class PackRegistry {
  constructor(options = {}) {
    this.options = options;
    this.logger = createLogger('pack:registry');
    this.cacheDir = options.cacheDir || join(homedir(), '.gitvan', 'packs');
    this.registryUrl = this.validateRegistryUrl(options.registryUrl);
    this.timeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries || 3;
    this.index = null;
    this.rateLimiter = new Map(); // Simple in-memory rate limiter

    this.initializeCache();
  }

  validateRegistryUrl(url) {
    const defaultUrl = process.env.GITVAN_REGISTRY || 'https://registry.gitvan.dev';

    if (!url) return defaultUrl;

    try {
      const parsed = new URL(url);
      if (!['https:', 'http:'].includes(parsed.protocol)) {
        this.logger.warn('Insecure registry URL, using default');
        return defaultUrl;
      }
      return url;
    } catch {
      this.logger.warn('Invalid registry URL, using default');
      return defaultUrl;
    }
  }

  initializeCache() {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
    this.loadLocalRegistry();
  }

  loadLocalRegistry() {
    const localRegistry = join(this.cacheDir, 'registry.json');
    if (existsSync(localRegistry)) {
      try {
        const content = readFileSync(localRegistry, 'utf8');
        this.index = JSON.parse(content);

        // Validate cached index
        if (!this.index.packs || typeof this.index.packs !== 'object') {
          this.index = null;
          this.logger.warn('Invalid cached registry, will refresh');
        }
      } catch (error) {
        this.logger.warn('Failed to load local registry:', error.message);
        this.index = null;
      }
    }
  }

  checkRateLimit(operation, windowMs) {
    const now = Date.now();
    const key = `${operation}:${this.registryUrl}`;
    const lastCall = this.rateLimiter.get(key);

    if (lastCall && (now - lastCall) < windowMs) {
      return false;
    }

    this.rateLimiter.set(key, now);
    return true;
  }

  sanitizePackInfo(pack) {
    return {
      id: pack.id,
      name: pack.name,
      version: pack.version,
      description: pack.description,
      tags: pack.tags || [],
      capabilities: pack.capabilities || [],
      author: pack.author,
      license: pack.license,
      downloads: pack.downloads || 0,
      rating: pack.rating || 0,
      lastModified: pack.lastModified
    };
  }

  async refreshIndex() {
    if (!this.checkRateLimit('refresh', 60000)) { // 1 minute rate limit
      this.logger.debug('Rate limited, using cached index');
      return this.index || { packs: {} };
    }

    let retries = 0;
    while (retries < this.maxRetries) {
      try {
        this.logger.debug(`Fetching registry index (attempt ${retries + 1})`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(`${this.registryUrl}/api/v1/index`, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'GitVan/2.0.0'
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Validate response structure
        if (!data.packs || typeof data.packs !== 'object') {
          throw new Error('Invalid registry response format');
        }

        this.index = {
          ...data,
          lastUpdated: Date.now()
        };

        // Cache the index locally
        this.saveLocalRegistry();

        this.logger.info(`Registry index refreshed: ${Object.keys(this.index.packs).length} packs`);

        return this.index;
      } catch (error) {
        retries++;
        this.logger.error(`Failed to refresh registry index (attempt ${retries}):`, error.message);

        if (retries < this.maxRetries) {
          await this.delay(Math.pow(2, retries) * 1000); // Exponential backoff
        }
      }
    }

    // Return cached index if all retries failed
    this.logger.warn('Using cached registry index due to network failures');
    return this.index || { packs: {} };
  }

  saveLocalRegistry() {
    try {
      writeFileSync(
        join(this.cacheDir, 'registry.json'),
        JSON.stringify(this.index, null, 2)
      );
    } catch (error) {
      this.logger.error('Failed to save registry cache:', error.message);
    }
  }

  async search(query, filters = {}) {
    // Validate inputs
    try {
      SearchFiltersSchema.parse(filters);
    } catch (error) {
      throw new Error(`Invalid search filters: ${error.message}`);
    }

    if (!this.index) {
      await this.refreshIndex();
    }

    const results = [];
    const packs = this.index?.packs || {};
    const normalizedQuery = query?.toLowerCase().trim() || '';

    for (const [id, pack] of Object.entries(packs)) {
      try {
        // Validate pack structure
        PackInfoSchema.partial().parse(pack);

        // Match query against searchable fields
        const searchText = this.createSearchText(id, pack);

        if (!normalizedQuery || searchText.includes(normalizedQuery)) {
          // Apply filters
          if (this.matchesFilters(pack, filters)) {
            results.push({
              id,
              ...this.sanitizePackInfo(pack)
            });
          }
        }
      } catch (error) {
        this.logger.debug(`Skipping invalid pack ${id}:`, error.message);
      }
    }

    return results;
  }

  createSearchText(id, pack) {
    return [
      id,
      pack.name || '',
      pack.description || '',
      ...(pack.tags || []),
      ...(pack.capabilities || []),
      pack.author || ''
    ].join(' ').toLowerCase();
  }

  matchesFilters(pack, filters) {
    if (filters.capability && !pack.capabilities?.includes(filters.capability)) {
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
    if (!packId || typeof packId !== 'string' || !/^[a-z0-9-_.\/]+$/.test(packId)) {
      throw new Error('Invalid pack ID format');
    }

    if (!this.index) {
      await this.refreshIndex();
    }

    const pack = this.index?.packs?.[packId];
    if (!pack) {
      return null;
    }

    return this.sanitizePackInfo(pack);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async resolve(packId) {
    this.logger.debug(`Resolving pack: ${packId}`);

    // Check if it's a GitHub reference (org/repo format)
    if (packId.includes('/') && !packId.startsWith('.') && !packId.startsWith('/')) {
      return await this.resolveGitHub(packId);
    }

    // Check local cache
    const cachedPath = join(this.cacheDir, packId);
    if (existsSync(cachedPath)) {
      this.logger.debug(`Found in cache: ${cachedPath}`);
      return cachedPath;
    }

    // Try to fetch from registry
    return await this.fetchFromRegistry(packId);
  }

  async resolveGitHub(packId) {
    const [org, repo] = packId.split('/');
    const cacheKey = `github-${org}-${repo}`;
    const cachedPath = join(this.cacheDir, cacheKey);

    if (existsSync(cachedPath)) {
      this.logger.debug(`Found GitHub pack in cache: ${cachedPath}`);
      return cachedPath;
    }

    // Would implement GitHub pack fetching here
    this.logger.warn(`GitHub pack fetching not implemented: ${packId}`);
    return null;
  }

  async fetchFromRegistry(packId) {
    try {
      // Would implement registry API calls here
      this.logger.debug(`Fetching from registry: ${packId}`);

      // For now, check if it's a built-in pack
      const builtinPath = this.resolveBuiltin(packId);
      if (builtinPath) {
        return builtinPath;
      }

      this.logger.warn(`Pack not found in registry: ${packId}`);
      return null;
    } catch (e) {
      this.logger.error(`Failed to fetch from registry:`, e);
      return null;
    }
  }

  resolveBuiltin(packId) {
    // Map of built-in pack IDs to their paths
    const builtins = {
      'gv/next-min': 'builtin/next-minimal',
      'gv/docs-enterprise': 'builtin/docs-enterprise',
      'gv/nodejs-basic': 'builtin/nodejs-basic'
    };

    if (builtins[packId]) {
      // Would return actual builtin pack path
      this.logger.debug(`Resolved builtin pack: ${packId}`);
      return null; // For now, no builtin packs implemented
    }

    return null;
  }

  async search(query, options = {}) {
    try {
      this.logger.debug(`Searching packs: ${query}`);

      // Would implement registry search API here
      const results = [];

      return {
        query,
        total: results.length,
        results
      };
    } catch (e) {
      this.logger.error(`Search failed:`, e);
      return {
        query,
        total: 0,
        results: [],
        error: e.message
      };
    }
  }

  async list(options = {}) {
    try {
      // Would implement registry listing API here
      return {
        packs: [],
        total: 0
      };
    } catch (e) {
      this.logger.error(`List failed:`, e);
      return {
        packs: [],
        total: 0,
        error: e.message
      };
    }
  }

  async info(packId) {
    try {
      const packPath = await this.resolve(packId);
      if (!packPath) {
        return null;
      }

      // Load pack manifest
      const manifestPath = join(packPath, 'pack.json');
      if (!existsSync(manifestPath)) {
        return null;
      }

      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

      return {
        id: manifest.id,
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        tags: manifest.tags || [],
        capabilities: manifest.capabilities || [],
        requires: manifest.requires || {},
        modes: manifest.modes || [],
        path: packPath
      };
    } catch (e) {
      this.logger.error(`Failed to get pack info:`, e);
      return null;
    }
  }

  async cache(packId, source) {
    try {
      const cacheKey = packId.replace('/', '-');
      const cachePath = join(this.cacheDir, cacheKey);

      mkdirSync(cachePath, { recursive: true });

      // Would implement caching logic here
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
        const cacheKey = packId.replace('/', '-');
        const cachePath = join(this.cacheDir, cacheKey);
        // Would remove specific cache entry
        this.logger.debug(`Cleared cache for ${packId}`);
      } else {
        // Would clear entire cache
        this.logger.debug(`Cleared entire pack cache`);
      }
    } catch (e) {
      this.logger.error(`Failed to clear cache:`, e);
    }
  }
}