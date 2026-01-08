# Job System Performance Tuning Guide

GitVan v4.0.0 - Bree Integration

## Table of Contents

- [Configuration Options](#configuration-options)
- [Optimization Strategies](#optimization-strategies)
- [Memory Management](#memory-management)
- [Benchmarking and Profiling](#benchmarking-and-profiling)
- [Capacity Planning](#capacity-planning)
- [Optimization Checklist](#optimization-checklist)

---

## Configuration Options

### Worker Thread Pool Size

Bree uses Node.js worker threads for job execution. Control resource usage with these settings:

**gitvan.config.js:**
```javascript
export default {
  jobs: {
    dir: 'jobs',
    maxConcurrent: 10,  // Maximum concurrent jobs
    workerOptions: {
      // Worker thread options
      resourceLimits: {
        maxOldGenerationSizeMb: 512,
        maxYoungGenerationSizeMb: 64,
        codeRangeSizeMb: 64
      }
    }
  }
};
```

**Recommendations:**
- **Low-memory systems:** `maxConcurrent: 3-5`
- **Standard servers:** `maxConcurrent: 10-20`
- **High-performance:** `maxConcurrent: 50+`

**Trade-offs:**
- More concurrent jobs = higher throughput
- More concurrent jobs = more memory usage
- Optimal value depends on job complexity

---

### Job Timeout Settings

Control how long jobs can run before being terminated:

```javascript
// Global timeout (gitvan.config.js)
export default {
  jobs: {
    timeout: 300000  // 5 minutes default
  }
};
```

```javascript
// Per-job timeout
export const meta = {
  name: 'Long Running Job',
  timeout: 3600000  // 1 hour
};
```

```javascript
// Schedule-time timeout
await job.schedule('backup-job', {
  cron: '0 2 * * *',
  timeout: 1800000  // 30 minutes
});
```

**Best Practices:**
- Set reasonable timeouts to prevent hung jobs
- Use shorter timeouts for frequent jobs
- Use longer timeouts for batch operations
- Monitor timeout errors

---

### Context Caching

Cache job contexts to reduce overhead:

**BreeScheduler Configuration:**
```javascript
import { BreeScheduler } from 'gitvan';

const scheduler = new BreeScheduler({
  cwd: process.cwd(),
  closeWorkerAfterMs: 30000,  // Keep worker alive 30s
  removeCompleted: false,     // Don't remove completed jobs
  interval: 5000              // Check every 5s
});
```

**closeWorkerAfterMs:**
- **Lower values (1000-5000ms):** Less memory, more worker creation overhead
- **Higher values (30000-60000ms):** More memory, less overhead
- **Recommendation:** 5000ms for frequent jobs, 30000ms for infrequent

---

### Receipt Storage Strategy

Optimize receipt storage to reduce Git overhead:

```javascript
export default {
  receipts: {
    ref: 'refs/notes/gitvan/audit',
    retention: {
      days: 90,           // Keep receipts for 90 days
      maxCount: 10000     // Maximum receipts to retain
    },
    compression: true     // Compress receipt data
  }
};
```

**Cleanup Strategy:**
```javascript
import { useReceipt } from 'gitvan';

// Periodic cleanup job
export const meta = {
  name: 'Receipt Cleanup',
  desc: 'Clean old receipts'
};
export const cron = '0 3 * * 0';  // Weekly at 3 AM

export default async function run() {
  const receipt = useReceipt();

  const cleanup = await receipt.cleanup({
    olderThan: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    keepCount: 10000,
    dryRun: false
  });

  return {
    total: cleanup.total,
    deleted: cleanup.deleted,
    kept: cleanup.kept
  };
}
```

---

## Optimization Strategies

### Job Batching

Group multiple operations into a single job execution:

**Before (inefficient):**
```javascript
// Separate jobs for each user
export default async function backupUser({ payload }) {
  const user = payload.user;
  await backupUserData(user);
}

// Triggered 1000 times
for (const user of users) {
  await job.run('backup-user', { payload: { user } });
}
```

**After (optimized):**
```javascript
// Single job for all users
export default async function backupAllUsers({ payload }) {
  const users = payload.users;

  // Process in batches
  const batchSize = 100;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    await Promise.all(batch.map(user => backupUserData(user)));
  }

  return { usersProcessed: users.length };
}

// Triggered once
await job.run('backup-all-users', {
  payload: { users: allUsers }
});
```

**Benefits:**
- Reduced overhead (1 job instead of 1000)
- Better resource utilization
- Easier monitoring

---

### Parallel vs Sequential Execution

Use parallel execution when possible:

**Sequential (slow):**
```javascript
export default async function processData({ payload }) {
  const result1 = await fetchData(payload.source1);
  const result2 = await fetchData(payload.source2);
  const result3 = await fetchData(payload.source3);

  return { result1, result2, result3 };
}
```

**Parallel (fast):**
```javascript
export default async function processData({ payload }) {
  const [result1, result2, result3] = await Promise.all([
    fetchData(payload.source1),
    fetchData(payload.source2),
    fetchData(payload.source3)
  ]);

  return { result1, result2, result3 };
}
```

**With Error Handling:**
```javascript
export default async function processData({ payload }) {
  const results = await Promise.allSettled([
    fetchData(payload.source1),
    fetchData(payload.source2),
    fetchData(payload.source3)
  ]);

  const successful = results.filter(r => r.status === 'fulfilled');
  const failed = results.filter(r => r.status === 'rejected');

  return {
    successful: successful.length,
    failed: failed.length,
    results: successful.map(r => r.value)
  };
}
```

**When to Use:**
- **Parallel:** Independent operations (API calls, file I/O)
- **Sequential:** Dependent operations (must complete in order)
- **Hybrid:** Mix of both

---

### Context Caching for Repeated Operations

Cache expensive operations within a job:

**Without Caching:**
```javascript
export default async function processItems({ payload, ctx }) {
  const items = payload.items;

  for (const item of items) {
    const config = await loadConfig();  // Loaded 1000 times!
    const schema = await loadSchema();  // Loaded 1000 times!

    await processItem(item, config, schema);
  }
}
```

**With Caching:**
```javascript
export default async function processItems({ payload, ctx }) {
  const items = payload.items;

  // Load once
  const config = await loadConfig();
  const schema = await loadSchema();

  for (const item of items) {
    await processItem(item, config, schema);
  }
}
```

**Advanced Caching:**
```javascript
// Global cache (shared across job runs)
const cache = new Map();

export default async function processItems({ payload, ctx }) {
  // Check cache
  let config = cache.get('config');
  if (!config) {
    config = await loadConfig();
    cache.set('config', config);
  }

  // Use cached config
  for (const item of payload.items) {
    await processItem(item, config);
  }
}
```

---

### Worker File Reuse (Caching)

Bree reuses worker threads when possible. Optimize for reuse:

**Configuration:**
```javascript
const scheduler = new BreeScheduler({
  closeWorkerAfterMs: 60000,  // Keep workers alive 1 minute
  removeCompleted: false       // Don't remove completed jobs
});
```

**Benefits:**
- Reduced worker creation overhead
- Faster subsequent executions
- Lower memory churn

**Trade-offs:**
- Increased base memory usage
- Stale state if jobs modify globals

---

## Memory Management

### Monitoring createdWorkerFiles

Track worker file accumulation:

```javascript
import { getJobBridge } from 'gitvan';

async function monitorWorkerFiles() {
  const bridge = getJobBridge({ cwd: process.cwd() });

  console.log('Worker files created:', bridge.createdWorkerFiles.size);

  // List files
  for (const file of bridge.createdWorkerFiles) {
    const stats = await fs.stat(file);
    console.log(`  ${file}: ${(stats.size / 1024).toFixed(2)} KB`);
  }
}

// Run periodically
setInterval(monitorWorkerFiles, 60000);  // Every minute
```

---

### Setting Cleanup Policies

Implement automatic cleanup:

**1. On Shutdown:**
```javascript
process.on('SIGTERM', async () => {
  const job = useJob();
  await job.shutdownScheduler();  // Cleans up worker files
  process.exit(0);
});
```

**2. Periodic Cleanup:**
```javascript
// jobs/cleanup-workers.mjs
export const meta = {
  name: 'Cleanup Worker Files',
  desc: 'Remove old worker files'
};
export const cron = '0 * * * *';  // Hourly

export default async function run() {
  const { rmSync, readdirSync, statSync } = await import('fs');
  const { join } = await import('path');

  const workerDir = '.gitvan/workers';
  const maxAge = 3600000;  // 1 hour

  let removed = 0;
  const files = readdirSync(workerDir);

  for (const file of files) {
    const path = join(workerDir, file);
    const stats = statSync(path);
    const age = Date.now() - stats.mtimeMs;

    if (age > maxAge) {
      rmSync(path);
      removed++;
    }
  }

  return { removed, remaining: files.length - removed };
}
```

**3. Manual Cleanup:**
```bash
rm -rf .gitvan/workers/*
```

---

### Long-Running Process Considerations

For processes that run indefinitely:

**1. Implement Graceful Restart:**
```javascript
let restartScheduled = false;

// Restart every 24 hours
setInterval(async () => {
  if (!restartScheduled) {
    restartScheduled = true;

    console.log('Scheduling graceful restart...');

    // Wait for jobs to complete
    const job = useJob();
    await job.stopScheduler();

    // Clean up
    await job.shutdownScheduler();

    // Restart process
    process.exit(0);  // PM2/systemd will restart
  }
}, 24 * 60 * 60 * 1000);
```

**2. Monitor Memory Growth:**
```javascript
function checkMemoryUsage() {
  const mem = process.memoryUsage();
  const heapUsed = mem.heapUsed / 1024 / 1024;
  const rss = mem.rss / 1024 / 1024;

  console.log(`Memory: Heap ${heapUsed.toFixed(2)} MB, RSS ${rss.toFixed(2)} MB`);

  // Restart if memory exceeds threshold
  if (heapUsed > 1024) {  // 1 GB
    console.warn('Memory threshold exceeded, restarting...');
    process.exit(0);
  }
}

setInterval(checkMemoryUsage, 60000);  // Check every minute
```

**3. Use Process Managers:**
```bash
# PM2
pm2 start app.mjs --max-memory-restart 1G

# Systemd
# Add to service file:
MemoryMax=1G
```

---

## Benchmarking and Profiling

### How to Measure Job Execution Time

**Built-in Receipt Tracking:**
```javascript
const receipt = useReceipt();
const history = await receipt.list({ jobId: 'backup-job', limit: 100 });

const durations = history.map(r => r.duration);
const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
const min = Math.min(...durations);
const max = Math.max(...durations);

console.log(`Avg: ${avg.toFixed(0)}ms, Min: ${min}ms, Max: ${max}ms`);
```

**Custom Timing:**
```javascript
export default async function run({ payload }) {
  const timings = {};

  console.time('total');

  console.time('step1');
  await step1();
  timings.step1 = console.timeEnd('step1');

  console.time('step2');
  await step2();
  timings.step2 = console.timeEnd('step2');

  timings.total = console.timeEnd('total');

  return { result: {}, timings };
}
```

**Performance Marks:**
```javascript
import { performance } from 'perf_hooks';

export default async function run({ payload }) {
  performance.mark('start');

  await step1();
  performance.mark('step1-end');

  await step2();
  performance.mark('step2-end');

  // Measure
  performance.measure('step1', 'start', 'step1-end');
  performance.measure('step2', 'step1-end', 'step2-end');

  const measures = performance.getEntriesByType('measure');
  const timings = {};

  for (const measure of measures) {
    timings[measure.name] = measure.duration;
  }

  return { timings };
}
```

---

### How to Profile Memory Usage

**1. Basic Memory Tracking:**
```javascript
export default async function run({ payload }) {
  const memStart = process.memoryUsage();

  // Job logic
  const result = await heavyOperation(payload);

  const memEnd = process.memoryUsage();
  const memDiff = {
    heapUsed: (memEnd.heapUsed - memStart.heapUsed) / 1024 / 1024,
    external: (memEnd.external - memStart.external) / 1024 / 1024
  };

  return {
    result,
    memory: {
      startMB: memStart.heapUsed / 1024 / 1024,
      endMB: memEnd.heapUsed / 1024 / 1024,
      diffMB: memDiff.heapUsed
    }
  };
}
```

**2. Node.js Inspector:**
```bash
node --inspect app.mjs

# Then open Chrome DevTools
# Go to chrome://inspect
# Click "Inspect" on your Node process
# Use Memory tab to take heap snapshots
```

**3. Heap Snapshots:**
```javascript
import { writeHeapSnapshot } from 'v8';

export default async function run({ payload }) {
  // Before
  const snapshot1 = writeHeapSnapshot('./heap-before.heapsnapshot');

  // Job logic
  const result = await heavyOperation(payload);

  // After
  const snapshot2 = writeHeapSnapshot('./heap-after.heapsnapshot');

  return {
    result,
    snapshots: [snapshot1, snapshot2]
  };
}
```

**4. Memory Leak Detection:**
```javascript
import { memwatch } from '@airbnb/node-memwatch';

memwatch.on('leak', (info) => {
  console.error('Memory leak detected:', info);
  writeHeapSnapshot(`./leak-${Date.now()}.heapsnapshot`);
});

memwatch.on('stats', (stats) => {
  console.log('GC stats:', stats);
});
```

---

### Identifying Bottlenecks

**1. Flame Graphs:**
```bash
node --prof app.mjs
# Generates isolate-*.log

# Process the log
node --prof-process isolate-0x*.log > processed.txt

# Use tools like:
# - clinic.js flame
# - 0x
```

**2. Clinic.js:**
```bash
npm install -g clinic

# Doctor (overall performance)
clinic doctor -- node app.mjs

# Flame (CPU profiling)
clinic flame -- node app.mjs

# Bubbleprof (async operations)
clinic bubbleprof -- node app.mjs
```

**3. Custom Profiling:**
```javascript
export default async function run({ payload }) {
  const profile = {
    operations: [],
    totalTime: 0
  };

  for (const item of payload.items) {
    const start = Date.now();
    await processItem(item);
    const duration = Date.now() - start;

    profile.operations.push({ item, duration });
    profile.totalTime += duration;
  }

  // Identify slowest operations
  profile.operations.sort((a, b) => b.duration - a.duration);
  profile.slowest = profile.operations.slice(0, 10);

  return { profile };
}
```

---

## Capacity Planning

### Number of Concurrent Jobs

Calculate how many jobs your system can handle:

**Formula:**
```
Max Concurrent Jobs = (Available Memory / Job Memory) × Safety Factor
```

**Example:**
- Available Memory: 4 GB (4096 MB)
- Job Memory (avg): 50 MB
- Safety Factor: 0.75 (75%)

```
Max = (4096 / 50) × 0.75 = 61 jobs
```

**Measure Job Memory:**
```javascript
const job = useJob();

// Run job and measure
const memBefore = process.memoryUsage().heapUsed;
await job.run('test-job');
const memAfter = process.memoryUsage().heapUsed;

const jobMemory = (memAfter - memBefore) / 1024 / 1024;
console.log(`Job uses ~${jobMemory.toFixed(2)} MB`);
```

---

### Worker Thread Limits

Node.js worker thread limits:
- **Theoretical Max:** Thousands (limited by system resources)
- **Practical Max:** 50-100 (depends on CPU and memory)

**Recommendation:**
```javascript
const cpuCount = require('os').cpus().length;
const maxConcurrent = cpuCount * 2;  // 2x CPU cores

// In gitvan.config.js
export default {
  jobs: {
    maxConcurrent
  }
};
```

---

### System Resources Required

**Minimum:**
- **RAM:** 512 MB
- **CPU:** 1 core
- **Disk:** 100 MB (for worker files)

**Recommended:**
- **RAM:** 2 GB+
- **CPU:** 2+ cores
- **Disk:** 1 GB (for logs, receipts, workers)

**High-Performance:**
- **RAM:** 8 GB+
- **CPU:** 4+ cores
- **Disk:** SSD with 10 GB+

---

## Optimization Checklist

### Pre-Production

- [ ] Profile job execution times
- [ ] Measure job memory usage
- [ ] Set appropriate timeouts
- [ ] Configure maxConcurrent based on resources
- [ ] Implement error handling in all jobs
- [ ] Add instrumentation (timings, metrics)
- [ ] Test under load
- [ ] Validate cleanup policies

### Production Monitoring

- [ ] Track job execution times (receipts)
- [ ] Monitor memory usage
- [ ] Watch worker file count
- [ ] Monitor lock contention
- [ ] Track error rates
- [ ] Set up alerts for failures
- [ ] Regular receipt cleanup
- [ ] Regular worker file cleanup

### Optimization Opportunities

- [ ] Batch similar operations
- [ ] Use parallel execution where possible
- [ ] Cache expensive operations
- [ ] Optimize database queries
- [ ] Reduce payload sizes
- [ ] Minimize context data
- [ ] Implement incremental processing
- [ ] Use streaming for large datasets

### Resource Management

- [ ] Set memory limits for workers
- [ ] Configure cleanup policies
- [ ] Implement graceful restart
- [ ] Monitor disk usage
- [ ] Archive old receipts
- [ ] Compress large payloads
- [ ] Limit concurrent jobs
- [ ] Use process managers (PM2, systemd)

---

## Performance Targets

### Recommended SLAs

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Job Success Rate | >99% | <95% |
| Job Execution Time | <30s (avg) | >60s |
| Lock Contention | <1% | >5% |
| Memory Usage | <80% | >90% |
| Worker File Count | <100 | >500 |
| Receipt Storage | <100MB | >500MB |

### Example Monitoring

```javascript
// jobs/monitoring.mjs
export const meta = {
  name: 'System Monitoring',
  desc: 'Monitor job system health'
};
export const cron = '*/5 * * * *';  // Every 5 minutes

export default async function run() {
  const job = useJob();
  const lock = useLock();
  const receipt = useReceipt();

  // Metrics
  const metrics = {
    timestamp: new Date().toISOString(),
    scheduler: job.getSchedulerStatus(),
    memory: {
      heapUsed: process.memoryUsage().heapUsed / 1024 / 1024,
      rss: process.memoryUsage().rss / 1024 / 1024
    },
    locks: {
      total: (await lock.list()).length
    },
    receipts: await receipt.getStats({ limit: 1000 })
  };

  // Alerts
  if (metrics.receipts.successRate < 95) {
    console.error('ALERT: Success rate below 95%');
  }

  if (metrics.memory.heapUsed > 1024) {
    console.warn('WARNING: High memory usage');
  }

  return metrics;
}
```

---

## See Also

- [API Reference](api/job-scheduler.md)
- [Architecture Guide](ARCHITECTURE-BREE-INTEGRATION.md)
- [Troubleshooting Guide](TROUBLESHOOTING-JOBS.md)
- [Security Hardening](SECURITY-JOBS.md)
