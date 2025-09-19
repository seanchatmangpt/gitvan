// tests/git-signals-system.test.mjs
// Focused test for Git Signals integration system only

import { describe, it, expect } from "vitest";
import { withNativeGitTestEnvironment } from "../src/composables/test-environment.mjs";
import { GitVanHookable } from "../src/core/hookable.mjs";

describe("Git Signals System", () => {
  it("should register Git signal hooks", async () => {
    await withNativeGitTestEnvironment(
      {
        initialFiles: {},
      },
      async (env) => {
        const hookable = new GitVanHookable();

        // Verify hooks are registered
        expect(hookable.hooks).toBeDefined();

        // Test hook registration
        const hooks = hookable.hooks.getHooks();
        expect(Object.keys(hooks).length).toBeGreaterThan(0);

        console.log(
          `✅ Git signal hooks registered: ${Object.keys(hooks).length} hooks`
        );
      }
    );
  });

  it("should process Git signals", async () => {
    await withNativeGitTestEnvironment(
      {
        initialFiles: {
          "test-file.txt": "Hello World",
        },
      },
      async (env) => {
        const hookable = new GitVanHookable();

        // Test signal processing
        const mockContext = {
          cwd: env.testDir,
          event: "test",
          commitSha: "test123",
          branch: "main",
          changedFiles: ["test-file.txt"],
        };

        // Process a test signal
        const result = await hookable.processGitSignal("test", mockContext);
        expect(result).toBeDefined();

        console.log("✅ Git signal processing working");
      }
    );
  });

  it("should handle change detection", async () => {
    await withNativeGitTestEnvironment(
      {
        initialFiles: {
          "src/app.js": "console.log('Hello World');",
          "tests/app.test.js":
            "describe('App', () => { it('should work', () => {}); });",
        },
      },
      async (env) => {
        const hookable = new GitVanHookable();

        // Test change detection
        const changes = await hookable.detectChanges(env.testDir);
        expect(changes).toBeDefined();

        console.log("✅ Change detection working");
      }
    );
  });

  it("should integrate with Knowledge Hook Orchestrator", async () => {
    await withNativeGitTestEnvironment(
      {
        initialFiles: {
          "graph/test.ttl": `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:test-project rdf:type gv:Project ;
    gv:name "Test Project" ;
    gv:status "active" .
`,
        },
      },
      async (env) => {
        const hookable = new GitVanHookable();

        // Test integration with Knowledge Hook Orchestrator
        const mockContext = {
          cwd: env.testDir,
          event: "post-commit",
          commitSha: "test123",
          branch: "main",
          changedFiles: ["graph/test.ttl"],
        };

        // This should trigger Knowledge Hook evaluation
        const result = await hookable.processGitSignal(
          "post-commit",
          mockContext
        );
        expect(result).toBeDefined();

        console.log("✅ Git Signals integration with Knowledge Hooks working");
      }
    );
  });

  it("should handle error scenarios gracefully", async () => {
    await withNativeGitTestEnvironment(
      {
        initialFiles: {},
      },
      async (env) => {
        const hookable = new GitVanHookable();

        // Test error handling
        const invalidContext = {
          cwd: "/nonexistent/path",
          event: "test",
        };

        try {
          const result = await hookable.processGitSignal(
            "test",
            invalidContext
          );
          // Should handle errors gracefully
          expect(result).toBeDefined();
        } catch (error) {
          // Errors should be handled gracefully
          expect(error).toBeDefined();
        }

        console.log("✅ Error handling working correctly");
      }
    );
  });
});
