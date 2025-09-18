// src/composables/pack.mjs
// GitVan v2 — usePack() composable
// - Complete pack lifecycle management
// - Integration with modular Git composables
// - Pack discovery, installation, application, and removal
// - Receipt management and idempotency

import { Pack } from "../pack/pack.mjs";
import { PackManager } from "../pack/manager.mjs";
import { PackRegistry } from "../pack/registry.mjs";
import { PackApplier } from "../pack/applier.mjs";
import { PackPlanner } from "../pack/planner.mjs";
import { createIdempotencySystem } from "../pack/idempotency/index.mjs";
import { useGit } from "./git/index.mjs";
import { useNotes } from "./notes.mjs";
import { useReceipt } from "./receipt.mjs";
import { useGitVan, tryUseGitVan } from "../core/context.mjs";
import { createLogger } from "../utils/logger.mjs";
import { join, resolve } from "pathe";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";

export function usePack(options = {}) {
  // Get context from unctx
  let ctx;
  try {
    ctx = useGitVan();
  } catch {
    ctx = tryUseGitVan?.() || null;
  }

  // Resolve working directory
  const cwd = (ctx && ctx.cwd) || process.cwd();

  // Initialize pack system components
  const logger = createLogger("pack:composable");
  const git = useGit();
  const notes = useNotes();
  const receipts = useReceipt();

  // Pack system configuration
  const config = {
    cwd,
    packsDir: join(cwd, "packs"),
    receiptsDir: join(cwd, ".gitvan", "packs"),
    cacheDir: join(cwd, ".gitvan", "cache"),
    registryUrl: options.registryUrl || "local-filesystem",
    ...options,
  };

  // Initialize pack system components
  const manager = new PackManager(config);
  const registry = new PackRegistry(config);
  const applier = new PackApplier(config);
  const planner = new PackPlanner(config);
  const idempotency = createIdempotencySystem(config);

  return {
    // Context properties
    cwd: config.cwd,
    config,

    // ===== PACK DISCOVERY =====

    /**
     * List available packs from registry
     */
    async listAvailable(filters = {}) {
      try {
        await registry.refreshIndex();
        return registry.search(filters);
      } catch (error) {
        logger.error("Failed to list available packs:", error.message);
        throw error;
      }
    },

    /**
     * Search packs by query
     */
    async search(query, filters = {}) {
      try {
        await registry.refreshIndex();
        return registry.search({ query, ...filters });
      } catch (error) {
        logger.error("Failed to search packs:", error.message);
        throw error;
      }
    },

    /**
     * Get pack details by ID
     */
    async getPackInfo(packId) {
      try {
        await registry.refreshIndex();
        return registry.getPack(packId);
      } catch (error) {
        logger.error(`Failed to get pack info for ${packId}:`, error.message);
        throw error;
      }
    },

    // ===== PACK INSTALLATION =====

    /**
     * Install a pack from registry or local path
     */
    async install(packId, inputs = {}, options = {}) {
      try {
        logger.info(`Installing pack: ${packId}`);

        // Resolve pack path (same logic as CLI)
        const packPath = await this.resolvePackPath(packId);
        if (!packPath) {
          throw new Error(`Pack not found: ${packId}`);
        }

        // Load pack
        const pack = new Pack(packPath, { ...config, inputs });
        await pack.load();

        // Check if already installed
        const installed = await this.listInstalled();
        const existing = installed.find(p => p.id === pack.manifest.id);
        
        if (existing && !options.force) {
          return {
            status: "ALREADY_INSTALLED",
            message: `Pack ${pack.manifest.id} is already installed`,
            pack: existing,
          };
        }

        // Check constraints
        const constraints = await pack.checkConstraints();
        if (!constraints.valid) {
          return {
            status: "ERROR",
            message: "Pack constraints not satisfied",
            errors: constraints.errors,
          };
        }

        // Resolve inputs
        const resolvedInputs = await pack.resolveInputs(inputs);

        // Check idempotency
        if (await pack.checkIdempotency(config.cwd)) {
          return {
            status: "SKIP",
            message: `Pack ${pack.manifest.id} already applied (fingerprint match)`,
            pack: pack.manifest,
          };
        }

        // Apply pack using manager (same as CLI)
        const result = await manager.applier.apply(packPath, config.cwd, resolvedInputs);

        if (result.status === "OK") {
          // Record installation
          await this.recordInstallation(pack.manifest, resolvedInputs, result);
          
          // Add to notes
          await notes.noteAdd(
            undefined,
            `Installed pack: ${pack.manifest.id}@${pack.manifest.version}`,
            await git.headSha()
          );
        }

        return result;
      } catch (error) {
        logger.error(`Failed to install pack ${packId}:`, error.message);
        throw error;
      }
    },

    /**
     * Install pack from local path
     */
    async installLocal(packPath, inputs = {}, options = {}) {
      try {
        const resolvedPath = resolve(packPath);
        if (!existsSync(resolvedPath)) {
          throw new Error(`Pack path not found: ${resolvedPath}`);
        }

        return await this.install(resolvedPath, inputs, options);
      } catch (error) {
        logger.error(`Failed to install local pack ${packPath}:`, error.message);
        throw error;
      }
    },

    // ===== PACK MANAGEMENT =====

    /**
     * List installed packs
     */
    async listInstalled() {
      try {
        await manager.loadInstalled(config.cwd);
        return Array.from(manager.installedPacks.values());
      } catch (error) {
        logger.error("Failed to list installed packs:", error.message);
        return [];
      }
    },

    /**
     * Get installed pack details
     */
    async getInstalled(packId) {
      try {
        const installed = await this.listInstalled();
        return installed.find(p => p.id === packId);
      } catch (error) {
        logger.error(`Failed to get installed pack ${packId}:`, error.message);
        return null;
      }
    },

    /**
     * Update an installed pack
     */
    async update(packId, inputs = {}, options = {}) {
      try {
        logger.info(`Updating pack: ${packId}`);

        const result = await manager.update(packId, config.cwd, inputs);

        if (result.updated) {
          // Add to notes
          await notes.noteAdd(
            undefined,
            `Updated pack: ${packId}@${result.newVersion}`,
            await git.headSha()
          );
        }

        return result;
      } catch (error) {
        logger.error(`Failed to update pack ${packId}:`, error.message);
        throw error;
      }
    },

    /**
     * Remove an installed pack
     */
    async remove(packId, options = {}) {
      try {
        logger.info(`Removing pack: ${packId}`);

        const result = await manager.remove(packId, config.cwd, options);

        if (result.status === "OK") {
          // Add to notes
          await notes.noteAdd(
            undefined,
            `Removed pack: ${packId}`,
            await git.headSha()
          );
        }

        return result;
      } catch (error) {
        logger.error(`Failed to remove pack ${packId}:`, error.message);
        throw error;
      }
    },

    // ===== PACK APPLICATION =====

    /**
     * Apply a pack to current directory
     */
    async apply(packId, inputs = {}, options = {}) {
      try {
        logger.info(`Applying pack: ${packId}`);

        const pack = new Pack(packId, { ...config, inputs });
        await pack.load();

        // Resolve inputs
        const resolvedInputs = await pack.resolveInputs(inputs);

        // Apply pack
        const result = await applier.apply(packId, config.cwd, resolvedInputs);

        if (result.status === "OK") {
          // Record application
          await this.recordApplication(pack.manifest, resolvedInputs, result);
        }

        return result;
      } catch (error) {
        logger.error(`Failed to apply pack ${packId}:`, error.message);
        throw error;
      }
    },

    /**
     * Plan pack application without executing
     */
    async plan(packId, inputs = {}, options = {}) {
      try {
        logger.info(`Planning pack application: ${packId}`);

        const pack = new Pack(packId, { ...config, inputs });
        await pack.load();

        // Resolve inputs
        const resolvedInputs = await pack.resolveInputs(inputs);

        // Plan application
        return await planner.plan(pack, config.cwd, resolvedInputs);
      } catch (error) {
        logger.error(`Failed to plan pack ${packId}:`, error.message);
        throw error;
      }
    },

    // ===== PACK VALIDATION =====

    /**
     * Validate pack constraints
     */
    async validateConstraints(packId) {
      try {
        const pack = new Pack(packId, config);
        await pack.load();
        return await pack.checkConstraints();
      } catch (error) {
        logger.error(`Failed to validate constraints for ${packId}:`, error.message);
        throw error;
      }
    },

    /**
     * Check if pack is idempotent
     */
    async checkIdempotency(packId) {
      try {
        const pack = new Pack(packId, config);
        await pack.load();
        return await pack.checkIdempotency(config.cwd);
      } catch (error) {
        logger.error(`Failed to check idempotency for ${packId}:`, error.message);
        throw error;
      }
    },

    // ===== PACK CREATION =====

    /**
     * Create a new pack from template
     */
    async create(packId, template = "basic", inputs = {}) {
      try {
        logger.info(`Creating pack: ${packId}`);

        // Create pack directory
        const packDir = join(config.packsDir, packId);
        if (!existsSync(packDir)) {
          mkdirSync(packDir, { recursive: true });
        }

        // Load template pack
        const templatePack = new Pack(join(config.packsDir, "templates", template), config);
        await templatePack.load();

        // Create manifest
        const manifest = {
          ...templatePack.manifest,
          id: packId,
          name: inputs.name || packId,
          version: inputs.version || "1.0.0",
          description: inputs.description || `Pack ${packId}`,
        };

        // Write manifest
        const manifestPath = join(packDir, "pack.json");
        writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

        // Add to notes
        await notes.noteAdd(
          undefined,
          `Created pack: ${packId}@${manifest.version}`,
          await git.headSha()
        );

        return {
          status: "OK",
          message: `Pack ${packId} created successfully`,
          pack: manifest,
          path: packDir,
        };
      } catch (error) {
        logger.error(`Failed to create pack ${packId}:`, error.message);
        throw error;
      }
    },

    // ===== PACK ANALYSIS =====

    /**
     * Analyze pack dependencies
     */
    async analyzeDependencies(packId) {
      try {
        const pack = new Pack(packId, config);
        await pack.load();

        const analysis = {
          pack: pack.manifest.id,
          version: pack.manifest.version,
          dependencies: pack.manifest.dependencies || {},
          requirements: pack.manifest.requires || {},
          capabilities: pack.manifest.capabilities || [],
          conflicts: [],
          recommendations: [],
        };

        // Check for conflicts with installed packs
        const installed = await this.listInstalled();
        for (const installedPack of installed) {
          // Check for capability conflicts
          const conflicts = analysis.capabilities.filter(cap =>
            installedPack.capabilities?.includes(cap)
          );
          if (conflicts.length > 0) {
            analysis.conflicts.push({
              pack: installedPack.id,
              conflicts,
            });
          }
        }

        return analysis;
      } catch (error) {
        logger.error(`Failed to analyze dependencies for ${packId}:`, error.message);
        throw error;
      }
    },

    /**
     * Get pack statistics
     */
    async getStats() {
      try {
        const installed = await this.listInstalled();
        const available = await this.listAvailable();

        return {
          installed: {
            count: installed.length,
            packs: installed.map(p => ({
              id: p.id,
              version: p.version,
              installedAt: p.installedAt,
            })),
          },
          available: {
            count: available.length,
            categories: [...new Set(available.map(p => p.category))],
            tags: [...new Set(available.flatMap(p => p.tags))],
          },
          registry: {
            lastUpdated: registry.lastUpdated,
            indexSize: registry.index?.length || 0,
          },
        };
      } catch (error) {
        logger.error("Failed to get pack statistics:", error.message);
        throw error;
      }
    },

    // ===== RECEIPT MANAGEMENT =====

    /**
     * Record pack installation
     */
    async recordInstallation(manifest, inputs, result) {
      try {
        const receipt = {
          id: manifest.id,
          version: manifest.version,
          installedAt: new Date().toISOString(),
          inputs,
          artifacts: result.artifacts || [],
          status: result.status,
        };

        await receipts.create(receipt);
        return receipt;
      } catch (error) {
        logger.error("Failed to record installation:", error.message);
        throw error;
      }
    },

    /**
     * Record pack application
     */
    async recordApplication(manifest, inputs, result) {
      try {
        const receipt = {
          id: manifest.id,
          version: manifest.version,
          appliedAt: new Date().toISOString(),
          inputs,
          artifacts: result.artifacts || [],
          status: result.status,
        };

        await receipts.create(receipt);
        return receipt;
      } catch (error) {
        logger.error("Failed to record application:", error.message);
        throw error;
      }
    },

    // ===== CLI INTEGRATION =====

    /**
     * Execute pack command (equivalent to CLI pack commands)
     */
    async executeCommand(command, args = {}) {
      try {
        switch (command) {
          case 'list':
            return await this.listInstalled();
          
          case 'apply':
            if (!args.pack) {
              throw new Error('Pack ID required for apply command');
            }
            return await this.apply(args.pack, args.inputs || {}, args);
          
          case 'plan':
            if (!args.pack) {
              throw new Error('Pack ID required for plan command');
            }
            return await this.plan(args.pack, args.inputs || {}, args);
          
          case 'status':
            return await this.getStats();
          
          case 'remove':
            if (!args.pack) {
              throw new Error('Pack ID required for remove command');
            }
            return await this.remove(args.pack, args);
          
          case 'update':
            if (!args.pack) {
              throw new Error('Pack ID required for update command');
            }
            return await this.update(args.pack, args.inputs || {}, args);
          
          default:
            throw new Error(`Unknown pack command: ${command}`);
        }
      } catch (error) {
        logger.error(`Failed to execute pack command ${command}:`, error.message);
        throw error;
      }
    },

    /**
     * Get pack status (equivalent to CLI pack status)
     */
    async getStatus() {
      try {
        const status = await manager.status(config.cwd);
        return {
          total: status.total,
          installed: status.installed.map(pack => ({
            id: pack.id,
            version: pack.version,
            mode: pack.mode,
            applied: pack.applied,
            fingerprint: pack.fingerprint
          }))
        };
      } catch (error) {
        logger.error("Failed to get pack status:", error.message);
        throw error;
      }
    },

    // ===== UTILITY METHODS =====

    /**
     * Resolve pack path (same logic as CLI)
     */
    async resolvePackPath(packId) {
      // Check if it's a local path
      if (existsSync(packId)) {
        return resolve(packId);
      }

      // Check in .gitvan/packs directory
      const localPackPath = join(config.cwd, '.gitvan', 'packs', packId);
      if (existsSync(localPackPath)) {
        return localPackPath;
      }

      // Check in packs directory
      const packsPath = join(config.cwd, 'packs', packId);
      if (existsSync(packsPath)) {
        return packsPath;
      }

      // Check marketplace/registry
      try {
        const registryPath = await registry.resolve(packId);
        if (registryPath) {
          return registryPath;
        }
      } catch (error) {
        logger.warn('Registry unavailable:', error.message);
      }

      return null;
    },

    /**
     * Refresh pack registry
     */
    async refreshRegistry() {
      try {
        await registry.refreshIndex();
        return {
          status: "OK",
          message: "Registry refreshed successfully",
          lastUpdated: registry.lastUpdated,
        };
      } catch (error) {
        logger.error("Failed to refresh registry:", error.message);
        throw error;
      }
    },

    /**
     * Clean up pack cache
     */
    async cleanup(options = {}) {
      try {
        const result = await idempotency.cleanup(options.days || 30);
        return {
          status: "OK",
          message: "Cleanup completed",
          cleaned: result.cleaned || 0,
        };
      } catch (error) {
        logger.error("Failed to cleanup:", error.message);
        throw error;
      }
    },

    /**
     * Export pack state
     */
    async exportState() {
      try {
        const installed = await this.listInstalled();
        const state = {
          exportedAt: new Date().toISOString(),
          packs: installed.reduce((acc, pack) => {
            acc[pack.id] = pack;
            return acc;
          }, {}),
          config,
        };

        return state;
      } catch (error) {
        logger.error("Failed to export state:", error.message);
        throw error;
      }
    },

    /**
     * Import pack state
     */
    async importState(state) {
      try {
        if (!state.packs) {
          throw new Error("Invalid state: missing packs");
        }

        const results = [];
        for (const [packId, packData] of Object.entries(state.packs)) {
          try {
            const result = await this.install(packId, packData.inputs || {});
            results.push({ packId, result });
          } catch (error) {
            results.push({ packId, error: error.message });
          }
        }

        return {
          status: "OK",
          message: "State imported",
          results,
        };
      } catch (error) {
        logger.error("Failed to import state:", error.message);
        throw error;
      }
    },
  };
}
