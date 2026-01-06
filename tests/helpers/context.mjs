/**
 * GitVan Context Test Helpers
 * Utilities for testing with unctx context preservation
 */

import { createContext } from "unctx";
import { join } from "pathe";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";

/**
 * Create a test GitVan context
 * @param {Object} options - Configuration options
 * @returns {Object} Test context
 */
export function createTestContext(options = {}) {
  const testId = `test-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const testDir = options.dir || join(tmpdir(), "gitvan-test", testId);

  // Ensure test directory exists
  if (!existsSync(testDir)) {
    mkdirSync(testDir, { recursive: true });
  }

  return {
    repo: testDir,
    config: {
      jobs: { dir: "jobs" },
      templates: { dirs: ["templates"] },
      receipts: { ref: "refs/notes/gitvan/audit" },
      graph: { dir: "graph", autoLoad: true },
      ...options.config,
    },
    env: {
      TZ: "UTC",
      LANG: "C",
      NODE_ENV: "test",
      GITVAN_TEST_MODE: "true",
      ...options.env,
    },
    testId,
    testDir,
    cleanup: () => {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    },
  };
}

/**
 * Create a test environment with proper context isolation
 * @param {Function} fn - Function to execute in test environment
 * @param {Object} options - Configuration options
 */
export async function withTestEnvironment(fn, options = {}) {
  const context = createTestContext(options);

  // Set environment variables
  const originalEnv = { ...process.env };
  Object.assign(process.env, context.env);

  try {
    // Execute test function
    const result = await fn(context);
    return result;
  } finally {
    // Restore environment
    process.env = originalEnv;

    // Cleanup test directory
    if (!options.keepDir) {
      context.cleanup();
    }
  }
}

/**
 * Create a mock GitVan context for unctx testing
 * This mimics the actual GitVan context structure
 */
export function createMockGitVanContext() {
  const context = createContext({
    asyncContext: true,
    AsyncLocalStorage: true,
  });

  return {
    context,
    use: () => context.use(),
    set: (key, value) => context.set(key, value),
    call: async (instance, fn) => {
      return await context.call(instance, fn);
    },
  };
}

/**
 * Wait for async operations with timeout
 * @param {Function} fn - Async function to execute
 * @param {number} timeout - Timeout in milliseconds
 */
export async function withTimeout(fn, timeout = 5000) {
  return Promise.race([
    fn(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
    ),
  ]);
}

/**
 * Assert context is available (for debugging)
 */
export function assertContextAvailable(context) {
  if (!context) {
    throw new Error("Context not available - are you within withGitVan()?");
  }
}

/**
 * Create deterministic test data
 * Ensures reproducible test results
 */
export function createDeterministicData(seed = "test") {
  let counter = 0;

  return {
    nextId: () => `${seed}-${counter++}`,
    timestamp: () => new Date("2024-01-01T00:00:00.000Z"),
    random: (min = 0, max = 100) => {
      // Simple deterministic "random" based on counter
      return min + (counter++ % (max - min));
    },
    reset: () => {
      counter = 0;
    },
  };
}
