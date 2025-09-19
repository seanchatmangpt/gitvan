// tests/useGit-comprehensive.test.mjs
// GitVan v2 — Comprehensive useGit() Tests with Hybrid Test Environment
// Tests all functionality with proper context integration using hybrid test environment

import { describe, it, expect } from "vitest";
import {
  withMemFSTestEnvironment,
  withNativeGitTestEnvironment,
} from "../src/composables/test-environment.mjs";

describe("useGit Comprehensive Tests with Hybrid Test Environment", () => {
  describe("basic functionality with MemFS", () => {
    it("should handle basic Git operations with MemFS backend", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Comprehensive Test Repository\n",
            "src/index.js": 'console.log("Hello, World!");\n',
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("memfs");

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

    it("should handle branch operations with MemFS backend", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Branch Test Repository\n",
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("memfs");

          // Create feature branch
          await env.gitCheckoutBranch("feature/auth");
          env.files.write("src/auth.js", "export const auth = {};\n");
          await env.gitAdd("src/auth.js");
          await env.gitCommit("Add authentication module");

          // Switch back to main
          await env.gitCheckout("master");

          // Merge feature branch
          await env.gitMerge("feature/auth");

          // Verify merge
          const log = await env.gitLog();
          expect(log[0].message).toContain("Add authentication module");
          expect(log[1].message).toContain("Initial commit");

          // Verify file exists
          expect(env.files.exists("src/auth.js")).toBe(true);
        }
      );
    });

    it("should handle complex Git workflows with MemFS backend", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Complex Workflow Test\n",
            "package.json": '{"name": "test-project", "version": "1.0.0"}\n',
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("memfs");

          // Create multiple branches
          await env.gitCheckoutBranch("feature/database");
          env.files.write("src/database.js", "export const db = {};\n");
          await env.gitAdd("src/database.js");
          await env.gitCommit("Add database module");

          await env.gitCheckoutBranch("feature/api");
          env.files.write("src/api.js", "export const api = {};\n");
          await env.gitAdd("src/api.js");
          await env.gitCommit("Add API module");

          // Switch back to main
          await env.gitCheckout("master");

          // Merge both feature branches
          await env.gitMerge("feature/database");
          await env.gitMerge("feature/api");

          // Verify final state
          const log = await env.gitLog();
          expect(log[0].message).toContain("Add API module");
          expect(log[1].message).toContain("Add database module");
          expect(log[2].message).toContain("Initial commit");

          // Verify files exist
          expect(env.files.exists("src/database.js")).toBe(true);
          expect(env.files.exists("src/api.js")).toBe(true);
        }
      );
    });

    it("should demonstrate performance with MemFS backend", async () => {
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

          // Create many files quickly
          for (let i = 0; i < 50; i++) {
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
          expect(log.length).toBeGreaterThan(50); // Should have many commits

          // Verify files exist
          for (let i = 0; i < 50; i++) {
            expect(env.files.exists(`src/module${i}.js`)).toBe(true);
          }
        }
      );
    });
  });

  describe("integration functionality with native Git", () => {
    it("should handle basic Git operations with native backend", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Native Git Test Repository\n",
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

    it("should handle branch operations with native backend", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Native Branch Test Repository\n",
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("native");

          // Create feature branch
          await env.gitCheckoutBranch("feature/auth");
          env.files.write("src/auth.js", "export const auth = {};\n");
          await env.gitAdd("src/auth.js");
          await env.gitCommit("Add authentication module");

          // Switch back to main
          await env.gitCheckout("master");

          // Merge feature branch
          await env.gitMerge("feature/auth");

          // Verify merge
          const log = await env.gitLog();
          expect(log[0].message).toContain("Add authentication module");
          expect(log[1].message).toContain("Initial commit");

          // Verify file exists
          expect(env.files.exists("src/auth.js")).toBe(true);
        }
      );
    });

    it("should handle complex Git workflows with native backend", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Native Complex Workflow Test\n",
            "package.json": '{"name": "test-project", "version": "1.0.0"}\n',
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("native");

          // Create multiple branches
          await env.gitCheckoutBranch("feature/database");
          env.files.write("src/database.js", "export const db = {};\n");
          await env.gitAdd("src/database.js");
          await env.gitCommit("Add database module");

          await env.gitCheckoutBranch("feature/api");
          env.files.write("src/api.js", "export const api = {};\n");
          await env.gitAdd("src/api.js");
          await env.gitCommit("Add API module");

          // Switch back to main
          await env.gitCheckout("master");

          // Merge both feature branches
          await env.gitMerge("feature/database");
          await env.gitMerge("feature/api");

          // Verify final state
          const log = await env.gitLog();
          expect(log[0].message).toContain("Add API module");
          expect(log[1].message).toContain("Add database module");
          expect(log[2].message).toContain("Initial commit");

          // Verify files exist
          expect(env.files.exists("src/database.js")).toBe(true);
          expect(env.files.exists("src/api.js")).toBe(true);
        }
      );
    });

    it("should demonstrate performance with native backend", async () => {
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

          // Create many files
          for (let i = 0; i < 20; i++) {
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
          expect(log.length).toBeGreaterThan(20); // Should have many commits

          // Verify files exist
          for (let i = 0; i < 20; i++) {
            expect(env.files.exists(`src/module${i}.js`)).toBe(true);
          }
        }
      );
    });
  });
});
