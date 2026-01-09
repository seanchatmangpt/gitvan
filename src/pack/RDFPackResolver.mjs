/**
 * GitVan RDF Pack Resolver
 * Semantic version resolution using SPARQL queries
 * Detects circular dependencies, validates licenses, performs federated discovery
 */

import semver from 'semver'
import consola from 'consola'
import { PackQueries } from './queries/PackQueries.mjs'

/**
 * Semantic version resolver for pack dependencies
 */
export class RDFPackResolver {
  constructor(registry, options = {}) {
    this.registry = registry
    this.options = {
      allowCircular: options.allowCircular || false,
      allowDeprecated: options.allowDeprecated || false,
      preferStable: options.preferStable !== false,
      maxDepth: options.maxDepth || 10,
      ...options
    }
    this.resolutionCache = new Map()
  }

  /**
   * Resolve pack with all dependencies
   * @param {string} packName - Pack name
   * @param {string} versionRange - Version constraint
   * @returns {Promise<Object>}
   */
  async resolve(packName, versionRange = '*') {
    consola.info(`Resolving ${packName}@${versionRange}`)

    try {
      // 1. Find compatible versions
      const compatibleVersions = await this._findCompatibleVersions(packName, versionRange)
      if (compatibleVersions.length === 0) {
        throw new Error(`No compatible versions found for ${packName}@${versionRange}`)
      }

      // 2. Select best version
      const selectedVersion = await this._selectBestVersion(compatibleVersions)
      consola.debug(`Selected version: ${selectedVersion.version}`)

      // 3. Resolve dependency tree
      const tree = await this._resolveDependencyTree(packName, selectedVersion.version, 0)

      // 4. Detect circular dependencies
      const circular = await this._detectCircular(tree)
      if (circular.length > 0 && !this.options.allowCircular) {
        throw new Error(`Circular dependencies detected: ${JSON.stringify(circular)}`)
      }

      // 5. Validate licenses
      const licenses = this._extractLicenses(tree)
      const licenseValidation = await this._validateLicenses(licenses)
      if (!licenseValidation.compatible) {
        throw new Error('License incompatibility detected')
      }

      // 6. Flatten dependency tree
      const flattened = this._flattenTree(tree)

      return {
        pack: packName,
        version: selectedVersion.version,
        tree,
        flattened,
        circular,
        licenses: licenseValidation,
        resolved: true
      }
    } catch (error) {
      consola.error(`Resolution failed for ${packName}:`, error.message)
      return {
        pack: packName,
        version: null,
        error: error.message,
        resolved: false
      }
    }
  }

  /**
   * Resolve multiple packs (optimal combination)
   * @param {Array<Object>} packs - Array of {name, versionRange}
   * @returns {Promise<Object>}
   */
  async resolveMultiple(packs) {
    consola.info(`Resolving ${packs.length} packs`)

    const resolved = []
    const errors = []
    const allDependencies = new Map()

    for (const pack of packs) {
      try {
        const resolution = await this.resolve(pack.name, pack.versionRange)

        if (resolution.resolved) {
          resolved.push(resolution)

          // Merge dependencies
          for (const dep of resolution.flattened) {
            const key = dep.name
            if (!allDependencies.has(key)) {
              allDependencies.set(key, dep)
            } else {
              // Check for version conflicts
              const existing = allDependencies.get(key)
              if (existing.version !== dep.version) {
                errors.push({
                  type: 'version-conflict',
                  pack: key,
                  version1: existing.version,
                  version2: dep.version
                })
              }
            }
          }
        } else {
          errors.push({
            type: 'resolution-failed',
            pack: pack.name,
            error: resolution.error
          })
        }
      } catch (error) {
        errors.push({
          type: 'resolution-error',
          pack: pack.name,
          error: error.message
        })
      }
    }

    // Detect conflicts
    const conflicts = await this._detectConflicts(Array.from(allDependencies.values()))

    return {
      packs,
      resolved,
      dependencies: Array.from(allDependencies.values()),
      errors,
      conflicts,
      success: errors.length === 0 && conflicts.length === 0
    }
  }

  /**
   * Perform federated discovery across registries
   * @param {string} packName - Pack name
   * @param {Array<string>} endpoints - SPARQL endpoints
   * @returns {Promise<Array>}
   */
  async federatedDiscovery(packName, endpoints = null) {
    consola.info(`Federated discovery for ${packName}`)

    const registryEndpoints = endpoints || this.options.federatedEndpoints || []
    if (registryEndpoints.length === 0) {
      consola.warn('No federated endpoints configured')
      return []
    }

    try {
      const results = await this.registry.discoverFederatedPacks(registryEndpoints, packName)
      consola.success(`Found ${results.length} federated results`)
      return results
    } catch (error) {
      consola.error('Federated discovery failed:', error.message)
      return []
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Find compatible versions using SPARQL
   * @private
   */
  async _findCompatibleVersions(packName, versionRange) {
    const cacheKey = `versions:${packName}:${versionRange}`
    if (this.resolutionCache.has(cacheKey)) {
      return this.resolutionCache.get(cacheKey)
    }

    try {
      const versions = await PackQueries.findCompatibleVersions(
        this.registry.ks,
        packName,
        versionRange
      )

      // Filter deprecated if not allowed
      const filtered = this.options.allowDeprecated
        ? versions
        : versions.filter(v => !v.deprecated)

      // Filter prerelease if preferStable
      const stable = this.options.preferStable
        ? filtered.filter(v => !this._isPrerelease(v.version))
        : filtered

      this.resolutionCache.set(cacheKey, stable)
      return stable
    } catch (error) {
      consola.error('Failed to find compatible versions:', error.message)
      return []
    }
  }

  /**
   * Select best version from compatible versions
   * @private
   */
  async _selectBestVersion(versions) {
    if (versions.length === 0) {
      throw new Error('No versions available')
    }

    // Sort by semantic version (descending)
    const sorted = versions.sort((a, b) => {
      try {
        return semver.rcompare(a.version, b.version)
      } catch (error) {
        // Fallback to string comparison
        return b.version.localeCompare(a.version)
      }
    })

    return sorted[0]
  }

  /**
   * Recursively resolve dependency tree
   * @private
   */
  async _resolveDependencyTree(packName, version, depth = 0) {
    if (depth > this.options.maxDepth) {
      consola.warn(`Max depth ${this.options.maxDepth} reached for ${packName}`)
      return { name: packName, version, dependencies: [], maxDepthReached: true }
    }

    const cacheKey = `tree:${packName}:${version}`
    if (this.resolutionCache.has(cacheKey)) {
      return this.resolutionCache.get(cacheKey)
    }

    try {
      const tree = await PackQueries.resolveDependencyTree(
        this.registry.ks,
        packName,
        version
      )

      // Resolve each dependency recursively
      const resolvedDeps = []
      for (const dep of tree.dependencies || []) {
        const depVersions = await this._findCompatibleVersions(dep.target, dep.versionRange)
        if (depVersions.length > 0) {
          const selectedVersion = await this._selectBestVersion(depVersions)
          const subtree = await this._resolveDependencyTree(
            dep.target,
            selectedVersion.version,
            depth + 1
          )
          resolvedDeps.push({
            ...dep,
            resolvedVersion: selectedVersion.version,
            subtree
          })
        } else {
          consola.warn(`No compatible version found for ${dep.target}@${dep.versionRange}`)
          resolvedDeps.push({
            ...dep,
            resolvedVersion: null,
            error: 'No compatible version'
          })
        }
      }

      const result = {
        name: packName,
        version,
        dependencies: resolvedDeps
      }

      this.resolutionCache.set(cacheKey, result)
      return result
    } catch (error) {
      consola.error(`Failed to resolve tree for ${packName}:`, error.message)
      return { name: packName, version, dependencies: [], error: error.message }
    }
  }

  /**
   * Detect circular dependencies
   * @private
   */
  async _detectCircular(tree, visited = new Set(), path = []) {
    const circular = []

    if (visited.has(tree.name)) {
      // Found a cycle
      const cycleStart = path.indexOf(tree.name)
      if (cycleStart !== -1) {
        circular.push({
          cycle: [...path.slice(cycleStart), tree.name],
          type: 'circular'
        })
      }
      return circular
    }

    visited.add(tree.name)
    path.push(tree.name)

    for (const dep of tree.dependencies || []) {
      if (dep.subtree) {
        const subCircular = await this._detectCircular(
          dep.subtree,
          new Set(visited),
          [...path]
        )
        circular.push(...subCircular)
      }
    }

    return circular
  }

  /**
   * Extract all licenses from dependency tree
   * @private
   */
  _extractLicenses(tree, licenses = new Set()) {
    if (tree.license) {
      licenses.add(tree.license)
    }

    for (const dep of tree.dependencies || []) {
      if (dep.subtree) {
        this._extractLicenses(dep.subtree, licenses)
      }
    }

    return Array.from(licenses)
  }

  /**
   * Validate license compatibility
   * @private
   */
  async _validateLicenses(licenses) {
    if (licenses.length === 0) {
      return { compatible: true, licenses: [] }
    }

    try {
      return await this.registry.checkLicenseCompatibility(licenses)
    } catch (error) {
      consola.error('License validation failed:', error.message)
      return { compatible: false, licenses, error: error.message }
    }
  }

  /**
   * Flatten dependency tree to list
   * @private
   */
  _flattenTree(tree, flattened = []) {
    flattened.push({
      name: tree.name,
      version: tree.version
    })

    for (const dep of tree.dependencies || []) {
      if (dep.subtree) {
        this._flattenTree(dep.subtree, flattened)
      }
    }

    // Deduplicate by name
    const seen = new Map()
    const deduplicated = []
    for (const item of flattened) {
      if (!seen.has(item.name)) {
        seen.set(item.name, item)
        deduplicated.push(item)
      } else {
        // Check for version conflicts
        const existing = seen.get(item.name)
        if (existing.version !== item.version) {
          consola.warn(`Version conflict for ${item.name}: ${existing.version} vs ${item.version}`)
        }
      }
    }

    return deduplicated
  }

  /**
   * Detect conflicts between packs
   * @private
   */
  async _detectConflicts(dependencies) {
    const conflicts = []

    // Check for incompatible packs
    for (let i = 0; i < dependencies.length; i++) {
      for (let j = i + 1; j < dependencies.length; j++) {
        const dep1 = dependencies[i]
        const dep2 = dependencies[j]

        const compatibility = await PackQueries.checkVersionCompatibility(
          this.registry.ks,
          dep1.name,
          dep2.name
        )

        if (compatibility && !compatibility.compatible) {
          conflicts.push({
            type: 'incompatible',
            pack1: dep1.name,
            pack2: dep2.name
          })
        }
      }
    }

    return conflicts
  }

  /**
   * Check if version is prerelease
   * @private
   */
  _isPrerelease(version) {
    try {
      const parsed = semver.parse(version)
      return parsed && parsed.prerelease.length > 0
    } catch (error) {
      // Assume not prerelease if parse fails
      return false
    }
  }

  /**
   * Clear resolution cache
   */
  clearCache() {
    this.resolutionCache.clear()
    consola.info('Resolution cache cleared')
  }

  /**
   * Get resolver statistics
   */
  getStatistics() {
    return {
      cacheSize: this.resolutionCache.size,
      options: this.options
    }
  }
}

/**
 * Factory function for RDFPackResolver
 */
export function createRDFPackResolver(registry, options = {}) {
  return new RDFPackResolver(registry, options)
}
