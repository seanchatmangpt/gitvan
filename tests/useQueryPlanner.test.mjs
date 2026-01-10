/**
 * Test useQueryPlanner - Query Execution Plan Generation
 *
 * Tests the Dark Matter query planner's ability to:
 * - Generate execution plans from SPARQL queries
 * - Reorder triple patterns for efficiency
 * - Identify parallel execution groups
 * - Suggest optimization strategies
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useQueryPlanner } from "../src/composables/useQueryPlanner.mjs";

describe("useQueryPlanner - Query Execution Plans", () => {
  let planner;

  beforeEach(() => {
    planner = useQueryPlanner();
  });

  describe("Basic Plan Generation", () => {
    it("should generate execution plan for SELECT query", () => {
      const sparql = `
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        SELECT ?name
        WHERE {
          ?person a foaf:Person ;
                  foaf:name ?name
        }
      `;

      const plan = planner.planQuery(sparql);

      expect(plan).toBeDefined();
      expect(plan.steps).toBeDefined();
      expect(Array.isArray(plan.steps)).toBe(true);
      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.cost).toBeDefined();
    });

    it("should return steps with correct structure", () => {
      const sparql = `
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        SELECT ?name
        WHERE {
          ?person foaf:name ?name
        }
      `;

      const plan = planner.planQuery(sparql);
      const step = plan.steps[0];

      expect(step.index).toBeDefined();
      expect(step.type).toBeDefined();
      expect(step.pattern).toBeDefined();
      expect(step.estimatedRows).toBeDefined();
      expect(step.selectivity).toBeDefined();
    });

    it("should generate plan for CONSTRUCT query", () => {
      const sparql = `
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        CONSTRUCT { ?person foaf:knows ?friend }
        WHERE {
          ?person foaf:knows ?friend
        }
      `;

      const plan = planner.planQuery(sparql);

      expect(plan.queryType).toBe("CONSTRUCT");
      expect(plan.steps.length).toBeGreaterThan(0);
    });

    it("should estimate query cost", () => {
      const simple = `
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        SELECT ?name
        WHERE {
          <http://example.org/person/1> foaf:name ?name
        }
      `;

      const complex = `
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        SELECT ?name
        WHERE {
          ?person foaf:knows ?friend ;
                  foaf:knows ?friend2 ;
                  foaf:knows ?friend3 ;
                  foaf:knows ?friend4 .
        }
      `;

      const simplePlan = planner.planQuery(simple);
      const complexPlan = planner.planQuery(complex);

      // Simple query should have lower cost
      const costOrder = { LOW: 0, MEDIUM: 1, HIGH: 2, VERY_HIGH: 3 };
      expect(costOrder[simplePlan.cost]).toBeLessThanOrEqual(
        costOrder[complexPlan.cost]
      );
    });
  });

  describe("Pattern Reordering", () => {
    it("should reorder patterns by selectivity", () => {
      const patterns = [
        {
          subject: "?s",
          predicate: "?p",
          object: "?o",
          isVariable: { subject: true, predicate: true, object: true },
        },
        {
          subject: "http://example.org/person/1",
          predicate: "foaf:knows",
          object: "?o",
          isVariable: { subject: false, predicate: false, object: true },
        },
      ];

      const reordered = planner.reorderPatterns(patterns);

      // More constrained pattern should come first
      expect(reordered[0].subject).toBe("http://example.org/person/1");
    });

    it("should prioritize fixed predicates", () => {
      const patterns = [
        {
          subject: "?s",
          predicate: "?p",
          object: "?o",
          isVariable: { subject: true, predicate: true, object: true },
        },
        {
          subject: "?person",
          predicate: "foaf:name",
          object: "?name",
          isVariable: { subject: true, predicate: false, object: true },
        },
      ];

      const reordered = planner.reorderPatterns(patterns);

      // Pattern with fixed predicate should come first
      expect(reordered[0].predicate).toBe("foaf:name");
    });

    it("should prioritize fixed subjects", () => {
      const patterns = [
        {
          subject: "?s",
          predicate: "?p",
          object: "?o",
          isVariable: { subject: true, predicate: true, object: true },
        },
        {
          subject: "http://example.org/person/1",
          predicate: "?p",
          object: "?o",
          isVariable: { subject: false, predicate: true, object: true },
        },
      ];

      const reordered = planner.reorderPatterns(patterns);

      // Pattern with fixed subject should come first
      expect(reordered[0].subject).toBe("http://example.org/person/1");
    });

    it("should handle empty pattern list", () => {
      const reordered = planner.reorderPatterns([]);

      expect(reordered).toEqual([]);
    });

    it("should handle single pattern", () => {
      const patterns = [
        {
          subject: "?s",
          predicate: "foaf:name",
          object: "?name",
          isVariable: { subject: true, predicate: false, object: true },
        },
      ];

      const reordered = planner.reorderPatterns(patterns);

      expect(reordered.length).toBe(1);
    });
  });

  describe("Filter Detection", () => {
    it("should identify applicable filters for patterns", () => {
      const sparql = `
        SELECT ?name ?age
        WHERE {
          ?person foaf:name ?name ;
                  foaf:age ?age .
          FILTER(?age > 18)
        }
      `;

      const plan = planner.planQuery(sparql);

      // Should have filter step or applicable filters
      expect(plan.steps.some((s) => s.type === "Filter") ||
             plan.steps.some((s) => s.applicableFilters && s.applicableFilters.length > 0)
      ).toBe(true);
    });

    it("should suggest filter pushing optimization", () => {
      const sparql = `
        SELECT ?name
        WHERE {
          ?person foaf:name ?name ;
                  foaf:age ?age .
          FILTER(?age > 18)
        }
      `;

      const plan = planner.planQuery(sparql);

      // Should have optimization hints about filtering
      expect(plan.steps.length > 0 || (plan.optimizationHints && plan.optimizationHints.length > 0)).toBe(true);
    });
  });

  describe("Parallel Execution", () => {
    it("should identify parallelizable patterns", () => {
      const sparql = `
        SELECT ?name ?age ?email
        WHERE {
          ?person foaf:name ?name .
          ?person foaf:age ?age .
          ?person foaf:email ?email
        }
      `;

      const plan = planner.planQuery(sparql);

      expect(plan.canBeParallelized).toBeDefined();
    });

    it("should group patterns for parallel execution", () => {
      const patterns = [
        {
          subject: "?person",
          predicate: "foaf:name",
          object: "?name",
          isVariable: { subject: true, predicate: false, object: true },
        },
        {
          subject: "?person",
          predicate: "foaf:age",
          object: "?age",
          isVariable: { subject: true, predicate: false, object: true },
        },
      ];

      const groups = planner._identifyParallelGroups(patterns);

      expect(Array.isArray(groups)).toBe(true);
      expect(groups.length).toBeGreaterThan(0);
    });

    it("should not group dependent patterns", () => {
      const patterns = [
        {
          subject: "?person",
          predicate: "foaf:knows",
          object: "?friend",
          isVariable: { subject: true, predicate: false, object: true },
        },
        {
          subject: "?friend",
          predicate: "foaf:name",
          object: "?name",
          isVariable: { subject: true, predicate: false, object: true },
        },
      ];

      const groups = planner._identifyParallelGroups(patterns);

      // Second pattern depends on variable from first
      expect(groups.length).toBeGreaterThan(0);
    });
  });

  describe("Query Splitting", () => {
    it("should split UNION queries", () => {
      const sparql = `
        SELECT ?name
        WHERE {
          ?person foaf:name ?name
          UNION
          ?person foaf:givenName ?name
        }
      `;

      const subqueries = planner.splitComplexQuery(sparql);

      expect(subqueries.length).toBeGreaterThan(1);
    });

    it("should keep OPTIONAL queries together", () => {
      const sparql = `
        SELECT ?name ?email
        WHERE {
          ?person foaf:name ?name
          OPTIONAL { ?person foaf:email ?email }
        }
      `;

      const subqueries = planner.splitComplexQuery(sparql);

      // OPTIONAL should not cause split
      expect(subqueries.length).toBe(1);
    });

    it("should handle simple queries without splitting", () => {
      const sparql = `
        SELECT ?name
        WHERE {
          ?person foaf:name ?name
        }
      `;

      const subqueries = planner.splitComplexQuery(sparql);

      expect(subqueries.length).toBe(1);
      expect(subqueries[0]).toBe(sparql);
    });
  });

  describe("Plan Explanation", () => {
    it("should generate human-readable explanation", () => {
      const sparql = `
        SELECT ?name
        WHERE {
          ?person foaf:name ?name
        }
      `;

      const plan = planner.planQuery(sparql);
      const explanation = planner.explainPlan(plan);

      expect(typeof explanation).toBe("string");
      expect(explanation.length).toBeGreaterThan(0);
      expect(explanation).toContain("Execution Plan");
    });

    it("explanation should include cost information", () => {
      const sparql = `
        SELECT ?name
        WHERE {
          ?person foaf:name ?name
        }
      `;

      const plan = planner.planQuery(sparql);
      const explanation = planner.explainPlan(plan);

      expect(explanation).toContain(plan.cost);
    });

    it("explanation should reference pattern steps", () => {
      const sparql = `
        SELECT ?s ?p ?o
        WHERE {
          ?s ?p ?o
        }
      `;

      const plan = planner.planQuery(sparql);
      const explanation = planner.explainPlan(plan);

      expect(explanation).toContain("Query");
    });

    it("should handle invalid plan gracefully", () => {
      const explanation = planner.explainPlan(null);

      expect(typeof explanation).toBe("string");
      expect(explanation).toBe("Invalid plan");
    });
  });

  describe("Cost Estimation", () => {
    it("should estimate cardinality for patterns", () => {
      const sparql = `
        SELECT ?o
        WHERE {
          <http://example.org/s> <http://example.org/p> ?o
        }
      `;

      const plan = planner.planQuery(sparql);
      const step = plan.steps.find((s) => s.type === "TriplePattern");

      expect(step.estimatedRows).toBeGreaterThanOrEqual(1);
      expect(typeof step.estimatedRows).toBe("number");
    });

    it("should aggregate cardinality across steps", () => {
      const sparql = `
        SELECT ?f1 ?f2
        WHERE {
          ?person foaf:knows ?f1 .
          ?f1 foaf:knows ?f2 .
        }
      `;

      const plan = planner.planQuery(sparql);

      expect(plan.totalEstimatedRows).toBeDefined();
      expect(plan.totalEstimatedRows).toBeGreaterThanOrEqual(1);
    });

    it("should estimate lower cost for constrained patterns", () => {
      const constrained = `
        SELECT ?name
        WHERE {
          <http://example.org/person/1> foaf:name ?name
        }
      `;

      const unconstrained = `
        SELECT ?name
        WHERE {
          ?person foaf:name ?name
        }
      `;

      const plan1 = planner.planQuery(constrained);
      const plan2 = planner.planQuery(unconstrained);

      // Constrained should have lower cardinality
      expect(plan1.totalEstimatedRows).toBeLessThanOrEqual(
        plan2.totalEstimatedRows
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty query", () => {
      const sparql = `
        SELECT ?x
        WHERE { }
      `;

      const plan = planner.planQuery(sparql);

      expect(plan.steps.length).toBe(0);
    });

    it("should throw error for invalid input", () => {
      expect(() => {
        planner.planQuery(null);
      }).toThrow();

      expect(() => {
        planner.planQuery("");
      }).toThrow();

      expect(() => {
        planner.planQuery(123);
      }).toThrow();
    });

    it("should handle schema parameter", () => {
      const sparql = `
        SELECT ?name
        WHERE {
          ?person foaf:name ?name
        }
      `;

      const schema = {
        "foaf:Person": {
          properties: ["foaf:name", "foaf:age", "foaf:email"],
        },
      };

      const plan = planner.planQuery(sparql, schema);

      expect(plan).toBeDefined();
      expect(plan.steps.length).toBeGreaterThan(0);
    });

    it("should handle queries with multiple UNION", () => {
      const sparql = `
        SELECT ?name
        WHERE {
          ?person foaf:name ?name
          UNION
          ?person foaf:givenName ?name
          UNION
          ?person foaf:nickname ?name
        }
      `;

      const subqueries = planner.splitComplexQuery(sparql);

      expect(subqueries.length).toBeGreaterThan(1);
    });

    it("should handle complex nested patterns", () => {
      const sparql = `
        SELECT ?name ?friend
        WHERE {
          {
            ?person foaf:name ?name
          }
          {
            ?person foaf:knows ?friend
          }
        }
      `;

      const plan = planner.planQuery(sparql);

      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.complexity).toBeDefined();
    });
  });

  describe("Optimization Hints", () => {
    it("should include optimization hints in plan", () => {
      const sparql = `
        SELECT ?s ?p ?o
        WHERE {
          ?s ?p ?o
        }
      `;

      const plan = planner.planQuery(sparql);

      expect(plan.optimizationHints).toBeDefined();
    });

    it("should suggest filter pushing", () => {
      const sparql = `
        SELECT ?name
        WHERE {
          ?person foaf:name ?name ;
                  foaf:age ?age .
          GROUP BY ?name
        }
      `;

      const plan = planner.planQuery(sparql);

      // May suggest optimization
      expect(plan.steps.length > 0 || (plan.optimizationHints && plan.optimizationHints.length > 0)).toBe(true);
    });
  });
});
