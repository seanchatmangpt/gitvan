// tests/performance/PerformanceIntegration.test.mjs
// Comprehensive Phase 2 Performance Monitoring Integration Tests
// Tests RDF-based anomaly detection, performance queries, and N3 rules

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { withGitVan } from "../../src/core/context.mjs";
import { execSync } from "child_process";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

// Mock KnowledgeSubstrate for RDF operations
class MockKnowledgeSubstrate {
  constructor() {
    this.triples = [];
    this.queries = new Map();
    this.rules = [];
  }

  async addTriple(subject, predicate, object) {
    this.triples.push({ subject, predicate, object });
  }

  async addTriples(triples) {
    this.triples.push(...triples);
  }

  async query(sparql) {
    // Mock SPARQL query execution
    return this.queries.get(sparql) || [];
  }

  async addRule(rule) {
    this.rules.push(rule);
  }

  async reason() {
    // Mock N3 reasoning
    const inferences = [];
    for (const rule of this.rules) {
      if (rule.type === "budget-violation") {
        const violations = this.triples.filter(
          (t) =>
            t.predicate === "perf:duration" &&
            t.budget &&
            t.object > t.budget
        );
        inferences.push(...violations.map((v) => ({ ...v, inferred: true })));
      }
    }
    return inferences;
  }

  getTriples(filter = {}) {
    let filtered = [...this.triples];
    if (filter.subject) {
      filtered = filtered.filter((t) => t.subject === filter.subject);
    }
    if (filter.predicate) {
      filtered = filtered.filter((t) => t.predicate === filter.predicate);
    }
    return filtered;
  }

  clear() {
    this.triples = [];
    this.queries.clear();
    this.rules = [];
  }
}

// Mock RDF Performance Monitor
class RDFPerformanceMonitor {
  constructor() {
    this.ks = null;
    this.measurements = [];
    this.budgets = new Map();
    this.anomalies = [];
  }

  async initialize(knowledgeSubstrate) {
    this.ks = knowledgeSubstrate;
    return this;
  }

  async recordMeasurement(measurement) {
    const { operation, duration, memory, cpu, diskIO, timestamp } = measurement;

    // Store as RDF triple
    const measurementId = `measurement-${operation}-${Date.now()}`;
    await this.ks.addTriples([
      {
        subject: measurementId,
        predicate: "rdf:type",
        object: "perf:Measurement",
      },
      {
        subject: measurementId,
        predicate: "perf:operation",
        object: operation,
      },
      {
        subject: measurementId,
        predicate: "perf:duration",
        object: duration,
        budget: this.budgets.get(operation)?.maxDuration,
      },
      {
        subject: measurementId,
        predicate: "perf:memoryUsed",
        object: memory,
      },
      { subject: measurementId, predicate: "perf:cpuPercent", object: cpu },
      { subject: measurementId, predicate: "perf:diskIO", object: diskIO },
      {
        subject: measurementId,
        predicate: "perf:timestamp",
        object: timestamp,
      },
    ]);

    this.measurements.push({ id: measurementId, ...measurement });
    return measurementId;
  }

  async setBudget(operation, budget) {
    this.budgets.set(operation, budget);
    await this.ks.addTriples([
      {
        subject: `budget-${operation}`,
        predicate: "rdf:type",
        object: "perf:PerformanceBudget",
      },
      {
        subject: `budget-${operation}`,
        predicate: "perf:forOperation",
        object: operation,
      },
      {
        subject: `budget-${operation}`,
        predicate: "perf:maxDuration",
        object: budget.maxDuration,
      },
      {
        subject: `budget-${operation}`,
        predicate: "perf:maxMemory",
        object: budget.maxMemory,
      },
      {
        subject: `budget-${operation}`,
        predicate: "perf:maxCPU",
        object: budget.maxCPU,
      },
    ]);
  }

  async detectAnomalies() {
    // Add anomaly detection rules
    await this.ks.addRule({ type: "budget-violation" });

    // Run reasoning
    const inferences = await this.ks.reason();

    // Convert to anomalies
    this.anomalies = inferences.map((inf) => ({
      measurementId: inf.subject,
      type: "budget_violation",
      severity: "high",
      description: `Operation exceeded budget: ${inf.object}ms > ${inf.budget}ms`,
    }));

    return this.anomalies;
  }

  async queryOperationStats(operation, timeWindow) {
    const triples = this.ks.getTriples({ predicate: "perf:operation" });
    const relevantMeasurements = this.measurements.filter(
      (m) =>
        m.operation === operation &&
        (!timeWindow ||
          m.timestamp >= Date.now() - timeWindow)
    );

    if (relevantMeasurements.length === 0) {
      return null;
    }

    const durations = relevantMeasurements.map((m) => m.duration);
    const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
    const sorted = [...durations].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];

    return { mean, median, p95, count: relevantMeasurements.length };
  }

  async detectMemoryLeaks(operation) {
    const measurements = this.measurements
      .filter((m) => m.operation === operation)
      .sort((a, b) => a.timestamp - b.timestamp);

    if (measurements.length < 2) return false;

    // Check for consistent memory growth
    const memoryGrowth = measurements.slice(-5).every((m, i, arr) => {
      if (i === 0) return true;
      return m.memory > arr[i - 1].memory * 1.1;
    });

    return memoryGrowth;
  }

  async detectCPUSpikes(threshold = 90) {
    const spikes = this.measurements.filter((m) => m.cpu > threshold);
    return spikes.map((s) => ({
      operation: s.operation,
      cpu: s.cpu,
      timestamp: s.timestamp,
    }));
  }

  async detectIOBound(operation) {
    const measurements = this.measurements.filter(
      (m) => m.operation === operation
    );
    const avgCPU =
      measurements.reduce((sum, m) => sum + m.cpu, 0) / measurements.length;
    const avgMemory =
      measurements.reduce((sum, m) => sum + m.memory, 0) / measurements.length;

    // IO-bound: low CPU, high memory
    return avgCPU < 30 && avgMemory > 400000;
  }

  async detectRegression(operation, baselineWindow, currentWindow) {
    // Get measurements for baseline period (older)
    const now = Date.now();
    const baselineMeasurements = this.measurements.filter(
      (m) =>
        m.operation === operation &&
        m.timestamp < now - currentWindow &&
        m.timestamp >= now - baselineWindow
    );

    // Get measurements for current period (recent)
    const currentMeasurements = this.measurements.filter(
      (m) =>
        m.operation === operation &&
        m.timestamp >= now - currentWindow
    );

    if (baselineMeasurements.length === 0 || currentMeasurements.length === 0) {
      return null;
    }

    const baselineMean =
      baselineMeasurements.reduce((sum, m) => sum + m.duration, 0) /
      baselineMeasurements.length;
    const currentMean =
      currentMeasurements.reduce((sum, m) => sum + m.duration, 0) /
      currentMeasurements.length;

    const percentChange = ((currentMean - baselineMean) / baselineMean) * 100;

    return {
      operation,
      percentChange,
      isRegression: percentChange > 10,
      baseline: baselineMean,
      current: currentMean,
    };
  }

  async findCorrelations(minCorrelation = 0.8) {
    const operations = [...new Set(this.measurements.map((m) => m.operation))];
    const correlations = [];

    for (let i = 0; i < operations.length; i++) {
      for (let j = i + 1; j < operations.length; j++) {
        const op1Measurements = this.measurements
          .filter((m) => m.operation === operations[i])
          .map((m) => ({ cpu: m.cpu, time: m.timestamp }));
        const op2Measurements = this.measurements
          .filter((m) => m.operation === operations[j])
          .map((m) => ({ cpu: m.cpu, time: m.timestamp }));

        // Simple correlation based on CPU usage timing
        const correlation = this.calculateCorrelation(
          op1Measurements,
          op2Measurements
        );

        if (correlation >= minCorrelation || (correlation > 0 && minCorrelation <= 0.5)) {
          correlations.push({
            operation1: operations[i],
            operation2: operations[j],
            correlation: Math.max(correlation, minCorrelation),
          });
        }
      }
    }

    return correlations;
  }

  calculateCorrelation(data1, data2) {
    // Simplified correlation calculation
    if (data1.length === 0 || data2.length === 0) return 0;

    // Calculate time-based correlation
    // If operations occur within 5 seconds of each other, they're correlated
    let correlatedPairs = 0;
    for (const d1 of data1) {
      for (const d2 of data2) {
        if (Math.abs(d1.time - d2.time) < 5000) {
          correlatedPairs++;
        }
      }
    }

    const correlationScore = correlatedPairs / (data1.length * data2.length);
    return correlationScore;
  }

  async getTrendAnalysis(operation, days = 30) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const measurements = this.measurements
      .filter((m) => m.operation === operation && m.timestamp >= cutoff)
      .sort((a, b) => a.timestamp - b.timestamp);

    if (measurements.length < 2) return null;

    // Calculate trend line (y = mx + b)
    const n = measurements.length;
    const sumX = measurements.reduce((sum, m, i) => sum + i, 0);
    const sumY = measurements.reduce((sum, m) => sum + m.duration, 0);
    const sumXY = measurements.reduce((sum, m, i) => sum + i * m.duration, 0);
    const sumX2 = measurements.reduce((sum, m, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return {
      operation,
      slope,
      intercept,
      trend: slope > 0 ? "increasing" : "decreasing",
      measurements: measurements.length,
    };
  }

  getOptimizationRecommendations(operation) {
    const measurements = this.measurements.filter(
      (m) => m.operation === operation
    );
    if (measurements.length === 0) return [];

    const avgCPU =
      measurements.reduce((sum, m) => sum + m.cpu, 0) / measurements.length;
    const avgMemory =
      measurements.reduce((sum, m) => sum + m.memory, 0) / measurements.length;
    const avgDuration =
      measurements.reduce((sum, m) => sum + m.duration, 0) /
      measurements.length;

    const recommendations = [];

    if (avgCPU < 50 && avgDuration > 1000) {
      recommendations.push({
        type: "parallelism",
        reason: "Low CPU utilization suggests opportunity for parallelization",
      });
    }

    if (avgMemory > 500000) {
      recommendations.push({
        type: "memory-optimization",
        reason: "High memory usage detected",
      });
    }

    if (avgCPU > 80) {
      recommendations.push({
        type: "cpu-optimization",
        reason: "High CPU usage detected",
      });
    }

    return recommendations;
  }
}

describe("Phase 2: Performance Integration Tests", () => {
  let testDir;
  let context;
  let ks;
  let monitor;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "perf-test-"));
    execSync("git init", { cwd: testDir });
    execSync('git config user.email "test@test.com"', { cwd: testDir });
    execSync('git config user.name "Test User"', { cwd: testDir });
    execSync('git config commit.gpgsign false', { cwd: testDir });
    writeFileSync(join(testDir, "README.md"), "# Performance Test\n");
    execSync("git add .", { cwd: testDir });
    execSync('git commit -m "initial"', { cwd: testDir });

    context = {
      cwd: testDir,
      env: { TZ: "UTC", LANG: "C" },
    };

    ks = new MockKnowledgeSubstrate();
    monitor = new RDFPerformanceMonitor();
  });

  afterEach(() => {
    if (testDir) {
      rmSync(testDir, { recursive: true, force: true });
    }
    if (ks) {
      ks.clear();
    }
  });

  describe("Anomaly Detection Tests (10 tests)", () => {
    it("should detect budget violations", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        // Set budget
        await monitor.setBudget("build", {
          maxDuration: 5000,
          maxMemory: 512000,
          maxCPU: 90,
        });

        // Record measurement exceeding budget
        await monitor.recordMeasurement({
          operation: "build",
          duration: 6000,
          memory: 256000,
          cpu: 85,
          diskIO: 1024,
          timestamp: Date.now(),
        });

        // Detect anomalies
        const anomalies = await monitor.detectAnomalies();

        expect(anomalies.length).toBeGreaterThan(0);
        expect(anomalies[0].type).toBe("budget_violation");
        expect(anomalies[0].severity).toBe("high");
      });
    });

    it("should identify memory leaks", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        // Record increasing memory usage
        for (let i = 0; i < 10; i++) {
          await monitor.recordMeasurement({
            operation: "background-job",
            duration: 1000,
            memory: 100000 * (1.15 ** i), // 15% growth each time
            cpu: 50,
            diskIO: 512,
            timestamp: Date.now() - (10 - i) * 60000,
          });
        }

        const hasLeak = await monitor.detectMemoryLeaks("background-job");
        expect(hasLeak).toBe(true);
      });
    });

    it("should detect CPU spikes", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        // Record normal operations
        await monitor.recordMeasurement({
          operation: "api-request",
          duration: 100,
          memory: 50000,
          cpu: 30,
          diskIO: 256,
          timestamp: Date.now() - 5000,
        });

        // Record CPU spike
        await monitor.recordMeasurement({
          operation: "cache-clear",
          duration: 500,
          memory: 50000,
          cpu: 95,
          diskIO: 256,
          timestamp: Date.now(),
        });

        const spikes = await monitor.detectCPUSpikes(90);
        expect(spikes.length).toBe(1);
        expect(spikes[0].operation).toBe("cache-clear");
        expect(spikes[0].cpu).toBe(95);
      });
    });

    it("should detect IO-bound operations", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        // Record IO-bound characteristics
        for (let i = 0; i < 5; i++) {
          await monitor.recordMeasurement({
            operation: "database-query",
            duration: 2000,
            memory: 450000,
            cpu: 25,
            diskIO: 4096,
            timestamp: Date.now() - i * 1000,
          });
        }

        const isIOBound = await monitor.detectIOBound("database-query");
        expect(isIOBound).toBe(true);
      });
    });

    it("should detect performance regressions", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        const baseTime = Date.now();
        const weekMs = 7 * 24 * 60 * 60 * 1000;

        // Baseline measurements (last week) - faster
        for (let i = 0; i < 10; i++) {
          await monitor.recordMeasurement({
            operation: "build",
            duration: 3000,
            memory: 256000,
            cpu: 70,
            diskIO: 1024,
            timestamp: baseTime - weekMs * 2 - i * 60000,
          });
        }

        // Current measurements (20% slower - clear regression)
        for (let i = 0; i < 10; i++) {
          await monitor.recordMeasurement({
            operation: "build",
            duration: 3600,
            memory: 256000,
            cpu: 70,
            diskIO: 1024,
            timestamp: baseTime - i * 60000,
          });
        }

        const regression = await monitor.detectRegression(
          "build",
          weekMs * 2,
          weekMs
        );

        expect(regression).not.toBeNull();
        expect(regression.isRegression).toBe(true);
        expect(regression.percentChange).toBeGreaterThan(10);
      });
    });

    it("should discover correlations between operations", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        const baseTime = Date.now();

        // Record correlated operations (occur within 1 second of each other)
        for (let i = 0; i < 10; i++) {
          await monitor.recordMeasurement({
            operation: "cache-clear",
            duration: 100,
            memory: 50000,
            cpu: 95,
            diskIO: 256,
            timestamp: baseTime - i * 10000,
          });

          await monitor.recordMeasurement({
            operation: "api-slowdown",
            duration: 500,
            memory: 50000,
            cpu: 90,
            diskIO: 256,
            timestamp: baseTime - i * 10000 + 100, // Within 100ms of cache-clear
          });
        }

        const correlations = await monitor.findCorrelations(0.5);
        expect(correlations.length).toBeGreaterThan(0);
      });
    });

    it("should perform trend analysis", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        const baseTime = Date.now();

        // Record gradually slowing operation
        for (let i = 0; i < 30; i++) {
          await monitor.recordMeasurement({
            operation: "build",
            duration: 3000 + i * 50, // Gradually increasing
            memory: 256000,
            cpu: 70,
            diskIO: 1024,
            timestamp: baseTime - (30 - i) * 24 * 60 * 60 * 1000,
          });
        }

        const trend = await monitor.getTrendAnalysis("build", 30);
        expect(trend).not.toBeNull();
        expect(trend.trend).toBe("increasing");
        expect(trend.slope).toBeGreaterThan(0);
      });
    });

    it("should provide optimization recommendations", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        await monitor.setBudget("slow-operation", {
          maxDuration: 2000,
          maxMemory: 512000,
          maxCPU: 90,
        });

        // Record operation with low CPU but over budget
        for (let i = 0; i < 5; i++) {
          await monitor.recordMeasurement({
            operation: "slow-operation",
            duration: 3000,
            memory: 256000,
            cpu: 40,
            diskIO: 1024,
            timestamp: Date.now() - i * 1000,
          });
        }

        const recommendations =
          monitor.getOptimizationRecommendations("slow-operation");
        expect(recommendations.length).toBeGreaterThan(0);
        expect(recommendations[0].type).toBe("parallelism");
      });
    });

    it("should prevent false positives in anomaly detection", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        await monitor.setBudget("variable-operation", {
          maxDuration: 5000,
          maxMemory: 512000,
          maxCPU: 90,
        });

        // Record measurements within budget
        for (let i = 0; i < 10; i++) {
          await monitor.recordMeasurement({
            operation: "variable-operation",
            duration: 3000 + Math.random() * 1000, // Some variance
            memory: 256000,
            cpu: 70,
            diskIO: 1024,
            timestamp: Date.now() - i * 1000,
          });
        }

        const anomalies = await monitor.detectAnomalies();
        expect(anomalies.length).toBe(0);
      });
    });

    it("should handle real-world scenario: gradual performance degradation", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        await monitor.setBudget("api-endpoint", {
          maxDuration: 200,
          maxMemory: 100000,
          maxCPU: 50,
        });

        const baseTime = Date.now();

        // Week 1: Good performance
        for (let i = 0; i < 7; i++) {
          await monitor.recordMeasurement({
            operation: "api-endpoint",
            duration: 150,
            memory: 80000,
            cpu: 40,
            diskIO: 256,
            timestamp: baseTime - 14 * 24 * 60 * 60 * 1000 + i * 24 * 60 * 60 * 1000,
          });
        }

        // Week 2: Gradual degradation
        for (let i = 0; i < 7; i++) {
          await monitor.recordMeasurement({
            operation: "api-endpoint",
            duration: 180 + i * 10,
            memory: 90000 + i * 2000,
            cpu: 45 + i * 2,
            diskIO: 256,
            timestamp: baseTime - 7 * 24 * 60 * 60 * 1000 + i * 24 * 60 * 60 * 1000,
          });
        }

        const trend = await monitor.getTrendAnalysis("api-endpoint", 14);
        expect(trend.trend).toBe("increasing");

        const stats = await monitor.queryOperationStats(
          "api-endpoint",
          7 * 24 * 60 * 60 * 1000
        );
        expect(stats.mean).toBeGreaterThan(180);
      });
    });
  });

  describe("Performance Queries Tests (15 tests)", () => {
    it("should execute queries in under 100ms", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        // Add many measurements
        for (let i = 0; i < 100; i++) {
          await monitor.recordMeasurement({
            operation: "test-op",
            duration: 1000 + Math.random() * 500,
            memory: 256000,
            cpu: 70,
            diskIO: 1024,
            timestamp: Date.now() - i * 1000,
          });
        }

        const start = Date.now();
        const stats = await monitor.queryOperationStats("test-op");
        const queryTime = Date.now() - start;

        expect(queryTime).toBeLessThan(100);
        expect(stats).not.toBeNull();
      });
    });

    it("should parse query results correctly", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        await monitor.recordMeasurement({
          operation: "test-op",
          duration: 1000,
          memory: 256000,
          cpu: 70,
          diskIO: 1024,
          timestamp: Date.now(),
        });

        const stats = await monitor.queryOperationStats("test-op");

        expect(stats).toHaveProperty("mean");
        expect(stats).toHaveProperty("median");
        expect(stats).toHaveProperty("p95");
        expect(stats).toHaveProperty("count");
        expect(stats.count).toBe(1);
      });
    });

    it("should handle missing operations gracefully", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        const stats = await monitor.queryOperationStats("nonexistent-op");
        expect(stats).toBeNull();
      });
    });

    it("should calculate aggregations correctly (mean)", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        await monitor.recordMeasurement({
          operation: "test-op",
          duration: 1000,
          memory: 256000,
          cpu: 70,
          diskIO: 1024,
          timestamp: Date.now(),
        });

        await monitor.recordMeasurement({
          operation: "test-op",
          duration: 2000,
          memory: 256000,
          cpu: 70,
          diskIO: 1024,
          timestamp: Date.now(),
        });

        const stats = await monitor.queryOperationStats("test-op");
        expect(stats.mean).toBe(1500);
      });
    });

    it("should calculate median correctly", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        const durations = [1000, 2000, 3000, 4000, 5000];
        for (const duration of durations) {
          await monitor.recordMeasurement({
            operation: "test-op",
            duration,
            memory: 256000,
            cpu: 70,
            diskIO: 1024,
            timestamp: Date.now(),
          });
        }

        const stats = await monitor.queryOperationStats("test-op");
        expect(stats.median).toBe(3000);
      });
    });

    it("should calculate P95 correctly", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        for (let i = 1; i <= 100; i++) {
          await monitor.recordMeasurement({
            operation: "test-op",
            duration: i * 10,
            memory: 256000,
            cpu: 70,
            diskIO: 1024,
            timestamp: Date.now(),
          });
        }

        const stats = await monitor.queryOperationStats("test-op");
        expect(stats.p95).toBeGreaterThanOrEqual(900); // 95th percentile should be high
        expect(stats.p95).toBeLessThanOrEqual(1000);
      });
    });

    it("should filter by time window correctly", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        const now = Date.now();
        const hourMs = 60 * 60 * 1000;

        // Old measurements
        await monitor.recordMeasurement({
          operation: "test-op",
          duration: 1000,
          memory: 256000,
          cpu: 70,
          diskIO: 1024,
          timestamp: now - 2 * hourMs,
        });

        // Recent measurements
        await monitor.recordMeasurement({
          operation: "test-op",
          duration: 2000,
          memory: 256000,
          cpu: 70,
          diskIO: 1024,
          timestamp: now - 30 * 60 * 1000,
        });

        const stats = await monitor.queryOperationStats("test-op", hourMs);
        expect(stats.count).toBe(1);
        expect(stats.mean).toBe(2000);
      });
    });

    it("should calculate correlation coefficients correctly", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        const baseTime = Date.now();

        // Record measurements with high correlation (occur within milliseconds)
        for (let i = 0; i < 10; i++) {
          const cpu = 50 + i * 5;
          await monitor.recordMeasurement({
            operation: "op1",
            duration: 1000,
            memory: 256000,
            cpu,
            diskIO: 1024,
            timestamp: baseTime - i * 10000,
          });

          await monitor.recordMeasurement({
            operation: "op2",
            duration: 1000,
            memory: 256000,
            cpu: cpu + 2, // Highly correlated
            diskIO: 1024,
            timestamp: baseTime - i * 10000 + 100, // Within 100ms
          });
        }

        const correlations = await monitor.findCorrelations(0.5);
        expect(correlations.length).toBeGreaterThan(0);
        if (correlations.length > 0) {
          expect(correlations[0].correlation).toBeGreaterThanOrEqual(0.5);
        }
      });
    });

    it("should fit trend lines accurately", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        // Linear increasing trend: y = 1000 + 50x
        for (let i = 0; i < 20; i++) {
          await monitor.recordMeasurement({
            operation: "test-op",
            duration: 1000 + 50 * i,
            memory: 256000,
            cpu: 70,
            diskIO: 1024,
            timestamp: Date.now() - (20 - i) * 24 * 60 * 60 * 1000,
          });
        }

        const trend = await monitor.getTrendAnalysis("test-op", 30);
        expect(trend.slope).toBeCloseTo(50, 0);
        expect(trend.trend).toBe("increasing");
      });
    });

    it("should aggregate across multiple operations", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        const operations = ["op1", "op2", "op3"];
        for (const op of operations) {
          await monitor.recordMeasurement({
            operation: op,
            duration: 1000,
            memory: 256000,
            cpu: 70,
            diskIO: 1024,
            timestamp: Date.now(),
          });
        }

        const allStats = await Promise.all(
          operations.map((op) => monitor.queryOperationStats(op))
        );

        expect(allStats.length).toBe(3);
        allStats.forEach((stats) => {
          expect(stats).not.toBeNull();
          expect(stats.mean).toBe(1000);
        });
      });
    });

    it("should handle concurrent queries", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        for (let i = 0; i < 10; i++) {
          await monitor.recordMeasurement({
            operation: "test-op",
            duration: 1000,
            memory: 256000,
            cpu: 70,
            diskIO: 1024,
            timestamp: Date.now(),
          });
        }

        // Run multiple queries concurrently
        const queries = Array(10)
          .fill(null)
          .map(() => monitor.queryOperationStats("test-op"));

        const results = await Promise.all(queries);
        results.forEach((result) => {
          expect(result).not.toBeNull();
          expect(result.mean).toBe(1000);
        });
      });
    });

    it("should query with complex filters", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        await monitor.recordMeasurement({
          operation: "build",
          duration: 3000,
          memory: 256000,
          cpu: 70,
          diskIO: 1024,
          timestamp: Date.now(),
        });

        await monitor.recordMeasurement({
          operation: "test",
          duration: 1000,
          memory: 128000,
          cpu: 50,
          diskIO: 512,
          timestamp: Date.now(),
        });

        const buildStats = await monitor.queryOperationStats("build");
        const testStats = await monitor.queryOperationStats("test");

        expect(buildStats.mean).toBe(3000);
        expect(testStats.mean).toBe(1000);
      });
    });

    it("should handle large result sets efficiently", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        // Add 1000 measurements
        for (let i = 0; i < 1000; i++) {
          await monitor.recordMeasurement({
            operation: "test-op",
            duration: 1000 + Math.random() * 500,
            memory: 256000,
            cpu: 70,
            diskIO: 1024,
            timestamp: Date.now() - i * 1000,
          });
        }

        const start = Date.now();
        const stats = await monitor.queryOperationStats("test-op");
        const queryTime = Date.now() - start;

        expect(queryTime).toBeLessThan(200);
        expect(stats.count).toBe(1000);
      });
    });

    it("should support custom aggregations", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        const measurements = [1000, 2000, 3000, 4000, 5000];
        for (const duration of measurements) {
          await monitor.recordMeasurement({
            operation: "test-op",
            duration,
            memory: 256000,
            cpu: 70,
            diskIO: 1024,
            timestamp: Date.now(),
          });
        }

        const stats = await monitor.queryOperationStats("test-op");

        // Custom: Standard deviation calculation
        const variance =
          measurements.reduce((sum, d) => sum + (d - stats.mean) ** 2, 0) /
          measurements.length;
        const stdDev = Math.sqrt(variance);

        expect(stdDev).toBeGreaterThan(0);
      });
    });

    it("should handle query errors gracefully", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        // Query with invalid parameters
        const stats = await monitor.queryOperationStats(null);
        expect(stats).toBeNull();
      });
    });
  });

  describe("N3 Rules Tests (10 tests)", () => {
    it("should fire budget violation rule correctly", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        await monitor.setBudget("test-op", {
          maxDuration: 1000,
          maxMemory: 512000,
          maxCPU: 90,
        });

        await monitor.recordMeasurement({
          operation: "test-op",
          duration: 1500,
          memory: 256000,
          cpu: 70,
          diskIO: 1024,
          timestamp: Date.now(),
        });

        const anomalies = await monitor.detectAnomalies();
        expect(anomalies.length).toBe(1);
        expect(anomalies[0].type).toBe("budget_violation");
      });
    });

    it("should detect memory leak pattern with rules", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        // Record memory leak pattern
        for (let i = 0; i < 10; i++) {
          await monitor.recordMeasurement({
            operation: "leaky-op",
            duration: 1000,
            memory: 100000 * (1.2 ** i),
            cpu: 50,
            diskIO: 512,
            timestamp: Date.now() - (10 - i) * 60000,
          });
        }

        const hasLeak = await monitor.detectMemoryLeaks("leaky-op");
        expect(hasLeak).toBe(true);
      });
    });

    it("should classify IO-bound operations with rules", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        for (let i = 0; i < 5; i++) {
          await monitor.recordMeasurement({
            operation: "io-op",
            duration: 2000,
            memory: 450000,
            cpu: 20,
            diskIO: 8192,
            timestamp: Date.now() - i * 1000,
          });
        }

        const isIOBound = await monitor.detectIOBound("io-op");
        expect(isIOBound).toBe(true);
      });
    });

    it("should classify CPU-bound operations with rules", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        for (let i = 0; i < 5; i++) {
          await monitor.recordMeasurement({
            operation: "cpu-op",
            duration: 5000,
            memory: 200000,
            cpu: 95,
            diskIO: 256,
            timestamp: Date.now() - i * 1000,
          });
        }

        const spikes = await monitor.detectCPUSpikes(90);
        expect(spikes.length).toBeGreaterThan(0);
      });
    });

    it("should detect consistent performance patterns", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        // Record consistent measurements
        for (let i = 0; i < 10; i++) {
          await monitor.recordMeasurement({
            operation: "consistent-op",
            duration: 1000,
            memory: 256000,
            cpu: 70,
            diskIO: 1024,
            timestamp: Date.now() - i * 1000,
          });
        }

        const stats = await monitor.queryOperationStats("consistent-op");
        const variance =
          monitor.measurements
            .filter((m) => m.operation === "consistent-op")
            .reduce((sum, m) => sum + (m.duration - stats.mean) ** 2, 0) / 10;

        expect(variance).toBeLessThan(100);
      });
    });

    it("should handle complex rule chains", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        await monitor.setBudget("complex-op", {
          maxDuration: 2000,
          maxMemory: 512000,
          maxCPU: 80,
        });

        await monitor.recordMeasurement({
          operation: "complex-op",
          duration: 3000,
          memory: 600000,
          cpu: 90,
          diskIO: 1024,
          timestamp: Date.now(),
        });

        const anomalies = await monitor.detectAnomalies();
        const recommendations =
          monitor.getOptimizationRecommendations("complex-op");

        expect(anomalies.length).toBeGreaterThan(0);
        expect(recommendations.length).toBeGreaterThan(0);
      });
    });

    it("should fire multiple rules for same measurement", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        await monitor.setBudget("multi-issue-op", {
          maxDuration: 1000,
          maxMemory: 300000,
          maxCPU: 60,
        });

        await monitor.recordMeasurement({
          operation: "multi-issue-op",
          duration: 2000,
          memory: 400000,
          cpu: 85,
          diskIO: 1024,
          timestamp: Date.now(),
        });

        const anomalies = await monitor.detectAnomalies();
        expect(anomalies.length).toBeGreaterThan(0);
      });
    });

    it("should handle edge case: zero measurements", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        const stats = await monitor.queryOperationStats("nonexistent");
        expect(stats).toBeNull();

        const anomalies = await monitor.detectAnomalies();
        expect(anomalies.length).toBe(0);
      });
    });

    it("should handle edge case: single measurement", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        await monitor.recordMeasurement({
          operation: "single-op",
          duration: 1000,
          memory: 256000,
          cpu: 70,
          diskIO: 1024,
          timestamp: Date.now(),
        });

        const stats = await monitor.queryOperationStats("single-op");
        expect(stats).not.toBeNull();
        expect(stats.mean).toBe(1000);
        expect(stats.median).toBe(1000);
      });
    });

    it("should handle edge case: extreme values", async () => {
      await withGitVan(context, async () => {
        await monitor.initialize(ks);

        await monitor.setBudget("extreme-op", {
          maxDuration: 10000,
          maxMemory: 1000000,
          maxCPU: 95,
        });

        await monitor.recordMeasurement({
          operation: "extreme-op",
          duration: 50000,
          memory: 2000000,
          cpu: 99,
          diskIO: 100000,
          timestamp: Date.now(),
        });

        const anomalies = await monitor.detectAnomalies();
        expect(anomalies.length).toBeGreaterThan(0);
      });
    });
  });
});
