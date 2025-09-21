/**
 * GitVan Citty CLI Integration - London BDD Style
 *
 * Behavior-Driven Development tests focusing on the complete end-to-end integration
 * of GitVan's Citty CLI with turtle-only workflows, using Given-When-Then structure.
 */

import { describe, it, expect } from "vitest";
import { withNativeGitTestEnvironment } from "../src/composables/test-environment.mjs";
import { HookOrchestrator } from "../src/hooks/HookOrchestrator.mjs";
import { WorkflowEngine } from "../src/workflow/workflow-engine.mjs";
import { HooksCLI } from "../src/cli/hooks.mjs";
import { WorkflowCLI } from "../src/cli/workflow.mjs";
import { withGitVan } from "../src/core/context.mjs";

describe("GitVan Citty CLI Integration", () => {
  describe("When executing CLI workflows", () => {
    it("Given a turtle-defined hook with CLI steps, When the hook is triggered, Then CLI commands should execute successfully", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "hooks/citty-cli-hook.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .

ex:citty-cli-hook rdf:type gh:Hook ;
    dct:title "Citty CLI Test Hook" ;
    gh:hasPredicate ex:citty-cli-predicate ;
    gh:orderedPipelines ex:citty-cli-pipeline .

ex:citty-cli-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?item rdf:type gv:TestItem .
            ?item gv:name "citty-test-item" .
        }
    """ .

ex:citty-cli-pipeline rdf:type op:Pipeline ;
    op:steps ex:citty-step1, ex:citty-step2 .

ex:citty-step1 rdf:type gv:CliStep ;
    gv:command "echo 'Citty CLI Step 1' > citty-output.txt" .

ex:citty-step2 rdf:type gv:CliStep ;
    gv:command "echo 'Citty CLI Step 2' >> citty-output.txt" .`,

            "graph/knowledge.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:citty-test-item rdf:type gv:TestItem ;
    gv:name "citty-test-item" ;
    gv:value "citty-test-value" .`,
          },
        },
        async (env) => {
          await withGitVan({ cwd: env.cwd }, async () => {
            // GIVEN: A turtle-defined hook with CLI steps
            const orchestrator = new HookOrchestrator({
              graphDir: "./hooks",
              logger: console,
            });

            // WHEN: The hook is triggered
            const hookResult = await orchestrator.evaluate({
              dryRun: false,
              verbose: true,
            });

            // THEN: CLI commands should execute successfully
            expect(hookResult.success).toBe(true);
            expect(hookResult.hooksEvaluated).toBeGreaterThan(0);
            expect(hookResult.hooksTriggered).toBeGreaterThan(0);
            expect(hookResult.workflowsExecuted).toBeGreaterThan(0);

            // Verify CLI step outputs were created
            const cittyOutputExists = env.files.exists("citty-output.txt");
            expect(cittyOutputExists).toBe(true);

            if (cittyOutputExists) {
              const cittyOutput = env.files.read("citty-output.txt");
              expect(cittyOutput).toContain("Citty CLI Step 1");
              expect(cittyOutput).toContain("Citty CLI Step 2");
            }
          });
        }
      );
    });

    it("Given multiple CLI commands, When executing a hook, Then all commands should run in sequence", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "hooks/multi-command-hook.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .

ex:multi-command-hook rdf:type gh:Hook ;
    dct:title "Multi-Command Test Hook" ;
    gh:hasPredicate ex:multi-command-predicate ;
    gh:orderedPipelines ex:multi-command-pipeline .

ex:multi-command-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?item rdf:type gv:TestItem .
            ?item gv:name "multi-command-item" .
        }
    """ .

ex:multi-command-pipeline rdf:type op:Pipeline ;
    op:steps ex:echo-step, ex:date-step, ex:whoami-step, ex:pwd-step .

ex:echo-step rdf:type gv:CliStep ;
    gv:command "echo 'Hello from GitVan CLI' > multi-command-output.txt" .

ex:date-step rdf:type gv:CliStep ;
    gv:command "date >> multi-command-output.txt" .

ex:whoami-step rdf:type gv:CliStep ;
    gv:command "whoami >> multi-command-output.txt" .

ex:pwd-step rdf:type gv:CliStep ;
    gv:command "pwd >> multi-command-output.txt" .`,

            "graph/knowledge.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:multi-command-item rdf:type gv:TestItem ;
    gv:name "multi-command-item" ;
    gv:value "multi-command-value" .`,
          },
        },
        async (env) => {
          await withGitVan({ cwd: env.cwd }, async () => {
            // GIVEN: Multiple CLI commands defined in turtle
            const orchestrator = new HookOrchestrator({
              graphDir: "./hooks",
              logger: console,
            });

            // WHEN: Executing a hook
            const result = await orchestrator.evaluate({
              dryRun: false,
              verbose: true,
            });

            // THEN: All commands should run in sequence
            expect(result.success).toBe(true);
            expect(result.hooksTriggered).toBeGreaterThan(0);
            expect(result.workflowsExecuted).toBeGreaterThan(0);

            // Verify CLI command outputs
            const outputExists = env.files.exists("multi-command-output.txt");
            expect(outputExists).toBe(true);

            if (outputExists) {
              const output = env.files.read("multi-command-output.txt");
              expect(output).toContain("Hello from GitVan CLI");
              expect(output).toContain("date"); // Should contain date output
              expect(output).toContain("whoami"); // Should contain whoami output
              expect(output).toContain("pwd"); // Should contain pwd output
            }
          });
        }
      );
    });

    it("Given a complete Citty CLI workflow, When orchestrating the full system, Then all components should integrate seamlessly", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "hooks/citty-workflow-hook.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .

ex:citty-workflow-hook rdf:type gh:Hook ;
    dct:title "Citty Workflow Integration Hook" ;
    gh:hasPredicate ex:citty-workflow-predicate ;
    gh:orderedPipelines ex:citty-workflow-pipeline .

ex:citty-workflow-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?item rdf:type gv:TestItem .
            ?item gv:name "citty-workflow-item" .
        }
    """ .

ex:citty-workflow-pipeline rdf:type op:Pipeline ;
    op:steps ex:citty-init-step, ex:citty-build-step, ex:citty-test-step, ex:citty-deploy-step .

ex:citty-init-step rdf:type gv:CliStep ;
    gv:command "echo 'Citty CLI: Initializing project' > citty-workflow.log" .

ex:citty-build-step rdf:type gv:CliStep ;
    gv:command "echo 'Citty CLI: Building project' >> citty-workflow.log" .

ex:citty-test-step rdf:type gv:CliStep ;
    gv:command "echo 'Citty CLI: Running tests' >> citty-workflow.log" .

ex:citty-deploy-step rdf:type gv:CliStep ;
    gv:command "echo 'Citty CLI: Deploying project' >> citty-workflow.log" .`,

            "graph/knowledge.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:citty-workflow-item rdf:type gv:TestItem ;
    gv:name "citty-workflow-item" ;
    gv:value "citty-workflow-value" .`,
          },
        },
        async (env) => {
          await withGitVan({ cwd: env.cwd }, async () => {
            // GIVEN: A complete Citty CLI workflow
            const orchestrator = new HookOrchestrator({
              graphDir: "./hooks",
              logger: console,
            });

            // WHEN: Orchestrating the full system
            const hookResult = await orchestrator.evaluate({
              dryRun: false,
              verbose: true,
            });

            // Initialize CLI components
            const workflowCLI = new WorkflowCLI({ logger: console });
            await workflowCLI.initialize();
            workflowCLI.engine.graphDir = "./hooks";
            await workflowCLI.engine.initialize();

            const hooksCLI = new HooksCLI({ logger: console });
            await hooksCLI.initialize();

            // Execute CLI operations
            await workflowCLI.list();
            await hooksCLI.list();
            await hooksCLI.evaluate({ dryRun: false, verbose: true });

            // THEN: All components should integrate seamlessly
            expect(hookResult.success).toBe(true);

            // Verify workflow execution
            const cittyLogExists = env.files.exists("citty-workflow.log");
            expect(cittyLogExists).toBe(true);

            if (cittyLogExists) {
              const cittyLog = env.files.read("citty-workflow.log");
              expect(cittyLog).toContain("Citty CLI: Initializing project");
              expect(cittyLog).toContain("Citty CLI: Building project");
              expect(cittyLog).toContain("Citty CLI: Running tests");
              expect(cittyLog).toContain("Citty CLI: Deploying project");
            }

            // Verify system integration
            const stats = await orchestrator.getStats();
            expect(stats.hooksLoaded).toBeGreaterThan(0);
            expect(stats.contextInitialized).toBe(true);
            expect(stats.graphSize).toBeGreaterThan(0);
          });
        }
      );
    });
  });
});
