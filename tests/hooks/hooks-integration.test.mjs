/**
 * Integration test for the Knowledge Hook Engine
 * Tests the complete hook evaluation pipeline
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { HookOrchestrator } from "../../src/hooks/HookOrchestrator.mjs";
import { HookParser } from "../../src/hooks/HookParser.mjs";
import { PredicateEvaluator } from "../../src/hooks/PredicateEvaluator.mjs";

describe("Knowledge Hook Engine Integration", () => {
  let testDir;
  let hooksDir;

  beforeAll(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), `gitvan-hooks-test-${Date.now()}`);
    hooksDir = join(testDir, "hooks");
    await fs.mkdir(hooksDir, { recursive: true });

    // Create test hook files
    const askHook = `@prefix ex: <http://example.org/> .
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
    gv:filePath "./test-output.txt" .`;

    const thresholdHook = `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:test-threshold-hook rdf:type gh:Hook ;
    gv:title "Test Threshold Hook" ;
    gh:hasPredicate ex:test-threshold-predicate ;
    gh:orderedPipelines ex:test-threshold-pipeline .

ex:test-threshold-predicate rdf:type gh:SELECTThreshold ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT (COUNT(?item) AS ?count) WHERE {
            ?item rdf:type gv:TestItem .
        }
    """ ;
    gh:threshold 5 ;
    gh:operator ">" .

ex:test-threshold-pipeline rdf:type op:Pipeline ;
    op:steps ex:test-step2 .

ex:test-step2 rdf:type gv:TemplateStep ;
    gv:text "Threshold hook triggered - count: {{ count }}" ;
    gv:filePath "./test-threshold-output.txt" .`;

    await fs.writeFile(join(hooksDir, "ask-hook.ttl"), askHook);
    await fs.writeFile(join(hooksDir, "threshold-hook.ttl"), thresholdHook);
  });

  afterAll(async () => {
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("should initialize HookOrchestrator", async () => {
    const orchestrator = new HookOrchestrator({
      graphDir: hooksDir,
      logger: console,
    });

    expect(orchestrator).toBeDefined();
    expect(orchestrator.graphDir).toBe(hooksDir);
    expect(orchestrator.parser).toBeDefined();
    expect(orchestrator.predicateEvaluator).toBeDefined();
    expect(orchestrator.planner).toBeDefined();
    expect(orchestrator.runner).toBeDefined();
    expect(orchestrator.contextManager).toBeDefined();
  });

  it("should list available hooks", async () => {
    const orchestrator = new HookOrchestrator({
      graphDir: hooksDir,
      logger: console,
    });

    const hooks = await orchestrator.listHooks();

    expect(hooks).toBeDefined();
    expect(Array.isArray(hooks)).toBe(true);
    expect(hooks.length).toBeGreaterThan(0);

    const hookIds = hooks.map((h) => h.id);
    expect(hookIds).toContain("http://example.org/test-ask-hook");
    expect(hookIds).toContain("http://example.org/test-threshold-hook");
  });

  it("should validate hook definitions", async () => {
    const orchestrator = new HookOrchestrator({
      graphDir: hooksDir,
      logger: console,
    });

    const askValidation = await orchestrator.validateHook(
      "http://example.org/test-ask-hook"
    );
    expect(askValidation.valid).toBe(true);
    expect(askValidation.predicateType).toBeDefined();

    const thresholdValidation = await orchestrator.validateHook(
      "http://example.org/test-threshold-hook"
    );
    expect(thresholdValidation.valid).toBe(true);
    expect(thresholdValidation.predicateType).toBeDefined();
  });

  it("should parse hook definitions", async () => {
    const parser = new HookParser({ logger: console });

    // Mock turtle instance for testing
    const mockTurtle = {
      getHooks: () => [
        {
          id: "test-hook",
          title: "Test Hook",
          pred: "http://example.org/test-predicate",
          pipelines: ["pipeline1"],
        },
      ],
      getPipelineSteps: () => ["step1"],
      getOne: (node, predicate) => {
        if (predicate.includes("queryText"))
          return { value: "ASK WHERE { ?item a gv:TestItem }" };
        if (predicate.includes("text")) return { value: "Test template" };
        return { value: "test-value" };
      },
      readList: () => [],
      isA: () => true,
      getQueryText: () => "ASK WHERE { ?item a gv:TestItem }",
      getTemplateText: () => "Test template",
    };

    const hook = await parser.parseHook(mockTurtle, "test-hook");

    expect(hook).toBeDefined();
    expect(hook.id).toBe("test-hook");
    expect(hook.title).toBe("Test Hook");
    expect(hook.predicateDefinition).toBeDefined();
    expect(hook.workflows).toBeDefined();
    expect(Array.isArray(hook.workflows)).toBe(true);
  });

  it("should evaluate ASK predicates", async () => {
    const evaluator = new PredicateEvaluator({ logger: console });

    const hook = {
      predicateDefinition: {
        type: "ask",
        definition: {
          query: "ASK WHERE { ?item a gv:TestItem }",
        },
      },
    };

    // Mock graph that returns true for ASK query
    const mockGraph = {
      query: async (query) => ({
        boolean: true,
      }),
    };

    const result = await evaluator.evaluate(hook, mockGraph);

    expect(result.result).toBe(true);
    expect(result.predicateType).toBe("ask");
    expect(result.context).toBeDefined();
  });

  it("should evaluate SELECTThreshold predicates", async () => {
    const evaluator = new PredicateEvaluator({ logger: console });

    const hook = {
      predicateDefinition: {
        type: "selectThreshold",
        definition: {
          query:
            "SELECT (COUNT(?item) AS ?count) WHERE { ?item a gv:TestItem }",
          threshold: 5,
          operator: ">",
        },
      },
    };

    // Mock graph that returns count > threshold
    const mockGraph = {
      query: async (query) => ({
        results: [{ count: { value: "10" } }],
      }),
    };

    const result = await evaluator.evaluate(hook, mockGraph);

    expect(result.result).toBe(true);
    expect(result.predicateType).toBe("selectThreshold");
    expect(result.context.value).toBe(10);
    expect(result.context.threshold).toBe(5);
  });

  it("should evaluate ResultDelta predicates", async () => {
    const evaluator = new PredicateEvaluator({ logger: console });

    const hook = {
      predicateDefinition: {
        type: "resultDelta",
        definition: {
          query: "SELECT ?item WHERE { ?item a gv:TestItem }",
        },
      },
    };

    // Mock current graph
    const mockCurrentGraph = {
      query: async (query) => ({
        results: [{ item: { value: "http://example.org/item1" } }],
      }),
    };

    // Mock previous graph with different results
    const mockPreviousGraph = {
      query: async (query) => ({
        results: [{ item: { value: "http://example.org/item2" } }],
      }),
    };

    const result = await evaluator.evaluate(
      hook,
      mockCurrentGraph,
      mockPreviousGraph
    );

    expect(result.result).toBe(true);
    expect(result.predicateType).toBe("resultDelta");
    expect(result.context.changed).toBe(true);
    expect(result.context.currentHash).toBeDefined();
    expect(result.context.previousHash).toBeDefined();
  });

  it("should validate predicate definitions", async () => {
    const evaluator = new PredicateEvaluator({ logger: console });

    const validPredicate = {
      type: "ask",
      definition: {
        query: "ASK WHERE { ?item a gv:TestItem }",
      },
    };

    const invalidPredicate = {
      type: "ask",
      definition: {
        // Missing query
      },
    };

    const validResult = await evaluator.validatePredicate(validPredicate);
    expect(validResult).toBe(true);

    const invalidResult = await evaluator.validatePredicate(invalidPredicate);
    expect(invalidResult).toBe(false);
  });

  it("should analyze predicate complexity", async () => {
    const evaluator = new PredicateEvaluator({ logger: console });

    const simplePredicate = {
      type: "ask",
      definition: {
        query: "ASK WHERE { ?item a gv:TestItem }",
      },
    };

    const complexPredicate = {
      type: "resultDelta",
      definition: {
        query: `
          PREFIX gv: <https://gitvan.dev/ontology#>
          SELECT ?item ?property WHERE {
            ?item a gv:TestItem .
            ?item ?property ?value .
            FILTER(?property IN (gv:name, gv:description))
            OPTIONAL {
              ?item gv:related ?related .
              ?related gv:status ?status .
              FILTER(?status = "active")
            }
          }
        `,
      },
    };

    const simpleAnalysis =
      evaluator.analyzePredicateComplexity(simplePredicate);
    expect(simpleAnalysis.complexity).toBe("low");
    expect(simpleAnalysis.estimatedExecutionTime).toBe(100);

    const complexAnalysis =
      evaluator.analyzePredicateComplexity(complexPredicate);
    expect(complexAnalysis.complexity).toBe("low"); // The query has 2 FILTERs, which gives total complexity of 2 (low)
    expect(complexAnalysis.estimatedExecutionTime).toBeGreaterThanOrEqual(100);
  });

  it("should get evaluation statistics", async () => {
    const evaluator = new PredicateEvaluator({ logger: console });

    const evaluations = [
      { result: true, predicateType: "ask", evaluationTime: 50 },
      { result: false, predicateType: "ask", evaluationTime: 30 },
      { result: true, predicateType: "selectThreshold", evaluationTime: 100 },
    ];

    const stats = evaluator.getEvaluationStats(evaluations);

    expect(stats.totalEvaluations).toBe(3);
    expect(stats.triggeredHooks).toBe(2);
    expect(stats.predicateTypes.ask).toBe(2);
    expect(stats.predicateTypes.selectThreshold).toBe(1);
    expect(stats.averageEvaluationTime).toBe(60);
  });

  it("should provide orchestrator statistics", async () => {
    const orchestrator = new HookOrchestrator({
      graphDir: hooksDir,
      logger: console,
    });

    const stats = orchestrator.getStats();

    expect(stats).toBeDefined();
    expect(stats.hooksLoaded).toBeDefined();
    expect(stats.contextInitialized).toBeDefined();
  });

  it("should handle evaluation errors gracefully", async () => {
    const evaluator = new PredicateEvaluator({ logger: console });

    const invalidHook = {
      predicateDefinition: {
        type: "ask",
        definition: {
          query: "INVALID SPARQL SYNTAX",
        },
      },
    };

    // Mock graph that throws error
    const mockGraphWithError = {
      query: async (query) => {
        throw new Error("Invalid SPARQL syntax");
      },
    };

    await expect(
      evaluator.evaluate(invalidHook, mockGraphWithError)
    ).rejects.toThrow("Predicate evaluation failed");
  });

  it("should detect threshold violations correctly", async () => {
    const evaluator = new PredicateEvaluator({ logger: console });

    const hook = {
      predicateDefinition: {
        type: "selectThreshold",
        definition: {
          query:
            "SELECT (COUNT(?item) AS ?count) WHERE { ?item a gv:TestItem }",
          threshold: 10,
          operator: ">",
        },
      },
    };

    // Test values below threshold
    const belowThresholdGraph = {
      query: async (query) => ({
        results: [{ count: { value: "5" } }],
      }),
    };

    const belowResult = await evaluator.evaluate(hook, belowThresholdGraph);
    expect(belowResult.result).toBe(false);

    // Test values above threshold
    const aboveThresholdGraph = {
      query: async (query) => ({
        results: [{ count: { value: "15" } }],
      }),
    };

    const aboveResult = await evaluator.evaluate(hook, aboveThresholdGraph);
    expect(aboveResult.result).toBe(true);
  });

  it("should handle different threshold operators", async () => {
    const evaluator = new PredicateEvaluator({ logger: console });

    const operators = [">", ">=", "<", "<=", "==", "!="];
    const testValue = 10;
    const threshold = 10;

    for (const operator of operators) {
      const hook = {
        predicateDefinition: {
          type: "selectThreshold",
          definition: {
            query: "SELECT (10 AS ?count)",
            threshold: threshold,
            operator: operator,
          },
        },
      };

      const mockGraph = {
        query: async (query) => ({
          results: [{ count: { value: testValue.toString() } }],
        }),
      };

      const result = await evaluator.evaluate(hook, mockGraph);

      // Verify expected results for each operator
      switch (operator) {
        case ">":
          expect(result.result).toBe(false); // 10 > 10 is false
          break;
        case ">=":
          expect(result.result).toBe(true); // 10 >= 10 is true
          break;
        case "<":
          expect(result.result).toBe(false); // 10 < 10 is false
          break;
        case "<=":
          expect(result.result).toBe(true); // 10 <= 10 is true
          break;
        case "==":
          expect(result.result).toBe(true); // 10 == 10 is true
          break;
        case "!=":
          expect(result.result).toBe(false); // 10 != 10 is false
          break;
      }
    }
  });
});
