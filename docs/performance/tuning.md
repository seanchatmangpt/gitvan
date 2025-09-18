# Performance Tuning Guide

This guide covers advanced performance tuning strategies for GitVan v2, including configuration optimization, resource management, and scaling considerations.

## Configuration for Performance

### Core Performance Settings

```javascript
// gitvan.config.mjs
export default {
  performance: {
    // Cache configuration
    cache: {
      maxSize: 1000,              // Max cached templates
      ttl: 300000,                // 5 minutes TTL
      diskCache: true,            // Enable cacache
      compression: 'gzip'         // Cache compression
    },

    // Concurrency limits
    concurrency: {
      templates: 4,               // Parallel template renders
      gitOps: 2,                  // Parallel Git operations
      hooks: 8,                   // Parallel hook execution
      fileSystem: 6               // Parallel file operations
    },

    // Memory management
    memory: {
      heapLimit: '256MB',         // Daemon heap limit
      gcInterval: 30000,          // GC interval (ms)
      pressureThreshold: 0.85,    // Memory pressure threshold
      streamThreshold: '10MB'     // Stream large files above this
    },

    // I/O optimization
    io: {
      batchSize: 50,              // Batch operation size
      debounceMs: 100,            // Event debouncing
      readBufferSize: 65536,      // File read buffer
      writeBufferSize: 65536      // File write buffer
    }
  }
};
```

### Environment-Specific Tuning

#### Development Environment
```javascript
// Fast iteration, less caching
export default {
  performance: {
    cache: {
      ttl: 1000,                  // 1 second TTL for dev
      maxSize: 100                // Smaller cache
    },
    concurrency: {
      templates: 2,               // Fewer parallel operations
      gitOps: 1
    }
  }
};
```

#### Production Environment
```javascript
// Maximum performance, aggressive caching
export default {
  performance: {
    cache: {
      ttl: 600000,                // 10 minutes TTL
      maxSize: 5000,              // Large cache
      compression: 'brotli'       // Better compression
    },
    concurrency: {
      templates: 8,               // Higher parallelism
      gitOps: 4,
      hooks: 16
    },
    memory: {
      heapLimit: '512MB'          // More memory for production
    }
  }
};
```

#### CI/CD Environment
```javascript
// Optimized for build pipelines
export default {
  performance: {
    cache: {
      diskCache: false,           // Disable disk cache in CI
      ttl: 60000                  // Short TTL
    },
    concurrency: {
      templates: process.env.CI_PARALLELISM || 4
    },
    memory: {
      gcInterval: 10000           // Frequent GC in CI
    }
  }
};
```

## Lock Contention Mitigation

### Git Lock Management

```javascript
class GitLockManager {
  constructor(options = {}) {
    this.locks = new Map();
    this.queue = new Map();
    this.timeout = options.timeout || 5000;
  }

  async acquireLock(resource, operation) {
    const lockKey = `git:${resource}`;

    // Check if lock is available
    if (!this.locks.has(lockKey)) {
      const lock = new AsyncLock();
      this.locks.set(lockKey, lock);
    }

    const lock = this.locks.get(lockKey);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Lock timeout for ${resource}`));
      }, this.timeout);

      lock.acquire(lockKey, async (done) => {
        clearTimeout(timer);
        try {
          const result = await operation();
          resolve(result);
        } catch (err) {
          reject(err);
        } finally {
          done();
        }
      });
    });
  }
}

// Usage
const lockManager = new GitLockManager();

await lockManager.acquireLock('refs/heads/main', async () => {
  // Perform Git operations that need exclusive access
  await git.updateRef('refs/heads/main', newCommit);
});
```

### Fine-Grained Locking Strategy

```javascript
// Separate locks for different Git resources
const lockResources = {
  index: 'index.lock',
  refs: (refName) => `refs/${refName}.lock`,
  objects: (oid) => `objects/${oid.slice(0, 2)}/${oid.slice(2)}.lock`,
  config: 'config.lock'
};

// Batch operations to minimize lock acquisition
const batchRefUpdates = async (updates) => {
  // Group updates by ref prefix to minimize conflicts
  const groups = new Map();

  for (const { ref, oid } of updates) {
    const prefix = ref.split('/').slice(0, 2).join('/');
    if (!groups.has(prefix)) {
      groups.set(prefix, []);
    }
    groups.get(prefix).push({ ref, oid });
  }

  // Process each group sequentially, items in parallel
  for (const [prefix, refUpdates] of groups) {
    await lockManager.acquireLock(`refs:${prefix}`, async () => {
      await Promise.all(refUpdates.map(({ ref, oid }) =>
        git.updateRef(ref, oid)
      ));
    });
  }
};
```

### Lock-Free Operations

```javascript
// Use Git's atomic operations where possible
const atomicRefUpdate = async (ref, expectedOid, newOid) => {
  try {
    // Git's compare-and-swap operation
    await git.updateRef(ref, newOid, expectedOid);
    return true;
  } catch (err) {
    if (err.code === 'LOCK_CONFLICT') {
      return false; // Retry with updated expected OID
    }
    throw err;
  }
};

// Optimistic concurrency for Git notes
const addNoteOptimistic = async (noteRef, targetOid, noteContent) => {
  let retries = 3;

  while (retries > 0) {
    try {
      const currentNotes = await git.readNote(noteRef, targetOid);
      const updatedNotes = mergeNotes(currentNotes, noteContent);

      if (await atomicRefUpdate(noteRef, currentNotes?.oid, updatedNotes.oid)) {
        return updatedNotes;
      }
    } catch (err) {
      if (retries === 1) throw err;
    }

    retries--;
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
  }

  throw new Error('Failed to update notes after retries');
};
```

## Memory Usage Optimization

### Heap Management

```javascript
class MemoryManager {
  constructor(options = {}) {
    this.heapLimit = this.parseMemoryLimit(options.heapLimit || '256MB');
    this.gcThreshold = options.gcThreshold || 0.8;
    this.monitoring = new Map();

    this.startMonitoring();
  }

  parseMemoryLimit(limit) {
    const units = { KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3 };
    const match = limit.match(/^(\d+)(KB|MB|GB)$/);

    if (!match) throw new Error(`Invalid memory limit: ${limit}`);

    return parseInt(match[1]) * units[match[2]];
  }

  startMonitoring() {
    setInterval(() => {
      const usage = process.memoryUsage();
      this.monitoring.set(Date.now(), usage);

      // Trigger GC if approaching limit
      if (usage.heapUsed > this.heapLimit * this.gcThreshold) {
        this.forceGarbageCollection();
      }

      // Keep monitoring history
      const cutoff = Date.now() - 300000; // 5 minutes
      for (const [timestamp] of this.monitoring) {
        if (timestamp < cutoff) {
          this.monitoring.delete(timestamp);
        }
      }
    }, 10000); // Check every 10 seconds
  }

  forceGarbageCollection() {
    if (global.gc) {
      global.gc();
      console.log('Forced garbage collection');
    }
  }

  getMemoryStats() {
    const current = process.memoryUsage();
    const history = Array.from(this.monitoring.values());

    return {
      current,
      peak: {
        heapUsed: Math.max(...history.map(h => h.heapUsed)),
        heapTotal: Math.max(...history.map(h => h.heapTotal)),
        rss: Math.max(...history.map(h => h.rss))
      },
      average: {
        heapUsed: history.reduce((sum, h) => sum + h.heapUsed, 0) / history.length,
        heapTotal: history.reduce((sum, h) => sum + h.heapTotal, 0) / history.length
      }
    };
  }
}
```

### Object Pool Management

```javascript
class ObjectPool {
  constructor(factory, options = {}) {
    this.factory = factory;
    this.maxSize = options.maxSize || 100;
    this.pool = [];
    this.inUse = new Set();
  }

  acquire() {
    let obj = this.pool.pop();

    if (!obj) {
      obj = this.factory();
    }

    this.inUse.add(obj);
    return obj;
  }

  release(obj) {
    if (!this.inUse.has(obj)) return;

    this.inUse.delete(obj);

    if (this.pool.length < this.maxSize) {
      // Reset object state
      if (typeof obj.reset === 'function') {
        obj.reset();
      }
      this.pool.push(obj);
    }
  }

  size() {
    return {
      available: this.pool.length,
      inUse: this.inUse.size,
      total: this.pool.length + this.inUse.size
    };
  }
}

// Template context pool
const templateContextPool = new ObjectPool(() => ({
  data: {},
  filters: {},
  globals: {},
  reset() {
    this.data = {};
    this.filters = {};
    this.globals = {};
  }
}));

// Usage
const renderTemplateOptimized = async (template, data) => {
  const context = templateContextPool.acquire();

  try {
    Object.assign(context.data, data);
    return await template.render(context);
  } finally {
    templateContextPool.release(context);
  }
};
```

### Stream-Based Processing

```javascript
class StreamingTemplateProcessor {
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || 8192;
    this.maxBufferSize = options.maxBufferSize || 65536;
  }

  async processLargeTemplate(templatePath, data, outputPath) {
    const template = await fs.readFile(templatePath, 'utf8');
    const chunks = this.chunkTemplate(template);

    const writeStream = fs.createWriteStream(outputPath);
    let buffer = '';

    for (const chunk of chunks) {
      const rendered = nunjucks.renderString(chunk, data);
      buffer += rendered;

      // Flush buffer when it gets large
      if (buffer.length > this.maxBufferSize) {
        writeStream.write(buffer);
        buffer = '';
      }
    }

    // Write remaining buffer
    if (buffer.length > 0) {
      writeStream.write(buffer);
    }

    return new Promise((resolve, reject) => {
      writeStream.end((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  chunkTemplate(template) {
    const chunks = [];
    let current = '';
    let braceDepth = 0;
    let inBlock = false;

    for (let i = 0; i < template.length; i++) {
      const char = template[i];
      const next = template[i + 1];

      current += char;

      // Track template blocks to avoid breaking them
      if (char === '{' && (next === '{' || next === '%')) {
        inBlock = true;
        braceDepth++;
      } else if (inBlock && char === '}' && template[i - 1] === '}') {
        braceDepth--;
        if (braceDepth === 0) {
          inBlock = false;
        }
      }

      // Create chunk when not in a template block
      if (!inBlock && current.length >= this.chunkSize) {
        chunks.push(current);
        current = '';
      }
    }

    if (current.length > 0) {
      chunks.push(current);
    }

    return chunks;
  }
}
```

## Job Batching Strategies

### Priority Queue Implementation

```javascript
class PriorityJobQueue {
  constructor(options = {}) {
    this.concurrency = options.concurrency || 4;
    this.batchSize = options.batchSize || 10;
    this.queues = {
      high: [],
      medium: [],
      low: []
    };
    this.running = new Set();
    this.stats = {
      processed: 0,
      failed: 0,
      avgDuration: 0
    };
  }

  add(job, priority = 'medium') {
    const jobWithMetadata = {
      ...job,
      id: this.generateJobId(),
      priority,
      createdAt: Date.now(),
      attempts: 0
    };

    this.queues[priority].push(jobWithMetadata);
    this.process();

    return jobWithMetadata.id;
  }

  async process() {
    if (this.running.size >= this.concurrency) return;

    const job = this.getNextJob();
    if (!job) return;

    this.running.add(job.id);

    try {
      const startTime = Date.now();
      await this.executeJob(job);

      const duration = Date.now() - startTime;
      this.updateStats(duration, true);
    } catch (err) {
      console.error(`Job ${job.id} failed:`, err);
      this.handleJobFailure(job, err);
    } finally {
      this.running.delete(job.id);
      // Process next job
      setImmediate(() => this.process());
    }
  }

  getNextJob() {
    // Priority order: high, medium, low
    for (const priority of ['high', 'medium', 'low']) {
      const queue = this.queues[priority];
      if (queue.length > 0) {
        return queue.shift();
      }
    }
    return null;
  }

  async executeJob(job) {
    switch (job.type) {
      case 'template':
        return await this.processTemplate(job);
      case 'git-operation':
        return await this.processGitOperation(job);
      case 'hook':
        return await this.processHook(job);
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }

  async processTemplate(job) {
    const { template, data, output } = job;

    // Use object pool for performance
    const context = templateContextPool.acquire();

    try {
      Object.assign(context.data, data);
      const rendered = await nunjucks.render(template, context);

      if (output) {
        await fs.writeFile(output, rendered);
      }

      return rendered;
    } finally {
      templateContextPool.release(context);
    }
  }

  handleJobFailure(job, error) {
    job.attempts++;
    job.lastError = error;

    // Retry with exponential backoff
    if (job.attempts < 3) {
      const delay = Math.pow(2, job.attempts) * 1000;
      setTimeout(() => {
        this.queues[job.priority].unshift(job);
        this.process();
      }, delay);
    } else {
      this.stats.failed++;
      console.error(`Job ${job.id} failed permanently after ${job.attempts} attempts`);
    }
  }

  updateStats(duration, success) {
    if (success) {
      this.stats.processed++;
      this.stats.avgDuration = (
        (this.stats.avgDuration * (this.stats.processed - 1) + duration) /
        this.stats.processed
      );
    }
  }

  getStats() {
    return {
      ...this.stats,
      queued: Object.values(this.queues).reduce((sum, q) => sum + q.length, 0),
      running: this.running.size
    };
  }

  generateJobId() {
    return `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### Batch Processing Optimization

```javascript
class BatchProcessor {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 50;
    this.batchTimeout = options.batchTimeout || 1000;
    this.batches = new Map();
  }

  async addToBatch(type, item) {
    if (!this.batches.has(type)) {
      this.batches.set(type, {
        items: [],
        timer: null,
        promise: null,
        resolve: null,
        reject: null
      });
    }

    const batch = this.batches.get(type);
    batch.items.push(item);

    // Create promise for this batch if it doesn't exist
    if (!batch.promise) {
      batch.promise = new Promise((resolve, reject) => {
        batch.resolve = resolve;
        batch.reject = reject;
      });
    }

    // Process batch when it's full or after timeout
    if (batch.items.length >= this.batchSize) {
      this.processBatch(type);
    } else if (!batch.timer) {
      batch.timer = setTimeout(() => {
        this.processBatch(type);
      }, this.batchTimeout);
    }

    return batch.promise;
  }

  async processBatch(type) {
    const batch = this.batches.get(type);
    if (!batch || batch.items.length === 0) return;

    // Clear timer and reset batch
    if (batch.timer) {
      clearTimeout(batch.timer);
    }

    const items = batch.items.slice();
    const { resolve, reject } = batch;

    // Reset batch for next items
    this.batches.set(type, {
      items: [],
      timer: null,
      promise: null,
      resolve: null,
      reject: null
    });

    try {
      const results = await this.executeBatch(type, items);
      resolve(results);
    } catch (err) {
      reject(err);
    }
  }

  async executeBatch(type, items) {
    switch (type) {
      case 'git-ref-updates':
        return await this.batchGitRefUpdates(items);
      case 'template-renders':
        return await this.batchTemplateRenders(items);
      case 'file-operations':
        return await this.batchFileOperations(items);
      default:
        throw new Error(`Unknown batch type: ${type}`);
    }
  }

  async batchGitRefUpdates(updates) {
    // Group by repository to minimize lock contention
    const repoGroups = new Map();

    for (const update of updates) {
      const repoPath = update.repoPath || process.cwd();
      if (!repoGroups.has(repoPath)) {
        repoGroups.set(repoPath, []);
      }
      repoGroups.get(repoPath).push(update);
    }

    const results = [];

    for (const [repoPath, repoUpdates] of repoGroups) {
      await lockManager.acquireLock(`git-repo:${repoPath}`, async () => {
        for (const update of repoUpdates) {
          try {
            await git.updateRef(update.ref, update.newOid, update.oldOid);
            results.push({ success: true, ref: update.ref });
          } catch (err) {
            results.push({ success: false, ref: update.ref, error: err.message });
          }
        }
      });
    }

    return results;
  }

  async batchTemplateRenders(renders) {
    // Process templates in parallel with concurrency limit
    const results = await Promise.allSettled(
      renders.map(render => this.renderTemplate(render))
    );

    return results.map((result, index) => ({
      template: renders[index].template,
      success: result.status === 'fulfilled',
      result: result.status === 'fulfilled' ? result.value : result.reason
    }));
  }

  async batchFileOperations(operations) {
    // Group by operation type for optimization
    const groups = {
      read: [],
      write: [],
      delete: []
    };

    for (const op of operations) {
      if (groups[op.type]) {
        groups[op.type].push(op);
      }
    }

    const results = [];

    // Process each group optimally
    for (const [type, ops] of Object.entries(groups)) {
      if (ops.length === 0) continue;

      if (type === 'read') {
        // Parallel reads
        const readResults = await Promise.allSettled(
          ops.map(op => fs.readFile(op.path, op.encoding || 'utf8'))
        );
        results.push(...readResults);
      } else if (type === 'write') {
        // Sequential writes to avoid conflicts
        for (const op of ops) {
          try {
            await fs.writeFile(op.path, op.content, op.encoding || 'utf8');
            results.push({ status: 'fulfilled', value: op.path });
          } catch (err) {
            results.push({ status: 'rejected', reason: err });
          }
        }
      }
    }

    return results;
  }
}
```

## Event Debouncing

### File System Event Debouncing

```javascript
class FileSystemEventDebouncer {
  constructor(options = {}) {
    this.debounceMs = options.debounceMs || 100;
    this.batchSize = options.batchSize || 50;
    this.pendingEvents = new Map();
    this.timers = new Map();
  }

  debounce(filePath, eventType, callback) {
    const key = `${filePath}:${eventType}`;

    // Clear existing timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Store event
    if (!this.pendingEvents.has(key)) {
      this.pendingEvents.set(key, []);
    }
    this.pendingEvents.get(key).push({
      timestamp: Date.now(),
      filePath,
      eventType
    });

    // Set new timer
    const timer = setTimeout(() => {
      this.flushEvents(key, callback);
    }, this.debounceMs);

    this.timers.set(key, timer);
  }

  flushEvents(key, callback) {
    const events = this.pendingEvents.get(key) || [];
    if (events.length === 0) return;

    // Clear stored data
    this.pendingEvents.delete(key);
    this.timers.delete(key);

    // Execute callback with batched events
    callback(events);
  }

  flushAll() {
    for (const [key] of this.timers) {
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
        this.flushEvents(key, () => {}); // Flush without callback
      }
    }
  }
}

// Usage example
const debouncer = new FileSystemEventDebouncer({ debounceMs: 200 });

fs.watch('./templates', (eventType, filename) => {
  debouncer.debounce(filename, eventType, (events) => {
    console.log(`Processing ${events.length} events for ${filename}`);

    // Batch process the file changes
    const uniqueFiles = [...new Set(events.map(e => e.filePath))];
    processTemplateChanges(uniqueFiles);
  });
});
```

### Hook Event Debouncing

```javascript
class HookEventDebouncer {
  constructor(options = {}) {
    this.debounceMs = options.debounceMs || 50;
    this.maxBatchSize = options.maxBatchSize || 100;
    this.pendingHooks = new Map();
    this.processors = new Map();
  }

  debounce(hookName, context, executor) {
    if (!this.pendingHooks.has(hookName)) {
      this.pendingHooks.set(hookName, []);
    }

    const pending = this.pendingHooks.get(hookName);
    pending.push({ context, timestamp: Date.now() });

    // Process immediately if batch is full
    if (pending.length >= this.maxBatchSize) {
      this.processHookBatch(hookName, executor);
      return;
    }

    // Debounce processing
    if (this.processors.has(hookName)) {
      clearTimeout(this.processors.get(hookName));
    }

    const timer = setTimeout(() => {
      this.processHookBatch(hookName, executor);
    }, this.debounceMs);

    this.processors.set(hookName, timer);
  }

  async processHookBatch(hookName, executor) {
    const pending = this.pendingHooks.get(hookName) || [];
    if (pending.length === 0) return;

    // Clear pending and timer
    this.pendingHooks.set(hookName, []);
    if (this.processors.has(hookName)) {
      clearTimeout(this.processors.get(hookName));
      this.processors.delete(hookName);
    }

    try {
      // Execute hook with batched contexts
      await executor(hookName, pending);
    } catch (err) {
      console.error(`Hook batch execution failed for ${hookName}:`, err);
    }
  }
}

// Usage with GitVan hooks
const hookDebouncer = new HookEventDebouncer();

const executeHookDebounced = (hookName, context) => {
  hookDebouncer.debounce(hookName, context, async (name, contexts) => {
    // Process all contexts in parallel
    await Promise.allSettled(
      contexts.map(({ context }) => executeHook(name, context))
    );
  });
};
```

## Performance Monitoring and Alerting

### Real-time Performance Dashboard

```javascript
class PerformanceDashboard {
  constructor() {
    this.metrics = new Map();
    this.alerts = [];
    this.thresholds = {
      templateRenderTime: 200,    // ms
      memoryUsage: 0.8,          // 80% of limit
      queueSize: 1000,           // max queue size
      errorRate: 0.05            // 5% error rate
    };
  }

  recordMetric(name, value, tags = {}) {
    const key = `${name}:${JSON.stringify(tags)}`;

    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        name,
        tags,
        values: [],
        lastValue: null,
        alertTriggered: false
      });
    }

    const metric = this.metrics.get(key);
    metric.values.push({
      value,
      timestamp: Date.now()
    });

    // Keep last 1000 values
    if (metric.values.length > 1000) {
      metric.values.shift();
    }

    metric.lastValue = value;

    // Check thresholds
    this.checkThresholds(metric);
  }

  checkThresholds(metric) {
    const threshold = this.thresholds[metric.name];
    if (!threshold) return;

    const isViolation = metric.lastValue > threshold;

    if (isViolation && !metric.alertTriggered) {
      this.triggerAlert(metric, threshold);
      metric.alertTriggered = true;
    } else if (!isViolation && metric.alertTriggered) {
      metric.alertTriggered = false;
    }
  }

  triggerAlert(metric, threshold) {
    const alert = {
      metric: metric.name,
      value: metric.lastValue,
      threshold,
      timestamp: Date.now(),
      tags: metric.tags
    };

    this.alerts.push(alert);
    console.warn(`Performance alert: ${metric.name} = ${metric.lastValue} (threshold: ${threshold})`);

    // Keep last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }
  }

  getStats(metricName) {
    const metrics = Array.from(this.metrics.values())
      .filter(m => !metricName || m.name === metricName);

    return metrics.map(metric => {
      const values = metric.values.map(v => v.value);
      const sorted = [...values].sort((a, b) => a - b);

      return {
        name: metric.name,
        tags: metric.tags,
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        mean: values.reduce((a, b) => a + b, 0) / values.length,
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
        current: metric.lastValue
      };
    });
  }

  getAlerts(limit = 10) {
    return this.alerts
      .slice(-limit)
      .reverse();
  }
}

// Global dashboard instance
const dashboard = new PerformanceDashboard();

// Integration with GitVan operations
const monitoredTemplateRender = async (template, data) => {
  const start = Date.now();

  try {
    const result = await renderTemplate(template, data);
    const duration = Date.now() - start;

    dashboard.recordMetric('templateRenderTime', duration, {
      template: path.basename(template)
    });

    return result;
  } catch (err) {
    dashboard.recordMetric('templateError', 1, {
      template: path.basename(template),
      error: err.constructor.name
    });
    throw err;
  }
};
```

## Advanced Tuning Techniques

### CPU Optimization

```javascript
// Use worker threads for CPU-intensive tasks
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

class CPUOptimizer {
  constructor(options = {}) {
    this.workers = [];
    this.workerCount = options.workerCount || require('os').cpus().length;
    this.taskQueue = [];
    this.roundRobin = 0;
  }

  async initialize() {
    if (!isMainThread) return;

    for (let i = 0; i < this.workerCount; i++) {
      const worker = new Worker(__filename, {
        workerData: { workerId: i }
      });

      worker.on('message', (result) => {
        this.handleWorkerMessage(result);
      });

      this.workers.push({
        worker,
        busy: false,
        id: i
      });
    }
  }

  async executeInWorker(task) {
    return new Promise((resolve, reject) => {
      const availableWorker = this.workers.find(w => !w.busy);

      if (!availableWorker) {
        // Queue task if no workers available
        this.taskQueue.push({ task, resolve, reject });
        return;
      }

      this.assignTask(availableWorker, task, resolve, reject);
    });
  }

  assignTask(workerInfo, task, resolve, reject) {
    workerInfo.busy = true;

    const timeoutId = setTimeout(() => {
      reject(new Error('Worker task timeout'));
      workerInfo.busy = false;
    }, 30000); // 30 second timeout

    const messageHandler = (result) => {
      clearTimeout(timeoutId);
      workerInfo.worker.off('message', messageHandler);
      workerInfo.busy = false;

      if (result.error) {
        reject(new Error(result.error));
      } else {
        resolve(result.data);
      }

      // Process queued task if any
      if (this.taskQueue.length > 0) {
        const queued = this.taskQueue.shift();
        this.assignTask(workerInfo, queued.task, queued.resolve, queued.reject);
      }
    };

    workerInfo.worker.on('message', messageHandler);
    workerInfo.worker.postMessage(task);
  }
}

// Worker thread code
if (!isMainThread) {
  parentPort.on('message', async (task) => {
    try {
      let result;

      switch (task.type) {
        case 'template-compile':
          result = await compileTemplateInWorker(task.data);
          break;
        case 'git-object-parse':
          result = await parseGitObjectInWorker(task.data);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      parentPort.postMessage({ data: result });
    } catch (err) {
      parentPort.postMessage({ error: err.message });
    }
  });
}
```

### I/O Optimization

```javascript
class IOOptimizer {
  constructor(options = {}) {
    this.readPool = new Map();
    this.writeQueue = [];
    this.maxConcurrentReads = options.maxConcurrentReads || 10;
    this.maxConcurrentWrites = options.maxConcurrentWrites || 5;
    this.currentReads = 0;
    this.currentWrites = 0;
  }

  async optimizedRead(filePath, options = {}) {
    // Check if already reading this file
    if (this.readPool.has(filePath)) {
      return this.readPool.get(filePath);
    }

    // Throttle concurrent reads
    if (this.currentReads >= this.maxConcurrentReads) {
      await this.waitForReadSlot();
    }

    const readPromise = this.performRead(filePath, options);
    this.readPool.set(filePath, readPromise);

    try {
      const result = await readPromise;
      return result;
    } finally {
      this.readPool.delete(filePath);
      this.currentReads--;
    }
  }

  async performRead(filePath, options) {
    this.currentReads++;

    const stats = await fs.stat(filePath);

    // Use streaming for large files
    if (stats.size > 10 * 1024 * 1024) { // 10MB
      return this.streamRead(filePath, options);
    }

    return fs.readFile(filePath, options.encoding || 'utf8');
  }

  async streamRead(filePath, options) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      const stream = fs.createReadStream(filePath, {
        encoding: options.encoding || 'utf8',
        highWaterMark: 64 * 1024 // 64KB chunks
      });

      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => resolve(chunks.join('')));
      stream.on('error', reject);
    });
  }

  async optimizedWrite(filePath, content, options = {}) {
    return new Promise((resolve, reject) => {
      this.writeQueue.push({
        filePath,
        content,
        options,
        resolve,
        reject
      });

      this.processWriteQueue();
    });
  }

  async processWriteQueue() {
    if (this.currentWrites >= this.maxConcurrentWrites || this.writeQueue.length === 0) {
      return;
    }

    const writeTask = this.writeQueue.shift();
    this.currentWrites++;

    try {
      // Use streaming for large content
      if (writeTask.content.length > 5 * 1024 * 1024) { // 5MB
        await this.streamWrite(writeTask.filePath, writeTask.content, writeTask.options);
      } else {
        await fs.writeFile(writeTask.filePath, writeTask.content, writeTask.options);
      }

      writeTask.resolve();
    } catch (err) {
      writeTask.reject(err);
    } finally {
      this.currentWrites--;
      // Process next item in queue
      setImmediate(() => this.processWriteQueue());
    }
  }

  async streamWrite(filePath, content, options) {
    return new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(filePath, options);

      stream.on('finish', resolve);
      stream.on('error', reject);

      // Write in chunks
      const chunkSize = 64 * 1024; // 64KB
      for (let i = 0; i < content.length; i += chunkSize) {
        const chunk = content.slice(i, i + chunkSize);
        stream.write(chunk);
      }

      stream.end();
    });
  }

  async waitForReadSlot() {
    return new Promise(resolve => {
      const check = () => {
        if (this.currentReads < this.maxConcurrentReads) {
          resolve();
        } else {
          setTimeout(check, 10);
        }
      };
      check();
    });
  }
}
```

## Conclusion

GitVan v2's performance tuning capabilities provide comprehensive control over system resources and operation optimization. Key strategies include:

1. **Intelligent Caching**: Multi-layered caching with TTL and compression
2. **Lock Management**: Fine-grained locking with conflict resolution
3. **Memory Optimization**: Heap management, object pooling, and streaming
4. **Batch Processing**: Priority queues and operation batching
5. **Event Debouncing**: Efficient event handling and processing
6. **Performance Monitoring**: Real-time metrics and alerting

These optimizations enable GitVan v2 to handle enterprise-scale Git-native workflows while maintaining responsiveness and resource efficiency.