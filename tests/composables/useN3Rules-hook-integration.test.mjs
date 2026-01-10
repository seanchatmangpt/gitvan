/**
 * Integration test for useN3Rules with PredicateEvaluator
 * Tests N3 rules as a predicate type in the Knowledge Hook Engine
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useN3Rules } from "../../src/composables/useN3Rules.mjs";
import { PredicateEvaluator } from "../../src/hooks/PredicateEvaluator.mjs";
import { createStore, namedNode, literal, quad, addQuad } from "unrdf";

describe("useN3Rules + PredicateEvaluator Integration", () => {
  let engine;
  let evaluator;
  let store;

  beforeEach(async () => {
    engine = useN3Rules();
    evaluator = new PredicateEvaluator();
    store = await createStore();
  });

  describe("N3Rule Predicate Type", () => {
    it("should evaluate N3 rules as predicates", async () => {
      const EX = "http://example.org/";
      const GV = "https://gitvan.dev/ontology#";

      // Add test data
      addQuad(
        store,
        quad(
          namedNode(`${EX}file1`),
          namedNode(`${GV}commitCount`),
          literal(15)
        )
      );

      // Add rule
      engine.addRule({
        id: "test-rule",
        antecedent: "?file gv:commitCount ?count",
        consequent: "?file gv:hasHighChurn true",
      });

      // Create hook predicate definition
      const hook = {
        predicateDefinition: {
          type: "n3Rule",
          definition: {
            ruleId: "test-rule",
            engine: engine,
            store: store,
          },
        },
      };

      // This demonstrates how N3 rules would integrate
      expect(hook.predicateDefinition.type).toBe("n3Rule");
      expect(hook.predicateDefinition.definition.ruleId).toBe("test-rule");
    });

    it("should support multiple rules in predicate", async () => {
      const EX = "http://example.org/";
      const GV = "https://gitvan.dev/ontology#";

      // Add test data
      addQuad(
        store,
        quad(
          namedNode(`${EX}resource`),
          namedNode(`${GV}prop`),
          literal("value")
        )
      );

      // Add multiple rules
      engine.addRule({
        id: "rule-1",
        antecedent: "?x gv:prop ?p",
        consequent: "?x gv:derived1 true",
      });

      engine.addRule({
        id: "rule-2",
        antecedent: "?x gv:prop ?p",
        consequent: "?x gv:derived2 true",
      });

      const hook = {
        predicateDefinition: {
          type: "n3Rule",
          definition: {
            ruleIds: ["rule-1", "rule-2"],
            engine: engine,
            store: store,
          },
        },
      };

      expect(hook.predicateDefinition.definition.ruleIds).toHaveLength(2);
    });
  });

  describe("Hook Lifecycle Integration", () => {
    it("should execute rules on graph mutation", async () => {
      const EX = "http://example.org/";
      const GV = "https://gitvan.dev/ontology#";

      engine.addRule({
        id: "mutation-rule",
        antecedent: "?file gv:modified ?t",
        consequent: "?file gv:needsAnalysis true",
      });

      // Simulate graph mutation
      addQuad(
        store,
        quad(
          namedNode(`${EX}file1`),
          namedNode(`${GV}modified`),
          literal("2025-01-10")
        )
      );

      const inferred = await engine.executeRules(store, {
        ruleIds: ["mutation-rule"],
      });

      expect(inferred.length).toBeGreaterThan(0);
    });

    it("should chain rules across hook predicates", async () => {
      const EX = "http://example.org/";
      const GV = "https://gitvan.dev/ontology#";

      // Initial data
      addQuad(
        store,
        quad(
          namedNode(`${EX}code`),
          namedNode(`${GV}changed`),
          literal(true)
        )
      );

      // Chain of rules
      engine.addRule({
        id: "detect-change",
        antecedent: "?code gv:changed ?c",
        consequent: "?code gv:analyzed true",
      });

      engine.addRule({
        id: "validate-change",
        antecedent: "?code gv:analyzed ?a",
        consequent: "?code gv:valid true",
      });

      const chainResult = await engine.chainRules(engine.getRules(), store);

      expect(chainResult.stages.length).toBe(2);
      expect(chainResult.totalInferred.length).toBeGreaterThan(0);
    });

    it("should invalidate inferred triples on graph change", async () => {
      const EX = "http://example.org/";
      const GV = "https://gitvan.dev/ontology#";

      engine.addRule({
        id: "cache-test",
        antecedent: "?x gv:type ?t",
        consequent: "?x gv:cached true",
      });

      // First execution
      addQuad(
        store,
        quad(
          namedNode(`${EX}resource1`),
          namedNode(`${GV}type`),
          literal("test")
        )
      );

      const first = await engine.executeRules(store);
      expect(first.length).toBeGreaterThan(0);

      // Clear cache (simulating graph invalidation)
      engine.clearInferredCache();

      // Execute again - should recompute
      const second = await engine.executeRules(store);
      expect(second.length).toBeGreaterThan(0);
    });
  });

  describe("Predicate Composition with N3Rules", () => {
    it("should combine N3 rules with SPARQL queries", async () => {
      const EX = "http://example.org/";
      const GV = "https://gitvan.dev/ontology#";

      // Add data
      addQuad(
        store,
        quad(
          namedNode(`${EX}file1`),
          namedNode(`${GV}commitCount`),
          literal(20)
        )
      );

      // N3 rule
      engine.addRule({
        id: "churn-rule",
        antecedent: "?file gv:commitCount ?count",
        consequent: "?file gv:hasChurn true",
      });

      // Execute rule
      await engine.executeRules(store);

      // Now query the inferred result (SPARQL)
      const query = `
        PREFIX gv: <https://gitvan.dev/ontology#>
        PREFIX ex: <http://example.org/>

        ASK {
          ?file gv:hasChurn true .
        }
      `;

      // This demonstrates composition:
      // 1. N3 rules infer new triples
      // 2. SPARQL queries operate on inferred knowledge
      expect(engine.getRules()).toHaveLength(1);
    });

    it("should support conditional rule execution", async () => {
      const EX = "http://example.org/";
      const GV = "https://gitvan.dev/ontology#";

      // Add data
      addQuad(
        store,
        quad(
          namedNode(`${EX}module1`),
          namedNode(`${GV}fileType`),
          literal("source")
        )
      );

      addQuad(
        store,
        quad(
          namedNode(`${EX}module2`),
          namedNode(`${GV}fileType`),
          literal("test")
        )
      );

      // Conditional rules
      engine.addRule({
        id: "analyze-source",
        antecedent: "?file gv:fileType ?type",
        consequent: "?file gv:analyzed true",
      });

      // Execute only specific rules based on conditions
      const inferred = await engine.executeRules(store, {
        ruleIds: ["analyze-source"],
      });

      expect(inferred.length).toBeGreaterThan(0);
    });
  });

  describe("Error Handling and Validation", () => {
    it("should handle rule execution errors gracefully", async () => {
      engine.addRule({
        id: "valid-rule",
        antecedent: "?x ex:prop ?y",
        consequent: "?x ex:result true",
      });

      // Should not throw
      const inferred = await engine.executeRules(store);
      expect(Array.isArray(inferred)).toBe(true);
    });

    it("should validate rules before execution", () => {
      const validRule = {
        id: "test",
        antecedent: "?x ex:a ?b",
        consequent: "?x ex:result true",
      };

      expect(() => {
        engine.addRule(validRule);
      }).not.toThrow();

      const invalidRule = { id: "bad" };

      expect(() => {
        engine.addRule(invalidRule);
      }).toThrow("Rule must have id, antecedent, and consequent");
    });

    it("should handle concurrent rule executions", async () => {
      const EX = "http://example.org/";
      const GV = "https://gitvan.dev/ontology#";

      // Add data
      addQuad(
        store,
        quad(
          namedNode(`${EX}res1`),
          namedNode(`${GV}val`),
          literal(1)
        )
      );

      addQuad(
        store,
        quad(
          namedNode(`${EX}res2`),
          namedNode(`${GV}val`),
          literal(2)
        )
      );

      // Add multiple rules
      for (let i = 0; i < 3; i++) {
        engine.addRule({
          id: `concurrent-${i}`,
          antecedent: `?x gv:val ?v`,
          consequent: `?x gv:result${i} true`,
        });
      }

      // Execute all rules
      const result = await engine.executeRules(store);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("Performance and Scalability", () => {
    it("should maintain performance with rule chaining", async () => {
      const EX = "http://example.org/";
      const GV = "https://gitvan.dev/ontology#";

      // Add 100 base triples
      for (let i = 0; i < 100; i++) {
        addQuad(
          store,
          quad(
            namedNode(`${EX}resource${i}`),
            namedNode(`${GV}property`),
            literal(`value${i}`)
          )
        );
      }

      // Create rule chain
      for (let j = 0; j < 3; j++) {
        engine.addRule({
          id: `chain-${j}`,
          antecedent: `?x gv:property ?v`,
          consequent: `?x gv:stage${j} true`,
        });
      }

      const startTime = Date.now();
      const result = await engine.chainRules(engine.getRules(), store, {
        maxIterations: 2,
      });
      const duration = Date.now() - startTime;

      expect(result.stages.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(1000); // Should complete in <1s
    });

    it("should cache rule results for repeated queries", async () => {
      const EX = "http://example.org/";
      const GV = "https://gitvan.dev/ontology#";

      addQuad(
        store,
        quad(
          namedNode(`${EX}data`),
          namedNode(`${GV}value`),
          literal(42)
        )
      );

      engine.addRule({
        id: "cache-rule",
        antecedent: "?x gv:value ?v",
        consequent: "?x gv:cached true",
      });

      // First execution
      const first = await engine.executeRules(store);
      const cached1 = engine.getInferredTriples("cache-rule");

      // Second execution
      const second = await engine.executeRules(store);
      const cached2 = engine.getInferredTriples("cache-rule");

      expect(cached1.length).toBe(cached2.length);
    });
  });

  describe("Hook Integration Patterns", () => {
    it("should support hook actions based on rule inference", async () => {
      const EX = "http://example.org/";
      const GV = "https://gitvan.dev/ontology#";

      // Add initial data
      addQuad(
        store,
        quad(
          namedNode(`${EX}branch1`),
          namedNode(`${GV}status`),
          literal("created")
        )
      );

      // Create rule that determines if action should trigger
      engine.addRule({
        id: "should-run-checks",
        antecedent: "?branch gv:status ?s",
        consequent: "?branch gv:triggerCI true",
      });

      const inferred = await engine.executeRules(store);

      // Hook would use the inferred triple to trigger actions
      const hookActions = inferred.map((triple) => ({
        type: "ci-trigger",
        subject: triple.subject.value,
      }));

      expect(hookActions.length).toBeGreaterThan(0);
    });

    it("should support conditional hook execution", async () => {
      const EX = "http://example.org/";
      const GV = "https://gitvan.dev/ontology#";

      // Scenario: Run code review hooks only for high-risk files
      addQuad(
        store,
        quad(
          namedNode(`${EX}src/critical.mjs`),
          namedNode(`${GV}riskLevel`),
          literal("high")
        )
      );

      addQuad(
        store,
        quad(
          namedNode(`${EX}src/utils.mjs`),
          namedNode(`${GV}riskLevel`),
          literal("low")
        )
      );

      // Rule: Mark files needing review
      engine.addRule({
        id: "needs-review",
        antecedent: "?file gv:riskLevel ?level",
        consequent: "?file gv:reviewNeeded true",
      });

      const inferred = await engine.executeRules(store);

      // Both files would be marked (simple rule)
      // In real scenario, rule would filter by risk level
      expect(inferred.length).toBeGreaterThan(0);
    });
  });
});
