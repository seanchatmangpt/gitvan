/**
 * GitVan Graph-Based Pack Registry
 * Modern implementation using useGraph with best practices
 */

import { useGraph } from '../composables/graph.mjs'
import { withGitVan } from '../composables/ctx.mjs'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import consola from 'consola'

/**
 * Graph-Based Pack Registry
 * Uses RDF/SPARQL for complex pack discovery, compatibility checking, and dependency resolution
 */
export class GraphPackRegistry {
  constructor(options = {}) {
    this.options = {
      registryDir: options.registryDir || '.gitvan/registry',
      snapshotsDir: options.snapshotsDir || '.gitvan/graphs/registry/snapshots',
      baseIRI: options.baseIRI || 'https://gitvan.dev/registry/',
      ...options
    }
    this.graph = null
    this.initialized = false
  }

  /**
   * Initialize the graph-based pack registry
   */
  async initialize() {
    if (this.initialized) return this

    await withGitVan({ cwd: process.cwd() }, async () => {
      this.graph = await useGraph({
        baseIRI: this.options.baseIRI,
        snapshotsDir: this.options.snapshotsDir
      })

      // Set up registry-specific shapes for validation
      await this.graph.setShapes(`
        @prefix gv: <https://gitvan.dev/registry/> .
        @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        gv:PackShape a sh:NodeShape ;
          sh:targetClass gv:Pack ;
          sh:property [
            sh:path gv:packId ;
            sh:datatype xsd:string ;
            sh:minCount 1 ;
            sh:maxCount 1 ;
          ] ;
          sh:property [
            sh:path gv:name ;
            sh:datatype xsd:string ;
            sh:minCount 1 ;
          ] ;
          sh:property [
            sh:path gv:version ;
            sh:datatype xsd:string ;
            sh:minCount 1 ;
          ] ;
          sh:property [
            sh:path gv:description ;
            sh:datatype xsd:string ;
          ] ;
          sh:property [
            sh:path gv:author ;
            sh:datatype xsd:string ;
          ] ;
          sh:property [
            sh:path gv:license ;
            sh:datatype xsd:string ;
          ] ;
          sh:property [
            sh:path gv:repository ;
            sh:datatype xsd:anyURI ;
          ] ;
          sh:property [
            sh:path gv:homepage ;
            sh:datatype xsd:anyURI ;
          ] ;
          sh:property [
            sh:path gv:keywords ;
            sh:datatype xsd:string ;
          ] ;
          sh:property [
            sh:path gv:category ;
            sh:datatype xsd:string ;
          ] ;
          sh:property [
            sh:path gv:type ;
            sh:datatype xsd:string ;
          ] ;
          sh:property [
            sh:path gv:downloads ;
            sh:datatype xsd:integer ;
          ] ;
          sh:property [
            sh:path gv:rating ;
            sh:datatype xsd:decimal ;
          ] ;
          sh:property [
            sh:path gv:lastUpdated ;
            sh:datatype xsd:dateTime ;
          ] .

        gv:DependencyShape a sh:NodeShape ;
          sh:targetClass gv:Dependency ;
          sh:property [
            sh:path gv:dependsOn ;
            sh:nodeKind sh:IRI ;
            sh:minCount 1 ;
          ] ;
          sh:property [
            sh:path gv:versionConstraint ;
            sh:datatype xsd:string ;
          ] ;
          sh:property [
            sh:path gv:optional ;
            sh:datatype xsd:boolean ;
          ] .

        gv:CompatibilityShape a sh:NodeShape ;
          sh:targetClass gv:Compatibility ;
          sh:property [
            sh:path gv:packId ;
            sh:datatype xsd:string ;
            sh:minCount 1 ;
          ] ;
          sh:property [
            sh:path gv:compatibleWith ;
            sh:datatype xsd:string ;
          ] ;
          sh:property [
            sh:path gv:compatibilityScore ;
            sh:datatype xsd:decimal ;
          ] ;
          sh:property [
            sh:path gv:testedVersions ;
            sh:datatype xsd:string ;
          ] .
      `)

      this.initialized = true
      consola.info('Graph-based pack registry initialized')
    })

    return this
  }

  /**
   * Register a pack in the graph-based registry
   */
  async registerPack(packData) {
    await this.initialize()

    const packId = packData.packId || packData.name.replace(/[^a-zA-Z0-9]/g, '_')
    const timestamp = new Date().toISOString()

    const turtle = `
      @prefix gv: <https://gitvan.dev/registry/> .
      @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
      @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

      gv:${packId} rdf:type gv:Pack ;
        gv:packId "${packId}" ;
        gv:name "${packData.name}" ;
        gv:version "${packData.version}" ;
        gv:description "${packData.description || ''}" ;
        gv:author "${packData.author || ''}" ;
        gv:license "${packData.license || ''}" ;
        gv:repository "${packData.repository || ''}" ;
        gv:homepage "${packData.homepage || ''}" ;
        gv:keywords "${JSON.stringify(packData.keywords || [])}" ;
        gv:category "${packData.category || 'general'}" ;
        gv:type "${packData.type || 'pack'}" ;
        gv:downloads "${packData.downloads || 0}" ;
        gv:rating "${packData.rating || 0}" ;
        gv:lastUpdated "${timestamp}" ;
        gv:jobs "${JSON.stringify(packData.jobs || [])}" ;
        gv:templates "${JSON.stringify(packData.templates || [])}" ;
        gv:files "${JSON.stringify(packData.files || [])}" ;
        gv:config "${JSON.stringify(packData.config || {})}" ;
        gv:metadata "${JSON.stringify(packData.metadata || {})}" .
    `

    await this.graph.addTurtle(turtle)

    // Add dependencies if they exist
    if (packData.dependencies && packData.dependencies.length > 0) {
      await this.addDependencies(packId, packData.dependencies)
    }

    // Analyze compatibility
    await this.analyzeCompatibility(packId)

    // Create snapshot
    await this.graph.snapshotJSON('registry', 'pack-registered', {
      packId,
      timestamp,
      action: 'registered',
      data: packData
    })

    consola.success(`Pack registered: ${packId}`)
    return { packId, status: 'registered' }
  }

  /**
   * Add pack dependencies with graph relationships
   */
  async addDependencies(packId, dependencies) {
    for (const dep of dependencies) {
      const depTurtle = `
        @prefix gv: <https://gitvan.dev/registry/> .
        @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

        gv:${packId}_dep_${dep.name.replace(/[^a-zA-Z0-9]/g, '_')} rdf:type gv:Dependency ;
          gv:pack gv:${packId} ;
          gv:dependsOn gv:${dep.name.replace(/[^a-zA-Z0-9]/g, '_')} ;
          gv:versionConstraint "${dep.version || '*'}" ;
          gv:optional "${dep.optional || false}" ;
          gv:peer "${dep.peer || false}" ;
          gv:dev "${dep.dev || false}" .
      `

      await this.graph.addTurtle(depTurtle)
    }
  }

  /**
   * Analyze pack compatibility using graph queries
   */
  async analyzeCompatibility(packId) {
    // Get pack dependencies
    await this.graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/registry/>
      SELECT ?dependency ?versionConstraint ?optional WHERE {
        ?dep rdf:type gv:Dependency ;
          gv:pack gv:${packId} ;
          gv:dependsOn ?dependency ;
          gv:versionConstraint ?versionConstraint ;
          gv:optional ?optional .
      }
    `)

    const dependencies = await this.graph.select()

    let compatibilityScore = 1.0
    const compatibilityDetails = []

    for (const dep of dependencies) {
      const depName = dep.dependency.replace('gv:', '')
      
      // Check if dependency is available
      await this.graph.setQuery(`
        PREFIX gv: <https://gitvan.dev/registry/>
        SELECT ?version ?rating WHERE {
          gv:${depName} rdf:type gv:Pack ;
            gv:version ?version ;
            gv:rating ?rating .
        }
      `)

      const depResults = await this.graph.select()
      
      if (depResults.length === 0) {
        if (dep.optional === 'false') {
          compatibilityScore -= 0.2
          compatibilityDetails.push({
            dependency: depName,
            status: 'missing',
            impact: 'required'
          })
        } else {
          compatibilityDetails.push({
            dependency: depName,
            status: 'missing',
            impact: 'optional'
          })
        }
      } else {
        // Check version compatibility (simplified)
        const availableVersion = depResults[0].version
        const rating = parseFloat(depResults[0].rating || '0')
        
        compatibilityDetails.push({
          dependency: depName,
          status: 'available',
          version: availableVersion,
          rating: rating,
          impact: dep.optional === 'false' ? 'required' : 'optional'
        })

        if (rating < 3.0) {
          compatibilityScore -= 0.1
        }
      }
    }

    // Store compatibility analysis
    const turtle = `
      @prefix gv: <https://gitvan.dev/registry/> .
      @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

      gv:${packId}_compatibility rdf:type gv:Compatibility ;
        gv:packId "${packId}" ;
        gv:compatibleWith "gitvan" ;
        gv:compatibilityScore "${compatibilityScore.toFixed(2)}" ;
        gv:testedVersions "${JSON.stringify(compatibilityDetails)}" ;
        gv:analyzedAt "${new Date().toISOString()}" .
    `

    await this.graph.addTurtle(turtle)

    return {
      packId,
      compatibilityScore,
      details: compatibilityDetails,
      status: compatibilityScore >= 0.8 ? 'compatible' : compatibilityScore >= 0.6 ? 'partial' : 'incompatible'
    }
  }

  /**
   * Search packs using graph queries
   */
  async searchPacks(query, options = {}) {
    await this.initialize()

    const category = options.category || ''
    const type = options.type || ''
    const minRating = options.minRating || 0
    const limit = options.limit || 50

    let searchQuery = `
      PREFIX gv: <https://gitvan.dev/registry/>
      SELECT ?packId ?name ?version ?description ?author ?category ?type ?downloads ?rating ?lastUpdated WHERE {
        ?pack rdf:type gv:Pack ;
          gv:packId ?packId ;
          gv:name ?name ;
          gv:version ?version ;
          gv:description ?description ;
          gv:author ?author ;
          gv:category ?category ;
          gv:type ?type ;
          gv:downloads ?downloads ;
          gv:rating ?rating ;
          gv:lastUpdated ?lastUpdated .
    `

    // Add search filters
    if (query) {
      searchQuery += `
        FILTER(
          CONTAINS(LCASE(?name), LCASE("${query}")) ||
          CONTAINS(LCASE(?description), LCASE("${query}")) ||
          CONTAINS(LCASE(?author), LCASE("${query}"))
        )
      `
    }

    if (category) {
      searchQuery += `FILTER(?category = "${category}")`
    }

    if (type) {
      searchQuery += `FILTER(?type = "${type}")`
    }

    if (minRating > 0) {
      searchQuery += `FILTER(?rating >= ${minRating})`
    }

    searchQuery += `
      }
      ORDER BY DESC(?rating) DESC(?downloads)
      LIMIT ${limit}
    `

    await this.graph.setQuery(searchQuery)
    const results = await this.graph.select()

    return results.map(pack => ({
      packId: pack.packId,
      name: pack.name,
      version: pack.version,
      description: pack.description,
      author: pack.author,
      category: pack.category,
      type: pack.type,
      downloads: parseInt(pack.downloads),
      rating: parseFloat(pack.rating),
      lastUpdated: pack.lastUpdated
    }))
  }

  /**
   * Get pack by ID with full details
   */
  async getPack(packId) {
    await this.initialize()

    await this.graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/registry/>
      SELECT ?packId ?name ?version ?description ?author ?license ?repository ?homepage ?keywords ?category ?type ?downloads ?rating ?lastUpdated ?jobs ?templates ?files ?config ?metadata WHERE {
        gv:${packId} rdf:type gv:Pack ;
          gv:packId ?packId ;
          gv:name ?name ;
          gv:version ?version ;
          gv:description ?description ;
          gv:author ?author ;
          gv:license ?license ;
          gv:repository ?repository ;
          gv:homepage ?homepage ;
          gv:keywords ?keywords ;
          gv:category ?category ;
          gv:type ?type ;
          gv:downloads ?downloads ;
          gv:rating ?rating ;
          gv:lastUpdated ?lastUpdated ;
          gv:jobs ?jobs ;
          gv:templates ?templates ;
          gv:files ?files ;
          gv:config ?config ;
          gv:metadata ?metadata .
      }
    `)

    const results = await this.graph.select()
    
    if (results.length === 0) {
      return null
    }

    const pack = results[0]
    return {
      packId: pack.packId,
      name: pack.name,
      version: pack.version,
      description: pack.description,
      author: pack.author,
      license: pack.license,
      repository: pack.repository,
      homepage: pack.homepage,
      keywords: JSON.parse(pack.keywords || '[]'),
      category: pack.category,
      type: pack.type,
      downloads: parseInt(pack.downloads),
      rating: parseFloat(pack.rating),
      lastUpdated: pack.lastUpdated,
      jobs: JSON.parse(pack.jobs || '[]'),
      templates: JSON.parse(pack.templates || '[]'),
      files: JSON.parse(pack.files || '[]'),
      config: JSON.parse(pack.config || '{}'),
      metadata: JSON.parse(pack.metadata || '{}')
    }
  }

  /**
   * Get pack dependencies with compatibility analysis
   */
  async getPackDependencies(packId) {
    await this.initialize()

    await this.graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/registry/>
      SELECT ?dependency ?versionConstraint ?optional ?peer ?dev WHERE {
        ?dep rdf:type gv:Dependency ;
          gv:pack gv:${packId} ;
          gv:dependsOn ?dependency ;
          gv:versionConstraint ?versionConstraint ;
          gv:optional ?optional ;
          gv:peer ?peer ;
          gv:dev ?dev .
      }
    `)

    const dependencies = await this.graph.select()

    // Get dependency details
    const dependencyDetails = []
    for (const dep of dependencies) {
      const depName = dep.dependency.replace('gv:', '')
      const depData = await this.getPack(depName)
      
      dependencyDetails.push({
        name: depName,
        versionConstraint: dep.versionConstraint,
        optional: dep.optional === 'true',
        peer: dep.peer === 'true',
        dev: dep.dev === 'true',
        available: !!depData,
        packData: depData
      })
    }

    return dependencyDetails
  }

  /**
   * Update pack statistics (downloads, rating)
   */
  async updatePackStats(packId, stats) {
    await this.initialize()

    const turtle = `
      @prefix gv: <https://gitvan.dev/registry/> .
      @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

      gv:${packId} gv:downloads "${stats.downloads || 0}" ;
        gv:rating "${stats.rating || 0}" ;
        gv:lastUpdated "${new Date().toISOString()}" .
    `

    await this.graph.addTurtle(turtle)

    // Create snapshot
    await this.graph.snapshotJSON('registry', 'pack-stats-updated', {
      packId,
      stats,
      timestamp: new Date().toISOString(),
      action: 'stats-updated'
    })

    consola.info(`Pack stats updated: ${packId}`)
    return { packId, stats, updated: true }
  }

  /**
   * Get registry analytics
   */
  async getRegistryAnalytics() {
    await this.initialize()

    // Total packs
    await this.graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/registry/>
      SELECT (COUNT(?pack) as ?totalPacks) WHERE {
        ?pack rdf:type gv:Pack .
      }
    `)
    const totalResult = await this.graph.select()

    // Category distribution
    await this.graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/registry/>
      SELECT ?category (COUNT(?pack) as ?count) WHERE {
        ?pack rdf:type gv:Pack ;
          gv:category ?category .
      }
      GROUP BY ?category
      ORDER BY DESC(?count)
    `)
    const categoryResult = await this.graph.select()

    // Type distribution
    await this.graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/registry/>
      SELECT ?type (COUNT(?pack) as ?count) WHERE {
        ?pack rdf:type gv:Pack ;
          gv:type ?type .
      }
      GROUP BY ?type
      ORDER BY DESC(?count)
    `)
    const typeResult = await this.graph.select()

    // Top rated packs
    await this.graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/registry/>
      SELECT ?packId ?name ?rating ?downloads WHERE {
        ?pack rdf:type gv:Pack ;
          gv:packId ?packId ;
          gv:name ?name ;
          gv:rating ?rating ;
          gv:downloads ?downloads .
        FILTER(?rating >= 4.0)
      }
      ORDER BY DESC(?rating) DESC(?downloads)
      LIMIT 10
    `)
    const topRatedResult = await this.graph.select()

    // Most downloaded packs
    await this.graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/registry/>
      SELECT ?packId ?name ?downloads ?rating WHERE {
        ?pack rdf:type gv:Pack ;
          gv:packId ?packId ;
          gv:name ?name ;
          gv:downloads ?downloads ;
          gv:rating ?rating .
      }
      ORDER BY DESC(?downloads)
      LIMIT 10
    `)
    const mostDownloadedResult = await this.graph.select()

    const analytics = {
      totalPacks: parseInt(totalResult[0]?.totalPacks || '0'),
      categoryDistribution: categoryResult.map(row => ({
        category: row.category,
        count: parseInt(row.count)
      })),
      typeDistribution: typeResult.map(row => ({
        type: row.type,
        count: parseInt(row.count)
      })),
      topRatedPacks: topRatedResult.map(row => ({
        packId: row.packId,
        name: row.name,
        rating: parseFloat(row.rating),
        downloads: parseInt(row.downloads)
      })),
      mostDownloadedPacks: mostDownloadedResult.map(row => ({
        packId: row.packId,
        name: row.name,
        downloads: parseInt(row.downloads),
        rating: parseFloat(row.rating)
      })),
      generatedAt: new Date().toISOString()
    }

    // Create analytics snapshot
    await this.graph.snapshotJSON('analytics', 'registry-analytics', analytics)

    return analytics
  }

  /**
   * Bulk register packs from marketplace data
   */
  async bulkRegisterPacks(marketplaceData) {
    await this.initialize()

    consola.info(`Bulk registering ${marketplaceData.length} packs`)

    const results = []
    for (const packData of marketplaceData) {
      try {
        const result = await this.registerPack(packData)
        results.push(result)
      } catch (error) {
        consola.error(`Failed to register pack ${packData.name}:`, error.message)
        results.push({ packId: packData.name, status: 'failed', error: error.message })
      }
    }

    // Create bulk registration snapshot
    await this.graph.snapshotJSON('registry', 'bulk-registration', {
      totalPacks: marketplaceData.length,
      successful: results.filter(r => r.status === 'registered').length,
      failed: results.filter(r => r.status === 'failed').length,
      timestamp: new Date().toISOString(),
      results
    })

    consola.success(`Bulk registration completed: ${results.filter(r => r.status === 'registered').length}/${marketplaceData.length} successful`)
    return results
  }
}

/**
 * Factory function for graph-based pack registry
 */
export function createGraphPackRegistry(options = {}) {
  return new GraphPackRegistry(options)
}

/**
 * Default instance for easy access
 */
export const graphPackRegistry = createGraphPackRegistry()


