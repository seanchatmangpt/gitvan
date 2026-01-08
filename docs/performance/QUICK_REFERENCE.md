# Bree Job System Optimizations - Quick Reference

**GitVan v4.0.0 - Performance Optimizations**

## Quick Start

### Basic Usage

```javascript
import { getJobBridge } from "./src/jobs/job-bridge.mjs";
import { withGitVan } from "./src/core/context.mjs";

// Create optimized job bridge
const bridge = getJobBridge({
  cwd: process.cwd(),
  gitInfoCacheTTL: 60000,  // 60 seconds
  maxWorkerFiles: 1000,
});

// Execute job with all optimizations enabled
await withGitVan({ cwd: process.cwd() }, async () => {
  const jobDef = {
    id: "my-job",
    name: "my-job",
    file: "/path/to/job.mjs",
  };

  const result = await bridge.executeJobWithLock(jobDef, {
    payload: { data: "value" },
  });

  console.log(result);
});
```

### Check Performance Metrics

```javascript
const metrics = bridge.getMetrics();

console.log("Performance Metrics:");
console.log("===================");
console.log(`Worker cache hit rate: ${metrics.workerCacheHitRate}`);
console.log(`Git info cache hit rate: ${metrics.gitInfoCacheHitRate}`);
console.log(`Receipts queued: ${metrics.receiptsQueued}`);
console.log(`Worker files cleaned: ${metrics.workerFilesCleanedUp}`);
```

---

## Configuration Presets

### High-Frequency Jobs (Executed Often)

```javascript
const bridge = getJobBridge({
  // Larger caches for better hit rates
  maxWorkerFiles: 2000,
  workerFileMaxAge: 7200000,   // 2 hours
  gitInfoCacheTTL: 120000,     // 2 minutes

  // Less frequent cleanup
  cleanupInterval: 300000,      // 5 minutes
});
```

**Best for:** Continuous integration, automated testing, scheduled tasks

### Low-Frequency Jobs (Executed Rarely)

```javascript
const bridge = getJobBridge({
  // Smaller caches to save memory
  maxWorkerFiles: 500,
  workerFileMaxAge: 1800000,   // 30 minutes
  gitInfoCacheTTL: 30000,      // 30 seconds

  // More frequent cleanup
  cleanupInterval: 30000,       // 30 seconds
});
```

**Best for:** Manual jobs, one-off tasks, development

### Memory-Constrained Environments

```javascript
const bridge = getJobBridge({
  // Minimal caching
  maxWorkerFiles: 200,
  workerFileMaxAge: 900000,    // 15 minutes
  gitInfoCacheTTL: 15000,      // 15 seconds

  // Aggressive cleanup
  cleanupInterval: 15000,       // 15 seconds
});
```

**Best for:** Embedded systems, containers with memory limits

### Long-Running Processes

```javascript
const bridge = getJobBridge({
  // Balanced configuration
  maxWorkerFiles: 1000,
  workerFileMaxAge: 3600000,   // 1 hour
  gitInfoCacheTTL: 60000,      // 60 seconds

  // Regular cleanup
  cleanupInterval: 60000,       // 1 minute

  // Adaptive lock TTL
  defaultLockTTL: 300000,      // 5 minutes
  minLockTTL: 30000,           // 30 seconds
  maxLockTTL: 600000,          // 10 minutes
});
```

**Best for:** Daemons, servers, background workers

---

## Common Operations

### Force Flush Receipts

```javascript
// Before shutdown or when needed
await bridge.receiptQueue.forceFlush();
```

### Invalidate Git Info Cache

```javascript
// After git operations
await git.commit("message");
bridge.invalidateGitInfoCache();
```

### Manual Cleanup

```javascript
// Cleanup old worker files
const cleanedUp = await bridge.cleanupOldWorkerFiles();
console.log(`Cleaned up ${cleanedUp} files`);
```

### Reset Metrics

```javascript
// Reset performance metrics
bridge.resetMetrics();
```

---

## Performance Targets

| Metric | Target | How to Check |
|--------|--------|--------------|
| Simple job execution | < 100ms | Benchmark test |
| Job with payload | < 150ms | Benchmark test |
| Job with git info | < 200ms | Benchmark test |
| 100 sequential jobs | < 15s | Benchmark test |
| Memory per job | < 50KB | Memory profiling |
| Worker cache hit rate | > 80% | `metrics.workerCacheHitRate` |
| Git info cache hit rate | > 70% | `metrics.gitInfoCacheHitRate` |

---

## Troubleshooting

### Low Cache Hit Rates

**Symptom:** `workerCacheHitRate < 70%`

**Causes:**
- Job definitions changing frequently
- Different job IDs for same job
- Cache eviction too aggressive

**Solutions:**
```javascript
// Increase cache size
const bridge = getJobBridge({
  maxWorkerFiles: 2000,
  workerFileMaxAge: 7200000,
});

// Check metrics
const metrics = bridge.getMetrics();
console.log(`Cache size: ${metrics.workerCacheSize}`);
console.log(`Files count: ${metrics.workerFilesCount}`);
```

### High Memory Usage

**Symptom:** Memory usage growing over time

**Causes:**
- Cache size too large
- Cleanup interval too long
- Worker files not being deleted

**Solutions:**
```javascript
// Reduce cache size
const bridge = getJobBridge({
  maxWorkerFiles: 500,
  workerFileMaxAge: 1800000,
  cleanupInterval: 30000,
});

// Check cleanup metrics
const metrics = bridge.getMetrics();
console.log(`Files cleaned: ${metrics.workerFilesCleanedUp}`);
```

### Stale Git Info

**Symptom:** Jobs using old git information

**Causes:**
- Git info cache TTL too long
- Cache not invalidated after git operations

**Solutions:**
```javascript
// Reduce TTL
const bridge = getJobBridge({
  gitInfoCacheTTL: 30000, // 30 seconds
});

// Invalidate manually
await git.commit("message");
bridge.invalidateGitInfoCache();
```

### Receipt Queue Backlog

**Symptom:** `receiptQueueSize > 100`

**Causes:**
- High job execution rate
- Slow receipt writes
- Queue not flushing

**Solutions:**
```javascript
// Check queue size
const metrics = bridge.getMetrics();
console.log(`Queue size: ${metrics.receiptQueueSize}`);

// Force flush
await bridge.receiptQueue.forceFlush();

// Increase batch size (advanced)
bridge.receiptQueue.batchSize = 20;
bridge.receiptQueue.flushInterval = 500;
```

---

## Monitoring Script

```javascript
// monitor-performance.mjs
import { getJobBridge } from "./src/jobs/job-bridge.mjs";

const bridge = getJobBridge();

// Monitor every minute
setInterval(() => {
  const metrics = bridge.getMetrics();

  console.log("\n=== Performance Metrics ===");
  console.log(`Worker cache hit rate: ${metrics.workerCacheHitRate}`);
  console.log(`Git info cache hit rate: ${metrics.gitInfoCacheHitRate}`);
  console.log(`Worker cache size: ${metrics.workerCacheSize}`);
  console.log(`Worker files count: ${metrics.workerFilesCount}`);
  console.log(`Receipt queue size: ${metrics.receiptQueueSize}`);
  console.log(`Files cleaned: ${metrics.workerFilesCleanedUp}`);

  // Alert on issues
  if (parseFloat(metrics.workerCacheHitRate) < 70) {
    console.warn("⚠️  Low worker cache hit rate!");
  }
  if (parseFloat(metrics.gitInfoCacheHitRate) < 60) {
    console.warn("⚠️  Low git info cache hit rate!");
  }
  if (metrics.workerFilesCount > 1500) {
    console.warn("⚠️  High worker file count!");
  }
  if (metrics.receiptQueueSize > 100) {
    console.warn("⚠️  Large receipt queue backlog!");
  }
}, 60000);

console.log("Performance monitoring started...");
```

---

## Running Benchmarks

```bash
# Run all performance benchmarks
npm test -- tests/performance/bree-benchmarks.test.mjs

# Run specific suites
npm test -- tests/performance/bree-benchmarks.test.mjs -t "Baseline Performance"
npm test -- tests/performance/bree-benchmarks.test.mjs -t "Worker File Caching"
npm test -- tests/performance/bree-benchmarks.test.mjs -t "Memory Usage"

# Run with verbose output
npm test -- tests/performance/bree-benchmarks.test.mjs --reporter=verbose
```

---

## API Reference

### JobBridge Constructor Options

```typescript
interface JobBridgeOptions {
  cwd?: string;                    // Working directory
  workerDir?: string;              // Worker file directory

  // Worker file caching
  maxWorkerFiles?: number;         // Default: 1000
  workerFileMaxAge?: number;       // Default: 3600000 (1 hour)
  cleanupInterval?: number;        // Default: 60000 (1 minute)

  // Git info caching
  gitInfoCacheTTL?: number;        // Default: 60000 (60 seconds)

  // Adaptive lock TTL
  defaultLockTTL?: number;         // Default: 300000 (5 minutes)
  minLockTTL?: number;             // Default: 30000 (30 seconds)
  maxLockTTL?: number;             // Default: 600000 (10 minutes)
}
```

### Methods

```javascript
// Execute job with locking and receipts
await bridge.executeJobWithLock(jobDef, options)

// Get cached git info
const gitInfo = await bridge.getGitInfoCached()

// Invalidate git info cache
bridge.invalidateGitInfoCache()

// Get performance metrics
const metrics = bridge.getMetrics()

// Reset metrics
bridge.resetMetrics()

// Manual cleanup
const cleaned = await bridge.cleanupOldWorkerFiles()

// Calculate adaptive lock TTL
const ttl = bridge.calculateLockTTL(jobId)

// Graceful shutdown
await bridge.shutdown()
```

### Performance Metrics

```typescript
interface PerformanceMetrics {
  // Raw counters
  workerCacheHits: number;
  workerCacheMisses: number;
  gitInfoCacheHits: number;
  gitInfoCacheMisses: number;
  receiptsQueued: number;
  receiptsFlushed: number;
  workerFilesCleanedUp: number;

  // Calculated rates
  workerCacheHitRate: string;      // "85.5%"
  gitInfoCacheHitRate: string;     // "73.2%"

  // Current state
  workerCacheSize: number;
  workerFilesCount: number;
  receiptQueueSize: number;
  jobExecutionHistorySize: number;
}
```

---

## Best Practices

### ✅ DO

- Monitor performance metrics regularly
- Tune configuration for your workload
- Invalidate git cache after git operations
- Force flush receipts before shutdown
- Use appropriate cache sizes for your use case

### ❌ DON'T

- Set cache TTL too low (causes thrashing)
- Set cache size too high (wastes memory)
- Skip performance benchmarks
- Ignore low cache hit rates
- Run without monitoring in production

---

## Additional Resources

- **Detailed Guide:** `/docs/performance/bree-job-system-optimizations.md`
- **Before/After Comparison:** `/docs/performance/PERFORMANCE_SUMMARY.md`
- **Completion Report:** `/docs/performance/OPTIMIZATION_COMPLETION_REPORT.md`
- **Benchmark Tests:** `/tests/performance/bree-benchmarks.test.mjs`

---

**Last Updated:** January 8, 2026
**Version:** GitVan v4.0.0
