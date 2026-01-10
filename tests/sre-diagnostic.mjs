#!/usr/bin/env node

/**
 * Simple diagnostic test to check RDF monitor initialization
 */

import { RDFPerformanceMonitor } from "../src/performance/RDFPerformanceMonitor.mjs";

async function main() {
  console.log("🔍 Diagnostic: Testing RDFPerformanceMonitor initialization\n");

  try {
    console.log("Step 1: Create monitor instance...");
    const monitor = new RDFPerformanceMonitor({
      enableAnomalyDetection: false,
    });
    console.log("✅ Monitor instance created\n");

    console.log("Step 2: Initialize monitor...");
    await monitor.initialize();
    console.log("✅ Monitor initialized successfully\n");

    console.log("Step 3: Record test measurement...");
    const id = await monitor.recordMeasurement(
      "test-operation",
      42.5,
      1000000,
      50,
      100000,
      { test: true }
    );
    console.log(`✅ Measurement recorded: ${id}\n`);

    console.log("Step 4: Query statistics...");
    const stats = await monitor.getStats("test-operation");
    console.log("✅ Query successful:", JSON.stringify(stats, null, 2));

    console.log("\n✅ All diagnostic tests passed!");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error("\nStack trace:");
    console.error(error.stack);
    process.exit(1);
  }
}

main();
