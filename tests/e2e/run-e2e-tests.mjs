// tests/e2e/run-e2e-tests.mjs
// E2E Test Runner for GitVan v2 CLI Commands
// Runs all end-to-end tests against the playground environment

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "pathe";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const projectRoot = join(__dirname, "../..");

async function runE2ETests() {
  console.log("🚀 Starting GitVan v2 E2E Tests...");
  console.log(`📁 Project Root: ${projectRoot}`);
  console.log(`📁 Playground: ${join(projectRoot, "playground")}`);
  console.log("");

  const testFiles = [
    "tests/e2e/chat-cli.test.mjs",
    "tests/e2e/cron-cli.test.mjs", 
    "tests/e2e/daemon-cli.test.mjs",
    "tests/e2e/event-cli.test.mjs",
    "tests/e2e/audit-cli.test.mjs",
    "tests/e2e/llm-cli.test.mjs",
    "tests/e2e/cli-integration.test.mjs",
  ];

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const testFile of testFiles) {
    console.log(`\n📋 Running ${testFile}...`);
    
    try {
      const result = await runTestFile(testFile);
      
      if (result.success) {
        console.log(`✅ ${testFile} - PASSED`);
        passedTests += result.testCount;
      } else {
        console.log(`❌ ${testFile} - FAILED`);
        failedTests += result.testCount;
        console.log(`   Error: ${result.error}`);
      }
      
      totalTests += result.testCount;
    } catch (error) {
      console.log(`❌ ${testFile} - ERROR`);
      console.log(`   ${error.message}`);
      failedTests++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 E2E Test Results Summary");
  console.log("=".repeat(50));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Success Rate: ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%`);
  
  if (failedTests === 0) {
    console.log("\n🎉 All E2E tests passed!");
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${failedTests} test(s) failed`);
    process.exit(1);
  }
}

function runTestFile(testFile) {
  return new Promise((resolve) => {
    const child = spawn("npx", ["vitest", "run", testFile], {
      cwd: projectRoot,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      const output = stdout + stderr;
      const testCount = (output.match(/✓|×/g) || []).length;
      
      resolve({
        success: code === 0,
        testCount,
        error: code !== 0 ? stderr : null,
      });
    });

    child.on("error", (error) => {
      resolve({
        success: false,
        testCount: 0,
        error: error.message,
      });
    });
  });
}

// Run the tests
runE2ETests().catch((error) => {
  console.error("❌ E2E Test Runner failed:", error);
  process.exit(1);
});
