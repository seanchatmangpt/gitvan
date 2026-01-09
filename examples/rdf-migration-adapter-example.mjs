/**
 * RDF Migration Adapter Example
 *
 * Demonstrates how to use the RDF migration adapters to gradually
 * migrate from JSON-based to RDF-based Git-Native I/O.
 *
 * @example
 * # Run example
 * node examples/rdf-migration-adapter-example.mjs
 */

import {
  RDFLockManagerAdapter,
  RDFSnapshotStoreAdapter,
  RDFQueueManagerAdapter,
  createMigrationAdapters,
  getMigrationHealth
} from '../src/git-native/RDFMigrationAdapter.mjs';

import { LockManager } from '../src/git-native/LockManager.mjs';
import { SnapshotStore } from '../src/git-native/SnapshotStore.mjs';
import { QueueManager } from '../src/git-native/QueueManager.mjs';

// NOTE: RDF implementations not yet available, using JSON managers for demo
// In production, import actual RDF implementations:
// import { RDFLockManager } from '../src/git-native/RDFLockManager.mjs';

/**
 * Example 1: Basic Lock Manager Migration
 */
async function lockManagerExample() {
  console.log('\n=== Lock Manager Migration Example ===\n');

  // Create JSON and RDF lock managers
  const jsonLockManager = new LockManager({
    cwd: process.cwd(),
    logger: console
  });

  // For demo, using same LockManager class as "RDF" version
  // In production, this would be RDFLockManager
  const rdfLockManager = new LockManager({
    cwd: process.cwd(),
    logger: console,
    lock: { lockPrefix: 'refs/gitvan/rdf-locks' } // Different prefix for demo
  });

  // Create migration adapter
  const adapter = new RDFLockManagerAdapter(jsonLockManager, rdfLockManager, {
    mode: 'dual-write',
    logger: console
  });

  await adapter.initialize();

  console.log('1. Acquiring lock in dual-write mode...');
  const acquired = await adapter.acquireLock('demo-resource', {
    timeout: 30000,
    fingerprint: 'demo-worker'
  });
  console.log('   Lock acquired:', acquired);

  console.log('\n2. Getting lock info...');
  const lockInfo = await adapter.getLockInfo('demo-resource');
  console.log('   Lock info:', lockInfo);

  console.log('\n3. Checking statistics...');
  const stats = adapter.getStats();
  console.log('   RDF writes:', stats.rdfWrites);
  console.log('   JSON writes:', stats.jsonWrites);
  console.log('   Mode:', stats.mode);

  console.log('\n4. Switching to rdf-primary mode...');
  adapter.setMigrationMode('rdf-primary');
  const newMode = adapter.getStats().mode;
  console.log('   New mode:', newMode);

  console.log('\n5. Releasing lock...');
  await adapter.releaseLock('demo-resource');
  console.log('   Lock released');

  console.log('\n6. Cleaning up...');
  await adapter.clearAllLocks();
}

/**
 * Example 2: Snapshot Store Migration
 */
async function snapshotStoreExample() {
  console.log('\n=== Snapshot Store Migration Example ===\n');

  const jsonStore = new SnapshotStore({
    cwd: process.cwd(),
    logger: console
  });

  const rdfStore = new SnapshotStore({
    cwd: process.cwd(),
    logger: console,
    snapshot: { cacheDir: '.gitvan/rdf-cache' } // Different dir for demo
  });

  const adapter = new RDFSnapshotStoreAdapter(jsonStore, rdfStore, {
    mode: 'dual-write',
    logger: console
  });

  await adapter.initialize();

  console.log('1. Storing snapshot in dual-write mode...');
  const hash = await adapter.storeSnapshot('workflow-state', {
    step: 3,
    progress: 0.6,
    data: { foo: 'bar' }
  }, {
    workflow: 'deploy',
    version: '1.0.0'
  });
  console.log('   Content hash:', hash);

  console.log('\n2. Retrieving snapshot...');
  const state = await adapter.getSnapshot('workflow-state', hash);
  console.log('   State:', state);

  console.log('\n3. Listing snapshots...');
  const snapshots = await adapter.listSnapshots();
  console.log('   Total snapshots:', snapshots.length);

  console.log('\n4. Getting cache statistics...');
  const stats = adapter.getStatistics();
  console.log('   Cache hits:', stats.hits);
  console.log('   Cache misses:', stats.misses);
  console.log('   Hit rate:', (stats.hitRate * 100).toFixed(2) + '%');
  console.log('   Total size:', stats.sizeMB.toFixed(2), 'MB');

  console.log('\n5. Cleaning up...');
  await adapter.clearCache();
}

/**
 * Example 3: Queue Manager Migration
 */
async function queueManagerExample() {
  console.log('\n=== Queue Manager Migration Example ===\n');

  const jsonQueue = new QueueManager({
    cwd: process.cwd(),
    logger: console
  });

  const rdfQueue = new QueueManager({
    cwd: process.cwd(),
    logger: console,
    paths: { queue: '.gitvan/rdf-queue' } // Different dir for demo
  });

  const adapter = new RDFQueueManagerAdapter(jsonQueue, rdfQueue, {
    mode: 'dual-write',
    logger: console
  });

  await adapter.initialize();

  console.log('1. Adding high-priority job...');
  const result = await adapter.addJob('high', async () => {
    console.log('   Executing job...');
    return { success: true, timestamp: Date.now() };
  }, {
    name: 'demo-job',
    tags: { example: true }
  });
  console.log('   Job result:', result);

  console.log('\n2. Getting queue status...');
  const status = adapter.getStatus();
  console.log('   High priority:', status.high);
  console.log('   Medium priority:', status.medium);
  console.log('   Low priority:', status.low);

  console.log('\n3. Testing pause/resume...');
  adapter.pauseAll();
  console.log('   Queues paused');
  adapter.resumeAll();
  console.log('   Queues resumed');

  console.log('\n4. Cleaning up...');
  await adapter.clearCompleted();
  await adapter.shutdown();
}

/**
 * Example 4: Using Factory Function
 */
async function factoryExample() {
  console.log('\n=== Factory Function Example ===\n');

  // Create all adapters at once
  const adapters = createMigrationAdapters({
    jsonLockManager: new LockManager({ cwd: process.cwd() }),
    rdfLockManager: new LockManager({
      cwd: process.cwd(),
      lock: { lockPrefix: 'refs/gitvan/rdf-locks' }
    }),
    jsonSnapshotStore: new SnapshotStore({ cwd: process.cwd() }),
    rdfSnapshotStore: new SnapshotStore({
      cwd: process.cwd(),
      snapshot: { cacheDir: '.gitvan/rdf-cache' }
    }),
    jsonQueueManager: new QueueManager({ cwd: process.cwd() }),
    rdfQueueManager: new QueueManager({
      cwd: process.cwd(),
      paths: { queue: '.gitvan/rdf-queue' }
    }),
    mode: 'dual-write',
    logger: console
  });

  console.log('Created adapters:', Object.keys(adapters));

  // Initialize all
  await adapters.lockManager.initialize();
  await adapters.snapshotStore.initialize();
  await adapters.queueManager.initialize();

  console.log('\nAll adapters initialized successfully');

  // Use adapters
  await adapters.lockManager.acquireLock('resource-1');
  await adapters.snapshotStore.storeSnapshot('key-1', { data: 'value' });
  await adapters.queueManager.addJob('medium', async () => ({ done: true }));

  console.log('\nOperations completed');

  // Cleanup
  await adapters.lockManager.clearAllLocks();
  await adapters.snapshotStore.clearCache();
  await adapters.queueManager.shutdown();
}

/**
 * Example 5: Health Monitoring
 */
async function healthMonitoringExample() {
  console.log('\n=== Health Monitoring Example ===\n');

  const adapters = createMigrationAdapters({
    jsonLockManager: new LockManager({ cwd: process.cwd() }),
    rdfLockManager: new LockManager({
      cwd: process.cwd(),
      lock: { lockPrefix: 'refs/gitvan/rdf-locks' }
    }),
    mode: 'dual-write',
    logger: console
  });

  await adapters.lockManager.initialize();

  // Perform some operations
  for (let i = 0; i < 5; i++) {
    await adapters.lockManager.acquireLock(`resource-${i}`);
    await adapters.lockManager.releaseLock(`resource-${i}`);
  }

  console.log('1. Getting migration health...');
  const health = getMigrationHealth(adapters);
  console.log('   Status:', health.status);
  console.log('   Timestamp:', health.timestamp);

  for (const [name, adapterHealth] of Object.entries(health.adapters)) {
    console.log(`\n   ${name}:`);
    console.log('     Mode:', adapterHealth.mode);
    console.log('     RDF Reads:', adapterHealth.stats.rdfReads);
    console.log('     JSON Reads:', adapterHealth.stats.jsonReads);
    console.log('     Error Rate:', (adapterHealth.stats.errorRate * 100).toFixed(2) + '%');
    console.log('     Issues:', adapterHealth.issues);
  }

  // Cleanup
  await adapters.lockManager.clearAllLocks();
}

/**
 * Example 6: Migration Mode Progression
 */
async function migrationProgressionExample() {
  console.log('\n=== Migration Mode Progression Example ===\n');

  const adapter = new RDFLockManagerAdapter(
    new LockManager({ cwd: process.cwd() }),
    new LockManager({
      cwd: process.cwd(),
      lock: { lockPrefix: 'refs/gitvan/rdf-locks' }
    }),
    { mode: 'dual-write', logger: console }
  );

  await adapter.initialize();

  // Phase 1: dual-write
  console.log('Phase 1: dual-write mode');
  console.log('  Writing to both systems for safety');
  await adapter.acquireLock('test-resource');
  console.log('  Lock acquired in both systems');
  await adapter.releaseLock('test-resource');
  console.log('  Stats:', adapter.getStats());

  // Phase 2: rdf-primary
  console.log('\nPhase 2: Switching to rdf-primary mode');
  adapter.setMigrationMode('rdf-primary');
  console.log('  Now reading from RDF primarily');
  await adapter.acquireLock('test-resource');
  console.log('  Lock acquired (RDF primary)');
  await adapter.releaseLock('test-resource');
  console.log('  Stats:', adapter.getStats());

  // Phase 3: rdf-only
  console.log('\nPhase 3: Switching to rdf-only mode');
  adapter.setMigrationMode('rdf-only');
  console.log('  JSON system no longer used');
  await adapter.acquireLock('test-resource');
  console.log('  Lock acquired (RDF only)');
  await adapter.releaseLock('test-resource');
  console.log('  Stats:', adapter.getStats());

  console.log('\nMigration complete! ✅');

  // Cleanup
  await adapter.clearAllLocks();
}

/**
 * Main execution
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║    RDF Migration Adapter Examples                          ║');
  console.log('║    GitVan Phase 1, Week 4, Task 4.2                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // Run all examples
    await lockManagerExample();
    await snapshotStoreExample();
    await queueManagerExample();
    await factoryExample();
    await healthMonitoringExample();
    await migrationProgressionExample();

    console.log('\n✅ All examples completed successfully!');
    console.log('\nNext steps:');
    console.log('  1. Review the migration guide: docs/RDF-MIGRATION-GUIDE.md');
    console.log('  2. Implement RDF-based managers (RDFLockManager, etc.)');
    console.log('  3. Deploy adapters in dual-write mode');
    console.log('  4. Monitor and validate for 1 week');
    console.log('  5. Progress through migration phases');

  } catch (error) {
    console.error('\n❌ Example failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  lockManagerExample,
  snapshotStoreExample,
  queueManagerExample,
  factoryExample,
  healthMonitoringExample,
  migrationProgressionExample
};
