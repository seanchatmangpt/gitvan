#!/usr/bin/env node

/**
 * Extended Performance Monitoring Example
 *
 * Demonstrates how to use GitVan's extended metrics collection,
 * analytics engine, and RDF integration for comprehensive performance monitoring.
 */

import {
  ExtendedMetricsCollector,
  MemoryMetricsCollector,
  CPUMetricsCollector
} from "../src/performance/extended-metrics.mjs";

import {
  AnalyticsEngine,
  StatisticalAnalyzer,
  MovingWindowAnalyzer,
  OutlierScorer
} from "../src/performance/analytics-engine.mjs";

// ============================================================================
// Example 1: Basic Metrics Collection
// ============================================================================

function example1_BasicCollection() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Example 1: Basic Metrics Collection");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const collector = new ExtendedMetricsCollector();
  collector.start();

  // Simulate some work
  let sum = 0;
  for (let i = 0; i < 50000; i++) {
    sum += Math.sqrt(i) * Math.sin(i);
  }

  const metrics = collector.collect();

  console.log("Collected Metrics:");
  console.log(`  Timestamp: ${metrics.timestamp}`);
  console.log(`  Total metrics: ${Object.keys(metrics.metrics).length}`);
  console.log("\nSample metrics:");
  console.log(`  - heapUsed: ${metrics.metrics.heapUsed.value} bytes`);
  console.log(`  - userCPU: ${metrics.metrics.userCPU.value.toFixed(2)} ms`);
  console.log(`  - diskReadBytes: ${metrics.metrics.diskReadBytes.value}`);
  console.log(`  - eventLoopLag: ${metrics.metrics.eventLoopLag.value.toFixed(2)} ms`);
  console.log(`  - cacheHitRate: ${metrics.metrics.cacheHitRate.value.toFixed(1)} %`);
}

// ============================================================================
// Example 2: Selective Metrics
// ============================================================================

function example2_SelectiveMetrics() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Example 2: Selective Metrics Collection");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Only collect memory and CPU metrics
  const collector = new ExtendedMetricsCollector({
    includeMemory: true,
    includeCPU: true,
    includeIO: false,
    includeEventLoop: false,
    includeCache: false
  });

  collector.start();

  // Allocate memory and do CPU work
  const arr = new Array(10000).fill(Math.random());
  for (let i = 0; i < 20000; i++) {
    Math.sqrt(i);
  }

  const flat = collector.getFlatMetrics();

  console.log("Selective Metrics Collected:");
  Object.entries(flat).forEach(([key, value]) => {
    console.log(`  ${key}: ${typeof value === "number" ? value.toFixed(2) : value}`);
  });
}

// ============================================================================
// Example 3: Statistical Analysis
// ============================================================================

function example3_StatisticalAnalysis() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Example 3: Statistical Analysis");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Create sample performance data
  const measurements = Array.from({ length: 100 }, (_, i) => {
    if (i < 30) return 50 + Math.random() * 10;      // Normal
    if (i < 60) return 100 + Math.random() * 15;     // Degraded
    return 75 + Math.random() * 10;                   // Recovered
  });

  console.log("Performance Data Analysis:");
  console.log(`  Mean: ${StatisticalAnalyzer.mean(measurements).toFixed(2)} ms`);
  console.log(`  Median: ${StatisticalAnalyzer.median(measurements).toFixed(2)} ms`);
  console.log(`  Std Dev: ${StatisticalAnalyzer.stddev(measurements).toFixed(2)} ms`);
  console.log(`  P50: ${StatisticalAnalyzer.percentile(measurements, 50).toFixed(2)} ms`);
  console.log(`  P95: ${StatisticalAnalyzer.percentile(measurements, 95).toFixed(2)} ms`);
  console.log(`  P99: ${StatisticalAnalyzer.percentile(measurements, 99).toFixed(2)} ms`);

  // Correlation example
  const x = measurements.slice(0, 50);
  const y = measurements.slice(50, 100);
  const corr = StatisticalAnalyzer.pearsonCorrelation(x, y);
  console.log(`\n  Correlation between periods: ${corr.toFixed(3)}`);
}

// ============================================================================
// Example 4: Anomaly Detection
// ============================================================================

function example4_AnomalyDetection() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Example 4: Anomaly Detection");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Data with outliers
  const measurements = [
    ...Array(5).fill(10),
    ...Array(5).fill(12),
    ...Array(5).fill(11),
    200,  // Outlier 1
    ...Array(5).fill(13),
    ...Array(5).fill(10),
    250,  // Outlier 2
    ...Array(5).fill(12)
  ];

  const scores = OutlierScorer.scoreOutliers(measurements);

  console.log("Detected Anomalies:");
  const outliers = scores.filter((s) => s.isOutlier).slice(0, 3);

  outliers.forEach((outlier) => {
    console.log(`\n  Value: ${outlier.value}`);
    console.log(`  Composite Score: ${outlier.compositeScore.toFixed(3)}`);
    console.log(`  Severity: ${outlier.severity}`);
    console.log(`  Z-Score: ${outlier.zScore.toFixed(2)}`);
  });
}

// ============================================================================
// Example 5: Trend Analysis
// ============================================================================

function example5_TrendAnalysis() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Example 5: Trend Analysis");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Steadily degrading performance
  const measurements = Array.from({ length: 100 }, (_, i) => 50 + i * 0.5 + Math.random() * 5);

  const windows = MovingWindowAnalyzer.analyzeWindows(measurements, 10);
  const trend = MovingWindowAnalyzer.detectTrend(windows);
  const anomalies = MovingWindowAnalyzer.detectAnomalies(windows);

  console.log("Trend Detection Results:");
  console.log(`  Direction: ${trend.direction}`);
  console.log(`  Strength: ${(trend.strength * 100).toFixed(1)}%`);
  console.log(`  Slope: ${trend.slope.toFixed(4)} per window`);
  console.log(`\n  Windows analyzed: ${windows.length}`);
  console.log(`  Anomalies detected: ${anomalies.length}`);

  if (anomalies.length > 0) {
    console.log(`\n  Top anomalies:`);
    anomalies.slice(0, 3).forEach((anom) => {
      console.log(
        `    - ${anom.type} at window ${anom.index}: ${anom.description}`
      );
    });
  }
}

// ============================================================================
// Example 6: Comprehensive Analysis
// ============================================================================

function example6_ComprehensiveAnalysis() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Example 6: Comprehensive Analytics Engine Analysis");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Real-world-like performance data
  const measurements = Array.from({ length: 200 }, (_, i) => {
    // Normal operations
    if (i < 50) return 45 + Math.random() * 5;

    // Some degradation during middle period
    if (i < 150) {
      const degradation = (i - 50) * 0.3;
      return 50 + degradation + Math.random() * 10;
    }

    // Recovery
    return 80 + Math.random() * 8;
  });

  const engine = new AnalyticsEngine();
  const analysis = engine.analyzeMetrics(measurements, "response-time");

  console.log("Performance Analysis Summary:\n");
  console.log("  Statistics:");
  console.log(`    Mean: ${analysis.stats.mean.toFixed(2)} ms`);
  console.log(`    Median: ${analysis.stats.median.toFixed(2)} ms`);
  console.log(`    Std Dev: ${analysis.stats.stddev.toFixed(2)} ms`);
  console.log(`    Min: ${analysis.stats.min.toFixed(2)} ms`);
  console.log(`    Max: ${analysis.stats.max.toFixed(2)} ms`);
  console.log(`    P95: ${analysis.stats.p95.toFixed(2)} ms`);
  console.log(`    P99: ${analysis.stats.p99.toFixed(2)} ms`);

  console.log("\n  Trend:");
  console.log(`    Direction: ${analysis.trend.direction}`);
  console.log(`    Strength: ${(analysis.trend.strength * 100).toFixed(1)}%`);

  console.log("\n  Anomalies:");
  console.log(`    Total: ${analysis.anomalyCounts.total}`);
  console.log(`    High severity: ${analysis.anomalyCounts.high}`);
  console.log(`    Medium severity: ${analysis.anomalyCounts.medium}`);
  console.log(`    Outliers: ${analysis.anomalyCounts.outliers}`);

  console.log(`\n  Health Score: ${analysis.health.toFixed(0)}/100`);

  if (analysis.recentAnomalies.length > 0) {
    console.log(`\n  Recent Anomalies:`);
    analysis.recentAnomalies.slice(0, 2).forEach((anom) => {
      console.log(`    - ${anom.type}: ${anom.description}`);
    });
  }

  if (analysis.topOutliers.length > 0) {
    console.log(`\n  Top Outliers:`);
    analysis.topOutliers.slice(0, 3).forEach((outlier) => {
      console.log(
        `    - Value: ${outlier.value.toFixed(2)} (severity: ${outlier.severity})`
      );
    });
  }
}

// ============================================================================
// Example 7: Forecasting
// ============================================================================

function example7_Forecasting() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Example 7: Performance Forecasting");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Create trend-based data
  const measurements = Array.from({ length: 30 }, (_, i) => {
    return 50 + i * 2 + Math.random() * 5;
  });

  const engine = new AnalyticsEngine();
  const forecast = engine.forecast(measurements, 10);

  console.log("Performance Forecast (next 10 measurements):\n");
  forecast.forEach((point) => {
    const bar = "█".repeat(Math.floor(point.prediction / 5));
    console.log(
      `  [${String(point.horizon).padStart(2)}] ${bar} ${point.prediction.toFixed(2)} ms (${(point.confidence * 100).toFixed(0)}% confidence)`
    );
  });
}

// ============================================================================
// Example 8: Period Comparison
// ============================================================================

function example8_PeriodComparison() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Example 8: Period Comparison & Regression Detection");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const beforeMetrics = Array(50).fill(50 + Math.random() * 5);
  const afterMetrics = Array(50).fill(75 + Math.random() * 5);

  const engine = new AnalyticsEngine();
  const comparison = engine.comparePeriods(beforeMetrics, afterMetrics);

  console.log("Performance Comparison:\n");
  console.log(`  Before mean: ${StatisticalAnalyzer.mean(beforeMetrics).toFixed(2)} ms`);
  console.log(`  After mean: ${StatisticalAnalyzer.mean(afterMetrics).toFixed(2)} ms`);
  console.log(`\n  Mean change: ${comparison.meanChange.toFixed(2)} ms`);
  console.log(`  Change %: ${comparison.meanChangePct.toFixed(1)}%`);
  console.log(`  Direction: ${comparison.direction}`);
  console.log(`  Severity: ${comparison.severity}`);

  if (comparison.direction === "degradation") {
    console.log(`\n  ⚠️ Performance has degraded by ${comparison.meanChangePct.toFixed(1)}%`);
  }
}

// ============================================================================
// Run all examples
// ============================================================================

function runAllExamples() {
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║  GitVan Extended Performance Monitoring Examples     ║");
  console.log("╚════════════════════════════════════════════════════════╝");

  example1_BasicCollection();
  example2_SelectiveMetrics();
  example3_StatisticalAnalysis();
  example4_AnomalyDetection();
  example5_TrendAnalysis();
  example6_ComprehensiveAnalysis();
  example7_Forecasting();
  example8_PeriodComparison();

  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║  Examples Complete                                    ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");
}

// Run
runAllExamples();
