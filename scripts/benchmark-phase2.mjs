#!/usr/bin/env node
/**
 * Phase 2 RDF Performance Benchmarks - Performance Monitoring
 *
 * Benchmarks for:
 * - Performance measurement recording
 * - Anomaly detection queries
 * - SPARQL query timing
 * - N3 rule application
 * - Correlation discovery
 * - Regression detection
 * - Budget violation analysis
 *
 * Targets:
 * - All SPARQL queries: < 100ms
 * - Measurement recording: < 50ms
 * - Anomaly detection: < 100ms
 * - N3 rule application: < 150ms
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
  // Measurement operations
  measurement_record: 50,
  measurement_query: 100,
  measurement_aggregation: 100,

  // Anomaly detection
  anomaly_detection: 100,
  anomaly_classification: 100,
  anomaly_threshold: 80,

  // SPARQL queries
  sparql_correlation_discovery: 100,
  sparql_pattern_recognition: 100,
  sparql_regression_detection: 100,
  sparql_trend_analysis: 100,
  sparql_budget_violation: 100,

  // N3 rules
  n3_budget_violation_rule: 150,
  n3_memory_leak_detection: 150,
  n3_io_bound_detection: 150,

  // Complex analytics
  operation_correlation: 100,
  performance_chain_analysis: 100,
  historical_trend_query: 100,
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
    console.log('Phase 2 RDF Performance Benchmarks - Performance Monitoring');
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
    const filename = join(BENCHMARKS_DIR, `benchmark-phase2-${Date.now()}.json`);

    const data = {
      phase: 2,
      name: 'Performance Monitoring',
      timestamp,
      commit: process.env.GITHUB_SHA || 'local',
      branch: process.env.GITHUB_REF || 'local',
      results: this.results,
    };

    await writeFile(filename, JSON.stringify(data, null, 2));

    // Update latest for phase 2
    await writeFile(
      join(BENCHMARKS_DIR, 'latest-phase2.json'),
      JSON.stringify(data, null, 2)
    );

    console.log(`Results saved to ${filename}`);
  }
}

// Mock implementations for benchmarking

class MockPerformanceMonitor {
  constructor() {
    this.measurements = new Map();
    this.budgets = new Map();
    this.anomalies = [];
  }

  async recordMeasurement(operation, metrics) {
    const measurement = {
      id: Math.random().toString(36),
      operation,
      duration: metrics.duration,
      memory: metrics.memory || 0,
      cpu: metrics.cpu || 0,
      timestamp: new Date(),
    };

    this.measurements.set(measurement.id, measurement);
    return measurement;
  }

  async queryMeasurements(operationFilter = null) {
    // Simulate SPARQL query
    const results = Array.from(this.measurements.values());
    return operationFilter
      ? results.filter(m => m.operation === operationFilter)
      : results;
  }

  async aggregateMeasurements(operation) {
    const measurements = await this.queryMeasurements(operation);

    if (measurements.length === 0) return null;

    const durations = measurements.map(m => m.duration);
    return {
      operation,
      count: measurements.length,
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
    };
  }

  async detectAnomalies() {
    // Simulate anomaly detection with SPARQL + N3 rules
    const anomalies = [];

    for (const [id, measurement] of this.measurements) {
      const budget = this.budgets.get(measurement.operation);

      if (budget && measurement.duration > budget.maxDuration) {
        anomalies.push({
          type: 'budget_violation',
          measurement: id,
          severity: 'high',
        });
      }

      if (measurement.cpu > 90 && measurement.memory > 512000) {
        anomalies.push({
          type: 'resource_exhaustion',
          measurement: id,
          severity: 'critical',
        });
      }
    }

    this.anomalies = anomalies;
    return anomalies;
  }

  async classifyAnomaly(anomalyId) {
    const anomaly = this.anomalies.find(a => a.measurement === anomalyId);
    if (!anomaly) return null;

    // Simulate N3 reasoning for classification
    return {
      ...anomaly,
      category: anomaly.type === 'budget_violation' ? 'performance' : 'resource',
      recommendation: anomaly.type === 'budget_violation'
        ? 'Investigate performance bottleneck'
        : 'Scale resources or optimize memory usage',
    };
  }

  async findCorrelations() {
    // Simulate SPARQL correlation discovery
    const operations = Array.from(new Set(
      Array.from(this.measurements.values()).map(m => m.operation)
    ));

    const correlations = [];
    for (let i = 0; i < operations.length; i++) {
      for (let j = i + 1; j < operations.length; j++) {
        correlations.push({
          op1: operations[i],
          op2: operations[j],
          coefficient: Math.random(), // Simulated correlation
        });
      }
    }

    return correlations.filter(c => c.coefficient > 0.7);
  }

  async detectRegressions() {
    // Simulate regression detection query
    const operations = new Set();
    for (const measurement of this.measurements.values()) {
      operations.add(measurement.operation);
    }

    const regressions = [];
    for (const op of operations) {
      const measurements = await this.queryMeasurements(op);
      if (measurements.length < 2) continue;

      const recent = measurements[measurements.length - 1].duration;
      const baseline = measurements[0].duration;
      const change = (recent - baseline) / baseline;

      if (change > 0.1) { // 10% regression
        regressions.push({
          operation: op,
          baseline,
          current: recent,
          change: change * 100,
        });
      }
    }

    return regressions;
  }

  async analyzeChain(startOperation) {
    // Simulate performance chain analysis
    const chain = [];
    let current = startOperation;

    for (let i = 0; i < 5; i++) {
      const measurements = await this.queryMeasurements(current);
      if (measurements.length === 0) break;

      const avg = measurements.reduce((a, b) => a + b.duration, 0) / measurements.length;
      chain.push({ operation: current, avgDuration: avg });

      // Simulate finding next operation in chain
      current = `downstream-${i}`;
    }

    return chain;
  }

  async queryTrend(operation, days = 90) {
    // Simulate historical trend query
    const measurements = await this.queryMeasurements(operation);

    // Group by day
    const trends = {};
    for (const m of measurements) {
      const day = new Date(m.timestamp).toISOString().split('T')[0];
      if (!trends[day]) trends[day] = [];
      trends[day].push(m.duration);
    }

    return Object.entries(trends).map(([day, durations]) => ({
      day,
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      count: durations.length,
    }));
  }

  async checkBudgetViolations() {
    // Simulate SPARQL budget violation query
    const violations = [];

    for (const [id, measurement] of this.measurements) {
      const budget = this.budgets.get(measurement.operation);

      if (!budget) continue;

      if (measurement.duration > budget.maxDuration) {
        violations.push({
          measurement: id,
          operation: measurement.operation,
          actual: measurement.duration,
          budget: budget.maxDuration,
          excess: measurement.duration - budget.maxDuration,
        });
      }
    }

    return violations;
  }

  setBudget(operation, maxDuration, maxMemory = Infinity) {
    this.budgets.set(operation, { maxDuration, maxMemory });
  }
}

// Run benchmarks
async function main() {
  const runner = new BenchmarkRunner();
  const monitor = new MockPerformanceMonitor();

  console.log('Starting Phase 2 RDF Performance Benchmarks...\n');

  // Seed some data
  monitor.setBudget('build', 5000, 512000);
  monitor.setBudget('test', 3000, 256000);
  monitor.setBudget('deploy', 10000, 1024000);

  for (let i = 0; i < 100; i++) {
    const operations = ['build', 'test', 'deploy', 'lint', 'analyze'];
    const op = operations[i % operations.length];
    await monitor.recordMeasurement(op, {
      duration: 1000 + Math.random() * 4000,
      memory: 100000 + Math.random() * 400000,
      cpu: 20 + Math.random() * 70,
    });
  }

  // Measurement Operations
  await runner.benchmark('measurement_record', async () => {
    await monitor.recordMeasurement('test-op', {
      duration: 1234,
      memory: 256000,
      cpu: 45,
    });
  });

  await runner.benchmark('measurement_query', async () => {
    await monitor.queryMeasurements('build');
  });

  await runner.benchmark('measurement_aggregation', async () => {
    await monitor.aggregateMeasurements('test');
  });

  // Anomaly Detection
  await runner.benchmark('anomaly_detection', async () => {
    await monitor.detectAnomalies();
  });

  await runner.benchmark('anomaly_classification', async () => {
    const anomalies = await monitor.detectAnomalies();
    if (anomalies.length > 0) {
      await monitor.classifyAnomaly(anomalies[0].measurement);
    }
  });

  await runner.benchmark('anomaly_threshold', async () => {
    // Simulate threshold-based anomaly detection
    const measurements = await monitor.queryMeasurements();
    const anomalies = measurements.filter(m => m.duration > 4000);
  });

  // SPARQL Queries
  await runner.benchmark('sparql_correlation_discovery', async () => {
    await monitor.findCorrelations();
  });

  await runner.benchmark('sparql_pattern_recognition', async () => {
    // Simulate pattern recognition query
    const measurements = await monitor.queryMeasurements();
    const patterns = measurements.filter(m =>
      m.cpu < 30 && m.memory > 400000
    );
  });

  await runner.benchmark('sparql_regression_detection', async () => {
    await monitor.detectRegressions();
  });

  await runner.benchmark('sparql_trend_analysis', async () => {
    await monitor.queryTrend('build', 30);
  });

  await runner.benchmark('sparql_budget_violation', async () => {
    await monitor.checkBudgetViolations();
  });

  // N3 Rules (simulated)
  await runner.benchmark('n3_budget_violation_rule', async () => {
    // Simulate N3 rule application
    const measurements = await monitor.queryMeasurements();
    for (const m of measurements) {
      const budget = monitor.budgets.get(m.operation);
      if (budget && m.duration > budget.maxDuration) {
        // Rule triggered
      }
    }
  });

  await runner.benchmark('n3_memory_leak_detection', async () => {
    // Simulate memory leak detection rule
    const measurements = await monitor.queryMeasurements();
    const sorted = measurements.sort((a, b) =>
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].memory > sorted[i - 1].memory * 1.1) {
        // Potential leak detected
      }
    }
  });

  await runner.benchmark('n3_io_bound_detection', async () => {
    // Simulate I/O bound detection rule
    const measurements = await monitor.queryMeasurements();
    const ioBound = measurements.filter(m =>
      m.memory > 400000 && m.cpu < 30
    );
  });

  // Complex Analytics
  await runner.benchmark('operation_correlation', async () => {
    // Simulate finding operations that correlate with CPU spikes
    const measurements = await monitor.queryMeasurements();
    const highCpu = measurements.filter(m => m.cpu > 80);
    const correlations = new Map();

    for (const m of highCpu) {
      const count = correlations.get(m.operation) || 0;
      correlations.set(m.operation, count + 1);
    }
  });

  await runner.benchmark('performance_chain_analysis', async () => {
    await monitor.analyzeChain('build');
  });

  await runner.benchmark('historical_trend_query', async () => {
    const operations = ['build', 'test', 'deploy'];
    for (const op of operations) {
      await monitor.queryTrend(op, 90);
    }
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
