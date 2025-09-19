/**
 * @fileoverview GitVan v2 — Proper Test Environment Demo
 *
 * Demonstrates the proper GitVan test environment architecture:
 * - Uses GitVan composables with proper context management
 * - Separates MemFS (file operations) from real FS (Git operations)
 * - Follows GitVan's composable patterns
 * - Provides clean, testable API
 */

import { describe, it, expect } from "vitest";
import {
  withTestEnvironment,
  withMemFSTestEnvironment,
  withNativeGitTestEnvironment,
  withHybridTestEnvironment,
} from "../src/composables/test-environment.mjs";

describe("Proper GitVan Test Environment", () => {
  it("should handle Git operations with MemFS backend (ultra-fast)", async () => {
    await withMemFSTestEnvironment(
      {
        initialFiles: {
          "README.md": "# Test Project\n",
          "package.json": JSON.stringify({ name: "test" }, null, 2),
        },
      },
      async (env) => {
        // Verify backend type
        expect(env.getBackendType()).toBe("memfs");

        // Git operations using MemFS + isomorphic-git
        const branch = await env.gitCurrentBranch();
        expect(branch).toBe("master"); // isomorphic-git defaults to master

        const log = await env.gitLog();
        expect(log[0].message).toBe("Initial commit");

        // File operations using MemFS (ultra-fast)
        env.files.write("new-file.txt", "Hello, GitVan!");
        expect(env.files.exists("new-file.txt")).toBe(true);
        expect(env.files.read("new-file.txt")).toBe("Hello, GitVan!");

        // Git operations using MemFS backend
        await env.gitAdd("new-file.txt");
        await env.gitCommit("Add new file");

        // Verify commit
        const newLog = await env.gitLog();
        expect(newLog[0].message).toBe("Add new file");
        expect(newLog[1].message).toBe("Initial commit");
      }
    );
  });

  it("should handle complex Git workflows with native backend", async () => {
    await withNativeGitTestEnvironment(
      {
        initialFiles: {
          "src/index.js": 'console.log("Hello");',
          "package.json": JSON.stringify({ name: "complex-test" }, null, 2),
        },
      },
      async (env) => {
        // Verify backend type
        expect(env.getBackendType()).toBe("native");

        // Create feature branch using native Git
        await env.gitCheckoutBranch("feature");

        // Add new files using native file operations
        env.files.write("src/feature.js", "export const feature = () => {};");
        env.files.write("src/utils.js", "export const utils = {};");

        // Commit using native Git methods
        await env.gitAdd(["src/feature.js", "src/utils.js"]);
        await env.gitCommit("Add feature and utils");

        // Switch back to master (native Git default)
        await env.gitCheckout("master");

        // Merge feature branch
        await env.gitMerge("feature");

        // Verify merge
        const log = await env.gitLog();
        expect(log[0].message).toContain("Add feature and utils");
        expect(log[1].message).toContain("Initial commit");
      }
    );
  });

  it("should demonstrate MemFS performance advantages", async () => {
    const start = performance.now();

    await withMemFSTestEnvironment({}, async (env) => {
      // Verify we're using MemFS backend
      expect(env.getBackendType()).toBe("memfs");

      // Create many files quickly with MemFS
      for (let i = 0; i < 100; i++) {
        env.files.write(`file${i}.txt`, `Content ${i}`);
      }

      // Add all files to Git using MemFS backend
      await env.gitAdd(".");
      await env.gitCommit("Add many files");

      // Verify Git operations work
      const log = await env.gitLog();
      expect(log[0].message).toBe("Add many files");
    });

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(500); // Should be ultra-fast with MemFS
  });

  it("should demonstrate hybrid environment capabilities", async () => {
    await withHybridTestEnvironment(
      {
        initialFiles: {
          "README.md": "# Hybrid Test\n",
        },
      },
      async (env) => {
        // Verify hybrid environment has both backends available
        expect(env.getBackendType()).toBe("memfs"); // Default to MemFS

        // Test MemFS operations
        env.files.write("memfs-file.txt", "This is in MemFS");
        expect(env.files.exists("memfs-file.txt")).toBe(true);

        // Test Git operations with MemFS backend
        await env.gitAdd("memfs-file.txt");
        await env.gitCommit("Add MemFS file");

        // Verify commit
        const log = await env.gitLog();
        expect(log[0].message).toBe("Add MemFS file");
        expect(log[1].message).toBe("Initial commit");

        // Test sync capabilities (if both backends are available)
        try {
          await env.files.syncToGit("memfs-file.txt");
          // Sync should work if both backends are available
        } catch (error) {
          // This is expected if only one backend is available
          expect(error.message).toContain(
            "Both MemFS and native backends required"
          );
        }
      }
    );
  });
});
