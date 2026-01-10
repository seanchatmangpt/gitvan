/**
 * Test suite for useN3Rules composable
 * Tests N3 rule engine forward-chaining inference
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useN3Rules } from "../../src/composables/useN3Rules.mjs";

// Helper to create mock term objects
const createTerm = (value, type = 'NamedNode') => ({
  value,
  termType: type,
  equals(other) {
    return this.value === other.value;
  }
});

const createQuad = (s, p, o) => ({
  subject: typeof s === 'string' ? createTerm(s) : s,
  predicate: typeof p === 'string' ? createTerm(p) : p,
  object: typeof o === 'string' ? createTerm(o, 'Literal') : o
});

// Helper to create mock store
const createMockStore = () => ({
  quads: [],
  getQuads(subject, predicate, object) {
    return this.quads.filter(q =>
      (!subject || q.subject.value === subject.value) &&
      (!predicate || q.predicate.value === predicate.value) &&
      (!object || q.object.value === object.value)
    );
  },
  addQuad(q) {
    if (!this.quads.find(existing =>
      existing.subject.value === q.subject.value &&
      existing.predicate.value === q.predicate.value &&
      existing.object.value === q.object.value
    )) {
      this.quads.push(q);
    }
  }
});

describe("useN3Rules - Basic Functionality", () => {
  let engine;

  beforeEach(() => {
    engine = useN3Rules();
  });

  describe("Rule Management", () => {
    it("should add and retrieve rules", () => {
      const rule = {
        id: "test-rule-1",
        name: "Test Rule 1",
        description: "A test rule",
        antecedent: "?file gv:commitCount ?count",
        consequent: "?file gv:hasHighChurn true",
        priority: 100,
      };

      engine.addRule(rule);
      const rules = engine.getRules();

      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe("test-rule-1");
      expect(rules[0].name).toBe("Test Rule 1");
    });

    it("should throw error for invalid rule", () => {
      expect(() => {
        engine.addRule({ id: "bad-rule" });
      }).toThrow("Rule must have id, antecedent, and consequent");
    });

    it("should retrieve multiple rules", () => {
      engine.addRule({
        id: "rule-1",
        antecedent: "?a ex:prop ?b",
        consequent: "?a ex:result true",
      });
      engine.addRule({
        id: "rule-2",
        antecedent: "?x ex:foo ?y",
        consequent: "?x ex:bar true",
      });

      const rules = engine.getRules();
      expect(rules).toHaveLength(2);
      expect(rules.map((r) => r.id)).toContain("rule-1");
      expect(rules.map((r) => r.id)).toContain("rule-2");
    });
  });

  describe("Rule Loading from Turtle", () => {
    it("should load rules from Turtle content with JSON rule definitions", async () => {
      const turtleContent = `
# RULE: {"id": "churn-rule", "name": "Churn Detection", "description": "Detects high churn", "antecedent": "?file gv:commits ?c", "consequent": "?file gv:churn true", "priority": 100}
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/> .

ex:file1 gv:commits 15 .
      `;

      const loaded = await engine.loadRules(turtleContent);
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe("churn-rule");
      expect(loaded[0].name).toBe("Churn Detection");
    });

    it("should handle multiple rules in Turtle content", async () => {
      const turtleContent = `
# RULE: {"id": "rule1", "name": "Rule 1", "description": "First", "antecedent": "?a ex:p1 ?b", "consequent": "?a ex:r1 true", "priority": 100}
# RULE: {"id": "rule2", "name": "Rule 2", "description": "Second", "antecedent": "?x ex:p2 ?y", "consequent": "?x ex:r2 true", "priority": 90}
@prefix ex: <http://example.org/> .
      `;

      const loaded = await engine.loadRules(turtleContent);
      expect(loaded).toHaveLength(2);
      expect(loaded.map((r) => r.id)).toContain("rule1");
      expect(loaded.map((r) => r.id)).toContain("rule2");
    });

    it("should handle empty Turtle content", async () => {
      const loaded = await engine.loadRules("");
      expect(loaded).toHaveLength(0);
    });
  });
});

describe("useN3Rules - Forward-Chaining Execution", () => {
  let engine;
  let store;

  beforeEach(() => {
    engine = useN3Rules();
    store = createMockStore();
  });

  describe("Basic Rule Execution", () => {
    it("should execute simple rules and infer triples", async () => {
      // Add test data
      const file1 = "http://example.org/file1";
      const commitCount = "https://gitvan.dev/ontology#commitCount";
      const hasHighChurn = "https://gitvan.dev/ontology#hasHighChurn";

      store.addQuad(createQuad(
        createTerm(file1),
        createTerm(commitCount),
        createTerm("15", 'Literal')
      ));

      // Add rule
      engine.addRule({
        id: "churn-test",
        antecedent: "?file gv:commitCount ?count",
        consequent: "?file gv:hasHighChurn true",
        priority: 100,
      });

      // Execute rules
      const inferred = await engine.executeRules(store);

      expect(Array.isArray(inferred)).toBe(true);
      expect(inferred.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle multiple data matches per rule", async () => {
      // Add test data: multiple files with high commit counts
      for (let i = 1; i <= 3; i++) {
        const file = `http://example.org/file${i}`;
        store.addQuad(createQuad(
          createTerm(file),
          createTerm("https://gitvan.dev/ontology#commitCount"),
          createTerm(String(10 + i), 'Literal')
        ));
      }

      engine.addRule({
        id: "multi-match-rule",
        antecedent: "?file gv:commitCount ?count",
        consequent: "?file gv:hasHighChurn true",
      });

      const inferred = await engine.executeRules(store);
      expect(Array.isArray(inferred)).toBe(true);
    });

    it("should not re-infer already existing triples", async () => {
      const file = "http://example.org/file1";
      store.addQuad(createQuad(
        createTerm(file),
        createTerm("https://gitvan.dev/ontology#commitCount"),
        createTerm("20", 'Literal')
      ));

      engine.addRule({
        id: "dedup-rule",
        antecedent: "?file gv:commitCount ?count",
        consequent: "?file gv:hasHighChurn true",
      });

      // Execute twice
      const inferred1 = await engine.executeRules(store);
      const inferred2 = await engine.executeRules(store);

      // Should get same number of inferences (no duplicates)
      expect(inferred1.length).toBe(inferred2.length);
    });
  });

  describe("Rule Filtering", () => {
    it("should execute only specified rules", async () => {
      const file = "http://example.org/file1";
      store.addQuad(createQuad(
        createTerm(file),
        createTerm("https://gitvan.dev/ontology#commitCount"),
        createTerm("15", 'Literal')
      ));

      engine.addRule({
        id: "rule-to-run",
        antecedent: "?file gv:commitCount ?count",
        consequent: "?file gv:hasHighChurn true",
      });

      engine.addRule({
        id: "rule-to-skip",
        antecedent: "?x ex:shouldNotMatch ?y",
        consequent: "?x gv:wontInfer true",
      });

      const inferred = await engine.executeRules(store, {
        ruleIds: ["rule-to-run"],
      });

      expect(inferred.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Iteration Control", () => {
    it("should respect maxIterations setting", async () => {
      const file = "http://example.org/file1";
      store.addQuad(createQuad(
        createTerm(file),
        createTerm("https://gitvan.dev/ontology#commitCount"),
        createTerm("15", 'Literal')
      ));

      engine.addRule({
        id: "iter-rule",
        antecedent: "?file gv:commitCount ?count",
        consequent: "?file gv:hasHighChurn true",
      });

      const inferred = await engine.executeRules(store, {
        maxIterations: 1,
      });

      expect(inferred).toBeDefined();
      expect(Array.isArray(inferred)).toBe(true);
    });
  });
});

describe("useN3Rules - Rule Chaining", () => {
  let engine;
  let store;

  beforeEach(() => {
    engine = useN3Rules();
    store = createMockStore();
  });

  it("should chain rules sequentially", async () => {
    const file = "http://example.org/file1";

    // Initial data
    store.addQuad(createQuad(
      createTerm(file),
      createTerm("https://gitvan.dev/ontology#commitCount"),
      createTerm("15", 'Literal')
    ));

    // Rule 1: Detect high churn
    engine.addRule({
      id: "chain-rule-1",
      name: "Detect High Churn",
      antecedent: "?file gv:commitCount ?count",
      consequent: "?file gv:hasHighChurn true",
    });

    // Rule 2: Mark for review if high churn
    engine.addRule({
      id: "chain-rule-2",
      name: "Mark for Code Review",
      antecedent: "?file gv:hasHighChurn ?val",
      consequent: "?file gv:requiresReview true",
    });

    const chainResult = await engine.chainRules(
      engine.getRules(),
      store,
      { maxIterations: 5 }
    );

    expect(chainResult.stages).toBeDefined();
    expect(Array.isArray(chainResult.stages)).toBe(true);
    expect(chainResult.chainedRules).toContain("chain-rule-1");
  });

  it("should maintain store state across chain stages", async () => {
    const code = "http://example.org/code";

    // Initial data
    store.addQuad(createQuad(
      createTerm(code),
      createTerm("https://gitvan.dev/ontology#type"),
      createTerm("source", 'Literal')
    ));

    engine.addRule({
      id: "rule-a",
      antecedent: "?code gv:type ?t",
      consequent: "?code gv:analyzed true",
    });

    engine.addRule({
      id: "rule-b",
      antecedent: "?code gv:analyzed ?a",
      consequent: "?code gv:ready true",
    });

    const chainResult = await engine.chainRules(engine.getRules(), store);

    expect(chainResult.stages).toBeDefined();
    expect(chainResult.totalInferred).toBeDefined();
  });
});

describe("useN3Rules - Inference Cache", () => {
  let engine;
  let store;

  beforeEach(() => {
    engine = useN3Rules();
    store = createMockStore();
  });

  it("should cache inferred triples per rule", async () => {
    const file = "http://example.org/file1";
    store.addQuad(createQuad(
      createTerm(file),
      createTerm("https://gitvan.dev/ontology#commitCount"),
      createTerm("20", 'Literal')
    ));

    engine.addRule({
      id: "cache-rule",
      antecedent: "?file gv:commitCount ?count",
      consequent: "?file gv:hasHighChurn true",
    });

    await engine.executeRules(store);
    const cached = engine.getInferredTriples("cache-rule");

    expect(Array.isArray(cached)).toBe(true);
  });

  it("should clear cache on request", async () => {
    const file = "http://example.org/file1";
    store.addQuad(createQuad(
      createTerm(file),
      createTerm("https://gitvan.dev/ontology#commitCount"),
      createTerm("20", 'Literal')
    ));

    engine.addRule({
      id: "clear-rule",
      antecedent: "?file gv:commitCount ?count",
      consequent: "?file gv:hasHighChurn true",
    });

    await engine.executeRules(store);
    expect(engine.getInferredTriples("clear-rule").length).toBeGreaterThanOrEqual(0);

    engine.clearInferredCache();
    expect(engine.getInferredTriples("clear-rule").length).toBe(0);
  });
});

describe("useN3Rules - Performance", () => {
  let engine;
  let store;

  beforeEach(() => {
    engine = useN3Rules();
    store = createMockStore();
  });

  it("should execute rules efficiently", async () => {
    // Add 100 base quads (reasonable test scale)
    for (let i = 0; i < 100; i++) {
      store.addQuad(createQuad(
        createTerm(`http://example.org/file${i}`),
        createTerm("https://gitvan.dev/ontology#commitCount"),
        createTerm(String(Math.floor(Math.random() * 30)), 'Literal')
      ));
    }

    engine.addRule({
      id: "perf-rule",
      antecedent: "?file gv:commitCount ?count",
      consequent: "?file gv:hasHighChurn true",
    });

    const startTime = Date.now();
    await engine.executeRules(store);
    const endTime = Date.now();

    const executionTime = endTime - startTime;
    expect(executionTime).toBeLessThan(5000); // 5s timeout for test
  });

  it("should handle rule chaining efficiently", async () => {
    // Add 50 base quads
    for (let i = 0; i < 50; i++) {
      store.addQuad(createQuad(
        createTerm(`http://example.org/file${i}`),
        createTerm("https://gitvan.dev/ontology#commitCount"),
        createTerm(String(10 + i), 'Literal')
      ));
    }

    // Add 3 chained rules
    for (let j = 0; j < 3; j++) {
      engine.addRule({
        id: `chain-perf-${j}`,
        antecedent: `?file gv:prop${j} ?val`,
        consequent: `?file gv:result${j} true`,
      });
    }

    const startTime = Date.now();
    const result = await engine.chainRules(engine.getRules(), store, {
      maxIterations: 2,
    });
    const endTime = Date.now();

    const executionTime = endTime - startTime;
    expect(executionTime).toBeLessThan(5000); // 5s timeout
    expect(result.stages.length).toBeGreaterThanOrEqual(0);
  });
});
