# GitVan v2 Performance Criteria and Benchmarks

## Executive Summary

This document defines performance criteria, benchmarks, and testing methodologies for GitVan v2. All performance targets align with the Voice of Customer requirements and support the project's goal of replacing existing CI/CD automation while maintaining superior local execution speed.

## Performance Targets

### Primary Performance Metrics

| Metric | Target | Measurement | Critical Success Factor |
|--------|--------|-------------|------------------------|
| **Time to First Working (TTFW)** | < 10 minutes | From npm install to first job execution | Critical |
| **Local Job Execution (p95)** | ≤ 300ms | Single atomic job on local repository | Critical |
| **Local Job Execution (p99)** | ≤ 800ms | Single atomic job on local repository | High |
| **Daemon Startup Time** | ≤ 5 seconds | Cold start to ready state | High |
| **Event Processing Latency** | ≤ 100ms | Event detection to job start | High |
| **Memory Usage (steady state)** | ≤ 50MB | Daemon with 10 active jobs | Medium |

### Secondary Performance Metrics

| Metric | Target | Measurement | Priority |
|--------|--------|-------------|----------|
| **Repository Scan Time** | ≤ 1s per 1000 commits | Initial event detection scan | Medium |
| **Template Rendering** | ≤ 50ms | Standard changelog template | Medium |
| **Lock Acquisition Time** | ≤ 10ms | Atomic ref creation | Medium |
| **Receipt Write Time** | ≤ 20ms | JSON note to git refs | Medium |
| **Configuration Load Time** | ≤ 100ms | gitvan.config.js parsing | Low |
| **Job Discovery Time** | ≤ 200ms | Scanning jobs/ directory | Low |

## Performance Test Categories

### 1. Micro-benchmarks

**Purpose**: Test individual component performance in isolation.

#### Lock System Performance
```bash
# Test: Atomic lock acquisition under contention
# Scenario: 100 concurrent lock attempts on same resource
# Success Criteria:
# - One lock succeeds, 99 fail gracefully
# - Total time < 100ms for all attempts
# - No race conditions or corruption

# Implementation
for i in {1..100}; do
  (gitvan-internal acquire-lock "test-lock" "$(git rev-parse HEAD)" &)
done
wait
```

#### Template Rendering Performance
```bash
# Test: Nunjucks template rendering speed
# Scenario: Render changelog with 1000 commits
# Success Criteria:
# - p95 < 50ms
# - Memory usage < 10MB during rendering
# - Deterministic output

# Implementation
time gitvan job run --name perf-test:changelog-1000
```

#### Git Operations Performance
```bash
# Test: useGit() composable operation speed
# Scenario: Common git operations through GitAPI
# Success Criteria:
# - git.status() < 10ms
# - git.log() < 20ms
# - git.commit() < 50ms

# Implementation
gitvan job run --name perf-test:git-operations
```

### 2. Integration Benchmarks

**Purpose**: Test end-to-end performance of complete workflows.

#### Job Execution Pipeline
```bash
# Test: Complete job execution cycle
# Scenario: Event trigger → lock → execute → receipt → cleanup
# Success Criteria:
# - Total cycle < 300ms (p95)
# - No memory leaks over 1000 cycles
# - All receipts written successfully

# Implementation
for i in {1..1000}; do
  git commit --allow-empty -m "perf test $i"
  sleep 0.1  # Allow daemon to process
done
```

#### Multi-Worktree Performance
```bash
# Test: Concurrent execution across multiple worktrees
# Scenario: 5 worktrees, simultaneous events
# Success Criteria:
# - Linear scaling (no contention)
# - Individual job time unchanged
# - Lock isolation maintained

# Implementation
gitvan daemon start --worktrees all --perf-mode
```

### 3. Load Testing

**Purpose**: Validate performance under realistic production loads.

#### High-Frequency Events
```bash
# Test: Rapid commit stream processing
# Scenario: 100 commits/minute for 10 minutes
# Success Criteria:
# - No event processing delays
# - Memory usage stable
# - All events processed

# Implementation
gitvan-loadtest --commits-per-minute=100 --duration=10m
```

#### Large Repository Handling
```bash
# Test: Performance with large Git repositories
# Scenario: Repository with 50k commits, 10k files
# Success Criteria:
# - Daemon startup < 30s
# - Event detection < 5s
# - Memory usage < 200MB

# Implementation
git log --oneline | wc -l  # Verify size
time gitvan daemon start --dry-run
```

### 4. Stress Testing

**Purpose**: Find breaking points and validate graceful degradation.

#### Memory Stress Test
```bash
# Test: Long-running daemon memory stability
# Scenario: 24-hour continuous operation
# Success Criteria:
# - Memory usage stable after initial ramp
# - No memory leaks detected
# - All jobs complete successfully

# Implementation
gitvan daemon start --memory-profile &
DAEMON_PID=$!
sleep 86400  # 24 hours
kill $DAEMON_PID
```

#### Concurrency Stress Test
```bash
# Test: Maximum concurrent job execution
# Scenario: Increase concurrency until failure
# Success Criteria:
# - Graceful degradation beyond limits
# - No data corruption
# - Clear error messages

# Implementation
gitvan-stress-test --max-concurrent=100 --increment=10
```

## Benchmark Environments

### Development Environment
- **Hardware**: MacBook Pro M2, 16GB RAM, SSD
- **OS**: macOS 14.x
- **Git**: Latest stable version
- **Node.js**: v18.x LTS
- **Purpose**: Development and quick validation

### CI Environment
- **Hardware**: GitHub Actions runners (2 CPU, 7GB RAM)
- **OS**: Ubuntu 22.04 LTS
- **Git**: Default package version
- **Node.js**: v18.x LTS
- **Purpose**: Automated performance regression testing

### Production-like Environment
- **Hardware**: AWS EC2 c5.large (2 vCPU, 4GB RAM)
- **OS**: Ubuntu 22.04 LTS
- **Git**: Latest stable version
- **Node.js**: v18.x LTS
- **Purpose**: Production performance validation

## Performance Testing Framework

### Test Infrastructure

```javascript
// specs/validation/perf-test-framework.mjs
import { performance } from 'perf_hooks'
import { execSync } from 'child_process'
import { EventEmitter } from 'events'

export class GitVanPerformanceTest extends EventEmitter {
  constructor(config = {}) {
    super()
    this.config = {
      samples: 100,
      warmupRuns: 10,
      timeout: 30000,
      ...config
    }
    this.results = []
  }

  async runBenchmark(name, testFn) {
    console.log(`Starting benchmark: ${name}`)

    // Warmup
    for (let i = 0; i < this.config.warmupRuns; i++) {
      await testFn()
    }

    // Actual test
    for (let i = 0; i < this.config.samples; i++) {
      const start = performance.now()
      await testFn()
      const end = performance.now()
      this.results.push({
        name,
        sample: i,
        duration: end - start,
        timestamp: new Date().toISOString()
      })
      this.emit('sample', { name, sample: i, duration: end - start })
    }

    return this.analyzeResults(name)
  }

  analyzeResults(name) {
    const durations = this.results
      .filter(r => r.name === name)
      .map(r => r.duration)
      .sort((a, b) => a - b)

    const stats = {
      name,
      samples: durations.length,
      mean: durations.reduce((a, b) => a + b, 0) / durations.length,
      median: durations[Math.floor(durations.length / 2)],
      p95: durations[Math.floor(durations.length * 0.95)],
      p99: durations[Math.floor(durations.length * 0.99)],
      min: durations[0],
      max: durations[durations.length - 1]
    }

    console.log(`${name} Results:`)
    console.log(`  Mean: ${stats.mean.toFixed(2)}ms`)
    console.log(`  P95:  ${stats.p95.toFixed(2)}ms`)
    console.log(`  P99:  ${stats.p99.toFixed(2)}ms`)

    return stats
  }
}
```

### Specific Test Implementations

#### Job Execution Benchmark
```javascript
// specs/validation/benchmarks/job-execution.mjs
import { GitVanPerformanceTest } from '../perf-test-framework.mjs'
import { execSync } from 'child_process'

const test = new GitVanPerformanceTest({ samples: 1000 })

async function testAtomicJobExecution() {
  const start = performance.now()
  execSync('gitvan job run --name test:atomic-job', { stdio: 'pipe' })
  return performance.now() - start
}

const results = await test.runBenchmark('atomic-job-execution', testAtomicJobExecution)

// Validate against targets
if (results.p95 > 300) {
  console.error(`FAIL: P95 ${results.p95}ms exceeds target 300ms`)
  process.exit(1)
}

if (results.p99 > 800) {
  console.error(`FAIL: P99 ${results.p99}ms exceeds target 800ms`)
  process.exit(1)
}

console.log('✅ Job execution performance targets met')
```

#### Memory Usage Monitoring
```javascript
// specs/validation/benchmarks/memory-usage.mjs
import { GitVanPerformanceTest } from '../perf-test-framework.mjs'
import { spawn } from 'child_process'

async function monitorDaemonMemory() {
  const daemon = spawn('gitvan', ['daemon', 'start'], { stdio: 'pipe' })
  const measurements = []

  const monitor = setInterval(() => {
    try {
      const memInfo = execSync(`ps -o rss= -p ${daemon.pid}`).toString().trim()
      const memoryMB = parseInt(memInfo) / 1024
      measurements.push({
        timestamp: Date.now(),
        memoryMB: memoryMB
      })
      console.log(`Memory: ${memoryMB.toFixed(1)}MB`)
    } catch (error) {
      console.error('Failed to measure memory:', error.message)
    }
  }, 1000)

  // Run for 5 minutes
  setTimeout(() => {
    clearInterval(monitor)
    daemon.kill('SIGTERM')

    const maxMemory = Math.max(...measurements.map(m => m.memoryMB))
    console.log(`Peak memory usage: ${maxMemory.toFixed(1)}MB`)

    if (maxMemory > 50) {
      console.error(`FAIL: Peak memory ${maxMemory}MB exceeds target 50MB`)
      process.exit(1)
    }

    console.log('✅ Memory usage targets met')
  }, 5 * 60 * 1000)
}

await monitorDaemonMemory()
```

## Continuous Performance Monitoring

### Performance Regression Detection

```yaml
# .github/workflows/performance.yml
name: Performance Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - name: Run Performance Tests
        run: |
          npm run test:performance
          npm run test:memory
          npm run test:load
      - name: Upload Results
        uses: actions/upload-artifact@v4
        with:
          name: performance-results
          path: performance-results.json
      - name: Performance Regression Check
        run: |
          node scripts/check-performance-regression.js
```

### Performance Dashboard

```javascript
// scripts/performance-dashboard.mjs
import fs from 'fs'
import { execSync } from 'child_process'

export class PerformanceDashboard {
  constructor() {
    this.results = this.loadHistoricalResults()
  }

  loadHistoricalResults() {
    try {
      return JSON.parse(fs.readFileSync('performance-history.json', 'utf8'))
    } catch {
      return []
    }
  }

  addResult(result) {
    this.results.push({
      ...result,
      timestamp: new Date().toISOString(),
      gitSha: execSync('git rev-parse HEAD').toString().trim()
    })
    this.saveResults()
  }

  saveResults() {
    fs.writeFileSync('performance-history.json', JSON.stringify(this.results, null, 2))
  }

  generateReport() {
    const latest = this.results[this.results.length - 1]
    const previous = this.results[this.results.length - 2]

    if (!previous) {
      console.log('No previous results for comparison')
      return
    }

    console.log('Performance Comparison:')
    console.log(`Job Execution P95: ${latest.jobExecutionP95}ms (${this.percentChange(previous.jobExecutionP95, latest.jobExecutionP95)})`)
    console.log(`Memory Usage: ${latest.memoryUsage}MB (${this.percentChange(previous.memoryUsage, latest.memoryUsage)})`)
    console.log(`Event Processing: ${latest.eventProcessing}ms (${this.percentChange(previous.eventProcessing, latest.eventProcessing)})`)
  }

  percentChange(old, new_val) {
    const change = ((new_val - old) / old) * 100
    const sign = change > 0 ? '+' : ''
    return `${sign}${change.toFixed(1)}%`
  }
}
```

## Performance Optimization Guidelines

### Code-Level Optimizations

1. **Minimize Git Command Overhead**
   - Batch Git operations where possible
   - Use plumbing commands for better performance
   - Cache frequently accessed Git data

2. **Efficient Template Processing**
   - Pre-compile templates when possible
   - Limit template complexity
   - Cache rendered templates for identical data

3. **Memory Management**
   - Implement proper cleanup in long-running processes
   - Use streaming for large data processing
   - Monitor and prevent memory leaks

4. **Async/Await Optimization**
   - Parallelize independent operations
   - Use appropriate concurrency limits
   - Implement proper error boundaries

### Configuration Tuning

```javascript
// High-performance configuration example
export default defineConfig({
  daemon: {
    pollMs: 1000,           // Faster polling for responsiveness
    lookback: 300,          // Shorter lookback for speed
    maxPerTick: 25,         // Moderate batch size
    tz: 'UTC'               // Avoid timezone calculations
  },

  // Performance-oriented settings
  performance: {
    cacheTemplates: true,
    batchGitOps: true,
    memoryLimit: '50MB',
    timeoutMs: 30000
  }
})
```

## Performance Validation Checklist

### Pre-Release Validation

- [ ] All micro-benchmarks pass targets
- [ ] Integration tests meet performance criteria
- [ ] Load testing completed successfully
- [ ] Memory usage remains within bounds
- [ ] No performance regressions detected
- [ ] Cross-platform testing completed

### Production Readiness

- [ ] Performance monitoring deployed
- [ ] Alert thresholds configured
- [ ] Performance documentation updated
- [ ] Team trained on performance tools
- [ ] Rollback procedures tested
- [ ] Performance baselines established

## Performance Troubleshooting Guide

### Common Performance Issues

1. **Slow Job Execution**
   - Check Git repository size and complexity
   - Verify template efficiency
   - Monitor system resource usage
   - Review job implementation for bottlenecks

2. **High Memory Usage**
   - Check for memory leaks in long-running processes
   - Verify template data size
   - Monitor daemon restart frequency
   - Review job cleanup procedures

3. **Event Processing Delays**
   - Verify daemon polling configuration
   - Check lock contention patterns
   - Monitor Git repository health
   - Review event complexity

### Performance Monitoring Commands

```bash
# Monitor GitVan daemon performance
gitvan perf monitor --duration=1h --output=perf-report.json

# Analyze job execution patterns
gitvan perf analyze --job-type=atomic --timeframe=24h

# Generate performance report
gitvan perf report --format=html --output=performance-report.html

# Memory usage profiling
gitvan perf memory --profile-heap --duration=30m
```

This performance framework ensures GitVan v2 meets all performance targets while providing comprehensive monitoring and optimization capabilities.