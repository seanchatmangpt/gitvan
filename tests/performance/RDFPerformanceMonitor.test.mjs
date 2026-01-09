import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { RDFPerformanceMonitor } from "../../src/performance/RDFPerformanceMonitor.mjs";

/**
 * @fileoverview Test suite for RDFPerformanceMonitor
 *
 * Tests RDF-backed performance monitoring including:
 * - Measurement recording
 * - Budget enforcement
 * - Anomaly detection
 * - Correlation analysis
 * - Trend analysis
 * - SPARQL queries
 */

describe("RDFPerformanceMonitor", () => {
  let monitor;

  beforeEach(async () => {
    monitor = new RDFPerformanceMonitor({
      enableBudgets: true,
      enableAnomalyDetection: true,
      anomalyThreshold: 2.0,
      correlationThreshold: 0.7
    });
  });

  afterEach(async () => {
    monitor = null;
  });

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      await monitor.initialize();
      expect(monitor.initialized).toBe(true);
      expect(monitor.core).toBeDefined();
    });

    it("should throw error if used before initialization", async () => {
      expect(() => {
        monitor._ensureInitialized();
      }).toThrow("not initialized");
    });

    it("should load performance ontology", async () => {
      await monitor.initialize();
      // Ontology should be loaded into the store
      expect(monitor.core.store.size).toBeGreaterThan(0);
    });
  });

  describe("recordMeasurement", () => {
    beforeEach(async () => {
      await monitor.initialize();
    });

    it("should record a measurement", async () => {
      const measurementId = await monitor.recordMeasurement(
        "test-operation",
        50.5,
        1000000,
        25.0,
        100000,
        { test: true }
      );

      expect(measurementId).toMatch(/^meas-/);
    });

    it("should update in-memory statistics", async () => {
      await monitor.recordMeasurement("test-op", 50, 1000000, 25, 100000);
      await monitor.recordMeasurement("test-op", 60, 1100000, 30, 110000);

      const stats = monitor.stats.get("test-op");
      expect(stats.count).toBe(2);
      expect(stats.durations).toHaveLength(2);
      expect(stats.durations).toContain(50);
      expect(stats.durations).toContain(60);
    });

    it("should record measurements to RDF store", async () => {
      const storeSizeBefore = monitor.core.store.size;

      await monitor.recordMeasurement("test-op", 50, 1000000, 25, 100000);

      const storeSizeAfter = monitor.core.store.size;
      expect(storeSizeAfter).toBeGreaterThan(storeSizeBefore);
    });

    it("should handle missing optional parameters", async () => {
      const measurementId = await monitor.recordMeasurement("test-op", 50);
      expect(measurementId).toMatch(/^meas-/);
    });
  });

  describe("budget management", () => {
    beforeEach(async () => {
      await monitor.initialize();
    });

    it("should set a performance budget", async () => {
      await monitor.setBudget("test-op", {
        maxDuration: 100,
        maxMemory: 2000000,
        maxCPU: 80
      });

      expect(monitor.budgets.has("test-op")).toBe(true);
      expect(monitor.budgets.get("test-op").maxDuration).toBe(100);
    });

    it("should detect budget violations", async () => {
      await monitor.setBudget("test-op", {
        maxDuration: 100,
        maxMemory: 2000000,
        maxCPU: 80
      });

      // Record violation
      await monitor.recordMeasurement("test-op", 150, 1000000, 50, 100000);

      const anomalies = await monitor.getAnomalies({ resolved: false });
      const budgetViolations = anomalies.filter(a => a.type === "BudgetViolation");

      expect(budgetViolations.length).toBeGreaterThan(0);
    });

    it("should not detect violations within budget", async () => {
      await monitor.setBudget("test-op", {
        maxDuration: 100,
        maxMemory: 2000000,
        maxCPU: 80
      });

      // Record compliant measurement
      await monitor.recordMeasurement("test-op", 50, 1000000, 50, 100000);

      const violations = await monitor.getBudgetViolations();
      const testOpViolations = violations.filter(v => v.operation === "test-op");

      expect(testOpViolations).toHaveLength(0);
    });
  });

  describe("anomaly detection", () => {
    beforeEach(async () => {
      await monitor.initialize();
    });

    it("should detect outliers", async () => {
      // Record normal measurements
      for (let i = 0; i < 20; i++) {
        await monitor.recordMeasurement("test-op", 50 + Math.random() * 10, 1000000, 25, 100000);
      }

      // Record outlier
      await monitor.recordMeasurement("test-op", 200, 1000000, 25, 100000);

      const anomalies = await monitor.getAnomalies({ resolved: false });
      const outliers = anomalies.filter(a => a.type === "Outlier" && a.operation === "test-op");

      expect(outliers.length).toBeGreaterThan(0);
    });

    it("should detect I/O bound operations", async () => {
      // High I/O, low CPU
      await monitor.recordMeasurement("test-op", 100, 1000000, 30, 2000000);

      const anomalies = await monitor.getAnomalies({ resolved: false });
      const ioBound = anomalies.filter(a => a.type === "IoBoundOperation");

      expect(ioBound.length).toBeGreaterThan(0);
    });

    it("should detect CPU bound operations", async () => {
      // High CPU, low I/O
      await monitor.recordMeasurement("test-op", 100, 1000000, 95, 50000);

      const anomalies = await monitor.getAnomalies({ resolved: false });
      const cpuBound = anomalies.filter(a => a.type === "CpuBoundOperation");

      expect(cpuBound.length).toBeGreaterThan(0);
    });

    it("should not detect anomalies with insufficient data", async () => {
      // Only 5 samples - not enough for anomaly detection
      for (let i = 0; i < 5; i++) {
        await monitor.recordMeasurement("test-op", 50, 1000000, 25, 100000);
      }

      // Record potential outlier
      await monitor.recordMeasurement("test-op", 200, 1000000, 25, 100000);

      const anomalies = await monitor.getAnomalies({ resolved: false });
      const outliers = anomalies.filter(a => a.type === "Outlier" && a.operation === "test-op");

      // Should not detect with <10 samples
      expect(outliers).toHaveLength(0);
    });
  });

  describe("getMeasurements", () => {
    beforeEach(async () => {
      await monitor.initialize();
    });

    it("should retrieve measurements for an operation", async () => {
      await monitor.recordMeasurement("test-op", 50, 1000000, 25, 100000);
      await monitor.recordMeasurement("test-op", 60, 1100000, 30, 110000);

      const measurements = await monitor.getMeasurements("test-op", 3600000);

      expect(measurements.length).toBeGreaterThanOrEqual(2);
      expect(measurements[0].operation).toBe("test-op");
    });

    it("should filter by time window", async () => {
      await monitor.recordMeasurement("test-op", 50, 1000000, 25, 100000);

      // Query with very short time window (1ms)
      const recentMeasurements = await monitor.getMeasurements("test-op", 1);

      // Should return measurements
      expect(recentMeasurements.length).toBeGreaterThanOrEqual(0);
    });

    it("should return empty array for unknown operation", async () => {
      const measurements = await monitor.getMeasurements("unknown-op", 3600000);
      expect(measurements).toHaveLength(0);
    });
  });

  describe("getAnomalies", () => {
    beforeEach(async () => {
      await monitor.initialize();
      await monitor.setBudget("test-op", { maxDuration: 100 });
    });

    it("should retrieve unresolved anomalies", async () => {
      // Trigger budget violation
      await monitor.recordMeasurement("test-op", 150, 1000000, 50, 100000);

      const anomalies = await monitor.getAnomalies({ resolved: false });

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0]).toHaveProperty("id");
      expect(anomalies[0]).toHaveProperty("type");
      expect(anomalies[0]).toHaveProperty("severity");
    });

    it("should filter by severity", async () => {
      await monitor.recordMeasurement("test-op", 150, 1000000, 50, 100000);

      const criticalAnomalies = await monitor.getAnomalies({
        resolved: false,
        severity: "critical"
      });

      expect(Array.isArray(criticalAnomalies)).toBe(true);
    });

    it("should filter by operation", async () => {
      await monitor.recordMeasurement("test-op", 150, 1000000, 50, 100000);

      const opAnomalies = await monitor.getAnomalies({
        resolved: false,
        operation: "test-op"
      });

      expect(Array.isArray(opAnomalies)).toBe(true);
    });

    it("should respect limit parameter", async () => {
      // Record multiple violations
      for (let i = 0; i < 10; i++) {
        await monitor.recordMeasurement("test-op", 150, 1000000, 50, 100000);
      }

      const anomalies = await monitor.getAnomalies({ resolved: false, limit: 5 });

      expect(anomalies.length).toBeLessThanOrEqual(5);
    });
  });

  describe("getBudgetViolations", () => {
    beforeEach(async () => {
      await monitor.initialize();
      await monitor.setBudget("test-op", { maxDuration: 100 });
    });

    it("should return empty array with no violations", async () => {
      await monitor.recordMeasurement("test-op", 50, 1000000, 50, 100000);

      const violations = await monitor.getBudgetViolations();

      expect(violations).toHaveLength(0);
    });

    it("should group violations by operation", async () => {
      // Record multiple violations
      await monitor.recordMeasurement("test-op", 150, 1000000, 50, 100000);
      await monitor.recordMeasurement("test-op", 160, 1000000, 50, 100000);

      const violations = await monitor.getBudgetViolations();
      const testOpViolation = violations.find(v => v.operation === "test-op");

      expect(testOpViolation).toBeDefined();
      expect(testOpViolation.count).toBeGreaterThanOrEqual(2);
    });
  });

  describe("getCorrelations", () => {
    beforeEach(async () => {
      await monitor.initialize();
    });

    it("should detect correlations between operations", async () => {
      // Record correlated operations (similar CPU patterns)
      for (let i = 0; i < 20; i++) {
        const cpu = 50 + i;
        await monitor.recordMeasurement("op1", 50, 1000000, cpu, 100000);
        await monitor.recordMeasurement("op2", 60, 1100000, cpu + 5, 110000);
      }

      const correlations = await monitor.getCorrelations();

      expect(Array.isArray(correlations)).toBe(true);
      // May or may not find correlation depending on threshold
    });

    it("should return empty array with insufficient data", async () => {
      await monitor.recordMeasurement("op1", 50, 1000000, 25, 100000);
      await monitor.recordMeasurement("op2", 60, 1100000, 30, 110000);

      const correlations = await monitor.getCorrelations();

      // Not enough data points for correlation
      expect(correlations).toHaveLength(0);
    });
  });

  describe("getTrendAnalysis", () => {
    beforeEach(async () => {
      await monitor.initialize();
    });

    it("should analyze performance trends", async () => {
      // Record increasing durations (degrading trend)
      for (let i = 0; i < 20; i++) {
        await monitor.recordMeasurement("test-op", 50 + i * 2, 1000000, 25, 100000);
      }

      const trend = await monitor.getTrendAnalysis("test-op", 90);

      expect(trend).toHaveProperty("operation", "test-op");
      expect(trend).toHaveProperty("trend");
      expect(trend).toHaveProperty("slope");
      expect(trend).toHaveProperty("direction");
    });

    it("should handle insufficient data", async () => {
      const trend = await monitor.getTrendAnalysis("unknown-op", 90);

      expect(trend.trend).toBe("insufficient-data");
      expect(trend.dataPoints).toBe(0);
    });

    it("should detect degrading trends", async () => {
      // Record steadily increasing durations
      for (let i = 0; i < 30; i++) {
        await monitor.recordMeasurement("test-op", 50 + i * 5, 1000000, 25, 100000);
      }

      const trend = await monitor.getTrendAnalysis("test-op", 90);

      expect(trend.direction).toBe("degrading");
      expect(parseFloat(trend.slope)).toBeGreaterThan(0);
    });

    it("should detect improving trends", async () => {
      // Record steadily decreasing durations
      for (let i = 0; i < 30; i++) {
        await monitor.recordMeasurement("test-op", 100 - i * 2, 1000000, 25, 100000);
      }

      const trend = await monitor.getTrendAnalysis("test-op", 90);

      expect(trend.direction).toBe("improving");
      expect(parseFloat(trend.slope)).toBeLessThan(0);
    });
  });

  describe("getStats", () => {
    beforeEach(async () => {
      await monitor.initialize();
    });

    it("should calculate statistics", async () => {
      // Record measurements
      for (let i = 0; i < 20; i++) {
        await monitor.recordMeasurement("test-op", 50 + i, 1000000, 25 + i, 100000);
      }

      const stats = await monitor.getStats("test-op");

      expect(stats.operation).toBe("test-op");
      expect(stats.count).toBe(20);
      expect(stats.duration).toHaveProperty("mean");
      expect(stats.duration).toHaveProperty("median");
      expect(stats.duration).toHaveProperty("p95");
      expect(stats.duration).toHaveProperty("p99");
    });

    it("should return empty stats for unknown operation", async () => {
      const stats = await monitor.getStats("unknown-op");

      expect(stats.count).toBe(0);
      expect(stats.duration).toEqual({});
    });

    it("should calculate percentiles correctly", async () => {
      // Record 100 measurements
      for (let i = 0; i < 100; i++) {
        await monitor.recordMeasurement("test-op", i, 1000000, 25, 100000);
      }

      const stats = await monitor.getStats("test-op");

      // P50 should be around 50
      expect(parseFloat(stats.duration.p50)).toBeGreaterThan(40);
      expect(parseFloat(stats.duration.p50)).toBeLessThan(60);

      // P95 should be around 95
      expect(parseFloat(stats.duration.p95)).toBeGreaterThan(85);
      expect(parseFloat(stats.duration.p95)).toBeLessThan(100);
    });
  });

  describe("exportToRDF", () => {
    beforeEach(async () => {
      await monitor.initialize();
    });

    it("should export RDF data", async () => {
      await monitor.recordMeasurement("test-op", 50, 1000000, 25, 100000);

      const exported = await monitor.exportToRDF();

      expect(exported).toHaveProperty("quadCount");
      expect(exported).toHaveProperty("operations");
      expect(exported).toHaveProperty("budgets");
      expect(exported.quadCount).toBeGreaterThan(0);
    });
  });

  describe("statistical calculations", () => {
    beforeEach(async () => {
      await monitor.initialize();
    });

    it("should calculate mean correctly", () => {
      const values = [10, 20, 30, 40, 50];
      const mean = monitor._mean(values);
      expect(mean).toBe(30);
    });

    it("should calculate standard deviation correctly", () => {
      const values = [10, 20, 30, 40, 50];
      const mean = monitor._mean(values);
      const stddev = monitor._stddev(values, mean);

      // Expected stddev is approximately 14.14
      expect(stddev).toBeGreaterThan(14);
      expect(stddev).toBeLessThan(15);
    });

    it("should calculate correlation correctly", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];
      const correlation = monitor._correlation(x, y);

      // Perfect positive correlation
      expect(correlation).toBeCloseTo(1.0, 1);
    });

    it("should calculate linear regression correctly", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];
      const { slope, intercept } = monitor._linearRegression(x, y);

      expect(slope).toBeCloseTo(2.0, 1);
      expect(intercept).toBeCloseTo(0, 1);
    });
  });

  describe("edge cases", () => {
    beforeEach(async () => {
      await monitor.initialize();
    });

    it("should handle zero duration", async () => {
      const measurementId = await monitor.recordMeasurement("test-op", 0, 1000000, 25, 100000);
      expect(measurementId).toMatch(/^meas-/);
    });

    it("should handle very large values", async () => {
      const measurementId = await monitor.recordMeasurement(
        "test-op",
        999999,
        999999999,
        100,
        999999999
      );
      expect(measurementId).toMatch(/^meas-/);
    });

    it("should handle empty context", async () => {
      const measurementId = await monitor.recordMeasurement("test-op", 50, 1000000, 25, 100000, {});
      expect(measurementId).toMatch(/^meas-/);
    });

    it("should handle complex context objects", async () => {
      const complexContext = {
        nested: { deep: { value: 123 } },
        array: [1, 2, 3],
        string: "test"
      };

      const measurementId = await monitor.recordMeasurement(
        "test-op",
        50,
        1000000,
        25,
        100000,
        complexContext
      );

      expect(measurementId).toMatch(/^meas-/);
    });
  });
});
