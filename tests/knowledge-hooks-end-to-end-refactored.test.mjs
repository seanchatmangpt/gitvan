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

ex:test-project rdf:type gv:Project ;
    gv:name "Test Project" ;
    gv:version "1.0.0" ;
    gv:status "active" .

ex:test-component rdf:type gv:Component ;
    gv:name "Test Component" ;
    gv:complexity 7 ;
    gv:belongsTo ex:test-project .
`,
          "hooks/ask-predicate.mjs": `
export const hook = {
  name: "ask-predicate-test",
  predicate: {
    type: "ASK",
    query: \`
      ASK WHERE {
        ?project rdf:type gv:Project .
        ?project gv:status "active" .
      }
    \`
  },
  action: {
    type: "log",
    message: "ASK predicate evaluated successfully"
  }
};
`,
          "hooks/select-threshold.mjs": `
export const hook = {
  name: "select-threshold-test",
  predicate: {
    type: "SELECTThreshold",
    query: \`
      SELECT ?component ?complexity WHERE {
        ?component rdf:type gv:Component .
        ?component gv:complexity ?complexity .
      }
    \`,
    threshold: 5
  },
  action: {
    type: "log",
    message: "SELECTThreshold predicate evaluated successfully"
  }
};
`,
        },
      },
      async (env) => {
        // Verify backend type
        expect(env.getBackendType()).toBe("native");

        // Initialize orchestrator
        const orchestrator = new HookOrchestrator({
          graphDir: `${env.testDir}/hooks`,
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
        expect(askResult.hooksEvaluated).toBeGreaterThan(0);
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
        expect(selectResult.hooksEvaluated).toBeGreaterThan(0);
        console.log(
          `✅ SELECTThreshold predicate evaluation: ${selectResult.hooksEvaluated} hooks evaluated`
        );

        // Test Git integration
        await env.gitAdd(".");
        await env.gitCommit("Add knowledge hooks test data");

        // Verify commit
        const log = await env.gitLog();
        expect(log[0].message).toContain("Add knowledge hooks test data");
        expect(log[1].message).toContain("Initial commit");
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
`,
          "hooks/complex-scenario.mjs": `
export const hook = {
  name: "complex-scenario-test",
  predicate: {
    type: "SELECTThreshold",
    query: \`
      SELECT ?project ?component ?complexity WHERE {
        ?project rdf:type gv:Project .
        ?project gv:status "active" .
        ?component rdf:type gv:Component .
        ?component gv:belongsTo ?project .
        ?component gv:complexity ?complexity .
        FILTER(?complexity > 5)
      }
    \`,
    threshold: 1
  },
  action: {
    type: "log",
    message: "Complex scenario evaluated successfully"
  }
};
`,
        },
      },
      async (env) => {
        // Verify backend type
        expect(env.getBackendType()).toBe("native");

        // Initialize orchestrator
        const orchestrator = new HookOrchestrator({
          graphDir: `${env.testDir}/hooks`,
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
        expect(result.hooksEvaluated).toBeGreaterThan(0);
        console.log(
          `✅ Complex scenario evaluation: ${result.hooksEvaluated} hooks evaluated`
        );

        // Test Git workflow
        await env.gitAdd(".");
        await env.gitCommit("Add complex knowledge hooks scenario");

        // Create feature branch
        await env.gitCheckoutBranch("feature/complex-hooks");

        // Add more files
        env.files.write(
          "hooks/additional.mjs",
          `
export const hook = {
  name: "additional-test",
  predicate: {
    type: "ASK",
    query: \`
      ASK WHERE {
        ?project rdf:type gv:Project .
        ?project gv:version ?version .
        FILTER(?version > "1.0.0")
      }
    \`
  },
  action: {
    type: "log",
    message: "Additional hook evaluated successfully"
  }
};
`
        );

        await env.gitAdd("hooks/additional.mjs");
        await env.gitCommit("Add additional hook");

        // Switch back to main
        await env.gitCheckout("master");

        // Merge feature branch
        await env.gitMerge("feature/complex-hooks");

        // Verify merge
        const log = await env.gitLog();
        expect(log[0].message).toContain("Add additional hook");
        expect(log[1].message).toContain(
          "Add complex knowledge hooks scenario"
        );
        expect(log[2].message).toContain("Initial commit");
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
            `hooks/perf-hook-${i}.mjs`,
            `
export const hook = {
  name: "perf-hook-${i}",
  predicate: {
    type: "ASK",
    query: \`
      ASK WHERE {
        ?project rdf:type gv:Project .
        ?project gv:name "Performance Test Project" .
      }
    \`
  },
  action: {
    type: "log",
    message: "Performance hook ${i} evaluated successfully"
  }
};
`
          );
        }

        // Initialize orchestrator
        const orchestrator = new HookOrchestrator({
          graphDir: `${env.testDir}/hooks`,
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
        expect(result.hooksEvaluated).toBeGreaterThan(0);

        const duration = performance.now() - start;
        expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

        console.log(
          `✅ Performance test: ${
            result.hooksEvaluated
          } hooks evaluated in ${duration.toFixed(2)}ms`
        );

        // Test Git operations with many files
        await env.gitAdd(".");
        await env.gitCommit("Add performance test hooks");

        // Verify commit
        const log = await env.gitLog();
        expect(log[0].message).toContain("Add performance test hooks");
      }
    );
  });
});
