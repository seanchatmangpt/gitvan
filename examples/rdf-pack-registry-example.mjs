/**
 * GitVan RDF Pack Registry Example
 * Demonstrates Phase 4 pack system functionality
 */

import { createKnowledgeSubstrateCore } from '../vendor/unrdf/packages/core/src/index.js'
import { RDFPackRegistry } from '../src/pack/RDFPackRegistry.mjs'
import { createRDFPackResolver } from '../src/pack/RDFPackResolver.mjs'
import consola from 'consola'

/**
 * Example: Register packs with RDF manifests
 */
async function exampleRegisterPacks() {
  consola.info('Example: Register Packs')

  // Create knowledge substrate
  const ks = createKnowledgeSubstrateCore({
    baseIRI: 'https://gitvan.dev/pack#'
  })

  // Create registry
  const registry = new RDFPackRegistry(ks)
  await registry.initialize()

  // Pack 1: Authentication Pack
  const authPack = `
    @prefix pack: <https://gitvan.dev/pack#> .
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

    pack:auth-pack a pack:Pack ;
      pack:name "auth-pack" ;
      pack:version "2.1.0" ;
      pack:latestVersion "2.1.0" ;
      pack:description "Complete authentication and identity management solution" ;
      pack:author [
        a pack:Author ;
        pack:authorName "GitVan Team" ;
        pack:authorEmail "team@gitvan.dev"
      ] ;
      pack:license pack:MITLicense ;
      pack:licenseSPDX "MIT" ;
      pack:category pack:AuthenticationCategory ;
      pack:gitvanCompatibility "3.x" ;
      pack:nodeCompatibility ">=18.0.0" ;
      pack:rating "4.8"^^xsd:decimal ;
      pack:downloadCount "15000"^^xsd:integer ;
      pack:weeklyDownloads "500"^^xsd:integer ;
      pack:createdAt "2024-01-15T00:00:00Z"^^xsd:dateTime ;
      pack:updatedAt "2026-01-08T00:00:00Z"^^xsd:dateTime ;
      pack:providesFeature [
        a pack:Feature ;
        pack:featureName "oauth2" ;
        pack:featureDescription "OAuth 2.0 authentication"
      ] , [
        a pack:Feature ;
        pack:featureName "jwt" ;
        pack:featureDescription "JSON Web Token support"
      ] .
  `

  await registry.registerPack(authPack)

  // Pack 2: UI Components Pack (depends on auth-pack)
  const uiPack = `
    @prefix pack: <https://gitvan.dev/pack#> .
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

    pack:ui-components a pack:Pack ;
      pack:name "ui-components" ;
      pack:version "1.5.0" ;
      pack:latestVersion "1.5.0" ;
      pack:description "Modern UI component library for GitVan workflows" ;
      pack:author [
        a pack:Author ;
        pack:authorName "GitVan UI Team" ;
        pack:authorEmail "ui@gitvan.dev"
      ] ;
      pack:license pack:MITLicense ;
      pack:licenseSPDX "MIT" ;
      pack:category pack:UIComponentsCategory ;
      pack:gitvanCompatibility "3.x" ;
      pack:nodeCompatibility ">=18.0.0" ;
      pack:rating "4.5"^^xsd:decimal ;
      pack:downloadCount "8000"^^xsd:integer ;
      pack:weeklyDownloads "300"^^xsd:integer ;
      pack:createdAt "2024-03-20T00:00:00Z"^^xsd:dateTime ;
      pack:updatedAt "2026-01-05T00:00:00Z"^^xsd:dateTime ;
      pack:dependsOn [
        a pack:Dependency ;
        pack:targetPack pack:auth-pack ;
        pack:versionRange "^2.0.0" ;
        pack:isRequired "true"^^xsd:boolean
      ] ;
      pack:providesFeature [
        a pack:Feature ;
        pack:featureName "dashboard" ;
        pack:featureDescription "Dashboard components"
      ] .
  `

  await registry.registerPack(uiPack)

  // Pack 3: Database Pack
  const dbPack = `
    @prefix pack: <https://gitvan.dev/pack#> .
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

    pack:database-pack a pack:Pack ;
      pack:name "database-pack" ;
      pack:version "3.0.0" ;
      pack:latestVersion "3.0.0" ;
      pack:description "Database integration with migrations and ORM" ;
      pack:author [
        a pack:Author ;
        pack:authorName "GitVan Data Team" ;
        pack:authorEmail "data@gitvan.dev"
      ] ;
      pack:license pack:Apache2License ;
      pack:licenseSPDX "Apache-2.0" ;
      pack:category pack:DatabaseCategory ;
      pack:gitvanCompatibility "3.x" ;
      pack:nodeCompatibility ">=18.0.0" ;
      pack:rating "4.7"^^xsd:decimal ;
      pack:downloadCount "12000"^^xsd:integer ;
      pack:weeklyDownloads "400"^^xsd:integer ;
      pack:createdAt "2024-02-10T00:00:00Z"^^xsd:dateTime ;
      pack:updatedAt "2026-01-07T00:00:00Z"^^xsd:dateTime ;
      pack:providesFeature [
        a pack:Feature ;
        pack:featureName "migrations" ;
        pack:featureDescription "Database migrations"
      ] , [
        a pack:Feature ;
        pack:featureName "orm" ;
        pack:featureDescription "Object-Relational Mapping"
      ] .
  `

  await registry.registerPack(dbPack)

  consola.success('All packs registered successfully')

  return registry
}

/**
 * Example: Query and discover packs
 */
async function exampleQueryPacks(registry) {
  consola.info('Example: Query Packs')

  // Get a specific pack
  const authPack = await registry.getPack('auth-pack', '2.1.0')
  consola.info('Auth Pack:', authPack)

  // List packs by category
  const authPacks = await registry.listPacks('Authentication')
  consola.info('Authentication Packs:', authPacks.length)

  // Search packs
  const results = await registry.searchPacks('database', { limit: 10 })
  consola.info('Search Results:', results.length)

  // Get popular packs
  const popular = await registry.getPopularPacks(5)
  consola.info('Popular Packs:', popular)

  // Get trending packs
  const trending = await registry.getTrendingPacks(5)
  consola.info('Trending Packs:', trending)

  return { authPack, authPacks, results, popular, trending }
}

/**
 * Example: Resolve dependencies
 */
async function exampleResolveDependencies(registry) {
  consola.info('Example: Resolve Dependencies')

  const resolver = createRDFPackResolver(registry)

  // Resolve ui-components (which depends on auth-pack)
  const resolution = await resolver.resolve('ui-components', '^1.0.0')

  consola.info('Resolution:')
  consola.info('  Pack:', resolution.pack)
  consola.info('  Version:', resolution.version)
  consola.info('  Resolved:', resolution.resolved)
  consola.info('  Flattened dependencies:', resolution.flattened?.length || 0)
  consola.info('  Circular dependencies:', resolution.circular?.length || 0)
  consola.info('  License validation:', resolution.licenses?.compatible)

  // Resolve multiple packs
  const multiResolution = await resolver.resolveMultiple([
    { name: 'auth-pack', versionRange: '^2.0.0' },
    { name: 'database-pack', versionRange: '^3.0.0' },
    { name: 'ui-components', versionRange: '^1.0.0' }
  ])

  consola.info('Multi-Resolution:')
  consola.info('  Success:', multiResolution.success)
  consola.info('  Resolved:', multiResolution.resolved.length)
  consola.info('  Total dependencies:', multiResolution.dependencies.length)
  consola.info('  Errors:', multiResolution.errors.length)
  consola.info('  Conflicts:', multiResolution.conflicts.length)

  return { resolution, multiResolution }
}

/**
 * Example: License compatibility
 */
async function exampleLicenseCompatibility(registry) {
  consola.info('Example: License Compatibility')

  const licenses = ['MIT', 'Apache-2.0', 'BSD-3-Clause']
  const compatibility = await registry.checkLicenseCompatibility(licenses)

  consola.info('License Compatibility:')
  consola.info('  Licenses:', licenses)
  consola.info('  Compatible:', compatibility.compatible)
  consola.info('  Matrix:')
  for (const [license1, compat] of Object.entries(compatibility.matrix || {})) {
    consola.info(`    ${license1}:`, compat)
  }

  return compatibility
}

/**
 * Example: Pack suggestions
 */
async function examplePackSuggestions(registry) {
  consola.info('Example: Pack Suggestions')

  const authSuggestions = await registry.getSuggestions('authentication')
  consola.info('Authentication suggestions:', authSuggestions.length)

  const uiSuggestions = await registry.getSuggestions('ui dashboard')
  consola.info('UI Dashboard suggestions:', uiSuggestions.length)

  const dbSuggestions = await registry.getSuggestions('database')
  consola.info('Database suggestions:', dbSuggestions.length)

  return { authSuggestions, uiSuggestions, dbSuggestions }
}

/**
 * Example: Compare packs
 */
async function exampleComparePacks(registry) {
  consola.info('Example: Compare Packs')

  const comparison = await registry.comparePacks([
    'auth-pack',
    'ui-components',
    'database-pack'
  ])

  consola.info('Pack Comparison:')
  consola.info('  Packs:', comparison.packs?.length || 0)
  consola.info('  Ratings:', comparison.comparison?.rating || [])
  consola.info('  Downloads:', comparison.comparison?.downloads || [])

  return comparison
}

/**
 * Example: Registry statistics
 */
async function exampleStatistics(registry) {
  consola.info('Example: Registry Statistics')

  const stats = await registry.getStatistics()

  consola.info('Registry Statistics:')
  consola.info('  Total packs:', stats.totalPacks)
  consola.info('  Categories:', stats.categories?.length || 0)
  consola.info('  Cache size:', stats.cacheSize)

  return stats
}

/**
 * Main demo function
 */
async function main() {
  try {
    consola.box('GitVan RDF Pack Registry - Phase 4 Demo')

    // 1. Register packs
    const registry = await exampleRegisterPacks()

    // 2. Query packs
    await exampleQueryPacks(registry)

    // 3. Resolve dependencies
    await exampleResolveDependencies(registry)

    // 4. Check license compatibility
    await exampleLicenseCompatibility(registry)

    // 5. Get suggestions
    await examplePackSuggestions(registry)

    // 6. Compare packs
    await exampleComparePacks(registry)

    // 7. Get statistics
    await exampleStatistics(registry)

    consola.success('All examples completed successfully!')
  } catch (error) {
    consola.error('Example failed:', error)
    throw error
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    consola.error(error)
    process.exit(1)
  })
}

export {
  exampleRegisterPacks,
  exampleQueryPacks,
  exampleResolveDependencies,
  exampleLicenseCompatibility,
  examplePackSuggestions,
  exampleComparePacks,
  exampleStatistics
}
