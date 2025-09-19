/**
 * @fileoverview GitVan v2 — MemFS Integration Test
 *
 * Test to verify that memfs works correctly with GitVan composables
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTestEnvironment,
  createGitTestEnvironment,
  withGitTestEnvironment,
} from "../src/test-utils/memfs-test-environment.mjs";

describe("MemFS Integration with GitVan", () => {
  let env;

  afterEach(() => {
    if (env) {
      env.cleanup();
    }
  });

  it("should create and manipulate files in memory", async () => {
    env = createTestEnvironment({
      files: {
        "test.txt": "Hello, World!",
        "src/index.js": 'console.log("test");',
      },
    });

    // Test file operations
    expect(await env.fs.exists("test.txt")).toBe(true);
    expect(await env.fs.readFile("test.txt")).toBe("Hello, World!");

    // Test directory operations
    expect(await env.fs.exists("src")).toBe(true);
    const files = await env.fs.readdir("src");
    expect(files).toContain("index.js");

    // Test file creation
    await env.fs.writeFile("new-file.txt", "New content");
    expect(await env.fs.exists("new-file.txt")).toBe(true);
    expect(await env.fs.readFile("new-file.txt")).toBe("New content");

    // Test file deletion
    await env.fs.rm("test.txt");
    expect(await env.fs.exists("test.txt")).toBe(false);
  });

  it("should work with Git operations", async () => {
    env = await createGitTestEnvironment({
      files: {
        "README.md": "# Test Project",
        "src/index.js": 'console.log("Hello, World!");',
      },
    });

    const git = await env.git();

    // Test Git operations
    await git.add("README.md");
    await git.commit("Initial commit");

    // Verify commit
    const log = await git.log("%s");
    expect(log).toContain("Initial commit");

    // Test branch operations
    await git.branchCreate("feature-branch");
    await git.checkout("feature-branch");

    // Create new file on branch
    await env.fs.writeFile("feature.txt", "Feature content");
    await git.add("feature.txt");
    await git.commit("Add feature");

    // Switch back to main
    await git.checkout("main");

    // Feature file should not exist on main
    expect(await env.fs.exists("feature.txt")).toBe(false);
  });

  it("should work with GitVan composables", async () => {
    env = await createGitTestEnvironment();

    await env.withContext(async () => {
      const fs = await env.filesystem();
      const git = await env.git();

      // Use GitVan filesystem composable
      await fs.writeFile("composable-test.txt", "Composable test");
      expect(await fs.exists("composable-test.txt")).toBe(true);

      // Use GitVan git composable
      await git.add("composable-test.txt");
      await git.commit("Test composable integration");

      const log = await git.log("%s");
      expect(log).toContain("Test composable integration");
    });
  });

  it("should provide isolated test environments", async () => {
    // Create two separate environments
    const env1 = createTestEnvironment({
      files: { "file1.txt": "Content 1" },
    });

    const env2 = createTestEnvironment({
      files: { "file2.txt": "Content 2" },
    });

    try {
      // Each environment should be isolated
      expect(await env1.fs.exists("file1.txt")).toBe(true);
      expect(await env1.fs.exists("file2.txt")).toBe(false);

      expect(await env2.fs.exists("file2.txt")).toBe(true);
      expect(await env2.fs.exists("file1.txt")).toBe(false);

      // Modifications in one environment shouldn't affect the other
      await env1.fs.writeFile("shared.txt", "From env1");
      expect(await env2.fs.exists("shared.txt")).toBe(false);
    } finally {
      env1.cleanup();
      env2.cleanup();
    }
  });

  it("should work with test helper functions", async () => {
    await withGitTestEnvironment(async (env) => {
      // Test with automatic cleanup
      await env.fs.writeFile("helper-test.txt", "Helper test");
      expect(await env.fs.exists("helper-test.txt")).toBe(true);

      const git = await env.git();
      await git.add("helper-test.txt");
      await git.commit("Helper test commit");

      const log = await git.log("%s");
      expect(log).toContain("Helper test commit");
    });

    // Environment should be automatically cleaned up
  });

  it("should handle complex Git workflows", async () => {
    env = await createGitTestEnvironment({
      files: {
        "package.json": JSON.stringify(
          {
            name: "test-project",
            version: "1.0.0",
          },
          null,
          2
        ),
        "src/main.js": 'console.log("main");',
        "tests/test.js": 'console.log("test");',
      },
    });

    const git = await env.git();

    // Initial commit
    await git.add(".");
    await git.commit("Initial project setup");

    // Create feature branch
    await git.branchCreate("feature/new-feature");
    await git.checkout("feature/new-feature");

    // Add feature
    await env.fs.writeFile("src/feature.js", 'console.log("feature");');
    await git.add("src/feature.js");
    await git.commit("Add new feature");

    // Merge back to main
    await git.checkout("main");
    await git.merge("feature/new-feature");

    // Verify merge
    expect(await env.fs.exists("src/feature.js")).toBe(true);

    const log = await git.log("%s");
    expect(log).toContain("Add new feature");
    expect(log).toContain("Initial project setup");

    // Clean up branch
    await git.branchDelete("feature/new-feature");
  });

  it("should provide file system snapshots", async () => {
    env = createTestEnvironment({
      files: {
        "file1.txt": "Content 1",
        "dir/file2.txt": "Content 2",
      },
    });

    // Get snapshot
    const snapshot = env.fs.getSnapshot();
    expect(snapshot["/test/file1.txt"]).toBe("Content 1");
    expect(snapshot["/test/dir/file2.txt"]).toBe("Content 2");

    // Modify and get new snapshot
    await env.fs.writeFile("file3.txt", "Content 3");
    const newSnapshot = env.fs.getSnapshot();
    expect(newSnapshot["/test/file3.txt"]).toBe("Content 3");
  });
});
