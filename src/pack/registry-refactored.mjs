/**
 * Refactored Pack Registry
 * Main facade that coordinates all pack operations using focused modules
 */

import { createLogger } from "../utils/logger.mjs";
import { PackDiscovery } from "./discovery.mjs";
import { PackLoader } from "./loading.mjs";
import { PackRegistryManager } from "./registry-manager.mjs";
import { PackMetadataManager } from "./metadata.mjs";
import { PackDependencyManager } from "./dependencies.mjs";
import { join } from "pathe";
import { homedir } from "node:os";

export class PackRegistry {
  constructor(options = {}) {
    this.options = options;
    this.logger = createLogger("pack:registry");

    // Initialize focused modules
    this.discovery = new PackDiscovery(options);
    this.loader = new PackLoader(options);
    this.registryManager = new PackRegistryManager(options);
    this.metadataManager = new PackMetadataManager(options);
    this.dependencyManager = new PackDependencyManager(options);

    // Initialize registry
    this.initialize();
  }

  /**
   * Initialize the registry
   */
  async initialize() {
    try {
      this.logger.info("Initializing Pack Registry...");

      // Discover all available packs
      const allPacks = this.discovery.getAllPacks();
      const allPacksList = [...allPacks.local, ...allPacks.builtin];

      // Refresh registry index
      await this.registryManager.refreshIndex(allPacksList);

      this.logger.info(
        `Pack Registry initialized with ${allPacksList.length} packs`
      );
    } catch (error) {
      this.logger.error("Failed to initialize Pack Registry:", error);
    }
  }

  /**
   * Search for packs
   * @param {string} query Search query
   * @param {Object} filters Search filters
   * @returns {Array} Array of matching packs
   */
  async search(query, filters = {}) {
    return await this.registryManager.search(query, filters);
  }

  /**
   * Get pack by ID
   * @param {string} packId Pack identifier
   * @returns {Object|null} Pack information or null if not found
   */
  async get(packId) {
    // First try registry
    let pack = await this.registryManager.get(packId);

    if (!pack) {
      // Try loading from local filesystem
      pack = await this.loader.loadLocalPack(packId);

      if (pack) {
        // Add to registry for future lookups
        await this.registryManager.refreshIndex([pack]);
      }
    }

    return pack;
  }

  /**
   * Resolve pack (get local path)
   * @param {string} packId Pack identifier
   * @returns {string|null} Path to pack or null if not found
   */
  async resolve(packId) {
    // Try local resolution first
    const localPath = this.discovery.resolveLocalPack(packId);
    if (localPath) {
      return localPath;
    }

    // Try loading from registry
    const pack = await this.get(packId);
    if (pack && pack.path) {
      return pack.path;
    }

    return null;
  }

  /**
   * Load pack data
   * @param {string} packId Pack identifier
   * @returns {Object|null} Loaded pack data or null if not found
   */
  async load(packId) {
    return await this.loader.loadLocalPack(packId);
  }

  /**
   * Resolve pack dependencies
   * @param {string} packId Pack identifier
   * @returns {Object} Dependency resolution result
   */
  async resolveDependencies(packId) {
    return await this.dependencyManager.resolveDependencies(packId);
  }

  /**
   * Get dependency tree for a pack
   * @param {string} packId Pack identifier
   * @param {number} maxDepth Maximum depth
   * @returns {Object} Dependency tree
   */
  async getDependencyTree(packId, maxDepth = 5) {
    return await this.dependencyManager.getDependencyTree(packId, maxDepth);
  }

  /**
   * Check for circular dependencies
   * @param {string} packId Pack identifier
   * @returns {Object} Circular dependency check result
   */
  async checkCircularDependencies(packId) {
    return await this.dependencyManager.checkCircularDependencies(packId);
  }

  /**
   * Validate pack data
   * @param {Object} packData Pack data to validate
   * @returns {Object} Validation result
   */
  validatePackData(packData) {
    return this.metadataManager.validatePackInfo(packData);
  }

  /**
   * Sanitize pack information
   * @param {Object} pack Raw pack data
   * @returns {Object} Sanitized pack data
   */
  sanitizePackInfo(pack) {
    return this.metadataManager.sanitizePackInfo(pack);
  }

  /**
   * Get registry statistics
   * @returns {Object} Registry statistics
   */
  getStats() {
    return this.registryManager.getStats();
  }

  /**
   * Refresh registry index
   * @returns {Promise<void>}
   */
  async refreshIndex() {
    const allPacks = this.discovery.getAllPacks();
    const allPacksList = [...allPacks.local, ...allPacks.builtin];
    await this.registryManager.refreshIndex(allPacksList);
  }

  /**
   * Clear pack cache
   * @param {string} packId Optional pack ID to clear specific pack
   */
  async clearCache(packId = null) {
    await this.loader.clearCache(packId);
  }

  /**
   * Get all available packs
   * @returns {Object} Object with pack arrays by source
   */
  getAllPacks() {
    return this.discovery.getAllPacks();
  }

  /**
   * Check if pack is compatible with current environment
   * @param {Object} pack Pack data
   * @param {Object} environment Environment information
   * @returns {boolean} True if compatible
   */
  isCompatible(pack, environment = {}) {
    return this.metadataManager.isCompatible(pack, environment);
  }

  /**
   * Validate dependency versions
   * @param {Object} dependencies Dependency map
   * @returns {Object} Validation result
   */
  validateDependencyVersions(dependencies) {
    return this.dependencyManager.validateDependencyVersions(dependencies);
  }

  /**
   * Check rate limit for operation
   * @param {string} operation Operation name
   * @param {number} windowMs Time window in milliseconds
   * @returns {boolean} True if operation is allowed
   */
  checkRateLimit(operation, windowMs) {
    return this.registryManager.checkRateLimit(operation, windowMs);
  }

  /**
   * Get pack by ID (legacy method for backward compatibility)
   * @param {string} packId Pack identifier
   * @returns {Object|null} Pack information or null if not found
   */
  async fetchFromRegistry(packId) {
    return await this.get(packId);
  }

  /**
   * Resolve builtin pack (legacy method for backward compatibility)
   * @param {string} packId Pack identifier
   * @returns {string|null} Path to builtin pack or null if not found
   */
  resolveBuiltin(packId) {
    return this.discovery.resolveLocalPack(packId);
  }
}
