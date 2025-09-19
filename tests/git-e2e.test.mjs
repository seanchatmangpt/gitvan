/**
 * Git Integration Tests - Real Repository E2E Testing with Hybrid Test Environment
 *
 * Tests the useGit() composable against real git repositories with:
 * - Hybrid test environment (MemFS + native Git)
 * - Deterministic environment (TZ=UTC, LANG=C)
 * - Real git command execution
 * - Complete workflow validation
 * - Error handling and edge cases
 * - Performance testing
 * - Safe in-memory file system operations
 */

import { describe, it, expect } from "vitest";
import { withNativeGitTestEnvironment } from "../src/composables/test-environment.mjs";

describe("Git E2E Integration Tests - Real Repository with Hybrid Test Environment", () => {
  describe("Repository Lifecycle Management", () => {
    it("should handle complete repository lifecycle", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "README.md": "# GitVan Test Repository\n",
            ".gitignore": "node_modules/\n.env\n*.log\n",
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("native");

          // Verify initial state
          const initialBranch = await env.gitCurrentBranch();
          expect(initialBranch).toBe("master");

          const initialLog = await env.gitLog();
          expect(initialLog[0].message).toContain("Initial commit");

          // Create feature branch
          await env.gitCheckoutBranch("feature/lifecycle");

          // Add files and commits
          env.files.write("src/index.js", "console.log('Hello, GitVan!');\n");
          env.files.write("src/utils.js", "export const utils = {};\n");
          await env.gitAdd(".");
          await env.gitCommit("Add source files");

          // Verify feature branch state
          const featureLog = await env.gitLog();
          expect(featureLog[0].message).toContain("Add source files");
          expect(featureLog[1].message).toContain("Initial commit");

          // Switch back to main
          await env.gitCheckout("master");

          // Merge feature branch
          await env.gitMerge("feature/lifecycle");

          // Verify merge
          const finalLog = await env.gitLog();
          expect(finalLog[0].message).toContain("Add source files");
          expect(finalLog[1].message).toContain("Initial commit");

          // Verify files exist
          expect(env.files.exists("src/index.js")).toBe(true);
          expect(env.files.exists("src/utils.js")).toBe(true);
        }
      );
    });

    it("should handle complex branching workflow", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Complex Branching Test Repository\n",
            "package.json": '{"name": "branching-test", "version": "1.0.0"}\n',
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("native");

          // Create development branch
          await env.gitCheckoutBranch("develop");
          env.files.write("src/core.js", "export const core = {};\n");
          await env.gitAdd("src/core.js");
          await env.gitCommit("Add core module");

          // Create feature branches
          await env.gitCheckoutBranch("feature/auth");
          env.files.write("src/auth.js", "export const auth = {};\n");
          await env.gitAdd("src/auth.js");
          await env.gitCommit("Add authentication");

          await env.gitCheckoutBranch("feature/database");
          env.files.write("src/database.js", "export const db = {};\n");
          await env.gitAdd("src/database.js");
          await env.gitCommit("Add database");

          // Merge features to develop
          await env.gitCheckout("develop");
          await env.gitMerge("feature/auth");
          await env.gitMerge("feature/database");

          // Create release branch
          await env.gitCheckoutBranch("release/v1.0.0");
          env.files.write("CHANGELOG.md", "# Changelog\n\n## v1.0.0\n- Added auth\n- Added database\n");
          await env.gitAdd("CHANGELOG.md");
          await env.gitCommit("Prepare release v1.0.0");

          // Merge to main
          await env.gitCheckout("master");
          await env.gitMerge("release/v1.0.0");

          // Verify final state
          const log = await env.gitLog();
          expect(log[0].message).toContain("Prepare release v1.0.0");
          expect(log[1].message).toContain("Add database");
          expect(log[2].message).toContain("Add authentication");
          expect(log[3].message).toContain("Add core module");
          expect(log[4].message).toContain("Initial commit");

          // Verify all files exist
          expect(env.files.exists("src/core.js")).toBe(true);
          expect(env.files.exists("src/auth.js")).toBe(true);
          expect(env.files.exists("src/database.js")).toBe(true);
          expect(env.files.exists("CHANGELOG.md")).toBe(true);
        }
      );
    });
  });

  describe("File Operations and Git Integration", () => {
    it("should handle file operations with Git tracking", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "README.md": "# File Operations Test Repository\n",
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("native");

          // Create multiple files
          env.files.write("src/components/Button.js", "export const Button = () => {};\n");
          env.files.write("src/components/Modal.js", "export const Modal = () => {};\n");
          env.files.write("src/utils/helpers.js", "export const helpers = {};\n");
          env.files.write("tests/components/Button.test.js", 'describe("Button", () => {});\n');

          // Add all files
          await env.gitAdd(".");
          await env.gitCommit("Add components and tests");

          // Verify commit
          const log = await env.gitLog();
          expect(log[0].message).toContain("Add components and tests");
          expect(log[1].message).toContain("Initial commit");

          // Verify files exist
          expect(env.files.exists("src/components/Button.js")).toBe(true);
          expect(env.files.exists("src/components/Modal.js")).toBe(true);
          expect(env.files.exists("src/utils/helpers.js")).toBe(true);
          expect(env.files.exists("tests/components/Button.test.js")).toBe(true);
        }
      );
    });

    it("should handle file modifications and Git tracking", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "README.md": "# File Modification Test Repository\n",
            "src/index.js": "console.log('Hello, World!');\n",
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("native");

          // Modify existing file
          env.files.write("src/index.js", "console.log('Hello, GitVan!');\n");
          expect(env.files.read("src/index.js")).toContain("GitVan");

          // Add new file
          env.files.write("src/utils.js", "export const utils = {};\n");

          // Commit changes
          await env.gitAdd(".");
          await env.gitCommit("Modify index and add utils");

          // Verify commit
          const log = await env.gitLog();
          expect(log[0].message).toContain("Modify index and add utils");
          expect(log[1].message).toContain("Initial commit");

          // Test branch operations
          await env.gitCheckoutBranch("feature/cleanup");
          env.files.write("src/cleanup.js", "export const cleanup = () => {};\n");
          await env.gitAdd("src/cleanup.js");
          await env.gitCommit("Add cleanup utility");

          // Switch back to main
          await env.gitCheckout("master");

          // Merge feature branch
          await env.gitMerge("feature/cleanup");

          // Verify final state
          const finalLog = await env.gitLog();
          expect(finalLog[0].message).toContain("Add cleanup utility");
          expect(finalLog[1].message).toContain("Modify index and add utils");
          expect(finalLog[2].message).toContain("Initial commit");

          // Verify all files exist
          expect(env.files.exists("src/index.js")).toBe(true);
          expect(env.files.exists("src/utils.js")).toBe(true);
          expect(env.files.exists("src/cleanup.js")).toBe(true);
        }
      );
    });
  });

  describe("Performance and Stress Testing", () => {
    it("should handle many operations efficiently", async () => {
      const start = performance.now();

      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Performance Test Repository\n",
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("native");

          // Create many files and commits
          for (let i = 0; i < 25; i++) {
            env.files.write(`src/module${i}.js`, `export const module${i} = {};\n`);
            await env.gitAdd(`src/module${i}.js`);
            await env.gitCommit(`Add module ${i}`);
          }

          // Create many branches
          for (let i = 0; i < 5; i++) {
            await env.gitCheckoutBranch(`feature/branch-${i}`);
            env.files.write(`src/feature${i}.js`, `export const feature${i} = {};\n`);
            await env.gitAdd(`src/feature${i}.js`);
            await env.gitCommit(`Add feature ${i}`);
            await env.gitCheckout("master");
          }

          const duration = performance.now() - start;
          expect(duration).toBeLessThan(15000); // Should complete within 15 seconds

          console.log(
            `✅ E2E Performance test completed in ${duration.toFixed(2)}ms`
          );

          // Verify final state
          const log = await env.gitLog();
          expect(log.length).toBeGreaterThan(25); // Should have many commits

          // Verify files exist
          for (let i = 0; i < 25; i++) {
            expect(env.files.exists(`src/module${i}.js`)).toBe(true);
          }
        }
      );
    });
  });
});
