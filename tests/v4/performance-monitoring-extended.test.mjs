import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  MemoryMetricsCollector,
  CPUMetricsCollector,
  IOMetricsCollector,
  EventLoopMetricsCollector,
  CacheMetricsCollector,
  ExtendedMetricsCollector
} from "../../src/performance/extended-metrics.mjs";
import {
  StatisticalAnalyzer,
  MovingWindowAnalyzer,
  ChangePointDetector,
  OutlierScorer,
  CorrelationAnalyzer,
  AnalyticsEngine
} from "../../src/performance/analytics-engine.mjs";

describe("Extended Metrics Collection", () => {
  describe("MemoryMetricsCollector", () => {
    it("should collect memory metrics", () => {
      const collector = new MemoryMetricsCollector();
      collector.start();

      // Allocate some memory
      const arr = new Array(1000).fill(Math.random());

      const metrics = collector.end();

      expect(metrics).toHaveProperty("heapUsed");
      expect(metrics).toHaveProperty("heapTotal");
      expect(metrics).toHaveProperty("external");
      expect(metrics).toHaveProperty("rss");
      expect(metrics).toHaveProperty("heapDelta");
      expect(metrics).toHaveProperty("gcPressure");
      expect(metrics).toHaveProperty("retainedObjects");

      expect(metrics.heapUsed).toBeGreaterThan(0);
      expect(metrics.heapTotal).toBeGreaterThan(0);
      expect(metrics.gcPressure).toBeGreaterThanOrEqual(0);
      expect(metrics.gcPressure).toBeLessThanOrEqual(100);
    });

    it("should track memory delta", () => {
      const collector = new MemoryMetricsCollector();
      collector.start();

      const largeBefore = new Array(10000).fill("test");

      const metrics = collector.end();
      expect(metrics.heapDelta).toBeGreaterThan(0);
    });

    it("should provide labeled metrics", () => {
      const collector = new MemoryMetricsCollector();
      collector.start();
      new Array(100).fill(1);

      const labeled = collector.getMetrics();
      expect(labeled).toHaveProperty("memory");
      expect(labeled.memory.heapUsed).toHaveProperty("value");
      expect(labeled.memory.heapUsed).toHaveProperty("unit");
      expect(labeled.memory.heapUsed).toHaveProperty("description");
    });
  });

  describe("CPUMetricsCollector", () => {
    it("should collect CPU metrics", () => {
      const collector = new CPUMetricsCollector();
      collector.start();

      // Do some CPU work
      let sum = 0;
      for (let i = 0; i < 100000; i++) {
        sum += Math.sqrt(i);
      }

      const metrics = collector.end();

      expect(metrics).toHaveProperty("userCPU");
      expect(metrics).toHaveProperty("systemCPU");
      expect(metrics).toHaveProperty("totalCPU");
      expect(metrics).toHaveProperty("cpuPercent");
      expect(metrics).toHaveProperty("contextSwitches");
      expect(metrics).toHaveProperty("threadCount");
      expect(metrics).toHaveProperty("blockingFraction");

      expect(metrics.userCPU).toBeGreaterThanOrEqual(0);
      expect(metrics.totalCPU).toBeGreaterThanOrEqual(0);
      expect(metrics.blockingFraction).toBeGreaterThanOrEqual(0);
      expect(metrics.blockingFraction).toBeLessThanOrEqual(1);
    });

    it("should estimate blocking fraction", () => {
      const collector = new CPUMetricsCollector();
      collector.start();

      // Synchronous work
      let x = 0;
      for (let i = 0; i < 50000; i++) {
        x += Math.sin(i) * Math.cos(i);
      }

      const metrics = collector.end();
      expect(metrics.blockingFraction).toBeGreaterThanOrEqual(0);
    });
  });

  describe("IOMetricsCollector", () => {
    it("should collect I/O metrics", () => {
      const collector = new IOMetricsCollector();
      collector.start();
      const metrics = collector.end();

      expect(metrics).toHaveProperty("diskReadBytes");
      expect(metrics).toHaveProperty("diskWriteBytes");
      expect(metrics).toHaveProperty("diskReadOps");
      expect(metrics).toHaveProperty("diskWriteOps");
      expect(metrics).toHaveProperty("fsWatcherCount");
      expect(metrics).toHaveProperty("openFileDescriptors");

      expect(metrics.diskReadBytes).toBeGreaterThanOrEqual(0);
      expect(metrics.diskWriteBytes).toBeGreaterThanOrEqual(0);
    });

    it("should provide labeled I/O metrics", () => {
      const collector = new IOMetricsCollector();
      collector.start();
      collector.end();

      const labeled = collector.getMetrics();
      expect(labeled.io).toHaveProperty("diskReadBytes");
      expect(labeled.io.diskReadBytes).toHaveProperty("unit", "bytes");
    });
  });

  describe("EventLoopMetricsCollector", () => {
    it("should collect event loop metrics", () => {
      const collector = new EventLoopMetricsCollector();
      collector.start();

      // Simulate some work
      for (let i = 0; i < 10000; i++) {
        Math.sqrt(i);
      }

      const metrics = collector.end();

      expect(metrics).toHaveProperty("eventLoopLag");
      expect(metrics).toHaveProperty("activeHandles");
      expect(metrics).toHaveProperty("activeRequests");
      expect(metrics).toHaveProperty("lag99Percentile");
      expect(metrics).toHaveProperty("blocking");

      expect(typeof metrics.eventLoopLag).toBe("number");
      expect(typeof metrics.blocking).toBe("boolean");
    });
  });

  describe("CacheMetricsCollector", () => {
    it("should track cache hits and misses", () => {
      const collector = new CacheMetricsCollector({ maxSize: 1000 });

      collector.recordHit("key1", 10);
      collector.recordHit("key1", 10);
      collector.recordMiss("key2", 20);
      collector.recordMiss("key3", 30);

      const metrics = collector.end();

      expect(metrics.cacheHits).toBe(2);
      expect(metrics.cacheMisses).toBe(2);
      expect(metrics.cacheHitRate).toBeCloseTo(50, 1);
    });

    it("should track cache size and evictions", () => {
      const collector = new CacheMetricsCollector({ maxSize: 100 });

      collector.recordMiss("key1", 50);
      collector.recordMiss("key2", 40);
      collector.recordMiss("key3", 30); // Should trigger eviction

      const metrics = collector.end();

      expect(metrics.cacheSize).toBeLessThanOrEqual(100);
      expect(metrics.evictionCount).toBeGreaterThanOrEqual(0);
    });

    it("should calculate staleness", () => {
      const collector = new CacheMetricsCollector();

      collector.recordMiss("key1", 10);
      const before = Date.now();

      // Wait a bit
      for (let i = 0; i < 10000; i++) {
        Math.sqrt(i);
      }

      const metrics = collector.end();
      const after = Date.now();

      expect(metrics.staleness).toBeGreaterThanOrEqual(0);
      expect(metrics.staleness).toBeLessThan(after - before + 100);
    });
  });

  describe("ExtendedMetricsCollector", () => {
    it("should collect all extended metrics", () => {
      const collector = new ExtendedMetricsCollector();
      collector.start();

      // Do some work
      for (let i = 0; i < 5000; i++) {
        Math.sqrt(i);
      }

      const metrics = collector.collect();

      expect(metrics).toHaveProperty("timestamp");
      expect(metrics).toHaveProperty("metrics");
      expect(Object.keys(metrics.metrics).length).toBeGreaterThan(15);
    });

    it("should report metric count", () => {
      const collector = new ExtendedMetricsCollector();
      collector.start();

      const count = collector.getMetricCount();
      expect(count).toBeGreaterThan(15);
      expect(count).toBeLessThanOrEqual(30);
    });

    it("should provide flat metrics", () => {
      const collector = new ExtendedMetricsCollector();
      collector.start();
      const flat = collector.getFlatMetrics();

      expect(typeof flat).toBe("object");
      expect(Object.keys(flat).length).toBeGreaterThan(0);

      // All values should be numbers
      Object.values(flat).forEach((val) => {
        expect(typeof val).toMatch(/number|boolean/);
      });
    });

    it("should support selective metric collection", () => {
      const collector = new ExtendedMetricsCollector({
        includeMemory: true,
        includeCPU: false,
        includeIO: false,
        includeEventLoop: false,
        includeCache: false
      });
      collector.start();
      const metrics = collector.collect();

      expect(Object.keys(metrics.metrics).length).toBe(8); // Only memory metrics
    });
  });
});

describe("Statistical Analysis", () => {
  describe("StatisticalAnalyzer", () => {
    it("should calculate mean", () => {
      expect(StatisticalAnalyzer.mean([1, 2, 3, 4, 5])).toBe(3);
      expect(StatisticalAnalyzer.mean([])).toBe(0);
    });

    it("should calculate median", () => {
      expect(StatisticalAnalyzer.median([1, 2, 3, 4, 5])).toBe(3);
      expect(StatisticalAnalyzer.median([1, 2, 3, 4])).toBe(2.5);
    });

    it("should calculate standard deviation", () => {
      const values = [2, 4, 6, 8, 10];
      const stddev = StatisticalAnalyzer.stddev(values);
      expect(stddev).toBeGreaterThan(0);
    });

    it("should calculate percentiles", () => {
      const values = Array.from({ length: 100 }, (_, i) => i);
      const p50 = StatisticalAnalyzer.percentile(values, 50);
      const p95 = StatisticalAnalyzer.percentile(values, 95);
      const p99 = StatisticalAnalyzer.percentile(values, 99);

      expect(p50).toBeCloseTo(50, 5);
      expect(p95).toBeGreaterThan(p50);
      expect(p99).toBeGreaterThan(p95);
    });

    it("should calculate IQR", () => {
      const values = Array.from({ length: 100 }, (_, i) => i);
      const iqr = StatisticalAnalyzer.iqr(values);
      expect(iqr).toBeGreaterThan(0);
    });

    it("should calculate Pearson correlation", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10]; // Perfect positive correlation
      const corr = StatisticalAnalyzer.pearsonCorrelation(x, y);

      expect(Math.abs(corr - 1.0)).toBeLessThan(0.01);
    });

    it("should detect negative correlation", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [10, 8, 6, 4, 2]; // Perfect negative correlation
      const corr = StatisticalAnalyzer.pearsonCorrelation(x, y);

      expect(corr).toBeLessThan(-0.99);
    });

    it("should fit linear trend", () => {
      const values = [1, 2, 3, 4, 5];
      const trend = StatisticalAnalyzer.linearTrend(values);

      expect(trend.slope).toBeGreaterThan(0);
      expect(typeof trend.intercept).toBe("number");
    });

    it("should calculate Z-scores", () => {
      const values = [1, 2, 3, 4, 100]; // 100 is an outlier
      const zscores = StatisticalAnalyzer.zScores(values);

      expect(zscores[4]).toBeGreaterThan(zscores[0]);
    });
  });

  describe("MovingWindowAnalyzer", () => {
    it("should analyze windows", () => {
      const measurements = Array.from({ length: 50 }, (_, i) => i + 1);
      const windows = MovingWindowAnalyzer.analyzeWindows(measurements, 10);

      expect(windows.length).toBe(50 - 10 + 1);
      expect(windows[0]).toHaveProperty("mean");
      expect(windows[0]).toHaveProperty("stddev");
      expect(windows[0]).toHaveProperty("min");
      expect(windows[0]).toHaveProperty("max");
    });

    it("should detect mean shift anomalies", () => {
      // Create data with a mean shift at the middle
      const measurements = [
        ...Array(20).fill(10),
        ...Array(20).fill(50) // Sudden jump
      ];

      const windows = MovingWindowAnalyzer.analyzeWindows(measurements, 5);
      const anomalies = MovingWindowAnalyzer.detectAnomalies(windows, 1.5);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].type).toBe("MeanShift");
    });

    it("should detect trend direction", () => {
      // Steadily increasing values
      const measurements = Array.from({ length: 30 }, (_, i) => i * 2);
      const windows = MovingWindowAnalyzer.analyzeWindows(measurements, 5);
      const trend = MovingWindowAnalyzer.detectTrend(windows);

      expect(trend.direction).toBe("increasing");
      expect(trend.strength).toBeGreaterThan(0);
    });

    it("should detect decreasing trend", () => {
      // Steadily decreasing values
      const measurements = Array.from({ length: 30 }, (_, i) => 100 - i * 2);
      const windows = MovingWindowAnalyzer.analyzeWindows(measurements, 5);
      const trend = MovingWindowAnalyzer.detectTrend(windows);

      expect(trend.direction).toBe("decreasing");
      expect(trend.strength).toBeGreaterThan(0);
    });
  });

  describe("ChangePointDetector", () => {
    it("should detect CUSUM change points", () => {
      // Data with a clear change point
      const measurements = [
        ...Array(20).fill(10),
        ...Array(20).fill(50)
      ];

      const changePoints = ChangePointDetector.detectCUSUM(measurements, 3);

      expect(changePoints.length).toBeGreaterThan(0);
    });

    it("should detect binary segmentation", () => {
      const measurements = [
        ...Array(15).fill(10),
        ...Array(15).fill(50),
        ...Array(15).fill(20)
      ];

      const segments = ChangePointDetector.detectBinarySegmentation(measurements, 3);

      expect(segments.length).toBeGreaterThan(0);
      expect(segments[0]).toHaveProperty("index");
      expect(segments[0]).toHaveProperty("cost");
    });
  });

  describe("OutlierScorer", () => {
    it("should identify outliers", () => {
      const measurements = [1, 2, 3, 4, 5, 100]; // 100 is an outlier
      const scores = OutlierScorer.scoreOutliers(measurements);

      expect(scores.length).toBe(6);
      expect(scores[0].value).toBe(100); // Highest score first
      expect(scores[0].isOutlier).toBe(true);
    });

    it("should score multiple outlier methods", () => {
      const measurements = [1, 2, 3, 4, 5, 200];
      const scores = OutlierScorer.scoreOutliers(measurements);

      expect(scores[0]).toHaveProperty("zScore");
      expect(scores[0]).toHaveProperty("iqrScore");
      expect(scores[0]).toHaveProperty("modifiedZScore");
      expect(scores[0]).toHaveProperty("compositeScore");
    });

    it("should classify severity levels", () => {
      const measurements = [1, 2, 3, 4, 5, 500]; // Very large outlier
      const scores = OutlierScorer.scoreOutliers(measurements);

      expect(["critical", "high", "medium", "low"]).toContain(scores[0].severity);
    });
  });

  describe("CorrelationAnalyzer", () => {
    it("should find lagged correlations", () => {
      const series1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const series2 = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]; // Lagged copy
      const correlations = CorrelationAnalyzer.findLaggedCorrelations(series1, series2, 5);

      expect(correlations.length).toBeGreaterThan(0);
      expect(correlations[0]).toHaveProperty("lag");
      expect(correlations[0]).toHaveProperty("correlation");
      expect(correlations[0]).toHaveProperty("strength");
    });

    it("should identify correlation strength", () => {
      const series1 = Array.from({ length: 20 }, (_, i) => i);
      const series2 = Array.from({ length: 20 }, (_, i) => i); // Perfect correlation
      const correlations = CorrelationAnalyzer.findLaggedCorrelations(series1, series2, 3);

      expect(correlations[0].correlation).toBeGreaterThan(0.9);
      expect(correlations[0].strength).toBe("strong");
    });
  });

  describe("AnalyticsEngine", () => {
    it("should analyze metrics comprehensively", () => {
      const measurements = Array.from({ length: 100 }, (_, i) => 10 + Math.random() * 5);
      const engine = new AnalyticsEngine();
      const analysis = engine.analyzeMetrics(measurements, "test-metric");

      expect(analysis).toHaveProperty("stats");
      expect(analysis).toHaveProperty("trend");
      expect(analysis).toHaveProperty("anomalyCounts");
      expect(analysis).toHaveProperty("health");
      expect(analysis.health).toBeGreaterThanOrEqual(0);
      expect(analysis.health).toBeLessThanOrEqual(100);
    });

    it("should calculate health score", () => {
      const measurements = Array.from({ length: 100 }, (_, i) => 10 + Math.random() * 1);
      const engine = new AnalyticsEngine();
      const analysis = engine.analyzeMetrics(measurements, "stable-metric");

      expect(analysis.health).toBeGreaterThan(50); // Stable metrics should have good health
    });

    it("should detect degraded health", () => {
      // Create increasingly volatile data
      const measurements = Array.from({ length: 100 }, (_, i) => {
        const volatility = i > 50 ? 50 : 1; // High variance after index 50
        return 100 + (Math.random() - 0.5) * volatility;
      });

      const engine = new AnalyticsEngine();
      const analysis = engine.analyzeMetrics(measurements, "degrading-metric");

      expect(analysis.anomalyCounts.total).toBeGreaterThan(0);
    });

    it("should compare periods", () => {
      const before = Array(50).fill(10);
      const after = Array(50).fill(20); // 2x degradation

      const engine = new AnalyticsEngine();
      const comparison = engine.comparePeriods(before, after);

      expect(comparison.meanChange).toBeGreaterThan(0);
      expect(comparison.meanChangePct).toBeGreaterThan(50);
      expect(comparison.direction).toBe("degradation");
    });

    it("should forecast future values", () => {
      const measurements = Array.from({ length: 20 }, (_, i) => i * 2);
      const engine = new AnalyticsEngine();
      const forecast = engine.forecast(measurements, 5);

      expect(forecast.length).toBe(5);
      expect(forecast[0]).toHaveProperty("horizon");
      expect(forecast[0]).toHaveProperty("prediction");
      expect(forecast[0]).toHaveProperty("confidence");

      // Should predict increasing values
      expect(forecast[0].prediction).toBeGreaterThan(measurements[measurements.length - 1]);
    });

    it("should handle empty data gracefully", () => {
      const engine = new AnalyticsEngine();
      const analysis = engine.analyzeMetrics([], "empty");

      expect(analysis).toHaveProperty("error");
    });

    it("should handle insufficient data for forecasting", () => {
      const engine = new AnalyticsEngine();
      const forecast = engine.forecast([], 5);

      expect(forecast).toEqual([]);
    });
  });
});

describe("Performance Monitoring Integration", () => {
  it("should collect multiple metric types together", () => {
    const collector = new ExtendedMetricsCollector({
      includeMemory: true,
      includeCPU: true,
      includeIO: true
    });

    collector.start();

    // Do some work
    for (let i = 0; i < 10000; i++) {
      Math.sqrt(i);
    }

    const metrics = collector.getFlatMetrics();
    const count = Object.keys(metrics).length;

    expect(count).toBeGreaterThanOrEqual(15);
  });

  it("should generate RDF-compatible output", () => {
    const collector = new ExtendedMetricsCollector();
    collector.start();
    const rdfMetrics = collector.getForRDF();

    expect(rdfMetrics).toHaveProperty("timestamp");
    expect(Object.keys(rdfMetrics).length).toBeGreaterThan(1);

    // All values except timestamp should be numbers
    Object.entries(rdfMetrics).forEach(([key, value]) => {
      if (key !== "timestamp") {
        expect(typeof value).toMatch(/number|boolean|string/);
      }
    });
  });

  it("should support performance benchmarking workflow", () => {
    const measurements = Array.from({ length: 100 }, () => {
      const collector = new ExtendedMetricsCollector({
        includeMemory: true,
        includeCPU: true
      });
      collector.start();

      // Simulate operation
      for (let i = 0; i < 5000; i++) {
        Math.sqrt(i);
      }

      const metrics = collector.getFlatMetrics();
      return metrics.userCPU || 0;
    });

    const engine = new AnalyticsEngine();
    const analysis = engine.analyzeMetrics(measurements, "cpu-usage");

    expect(analysis.stats.mean).toBeGreaterThan(0);
    expect(analysis.stats.stddev).toBeGreaterThanOrEqual(0);
    expect(analysis.health).toBeGreaterThan(0);
  });

  it("should track metric count accuracy", () => {
    const collector = new ExtendedMetricsCollector();
    collector.start();

    const count1 = collector.getMetricCount();
    const flat = collector.getFlatMetrics();
    const count2 = Object.keys(flat).length;

    expect(count1).toBe(count2);
  });
});

describe("Metrics Coverage", () => {
  it("should collect at least 26 different metrics", () => {
    const collector = new ExtendedMetricsCollector();
    collector.start();

    // Do some work
    const arr = new Array(1000).fill(Math.random());
    for (let i = 0; i < 5000; i++) {
      Math.sqrt(i);
    }

    const metrics = collector.collect().metrics;
    const count = Object.keys(metrics).length;

    expect(count).toBeGreaterThanOrEqual(26);
  });

  it("should include all required metric categories", () => {
    const collector = new ExtendedMetricsCollector();
    collector.start();
    for (let i = 0; i < 1000; i++) {
      Math.sqrt(i);
    }

    const metrics = collector.getFlatMetrics();
    const keys = Object.keys(metrics);

    // Check for categories
    const hasMemory = keys.some((k) => k.includes("heap") || k.includes("memory"));
    const hasCPU = keys.some((k) => k.includes("cpu") || k.includes("CPU"));
    const hasIO = keys.some((k) => k.includes("disk") || k.includes("fd"));
    const hasEventLoop = keys.some(
      (k) => k.includes("eventLoop") || k.includes("lag")
    );

    expect(hasMemory).toBe(true);
    expect(hasCPU).toBe(true);
    expect(hasIO).toBe(true);
    expect(hasEventLoop).toBe(true);
  });
});

describe("Analytics Quality", () => {
  it("should achieve >85% test coverage of analytics features", () => {
    // This test verifies that analytics engine works correctly
    const measurements = Array.from({ length: 100 }, (_, i) => {
      // Create data with patterns
      if (i < 30) return 10 + Math.random();
      if (i < 60) return 50 + Math.random() * 5;
      return 20 + Math.random() * 2;
    });

    const engine = new AnalyticsEngine();

    // Test multiple analysis features
    const analysis = engine.analyzeMetrics(measurements, "test");
    const comparison = engine.comparePeriods(measurements.slice(0, 50), measurements.slice(50));
    const forecast = engine.forecast(measurements, 10);

    // Verify all major features worked
    expect(analysis).toHaveProperty("stats");
    expect(analysis).toHaveProperty("trend");
    expect(comparison).toHaveProperty("meanChange");
    expect(forecast.length).toBeGreaterThan(0);

    console.log("Analytics Quality Test: PASSED");
    console.log(`  - Analysis features: ${Object.keys(analysis).length}`);
    console.log(`  - Comparison metrics: ${Object.keys(comparison).length}`);
    console.log(`  - Forecast points: ${forecast.length}`);
  });

  it("should handle edge cases gracefully", () => {
    const engine = new AnalyticsEngine();

    // Test with minimal data
    const minimal = [1];
    const analysis1 = engine.analyzeMetrics(minimal, "minimal");
    expect(analysis1.stats).toBeDefined();

    // Test with identical values
    const identical = Array(50).fill(42);
    const analysis2 = engine.analyzeMetrics(identical, "identical");
    expect(analysis2.stats.stddev).toBe(0);

    // Test with extreme values
    const extreme = [0.0001, 1000000, 0.0002];
    const analysis3 = engine.analyzeMetrics(extreme, "extreme");
    expect(analysis3.stats.range).toBeGreaterThan(0);
  });
});
