/**
 * GitVan v2 Git Tests - Refactored with Hybrid Test Environment
 * Tests git composable functionality using hybrid test environment
 */

import { describe, it, expect } from "vitest";
import { withNativeGitTestEnvironment } from "../../src/composables/test-environment.mjs";

describe("Git Composable - Hybrid Test Environment", () => {
  it("should handle basic Git operations", async () => {
    await withNativeGitTestEnvironment(
      {
        initialFiles: {
          "README.md": "# Test Repository\n",
          "src/index.js": 'console.log("Hello, World!");\n',
        },
      },
      async (env) => {
        // Verify backend type
        expect(env.getBackendType()).toBe("native");

        // Test Git status
        const status = await env.gitStatus();
        expect(status).toBeDefined();

        // Test Git log
        const log = await env.gitLog();
        expect(log).toBeDefined();
        expect(log[0].message).toContain("Initial commit");

        // Test Git branch
        const branch = await env.gitCurrentBranch();
        expect(branch).toBe("master");

        // Test file operations
        env.files.write("src/utils.js", "export const utils = {};\n");
        await env.gitAdd("src/utils.js");
        await env.gitCommit("Add utils module");

        // Verify commit
        const newLog = await env.gitLog();
        expect(newLog[0].message).toContain("Add utils module");
        expect(newLog[1].message).toContain("Initial commit");
      }
    );
  });

  it("should handle branch operations", async () => {
    await withNativeGitTestEnvironment(
      {
        initialFiles: {
          "README.md": "# Test Repository\n",
        },
      },
      async (env) => {
        // Verify backend type
        expect(env.getBackendType()).toBe("native");

        // Create feature branch
        await env.gitCheckoutBranch("feature/new-feature");

        // Verify branch switch
        const branch = await env.gitCurrentBranch();
        expect(branch).toBe("feature/new-feature");

        // Add files to feature branch
        env.files.write("src/feature.js", "export const feature = {};\n");
        await env.gitAdd("src/feature.js");
        await env.gitCommit("Add feature implementation");

        // Switch back to main
        await env.gitCheckout("master");

        // Verify we're back on main
        const mainBranch = await env.gitCurrentBranch();
        expect(mainBranch).toBe("master");

        // Merge feature branch
        await env.gitMerge("feature/new-feature");

        // Verify merge
        const log = await env.gitLog();
        expect(log[0].message).toContain("Add feature implementation");
        expect(log[1].message).toContain("Initial commit");
      }
    );
  });

  it("should handle complex Git workflows", async () => {
    await withNativeGitTestEnvironment(
      {
        initialFiles: {
          "README.md": "# Complex Workflow Test\n",
          "package.json": '{"name": "test-project", "version": "1.0.0"}\n',
        },
      },
      async (env) => {
        // Verify backend type
        expect(env.getBackendType()).toBe("native");

        // Create multiple branches
        await env.gitCheckoutBranch("feature/auth");
        env.files.write("src/auth.js", "export const auth = {};\n");
        await env.gitAdd("src/auth.js");
        await env.gitCommit("Add authentication module");

        await env.gitCheckoutBranch("feature/database");
        env.files.write("src/database.js", "export const db = {};\n");
        await env.gitAdd("src/database.js");
        await env.gitCommit("Add database module");

        // Switch back to main
        await env.gitCheckout("master");

        // Merge both feature branches
        await env.gitMerge("feature/auth");
        await env.gitMerge("feature/database");

        // Verify final state
        const log = await env.gitLog();
        expect(log[0].message).toContain("Add database module");
        expect(log[1].message).toContain("Add authentication module");
        expect(log[2].message).toContain("Initial commit");

        // Verify files exist
        expect(env.files.exists("src/auth.js")).toBe(true);
        expect(env.files.exists("src/database.js")).toBe(true);
      }
    );
  });

  it("should demonstrate performance with many operations", async () => {
    const start = performance.now();

    await withNativeGitTestEnvironment(
      {
        initialFiles: {
          "README.md": "# Performance Test\n",
        },
      },
      async (env) => {
        // Verify backend type
        expect(env.getBackendType()).toBe("native");

        // Create many files and commits
        for (let i = 0; i < 20; i++) {
          env.files.write(
            `src/module${i}.js`,
            `export const module${i} = {};\n`
          );
          await env.gitAdd(`src/module${i}.js`);
          await env.gitCommit(`Add module ${i}`);
        }

        // Create multiple branches
        for (let i = 0; i < 5; i++) {
          await env.gitCheckoutBranch(`feature/branch-${i}`);
          env.files.write(
            `src/feature${i}.js`,
            `export const feature${i} = {};\n`
          );
          await env.gitAdd(`src/feature${i}.js`);
          await env.gitCommit(`Add feature ${i}`);
          await env.gitCheckout("master");
        }

        const duration = performance.now() - start;
        expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

        console.log(
          `✅ Performance test completed in ${duration.toFixed(2)}ms`
        );

        // Verify final state
        const log = await env.gitLog();
        expect(log.length).toBeGreaterThan(20); // Should have many commits
      }
    );
  });
});
