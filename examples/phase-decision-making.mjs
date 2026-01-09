#!/usr/bin/env node

/**
 * Phase Decision-Making Example
 *
 * Demonstrates decision-making workflows where insights from one phase
 * drive actions in other phases.
 *
 * Scenarios:
 * 1. Performance regression → Customer impact → Automated intervention
 * 2. High churn risk → Performance analysis → Pack recommendation
 * 3. Lock contention → Performance degradation → System scaling
 * 4. Pack update → Performance verification → Rollback decision
 *
 * Usage:
 *   node examples/phase-decision-making.mjs [scenario]
 *
 * @module examples/phase-decision-making
 */

import { createLogger } from '../src/utils/logger.mjs';

const logger = createLogger('phase-decision-making');

// ============================================================================
// Decision Engine
// ============================================================================

class DecisionEngine {
  constructor(phases) {
    this.phases = phases;
    this.decisions = [];
  }

  /**
   * Record a decision with rationale
   */
  recordDecision(decision) {
    this.decisions.push({
      ...decision,
      timestamp: new Date().toISOString()
    });

    logger.info('Decision recorded', {
      action: decision.action,
      confidence: decision.confidence
    });
  }

  /**
   * Get decision history
   */
  getDecisions() {
    return this.decisions;
  }
}

// ============================================================================
// Scenario 1: Performance → Customer → Intervention
// ============================================================================

async function scenario1_PerformanceToCustomer(phases) {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║ Scenario 1: Performance Regression → Customer Impact     ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const decisionEngine = new DecisionEngine(phases);

  // Phase 2: Detect performance regression
  console.log('📊 Phase 2: Detecting performance regression...');
  const regression = {
    operation: 'dashboard-load',
    severity: 'critical',
    percentChange: 45,  // 45% slower
    currentAvg: 8500,
    historicalAvg: 5860,
    affectedOperations: ['dashboard-load', 'report-generation', 'chart-rendering']
  };

  console.log(`   ⚠  CRITICAL: ${regression.operation} is ${regression.percentChange}% slower`);
  console.log(`   Current: ${regression.currentAvg}ms, Expected: ${regression.historicalAvg}ms\n`);

  // Phase 3: Analyze customer impact
  console.log('💼 Phase 3: Analyzing customer impact...');
  const affectedCustomers = [
    { id: 'cust-1', name: 'Enterprise Corp', mrr: 25000, churnRisk: 78, segment: 'enterprise' },
    { id: 'cust-2', name: 'Tech Startup', mrr: 12000, churnRisk: 68, segment: 'mid-market' },
    { id: 'cust-3', name: 'Analytics Co', mrr: 18000, churnRisk: 72, segment: 'enterprise' }
  ];

  const totalMRR = affectedCustomers.reduce((sum, c) => sum + c.mrr, 0);
  const avgChurnRisk = affectedCustomers.reduce((sum, c) => sum + c.churnRisk, 0) / affectedCustomers.length;

  console.log(`   Affected: ${affectedCustomers.length} customers`);
  console.log(`   At-risk MRR: $${totalMRR.toLocaleString()}`);
  console.log(`   Avg churn risk: ${avgChurnRisk.toFixed(1)}%\n`);

  // Decision point 1: Should we intervene immediately?
  const shouldIntervene = avgChurnRisk > 70 && totalMRR > 50000;

  if (shouldIntervene) {
    console.log('🚨 DECISION: Immediate intervention required\n');

    decisionEngine.recordDecision({
      action: 'immediate-intervention',
      rationale: `High churn risk (${avgChurnRisk.toFixed(1)}%) and significant MRR ($${totalMRR.toLocaleString()}) at stake`,
      confidence: 0.95,
      inputs: {
        avgChurnRisk,
        totalMRR,
        severity: regression.severity
      },
      outputs: {
        interventionType: 'automated-optimization',
        priority: 'critical'
      }
    });

    // Phase 4: Find solution pack
    console.log('🔍 Phase 4: Finding optimization pack...');
    const packs = [
      { id: 'pack-1', name: 'Dashboard Cache Pro', expectedImprovement: 0.55, rating: 4.8 },
      { id: 'pack-2', name: 'Chart Optimizer', expectedImprovement: 0.35, rating: 4.5 }
    ];

    const selectedPack = packs[0];
    console.log(`   Selected: ${selectedPack.name}`);
    console.log(`   Expected improvement: ${(selectedPack.expectedImprovement * 100).toFixed(0)}%\n`);

    // Decision point 2: Apply immediately or schedule?
    const shouldApplyImmediately = regression.severity === 'critical' && avgChurnRisk > 75;

    if (shouldApplyImmediately) {
      console.log('⚡ DECISION: Apply immediately (critical situation)\n');

      decisionEngine.recordDecision({
        action: 'apply-pack-immediately',
        rationale: 'Critical severity and extremely high churn risk require immediate action',
        confidence: 0.90,
        inputs: {
          severity: regression.severity,
          avgChurnRisk,
          packRating: selectedPack.rating
        },
        outputs: {
          packId: selectedPack.id,
          deploymentWindow: 'immediate'
        }
      });

      // Phase 1: Acquire lock and deploy
      console.log('🔒 Phase 1: Acquiring lock for deployment...');
      console.log('   Lock acquired: system-optimization');
      console.log('   Deploying pack...');
      console.log('   ✓ Pack deployed successfully\n');

    } else {
      console.log('📅 DECISION: Schedule deployment during maintenance window\n');

      decisionEngine.recordDecision({
        action: 'schedule-pack-deployment',
        rationale: 'Risk is manageable, schedule for next maintenance window',
        confidence: 0.85,
        inputs: {
          severity: regression.severity,
          avgChurnRisk
        },
        outputs: {
          packId: selectedPack.id,
          scheduledFor: 'next-maintenance-window'
        }
      });
    }

  } else {
    console.log('ℹ️  DECISION: Monitor situation, no immediate action required\n');

    decisionEngine.recordDecision({
      action: 'monitor',
      rationale: 'Churn risk and MRR impact below critical thresholds',
      confidence: 0.75,
      inputs: {
        avgChurnRisk,
        totalMRR
      },
      outputs: {
        monitoringInterval: '5m',
        alertThreshold: 75
      }
    });
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('📋 Decision Summary:');
  decisionEngine.getDecisions().forEach((decision, i) => {
    console.log(`\n   ${i + 1}. ${decision.action.toUpperCase()}`);
    console.log(`      Rationale: ${decision.rationale}`);
    console.log(`      Confidence: ${(decision.confidence * 100).toFixed(0)}%`);
  });
  console.log('\n');

  return decisionEngine;
}

// ============================================================================
// Scenario 2: Churn Risk → Performance → Pack
// ============================================================================

async function scenario2_ChurnToPerformance(phases) {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║ Scenario 2: High Churn Risk → Performance Analysis       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const decisionEngine = new DecisionEngine(phases);

  // Phase 3: Identify high-risk customer
  console.log('🚨 Phase 3: High churn risk customer identified');
  const customer = {
    id: 'cust-premium-1',
    name: 'Premium Enterprise',
    mrr: 35000,
    churnRisk: 82,
    churnReasons: ['performance-issues', 'support-tickets', 'low-usage'],
    segment: 'enterprise',
    lifetimeValue: 420000
  };

  console.log(`   Customer: ${customer.name}`);
  console.log(`   MRR: $${customer.mrr.toLocaleString()}`);
  console.log(`   LTV: $${customer.lifetimeValue.toLocaleString()}`);
  console.log(`   Churn risk: ${customer.churnRisk}% ⚠️\n`);

  // Decision point 1: What's the root cause?
  console.log('🔍 Analyzing churn reasons...');
  const primaryReason = customer.churnReasons[0];
  console.log(`   Primary reason: ${primaryReason}\n`);

  if (primaryReason === 'performance-issues') {
    // Phase 2: Investigate performance
    console.log('📊 Phase 2: Investigating performance issues...');
    const customerPerformance = {
      avgResponseTime: 6200,
      targetResponseTime: 3000,
      p95: 8900,
      p99: 12000,
      slowOperations: [
        { op: 'api-request', avg: 6200, target: 3000 },
        { op: 'dashboard-load', avg: 9500, target: 5000 },
        { op: 'export-report', avg: 15000, target: 8000 }
      ]
    };

    console.log(`   Avg response time: ${customerPerformance.avgResponseTime}ms`);
    console.log(`   Target: ${customerPerformance.targetResponseTime}ms`);
    console.log(`   Gap: ${customerPerformance.avgResponseTime - customerPerformance.targetResponseTime}ms\n`);

    console.log('   Slow operations:');
    customerPerformance.slowOperations.forEach(op => {
      const gap = op.avg - op.target;
      const pct = ((gap / op.target) * 100).toFixed(0);
      console.log(`   - ${op.op}: ${op.avg}ms (${pct}% over target)`);
    });
    console.log();

    // Decision point 2: Performance is the issue - find solution
    const performanceIsCritical = customerPerformance.avgResponseTime > 2 * customerPerformance.targetResponseTime;

    if (performanceIsCritical) {
      console.log('🎯 DECISION: Performance optimization critical for retention\n');

      decisionEngine.recordDecision({
        action: 'optimize-for-customer',
        rationale: `Performance is 2x target. Customer worth $${customer.lifetimeValue.toLocaleString()} LTV`,
        confidence: 0.92,
        inputs: {
          churnRisk: customer.churnRisk,
          ltv: customer.lifetimeValue,
          performanceGap: customerPerformance.avgResponseTime - customerPerformance.targetResponseTime
        },
        outputs: {
          approach: 'dedicated-optimization',
          priority: 'critical'
        }
      });

      // Phase 4: Find targeted solution
      console.log('🔧 Phase 4: Finding customer-specific optimization...');
      const solutions = [
        {
          type: 'pack',
          name: 'Enterprise Performance Suite',
          cost: 499,
          expectedImprovement: 0.65,
          timeToValue: '24h'
        },
        {
          type: 'infrastructure',
          name: 'Dedicated compute resources',
          cost: 2000,
          expectedImprovement: 0.75,
          timeToValue: '72h'
        },
        {
          type: 'custom',
          name: 'Custom optimization engagement',
          cost: 5000,
          expectedImprovement: 0.85,
          timeToValue: '2w'
        }
      ];

      // ROI calculation
      const potentialLoss = customer.lifetimeValue * (customer.churnRisk / 100);
      console.log(`   Potential loss if churned: $${potentialLoss.toLocaleString()}\n`);

      console.log('   Solution options:');
      solutions.forEach(sol => {
        const roi = (potentialLoss / sol.cost).toFixed(1);
        console.log(`   - ${sol.name}`);
        console.log(`     Cost: $${sol.cost}, Improvement: ${(sol.expectedImprovement * 100).toFixed(0)}%, ROI: ${roi}x`);
      });
      console.log();

      // Decision point 3: Which solution?
      const recommendedSolution = solutions.reduce((best, current) => {
        const currentROI = potentialLoss / current.cost;
        const bestROI = potentialLoss / best.cost;
        return currentROI > bestROI ? current : best;
      });

      console.log(`✨ DECISION: Deploy ${recommendedSolution.name}\n`);

      decisionEngine.recordDecision({
        action: 'deploy-solution',
        rationale: `Best ROI (${(potentialLoss / recommendedSolution.cost).toFixed(1)}x) and fastest time to value`,
        confidence: 0.88,
        inputs: {
          potentialLoss,
          solutionCost: recommendedSolution.cost,
          expectedImprovement: recommendedSolution.expectedImprovement
        },
        outputs: {
          solution: recommendedSolution.name,
          estimatedRetentionIncrease: 45  // %
        }
      });

      // Phase 1: Execute deployment
      console.log('🚀 Phase 1: Executing deployment...');
      console.log('   ✓ Lock acquired');
      console.log('   ✓ Baseline snapshot stored');
      console.log('   ✓ Solution deployed');
      console.log('   ✓ Post-deployment snapshot stored\n');

      // Expected outcome
      const expectedChurnReduction = 45;
      const newChurnRisk = customer.churnRisk - expectedChurnReduction;
      console.log('📈 Expected Outcome:');
      console.log(`   Churn risk: ${customer.churnRisk}% → ${newChurnRisk}%`);
      console.log(`   Performance: ${customerPerformance.avgResponseTime}ms → ${Math.round(customerPerformance.avgResponseTime * (1 - recommendedSolution.expectedImprovement))}ms`);
      console.log(`   Retention probability: ${100 - customer.churnRisk}% → ${100 - newChurnRisk}%\n`);
    }

  } else if (primaryReason === 'low-usage') {
    console.log('💡 DECISION: Customer needs onboarding/training\n');

    decisionEngine.recordDecision({
      action: 'customer-success-intervention',
      rationale: 'Low usage indicates lack of value realization, not technical issue',
      confidence: 0.85,
      inputs: {
        churnReason: 'low-usage',
        ltv: customer.lifetimeValue
      },
      outputs: {
        interventionType: 'dedicated-onboarding',
        assignee: 'customer-success-team'
      }
    });
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('📋 Decision Chain:');
  decisionEngine.getDecisions().forEach((decision, i) => {
    console.log(`\n   ${i + 1}. ${decision.action}`);
    console.log(`      ${decision.rationale}`);
  });
  console.log('\n');

  return decisionEngine;
}

// ============================================================================
// Scenario 3: Lock Contention → Performance → Scaling
// ============================================================================

async function scenario3_LockToScaling(phases) {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║ Scenario 3: Lock Contention → Performance → Scaling      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const decisionEngine = new DecisionEngine(phases);

  // Phase 1: Detect lock contention
  console.log('🔒 Phase 1: Lock contention detected');
  const lockStats = {
    activeLocks: 247,
    avgLockDuration: 8500,
    maxLockDuration: 45000,
    contentionCount: 89,
    deadlockCount: 2,
    topContentedResources: [
      { resource: 'workflow-state', contentionCount: 34, avgWaitTime: 12000 },
      { resource: 'job-queue', contentionCount: 28, avgWaitTime: 8500 },
      { resource: 'snapshot-store', contentionCount: 27, avgWaitTime: 9200 }
    ]
  };

  console.log(`   Active locks: ${lockStats.activeLocks}`);
  console.log(`   Avg lock duration: ${lockStats.avgLockDuration}ms`);
  console.log(`   Contention events: ${lockStats.contentionCount}`);
  console.log(`   Deadlocks: ${lockStats.deadlockCount} ⚠️\n`);

  // Phase 2: Measure performance impact
  console.log('📊 Phase 2: Analyzing performance impact...');
  const performanceImpact = {
    operationsBlocked: 156,
    avgBlockTime: 11200,
    throughputReduction: 0.34,  // 34% reduction
    affectedOperations: [
      { op: 'workflow-execution', blockedCount: 67, avgBlockTime: 13500 },
      { op: 'job-processing', blockedCount: 54, avgBlockTime: 10200 },
      { op: 'snapshot-creation', blockedCount: 35, avgBlockTime: 9800 }
    ]
  };

  console.log(`   Operations blocked: ${performanceImpact.operationsBlocked}`);
  console.log(`   Avg block time: ${performanceImpact.avgBlockTime}ms`);
  console.log(`   Throughput reduction: ${(performanceImpact.throughputReduction * 100).toFixed(0)}%\n`);

  // Decision point: Is this affecting business?
  const isBusinessImpact = performanceImpact.throughputReduction > 0.25;

  if (isBusinessImpact) {
    console.log('💼 Phase 3: Checking business impact...');
    const businessImpact = {
      affectedCustomers: 43,
      totalMRR: 287000,
      complaintsReceived: 12,
      supportTickets: 18
    };

    console.log(`   Affected customers: ${businessImpact.affectedCustomers}`);
    console.log(`   Complaints: ${businessImpact.complaintsReceived}`);
    console.log(`   Support tickets: ${businessImpact.supportTickets}\n`);

    console.log('🚨 DECISION: Scale system to handle load\n');

    decisionEngine.recordDecision({
      action: 'scale-infrastructure',
      rationale: `${(performanceImpact.throughputReduction * 100).toFixed(0)}% throughput loss affecting ${businessImpact.affectedCustomers} customers`,
      confidence: 0.93,
      inputs: {
        throughputLoss: performanceImpact.throughputReduction,
        affectedCustomers: businessImpact.affectedCustomers,
        lockContention: lockStats.contentionCount
      },
      outputs: {
        scalingType: 'horizontal',
        additionalNodes: 3
      }
    });

    // Phase 4: Find scaling pack
    console.log('🔧 Phase 4: Selecting scaling solution...');
    const scalingOptions = [
      {
        type: 'horizontal-scaling-pack',
        name: 'Horizontal Scaling Kit',
        cost: 299,
        nodes: 3,
        expectedImpact: { contention: -0.65, throughput: +0.45 }
      },
      {
        type: 'lock-optimization-pack',
        name: 'Advanced Lock Manager',
        cost: 199,
        expectedImpact: { contention: -0.50, throughput: +0.30 }
      }
    ];

    console.log('   Options:');
    scalingOptions.forEach(opt => {
      console.log(`   - ${opt.name}: $${opt.cost}`);
      console.log(`     Contention reduction: ${(opt.expectedImpact.contention * -100).toFixed(0)}%`);
      console.log(`     Throughput improvement: ${(opt.expectedImpact.throughput * 100).toFixed(0)}%`);
    });
    console.log();

    const selected = scalingOptions[0];
    console.log(`✅ DECISION: Deploy ${selected.name}\n`);

    decisionEngine.recordDecision({
      action: 'deploy-scaling-pack',
      rationale: 'Best balance of contention reduction and throughput improvement',
      confidence: 0.87,
      inputs: {
        currentContention: lockStats.contentionCount,
        currentThroughputLoss: performanceImpact.throughputReduction
      },
      outputs: {
        pack: selected.name,
        expectedContentionReduction: selected.expectedImpact.contention,
        expectedThroughputGain: selected.expectedImpact.throughput
      }
    });
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('📋 Decision Path:');
  decisionEngine.getDecisions().forEach((decision, i) => {
    console.log(`\n   ${i + 1}. ${decision.action}`);
    console.log(`      Confidence: ${(decision.confidence * 100).toFixed(0)}%`);
    console.log(`      ${decision.rationale}`);
  });
  console.log('\n');

  return decisionEngine;
}

// ============================================================================
// Scenario 4: Pack Update → Performance → Rollback
// ============================================================================

async function scenario4_PackUpdateVerification(phases) {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║ Scenario 4: Pack Update → Performance → Rollback         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const decisionEngine = new DecisionEngine(phases);

  // Phase 4: Pack update available
  console.log('📦 Phase 4: Pack update detected');
  const packUpdate = {
    id: 'pack-auth-system',
    name: 'Authentication System',
    currentVersion: '2.4.1',
    latestVersion: '3.0.0',
    breaking: true,
    changelog: ['Performance improvements', 'Security fixes', 'New OAuth providers']
  };

  console.log(`   Pack: ${packUpdate.name}`);
  console.log(`   Current: ${packUpdate.currentVersion} → Latest: ${packUpdate.latestVersion}`);
  console.log(`   Breaking: ${packUpdate.breaking ? 'Yes ⚠️' : 'No'}\n`);

  // Decision point 1: Update now or wait?
  console.log('🤔 Evaluating update decision...');

  if (packUpdate.breaking) {
    console.log('   ⚠️  Breaking changes detected - requires validation\n');

    console.log('🔬 DECISION: Update in staging first\n');

    decisionEngine.recordDecision({
      action: 'stage-update-first',
      rationale: 'Breaking changes require staging validation before production',
      confidence: 0.95,
      inputs: {
        isBreaking: packUpdate.breaking,
        currentVersion: packUpdate.currentVersion,
        targetVersion: packUpdate.latestVersion
      },
      outputs: {
        environment: 'staging',
        validationRequired: true
      }
    });

    // Phase 1: Apply to staging
    console.log('🔒 Phase 1: Acquiring lock on staging environment...');
    console.log('   ✓ Lock acquired: staging-deployment');
    console.log('   ✓ Baseline snapshot created');
    console.log('   ✓ Pack updated to v3.0.0');
    console.log('   ✓ Post-update snapshot created\n');

    // Phase 2: Monitor performance
    console.log('📊 Phase 2: Monitoring performance for 30 minutes...');
    console.log('   ⏳ Collecting metrics...\n');

    // Simulate performance data
    const performanceData = {
      before: {
        avgResponseTime: 450,
        p95: 890,
        errorRate: 0.002,
        throughput: 1250
      },
      after: {
        avgResponseTime: 520,
        p95: 1020,
        errorRate: 0.008,
        throughput: 1180
      }
    };

    console.log('   Results:');
    console.log(`   Response time: ${performanceData.before.avgResponseTime}ms → ${performanceData.after.avgResponseTime}ms (${((performanceData.after.avgResponseTime / performanceData.before.avgResponseTime - 1) * 100).toFixed(1)}%)`);
    console.log(`   Error rate: ${(performanceData.before.errorRate * 100).toFixed(2)}% → ${(performanceData.after.errorRate * 100).toFixed(2)}%`);
    console.log(`   Throughput: ${performanceData.before.throughput} → ${performanceData.after.throughput} req/s\n`);

    // Decision point 2: Performance regression detected
    const regressionDetected = performanceData.after.avgResponseTime > performanceData.before.avgResponseTime * 1.10;
    const errorRateIncreased = performanceData.after.errorRate > performanceData.before.errorRate * 2;

    if (regressionDetected || errorRateIncreased) {
      console.log('❌ DECISION: Rollback update (performance regression)\n');

      decisionEngine.recordDecision({
        action: 'rollback-update',
        rationale: 'Performance regression and elevated error rate unacceptable',
        confidence: 0.98,
        inputs: {
          responseTimeIncrease: ((performanceData.after.avgResponseTime / performanceData.before.avgResponseTime - 1) * 100).toFixed(1),
          errorRateIncrease: ((performanceData.after.errorRate / performanceData.before.errorRate - 1) * 100).toFixed(1)
        },
        outputs: {
          action: 'rollback-to-snapshot',
          version: packUpdate.currentVersion,
          reportIssue: true
        }
      });

      console.log('🔄 Phase 1: Rolling back to baseline snapshot...');
      console.log('   ✓ Snapshot restored');
      console.log('   ✓ Pack reverted to v2.4.1');
      console.log('   ✓ Lock released\n');

      // Phase 4: Report issue
      console.log('📝 Phase 4: Reporting issue to pack maintainer...');
      console.log('   Issue created with performance data');
      console.log('   Recommendation: Wait for v3.0.1 patch\n');

    } else {
      console.log('✅ DECISION: Proceed with production update\n');

      decisionEngine.recordDecision({
        action: 'proceed-to-production',
        rationale: 'Staging validation passed, performance acceptable',
        confidence: 0.90,
        inputs: {
          stagingSuccess: true,
          performanceAcceptable: true
        },
        outputs: {
          environment: 'production',
          scheduledWindow: 'next-maintenance'
        }
      });
    }
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('📋 Update Decision Process:');
  decisionEngine.getDecisions().forEach((decision, i) => {
    console.log(`\n   ${i + 1}. ${decision.action}`);
    console.log(`      ${decision.rationale}`);
    if (decision.outputs) {
      console.log(`      Outputs:`, JSON.stringify(decision.outputs, null, 10).replace(/\n/g, '\n      '));
    }
  });
  console.log('\n');

  return decisionEngine;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const scenario = process.argv[2] || 'all';

  const scenarios = {
    '1': scenario1_PerformanceToCustomer,
    '2': scenario2_ChurnToPerformance,
    '3': scenario3_LockToScaling,
    '4': scenario4_PackUpdateVerification
  };

  if (scenario === 'all') {
    await scenario1_PerformanceToCustomer({});
    await scenario2_ChurnToPerformance({});
    await scenario3_LockToScaling({});
    await scenario4_PackUpdateVerification({});
  } else if (scenarios[scenario]) {
    await scenarios[scenario]({});
  } else {
    console.log('\nUsage: node phase-decision-making.mjs [scenario]\n');
    console.log('Scenarios:');
    console.log('  1 - Performance → Customer → Intervention');
    console.log('  2 - Churn Risk → Performance → Pack');
    console.log('  3 - Lock Contention → Performance → Scaling');
    console.log('  4 - Pack Update → Performance → Rollback');
    console.log('  all - Run all scenarios\n');
  }
}

main().catch(console.error);
