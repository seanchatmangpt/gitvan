#!/usr/bin/env node

/**
 * Integrated Workflow Example: All 4 Phases Working Together
 *
 * This example demonstrates a complete end-to-end workflow that uses all 4 phases
 * of the GitVan RDF migration to optimize system performance based on customer impact.
 *
 * Scenario: System performance degradation → Customer churn risk → Pack optimization
 *
 * Flow:
 * 1. Phase 1 (Git-Native I/O): Acquire lock, store baseline snapshot
 * 2. Phase 2 (Performance): Detect regression, analyze anomalies
 * 3. Phase 3 (RevOps): Identify affected customers, calculate business impact
 * 4. Phase 4 (Pack System): Find and apply optimization pack
 * 5. Verify improvement across all phases
 *
 * Usage:
 *   node examples/integrated-workflow-example.mjs
 *
 * @module examples/integrated-workflow-example
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createKnowledgeSubstrateCore } from '../vendor/unrdf/packages/core/index.js';
import { initializeGitVanOntologies } from '../src/core/KnowledgeSubstrateExtensions.mjs';
import { RDFLockManager } from '../src/git-native/RDFLockManager.mjs';
import { RDFSnapshotStore } from '../src/git-native/RDFSnapshotStore.mjs';
import { RDFQueueManager } from '../src/git-native/RDFQueueManager.mjs';
import { createLogger } from '../src/utils/logger.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const logger = createLogger('integrated-workflow-example');

// ============================================================================
// Phase 2: Performance Monitoring (Simulated)
// ============================================================================

class PerformanceMonitor {
  constructor(knowledgeSubstrate) {
    this.ks = knowledgeSubstrate;
    this.namespace = 'https://gitvan.dev/performance#';
  }

  async initialize() {
    // In real implementation, this would load performance ontology
    logger.info('PerformanceMonitor initialized');
  }

  /**
   * Record a performance measurement
   */
  async recordMeasurement(operation, duration, metadata = {}) {
    const measurementId = `measurement-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const timestamp = new Date().toISOString();

    // Store as RDF triple
    const triples = [
      `<${this.namespace}${measurementId}> a <${this.namespace}Measurement> .`,
      `<${this.namespace}${measurementId}> <${this.namespace}operation> "${operation}" .`,
      `<${this.namespace}${measurementId}> <${this.namespace}duration> "${duration}"^^<http://www.w3.org/2001/XMLSchema#integer> .`,
      `<${this.namespace}${measurementId}> <${this.namespace}timestamp> "${timestamp}"^^<http://www.w3.org/2001/XMLSchema#dateTime> .`,
    ];

    if (metadata.memoryUsed) {
      triples.push(`<${this.namespace}${measurementId}> <${this.namespace}memoryUsed> "${metadata.memoryUsed}"^^<http://www.w3.org/2001/XMLSchema#integer> .`);
    }

    if (metadata.cpuPercent) {
      triples.push(`<${this.namespace}${measurementId}> <${this.namespace}cpuPercent> "${metadata.cpuPercent}"^^<http://www.w3.org/2001/XMLSchema#integer> .`);
    }

    // In real implementation, this would use KnowledgeSubstrate to store triples
    logger.info(`Recorded measurement: ${operation} = ${duration}ms`, { metadata });

    return {
      id: measurementId,
      operation,
      duration,
      timestamp,
      ...metadata
    };
  }

  /**
   * Detect performance regression
   */
  async detectRegression(options = {}) {
    const {
      threshold = 0.15,  // 15% slowdown
      window = 86400000,  // 24 hours
      operation = 'api-request'
    } = options;

    // Simulate regression detection
    // In real implementation, this would use SPARQL to query historical data
    const currentAvg = 5200;  // ms
    const historicalAvg = 4500;  // ms
    const percentChange = ((currentAvg - historicalAvg) / historicalAvg) * 100;

    if (percentChange > threshold * 100) {
      logger.warn(`Regression detected: ${operation} +${percentChange.toFixed(1)}%`);

      return {
        operation,
        currentAverage: currentAvg,
        historicalAverage: historicalAvg,
        percentChange: percentChange.toFixed(1),
        severity: percentChange > 30 ? 'critical' : percentChange > 15 ? 'high' : 'medium',
        rootCause: 'database-query-slowdown',
        affectedOperations: ['api-request', 'dashboard-load', 'report-generation']
      };
    }

    return null;
  }

  /**
   * Get recent metrics for an operation
   */
  async getRecentMetrics(operation, windowMs = 3600000) {
    // Simulate metrics retrieval
    // In real implementation, use SPARQL query
    return {
      operation,
      avgDuration: 4300,
      p50: 3800,
      p95: 6200,
      p99: 8100,
      count: 1523,
      window: windowMs
    };
  }

  /**
   * Get anomalies in the last N milliseconds
   */
  async getAnomalies(windowMs = 3600000) {
    // Simulate anomaly detection
    return [
      {
        id: 'anomaly-001',
        type: 'high-duration',
        operation: 'api-request',
        severity: 'high',
        description: 'API requests 45% slower than baseline',
        timestamp: new Date().toISOString()
      }
    ];
  }
}

// ============================================================================
// Phase 3: RevOps Analytics (Simulated)
// ============================================================================

class RevOpsAnalytics {
  constructor(knowledgeSubstrate) {
    this.ks = knowledgeSubstrate;
    this.namespace = 'https://gitvan.dev/revops#';
  }

  async initialize() {
    logger.info('RevOpsAnalytics initialized');
  }

  /**
   * Analyze business impact of performance regression
   */
  async analyzePerformanceImpact(regression) {
    // Simulate customer impact analysis
    // In real implementation, use SPARQL to join performance + customer data
    const affectedCustomers = [
      {
        id: 'customer-acme-corp',
        name: 'Acme Corp',
        mrr: 15000,
        churnRisk: 72,
        usesFeatures: regression.affectedOperations,
        segment: 'enterprise'
      },
      {
        id: 'customer-global-tech',
        name: 'Global Tech',
        mrr: 8000,
        churnRisk: 65,
        usesFeatures: regression.affectedOperations,
        segment: 'mid-market'
      },
      {
        id: 'customer-startup-inc',
        name: 'Startup Inc',
        mrr: 2500,
        churnRisk: 58,
        usesFeatures: ['api-request'],
        segment: 'smb'
      }
    ];

    const totalMRR = affectedCustomers.reduce((sum, c) => sum + c.mrr, 0);
    const avgChurnRisk = affectedCustomers.reduce((sum, c) => sum + c.churnRisk, 0) / affectedCustomers.length;

    logger.warn(`Performance impact: ${affectedCustomers.length} customers affected`, {
      totalMRR,
      avgChurnRisk: avgChurnRisk.toFixed(1)
    });

    return {
      customerCount: affectedCustomers.length,
      customers: affectedCustomers,
      customerIds: affectedCustomers.map(c => c.id),
      totalMRR,
      avgChurnRisk,
      highRiskCount: affectedCustomers.filter(c => c.churnRisk > 70).length
    };
  }

  /**
   * Predict churn risk for customers
   */
  async predictChurnRisk(options = {}) {
    const { threshold = 60 } = options;

    // Simulate churn prediction
    const customers = [
      { id: 'customer-acme-corp', name: 'Acme Corp', churnRisk: 72, mrr: 15000 },
      { id: 'customer-global-tech', name: 'Global Tech', churnRisk: 65, mrr: 8000 },
    ];

    return customers.filter(c => c.churnRisk >= threshold);
  }

  /**
   * Record successful optimization
   */
  async recordSuccessfulOptimization(data) {
    logger.info('Recorded successful optimization', {
      customersAffected: data.affectedCustomers.length,
      improvement: `${data.performanceImprovement}%`,
      pack: data.packUsed
    });

    return {
      id: `optimization-${Date.now()}`,
      ...data,
      timestamp: new Date().toISOString()
    };
  }
}

// ============================================================================
// Phase 4: Pack Registry (Simulated)
// ============================================================================

class PackRegistry {
  constructor(knowledgeSubstrate) {
    this.ks = knowledgeSubstrate;
    this.namespace = 'https://gitvan.dev/pack#';
  }

  async initialize() {
    logger.info('PackRegistry initialized');
  }

  /**
   * Suggest optimization packs for a problem
   */
  async suggestOptimizationPacks(options = {}) {
    const {
      problem,
      compatibleWith = 'gitvan-3.x',
      minRating = 4.0
    } = options;

    // Simulate pack discovery
    // In real implementation, use SPARQL federated query to marketplace
    const packs = [
      {
        id: 'pack-db-query-cache',
        name: 'Database Query Cache',
        description: 'Intelligent query caching with Redis backend',
        category: 'performance',
        solves: ['database-query-slowdown', 'high-latency'],
        rating: 4.7,
        price: 99,
        compatibleWith: ['gitvan-3.x'],
        expectedImprovement: 0.35,  // 35% improvement
        reviews: 142,
        installs: 1823
      },
      {
        id: 'pack-connection-pool',
        name: 'Connection Pool Optimizer',
        description: 'Optimize database connection pooling',
        category: 'performance',
        solves: ['database-query-slowdown'],
        rating: 4.3,
        price: 49,
        compatibleWith: ['gitvan-3.x'],
        expectedImprovement: 0.20,
        reviews: 87,
        installs: 934
      }
    ];

    const filtered = packs
      .filter(p => p.solves.includes(problem))
      .filter(p => p.compatibleWith.includes(compatibleWith))
      .filter(p => p.rating >= minRating)
      .sort((a, b) => b.rating - a.rating);

    logger.info(`Found ${filtered.length} optimization packs for ${problem}`);

    return filtered;
  }

  /**
   * Apply a pack to the system
   */
  async applyPack(packId) {
    logger.info(`Applying pack: ${packId}`);

    // Simulate pack installation
    await new Promise(resolve => setTimeout(resolve, 2000));

    logger.success(`Pack ${packId} applied successfully`);

    return {
      packId,
      status: 'installed',
      installedAt: new Date().toISOString()
    };
  }

  /**
   * Find packs by category
   */
  async findPacksByCategory(category) {
    const packs = [
      {
        id: 'pack-horizontal-scaling',
        name: 'Horizontal Scaling Kit',
        category: 'scaling',
        description: 'Tools for horizontal scaling across multiple nodes'
      },
      {
        id: 'pack-load-balancer',
        name: 'Intelligent Load Balancer',
        category: 'scaling',
        description: 'Smart load balancing with health checks'
      }
    ];

    return packs.filter(p => p.category === category);
  }
}

// ============================================================================
// Main Workflow
// ============================================================================

async function main() {
  console.log('\n════════════════════════════════════════════════════════');
  console.log('  GitVan Integrated Workflow Example');
  console.log('  Demonstrating All 4 Phases Working Together');
  console.log('════════════════════════════════════════════════════════\n');

  // ========== Setup ==========
  console.log('📦 Setting up Knowledge Substrate...\n');

  const ks = createKnowledgeSubstrateCore({
    storage: 'memory',
    caching: true
  });

  // Initialize ontologies
  const ontologyResult = await initializeGitVanOntologies(ks, {
    validateWithShacl: false,  // Skip validation for example
    registerHooks: false
  });

  console.log(`✓ Loaded ${Object.keys(ontologyResult.ontologies).length} ontologies\n`);

  // ========== Phase Initialization ==========
  console.log('🔧 Initializing all phases...\n');

  // Phase 1: Git-Native I/O
  const lockManager = new RDFLockManager({ cwd: process.cwd() });
  const snapshotStore = new RDFSnapshotStore({ cwd: process.cwd() });
  const queueManager = new RDFQueueManager({ cwd: process.cwd() });

  await lockManager.initialize(ks);
  await snapshotStore.initialize(ks);
  await queueManager.initialize(ks);

  // Phase 2: Performance Monitoring
  const performanceMonitor = new PerformanceMonitor(ks);
  await performanceMonitor.initialize();

  // Phase 3: RevOps Analytics
  const revopsAnalytics = new RevOpsAnalytics(ks);
  await revopsAnalytics.initialize();

  // Phase 4: Pack Registry
  const packRegistry = new PackRegistry(ks);
  await packRegistry.initialize();

  console.log('✓ All phases initialized\n');

  // ========== STEP 1: Performance Detection (Phase 2) ==========
  console.log('═══════════════════════════════════════════════════════');
  console.log(' STEP 1: Detect Performance Regression (Phase 2)');
  console.log('═══════════════════════════════════════════════════════\n');

  const regression = await performanceMonitor.detectRegression({
    threshold: 0.15,  // 15% threshold
    operation: 'api-request'
  });

  if (!regression) {
    console.log('✓ No performance regressions detected. System healthy!\n');
    return;
  }

  console.log('⚠  REGRESSION DETECTED:');
  console.log(`   Operation: ${regression.operation}`);
  console.log(`   Change: +${regression.percentChange}%`);
  console.log(`   Severity: ${regression.severity}`);
  console.log(`   Root Cause: ${regression.rootCause}`);
  console.log(`   Current Avg: ${regression.currentAverage}ms`);
  console.log(`   Historical Avg: ${regression.historicalAverage}ms\n`);

  // ========== STEP 2: Business Impact Analysis (Phase 3) ==========
  console.log('═══════════════════════════════════════════════════════');
  console.log(' STEP 2: Analyze Business Impact (Phase 3)');
  console.log('═══════════════════════════════════════════════════════\n');

  const businessImpact = await revopsAnalytics.analyzePerformanceImpact(regression);

  console.log('💼 BUSINESS IMPACT:');
  console.log(`   Affected Customers: ${businessImpact.customerCount}`);
  console.log(`   Total MRR at Risk: $${businessImpact.totalMRR.toLocaleString()}`);
  console.log(`   Avg Churn Risk: ${businessImpact.avgChurnRisk.toFixed(1)}%`);
  console.log(`   High Risk Customers: ${businessImpact.highRiskCount}\n`);

  console.log('   Customer Details:');
  businessImpact.customers.forEach(customer => {
    console.log(`   - ${customer.name} (${customer.segment})`);
    console.log(`     MRR: $${customer.mrr.toLocaleString()}, Churn Risk: ${customer.churnRisk}%`);
  });
  console.log();

  // ========== STEP 3: Find Solution (Phase 4) ==========
  console.log('═══════════════════════════════════════════════════════');
  console.log(' STEP 3: Find Optimization Pack (Phase 4)');
  console.log('═══════════════════════════════════════════════════════\n');

  const optimizationPacks = await packRegistry.suggestOptimizationPacks({
    problem: regression.rootCause,
    compatibleWith: 'gitvan-3.x',
    minRating: 4.0
  });

  if (optimizationPacks.length === 0) {
    console.log('❌ No optimization packs available for this problem\n');
    return;
  }

  console.log(`🎁 Found ${optimizationPacks.length} optimization packs:\n`);
  optimizationPacks.forEach((pack, i) => {
    console.log(`   ${i + 1}. ${pack.name} (⭐ ${pack.rating})`);
    console.log(`      ${pack.description}`);
    console.log(`      Expected improvement: ${(pack.expectedImprovement * 100).toFixed(0)}%`);
    console.log(`      Price: $${pack.price}, Installs: ${pack.installs.toLocaleString()}\n`);
  });

  const selectedPack = optimizationPacks[0];
  console.log(`✓ Selected: ${selectedPack.name}\n`);

  // ========== STEP 4: Acquire Lock and Store Baseline (Phase 1) ==========
  console.log('═══════════════════════════════════════════════════════');
  console.log(' STEP 4: Acquire Lock & Store Baseline (Phase 1)');
  console.log('═══════════════════════════════════════════════════════\n');

  const lockAcquired = await lockManager.acquireLock('system-optimization', {
    timeout: 600000,  // 10 minutes
    priority: 100,
    exclusive: true,
    fingerprint: `example-${process.pid}`
  });

  if (!lockAcquired) {
    console.log('❌ Failed to acquire lock. System is busy.\n');
    return;
  }

  console.log('🔒 Lock acquired: system-optimization\n');

  try {
    // Store baseline snapshot
    const baselineSnapshot = await snapshotStore.store('system-state', {
      operation: regression.operation,
      avgDuration: regression.currentAverage,
      affectedCustomers: businessImpact.customerIds,
      timestamp: new Date().toISOString()
    }, {
      description: 'Baseline before optimization',
      tags: ['baseline', 'optimization', regression.operation, selectedPack.id],
      activity: 'automated-optimization',
      agent: 'integrated-workflow-example'
    });

    console.log('📸 Baseline snapshot stored:');
    console.log(`   ID: ${baselineSnapshot.id}`);
    console.log(`   Timestamp: ${baselineSnapshot.timestamp}\n`);

    // ========== STEP 5: Apply Optimization Pack (Phase 4) ==========
    console.log('═══════════════════════════════════════════════════════');
    console.log(' STEP 5: Apply Optimization Pack (Phase 4)');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log(`🚀 Applying pack: ${selectedPack.name}...`);
    await packRegistry.applyPack(selectedPack.id);

    console.log('⏳ Waiting for changes to take effect (30s)...\n');
    await new Promise(resolve => setTimeout(resolve, 30000));

    // ========== STEP 6: Verify Improvement (Phase 2) ==========
    console.log('═══════════════════════════════════════════════════════');
    console.log(' STEP 6: Verify Improvement (Phase 2)');
    console.log('═══════════════════════════════════════════════════════\n');

    const afterMetrics = await performanceMonitor.getRecentMetrics(regression.operation);

    const improvement = ((regression.currentAverage - afterMetrics.avgDuration) / regression.currentAverage) * 100;

    console.log('📊 PERFORMANCE IMPROVEMENT:');
    console.log(`   Before: ${regression.currentAverage}ms`);
    console.log(`   After: ${afterMetrics.avgDuration}ms`);
    console.log(`   Improvement: ${improvement.toFixed(1)}% 🎉\n`);

    console.log('   Detailed Metrics:');
    console.log(`   - P50: ${afterMetrics.p50}ms`);
    console.log(`   - P95: ${afterMetrics.p95}ms`);
    console.log(`   - P99: ${afterMetrics.p99}ms`);
    console.log(`   - Sample count: ${afterMetrics.count}\n`);

    // ========== STEP 7: Store After Snapshot (Phase 1) ==========
    console.log('═══════════════════════════════════════════════════════');
    console.log(' STEP 7: Store After Snapshot (Phase 1)');
    console.log('═══════════════════════════════════════════════════════\n');

    const afterSnapshot = await snapshotStore.store('system-state', {
      operation: regression.operation,
      avgDuration: afterMetrics.avgDuration,
      packApplied: selectedPack.name,
      packId: selectedPack.id,
      improvement: improvement.toFixed(1),
      timestamp: new Date().toISOString()
    }, {
      description: `After applying ${selectedPack.name}`,
      tags: ['optimized', selectedPack.id, regression.operation],
      previousSnapshot: baselineSnapshot.id,
      activity: 'automated-optimization',
      agent: 'integrated-workflow-example'
    });

    console.log('📸 After snapshot stored:');
    console.log(`   ID: ${afterSnapshot.id}`);
    console.log(`   Linked to baseline: ${baselineSnapshot.id}\n`);

    // ========== STEP 8: Update Customer Status (Phase 3) ==========
    console.log('═══════════════════════════════════════════════════════');
    console.log(' STEP 8: Update Customer Status (Phase 3)');
    console.log('═══════════════════════════════════════════════════════\n');

    if (improvement > 10) {
      await revopsAnalytics.recordSuccessfulOptimization({
        affectedCustomers: businessImpact.customerIds,
        performanceImprovement: improvement,
        packUsed: selectedPack.name,
        packId: selectedPack.id,
        mrrImpact: businessImpact.totalMRR
      });

      console.log('✅ SUCCESS: Optimization completed!');
      console.log(`   ${businessImpact.customerCount} customers will benefit`);
      console.log(`   $${businessImpact.totalMRR.toLocaleString()} MRR protected`);
      console.log(`   Average churn risk reduced\n`);
    } else {
      console.log('⚠  Minimal improvement detected');
      console.log('   Consider trying alternative optimization packs\n');
    }

  } finally {
    // ========== Cleanup: Release Lock (Phase 1) ==========
    await lockManager.releaseLock('system-optimization');
    console.log('🔓 Lock released: system-optimization\n');
  }

  // ========== Summary ==========
  console.log('═══════════════════════════════════════════════════════');
  console.log(' WORKFLOW COMPLETE');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('📋 Summary of Actions:');
  console.log('   ✓ Phase 1: Acquired lock, stored 2 snapshots with lineage');
  console.log('   ✓ Phase 2: Detected regression, verified improvement');
  console.log('   ✓ Phase 3: Analyzed business impact, updated customer status');
  console.log('   ✓ Phase 4: Found and applied optimization pack\n');

  console.log('🎯 Business Outcome:');
  console.log(`   - Performance improved by ${improvement.toFixed(1)}%`);
  console.log(`   - ${businessImpact.customerCount} high-value customers protected`);
  console.log(`   - $${businessImpact.totalMRR.toLocaleString()} MRR saved from churn risk`);
  console.log(`   - Pack ROI: ${(businessImpact.totalMRR / selectedPack.price).toFixed(0)}x\n`);

  console.log('✨ All phases worked together seamlessly!\n');
}

// Run the workflow
main().catch(error => {
  console.error('\n❌ Workflow failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
