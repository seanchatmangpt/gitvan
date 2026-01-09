#!/usr/bin/env node

/**
 * RDFLockManager Example
 *
 * Demonstrates:
 * - Initialize KnowledgeSubstrate with lock ontology
 * - Acquire and release locks with RDF backing
 * - Detect deadlocks using SPARQL queries
 * - Query lock state and blocking relationships
 * - Resource contention analysis
 * - Long-running lock detection
 */

import { initializeGitVanOntologies } from '../src/core/KnowledgeSubstrateExtensions.mjs'
import { RDFLockManager } from '../src/git-native/RDFLockManager.mjs'
import { LockQueries } from '../src/git-native/queries/LockQueries.mjs'

async function main() {
  console.log('=== RDFLockManager Example ===\n')

  // Note: In real usage, you would use createKnowledgeSubstrateCore from unrdf
  // This is a mock implementation for demonstration
  const ks = {
    query: async (query) => {
      console.log('[Query] Executing SPARQL...')
      return { results: { bindings: [] } }
    },
    load: async (turtle, options) => {
      console.log(`[Load] Loading RDF data into ${options.baseIRI}`)
    },
    update: async (query) => {
      console.log('[Update] Updating RDF data')
    },
    getClass: async (classIRI) => ({ iri: classIRI })
  }

  // 1. Initialize GitVan ontologies
  console.log('Step 1: Initializing GitVan ontologies...')
  const result = await initializeGitVanOntologies(ks, {
    validateWithShacl: false,
    registerHooks: false
  })
  console.log(`✓ Loaded ${Object.keys(result.ontologies).length} ontologies\n`)

  // 2. Create RDFLockManager
  console.log('Step 2: Creating RDFLockManager...')
  const lockManager = new RDFLockManager({ cwd: process.cwd() })
  await lockManager.initialize(ks, {
    validateOntology: true,
    enableRDF: true
  })
  console.log('✓ RDFLockManager initialized\n')

  // 3. Acquire locks
  console.log('Step 3: Acquiring locks...')
  const lock1 = await lockManager.acquireLock('workflow-123', {
    timeout: 30000,
    fingerprint: 'process-1',
    exclusive: true
  })
  console.log(`✓ Lock 1 acquired: ${lock1}`)

  const lock2 = await lockManager.acquireLock('resource-A', {
    timeout: 60000,
    exclusive: true
  })
  console.log(`✓ Lock 2 acquired: ${lock2}\n`)

  // 4. Get lock info
  console.log('Step 4: Getting lock information...')
  const lockInfo = await lockManager.getLockInfo('workflow-123')
  console.log('Lock info:', JSON.stringify(lockInfo, null, 2))
  console.log()

  // 5. List all locks
  console.log('Step 5: Listing all active locks...')
  const allLocks = await lockManager.listLocks()
  console.log(`Found ${allLocks.length} active locks\n`)

  // 6. Check for deadlocks
  console.log('Step 6: Checking for deadlocks...')
  const hasDeadlock = await lockManager.detectDeadlocks()
  console.log(`Deadlock detected: ${hasDeadlock}\n`)

  // 7. Get blocking locks for a resource
  console.log('Step 7: Querying blocking locks...')
  const blockers = await lockManager.getBlockingLocks('workflow-123')
  console.log(`Blocking locks: ${blockers.length}\n`)

  // 8. Get long-running locks
  console.log('Step 8: Finding long-running locks...')
  const longLocks = await lockManager.getAbnormallyLongLocks(60000)
  console.log(`Long-running locks (>60s): ${longLocks.length}\n`)

  // 9. Get owner statistics
  console.log('Step 9: Getting owner statistics...')
  const owner = `${process.pid}@localhost`
  const stats = await LockQueries.getOwnerStats(ks, owner)
  console.log('Owner stats:', stats)
  console.log()

  // 10. Get active locks count
  console.log('Step 10: Getting active locks count...')
  const activeCount = await LockQueries.getActiveLocksCount(ks)
  console.log(`Active locks count: ${activeCount}\n`)

  // 11. Release locks
  console.log('Step 11: Releasing locks...')
  await lockManager.releaseLock('workflow-123')
  console.log('✓ Lock 1 released')
  await lockManager.releaseLock('resource-A')
  console.log('✓ Lock 2 released\n')

  // 12. Cleanup expired locks
  console.log('Step 12: Cleaning up expired locks...')
  const cleanedCount = await lockManager.cleanupExpiredLocks()
  console.log(`✓ Cleaned up ${cleanedCount} expired locks\n`)

  console.log('='.repeat(60))
  console.log('✓ RDFLockManager example complete!')
  console.log('='.repeat(60))
}

main().catch(console.error)
