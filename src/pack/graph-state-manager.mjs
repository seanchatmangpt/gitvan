/**
 * GitVan Graph-Based Pack State Management
 * Modern implementation using useGraph with best practices
 */

import { useGraph } from '../composables/graph.mjs'
import { withGitVan } from '../composables/ctx.mjs'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import consola from 'consola'

/**
 * Graph-Based Pack State Manager
 * Uses RDF/SPARQL for complex pack dependency analysis and state management
 */
export class GraphPackStateManager {
  constructor(options = {}) {
    this.options = {
      stateDir: options.stateDir || '.gitvan/state',
      snapshotsDir: options.snapshotsDir || '.gitvan/graphs/packs/snapshots',
      baseIRI: options.baseIRI || 'https://gitvan.dev/packs/',
      ...options
    }
    this.graph = null
    this.initialized = false
  }

  /**
   * Initialize the graph-based state manager
   */
  async initialize() {
    if (this.initialized) return this

    await withGitVan({ cwd: process.cwd() }, async () => {
      this.graph = await useGraph({
        baseIRI: this.options.baseIRI,
        snapshotsDir: this.options.snapshotsDir
      })

      // Set up pack-specific shapes for validation
      await this.graph.setShapes(`
        @prefix gv: <https://gitvan.dev/packs/> .
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
            sh:path gv:status ;
            sh:datatype xsd:string ;
            sh:in ("installed" "uninstalled" "updating" "error") ;
          ] ;
          sh:property [
            sh:path gv:installedAt ;
            sh:datatype xsd:dateTime ;
          ] ;
          sh:property [
            sh:path gv:dependencies ;
            sh:nodeKind sh:IRI ;
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
            sh:path gv:compatibility ;
            sh:datatype xsd:string ;
            sh:in ("compatible" "incompatible" "unknown") ;
          ] .
      `)

      this.initialized = true
      consola.info('Graph-based pack state manager initialized')
    })

    return this
  }

  /**
   * Register a pack with graph-based metadata
   */
  async registerPack(packId, packData) {
    await this.initialize()

    const turtle = `
      @prefix gv: <https://gitvan.dev/packs/> .
      @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
      @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

      gv:${packId} rdf:type gv:Pack ;
        gv:packId "${packId}" ;
        gv:name "${packData.name}" ;
        gv:version "${packData.version}" ;
        gv:description "${packData.description || ''}" ;
        gv:status "${packData.status || 'installed'}" ;
        gv:installedAt "${new Date().toISOString()}" ;
        gv:author "${packData.author || ''}" ;
        gv:license "${packData.license || ''}" ;
        gv:repository "${packData.repository || ''}" ;
        gv:homepage "${packData.homepage || ''}" ;
        gv:keywords "${JSON.stringify(packData.keywords || [])}" ;
        gv:jobs "${JSON.stringify(packData.jobs || [])}" ;
        gv:templates "${JSON.stringify(packData.templates || [])}" ;
        gv:files "${JSON.stringify(packData.files || [])}" ;
        gv:config "${JSON.stringify(packData.config || {})}" .
    `

    await this.graph.addTurtle(turtle)

    // Add dependencies if they exist
    if (packData.dependencies && packData.dependencies.length > 0) {
      await this.addDependencies(packId, packData.dependencies)
    }

    // Create snapshot
    await this.graph.snapshotJSON('packs', 'pack-registered', {
      packId,
      timestamp: new Date().toISOString(),
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
        @prefix gv: <https://gitvan.dev/packs/> .
        @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

        gv:${packId}_dep_${dep.name.replace(/[^a-zA-Z0-9]/g, '_')} rdf:type gv:Dependency ;
          gv:pack gv:${packId} ;
          gv:dependsOn gv:${dep.name.replace(/[^a-zA-Z0-9]/g, '_')} ;
          gv:versionConstraint "${dep.version || '*'}" ;
          gv:compatibility "${await this.checkCompatibility(dep.name, dep.version)}" ;
          gv:required "${dep.required !== false}" .
      `

      await this.graph.addTurtle(depTurtle)
    }
  }

  /**
   * Check pack compatibility using graph queries
   */
  async checkCompatibility(packName, version) {
    await this.graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/packs/>
      SELECT ?installedVersion WHERE {
        gv:${packName.replace(/[^a-zA-Z0-9]/g, '_')} rdf:type gv:Pack ;
          gv:version ?installedVersion ;
          gv:status "installed" .
      }
    `)

    const results = await this.graph.select()
    
    if (results.length === 0) {
      return 'incompatible' // Pack not installed
    }

    // Simple version compatibility check (could be enhanced)
    const installedVersion = results[0].installedVersion
    if (version === '*' || version === installedVersion) {
      return 'compatible'
    }

    return 'unknown'
  }

  /**
   * Get pack state with graph-based queries
   */
  async getPackState(packId) {
    await this.initialize()

    await this.graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/packs/>
      SELECT ?packId ?name ?version ?status ?installedAt ?description ?author ?license ?repository ?homepage ?keywords ?jobs ?templates ?files ?config WHERE {
        gv:${packId} rdf:type gv:Pack ;
          gv:packId ?packId ;
          gv:name ?name ;
          gv:version ?version ;
          gv:status ?status ;
          gv:installedAt ?installedAt ;
          gv:description ?description ;
          gv:author ?author ;
          gv:license ?license ;
          gv:repository ?repository ;
          gv:homepage ?homepage ;
          gv:keywords ?keywords ;
          gv:jobs ?jobs ;
          gv:templates ?templates ;
          gv:files ?files ;
          gv:config ?config .
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
      status: pack.status,
      installedAt: pack.installedAt,
      description: pack.description,
      author: pack.author,
      license: pack.license,
      repository: pack.repository,
      homepage: pack.homepage,
      keywords: JSON.parse(pack.keywords || '[]'),
      jobs: JSON.parse(pack.jobs || '[]'),
      templates: JSON.parse(pack.templates || '[]'),
      files: JSON.parse(pack.files || '[]'),
      config: JSON.parse(pack.config || '{}')
    }
  }

  /**
   * Get all installed packs with graph queries
   */
  async getAllPacks() {
    await this.initialize()

    await this.graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/packs/>
      SELECT ?packId ?name ?version ?status ?installedAt WHERE {
        ?pack rdf:type gv:Pack ;
          gv:packId ?packId ;
          gv:name ?name ;
          gv:version ?version ;
          gv:status ?status ;
          gv:installedAt ?installedAt .
      }
      ORDER BY ?name
    `)

    const results = await this.graph.select()
    return results.map(pack => ({
      packId: pack.packId,
      name: pack.name,
      version: pack.version,
      status: pack.status,
      installedAt: pack.installedAt
    }))
  }

  /**
   * Analyze pack dependencies using graph traversal
   */
  async analyzeDependencies(packId) {
    await this.initialize()

    await this.graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/packs/>
      SELECT ?dependency ?versionConstraint ?compatibility ?required WHERE {
        ?dep rdf:type gv:Dependency ;
          gv:pack gv:${packId} ;
          gv:dependsOn ?dependency ;
          gv:versionConstraint ?versionConstraint ;
          gv:compatibility ?compatibility ;
          gv:required ?required .
      }
    `)

    const dependencies = await this.graph.select()

    // Get dependency analysis
    await this.graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/packs/>
      SELECT ?dependency ?installedVersion ?status WHERE {
        ?dep rdf:type gv:Dependency ;
          gv:pack gv:${packId} ;
          gv:dependsOn ?dependency .
        ?dependency rdf:type gv:Pack ;
          gv:version ?installedVersion ;
          gv:status ?status .
      }
    `)

    const analysis = await this.graph.select()

    return {
      packId,
      dependencies: dependencies.map(dep => ({
        name: dep.dependency.replace('gv:', ''),
        versionConstraint: dep.versionConstraint,
        compatibility: dep.compatibility,
        required: dep.required === 'true'
      })),
      analysis: analysis.map(ana => ({
        dependency: ana.dependency.replace('gv:', ''),
        installedVersion: ana.installedVersion,
        status: ana.status
      })),
      summary: {
        totalDependencies: dependencies.length,
        compatible: dependencies.filter(d => d.compatibility === 'compatible').length,
        incompatible: dependencies.filter(d => d.compatibility === 'incompatible').length,
        unknown: dependencies.filter(d => d.compatibility === 'unknown').length
      }
    }
  }

  /**
   * Update pack status
   */
  async updatePackStatus(packId, status) {
    await this.initialize()

    const turtle = `
      @prefix gv: <https://gitvan.dev/packs/> .
      @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

      gv:${packId} gv:status "${status}" ;
        gv:lastUpdated "${new Date().toISOString()}" .
    `

    await this.graph.addTurtle(turtle)

    // Create snapshot
    await this.graph.snapshotJSON('packs', 'pack-status-updated', {
      packId,
      status,
      timestamp: new Date().toISOString(),
      action: 'status-updated'
    })

    consola.info(`Pack status updated: ${packId} -> ${status}`)
    return { packId, status, updated: true }
  }

  /**
   * Remove pack from graph
   */
  async removePack(packId) {
    await this.initialize()

    // Mark as uninstalled instead of removing data (for audit trail)
    await this.updatePackStatus(packId, 'uninstalled')

    // Create snapshot
    await this.graph.snapshotJSON('packs', 'pack-removed', {
      packId,
      timestamp: new Date().toISOString(),
      action: 'removed'
    })

    consola.info(`Pack removed: ${packId}`)
    return { packId, status: 'removed' }
  }

  /**
   * Generate pack analytics using graph queries
   */
  async generateAnalytics() {
    await this.initialize()

    // Total packs
    await this.graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/packs/>
      SELECT (COUNT(?pack) as ?totalPacks) WHERE {
        ?pack rdf:type gv:Pack .
      }
    `)
    const totalResult = await this.graph.select()

    // Status distribution
    await this.graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/packs/>
      SELECT ?status (COUNT(?pack) as ?count) WHERE {
        ?pack rdf:type gv:Pack ;
          gv:status ?status .
      }
      GROUP BY ?status
    `)
    const statusResult = await this.graph.select()

    // Dependency analysis
    await this.graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/packs/>
      SELECT (COUNT(?dep) as ?totalDependencies) WHERE {
        ?dep rdf:type gv:Dependency .
      }
    `)
    const depResult = await this.graph.select()

    // Compatibility analysis
    await this.graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/packs/>
      SELECT ?compatibility (COUNT(?dep) as ?count) WHERE {
        ?dep rdf:type gv:Dependency ;
          gv:compatibility ?compatibility .
      }
      GROUP BY ?compatibility
    `)
    const compatResult = await this.graph.select()

    const analytics = {
      totalPacks: parseInt(totalResult[0]?.totalPacks || '0'),
      statusDistribution: statusResult.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count)
        return acc
      }, {}),
      totalDependencies: parseInt(depResult[0]?.totalDependencies || '0'),
      compatibilityDistribution: compatResult.reduce((acc, row) => {
        acc[row.compatibility] = parseInt(row.count)
        return acc
      }, {}),
      generatedAt: new Date().toISOString()
    }

    // Create analytics snapshot
    await this.graph.snapshotJSON('analytics', 'pack-analytics', analytics)

    return analytics
  }

  /**
   * Migrate from legacy JSON state to graph
   */
  async migrateFromLegacy(legacyStatePath) {
    try {
      const legacyData = JSON.parse(await fs.readFile(legacyStatePath, 'utf8'))
      
      consola.info(`Migrating ${Object.keys(legacyData.packs || {}).length} packs from legacy state`)

      for (const [packId, packData] of Object.entries(legacyData.packs || {})) {
        await this.registerPack(packId, {
          ...packData,
          status: 'installed' // Legacy packs are considered installed
        })
      }

      // Create migration snapshot
      await this.graph.snapshotJSON('migration', 'legacy-to-graph', {
        migratedPacks: Object.keys(legacyData.packs || {}).length,
        timestamp: new Date().toISOString(),
        source: legacyStatePath
      })

      consola.success('Legacy state migration completed')
      return { migrated: Object.keys(legacyData.packs || {}).length }
    } catch (error) {
      consola.error('Legacy migration failed:', error.message)
      throw error
    }
  }

  /**
   * Export current state to legacy JSON format (for compatibility)
   */
  async exportToLegacy() {
    const packs = await this.getAllPacks()
    const legacyState = {
      version: '2.0',
      packs: {}
    }

    for (const pack of packs) {
      if (pack.status === 'installed') {
        const packData = await this.getPackState(pack.packId)
        legacyState.packs[pack.packId] = packData
      }
    }

    return legacyState
  }
}

/**
 * Factory function for graph-based pack state manager
 */
export function createGraphPackStateManager(options = {}) {
  return new GraphPackStateManager(options)
}

/**
 * Default instance for easy access
 */
export const graphPackState = createGraphPackStateManager()



