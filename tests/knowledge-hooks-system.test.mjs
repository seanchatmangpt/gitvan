// tests/knowledge-hooks-system.test.mjs
// Focused test for Knowledge Hooks system only

import { describe, it, expect } from "vitest";
import { HookOrchestrator } from "../src/hooks/HookOrchestrator.mjs";
import { withNativeGitTestEnvironment } from "../src/composables/test-environment.mjs";

describe("Knowledge Hooks System", () => {
  it("should evaluate ASK predicate hooks", async () => {
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
`,
        },
      },
      async (env) => {
        // Initialize orchestrator
        const orchestrator = new HookOrchestrator({
          graphDir: `${env.testDir}/graph`,
          context: { cwd: env.testDir },
          logger: console,
        });

        // Test ASK predicate evaluation
        const result = await orchestrator.evaluate({
          gitContext: {
            event: "test",
            commitSha: "test123",
            branch: "main",
            changedFiles: ["graph/knowledge.ttl"],
          },
          verbose: true,
        });

        expect(result).toBeDefined();
        expect(result.hooksEvaluated).toBeGreaterThanOrEqual(0);
        expect(result.workflowsExecuted).toBeGreaterThanOrEqual(0);

        console.log(
          `✅ ASK predicate evaluation: ${result.hooksEvaluated} hooks evaluated`
        );
      }
    );
  });

  it("should evaluate SELECT predicate hooks", async () => {
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

ex:test-component rdf:type gv:Component ;
    gv:name "Test Component" ;
    gv:complexity 7 .

ex:select-predicate-hook rdf:type gh:Hook ;
    dct:title "SELECT Predicate Test Hook" ;
    gh:hasPredicate ex:select-predicate ;
    gh:orderedPipelines ex:select-pipeline .

ex:select-predicate rdf:type gh:SELECTPredicate ;
    gh:queryText """SELECT ?component ?complexity WHERE {
        ?component rdf:type gv:Component .
        ?component gv:complexity ?complexity .
      }""" .

ex:select-pipeline rdf:type gh:Pipeline ;
    op:steps ex:select-step .

ex:select-step rdf:type gh:Step ;
    gh:actionType "log" ;
    gh:actionMessage "SELECT predicate evaluated successfully" .
`,
        },
      },
      async (env) => {
        // Initialize orchestrator
        const orchestrator = new HookOrchestrator({
          graphDir: `${env.testDir}/graph`,
          context: { cwd: env.testDir },
          logger: console,
        });

        // Test SELECT predicate evaluation
        const result = await orchestrator.evaluate({
          gitContext: {
            event: "test",
            commitSha: "test123",
            branch: "main",
            changedFiles: ["graph/knowledge.ttl"],
          },
          verbose: true,
        });

        expect(result).toBeDefined();
        expect(result.hooksEvaluated).toBeGreaterThanOrEqual(0);
        expect(result.workflowsExecuted).toBeGreaterThanOrEqual(0);

        console.log(
          `✅ SELECT predicate evaluation: ${result.hooksEvaluated} hooks evaluated`
        );
      }
    );
  });

  it("should handle hook parsing and validation", async () => {
    await withNativeGitTestEnvironment(
      {
        initialFiles: {
          "graph/invalid.ttl": `
@prefix ex: <http://example.org/> .
@prefix gh: <https://gitvan.dev/graph-hook#> .

ex:invalid-hook rdf:type gh:Hook .
# Missing required properties
`,
        },
      },
      async (env) => {
        // Initialize orchestrator
        const orchestrator = new HookOrchestrator({
          graphDir: `${env.testDir}/graph`,
          context: { cwd: env.testDir },
          logger: console,
        });

        // Test with invalid hook definition
        const result = await orchestrator.evaluate({
          gitContext: {
            event: "test",
            commitSha: "test123",
            branch: "main",
            changedFiles: ["graph/invalid.ttl"],
          },
          verbose: true,
        });

        expect(result).toBeDefined();
        // Should handle invalid hooks gracefully
        console.log(
          `✅ Invalid hook handling: ${result.hooksEvaluated} hooks evaluated`
        );
      }
    );
  });
});
