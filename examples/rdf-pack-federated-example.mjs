/**
 * GitVan RDF Pack Federated Discovery Example
 * Demonstrates multi-registry pack discovery using SPARQL SERVICE clauses
 */

import { createKnowledgeSubstrateCore } from '../vendor/unrdf/packages/core/src/index.js'
import { RDFPackRegistry } from '../src/pack/RDFPackRegistry.mjs'
import { createRDFPackResolver } from '../src/pack/RDFPackResolver.mjs'
import { PackQueries } from '../src/pack/queries/PackQueries.mjs'
import consola from 'consola'

/**
 * Example: Federated pack discovery across multiple registries
 */
async function exampleFederatedDiscovery() {
  consola.info('Example: Federated Pack Discovery')

  // Create local registry
  const ks = createKnowledgeSubstrateCore({
    baseIRI: 'https://gitvan.dev/pack#'
  })

  const localRegistry = new RDFPackRegistry(ks)
  await localRegistry.initialize()

  // Register some local packs
  const localPacks = [
    `@prefix pack: <https://gitvan.dev/pack#> .
     @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
     pack:local-auth a pack:Pack ;
       pack:name "local-auth" ;
       pack:version "1.0.0" ;
       pack:latestVersion "1.0.0" ;
       pack:description "Local authentication pack" ;
       pack:category pack:AuthenticationCategory ;
       pack:rating "4.2"^^xsd:decimal ;
       pack:downloadCount "500"^^xsd:integer .`,

    `@prefix pack: <https://gitvan.dev/pack#> .
     @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
     pack:local-ui a pack:Pack ;
       pack:name "local-ui" ;
       pack:version "2.0.0" ;
       pack:latestVersion "2.0.0" ;
       pack:description "Local UI components" ;
       pack:category pack:UIComponentsCategory ;
       pack:rating "3.8"^^xsd:decimal ;
       pack:downloadCount "300"^^xsd:integer .`
  ]

  for (const pack of localPacks) {
    await localRegistry.registerPack(pack)
  }

  consola.success('Local packs registered')

  // Simulate federated registries
  const federatedEndpoints = [
    'https://marketplace.gitvan.dev/sparql',
    'https://community.gitvan.dev/sparql',
    'https://enterprise.gitvan.dev/sparql'
  ]

  consola.info('Federated endpoints:', federatedEndpoints)

  return { localRegistry, federatedEndpoints }
}

/**
 * Example: Query remote registries with SERVICE clauses
 */
async function exampleServiceClauses(registry) {
  consola.info('Example: SPARQL SERVICE Clauses')

  // This demonstrates the SPARQL query structure for federated discovery
  const federatedQuery = `
    PREFIX pack: <https://gitvan.dev/pack#>

    SELECT ?pack ?name ?rating ?source WHERE {
      # Local packs
      {
        ?pack a pack:Pack ;
              pack:name ?name ;
              pack:rating ?rating .
        BIND("local" AS ?source)
      }
      UNION
      # Remote registry 1
      {
        SERVICE <https://marketplace.gitvan.dev/sparql> {
          ?pack a pack:Pack ;
                pack:name ?name ;
                pack:rating ?rating .
        }
        BIND("marketplace" AS ?source)
      }
      UNION
      # Remote registry 2
      {
        SERVICE <https://community.gitvan.dev/sparql> {
          ?pack a pack:Pack ;
                pack:name ?name ;
                pack:rating ?rating .
        }
        BIND("community" AS ?source)
      }
      FILTER(?rating > 4.0)
    }
    ORDER BY DESC(?rating)
    LIMIT 20
  `

  consola.info('Federated Query:', federatedQuery)

  // In production, this would execute across all endpoints
  // For demo, we show the query structure
  return { query: federatedQuery }
}

/**
 * Example: Merge and deduplicate results from multiple registries
 */
async function exampleMergeResults(registry) {
  consola.info('Example: Merge Federated Results')

  // Simulate results from multiple endpoints
  const mockResults = [
    {
      endpoint: 'https://marketplace.gitvan.dev/sparql',
      packs: [
        { name: 'auth-pro', version: '3.0.0', rating: '4.8', downloads: '50000' },
        { name: 'ui-kit', version: '2.5.0', rating: '4.6', downloads: '30000' },
        { name: 'database-orm', version: '1.8.0', rating: '4.5', downloads: '25000' }
      ]
    },
    {
      endpoint: 'https://community.gitvan.dev/sparql',
      packs: [
        { name: 'auth-pro', version: '3.0.0', rating: '4.8', downloads: '50000' }, // Duplicate
        { name: 'logging-pack', version: '1.2.0', rating: '4.3', downloads: '8000' },
        { name: 'testing-utils', version: '2.1.0', rating: '4.7', downloads: '12000' }
      ]
    },
    {
      endpoint: 'https://enterprise.gitvan.dev/sparql',
      packs: [
        { name: 'security-scanner', version: '4.0.0', rating: '4.9', downloads: '15000' },
        { name: 'compliance-check', version: '1.5.0', rating: '4.4', downloads: '6000' }
      ]
    }
  ]

  // Merge and deduplicate using PackQueries
  const merged = await PackQueries.mergeRemoteResults(registry.ks, mockResults)

  consola.info('Merged Results:')
  consola.info(`  Total unique packs: ${merged.length}`)
  consola.info(`  Sources per pack:`)
  for (const pack of merged.slice(0, 5)) {
    consola.info(`    ${pack.name}@${pack.version}: ${pack.sources.length} source(s)`)
  }

  return merged
}

/**
 * Example: Discover packs across registries with filters
 */
async function exampleFilteredFederatedSearch(registry) {
  consola.info('Example: Filtered Federated Search')

  // Search for authentication packs across all registries
  const authPacksQuery = `
    PREFIX pack: <https://gitvan.dev/pack#>

    SELECT ?name ?version ?rating ?source WHERE {
      {
        ?pack a pack:Pack ;
              pack:name ?name ;
              pack:version ?version ;
              pack:category pack:AuthenticationCategory ;
              pack:rating ?rating .
        BIND("local" AS ?source)
      }
      UNION
      {
        SERVICE <https://marketplace.gitvan.dev/sparql> {
          ?pack a pack:Pack ;
                pack:name ?name ;
                pack:version ?version ;
                pack:category pack:AuthenticationCategory ;
                pack:rating ?rating .
        }
        BIND("marketplace" AS ?source)
      }
      FILTER(?rating >= 4.5)
    }
    ORDER BY DESC(?rating)
  `

  consola.info('Authentication Packs Query:', authPacksQuery)

  // Mock results
  const authPacks = [
    { name: 'local-auth', version: '1.0.0', rating: 4.2, source: 'local' },
    { name: 'auth-pro', version: '3.0.0', rating: 4.8, source: 'marketplace' },
    { name: 'oauth-master', version: '2.5.0', rating: 4.7, source: 'marketplace' }
  ]

  consola.info('Found Authentication Packs:', authPacks.length)
  for (const pack of authPacks) {
    consola.info(`  ${pack.name}@${pack.version} (${pack.rating}★) from ${pack.source}`)
  }

  return authPacks
}

/**
 * Example: License compatibility across federated registries
 */
async function exampleFederatedLicenseCheck(registry) {
  consola.info('Example: Federated License Compatibility')

  // Query license information across registries
  const licenseQuery = `
    PREFIX pack: <https://gitvan.dev/pack#>

    SELECT ?pack ?name ?license WHERE {
      {
        ?pack a pack:Pack ;
              pack:name ?name ;
              pack:licenseSPDX ?license .
      }
      UNION
      {
        SERVICE <https://marketplace.gitvan.dev/sparql> {
          ?pack a pack:Pack ;
                pack:name ?name ;
                pack:licenseSPDX ?license .
        }
      }
    }
  `

  consola.info('License Query:', licenseQuery)

  // Check compatibility
  const licenses = ['MIT', 'Apache-2.0', 'BSD-3-Clause']
  const compatibility = await registry.checkLicenseCompatibility(licenses)

  consola.info('License Compatibility Matrix:')
  for (const [license1, compat] of Object.entries(compatibility.matrix || {})) {
    const compatibleWith = Object.keys(compat).filter(l => compat[l])
    consola.info(`  ${license1}: compatible with [${compatibleWith.join(', ')}]`)
  }

  return compatibility
}

/**
 * Example: Federated dependency resolution
 */
async function exampleFederatedDependencyResolution(registry) {
  consola.info('Example: Federated Dependency Resolution')

  const resolver = createRDFPackResolver(registry, {
    federatedEndpoints: [
      'https://marketplace.gitvan.dev/sparql',
      'https://community.gitvan.dev/sparql'
    ]
  })

  // Resolve a pack that might have dependencies in remote registries
  consola.info('Resolving pack with potential federated dependencies...')

  // Mock: This would try local first, then federated endpoints
  const resolution = {
    pack: 'enterprise-suite',
    version: '2.0.0',
    resolved: true,
    dependencies: [
      { name: 'auth-pro', version: '3.0.0', source: 'marketplace' },
      { name: 'database-orm', version: '1.8.0', source: 'marketplace' },
      { name: 'local-ui', version: '2.0.0', source: 'local' }
    ]
  }

  consola.info('Resolution Result:')
  consola.info(`  Pack: ${resolution.pack}@${resolution.version}`)
  consola.info(`  Resolved: ${resolution.resolved}`)
  consola.info('  Dependencies:')
  for (const dep of resolution.dependencies) {
    consola.info(`    - ${dep.name}@${dep.version} (from ${dep.source})`)
  }

  return resolution
}

/**
 * Example: Registry synchronization
 */
async function exampleRegistrySync(registry) {
  consola.info('Example: Registry Synchronization')

  // Periodically sync popular packs from remote registries
  const syncQuery = `
    PREFIX pack: <https://gitvan.dev/pack#>

    SELECT ?pack ?name ?version ?rating ?downloads WHERE {
      SERVICE <https://marketplace.gitvan.dev/sparql> {
        ?pack a pack:Pack ;
              pack:name ?name ;
              pack:latestVersion ?version ;
              pack:rating ?rating ;
              pack:downloadCount ?downloads .
        FILTER(?downloads > 10000)
      }
    }
    ORDER BY DESC(?downloads)
    LIMIT 100
  `

  consola.info('Sync Query:', syncQuery)

  // Mock sync results
  const syncedPacks = [
    { name: 'auth-pro', version: '3.0.0', rating: 4.8, downloads: 50000 },
    { name: 'ui-kit', version: '2.5.0', rating: 4.6, downloads: 30000 },
    { name: 'database-orm', version: '1.8.0', rating: 4.5, downloads: 25000 }
  ]

  consola.info(`Synced ${syncedPacks.length} popular packs from marketplace`)

  // Cache pack metadata locally
  for (const pack of syncedPacks) {
    consola.debug(`  Cached: ${pack.name}@${pack.version}`)
  }

  return syncedPacks
}

/**
 * Main demo function
 */
async function main() {
  try {
    consola.box('GitVan RDF Pack Federated Discovery Demo')

    // 1. Setup federated environment
    const { localRegistry, federatedEndpoints } = await exampleFederatedDiscovery()

    // 2. Demonstrate SERVICE clauses
    await exampleServiceClauses(localRegistry)

    // 3. Merge results from multiple registries
    await exampleMergeResults(localRegistry)

    // 4. Filtered federated search
    await exampleFilteredFederatedSearch(localRegistry)

    // 5. Federated license checking
    await exampleFederatedLicenseCheck(localRegistry)

    // 6. Federated dependency resolution
    await exampleFederatedDependencyResolution(localRegistry)

    // 7. Registry synchronization
    await exampleRegistrySync(localRegistry)

    consola.success('All federated examples completed!')

    consola.box('Key Takeaways')
    consola.info('✓ SPARQL SERVICE clauses enable querying remote registries')
    consola.info('✓ Results are merged and deduplicated automatically')
    consola.info('✓ Dependencies can span multiple registries')
    consola.info('✓ License compatibility works across registries')
    consola.info('✓ Popular packs can be synced for offline use')
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
  exampleFederatedDiscovery,
  exampleServiceClauses,
  exampleMergeResults,
  exampleFilteredFederatedSearch,
  exampleFederatedLicenseCheck,
  exampleFederatedDependencyResolution,
  exampleRegistrySync
}
