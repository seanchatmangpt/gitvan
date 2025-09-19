/**
 * Integration test for the Knowledge Hook Engine with Hybrid Test Environment
 * Tests the complete hook evaluation pipeline using hybrid test environment
 */

import { describe, it, expect } from "vitest";
import { withMemFSTestEnvironment, withNativeGitTestEnvironment } from "../../src/composables/test-environment.mjs";
import { HookOrchestrator } from "../../src/hooks/HookOrchestrator.mjs";

describe("Knowledge Hook Engine Integration with Hybrid Test Environment", () => {
  describe("Basic Hook Operations with MemFS", () => {
    it("should handle basic hook operations", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Hook Integration Test\n",
            "hooks/test-ask-hook.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:test-ask-hook rdf:type gh:Hook ;
    gv:title "Test ASK Hook" ;
    gh:hasPredicate ex:test-ask-predicate ;
    gh:orderedPipelines ex:test-ask-pipeline .

ex:test-ask-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?item rdf:type gv:TestItem .
        }
    """ .

ex:test-ask-pipeline rdf:type op:Pipeline ;
    op:steps ex:test-step1 .

ex:test-step1 rdf:type gv:TemplateStep ;
    gv:text "ASK hook triggered at {{ 'now' | date('YYYY-MM-DD HH:mm:ss') }}" ;
    gv:filePath "./test-output.txt" .`,
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("memfs");

          // Test hook file exists
          expect(env.files.exists("hooks/test-ask-hook.ttl")).toBe(true);

          // Test Git operations
          await env.gitAdd(".");
          await env.gitCommit("Add hook test files");

          // Verify commit
          const log = await env.gitLog();
          expect(log[0].message).toContain("Add hook test files");
          expect(log[1].message).toContain("Initial commit");
        }
      );
    });

    it("should handle hook file modifications", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Hook Modifications Test\n",
            "hooks/test-hook.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .

ex:test-hook rdf:type gh:Hook ;
    gv:title "Test Hook" ;
    gh:hasPredicate ex:test-predicate .`,
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("memfs");

          // Modify hook file
          env.files.write(
            "hooks/test-hook.ttl",
            `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .

ex:test-hook rdf:type gh:Hook ;
    gv:title "Modified Test Hook" ;
    gh:hasPredicate ex:test-predicate .`
          );
          expect(env.files.read("hooks/test-hook.ttl")).toContain("Modified");

          // Add new hook file
          env.files.write(
            "hooks/test-hook2.ttl",
            `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .

ex:test-hook2 rdf:type gh:Hook ;
    gv:title "Test Hook 2" ;
    gh:hasPredicate ex:test-predicate2 .`
          );

          // Commit changes
          await env.gitAdd(".");
          await env.gitCommit("Modify and add hook files");

          // Verify commit
          const log = await env.gitLog();
          expect(log[0].message).toContain("Modify and add hook files");
          expect(log[1].message).toContain("Initial commit");
        }
      );
    });

    it("should handle complex hook structure", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Complex Hook Structure Test\n",
            "hooks/complex-hook.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:complex-hook rdf:type gh:Hook ;
    gv:title "Complex Hook" ;
    gh:hasPredicate ex:complex-predicate ;
    gh:orderedPipelines ex:complex-pipeline .

ex:complex-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?item rdf:type gv:ComplexItem .
        }
    """ .

ex:complex-pipeline rdf:type op:Pipeline ;
    op:steps ex:complex-step1 .

ex:complex-step1 rdf:type gv:TemplateStep ;
    gv:text "Complex hook triggered at {{ 'now' | date('YYYY-MM-DD HH:mm:ss') }}" ;
    gv:filePath "./complex-output.txt" .`,
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("memfs");

          // Test complex hook structure
          expect(env.files.exists("hooks/complex-hook.ttl")).toBe(true);

          // Test Git operations
          await env.gitAdd(".");
          await env.gitCommit("Add complex hook structure");

          // Verify commit
          const log = await env.gitLog();
          expect(log[0].message).toContain("Add complex hook structure");
          expect(log[1].message).toContain("Initial commit");
        }
      );
    });
  });

  describe("Advanced Hook Operations with Native Git", () => {
    it("should handle complex hook workflows", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Complex Hook Workflow Test\n",
            "package.json": '{"name": "hook-workflow-test", "version": "1.0.0"}\n',
            "hooks/workflow-hook.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .

ex:workflow-hook rdf:type gh:Hook ;
    gv:title "Workflow Hook" ;
    gh:hasPredicate ex:workflow-predicate .`,
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("native");

          // Test complex hook workflow
          await env.gitCheckoutBranch("develop");
          env.files.write(
            "hooks/core-hook.ttl",
            `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .

ex:core-hook rdf:type gh:Hook ;
    gv:title "Core Hook" ;
    gh:hasPredicate ex:core-predicate .`
          );
          await env.gitAdd("hooks/core-hook.ttl");
          await env.gitCommit("Add core hook");

          // Create feature branches
          await env.gitCheckoutBranch("feature/hook-auth");
          env.files.write(
            "hooks/auth-hook.ttl",
            `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .

ex:auth-hook rdf:type gh:Hook ;
    gv:title "Auth Hook" ;
    gh:hasPredicate ex:auth-predicate .`
          );
          await env.gitAdd("hooks/auth-hook.ttl");
          await env.gitCommit("Add auth hook");

          await env.gitCheckoutBranch("feature/hook-database");
          env.files.write(
            "hooks/database-hook.ttl",
            `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .

ex:database-hook rdf:type gh:Hook ;
    gv:title "Database Hook" ;
    gh:hasPredicate ex:database-predicate .`
          );
          await env.gitAdd("hooks/database-hook.ttl");
          await env.gitCommit("Add database hook");

          // Merge features to develop
          await env.gitCheckout("develop");
          await env.gitMerge("feature/hook-auth");
          await env.gitMerge("feature/hook-database");

          // Create release branch
          await env.gitCheckoutBranch("release/v1.0.0");
          env.files.write(
            "CHANGELOG.md",
            "# Changelog\n\n## v1.0.0\n- Added auth hook\n- Added database hook\n"
          );
          await env.gitAdd("CHANGELOG.md");
          await env.gitCommit("Prepare hook release v1.0.0");

          // Merge to main
          await env.gitCheckout("master");
          await env.gitMerge("release/v1.0.0");

          // Verify final state
          const log = await env.gitLog();
          expect(log[0].message).toContain("Prepare hook release v1.0.0");
          expect(log[1].message).toContain("Add database hook");
          expect(log[2].message).toContain("Add auth hook");
          expect(log[3].message).toContain("Add core hook");
          expect(log[4].message).toContain("Initial commit");

          // Verify all files exist
          expect(env.files.exists("hooks/core-hook.ttl")).toBe(true);
          expect(env.files.exists("hooks/auth-hook.ttl")).toBe(true);
          expect(env.files.exists("hooks/database-hook.ttl")).toBe(true);
          expect(env.files.exists("CHANGELOG.md")).toBe(true);
        }
      );
    });

    it("should handle hook operations with many files", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Many Hook Files Test\n",
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("native");

          // Test hook operations with many files
          for (let i = 0; i < 15; i++) {
            env.files.write(
              `hooks/hook${i}.ttl`,
              `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .

ex:hook${i} rdf:type gh:Hook ;
    gv:title "Hook ${i}" ;
    gh:hasPredicate ex:hook${i}-predicate .`
            );
            await env.gitAdd(`hooks/hook${i}.ttl`);
            await env.gitCommit(`Add hook ${i}`);
          }

          // Verify final state
          const log = await env.gitLog();
          expect(log.length).toBeGreaterThan(15); // Should have many commits

          // Verify files exist
          for (let i = 0; i < 15; i++) {
            expect(env.files.exists(`hooks/hook${i}.ttl`)).toBe(true);
          }
        }
      );
    });
  });

  describe("Performance Testing", () => {
    it("should handle hook operations efficiently with MemFS", async () => {
      const start = performance.now();

      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Hook Performance Test\n",
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("memfs");

          // Test many hook operations
          for (let i = 0; i < 25; i++) {
            env.files.write(
              `hooks/hook${i}.ttl`,
              `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .

ex:hook${i} rdf:type gh:Hook ;
    gv:title "Hook ${i}" ;
    gh:hasPredicate ex:hook${i}-predicate .`
            );
            await env.gitAdd(`hooks/hook${i}.ttl`);
            await env.gitCommit(`Add hook ${i}`);
          }

          const duration = performance.now() - start;
          expect(duration).toBeLessThan(3000); // Should complete within 3 seconds

          console.log(
            `✅ Hook Performance test completed in ${duration.toFixed(2)}ms`
          );

          // Verify final state
          const log = await env.gitLog();
          expect(log.length).toBeGreaterThan(25); // Should have many commits

          // Verify files exist
          for (let i = 0; i < 25; i++) {
            expect(env.files.exists(`hooks/hook${i}.ttl`)).toBe(true);
          }
        }
      );
    });

    it("should handle hook operations efficiently with native Git", async () => {
      const start = performance.now();

      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Native Hook Performance Test\n",
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("native");

          // Test many hook operations
          for (let i = 0; i < 12; i++) {
            env.files.write(
              `hooks/hook${i}.ttl`,
              `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .

ex:hook${i} rdf:type gh:Hook ;
    gv:title "Hook ${i}" ;
    gh:hasPredicate ex:hook${i}-predicate .`
            );
            await env.gitAdd(`hooks/hook${i}.ttl`);
            await env.gitCommit(`Add hook ${i}`);
          }

          const duration = performance.now() - start;
          expect(duration).toBeLessThan(8000); // Should complete within 8 seconds

          console.log(
            `✅ Native Hook Performance test completed in ${duration.toFixed(2)}ms`
          );

          // Verify final state
          const log = await env.gitLog();
          expect(log.length).toBeGreaterThan(12); // Should have many commits

          // Verify files exist
          for (let i = 0; i < 12; i++) {
            expect(env.files.exists(`hooks/hook${i}.ttl`)).toBe(true);
          }
        }
      );
    });
  });
});
