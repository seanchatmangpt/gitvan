#!/usr/bin/env node

/**
 * GitVan E2E Citty Test Runner
 *
 * Main entry point for running E2E tests for GitVan's Citty-based CLI
 * Provides comprehensive testing of all CLI commands and functionality
 */

import { GitVanE2ETestRunner } from "./gitvan-citty-test-suite.mjs";
import { promises as fs } from "node:fs";
import { join } from "pathe";

/**
 * Main test runner function
 */
async function runE2ETests() {
  console.log("🚀 GitVan E2E Citty Test Runner");
  console.log("=================================");
  console.log("Testing GitVan's Citty-based CLI implementation");
  console.log("");

  try {
    // Create test runner with options
    const runner = new GitVanE2ETestRunner({
      cliPath: "src/cli.mjs",
      timeout: 30000,
      env: {
        NODE_ENV: "test",
        GITVAN_TEST_MODE: "true",
      },
    });

    // Run all test suites
    const results = await runner.run();

    // Export results
    const resultsPath = join(
      process.cwd(),
      "test-results",
      "e2e-citty-results.json"
    );
    await fs.mkdir(join(resultsPath, ".."), { recursive: true });
    await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));

    console.log(`\n📊 Test results exported to: ${resultsPath}`);

    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error("❌ E2E Test Runner Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Run specific test suite
 */
async function runSpecificSuite(suiteName) {
  console.log(`🎯 Running specific test suite: ${suiteName}`);

  try {
    const runner = new GitVanE2ETestRunner({
      cliPath: "src/cli.mjs",
      timeout: 30000,
      env: {
        NODE_ENV: "test",
        GITVAN_TEST_MODE: "true",
      },
    });

    // Find and run specific suite
    const suite = runner.suites.find((s) =>
      s.name.toLowerCase().includes(suiteName.toLowerCase())
    );
    if (!suite) {
      console.error(`❌ Test suite not found: ${suiteName}`);
      console.log("Available suites:");
      runner.suites.forEach((s) => console.log(`  - ${s.name}`));
      process.exit(1);
    }

    const results = await suite.run();
    process.exit(results.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error("❌ Specific Suite Runner Error:", error.message);
    process.exit(1);
  }
}

/**
 * Show help information
 */
function showHelp() {
  console.log("GitVan E2E Citty Test Runner");
  console.log("============================");
  console.log("");
  console.log("Usage:");
  console.log("  node tests/e2e/run-citty-tests.mjs [options]");
  console.log("");
  console.log("Options:");
  console.log("  --suite <name>    Run specific test suite");
  console.log("  --help           Show this help message");
  console.log("");
  console.log("Available test suites:");
  console.log("  - GitVan CLI");
  console.log("  - GitVan Graph Commands");
  console.log("  - GitVan Daemon Commands");
  console.log("  - GitVan Event Commands");
  console.log("  - GitVan Cron Commands");
  console.log("  - GitVan Audit Commands");
  console.log("  - GitVan JTBD Commands");
  console.log("  - GitVan Workflow Commands");
  console.log("  - GitVan Hooks Commands");
  console.log("");
  console.log("Examples:");
  console.log("  node tests/e2e/run-citty-tests.mjs");
  console.log("  node tests/e2e/run-citty-tests.mjs --suite graph");
  console.log("  node tests/e2e/run-citty-tests.mjs --suite jtbd");
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--suite" && args[i + 1]) {
      options.suite = args[i + 1];
      i++;
    } else if (args[i] === "--help") {
      options.help = true;
    }
  }

  return options;
}

/**
 * Main entry point
 */
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  if (options.suite) {
    await runSpecificSuite(options.suite);
  } else {
    await runE2ETests();
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("❌ Fatal Error:", error.message);
    process.exit(1);
  });
}

export { runE2ETests, runSpecificSuite, showHelp };
