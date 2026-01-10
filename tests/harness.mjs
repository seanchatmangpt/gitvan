/**
 * GitVan Test Harness
 *
 * Provides centralized testing utilities for:
 * - Context-aware test setup/teardown
 * - Git environment isolation (TZ=UTC, LANG=C)
 * - Mock RDF store for tests
 * - Common test utilities: fixtures, helpers
 *
 * Usage:
 * ```javascript
 * import { testHarness } from './harness.mjs';
 *
 * describe('My Test Suite', () => {
 *   let harness;
 *
 *   beforeEach(async () => {
 *     harness = testHarness.createHarness();
 *     harness.setupContext();
 *     harness.setupMockStore();
 *   });
 *
 *   afterEach(() => {
 *     harness.cleanup();
 *   });
 * });
 * ```
 */

import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

/**
 * In-memory RDF store mock
 * Minimal implementation for 80/20 testing
 */
class MockRDFStore {
  constructor() {
    this.quads = [];
    this.idCounter = 0;
  }

  // Add a quad to the store
  addQuad(s, p, o, g = null) {
    const quad = { subject: s, predicate: p, object: o, graph: g };
    this.quads.push(quad);
    return quad;
  }

  // Remove quads matching pattern
  removeQuad(pattern = {}) {
    const { subject, predicate, object, graph } = pattern;
    this.quads = this.quads.filter(q => {
      if (subject && q.subject !== subject) return true;
      if (predicate && q.predicate !== predicate) return true;
      if (object && q.object !== object) return true;
      if (graph !== undefined && q.graph !== graph) return true;
      return false;
    });
  }

  // Get quads matching pattern
  getQuads(pattern = {}) {
    const { subject, predicate, object, graph } = pattern;
    return this.quads.filter(q => {
      if (subject && q.subject !== subject) return false;
      if (predicate && q.predicate !== predicate) return false;
      if (object && q.object !== object) return false;
      if (graph !== undefined && q.graph !== graph) return false;
      return true;
    });
  }

  // Clear all quads
  clear() {
    this.quads = [];
    this.idCounter = 0;
  }

  // Get size of store
  size() {
    return this.quads.length;
  }

  // Generate unique ID
  generateId() {
    return `_:b${++this.idCounter}`;
  }

  // Clone store
  clone() {
    const cloned = new MockRDFStore();
    cloned.quads = JSON.parse(JSON.stringify(this.quads));
    cloned.idCounter = this.idCounter;
    return cloned;
  }
}

/**
 * Test Harness Factory
 * Creates isolated test environment with context and mock store
 */
class TestHarness {
  constructor() {
    this.testDir = null;
    this.originalEnv = null;
    this.store = null;
    this.context = null;
  }

  /**
   * Create isolated test directory
   * @returns {string} Test directory path
   */
  setupTestDir() {
    // Generate unique test directory
    const tempDir = tmpdir();
    const testId = randomBytes(8).toString('hex');
    this.testDir = join(tempDir, `gitvan-test-${testId}`);

    // Clean up if exists
    if (existsSync(this.testDir)) {
      rmSync(this.testDir, { recursive: true, force: true });
    }

    // Create directory structure
    mkdirSync(this.testDir, { recursive: true });
    mkdirSync(join(this.testDir, '.git'), { recursive: true });

    return this.testDir;
  }

  /**
   * Setup deterministic Git environment
   * Enforces TZ=UTC and LANG=C
   */
  setupGitEnvironment() {
    // Store original environment
    this.originalEnv = { ...process.env };

    // Set deterministic environment
    process.env.TZ = 'UTC';
    process.env.LANG = 'C';
    process.env.NODE_ENV = 'test';
    process.env.GITVAN_TEST_MODE = 'true';

    // Set test directory
    if (this.testDir) {
      process.env.GITVAN_TEST_DIR = this.testDir;
    }
  }

  /**
   * Setup mock RDF store
   * @returns {MockRDFStore} Mock store instance
   */
  setupMockStore() {
    this.store = new MockRDFStore();
    return this.store;
  }

  /**
   * Setup test context
   * Provides context object for composables
   */
  setupContext() {
    this.setupTestDir();
    this.setupGitEnvironment();
    this.setupMockStore();

    this.context = {
      cwd: this.testDir,
      root: this.testDir,
      env: process.env,
      store: this.store,
      now: () => new Date('2025-01-10T00:00:00Z'),
      nowISO: '2025-01-10T00:00:00Z',
      testDir: this.testDir,
      testMode: true,
    };

    return this.context;
  }

  /**
   * Get current test context
   * @returns {object} Context object
   */
  getContext() {
    return this.context;
  }

  /**
   * Get current mock store
   * @returns {MockRDFStore} Store instance
   */
  getStore() {
    return this.store;
  }

  /**
   * Get test directory
   * @returns {string} Test directory path
   */
  getTestDir() {
    return this.testDir;
  }

  /**
   * Cleanup test environment
   * Restores original environment and removes test directory
   */
  cleanup() {
    try {
      // Restore original environment
      if (this.originalEnv) {
        process.env = { ...this.originalEnv };
      }

      // Remove test directory
      if (this.testDir && existsSync(this.testDir)) {
        rmSync(this.testDir, { recursive: true, force: true });
      }

      // Clear store
      if (this.store) {
        this.store.clear();
      }

      // Reset state
      this.testDir = null;
      this.originalEnv = null;
      this.store = null;
      this.context = null;
    } catch (error) {
      console.warn('Error during harness cleanup:', error.message);
    }
  }

  /**
   * Create nested context (for context-aware testing)
   * @param {object} overrides - Override context properties
   * @returns {object} New context
   */
  createNestedContext(overrides = {}) {
    return {
      ...this.context,
      ...overrides,
      env: {
        ...this.context.env,
        ...(overrides.env || {}),
      },
    };
  }

  /**
   * Reset store while keeping context
   */
  resetStore() {
    if (this.store) {
      this.store.clear();
    }
  }

  /**
   * Reset context while keeping store
   */
  resetContext() {
    if (this.context && this.context.store) {
      const store = this.context.store;
      this.setupContext();
      this.store = store;
      this.context.store = store;
    }
  }
}

/**
 * Factory function to create test harness
 * @returns {TestHarness} New harness instance
 */
export function createTestHarness() {
  return new TestHarness();
}

/**
 * Singleton harness for simple use cases
 */
export const testHarness = {
  createHarness() {
    return createTestHarness();
  },

  // Direct usage for simple tests
  setupContext() {
    const harness = new TestHarness();
    harness.setupContext();
    return harness;
  },

  setupMockStore() {
    return new MockRDFStore();
  },

  // Utility to wrap test function with harness
  withHarness(fn) {
    return async () => {
      const harness = createTestHarness();
      harness.setupContext();

      try {
        return await fn(harness);
      } finally {
        harness.cleanup();
      }
    };
  },
};

// Export types for TypeScript projects
export { MockRDFStore, TestHarness };
