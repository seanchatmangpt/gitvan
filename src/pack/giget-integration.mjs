/**
 * GitVan Pack System - Giget Integration for Remote Pack Support
 * 
 * This module integrates giget with GitVan's pack system to enable:
 * - Remote pack installation from GitHub, GitLab, Bitbucket, etc.
 * - Template registry support
 * - Caching and offline support
 * - Custom pack providers
 * - Authentication for private repositories
 */

import { createLogger } from "../utils/logger.mjs";
import { join, resolve, dirname } from "pathe";
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { z } from "zod";

const logger = createLogger("pack:giget");

// Giget integration schemas
const RemotePackSourceSchema = z.object({
  provider: z.enum(["github", "gitlab", "bitbucket", "sourcehut", "custom"]),
  repo: z.string().min(1),
  subdir: z.string().optional(),
  ref: z.string().optional(),
  auth: z.string().optional(),
});

const RemotePackConfigSchema = z.object({
  source: RemotePackSourceSchema,
  name: z.string().optional(),
  description: z.string().optional(),
  version: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  install: z.boolean().optional(),
});

/**
 * Giget Remote Pack Manager
 * Handles downloading and managing remote packs using giget
 */
export class GigetPackManager {
  constructor(options = {}) {
    this.options = {
      cacheDir: options.cacheDir || ".gitvan/cache/remote-packs",
      installDir: options.installDir || "packs/remote",
      registry: options.registry || "https://raw.githubusercontent.com/unjs/giget/main/templates",
      auth: options.auth || process.env.GIGET_AUTH,
      ...options,
    };
    this.logger = createLogger("pack:giget");
    this.giget = null; // Will be loaded dynamically
  }

  /**
   * Initialize giget (dynamic import to avoid bundling issues)
   */
  async initGiget() {
    if (!this.giget) {
      try {
        const { downloadTemplate } = await import("giget");
        this.giget = { downloadTemplate };
      } catch (error) {
        this.logger.error("Failed to load giget:", error.message);
        throw new Error("giget is required for remote pack support. Install it with: pnpm add giget");
      }
    }
  }

  /**
   * Install a remote pack from various sources
   */
  async installRemotePack(source, options = {}) {
    await this.initGiget();

    try {
      // Parse source if it's a string
      let packSource;
      if (typeof source === "string") {
        packSource = this.parseSourceString(source);
      } else {
        packSource = source;
      }

      // Validate source
      const validation = RemotePackSourceSchema.safeParse(packSource);
      if (!validation.success) {
        throw new Error(`Invalid pack source: ${validation.error.message}`);
      }

      const validatedSource = validation.data;
      const packId = this.generatePackId(validatedSource);
      const installPath = join(this.options.installDir, packId);

      this.logger.info(`Installing remote pack: ${packId}`);

      // Download the pack using giget
      const gigetSource = this.buildGigetSource(validatedSource);
      const result = await this.giget.downloadTemplate(gigetSource, {
        dir: installPath,
        force: options.force || false,
        forceClean: options.forceClean || false,
        offline: options.offline || false,
        preferOffline: options.preferOffline || false,
        registry: this.options.registry,
        auth: this.options.auth,
        cwd: process.cwd(),
      });

      this.logger.info(`Pack downloaded to: ${result.dir}`);

      // Validate the downloaded pack
      const packInfo = await this.validateDownloadedPack(result.dir, packId);

      // Install dependencies if requested
      if (options.install !== false && packInfo.manifest.dependencies) {
        await this.installPackDependencies(result.dir, packInfo.manifest.dependencies);
      }

      return {
        success: true,
        packId,
        path: result.dir,
        source: result.source,
        url: result.url,
        manifest: packInfo.manifest,
        metadata: {
          installedAt: new Date().toISOString(),
          source: validatedSource,
          gigetResult: result,
        },
      };

    } catch (error) {
      this.logger.error(`Failed to install remote pack:`, error.message);
      throw error;
    }
  }

  /**
   * Parse source string into structured format
   * Supports formats like:
   * - "github:owner/repo"
   * - "github:owner/repo#branch"
   * - "github:owner/repo/subdir"
   * - "gitlab:owner/repo"
   * - "bitbucket:owner/repo"
   * - "sourcehut:owner/repo"
   */
  parseSourceString(source) {
    const patterns = [
      // github:owner/repo#branch/subdir
      /^(github|gitlab|bitbucket|sourcehut):([^#\/]+)(?:#([^\/]+))?(?:\/(.+))?$/,
      // Custom provider format
      /^([^:]+):(.+)$/,
    ];

    for (const pattern of patterns) {
      const match = source.match(pattern);
      if (match) {
        const [, provider, repo, ref, subdir] = match;
        return {
          provider,
          repo,
          ref: ref || undefined,
          subdir: subdir || undefined,
        };
      }
    }

    throw new Error(`Invalid source format: ${source}. Expected format: provider:owner/repo[#ref][/subdir]`);
  }

  /**
   * Build giget-compatible source string
   */
  buildGigetSource(source) {
    let gigetSource = `${source.provider}:${source.repo}`;
    
    if (source.ref) {
      gigetSource += `#${source.ref}`;
    }
    
    if (source.subdir) {
      gigetSource += `/${source.subdir}`;
    }

    return gigetSource;
  }

  /**
   * Generate a unique pack ID from source
   */
  generatePackId(source) {
    const baseId = source.repo.replace(/[^a-z0-9-]/gi, "-");
    const providerPrefix = source.provider === "github" ? "" : `${source.provider}-`;
    const refSuffix = source.ref ? `-${source.ref.replace(/[^a-z0-9-]/gi, "-")}` : "";
    const subdirSuffix = source.subdir ? `-${source.subdir.replace(/[^a-z0-9-]/gi, "-")}` : "";
    
    return `${providerPrefix}${baseId}${refSuffix}${subdirSuffix}`;
  }

  /**
   * Validate downloaded pack structure
   */
  async validateDownloadedPack(packPath, packId) {
    const manifestPath = join(packPath, "pack.json");
    
    if (!existsSync(manifestPath)) {
      throw new Error(`Pack manifest not found: ${manifestPath}`);
    }

    let manifest;
    try {
      manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    } catch (error) {
      throw new Error(`Invalid pack manifest: ${error.message}`);
    }

    // Validate required fields
    if (!manifest.id) {
      manifest.id = packId;
    }
    if (!manifest.name) {
      manifest.name = packId;
    }
    if (!manifest.version) {
      manifest.version = "1.0.0";
    }

    // Add remote pack metadata
    manifest.source = "remote";
    manifest.remoteSource = {
      provider: "giget",
      installedAt: new Date().toISOString(),
    };

    // Write updated manifest
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    return {
      manifest,
      path: packPath,
      valid: true,
    };
  }

  /**
   * Install pack dependencies using the appropriate package manager
   */
  async installPackDependencies(packPath, dependencies) {
    this.logger.info(`Installing dependencies for pack: ${dependencies.join(", ")}`);

    try {
      const { execSync } = await import("node:child_process");
      
      // Check if package.json exists
      const packageJsonPath = join(packPath, "package.json");
      if (!existsSync(packageJsonPath)) {
        // Create a minimal package.json
        const packageJson = {
          name: "gitvan-remote-pack",
          version: "1.0.0",
          private: true,
          dependencies: {},
        };

        // Add dependencies
        for (const dep of dependencies) {
          packageJson.dependencies[dep] = "latest";
        }

        writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      }

      // Install dependencies
      execSync("pnpm install", { 
        cwd: packPath, 
        stdio: "inherit",
        env: { ...process.env, NODE_ENV: "development" }
      });

      this.logger.info("Dependencies installed successfully");

    } catch (error) {
      this.logger.warn(`Failed to install dependencies: ${error.message}`);
      // Don't throw - pack installation can succeed without dependencies
    }
  }

  /**
   * List installed remote packs
   */
  async listRemotePacks() {
    const remotePacks = [];

    if (!existsSync(this.options.installDir)) {
      return remotePacks;
    }

    const { readdirSync } = await import("node:fs");
    const entries = readdirSync(this.options.installDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const packPath = join(this.options.installDir, entry.name);
        const manifestPath = join(packPath, "pack.json");

        if (existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
            if (manifest.source === "remote") {
              remotePacks.push({
                id: manifest.id,
                name: manifest.name,
                version: manifest.version,
                path: packPath,
                manifest,
                installedAt: manifest.remoteSource?.installedAt,
              });
            }
          } catch (error) {
            this.logger.debug(`Skipping invalid pack: ${entry.name}`);
          }
        }
      }
    }

    return remotePacks;
  }

  /**
   * Update a remote pack
   */
  async updateRemotePack(packId, options = {}) {
    const remotePacks = await this.listRemotePacks();
    const pack = remotePacks.find(p => p.id === packId);

    if (!pack) {
      throw new Error(`Remote pack not found: ${packId}`);
    }

    this.logger.info(`Updating remote pack: ${packId}`);

    // Reinstall with force
    const source = pack.manifest.remoteSource?.originalSource;
    if (!source) {
      throw new Error(`Pack source information not found for: ${packId}`);
    }

    return await this.installRemotePack(source, {
      ...options,
      force: true,
      forceClean: true,
    });
  }

  /**
   * Remove a remote pack
   */
  async removeRemotePack(packId) {
    const remotePacks = await this.listRemotePacks();
    const pack = remotePacks.find(p => p.id === packId);

    if (!pack) {
      throw new Error(`Remote pack not found: ${packId}`);
    }

    this.logger.info(`Removing remote pack: ${packId}`);

    const { rmSync } = await import("node:fs");
    rmSync(pack.path, { recursive: true, force: true });

    return {
      success: true,
      packId,
      removedPath: pack.path,
    };
  }

  /**
   * Search remote packs from registry
   */
  async searchRemotePacks(query, options = {}) {
    await this.initGiget();

    try {
      // Use giget's registry search if available
      const registryUrl = this.options.registry;
      const searchUrl = `${registryUrl}/search?q=${encodeURIComponent(query)}`;

      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`Registry search failed: ${response.statusText}`);
      }

      const results = await response.json();
      
      return results.map(pack => ({
        id: pack.name,
        name: pack.name,
        description: pack.description || "No description",
        source: pack.tar ? `registry:${pack.name}` : null,
        url: pack.url,
        registry: true,
      }));

    } catch (error) {
      this.logger.warn(`Registry search failed: ${error.message}`);
      
      // Fallback: return empty results
      return [];
    }
  }

  /**
   * Create a custom pack provider
   */
  createCustomProvider(name, providerFunction) {
    return {
      name,
      provider: providerFunction,
    };
  }

  /**
   * Install pack from custom provider
   */
  async installFromCustomProvider(providerName, input, options = {}) {
    await this.initGiget();

    const customProvider = this.customProviders?.[providerName];
    if (!customProvider) {
      throw new Error(`Custom provider not found: ${providerName}`);
    }

    // Use giget's custom provider support
    const result = await this.giget.downloadTemplate(`${providerName}:${input}`, {
      providers: {
        [providerName]: customProvider.provider,
      },
      ...options,
    });

    return result;
  }
}

/**
 * Enhanced Pack Manager with Giget Support
 * Extends the existing PackManager with remote pack capabilities
 */
export class EnhancedPackManager extends GigetPackManager {
  constructor(options = {}) {
    super(options);
    this.localPackManager = null; // Will be loaded from existing PackManager
  }

  /**
   * Initialize local pack manager
   */
  async initLocalManager() {
    if (!this.localPackManager) {
      const { PackManager } = await import("./manager.mjs");
      this.localPackManager = new PackManager();
    }
  }

  /**
   * Install pack (local or remote)
   */
  async installPack(source, options = {}) {
    await this.initLocalManager();

    // Determine if source is remote or local
    if (this.isRemoteSource(source)) {
      return await this.installRemotePack(source, options);
    } else {
      return await this.localPackManager.install(source, options);
    }
  }

  /**
   * Check if source is remote
   */
  isRemoteSource(source) {
    if (typeof source === "string") {
      return /^(github|gitlab|bitbucket|sourcehut|registry):/.test(source);
    }
    return source.provider && source.provider !== "local";
  }

  /**
   * List all packs (local and remote)
   */
  async listAllPacks() {
    await this.initLocalManager();

    const localPacks = await this.localPackManager.list();
    const remotePacks = await this.listRemotePacks();

    return {
      local: localPacks,
      remote: remotePacks,
      total: localPacks.length + remotePacks.length,
    };
  }

  /**
   * Get pack info (local or remote)
   */
  async getPackInfo(packId) {
    await this.initLocalManager();

    // Try local first
    try {
      const localInfo = await this.localPackManager.getPackInfo(packId);
      if (localInfo) {
        return { ...localInfo, source: "local" };
      }
    } catch (error) {
      // Continue to remote
    }

    // Try remote
    const remotePacks = await this.listRemotePacks();
    const remotePack = remotePacks.find(p => p.id === packId);
    if (remotePack) {
      return { ...remotePack, source: "remote" };
    }

    return null;
  }
}

export { RemotePackSourceSchema, RemotePackConfigSchema };
