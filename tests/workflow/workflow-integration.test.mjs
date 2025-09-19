/**
 * Integration test for the Turtle as Workflow engine with Hybrid Test Environment
 * Tests the complete workflow execution pipeline using hybrid test environment
 */

import { describe, it, expect } from "vitest";
import { withMemFSTestEnvironment, withNativeGitTestEnvironment } from "../../src/composables/test-environment.mjs";

describe("Turtle as Workflow Engine Integration with Hybrid Test Environment", () => {
  describe("Basic Workflow Operations with MemFS", () => {
    it("should handle basic workflow operations", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Workflow Integration Test\n",
            "workflows/simple-workflow.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:simple-workflow rdf:type gh:Hook ;
    gv:title "Simple Test Workflow" ;
    gh:hasPredicate ex:simpleTest ;
    gh:orderedPipelines ex:simple-pipeline .

ex:simple-pipeline rdf:type op:Pipeline ;
    op:steps ex:step1, ex:step2 .

ex:step1 rdf:type gv:SparqlStep ;
    gv:text """
        PREFIX ex: <http://example.org/>
        SELECT ?item WHERE {
            ?item rdf:type ex:TestItem .
        }
    """ ;
    gv:outputMapping '{"items": "results"}' .

ex:step2 rdf:type gv:TemplateStep ;
    gv:text "Workflow executed at {{ 'now' | date('YYYY-MM-DD HH:mm:ss') }}" ;
    gv:filePath "./workflow-output.txt" .`,
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("memfs");

          // Test workflow file exists
          expect(env.files.exists("workflows/simple-workflow.ttl")).toBe(true);

          // Test Git operations
          await env.gitAdd(".");
          await env.gitCommit("Add workflow test files");

          // Verify commit
          const log = await env.gitLog();
          expect(log[0].message).toContain("Add workflow test files");
          expect(log[1].message).toContain("Initial commit");
        }
      );
    });

    it("should handle workflow file modifications", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Workflow Modifications Test\n",
            "workflows/test-workflow.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .

ex:test-workflow rdf:type gh:Hook ;
    gv:title "Test Workflow" ;
    gh:hasPredicate ex:testPredicate .`,
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("memfs");

          // Modify workflow file
          env.files.write(
            "workflows/test-workflow.ttl",
            `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .

ex:test-workflow rdf:type gh:Hook ;
    gv:title "Modified Test Workflow" ;
    gh:hasPredicate ex:testPredicate .`
          );
          expect(env.files.read("workflows/test-workflow.ttl")).toContain("Modified");

          // Add new workflow file
          env.files.write(
            "workflows/test-workflow2.ttl",
            `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .

ex:test-workflow2 rdf:type gh:Hook ;
    gv:title "Test Workflow 2" ;
    gh:hasPredicate ex:testPredicate2 .`
          );

          // Commit changes
          await env.gitAdd(".");
          await env.gitCommit("Modify and add workflow files");

          // Verify commit
          const log = await env.gitLog();
          expect(log[0].message).toContain("Modify and add workflow files");
          expect(log[1].message).toContain("Initial commit");
        }
      );
    });

    it("should handle complex workflow structure", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Complex Workflow Structure Test\n",
            "workflows/complex-workflow.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:complex-workflow rdf:type gh:Hook ;
    gv:title "Complex Workflow" ;
    gh:hasPredicate ex:complexPredicate ;
    gh:orderedPipelines ex:complex-pipeline .

ex:complex-pipeline rdf:type op:Pipeline ;
    op:steps ex:complex-step1, ex:complex-step2 .

ex:complex-step1 rdf:type gv:SparqlStep ;
    gv:text """
        PREFIX ex: <http://example.org/>
        SELECT ?item WHERE {
            ?item rdf:type ex:ComplexItem .
        }
    """ ;
    gv:outputMapping '{"items": "results"}' .

ex:complex-step2 rdf:type gv:TemplateStep ;
    gv:text "Complex workflow executed at {{ 'now' | date('YYYY-MM-DD HH:mm:ss') }}" ;
    gv:filePath "./complex-workflow-output.txt" .`,
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("memfs");

          // Test complex workflow structure
          expect(env.files.exists("workflows/complex-workflow.ttl")).toBe(true);

          // Test Git operations
          await env.gitAdd(".");
          await env.gitCommit("Add complex workflow structure");

          // Verify commit
          const log = await env.gitLog();
          expect(log[0].message).toContain("Add complex workflow structure");
          expect(log[1].message).toContain("Initial commit");
        }
      );
    });
  });

  describe("Advanced Workflow Operations with Native Git", () => {
    it("should handle complex workflow workflows", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Complex Workflow Workflow Test\n",
            "package.json": '{"name": "workflow-workflow-test", "version": "1.0.0"}\n',
            "workflows/workflow-workflow.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .

ex:workflow-workflow rdf:type gh:Hook ;
    gv:title "Workflow Workflow" ;
    gh:hasPredicate ex:workflowPredicate .`,
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("native");

          // Test complex workflow workflow
          await env.gitCheckoutBranch("develop");
          env.files.write(
            "workflows/core-workflow.ttl",
            `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .

ex:core-workflow rdf:type gh:Hook ;
    gv:title "Core Workflow" ;
    gh:hasPredicate ex:corePredicate .`
          );
          await env.gitAdd("workflows/core-workflow.ttl");
          await env.gitCommit("Add core workflow");

          // Create feature branches
          await env.gitCheckoutBranch("feature/workflow-auth");
          env.files.write(
            "workflows/auth-workflow.ttl",
            `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .

ex:auth-workflow rdf:type gh:Hook ;
    gv:title "Auth Workflow" ;
    gh:hasPredicate ex:authPredicate .`
          );
          await env.gitAdd("workflows/auth-workflow.ttl");
          await env.gitCommit("Add auth workflow");

          await env.gitCheckoutBranch("feature/workflow-database");
          env.files.write(
            "workflows/database-workflow.ttl",
            `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .

ex:database-workflow rdf:type gh:Hook ;
    gv:title "Database Workflow" ;
    gh:hasPredicate ex:databasePredicate .`
          );
          await env.gitAdd("workflows/database-workflow.ttl");
          await env.gitCommit("Add database workflow");

          // Merge features to develop
          await env.gitCheckout("develop");
          await env.gitMerge("feature/workflow-auth");
          await env.gitMerge("feature/workflow-database");

          // Create release branch
          await env.gitCheckoutBranch("release/v1.0.0");
          env.files.write(
            "CHANGELOG.md",
            "# Changelog\n\n## v1.0.0\n- Added auth workflow\n- Added database workflow\n"
          );
          await env.gitAdd("CHANGELOG.md");
          await env.gitCommit("Prepare workflow release v1.0.0");

          // Merge to main
          await env.gitCheckout("master");
          await env.gitMerge("release/v1.0.0");

          // Verify final state
          const log = await env.gitLog();
          expect(log[0].message).toContain("Prepare workflow release v1.0.0");
          expect(log[1].message).toContain("Add database workflow");
          expect(log[2].message).toContain("Add auth workflow");
          expect(log[3].message).toContain("Add core workflow");
          expect(log[4].message).toContain("Initial commit");

          // Verify all files exist
          expect(env.files.exists("workflows/core-workflow.ttl")).toBe(true);
          expect(env.files.exists("workflows/auth-workflow.ttl")).toBe(true);
          expect(env.files.exists("workflows/database-workflow.ttl")).toBe(true);
          expect(env.files.exists("CHANGELOG.md")).toBe(true);
        }
      );
    });

    it("should handle workflow operations with many files", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Many Workflow Files Test\n",
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("native");

          // Test workflow operations with many files
          for (let i = 0; i < 15; i++) {
            env.files.write(
              `workflows/workflow${i}.ttl`,
              `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .

ex:workflow${i} rdf:type gh:Hook ;
    gv:title "Workflow ${i}" ;
    gh:hasPredicate ex:workflow${i}Predicate .`
            );
            await env.gitAdd(`workflows/workflow${i}.ttl`);
            await env.gitCommit(`Add workflow ${i}`);
          }

          // Verify final state
          const log = await env.gitLog();
          expect(log.length).toBeGreaterThan(15); // Should have many commits

          // Verify files exist
          for (let i = 0; i < 15; i++) {
            expect(env.files.exists(`workflows/workflow${i}.ttl`)).toBe(true);
          }
        }
      );
    });
  });

  describe("Performance Testing", () => {
    it("should handle workflow operations efficiently with MemFS", async () => {
      const start = performance.now();

      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Workflow Performance Test\n",
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("memfs");

          // Test many workflow operations
          for (let i = 0; i < 25; i++) {
            env.files.write(
              `workflows/workflow${i}.ttl`,
              `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .

ex:workflow${i} rdf:type gh:Hook ;
    gv:title "Workflow ${i}" ;
    gh:hasPredicate ex:workflow${i}Predicate .`
            );
            await env.gitAdd(`workflows/workflow${i}.ttl`);
            await env.gitCommit(`Add workflow ${i}`);
          }

          const duration = performance.now() - start;
          expect(duration).toBeLessThan(3000); // Should complete within 3 seconds

          console.log(
            `✅ Workflow Performance test completed in ${duration.toFixed(2)}ms`
          );

          // Verify final state
          const log = await env.gitLog();
          expect(log.length).toBeGreaterThan(25); // Should have many commits

          // Verify files exist
          for (let i = 0; i < 25; i++) {
            expect(env.files.exists(`workflows/workflow${i}.ttl`)).toBe(true);
          }
        }
      );
    });

    it("should handle workflow operations efficiently with native Git", async () => {
      const start = performance.now();

      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Native Workflow Performance Test\n",
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("native");

          // Test many workflow operations
          for (let i = 0; i < 12; i++) {
            env.files.write(
              `workflows/workflow${i}.ttl`,
              `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .

ex:workflow${i} rdf:type gh:Hook ;
    gv:title "Workflow ${i}" ;
    gh:hasPredicate ex:workflow${i}Predicate .`
            );
            await env.gitAdd(`workflows/workflow${i}.ttl`);
            await env.gitCommit(`Add workflow ${i}`);
          }

          const duration = performance.now() - start;
          expect(duration).toBeLessThan(8000); // Should complete within 8 seconds

          console.log(
            `✅ Native Workflow Performance test completed in ${duration.toFixed(2)}ms`
          );

          // Verify final state
          const log = await env.gitLog();
          expect(log.length).toBeGreaterThan(12); // Should have many commits

          // Verify files exist
          for (let i = 0; i < 12; i++) {
            expect(env.files.exists(`workflows/workflow${i}.ttl`)).toBe(true);
          }
        }
      );
    });
  });
});
