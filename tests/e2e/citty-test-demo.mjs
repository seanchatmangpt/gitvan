#!/usr/bin/env node

/**
 * GitVan E2E Citty Test Demo
 *
 * Demonstration script for the E2E Citty testing harness
 * Shows how to use the testing utilities and run comprehensive tests
 */

import { GitVanE2ETestRunner } from "./gitvan-citty-test-suite.mjs";
import {
  TestFixtures,
  CLIAssertions,
  MockDataGenerator,
} from "./citty-test-utils.mjs";
import { CittyTestHarness } from "./citty-test-harness.mjs";

console.log("🎯 GitVan E2E Citty Testing Harness Demo");
console.log("=========================================");
console.log(
  "Demonstrating comprehensive testing capabilities for Citty-based CLI"
);
console.log("");

async function runDemo() {
  try {
    // Create test environment
    console.log("🏗️ Creating test environment...");
    const testEnv = await TestFixtures.createTestEnvironment({ withGit: true });
    console.log(`✅ Test environment created at: ${testEnv.testDir}`);

    // Create test harness
    const harness = new CittyTestHarness({
      cliPath: "src/cli.mjs",
      workingDir: testEnv.testDir,
      timeout: 30000,
      env: {
        NODE_ENV: "test",
        GITVAN_TEST_MODE: "true",
      },
    });

    console.log("\n🧪 Running individual command tests...");

    // Test CLI help
    console.log("\n1️⃣ Testing CLI help command");
    const helpResult = await harness.testOutputContains(
      "--help",
      "Git-native development automation platform"
    );
    CLIAssertions.assertSuccess(helpResult);
    console.log("✅ CLI help command works correctly");

    // Test graph commands
    console.log("\n2️⃣ Testing graph commands");
    const graphInitResult = await harness.testSuccess("graph init-default");
    CLIAssertions.assertOutputMatches(
      graphInitResult.stdout,
      /Default graph initialized/
    );
    console.log("✅ Graph init-default command works");

    const graphListResult = await harness.testSuccess("graph list-files");
    CLIAssertions.assertOutputMatches(graphListResult.stdout, /default\.ttl/);
    console.log("✅ Graph list-files command works");

    const graphStatsResult = await harness.testSuccess("graph stats");
    CLIAssertions.assertOutputMatches(
      graphStatsResult.stdout,
      /Quads:|Subjects:|Predicates:|Objects:/
    );
    console.log("✅ Graph stats command works");

    // Test daemon commands
    console.log("\n3️⃣ Testing daemon commands");
    const daemonStatusResult = await harness.testSuccess("daemon status");
    CLIAssertions.assertOutputMatches(
      daemonStatusResult.stdout,
      /Daemon status/
    );
    console.log("✅ Daemon status command works");

    // Test JTBD commands
    console.log("\n4️⃣ Testing JTBD commands");
    const jtbdListResult = await harness.testSuccess("jtbd list");
    CLIAssertions.assertOutputMatches(
      jtbdListResult.stdout,
      /Available JTBD Hooks/
    );
    console.log("✅ JTBD list command works");

    const jtbdStatsResult = await harness.testSuccess("jtbd stats");
    CLIAssertions.assertOutputMatches(
      jtbdStatsResult.stdout,
      /JTBD Statistics/
    );
    console.log("✅ JTBD stats command works");

    // Test workflow commands
    console.log("\n5️⃣ Testing workflow commands");
    const workflowListResult = await harness.testSuccess("workflow list");
    CLIAssertions.assertOutputMatches(
      workflowListResult.stdout,
      /Available workflows/
    );
    console.log("✅ Workflow list command works");

    // Test error handling
    console.log("\n6️⃣ Testing error handling");
    const invalidCommandResult = await harness.testFailure("invalid-command");
    CLIAssertions.assertFailure(invalidCommandResult);
    console.log("✅ Invalid command handling works");

    // Get test results summary
    console.log("\n📊 Test Results Summary:");
    const summary = harness.getResultsSummary();
    console.log(`Total commands tested: ${summary.total}`);
    console.log(`Successful commands: ${summary.passed}`);
    console.log(`Failed commands: ${summary.failed}`);
    console.log(`Success rate: ${summary.successRate.toFixed(1)}%`);
    console.log(`Total duration: ${summary.totalDuration}ms`);
    console.log(`Average duration: ${summary.averageDuration.toFixed(1)}ms`);

    // Run comprehensive test suite
    console.log("\n🚀 Running comprehensive test suite...");
    const runner = new GitVanE2ETestRunner({
      cliPath: "src/cli.mjs",
      workingDir: testEnv.testDir,
      timeout: 30000,
      env: {
        NODE_ENV: "test",
        GITVAN_TEST_MODE: "true",
      },
    });

    const suiteResults = await runner.run();

    console.log("\n🏆 Comprehensive Test Suite Results:");
    console.log(`Total test suites: ${suiteResults.suites.length}`);
    console.log(`Total tests: ${suiteResults.total}`);
    console.log(`Passed tests: ${suiteResults.passed}`);
    console.log(`Failed tests: ${suiteResults.failed}`);
    console.log(
      `Overall success rate: ${(
        (suiteResults.passed / suiteResults.total) *
        100
      ).toFixed(1)}%`
    );

    // Show detailed results by suite
    console.log("\n📋 Detailed Results by Suite:");
    suiteResults.suites.forEach((suite) => {
      console.log(`\n${suite.suite}:`);
      console.log(`  Total: ${suite.total}`);
      console.log(`  Passed: ${suite.passed}`);
      console.log(`  Failed: ${suite.failed}`);
      console.log(
        `  Success rate: ${((suite.passed / suite.total) * 100).toFixed(1)}%`
      );

      if (suite.failed > 0) {
        console.log("  Failed tests:");
        suite.tests
          .filter((t) => t.status === "failed")
          .forEach((test) => {
            console.log(`    - ${test.name}: ${test.error}`);
          });
      }
    });

    // Cleanup
    console.log("\n🧹 Cleaning up test environment...");
    await testEnv.cleanup();
    console.log("✅ Test environment cleaned up");

    console.log("\n🎉 E2E Citty Testing Harness Demo Complete!");
    console.log("===========================================");
    console.log("The testing harness successfully validated:");
    console.log("• CLI command execution");
    console.log("• Output validation");
    console.log("• Error handling");
    console.log("• Performance measurement");
    console.log("• Comprehensive test suite execution");

    console.log("\n🔧 Available Testing Utilities:");
    console.log("• CittyTestHarness - Main testing harness");
    console.log("• CittyTestUtils - Static utilities");
    console.log("• CittyTestSuite - Organized test suites");
    console.log("• CittyTestRunner - Test runner");
    console.log("• MockDataGenerator - Test data generation");
    console.log("• TestFixtures - Pre-configured scenarios");
    console.log("• CLIAssertions - Extended assertions");
    console.log("• PerformanceTestUtils - Performance testing");

    console.log("\n📚 Usage Examples:");
    console.log("• Run all tests: node tests/e2e/run-citty-tests.mjs");
    console.log(
      "• Run specific suite: node tests/e2e/run-citty-tests.mjs --suite graph"
    );
    console.log("• Run demo: node tests/e2e/citty-test-demo.mjs");

    process.exit(suiteResults.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error("❌ Demo Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run demo if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo().catch((error) => {
    console.error("❌ Fatal Demo Error:", error.message);
    process.exit(1);
  });
}

export { runDemo };
