/**
 * BDD Test Setup for GitVan
 *
 * This file sets up the BDD testing environment with:
 * - Cucumber/Gherkin support
 * - GitVan context management
 * - Test utilities and helpers
 * - Mock configurations
 */

import { beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

// Global test state
global.testState = {
  tempDir: null,
  gitVanContext: null,
  mockRepos: new Map(),
  testData: new Map(),
};

/**
 * Setup BDD test environment
 */
beforeAll(async () => {
  // Create temporary directory for tests
  global.testState.tempDir = join(tmpdir(), `gitvan-bdd-test-${randomUUID()}`);
  await fs.mkdir(global.testState.tempDir, { recursive: true });

  // Set up GitVan context
  global.testState.gitVanContext = {
    cwd: global.testState.tempDir,
    env: {
      ...process.env,
      GITVAN_TEST_MODE: "true",
      GITVAN_LOG_LEVEL: "error", // Reduce noise in tests
    },
  };

  console.log(
    `🧪 BDD Test Environment initialized at: ${global.testState.tempDir}`
  );
});

/**
 * Cleanup after all tests
 */
afterAll(async () => {
  if (global.testState.tempDir) {
    try {
      await fs.rm(global.testState.tempDir, { recursive: true, force: true });
      console.log(`🧹 BDD Test Environment cleaned up`);
    } catch (error) {
      console.warn(`⚠️ Failed to cleanup test directory: ${error.message}`);
    }
  }
});

/**
 * Setup before each test
 */
beforeEach(async () => {
  // Reset test data
  global.testState.testData.clear();

  // Reset mock repositories
  global.testState.mockRepos.clear();
});

/**
 * Cleanup after each test
 */
afterEach(async () => {
  // Clean up any temporary files created during the test
  if (global.testState.tempDir) {
    try {
      const entries = await fs.readdir(global.testState.tempDir);
      for (const entry of entries) {
        const fullPath = join(global.testState.tempDir, entry);
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
          await fs.rm(fullPath, { recursive: true, force: true });
        } else {
          await fs.unlink(fullPath);
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
});

/**
 * BDD Test Utilities
 */
export const bddUtils = {
  /**
   * Create a temporary Git repository for testing
   */
  async createTempRepo(name = "test-repo") {
    const repoPath = join(global.testState.tempDir, name);
    await fs.mkdir(repoPath, { recursive: true });

    // Initialize git repository
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFileAsync = promisify(execFile);

    await execFileAsync("git", ["init"], { cwd: repoPath });
    await execFileAsync("git", ["config", "user.name", "Test User"], {
      cwd: repoPath,
    });
    await execFileAsync("git", ["config", "user.email", "test@example.com"], {
      cwd: repoPath,
    });

    global.testState.mockRepos.set(name, repoPath);
    return repoPath;
  },

  /**
   * Create test files in a repository
   */
  async createTestFiles(repoName, files) {
    const repoPath = global.testState.mockRepos.get(repoName);
    if (!repoPath) {
      throw new Error(`Repository ${repoName} not found`);
    }

    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = join(repoPath, filePath);
      await fs.mkdir(join(fullPath, ".."), { recursive: true });
      await fs.writeFile(fullPath, content);
    }
  },

  /**
   * Execute GitVan CLI command
   */
  async executeGitVanCommand(command, options = {}) {
    const { spawn } = await import("node:child_process");
    const { promisify } = await import("node:util");

    return new Promise((resolve, reject) => {
      const args = command.split(" ");
      const child = spawn("node", ["src/cli.mjs", ...args], {
        cwd: global.testState.tempDir,
        env: global.testState.gitVanContext.env,
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
          code,
          stdout,
          stderr,
          success: code === 0,
        });
      });

      child.on("error", (error) => {
        reject(error);
      });
    });
  },

  /**
   * Set test data for scenarios
   */
  setTestData(key, value) {
    global.testState.testData.set(key, value);
  },

  /**
   * Get test data
   */
  getTestData(key) {
    return global.testState.testData.get(key);
  },

  /**
   * Assert file exists
   */
  async assertFileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Read file content
   */
  async readFile(filePath) {
    return await fs.readFile(filePath, "utf8");
  },

  /**
   * Assert file content contains text
   */
  async assertFileContains(filePath, expectedContent) {
    const content = await this.readFile(filePath);
    return content.includes(expectedContent);
  },
};

// Make utilities globally available
global.bddUtils = bddUtils;
