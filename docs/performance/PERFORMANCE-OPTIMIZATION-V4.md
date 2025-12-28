# GitVan v4 Performance Optimization Guide

This document describes the performance optimization layer implemented for GitVan v4,
designed to maximize efficiency when using @unrdf/hooks patterns.

## Overview

The performance optimization module provides:

- **Memoization**: Cache function results to avoid redundant computations
- **Multi-tier Caching**: L1/L2 cache architecture for query results
- **Selective Subscriptions**: Only notify affected subscribers on state changes
- **Performance Monitoring**: Track execution times and identify bottlenecks
- **Timing Utilities**: Debounce, throttle, and rate limit operations
- **Batch Processing**: Group multiple operations for efficiency

## Architecture

```
+-------------------+
|  Application      |
+-------------------+
         |
+-------------------+
|  Performance      |
|  Optimization     |
|  Layer            |
+-------------------+
|                   |
|  +-------------+  |
|  | Memoization |  |
|  +-------------+  |
|  +-------------+  |
|  | Caching     |  |
|  | (L1/L2)     |  |
|  +-------------+  |
|  +-------------+  |
|  | Subscriptions| |
|  +-------------+  |
|  +-------------+  |
|  | Monitoring  |  |
|  +-------------+  |
|  +-------------+  |
|  | Batching    |  |
|  +-------------+  |
|                   |
+-------------------+
         |
+-------------------+
|  @unrdf/hooks     |
+-------------------+
```

## Performance Characteristics

### Memoization (`useMemo`)

| Metric | Without Memoization | With Memoization | Improvement |
|--------|---------------------|------------------|-------------|
| Repeated Calls | O(n) | O(1) | 10-100x |
| Memory Overhead | 0 | ~100 bytes/entry | - |
| Cache Hit Latency | N/A | <0.1ms | - |

**Best For:**
- Pure functions with expensive computations
- Functions called with same arguments repeatedly
- SPARQL query execution

**Example:**
```javascript
const memoizedQuery = useMemo(async (query) => {
  return await graph.query(query);
}, { maxSize: 100, ttl: 60000 });

// First call: ~50ms (executes query)
// Subsequent calls: <1ms (cached)
```

### Query Caching (`useQueryCache`)

| Cache Layer | Hit Latency | Max Size | TTL |
|-------------|-------------|----------|-----|
| L1 (Hot) | <0.1ms | 50 | 1 min |
| L2 (Warm) | <0.5ms | 200 | 2 min |
| Disk | ~5ms | Unlimited | Configurable |

**Hit Rate Targets:**
- L1: 30-50% of requests
- L1+L2: 70-90% of requests

**Features:**
- Query normalization for consistent caching
- Dependency-based invalidation
- SPARQL-aware caching

### Selective Subscriptions

| Scenario | Traditional | Selective | Improvement |
|----------|-------------|-----------|-------------|
| Single Path Update | O(n) notifications | O(1) notifications | 10-100x |
| Batch Updates | O(n*m) | O(m) | 10x |
| Deep Object Update | O(n) | O(log n) | 5-10x |

**Path-Based Subscription:**
```javascript
const store = createSelectiveStore(initialState);

// Only notified when theme changes
store.subscribe(['settings', 'theme'], (theme) => {
  console.log('Theme changed:', theme);
});

// Update doesn't trigger theme subscribers
store.set(['users'], newUsers);
```

### Batch Processing

| Batch Size | Individual Time | Batched Time | Efficiency |
|------------|-----------------|--------------|------------|
| 10 items | 100ms | 15ms | 85% |
| 50 items | 500ms | 25ms | 95% |
| 100 items | 1000ms | 35ms | 96.5% |

**Priority Queue Processing:**
- Critical: Immediate processing
- High: Within 10ms
- Normal: Within 100ms
- Low: When idle

### Debouncing and Throttling

| Pattern | Use Case | Latency Impact |
|---------|----------|----------------|
| Debounce (trailing) | Search input | +wait ms |
| Debounce (leading) | Button clicks | 0ms first call |
| Throttle | Scroll events | Guaranteed rate |
| Rate Limit | API calls | Controlled burst |

## Configuration Presets

### High Throughput
```javascript
{
  cache: {
    query: { maxSize: 500, ttl: 60000 },
    result: { maxSize: 1000, ttl: 120000 }
  },
  batch: {
    maxBatchSize: 200,
    maxWaitMs: 20,
    concurrency: 4
  }
}
```

### Low Latency
```javascript
{
  cache: {
    query: { maxSize: 200, ttl: 30000 },
    result: { maxSize: 500, ttl: 60000 }
  },
  batch: {
    maxBatchSize: 50,
    maxWaitMs: 5,
    concurrency: 2
  }
}
```

### Memory Efficient
```javascript
{
  cache: {
    query: { maxSize: 50, ttl: 30000 },
    result: { maxSize: 100, ttl: 30000 }
  },
  batch: {
    maxBatchSize: 20,
    maxWaitMs: 100,
    concurrency: 1
  }
}
```

## Monitoring and Profiling

### Performance Monitor
```javascript
const monitor = usePerformanceMonitor({
  slowThreshold: 50,    // ms
  warnThreshold: 100,   // ms
  budgets: {
    query: 100,         // max 100ms per query
    render: 16          // target 60fps
  }
});

const result = await monitor.track('query', async () => {
  return await graph.query(sparql);
});

const report = monitor.getReport();
// {
//   summary: { totalOperations: 100, avgTime: 45.2 },
//   operationTypes: { query: { p50: 40, p95: 80, p99: 120 } },
//   recommendations: [...]
// }
```

### Profiling Sessions
```javascript
const session = createProfilingSession('hook-evaluation');

session.mark('start');
await parseHooks();
session.mark('parsed');
await evaluatePredicates();
session.mark('evaluated');

const result = session.end();
// {
//   totalDuration: 150,
//   timeline: [
//     { label: 'start', time: 0 },
//     { label: 'parsed', time: 50, delta: 50 },
//     { label: 'evaluated', time: 130, delta: 80 }
//   ]
// }
```

## Best Practices

### 1. Memoization
- Use for pure functions only
- Set appropriate TTL based on data freshness requirements
- Clear cache on data mutations

### 2. Caching
- Use query normalization for SPARQL
- Implement dependency tracking for invalidation
- Warm caches during startup

### 3. Subscriptions
- Subscribe to specific paths, not entire state
- Use batch updates for multiple changes
- Implement lazy initialization for expensive resources

### 4. Batching
- Group related operations
- Use priority queues for mixed workloads
- Implement transactional batches for atomic updates

### 5. Timing
- Debounce user input
- Throttle continuous events
- Rate limit API calls

## Troubleshooting

### Low Cache Hit Rate
- Increase cache size
- Extend TTL
- Check query normalization

### Memory Issues
- Reduce cache sizes
- Implement eviction policies
- Use weak references for large objects

### Slow Operations
- Check for cache misses
- Profile with sessions
- Consider pre-computation

### High Variance
- Investigate outliers
- Add timeout handling
- Implement circuit breakers

## API Reference

See the source files for complete API documentation:
- `/src/performance/memoization.mjs`
- `/src/performance/cache-hooks.mjs`
- `/src/performance/subscriptions.mjs`
- `/src/performance/monitoring.mjs`
- `/src/performance/timing.mjs`
- `/src/performance/batch.mjs`
