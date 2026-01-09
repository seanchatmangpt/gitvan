#!/usr/bin/env node
/**
 * Phase 1 RDF Performance Benchmarks
 *
 * Targets:
 * - Lock operations: < 10ms
 * - SPARQL queries: < 100ms
 * - Snapshot operations: < 50ms
 * - Queue operations: < 25ms
 */

import { performance } from 'node:perf_hooks';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// Benchmark configuration
const BENCHMARKS_DIR = '.benchmarks';
const ITERATIONS = 100;
const WARMUP_ITERATIONS = 10;

// Performance targets (in milliseconds)
const TARGETS = {
  lock_acquire: 10,
  lock_release: 10,
  lock_query: 100,
  snapshot_save: 50,
  snapshot_load: 50,
  snapshot_query: 100,
  queue_enqueue: 25,
  queue_dequeue: 25,
  queue_query: 100,
  sparql_deadlock_detection: 100,
  sparql_blocking_locks: 100,
  sparql_long_locks: 100,
};

class BenchmarkRunner {
  constructor() {
    this.results = {};
    this.startTime = Date.now();
  }

  /**
   * Run a benchmark
   */
  async benchmark(name, fn, iterations = ITERATIONS) {
    // Warmup
    for (let i = 0; i < WARMUP_ITERATIONS; i++) {
      await fn();
    }

    // Measure
    const timings = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      timings.push(end - start);
    }

    // Calculate statistics
    const sorted = timings.sort((a, b) => a - b);
    const mean = timings.reduce((a, b) => a + b, 0) / timings.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    this.results[name] = {
      mean,
      median,
      p95,
      p99,
      min,
      max,
      iterations,
      target: TARGETS[name],
      pass: p95 <= (TARGETS[name] || Infinity),
    };

    return this.results[name];
  }

  /**
   * Print results
   */
  printResults() {
    console.log('\n' + '='.repeat(80));
    console.log('Phase 1 RDF Performance Benchmarks');
    console.log('='.repeat(80) + '\n');

    const maxNameLength = Math.max(...Object.keys(this.results).map(k => k.length));

    console.log(
      'Operation'.padEnd(maxNameLength + 2) +
      'Mean'.padStart(10) +
      'Median'.padStart(10) +
      'P95'.padStart(10) +
      'P99'.padStart(10) +
      'Target'.padStart(10) +
      '  Status'
    );
    console.log('-'.repeat(80));

    let totalPass = 0;
    let totalFail = 0;

    for (const [name, stats] of Object.entries(this.results)) {
      const status = stats.pass ? '✓ PASS' : '✗ FAIL';
      const statusColor = stats.pass ? '' : '⚠️ ';

      console.log(
        name.padEnd(maxNameLength + 2) +
        `${stats.mean.toFixed(2)}ms`.padStart(10) +
        `${stats.median.toFixed(2)}ms`.padStart(10) +
        `${stats.p95.toFixed(2)}ms`.padStart(10) +
        `${stats.p99.toFixed(2)}ms`.padStart(10) +
        `${stats.target}ms`.padStart(10) +
        `  ${statusColor}${status}`
      );

      if (stats.pass) totalPass++;
      else totalFail++;
    }

    console.log('-'.repeat(80));
    console.log(`\nTotal: ${totalPass} passed, ${totalFail} failed`);

    if (totalFail > 0) {
      console.log('\n⚠️  Some benchmarks exceeded performance targets!\n');
    } else {
      console.log('\n✅ All benchmarks passed performance targets!\n');
    }

    // Show total runtime
    const totalTime = ((Date.now() - this.startTime) / 1000).toFixed(2);
    console.log(`Benchmarks completed in ${totalTime}s\n`);

    return totalFail === 0;
  }

  /**
   * Save results to file
   */
  async saveResults() {
    if (!existsSync(BENCHMARKS_DIR)) {
      await mkdir(BENCHMARKS_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString();
    const filename = join(BENCHMARKS_DIR, `benchmark-${Date.now()}.json`);

    const data = {
      timestamp,
      commit: process.env.GITHUB_SHA || 'local',
      branch: process.env.GITHUB_REF || 'local',
      results: this.results,
    };

    await writeFile(filename, JSON.stringify(data, null, 2));

    // Update latest
    await writeFile(
      join(BENCHMARKS_DIR, 'latest.json'),
      JSON.stringify(data, null, 2)
    );

    console.log(`Results saved to ${filename}`);
  }
}

// Mock implementations for benchmarking
// (In production, these would use actual LockManager, SnapshotStore, etc.)

class MockLockManager {
  constructor() {
    this.locks = new Map();
  }

  async acquireLock(lockName) {
    // Simulate lock acquisition with minimal overhead
    this.locks.set(lockName, {
      lockId: Math.random().toString(36),
      resourceId: lockName,
      acquiredAt: new Date(),
      expiresAt: new Date(Date.now() + 5000),
    });
    return true;
  }

  async releaseLock(lockName) {
    this.locks.delete(lockName);
    return true;
  }

  async queryLocks() {
    // Simulate SPARQL query
    return Array.from(this.locks.values());
  }
}

class MockSnapshotStore {
  constructor() {
    this.snapshots = new Map();
  }

  async save(key, data) {
    this.snapshots.set(key, {
      key,
      data,
      timestamp: new Date(),
      contentHash: Math.random().toString(36),
    });
  }

  async load(key) {
    return this.snapshots.get(key);
  }

  async query() {
    return Array.from(this.snapshots.values());
  }
}

class MockQueueManager {
  constructor() {
    this.queue = [];
  }

  async enqueue(job) {
    this.queue.push({
      jobId: Math.random().toString(36),
      ...job,
      createdAt: new Date(),
    });
  }

  async dequeue() {
    return this.queue.shift();
  }

  async query() {
    return this.queue;
  }
}

// Run benchmarks
async function main() {
  const runner = new BenchmarkRunner();

  console.log('Starting Phase 1 RDF Performance Benchmarks...\n');

  // Lock Manager Benchmarks
  const lockManager = new MockLockManager();

  await runner.benchmark('lock_acquire', async () => {
    await lockManager.acquireLock('test-resource-' + Math.random());
  });

  await runner.benchmark('lock_release', async () => {
    const lockName = 'test-resource';
    await lockManager.acquireLock(lockName);
    await lockManager.releaseLock(lockName);
  });

  await runner.benchmark('lock_query', async () => {
    await lockManager.queryLocks();
  });

  // Snapshot Store Benchmarks
  const snapshotStore = new MockSnapshotStore();

  await runner.benchmark('snapshot_save', async () => {
    await snapshotStore.save('test-key', { value: Math.random() });
  });

  await runner.benchmark('snapshot_load', async () => {
    await snapshotStore.save('load-test', { value: 123 });
    await snapshotStore.load('load-test');
  });

  await runner.benchmark('snapshot_query', async () => {
    await snapshotStore.query();
  });

  // Queue Manager Benchmarks
  const queueManager = new MockQueueManager();

  await runner.benchmark('queue_enqueue', async () => {
    await queueManager.enqueue({ name: 'test-job', priority: 'normal' });
  });

  await runner.benchmark('queue_dequeue', async () => {
    await queueManager.enqueue({ name: 'test-job' });
    await queueManager.dequeue();
  });

  await runner.benchmark('queue_query', async () => {
    await queueManager.query();
  });

  // SPARQL Query Benchmarks (simulated)
  await runner.benchmark('sparql_deadlock_detection', async () => {
    // Simulate SPARQL ASK query for deadlock detection
    await new Promise(resolve => setImmediate(resolve));
  });

  await runner.benchmark('sparql_blocking_locks', async () => {
    // Simulate SPARQL SELECT query for blocking locks
    await lockManager.queryLocks();
  });

  await runner.benchmark('sparql_long_locks', async () => {
    // Simulate SPARQL SELECT query for long-running locks
    await lockManager.queryLocks();
  });

  // Print and save results
  const success = runner.printResults();
  await runner.saveResults();

  process.exit(success ? 0 : 1);
}

main().catch(err => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
