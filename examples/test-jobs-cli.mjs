// test-jobs-cli.mjs
// Simple test script to verify job system works

import { scanJobs, getJobStats } from "./src/jobs/scan.mjs";
import { jobCLI } from "./src/cli/job.mjs";

async function testJobSystem() {
  console.log("=== GitVan Job System Test ===\n");

  try {
    // Test job discovery
    console.log("1. Discovering jobs...");
    const jobs = await scanJobs();
    console.log(`Found ${jobs.length} jobs:`);
    jobs.forEach((job) => {
      console.log(
        `  - ${job.id} (${job.mode}) - ${job.meta?.desc || "No description"}`,
      );
    });

    // Test job statistics
    console.log("\n2. Job statistics:");
    const stats = getJobStats(jobs);
    console.log(`  Total: ${stats.total}`);
    console.log(`  On-demand: ${stats.byMode["on-demand"]}`);
    console.log(`  Cron: ${stats.byMode.cron}`);
    console.log(`  Event: ${stats.byMode.event}`);

    // Test CLI list command
    console.log("\n3. Testing CLI list command...");
    const listResult = await jobCLI("list", { format: "simple" });
    console.log("CLI list result:", listResult);

    console.log("\n✅ Job system test completed successfully!");
  } catch (error) {
    console.error("❌ Job system test failed:", error.message);
    console.error(error.stack);
  }
}

testJobSystem();
