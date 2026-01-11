# GitVan Streaming - Scaling Considerations Guide

**Date:** January 10, 2026
**Version:** 1.0
**Target:** Operations and DevOps

---

## Executive Summary

This guide helps operators and developers understand how to scale GitVan streaming architecture for production workloads. It covers memory management, CPU overhead, I/O patterns, and backpressure strategy.

---

## 1. Memory Management

### Memory Model

```
┌─────────────────────────────────────┐
│  Total Heap: 1GB (example)          │
├─────────────────────────────────────┤
│  Reserved for JS Runtime: 100MB     │
│  Working Memory: 300MB              │
│  ┌──────────────────────┐           │
│  │ Batch Buffer: 50MB   │           │
│  │ Cache: 100MB         │           │
│  │ Temporary: 150MB     │           │
│  └──────────────────────┘           │
│  Available for GC: 500MB            │
│                                     │
│  Usage Target: <70% heap            │
│  Trigger Backpressure: 80% heap     │
│  Emergency Stop: 90% heap           │
└─────────────────────────────────────┘
```

### Memory Limits

#### Small Deployments (512MB heap)
- **Max batch size**: 500 quads
- **Max concurrent streams**: 1
- **Recommended**: Single-file processing

**Configuration**:
```javascript
{
  memory: {
    heapLimit: 512 * 1024 * 1024,
    batchSize: 500,
    highWaterMark: 2000,
    maxChunksInMemory: 2
  }
}
```

#### Medium Deployments (2GB heap)
- **Max batch size**: 5000 quads
- **Max concurrent streams**: 2-3
- **Recommended**: Multiple parallel operations

**Configuration**:
```javascript
{
  memory: {
    heapLimit: 2 * 1024 * 1024 * 1024,
    batchSize: 5000,
    highWaterMark: 10000,
    maxChunksInMemory: 5
  }
}
```

#### Large Deployments (8GB+ heap)
- **Max batch size**: 50000 quads
- **Max concurrent streams**: 5-10
- **Recommended**: Production workloads

**Configuration**:
```javascript
{
  memory: {
    heapLimit: 8 * 1024 * 1024 * 1024,
    batchSize: 50000,
    highWaterMark: 100000,
    maxChunksInMemory: 20
  }
}
```

### Garbage Collection Tuning

#### Default GC (sufficient for most cases)
```bash
# Let Node handle GC automatically
node --expose-gc app.mjs
```

#### For Large Workloads
```bash
# Increase max old space size
node --max-old-space-size=8192 app.mjs

# Monitor GC behavior
node --trace-gc app.mjs

# Combine both
node --max-old-space-size=8192 --expose-gc app.mjs
```

#### GC Coordination
```javascript
// In streaming code
const resourceManager = new ResourceManager({
  checkInterval: 1000,
  memoryLimit: 0.8 * maxHeap  // 80% threshold
});

// When threshold exceeded
if (heapUsed > threshold) {
  if (global.gc) {
    global.gc();  // Force collection
  }
  // Wait for cleanup
  await pause(1000);
}
```

### Memory Monitoring

#### Using heapdump
```bash
npm install heapdump

# In code
import heapdump from 'heapdump';

// Generate snapshot on demand
heapdump.writeSnapshot();

// Analyze with Chrome DevTools
```

#### Using clinic.js
```bash
npm install -g clinic

# Profile memory usage
clinic doctor -- node app.mjs

# Detailed heap profiling
clinic heap -- node app.mjs
```

#### Runtime Memory Checks
```javascript
const metrics = {
  heapUsed: process.memoryUsage().heapUsed,
  heapTotal: process.memoryUsage().heapTotal,
  external: process.memoryUsage().external,
  rss: process.memoryUsage().rss
};

// Alert if growing unbounded
if (metrics.heapUsed > previousHeapUsed * 1.2) {
  logger.warn('Memory usage growing rapidly');
}
```

---

## 2. CPU Overhead

### CPU Impact Profile

```
Operation                    CPU Usage    Mitigation
────────────────────────────────────────────────────
Turtle Parsing               15-30%       Batch pre-processing
Git Log Parsing              5-10%        Range-based pagination
SPARQL Execution             20-40%       Query optimization
Chunking/Serialization       10-20%       Disk I/O coordination
GC Pauses                    5-15%        Tuned heap settings
```

### CPU-Bound Optimization

#### Parser CPU Reduction
```javascript
// Bad: Parses every line
for (const line of lines) {
  const quad = parser.parse(line);
}

// Good: Batches parsing
const batch = [];
for (const line of lines) {
  batch.push(line);
  if (batch.length >= 1000) {
    const quads = parser.parseBatch(batch);
    yield quads;
    batch.length = 0;  // Reset
  }
}
```

#### SPARQL Query Optimization
```javascript
// Bad: Complex query on large graph
SELECT * WHERE {
  ?s ?p ?o .
  ?s rdf:type ?type .
  ?o rdfs:label ?label .
}

// Good: Pre-filter with limits
SELECT ?s ?type WHERE {
  ?s rdf:type ?type .
  FILTER (?type != owl:ObjectProperty)
}
LIMIT 10000
```

#### CPU Throttling
```javascript
const cpuUsage = process.cpuUsage();

if (cpuUsage.user > cpuThreshold) {
  // Slow down: larger batches, longer delays
  logger.warn('CPU high, reducing throughput');

  // Increase batch interval
  batchProcessor.flushInterval *= 2;

  // Reduce parallelism
  maxConcurrent = Math.max(1, maxConcurrent - 1);
}
```

---

## 3. I/O Patterns

### Disk I/O Optimization

```
I/O Pattern           Throughput    Use Case
────────────────────────────────────────────────────
Sequential read      300MB/s        File streaming
Random access        50MB/s         Chunk loading
Sequential write     250MB/s        Persistence
RAID-0 (4 disks)     1000MB/s       Enterprise
SSD (NVMe)          3500MB/s       High-performance
```

### Read Optimization

#### Chunk Size Selection
```javascript
// File size -> Optimal chunk size
{
  '100MB':   64 * 1024,      // 64KB
  '500MB':   256 * 1024,     // 256KB
  '1GB+':    512 * 1024,     // 512KB
  '10GB+':   1024 * 1024     // 1MB
}
```

#### Buffering Strategy
```javascript
// Small files: Use standard Node buffering
const stream = createReadStream(path, {
  highWaterMark: 65536  // 64KB default
});

// Large files: Increase buffering
const stream = createReadStream(path, {
  highWaterMark: 512 * 1024  // 512KB
});

// Very large files: Stream to disk instead
const output = createWriteStream('output.ndjson');
for await (const quad of largeStream) {
  output.write(JSON.stringify(quad) + '\n');
}
```

### Write Optimization

#### Batch Writing
```javascript
const fs = require('fs').promises;

// Bad: Write every item immediately
for (const item of items) {
  await fs.appendFile('output.txt', item + '\n');
}

// Good: Batch writes
const batch = [];
for (const item of items) {
  batch.push(item);
  if (batch.length >= 10000) {
    await fs.appendFile('output.txt', batch.join('\n') + '\n');
    batch.length = 0;
  }
}
```

#### I/O Throttling
```javascript
class ThrottledWriter {
  constructor(targetMBps = 50) {
    this.targetBytesPerSecond = targetMBps * 1024 * 1024;
    this.bytesWritten = 0;
    this.startTime = Date.now();
  }

  async throttle(bytesWritten) {
    this.bytesWritten += bytesWritten;
    const elapsed = (Date.now() - this.startTime) / 1000;
    const targetBytes = elapsed * this.targetBytesPerSecond;

    if (this.bytesWritten > targetBytes) {
      const excess = this.bytesWritten - targetBytes;
      const delay = (excess / this.targetBytesPerSecond) * 1000;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
```

---

## 4. Backpressure Strategy

### Backpressure Model

```
Normal Flow (20-50% utilized)
    │
    ├─→ Stream at full speed
    └─→ No throttling

Rising Pressure (50-70% utilized)
    │
    ├─→ Reduce batch size
    ├─→ Increase flush frequency
    └─→ Log monitoring metrics

High Pressure (70-80% utilized)
    │
    ├─→ Pause streaming
    ├─→ Trigger GC
    ├─→ Wait for recovery
    └─→ Alert operators

Critical (>80% utilized)
    │
    ├─→ Stop ingestion
    ├─→ Flush all buffers
    ├─→ Force GC
    └─→ Emergency backoff
```

### Implementing Backpressure

```javascript
class BackpressureManager {
  constructor(options = {}) {
    this.memoryThreshold = options.memoryThreshold || 0.8;
    this.cpuThreshold = options.cpuThreshold || 0.8;
    this.ioThreshold = options.ioThreshold || 0.8;
  }

  async checkPressure() {
    const memory = this.getMemoryUsage();
    const cpu = this.getCPUUsage();
    const io = this.getIOUsage();

    return {
      memory: memory > this.memoryThreshold,
      cpu: cpu > this.cpuThreshold,
      io: io > this.ioThreshold,
      pressure: (memory + cpu + io) / 3
    };
  }

  async *withBackpressure(asyncIterable) {
    for await (const item of asyncIterable) {
      const pressure = await this.checkPressure();

      if (pressure.pressure > 0.9) {
        // Critical: stop and recover
        await this.recover();
      } else if (pressure.pressure > 0.7) {
        // High: throttle
        await this.throttle();
      } else if (pressure.pressure > 0.5) {
        // Moderate: be mindful
        await this.yield();
      }

      yield item;
    }
  }

  async recover() {
    logger.error('Critical backpressure, entering recovery mode');

    if (global.gc) {
      global.gc();  // Force garbage collection
    }

    // Wait for recovery
    await new Promise(r => setTimeout(r, 5000));

    logger.info('Recovery complete, resuming');
  }

  async throttle() {
    // Small delay to allow other operations
    await new Promise(r => setImmediate(r));
  }

  async yield() {
    // Be nice to other tasks
    await new Promise(r => setImmediate(r));
  }
}
```

---

## 5. Scaling Matrix

### Processing Capacity

```
Deployment      Memory   CPUs  Max Batch  Throughput
─────────────────────────────────────────────────
Small           512MB    1     500        50K quads/s
Medium          2GB      4     5000       500K quads/s
Large           8GB      8     50000      2M quads/s
Enterprise      64GB     16+   500000     10M+ quads/s
```

### Recommended Settings

#### For 100K Quads
```javascript
{
  batchSize: 5000,
  highWaterMark: 10000,
  chunkSize: 65536,
  maxChunksInMemory: 5,
  flushInterval: 1000
}
```

#### For 1M Quads
```javascript
{
  batchSize: 10000,
  highWaterMark: 50000,
  chunkSize: 256 * 1024,
  maxChunksInMemory: 10,
  flushInterval: 2000
}
```

#### For 10M+ Quads
```javascript
{
  batchSize: 50000,
  highWaterMark: 100000,
  chunkSize: 512 * 1024,
  maxChunksInMemory: 20,
  flushInterval: 5000,
  persistDir: '/fast-disk/chunks'
}
```

---

## 6. Monitoring & Metrics

### Key Metrics to Track

```
Category         Metric              Target    Alert
─────────────────────────────────────────────────
Memory           Heap usage          <70%      >80%
Memory           Peak heap           <500MB    >1GB
CPU              User time           <50%      >70%
CPU              GC pause time       <50ms     >200ms
I/O              Disk throughput     >50MB/s   <10MB/s
I/O              Latency             <10ms     >50ms
Streaming        Batch latency       <10ms     >50ms
Streaming        Backpressure events 0         >10/min
Streaming        Items/second        >100K     <50K
```

### Prometheus Metrics

```javascript
import prometheus from 'prom-client';

const metrics = {
  heapUsed: new prometheus.Gauge({
    name: 'gitvan_heap_used_bytes',
    help: 'Heap memory used'
  }),

  itemsProcessed: new prometheus.Counter({
    name: 'gitvan_items_processed_total',
    help: 'Total items processed'
  }),

  batchLatency: new prometheus.Histogram({
    name: 'gitvan_batch_latency_ms',
    help: 'Time to process batch',
    buckets: [1, 5, 10, 50, 100, 500]
  }),

  backpressureEvents: new prometheus.Counter({
    name: 'gitvan_backpressure_events_total',
    help: 'Backpressure events triggered'
  })
};

// Update metrics
setInterval(() => {
  metrics.heapUsed.set(process.memoryUsage().heapUsed);
}, 1000);
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "GitVan Streaming",
    "panels": [
      {
        "title": "Memory Usage",
        "targets": [
          { "expr": "gitvan_heap_used_bytes / 1024 / 1024" }
        ]
      },
      {
        "title": "Throughput (items/sec)",
        "targets": [
          { "expr": "rate(gitvan_items_processed_total[1m])" }
        ]
      },
      {
        "title": "Batch Latency",
        "targets": [
          { "expr": "histogram_quantile(0.95, gitvan_batch_latency_ms)" }
        ]
      },
      {
        "title": "Backpressure Events",
        "targets": [
          { "expr": "rate(gitvan_backpressure_events_total[5m])" }
        ]
      }
    ]
  }
}
```

---

## 7. Tuning Guide

### Quick Diagnosis

#### Problem: High Memory Usage
```bash
# Check GC behavior
node --trace-gc app.mjs 2>&1 | grep -i gc

# Capture heap dump
node -e "require('heapdump').writeSnapshot()"

# Reduce batch size
batchSize: 1000  # From 5000
```

#### Problem: Slow Processing
```bash
# Check CPU usage
top -p $(pgrep -f 'node app.mjs')

# Profile with clinic
clinic cpu -- node app.mjs

# Optimize queries, increase batch size
batchSize: 10000  # From 5000
```

#### Problem: I/O Bottleneck
```bash
# Monitor disk I/O
iostat -x 1

# Increase chunk size
chunkSize: 512 * 1024  # From 65536

# Enable write batching
flushInterval: 5000  # ms
```

### Performance Tuning Checklist

- [ ] Set appropriate heap size for your data
- [ ] Enable GC monitoring
- [ ] Monitor memory with tools like clinic.js
- [ ] Test with realistic dataset sizes
- [ ] Implement backpressure handling
- [ ] Set up alerting for key metrics
- [ ] Use fast storage for chunk persistence
- [ ] Configure batch sizes based on memory
- [ ] Test with concurrent operations
- [ ] Document your tuning for future ops

---

## 8. Production Checklist

### Before Deployment

- [ ] Capacity planning done (memory, CPU, disk)
- [ ] Performance tested with production data size
- [ ] Backpressure handling configured
- [ ] Monitoring and alerting set up
- [ ] GC tuning validated
- [ ] Disk I/O performance verified
- [ ] Load testing completed
- [ ] Recovery procedures documented
- [ ] Runbook created
- [ ] Team trained on operations

### Operational Runbook

#### Scenario: Memory Usage High
1. Check heap usage: `process.memoryUsage()`
2. Reduce batch size if safe
3. Trigger GC: `global.gc()`
4. Monitor recovery: watch memory for 5 min
5. If not recovering, restart service

#### Scenario: Processing Stalled
1. Check logs for errors
2. Monitor CPU usage: `top`
3. Check disk I/O: `iostat`
4. Verify network connectivity (for remote stores)
5. Restart streaming operation

#### Scenario: Disk Full
1. Check disk usage: `df -h`
2. Clean old chunks: `rm ~/.gitvan/chunks/old*`
3. Verify retention policy
4. Configure cleanup script

---

## 9. Optimization Examples

### Example 1: High-Throughput Data Import

```javascript
// Configuration for maximum throughput
const config = {
  memory: {
    heapLimit: 8 * 1024 * 1024 * 1024,
    batchSize: 50000,
    highWaterMark: 100000
  },
  io: {
    chunkSize: 1024 * 1024,  // 1MB chunks
    flushInterval: 5000      // 5 second flush
  },
  parallel: {
    concurrentStreams: 4,
    maxChunksInMemory: 20
  }
};

// Implementation
const importPipeline = async (fileList) => {
  for (const file of fileList) {
    const parser = new TurtleStreamParser(config);
    const batcher = new BatchProcessor(config);

    for await (const quads of parser.parseFile(file)) {
      await batcher.add(...quads);
    }

    await batcher.shutdown();
  }
};
```

### Example 2: Large-Scale SPARQL Queries

```javascript
// Configuration for scalable queries
const config = {
  memory: {
    heapLimit: 16 * 1024 * 1024 * 1024,
    batchSize: 50000
  },
  query: {
    timeout: 300000,  // 5 minutes
    resultLimit: 1000000
  },
  streaming: {
    enabled: true,
    pageSize: 10000
  }
};

// Implementation
const queryPipeline = async (sparql) => {
  const executor = new StreamingQueryExecutor(store, config);
  const outputFile = createWriteStream('results.jsonl');

  for await (const batch of executor.executeSelectStream(sparql)) {
    for (const result of batch) {
      outputFile.write(JSON.stringify(result) + '\n');
    }
  }

  await new Promise(r => outputFile.end(r));
};
```

---

## Conclusion

Effective scaling of GitVan streaming operations requires:

1. **Memory Planning**: Right-size heap for your workload
2. **CPU Awareness**: Monitor and throttle when needed
3. **I/O Optimization**: Tune chunk sizes and batching
4. **Backpressure**: Implement flow control
5. **Monitoring**: Track metrics continuously
6. **Tuning**: Optimize based on real data
7. **Operations**: Document and train team

With proper configuration and monitoring, GitVan can handle datasets from 100MB to 100GB+ efficiently.

---

**Document Status**: Ready for Production
**Last Updated**: January 10, 2026
**Related Documents**:
- STREAMING-ARCHITECTURE-DESIGN.md
- STREAMING-PHASE1-SPECS.md
- STREAMING-MIGRATION-PLAN.md
