// test-run-job.mjs
// Test running an actual job

import { jobCLI } from "./src/cli/job.mjs";

async function testRunJob() {
  console.log("=== GitVan Job Execution Test ===\n");

  try {
    // Test running the simple test job
    console.log("1. Running test:simple job...");
    const result = await jobCLI("run", {
      id: "test:simple",
      payload: { test: "data", timestamp: new Date().toISOString() },
    });

    console.log("Job execution result:");
    console.log(`  Duration: ${result.duration}ms`);
    console.log(`  Fingerprint: ${result.fingerprint}`);
    console.log(`  Artifacts: ${result.artifacts.length}`);

    if (result.artifacts.length > 0) {
      result.artifacts.forEach((artifact) => {
        console.log(`    - ${artifact}`);
      });
    }

    console.log("\n✅ Job execution test completed successfully!");
  } catch (error) {
    console.error("❌ Job execution test failed:", error.message);
    console.error(error.stack);
  }
}

testRunJob();
