#!/usr/bin/env node

/**
 * @fileoverview RDF Performance Monitoring Example
 *
 * Demonstrates the RDFPerformanceMonitor for tracking, analyzing,
 * and detecting anomalies in GitVan operations.
 *
 * This example shows:
 * - Recording performance measurements
 * - Setting performance budgets
 * - Detecting anomalies
 * - Analyzing correlations
 * - Trend analysis
 * - SPARQL-based queries
 *
 * @version 1.0.0
 * @author GitVan Team
 */

import { RDFPerformanceMonitor } from "../src/performance/RDFPerformanceMonitor.mjs";

/**
 * Simulate a SPARQL query operation
 */
async function simulateSPARQLQuery(complexity = "simple") {
  const baseTime = complexity === "simple" ? 30 : complexity === "medium" ? 100 : 300;
  const variance = baseTime * 0.3;
  const duration = baseTime + (Math.random() * variance - variance / 2);

  const memoryUsed = Math.floor(1000000 + Math.random() * 500000);
  const cpuPercent = 20 + Math.random() * 40;
  const diskIO = Math.floor(100000 + Math.random() * 50000);

  await new Promise(resolve => setTimeout(resolve, Math.floor(duration)));

  return { duration, memoryUsed, cpuPercent, diskIO };
}

/**
 * Simulate a Git commit operation
 */
async function simulateGitCommit() {
  const duration = 50 + Math.random() * 50;
  const memoryUsed = Math.floor(2000000 + Math.random() * 1000000);
  const cpuPercent = 30 + Math.random() * 30;
  const diskIO = Math.floor(500000 + Math.random() * 500000);

  await new Promise(resolve => setTimeout(resolve, Math.floor(duration)));

  return { duration, memoryUsed, cpuPercent, diskIO };
}

/**
 * Simulate a workflow execution
 */
async function simulateWorkflowExecution() {
  const duration = 200 + Math.random() * 200;
  const memoryUsed = Math.floor(5000000 + Math.random() * 2000000);
  const cpuPercent = 50 + Math.random() * 40;
  const diskIO = Math.floor(1000000 + Math.random() * 1000000);

  await new Promise(resolve => setTimeout(resolve, Math.floor(duration)));

  return { duration, memoryUsed, cpuPercent, diskIO };
}

/**
 * Main example function
 */
async function main() {
  console.log("🚀 RDF Performance Monitoring Example\n");

  // ====================================================================
  // Step 1: Initialize the RDF Performance Monitor
  // ====================================================================
  console.log("📊 Step 1: Initializing RDF Performance Monitor...");
  const monitor = new RDFPerformanceMonitor({
    enableBudgets: true,
    enableAnomalyDetection: true,
    anomalyThreshold: 2.0, // 2 standard deviations
    correlationThreshold: 0.7
  });

  await monitor.initialize();
  console.log("✅ Monitor initialized\n");

  // ====================================================================
  // Step 2: Set Performance Budgets
  // ====================================================================
  console.log("📋 Step 2: Setting performance budgets...");

  await monitor.setBudget("sparql-query", {
    maxDuration: 100,
    maxMemory: 2000000,
    maxCPU: 80
  });

  await monitor.setBudget("git-commit", {
    maxDuration: 150,
    maxMemory: 4000000,
    maxCPU: 70
  });

  await monitor.setBudget("workflow-execution", {
    maxDuration: 500,
    maxMemory: 10000000,
    maxCPU: 90
  });

  console.log("✅ Budgets set for 3 operations\n");

  // ====================================================================
  // Step 3: Record Normal Performance Measurements
  // ====================================================================
  console.log("📈 Step 3: Recording normal performance measurements...");

  // Record 50 SPARQL queries with normal performance
  for (let i = 0; i < 50; i++) {
    const metrics = await simulateSPARQLQuery("simple");
    await monitor.recordMeasurement(
      "sparql-query",
      metrics.duration,
      metrics.memoryUsed,
      metrics.cpuPercent,
      metrics.diskIO,
      { complexity: "simple", iteration: i }
    );

    if ((i + 1) % 10 === 0) {
      process.stdout.write(`  Recorded ${i + 1}/50 SPARQL queries...\r`);
    }
  }
  console.log("✅ Recorded 50 SPARQL queries                    ");

  // Record 30 Git commits
  for (let i = 0; i < 30; i++) {
    const metrics = await simulateGitCommit();
    await monitor.recordMeasurement(
      "git-commit",
      metrics.duration,
      metrics.memoryUsed,
      metrics.cpuPercent,
      metrics.diskIO,
      { files: Math.floor(Math.random() * 10 + 1) }
    );

    if ((i + 1) % 10 === 0) {
      process.stdout.write(`  Recorded ${i + 1}/30 Git commits...\r`);
    }
  }
  console.log("✅ Recorded 30 Git commits                       ");

  // Record 20 workflow executions
  for (let i = 0; i < 20; i++) {
    const metrics = await simulateWorkflowExecution();
    await monitor.recordMeasurement(
      "workflow-execution",
      metrics.duration,
      metrics.memoryUsed,
      metrics.cpuPercent,
      metrics.diskIO,
      { steps: Math.floor(Math.random() * 5 + 3) }
    );

    if ((i + 1) % 5 === 0) {
      process.stdout.write(`  Recorded ${i + 1}/20 Workflow executions...\r`);
    }
  }
  console.log("✅ Recorded 20 Workflow executions               \n");

  // ====================================================================
  // Step 4: Introduce Anomalies
  // ====================================================================
  console.log("⚠️  Step 4: Introducing anomalies...");

  // Slow SPARQL query (outlier)
  await monitor.recordMeasurement(
    "sparql-query",
    250, // Way above normal ~30ms
    3000000,
    85,
    200000,
    { complexity: "complex", anomaly: "slow-query" }
  );
  console.log("  ⚠️  Recorded slow SPARQL query (250ms)");

  // Budget violation: Git commit
  await monitor.recordMeasurement(
    "git-commit",
    180, // Exceeds budget of 150ms
    5000000, // Exceeds budget of 4MB
    75,
    800000,
    { files: 50, anomaly: "large-commit" }
  );
  console.log("  ⚠️  Recorded oversized Git commit (180ms, 5MB)");

  // I/O bound operation
  await monitor.recordMeasurement(
    "workflow-execution",
    400,
    6000000,
    30, // Low CPU
    2000000, // High disk I/O
    { steps: 10, anomaly: "io-bound" }
  );
  console.log("  ⚠️  Recorded I/O bound workflow (30% CPU, 2MB I/O)");

  // CPU bound operation
  await monitor.recordMeasurement(
    "sparql-query",
    120,
    1500000,
    95, // High CPU
    50000, // Low disk I/O
    { complexity: "cpu-intensive", anomaly: "cpu-bound" }
  );
  console.log("  ⚠️  Recorded CPU bound query (95% CPU)\n");

  // ====================================================================
  // Step 5: Query and Analyze Data
  // ====================================================================
  console.log("🔍 Step 5: Querying and analyzing performance data...\n");

  // Get statistics for each operation
  console.log("📊 Statistics by Operation:");
  console.log("─".repeat(80));

  for (const operation of ["sparql-query", "git-commit", "workflow-execution"]) {
    const stats = await monitor.getStats(operation);

    console.log(`\n${operation}:`);
    console.log(`  Count: ${stats.count} measurements`);
    console.log(`  Duration: mean=${stats.duration.mean}ms, p50=${stats.duration.p50}ms, p95=${stats.duration.p95}ms, p99=${stats.duration.p99}ms`);
    console.log(`  Memory:   mean=${(stats.memory.mean / 1024 / 1024).toFixed(2)}MB, max=${(stats.memory.max / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  CPU:      mean=${stats.cpu.mean}%, max=${stats.cpu.max}%`);
  }

  // ====================================================================
  // Step 6: Detect Anomalies
  // ====================================================================
  console.log("\n\n⚠️  Step 6: Detected Anomalies:");
  console.log("─".repeat(80));

  const anomalies = await monitor.getAnomalies({ resolved: false });

  if (anomalies.length === 0) {
    console.log("✅ No anomalies detected");
  } else {
    console.log(`Found ${anomalies.length} anomalies:\n`);

    for (const anomaly of anomalies) {
      console.log(`  ${anomaly.severity.toUpperCase()}: ${anomaly.type}`);
      console.log(`    Operation: ${anomaly.operation}`);
      console.log(`    Description: ${anomaly.description}`);
      console.log(`    Detected: ${new Date(anomaly.detectedAt).toLocaleString()}`);
      console.log();
    }
  }

  // ====================================================================
  // Step 7: Budget Violations
  // ====================================================================
  console.log("🚨 Step 7: Budget Violations:");
  console.log("─".repeat(80));

  const violations = await monitor.getBudgetViolations();

  if (violations.length === 0) {
    console.log("✅ No budget violations");
  } else {
    console.log(`Found violations in ${violations.length} operations:\n`);

    for (const violation of violations) {
      console.log(`  ${violation.operation}:`);
      console.log(`    Violations: ${violation.count}`);
      console.log(`    Max violation: ${violation.maxViolation.toFixed(2)}ms`);
      console.log();
    }
  }

  // ====================================================================
  // Step 8: Correlation Analysis
  // ====================================================================
  console.log("🔗 Step 8: Correlation Analysis:");
  console.log("─".repeat(80));

  const correlations = await monitor.getCorrelations();

  if (correlations.length === 0) {
    console.log("ℹ️  No strong correlations detected (threshold: 0.7)");
  } else {
    console.log(`Found ${correlations.length} correlated operation pairs:\n`);

    for (const corr of correlations) {
      console.log(`  ${corr.operation1} ↔ ${corr.operation2}`);
      console.log(`    Metric: ${corr.metric}`);
      console.log(`    Correlation: ${corr.correlation} (${Math.abs(corr.correlation) > 0.9 ? "very strong" : "strong"})`);
      console.log();
    }
  }

  // ====================================================================
  // Step 9: Trend Analysis
  // ====================================================================
  console.log("📈 Step 9: Trend Analysis (90-day window):");
  console.log("─".repeat(80));

  for (const operation of ["sparql-query", "git-commit", "workflow-execution"]) {
    const trend = await monitor.getTrendAnalysis(operation, 90);

    console.log(`\n${operation}:`);
    console.log(`  Data points: ${trend.dataPoints}`);
    console.log(`  Trend: ${trend.trend} (slope: ${trend.slope})`);

    if (trend.trend !== "insufficient-data") {
      console.log(`  Direction: ${trend.direction}`);
      console.log(`  Current avg: ${trend.currentAvg}ms`);
      console.log(`  Previous avg: ${trend.previousAvg}ms`);

      if (trend.direction === "degrading") {
        console.log(`  ⚠️  Performance degrading over time!`);
      } else if (trend.direction === "improving") {
        console.log(`  ✅ Performance improving over time!`);
      }
    }
  }

  // ====================================================================
  // Step 10: SPARQL Query Examples
  // ====================================================================
  console.log("\n\n🔍 Step 10: Advanced SPARQL Queries:");
  console.log("─".repeat(80));

  console.log("\n1. Find slowest operations in last hour:");
  const recentMeasurements = await monitor.getMeasurements("sparql-query", 3600000);
  const slowest = recentMeasurements.sort((a, b) => b.duration - a.duration).slice(0, 5);

  console.log(`   Top 5 slowest SPARQL queries:`);
  slowest.forEach((m, i) => {
    console.log(`   ${i + 1}. ${m.duration.toFixed(2)}ms (${new Date(m.timestamp).toLocaleTimeString()})`);
  });

  console.log("\n2. High-severity anomalies:");
  const criticalAnomalies = await monitor.getAnomalies({ severity: "critical" });
  console.log(`   Found ${criticalAnomalies.length} critical anomalies`);

  console.log("\n3. Budget compliance summary:");
  const allOperations = ["sparql-query", "git-commit", "workflow-execution"];
  for (const op of allOperations) {
    const measurements = await monitor.getMeasurements(op, 24 * 3600000); // Last 24h
    const stats = await monitor.getStats(op);
    console.log(`   ${op}: ${measurements.length} measurements, avg ${stats.duration.mean}ms`);
  }

  // ====================================================================
  // Step 11: Export and Summary
  // ====================================================================
  console.log("\n\n📦 Step 11: Export and Summary:");
  console.log("─".repeat(80));

  const exportData = await monitor.exportToRDF();
  console.log(`\nRDF Store Summary:`);
  console.log(`  Total quads: ${exportData.quadCount}`);
  console.log(`  Operations tracked: ${exportData.operations.length}`);
  console.log(`  Budgets configured: ${exportData.budgets.length}`);

  console.log(`\nOperations: ${exportData.operations.join(", ")}`);
  console.log(`Budgets: ${exportData.budgets.join(", ")}`);

  // ====================================================================
  // Conclusion
  // ====================================================================
  console.log("\n" + "=".repeat(80));
  console.log("✅ RDF Performance Monitoring Example Complete!");
  console.log("=".repeat(80));

  console.log("\nKey Takeaways:");
  console.log("  • RDF-backed performance monitoring enables rich semantic queries");
  console.log("  • SPARQL provides powerful anomaly detection capabilities");
  console.log("  • Budget enforcement catches performance regressions early");
  console.log("  • Correlation analysis reveals dependencies between operations");
  console.log("  • Trend analysis predicts future performance issues");
  console.log("  • All data is queryable via standard SPARQL endpoints");

  console.log("\nNext Steps:");
  console.log("  • Integrate with GitVan workflow execution");
  console.log("  • Add real-time alerting on budget violations");
  console.log("  • Export metrics to external monitoring systems");
  console.log("  • Build performance dashboards with SPARQL queries");
  console.log("  • Implement automated performance regression detection");

  console.log("\n" + "=".repeat(80) + "\n");
}

// Run the example
main().catch(error => {
  console.error("❌ Error running example:", error);
  process.exit(1);
});
