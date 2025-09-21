/**
 * Comprehensive test suite connecting hooks to workflow CLI with turtle only
 * Tests the complete integration between Knowledge Hooks and Workflow CLI
 */

import { describe, it, expect } from "vitest";
import { withNativeGitTestEnvironment } from "../src/composables/test-environment.mjs";
import { HookOrchestrator } from "../src/hooks/HookOrchestrator.mjs";
import { WorkflowEngine } from "../src/workflow/workflow-engine.mjs";
import { HooksCLI } from "../src/cli/hooks.mjs";
import { WorkflowCLI } from "../src/cli/workflow.mjs";
import { withGitVan } from "../src/core/context.mjs";

describe("Hook to Workflow CLI Integration - Turtle Only", () => {
  describe("Turtle Hook Definitions", () => {
    it("should create comprehensive turtle hook definitions", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "hooks/data-processing-hook.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .

ex:data-processing-hook rdf:type gh:Hook ;
    dct:title "Data Processing Workflow Hook" ;
    gh:hasPredicate ex:data-processing-predicate ;
    gh:orderedPipelines ex:data-processing-pipeline .

ex:data-processing-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?file rdf:type gv:SourceFile .
            ?file gv:hasExtension "csv" .
            ?file gv:modifiedRecently true .
        }
    """ .

ex:data-processing-pipeline rdf:type op:Pipeline ;
    op:steps ex:sparql-step, ex:template-step, ex:file-step .

ex:sparql-step rdf:type gv:SparqlStep ;
    gv:text """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?file ?size ?modified WHERE {
            ?file rdf:type gv:SourceFile .
            ?file gv:hasExtension "csv" .
            ?file gv:size ?size .
            ?file gv:modifiedAt ?modified .
        }
    """ ;
    gv:outputMapping '{"files": "results"}' .

ex:template-step rdf:type gv:TemplateStep ;
    gv:text """
# Data Processing Report
Generated at: {{ 'now' | date('YYYY-MM-DD HH:mm:ss') }}

## Files Found
{% for file in files %}
- {{ file.file }} ({{ file.size }} bytes, modified: {{ file.modified }})
{% endfor %}

## Summary
Total files: {{ files | length }}
""" ;
    gv:outputPath "./data-processing-report.md" .

ex:file-step rdf:type gv:FileStep ;
    gv:filePath "./processed-data.json" ;
    gv:operation "create" ;
    gv:content '{"processed": true, "timestamp": "{{ 'now' | date('YYYY-MM-DD HH:mm:ss') }}", "files": {{ files | tojson }}}' .`,

            "hooks/code-quality-hook.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .

ex:code-quality-hook rdf:type gh:Hook ;
    dct:title "Code Quality Gatekeeper Hook" ;
    gh:hasPredicate ex:code-quality-predicate ;
    gh:orderedPipelines ex:code-quality-pipeline .

ex:code-quality-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?file rdf:type gv:SourceFile .
            ?file gv:hasExtension "js" .
            ?file gv:hasQualityIssue ?issue .
            ?issue gv:severity "high" .
        }
    """ .

ex:code-quality-pipeline rdf:type op:Pipeline ;
    op:steps ex:quality-sparql-step, ex:quality-template-step, ex:quality-cli-step .

ex:quality-sparql-step rdf:type gv:SparqlStep ;
    gv:text """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?file ?issue ?severity ?message WHERE {
            ?file rdf:type gv:SourceFile .
            ?file gv:hasExtension "js" .
            ?file gv:hasQualityIssue ?issue .
            ?issue gv:severity ?severity .
            ?issue gv:message ?message .
            FILTER(?severity IN ("high", "critical"))
        }
    """ ;
    gv:outputMapping '{"issues": "results"}' .

ex:quality-template-step rdf:type gv:TemplateStep ;
    gv:text """
# Code Quality Report
Generated at: {{ 'now' | date('YYYY-MM-DD HH:mm:ss') }}

## Critical Issues Found
{% for issue in issues %}
### {{ issue.file }}
- **Severity**: {{ issue.severity }}
- **Message**: {{ issue.message }}
{% endfor %}

## Summary
Total critical issues: {{ issues | length }}
""" ;
    gv:outputPath "./code-quality-report.md" .

ex:quality-cli-step rdf:type gv:CliStep ;
    gv:command "echo 'Code quality check completed' > quality-status.txt" .`,

            "hooks/api-monitoring-hook.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .

ex:api-monitoring-hook rdf:type gh:Hook ;
    dct:title "API Monitoring Hook" ;
    gh:hasPredicate ex:api-monitoring-predicate ;
    gh:orderedPipelines ex:api-monitoring-pipeline .

ex:api-monitoring-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?service rdf:type gv:APIService .
            ?service gv:status "down" .
        }
    """ .

ex:api-monitoring-pipeline rdf:type op:Pipeline ;
    op:steps ex:api-sparql-step, ex:api-http-step, ex:api-template-step .

ex:api-sparql-step rdf:type gv:SparqlStep ;
    gv:text """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?service ?status ?lastCheck ?endpoint WHERE {
            ?service rdf:type gv:APIService .
            ?service gv:status ?status .
            ?service gv:lastCheck ?lastCheck .
            ?service gv:endpoint ?endpoint .
        }
    """ ;
    gv:outputMapping '{"services": "results"}' .

ex:api-http-step rdf:type gv:HttpStep ;
    gv:url "https://api.github.com/status" ;
    gv:method "GET" ;
    gv:headers '{"Accept": "application/json"}' ;
    gv:outputMapping '{"githubStatus": "response"}' .

ex:api-template-step rdf:type gv:TemplateStep ;
    gv:text """
# API Monitoring Report
Generated at: {{ 'now' | date('YYYY-MM-DD HH:mm:ss') }}

## Service Status
{% for service in services %}
- **{{ service.service }}**: {{ service.status }}
  - Endpoint: {{ service.endpoint }}
  - Last Check: {{ service.lastCheck }}
{% endfor %}

## External Status
GitHub API Status: {{ githubStatus.status }}

## Summary
Total services monitored: {{ services | length }}
""" ;
    gv:outputPath "./api-monitoring-report.md" .`,

            "workflows/simple-workflow.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .

ex:simple-workflow rdf:type gh:Hook ;
    dct:title "Simple Test Workflow" ;
    gh:hasPredicate ex:simple-predicate ;
    gh:orderedPipelines ex:simple-pipeline .

ex:simple-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?item rdf:type gv:TestItem .
        }
    """ .

ex:simple-pipeline rdf:type op:Pipeline ;
    op:steps ex:simple-step1, ex:simple-step2 .

ex:simple-step1 rdf:type gv:TemplateStep ;
    gv:text "Simple workflow executed at {{ 'now' | date('YYYY-MM-DD HH:mm:ss') }}" ;
    gv:outputPath "./simple-output.txt" .

ex:simple-step2 rdf:type gv:CliStep ;
    gv:command "echo 'Workflow completed successfully' > workflow-status.txt" .`,

            "graph/knowledge.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:test-csv-file rdf:type gv:SourceFile ;
    gv:name "data.csv" ;
    gv:hasExtension "csv" ;
    gv:size 1024 ;
    gv:modifiedAt "2025-01-18T10:00:00Z" ;
    gv:modifiedRecently true .

ex:test-js-file rdf:type gv:SourceFile ;
    gv:name "app.js" ;
    gv:hasExtension "js" ;
    gv:hasQualityIssue ex:quality-issue-1 .

ex:quality-issue-1 rdf:type gv:QualityIssue ;
    gv:severity "high" ;
    gv:message "Unused variable detected" .

ex:test-api-service rdf:type gv:APIService ;
    gv:name "user-service" ;
    gv:status "down" ;
    gv:lastCheck "2025-01-18T10:00:00Z" ;
    gv:endpoint "https://api.example.com/users" .

ex:test-item rdf:type gv:TestItem ;
    gv:name "test-item-1" ;
    gv:value "test-value" .`,
          },
        },
        async (env) => {
          // Verify all turtle files exist
          expect(env.files.exists("hooks/data-processing-hook.ttl")).toBe(true);
          expect(env.files.exists("hooks/code-quality-hook.ttl")).toBe(true);
          expect(env.files.exists("hooks/api-monitoring-hook.ttl")).toBe(true);
          expect(env.files.exists("workflows/simple-workflow.ttl")).toBe(true);
          expect(env.files.exists("graph/knowledge.ttl")).toBe(true);

          // Verify turtle file contents are valid
          const dataProcessingHook = env.files.read("hooks/data-processing-hook.ttl");
          expect(dataProcessingHook).toContain("ex:data-processing-hook rdf:type gh:Hook");
          expect(dataProcessingHook).toContain("gh:hasPredicate ex:data-processing-predicate");
          expect(dataProcessingHook).toContain("gh:orderedPipelines ex:data-processing-pipeline");

          const codeQualityHook = env.files.read("hooks/code-quality-hook.ttl");
          expect(codeQualityHook).toContain("ex:code-quality-hook rdf:type gh:Hook");
          expect(codeQualityHook).toContain("gh:hasPredicate ex:code-quality-predicate");

          const apiMonitoringHook = env.files.read("hooks/api-monitoring-hook.ttl");
          expect(apiMonitoringHook).toContain("ex:api-monitoring-hook rdf:type gh:Hook");
          expect(apiMonitoringHook).toContain("gh:hasPredicate ex:api-monitoring-predicate");

          console.log("✅ All turtle hook definitions created successfully");
        }
      );
    });
  });

  describe("Hook Orchestrator Integration", () => {
    it("should initialize HookOrchestrator with turtle hooks", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "hooks/test-hook.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .

ex:test-hook rdf:type gh:Hook ;
    dct:title "Test Hook" ;
    gh:hasPredicate ex:test-predicate ;
    gh:orderedPipelines ex:test-pipeline .

ex:test-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?item rdf:type gv:TestItem .
        }
    """ .

ex:test-pipeline rdf:type op:Pipeline ;
    op:steps ex:test-step .

ex:test-step rdf:type gv:TemplateStep ;
    gv:text "Test hook executed at {{ 'now' | date('YYYY-MM-DD HH:mm:ss') }}" ;
    gv:outputPath "./test-output.txt" .`,
          },
        },
        async (env) => {
          await withGitVan({ cwd: env.cwd }, async () => {
            const orchestrator = new HookOrchestrator({
              graphDir: "./hooks",
              logger: console,
            });

            // Initialize orchestrator
            await orchestrator.evaluate({ dryRun: true, verbose: true });

            // Get stats
            const stats = await orchestrator.getStats();
            expect(stats.hooksLoaded).toBeGreaterThan(0);
            expect(stats.contextInitialized).toBe(true);

            // List hooks
            const hooks = await orchestrator.listHooks();
            expect(hooks.length).toBeGreaterThan(0);
            expect(hooks[0]).toHaveProperty("id");
            expect(hooks[0]).toHaveProperty("title");
            expect(hooks[0]).toHaveProperty("predicate");

            console.log("✅ HookOrchestrator initialized successfully with turtle hooks");
          });
        }
      );
    });

    it("should evaluate hooks and trigger workflows", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "hooks/trigger-hook.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .

ex:trigger-hook rdf:type gh:Hook ;
    dct:title "Trigger Test Hook" ;
    gh:hasPredicate ex:trigger-predicate ;
    gh:orderedPipelines ex:trigger-pipeline .

ex:trigger-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?item rdf:type gv:TestItem .
            ?item gv:name "test-item-1" .
        }
    """ .

ex:trigger-pipeline rdf:type op:Pipeline ;
    op:steps ex:trigger-step1, ex:trigger-step2 .

ex:trigger-step1 rdf:type gv:TemplateStep ;
    gv:text "Hook triggered at {{ 'now' | date('YYYY-MM-DD HH:mm:ss') }}" ;
    gv:outputPath "./trigger-output.txt" .

ex:trigger-step2 rdf:type gv:CliStep ;
    gv:command "echo 'Hook execution completed' > hook-status.txt" .`,
            "graph/knowledge.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:test-item-1 rdf:type gv:TestItem ;
    gv:name "test-item-1" ;
    gv:value "test-value" .`,
          },
        },
        async (env) => {
          await withGitVan({ cwd: env.cwd }, async () => {
            const orchestrator = new HookOrchestrator({
              graphDir: "./hooks",
              logger: console,
            });

            // Evaluate hooks
            const result = await orchestrator.evaluate({ dryRun: false, verbose: true });

            // Verify evaluation results
            expect(result.success).toBe(true);
            expect(result.hooksEvaluated).toBeGreaterThan(0);
            expect(result.hooksTriggered).toBeGreaterThan(0);
            expect(result.workflowsExecuted).toBeGreaterThan(0);
            expect(result.executions).toBeDefined();
            expect(result.executions.length).toBeGreaterThan(0);

            // Verify execution results
            const successfulExecutions = result.executions.filter(e => e.success);
            expect(successfulExecutions.length).toBeGreaterThan(0);

            console.log("✅ Hooks evaluated and workflows triggered successfully");
          });
        }
      );
    });
  });

  describe("Workflow CLI Integration", () => {
    it("should initialize WorkflowCLI with turtle workflows", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "workflows/test-workflow.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .

ex:test-workflow rdf:type gh:Hook ;
    dct:title "Test Workflow" ;
    gh:hasPredicate ex:test-predicate ;
    gh:orderedPipelines ex:test-pipeline .

ex:test-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?item rdf:type gv:TestItem .
        }
    """ .

ex:test-pipeline rdf:type op:Pipeline ;
    op:steps ex:test-step .

ex:test-step rdf:type gv:TemplateStep ;
    gv:text "Test workflow executed at {{ 'now' | date('YYYY-MM-DD HH:mm:ss') }}" ;
    gv:outputPath "./workflow-output.txt" .`,
          },
        },
        async (env) => {
          await withGitVan({ cwd: env.cwd }, async () => {
            const workflowCLI = new WorkflowCLI({ logger: console });
            await workflowCLI.initialize();
            // Override the engine's graphDir to point to hooks directory
            workflowCLI.engine.graphDir = "./hooks";
            await workflowCLI.engine.initialize();

            // List workflows
            await workflowCLI.list();

            console.log("✅ WorkflowCLI initialized successfully with turtle workflows");
          });
        }
      );
    });

    it("should execute workflow from CLI", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "workflows/executable-workflow.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .

ex:executable-workflow rdf:type gh:Hook ;
    dct:title "Executable Test Workflow" ;
    gh:hasPredicate ex:executable-predicate ;
    gh:orderedPipelines ex:executable-pipeline .

ex:executable-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?item rdf:type gv:TestItem .
        }
    """ .

ex:executable-pipeline rdf:type op:Pipeline ;
    op:steps ex:executable-step1, ex:executable-step2 .

ex:executable-step1 rdf:type gv:TemplateStep ;
    gv:text "Workflow executed at {{ 'now' | date('YYYY-MM-DD HH:mm:ss') }}" ;
    gv:outputPath "./executable-output.txt" .

ex:executable-step2 rdf:type gv:CliStep ;
    gv:command "echo 'Workflow execution completed' > execution-status.txt" .`,
            "graph/knowledge.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:test-item rdf:type gv:TestItem ;
    gv:name "test-item-1" ;
    gv:value "test-value" .`,
          },
        },
        async (env) => {
          await withGitVan({ cwd: env.cwd }, async () => {
            const workflowCLI = new WorkflowCLI({ logger: console });
            await workflowCLI.initialize();
            // Override the engine's graphDir to point to hooks directory
            workflowCLI.engine.graphDir = "./hooks";
            await workflowCLI.engine.initialize();

            // Execute workflow
            await workflowCLI.run("http://example.org/executable-workflow", { dryRun: false, verbose: true });

            console.log("✅ Workflow executed successfully from CLI");
          });
        }
      );
    });
  });

  describe("Hooks CLI Integration", () => {
    it("should initialize HooksCLI with turtle hooks", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "hooks/cli-test-hook.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .

ex:cli-test-hook rdf:type gh:Hook ;
    dct:title "CLI Test Hook" ;
    gh:hasPredicate ex:cli-test-predicate ;
    gh:orderedPipelines ex:cli-test-pipeline .

ex:cli-test-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?item rdf:type gv:TestItem .
        }
    """ .

ex:cli-test-pipeline rdf:type op:Pipeline ;
    op:steps ex:cli-test-step .

ex:cli-test-step rdf:type gv:TemplateStep ;
    gv:text "CLI test hook executed at {{ 'now' | date('YYYY-MM-DD HH:mm:ss') }}" ;
    gv:outputPath "./cli-test-output.txt" .`,
          },
        },
        async (env) => {
          await withGitVan({ cwd: env.cwd }, async () => {
            const hooksCLI = new HooksCLI({ logger: console });
            await hooksCLI.initialize();

            // List hooks
            await hooksCLI.list();

            console.log("✅ HooksCLI initialized successfully with turtle hooks");
          });
        }
      );
    });

    it("should evaluate hooks from CLI", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "hooks/eval-test-hook.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .

ex:eval-test-hook rdf:type gh:Hook ;
    dct:title "Evaluation Test Hook" ;
    gh:hasPredicate ex:eval-test-predicate ;
    gh:orderedPipelines ex:eval-test-pipeline .

ex:eval-test-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?item rdf:type gv:TestItem .
            ?item gv:name "eval-test-item" .
        }
    """ .

ex:eval-test-pipeline rdf:type op:Pipeline ;
    op:steps ex:eval-test-step .

ex:eval-test-step rdf:type gv:TemplateStep ;
    gv:text "Evaluation test hook executed at {{ 'now' | date('YYYY-MM-DD HH:mm:ss') }}" ;
    gv:outputPath "./eval-test-output.txt" .`,
            "graph/knowledge.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:eval-test-item rdf:type gv:TestItem ;
    gv:name "eval-test-item" ;
    gv:value "eval-test-value" .`,
          },
        },
        async (env) => {
          await withGitVan({ cwd: env.cwd }, async () => {
            const hooksCLI = new HooksCLI({ logger: console });
            await hooksCLI.initialize();

            // Evaluate hooks
            await hooksCLI.evaluate({ dryRun: false, verbose: true });

            console.log("✅ Hooks evaluated successfully from CLI");
          });
        }
      );
    });
  });

  describe("End-to-End Hook to Workflow CLI Flow", () => {
    it("should complete full hook-to-workflow CLI integration", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "hooks/e2e-hook.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .

ex:e2e-hook rdf:type gh:Hook ;
    dct:title "End-to-End Test Hook" ;
    gh:hasPredicate ex:e2e-predicate ;
    gh:orderedPipelines ex:e2e-pipeline .

ex:e2e-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?item rdf:type gv:TestItem .
            ?item gv:name "e2e-test-item" .
        }
    """ .

ex:e2e-pipeline rdf:type op:Pipeline ;
    op:steps ex:e2e-sparql-step, ex:e2e-template-step, ex:e2e-cli-step .

ex:e2e-sparql-step rdf:type gv:SparqlStep ;
    gv:text """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?item ?name ?value WHERE {
            ?item rdf:type gv:TestItem .
            ?item gv:name ?name .
            ?item gv:value ?value .
        }
    """ ;
    gv:outputMapping '{"items": "results"}' .

ex:e2e-template-step rdf:type gv:TemplateStep ;
    gv:text """
# End-to-End Test Report
Generated at: {{ 'now' | date('YYYY-MM-DD HH:mm:ss') }}

## Test Items Found
{% for item in items %}
- **Name**: {{ item.name }}
- **Value**: {{ item.value }}
{% endfor %}

## Summary
Total items: {{ items | length }}
""" ;
    gv:outputPath "./e2e-test-report.md" .

ex:e2e-cli-step rdf:type gv:CliStep ;
    gv:command "echo 'End-to-end test completed successfully' > e2e-status.txt" .`,
            "graph/knowledge.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:e2e-test-item rdf:type gv:TestItem ;
    gv:name "e2e-test-item" ;
    gv:value "e2e-test-value" .`,
          },
        },
        async (env) => {
          await withGitVan({ cwd: env.cwd }, async () => {
            // Step 1: Initialize HookOrchestrator
            const orchestrator = new HookOrchestrator({
              graphDir: "./hooks",
              logger: console,
            });

            // Step 2: Evaluate hooks
            const hookResult = await orchestrator.evaluate({ dryRun: false, verbose: true });
            expect(hookResult.success).toBe(true);
            expect(hookResult.hooksTriggered).toBeGreaterThan(0);

            // Step 3: Initialize WorkflowCLI
            const workflowCLI = new WorkflowCLI({ logger: console });
            await workflowCLI.initialize();
            // Override the engine's graphDir to point to hooks directory
            workflowCLI.engine.graphDir = "./hooks";
            await workflowCLI.engine.initialize();

            // Step 4: List workflows
            await workflowCLI.list();

            // Step 5: Execute workflow
            await workflowCLI.run("http://example.org/e2e-hook", { dryRun: false, verbose: true });

            // Step 6: Initialize HooksCLI
            const hooksCLI = new HooksCLI({ logger: console });
            await hooksCLI.initialize();

            // Step 7: List hooks from CLI
            await hooksCLI.list();

            // Step 8: Evaluate hooks from CLI
            await hooksCLI.evaluate({ dryRun: false, verbose: true });

            console.log("✅ Complete end-to-end hook-to-workflow CLI integration successful");
          });
        }
      );
    });

    it("should handle complex multi-step turtle workflows", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "hooks/complex-hook.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .

ex:complex-hook rdf:type gh:Hook ;
    dct:title "Complex Multi-Step Hook" ;
    gh:hasPredicate ex:complex-predicate ;
    gh:orderedPipelines ex:complex-pipeline .

ex:complex-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?file rdf:type gv:SourceFile .
            ?file gv:hasExtension "js" .
            ?file gv:size ?size .
            FILTER(?size > 1000)
        }
    """ .

ex:complex-pipeline rdf:type op:Pipeline ;
    op:steps ex:complex-sparql-step, ex:complex-template-step, ex:complex-file-step, ex:complex-cli-step .

ex:complex-sparql-step rdf:type gv:SparqlStep ;
    gv:text """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?file ?size ?extension WHERE {
            ?file rdf:type gv:SourceFile .
            ?file gv:hasExtension ?extension .
            ?file gv:size ?size .
            FILTER(?size > 1000)
        }
    """ ;
    gv:outputMapping '{"largeFiles": "results"}' .

ex:complex-template-step rdf:type gv:TemplateStep ;
    gv:text """
# Complex Workflow Report
Generated at: {{ 'now' | date('YYYY-MM-DD HH:mm:ss') }}

## Large Files Found
{% for file in largeFiles %}
- **{{ file.file }}**: {{ file.size }} bytes ({{ file.extension }})
{% endfor %}

## Summary
Total large files: {{ largeFiles | length }}
""" ;
    gv:outputPath "./complex-report.md" .

ex:complex-file-step rdf:type gv:FileStep ;
    gv:filePath "./complex-data.json" ;
    gv:operation "create" ;
    gv:content '{"largeFiles": {{ largeFiles | tojson }}, "timestamp": "{{ 'now' | date('YYYY-MM-DD HH:mm:ss') }}", "totalCount": {{ largeFiles | length }}}' .

ex:complex-cli-step rdf:type gv:CliStep ;
    gv:command "echo 'Complex workflow completed' > complex-status.txt" .`,
            "graph/knowledge.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:large-js-file rdf:type gv:SourceFile ;
    gv:name "large-app.js" ;
    gv:hasExtension "js" ;
    gv:size 2048 .

ex:small-js-file rdf:type gv:SourceFile ;
    gv:name "small-util.js" ;
    gv:hasExtension "js" ;
    gv:size 512 .`,
          },
        },
        async (env) => {
          await withGitVan({ cwd: env.cwd }, async () => {
            // Initialize orchestrator
            const orchestrator = new HookOrchestrator({
              graphDir: "./hooks",
              logger: console,
            });

            // Evaluate complex hook
            const result = await orchestrator.evaluate({ dryRun: false, verbose: true });

            // Verify complex workflow execution
            expect(result.success).toBe(true);
            expect(result.hooksEvaluated).toBeGreaterThan(0);
            expect(result.workflowsExecuted).toBeGreaterThan(0);

            // Verify execution results
            const successfulExecutions = result.executions.filter(e => e.success);
            expect(successfulExecutions.length).toBeGreaterThan(0);

            // Verify step results
            const execution = successfulExecutions[0];
            expect(execution.stepResults).toBeDefined();
            expect(execution.stepResults.length).toBeGreaterThan(0);

            console.log("✅ Complex multi-step turtle workflow executed successfully");
          });
        }
      );
    });
  });
});
