/**
 * GitVan v2 End-to-End Tests - Refactored with Hybrid Test Environment
 * Tests complete tracer workflow integration using hybrid test environment
 */

import { describe, it, expect } from "vitest";
import { withNativeGitTestEnvironment } from "../../src/composables/test-environment.mjs";

describe("End-to-End Tracer Integration - Hybrid Test Environment", () => {
  it("should complete full job discovery and execution workflow", async () => {
    await withNativeGitTestEnvironment(
      {
        initialFiles: {
          "README.md": "# Test Project\n",
          ".gitvan/config.json": JSON.stringify(
            {
              version: "2.0",
              tracer: {
                enabled: true,
                receipts: {
                  enabled: true,
                  path: ".gitvan/receipts",
                },
              },
            },
            null,
            2
          ),
          "jobs/hello.mjs": `
export const job = {
  name: 'hello',
  description: 'Simple hello world job',
  triggers: ['manual'],
  execute: async (context) => {
    console.log('Hello, GitVan!');
    return { success: true, message: 'Hello executed successfully' };
  }
};
`,
        },
      },
      async (env) => {
        // Verify backend type
        expect(env.getBackendType()).toBe("native");

        // Test Git operations
        const status = await env.gitStatus();
        expect(status).toBeDefined();

        const log = await env.gitLog();
        expect(log[0].message).toContain("Initial commit");

        // Test file operations
        env.files.write("src/index.js", 'console.log("Hello, World!");\n');
        await env.gitAdd("src/index.js");
        await env.gitCommit("Add main application file");

        // Verify commit
        const newLog = await env.gitLog();
        expect(newLog[0].message).toContain("Add main application file");
        expect(newLog[1].message).toContain("Initial commit");

        // Test branch operations
        await env.gitCheckoutBranch("feature/tracer");
        env.files.write("src/tracer.js", "export const tracer = {};\n");
        await env.gitAdd("src/tracer.js");
        await env.gitCommit("Add tracer module");

        // Switch back to main
        await env.gitCheckout("master");

        // Merge feature branch
        await env.gitMerge("feature/tracer");

        // Verify merge
        const finalLog = await env.gitLog();
        expect(finalLog[0].message).toContain("Add tracer module");
        expect(finalLog[1].message).toContain("Add main application file");
        expect(finalLog[2].message).toContain("Initial commit");

        // Verify files exist
        expect(env.files.exists("src/index.js")).toBe(true);
        expect(env.files.exists("src/tracer.js")).toBe(true);
        expect(env.files.exists("jobs/hello.mjs")).toBe(true);
        expect(env.files.exists(".gitvan/config.json")).toBe(true);
      }
    );
  });

  it("should handle complex project structure", async () => {
    await withNativeGitTestEnvironment(
      {
        initialFiles: {
          "README.md": "# Complex Project\n",
          "package.json": JSON.stringify(
            {
              name: "complex-project",
              version: "1.0.0",
              scripts: {
                test: "vitest",
                build: "rollup -c",
              },
            },
            null,
            2
          ),
          "src/components/Button.js": "export const Button = () => {};\n",
          "src/utils/helpers.js": "export const helpers = {};\n",
          "tests/components/Button.test.js": 'describe("Button", () => {});\n',
        },
      },
      async (env) => {
        // Verify backend type
        expect(env.getBackendType()).toBe("native");

        // Test complex file structure
        expect(env.files.exists("src/components/Button.js")).toBe(true);
        expect(env.files.exists("src/utils/helpers.js")).toBe(true);
        expect(env.files.exists("tests/components/Button.test.js")).toBe(true);

        // Add more files
        env.files.write(
          "src/components/Modal.js",
          "export const Modal = () => {};\n"
        );
        env.files.write(
          "src/hooks/useAuth.js",
          "export const useAuth = () => {};\n"
        );

        await env.gitAdd(".");
        await env.gitCommit("Add more components and hooks");

        // Create feature branch
        await env.gitCheckoutBranch("feature/forms");
        env.files.write(
          "src/components/Form.js",
          "export const Form = () => {};\n"
        );
        env.files.write(
          "src/components/Input.js",
          "export const Input = () => {};\n"
        );
        await env.gitAdd("src/components/Form.js");
        await env.gitAdd("src/components/Input.js");
        await env.gitCommit("Add form components");

        // Switch back to main
        await env.gitCheckout("master");

        // Merge feature branch
        await env.gitMerge("feature/forms");

        // Verify final state
        const log = await env.gitLog();
        expect(log[0].message).toContain("Add form components");
        expect(log[1].message).toContain("Add more components and hooks");
        expect(log[2].message).toContain("Initial commit");

        // Verify all files exist
        expect(env.files.exists("src/components/Button.js")).toBe(true);
        expect(env.files.exists("src/components/Modal.js")).toBe(true);
        expect(env.files.exists("src/components/Form.js")).toBe(true);
        expect(env.files.exists("src/components/Input.js")).toBe(true);
        expect(env.files.exists("src/utils/helpers.js")).toBe(true);
        expect(env.files.exists("src/hooks/useAuth.js")).toBe(true);
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
        for (let i = 0; i < 30; i++) {
          env.files.write(
            `src/module${i}.js`,
            `export const module${i} = {};\n`
          );
          await env.gitAdd(`src/module${i}.js`);
          await env.gitCommit(`Add module ${i}`);
        }

        // Create multiple branches with different features
        for (let i = 0; i < 8; i++) {
          await env.gitCheckoutBranch(`feature/feature-${i}`);
          env.files.write(
            `src/feature${i}.js`,
            `export const feature${i} = {};\n`
          );
          await env.gitAdd(`src/feature${i}.js`);
          await env.gitCommit(`Add feature ${i}`);
          await env.gitCheckout("master");
        }

        const duration = performance.now() - start;
        expect(duration).toBeLessThan(15000); // Should complete within 15 seconds

        console.log(
          `✅ Performance test completed in ${duration.toFixed(2)}ms`
        );

        // Verify final state
        const log = await env.gitLog();
        expect(log.length).toBeGreaterThan(30); // Should have many commits

        // Verify files exist
        for (let i = 0; i < 30; i++) {
          expect(env.files.exists(`src/module${i}.js`)).toBe(true);
        }
        for (let i = 0; i < 8; i++) {
          expect(env.files.exists(`src/feature${i}.js`)).toBe(true);
        }
      }
    );
  });

  it("should handle Git workflow with multiple contributors", async () => {
    await withNativeGitTestEnvironment(
      {
        initialFiles: {
          "README.md": "# Multi-Contributor Project\n",
          "CONTRIBUTORS.md": "# Contributors\n\n- Alice\n- Bob\n",
        },
      },
      async (env) => {
        // Verify backend type
        expect(env.getBackendType()).toBe("native");

        // Alice's contributions
        await env.gitCheckoutBranch("feature/alice-auth");
        env.files.write("src/auth.js", "export const auth = {};\n");
        env.files.write("src/login.js", "export const login = {};\n");
        await env.gitAdd("src/auth.js");
        await env.gitAdd("src/login.js");
        await env.gitCommit("Add authentication system");

        // Bob's contributions
        await env.gitCheckoutBranch("feature/bob-database");
        env.files.write("src/database.js", "export const db = {};\n");
        env.files.write("src/models.js", "export const models = {};\n");
        await env.gitAdd("src/database.js");
        await env.gitAdd("src/models.js");
        await env.gitCommit("Add database layer");

        // Switch back to main
        await env.gitCheckout("master");

        // Merge Alice's work
        await env.gitMerge("feature/alice-auth");

        // Merge Bob's work
        await env.gitMerge("feature/bob-database");

        // Verify final state
        const log = await env.gitLog();
        expect(log[0].message).toContain("Add database layer");
        expect(log[1].message).toContain("Add authentication system");
        expect(log[2].message).toContain("Initial commit");

        // Verify all files exist
        expect(env.files.exists("src/auth.js")).toBe(true);
        expect(env.files.exists("src/login.js")).toBe(true);
        expect(env.files.exists("src/database.js")).toBe(true);
        expect(env.files.exists("src/models.js")).toBe(true);
        expect(env.files.exists("CONTRIBUTORS.md")).toBe(true);
      }
    );
  });
});
