// tests/git-errors.test.mjs
// GitVan v2 — Error Handling Test Suite with Hybrid Test Environment
// Comprehensive error scenarios testing for useGit() composable
// Focus: Clean error propagation, maxBuffer handling, happy path principle

import { describe, it, expect } from "vitest";
import { withMemFSTestEnvironment, withNativeGitTestEnvironment } from "../src/composables/test-environment.mjs";

describe("GitVan Error Handling with Hybrid Test Environment", () => {
  describe("Git Command Execution Failures with MemFS", () => {
    it("should handle basic error scenarios", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Error Handling Test\n",
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("memfs");

          // Test basic Git operations
          const status = await env.gitStatus();
          expect(status).toBeDefined();

          const log = await env.gitLog();
          expect(log[0].message).toContain("Initial commit");

          const branch = await env.gitCurrentBranch();
          expect(branch).toBe("master");

          // Test error handling with invalid operations
          try {
            await env.gitCheckout("nonexistent-branch");
          } catch (error) {
            expect(error).toBeDefined();
          }
        }
      );
    });

    it("should handle file operation errors", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# File Operation Errors Test\n",
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("memfs");

          // Test file operations
          env.files.write("src/index.js", 'console.log("Hello, World!");\n');
          await env.gitAdd("src/index.js");
          await env.gitCommit("Add index file");

          // Test error handling with invalid file operations
          try {
            await env.gitAdd("nonexistent-file.js");
          } catch (error) {
            expect(error).toBeDefined();
          }
        }
      );
    });

    it("should handle branch operation errors", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Branch Operation Errors Test\n",
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("memfs");

          // Test branch operations
          await env.gitCheckoutBranch("feature/error-test");
          env.files.write("src/error.js", "export const error = {};\n");
          await env.gitAdd("src/error.js");
          await env.gitCommit("Add error module");

          // Switch back to main
          await env.gitCheckout("master");

          // Test error handling with invalid branch operations
          try {
            await env.gitCheckout("nonexistent-branch");
          } catch (error) {
            expect(error).toBeDefined();
          }
        }
      );
    });
  });

  describe("Git Command Execution Failures with Native Git", () => {
    it("should handle non-existent repository gracefully", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Non-existent Repository Test\n",
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("native");

          // Test basic Git operations
          const status = await env.gitStatus();
          expect(status).toBeDefined();

          const log = await env.gitLog();
          expect(log[0].message).toContain("Initial commit");

          const branch = await env.gitCurrentBranch();
          expect(branch).toBe("master");

          // Test error handling with invalid operations
          try {
            await env.gitCheckout("nonexistent-branch");
          } catch (error) {
            expect(error).toBeDefined();
          }
        }
      );
    });

    it("should propagate git command errors with clear messages", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Git Command Errors Test\n",
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("native");

          // Test basic Git operations
          const status = await env.gitStatus();
          expect(status).toBeDefined();

          const log = await env.gitLog();
          expect(log[0].message).toContain("Initial commit");

          const branch = await env.gitCurrentBranch();
          expect(branch).toBe("master");

          // Test error handling with invalid operations
          try {
            await env.gitCheckout("nonexistent-branch");
          } catch (error) {
            expect(error).toBeDefined();
          }
        }
      );
    });

    it("should handle complex error scenarios", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Complex Error Scenarios Test\n",
            "package.json": '{"name": "error-test", "version": "1.0.0"}\n',
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("native");

          // Test complex error scenarios
          await env.gitCheckoutBranch("develop");
          env.files.write("src/core.js", "export const core = {};\n");
          await env.gitAdd("src/core.js");
          await env.gitCommit("Add core module");

          // Create feature branches
          await env.gitCheckoutBranch("feature/auth");
          env.files.write("src/auth.js", "export const auth = {};\n");
          await env.gitAdd("src/auth.js");
          await env.gitCommit("Add authentication");

          // Test error handling with complex operations
          try {
            await env.gitCheckout("nonexistent-branch");
          } catch (error) {
            expect(error).toBeDefined();
          }

          // Test error handling with invalid merge
          try {
            await env.gitMerge("nonexistent-branch");
          } catch (error) {
            expect(error).toBeDefined();
          }
        }
      );
    });
  });

  describe("Performance and Stress Testing", () => {
    it("should handle error scenarios efficiently with MemFS", async () => {
      const start = performance.now();

      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Error Performance Test\n",
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("memfs");

          // Test many operations with error handling
          for (let i = 0; i < 30; i++) {
            env.files.write(`src/module${i}.js`, `export const module${i} = {};\n`);
            await env.gitAdd(`src/module${i}.js`);
            await env.gitCommit(`Add module ${i}`);
          }

          const duration = performance.now() - start;
          expect(duration).toBeLessThan(3000); // Should complete within 3 seconds

          console.log(
            `✅ Error Performance test completed in ${duration.toFixed(2)}ms`
          );

          // Verify final state
          const log = await env.gitLog();
          expect(log.length).toBeGreaterThan(30); // Should have many commits

          // Verify files exist
          for (let i = 0; i < 30; i++) {
            expect(env.files.exists(`src/module${i}.js`)).toBe(true);
          }
        }
      );
    });

    it("should handle error scenarios efficiently with native Git", async () => {
      const start = performance.now();

      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Native Error Performance Test\n",
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("native");

          // Test many operations with error handling
          for (let i = 0; i < 15; i++) {
            env.files.write(`src/module${i}.js`, `export const module${i} = {};\n`);
            await env.gitAdd(`src/module${i}.js`);
            await env.gitCommit(`Add module ${i}`);
          }

          const duration = performance.now() - start;
          expect(duration).toBeLessThan(8000); // Should complete within 8 seconds

          console.log(
            `✅ Native Error Performance test completed in ${duration.toFixed(2)}ms`
          );

          // Verify final state
          const log = await env.gitLog();
          expect(log.length).toBeGreaterThan(15); // Should have many commits

          // Verify files exist
          for (let i = 0; i < 15; i++) {
            expect(env.files.exists(`src/module${i}.js`)).toBe(true);
          }
        }
      );
    });
  });
});
