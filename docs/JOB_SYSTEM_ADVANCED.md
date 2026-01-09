# Job System Advanced Guide

**Version**: v4.0.1
**Last Updated**: January 9, 2026
**Target Audience**: Advanced developers integrating complex job workflows

---

## Table of Contents

1. [Job Lifecycle Architecture](#job-lifecycle-architecture)
2. [Advanced Scheduling Patterns](#advanced-scheduling-patterns)
3. [Job Dependencies and Pipelines](#job-dependencies-and-pipelines)
4. [Distributed Job Execution](#distributed-job-execution)
5. [Job State Management](#job-state-management)
6. [Performance Optimization](#performance-optimization)
7. [Error Recovery Strategies](#error-recovery-strategies)
8. [Testing Complex Jobs](#testing-complex-jobs)
9. [Monitoring and Observability](#monitoring-and-observability)
10. [Real-World Patterns](#real-world-patterns)

---

## Job Lifecycle Architecture

### The Complete Job Lifecycle

```
Discovery → Registration → Scheduling → Execution → Completion
    ↓            ↓              ↓           ↓           ↓
  Scanner    Registry      Scheduler     Runner     Cleanup
    ↑────────────────────────────────────────────────↑
              State Management (Git Notes)
```

### Composables for Job Management

```javascript
import { withGitVan, useJobDiscovery, useJobExecution, useJobScheduler } from 'gitvan';

await withGitVan(context, async () => {
  // 1. Discovery - Find all jobs
  const discovery = useJobDiscovery();
  const jobs = await discovery.scan({
    pattern: 'jobs/**/*.mjs',
    includeMetadata: true
  });

  // 2. Registration - Register with job registry
  const execution = useJobExecution();
  for (const job of jobs) {
    await execution.register(job.name, {
      handler: job.handler,
      timeout: 30000,
      retries: 3
    });
  }

  // 3. Scheduling - Add to scheduler
  const scheduler = useJobScheduler();
  await scheduler.schedule('daily-cleanup', {
    cron: '0 2 * * *',  // 2 AM every day
    timezone: 'UTC'
  });

  // 4. Execution - Runner handles actual execution
  // (automatically triggered by scheduler)

  // 5. Status - Monitor completion
  const status = await execution.getStatus('daily-cleanup');
  console.log(`Last run: ${status.lastRun}`);
  console.log(`Success rate: ${status.successRate}%`);
});
```

### Job States in Detail

Each job progresses through defined states:

```javascript
export const JOB_STATES = {
  PENDING: 'pending',        // Registered but not yet scheduled
  SCHEDULED: 'scheduled',    // Scheduled for future execution
  QUEUED: 'queued',          // In execution queue
  RUNNING: 'running',        // Currently executing
  COMPLETED: 'completed',    // Finished successfully
  FAILED: 'failed',          // Execution failed
  RETRYING: 'retrying',      // Retry in progress
  TIMEOUT: 'timeout',        // Exceeded timeout
  CANCELLED: 'cancelled'     // Manually cancelled
};
```

### State Transitions

```javascript
const transitions = {
  'pending': ['scheduled', 'cancelled'],
  'scheduled': ['queued', 'cancelled'],
  'queued': ['running', 'cancelled'],
  'running': ['completed', 'failed', 'timeout', 'cancelled'],
  'failed': ['retrying', 'cancelled'],
  'retrying': ['completed', 'failed', 'timeout', 'cancelled'],
  'timeout': ['retrying', 'cancelled'],
  'completed': ['archived'],
  'cancelled': ['archived']
};

// Validate transitions
function canTransition(from, to) {
  return transitions[from]?.includes(to) || false;
}
```

---

## Advanced Scheduling Patterns

### 1. Cron Scheduling with Timezones

```javascript
import { useJobScheduler } from 'gitvan';

await withGitVan(context, async () => {
  const scheduler = useJobScheduler();

  // Schedule in specific timezone
  await scheduler.schedule('business-hours-task', {
    cron: '0 9-17 * * 1-5',  // 9 AM to 5 PM, Mon-Fri
    timezone: 'America/New_York',
    handler: async () => {
      console.log('Running during business hours');
    }
  });

  // UTC conversion example
  // 9 AM Eastern (UTC-5) = 2 PM UTC in winter
  // 9 AM Eastern (UTC-4) = 1 PM UTC in summer
});
```

### 2. Interval-Based Scheduling

```javascript
// Run every 5 minutes
await scheduler.schedule('health-check', {
  interval: 5 * 60 * 1000,  // milliseconds
  handler: async () => {
    console.log('Health check running');
  }
});

// Run every hour
await scheduler.schedule('report-generation', {
  interval: 60 * 60 * 1000,
  handler: async () => {
    console.log('Generating hourly report');
  }
});
```

### 3. One-Time Execution

```javascript
// Execute once after delay
await scheduler.schedule('one-time-task', {
  delay: 10 * 60 * 1000,  // 10 minutes from now
  handler: async () => {
    console.log('One-time task executed');
  }
});

// Execute at specific time
await scheduler.schedule('scheduled-backup', {
  at: new Date('2026-01-15T23:00:00Z'),
  handler: async () => {
    console.log('Backup executed at scheduled time');
  }
});
```

### 4. Dynamic Scheduling

```javascript
// Conditional scheduling based on system state
const scheduler = useJobScheduler();

async function registerAdaptiveSchedules() {
  const systemLoad = await getSystemLoad();

  if (systemLoad > 0.8) {
    // Light schedule during high load
    await scheduler.schedule('heavy-task', {
      interval: 60 * 60 * 1000,  // Hourly
      handler: heavyWorkload
    });
  } else {
    // Aggressive schedule during low load
    await scheduler.schedule('heavy-task', {
      interval: 15 * 60 * 1000,  // Every 15 minutes
      handler: heavyWorkload
    });
  }
}
```

---

## Job Dependencies and Pipelines

### Sequential Pipeline Execution

```javascript
import { useJobExecution } from 'gitvan';

const execution = useJobExecution();

// Define job pipeline
const pipeline = {
  'extract': {
    handler: extractData,
    dependsOn: [],  // No dependencies - first job
    timeout: 30000
  },
  'transform': {
    handler: transformData,
    dependsOn: ['extract'],  // Wait for extract
    timeout: 60000
  },
  'load': {
    handler: loadData,
    dependsOn: ['transform'],  // Wait for transform
    timeout: 45000
  },
  'validate': {
    handler: validateLoad,
    dependsOn: ['load'],  // Wait for load
    timeout: 20000
  }
};

// Execute pipeline
async function executePipeline() {
  const results = {};

  for (const [jobName, config] of Object.entries(pipeline)) {
    // Wait for dependencies
    for (const dep of config.dependsOn) {
      await results[dep];  // Promise resolution
    }

    // Execute job
    console.log(`Starting: ${jobName}`);
    results[jobName] = await execution.execute(jobName, config.handler);
    console.log(`Completed: ${jobName}`);
  }

  return results;
}
```

### Parallel Job Groups

```javascript
// Execute jobs in parallel when no dependencies exist
async function executeParallel() {
  const execution = useJobExecution();

  // These jobs have no dependencies - run in parallel
  const results = await Promise.all([
    execution.execute('job-1', handler1),
    execution.execute('job-2', handler2),
    execution.execute('job-3', handler3)
  ]);

  return results;
}
```

### Conditional Job Execution

```javascript
const execution = useJobExecution();

async function conditionalPipeline() {
  // Step 1: Extract
  const extracted = await execution.execute('extract', extractData);

  // Step 2: Conditional processing
  if (extracted.rowCount > 1000000) {
    // Large dataset - use specialized handler
    await execution.execute('transform-large', transformLargeData);
  } else {
    // Small dataset - use simple handler
    await execution.execute('transform-small', transformSmallData);
  }

  // Step 3: Always validate
  await execution.execute('validate', validateData);
}
```

---

## Distributed Job Execution

### Multi-Machine Job Distribution

```javascript
import { useJobScheduler, useNativeIO } from 'gitvan';

// Job distribution metadata stored in Git
async function setupDistributedJob() {
  const scheduler = useJobScheduler();
  const io = useNativeIO();

  // Register job with distribution policy
  await scheduler.schedule('distributed-analysis', {
    cron: '0 * * * *',  // Every hour
    distribute: {
      strategy: 'round-robin',  // or 'least-loaded', 'hash'
      machines: ['worker-1', 'worker-2', 'worker-3'],
      fallback: 'local'  // Run locally if all workers busy
    },
    handler: analyzeData
  });

  // Store distribution state in Git notes
  await io.appendNote({
    ref: 'refs/notes/jobs/distribution',
    message: JSON.stringify({
      jobId: 'distributed-analysis',
      lastExecutor: 'worker-2',
      nextExecutor: 'worker-3'
    })
  });
}
```

### Load Balancing Between Executors

```javascript
// Track job execution metrics
async function getExecutorLoad() {
  const io = useNativeIO();

  const loads = {
    'worker-1': await io.getJobCount('worker-1'),  // Count running jobs
    'worker-2': await io.getJobCount('worker-2'),
    'worker-3': await io.getJobCount('worker-3')
  };

  // Return least loaded executor
  return Object.entries(loads).reduce((min, [name, count]) =>
    count < min.count ? { name, count } : min
  );
}
```

---

## Job State Management

### Storing Job State in Git Notes

```javascript
import { useNativeIO } from 'gitvan';

const io = useNativeIO();

// Store job execution state
async function saveJobState(jobId, state) {
  await io.appendNote({
    ref: 'refs/notes/jobs/state',
    message: JSON.stringify({
      jobId,
      state,
      timestamp: new Date().toISOString(),
      commit: await getCurrentCommit()
    })
  });
}

// Retrieve job history
async function getJobHistory(jobId) {
  const history = await io.readNotes({
    ref: 'refs/notes/jobs/state'
  });

  return history
    .filter(note => JSON.parse(note.message).jobId === jobId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}
```

### Job Context Preservation

```javascript
// Preserve context across async operations
async function jobWithContext(jobConfig) {
  const context = {
    jobId: generateId(),
    startTime: Date.now(),
    env: process.env.NODE_ENV,
    user: process.env.USER
  };

  return await withContext(context, async () => {
    const job = useJob();

    // Context preserved through async operations
    const result = await job.execute(jobConfig.handler);

    // Save result with context
    await saveJobResult(context.jobId, {
      ...result,
      duration: Date.now() - context.startTime,
      context
    });

    return result;
  });
}
```

---

## Performance Optimization

### Parallel Job Discovery

```javascript
import { useJobDiscovery } from 'gitvan';

const discovery = useJobDiscovery();

async function optimizedDiscovery() {
  // Parallel directory scanning
  const [coreJobs, integrationJobs, customJobs] = await Promise.all([
    discovery.scan({ pattern: 'jobs/core/**/*.mjs' }),
    discovery.scan({ pattern: 'jobs/integrations/**/*.mjs' }),
    discovery.scan({ pattern: 'jobs/custom/**/*.mjs' })
  ]);

  return [...coreJobs, ...integrationJobs, ...customJobs];
}
```

### Caching Job Metadata

```javascript
import { useRegistry } from 'gitvan';

const registry = useRegistry();

// Cache job metadata to avoid repeated scans
async function cachedJobDiscovery() {
  const cacheKey = 'job:metadata:all';

  // Try cache first
  const cached = await registry.get(cacheKey);
  if (cached && isValid(cached)) {
    return cached.jobs;
  }

  // Scan if cache miss
  const jobs = await discovery.scan({ pattern: 'jobs/**/*.mjs' });

  // Store in cache with TTL
  await registry.set(cacheKey, {
    jobs,
    timestamp: Date.now(),
    ttl: 60 * 60 * 1000  // 1 hour
  });

  return jobs;
}
```

### Batch Job Execution

```javascript
// Execute multiple jobs efficiently
async function batchExecuteJobs(jobIds) {
  const execution = useJobExecution();

  // Execute in batches of 5 to avoid overwhelming system
  const batchSize = 5;
  const results = [];

  for (let i = 0; i < jobIds.length; i += batchSize) {
    const batch = jobIds.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(id => execution.execute(id))
    );
    results.push(...batchResults);

    // Small delay between batches
    await delay(100);
  }

  return results;
}
```

---

## Error Recovery Strategies

### Exponential Backoff Retry

```javascript
import { useJobExecution } from 'gitvan';

const execution = useJobExecution();

async function retryWithBackoff(jobId, maxRetries = 5) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await execution.execute(jobId);
    } catch (error) {
      lastError = error;

      // Calculate backoff: 2^attempt seconds, max 5 minutes
      const delayMs = Math.min(
        Math.pow(2, attempt) * 1000,
        5 * 60 * 1000
      );

      console.log(`Attempt ${attempt} failed, retrying in ${delayMs}ms`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}
```

### Graceful Degradation

```javascript
// Fallback to alternative handler on failure
async function executeWithFallback(primaryHandler, fallbackHandler) {
  const execution = useJobExecution();

  try {
    return await execution.execute('primary', primaryHandler);
  } catch (primaryError) {
    console.warn('Primary handler failed, using fallback:', primaryError.message);

    try {
      return await execution.execute('fallback', fallbackHandler);
    } catch (fallbackError) {
      console.error('Both handlers failed');
      throw new AggregateError([primaryError, fallbackError]);
    }
  }
}
```

### Dead Letter Queue Pattern

```javascript
// Store failed jobs for later analysis
async function executeWithDLQ(jobConfig) {
  const execution = useJobExecution();
  const io = useNativeIO();

  try {
    return await execution.execute(jobConfig.name, jobConfig.handler);
  } catch (error) {
    // Store in dead letter queue
    await io.appendNote({
      ref: 'refs/notes/jobs/dead-letter-queue',
      message: JSON.stringify({
        jobId: jobConfig.name,
        error: {
          message: error.message,
          stack: error.stack
        },
        timestamp: new Date().toISOString(),
        config: jobConfig
      })
    });

    throw error;
  }
}
```

---

## Testing Complex Jobs

### Unit Testing Job Handlers

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { withGitVan } from 'gitvan';

describe('Complex Job Handler', () => {
  let context;

  beforeEach(() => {
    context = createTestContext();
  });

  it('should handle large datasets', async () => {
    await withGitVan(context, async () => {
      const execution = useJobExecution();

      const largeDataset = Array.from({ length: 100000 }, (_, i) => ({
        id: i,
        value: Math.random()
      }));

      const result = await execution.execute('process-large',
        async () => processData(largeDataset)
      );

      expect(result.processed).toBe(100000);
      expect(result.duration).toBeLessThan(5000);  // 5 seconds
    });
  });

  it('should recover from partial failure', async () => {
    await withGitVan(context, async () => {
      const execution = useJobExecution();

      const result = await execution.execute('partial-failure',
        async () => {
          const results = [];
          for (let i = 0; i < 10; i++) {
            try {
              results.push(await processItem(i));
            } catch (error) {
              results.push({ error: error.message });
            }
          }
          return results;
        }
      );

      expect(result.length).toBe(10);
      expect(result.some(r => r.error)).toBe(true);  // Some failures
      expect(result.some(r => !r.error)).toBe(true);  // Some successes
    });
  });
});
```

### Integration Testing Job Pipelines

```javascript
it('should execute complete ETL pipeline', async () => {
  await withGitVan(context, async () => {
    const execution = useJobExecution();

    // Execute full pipeline
    const results = await executePipeline(execution);

    // Verify end-to-end result
    expect(results.load).toBeDefined();
    expect(results.validate.passed).toBe(true);
    expect(results.validate.rowCount).toBe(expectedCount);
  });
});
```

---

## Monitoring and Observability

### Job Execution Metrics

```javascript
import { useLog, useNativeIO } from 'gitvan';

const log = useLog();
const io = useNativeIO();

async function recordJobMetrics(jobId, execution) {
  const metric = {
    jobId,
    startTime: execution.startTime,
    endTime: execution.endTime,
    duration: execution.endTime - execution.startTime,
    status: execution.status,
    itemsProcessed: execution.itemsProcessed,
    itemsFailed: execution.itemsFailed,
    successRate: (execution.itemsProcessed / (execution.itemsProcessed + execution.itemsFailed)) * 100
  };

  // Store in Git notes
  await io.appendNote({
    ref: 'refs/notes/jobs/metrics',
    message: JSON.stringify(metric)
  });

  // Log structured output
  log.info('Job executed', {
    jobId,
    ...metric
  });
}
```

### Job Health Dashboard

```javascript
// Aggregate metrics for monitoring
async function getJobHealthMetrics() {
  const io = useNativeIO();

  const allMetrics = await io.readNotes({
    ref: 'refs/notes/jobs/metrics'
  });

  const grouped = {};
  for (const metric of allMetrics) {
    const data = JSON.parse(metric.message);
    if (!grouped[data.jobId]) {
      grouped[data.jobId] = [];
    }
    grouped[data.jobId].push(data);
  }

  // Calculate aggregates
  return Object.entries(grouped).map(([jobId, metrics]) => {
    const recent = metrics.slice(-10);  // Last 10 executions
    const avgDuration = recent.reduce((sum, m) => sum + m.duration, 0) / recent.length;
    const successRate = recent.reduce((sum, m) => sum + m.successRate, 0) / recent.length;

    return {
      jobId,
      executionCount: metrics.length,
      averageDuration: avgDuration,
      recentSuccessRate: successRate,
      lastExecution: metrics[metrics.length - 1].endTime
    };
  });
}
```

---

## Real-World Patterns

### Pattern 1: Data Synchronization Pipeline

```javascript
async function setupDataSyncPipeline() {
  const scheduler = useJobScheduler();

  await scheduler.schedule('daily-data-sync', {
    cron: '0 2 * * *',  // 2 AM daily
    handler: async () => {
      const jobs = useJobExecution();

      // Pull from source
      const pulled = await jobs.execute('sync-pull', pullFromSource);

      // Transform
      const transformed = await jobs.execute('sync-transform',
        () => transformData(pulled)
      );

      // Validate
      const validated = await jobs.execute('sync-validate',
        () => validateData(transformed)
      );

      // Push to target
      if (validated.valid) {
        await jobs.execute('sync-push',
          () => pushToTarget(transformed)
        );
      }

      return validated;
    }
  });
}
```

### Pattern 2: Monitoring and Alerting

```javascript
async function setupMonitoringJobs() {
  const scheduler = useJobScheduler();

  // Health checks every 5 minutes
  await scheduler.schedule('health-check', {
    interval: 5 * 60 * 1000,
    handler: async () => {
      const health = await checkSystemHealth();

      if (health.status !== 'healthy') {
        await notifyAdministrators({
          severity: 'high',
          component: health.failedComponent,
          message: health.errorMessage
        });
      }

      return health;
    }
  });
}
```

### Pattern 3: Batch Processing with Progress

```javascript
async function batchProcessWithProgress(items) {
  const execution = useJobExecution();
  const batchSize = 100;

  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const processed = await execution.execute(
      `batch-${i / batchSize}`,
      () => processBatch(batch)
    );

    results.push(...processed);

    // Report progress
    const percentage = ((i + batch.length) / items.length * 100).toFixed(0);
    console.log(`Progress: ${percentage}%`);
  }

  return results;
}
```

---

## Summary

This guide covers advanced job system patterns including:
- Complex lifecycle management
- Distributed execution strategies
- Dependency resolution and pipelines
- Performance optimization techniques
- Robust error recovery patterns
- Comprehensive testing approaches
- Production monitoring and observability

For basic job system usage, see [QUICKSTART-JOBS.md](/home/user/gitvan/docs/QUICKSTART-JOBS.md).

---

**Last Updated**: January 9, 2026
**Status**: Complete
**Related Docs**: QUICKSTART-JOBS.md, ERROR-HANDLING.md, TESTING.md
