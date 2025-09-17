/**
 * Test Setup for GitVan AI Commands
 * Provides common utilities and mocks for AI testing
 */

import { join } from "pathe";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { MockGitVanAIProvider, AITestUtils } from "./ai-mock-provider.mjs";

// Test utilities
export class TestUtils {
  constructor(testDir) {
    this.testDir = testDir;
    this.aiUtils = new AITestUtils(testDir);
  }

  // Create test directory structure
  setupTestDir() {
    const dirs = ["jobs", "jobs/chat", "events", "templates", "packs", "logs"];

    for (const dir of dirs) {
      const dirPath = join(this.testDir, dir);
      if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
      }
    }
  }

  // Cleanup test directory
  cleanupTestDir() {
    if (existsSync(this.testDir)) {
      rmSync(this.testDir, { recursive: true });
    }
  }

  // Create mock AI provider
  createMockProvider(responses = []) {
    return new MockGitVanAIProvider({ responses });
  }

  // Create AI test utils
  createAITestUtils() {
    return this.aiUtils;
  }
}

// Global test setup
let currentTestDir;
let testUtils;

// Export utilities for use in tests
export { testUtils, currentTestDir };
