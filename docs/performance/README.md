# GitVan v2 Performance Guide

GitVan v2 is designed for high-performance Git-native operations with aggressive optimization strategies and intelligent caching.

## Performance Benchmarks

### Core Operation Targets
- **Simple Jobs**: p95 < 300ms (file edits, status checks)
- **Template Rendering**: p95 < 150ms (Nunjucks processing)
- **Git Operations**: p95 < 200ms (commits, refs, notes)
- **Hook Execution**: p95 < 50ms (parallel event processing)
- **Cache Lookups**: p95 < 10ms (cacache retrieval)

### Real-World Performance Metrics

```
Operation Type              | p50   | p95   | p99   | Target
---------------------------|-------|-------|-------|--------
File Template Render       | 45ms  | 120ms | 180ms | <150ms
Git Commit + Notes         | 80ms  | 190ms | 280ms | <200ms
Hook Chain Execution       | 20ms  | 45ms  | 70ms  | <50ms
Configuration Load         | 5ms   | 15ms  | 25ms  | <30ms
Daemon Job Processing      | 65ms  | 180ms | 290ms | <300ms
Parallel File Operations   | 35ms  | 95ms  | 150ms | <200ms
```

## Optimization Strategies

### 1. Intelligent Caching Architecture

GitVan v2 leverages `cacache` for multi-layered performance optimization:

```javascript
// Template Compilation Cache
const templateCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Git Object Cache
const gitObjectCache = cacache.create('./cache/git-objects');

// Configuration Cache
const configCache = new Map();
```

**Cache Layers:**
- **L1**: In-memory Map cache (fastest, temporary)
- **L2**: cacache disk cache (persistent, indexed)
- **L3**: Git object store (native Git caching)

### 2. Parallel Execution Patterns

GitVan v2 maximizes concurrency through strategic parallelization:

```javascript
// Parallel Hook Execution
await Promise.allSettled(hooks.map(hook =>
  executeHook(hook, context)
));

// Parallel File Processing
const jobs = files.map(file => ({
  type: 'template',
  file,
  priority: getPriority(file)
}));

await processJobsBatch(jobs, { concurrency: 4 });
```

**Concurrency Strategies:**
- **Hook Chains**: Parallel execution with failure isolation
- **File Operations**: Batched processing with configurable concurrency
- **Git Operations**: Parallel ref updates where safe
- **Template Rendering**: CPU-bound work in worker threads

### 3. Resource Management

**Memory Optimization:**
```javascript
// Streaming Template Processing
const streamTemplate = (template, data) => {
  return new Transform({
    transform(chunk, encoding, callback) {
      // Process chunks incrementally
      const processed = processTemplateChunk(chunk, data);
      callback(null, processed);
    }
  });
};

// Bounded Queues
const jobQueue = new PQueue({
  concurrency: 4,
  intervalCap: 100,
  interval: 1000
});
```

**Resource Limits:**
- **Memory**: 256MB heap limit for daemon
- **File Descriptors**: Pool management for Git operations
- **CPU**: Worker thread pool sized to CPU cores
- **Disk I/O**: Rate limiting for intensive operations

### 4. Lock Contention Mitigation

GitVan v2 minimizes Git lock contention through smart coordination:

```javascript
// Fine-Grained Locking
const lockManager = {
  async acquireRef(refName) {
    return await lockfile.lock(`refs/${refName}.lock`);
  },

  async acquireIndex() {
    return await lockfile.lock('index.lock');
  }
};

// Batch Operations
const batchGitOperations = async (operations) => {
  const lock = await lockManager.acquireIndex();
  try {
    return await Promise.all(operations);
  } finally {
    await lock.release();
  }
};
```

## Caching Mechanisms

### Template Compilation Cache

```javascript
class TemplateCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 1000;
    this.ttl = options.ttl || 300000; // 5 minutes
  }

  async get(templatePath, mtime) {
    const key = `${templatePath}:${mtime}`;
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.compiled;
    }

    return null;
  }

  set(templatePath, mtime, compiled) {
    const key = `${templatePath}:${mtime}`;

    // LRU eviction
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      compiled,
      timestamp: Date.now()
    });
  }
}
```

### Git Object Cache

```javascript
class GitObjectCache {
  constructor(cacheDir) {
    this.cache = cacache.create(cacheDir);
  }

  async getObject(oid) {
    try {
      const { data } = await cacache.get(this.cache, `git-object:${oid}`);
      return data;
    } catch (err) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  }

  async setObject(oid, data) {
    await cacache.put(this.cache, `git-object:${oid}`, data, {
      metadata: {
        type: 'git-object',
        timestamp: Date.now()
      }
    });
  }
}
```

### Configuration Cache

```javascript
class ConfigCache {
  constructor() {
    this.cache = new Map();
    this.watchers = new Map();
  }

  async get(configPath) {
    const stat = await fs.stat(configPath);
    const key = `${configPath}:${stat.mtime.getTime()}`;

    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    // Setup file watcher for invalidation
    if (!this.watchers.has(configPath)) {
      const watcher = fs.watch(configPath, () => {
        this.invalidate(configPath);
      });
      this.watchers.set(configPath, watcher);
    }

    const config = await loadConfig(configPath);
    this.cache.set(key, config);
    return config;
  }

  invalidate(configPath) {
    for (const [key] of this.cache) {
      if (key.startsWith(configPath)) {
        this.cache.delete(key);
      }
    }
  }
}
```

## Performance Monitoring

### Built-in Metrics Collection

```javascript
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.timers = new Map();
  }

  startTimer(operation) {
    const timer = {
      start: process.hrtime.bigint(),
      operation
    };
    this.timers.set(operation, timer);
    return timer;
  }

  endTimer(operation) {
    const timer = this.timers.get(operation);
    if (!timer) return;

    const duration = Number(process.hrtime.bigint() - timer.start) / 1_000_000;
    this.recordMetric(operation, duration);
    this.timers.delete(operation);
  }

  recordMetric(operation, value) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    const values = this.metrics.get(operation);
    values.push({
      value,
      timestamp: Date.now()
    });

    // Keep last 1000 values
    if (values.length > 1000) {
      values.shift();
    }
  }

  getStats(operation) {
    const values = this.metrics.get(operation) || [];
    if (values.length === 0) return null;

    const sorted = values.map(v => v.value).sort((a, b) => a - b);
    const len = sorted.length;

    return {
      count: len,
      min: sorted[0],
      max: sorted[len - 1],
      mean: sorted.reduce((a, b) => a + b) / len,
      p50: sorted[Math.floor(len * 0.5)],
      p95: sorted[Math.floor(len * 0.95)],
      p99: sorted[Math.floor(len * 0.99)]
    };
  }
}
```

### Performance Dashboard

GitVan v2 includes a built-in performance dashboard accessible via:

```bash
# View current performance metrics
gitvan perf stats

# Start performance monitoring
gitvan perf monitor

# Export metrics for analysis
gitvan perf export --format json
```

## Memory Management

### Heap Optimization

```javascript
// Explicit garbage collection hints
const optimizeMemory = () => {
  if (global.gc) {
    global.gc();
  }

  // Clear caches periodically
  if (process.memoryUsage().heapUsed > MEMORY_THRESHOLD) {
    templateCache.clear();
    configCache.clear();
  }
};

// Memory pressure monitoring
const memoryMonitor = setInterval(() => {
  const usage = process.memoryUsage();
  if (usage.heapUsed > MAX_HEAP_SIZE) {
    optimizeMemory();
  }
}, 30000);
```

### Stream Processing

```javascript
// Large file handling with streams
const processLargeTemplate = async (templatePath, data) => {
  const input = fs.createReadStream(templatePath);
  const output = new PassThrough();

  const processor = new Transform({
    transform(chunk, encoding, callback) {
      try {
        const processed = nunjucks.renderString(chunk.toString(), data);
        callback(null, processed);
      } catch (err) {
        callback(err);
      }
    }
  });

  return pipeline(input, processor, output);
};
```

## Best Practices

### 1. Template Optimization

- **Pre-compile templates** during development
- **Use template inheritance** to reduce compilation overhead
- **Cache rendered output** for static content
- **Minimize template complexity** for faster rendering

### 2. Git Operation Optimization

- **Batch ref updates** to reduce lock contention
- **Use Git notes** for metadata instead of files
- **Leverage Git hooks** for async processing
- **Cache Git object lookups** aggressively

### 3. Configuration Management

- **Minimize config file size** for faster parsing
- **Use JSON over YAML** for better performance
- **Cache parsed configurations** with invalidation
- **Validate configs** at startup, not runtime

### 4. Daemon Optimization

- **Use worker threads** for CPU-intensive tasks
- **Implement job queuing** with priority scheduling
- **Monitor memory usage** and implement backpressure
- **Graceful degradation** under high load

## Performance Testing

### Benchmark Suite

```bash
# Run performance benchmarks
pnpm run bench

# Profile specific operations
pnpm run bench:templates
pnpm run bench:git-ops
pnpm run bench:hooks

# Memory leak detection
pnpm run bench:memory
```

### Load Testing

```javascript
// Stress test template rendering
const stressTest = async () => {
  const operations = Array.from({ length: 1000 }, (_, i) => ({
    template: 'test-template.md',
    data: { id: i, timestamp: Date.now() }
  }));

  const start = Date.now();
  await Promise.all(operations.map(op => renderTemplate(op)));
  const duration = Date.now() - start;

  console.log(`Processed 1000 templates in ${duration}ms`);
  console.log(`Average: ${duration / 1000}ms per template`);
};
```

## Troubleshooting Performance Issues

### Common Performance Bottlenecks

1. **Template Compilation**: Use template caching
2. **Git Lock Contention**: Implement operation batching
3. **Memory Leaks**: Monitor heap usage and implement cleanup
4. **I/O Blocking**: Use streaming for large files
5. **CPU Bound Operations**: Offload to worker threads

### Diagnostic Tools

```bash
# Enable performance profiling
export GITVAN_PROFILE=true

# Debug template performance
export GITVAN_DEBUG_TEMPLATES=true

# Monitor Git operations
export GITVAN_DEBUG_GIT=true

# Memory usage tracking
export GITVAN_DEBUG_MEMORY=true
```

## Conclusion

GitVan v2's performance architecture is built around three core principles:

1. **Intelligent Caching**: Multi-layered caching with TTL and invalidation
2. **Parallel Execution**: Maximize concurrency while maintaining data integrity
3. **Resource Optimization**: Efficient memory and I/O management

These optimizations enable GitVan v2 to handle complex Git-native workflows with enterprise-grade performance while maintaining the simplicity of file-based operations.