#!/usr/bin/env node

/**
 * RDFSnapshotStore Example
 *
 * Demonstrates RDF-enhanced snapshot storage with provenance tracking
 * and SPARQL queries for lineage discovery.
 *
 * Features:
 * - Store snapshots with PROV-O metadata
 * - Retrieve snapshot lineage and history
 * - Query timeline of snapshots
 * - Manage snapshot series
 * - Backward compatibility with non-RDF mode
 */

import { RDFSnapshotStore } from '../src/git-native/RDFSnapshotStore.mjs';

/**
 * Mock KnowledgeSubstrate for demonstration
 * In production, use actual UnRDF KnowledgeSubstrateCore
 */
class DemoKnowledgeSubstrate {
  constructor() {
    this.store = [];
  }

  async load(turtle, options) {
    this.store.push({ turtle, options, timestamp: new Date() });
    const lineCount = turtle.split('\n').filter(l => l.trim()).length;
    console.log(`    ✓ Loaded ${lineCount} RDF triples`);
    return { success: true };
  }

  async query(sparql) {
    console.log(`    ✓ Executing SPARQL query`);

    // Mock timeline result
    if (sparql.includes('SELECT')) {
      return {
        bindings: [
          {
            timestamp: { value: '2026-01-09T12:00:00Z' },
            operation: { value: 'workflow-execution-1' },
            content: { value: 'abc123def456' },
            commit: { value: 'deadbeef1234' },
            branch: { value: 'main' }
          },
          {
            timestamp: { value: '2026-01-09T11:30:00Z' },
            operation: { value: 'workflow-execution-2' },
            content: { value: 'def456abc789' },
            commit: { value: 'cafebabe5678' },
            branch: { value: 'develop' }
          }
        ]
      };
    }

    // Mock lineage result
    return {
      snapshots: [
        { contentHash: 'abc123def456', key: 'workflow-state' },
        { contentHash: 'def456abc789', key: 'workflow-state' }
      ],
      provenance: {
        operation: 'workflow-execution',
        user: 'system'
      }
    };
  }
}

async function main() {
  console.log('🚀 RDFSnapshotStore Demo\n');
  console.log('=' .repeat(60));

  // 1. Initialize RDFSnapshotStore with RDF backend
  console.log('\n📦 Step 1: Initialize RDFSnapshotStore with RDF Backend');
  const knowledgeSubstrate = new DemoKnowledgeSubstrate();
  const store = new RDFSnapshotStore({
    cwd: process.cwd(),
    snapshot: {
      cacheDir: '.gitvan/cache',
      tempDir: '.gitvan/tmp'
    }
  });

  await store.initialize(knowledgeSubstrate, { enableRDF: true });
  console.log('  ✓ RDFSnapshotStore initialized with semantic backend');

  // 2. Store snapshot with rich provenance metadata
  console.log('\n📝 Step 2: Store Workflow Snapshot with Provenance');
  const workflowData = {
    workflowId: 'wf-12345-build-deploy',
    status: 'completed',
    steps: [
      { id: 'build', status: 'completed', duration: 1200 },
      { id: 'test', status: 'completed', duration: 800 },
      { id: 'deploy', status: 'completed', duration: 600 }
    ],
    totalDuration: 2600,
    timestamp: new Date().toISOString()
  };

  const metadata = {
    operation: 'workflow-execution',
    user: 'ci-system',
    description: 'Production deployment workflow snapshot',
    tags: ['workflow', 'production', 'v1.2.3']
  };

  const contentHash = await store.storeSnapshot('workflow-state', workflowData, metadata);
  console.log(`  ✓ Stored snapshot: ${contentHash.substring(0, 16)}...`);
  console.log(`  ✓ Provenance: ${metadata.operation} by ${metadata.user}`);
  console.log(`  ✓ Tags: ${metadata.tags.join(', ')}`);

  // 3. Store second snapshot (creates immutable chain)
  console.log('\n🔗 Step 3: Store Archive Snapshot (Creates Provenance Chain)');
  const archivedData = {
    ...workflowData,
    status: 'archived',
    archiveTimestamp: new Date().toISOString(),
    archiveReason: 'Deployment complete, moved to archive'
  };

  const hash2 = await store.storeSnapshot('workflow-state', archivedData, {
    operation: 'workflow-archive',
    user: 'admin',
    description: 'Archived completed workflow'
  });
  console.log(`  ✓ Stored archive snapshot: ${hash2.substring(0, 16)}...`);
  console.log(`  ✓ Automatically linked to previous snapshot`);
  console.log(`  ✓ Immutable provenance chain established`);

  // 4. Query snapshot lineage (SPARQL DESCRIBE)
  console.log('\n🔍 Step 4: Query Snapshot Lineage with SPARQL');
  const lineage = await store.getSnapshotLineage('workflow-state');
  console.log(`  ✓ Discovered ${lineage.totalChain} snapshots in provenance chain`);
  console.log(`  ✓ Lineage snapshots:`, lineage.snapshots);
  console.log(`  ✓ Provenance metadata:`, lineage.provenance);

  // 5. Query snapshot timeline (SPARQL SELECT)
  console.log('\n📊 Step 5: Query Snapshot Timeline (Ordered by Time)');
  const timeline = await store.getSnapshotTimeline('workflow-state');
  console.log(`  ✓ Timeline contains ${timeline.length} entries`);
  timeline.forEach((entry, i) => {
    console.log(`    ${i + 1}. [${entry.timestamp}] ${entry.operation || 'unknown'}`);
    console.log(`       Hash: ${entry.contentHash}, Branch: ${entry.branch}`);
  });

  // 6. Retrieve snapshot data
  console.log('\n📥 Step 6: Retrieve Snapshot Data');
  const retrieved = await store.getSnapshot('workflow-state', contentHash);
  console.log(`  ✓ Retrieved snapshot for key: workflow-state`);
  console.log(`  ✓ Workflow ID: ${retrieved?.workflowId}`);
  console.log(`  ✓ Status: ${retrieved?.status}`);
  console.log(`  ✓ Steps: ${retrieved?.steps?.length} steps completed`);

  // 7. Get comprehensive statistics
  console.log('\n📈 Step 7: Snapshot Store Statistics');
  const stats = await store.getStatistics();
  console.log('  Base Statistics:');
  console.log(`    - Total Entries: ${stats.entries}`);
  console.log(`    - Cache Hits: ${stats.hits}, Misses: ${stats.misses}`);
  console.log(`    - Hit Rate: ${(stats.hitRate * 100).toFixed(2)}%`);
  console.log('  RDF Statistics:');
  console.log(`    - RDF Enabled: ${stats.rdf.enabled}`);
  console.log(`    - Triples Written: ${stats.rdf.triplesWritten}`);
  console.log(`    - SPARQL Queries: ${stats.rdf.queriesExecuted}`);
  console.log(`    - Lineage Chains: ${stats.rdf.lineageChains}`);
  console.log(`    - Provenance Records: ${stats.rdf.provRecords}`);

  // 8. Demonstrate backward compatibility mode
  console.log('\n🔄 Step 8: Backward Compatibility (No RDF)');
  const legacyStore = new RDFSnapshotStore({ cwd: process.cwd() });
  await legacyStore.initialize(null, { enableRDF: false });
  console.log('  ✓ RDFSnapshotStore works without RDF backend');

  const legacyHash = await legacyStore.storeSnapshot('legacy-data', {
    value: 42,
    timestamp: new Date().toISOString()
  });
  console.log(`  ✓ Stored legacy snapshot: ${legacyHash.substring(0, 16)}...`);
  console.log('  ✓ Fully backward compatible with existing JSON storage');

  // 9. Summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ RDFSnapshotStore Demo Complete!\n');
  console.log('Key Features Demonstrated:');
  console.log('  ✓ Dual-write pattern (JSON content + RDF metadata)');
  console.log('  ✓ PROV-O provenance tracking (wasGeneratedBy, wasAttributedTo)');
  console.log('  ✓ Immutable snapshot chains (previousSnapshot links)');
  console.log('  ✓ SPARQL queries for lineage and timeline');
  console.log('  ✓ Backward compatibility with non-RDF mode');
  console.log('  ✓ Comprehensive statistics and monitoring\n');
}

main().catch(error => {
  console.error('❌ Demo failed:', error);
  process.exit(1);
});
