/**
 * Test Setup for GitVan
 * Provides common utilities for testing
 */

import { join } from "pathe";
import { mkdirSync, rmSync, existsSync } from "node:fs";

// Test utilities
export class TestUtils {
  constructor(testDir) {
    this.testDir = testDir;
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

  // Create mock AI provider (lazy loaded)
  async createMockProvider(responses = []) {
    try {
      const { MockGitVanAIProvider } = await import("./ai-mock-provider.mjs");
      return new MockGitVanAIProvider({ responses });
    } catch (error) {
      console.warn("AI mock provider not available, skipping AI tests");
      return null;
    }
  }

  // Create AI test utils (lazy loaded)
  async createAITestUtils() {
    try {
      const { AITestUtils } = await import("./ai-mock-provider.mjs");
      return new AITestUtils(this.testDir);
    } catch (error) {
      console.warn("AI test utilities not available, skipping AI tests");
      return null;
    }
  }
}

// Global test setup
let currentTestDir;
let testUtils;

// Export utilities for use in tests
export { testUtils, currentTestDir };
