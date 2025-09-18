#!/usr/bin/env node
// playground/test-playground.mjs
// Comprehensive test of GitVan playground functionality

import {
  list,
  run,
  startDaemon,
  stopDaemon,
  status,
  stats,
  receipts,
} from "./dev.mjs";

async function testPlayground() {
  console.log("🧪 GitVan Playground - Comprehensive Test");
  console.log("=".repeat(50));

  try {
    // 1. Test job discovery
    console.log("\n1️⃣ Testing job discovery...");
    await list();

    // 2. Test job execution
    console.log("\n2️⃣ Testing job execution...");

    console.log("Running docs:changelog job...");
    await run("docs:changelog");

    console.log("Running test:simple job...");
    await run("test:simple");

    // 3. Test daemon functionality
    console.log("\n3️⃣ Testing daemon functionality...");
    await startDaemon();
    await status();
    await stopDaemon();

    // 4. Test statistics
    console.log("\n4️⃣ Testing job statistics...");
    await stats();

    // 5. Test receipts
    console.log("\n5️⃣ Testing git receipts...");
    await receipts();

    // 6. Show generated files
    console.log("\n6️⃣ Generated files:");
    const { promises: fs } = await import("node:fs");
    const { join } = await import("pathe");

    try {
      const distFiles = await fs.readdir("dist");
      for (const file of distFiles) {
        const filePath = join("dist", file);
        const stats = await fs.stat(filePath);
        console.log(`  📄 ${file} (${stats.size} bytes)`);
      }
    } catch (error) {
      console.log("  No dist directory found");
    }

    console.log("\n✅ All playground tests completed successfully!");
    console.log("\n🎉 GitVan Jobs System is working perfectly!");
  } catch (error) {
    console.error("❌ Playground test failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testPlayground();
