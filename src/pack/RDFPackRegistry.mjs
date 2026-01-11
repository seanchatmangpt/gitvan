/**
 * GitVan RDF Pack Registry
 * Unified semantic pack registry using RDF/SPARQL
 * Implements Phase 4 requirements from UNRDF-PACKAGES-SURVEY.md
 */

import { parseTurtle } from "@unrdf/core"
import consola from 'consola'
import { PackQueries } from './queries/PackQueries.mjs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { useGraphCache } from '../composables/useGraphCache.mjs'

/**
 * RDF-based Pack Registry
 * Provides semantic version resolution, license compatibility,
 * and federated pack discovery with LRU caching for improved performance
 */
export class RDFPackRegistry {
  constructor(knowledgeSubstrate, options = {}) {
    this.ks = knowledgeSubstrate
    this.options = {
      baseIRI: options.baseIRI || 'https://gitvan.dev/pack#',
      registryEndpoints: options.registryEndpoints || [],
      cacheEnabled: options.cacheEnabled !== false,
      ...options
    }
    this.initialized = false

    // Use LRU cache for better performance and memory management
    if (this.options.cacheEnabled) {
      this.queryCache = useGraphCache({ maxEntries: 200, ttlMs: 60 * 60 * 1000 }) // 1 hour
      this.packCache = useGraphCache({ maxEntries: 500, ttlMs: 60 * 60 * 1000 }) // 1 hour
    } else {
      this.queryCache = null
      this.packCache = null
    }
  }

  /**
   * Initialize the registry with pack ontology
   */
  async initialize(knowledgeSubstrate) {
    if (this.initialized) return this

    // If KnowledgeSubstrate passed as argument, use it
    if (knowledgeSubstrate) {
      this.ks = knowledgeSubstrate
    }

    if (!this.ks) {
      throw new Error('KnowledgeSubstrate is required for RDFPackRegistry')
    }

    try {
      // Load pack ontology
      const ontologyPath = join(process.cwd(), 'src/rdf/ontologies/pack-ontology.ttl')
      const ontologyTurtle = await readFile(ontologyPath, 'utf-8')

      // Parse and load into knowledge substrate
      await this.ks.loadTurtle(ontologyTurtle)

      this.initialized = true
      consola.success('RDFPackRegistry initialized with pack ontology')
    } catch (error) {
      consola.error('Failed to initialize RDFPackRegistry:', error.message)
      throw error
    }

    return this
  }

  /**
   * Register a pack from Turtle manifest
   * @param {string} packMetadata - Turtle-formatted pack manifest
   * @returns {Promise<{packId: string, status: string}>}
   */
  async registerPack(packMetadata) {
    await this._ensureInitialized()

    try {
      // Parse Turtle metadata
      const parsed = await this._parseTurtle(packMetadata)

      // Extract pack ID and basic info
      const packId = this._extractPackId(parsed)

      // Add to knowledge substrate
      await this.ks.loadTurtle(packMetadata)

      // Analyze dependencies
      const dependencies = await this.resolveDependencies(packId)

      // Check license compatibility
      const license = await this._extractLicense(packId)
      if (license) {
        const licenseCompatibility = await this.checkLicenseCompatibility([license])
        consola.debug(`License compatibility for ${packId}:`, licenseCompatibility)
      }

      // Invalidate caches
      this._invalidateCache(packId)

      consola.success(`Pack registered: ${packId}`)
      return { packId, status: 'registered', dependencies }
    } catch (error) {
      consola.error('Failed to register pack:', error.message)
      throw error
    }
  }

  /**
   * Get pack by name and version
   * @param {string} name - Pack name
   * @param {string} version - Semantic version or range (optional)
   * @returns {Promise<Object|null>}
   */
  async getPack(name, version = null) {
    await this._ensureInitialized()

    const cacheKey = `pack:${name}:${version || 'latest'}`

    // Check cache first
    if (this.options.cacheEnabled) {
      const cached = this.packCache.get(cacheKey)
      if (cached) return cached
    }

    try {
      let pack
      if (version) {
        pack = await PackQueries.getPackByVersion(this.ks, name, version)
      } else {
        pack = await PackQueries.getLatestPack(this.ks, name)
      }

      if (pack && this.options.cacheEnabled) {
        this.packCache.set(cacheKey, pack)
      }

      return pack
    } catch (error) {
      consola.error(`Failed to get pack ${name}@${version}:`, error.message)
      return null
    }
  }

  /**
   * List packs by category and filter
   * @param {string} category - Pack category
   * @param {Object} filter - Additional filters
   * @returns {Promise<Array>}
   */
  async listPacks(category = null, filter = {}) {
    await this._ensureInitialized()

    try {
      return await PackQueries.findPacksByCategory(this.ks, category, filter)
    } catch (error) {
      consola.error('Failed to list packs:', error.message)
      return []
    }
  }

  /**
   * Query packs compatible with specific GitVan version
   * @param {string} gitvanVersion - GitVan version (e.g., "3.0.0")
   * @returns {Promise<Array>}
   */
  async queryPackCompatibility(gitvanVersion) {
    await this._ensureInitialized()

    try {
      return await PackQueries.findCompatibleVersions(this.ks, gitvanVersion)
    } catch (error) {
      consola.error('Failed to query pack compatibility:', error.message)
      return []
    }
  }

  /**
   * Resolve dependencies for a pack using semantic version resolution
   * @param {string} packName - Pack name
   * @param {Object} options - Resolution options
   * @returns {Promise<Object>}
   */
  async resolveDependencies(packName, options = {}) {
    await this._ensureInitialized()

    try {
      // Get dependency tree
      const tree = await PackQueries.resolveDependencyTree(this.ks, packName)

      // Detect circular dependencies
      const circular = await PackQueries.detectCircularDependencies(this.ks, packName)
      if (circular.length > 0) {
        consola.warn(`Circular dependencies detected for ${packName}:`, circular)
      }

      // Validate dependencies
      const validation = await PackQueries.validateDependencies(this.ks, tree)

      return {
        tree,
        circular,
        validation,
        resolved: validation.valid
      }
    } catch (error) {
      consola.error(`Failed to resolve dependencies for ${packName}:`, error.message)
      throw error
    }
  }

  /**
   * Check license compatibility with compatibility matrix
   * @param {Array<string>} licenses - SPDX license identifiers
   * @returns {Promise<Object>}
   */
  async checkLicenseCompatibility(licenses) {
    await this._ensureInitialized()

    try {
      const compatibility = await PackQueries.getLicenseCompatibility(this.ks, licenses)

      // Build compatibility matrix
      const matrix = {}
      for (const license1 of licenses) {
        matrix[license1] = {}
        for (const license2 of licenses) {
          const compatible = compatibility.find(c =>
            (c.license1 === license1 && c.license2 === license2) ||
            (c.license1 === license2 && c.license2 === license1)
          )
          matrix[license1][license2] = compatible ? true : false
        }
      }

      return {
        licenses,
        matrix,
        compatible: compatibility.length > 0
      }
    } catch (error) {
      consola.error('Failed to check license compatibility:', error.message)
      return { licenses, matrix: {}, compatible: false }
    }
  }

  /**
   * Discover packs across federated SPARQL endpoints
   * @param {Array<string>} endpoints - SPARQL endpoint URLs
   * @param {string} query - Search query
   * @returns {Promise<Array>}
   */
  async discoverFederatedPacks(endpoints = null, query = null) {
    await this._ensureInitialized()

    const registryEndpoints = endpoints || this.options.registryEndpoints
    if (registryEndpoints.length === 0) {
      consola.warn('No federated registry endpoints configured')
      return []
    }

    try {
      const results = await PackQueries.queryRemoteRegistries(
        this.ks,
        registryEndpoints,
        query
      )

      // Merge and deduplicate results
      const merged = await PackQueries.mergeRemoteResults(this.ks, results)

      consola.info(`Discovered ${merged.length} packs from federated registries`)
      return merged
    } catch (error) {
      consola.error('Failed to discover federated packs:', error.message)
      return []
    }
  }

  /**
   * Validate pack signature and integrity
   * @param {string} packId - Pack identifier
   * @returns {Promise<Object>}
   */
  async validatePackSignature(packId) {
    await this._ensureInitialized()

    try {
      const pack = await this.getPack(packId)
      if (!pack) {
        return { valid: false, error: 'Pack not found' }
      }

      // Check provenance
      const provenance = await this._getPackProvenance(packId)

      // Verify author
      const author = pack.author || {}
      const authorVerified = author.verified === true

      // Check for deprecation
      const deprecated = pack.deprecated === true

      return {
        valid: authorVerified && !deprecated,
        packId,
        author,
        authorVerified,
        deprecated,
        provenance
      }
    } catch (error) {
      consola.error(`Failed to validate pack ${packId}:`, error.message)
      return { valid: false, error: error.message }
    }
  }

  /**
   * Get pack suggestions based on use case
   * @param {string} useCase - Use case description (e.g., "authentication", "ui dashboard")
   * @returns {Promise<Array>}
   */
  async getSuggestions(useCase) {
    await this._ensureInitialized()

    try {
      const suggestions = await PackQueries.suggestPacks(this.ks, useCase)

      // Sort by relevance (rating, downloads, etc.)
      suggestions.sort((a, b) => {
        const scoreA = (a.rating || 0) * 0.5 + Math.log10((a.downloads || 1) + 1) * 0.5
        const scoreB = (b.rating || 0) * 0.5 + Math.log10((b.downloads || 1) + 1) * 0.5
        return scoreB - scoreA
      })

      return suggestions
    } catch (error) {
      consola.error('Failed to get pack suggestions:', error.message)
      return []
    }
  }

  /**
   * Analyze pack lineage and provenance
   * @param {string} packId - Pack identifier
   * @returns {Promise<Object>}
   */
  async analyzePackLineage(packId) {
    await this._ensureInitialized()

    try {
      const lineage = await PackQueries.getPackLineage(this.ks, packId)
      const history = await PackQueries.getUpdateHistory(this.ks, packId)

      // Build lineage tree
      const tree = this._buildLineageTree(lineage)

      return {
        packId,
        lineage: tree,
        history,
        totalVersions: history.length,
        firstPublished: history.length > 0 ? history[0].publishedAt : null,
        lastUpdated: history.length > 0 ? history[history.length - 1].publishedAt : null
      }
    } catch (error) {
      consola.error(`Failed to analyze lineage for ${packId}:`, error.message)
      return { packId, lineage: [], history: [] }
    }
  }

  /**
   * Search packs with advanced filtering
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>}
   */
  async searchPacks(query, options = {}) {
    await this._ensureInitialized()

    try {
      return await PackQueries.searchPacks(this.ks, query, options)
    } catch (error) {
      consola.error('Failed to search packs:', error.message)
      return []
    }
  }

  /**
   * Get popular packs
   * @param {number} limit - Number of packs to return
   * @returns {Promise<Array>}
   */
  async getPopularPacks(limit = 10) {
    await this._ensureInitialized()

    try {
      return await PackQueries.getPopularPacks(this.ks, limit)
    } catch (error) {
      consola.error('Failed to get popular packs:', error.message)
      return []
    }
  }

  /**
   * Get trending packs
   * @param {number} limit - Number of packs to return
   * @returns {Promise<Array>}
   */
  async getTrendingPacks(limit = 10) {
    await this._ensureInitialized()

    try {
      return await PackQueries.getTrendingPacks(this.ks, limit)
    } catch (error) {
      consola.error('Failed to get trending packs:', error.message)
      return []
    }
  }

  /**
   * Compare multiple packs
   * @param {Array<string>} packIds - Pack identifiers to compare
   * @returns {Promise<Object>}
   */
  async comparePacks(packIds) {
    await this._ensureInitialized()

    try {
      return await PackQueries.getPackComparison(this.ks, packIds)
    } catch (error) {
      consola.error('Failed to compare packs:', error.message)
      return { packs: [], comparison: {} }
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  async _ensureInitialized() {
    if (!this.initialized) {
      throw new Error('RDFPackRegistry not initialized. Call initialize() first.')
    }
  }

  async _parseTurtle(turtle) {
    try {
      const quads = await parseTurtle(turtle)
      return Array.isArray(quads) ? quads : Array.from(quads)
    } catch (error) {
      throw new Error(`Failed to parse Turtle: ${error.message}`)
    }
  }

  _extractPackId(triples) {
    // Find subject with rdf:type pack:Pack
    for (const triple of triples) {
      if (triple.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' &&
          triple.object.value.includes('Pack')) {
        return triple.subject.value.split('#').pop()
      }
    }
    throw new Error('No pack:Pack found in manifest')
  }

  async _extractLicense(packId) {
    try {
      const result = await this.ks.query(`
        PREFIX pack: <https://gitvan.dev/pack#>
        SELECT ?license WHERE {
          pack:${packId} pack:licenseSPDX ?license .
        }
        LIMIT 1
      `)
      return result.length > 0 ? result[0].license : null
    } catch (error) {
      return null
    }
  }

  async _getPackProvenance(packId) {
    try {
      const result = await this.ks.query(`
        PREFIX pack: <https://gitvan.dev/pack#>
        PREFIX prov: <http://www.w3.org/ns/prov#>
        SELECT ?createdAt ?author ?derivedFrom WHERE {
          pack:${packId} pack:createdAt ?createdAt ;
                         pack:author ?author .
          OPTIONAL { pack:${packId} pack:derivedFrom ?derivedFrom }
        }
        LIMIT 1
      `)
      return result.length > 0 ? result[0] : null
    } catch (error) {
      return null
    }
  }

  _buildLineageTree(lineage) {
    const tree = {}
    for (const item of lineage) {
      if (!tree[item.pack]) {
        tree[item.pack] = {
          pack: item.pack,
          versions: [],
          derivedFrom: item.derivedFrom || null
        }
      }
      tree[item.pack].versions.push(item.version)
    }
    return Object.values(tree)
  }

  _invalidateCache(packId) {
    if (!this.options.cacheEnabled) return

    // Invalidate related cache entries using wildcard patterns
    this.queryCache.invalidate(`*${packId}*`)
    this.packCache.invalidate(`*${packId}*`)
  }

  /**
   * Export registry statistics
   * @returns {Promise<Object>}
   */
  async getStatistics() {
    await this._ensureInitialized()

    try {
      const totalPacks = await this.ks.query(`
        PREFIX pack: <https://gitvan.dev/pack#>
        SELECT (COUNT(DISTINCT ?pack) AS ?count) WHERE {
          ?pack a pack:Pack .
        }
      `)

      const categoryStats = await this.ks.query(`
        PREFIX pack: <https://gitvan.dev/pack#>
        SELECT ?category (COUNT(?pack) AS ?count) WHERE {
          ?pack a pack:Pack ;
                pack:category ?category .
        }
        GROUP BY ?category
        ORDER BY DESC(?count)
      `)

      const packCacheStats = this.options.cacheEnabled ? this.packCache.stats() : { currentEntries: 0 }
      const queryCacheStats = this.options.cacheEnabled ? this.queryCache.stats() : { currentEntries: 0 }

      return {
        totalPacks: totalPacks[0]?.count || 0,
        categories: categoryStats,
        cacheSize: packCacheStats.currentEntries,
        queryCacheSize: queryCacheStats.currentEntries
      }
    } catch (error) {
      consola.error('Failed to get statistics:', error.message)
      return { totalPacks: 0, categories: [], cacheSize: 0, queryCacheSize: 0 }
    }
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.queryCache.clear()
    this.packCache.clear()
    consola.info('Registry caches cleared')
  }
}

/**
 * Factory function for RDFPackRegistry
 */
