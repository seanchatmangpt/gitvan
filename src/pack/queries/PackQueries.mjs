/**
 * GitVan Pack SPARQL Queries
 * Comprehensive query library for pack discovery, version resolution,
 * and dependency analysis
 *
 * Re-exports all queries from sub-modules for backward compatibility.
 * New code should import from the specific sub-modules directly:
 * - PackDependencyQueries: version resolution, dependency trees, validation
 * - PackDiscoveryQueries: search, discovery, recommendations, statistics, helpers
 */

import { PackDependencyQueries } from './PackDependencyQueries.mjs'
import { PackDiscoveryQueries } from './PackDiscoveryQueries.mjs'

export { PackDependencyQueries } from './PackDependencyQueries.mjs'
export { PackDiscoveryQueries } from './PackDiscoveryQueries.mjs'

/**
 * Unified PackQueries object - merges all sub-module queries
 * Maintains full backward compatibility with existing imports
 */
export const PackQueries = {
  // Dependency & Version Resolution
  findCompatibleVersions: PackDependencyQueries.findCompatibleVersions.bind(PackDependencyQueries),
  resolveDependencyTree: PackDependencyQueries.resolveDependencyTree.bind(PackDependencyQueries),
  resolveDependencyTreeOptimized: PackDependencyQueries.resolveDependencyTreeOptimized.bind(PackDependencyQueries),
  detectCircularDependencies: PackDependencyQueries.detectCircularDependencies.bind(PackDependencyQueries),
  checkVersionCompatibility: PackDependencyQueries.checkVersionCompatibility.bind(PackDependencyQueries),
  getLicenseCompatibility: PackDependencyQueries.getLicenseCompatibility.bind(PackDependencyQueries),

  // validateDependencies needs getPackByVersion passed in from discovery queries
  async validateDependencies(ks, dependencyTree) {
    return PackDependencyQueries.validateDependencies(
      ks, dependencyTree, PackDiscoveryQueries.getPackByVersion.bind(PackDiscoveryQueries)
    )
  },

  // Discovery & Search
  findPacksByCategory: PackDiscoveryQueries.findPacksByCategory.bind(PackDiscoveryQueries),
  findPacksByFeature: PackDiscoveryQueries.findPacksByFeature.bind(PackDiscoveryQueries),
  searchPacks: PackDiscoveryQueries.searchPacks.bind(PackDiscoveryQueries),

  // Federated
  queryRemoteRegistries: PackDiscoveryQueries.queryRemoteRegistries.bind(PackDiscoveryQueries),
  mergeRemoteResults: PackDiscoveryQueries.mergeRemoteResults.bind(PackDiscoveryQueries),

  // Recommendations
  suggestPacks: PackDiscoveryQueries.suggestPacks.bind(PackDiscoveryQueries),
  findSimilarPacks: PackDiscoveryQueries.findSimilarPacks.bind(PackDiscoveryQueries),

  async getPackComparison(ks, packIds) {
    return PackDiscoveryQueries.getPackComparison(
      ks, packIds, PackDiscoveryQueries.getPackById.bind(PackDiscoveryQueries)
    )
  },

  // Provenance
  getPackLineage: PackDiscoveryQueries.getPackLineage.bind(PackDiscoveryQueries),
  getUpdateHistory: PackDiscoveryQueries.getUpdateHistory.bind(PackDiscoveryQueries),

  // Statistics
  getPopularPacks: PackDiscoveryQueries.getPopularPacks.bind(PackDiscoveryQueries),
  getTrendingPacks: PackDiscoveryQueries.getTrendingPacks.bind(PackDiscoveryQueries),
  getPackRatings: PackDiscoveryQueries.getPackRatings.bind(PackDiscoveryQueries),

  // Helpers
  getPackByVersion: PackDiscoveryQueries.getPackByVersion.bind(PackDiscoveryQueries),
  getLatestPack: PackDiscoveryQueries.getLatestPack.bind(PackDiscoveryQueries),
  getPackById: PackDiscoveryQueries.getPackById.bind(PackDiscoveryQueries),
}
