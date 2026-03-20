/**
 * Pack Discovery, Search, Recommendation & Statistics SPARQL Queries
 * Handles finding, searching, suggesting packs, plus federated queries,
 * provenance, statistics, and helper lookups
 */

import consola from 'consola'

export const PackDiscoveryQueries = {
  // ============================================================================
  // Discovery Queries
  // ============================================================================

  /**
   * Find packs by category
   */
  async findPacksByCategory(ks, category, filter = {}) {
    const categoryFilter = category ? `pack:category pack:${category}Category ;` : ''
    const ratingFilter = filter.minRating ? `FILTER(?rating >= ${filter.minRating})` : ''
    const limit = filter.limit || 50

    const query = `
      PREFIX pack: <https://gitvan.dev/pack#>

      SELECT ?name ?version ?description ?rating ?downloads WHERE {
        ?pack a pack:Pack ;
              ${categoryFilter}
              pack:name ?name ;
              pack:latestVersion ?version ;
              pack:description ?description .
        OPTIONAL { ?pack pack:rating ?rating }
        OPTIONAL { ?pack pack:downloadCount ?downloads }
        ${ratingFilter}
      }
      ORDER BY DESC(?rating) DESC(?downloads)
      LIMIT ${limit}
    `

    try {
      const results = await ks.query(query)
      return results.map(r => ({
        name: r.name,
        version: r.version,
        description: r.description,
        rating: parseFloat(r.rating || '0'),
        downloads: parseInt(r.downloads || '0')
      }))
    } catch (error) {
      consola.error('findPacksByCategory error:', error.message)
      return []
    }
  },

  /**
   * Find packs providing a specific feature
   */
  async findPacksByFeature(ks, feature) {
    const query = `
      PREFIX pack: <https://gitvan.dev/pack#>

      SELECT ?name ?version ?description WHERE {
        ?pack a pack:Pack ;
              pack:providesFeature ?feat ;
              pack:name ?name ;
              pack:latestVersion ?version ;
              pack:description ?description .
        ?feat pack:featureName "${feature}" .
      }
      ORDER BY ?name
    `

    try {
      return await ks.query(query)
    } catch (error) {
      consola.error('findPacksByFeature error:', error.message)
      return []
    }
  },

  /**
   * Search packs by query string
   */
  async searchPacks(ks, searchQuery, options = {}) {
    const limit = options.limit || 50

    const query = `
      PREFIX pack: <https://gitvan.dev/pack#>

      SELECT ?name ?version ?description ?rating ?downloads WHERE {
        ?pack a pack:Pack ;
              pack:name ?name ;
              pack:latestVersion ?version ;
              pack:description ?description .
        OPTIONAL { ?pack pack:rating ?rating }
        OPTIONAL { ?pack pack:downloadCount ?downloads }
        FILTER(
          CONTAINS(LCASE(?name), LCASE("${searchQuery}")) ||
          CONTAINS(LCASE(?description), LCASE("${searchQuery}"))
        )
      }
      ORDER BY DESC(?rating) DESC(?downloads)
      LIMIT ${limit}
    `

    try {
      const results = await ks.query(query)
      return results.map(r => ({
        name: r.name,
        version: r.version,
        description: r.description,
        rating: parseFloat(r.rating || '0'),
        downloads: parseInt(r.downloads || '0')
      }))
    } catch (error) {
      consola.error('searchPacks error:', error.message)
      return []
    }
  },

  // ============================================================================
  // Federated Queries
  // ============================================================================

  /**
   * Query remote pack registries
   */
  async queryRemoteRegistries(ks, endpoints, searchQuery = null) {
    const results = []

    for (const endpoint of endpoints) {
      const filter = searchQuery
        ? `FILTER(CONTAINS(LCASE(?name), LCASE("${searchQuery}")))`
        : ''

      const query = `
        PREFIX pack: <https://gitvan.dev/pack#>

        SELECT ?name ?version ?rating ?downloads WHERE {
          SERVICE <${endpoint}> {
            ?pack a pack:Pack ;
                  pack:name ?name ;
                  pack:latestVersion ?version .
            OPTIONAL { ?pack pack:rating ?rating }
            OPTIONAL { ?pack pack:downloadCount ?downloads }
            ${filter}
          }
        }
        ORDER BY DESC(?rating)
        LIMIT 20
      `

      try {
        const endpointResults = await ks.query(query)
        results.push({ endpoint, packs: endpointResults })
      } catch (error) {
        consola.warn(`Failed to query registry ${endpoint}:`, error.message)
        results.push({ endpoint, packs: [], error: error.message })
      }
    }

    return results
  },

  /**
   * Merge and deduplicate results from remote registries
   */
  async mergeRemoteResults(ks, results) {
    const merged = new Map()

    for (const result of results) {
      for (const pack of result.packs || []) {
        const key = `${pack.name}@${pack.version}`
        if (!merged.has(key)) {
          merged.set(key, { ...pack, sources: [result.endpoint] })
        } else {
          merged.get(key).sources.push(result.endpoint)
        }
      }
    }

    return Array.from(merged.values()).sort((a, b) => {
      const scoreA = (parseFloat(a.rating) || 0) * 0.5 + Math.log10((parseInt(a.downloads) || 1) + 1) * 0.5
      const scoreB = (parseFloat(b.rating) || 0) * 0.5 + Math.log10((parseInt(b.downloads) || 1) + 1) * 0.5
      return scoreB - scoreA
    })
  },

  // ============================================================================
  // Recommendation Queries
  // ============================================================================

  /**
   * Suggest packs based on use case
   */
  async suggestPacks(ks, useCase) {
    const categoryMap = {
      authentication: 'AuthenticationCategory',
      'ui dashboard': 'UIComponentsCategory',
      api: 'APIGatewayCategory',
      database: 'DatabaseCategory',
      testing: 'TestingCategory',
      deployment: 'DeploymentCategory',
      monitoring: 'MonitoringCategory',
      security: 'SecurityCategory'
    }

    const category = categoryMap[useCase.toLowerCase()] || null

    if (category) {
      return await this.findPacksByCategory(ks, category.replace('Category', ''))
    } else {
      return await this.searchPacks(ks, useCase)
    }
  },

  /**
   * Find similar packs
   */
  async findSimilarPacks(ks, packId) {
    const query = `
      PREFIX pack: <https://gitvan.dev/pack#>

      SELECT ?name ?version ?description ?category WHERE {
        pack:${packId} pack:category ?cat .
        ?pack a pack:Pack ;
              pack:category ?cat ;
              pack:name ?name ;
              pack:latestVersion ?version ;
              pack:description ?description .
        FILTER(?pack != pack:${packId})
      }
      LIMIT 10
    `

    try {
      return await ks.query(query)
    } catch (error) {
      consola.error('findSimilarPacks error:', error.message)
      return []
    }
  },

  /**
   * Compare multiple packs
   */
  async getPackComparison(ks, packIds, getPackById) {
    const packs = []

    for (const packId of packIds) {
      const pack = await getPackById(ks, packId)
      if (pack) {
        packs.push(pack)
      }
    }

    const comparison = {
      rating: packs.map(p => ({ pack: p.name, rating: p.rating })),
      downloads: packs.map(p => ({ pack: p.name, downloads: p.downloads })),
      dependencies: packs.map(p => ({ pack: p.name, count: p.dependencyCount || 0 })),
      licenses: packs.map(p => ({ pack: p.name, license: p.license }))
    }

    return { packs, comparison }
  },

  // ============================================================================
  // Provenance Queries
  // ============================================================================

  async getPackLineage(ks, packId) {
    const query = `
      PREFIX pack: <https://gitvan.dev/pack#>
      PREFIX prov: <http://www.w3.org/ns/prov#>

      SELECT ?pack ?version ?derivedFrom WHERE {
        {
          BIND(pack:${packId} AS ?pack)
          ?pack pack:version ?version .
          OPTIONAL { ?pack pack:derivedFrom ?derivedFrom }
        }
        UNION
        {
          ?pack pack:derivedFrom+ pack:${packId} .
          ?pack pack:version ?version .
          OPTIONAL { ?pack pack:derivedFrom ?derivedFrom }
        }
      }
    `

    try {
      return await ks.query(query)
    } catch (error) {
      consola.error('getPackLineage error:', error.message)
      return []
    }
  },

  async getUpdateHistory(ks, packId) {
    const query = `
      PREFIX pack: <https://gitvan.dev/pack#>

      SELECT ?version ?publishedAt ?author WHERE {
        pack:${packId} pack:hasVersion ?v .
        ?v pack:version ?version ;
           pack:publishedAt ?publishedAt .
        OPTIONAL { ?v pack:author ?author }
      }
      ORDER BY ?publishedAt
    `

    try {
      return await ks.query(query)
    } catch (error) {
      consola.error('getUpdateHistory error:', error.message)
      return []
    }
  },

  // ============================================================================
  // Statistics Queries
  // ============================================================================

  async getPopularPacks(ks, limit = 10) {
    const query = `
      PREFIX pack: <https://gitvan.dev/pack#>

      SELECT ?name ?version ?downloads ?rating WHERE {
        ?pack a pack:Pack ;
              pack:name ?name ;
              pack:latestVersion ?version ;
              pack:downloadCount ?downloads .
        OPTIONAL { ?pack pack:rating ?rating }
      }
      ORDER BY DESC(?downloads)
      LIMIT ${limit}
    `

    try {
      return await ks.query(query)
    } catch (error) {
      consola.error('getPopularPacks error:', error.message)
      return []
    }
  },

  async getTrendingPacks(ks, limit = 10) {
    const query = `
      PREFIX pack: <https://gitvan.dev/pack#>

      SELECT ?name ?version ?weeklyDownloads ?rating WHERE {
        ?pack a pack:Pack ;
              pack:name ?name ;
              pack:latestVersion ?version ;
              pack:weeklyDownloads ?weeklyDownloads .
        OPTIONAL { ?pack pack:rating ?rating }
      }
      ORDER BY DESC(?weeklyDownloads)
      LIMIT ${limit}
    `

    try {
      return await ks.query(query)
    } catch (error) {
      consola.error('getTrendingPacks error:', error.message)
      return []
    }
  },

  async getPackRatings(ks, packId = null) {
    const filter = packId ? `FILTER(?pack = pack:${packId})` : ''

    const query = `
      PREFIX pack: <https://gitvan.dev/pack#>

      SELECT ?name ?rating ?ratingCount WHERE {
        ?pack a pack:Pack ;
              pack:name ?name ;
              pack:rating ?rating ;
              pack:ratingCount ?ratingCount .
        ${filter}
      }
      ORDER BY DESC(?rating)
    `

    try {
      return await ks.query(query)
    } catch (error) {
      consola.error('getPackRatings error:', error.message)
      return []
    }
  },

  // ============================================================================
  // Helper Queries
  // ============================================================================

  async getPackByVersion(ks, name, version) {
    const query = `
      PREFIX pack: <https://gitvan.dev/pack#>

      SELECT ?pack ?description ?rating ?downloads ?deprecated WHERE {
        ?pack a pack:Pack ;
              pack:name "${name}" ;
              pack:version "${version}" ;
              pack:description ?description .
        OPTIONAL { ?pack pack:rating ?rating }
        OPTIONAL { ?pack pack:downloadCount ?downloads }
        OPTIONAL { ?pack pack:isDeprecated ?deprecated }
      }
      LIMIT 1
    `

    try {
      const results = await ks.query(query)
      return results.length > 0 ? {
        name,
        version,
        description: results[0].description,
        rating: parseFloat(results[0].rating || '0'),
        downloads: parseInt(results[0].downloads || '0'),
        deprecated: results[0].deprecated === 'true'
      } : null
    } catch (error) {
      consola.error('getPackByVersion error:', error.message)
      return null
    }
  },

  async getLatestPack(ks, name) {
    const query = `
      PREFIX pack: <https://gitvan.dev/pack#>

      SELECT ?version ?description ?rating ?downloads WHERE {
        ?pack a pack:Pack ;
              pack:name "${name}" ;
              pack:latestVersion ?version ;
              pack:description ?description .
        OPTIONAL { ?pack pack:rating ?rating }
        OPTIONAL { ?pack pack:downloadCount ?downloads }
      }
      LIMIT 1
    `

    try {
      const results = await ks.query(query)
      return results.length > 0 ? {
        name,
        version: results[0].version,
        description: results[0].description,
        rating: parseFloat(results[0].rating || '0'),
        downloads: parseInt(results[0].downloads || '0')
      } : null
    } catch (error) {
      consola.error('getLatestPack error:', error.message)
      return null
    }
  },

  async getPackById(ks, packId) {
    const query = `
      PREFIX pack: <https://gitvan.dev/pack#>

      SELECT ?name ?version ?description ?rating ?downloads ?license WHERE {
        pack:${packId} pack:name ?name ;
                       pack:latestVersion ?version ;
                       pack:description ?description .
        OPTIONAL { pack:${packId} pack:rating ?rating }
        OPTIONAL { pack:${packId} pack:downloadCount ?downloads }
        OPTIONAL { pack:${packId} pack:licenseSPDX ?license }
      }
      LIMIT 1
    `

    try {
      const results = await ks.query(query)
      return results.length > 0 ? {
        id: packId,
        name: results[0].name,
        version: results[0].version,
        description: results[0].description,
        rating: parseFloat(results[0].rating || '0'),
        downloads: parseInt(results[0].downloads || '0'),
        license: results[0].license || 'Unknown'
      } : null
    } catch (error) {
      consola.error('getPackById error:', error.message)
      return null
    }
  },
}
