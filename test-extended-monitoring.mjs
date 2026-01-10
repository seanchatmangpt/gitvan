#!/usr/bin/env node

/**
 * Manual Test Script for Extended Performance Monitoring
 * Validates extended metrics collection and analytics engine
 */

import {
  MemoryMetricsCollector,
  CPUMetricsCollector,
  IOMetricsCollector,
  EventLoopMetricsCollector,
  CacheMetricsCollector,
  ExtendedMetricsCollector
} from "./src/performance/extended-metrics.mjs";

import {
  StatisticalAnalyzer,
  MovingWindowAnalyzer,
  ChangePointDetector,
  OutlierScorer,
  CorrelationAnalyzer,
  AnalyticsEngine
} from "./src/performance/analytics-engine.mjs";

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m"
};

function log(type, message) {
  const icons = {
    info: "ℹ️",
    success: "✅",
    error: "❌",
    test: "🧪",
    metrics: "📊",
    analyze: "🔍"
  };

  console.log(`${icons[type] || "➜"} ${message}`);
}

function section(title) {
  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

function test(description, fn) {
  try {
    fn();
    log("success", description);
    return true;
  } catch (error) {
    log("error", `${description}: ${error.message}`);
    return false;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

let passCount = 0;
let failCount = 0;

function recordTest(passed) {
  if (passed) passCount++;
  else failCount++;
}

// ============================================================================
// EXTENDED METRICS TESTS
// ============================================================================

section("Extended Metrics Collection Tests");

recordTest(test("Memory Metrics Collector", () => {
  const collector = new MemoryMetricsCollector();
  collector.start();

  // Allocate some memory
  const arr = new Array(1000).fill(Math.random());

  const metrics = collector.end();

  assert(metrics.heapUsed > 0, "heapUsed should be > 0");
  assert(metrics.heapTotal > 0, "heapTotal should be > 0");
  assert(metrics.gcPressure >= 0 && metrics.gcPressure <= 100, "gcPressure should be 0-100");

  const labeled = collector.getMetrics();
  assert(labeled.memory, "Should have memory metrics");
  assert(labeled.memory.heapUsed.unit === "bytes", "Unit should be bytes");
}));

recordTest(test("CPU Metrics Collector", () => {
  const collector = new CPUMetricsCollector();
  collector.start();

  // Do some CPU work
  let sum = 0;
  for (let i = 0; i < 50000; i++) {
    sum += Math.sqrt(i);
  }

  const metrics = collector.end();

  assert(metrics.userCPU >= 0, "userCPU should be >= 0");
  assert(metrics.totalCPU >= 0, "totalCPU should be >= 0");
  assert(
    metrics.blockingFraction >= 0 && metrics.blockingFraction <= 1,
    "blockingFraction should be 0-1"
  );

  const labeled = collector.getMetrics();
  assert(labeled.cpu, "Should have CPU metrics");
  assert(Object.keys(labeled.cpu).length === 7, "Should have 7 CPU metrics");
}));

recordTest(test("I/O Metrics Collector", () => {
  const collector = new IOMetricsCollector();
  collector.start();
  const metrics = collector.end();

  assert(metrics.diskReadBytes >= 0, "diskReadBytes should be >= 0");
  assert(metrics.diskWriteBytes >= 0, "diskWriteBytes should be >= 0");

  const labeled = collector.getMetrics();
  assert(labeled.io, "Should have I/O metrics");
  assert(Object.keys(labeled.io).length === 7, "Should have 7 I/O metrics");
}));

recordTest(test("Event Loop Metrics Collector", () => {
  const collector = new EventLoopMetricsCollector();
  collector.start();

  // Do some work
  for (let i = 0; i < 10000; i++) {
    Math.sqrt(i);
  }

  const metrics = collector.end();

  assert(typeof metrics.eventLoopLag === "number", "eventLoopLag should be number");
  assert(typeof metrics.blocking === "boolean", "blocking should be boolean");

  const labeled = collector.getMetrics();
  assert(labeled.eventLoop, "Should have event loop metrics");
  assert(Object.keys(labeled.eventLoop).length === 5, "Should have 5 event loop metrics");
}));

recordTest(test("Cache Metrics Collector", () => {
  const collector = new CacheMetricsCollector({ maxSize: 1000 });

  collector.recordHit("key1", 10);
  collector.recordHit("key1", 10);
  collector.recordMiss("key2", 20);
  collector.recordMiss("key3", 30);

  const metrics = collector.end();

  assert(metrics.cacheHits === 2, "Should have 2 cache hits");
  assert(metrics.cacheMisses === 2, "Should have 2 cache misses");
  assert(metrics.cacheHitRate === 50, "Hit rate should be 50%");
}));

recordTest(test("Extended Metrics Collector (All Metrics)", () => {
  const collector = new ExtendedMetricsCollector();
  collector.start();

  // Do some work
  for (let i = 0; i < 5000; i++) {
    Math.sqrt(i);
  }

  const metrics = collector.collect();
  assert(metrics.timestamp, "Should have timestamp");
  assert(Object.keys(metrics.metrics).length >= 26, "Should have 26+ metrics");

  const metricCount = collector.getMetricCount();
  assert(metricCount >= 26, `Should collect 26+ metrics, got ${metricCount}`);

  const flat = collector.getFlatMetrics();
  assert(Object.keys(flat).length === metricCount, "Flat metrics count should match");

  const rdf = collector.getForRDF();
  assert(rdf.timestamp, "RDF format should have timestamp");
  assert(Object.keys(rdf).length > 1, "RDF format should have metrics");
}));

// ============================================================================
// STATISTICAL ANALYSIS TESTS
// ============================================================================

section("Statistical Analysis Tests");

recordTest(test("Statistical Analyzer - Basic Stats", () => {
  assert(StatisticalAnalyzer.mean([1, 2, 3, 4, 5]) === 3, "Mean should be 3");
  assert(StatisticalAnalyzer.median([1, 2, 3, 4, 5]) === 3, "Median should be 3");

  const stddev = StatisticalAnalyzer.stddev([2, 4, 6, 8, 10]);
  assert(stddev > 0, "Stddev should be > 0");
}));

recordTest(test("Statistical Analyzer - Percentiles", () => {
  const values = Array.from({ length: 100 }, (_, i) => i);
  const p50 = StatisticalAnalyzer.percentile(values, 50);
  const p95 = StatisticalAnalyzer.percentile(values, 95);
  const p99 = StatisticalAnalyzer.percentile(values, 99);

  assert(p50 >= 45 && p50 <= 55, "P50 should be around 50");
  assert(p95 > p50, "P95 should be > P50");
  assert(p99 > p95, "P99 should be > P95");
}));

recordTest(test("Statistical Analyzer - Correlation", () => {
  const x = [1, 2, 3, 4, 5];
  const y = [2, 4, 6, 8, 10];
  const corr = StatisticalAnalyzer.pearsonCorrelation(x, y);

  assert(corr > 0.99, "Perfect positive correlation should be ~1.0");

  // Negative correlation
  const y2 = [10, 8, 6, 4, 2];
  const corr2 = StatisticalAnalyzer.pearsonCorrelation(x, y2);
  assert(corr2 < -0.99, "Perfect negative correlation should be ~-1.0");
}));

recordTest(test("Statistical Analyzer - Linear Trend", () => {
  const values = [1, 2, 3, 4, 5];
  const trend = StatisticalAnalyzer.linearTrend(values);

  assert(trend.slope > 0, "Slope should be > 0 for increasing values");
  assert(typeof trend.intercept === "number", "Intercept should be a number");
}));

// ============================================================================
// ANALYTICS TESTS
// ============================================================================

section("Advanced Analytics Tests");

recordTest(test("Moving Window Analyzer", () => {
  const measurements = Array.from({ length: 50 }, (_, i) => i + 1);
  const windows = MovingWindowAnalyzer.analyzeWindows(measurements, 10);

  assert(windows.length === 41, "Should have 41 windows (50 - 10 + 1)");
  assert(windows[0].mean > 0, "Window should have mean");
  assert(windows[0].stddev >= 0, "Window should have stddev");
}));

recordTest(test("Change Point Detection - CUSUM", () => {
  const measurements = [
    ...Array(20).fill(10),
    ...Array(20).fill(50) // Sudden jump
  ];

  const changePoints = ChangePointDetector.detectCUSUM(measurements, 3);

  assert(changePoints.length > 0, "Should detect change point");
  assert(changePoints[0].type, "Change point should have type");
  assert(changePoints[0].magnitude > 0, "Change point should have magnitude");
}));

recordTest(test("Outlier Detection", () => {
  const measurements = [1, 2, 3, 4, 5, 100]; // 100 is an outlier
  const scores = OutlierScorer.scoreOutliers(measurements);

  assert(scores.length === 6, "Should score all measurements");
  assert(scores[0].value === 100, "Highest score should be the outlier");
  assert(scores[0].isOutlier === true, "Should mark as outlier");
  assert(["critical", "high", "medium", "low"].includes(scores[0].severity), "Should have valid severity");
}));

recordTest(test("Correlation Analysis", () => {
  const series1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const series2 = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
  const correlations = CorrelationAnalyzer.findLaggedCorrelations(series1, series2, 5);

  assert(correlations.length > 0, "Should find correlations");
  assert(correlations[0].correlation > 0.9, "Should detect strong correlation");
  assert(correlations[0].strength === "strong", "Should classify as strong");
}));

recordTest(test("Analytics Engine - Comprehensive Analysis", () => {
  const measurements = Array.from({ length: 100 }, (_, i) => 10 + Math.random() * 5);
  const engine = new AnalyticsEngine();
  const analysis = engine.analyzeMetrics(measurements, "test-metric");

  assert(analysis.stats, "Should have stats");
  assert(analysis.stats.mean > 0, "Should calculate mean");
  assert(analysis.stats.stddev >= 0, "Should calculate stddev");
  assert(analysis.trend, "Should have trend");
  assert(analysis.anomalyCounts, "Should have anomaly counts");
  assert(analysis.health >= 0 && analysis.health <= 100, "Health should be 0-100");
}));

recordTest(test("Analytics Engine - Period Comparison", () => {
  const before = Array(50).fill(10);
  const after = Array(50).fill(20);

  const engine = new AnalyticsEngine();
  const comparison = engine.comparePeriods(before, after);

  assert(comparison.meanChange === 10, "Mean change should be 10");
  assert(comparison.direction === "degradation", "Should detect degradation");
  assert(comparison.severity === "high", "Should classify as high severity");
}));

recordTest(test("Analytics Engine - Forecasting", () => {
  const measurements = Array.from({ length: 20 }, (_, i) => i * 2);
  const engine = new AnalyticsEngine();
  const forecast = engine.forecast(measurements, 5);

  assert(forecast.length === 5, "Should forecast 5 points");
  assert(forecast[0].prediction > measurements[measurements.length - 1], "Should predict increase");
  assert(forecast[0].confidence > 0, "Should have confidence > 0");
}));

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

section("Integration Tests");

recordTest(test("Multi-Metric Collection", () => {
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

  assert(count >= 15, `Should have 15+ metrics, got ${count}`);
}));

recordTest(test("Analytics on Real Metrics", () => {
  const measurements = [];

  for (let i = 0; i < 50; i++) {
    const collector = new ExtendedMetricsCollector({
      includeMemory: true,
      includeCPU: true
    });

    collector.start();

    // Simulate operation
    for (let j = 0; j < 5000; j++) {
      Math.sqrt(j);
    }

    const metrics = collector.getFlatMetrics();
    measurements.push(metrics.userCPU || 0);
  }

  const engine = new AnalyticsEngine();
  const analysis = engine.analyzeMetrics(measurements, "cpu-usage");

  assert(analysis.stats.mean > 0, "Should have mean > 0");
  assert(analysis.health >= 0, "Should have health score");
}));

// ============================================================================
// RESULTS SUMMARY
// ============================================================================

section("Test Summary");

console.log(`${colors.green}✅ Passed: ${passCount}${colors.reset}`);
if (failCount > 0) {
  console.log(`${colors.red}❌ Failed: ${failCount}${colors.reset}`);
}

console.log(`\n${colors.cyan}Total Tests: ${passCount + failCount}${colors.reset}`);
console.log(`${colors.cyan}Pass Rate: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%${colors.reset}`);

// Feature coverage
console.log(`\n${colors.blue}Feature Coverage:${colors.reset}`);
console.log(`  ${colors.green}✓${colors.reset} Memory profiling (8 metrics)`);
console.log(`  ${colors.green}✓${colors.reset} CPU metrics (7 metrics)`);
console.log(`  ${colors.green}✓${colors.reset} I/O metrics (7 metrics)`);
console.log(`  ${colors.green}✓${colors.reset} Event loop metrics (5 metrics)`);
console.log(`  ${colors.green}✓${colors.reset} Cache metrics (7 metrics)`);
console.log(`  ${colors.green}✓${colors.reset} Moving window analysis`);
console.log(`  ${colors.green}✓${colors.reset} Change point detection`);
console.log(`  ${colors.green}✓${colors.reset} Anomaly scoring`);
console.log(`  ${colors.green}✓${colors.reset} Correlation analysis`);
console.log(`  ${colors.green}✓${colors.reset} Trend forecasting`);

console.log(`\n${colors.blue}Metrics Available:${colors.reset}`);

const collector = new ExtendedMetricsCollector();
collector.start();
for (let i = 0; i < 1000; i++) Math.sqrt(i);
const metrics = collector.collect();

console.log(`  Total: ${Object.keys(metrics.metrics).length} metrics`);
Object.keys(metrics.metrics).forEach((key) => {
  console.log(`    - ${key}`);
});

console.log(`\n${colors.green}All tests completed!${colors.reset}\n`);

process.exit(failCount > 0 ? 1 : 0);
