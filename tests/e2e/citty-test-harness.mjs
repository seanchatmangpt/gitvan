/**
 * GitVan E2E Citty Testing Harness
 *
 * Comprehensive testing utilities for Citty-based CLI applications
 * Provides robust testing capabilities for GitVan's CLI commands
 */

import { spawn } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import { join, resolve } from "pathe";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

const execFileAsync = promisify(spawn);

/**
 * Citty CLI Test Harness
 * Provides utilities for testing Citty-based CLI applications
 */
export class CittyTestHarness {
  constructor(options = {}) {
    this.options = {
      cliPath: options.cliPath || "src/cli.mjs",
      timeout: options.timeout || 30000,
      workingDir: options.workingDir || process.cwd(),
      env: { ...process.env, ...options.env },
      ...options,
    };

    this.testResults = [];
    this.currentTest = null;
  }

  /**
   * Execute a CLI command and return results
   */
  async executeCommand(command, options = {}) {
    const args = command.split(" ").filter(Boolean);
    const testId = randomUUID();

    const startTime = Date.now();

    try {
      const result = await this._spawnCommand(args, options);
      const duration = Date.now() - startTime;

      const testResult = {
        id: testId,
        command,
        args,
        success: result.code === 0,
        exitCode: result.code,
        stdout: result.stdout,
        stderr: result.stderr,
        duration,
        timestamp: new Date().toISOString(),
        ...options,
      };

      this.testResults.push(testResult);
      return testResult;
    } catch (error) {
      const duration = Date.now() - startTime;

      const testResult = {
        id: testId,
        command,
        args,
        success: false,
        exitCode: 1,
        stdout: "",
        stderr: error.message,
        duration,
        timestamp: new Date().toISOString(),
        error: error.message,
        ...options,
      };

      this.testResults.push(testResult);
      throw error;
    }
  }

  /**
   * Spawn CLI command process
   */
  async _spawnCommand(args, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [this.options.cliPath, ...args], {
        cwd: this.options.workingDir,
        env: this.options.env,
        stdio: ["pipe", "pipe", "pipe"],
        timeout: this.options.timeout,
        ...options,
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
        resolve({
          code,
          stdout,
          stderr,
        });
      });

      child.on("error", (error) => {
        reject(error);
      });

      child.on("timeout", () => {
        child.kill();
        reject(new Error(`Command timed out after ${this.options.timeout}ms`));
      });
    });
  }

  /**
   * Test command success
   */
  async testSuccess(command, options = {}) {
    const result = await this.executeCommand(command, options);
    if (!result.success) {
      throw new Error(
        `Command failed: ${command}\nExit code: ${result.exitCode}\nStderr: ${result.stderr}`
      );
    }
    return result;
  }

  /**
   * Test command failure
   */
  async testFailure(command, options = {}) {
    const result = await this.executeCommand(command, options);
    if (result.success) {
      throw new Error(`Command should have failed but succeeded: ${command}`);
    }
    return result;
  }

  /**
   * Test command output contains text
   */
  async testOutputContains(command, expectedText, options = {}) {
    const result = await this.executeCommand(command, options);
    if (!result.stdout.includes(expectedText)) {
      throw new Error(
        `Expected output to contain "${expectedText}" but got: ${result.stdout}`
      );
    }
    return result;
  }

  /**
   * Test command error contains text
   */
  async testErrorContains(command, expectedError, options = {}) {
    const result = await this.executeCommand(command, options);
    if (!result.stderr.includes(expectedError)) {
      throw new Error(
        `Expected error to contain "${expectedError}" but got: ${result.stderr}`
      );
    }
    return result;
  }

  /**
   * Test command with timeout
   */
  async testWithTimeout(command, timeout, options = {}) {
    return this.executeCommand(command, { ...options, timeout });
  }

  /**
   * Test command with input
   */
  async testWithInput(command, input, options = {}) {
    const args = command.split(" ").filter(Boolean);

    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [this.options.cliPath, ...args], {
        cwd: this.options.workingDir,
        env: this.options.env,
        stdio: ["pipe", "pipe", "pipe"],
        ...options,
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
        resolve({
          command,
          success: code === 0,
          exitCode: code,
          stdout,
          stderr,
        });
      });

      child.on("error", (error) => {
        reject(error);
      });

      // Send input to stdin
      if (input) {
        child.stdin.write(input);
        child.stdin.end();
      }
    });
  }

  /**
   * Get test results summary
   */
  getResultsSummary() {
    const total = this.testResults.length;
    const passed = this.testResults.filter((r) => r.success).length;
    const failed = this.testResults.filter((r) => !r.success).length;
    const totalDuration = this.testResults.reduce(
      (sum, r) => sum + r.duration,
      0
    );

    return {
      total,
      passed,
      failed,
      successRate: total > 0 ? (passed / total) * 100 : 0,
      totalDuration,
      averageDuration: total > 0 ? totalDuration / total : 0,
      results: this.testResults,
    };
  }

  /**
   * Clear test results
   */
  clearResults() {
    this.testResults = [];
  }

  /**
   * Export test results to JSON
   */
  async exportResults(filePath) {
    const summary = this.getResultsSummary();
    await fs.writeFile(filePath, JSON.stringify(summary, null, 2));
    return summary;
  }
}

/**
 * Citty CLI Test Utilities
 * Static utilities for common testing patterns
 */
export class CittyTestUtils {
  /**
   * Create a temporary test directory
   */
  static async createTestDir(prefix = "citty-test") {
    const testDir = join(tmpdir(), `${prefix}-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });
    return testDir;
  }

  /**
   * Clean up test directory
   */
  static async cleanupTestDir(testDir) {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(
        `Failed to clean up test directory ${testDir}: ${error.message}`
      );
    }
  }

  /**
   * Create test files in directory
   */
  static async createTestFiles(testDir, files) {
    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = join(testDir, filePath);
      await fs.mkdir(join(fullPath, ".."), { recursive: true });
      await fs.writeFile(fullPath, content);
    }
  }

  /**
   * Assert file exists
   */
  static async assertFileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      throw new Error(`File does not exist: ${filePath}`);
    }
  }

  /**
   * Assert file content contains text
   */
  static async assertFileContains(filePath, expectedContent) {
    const content = await fs.readFile(filePath, "utf8");
    if (!content.includes(expectedContent)) {
      throw new Error(
        `File ${filePath} does not contain expected content: ${expectedContent}`
      );
    }
    return true;
  }

  /**
   * Assert command output matches pattern
   */
  static assertOutputMatches(output, pattern) {
    if (!pattern.test(output)) {
      throw new Error(
        `Output does not match pattern: ${pattern}\nActual output: ${output}`
      );
    }
    return true;
  }

  /**
   * Assert command exit code
   */
  static assertExitCode(result, expectedCode) {
    if (result.exitCode !== expectedCode) {
      throw new Error(
        `Expected exit code ${expectedCode}, got ${result.exitCode}`
      );
    }
    return true;
  }

  /**
   * Assert command duration is within limits
   */
  static assertDuration(result, maxDuration) {
    if (result.duration > maxDuration) {
      throw new Error(
        `Command took ${result.duration}ms, expected less than ${maxDuration}ms`
      );
    }
    return true;
  }
}

/**
 * Citty CLI Test Suite
 * Provides organized test suite functionality
 */
export class CittyTestSuite {
  constructor(name, harness) {
    this.name = name;
    this.harness = harness;
    this.tests = [];
    this.beforeEachHooks = [];
    this.afterEachHooks = [];
    this.beforeAllHooks = [];
    this.afterAllHooks = [];
  }

  /**
   * Add a test case
   */
  test(name, testFn) {
    this.tests.push({ name, testFn });
    return this;
  }

  /**
   * Add beforeEach hook
   */
  beforeEach(hookFn) {
    this.beforeEachHooks.push(hookFn);
    return this;
  }

  /**
   * Add afterEach hook
   */
  afterEach(hookFn) {
    this.afterEachHooks.push(hookFn);
    return this;
  }

  /**
   * Add beforeAll hook
   */
  beforeAll(hookFn) {
    this.beforeAllHooks.push(hookFn);
    return this;
  }

  /**
   * Add afterAll hook
   */
  afterAll(hookFn) {
    this.afterAllHooks.push(hookFn);
    return this;
  }

  /**
   * Run the test suite
   */
  async run() {
    console.log(`\n🧪 Running test suite: ${this.name}`);
    console.log("=".repeat(50));

    // Run beforeAll hooks
    for (const hook of this.beforeAllHooks) {
      await hook();
    }

    const results = {
      suite: this.name,
      total: this.tests.length,
      passed: 0,
      failed: 0,
      tests: [],
    };

    // Run tests
    for (const test of this.tests) {
      try {
        // Run beforeEach hooks
        for (const hook of this.beforeEachHooks) {
          await hook();
        }

        console.log(`\n🔍 Running test: ${test.name}`);
        await test.testFn();

        console.log(`✅ Test passed: ${test.name}`);
        results.passed++;
        results.tests.push({ name: test.name, status: "passed" });

        // Run afterEach hooks
        for (const hook of this.afterEachHooks) {
          await hook();
        }
      } catch (error) {
        console.log(`❌ Test failed: ${test.name}`);
        console.log(`   Error: ${error.message}`);
        results.failed++;
        results.tests.push({
          name: test.name,
          status: "failed",
          error: error.message,
        });
      }
    }

    // Run afterAll hooks
    for (const hook of this.afterAllHooks) {
      await hook();
    }

    console.log(`\n📊 Test suite results: ${this.name}`);
    console.log(`   Total: ${results.total}`);
    console.log(`   Passed: ${results.passed}`);
    console.log(`   Failed: ${results.failed}`);
    console.log(
      `   Success rate: ${((results.passed / results.total) * 100).toFixed(1)}%`
    );

    return results;
  }
}

/**
 * Citty CLI Test Runner
 * Main test runner for Citty CLI applications
 */
export class CittyTestRunner {
  constructor(options = {}) {
    this.options = options;
    this.suites = [];
    this.harness = new CittyTestHarness(options);
  }

  /**
   * Add a test suite
   */
  addSuite(suite) {
    this.suites.push(suite);
    return this;
  }

  /**
   * Run all test suites
   */
  async run() {
    console.log("🚀 Starting Citty CLI Test Runner");
    console.log("=================================");

    const startTime = Date.now();
    const results = {
      total: 0,
      passed: 0,
      failed: 0,
      suites: [],
    };

    for (const suite of this.suites) {
      const suiteResults = await suite.run();
      results.total += suiteResults.total;
      results.passed += suiteResults.passed;
      results.failed += suiteResults.failed;
      results.suites.push(suiteResults);
    }

    const duration = Date.now() - startTime;

    console.log("\n🏆 Final Test Results");
    console.log("====================");
    console.log(`Total tests: ${results.total}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(
      `Success rate: ${((results.passed / results.total) * 100).toFixed(1)}%`
    );
    console.log(`Total duration: ${duration}ms`);

    if (results.failed > 0) {
      console.log("\n❌ Failed tests:");
      for (const suite of results.suites) {
        for (const test of suite.tests) {
          if (test.status === "failed") {
            console.log(`   - ${suite.suite}: ${test.name} - ${test.error}`);
          }
        }
      }
    }

    return results;
  }
}

/**
 * Default export for easy importing
 */
export default {
  CittyTestHarness,
  CittyTestUtils,
  CittyTestSuite,
  CittyTestRunner,
};
