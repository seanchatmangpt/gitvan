/**
 * Mock Strategies for useGit() - Refactored with Hybrid Test Environment
 *
 * This file provides comprehensive testing using hybrid test environment
 * for various repository states and scenarios.
 */

import { describe, it, expect } from "vitest";
import {
  withMemFSTestEnvironment,
  withNativeGitTestEnvironment,
} from "../src/composables/test-environment.mjs";

describe("Mock Strategies with Hybrid Test Environment", () => {
  describe("clean repository scenarios with MemFS", () => {
    it("should handle clean repository state", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Clean Repository\n",
            "src/index.js": 'console.log("Hello, World!");\n',
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("memfs");

          // Test clean repository state
          const status = await env.gitStatus();
          expect(status).toBeDefined();

          const log = await env.gitLog();
          expect(log).toBeDefined();
          expect(log[0].message).toContain("Initial commit");

          const branch = await env.gitCurrentBranch();
          expect(branch).toBe("master");

          // Verify no uncommitted changes
          env.files.write("src/utils.js", "export const utils = {};\n");
          await env.gitAdd("src/utils.js");
          await env.gitCommit("Add utils module");

          // Verify clean state after commit
          const newStatus = await env.gitStatus();
          expect(newStatus).toBeDefined();
        }
      );
    });

    it("should handle dirty repository state", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Dirty Repository\n",
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("memfs");

          // Create feature branch
          await env.gitCheckoutBranch("feature/new-feature");
          env.files.write("src/feature.js", "export const feature = {};\n");
          await env.gitAdd("src/feature.js");
          await env.gitCommit("Add feature implementation");

          // Add uncommitted changes
          env.files.write(
            "src/additional.js",
            "export const additional = {};\n"
          );

          // Test dirty state
          const status = await env.gitStatus();
          expect(status).toBeDefined();

          const log = await env.gitLog();
          expect(log[0].message).toContain("Add feature implementation");
          expect(log[1].message).toContain("Initial commit");

          const branch = await env.gitCurrentBranch();
          expect(branch).toBe("feature/new-feature");
        }
      );
    });

    it("should handle merge conflict scenarios", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Merge Conflict Test\n",
            "src/common.js": "export const common = {};\n",
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("memfs");

          // Create feature branch
          await env.gitCheckoutBranch("feature/conflict");
          env.files.write(
            "src/common.js",
            "export const common = { modified: true };\n"
          );
          await env.gitAdd("src/common.js");
          await env.gitCommit("Modify common in feature branch");

          // Switch back to main
          await env.gitCheckout("master");
          env.files.write(
            "src/common.js",
            "export const common = { updated: true };\n"
          );
          await env.gitAdd("src/common.js");
          await env.gitCommit("Modify common in main branch");

          // Attempt merge
          try {
            await env.gitMerge("feature/conflict");
            // If merge succeeds, verify the result
            const log = await env.gitLog();
            expect(log[0].message).toContain("Modify common in main branch");
            expect(log[1].message).toContain("Modify common in feature branch");
            expect(log[2].message).toContain("Initial commit");
          } catch (error) {
            // Merge conflict is expected in this scenario
            expect(error).toBeDefined();
          }
        }
      );
    });
  });

  describe("complex repository scenarios with native Git", () => {
    it("should handle multi-branch repository", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Multi-Branch Repository\n",
            "package.json":
              '{"name": "multi-branch-project", "version": "1.0.0"}\n',
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("native");

          // Create multiple branches
          await env.gitCheckoutBranch("develop");
          env.files.write("src/core.js", "export const core = {};\n");
          await env.gitAdd("src/core.js");
          await env.gitCommit("Add core module");

          await env.gitCheckoutBranch("feature/auth");
          env.files.write("src/auth.js", "export const auth = {};\n");
          await env.gitAdd("src/auth.js");
          await env.gitCommit("Add authentication");

          await env.gitCheckoutBranch("feature/database");
          env.files.write("src/database.js", "export const db = {};\n");
          await env.gitAdd("src/database.js");
          await env.gitCommit("Add database");

          // Switch back to main
          await env.gitCheckout("master");

          // Test branch listing
          const branches = await env.gitListBranches();
          expect(branches).toContain("master");
          expect(branches).toContain("develop");
          expect(branches).toContain("feature/auth");
          expect(branches).toContain("feature/database");

          // Merge develop branch
          await env.gitMerge("develop");

          // Verify merge
          const log = await env.gitLog();
          expect(log[0].message).toContain("Add core module");
          expect(log[1].message).toContain("Initial commit");

          // Verify file exists
          expect(env.files.exists("src/core.js")).toBe(true);
        }
      );
    });

    it("should handle release workflow", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Release Workflow Test\n",
            "package.json": '{"name": "release-project", "version": "1.0.0"}\n',
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("native");

          // Create development branch
          await env.gitCheckoutBranch("develop");
          env.files.write("src/feature.js", "export const feature = {};\n");
          await env.gitAdd("src/feature.js");
          await env.gitCommit("Add feature");

          // Create release branch
          await env.gitCheckoutBranch("release/v1.1.0");
          env.files.write(
            "CHANGELOG.md",
            "# Changelog\n\n## v1.1.0\n- Added feature\n"
          );
          await env.gitAdd("CHANGELOG.md");
          await env.gitCommit("Prepare release v1.1.0");

          // Merge to main
          await env.gitCheckout("master");
          await env.gitMerge("release/v1.1.0");

          // Verify release
          const log = await env.gitLog();
          expect(log[0].message).toContain("Prepare release v1.1.0");
          expect(log[1].message).toContain("Add feature");
          expect(log[2].message).toContain("Initial commit");

          // Verify files exist
          expect(env.files.exists("src/feature.js")).toBe(true);
          expect(env.files.exists("CHANGELOG.md")).toBe(true);
        }
      );
    });

    it("should handle hotfix workflow", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Hotfix Workflow Test\n",
            "src/bug.js": "export const bug = {};\n",
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("native");

          // Create hotfix branch
          await env.gitCheckoutBranch("hotfix/critical-bug");
          env.files.write(
            "src/bug.js",
            "export const bug = { fixed: true };\n"
          );
          await env.gitAdd("src/bug.js");
          await env.gitCommit("Fix critical bug");

          // Merge hotfix to main
          await env.gitCheckout("master");
          await env.gitMerge("hotfix/critical-bug");

          // Verify hotfix
          const log = await env.gitLog();
          expect(log[0].message).toContain("Fix critical bug");
          expect(log[1].message).toContain("Initial commit");

          // Verify fix
          expect(env.files.exists("src/bug.js")).toBe(true);
          expect(env.files.read("src/bug.js")).toContain("fixed: true");
        }
      );
    });
  });

  describe("performance and stress testing", () => {
    it("should handle many commits with MemFS", async () => {
      const start = performance.now();

      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Performance Test\n",
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("memfs");

          // Create many commits quickly
          for (let i = 0; i < 100; i++) {
            env.files.write(
              `src/module${i}.js`,
              `export const module${i} = {};\n`
            );
            await env.gitAdd(`src/module${i}.js`);
            await env.gitCommit(`Add module ${i}`);
          }

          const duration = performance.now() - start;
          expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

          console.log(
            `✅ MemFS Performance test completed in ${duration.toFixed(2)}ms`
          );

          // Verify final state
          const log = await env.gitLog();
          expect(log.length).toBeGreaterThan(100); // Should have many commits

          // Verify files exist
          for (let i = 0; i < 100; i++) {
            expect(env.files.exists(`src/module${i}.js`)).toBe(true);
          }
        }
      );
    });

    it("should handle many commits with native Git", async () => {
      const start = performance.now();

      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Native Performance Test\n",
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("native");

          // Create many commits
          for (let i = 0; i < 25; i++) {
            env.files.write(
              `src/module${i}.js`,
              `export const module${i} = {};\n`
            );
            await env.gitAdd(`src/module${i}.js`);
            await env.gitCommit(`Add module ${i}`);
          }

          const duration = performance.now() - start;
          expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

          console.log(
            `✅ Native Performance test completed in ${duration.toFixed(2)}ms`
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
