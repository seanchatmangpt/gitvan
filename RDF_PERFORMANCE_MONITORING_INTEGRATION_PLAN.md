# RDF-Based Performance Monitoring Integration Plan
## Advanced Analytics & Observability for GitVan v4

**Document Version:** 1.0
**Date:** January 9, 2026
**Status:** Analysis & Planning Phase

---

## Executive Summary

GitVan's RDF-based performance monitoring system provides a semantic foundation for tracking, analyzing, and optimizing operation performance across the entire platform. This integration plan outlines a comprehensive approach to expand current monitoring capabilities with advanced analytics, real-time alerting, distributed tracing, and enterprise-grade observability features.

The current implementation captures 8 core metrics (duration, memory, CPU, disk I/O) and performs anomaly detection via SPARQL queries. This plan extends the system to support:

- **20+ new metrics** (network, cache efficiency, GC pressure, thread pools)
- **Advanced statistical analysis** (moving averages, anomaly scoring, change point detection)
- **Distributed tracing** (OpenTelemetry integration with trace correlation)
- **Real-time alerting** (SLA enforcement, threshold violations, trend reversals)
- **Historical analysis** (capacity planning, performance forecasting)
- **Interactive dashboards** (real-time visualization, custom queries)
- **Compliance & audit trails** (Git-native audit logs, signature verification)

---

## Part 1: Current Implementation Audit

### 1.1 RDFPerformanceMonitor Class Overview

**Location:** `/home/user/gitvan/src/performance/RDFPerformanceMonitor.mjs`
**Lines of Code:** 816
**Test Coverage:** 541 lines, 16 test suites

#### Current Capabilities

| Feature | Implementation | Status |
|---------|-----------------|--------|
| **Core Metrics** | Duration, Memory, CPU, Disk I/O | ✅ Implemented |
| **Measurement Recording** | Async with UUID tracking | ✅ Implemented |
| **RDF Storage** | UnRDF quad store | ✅ Implemented |
| **SPARQL Queries** | 5 core query patterns | ✅ Implemented |
| **Anomaly Detection** | Statistical outliers, budget violations, I/O/CPU classification | ✅ Implemented |
| **Budget Enforcement** | Per-operation thresholds | ✅ Implemented |
| **Trend Analysis** | Linear regression (90-day windows) | ✅ Implemented |
| **Correlation Analysis** | Pearson coefficient (CPU only) | ✅ Implemented |
| **Statistics Aggregation** | Mean, median, percentiles (p50/p95/p99) | ✅ Implemented |
| **Data Retention** | 90-day pruning capability | ✅ Implemented |

### 1.2 Performance Ontology (Turtle Format)

**Location:** `/home/user/gitvan/src/rdf/ontologies/performance-ontology.ttl`
**Size:** 596 lines

#### Core Classes

```
perf:Measurement         - Single operation execution record
perf:PerformanceBudget  - Threshold constraints
perf:Anomaly            - Detected irregularities
perf:Operation          - Activity classification
perf:Statistics         - Aggregated metrics
perf:Correlation        - Operation dependencies
perf:Trend              - Performance trends
```

#### Critical Properties

**Measurement Domain:**
- `perf:duration` (ms, decimal)
- `perf:memoryUsed` (bytes, integer)
- `perf:cpuPercent` (0-100, decimal)
- `perf:diskIO` (bytes, integer)
- `perf:timestamp` (ISO 8601 dateTime)
- `perf:contextData` (JSON metadata)
- `perf:success` (boolean)

**Anomaly Types Defined:**
- `BudgetViolation`, `Outlier`, `TrendChange`, `HighVariance`
- `ConsistentlyHigh`, `PotentialMemoryLeak`
- `IoBoundOperation`, `CpuBoundOperation`

### 1.3 Monitoring Hooks Integration

**Location:** `/home/user/gitvan/src/performance/monitoring.mjs`
**Lines of Code:** 801

Provides complementary in-memory monitoring through composable functions:

```javascript
usePerformanceMonitor(options)
  ├── track(operationType, fn, context)
  ├── getMetrics(operationType)
  ├── getAllMetrics()
  ├── getAggregates()
  ├── getSlowOperations(limit)
  ├── getViolations(limit)
  └── getReport()

createProfilingSession(name)
  ├── mark(label, metadata)
  ├── measure(name, startMark, endMark)
  ├── getTimeline()
  ├── getDuration()
  └── getSummary()

useExecutionTracer(options)
  ├── start(operation, metadata)
  ├── end(traceId, result)
  ├── error(traceId, error)
  ├── getTraces()
  ├── getTraceTree()
  └── getStats()
```

### 1.4 Query Modules (1,371 LOC)

**Location:** `/home/user/gitvan/src/performance/queries/`

| Module | Functions | Purpose |
|--------|-----------|---------|
| `query-helpers.mjs` | 10 utilities | Statistical calculations, pattern verification |
| `anomaly-detection.mjs` | 4 queries | Budget violations, memory leaks, CPU spikes, slowdowns |
| `trend-analysis.mjs` | 2 queries | Trend lines, peak usage detection |
| `correlation-analysis.mjs` | 2 queries | Correlated operations, impact chains |

### 1.5 Current SPARQL Query Patterns

#### Pattern 1: Budget Violations
```sparql
PREFIX perf: <https://gitvan.dev/performance#>

SELECT ?measurementId ?operation ?duration ?budget (?duration - ?budget AS ?excess)
WHERE {
  ?m a perf:Measurement ;
     perf:operation ?operation ;
     perf:duration ?duration ;
     perf:timestamp ?timestamp .
  ?b a perf:PerformanceBudget ;
     perf:forOperation ?operation ;
     perf:maxDuration ?budget ;
     perf:budgetEnabled true .
  FILTER(?duration > ?budget)
}
ORDER BY DESC(?excess) LIMIT 100
```

#### Pattern 2: Memory Leak Detection
```sparql
SELECT ?operation (MAX(?memoryUsed) - MIN(?memoryUsed) AS ?totalIncrease)
WHERE {
  ?m a perf:Measurement ;
     perf:operation ?operation ;
     perf:memoryUsed ?memoryUsed .
}
GROUP BY ?operation
HAVING (COUNT(?m) >= 5)
```

#### Pattern 3: Anomaly Classification
```sparql
SELECT ?anomalyType (COUNT(?a) AS ?count) (AVG(?severity) AS ?avgSeverity)
WHERE {
  ?a a perf:Anomaly ;
     perf:anomalyType ?anomalyType ;
     perf:severity ?severity ;
     perf:detectedAt ?timestamp .
  FILTER(?timestamp >= ?startDate)
}
GROUP BY ?anomalyType
```

### 1.6 Data Storage Architecture

```
RDF Store (UnRDF)
├── Quads (S-P-O-G)
├── Namespaces: perf, xsd, rdf, rdfs, owl, prov, dct, sh
├── Indexing: URIs, literals, typed values
└── Constraints: SHACL shapes for validation

In-Memory Cache
├── Operation statistics (last 1000 samples)
├── Running aggregates
├── Budget definitions
└── Outlier thresholds

Git-Native Storage (Proposed)
├── Performance refs (refs/perf/*)
├── Audit trail in Git notes
├── Signed measurement bundles
└── Historical snapshots
```

### 1.7 Test Coverage Assessment

**File:** `/home/user/gitvan/tests/performance/RDFPerformanceMonitor.test.mjs`

**Test Categories:**

| Category | Test Count | Coverage |
|----------|-----------|----------|
| Initialization | 3 | ✅ Core setup, ontology loading, error handling |
| Measurement Recording | 4 | ✅ Basic recording, stat updates, RDF persistence |
| Budget Management | 3 | ✅ Budget setting, violation detection, compliance |
| Anomaly Detection | 4 | ✅ Outliers, I/O classification, CPU classification, insufficient data |
| Measurement Retrieval | 3 | ✅ Query results, time windows, unknown operations |
| Anomaly Retrieval | 4 | ✅ Filtering by severity/operation, limits, unresolved only |
| Budget Violations | 2 | ✅ Grouping, no violations |
| Correlation Analysis | 2 | ✅ Correlation detection, insufficient data |
| Trend Analysis | 4 | ✅ Trend calculation, degradation, improvement, insufficient data |
| Statistics | 3 | ✅ Aggregation, percentiles, unknown operations |
| Export | 1 | ✅ RDF export |
| Math Functions | 4 | ✅ Mean, stddev, correlation, regression |
| Edge Cases | 5 | ✅ Zero duration, large values, empty/complex context |

**Total: 43 test cases, ~100% of implemented functionality**

---

## Part 2: Current Metrics Collection Audit

### 2.1 Primary Metrics (Currently Tracked)

```
Measurement Interval: Per Operation Execution
Resolution: Millisecond
Cardinality: One record per operation invocation
Storage: RDF Quad Store
```

| Metric | Unit | Type | Source | Resolution | Granularity |
|--------|------|------|--------|------------|-------------|
| **Duration** | ms | Decimal | `performance.now()` | ~0.1 ms | Per execution |
| **Memory Used** | bytes | Integer | `process.memoryUsage()` | 1 byte | Per execution |
| **CPU Percent** | % | Decimal | System query | 0.1% | Per execution |
| **Disk I/O** | bytes | Integer | Operation tracking | 1 byte | Per execution |
| **Timestamp** | ISO 8601 | DateTime | System clock | ~1 ms | Per execution |
| **Operation Name** | String | Text | User-provided | N/A | Per operation type |
| **Success Status** | Boolean | Boolean | Execution outcome | N/A | Per execution |
| **Error Message** | String | Text | Exception handler | N/A | On failure |
| **Context Data** | JSON | String | Custom metadata | N/A | Per execution |
| **Measurement ID** | UUID | String | Generated | N/A | Per execution |

### 2.2 Derived Metrics (Computed On-Demand)

```javascript
// In-memory cache statistics for each operation:
{
  count: number,              // Total measurements
  durations: number[],        // Last 1000 samples
  memories: number[],         // Last 1000 samples
  cpus: number[],             // Last 1000 samples

  // Calculated per getStats()
  mean: number,
  median: number,
  stddev: number,
  p50: number, p95: number, p99: number,
  min: number, max: number
}
```

### 2.3 Aggregation Methods

| Method | Window | Frequency | Query Type |
|--------|--------|-----------|-----------|
| **Moving Average** | Last N samples | On-demand | Memory-based |
| **Percentiles** | All samples | On-demand | Memory-based |
| **Trend Analysis** | 90 days | On-demand | SPARQL group-by |
| **Correlation** | All operations | On-demand | Pairwise calculation |
| **Budget Aggregation** | All violations | On-demand | SPARQL filtering |

### 2.4 Data Retention Policy

| Scope | Retention | Pruning | Notes |
|-------|-----------|---------|-------|
| RDF Store | 90 days | `pruneOldMeasurements(90)` | Configurable via options |
| In-Memory Stats | Last 1000 samples | Automatic shift() | Per operation |
| Anomaly History | All | Manual | No pruning implemented |
| Budget Definitions | Indefinite | Manual | Reloaded on init |

### 2.5 Data Quality Issues

| Issue | Severity | Current Handling | Recommended Fix |
|-------|----------|------------------|-----------------|
| **Missing disk I/O** | Medium | Default to 0 | Implement native metrics API |
| **CPU percent accuracy** | Medium | Approximation only | Use native process module |
| **Memory delta vs absolute** | High | Recorded as absolute | Track baseline properly |
| **Context data serialization** | Low | Double JSON.stringify() | Normalize storage format |
| **Timestamp precision** | Low | ISO 8601 milliseconds | Use microseconds if available |
| **Sampling bias** | High | 100% sampling only | Implement stratified sampling |

---

## Part 3: Expanded Monitoring Capabilities

### 3.1 New Metric Categories (Phase 1)

#### A. Memory Profiling (8 new metrics)

```javascript
class MemoryMetrics {
  heapUsed: number,          // Heap memory in use
  heapTotal: number,         // Total heap allocated
  external: number,          // V8 external memory
  rss: number,               // Resident set size
  heapDelta: number,         // Change during operation
  leakScoreGC: number,       // Memory leak probability
  gcPressure: number,        // GC frequency ratio
  retainedObjects: number    // Long-lived allocations
}
```

**Collection:**
```javascript
const before = process.memoryUsage();
const heapBefore = before.heapUsed;
// ... operation ...
const after = process.memoryUsage();
const memoryDelta = after.heapUsed - heapBefore;
const gcPressure = heapUsed / heapTotal;
```

**RDF Representation:**
```turtle
<urn:measurement:${id}> a perf:Measurement ;
  perf:heapUsed ?heapUsed ;
  perf:heapTotal ?heapTotal ;
  perf:heapDelta ?delta ;
  perf:external ?external ;
  perf:gcPressure ?gcPressure .
```

#### B. CPU & Threading (6 new metrics)

```javascript
class CPUMetrics {
  userCPU: number,           // User CPU time (ms)
  systemCPU: number,         // System CPU time (ms)
  cpuPercent: number,        // Total CPU usage
  contextSwitches: number,   // Context switches during op
  threadCount: number,       // Active threads
  blockingFraction: number   // Time blocked on I/O
}
```

**Collection:**
```javascript
const cpuBefore = process.cpuUsage();
// ... operation ...
const cpuAfter = process.cpuUsage(cpuBefore);
const userCPU = cpuAfter.user / 1000;  // Convert to ms
const systemCPU = cpuAfter.system / 1000;
```

#### C. I/O Metrics (7 new metrics)

```javascript
class IOMetrics {
  diskReadBytes: number,     // Bytes read from disk
  diskWriteBytes: number,    // Bytes written to disk
  diskReadOps: number,       // Number of read operations
  diskWriteOps: number,      // Number of write operations
  fsWatcherCount: number,    // Active file watchers
  networkBytes: number,      // Network I/O (if applicable)
  openFileDescriptors: number // FD count
}
```

**Collection via `/proc/self/io` (Linux):**
```javascript
const fs = require('fs');
const before = fs.readFileSync('/proc/self/io', 'utf8');
// ... operation ...
const after = fs.readFileSync('/proc/self/io', 'utf8');
// Parse and calculate deltas
```

#### D. Event Loop Metrics (5 new metrics)

```javascript
class EventLoopMetrics {
  eventLoopLag: number,      // Lag in milliseconds
  activeHandles: number,     // Active handles
  activeRequests: number,    // Pending operations
  lag99Percentile: number,   // P99 lag over window
  blocking: boolean          // Whether blocking detected
}
```

**Collection via perf_hooks:**
```javascript
const perf_hooks = require('perf_hooks');
const obs = new perf_hooks.monitorEventLoopDelay();
obs.enable();
// ... operation ...
obs.disable();
const mean = obs.mean;
const p99 = obs.percentile(99);
```

#### E. Cache Efficiency (6 new metrics)

```javascript
class CacheMetrics {
  cacheHits: number,         // Cache hit count
  cacheMisses: number,       // Cache miss count
  cacheHitRate: number,      // Hit rate percentage
  cacheSize: number,         // Bytes in cache
  evictionCount: number,     // Number of evictions
  staleness: number          // Age of oldest entry (ms)
}
```

#### F. Network Metrics (4 new metrics) - *optional for network operations*

```javascript
class NetworkMetrics {
  bytesIn: number,           // Bytes received
  bytesOut: number,          // Bytes sent
  latency: number,           // Round-trip time (ms)
  packetLoss: number         // Lost packets (%)
}
```

#### G. Custom Application Metrics (unlimited)

```javascript
// Via context parameter
await monitor.recordMeasurement('operation', duration, memory, cpu, io, {
  customMetric1: value1,
  customMetric2: value2,
  tags: ['tag1', 'tag2'],
  userId: 'user-123',
  repoName: 'repo-name',
  ...
});
```

### 3.2 New Metric Ontology Extensions

**File:** `/home/user/gitvan/src/rdf/ontologies/performance-ontology.ttl`

Add the following classes and properties:

```turtle
# Extended Measurement Class
perf:ExtendedMeasurement a owl:Class ;
  rdfs:subClassOf perf:Measurement ;
  rdfs:comment "Measurement with expanded metrics" .

# Memory Properties
perf:heapUsed a owl:DatatypeProperty ;
  rdfs:range xsd:integer ;
  rdfs:domain perf:ExtendedMeasurement .

perf:heapTotal a owl:DatatypeProperty ;
  rdfs:range xsd:integer ;
  rdfs:domain perf:ExtendedMeasurement .

perf:heapDelta a owl:DatatypeProperty ;
  rdfs:range xsd:integer ;
  rdfs:domain perf:ExtendedMeasurement .

perf:gcPressure a owl:DatatypeProperty ;
  rdfs:range xsd:decimal ;
  rdfs:domain perf:ExtendedMeasurement .

# CPU Properties
perf:userCPU a owl:DatatypeProperty ;
  rdfs:range xsd:decimal ;
  rdfs:comment "User-space CPU time in milliseconds" .

perf:systemCPU a owl:DatatypeProperty ;
  rdfs:range xsd:decimal ;
  rdfs:comment "System CPU time in milliseconds" .

# I/O Properties
perf:diskReadBytes a owl:DatatypeProperty ;
  rdfs:range xsd:integer .

perf:diskWriteBytes a owl:DatatypeProperty ;
  rdfs:range xsd:integer .

# Event Loop Properties
perf:eventLoopLag a owl:DatatypeProperty ;
  rdfs:range xsd:decimal ;
  rdfs:comment "Event loop lag in milliseconds" .

# Cache Properties
perf:cacheHitRate a owl:DatatypeProperty ;
  rdfs:range xsd:decimal ;
  rdfs:comment "Cache hit rate (0-100)" .

# Custom Metrics
perf:customMetrics a owl:DatatypeProperty ;
  rdfs:range xsd:string ;
  rdfs:comment "JSON object with custom metrics" .

perf:tags a owl:DatatypeProperty ;
  rdfs:range xsd:string ;
  rdfs:comment "Comma-separated tags" .
```

### 3.3 Extended Measurement Recording

```javascript
/**
 * Enhanced measurement recording with all metrics
 */
async recordExtendedMeasurement(
  operation,
  startTime,
  endTime,
  memoryBefore,
  memoryAfter,
  cpuBefore,
  cpuAfter,
  ioBefore,
  ioAfter,
  cacheBefore,
  cacheAfter,
  context = {}
) {
  const duration = endTime - startTime;
  const heapDelta = memoryAfter.heapUsed - memoryBefore.heapUsed;
  const userCPUDelta = (cpuAfter.user - cpuBefore.user) / 1000;
  const diskDelta = ioAfter.diskReadBytes + ioAfter.diskWriteBytes
                   - ioBefore.diskReadBytes - ioBefore.diskWriteBytes;

  const measurementId = `meas-${randomUUID()}`;
  const timestamp = new Date().toISOString();

  const turtle = `
    @prefix perf: <https://gitvan.dev/performance#> .
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

    <urn:measurement:${measurementId}> a perf:ExtendedMeasurement ;
      perf:measurementId "${measurementId}" ;
      perf:operation "${operation}" ;
      perf:duration ${duration.toFixed(3)} ;
      perf:memoryUsed ${memoryAfter.heapUsed} ;
      perf:heapUsed ${memoryAfter.heapUsed} ;
      perf:heapTotal ${memoryAfter.heapTotal} ;
      perf:heapDelta ${heapDelta} ;
      perf:external ${memoryAfter.external} ;
      perf:gcPressure ${(memoryAfter.heapUsed / memoryAfter.heapTotal * 100).toFixed(2)} ;
      perf:cpuPercent ${cpuPercent.toFixed(2)} ;
      perf:userCPU ${userCPUDelta.toFixed(3)} ;
      perf:systemCPU ${systemCPUDelta.toFixed(3)} ;
      perf:diskIO ${diskDelta} ;
      perf:diskReadBytes ${ioAfter.diskReadBytes} ;
      perf:diskWriteBytes ${ioAfter.diskWriteBytes} ;
      perf:eventLoopLag ${eventLoopLag.toFixed(2)} ;
      perf:cacheHitRate ${cacheHitRate.toFixed(2)} ;
      perf:timestamp "${timestamp}"^^xsd:dateTime ;
      perf:success true ;
      perf:contextData ${JSON.stringify(context)} .
  `;

  const store = await parseTurtle(turtle);
  for (const quad of store) {
    this.core.store.add(quad);
  }

  return measurementId;
}
```

### 3.4 Integration with usePerformanceMonitor Hook

```javascript
// Enhanced monitoring hook integration
export function useEnhancedPerformanceMonitor(options = {}) {
  const baseMonitor = usePerformanceMonitor(options);

  return {
    ...baseMonitor,

    async trackExtended(operationType, fn, context = {}) {
      const memBefore = process.memoryUsage();
      const cpuBefore = process.cpuUsage();
      const startTime = performance.now();

      try {
        return await fn();
      } finally {
        const endTime = performance.now();
        const memAfter = process.memoryUsage();
        const cpuAfter = process.cpuUsage(cpuBefore);

        // Store extended metrics
        // Integrate with RDF monitor if available
      }
    }
  };
}
```

---

## Part 4: Advanced Analytics Framework

### 4.1 Statistical Analysis Engine

#### A. Moving Window Analysis

```javascript
/**
 * Calculate rolling statistics for trend detection
 */
export async function getMovingWindowStats(ks, operation, windowSize = 20, metric = 'duration') {
  const sparql = `
    PREFIX perf: <https://gitvan.dev/performance#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

    SELECT ?timestamp ?${metric} (ROW_NUMBER() OVER (ORDER BY ?timestamp) AS ?rowNum)
    WHERE {
      ?m a perf:Measurement ;
         perf:operation "${operation}" ;
         perf:timestamp ?timestamp ;
         perf:${metric} ?${metric} .
    }
    ORDER BY DESC(?timestamp)
    LIMIT 1000
  `;

  const results = await ks.query(sparql);
  const measurements = results.map(r => ({
    timestamp: new Date(r.timestamp.value).getTime(),
    value: parseFloat(r[metric].value)
  }));

  // Calculate moving window stats
  const windows = [];
  for (let i = 0; i < measurements.length - windowSize; i++) {
    const window = measurements.slice(i, i + windowSize);
    const values = window.map(m => m.value);

    windows.push({
      startTime: window[0].timestamp,
      endTime: window[window.length - 1].timestamp,
      mean: mean(values),
      stddev: stddev(values),
      min: Math.min(...values),
      max: Math.max(...values),
      trend: calculateTrendDirection(values)
    });
  }

  return windows;
}

/**
 * Detect significant changes in moving window stats
 */
export function detectWindowAnomalies(windows, threshold = 2.0) {
  const anomalies = [];

  for (let i = 1; i < windows.length; i++) {
    const prev = windows[i - 1];
    const curr = windows[i];

    // Detect mean shift
    if (Math.abs(curr.mean - prev.mean) > threshold * prev.stddev) {
      anomalies.push({
        type: 'MeanShift',
        severity: 'high',
        description: `Mean shifted from ${prev.mean.toFixed(2)} to ${curr.mean.toFixed(2)}`,
        timestamp: curr.endTime,
        estimatedCause: curr.mean > prev.mean ? 'degradation' : 'improvement'
      });
    }

    // Detect variance increase (instability)
    if (curr.stddev > threshold * prev.stddev) {
      anomalies.push({
        type: 'IncreasingVariance',
        severity: 'medium',
        description: `Variance increased from ${prev.stddev.toFixed(2)} to ${curr.stddev.toFixed(2)}`,
        timestamp: curr.endTime
      });
    }
  }

  return anomalies;
}
```

#### B. Change Point Detection

```javascript
/**
 * Detect performance degradation or improvement inflection points
 * Uses cumulative sum (CUSUM) algorithm
 */
export function detectChangePoints(measurements, threshold = 5.0) {
  if (measurements.length < 10) return [];

  const mean = measurements.reduce((a, b) => a + b, 0) / measurements.length;
  const stddev = Math.sqrt(
    measurements.reduce((sum, m) => sum + Math.pow(m - mean, 2), 0) / measurements.length
  );

  const changePoints = [];
  let cusum = 0;
  let minCusum = 0;
  let minIdx = 0;

  for (let i = 0; i < measurements.length; i++) {
    cusum += (measurements[i] - mean) / stddev;

    if (cusum < minCusum) {
      // New minimum found
      if (i - minIdx > 5) {
        // Significant change detected
        changePoints.push({
          index: minIdx,
          timestamp: measurements[minIdx],
          type: cusum < minCusum - threshold ? 'degradation' : 'normal',
          magnitude: Math.abs(cusum - minCusum)
        });
      }
      minCusum = cusum;
      minIdx = i;
    }
  }

  return changePoints;
}
```

#### C. Outlier Scoring

```javascript
/**
 * Enhanced outlier detection using multiple methods
 * Combines Z-score, IQR, and isolation forest approaches
 */
export function scoreOutliers(measurements) {
  const scores = new Map();

  // Method 1: Z-score
  const mean = measurements.reduce((a, b) => a + b, 0) / measurements.length;
  const stddev = Math.sqrt(
    measurements.reduce((sum, m) => sum + Math.pow(m - mean, 2), 0) / measurements.length
  );

  // Method 2: IQR
  const sorted = [...measurements].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;

  // Calculate composite score
  measurements.forEach((value, idx) => {
    const zScore = Math.abs((value - mean) / stddev);
    const iqrScore = Math.abs((value - q1) / iqr);
    const compositeScore = (zScore + iqrScore) / 2;

    scores.set(idx, {
      value,
      zScore,
      iqrScore,
      compositeScore,
      isOutlier: compositeScore > 2.5,
      severity: compositeScore > 3.5 ? 'critical' :
               compositeScore > 2.5 ? 'high' : 'normal'
    });
  });

  return Array.from(scores.values())
    .sort((a, b) => b.compositeScore - a.compositeScore);
}
```

### 4.2 Correlation & Causality Analysis

#### A. Time-Series Correlation with Lag Detection

```javascript
/**
 * Find lagged correlations between operations
 * Detects if operation A's slowdown causes operation B to slow down later
 */
export async function findLaggedCorrelations(ks, operation1, operation2, maxLag = 10) {
  const sparql = `
    PREFIX perf: <https://gitvan.dev/performance#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

    SELECT ?op1Duration ?op2Duration ?timestamp
    WHERE {
      ?m1 a perf:Measurement ;
          perf:operation "${operation1}" ;
          perf:duration ?op1Duration ;
          perf:timestamp ?timestamp1 .

      ?m2 a perf:Measurement ;
          perf:operation "${operation2}" ;
          perf:duration ?op2Duration ;
          perf:timestamp ?timestamp2 .

      BIND(ABS(xsd:long(?timestamp1) - xsd:long(?timestamp2)) AS ?timeDiff)
      FILTER(?timeDiff < 5000)  # Within 5 seconds
    }
    ORDER BY ?timestamp1
    LIMIT 200
  `;

  const results = await ks.query(sparql);

  // Calculate correlations at each lag
  const correlations = [];
  for (let lag = 0; lag <= maxLag; lag++) {
    const pairs = [];
    for (let i = 0; i < results.length - lag; i++) {
      pairs.push({
        x: parseFloat(results[i].op1Duration.value),
        y: parseFloat(results[i + lag].op2Duration.value)
      });
    }

    if (pairs.length > 5) {
      const correlation = calculatePearson(pairs);
      correlations.push({
        lag,
        correlation,
        strength: Math.abs(correlation) > 0.7 ? 'strong' :
                 Math.abs(correlation) > 0.5 ? 'moderate' : 'weak'
      });
    }
  }

  return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}
```

#### B. Causality Scoring (Granger Causality)

```javascript
/**
 * Determine if operation A "Granger-causes" operation B
 * i.e., past values of A help predict B better than B alone
 */
export function grangerCausality(seriesA, seriesB, lag = 3) {
  // 1. Fit model: B(t) = a0 + a1*B(t-1) + ... + al*B(t-lag) + noise1
  const model1Error = fitAR(seriesB, lag);

  // 2. Fit model: B(t) = b0 + b1*B(t-1) + ... + bl*B(t-lag)
  //                      + c1*A(t-1) + ... + cl*A(t-lag) + noise2
  const model2Error = fitARX(seriesB, seriesA, lag);

  // 3. F-test on error reduction
  const n = seriesB.length;
  const k = lag;
  const fStat = ((model1Error - model2Error) / k) / (model2Error / (n - 2*k - 1));

  return {
    fStatistic: fStat,
    pValue: 1 - cumulativeF(fStat, k, n - 2*k - 1),
    causeStrength: fStat > 3.5 ? 'strong' : fStat > 2.0 ? 'moderate' : 'weak',
    causesB: fStat > 3.5  // Significant at p < 0.05
  };
}
```

### 4.3 Predictive Analytics

#### A. Performance Forecasting

```javascript
/**
 * Forecast future operation performance using ARIMA-like approach
 */
export function forecastPerformance(measurements, horizon = 20, confidence = 0.95) {
  // Extract trend and seasonality
  const trend = calculateTrend(measurements);
  const seasonal = calculateSeasonality(measurements, period = 100);

  // Decompose: Y(t) = Trend(t) + Seasonal(t) + Residual(t)
  const residuals = measurements.map((m, i) =>
    m - trend(i) - seasonal[i % seasonal.length]
  );

  // Fit AR model to residuals
  const phi = estimateAR(residuals, order = 2);

  // Generate forecast
  const forecast = [];
  for (let h = 1; h <= horizon; h++) {
    const trendValue = trend(measurements.length + h);
    const seasonalValue = seasonal[(measurements.length + h) % seasonal.length];

    // AR prediction
    let arPrediction = 0;
    for (let i = 0; i < phi.length; i++) {
      const idx = residuals.length - 1 - i;
      arPrediction += phi[i] * (idx >= 0 ? residuals[idx] : 0);
    }

    const prediction = trendValue + seasonalValue + arPrediction;
    const error = estimateError(residuals);
    const zScore = 1.96; // 95% confidence

    forecast.push({
      horizon: h,
      prediction,
      lower: prediction - zScore * error,
      upper: prediction + zScore * error,
      confidence
    });
  }

  return forecast;
}
```

#### B. Anomaly Severity Scoring

```javascript
/**
 * Score anomaly severity based on impact and frequency
 */
export function scoreAnomalySeverity(anomaly, historicalContext) {
  const components = {
    // Magnitude: how far from expected
    magnitude: Math.min(
      Math.abs(anomaly.value - historicalContext.mean) / historicalContext.stddev,
      5.0
    ) / 5.0 * 0.25,

    // Impact: how much does this affect SLOs
    impact: calculateImpact(anomaly) * 0.25,

    // Frequency: how often has this occurred
    frequency: Math.min(
      1 - (historicalContext.anomalyFrequency / 100),
      1.0
    ) * 0.25,

    // Trend: is it getting worse
    trend: detectTrendDirection(anomaly.timeSeries) * 0.25
  };

  const totalScore = Object.values(components).reduce((a, b) => a + b, 0);

  return {
    score: totalScore,
    severity: totalScore > 0.75 ? 'critical' :
             totalScore > 0.5 ? 'high' :
             totalScore > 0.25 ? 'medium' : 'low',
    components
  };
}
```

---

## Part 5: Real-Time Alerting for SLA Violations

### 5.1 SLA Definition Framework

```turtle
# Performance SLA Ontology
@prefix sla: <https://gitvan.dev/sla#> .
@prefix perf: <https://gitvan.dev/performance#> .

sla:ServiceLevelAgreement a owl:Class ;
  rdfs:comment "SLA definition for operations" .

sla:SLATarget a owl:Class ;
  rdfs:comment "Individual SLA target" .

sla:Objective a owl:Class ;
  rdfs:label "Service Level Objective (SLO)" ;
  rdfs:comment "Specific, measurable SLO" .

sla:forOperation a owl:DatatypeProperty ;
  rdfs:domain sla:Objective ;
  rdfs:range xsd:string .

sla:metric a owl:DatatypeProperty ;
  rdfs:domain sla:Objective ;
  rdfs:range xsd:string ;
  rdfs:comment "Metric name: duration, memory, cpu, etc." .

sla:targetValue a owl:DatatypeProperty ;
  rdfs:domain sla:Objective ;
  rdfs:range xsd:decimal ;
  rdfs:comment "Target threshold (e.g., 100ms)" .

sla:operator a owl:DatatypeProperty ;
  rdfs:domain sla:Objective ;
  rdfs:range xsd:string ;
  rdfs:comment "Comparison: LessThan, GreaterThan, Equal" .

sla:window a owl:DatatypeProperty ;
  rdfs:domain sla:Objective ;
  rdfs:range xsd:integer ;
  rdfs:comment "Time window in seconds (e.g., 3600 for 1 hour)" .

sla:errorBudget a owl:DatatypeProperty ;
  rdfs:domain sla:Objective ;
  rdfs:range xsd:decimal ;
  rdfs:comment "Error budget as % (e.g., 0.1 for 99.9% uptime)" .

sla:alertThreshold a owl:DatatypeProperty ;
  rdfs:domain sla:Objective ;
  rdfs:range xsd:decimal ;
  rdfs:comment "Threshold to trigger alerts" .
```

### 5.2 Real-Time Alert Engine

```javascript
/**
 * Real-time SLA violation detector
 */
export class SLAMonitor {
  constructor(ks, options = {}) {
    this.ks = ks;
    this.slos = new Map();
    this.violations = new Map();
    this.alerts = [];
    this.pollingInterval = options.pollingInterval || 5000;
  }

  /**
   * Define an SLO
   */
  defineSLO(operation, metric, targetValue, operator = 'LessThan',
            windowSeconds = 3600, errorBudget = 0.001) {
    const sloId = `slo-${operation}-${metric}`;
    this.slos.set(sloId, {
      operation,
      metric,
      targetValue,
      operator,
      windowSeconds,
      errorBudget,
      errorBudgetConsumed: 0,
      violations: 0,
      lastViolation: null
    });
  }

  /**
   * Check SLO compliance
   */
  async checkCompliance() {
    const alerts = [];

    for (const [sloId, slo] of this.slos) {
      const sparql = `
        PREFIX perf: <https://gitvan.dev/performance#>
        PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

        SELECT (COUNT(?m) AS ?total) (COUNT(?violation) AS ?violationCount)
        WHERE {
          ?m a perf:Measurement ;
             perf:operation "${slo.operation}" ;
             perf:timestamp ?timestamp .

          OPTIONAL {
            ?m perf:${slo.metric} ?value .
            FILTER(
              ${this.buildFilter(slo.metric, slo.operator, slo.targetValue)}
            )
            BIND(?m AS ?violation)
          }

          FILTER(?timestamp >= "${new Date(Date.now() - slo.windowSeconds * 1000).toISOString()}")
        }
      `;

      const results = await this.ks.query(sparql);
      const row = results[0];

      if (!row) continue;

      const total = parseInt(row.total.value);
      const violations = parseInt(row.violationCount.value);
      const violationRate = violations / total;

      // Check if exceeds error budget
      slo.errorBudgetConsumed += violationRate;
      slo.violations = violations;

      if (slo.errorBudgetConsumed > slo.errorBudget) {
        alerts.push({
          sloId,
          operation: slo.operation,
          metric: slo.metric,
          severity: 'critical',
          message: `SLO for ${slo.operation}.${slo.metric} violated: error budget exceeded`,
          violationRate: (violationRate * 100).toFixed(2) + '%',
          errorBudget: (slo.errorBudget * 100).toFixed(2) + '%',
          timestamp: new Date().toISOString()
        });
      } else if (violationRate > slo.errorBudget * 0.8) {
        alerts.push({
          sloId,
          operation: slo.operation,
          metric: slo.metric,
          severity: 'warning',
          message: `SLO for ${slo.operation}.${slo.metric} approaching limit`,
          violationRate: (violationRate * 100).toFixed(2) + '%',
          errorBudget: (slo.errorBudget * 100).toFixed(2) + '%',
          timestamp: new Date().toISOString()
        });
      }
    }

    return alerts;
  }

  buildFilter(metric, operator, value) {
    const opMap = {
      'LessThan': `?value < ${value}`,
      'GreaterThan': `?value > ${value}`,
      'Equal': `?value = ${value}`,
      'LessOrEqual': `?value <= ${value}`,
      'GreaterOrEqual': `?value >= ${value}`
    };
    return opMap[operator] || opMap['GreaterThan'];
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(callback) {
    setInterval(async () => {
      const alerts = await this.checkCompliance();
      if (alerts.length > 0) {
        this.alerts.push(...alerts);
        callback(alerts);
      }
    }, this.pollingInterval);
  }

  /**
   * Get alerts
   */
  getAlerts(filter = {}) {
    return this.alerts.filter(a => {
      if (filter.severity && a.severity !== filter.severity) return false;
      if (filter.operation && a.operation !== filter.operation) return false;
      if (filter.since) {
        const sinceTime = new Date(filter.since).getTime();
        const alertTime = new Date(a.timestamp).getTime();
        if (alertTime < sinceTime) return false;
      }
      return true;
    });
  }
}
```

### 5.3 Multi-Channel Alert Distribution

```javascript
/**
 * Alert routing and delivery
 */
export class AlertRouter {
  constructor(options = {}) {
    this.handlers = new Map();
    this.routes = [];
    this.deadLetterQueue = [];
  }

  /**
   * Register alert handler
   */
  registerHandler(name, handler) {
    this.handlers.set(name, handler);
  }

  /**
   * Configure routing rules
   */
  addRoute(rule) {
    this.routes.push({
      matcher: rule.matcher,  // (alert) => boolean
      handlers: rule.handlers,  // [handlerNames]
      transform: rule.transform,  // Optional transformation
      retry: rule.retry || 3
    });
  }

  /**
   * Route and send alert
   */
  async routeAlert(alert) {
    for (const route of this.routes) {
      if (!route.matcher(alert)) continue;

      const transformedAlert = route.transform ? route.transform(alert) : alert;

      for (const handlerName of route.handlers) {
        const handler = this.handlers.get(handlerName);
        if (!handler) continue;

        try {
          await this.retryAsync(
            () => handler(transformedAlert),
            route.retry
          );
        } catch (error) {
          this.deadLetterQueue.push({
            alert: transformedAlert,
            handler: handlerName,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
  }

  async retryAsync(fn, retries) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
  }
}

// Example handlers
const alertRouter = new AlertRouter();

// Email handler
alertRouter.registerHandler('email', async (alert) => {
  await sendEmail({
    to: alert.assignee || 'ops@gitvan.dev',
    subject: `[${alert.severity}] SLA Violation: ${alert.operation}`,
    body: `Operation: ${alert.operation}\nMetric: ${alert.metric}\n${alert.message}`
  });
});

// Slack handler
alertRouter.registerHandler('slack', async (alert) => {
  await sendSlack({
    channel: '#performance-alerts',
    text: `🚨 ${alert.severity}: ${alert.operation} - ${alert.message}`
  });
});

// PagerDuty handler (for critical alerts)
alertRouter.registerHandler('pagerduty', async (alert) => {
  if (alert.severity === 'critical') {
    await triggerPagerDutyIncident(alert);
  }
});

// Git notes handler (audit trail)
alertRouter.registerHandler('git-audit', async (alert) => {
  const noteContent = `SLA Violation\n${JSON.stringify(alert, null, 2)}`;
  await addGitNote('refs/performance/alerts', noteContent);
});

// Configure routes
alertRouter.addRoute({
  matcher: (a) => a.severity === 'critical',
  handlers: ['slack', 'pagerduty', 'email', 'git-audit'],
  retry: 5
});

alertRouter.addRoute({
  matcher: (a) => a.severity === 'warning',
  handlers: ['slack', 'git-audit'],
  retry: 3
});

alertRouter.addRoute({
  matcher: (a) => a.operation.includes('critical'),
  handlers: ['email', 'git-audit'],
  retry: 2
});
```

---

## Part 6: Historical Analysis & Capacity Planning

### 6.1 Historical Data Aggregation

```javascript
/**
 * Compute historical baselines and statistics
 */
export async function computeHistoricalBaseline(ks, operation, days = 90) {
  const sparql = `
    PREFIX perf: <https://gitvan.dev/performance#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

    SELECT
      (AVG(?duration) AS ?mean)
      (STDDEV(?duration) AS ?stddev)
      (MIN(?duration) AS ?min)
      (MAX(?duration) AS ?max)
      (COUNT(?m) AS ?count)
    WHERE {
      ?m a perf:Measurement ;
         perf:operation "${operation}" ;
         perf:duration ?duration ;
         perf:timestamp ?timestamp .

      FILTER(?timestamp >= "${new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()}")
    }
  `;

  const result = await ks.query(sparql);
  return {
    operation,
    period: `${days} days`,
    baselineMetrics: {
      mean: parseFloat(result[0].mean.value),
      stddev: parseFloat(result[0].stddev.value),
      min: parseFloat(result[0].min.value),
      max: parseFloat(result[0].max.value),
      p50: calculatePercentile(/* ... */),
      p95: calculatePercentile(/* ... */),
      p99: calculatePercentile(/* ... */),
      samples: parseInt(result[0].count.value)
    },
    confidence: calculateConfidenceLevel(result[0].count.value)
  };
}
```

### 6.2 Capacity Planning Queries

```javascript
/**
 * Project resource usage based on trends
 */
export async function projectCapacity(ks, operation, horizon = 90, confidence = 0.95) {
  // Get historical data
  const baseline = await computeHistoricalBaseline(ks, operation, 180);

  // Detect trend
  const trendData = await getTrendLine(ks, operation, 180);

  // Forecast
  const forecast = forecastPerformance(
    /* measurements */,
    horizon,
    confidence
  );

  // Generate capacity report
  return {
    operation,
    currentCapacity: baseline.baselineMetrics.p95,
    projectedIn30Days: forecast[30]?.prediction,
    projectedIn90Days: forecast[90]?.prediction,
    growthRate: trendData.slope,
    recommendedAction: getCapacityAction(forecast),
    confidenceLevel: confidence,
    timestamp: new Date().toISOString()
  };
}

function getCapacityAction(forecast) {
  const max = forecast[forecast.length - 1].upper;
  if (max > 1000) {
    return { action: 'urgent', message: 'Immediate optimization needed' };
  } else if (max > 500) {
    return { action: 'planned', message: 'Schedule optimization within 30 days' };
  }
  return { action: 'monitor', message: 'Continue monitoring' };
}
```

### 6.3 Historical Comparison Queries

```javascript
/**
 * Compare current performance to historical windows
 */
export async function compareToHistorical(ks, operation, timewindow = 3600) {
  const sparql = `
    PREFIX perf: <https://gitvan.dev/performance#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

    SELECT
      (
        CASE
          WHEN ?timestamp >= NOW() - P1D THEN "last 24h"
          WHEN ?timestamp >= NOW() - P7D THEN "last 7d"
          WHEN ?timestamp >= NOW() - P30D THEN "last 30d"
          WHEN ?timestamp >= NOW() - P90D THEN "last 90d"
        END
      ) AS ?period
      (AVG(?duration) AS ?avgDuration)
      (STDDEV(?duration) AS ?stddev)
      (COUNT(?m) AS ?count)
    WHERE {
      ?m a perf:Measurement ;
         perf:operation "${operation}" ;
         perf:duration ?duration ;
         perf:timestamp ?timestamp .

      FILTER(?timestamp >= NOW() - P90D)
    }
    GROUP BY ?period
    ORDER BY ?period
  `;

  const results = await ks.query(sparql);

  return {
    operation,
    periods: results.map(r => ({
      period: r.period.value,
      avgDuration: parseFloat(r.avgDuration.value),
      stddev: parseFloat(r.stddev.value),
      count: parseInt(r.count.value)
    })),
    trend: detectTrendAcrossPeriods(results)
  };
}
```

---

## Part 7: OpenTelemetry Integration

### 7.1 Distributed Tracing Architecture

```
┌─────────────────────────────────────────────────────┐
│                 GitVan Operation                     │
│          (git-commit, sparql-query, etc.)            │
└────────────────┬────────────────────────────────────┘
                 │
        ┌────────▼────────┐
        │  useGitVan()    │ (Context wrapper)
        └────────┬────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
┌───▼──┐  ┌─────▼─────┐  ┌───▼──────┐
│ Span │  │ Span Tree │  │ Metrics  │
└──────┘  └───────────┘  └──────────┘
    │            │            │
    └────────────┼────────────┘
                 │
        ┌────────▼──────────┐
        │  OpenTelemetry    │
        │  Exporter         │
        └────────┬──────────┘
                 │
    ┌────────────┼────────────────────┐
    │            │                    │
┌───▼──┐  ┌─────▼─────┐  ┌──────────▼──┐
│Jaeger│  │  Datadog  │  │  Honeycomb  │
└──────┘  └───────────┘  └─────────────┘
```

### 7.2 Span Integration with RDF Measurement

```javascript
/**
 * Distributed tracing with OpenTelemetry integration
 */
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('gitvan-performance');

export function createTracedMeasurement(rdfMonitor) {
  return {
    async recordWithTrace(operation, fn, metadata = {}) {
      const span = tracer.startSpan(operation, {
        attributes: {
          'operation': operation,
          'component': 'gitvan-performance',
          ...metadata
        }
      });

      return context.with(trace.setSpan(context.active(), span), async () => {
        const memBefore = process.memoryUsage();
        const cpuBefore = process.cpuUsage();
        const startTime = performance.now();

        try {
          const result = await fn();

          // Record successful measurement
          const endTime = performance.now();
          const memAfter = process.memoryUsage();
          const cpuAfter = process.cpuUsage(cpuBefore);

          const measurementId = await rdfMonitor.recordMeasurement(
            operation,
            endTime - startTime,
            memAfter.heapUsed - memBefore.heapUsed,
            (cpuAfter.user + cpuAfter.system) / 1000,
            0, // diskIO
            {
              traceId: span.spanContext().traceId,
              spanId: span.spanContext().spanId,
              ...metadata
            }
          );

          span.setAttributes({
            'duration_ms': endTime - startTime,
            'memory_bytes': memAfter.heapUsed - memBefore.heapUsed,
            'measurement_id': measurementId,
            'success': true
          });

          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
          throw error;
        } finally {
          span.end();
        }
      });
    }
  };
}
```

### 7.3 Custom Instrumentation

```javascript
/**
 * OpenTelemetry auto-instrumentation for common patterns
 */
export function createInstrumentedComposable(composableFn) {
  const tracer = trace.getTracer('gitvan-auto-instrumentation');

  return function instrumented(...args) {
    const span = tracer.startSpan(composableFn.name || 'unknown');

    return context.with(trace.setSpan(context.active(), span), () => {
      try {
        const result = composableFn(...args);

        if (result && typeof result === 'object' && 'then' in result) {
          // Handle promises
          return result
            .then(value => {
              span.setStatus({ code: SpanStatusCode.OK });
              span.end();
              return value;
            })
            .catch(error => {
              span.recordException(error);
              span.setStatus({ code: SpanStatusCode.ERROR });
              span.end();
              throw error;
            });
        }

        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        return result;
      } catch (error) {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        span.end();
        throw error;
      }
    });
  };
}
```

### 7.4 Trace Context Propagation

```javascript
/**
 * Propagate trace context across async boundaries
 */
export function withTraceContext(ctx, fn) {
  const span = trace.getActiveSpan();
  const traceId = span?.spanContext().traceId;
  const spanId = span?.spanContext().spanId;
  const traceFlags = span?.spanContext().traceFlags;

  return context.with(
    context.active()
      .with(Symbol.for('trace-id'), traceId)
      .with(Symbol.for('span-id'), spanId),
    fn
  );
}

/**
 * Restore trace context in worker threads
 */
export function restoreTraceContext(ctx) {
  const traceId = ctx.get(Symbol.for('trace-id'));
  const spanId = ctx.get(Symbol.for('span-id'));

  // Create synthetic span for context
  return {
    traceId,
    spanId,
    isRemote: true
  };
}
```

---

## Part 8: Dashboard & Reporting

### 8.1 Real-Time Dashboard Queries

```javascript
/**
 * Generate real-time dashboard data
 */
export async function getDashboardSnapshot(ks) {
  return {
    currentLoad: await getCurrentLoad(ks),
    topOperations: await getTopOperationsByFrequency(ks),
    slowestOperations: await getSlowOperations(ks, 10),
    anomalies: await getRecentAnomalies(ks, 100),
    budgetStatus: await getBudgetComplianceStatus(ks),
    sloStatus: await getSLOStatus(ks),
    systemHealth: await getSystemHealth(ks),
    timestamp: new Date().toISOString()
  };
}

async function getCurrentLoad(ks) {
  const sparql = `
    PREFIX perf: <https://gitvan.dev/performance#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

    SELECT
      (COUNT(?m) AS ?operationCount)
      (AVG(?duration) AS ?avgDuration)
      (AVG(?cpuPercent) AS ?avgCPU)
      (AVG(?memoryUsed) AS ?avgMemory)
    WHERE {
      ?m a perf:Measurement ;
         perf:duration ?duration ;
         perf:cpuPercent ?cpuPercent ;
         perf:memoryUsed ?memoryUsed ;
         perf:timestamp ?timestamp .

      FILTER(?timestamp >= NOW() - PT5M)
    }
  `;

  const result = await ks.query(sparql);
  return {
    operationsPerMinute: parseInt(result[0].operationCount.value) / 5,
    avgDuration: parseFloat(result[0].avgDuration.value),
    avgCPU: parseFloat(result[0].avgCPU.value),
    avgMemory: parseFloat(result[0].avgMemory.value)
  };
}

async function getTopOperationsByFrequency(ks, limit = 10) {
  const sparql = `
    PREFIX perf: <https://gitvan.dev/performance#>

    SELECT ?operation (COUNT(?m) AS ?count) (AVG(?duration) AS ?avgDuration)
    WHERE {
      ?m a perf:Measurement ;
         perf:operation ?operation ;
         perf:duration ?duration ;
         perf:timestamp ?timestamp .

      FILTER(?timestamp >= NOW() - PT1H)
    }
    GROUP BY ?operation
    ORDER BY DESC(?count)
    LIMIT ${limit}
  `;

  const results = await ks.query(sparql);
  return results.map(r => ({
    operation: r.operation.value,
    frequency: parseInt(r.count.value),
    avgDuration: parseFloat(r.avgDuration.value)
  }));
}
```

### 8.2 Report Generation

```javascript
/**
 * Generate comprehensive performance report
 */
export async function generatePerformanceReport(ks, dateRange = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dateRange);
  const endDate = new Date();

  return {
    title: `GitVan Performance Report: ${startDate.toDateString()} to ${endDate.toDateString()}`,
    dateRange: `${dateRange} days`,
    generatedAt: new Date().toISOString(),

    executive: await generateExecutiveSummary(ks, startDate, endDate),
    operations: await generateOperationDetails(ks, startDate, endDate),
    anomalies: await generateAnomalyReport(ks, startDate, endDate),
    budgets: await generateBudgetReport(ks, startDate, endDate),
    slos: await generateSLOReport(ks, startDate, endDate),
    recommendations: await generateRecommendations(ks, startDate, endDate),

    // Visualizations (data for charting)
    charts: {
      performanceTrend: await generatePerformanceTrendData(ks, startDate, endDate),
      anomalyTimeline: await generateAnomalyTimeline(ks, startDate, endDate),
      resourceDistribution: await generateResourceDistribution(ks, startDate, endDate)
    }
  };
}

async function generateExecutiveSummary(ks, start, end) {
  const sparql = `
    PREFIX perf: <https://gitvan.dev/performance#>

    SELECT
      (COUNT(?m) AS ?totalOperations)
      (AVG(?duration) AS ?avgLatency)
      (COUNT(?anomaly) / COUNT(?m) * 100 AS ?anomalyRate)
      (SUM(CASE WHEN ?duration > ?budget THEN 1 ELSE 0 END) AS ?budgetViolations)
    WHERE {
      ?m a perf:Measurement ;
         perf:duration ?duration ;
         perf:timestamp ?timestamp .

      OPTIONAL { ?anom perf:measurement ?m . BIND(?anom AS ?anomaly) }
      OPTIONAL {
        ?m perf:operation ?op .
        ?b perf:forOperation ?op ;
           perf:maxDuration ?budget .
      }

      FILTER(?timestamp >= "${start.toISOString()}" && ?timestamp <= "${end.toISOString()}")
    }
  `;

  const result = await ks.query(sparql);
  return {
    totalOperations: parseInt(result[0].totalOperations.value),
    averageLatency: parseFloat(result[0].avgLatency.value),
    anomalyRate: parseFloat(result[0].anomalyRate.value || 0),
    budgetViolations: parseInt(result[0].budgetViolations.value || 0)
  };
}
```

---

## Part 9: Implementation Roadmap

### Phase 1: Enhanced Metrics Collection (Weeks 1-2)

**Objectives:**
- Extend RDFPerformanceMonitor to capture 20+ metrics
- Implement extended measurement recording
- Update performance ontology

**Deliverables:**
- [ ] Extended metrics collectors (memory, CPU, I/O, event loop)
- [ ] Updated performance-ontology.ttl
- [ ] recordExtendedMeasurement() method
- [ ] Unit tests for new metrics
- [ ] Integration tests with usePerformanceMonitor

**Files to Create/Modify:**
- `src/performance/metrics/memory-metrics.mjs` (NEW)
- `src/performance/metrics/cpu-metrics.mjs` (NEW)
- `src/performance/metrics/io-metrics.mjs` (NEW)
- `src/performance/RDFPerformanceMonitor.mjs` (MODIFY)
- `src/rdf/ontologies/performance-ontology.ttl` (MODIFY)

### Phase 2: Advanced Analytics (Weeks 3-4)

**Objectives:**
- Implement statistical analysis engine
- Add moving window analysis and change point detection
- Correlation and causality detection

**Deliverables:**
- [ ] StatisticalAnalysis module
- [ ] MovingWindowAnalyzer
- [ ] ChangePointDetector
- [ ] CorrelationAnalyzer with lag detection
- [ ] Comprehensive test suite

**Files to Create:**
- `src/performance/analytics/statistical-analysis.mjs` (NEW)
- `src/performance/analytics/moving-window.mjs` (NEW)
- `src/performance/analytics/change-point.mjs` (NEW)
- `src/performance/analytics/correlation-advanced.mjs` (NEW)
- `tests/performance/advanced-analytics.test.mjs` (NEW)

### Phase 3: Real-Time Alerting (Weeks 5-6)

**Objectives:**
- Implement SLA definition framework
- Create real-time alert engine
- Build multi-channel alert router

**Deliverables:**
- [ ] SLAMonitor class with compliance checking
- [ ] AlertRouter with handler system
- [ ] Alert storage and audit trail
- [ ] Integration with Slack, Email, PagerDuty
- [ ] Git-native audit logging

**Files to Create:**
- `src/performance/alerting/sla-monitor.mjs` (NEW)
- `src/performance/alerting/alert-router.mjs` (NEW)
- `src/performance/alerting/handlers/slack.mjs` (NEW)
- `src/performance/alerting/handlers/email.mjs` (NEW)
- `src/performance/alerting/handlers/git-audit.mjs` (NEW)
- `src/rdf/ontologies/sla-ontology.ttl` (NEW)

### Phase 4: OpenTelemetry Integration (Weeks 7-8)

**Objectives:**
- Integrate OpenTelemetry for distributed tracing
- Implement span creation and context propagation
- Add trace context to RDF measurements

**Deliverables:**
- [ ] OpenTelemetry exporter setup
- [ ] TracedMeasurement wrapper
- [ ] Span-to-RDF correlation
- [ ] Worker thread trace context restoration
- [ ] Integration tests

**Files to Create:**
- `src/performance/tracing/otel-integration.mjs` (NEW)
- `src/performance/tracing/traced-measurement.mjs` (NEW)
- `src/performance/tracing/context-propagation.mjs` (NEW)
- `config/otel-config.mjs` (NEW)

### Phase 5: Historical Analysis & Capacity Planning (Weeks 9-10)

**Objectives:**
- Implement historical baselines
- Add capacity forecasting
- Create historical comparison queries

**Deliverables:**
- [ ] Baseline computation engine
- [ ] Capacity forecasting with ARIMA
- [ ] Historical comparison reports
- [ ] Trend detection and prediction

**Files to Create:**
- `src/performance/analysis/historical-baseline.mjs` (NEW)
- `src/performance/analysis/capacity-planner.mjs` (NEW)
- `src/performance/analysis/forecasting.mjs` (NEW)

### Phase 6: Dashboards & Reporting (Weeks 11-12)

**Objectives:**
- Build real-time dashboard queries
- Generate comprehensive reports
- Create visualization data structures

**Deliverables:**
- [ ] Dashboard data aggregation
- [ ] Report generation engine
- [ ] Visualization data formatters
- [ ] Interactive query builder

**Files to Create:**
- `src/performance/dashboards/dashboard-queries.mjs` (NEW)
- `src/performance/dashboards/report-generator.mjs` (NEW)
- `src/performance/dashboards/visualization-formatter.mjs` (NEW)

### Phase 7: Testing & Documentation (Weeks 13-14)

**Objectives:**
- Comprehensive testing across all modules
- Performance integration tests
- Documentation and examples

**Deliverables:**
- [ ] Integration test suite (500+ tests)
- [ ] Performance benchmark suite
- [ ] API documentation
- [ ] Integration guide
- [ ] Example dashboards and reports

### Phase 8: Optimization & Performance Tuning (Weeks 15-16)

**Objectives:**
- Optimize SPARQL queries
- Add query caching
- Implement incremental updates

**Deliverables:**
- [ ] Query optimizer module
- [ ] SPARQL query caching
- [ ] Incremental RDF updates
- [ ] Performance tuning guide

---

## Part 10: Git-Native Implementation Details

### 10.1 Performance Refs Structure

```
refs/performance/
├── measurements/          # Current measurement data
│   ├── HEAD              # Latest snapshot
│   ├── 2026-01-10        # Daily snapshot
│   └── 2026-01-09
├── budgets/              # Performance budgets
│   ├── HEAD
│   └── archive/
├── anomalies/            # Detected anomalies
│   └── HEAD
├── slos/                 # SLA definitions
│   └── HEAD
└── audit/                # Audit trail
    ├── 2026-01-10
    └── 2026-01-09
```

### 10.2 Measurement Storage Format

```
# measurements/HEAD object format
measurements/
├── operations/
│   ├── sparql-query.json
│   ├── git-commit.json
│   └── hook-evaluation.json
├── aggregates/
│   ├── hourly-summary.json
│   └── daily-summary.json
└── metadata.json

# git-commit.json structure
{
  "operation": "git-commit",
  "samples": 150,
  "period": "2026-01-10T00:00:00Z to 2026-01-10T23:59:59Z",
  "metrics": {
    "duration": {"mean": 125.4, "stddev": 32.1, "p95": 189.2, "p99": 251.8},
    "memory": {"mean": 2048000, "stddev": 512000, ...},
    "cpu": {"mean": 35.2, "stddev": 15.8, ...}
  },
  "anomalies": [
    {"type": "BudgetViolation", "count": 3, "timestamp": "..."}
  ],
  "budgetCompliance": 0.98,
  "signature": "sha256-hash"
}
```

### 10.3 Audit Trail in Git Notes

```bash
# Add measurement audit entry
git notes --ref=perf-audit add -m "
Measurement Audit
Operation: sparql-query
Timestamp: 2026-01-10T12:34:56Z
Duration: 45.3ms
Memory: 2048000 bytes
CPU: 35.2%
Status: OK
Anomalies: None
"

# View audit trail
git log --notes=perf-audit --oneline

# Verify signature
git config gpg.program /path/to/verify-perf-signature
```

---

## Part 11: Migration Strategy

### 11.1 Backward Compatibility

The expanded monitoring system maintains 100% backward compatibility:

```javascript
// Old API continues to work
await monitor.recordMeasurement('operation', 45.5, 2048000, 35.2, 512000);

// New extended API
await monitor.recordExtendedMeasurement('operation', startTime, endTime,
  memBefore, memAfter, cpuBefore, cpuAfter, ioBefore, ioAfter, ...);

// Both store in same RDF triple format
```

### 11.2 Feature Flags

```javascript
// Enable/disable features via config
gitvan.config.js:
{
  performance: {
    enableExtendedMetrics: true,
    enableOTelIntegration: true,
    enableRealTimeAlerting: true,
    enableCapacityPlanning: true,
    enableDashboards: true
  }
}
```

### 11.3 Data Migration

```javascript
// Migrate existing measurements to extended format
async function migratePerformanceData(fromVersion = '4.0.0', toVersion = '4.1.0') {
  const sparql = `
    PREFIX perf: <https://gitvan.dev/performance#>

    SELECT ?m ?duration ?memory ?cpu ?diskIO
    WHERE {
      ?m a perf:Measurement ;
         perf:duration ?duration ;
         perf:memoryUsed ?memory ;
         perf:cpuPercent ?cpu ;
         perf:diskIO ?diskIO .
    }
  `;

  const results = await ks.query(sparql);

  // Transform and re-insert with additional computed properties
  for (const row of results) {
    // Add missing metrics by inference or estimation
    // Update RDF type to perf:ExtendedMeasurement
    // Update schema version
  }
}
```

---

## Part 12: Success Metrics

### 12.1 Adoption Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| **Operations monitored** | 50+ | Week 2 |
| **Measurement throughput** | 10k/min | Week 4 |
| **SPARQL query latency** | <100ms (p95) | Week 6 |
| **Alert delivery latency** | <5s | Week 8 |
| **Anomaly detection accuracy** | >95% | Week 10 |
| **Capacity forecast accuracy** | >80% | Week 12 |

### 12.2 Quality Metrics

| Metric | Target |
|--------|--------|
| **Test coverage** | >90% |
| **SPARQL query optimization** | 50% faster than baseline |
| **RDF store index efficiency** | <500ms for 100k quads |
| **Alert false positive rate** | <5% |
| **Data retention reliability** | 99.99% (4 nines) |

### 12.3 Operational Metrics

| Metric | Target |
|--------|--------|
| **Dashboard response time** | <500ms |
| **Report generation time** | <60s |
| **Memory overhead per 10k measurements** | <50MB |
| **Disk usage per 90-day window** | <1GB |

---

## Part 13: Known Limitations & Future Enhancements

### 13.1 Current Limitations

1. **Memory-based statistics** - Last 1000 samples only for correlation/trend
2. **No true incremental updates** - Full query on each analysis
3. **Single-node only** - No distributed tracing across services
4. **Limited real-time** - Polling-based alerting, not event-driven
5. **No machine learning** - Simple statistical models only

### 13.2 Future Enhancements (v4.2+)

- **Machine Learning**: Anomaly detection using Isolation Forest, One-Class SVM
- **Distributed Tracing**: Full OpenTelemetry W3C trace context support
- **Time-Series Database**: Optional SQLite/TimescaleDB backend for faster queries
- **Real-Time Streaming**: Event-driven architecture with WebSockets
- **Advanced Visualization**: Interactive Grafana dashboards
- **Cost Analysis**: Cloud resource cost attribution
- **AI-Driven Recommendations**: Auto-tuning suggestions via Claude API

---

## Conclusion

This integration plan provides a comprehensive roadmap for transforming GitVan's performance monitoring from basic metrics tracking to an enterprise-grade observability platform. The phased approach ensures:

1. **Iterative delivery** with working software at each phase
2. **Backward compatibility** maintaining existing API contracts
3. **Extensibility** for future enhancements
4. **Operational excellence** with automated monitoring and alerting
5. **Data-driven insights** for capacity planning and optimization

The RDF-based foundation enables semantic analysis impossible with traditional metrics systems, while the Git-native storage keeps everything auditable and version-controlled.

**Next Steps:**
1. Review and approve Phase 1 (Weeks 1-2)
2. Set up development environment
3. Create feature branches for each module
4. Establish performance baselines
5. Begin implementation with TDD approach

---

**Document Status:** Ready for Review
**Last Updated:** January 10, 2026
**Contact:** GitVan Team (dev@gitvan.dev)
