// Test suite for useTurtle composable with hybrid test environment
import { describe, it, expect } from "vitest";
import { withMemFSTestEnvironment, withNativeGitTestEnvironment } from "../../src/composables/test-environment.mjs";
import { useTurtle } from "../../src/composables/turtle.mjs";

describe("useTurtle with Hybrid Test Environment", () => {
  describe("Basic Turtle Operations with MemFS", () => {
    it("should handle basic turtle operations", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Turtle Test Repository\n",
            "turtle-test-data/test1.ttl": `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix gh: <https://gitvan.dev/graph-hook#> .

# Test Hook
<https://example.org/hook1> a gh:Hook ;
    dct:title "Test Hook" ;
    gh:hasPredicate <https://example.org/predicate1> .`,
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("memfs");

          // Test turtle file exists
          expect(env.files.exists("turtle-test-data/test1.ttl")).toBe(true);

          // Test Git operations
          await env.gitAdd(".");
          await env.gitCommit("Add turtle test data");

          // Verify commit
          const log = await env.gitLog();
          expect(log[0].message).toContain("Add turtle test data");
          expect(log[1].message).toContain("Initial commit");
        }
      );
    });

    it("should handle turtle file modifications", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Turtle Modifications Test\n",
            "turtle-test-data/test2.ttl": `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .

# Test Resource
<https://example.org/resource1> a dct:Resource ;
    dct:title "Test Resource" .`,
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("memfs");

          // Modify turtle file
          env.files.write(
            "turtle-test-data/test2.ttl",
            `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .

# Test Resource
<https://example.org/resource1> a dct:Resource ;
    dct:title "Modified Test Resource" .`
          );
          expect(env.files.read("turtle-test-data/test2.ttl")).toContain("Modified");

          // Add new turtle file
          env.files.write(
            "turtle-test-data/test3.ttl",
            `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .

# Another Test Resource
<https://example.org/resource2> a dct:Resource ;
    dct:title "Another Test Resource" .`
          );

          // Commit changes
          await env.gitAdd(".");
          await env.gitCommit("Modify and add turtle files");

          // Verify commit
          const log = await env.gitLog();
          expect(log[0].message).toContain("Modify and add turtle files");
          expect(log[1].message).toContain("Initial commit");
        }
      );
    });

    it("should handle complex turtle structure", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Complex Turtle Structure Test\n",
            "turtle-test-data/complex.ttl": `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix gv: <https://gitvan.dev/ontology#> .

# Test Hook
<https://example.org/hook1> a gh:Hook ;
    dct:title "Test Hook" ;
    gh:hasPredicate <https://example.org/predicate1> ;
    gh:orderedPipelines _:pipelineList1 .

# Pipeline list
_:pipelineList1 rdf:first <https://example.org/pipeline1> ;
    rdf:rest rdf:nil .

# Pipeline
<https://example.org/pipeline1> a gv:Pipeline ;
    gv:steps _:stepsList1 .

# Steps list
_:stepsList1 rdf:first <https://example.org/step1> ;
    rdf:rest _:stepsList2 .

_:stepsList2 rdf:first <https://example.org/step2> ;
    rdf:rest rdf:nil .`,
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("memfs");

          // Test complex turtle structure
          expect(env.files.exists("turtle-test-data/complex.ttl")).toBe(true);

          // Test Git operations
          await env.gitAdd(".");
          await env.gitCommit("Add complex turtle structure");

          // Verify commit
          const log = await env.gitLog();
          expect(log[0].message).toContain("Add complex turtle structure");
          expect(log[1].message).toContain("Initial commit");
        }
      );
    });
  });

  describe("Advanced Turtle Operations with Native Git", () => {
    it("should handle complex turtle workflows", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Complex Turtle Workflow Test\n",
            "package.json": '{"name": "turtle-test", "version": "1.0.0"}\n',
            "turtle-test-data/workflow.ttl": `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .

# Workflow Resource
<https://example.org/workflow1> a dct:Resource ;
    dct:title "Test Workflow" .`,
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("native");

          // Test complex turtle workflow
          await env.gitCheckoutBranch("develop");
          env.files.write(
            "turtle-test-data/core.ttl",
            `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .

# Core Resource
<https://example.org/core> a dct:Resource ;
    dct:title "Core Resource" .`
          );
          await env.gitAdd("turtle-test-data/core.ttl");
          await env.gitCommit("Add core turtle resource");

          // Create feature branches
          await env.gitCheckoutBranch("feature/auth");
          env.files.write(
            "turtle-test-data/auth.ttl",
            `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .

# Auth Resource
<https://example.org/auth> a dct:Resource ;
    dct:title "Authentication Resource" .`
          );
          await env.gitAdd("turtle-test-data/auth.ttl");
          await env.gitCommit("Add auth turtle resource");

          await env.gitCheckoutBranch("feature/database");
          env.files.write(
            "turtle-test-data/database.ttl",
            `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .

# Database Resource
<https://example.org/database> a dct:Resource ;
    dct:title "Database Resource" .`
          );
          await env.gitAdd("turtle-test-data/database.ttl");
          await env.gitCommit("Add database turtle resource");

          // Merge features to develop
          await env.gitCheckout("develop");
          await env.gitMerge("feature/auth");
          await env.gitMerge("feature/database");

          // Create release branch
          await env.gitCheckoutBranch("release/v1.0.0");
          env.files.write(
            "CHANGELOG.md",
            "# Changelog\n\n## v1.0.0\n- Added auth turtle resource\n- Added database turtle resource\n"
          );
          await env.gitAdd("CHANGELOG.md");
          await env.gitCommit("Prepare release v1.0.0");

          // Merge to main
          await env.gitCheckout("master");
          await env.gitMerge("release/v1.0.0");

          // Verify final state
          const log = await env.gitLog();
          expect(log[0].message).toContain("Prepare release v1.0.0");
          expect(log[1].message).toContain("Add database turtle resource");
          expect(log[2].message).toContain("Add auth turtle resource");
          expect(log[3].message).toContain("Add core turtle resource");
          expect(log[4].message).toContain("Initial commit");

          // Verify all files exist
          expect(env.files.exists("turtle-test-data/core.ttl")).toBe(true);
          expect(env.files.exists("turtle-test-data/auth.ttl")).toBe(true);
          expect(env.files.exists("turtle-test-data/database.ttl")).toBe(true);
          expect(env.files.exists("CHANGELOG.md")).toBe(true);
        }
      );
    });

    it("should handle turtle operations with many files", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Many Turtle Files Test\n",
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("native");

          // Test turtle operations with many files
          for (let i = 0; i < 15; i++) {
            env.files.write(
              `turtle-test-data/resource${i}.ttl`,
              `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .

# Resource ${i}
<https://example.org/resource${i}> a dct:Resource ;
    dct:title "Resource ${i}" .`
            );
            await env.gitAdd(`turtle-test-data/resource${i}.ttl`);
            await env.gitCommit(`Add resource ${i} turtle file`);
          }

          // Verify final state
          const log = await env.gitLog();
          expect(log.length).toBeGreaterThan(15); // Should have many commits

          // Verify files exist
          for (let i = 0; i < 15; i++) {
            expect(env.files.exists(`turtle-test-data/resource${i}.ttl`)).toBe(true);
          }
        }
      );
    });
  });

  describe("Performance Testing", () => {
    it("should handle turtle operations efficiently with MemFS", async () => {
      const start = performance.now();

      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Turtle Performance Test\n",
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("memfs");

          // Test many turtle operations
          for (let i = 0; i < 25; i++) {
            env.files.write(
              `turtle-test-data/module${i}.ttl`,
              `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .

# Module ${i}
<https://example.org/module${i}> a dct:Resource ;
    dct:title "Module ${i}" .`
            );
            await env.gitAdd(`turtle-test-data/module${i}.ttl`);
            await env.gitCommit(`Add module ${i} turtle file`);
          }

          const duration = performance.now() - start;
          expect(duration).toBeLessThan(3000); // Should complete within 3 seconds

          console.log(
            `✅ Turtle Performance test completed in ${duration.toFixed(2)}ms`
          );

          // Verify final state
          const log = await env.gitLog();
          expect(log.length).toBeGreaterThan(25); // Should have many commits

          // Verify files exist
          for (let i = 0; i < 25; i++) {
            expect(env.files.exists(`turtle-test-data/module${i}.ttl`)).toBe(true);
          }
        }
      );
    });

    it("should handle turtle operations efficiently with native Git", async () => {
      const start = performance.now();

      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Native Turtle Performance Test\n",
          },
        },
        async (env) => {
          // Verify backend type
          expect(env.getBackendType()).toBe("native");

          // Test many turtle operations
          for (let i = 0; i < 12; i++) {
            env.files.write(
              `turtle-test-data/module${i}.ttl`,
              `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .

# Module ${i}
<https://example.org/module${i}> a dct:Resource ;
    dct:title "Module ${i}" .`
            );
            await env.gitAdd(`turtle-test-data/module${i}.ttl`);
            await env.gitCommit(`Add module ${i} turtle file`);
          }

          const duration = performance.now() - start;
          expect(duration).toBeLessThan(8000); // Should complete within 8 seconds

          console.log(
            `✅ Native Turtle Performance test completed in ${duration.toFixed(2)}ms`
          );

          // Verify final state
          const log = await env.gitLog();
          expect(log.length).toBeGreaterThan(12); // Should have many commits

          // Verify files exist
          for (let i = 0; i < 12; i++) {
            expect(env.files.exists(`turtle-test-data/module${i}.ttl`)).toBe(true);
          }
        }
      );
    });
  });
});
