/**
 * Integration test for the Turtle as Workflow engine
 * Tests the complete workflow execution pipeline
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { WorkflowExecutor } from "../../src/workflow/WorkflowExecutor.mjs";
import { WorkflowParser } from "../../src/workflow/WorkflowParser.mjs";
import { DAGPlanner } from "../../src/workflow/DAGPlanner.mjs";
import { StepRunner } from "../../src/workflow/StepRunner.mjs";
import { ContextManager } from "../../src/workflow/ContextManager.mjs";

describe("Turtle as Workflow Engine Integration", () => {
  let testDir;
  let workflowsDir;

  beforeAll(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), `gitvan-workflow-test-${Date.now()}`);
    workflowsDir = join(testDir, "workflows");
    await fs.mkdir(workflowsDir, { recursive: true });

    // Create test workflow files
    const simpleWorkflow = `@prefix ex: <http://example.org/> .
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
    gv:text "Test output: {{ items | length }} items" ;
    gv:dependsOn ex:step1 ;
    gv:filePath "./test-output.txt" .`;

    const complexWorkflow = `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:complex-workflow rdf:type gh:Hook ;
    gv:title "Complex Test Workflow" ;
    gh:hasPredicate ex:complexTest ;
    gh:orderedPipelines ex:complex-pipeline .

ex:complex-pipeline rdf:type op:Pipeline ;
    op:steps ex:load-data, ex:process-data, ex:generate-report, ex:save-results .

ex:load-data rdf:type gv:SparqlStep ;
    gv:text """
        PREFIX ex: <http://example.org/>
        SELECT ?data ?type WHERE {
            ?data rdf:type ex:DataItem .
            ?data ex:type ?type .
        }
    """ ;
    gv:outputMapping '{"dataItems": "results"}' .

ex:process-data rdf:type gv:SparqlStep ;
    gv:text """
        PREFIX ex: <http://example.org/>
        CONSTRUCT {
            ?data ex:processed true .
            ?data ex:processedAt ?now .
        } WHERE {
            ?data rdf:type ex:DataItem .
            BIND(NOW() AS ?now)
        }
    """ ;
    gv:dependsOn ex:load-data ;
    gv:outputMapping '{"processed": "quads"}' .

ex:generate-report rdf:type gv:TemplateStep ;
    gv:text """
        # Processing Report
        Processed {{ dataItems | length }} items.
        Generated {{ processed | length }} processed records.
    """ ;
    gv:dependsOn ex:process-data ;
    gv:filePath "./report.md" .

ex:save-results rdf:type gv:FileStep ;
    gv:filePath "./results.json" ;
    gv:operation "write" ;
    gv:content '{"processed": {{ processed | length }}, "items": {{ dataItems | length }}}' ;
    gv:dependsOn ex:generate-report .`;

    await fs.writeFile(join(workflowsDir, "simple.ttl"), simpleWorkflow);
    await fs.writeFile(join(workflowsDir, "complex.ttl"), complexWorkflow);
  });

  afterAll(async () => {
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("should initialize WorkflowExecutor", async () => {
    const executor = new WorkflowExecutor({
      graphDir: workflowsDir,
      logger: console,
    });

    expect(executor).toBeDefined();
    expect(executor.graphDir).toBe(workflowsDir);
    expect(executor.parser).toBeDefined();
    expect(executor.planner).toBeDefined();
    expect(executor.runner).toBeDefined();
    expect(executor.contextManager).toBeDefined();
  });

  it("should list available workflows", async () => {
    const executor = new WorkflowExecutor({
      graphDir: workflowsDir,
      logger: console,
    });

    const workflows = await executor.listWorkflows();

    expect(workflows).toBeDefined();
    expect(Array.isArray(workflows)).toBe(true);
    expect(workflows.length).toBeGreaterThan(0);

    const workflowIds = workflows.map((w) => w.id);
    expect(workflowIds).toContain("simple-workflow");
    expect(workflowIds).toContain("complex-workflow");
  });

  it("should validate workflow definitions", async () => {
    const executor = new WorkflowExecutor({
      graphDir: workflowsDir,
      logger: console,
    });

    const simpleValidation = await executor.validateWorkflow("simple-workflow");
    expect(simpleValidation.valid).toBe(true);
    expect(simpleValidation.stepCount).toBe(2);
    expect(simpleValidation.dependencies).toBeDefined();

    const complexValidation = await executor.validateWorkflow(
      "complex-workflow"
    );
    expect(complexValidation.valid).toBe(true);
    expect(complexValidation.stepCount).toBe(4);
    expect(complexValidation.dependencies).toBeDefined();
  });

  it("should parse workflow definitions", async () => {
    const parser = new WorkflowParser({ logger: console });

    // Mock turtle instance for testing
    const mockTurtle = {
      getHooks: () => [
        {
          id: "test-workflow",
          title: "Test Workflow",
          pred: "http://example.org/test",
          pipelines: ["pipeline1"],
        },
      ],
      getPipelineSteps: () => ["step1", "step2"],
      getOne: (node, predicate) => {
        if (predicate.includes("text"))
          return { value: "SELECT ?item WHERE { ?item a ex:Item }" };
        if (predicate.includes("template")) return { value: "Test template" };
        return { value: "test-value" };
      },
      readList: () => [],
      isA: () => true,
      getQueryText: () => "SELECT ?item WHERE { ?item a ex:Item }",
      getTemplateText: () => "Test template",
    };

    const workflow = await parser.parseWorkflow(mockTurtle, "test-workflow");

    expect(workflow).toBeDefined();
    expect(workflow.id).toBe("test-workflow");
    expect(workflow.title).toBe("Test Workflow");
    expect(workflow.steps).toBeDefined();
    expect(Array.isArray(workflow.steps)).toBe(true);
  });

  it("should create execution plans", async () => {
    const planner = new DAGPlanner({ logger: console });

    const steps = [
      {
        id: "step1",
        type: "sparql",
        config: { query: "SELECT ?item WHERE { ?item a ex:Item }" },
        dependsOn: [],
      },
      {
        id: "step2",
        type: "template",
        config: { template: "Test template" },
        dependsOn: ["step1"],
      },
    ];

    const plan = await planner.createPlan(steps);

    expect(plan).toBeDefined();
    expect(Array.isArray(plan)).toBe(true);
    expect(plan.length).toBe(2);
    expect(plan[0].id).toBe("step1");
    expect(plan[1].id).toBe("step2");
  });

  it("should detect circular dependencies", async () => {
    const planner = new DAGPlanner({ logger: console });

    const stepsWithCycle = [
      {
        id: "step1",
        type: "sparql",
        config: { query: "SELECT ?item" },
        dependsOn: ["step2"],
      },
      {
        id: "step2",
        type: "template",
        config: { template: "Test" },
        dependsOn: ["step1"],
      },
    ];

    await expect(planner.createPlan(stepsWithCycle)).rejects.toThrow(
      "Circular dependency"
    );
  });

  it("should manage execution context", async () => {
    const contextManager = new ContextManager({ logger: console });

    await contextManager.initialize({
      workflowId: "test-workflow",
      inputs: { testInput: "test-value" },
      startTime: Date.now(),
    });

    expect(contextManager.getSize()).toBe(1);
    expect(contextManager.hasKey("testInput")).toBe(true);

    await contextManager.setOutput("testOutput", "output-value");
    expect(contextManager.getSize()).toBe(2);

    const outputs = contextManager.getOutputs();
    expect(outputs.testOutput).toBe("output-value");
  });

  it("should execute SPARQL steps", async () => {
    const runner = new StepRunner({ logger: console });
    const contextManager = new ContextManager({ logger: console });

    await contextManager.initialize({
      workflowId: "test-workflow",
      inputs: {},
      startTime: Date.now(),
    });

    // Mock graph instance
    const mockGraph = {
      query: async (query) => ({
        type: "select",
        variables: ["item"],
        results: [
          { item: { value: "http://example.org/item1" } },
          { item: { value: "http://example.org/item2" } },
        ],
      }),
    };

    const step = {
      id: "test-step",
      type: "sparql",
      config: {
        query: "SELECT ?item WHERE { ?item a ex:Item }",
        outputMapping: '{"items": "results"}',
      },
    };

    const result = await runner.executeStep(step, contextManager, mockGraph);

    expect(result.success).toBe(true);
    expect(result.stepId).toBe("test-step");
    expect(result.outputs.results).toBeDefined();
  });

  it("should execute template steps", async () => {
    const runner = new StepRunner({ logger: console });
    const contextManager = new ContextManager({ logger: console });

    await contextManager.initialize({
      workflowId: "test-workflow",
      inputs: {},
      startTime: Date.now(),
    });

    await contextManager.setOutput("items", [
      { item: { value: "http://example.org/item1" } },
      { item: { value: "http://example.org/item2" } },
    ]);

    const step = {
      id: "template-step",
      type: "template",
      config: {
        template: "Found {{ items | length }} items",
        filePath: join(testDir, "template-output.txt"),
      },
    };

    const result = await runner.executeStep(step, contextManager);

    expect(result.success).toBe(true);
    expect(result.stepId).toBe("template-step");

    // Check if file was created
    const content = await fs.readFile(
      join(testDir, "template-output.txt"),
      "utf8"
    );
    expect(content).toContain("Found 2 items");
  });

  it("should execute file steps", async () => {
    const runner = new StepRunner({ logger: console });
    const contextManager = new ContextManager({ logger: console });

    await contextManager.initialize({
      workflowId: "test-workflow",
      inputs: {},
      startTime: Date.now(),
    });

    const testFile = join(testDir, "test-file.txt");
    const testContent = "Test file content";

    const step = {
      id: "file-step",
      type: "file",
      config: {
        filePath: testFile,
        operation: "write",
        content: testContent,
      },
    };

    const result = await runner.executeStep(step, contextManager);

    expect(result.success).toBe(true);
    expect(result.stepId).toBe("file-step");

    // Check if file was created
    const content = await fs.readFile(testFile, "utf8");
    expect(content).toBe(testContent);
  });

  it("should handle step execution errors gracefully", async () => {
    const runner = new StepRunner({ logger: console });
    const contextManager = new ContextManager({ logger: console });

    await contextManager.initialize({
      workflowId: "test-workflow",
      inputs: {},
      startTime: Date.now(),
    });

    const invalidStep = {
      id: "invalid-step",
      type: "sparql",
      config: {
        query: "INVALID SPARQL SYNTAX",
      },
    };

    // Mock graph that throws error
    const mockGraphWithError = {
      query: async (query) => {
        throw new Error("Invalid SPARQL syntax");
      },
    };

    const result = await runner.executeStep(
      invalidStep,
      contextManager,
      mockGraphWithError
    );

    expect(result.success).toBe(false);
    expect(result.stepId).toBe("invalid-step");
    expect(result.error).toBeDefined();
  });

  it("should provide execution statistics", async () => {
    const executor = new WorkflowExecutor({
      graphDir: workflowsDir,
      logger: console,
    });

    const stats = executor.getStats();

    expect(stats).toBeDefined();
    expect(stats.workflowsLoaded).toBeDefined();
    expect(stats.contextInitialized).toBeDefined();
  });

  it("should optimize execution plans for parallel execution", async () => {
    const planner = new DAGPlanner({ logger: console });

    const steps = [
      {
        id: "step1",
        type: "sparql",
        config: { query: "SELECT ?item" },
        dependsOn: [],
      },
      {
        id: "step2",
        type: "sparql",
        config: { query: "SELECT ?other" },
        dependsOn: [],
      },
      {
        id: "step3",
        type: "template",
        config: { template: "Combined result" },
        dependsOn: ["step1", "step2"],
      },
    ];

    const plan = await planner.createPlan(steps);
    const parallelGroups = planner.optimizeForParallelExecution(plan);

    expect(parallelGroups).toBeDefined();
    expect(Array.isArray(parallelGroups)).toBe(true);
    expect(parallelGroups.length).toBe(2); // step1 and step2 can run in parallel, then step3
    expect(parallelGroups[0].length).toBe(2); // step1 and step2
    expect(parallelGroups[1].length).toBe(1); // step3
  });
});
