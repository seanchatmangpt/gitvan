/**
 * Pack Dependencies Module
 * Handles pack dependency resolution and management
 */

import { createLogger } from "../utils/logger.mjs";
import { join } from "pathe";
import { existsSync, readFileSync } from "node:fs";

export class PackDependencyManager {
  constructor(options = {}) {
    this.logger = createLogger("pack:dependencies");
    this.localPacksDir = options.localPacksDir || join(process.cwd(), "packs");
    this.builtinDir = join(this.localPacksDir, "builtin");
  }

  /**
   * Resolve pack dependencies
   * @param {string} packId Pack identifier
   * @returns {Object} Dependency resolution result
   */
  async resolveDependencies(packId) {
    try {
      const packPath = this.resolvePackPath(packId);
      if (!packPath) {
        return {
          success: false,
          error: `Pack not found: ${packId}`,
          dependencies: [],
        };
      }

      const packJson = this.loadPackJson(packPath);
      if (!packJson) {
        return {
          success: false,
          error: `Invalid pack.json: ${packId}`,
          dependencies: [],
        };
      }

      const dependencies = packJson.dependencies || {};
      const peerDependencies = packJson.peerDependencies || {};
      const devDependencies = packJson.devDependencies || {};

      const resolvedDeps = await this.resolveDependencyList(dependencies);
      const resolvedPeerDeps = await this.resolveDependencyList(
        peerDependencies
      );
      const resolvedDevDeps = await this.resolveDependencyList(devDependencies);

      return {
        success: true,
        dependencies: resolvedDeps,
        peerDependencies: resolvedPeerDeps,
        devDependencies: resolvedDevDeps,
        allDependencies: {
          ...resolvedDeps,
          ...resolvedPeerDeps,
          ...resolvedDevDeps,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to resolve dependencies for ${packId}:`, error);
      return {
        success: false,
        error: error.message,
        dependencies: [],
      };
    }
  }

  /**
   * Resolve a list of dependencies
   * @param {Object} dependencies Dependency map
   * @returns {Object} Resolved dependencies
   */
  async resolveDependencyList(dependencies) {
    const resolved = {};

    for (const [depId, version] of Object.entries(dependencies)) {
      try {
        const resolvedDep = await this.resolveDependency(depId, version);
        if (resolvedDep) {
          resolved[depId] = resolvedDep;
        }
      } catch (error) {
        this.logger.warn(`Failed to resolve dependency ${depId}:`, error);
        resolved[depId] = {
          id: depId,
          version: version,
          resolved: false,
          error: error.message,
        };
      }
    }

    return resolved;
  }

  /**
   * Resolve a single dependency
   * @param {string} depId Dependency identifier
   * @param {string} version Version requirement
   * @returns {Object|null} Resolved dependency or null
   */
  async resolveDependency(depId, version) {
    // First, try to resolve locally
    const localPath = this.resolvePackPath(depId);
    if (localPath) {
      const packJson = this.loadPackJson(localPath);
      if (packJson) {
        return {
          id: depId,
          version: packJson.version,
          path: localPath,
          resolved: true,
          source: "local",
        };
      }
    }

    // TODO: Implement remote dependency resolution
    // For now, return unresolved dependency
    return {
      id: depId,
      version: version,
      resolved: false,
      source: "remote",
      error: "Remote resolution not implemented",
    };
  }

  /**
   * Resolve pack path from pack ID
   * @param {string} packId Pack identifier
   * @returns {string|null} Path to pack or null if not found
   */
  resolvePackPath(packId) {
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
   * Load pack.json from path
   * @param {string} packPath Path to pack directory
   * @returns {Object|null} Pack.json content or null if invalid
   */
  loadPackJson(packPath) {
    try {
      const packJsonPath = join(packPath, "pack.json");

      if (!existsSync(packJsonPath)) {
        return null;
      }

      const content = readFileSync(packJsonPath, "utf8");
      return JSON.parse(content);
    } catch (error) {
      this.logger.warn(`Failed to load pack.json from ${packPath}:`, error);
      return null;
    }
  }

  /**
   * Check for circular dependencies
   * @param {string} packId Pack identifier
   * @param {Set} visited Set of visited packs
   * @returns {Object} Circular dependency check result
   */
  async checkCircularDependencies(packId, visited = new Set()) {
    if (visited.has(packId)) {
      return {
        hasCircular: true,
        cycle: Array.from(visited).concat(packId),
      };
    }

    visited.add(packId);

    try {
      const depResult = await this.resolveDependencies(packId);
      if (!depResult.success) {
        return {
          hasCircular: false,
          cycle: [],
        };
      }

      for (const depId of Object.keys(depResult.dependencies)) {
        const circularResult = await this.checkCircularDependencies(
          depId,
          new Set(visited)
        );
        if (circularResult.hasCircular) {
          return circularResult;
        }
      }

      visited.delete(packId);
      return {
        hasCircular: false,
        cycle: [],
      };
    } catch (error) {
      this.logger.error(
        `Failed to check circular dependencies for ${packId}:`,
        error
      );
      return {
        hasCircular: false,
        cycle: [],
      };
    }
  }

  /**
   * Get dependency tree for a pack
   * @param {string} packId Pack identifier
   * @param {number} maxDepth Maximum depth to traverse
   * @returns {Object} Dependency tree
   */
  async getDependencyTree(packId, maxDepth = 5) {
    const tree = {
      id: packId,
      dependencies: {},
      depth: 0,
    };

    await this.buildDependencyTree(packId, tree, maxDepth, 0);
    return tree;
  }

  /**
   * Build dependency tree recursively
   * @param {string} packId Pack identifier
   * @param {Object} tree Tree object to populate
   * @param {number} maxDepth Maximum depth
   * @param {number} currentDepth Current depth
   */
  async buildDependencyTree(packId, tree, maxDepth, currentDepth) {
    if (currentDepth >= maxDepth) {
      return;
    }

    try {
      const depResult = await this.resolveDependencies(packId);
      if (!depResult.success) {
        return;
      }

      for (const [depId, depInfo] of Object.entries(depResult.dependencies)) {
        if (depInfo.resolved) {
          tree.dependencies[depId] = {
            id: depId,
            version: depInfo.version,
            path: depInfo.path,
            source: depInfo.source,
            dependencies: {},
            depth: currentDepth + 1,
          };

          await this.buildDependencyTree(
            depId,
            tree.dependencies[depId],
            maxDepth,
            currentDepth + 1
          );
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to build dependency tree for ${packId}:`, error);
    }
  }

  /**
   * Validate dependency versions
   * @param {Object} dependencies Dependency map
   * @returns {Object} Validation result
   */
  validateDependencyVersions(dependencies) {
    const errors = [];
    const warnings = [];

    for (const [depId, version] of Object.entries(dependencies)) {
      if (!version || typeof version !== "string") {
        errors.push(`Invalid version for ${depId}: ${version}`);
        continue;
      }

      // Basic version format validation
      if (!version.match(/^[\d\^~><=!.*\-\s]+$/)) {
        errors.push(`Invalid version format for ${depId}: ${version}`);
      }

      // Check for common issues
      if (version.includes("*")) {
        warnings.push(`Wildcard version for ${depId}: ${version}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
