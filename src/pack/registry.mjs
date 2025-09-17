import { createLogger } from '../utils/logger.mjs';
import { sha256Hex, fingerprint } from '../utils/crypto.mjs';
import { join, resolve, dirname } from 'pathe';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { z } from 'zod';
import { execSync } from 'node:child_process';
import { promisify } from 'node:util';
import { exec } from 'node:child_process';

const execAsync = promisify(exec);

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
    this.localPacksDir = options.localPacksDir || join(process.cwd(), 'packs');
    this.builtinDir = join(this.localPacksDir, 'builtin');
    this.registryUrl = this.validateRegistryUrl(options.registryUrl);
    this.timeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries || 3;
    this.index = null;
    this.rateLimiter = new Map();

    this.initializeCache();
    this.initializeBuiltins();
  }

  validateRegistryUrl(url) {
    // Use local file system instead of remote registry
    return 'local-filesystem';
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
      lastModified: pack.lastModified,
      source: pack.source || 'unknown'
    };
  }

  async refreshIndex() {
    this.logger.debug('Refreshing local filesystem index');

    const packs = {};

    // Scan local packs directory
    if (existsSync(this.localPacksDir)) {
      const entries = readdirSync(this.localPacksDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const packPath = join(this.localPacksDir, entry.name);
          const manifestPath = join(packPath, 'pack.json');

          if (existsSync(manifestPath)) {
            try {
              const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
              const packId = manifest.id || entry.name;

              packs[packId] = {
                id: packId,
                name: manifest.name || entry.name,
                version: manifest.version || '1.0.0',
                description: manifest.description || '',
                tags: manifest.tags || [],
                capabilities: manifest.capabilities || [],
                author: manifest.author,
                license: manifest.license,
                lastModified: statSync(packPath).mtime.getTime(),
                path: packPath,
                source: 'local'
              };
            } catch (error) {
              this.logger.warn(`Invalid pack manifest: ${manifestPath}`, error.message);
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
          const manifestPath = join(packPath, 'pack.json');

          if (existsSync(manifestPath)) {
            try {
              const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
              const packId = `builtin/${entry.name}`;

              packs[packId] = {
                id: packId,
                name: manifest.name || entry.name,
                version: manifest.version || '1.0.0',
                description: manifest.description || '',
                tags: [...(manifest.tags || []), 'builtin'],
                capabilities: manifest.capabilities || [],
                author: manifest.author || 'GitVan',
                license: manifest.license || 'MIT',
                lastModified: statSync(packPath).mtime.getTime(),
                path: packPath,
                source: 'builtin'
              };
            } catch (error) {
              this.logger.warn(`Invalid builtin pack manifest: ${manifestPath}`, error.message);
            }
          }
        }
      }
    }

    this.index = {
      packs,
      lastUpdated: Date.now(),
      source: 'local-filesystem'
    };

    this.saveLocalRegistry();

    this.logger.info(`Registry index refreshed: ${Object.keys(packs).length} local packs found`);
    return this.index;
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
    // Use the new searchPacks method for compatibility
    const options = {
      ...filters,
      limit: filters.limit
    };

    const result = await this.searchPacks(query, options);
    return result.results;
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

    // Check if it's a built-in pack first
    const builtinPath = this.resolveBuiltin(packId);
    if (builtinPath) {
      return builtinPath;
    }

    // Check local cache
    const cachedPath = join(this.cacheDir, packId.replace('/', '-'));
    if (existsSync(cachedPath)) {
      this.logger.debug(`Found in cache: ${cachedPath}`);
      return cachedPath;
    }

    // Check if it's a GitHub reference (org/repo format)
    if (packId.includes('/') && !packId.startsWith('.') && !packId.startsWith('/')) {
      return await this.resolveGitHub(packId);
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

    try {
      this.logger.info(`Fetching GitHub pack: ${packId}`);

      // Create cache directory
      mkdirSync(cachedPath, { recursive: true });

      // Clone the repository
      const cloneUrl = `https://github.com/${org}/${repo}.git`;

      await execAsync(`git clone --depth 1 ${cloneUrl} ${cachedPath}`, {
        timeout: this.timeout
      });

      // Check if it's a valid GitVan pack
      const manifestPath = join(cachedPath, 'pack.json');
      if (!existsSync(manifestPath)) {
        // Look for pack.json in subdirectories (monorepo support)
        const entries = readdirSync(cachedPath, { withFileTypes: true });
        let foundManifest = false;

        for (const entry of entries) {
          if (entry.isDirectory()) {
            const subManifestPath = join(cachedPath, entry.name, 'pack.json');
            if (existsSync(subManifestPath)) {
              // Move the pack to the root level
              const tempDir = join(cachedPath, '..', `${cacheKey}-temp`);
              execSync(`mv ${join(cachedPath, entry.name)} ${tempDir}`);
              rmSync(cachedPath, { recursive: true, force: true });
              execSync(`mv ${tempDir} ${cachedPath}`);
              foundManifest = true;
              break;
            }
          }
        }

        if (!foundManifest) {
          throw new Error('No pack.json found in repository');
        }
      }

      this.logger.info(`Successfully cached GitHub pack: ${packId}`);
      return cachedPath;

    } catch (error) {
      this.logger.error(`Failed to fetch GitHub pack ${packId}:`, error.message);

      // Clean up failed download
      if (existsSync(cachedPath)) {
        rmSync(cachedPath, { recursive: true, force: true });
      }

      return null;
    }
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
    // Check for exact builtin pack ID
    if (packId.startsWith('builtin/')) {
      const builtinPath = join(this.builtinDir, packId.replace('builtin/', ''));
      if (existsSync(builtinPath)) {
        this.logger.debug(`Resolved builtin pack: ${packId}`);
        return builtinPath;
      }
    }

    // Check for legacy builtin mappings
    const builtinMappings = {
      'gv/next-min': 'next-minimal',
      'gv/docs-enterprise': 'docs-enterprise',
      'gv/nodejs-basic': 'nodejs-basic'
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

      const results = [];
      const packs = this.index?.packs || {};
      const normalizedQuery = query?.toLowerCase().trim() || '';

      for (const [id, pack] of Object.entries(packs)) {
        const searchText = this.createSearchText(id, pack);

        if (!normalizedQuery || searchText.includes(normalizedQuery)) {
          // Apply additional filters
          if (this.matchesSearchOptions(pack, options)) {
            results.push({
              id,
              ...this.sanitizePackInfo(pack)
            });
          }
        }
      }

      // Sort by relevance (exact matches first, then partial)
      results.sort((a, b) => {
        const aExact = a.name.toLowerCase() === normalizedQuery;
        const bExact = b.name.toLowerCase() === normalizedQuery;
        if (aExact !== bExact) return bExact - aExact;

        const aStarts = a.name.toLowerCase().startsWith(normalizedQuery);
        const bStarts = b.name.toLowerCase().startsWith(normalizedQuery);
        if (aStarts !== bStarts) return bStarts - aStarts;

        return a.name.localeCompare(b.name);
      });

      return {
        query,
        total: results.length,
        results: options.limit ? results.slice(0, options.limit) : results
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

  matchesSearchOptions(pack, options) {
    if (options.capability && !pack.capabilities?.includes(options.capability)) {
      return false;
    }

    if (options.tag && !pack.tags?.includes(options.tag)) {
      return false;
    }

    if (options.source && pack.source !== options.source) {
      return false;
    }

    return true;
  }

  async list(options = {}) {
    try {
      this.logger.debug('Listing all packs');

      if (!this.index) {
        await this.refreshIndex();
      }

      const packs = this.index?.packs || {};
      const results = [];

      for (const [id, pack] of Object.entries(packs)) {
        if (this.matchesListOptions(pack, options)) {
          results.push({
            id,
            ...this.sanitizePackInfo(pack)
          });
        }
      }

      // Sort by name by default
      results.sort((a, b) => {
        if (options.sortBy === 'lastModified') {
          return (b.lastModified || 0) - (a.lastModified || 0);
        }
        if (options.sortBy === 'downloads') {
          return (b.downloads || 0) - (a.downloads || 0);
        }
        return a.name.localeCompare(b.name);
      });

      const startIndex = options.offset || 0;
      const endIndex = options.limit ? startIndex + options.limit : results.length;

      return {
        packs: results.slice(startIndex, endIndex),
        total: results.length,
        offset: startIndex,
        limit: options.limit
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

  matchesListOptions(pack, options) {
    if (options.source && pack.source !== options.source) {
      return false;
    }

    if (options.tag && !pack.tags?.includes(options.tag)) {
      return false;
    }

    if (options.capability && !pack.capabilities?.includes(options.capability)) {
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
        if (existsSync(cachePath)) {
          rmSync(cachePath, { recursive: true, force: true });
          this.logger.info(`Cleared cache for ${packId}`);
        }
      } else {
        if (existsSync(this.cacheDir)) {
          rmSync(this.cacheDir, { recursive: true, force: true });
          mkdirSync(this.cacheDir, { recursive: true });
          this.logger.info('Cleared entire pack cache');
        }
      }
    } catch (e) {
      this.logger.error(`Failed to clear cache:`, e);
    }
  }

  createBuiltinPacks() {
    this.logger.info('Creating builtin packs');

    // Create next-minimal builtin pack
    const nextMinPath = join(this.builtinDir, 'next-minimal');
    if (!existsSync(nextMinPath)) {
      mkdirSync(nextMinPath, { recursive: true });

      const manifest = {
        id: 'builtin/next-minimal',
        name: 'Next.js Minimal Starter',
        version: '1.0.0',
        description: 'A minimal Next.js application starter pack',
        tags: ['nextjs', 'react', 'minimal', 'builtin'],
        capabilities: ['scaffold', 'development'],
        author: 'GitVan',
        license: 'MIT',
        modes: ['scaffold', 'dev'],
        requires: {
          node: '>=18.0.0'
        }
      };

      writeFileSync(join(nextMinPath, 'pack.json'), JSON.stringify(manifest, null, 2));
    }

    // Create nodejs-basic builtin pack
    const nodeBasicPath = join(this.builtinDir, 'nodejs-basic');
    if (!existsSync(nodeBasicPath)) {
      mkdirSync(nodeBasicPath, { recursive: true });

      const manifest = {
        id: 'builtin/nodejs-basic',
        name: 'Node.js Basic Starter',
        version: '1.0.0',
        description: 'A basic Node.js application starter pack',
        tags: ['nodejs', 'javascript', 'basic', 'builtin'],
        capabilities: ['scaffold', 'development'],
        author: 'GitVan',
        license: 'MIT',
        modes: ['scaffold', 'dev'],
        requires: {
          node: '>=16.0.0'
        }
      };

      writeFileSync(join(nodeBasicPath, 'pack.json'), JSON.stringify(manifest, null, 2));
    }

    // Create docs-enterprise builtin pack
    const docsEnterprisePath = join(this.builtinDir, 'docs-enterprise');
    if (!existsSync(docsEnterprisePath)) {
      mkdirSync(docsEnterprisePath, { recursive: true });

      const manifest = {
        id: 'builtin/docs-enterprise',
        name: 'Enterprise Documentation',
        version: '1.0.0',
        description: 'Enterprise-grade documentation starter pack',
        tags: ['documentation', 'enterprise', 'vitepress', 'builtin'],
        capabilities: ['scaffold', 'documentation'],
        author: 'GitVan',
        license: 'MIT',
        modes: ['scaffold', 'docs'],
        requires: {
          node: '>=18.0.0'
        }
      };

      writeFileSync(join(docsEnterprisePath, 'pack.json'), JSON.stringify(manifest, null, 2));
    }
  }
}