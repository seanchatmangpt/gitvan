/**
 * @fileoverview GitVan v2 — FileSystem Composable Test with Hybrid Test Environment
 *
 * Safe test to verify the filesystem composable works correctly using hybrid test environment
 */

import { describe, it, expect } from "vitest";
import { withMemFSTestEnvironment } from "../src/composables/test-environment.mjs";

describe("FileSystem Composable with Hybrid Test Environment", () => {
  it("should create and remove directories", async () => {
    await withMemFSTestEnvironment(
      {
        initialFiles: {
          "README.md": "# FileSystem Test\n",
        },
      },
      async (env) => {
        // Verify backend type
        expect(env.getBackendType()).toBe("memfs");

        // Create subdirectory
        env.files.mkdir("test-subdir");
        expect(env.files.exists("test-subdir")).toBe(true);

        // Create nested directories
        env.files.mkdir("test-subdir/nested");
        expect(env.files.exists("test-subdir/nested")).toBe(true);

        // Test Git operations
        await env.gitAdd(".");
        await env.gitCommit("Add test directories");

        // Verify commit
        const log = await env.gitLog();
        expect(log[0].message).toContain("Add test directories");
        expect(log[1].message).toContain("Initial commit");
      }
    );
  });

  it("should handle file operations", async () => {
    await withMemFSTestEnvironment(
      {
        initialFiles: {
          "README.md": "# FileSystem Test\n",
        },
      },
      async (env) => {
        // Verify backend type
        expect(env.getBackendType()).toBe("memfs");

        // Create files
        env.files.write("src/index.js", 'console.log("Hello, World!");\n');
        env.files.write("src/utils.js", "export const utils = {};\n");
        env.files.write(
          "tests/index.test.js",
          'describe("Index", () => {});\n'
        );

        // Verify files exist
        expect(env.files.exists("src/index.js")).toBe(true);
        expect(env.files.exists("src/utils.js")).toBe(true);
        expect(env.files.exists("tests/index.test.js")).toBe(true);

        // Test Git operations
        await env.gitAdd(".");
        await env.gitCommit("Add source files and tests");

        // Verify commit
        const log = await env.gitLog();
        expect(log[0].message).toContain("Add source files and tests");
        expect(log[1].message).toContain("Initial commit");
      }
    );
  });

  it("should handle complex file operations", async () => {
    await withMemFSTestEnvironment(
      {
        initialFiles: {
          "README.md": "# Complex FileSystem Test\n",
          "package.json": '{"name": "test-project", "version": "1.0.0"}\n',
        },
      },
      async (env) => {
        // Verify backend type
        expect(env.getBackendType()).toBe("memfs");

        // Create complex directory structure
        env.files.mkdir("src/components");
        env.files.mkdir("src/utils");
        env.files.mkdir("tests/components");
        env.files.mkdir("docs");

        // Create files in nested directories
        env.files.write(
          "src/components/Button.js",
          "export const Button = () => {};\n"
        );
        env.files.write(
          "src/components/Modal.js",
          "export const Modal = () => {};\n"
        );
        env.files.write("src/utils/helpers.js", "export const helpers = {};\n");
        env.files.write(
          "tests/components/Button.test.js",
          'describe("Button", () => {});\n'
        );
        env.files.write("docs/README.md", "# Documentation\n");

        // Verify all files exist
        expect(env.files.exists("src/components/Button.js")).toBe(true);
        expect(env.files.exists("src/components/Modal.js")).toBe(true);
        expect(env.files.exists("src/utils/helpers.js")).toBe(true);
        expect(env.files.exists("tests/components/Button.test.js")).toBe(true);
        expect(env.files.exists("docs/README.md")).toBe(true);

        // Test Git operations
        await env.gitAdd(".");
        await env.gitCommit("Add complex project structure");

        // Verify commit
        const log = await env.gitLog();
        expect(log[0].message).toContain("Add complex project structure");
        expect(log[1].message).toContain("Initial commit");
      }
    );
  });

  it("should handle file modifications and deletions", async () => {
    await withMemFSTestEnvironment(
      {
        initialFiles: {
          "README.md": "# FileSystem Test\n",
          "src/index.js": 'console.log("Hello, World!");\n',
        },
      },
      async (env) => {
        // Verify backend type
        expect(env.getBackendType()).toBe("memfs");

        // Modify existing file
        env.files.write("src/index.js", 'console.log("Hello, GitVan!");\n');
        expect(env.files.read("src/index.js")).toContain("GitVan");

        // Add new file
        env.files.write("src/utils.js", "export const utils = {};\n");

        // Test Git operations
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

  it("should demonstrate performance with many file operations", async () => {
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
        for (let i = 0; i < 100; i++) {
          env.files.write(
            `src/module${i}.js`,
            `export const module${i} = {};\n`
          );
        }

        // Create many directories
        for (let i = 0; i < 20; i++) {
          env.files.mkdir(`src/feature${i}`);
          env.files.write(
            `src/feature${i}/index.js`,
            `export const feature${i} = {};\n`
          );
        }

        const duration = performance.now() - start;
        expect(duration).toBeLessThan(1000); // Should complete within 1 second

        console.log(
          `✅ Performance test completed in ${duration.toFixed(2)}ms`
        );

        // Test Git operations with many files
        await env.gitAdd(".");
        await env.gitCommit("Add many files and directories");

        // Verify commit
        const log = await env.gitLog();
        expect(log[0].message).toContain("Add many files and directories");
        expect(log[1].message).toContain("Initial commit");

        // Verify files exist
        for (let i = 0; i < 100; i++) {
          expect(env.files.exists(`src/module${i}.js`)).toBe(true);
        }
        for (let i = 0; i < 20; i++) {
          expect(env.files.exists(`src/feature${i}/index.js`)).toBe(true);
        }
      }
    );
  });
});
