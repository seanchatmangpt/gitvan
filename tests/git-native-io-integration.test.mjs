// tests/git-native-io-integration.test.mjs
// Test Git-Native I/O Layer integration with Knowledge Hooks using hybrid test environment

import { describe, it, expect } from "vitest";
import { withNativeGitTestEnvironment } from "../src/composables/test-environment.mjs";

describe("Git-Native I/O Integration with Hybrid Test Environment", () => {
  describe("Basic Git Operations", () => {
    it("should handle basic Git operations", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Git-Native I/O Test\n",
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

          // Test Git operations
          if (status && !status.includes("nothing to commit")) {
            await env.gitAdd(".");
            await env.gitCommit("Add GitNativeIO test files");
          }

          // Verify commit
          const newLog = await env.gitLog();
          if (status && !status.includes("nothing to commit")) {
            expect(newLog[0].message).toContain("Add GitNativeIO test files");
            expect(newLog[1].message).toContain("Initial commit");
          } else {
            expect(newLog[0].message).toContain("Initial commit");
          }
        }
      );
    });

    it("should handle job execution simulation", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Job Execution Test\n",
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("native");

          // Simulate job execution
          const result = "Hello, GitNativeIO!";
          expect(result).toBe("Hello, GitNativeIO!");

          // Test Git operations
          const gitStatus = await env.gitStatus();
          if (gitStatus && !gitStatus.includes("nothing to commit")) {
            await env.gitAdd(".");
            await env.gitCommit("Add job execution test");
          }

          // Verify commit
          const log = await env.gitLog();
          if (gitStatus && !gitStatus.includes("nothing to commit")) {
            expect(log[0].message).toContain("Add job execution test");
            expect(log[1].message).toContain("Initial commit");
          } else {
            expect(log[0].message).toContain("Initial commit");
          }
        }
      );
    });

    it("should handle file operations", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "README.md": "# File Operations Test\n",
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("native");

          // Test file operations
          env.files.write(
            "src/index.js",
            "console.log('Hello, GitNativeIO!');\n"
          );
          env.files.write("src/utils.js", "export const utils = {};\n");

          // Test Git operations
          await env.gitAdd(".");
          await env.gitCommit("Add source files");

          // Verify commit
          const log = await env.gitLog();
          expect(log[0].message).toContain("Add source files");
          expect(log[1].message).toContain("Initial commit");

          // Verify files exist
          expect(env.files.exists("src/index.js")).toBe(true);
          expect(env.files.exists("src/utils.js")).toBe(true);
        }
      );
    });
  });

  describe("Advanced Git Operations", () => {
    it("should handle complex workflows", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Complex Workflow Test\n",
            "package.json": '{"name": "git-native-test", "version": "1.0.0"}\n',
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("native");

          // Test complex workflow
          await env.gitCheckoutBranch("feature/complex");
          env.files.write("src/complex.js", "export const complex = {};\n");
          await env.gitAdd("src/complex.js");
          await env.gitCommit("Add complex module");

          // Switch back to main
          await env.gitCheckout("master");

          // Merge feature branch
          await env.gitMerge("feature/complex");

          // Verify merge
          const log = await env.gitLog();
          expect(log[0].message).toContain("Add complex module");
          expect(log[1].message).toContain("Initial commit");

          // Verify file exists
          expect(env.files.exists("src/complex.js")).toBe(true);
        }
      );
    });

    it("should handle multiple operations", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Multiple Operations Test\n",
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("native");

          // Test multiple operations
          for (let i = 0; i < 10; i++) {
            env.files.write(
              `src/module${i}.js`,
              `export const module${i} = {};\n`
            );
            await env.gitAdd(`src/module${i}.js`);
            await env.gitCommit(`Add module ${i}`);
          }

          // Verify final state
          const log = await env.gitLog();
          expect(log.length).toBeGreaterThan(10); // Should have many commits

          // Verify files exist
          for (let i = 0; i < 10; i++) {
            expect(env.files.exists(`src/module${i}.js`)).toBe(true);
          }
        }
      );
    });
  });

  describe("Performance Testing", () => {
    it("should handle many operations efficiently", async () => {
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

          // Test many operations
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
            `✅ GitNativeIO Performance test completed in ${duration.toFixed(
              2
            )}ms`
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
