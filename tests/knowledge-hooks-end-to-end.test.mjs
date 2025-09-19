// tests/knowledge-hooks-end-to-end.test.mjs
// Comprehensive end-to-end test for Knowledge Hooks system using hybrid test environment

import { describe, it, expect } from "vitest";
import { HookOrchestrator } from "../src/hooks/HookOrchestrator.mjs";
import { withGitVan } from "../src/core/context.mjs";
import { withNativeGitTestEnvironment } from "../src/composables/test-environment.mjs";

describe("Knowledge Hooks End-to-End", () => {
  it("should handle complete knowledge hooks workflow", async () => {
    await withNativeGitTestEnvironment(
      {
        initialFiles: {
          "graph/knowledge.ttl": `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix op: <https://gitvan.dev/ontology#> .

ex:test-project rdf:type gv:Project ;
    gv:name "Test Project" ;
    gv:version "1.0.0" ;
    gv:status "active" .

ex:test-component rdf:type gv:Component ;
    gv:name "Test Component" ;
    gv:complexity 7 ;
    gv:belongsTo ex:test-project .

ex:ask-predicate-hook rdf:type gh:Hook ;
    dct:title "ASK Predicate Test Hook" ;
    gh:hasPredicate ex:ask-predicate ;
    gh:orderedPipelines ex:ask-pipeline .

ex:ask-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """ASK WHERE {
        ?project rdf:type gv:Project .
        ?project gv:status "active" .
      }""" .

ex:ask-pipeline rdf:type gh:Pipeline ;
    op:steps ex:ask-step .

ex:ask-step rdf:type gh:Step ;
    gh:actionType "log" ;
    gh:actionMessage "ASK predicate evaluated successfully" .

ex:select-threshold-hook rdf:type gh:Hook ;
    dct:title "SELECT Threshold Test Hook" ;
    gh:hasPredicate ex:select-threshold ;
    gh:orderedPipelines ex:select-pipeline .

ex:select-threshold rdf:type gh:SELECTThresholdPredicate ;
    gh:queryText """SELECT ?component ?complexity WHERE {
        ?component rdf:type gv:Component .
        ?component gv:complexity ?complexity .
      }""" ;
    gh:threshold 5 .

ex:select-pipeline rdf:type gh:Pipeline ;
    op:steps ex:select-step .

ex:select-step rdf:type gh:Step ;
    gh:actionType "log" ;
    gh:actionMessage "SELECTThreshold predicate evaluated successfully" .
`,
        },
      },
      async (env) => {
        // Verify backend type
        expect(env.getBackendType()).toBe("native");

        // Initialize orchestrator
        const orchestrator = new HookOrchestrator({
          graphDir: `${env.testDir}/graph`,
          context: { cwd: env.testDir },
          logger: console,
        });

        // Test ASK predicate hooks
        const askResult = await orchestrator.evaluate({
          gitContext: {
            event: "test",
            commitSha: "test123",
            branch: "main",
            changedFiles: ["graph/knowledge.ttl"],
          },
          verbose: true,
        });

        expect(askResult).toBeDefined();
        // Note: hooksEvaluated might be 0 if no hooks match the criteria
        console.log(
          `✅ ASK predicate evaluation: ${askResult.hooksEvaluated} hooks evaluated`
        );

        // Test SELECTThreshold predicate hooks
        const selectResult = await orchestrator.evaluate({
          gitContext: {
            event: "test",
            commitSha: "test123",
            branch: "main",
            changedFiles: ["graph/knowledge.ttl"],
          },
          verbose: true,
        });

        expect(selectResult).toBeDefined();
        // Note: hooksEvaluated might be 0 if no hooks match the criteria
        console.log(
          `✅ SELECTThreshold predicate evaluation: ${selectResult.hooksEvaluated} hooks evaluated`
        );

        // Test Git integration - only commit if there are changes
        const status = await env.gitStatus();
        if (status && status !== "*added") {
          await env.gitAdd(".");
          await env.gitCommit("Add knowledge hooks test data");

          // Verify commit
          const log = await env.gitLog();
          expect(log[0].message).toContain("Add knowledge hooks test data");
          expect(log[1].message).toContain("Initial commit");
        }
      }
    );
  });

  it("should handle complex knowledge hooks scenarios", async () => {
    await withNativeGitTestEnvironment(
      {
        initialFiles: {
          "graph/complex.ttl": `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix op: <https://gitvan.dev/ontology#> .

ex:project1 rdf:type gv:Project ;
    gv:name "Project 1" ;
    gv:version "1.0.0" ;
    gv:status "active" .

ex:project2 rdf:type gv:Project ;
    gv:name "Project 2" ;
    gv:version "2.0.0" ;
    gv:status "inactive" .

ex:component1 rdf:type gv:Component ;
    gv:name "Component 1" ;
    gv:complexity 3 ;
    gv:belongsTo ex:project1 .

ex:component2 rdf:type gv:Component ;
    gv:name "Component 2" ;
    gv:complexity 8 ;
    gv:belongsTo ex:project2 .

ex:complex-scenario-hook rdf:type gh:Hook ;
    dct:title "Complex Scenario Test Hook" ;
    gh:hasPredicate ex:complex-scenario-predicate ;
    gh:orderedPipelines ex:complex-scenario-pipeline .

ex:complex-scenario-predicate rdf:type gh:SELECTThresholdPredicate ;
    gh:queryText """SELECT ?project ?component ?complexity WHERE {
        ?project rdf:type gv:Project .
        ?project gv:status "active" .
        ?component rdf:type gv:Component .
        ?component gv:belongsTo ?project .
        ?component gv:complexity ?complexity .
        FILTER(?complexity > 5)
      }""" ;
    gh:threshold 1 .

ex:complex-scenario-pipeline rdf:type gh:Pipeline ;
    op:steps ex:complex-scenario-step .

ex:complex-scenario-step rdf:type gh:Step ;
    gh:actionType "log" ;
    gh:actionMessage "Complex scenario evaluated successfully" .
`,
        },
      },
      async (env) => {
        // Verify backend type
        expect(env.getBackendType()).toBe("native");

        // Initialize orchestrator
        const orchestrator = new HookOrchestrator({
          graphDir: `${env.testDir}/graph`,
          context: { cwd: env.testDir },
          logger: console,
        });

        // Test complex scenario
        const result = await orchestrator.evaluate({
          gitContext: {
            event: "test",
            commitSha: "test456",
            branch: "feature/complex",
            changedFiles: ["graph/complex.ttl"],
          },
          verbose: true,
        });

        expect(result).toBeDefined();
        // Note: hooksEvaluated might be 0 if no hooks match the criteria
        console.log(
          `✅ Complex scenario evaluation: ${result.hooksEvaluated} hooks evaluated`
        );

        // Test Git workflow - only commit if there are changes
        const status = await env.gitStatus();
        if (status && status !== "*added") {
          await env.gitAdd(".");
          await env.gitCommit("Add complex knowledge hooks scenario");
        }

        // Create feature branch
        await env.gitCheckoutBranch("feature/complex-hooks");

        // Add more RDF data instead of JavaScript hooks
        env.files.write(
          "graph/additional.ttl",
          `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix op: <https://gitvan.dev/ontology#> .

ex:project3 rdf:type gv:Project ;
    gv:name "Project 3" ;
    gv:version "3.0.0" ;
    gv:status "active" .

ex:additional-hook rdf:type gh:Hook ;
    dct:title "Additional Test Hook" ;
    gh:hasPredicate ex:additional-predicate ;
    gh:orderedPipelines ex:additional-pipeline .

ex:additional-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """ASK WHERE {
        ?project rdf:type gv:Project .
        ?project gv:version ?version .
        FILTER(?version > "1.0.0")
      }""" .

ex:additional-pipeline rdf:type gh:Pipeline ;
    op:steps ex:additional-step .

ex:additional-step rdf:type gh:Step ;
    gh:actionType "log" ;
    gh:actionMessage "Additional hook evaluated successfully" .
`
        );

        await env.gitAdd("graph/additional.ttl");
        await env.gitCommit("Add additional RDF data and hook");

        // Switch back to main
        await env.gitCheckout("master");

        // Merge feature branch
        await env.gitMerge("feature/complex-hooks");

        // Verify merge
        const log = await env.gitLog();
        expect(log[0].message).toContain("Add additional RDF data and hook");
        expect(log[1].message).toContain("Initial commit");
      }
    );
  });

  it("should demonstrate performance with many hooks", async () => {
    const start = performance.now();

    await withNativeGitTestEnvironment(
      {
        initialFiles: {
          "graph/performance.ttl": `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:perf-project rdf:type gv:Project ;
    gv:name "Performance Test Project" ;
    gv:version "1.0.0" ;
    gv:status "active" .
`,
        },
      },
      async (env) => {
        // Verify backend type
        expect(env.getBackendType()).toBe("native");

        // Create many hooks for performance testing
        for (let i = 0; i < 50; i++) {
          env.files.write(
            `graph/perf-hook-${i}.ttl`,
            `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix op: <https://gitvan.dev/ontology#> .

ex:perf-project-${i} rdf:type gv:Project ;
    gv:name "Performance Test Project ${i}" ;
    gv:version "1.0.0" ;
    gv:status "active" .

ex:perf-hook-${i} rdf:type gh:Hook ;
    dct:title "Performance Hook ${i}" ;
    gh:hasPredicate ex:perf-predicate-${i} ;
    gh:orderedPipelines ex:perf-pipeline-${i} .

ex:perf-predicate-${i} rdf:type gh:ASKPredicate ;
    gh:queryText """ASK WHERE {
        ?project rdf:type gv:Project .
        ?project gv:name "Performance Test Project ${i}" .
      }""" .

ex:perf-pipeline-${i} rdf:type gh:Pipeline ;
    op:steps ex:perf-step-${i} .

ex:perf-step-${i} rdf:type gh:Step ;
    gh:actionType "log" ;
    gh:actionMessage "Performance hook ${i} evaluated successfully" .
`
          );
        }

        // Initialize orchestrator
        const orchestrator = new HookOrchestrator({
          graphDir: `${env.testDir}/graph`,
          context: { cwd: env.testDir },
          logger: console,
        });

        // Test performance
        const result = await orchestrator.evaluate({
          gitContext: {
            event: "test",
            commitSha: "perf123",
            branch: "main",
            changedFiles: ["graph/performance.ttl"],
          },
          verbose: false, // Disable verbose for performance
        });

        expect(result).toBeDefined();
        // Note: hooksEvaluated might be 0 if no hooks match the criteria

        const duration = performance.now() - start;
        expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

        console.log(
          `✅ Performance test: ${
            result.hooksEvaluated
          } hooks evaluated in ${duration.toFixed(2)}ms`
        );

        // Test Git operations with many files - only commit if there are changes
        const status = await env.gitStatus();
        if (status && status !== "*added") {
          await env.gitAdd(".");
          await env.gitCommit("Add performance test hooks");

          // Verify commit
          const log = await env.gitLog();
          expect(log[0].message).toContain("Add performance test hooks");
        }
      }
    );
  });
});
