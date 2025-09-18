/**
 * Global Test Setup for GitVan AI Commands
 * Based on AI SDK testing patterns from https://ai-sdk.dev/docs/ai-sdk-core/testing
 */

import { join } from "pathe";
import { mkdirSync, rmSync, existsSync } from "node:fs";

// Global test directory
let globalTestDir;

export default async function setup() {
  // Create global test directory
  globalTestDir = join(process.cwd(), "test-ai-global");
  if (existsSync(globalTestDir)) {
    rmSync(globalTestDir, { recursive: true });
  }
  mkdirSync(globalTestDir, { recursive: true });

  // Set up global test environment
  process.env.NODE_ENV = "test";
  process.env.GITVAN_TEST_MODE = "true";
  process.env.GITVAN_ROOT_DIR = globalTestDir;

  console.log("🧪 Global test setup completed");
}

export async function teardown() {
  // Cleanup global test directory
  if (existsSync(globalTestDir)) {
    rmSync(globalTestDir, { recursive: true });
  }

  // Clean up environment variables
  delete process.env.GITVAN_TEST_MODE;
  delete process.env.GITVAN_ROOT_DIR;

  console.log("🧹 Global test cleanup completed");
}
