/**
 * MemFS Test Utilities Demo
 * Demonstrates the memfs-test-utils.mjs working correctly
 */

import { describe, it, expect } from "vitest";
import { withMemFSTestEnvironment } from "../src/composables/test-environment.mjs";

describe("MemFS Test Utilities Demo", () => {
  describe("Basic File Operations", () => {
    it("should create and read files with hybrid backend", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Test Project\n",
            "package.json": JSON.stringify(
              {
                name: "test-project",
                version: "1.0.0",
              },
              null,
              2
            ),
            "src/index.js": "console.log('Hello, World!');",
          },
        },
        async (env) => {
          // Create file using hybrid backend
          env.files.write("test.txt", "Hello, MemFS!");

          expect(env.files.exists("test.txt")).toBe(true);
          expect(env.files.read("test.txt")).toBe("Hello, MemFS!");

          // Verify initial files
          expect(env.files.read("README.md")).toBe("# Test Project\n");
          const packageJson = JSON.parse(env.files.read("package.json"));
          expect(packageJson.name).toBe("test-project");
        }
      );
    });

    it("should create directories with hybrid backend", async () => {
      await withMemFSTestEnvironment({}, async (env) => {
        env.files.mkdir("new-dir");
        expect(env.files.exists("new-dir")).toBe(true);
      });
    });
  });

  describe("Git Integration", () => {
    it("should handle Git operations with MemFS backend", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Test Project\n",
          },
        },
        async (env) => {
          // Verify Git is initialized
          const branch = await env.gitCurrentBranch();
          expect(branch).toBe("master"); // isomorphic-git default

          // Create new file
          env.files.write("new-feature.js", "export const feature = () => {};");

          // Add and commit using hybrid Git
          await env.gitAdd("new-feature.js");
          await env.gitCommit("Add new feature");

          // Verify commit
          const log = await env.gitLog();
          expect(log[0].message).toBe("Add new feature");
          expect(log[1].message).toBe("Initial commit");
        }
      );
    });
  });

  describe("Safety and Isolation", () => {
    it("should not affect real file system", async () => {
      await withMemFSTestEnvironment({}, async (env) => {
        // Create files in MemFS
        env.files.write("memfs-file.txt", "This is in memory");

        // Verify it exists in MemFS
        expect(env.files.exists("memfs-file.txt")).toBe(true);

        // Verify backend type
        expect(env.getBackendType()).toBe("memfs");
      });
    });

    it("should handle complex directory structures", async () => {
      await withMemFSTestEnvironment({}, async (env) => {
        env.files.mkdir("src/components");
        env.files.mkdir("src/utils");
        env.files.mkdir("tests");

        env.files.write(
          "src/components/Button.js",
          "export default function Button() {}"
        );
        env.files.write(
          "src/utils/helpers.js",
          "export const helper = () => {}"
        );
        env.files.write(
          "tests/Button.test.js",
          "describe('Button', () => {});"
        );

        expect(env.files.exists("src/components/Button.js")).toBe(true);
        expect(env.files.exists("src/utils/helpers.js")).toBe(true);
        expect(env.files.exists("tests/Button.test.js")).toBe(true);
      });
    });
  });

  describe("Performance", () => {
    it("should handle many files efficiently with MemFS", async () => {
      const start = performance.now();

      await withMemFSTestEnvironment({}, async (env) => {
        // Create 1000 files
        for (let i = 0; i < 1000; i++) {
          env.files.write(`file${i}.txt`, `Content ${i}`);
        }

        const duration = performance.now() - start;
        expect(duration).toBeLessThan(100); // Should be very fast

        // Verify all files exist
        for (let i = 0; i < 1000; i++) {
          expect(env.files.exists(`file${i}.txt`)).toBe(true);
        }

        // Test Git operations with many files
        await env.gitAdd(".");
        await env.gitCommit("Add many files");

        const log = await env.gitLog();
        expect(log[0].message).toBe("Add many files");
      });
    });
  });
});
