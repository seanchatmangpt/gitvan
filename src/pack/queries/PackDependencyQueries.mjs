/**
 * Pack Dependency & Version Resolution SPARQL Queries
 * Handles version resolution, dependency trees, circular detection, validation
 */

import consola from 'consola'

export const PackDependencyQueries = {
  /**
   * Find compatible versions of a pack given a version range
   * @param {Object} ks - Knowledge Substrate
   * @param {string} packName - Pack name
   * @param {string} versionRange - Semantic version range
   * @returns {Promise<Array>}
   */
  async findCompatibleVersions(ks, packName, versionRange = null) {
    const query = `
      PREFIX pack: <https://gitvan.dev/pack#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

      SELECT ?version ?publishedAt ?isDeprecated WHERE {
        ?pack a pack:Pack ;
              pack:name "${packName}" ;
              pack:version ?version ;
              pack:publishedAt ?publishedAt .
        OPTIONAL { ?pack pack:isDeprecated ?isDeprecated }
        ${versionRange ? `FILTER(pack:satisfiesVersionRange(?version, "${versionRange}"))` : ''}
      }
      ORDER BY DESC(?publishedAt)
    `

    try {
      const results = await ks.query(query)
      return results.map(r => ({
        version: r.version,
        publishedAt: r.publishedAt,
        deprecated: r.isDeprecated === 'true'
      }))
    } catch (error) {
      consola.error('findCompatibleVersions error:', error.message)
      return []
    }
  },

  /**
   * Resolve full dependency tree for a pack
   * @deprecated Use resolveDependencyTreeOptimized() to avoid N+1 queries
   */
  async resolveDependencyTree(ks, packName, version = null) {
    const versionFilter = version ? `pack:version "${version}" ;` : 'pack:latestVersion ?version ;'

    const query = `
      PREFIX pack: <https://gitvan.dev/pack#>

      SELECT ?dependency ?targetPack ?versionRange ?isRequired WHERE {
        ?pack a pack:Pack ;
              pack:name "${packName}" ;
              ${versionFilter}
              pack:dependsOn ?dep .
        ?dep pack:targetPack ?targetPack ;
             pack:versionRange ?versionRange .
        OPTIONAL { ?dep pack:isRequired ?isRequired }
      }
    `

    try {
      const results = await ks.query(query)
      const tree = {
        pack: packName,
        version: version || 'latest',
        dependencies: results.map(r => ({
          target: r.targetPack,
          versionRange: r.versionRange,
          required: r.isRequired !== 'false'
        }))
      }

      // Recursively resolve dependencies (N+1 ANTI-PATTERN)
      for (const dep of tree.dependencies) {
        const subtree = await this.resolveDependencyTree(ks, dep.target)
        dep.dependencies = subtree.dependencies
      }

      return tree
    } catch (error) {
      consola.error('resolveDependencyTree error:', error.message)
      return { pack: packName, version, dependencies: [] }
    }
  },

  /**
   * OPTIMIZED: Resolve full dependency tree using bulk CONSTRUCT query
   * Eliminates N+1 query pattern - loads entire tree in 1-2 queries
   */
  async resolveDependencyTreeOptimized(ks, packName, version = null, maxDepth = 3) {
    const versionFilter = version ? `pack:version "${version}" ;` : 'pack:latestVersion ?version ;'

    const query = `
      PREFIX pack: <https://gitvan.dev/pack#>

      CONSTRUCT {
        ?pack pack:hasDependencyInfo ?dep1 .
        ?dep1 pack:targetPack ?dep1Name ;
              pack:versionRange ?versionRange1 ;
              pack:isRequired ?isRequired1 .

        ?dep1Name pack:hasDependencyInfo ?dep2 .
        ?dep2 pack:targetPack ?dep2Name ;
              pack:versionRange ?versionRange2 ;
              pack:isRequired ?isRequired2 .

        ?dep2Name pack:hasDependencyInfo ?dep3 .
        ?dep3 pack:targetPack ?dep3Name ;
              pack:versionRange ?versionRange3 ;
              pack:isRequired ?isRequired3 .
      }
      WHERE {
        ?pack a pack:Pack ;
              pack:name "${packName}" ;
              ${versionFilter}
              pack:dependsOn ?dep1 .
        ?dep1 pack:targetPack ?dep1Name ;
              pack:versionRange ?versionRange1 .
        OPTIONAL { ?dep1 pack:isRequired ?isRequired1 }

        OPTIONAL {
          ?dep1Name pack:dependsOn ?dep2 .
          ?dep2 pack:targetPack ?dep2Name ;
                pack:versionRange ?versionRange2 .
          OPTIONAL { ?dep2 pack:isRequired ?isRequired2 }

          OPTIONAL {
            ?dep2Name pack:dependsOn ?dep3 .
            ?dep3 pack:targetPack ?dep3Name ;
                  pack:versionRange ?versionRange3 .
            OPTIONAL { ?dep3 pack:isRequired ?isRequired3 }
          }
        }
      }
      LIMIT ${Math.pow(10, maxDepth)}
    `

    try {
      const results = await ks.query(query)

      const tree = {
        pack: packName,
        version: version || 'latest',
        dependencies: []
      }

      // Build first-level dependencies
      const depMap = new Map()
      for (const result of results) {
        if (result.hasDependencyInfo) {
          const depKey = result.targetPack + '@' + result.versionRange1
          if (!depMap.has(depKey)) {
            depMap.set(depKey, {
              target: result.targetPack,
              versionRange: result.versionRange1,
              required: result.isRequired1 !== 'false',
              dependencies: []
            })
          }
        }
      }

      tree.dependencies = Array.from(depMap.values())

      // Build nested dependencies (depth 2+)
      for (const dep of tree.dependencies) {
        for (const result of results) {
          if (result.dep1Name === dep.target) {
            if (!dep.dependencies) dep.dependencies = []
            if (!dep.dependencies.some(d => d.target === result.dep2Name)) {
              dep.dependencies.push({
                target: result.dep2Name,
                versionRange: result.versionRange2,
                required: result.isRequired2 !== 'false',
                dependencies: []
              })
            }
          }
        }
      }

      return tree
    } catch (error) {
      consola.error('resolveDependencyTreeOptimized error:', error.message)
      return this.resolveDependencyTree(ks, packName, version)
    }
  },

  /**
   * Detect circular dependencies
   */
  async detectCircularDependencies(ks, packName = null) {
    const packFilter = packName ? `FILTER(?pack1 = pack:${packName})` : ''

    const query = `
      PREFIX pack: <https://gitvan.dev/pack#>

      SELECT ?pack1 ?pack2 WHERE {
        ?pack1 pack:dependsOn ?dep1 .
        ?dep1 pack:targetPack ?pack2 .
        ?pack2 pack:dependsOn ?dep2 .
        ?dep2 pack:targetPack+ ?pack1 .
        ${packFilter}
      }
    `

    try {
      const results = await ks.query(query)
      return results.map(r => ({
        from: r.pack1,
        to: r.pack2,
        type: 'circular'
      }))
    } catch (error) {
      consola.error('detectCircularDependencies error:', error.message)
      return []
    }
  },

  /**
   * Validate all dependencies can be satisfied
   */
  async validateDependencies(ks, dependencyTree, getPackByVersion) {
    const validation = {
      valid: true,
      missing: [],
      conflicts: [],
      deprecated: []
    }

    try {
      for (const dep of dependencyTree.dependencies || []) {
        const exists = await getPackByVersion(ks, dep.target, dep.versionRange)
        if (!exists) {
          validation.valid = false
          validation.missing.push({
            pack: dep.target,
            versionRange: dep.versionRange
          })
        } else if (exists.deprecated) {
          validation.deprecated.push({
            pack: dep.target,
            version: exists.version
          })
        }
      }

      return validation
    } catch (error) {
      consola.error('validateDependencies error:', error.message)
      return { valid: false, missing: [], conflicts: [], deprecated: [] }
    }
  },

  /**
   * Check version compatibility between two packs
   */
  async checkVersionCompatibility(ks, pack1, pack2) {
    const query = `
      PREFIX pack: <https://gitvan.dev/pack#>

      ASK {
        { pack:${pack1} pack:compatibleWith pack:${pack2} }
        UNION
        { pack:${pack2} pack:compatibleWith pack:${pack1} }
      }
    `

    try {
      const compatible = await ks.ask(query)
      return { pack1, pack2, compatible }
    } catch (error) {
      consola.error('checkVersionCompatibility error:', error.message)
      return { pack1, pack2, compatible: false }
    }
  },

  /**
   * Get license compatibility matrix
   */
  async getLicenseCompatibility(ks, licenses) {
    const licenseValues = licenses.map(l => `pack:${l}License`).join(', ')

    const query = `
      PREFIX pack: <https://gitvan.dev/pack#>

      SELECT ?license1 ?license2 WHERE {
        VALUES ?lic1 { ${licenseValues} }
        VALUES ?lic2 { ${licenseValues} }
        ?lic1 pack:licenseCompatibleWith ?lic2 .
        ?lic1 pack:licenseSPDX ?license1 .
        ?lic2 pack:licenseSPDX ?license2 .
      }
    `

    try {
      return await ks.query(query)
    } catch (error) {
      consola.error('getLicenseCompatibility error:', error.message)
      return []
    }
  },
}
