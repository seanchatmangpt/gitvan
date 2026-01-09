# Phase 2 Week 1 - Quick Reference Guide

## RDFPerformanceMonitor API Quick Reference

### Initialization

```javascript
import { RDFPerformanceMonitor } from "gitvan/performance/RDFPerformanceMonitor";

const monitor = new RDFPerformanceMonitor({
  enableBudgets: true,              // Enable budget enforcement
  enableAnomalyDetection: true,     // Enable automatic anomaly detection
  anomalyThreshold: 2.0,            // Std deviations for outlier detection
  correlationThreshold: 0.7,        // Minimum correlation coefficient
  maxHistoryDays: 90                // Retention period
});

await monitor.initialize();
```

### Recording Measurements

```javascript
await monitor.recordMeasurement(
  operationName,    // string: "sparql-query", "git-commit", etc.
  duration,         // number: milliseconds
  memoryUsed,       // number: bytes (optional, default: 0)
  cpuPercent,       // number: 0-100 (optional, default: 0)
  diskIO,           // number: bytes (optional, default: 0)
  context           // object: additional metadata (optional)
);

// Example
await monitor.recordMeasurement(
  "sparql-query",
  45.5,
  2048000,
  35.2,
  512000,
  { complexity: "medium", user: "john" }
);
```

### Setting Budgets

```javascript
await monitor.setBudget(operationName, {
  maxDuration: 100,      // milliseconds
  maxMemory: 2000000,    // bytes
  maxCPU: 80,            // percent
  maxDiskIO: 1000000     // bytes
});

// Example
await monitor.setBudget("workflow-execution", {
  maxDuration: 500,
  maxMemory: 10485760,
  maxCPU: 90
});
```

### Querying Measurements

```javascript
// Get measurements for operation (last hour)
const measurements = await monitor.getMeasurements("sparql-query", 3600000);

// Get measurements for custom time window (30 minutes)
const recent = await monitor.getMeasurements("git-commit", 1800000);

// Result format
[
  {
    id: "meas-uuid",
    operation: "sparql-query",
    duration: 45.5,
    memory: 2048000,
    cpu: 35.2,
    diskIO: 512000,
    timestamp: "2026-01-09T10:30:00Z",
    success: true
  },
  // ...
]
```

### Getting Anomalies

```javascript
// All unresolved anomalies
const anomalies = await monitor.getAnomalies({ resolved: false });

// Critical anomalies only
const critical = await monitor.getAnomalies({
  resolved: false,
  severity: "critical"
});

// Anomalies for specific operation
const opAnomalies = await monitor.getAnomalies({
  resolved: false,
  operation: "sparql-query"
});

// Limited results
const top10 = await monitor.getAnomalies({ resolved: false, limit: 10 });

// Result format
[
  {
    id: "anom-uuid",
    type: "BudgetViolation",
    severity: "critical",
    description: "Duration 150ms exceeds budget 100ms",
    detectedAt: "2026-01-09T10:30:01Z",
    measurementId: "meas-uuid",
    operation: "sparql-query"
  },
  // ...
]
```

### Checking Budget Violations

```javascript
const violations = await monitor.getBudgetViolations();

// Result format
[
  {
    operation: "sparql-query",
    count: 5,
    maxViolation: 250.5
  },
  // ...
]
```

### Correlation Analysis

```javascript
const correlations = await monitor.getCorrelations();

// Result format
[
  {
    operation1: "sparql-query",
    operation2: "git-commit",
    metric: "cpu",
    correlation: "0.852"  // Strong positive correlation
  },
  // ...
]
```

### Trend Analysis

```javascript
// 90-day trend (default)
const trend = await monitor.getTrendAnalysis("sparql-query", 90);

// 30-day trend
const recentTrend = await monitor.getTrendAnalysis("git-commit", 30);

// Result format
{
  operation: "sparql-query",
  dataPoints: 1250,
  trend: "degrading",         // "improving", "degrading", or "stable"
  slope: "0.0523",           // Positive = getting slower
  direction: "degrading",
  startDate: "2025-10-11T00:00:00Z",
  endDate: "2026-01-09T10:30:00Z",
  currentAvg: "52.15",
  previousAvg: "45.23"
}
```

### Statistics

```javascript
const stats = await monitor.getStats("sparql-query");

// Result format
{
  operation: "sparql-query",
  count: 1250,
  duration: {
    mean: "45.23",
    median: "43.50",
    min: "12.00",
    max: "125.00",
    p50: "43.50",
    p95: "85.20",
    p99: "102.50",
    stddev: "15.30"
  },
  memory: { /* same structure */ },
  cpu: { /* same structure */ }
}
```

## SPARQL Query Library

```javascript
import * as queries from "gitvan/performance/sparql-queries";

// Budget violations
const budgetQuery = queries.budgetViolationsQuery;
const results = await monitor.core.query(budgetQuery);

// Anomaly detection (CONSTRUCT)
const anomalyQuery = queries.anomalyDetectionQuery(1.5);  // 1.5x threshold
const anomalies = await monitor.core.query(anomalyQuery);

// Slow operations
const slowQuery = queries.slowOperationsQuery("sparql-query", since, 100);
const slow = await monitor.core.query(slowQuery);

// Memory leak detection
const leakQuery = queries.memoryLeakDetectionQuery(7);  // 7 days
const leaks = await monitor.core.query(leakQuery);

// I/O bound operations
const ioQuery = queries.ioBoundOperationsQuery(1000000, 50);
const ioBound = await monitor.core.query(ioQuery);

// CPU bound operations
const cpuQuery = queries.cpuBoundOperationsQuery(80, 100000);
const cpuBound = await monitor.core.query(cpuQuery);

// Error rates
const errorQuery = queries.errorRateQuery("sparql-query");
const errors = await monitor.core.query(errorQuery);
```

## Common Patterns

### Track Async Operations

```javascript
async function trackOperation(operationName, fn, context = {}) {
  const startTime = performance.now();
  const startMemory = process.memoryUsage().heapUsed;

  try {
    const result = await fn();

    const duration = performance.now() - startTime;
    const memoryUsed = process.memoryUsage().heapUsed - startMemory;

    await monitor.recordMeasurement(
      operationName,
      duration,
      memoryUsed,
      0, 0,
      context
    );

    return result;
  } catch (error) {
    // Record failed operation
    const duration = performance.now() - startTime;
    await monitor.recordMeasurement(
      operationName,
      duration,
      0, 0, 0,
      { ...context, error: error.message, success: false }
    );
    throw error;
  }
}

// Usage
const result = await trackOperation("complex-query", async () => {
  return await database.query("SELECT ...");
}, { userId: "john", queryType: "analytics" });
```

### Automatic Budget Alerts

```javascript
async function checkBudgets() {
  const violations = await monitor.getBudgetViolations();

  for (const violation of violations) {
    if (violation.count > 10) {
      console.warn(
        `⚠️  Budget violation: ${violation.operation} ` +
        `has ${violation.count} violations. ` +
        `Max violation: ${violation.maxViolation.toFixed(2)}ms`
      );

      // Send alert to monitoring system
      await sendAlert({
        type: "budget_violation",
        operation: violation.operation,
        count: violation.count,
        severity: "high"
      });
    }
  }
}

// Run periodically
setInterval(checkBudgets, 60000); // Every minute
```

### Performance Dashboard Data

```javascript
async function getDashboardData() {
  const operations = ["sparql-query", "git-commit", "workflow-execution"];

  const dashboard = {
    timestamp: new Date().toISOString(),
    operations: []
  };

  for (const op of operations) {
    const stats = await monitor.getStats(op);
    const trend = await monitor.getTrendAnalysis(op, 7);
    const anomalies = await monitor.getAnomalies({
      operation: op,
      resolved: false,
      limit: 5
    });

    dashboard.operations.push({
      name: op,
      stats,
      trend: trend.direction,
      anomalyCount: anomalies.length,
      recentAnomalies: anomalies
    });
  }

  return dashboard;
}
```

### Export Metrics

```javascript
async function exportMetrics() {
  const exportData = await monitor.exportToRDF();

  console.log(`Total quads: ${exportData.quadCount}`);
  console.log(`Operations: ${exportData.operations.join(", ")}`);
  console.log(`Budgets: ${exportData.budgets.join(", ")}`);

  // Could export to file, send to external system, etc.
  return exportData;
}
```

## Anomaly Types Reference

| Type | Description | Auto-Detected |
|------|-------------|---------------|
| **BudgetViolation** | Exceeds configured budget | ✅ Yes |
| **Outlier** | >2-3 std deviations from mean | ✅ Yes |
| **IoBoundOperation** | High disk I/O, low CPU | ✅ Yes |
| **CpuBoundOperation** | High CPU, low disk I/O | ✅ Yes |
| **TrendChange** | Significant trend shift | ❌ Manual |
| **HighVariance** | Inconsistent performance | ❌ Manual |
| **ConsistentlyHigh** | Always slow | ❌ Manual |
| **PotentialMemoryLeak** | Memory trending up | ❌ Manual |

## Performance Budgets by Operation Type

Recommended budgets for common operations:

```javascript
// SPARQL queries
await monitor.setBudget("sparql-query", {
  maxDuration: 100,     // 100ms
  maxMemory: 2097152,   // 2MB
  maxCPU: 70
});

// Git operations
await monitor.setBudget("git-commit", {
  maxDuration: 150,     // 150ms
  maxMemory: 4194304,   // 4MB
  maxCPU: 80
});

// Workflow execution
await monitor.setBudget("workflow-execution", {
  maxDuration: 500,     // 500ms
  maxMemory: 10485760,  // 10MB
  maxCPU: 90
});

// Template rendering
await monitor.setBudget("template-render", {
  maxDuration: 50,      // 50ms
  maxMemory: 1048576,   // 1MB
  maxCPU: 60
});
```

## Troubleshooting

### High Memory Usage

```javascript
// Check for memory leaks
const leakQuery = queries.memoryLeakDetectionQuery(7);
const leaks = await monitor.core.query(leakQuery);

if (leaks.length > 0) {
  console.log("Potential memory leaks detected:");
  leaks.forEach(leak => {
    console.log(`  ${leak.operation.value}: ` +
                `avg ${(leak.avgMemory.value / 1024 / 1024).toFixed(2)}MB`);
  });
}
```

### Slow Operations

```javascript
// Find slowest operations
const slowQuery = queries.slowOperationsQuery("*", null, 20);
const slow = await monitor.core.query(slowQuery);

slow.forEach((op, i) => {
  console.log(`${i + 1}. ${op.operation.value}: ${op.duration.value}ms`);
});
```

### Correlated Bottlenecks

```javascript
// Find operations that slow down together
const correlations = await monitor.getCorrelations();

correlations.forEach(corr => {
  if (parseFloat(corr.correlation) > 0.9) {
    console.log(`Strong correlation: ${corr.operation1} ↔ ${corr.operation2}`);
  }
});
```

## Integration Examples

### With Workflow Engine

```javascript
import { WorkflowEngine } from "gitvan/workflow/workflow-engine";
import { RDFPerformanceMonitor } from "gitvan/performance/RDFPerformanceMonitor";

const engine = new WorkflowEngine();
await engine.initialize();

const monitor = new RDFPerformanceMonitor();
await monitor.initialize(engine.core); // Share RDF store

// Track workflow execution
async function executeWorkflowWithTracking(workflow) {
  const start = performance.now();

  try {
    const result = await engine.execute(workflow);
    const duration = performance.now() - start;

    await monitor.recordMeasurement(
      "workflow-execution",
      duration,
      process.memoryUsage().heapUsed,
      0, 0,
      { workflow: workflow.name, steps: workflow.steps.length }
    );

    return result;
  } catch (error) {
    throw error;
  }
}
```

### With Git Operations

```javascript
import { useGit } from "gitvan/composables/git";
import { RDFPerformanceMonitor } from "gitvan/performance/RDFPerformanceMonitor";

const git = useGit();
const monitor = new RDFPerformanceMonitor();
await monitor.initialize();

// Wrap git operations
async function commitWithTracking(message) {
  const start = performance.now();

  try {
    const result = await git.commit(message);
    const duration = performance.now() - start;

    await monitor.recordMeasurement(
      "git-commit",
      duration,
      0, 0, 0,
      { message, files: result.files }
    );

    return result;
  } catch (error) {
    throw error;
  }
}
```

---

**Last Updated:** January 9, 2026
**GitVan Version:** 3.0.0+
