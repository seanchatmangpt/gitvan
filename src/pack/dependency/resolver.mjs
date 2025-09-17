/**
 * GitVan v2 Dependency Resolver - Resolves pack dependencies and conflicts
 * Handles dependency resolution, circular dependency detection, and conflict analysis
 */

import { createLogger } from '../../utils/logger.mjs';
import { PackRegistry } from '../registry.mjs';

export class DependencyResolver {
  constructor(options = {}) {
    this.options = options;
    this.logger = createLogger('pack:deps');
    this.registry = new PackRegistry(options);
    this.resolved = new Map();
    this.conflicts = [];
    this.cache = new Map();
  }

  async resolve(packId, visited = new Set()) {
    // Check cache first
    if (this.cache.has(packId)) {
      this.logger.debug(`Using cached resolution for ${packId}`);
      return this.cache.get(packId);
    }

    if (visited.has(packId)) {
      this.logger.warn(`Circular dependency detected: ${packId}`);
      return [];
    }

    visited.add(packId);

    // Get pack manifest
    const packInfo = await this.registry.get(packId);
    if (!packInfo) {
      throw new Error(`Pack not found: ${packId}`);
    }

    const dependencies = [];

    // Resolve dependencies recursively
    if (packInfo.compose?.dependsOn) {
      for (const depId of packInfo.compose.dependsOn) {
        try {
          const deps = await this.resolve(depId, new Set(visited));
          dependencies.push(...deps);
        } catch (error) {
          this.logger.error(`Failed to resolve dependency ${depId}: ${error.message}`);
          throw new Error(`Dependency resolution failed for ${depId}: ${error.message}`);
        }
      }
    }

    // Add this pack
    const packDep = {
      id: packId,
      version: packInfo.version,
      order: packInfo.compose?.order || 999,
      info: packInfo
    };

    dependencies.push(packDep);

    // Check conflicts
    if (packInfo.compose?.conflictsWith) {
      for (const conflictId of packInfo.compose.conflictsWith) {
        if (this.resolved.has(conflictId)) {
          this.conflicts.push({
            pack: packId,
            conflictsWith: conflictId,
            type: 'direct'
          });
        }
      }
    }

    this.resolved.set(packId, packInfo);

    const sortedDeps = this.sortByOrder(dependencies);
    this.cache.set(packId, sortedDeps);

    return sortedDeps;
  }

  sortByOrder(dependencies) {
    // Remove duplicates while preserving order
    const seen = new Set();
    const unique = dependencies.filter(dep => {
      if (seen.has(dep.id)) {
        return false;
      }
      seen.add(dep.id);
      return true;
    });

    return unique.sort((a, b) => a.order - b.order);
  }

  async resolveMultiple(packIds) {
    this.logger.info(`Resolving dependencies for ${packIds.length} packs`);

    const allDeps = [];
    const seen = new Set();

    for (const packId of packIds) {
      try {
        const deps = await this.resolve(packId);
        for (const dep of deps) {
          if (!seen.has(dep.id)) {
            allDeps.push(dep);
            seen.add(dep.id);
          }
        }
      } catch (error) {
        this.logger.error(`Failed to resolve ${packId}: ${error.message}`);
        throw error;
      }
    }

    // Final sort by order
    const sorted = allDeps.sort((a, b) => a.order - b.order);

    return {
      dependencies: sorted,
      conflicts: this.conflicts,
      order: sorted.map(d => d.id)
    };
  }

  async checkCompatibility(pack1, pack2) {
    const [info1, info2] = await Promise.all([
      this.registry.get(pack1),
      this.registry.get(pack2)
    ]);

    if (!info1 || !info2) {
      return {
        compatible: false,
        reason: `Pack not found: ${!info1 ? pack1 : pack2}`
      };
    }

    // Check direct conflicts
    if (info1.compose?.conflictsWith?.includes(pack2) ||
        info2.compose?.conflictsWith?.includes(pack1)) {
      return {
        compatible: false,
        reason: 'Direct conflict declared'
      };
    }

    // Check overlapping capabilities
    const caps1 = new Set(info1.capabilities || []);
    const caps2 = new Set(info2.capabilities || []);
    const overlap = [...caps1].filter(c => caps2.has(c));

    if (overlap.length > 0 && !this.options.allowOverlap) {
      return {
        compatible: false,
        reason: `Overlapping capabilities: ${overlap.join(', ')}`
      };
    }

    // Check version conflicts
    if (info1.compose?.incompatibleWith) {
      for (const incompatible of info1.compose.incompatibleWith) {
        if (incompatible.pack === pack2) {
          const versionMatch = this.checkVersionConstraint(info2.version, incompatible.version);
          if (versionMatch) {
            return {
              compatible: false,
              reason: `Version conflict: ${pack1} incompatible with ${pack2}@${incompatible.version}`
            };
          }
        }
      }
    }

    return { compatible: true };
  }

  checkVersionConstraint(version, constraint) {
    // Simple version checking - would use semver in production
    if (constraint.startsWith('^')) {
      return version.startsWith(constraint.slice(1, constraint.indexOf('.', 1)));
    }
    if (constraint.startsWith('~')) {
      const parts = constraint.slice(1).split('.');
      const versionParts = version.split('.');
      return parts[0] === versionParts[0] && parts[1] === versionParts[1];
    }
    return version === constraint;
  }

  async analyzeDependencyTree(packIds) {
    const resolution = await this.resolveMultiple(packIds);

    const analysis = {
      totalPacks: resolution.dependencies.length,
      directDependencies: packIds.length,
      indirectDependencies: resolution.dependencies.length - packIds.length,
      conflicts: resolution.conflicts.length,
      layers: this.calculateLayers(resolution.dependencies),
      criticalPath: this.findCriticalPath(resolution.dependencies)
    };

    return {
      ...resolution,
      analysis
    };
  }

  calculateLayers(dependencies) {
    const layers = new Map();
    let maxLayer = 0;

    for (const dep of dependencies) {
      const layer = dep.order || 999;
      if (!layers.has(layer)) {
        layers.set(layer, []);
      }
      layers.get(layer).push(dep.id);
      maxLayer = Math.max(maxLayer, layer);
    }

    return {
      count: layers.size,
      maxDepth: maxLayer,
      distribution: Object.fromEntries(layers)
    };
  }

  findCriticalPath(dependencies) {
    // Find packs with most dependencies
    const dependencyCounts = new Map();

    for (const dep of dependencies) {
      const count = dep.info.compose?.dependsOn?.length || 0;
      dependencyCounts.set(dep.id, count);
    }

    return [...dependencyCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({ id, dependencyCount: count }));
  }

  clearCache() {
    this.cache.clear();
    this.resolved.clear();
    this.conflicts = [];
    this.logger.debug('Dependency resolver cache cleared');
  }
}