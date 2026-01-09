# GitVan Phases 1-4 Integration Guide

**Version:** 1.0.0
**Last Updated:** January 9, 2026
**Scope:** Complete cross-phase integration patterns and workflows

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Phase Overview](#phase-overview)
3. [Data Flow Architecture](#data-flow-architecture)
4. [Cross-Phase Integration Patterns](#cross-phase-integration-patterns)
5. [SPARQL Federation Across Phases](#sparql-federation-across-phases)
6. [Complete Workflow Examples](#complete-workflow-examples)
7. [Cross-Phase Queries](#cross-phase-queries)
8. [Real-World Scenarios](#real-world-scenarios)
9. [Best Practices](#best-practices)
10. [Performance Considerations](#performance-considerations)

---

## Executive Summary

GitVan's RDF migration consists of **4 interconnected phases** that form a complete semantic data platform:

| Phase | Focus | Primary Benefit | Integration Points |
|-------|-------|-----------------|-------------------|
| **Phase 1** | Git-Native I/O | Deadlock prevention, provenance | Feeds Phase 2 with operation metrics |
| **Phase 2** | Performance Monitoring | Anomaly detection, regression tracking | Informs Phase 3 about system health |
| **Phase 3** | RevOps Analytics | Churn prediction, expansion opportunities | Correlates with Phase 2 performance |
| **Phase 4** | Pack System | Federated discovery, compatibility | Optimizes Phase 1-3 based on usage |

**Key Insight**: These phases form a **closed feedback loop** where insights from one phase inform decisions in others.

**Total Lines of Code Affected**: ~60,000 LOC across 4 phases
**Expected Integration Time**: 12-16 weeks
**ROI**: 10x faster insights, automated optimization, semantic reasoning

---

## Phase Overview

### Phase 1: Git-Native I/O (Foundation Layer)

**Purpose**: Semantic state management for locks, snapshots, and queues

**RDF Components**:
- `RDFLockManager` - Distributed locking with deadlock detection
- `RDFSnapshotStore` - Snapshot storage with PROV-O provenance
- `RDFQueueManager` - Job queue with dependency resolution

**Ontology**: `https://gitvan.dev/lock#`, `https://gitvan.dev/snapshot#`, `https://gitvan.dev/queue#`

**Key Queries**:
```sparql
# Detect deadlocks
ASK WHERE {
  ?lock1 lock:blockedBy ?lock2 .
  ?lock2 lock:blockedBy+ ?lock1 .
}

# Snapshot lineage
SELECT ?snapshot ?timestamp WHERE {
  ?snapshot snap:key "workflow-state" ;
           snap:previousSnapshot* ?root ;
           snap:timestamp ?timestamp .
}
ORDER BY ?timestamp
```

---

### Phase 2: Performance Monitoring (Analytics Layer)

**Purpose**: Track operation metrics, detect anomalies, prevent regressions

**RDF Components**:
- `PerformanceMeasurement` - Individual operation metrics
- `PerformanceBudget` - SLO constraints
- `PerformanceAnomaly` - Detected anomalies

**Ontology**: `https://gitvan.dev/performance#`

**Key Queries**:
```sparql
# Find slow operations
SELECT ?operation (AVG(?duration) AS ?avgDuration) WHERE {
  ?m perf:operation ?operation ;
     perf:duration ?duration ;
     perf:timestamp ?timestamp .
  FILTER(?timestamp >= NOW() - 86400000)  # Last 24h
}
GROUP BY ?operation
HAVING(?avgDuration > 5000)  # > 5 seconds
```

---

### Phase 3: RevOps Analytics (Business Intelligence Layer)

**Purpose**: Customer analytics, churn prediction, expansion opportunities

**RDF Components**:
- `Customer` - Customer entity with usage patterns
- `ExpansionEvent` - Upsell/expansion tracking
- `ChurnRisk` - Predictive churn scoring

**Ontology**: `https://gitvan.dev/revops#`

**Key Queries**:
```sparql
# High-risk customers
SELECT ?customer ?churnScore ?recommendation WHERE {
  ?customer a revops:Customer ;
           revops:churnRisk ?churnScore ;
           revops:lastPaymentFailed ?paymentFailed ;
           revops:featureUsagePercent ?usage .
  FILTER(?churnScore > 60)
  BIND(
    IF(?paymentFailed, "payment-intervention",
    IF(?usage < 20, "feature-training", "check-in"))
    AS ?recommendation
  )
}
ORDER BY DESC(?churnScore)
```

---

### Phase 4: Pack System (Extension Layer)

**Purpose**: Federated pack registry, semantic compatibility, marketplace

**RDF Components**:
- `Pack` - Pack metadata and dependencies
- `PackCompatibility` - Version compatibility matrix
- `PackRating` - Community ratings and reviews

**Ontology**: `https://gitvan.dev/pack#`

**Key Queries**:
```sparql
# Find compatible packs for use case
SELECT ?pack ?rating WHERE {
  ?pack a pack:Pack ;
       pack:category "caching" ;
       pack:compatibleWith "gitvan-3.x" ;
       pack:rating ?rating .
  FILTER(?rating > 4.0)
}
ORDER BY DESC(?rating)
```

---

## Data Flow Architecture

### Complete System Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      User Action / Git Event                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Git-Native I/O                                      │
│ ┌─────────────┐  ┌──────────────┐  ┌──────────────┐        │
│ │ Lock Acquire│─▶│ Store Snapshot│─▶│ Queue Job    │        │
│ └─────────────┘  └──────────────┘  └──────────────┘        │
│                                                               │
│ Output: Lock events, Snapshot lineage, Job dependencies     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ (operation execution)
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: Performance Monitoring                              │
│ ┌──────────────┐  ┌───────────────┐  ┌──────────────┐      │
│ │ Track Metrics│─▶│ Detect Anomaly│─▶│ Check Budget │      │
│ └──────────────┘  └───────────────┘  └──────────────┘      │
│                                                               │
│ Output: Performance measurements, Anomalies, Regressions    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ (business impact analysis)
┌─────────────────────────────────────────────────────────────┐
│ Phase 3: RevOps Analytics                                    │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│ │ Customer Data│─▶│ Churn Risk   │─▶│ Expansion    │       │
│ └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│ Output: Churn predictions, Expansion opportunities, LTV     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ (optimization decisions)
┌─────────────────────────────────────────────────────────────┐
│ Phase 4: Pack System                                         │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│ │ Find Packs   │─▶│ Check Compat.│─▶│ Apply Pack   │       │
│ └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│ Output: Pack recommendations, Compatibility matrix          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ (feedback loop)
                  Back to Phase 1 (improved system)
```

---

## Cross-Phase Integration Patterns

### Pattern 1: Performance Impact on Business

**Flow**: Phase 2 → Phase 3

**Scenario**: Performance regression affects customer satisfaction

```javascript
// Phase 2: Detect performance regression
const regression = await performanceMonitor.detectRegression({
  operation: 'api-request',
  threshold: 0.15  // 15% slowdown
});

if (regression.severity === 'critical') {
  // Phase 3: Find affected customers
  const affectedCustomers = await sparql.query(`
    SELECT ?customer ?mrr ?churnRisk WHERE {
      # Link performance to customer usage
      ?customer revops:usesFeatures ?feature .
      ?feature perf:operation <${regression.operation}> .

      # Get business impact
      ?customer revops:monthlyRecurringRevenue ?mrr ;
               revops:churnRisk ?churnRisk .

      # Filter high-value, high-risk
      FILTER(?mrr > 5000 && ?churnRisk > 50)
    }
    ORDER BY DESC(?mrr)
  `);

  console.log(`⚠ ${affectedCustomers.length} high-value customers at risk`);
  console.log(`💰 Total MRR at risk: $${affectedCustomers.reduce((sum, c) => sum + c.mrr, 0)}`);
}
```

**SPARQL Federation Query**:
```sparql
SELECT ?customer ?operation ?duration ?churnRisk WHERE {
  # Phase 2: Performance data
  SERVICE <local:performance> {
    ?measurement perf:operation ?operation ;
                 perf:duration ?duration ;
                 perf:timestamp ?timestamp .
    FILTER(?duration > 10000)  # Slow operations
  }

  # Phase 3: Customer impact
  SERVICE <local:revops> {
    ?customer revops:usesFeatures ?operation ;
             revops:churnRisk ?churnRisk .
  }

  FILTER(?churnRisk > 60)
}
```

---

### Pattern 2: Customer Feedback Drives Optimization

**Flow**: Phase 3 → Phase 4 → Phase 1

**Scenario**: High churn risk → Find optimization pack → Apply to system

```javascript
// Phase 3: Identify churn drivers
const churnDrivers = await revopsAnalytics.findChurnDrivers();
// Result: { reason: 'slow-dashboard', affectedCustomers: 23, totalMRR: 115000 }

// Phase 4: Find solution packs
const optimizationPacks = await packRegistry.findOptimizationPacks({
  problem: 'slow-dashboard',
  compatibleWith: 'gitvan-3.x',
  minRating: 4.0
});

// Apply top-rated pack
const selectedPack = optimizationPacks[0];
await packRegistry.applyPack(selectedPack.id);

// Phase 1: Track deployment with lock
const lock = await lockManager.acquireLock('pack-deployment', {
  timeout: 300000,
  priority: 100
});

try {
  // Deploy pack
  await deployPack(selectedPack);

  // Phase 1: Store snapshot before/after
  const afterSnapshot = await snapshotStore.store('system-state', {
    packVersion: selectedPack.version,
    deployedAt: new Date().toISOString()
  }, {
    description: `Deployed ${selectedPack.name} to address dashboard performance`,
    tags: ['optimization', 'churn-prevention', 'dashboard']
  });
} finally {
  await lockManager.releaseLock('pack-deployment');
}
```

**SPARQL Query Linking Phases**:
```sparql
SELECT ?pack ?expectedImprovement ?affectedRevenue WHERE {
  # Phase 3: Churn driver
  ?customer revops:churnRisk ?risk ;
           revops:churnReason "slow-dashboard" ;
           revops:monthlyRecurringRevenue ?mrr .

  # Phase 4: Solution pack
  ?pack pack:solves "slow-dashboard" ;
       pack:expectedImprovement ?improvement ;
       pack:rating ?rating .

  # Calculate impact
  BIND(?improvement * ?mrr AS ?revenueRecovery)
  BIND(SUM(?revenueRecovery) AS ?affectedRevenue)

  FILTER(?rating > 4.0)
}
GROUP BY ?pack ?expectedImprovement
ORDER BY DESC(?affectedRevenue)
```

---

### Pattern 3: Lock Contention Affects Performance

**Flow**: Phase 1 → Phase 2

**Scenario**: Deadlocks and long locks cause performance issues

```javascript
// Phase 1: Detect lock contention
const longLocks = await lockManager.getAbnormallyLongLocks(60000);  // > 1 minute

if (longLocks.length > 0) {
  // Phase 2: Record as performance anomaly
  for (const lock of longLocks) {
    await performanceMonitor.recordAnomaly({
      type: 'lock-contention',
      resource: lock.resourceId,
      duration: lock.duration,
      severity: lock.duration > 300000 ? 'critical' : 'high',
      timestamp: new Date().toISOString()
    });
  }

  // Correlate with operations
  const affectedOps = await sparql.query(`
    SELECT ?operation (COUNT(?op) AS ?blockedCount) WHERE {
      # Phase 1: Long locks
      ?lock a lock:Lock ;
           lock:resourceId ?resource ;
           lock:duration ?duration .
      FILTER(?duration > 60000)

      # Phase 2: Operations waiting on this resource
      ?measurement perf:operation ?operation ;
                  perf:blockedBy ?resource .
    }
    GROUP BY ?operation
    ORDER BY DESC(?blockedCount)
  `);

  console.log('Operations affected by lock contention:', affectedOps);
}
```

---

### Pattern 4: Pack Usage Analytics

**Flow**: Phase 4 → Phase 3 → Phase 2

**Scenario**: Track which packs drive customer success

```javascript
// Phase 4: Get pack usage by customer
const packUsage = await sparql.query(`
  SELECT ?pack ?customer ?rating WHERE {
    # Phase 4: Pack installation
    ?installation pack:pack ?pack ;
                 pack:customer ?customer ;
                 pack:installedAt ?installDate .

    # Phase 3: Customer satisfaction
    ?customer revops:satisfaction ?rating ;
             revops:expansionEvent ?expansion .
    ?expansion revops:timestamp ?expansionDate .

    # Expansion happened after pack installation
    FILTER(?expansionDate > ?installDate)
  }
`);

// Correlate with performance improvements
const packPerformanceImpact = await sparql.query(`
  SELECT ?pack (AVG(?durationBefore) - AVG(?durationAfter) AS ?improvement) WHERE {
    # Phase 4: Pack deployment
    ?deployment pack:pack ?pack ;
               pack:deployedAt ?deployTime .

    # Phase 2: Performance before
    ?before perf:operation ?op ;
           perf:duration ?durationBefore ;
           perf:timestamp ?timeBefore .
    FILTER(?timeBefore < ?deployTime)

    # Phase 2: Performance after
    ?after perf:operation ?op ;
          perf:duration ?durationAfter ;
          perf:timestamp ?timeAfter .
    FILTER(?timeAfter > ?deployTime)
  }
  GROUP BY ?pack
  ORDER BY DESC(?improvement)
`);

console.log('Pack performance impact:', packPerformanceImpact);
```

---

## SPARQL Federation Across Phases

### Federated Query Example: Complete System Health

**Query**: Link all phases to understand system-wide health

```sparql
PREFIX lock: <https://gitvan.dev/lock#>
PREFIX perf: <https://gitvan.dev/performance#>
PREFIX revops: <https://gitvan.dev/revops#>
PREFIX pack: <https://gitvan.dev/pack#>

SELECT ?metric ?value ?status WHERE {
  # Phase 1: Lock health
  {
    SELECT (COUNT(?lock) AS ?activeLocks) WHERE {
      SERVICE <local:locks> {
        ?lock a lock:Lock ;
             lock:state lock:Active .
      }
    }
    BIND("active-locks" AS ?metric)
    BIND(?activeLocks AS ?value)
    BIND(IF(?activeLocks > 100, "warning", "healthy") AS ?status)
  }
  UNION
  # Phase 2: Performance health
  {
    SELECT (AVG(?duration) AS ?avgResponseTime) WHERE {
      SERVICE <local:performance> {
        ?m perf:operation "api-request" ;
           perf:duration ?duration ;
           perf:timestamp ?t .
        FILTER(?t >= NOW() - 3600000)  # Last hour
      }
    }
    BIND("avg-response-time" AS ?metric)
    BIND(?avgResponseTime AS ?value)
    BIND(IF(?avgResponseTime > 5000, "critical", "healthy") AS ?status)
  }
  UNION
  # Phase 3: Business health
  {
    SELECT (AVG(?churnRisk) AS ?avgChurnRisk) WHERE {
      SERVICE <local:revops> {
        ?customer a revops:Customer ;
                 revops:churnRisk ?churnRisk .
      }
    }
    BIND("avg-churn-risk" AS ?metric)
    BIND(?avgChurnRisk AS ?value)
    BIND(IF(?avgChurnRisk > 50, "warning", "healthy") AS ?status)
  }
  UNION
  # Phase 4: Pack health
  {
    SELECT (COUNT(?outdated) AS ?outdatedPacks) WHERE {
      SERVICE <local:packs> {
        ?pack pack:currentVersion ?current ;
             pack:latestVersion ?latest .
        FILTER(?current != ?latest)
        BIND(?pack AS ?outdated)
      }
    }
    BIND("outdated-packs" AS ?metric)
    BIND(?outdatedPacks AS ?value)
    BIND(IF(?outdatedPacks > 5, "warning", "healthy") AS ?status)
  }
}
```

---

### Federated Query: Root Cause Analysis

**Scenario**: System slowdown → trace to root cause across all phases

```sparql
SELECT ?rootCause ?evidence ?impact WHERE {
  # Phase 2: Detect slowdown
  {
    ?anomaly a perf:Anomaly ;
            perf:operation ?op ;
            perf:severity "critical" .

    # Phase 1: Check for lock contention
    OPTIONAL {
      SERVICE <local:locks> {
        ?lock lock:resourceId ?resource ;
             lock:duration ?lockDuration .
        ?op perf:blockedBy ?resource .
        FILTER(?lockDuration > 60000)
      }
      BIND("lock-contention" AS ?rootCause)
      BIND(?lockDuration AS ?evidence)
    }

    # Phase 4: Check for incompatible pack
    OPTIONAL {
      SERVICE <local:packs> {
        ?pack pack:affects ?op ;
             pack:knownIssue ?issue .
      }
      BIND("incompatible-pack" AS ?rootCause)
      BIND(?issue AS ?evidence)
    }

    # Phase 3: Calculate business impact
    SERVICE <local:revops> {
      ?customer revops:usesFeatures ?op ;
               revops:monthlyRecurringRevenue ?mrr .
      BIND(SUM(?mrr) AS ?impact)
    }
  }
}
```

---

## Complete Workflow Examples

### Workflow 1: Optimize Slow System

**Steps**: Detect → Analyze → Optimize → Verify

```javascript
import { RDFLockManager } from 'gitvan/git-native/RDFLockManager';
import { RDFSnapshotStore } from 'gitvan/git-native/RDFSnapshotStore';
import { PerformanceMonitor } from 'gitvan/performance/PerformanceMonitor';
import { RevOpsAnalytics } from 'gitvan/revops/RevOpsAnalytics';
import { PackRegistry } from 'gitvan/pack/PackRegistry';

async function optimizeSlowSystem() {
  // ===== Phase 2: Detect Performance Issue =====
  const regression = await performanceMonitor.detectRegression({
    threshold: 0.15,  // 15% slowdown
    window: 86400000  // Last 24 hours
  });

  if (!regression) {
    console.log('✓ No regressions detected');
    return;
  }

  console.log(`⚠ Regression detected: ${regression.operation} (+${regression.percentChange}%)`);

  // ===== Phase 3: Analyze Business Impact =====
  const businessImpact = await revopsAnalytics.analyzePerformanceImpact(regression);
  console.log(`💰 At-risk revenue: $${businessImpact.totalMRR}`);
  console.log(`👥 Affected customers: ${businessImpact.customerCount}`);

  // ===== Phase 4: Find Optimization Packs =====
  const optimizationPacks = await packRegistry.suggestOptimizationPacks({
    problem: regression.rootCause,
    compatibleWith: 'gitvan-3.x',
    minRating: 4.0
  });

  if (optimizationPacks.length === 0) {
    console.log('❌ No optimization packs available');
    return;
  }

  const selectedPack = optimizationPacks[0];
  console.log(`🎯 Selected pack: ${selectedPack.name} (rating: ${selectedPack.rating})`);

  // ===== Phase 1: Acquire Lock and Store Baseline =====
  const lockManager = new RDFLockManager({ cwd: process.cwd() });
  const snapshotStore = new RDFSnapshotStore({ cwd: process.cwd() });

  await lockManager.initialize(knowledgeSubstrate);
  await snapshotStore.initialize(knowledgeSubstrate);

  const lock = await lockManager.acquireLock('system-optimization', {
    timeout: 600000,  // 10 minutes
    priority: 100
  });

  console.log('🔒 Lock acquired');

  try {
    // Store baseline snapshot
    const baselineSnapshot = await snapshotStore.store('system-state', {
      operation: regression.operation,
      avgDuration: regression.currentAverage,
      timestamp: new Date().toISOString()
    }, {
      description: 'Baseline before optimization',
      tags: ['baseline', 'optimization', regression.operation]
    });

    // ===== Phase 4: Apply Pack =====
    console.log('🚀 Applying optimization pack...');
    await packRegistry.applyPack(selectedPack.id);

    // Wait for changes to take effect
    await new Promise(resolve => setTimeout(resolve, 30000));  // 30 seconds

    // ===== Phase 2: Verify Improvement =====
    const afterMetrics = await performanceMonitor.getRecentMetrics(regression.operation);
    const improvement = ((regression.currentAverage - afterMetrics.avgDuration) / regression.currentAverage) * 100;

    console.log(`📊 Improvement: ${improvement.toFixed(1)}%`);

    // ===== Phase 1: Store After Snapshot =====
    const afterSnapshot = await snapshotStore.store('system-state', {
      operation: regression.operation,
      avgDuration: afterMetrics.avgDuration,
      packApplied: selectedPack.name,
      timestamp: new Date().toISOString()
    }, {
      description: `After applying ${selectedPack.name}`,
      tags: ['optimized', selectedPack.name, regression.operation],
      previousSnapshot: baselineSnapshot.id
    });

    // ===== Phase 3: Update Customer Status =====
    if (improvement > 10) {
      await revopsAnalytics.recordSuccessfulOptimization({
        affectedCustomers: businessImpact.customerIds,
        performanceImprovement: improvement,
        packUsed: selectedPack.name
      });

      console.log('✅ Optimization successful - customer risk reduced');
    } else {
      console.log('⚠ Minimal improvement - consider alternative packs');
    }

  } finally {
    await lockManager.releaseLock('system-optimization');
    console.log('🔓 Lock released');
  }
}

// Run optimization
optimizeSlowSystem().catch(console.error);
```

---

### Workflow 2: Prevent Customer Churn

**Steps**: Predict → Diagnose → Intervene → Track

```javascript
async function preventChurn() {
  // ===== Phase 3: Identify High-Risk Customers =====
  const highRiskCustomers = await revopsAnalytics.predictChurnRisk({
    threshold: 60,
    segment: 'enterprise'  // Focus on high-value
  });

  console.log(`🚨 ${highRiskCustomers.length} high-risk enterprise customers`);

  for (const customer of highRiskCustomers) {
    console.log(`\nAnalyzing customer: ${customer.name}`);

    // ===== Phase 2: Check Performance Issues =====
    const perfIssues = await performanceMonitor.getCustomerPerformanceIssues(customer.id);

    if (perfIssues.length > 0) {
      console.log(`  ⚠ ${perfIssues.length} performance issues detected`);

      // ===== Phase 4: Find Relevant Packs =====
      const recommendedPacks = await packRegistry.findPacksForCustomer({
        customerId: customer.id,
        solves: perfIssues.map(i => i.type),
        compatibleWith: customer.gitvanVersion
      });

      console.log(`  💡 Recommended ${recommendedPacks.length} optimization packs`);

      // ===== Phase 1: Track Intervention =====
      await snapshotStore.store(`customer-intervention-${customer.id}`, {
        customerId: customer.id,
        churnRisk: customer.churnRisk,
        performanceIssues: perfIssues,
        recommendedPacks: recommendedPacks.map(p => p.name),
        timestamp: new Date().toISOString()
      }, {
        description: `Churn prevention intervention for ${customer.name}`,
        tags: ['churn-prevention', 'intervention', customer.segment],
        activity: 'automated-customer-success'
      });

    } else if (customer.featureUsagePercent < 20) {
      console.log(`  📚 Low feature adoption (${customer.featureUsagePercent}%)`);
      // Recommend training/onboarding

    } else if (customer.lastPaymentFailed) {
      console.log(`  💳 Payment issue detected`);
      // Flag for billing intervention
    }
  }
}

preventChurn().catch(console.error);
```

---

## Cross-Phase Queries

### Query 1: Pack ROI Analysis

**Question**: Which packs deliver the best performance improvement per dollar?

```sparql
PREFIX pack: <https://gitvan.dev/pack#>
PREFIX perf: <https://gitvan.dev/performance#>
PREFIX revops: <https://gitvan.dev/revops#>

SELECT ?pack ?packCost ?avgImprovement ?roi WHERE {
  # Phase 4: Pack cost
  ?pack a pack:Pack ;
       pack:price ?packCost ;
       pack:name ?packName .

  # Phase 2: Performance improvement
  {
    SELECT ?pack (AVG(?improvement) AS ?avgImprovement) WHERE {
      ?deployment pack:pack ?pack ;
                 pack:deployedAt ?deployTime .

      ?before perf:timestamp ?timeBefore ;
             perf:duration ?durationBefore .
      ?after perf:timestamp ?timeAfter ;
            perf:duration ?durationAfter .

      FILTER(?timeBefore < ?deployTime && ?timeAfter > ?deployTime)
      BIND((?durationBefore - ?durationAfter) / ?durationBefore AS ?improvement)
    }
    GROUP BY ?pack
  }

  # Calculate ROI
  BIND(?avgImprovement / ?packCost AS ?roi)
}
ORDER BY DESC(?roi)
LIMIT 10
```

---

### Query 2: Customer Journey with System Performance

**Question**: How does system performance correlate with customer lifecycle?

```sparql
SELECT ?customer ?stage ?avgPerformance ?churnRisk WHERE {
  # Phase 3: Customer lifecycle stage
  ?customer a revops:Customer ;
           revops:lifestyleStage ?stage ;
           revops:churnRisk ?churnRisk ;
           revops:signupDate ?signupDate .

  # Phase 2: Average performance for customer's usage
  {
    SELECT ?customer (AVG(?duration) AS ?avgPerformance) WHERE {
      ?customer revops:usesFeatures ?feature .
      ?measurement perf:operation ?feature ;
                  perf:duration ?duration .
    }
    GROUP BY ?customer
  }

  # Correlation: Fast system = Lower churn
  FILTER(?avgPerformance > 0)
}
ORDER BY ?stage ?churnRisk
```

---

### Query 3: Lock Bottleneck Impact on Revenue

**Question**: Which lock contentions affect the most revenue?

```sparql
SELECT ?resource ?lockCount (SUM(?mrr) AS ?affectedRevenue) WHERE {
  # Phase 1: Lock contention
  ?lock a lock:Lock ;
       lock:resourceId ?resource ;
       lock:duration ?duration .
  FILTER(?duration > 60000)  # Long locks

  # Phase 2: Operations blocked
  ?measurement perf:blockedBy ?resource ;
              perf:operation ?operation .

  # Phase 3: Customers affected
  ?customer revops:usesFeatures ?operation ;
           revops:monthlyRecurringRevenue ?mrr .

  BIND(COUNT(?lock) AS ?lockCount)
}
GROUP BY ?resource
ORDER BY DESC(?affectedRevenue)
```

---

## Real-World Scenarios

### Scenario 1: Post-Deployment Validation

**Context**: New pack deployed, validate no negative impact

```javascript
async function validateDeployment(packId) {
  // Phase 1: Get deployment snapshot
  const deploymentSnapshot = await snapshotStore.retrieve(`pack-deployment-${packId}`);
  const deployTime = new Date(deploymentSnapshot.content.deployedAt);

  // Phase 2: Compare performance before/after
  const performanceImpact = await sparql.query(`
    SELECT ?operation
           (AVG(?durationBefore) AS ?avgBefore)
           (AVG(?durationAfter) AS ?avgAfter)
           ((AVG(?durationAfter) - AVG(?durationBefore)) / AVG(?durationBefore) * 100 AS ?change)
    WHERE {
      # Before deployment
      ?before perf:timestamp ?timeBefore ;
             perf:operation ?operation ;
             perf:duration ?durationBefore .
      FILTER(?timeBefore < "${deployTime.toISOString()}"^^xsd:dateTime)
      FILTER(?timeBefore > "${new Date(deployTime - 86400000).toISOString()}"^^xsd:dateTime)

      # After deployment
      ?after perf:timestamp ?timeAfter ;
            perf:operation ?operation ;
            perf:duration ?durationAfter .
      FILTER(?timeAfter > "${deployTime.toISOString()}"^^xsd:dateTime)
      FILTER(?timeAfter < "${new Date(deployTime.getTime() + 86400000).toISOString()}"^^xsd:dateTime)
    }
    GROUP BY ?operation
    HAVING(ABS(?change) > 5)  # > 5% change
    ORDER BY DESC(ABS(?change))
  `);

  // Phase 3: Check customer impact
  if (performanceImpact.some(op => op.change > 15)) {
    // Significant slowdown
    const affectedCustomers = await revopsAnalytics.findCustomersUsingOperations(
      performanceImpact.filter(op => op.change > 15).map(op => op.operation)
    );

    console.log(`⚠ WARNING: ${affectedCustomers.length} customers affected by slowdown`);
    console.log('Consider rollback or mitigation');

    // Phase 1: Store validation failure
    await snapshotStore.store(`validation-failure-${packId}`, {
      packId,
      performanceImpact,
      affectedCustomers: affectedCustomers.map(c => c.id),
      recommendation: 'rollback',
      timestamp: new Date().toISOString()
    }, {
      description: `Deployment validation failed for ${packId}`,
      tags: ['validation', 'failure', 'rollback-candidate']
    });

    return { valid: false, reason: 'performance-regression', affectedCustomers };
  }

  console.log('✅ Deployment validated - no negative impact');
  return { valid: true };
}
```

---

### Scenario 2: Capacity Planning

**Context**: Predict when system will hit capacity limits

```javascript
async function capacityPlanning() {
  // Phase 1: Analyze lock usage trend
  const lockTrend = await sparql.query(`
    SELECT (COUNT(?lock) AS ?lockCount) ?timestamp WHERE {
      ?lock a lock:Lock ;
           lock:acquiredAt ?timestamp .
    }
    GROUP BY (FLOOR(?timestamp / 3600000) AS ?hour)  # Hourly
    ORDER BY ?hour
  `);

  // Phase 2: Analyze performance trend
  const perfTrend = await performanceMonitor.getTrend({
    metric: 'duration',
    operation: 'api-request',
    window: 7 * 86400000  // 7 days
  });

  // Phase 3: Correlate with customer growth
  const customerGrowth = await revopsAnalytics.getGrowthRate({
    period: '30d'
  });

  // Simple linear projection
  const currentLockRate = lockTrend[lockTrend.length - 1].lockCount;
  const growthRate = customerGrowth.rate;
  const capacityLimit = 10000;  // Max concurrent locks

  const daysToCapacity = Math.floor(
    (capacityLimit - currentLockRate) / (currentLockRate * growthRate / 30)
  );

  console.log(`📊 Capacity Projection:`);
  console.log(`  Current lock rate: ${currentLockRate}/hour`);
  console.log(`  Customer growth: ${(growthRate * 100).toFixed(1)}%/month`);
  console.log(`  Days to capacity: ${daysToCapacity}`);

  if (daysToCapacity < 90) {
    // Phase 4: Find scaling packs
    const scalingPacks = await packRegistry.findPacksByCategory('scaling');
    console.log(`\n💡 Recommended scaling packs:`);
    scalingPacks.forEach(pack => {
      console.log(`  - ${pack.name}: ${pack.description}`);
    });
  }
}
```

---

## Best Practices

### 1. Always Use Transactions Across Phases

```javascript
// Good: Atomic update across phases
await knowledgeSubstrate.transaction(async (tx) => {
  // Phase 1: Update lock
  await tx.update(lockTriples);

  // Phase 2: Record performance
  await tx.update(performanceTriples);

  // Phase 3: Update customer state
  await tx.update(customerTriples);
});

// Bad: Separate updates (can be inconsistent)
await updateLock();
await recordPerformance();
await updateCustomer();
```

---

### 2. Cache Expensive Federated Queries

```javascript
const queryCache = new Map();

async function cachedFederatedQuery(query, cacheKey, ttl = 300000) {
  const cached = queryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.result;
  }

  const result = await sparql.federatedQuery(query);
  queryCache.set(cacheKey, {
    result,
    timestamp: Date.now()
  });

  return result;
}
```

---

### 3. Use SPARQL Views for Common Patterns

```javascript
// Define reusable view
const views = {
  highRiskCustomers: `
    SELECT ?customer ?churnRisk ?mrr WHERE {
      ?customer a revops:Customer ;
               revops:churnRisk ?churnRisk ;
               revops:monthlyRecurringRevenue ?mrr .
      FILTER(?churnRisk > 60)
    }
    ORDER BY DESC(?mrr)
  `
};

// Use view in federated query
const result = await sparql.query(`
  SELECT ?customer ?perfIssue WHERE {
    # Reuse view
    ${views.highRiskCustomers}

    # Join with performance
    SERVICE <local:performance> {
      ?issue perf:affectsCustomer ?customer ;
            perf:severity "critical" .
      BIND(?issue AS ?perfIssue)
    }
  }
`);
```

---

### 4. Monitor Cross-Phase Query Performance

```javascript
async function monitoredQuery(query, phase1, phase2) {
  const startTime = Date.now();

  try {
    const result = await sparql.federatedQuery(query);
    const duration = Date.now() - startTime;

    await performanceMonitor.recordMeasurement({
      operation: `cross-phase-query:${phase1}-${phase2}`,
      duration,
      timestamp: new Date().toISOString()
    });

    if (duration > 5000) {
      console.warn(`Slow cross-phase query: ${duration}ms`);
    }

    return result;
  } catch (error) {
    console.error(`Cross-phase query failed:`, error);
    throw error;
  }
}
```

---

## Performance Considerations

### Query Optimization

| Pattern | Bad ❌ | Good ✅ |
|---------|--------|---------|
| **Filtering** | Filter after GROUP BY | Filter before GROUP BY |
| **Joins** | Cartesian product | Use FILTER with common variables |
| **Limits** | No LIMIT | Add LIMIT to federated queries |
| **Caching** | Query every time | Cache stable data |

### Example: Optimized Cross-Phase Query

```sparql
# Optimized version
SELECT ?customer ?pack WHERE {
  # Phase 3: Filter customers first (reduces join size)
  ?customer a revops:Customer ;
           revops:churnRisk ?risk .
  FILTER(?risk > 60)  # Filter EARLY

  # Phase 4: Only query packs for high-risk customers
  SERVICE <local:packs> {
    ?pack pack:category "retention" .
  }
}
LIMIT 100  # Prevent unbounded results

# vs. Unoptimized version (BAD)
SELECT ?customer ?pack WHERE {
  ?customer a revops:Customer ;
           revops:churnRisk ?risk .

  SERVICE <local:packs> {
    ?pack pack:category "retention" .
  }

  FILTER(?risk > 60)  # Filter LATE (after expensive join)
}
# No LIMIT (unbounded)
```

---

## Conclusion

Cross-phase integration is GitVan's superpower:

- **Phase 1** provides the foundation (locks, snapshots, queues)
- **Phase 2** adds intelligence (performance tracking, anomaly detection)
- **Phase 3** adds business context (customer success, revenue impact)
- **Phase 4** enables ecosystem (packs, marketplace, community)

**Key Takeaways**:
1. Use SPARQL federation to query across phases
2. Always consider business impact (Phase 3) when making technical decisions
3. Track provenance through all phases with PROV-O
4. Cache expensive cross-phase queries
5. Monitor query performance to prevent slow dashboards

---

**Next Steps**:
- Review [integrated-workflow-example.mjs](../examples/integrated-workflow-example.mjs)
- Study [phase-decision-making.mjs](../examples/phase-decision-making.mjs)
- Explore [multi-repository-federation.mjs](../examples/multi-repository-federation.mjs)

**Questions?** See individual phase guides:
- [Phase 1 Guide](PHASE-1-IMPLEMENTATION-GUIDE.md)
- [Phase 2 Guide](PHASE-2-PERFORMANCE-GUIDE.md)
- [Phase 3 Guide](PHASE-3-REVOPS-GUIDE.md)
- [Phase 4 Guide](PHASE-4-PACK-SYSTEM-GUIDE.md)
