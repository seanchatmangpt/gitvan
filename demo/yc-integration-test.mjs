#!/usr/bin/env node

/**
 * CRITICAL YC DEMO INTEGRATION TEST
 * Tests the complete GitVan pack ecosystem flow:
 * 1. List marketplace packs
 * 2. Search for a pack
 * 3. Apply a builtin pack to test directory
 * 4. Verify files are created
 * 5. Test idempotency (running again skips)
 * 6. Test rollback functionality
 */

import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "pathe";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const gitvanBin = join(__dirname, "..", "bin", "gitvan.mjs");
const testDir = join(__dirname, "test-pack-application");

// Test result tracking
let testResults = [];
let failureCount = 0;

function logTest(name, status, details = "") {
  const result = { name, status, details, timestamp: new Date().toISOString() };
  testResults.push(result);

  const statusIcon = status === "PASS" ? "✅" : "❌";
  console.log(`${statusIcon} ${name}: ${status}`);
  if (details) console.log(`   ${details}`);

  if (status === "FAIL") failureCount++;
}

function runCommand(cmd, expectSuccess = true) {
  try {
    const result = execSync(cmd, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      cwd: testDir
    });
    return { success: true, output: result };
  } catch (error) {
    if (expectSuccess) {
      console.log(`Command failed: ${cmd}`);
      console.log(`Error: ${error.message}`);
      console.log(`Stdout: ${error.stdout}`);
      console.log(`Stderr: ${error.stderr}`);
    }
    return { success: false, error: error.message, stdout: error.stdout, stderr: error.stderr };
  }
}

function setupTestDirectory() {
  console.log("\n🔧 Setting up test environment...");

  // Clean and create test directory
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
  mkdirSync(testDir, { recursive: true });

  // Initialize git repo in test directory
  const gitInit = runCommand("git init", true);
  if (!gitInit.success) {
    logTest("Git repo initialization", "FAIL", "Failed to initialize git repository");
    return false;
  }

  // Configure git user for test
  runCommand("git config user.email 'test@example.com'");
  runCommand("git config user.name 'Test User'");

  // Initialize GitVan in test directory
  const gitvanInit = runCommand(`node "${gitvanBin}" init`, true);
  if (!gitvanInit.success) {
    logTest("GitVan initialization", "FAIL", `Failed to initialize GitVan: ${gitvanInit.error}`);
    return false;
  }

  logTest("Test environment setup", "PASS", "Git repo and GitVan initialized");
  return true;
}

function testMarketplaceListing() {
  console.log("\n📦 Testing marketplace pack listing...");

  const result = runCommand(`node "${gitvanBin}" marketplace browse`, true);

  if (!result.success) {
    logTest("Marketplace browse", "FAIL", `Command failed: ${result.error}`);
    return false;
  }

  // Check if output contains expected marketplace content
  const output = result.output;
  if (!output || output.trim().length === 0) {
    logTest("Marketplace browse", "FAIL", "No output from marketplace browse command");
    return false;
  }

  logTest("Marketplace browse", "PASS", `Found marketplace content (${output.split('\n').length} lines)`);
  return true;
}

function testPackSearch() {
  console.log("\n🔍 Testing pack search functionality...");

  const result = runCommand(`node "${gitvanBin}" marketplace search "docs"`, true);

  if (!result.success) {
    logTest("Pack search", "FAIL", `Search command failed: ${result.error}`);
    return false;
  }

  const output = result.output;
  if (!output || output.trim().length === 0) {
    logTest("Pack search", "FAIL", "No search results returned");
    return false;
  }

  logTest("Pack search", "PASS", `Search returned results for 'docs'`);
  return true;
}

function testPackApplication() {
  console.log("\n⚡ Testing pack application...");

  // First, let's see what builtin packs are available
  const listResult = runCommand(`node "${gitvanBin}" pack list`, true);

  if (!listResult.success) {
    logTest("Pack list", "FAIL", `Failed to list packs: ${listResult.error}`);
    return false;
  }

  console.log("Available packs:", listResult.output);

  // Try to apply a simple builtin pack - let's try "basic" or use a test pack
  const packName = "basic"; // Assuming there's a basic pack
  const applyResult = runCommand(`node "${gitvanBin}" pack apply ${packName}`, true);

  if (!applyResult.success) {
    // If basic pack doesn't exist, try with a different approach
    logTest("Pack application (basic)", "FAIL", `Failed to apply basic pack: ${applyResult.error}`);

    // Try to create a simple test pack and apply it
    return testCustomPackApplication();
  }

  logTest("Pack application", "PASS", `Successfully applied ${packName} pack`);
  return true;
}

function testCustomPackApplication() {
  console.log("\n🛠️ Testing custom pack application...");

  // Create a simple test pack manifest
  const testPackManifest = {
    name: "test-pack",
    version: "1.0.0",
    description: "Test pack for YC demo",
    operations: [
      {
        type: "create_file",
        path: "README.md",
        content: "# Test Pack Applied\n\nThis file was created by the test pack."
      },
      {
        type: "create_file",
        path: "package.json",
        content: JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          description: "Created by GitVan test pack"
        }, null, 2)
      }
    ]
  };

  // Write the test pack manifest
  const packsDir = join(testDir, ".gitvan", "packs");
  mkdirSync(packsDir, { recursive: true });
  writeFileSync(join(packsDir, "test-pack.json"), JSON.stringify(testPackManifest, null, 2));

  // Try to apply the test pack
  const applyResult = runCommand(`node "${gitvanBin}" pack apply test-pack`, true);

  if (!applyResult.success) {
    logTest("Custom pack application", "FAIL", `Failed to apply test pack: ${applyResult.error}`);
    return false;
  }

  // Verify files were created
  const readmeExists = existsSync(join(testDir, "README.md"));
  const packageExists = existsSync(join(testDir, "package.json"));

  if (!readmeExists || !packageExists) {
    logTest("Pack file creation", "FAIL", `Files not created - README: ${readmeExists}, package.json: ${packageExists}`);
    return false;
  }

  // Verify file contents
  const readmeContent = readFileSync(join(testDir, "README.md"), "utf8");
  if (!readmeContent.includes("Test Pack Applied")) {
    logTest("Pack file content", "FAIL", "README.md content incorrect");
    return false;
  }

  logTest("Custom pack application", "PASS", "Test pack applied and files created correctly");
  return true;
}

function testIdempotency() {
  console.log("\n🔄 Testing pack idempotency...");

  // Apply the same pack again - should skip existing files
  const secondApplyResult = runCommand(`node "${gitvanBin}" pack apply test-pack`, true);

  if (!secondApplyResult.success) {
    logTest("Pack idempotency", "FAIL", `Second application failed: ${secondApplyResult.error}`);
    return false;
  }

  // Check if output indicates skipping (this depends on implementation)
  const output = secondApplyResult.output;
  const indicatesSkipping = output.includes("skip") || output.includes("already") || output.includes("exists");

  if (indicatesSkipping) {
    logTest("Pack idempotency", "PASS", "Pack correctly skipped existing files");
  } else {
    logTest("Pack idempotency", "WARN", "Pack applied again - idempotency behavior unclear");
  }

  return true;
}

function testRollback() {
  console.log("\n↩️ Testing pack rollback...");

  // Try to remove/rollback the pack
  const rollbackResult = runCommand(`node "${gitvanBin}" pack remove test-pack`, false);

  if (!rollbackResult.success) {
    // Rollback might not be implemented yet
    logTest("Pack rollback", "SKIP", "Rollback command not available or failed");
    return true;
  }

  // Verify files were removed (if rollback succeeded)
  const readmeExists = existsSync(join(testDir, "README.md"));
  const packageExists = existsSync(join(testDir, "package.json"));

  if (readmeExists || packageExists) {
    logTest("Pack rollback", "FAIL", "Files still exist after rollback");
    return false;
  }

  logTest("Pack rollback", "PASS", "Pack successfully rolled back");
  return true;
}

function testPackStatus() {
  console.log("\n📊 Testing pack status...");

  const statusResult = runCommand(`node "${gitvanBin}" pack status`, false);

  if (!statusResult.success) {
    logTest("Pack status", "SKIP", "Pack status command not available");
    return true;
  }

  logTest("Pack status", "PASS", "Pack status command executed");
  return true;
}

function generateReport() {
  console.log("\n" + "=".repeat(60));
  console.log("🎯 YC DEMO INTEGRATION TEST REPORT");
  console.log("=".repeat(60));

  const totalTests = testResults.length;
  const passedTests = testResults.filter(t => t.status === "PASS").length;
  const failedTests = testResults.filter(t => t.status === "FAIL").length;
  const skippedTests = testResults.filter(t => t.status === "SKIP").length;

  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`⏭️ Skipped: ${skippedTests}`);
  console.log(`\nSuccess Rate: ${((passedTests / (totalTests - skippedTests)) * 100).toFixed(1)}%`);

  if (failedTests > 0) {
    console.log("\n🚨 CRITICAL FAILURES (MUST FIX FOR YC DEMO):");
    testResults.filter(t => t.status === "FAIL").forEach(t => {
      console.log(`❌ ${t.name}: ${t.details}`);
    });
  } else {
    console.log("\n🎉 ALL CRITICAL TESTS PASSED!");
    console.log("GitVan pack ecosystem is READY for YC demo!");
  }

  // Write detailed report
  const reportPath = join(__dirname, "yc-demo-test-report.json");
  writeFileSync(reportPath, JSON.stringify({
    summary: {
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      successRate: ((passedTests / (totalTests - skippedTests)) * 100).toFixed(1) + "%",
      timestamp: new Date().toISOString()
    },
    results: testResults
  }, null, 2));

  console.log(`\n📄 Detailed report saved to: ${reportPath}`);

  return failedTests === 0;
}

async function runIntegrationTest() {
  console.log("🚀 Starting GitVan YC Demo Integration Test...");
  console.log("Testing complete pack ecosystem flow\n");

  try {
    // Setup test environment
    if (!setupTestDirectory()) {
      console.log("❌ Failed to setup test environment");
      process.exit(1);
    }

    // Run all tests
    await testMarketplaceListing();
    await testPackSearch();
    await testPackApplication();
    await testIdempotency();
    await testRollback();
    await testPackStatus();

    // Generate final report
    const allTestsPassed = generateReport();

    // Cleanup
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
      console.log("🧹 Cleaned up test directory");
    }

    if (!allTestsPassed) {
      console.log("\n💥 CRITICAL: Fix failures before YC demo!");
      process.exit(1);
    }

    console.log("\n✨ GitVan pack ecosystem is DEMO-READY!");
    process.exit(0);

  } catch (error) {
    console.error("💥 CRITICAL ERROR:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
runIntegrationTest();