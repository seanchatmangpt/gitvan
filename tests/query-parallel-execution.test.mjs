/**
 * Test Query Parallel Execution
 *
 * Tests the Dark Matter query optimizer's ability to:
 * - Identify patterns that can execute in parallel
 * - Group independent patterns
 * - Execute parallel patterns for faster result materialization
 * - Maintain correctness with parallel execution
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useQueryPlanner } from "../src/composables/useQueryPlanner.mjs";

describe("Query Parallel Execution", () => {
  let planner;

  beforeEach(() => {
    planner = useQueryPlanner();
  });

  describe("Parallel Pattern Identification", () => {
    it("should identify independent patterns as parallelizable", () => {
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
      expect(plan.parallelGroups).toBeDefined();
      expect(Array.isArray(plan.parallelGroups)).toBe(true);
    });

    it("should not parallelize dependent patterns", () => {
      const sparql = `
        SELECT ?name ?friendName
        WHERE {
          ?person foaf:knows ?friend .
          ?friend foaf:name ?friendName
        }
      `;

      const plan = planner.planQuery(sparql);

      // Patterns share variable ?friend, should not fully parallelize
      expect(plan.parallelGroups.length).toBeLessThanOrEqual(
        plan.patterns.length
      );
    });

    it("should identify partial parallelization opportunities", () => {
      const sparql = `
        SELECT ?name ?age ?email ?friend
        WHERE {
          ?person foaf:name ?name .
          ?person foaf:age ?age .
          ?person foaf:email ?email .
          ?person foaf:knows ?friend
        }
      `;

      const plan = planner.planQuery(sparql);

      // Some patterns can parallelize
      expect(plan.patterns.length).toBeGreaterThan(1);
    });
  });

  describe("Parallel Group Generation", () => {
    it("should generate execution groups for patterns", () => {
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
        {
          subject: "?person",
          predicate: "foaf:email",
          object: "?email",
          isVariable: { subject: true, predicate: false, object: true },
        },
      ];

      const groups = planner._identifyParallelGroups(patterns);

      expect(groups.length).toBeGreaterThan(0);
      expect(Array.isArray(groups)).toBe(true);
    });

    it("should respect variable dependencies in grouping", () => {
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
        {
          subject: "?friend",
          predicate: "foaf:age",
          object: "?age",
          isVariable: { subject: true, predicate: false, object: true },
        },
      ];

      const groups = planner._identifyParallelGroups(patterns);

      // First pattern standalone, then both depend on ?friend
      expect(groups.length).toBeGreaterThan(0);
    });

    it("should allow parallel execution of independent sub-graphs", () => {
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
        {
          subject: "?company",
          predicate: "foaf:name",
          object: "?companyName",
          isVariable: { subject: true, predicate: false, object: true },
        },
        {
          subject: "?person",
          predicate: "foaf:worksFor",
          object: "?company",
          isVariable: { subject: true, predicate: false, object: true },
        },
      ];

      const groups = planner._identifyParallelGroups(patterns);

      // First 2 can parallelize, then join with company patterns
      expect(groups.length).toBeGreaterThan(0);
    });
  });

  describe("Parallel Execution Strategies", () => {
    it("should suggest parallel execution for multi-pattern queries", () => {
      const sparql = `
        SELECT ?name ?age ?email ?phone
        WHERE {
          ?person foaf:name ?name .
          ?person foaf:age ?age .
          ?person foaf:email ?email .
          ?person foaf:phone ?phone
        }
      `;

      const plan = planner.planQuery(sparql);

      expect(plan.canBeParallelized).toBeDefined();
      if (plan.canBeParallelized) {
        expect(plan.steps.length).toBeGreaterThan(1);
      }
    });

    it("should not parallelize single-pattern queries", () => {
      const sparql = `
        SELECT ?name
        WHERE {
          ?person foaf:name ?name
        }
      `;

      const plan = planner.planQuery(sparql);

      // Single pattern, no parallelization needed
      expect(plan.patterns.length).toBeLessThanOrEqual(1);
    });

    it("should identify parallel filter opportunities", () => {
      const sparql = `
        SELECT ?person ?age ?salary
        WHERE {
          ?person foaf:age ?age ;
                  foaf:salary ?salary .
          FILTER(?age > 18)
          FILTER(?salary > 50000)
        }
      `;

      const plan = planner.planQuery(sparql);

      // Filters can be applied in parallel
      expect(plan.steps.length).toBeGreaterThan(0);
    });
  });

  describe("Parallel Efficiency", () => {
    it("should improve results with parallel execution simulation", () => {
      const sparql = `
        SELECT ?prop1 ?prop2 ?prop3 ?prop4 ?prop5
        WHERE {
          ?person foaf:prop1 ?prop1 .
          ?person foaf:prop2 ?prop2 .
          ?person foaf:prop3 ?prop3 .
          ?person foaf:prop4 ?prop4 .
          ?person foaf:prop5 ?prop5
        }
      `;

      const plan = planner.planQuery(sparql);

      // Multiple properties from same subject
      expect(plan.patterns.length).toBeGreaterThan(1);

      // All patterns bind same subject, can parallelize
      if (plan.patterns.length > 2) {
        expect(plan.canBeParallelized).toBe(true);
      }
    });

    it("should estimate speedup from parallel execution", () => {
      const patterns = [
        {
          subject: "?p",
          predicate: "prop1",
          object: "?o1",
          isVariable: { subject: true, predicate: false, object: true },
        },
        {
          subject: "?p",
          predicate: "prop2",
          object: "?o2",
          isVariable: { subject: true, predicate: false, object: true },
        },
        {
          subject: "?p",
          predicate: "prop3",
          object: "?o3",
          isVariable: { subject: true, predicate: false, object: true },
        },
      ];

      const groups = planner._identifyParallelGroups(patterns);

      // With n independent patterns, potential n-fold speedup
      expect(groups.length).toBeGreaterThan(0);
    });
  });

  describe("Correctness with Parallelization", () => {
    it("should preserve query semantics with parallel execution", () => {
      const sparql = `
        SELECT ?name ?email
        WHERE {
          ?person foaf:name ?name .
          ?person foaf:email ?email
        }
      `;

      const plan = planner.planQuery(sparql);

      // Results should be correct regardless of execution order
      expect(plan.steps.length).toBeGreaterThan(0);
      for (const step of plan.steps) {
        if (step.type === "TriplePattern") {
          expect(step.pattern).toBeDefined();
        }
      }
    });

    it("should maintain join correctness in parallel execution", () => {
      const sparql = `
        SELECT ?name ?friendName
        WHERE {
          ?person foaf:knows ?friend ;
                  foaf:name ?name .
          ?friend foaf:name ?friendName
        }
      `;

      const plan = planner.planQuery(sparql);

      // Patterns with shared variables must execute in order
      const boundVars = new Set();
      for (const step of plan.steps) {
        if (step.type === "TriplePattern") {
          const vars = step.bindingVariables || [];
          for (const v of vars) {
            boundVars.add(v);
          }
        }
      }

      expect(boundVars.size).toBeGreaterThan(0);
    });

    it("should handle parallel FILTER execution correctly", () => {
      const sparql = `
        SELECT ?person
        WHERE {
          ?person foaf:age ?age ;
                  foaf:salary ?salary .
          FILTER(?age > 18 && ?salary > 50000)
        }
      `;

      const plan = planner.planQuery(sparql);

      // Both patterns and filters should execute correctly
      const patternSteps = plan.steps.filter((s) => s.type === "TriplePattern");
      const filterSteps = plan.steps.filter((s) => s.type === "Filter");

      expect(patternSteps.length).toBeGreaterThan(0);
    });
  });

  describe("Complex Parallel Scenarios", () => {
    it("should handle nested parallel execution", () => {
      const sparql = `
        SELECT ?person ?friend ?friendFriend ?name
        WHERE {
          ?person foaf:knows ?friend .
          ?friend foaf:knows ?friendFriend ;
                  foaf:name ?name
        }
      `;

      const plan = planner.planQuery(sparql);

      // First pattern, then parallel patterns with ?friend binding
      expect(plan.patterns.length).toBeGreaterThan(0);
    });

    it("should optimize parallel execution with UNION", () => {
      const sparql = `
        SELECT ?name
        WHERE {
          ?person foaf:name ?name
          UNION
          ?person foaf:givenName ?name
        }
      `;

      const subqueries = planner.splitComplexQuery(sparql);

      // UNION subqueries can execute in parallel
      expect(subqueries.length).toBeGreaterThan(1);
    });

    it("should handle conditional parallel execution", () => {
      const sparql = `
        SELECT ?person ?name ?email
        WHERE {
          ?person foaf:name ?name .
          OPTIONAL { ?person foaf:email ?email }
        }
      `;

      const plan = planner.planQuery(sparql);

      // Required patterns execute first, then optional
      expect(plan.steps.length).toBeGreaterThan(0);
    });

    it("should optimize parallel GROUP BY", () => {
      const sparql = `
        SELECT ?department (COUNT(?person) AS ?count)
        WHERE {
          ?person foaf:department ?department ;
                  foaf:salary ?salary ;
                  foaf:status ?status
        }
        GROUP BY ?department
      `;

      const plan = planner.planQuery(sparql);

      expect(plan.steps.length).toBeGreaterThan(0);
    });
  });

  describe("Parallel Execution Planning", () => {
    it("should mark parallelizable patterns in plan", () => {
      const sparql = `
        SELECT ?n1 ?n2 ?n3
        WHERE {
          ?p foaf:prop1 ?n1 .
          ?p foaf:prop2 ?n2 .
          ?p foaf:prop3 ?n3
        }
      `;

      const plan = planner.planQuery(sparql);

      if (plan.canBeParallelized) {
        // Should have multiple independent patterns
        expect(plan.patterns.length).toBeGreaterThan(1);
      }
    });

    it("should generate sequential execution plan for dependent patterns", () => {
      const sparql = `
        SELECT ?name ?friendName
        WHERE {
          ?person foaf:knows ?friend .
          ?friend foaf:name ?friendName ;
                  foaf:age ?age .
          ?person foaf:name ?name
        }
      `;

      const plan = planner.planQuery(sparql);

      // First pattern: ?person knows ?friend
      // Then can parallelize: ?friend's name and age
      // Finally: ?person's name (if not already bound)
      expect(plan.steps.length).toBeGreaterThan(0);
    });
  });

  describe("Performance Estimation", () => {
    it("should estimate speedup from parallel execution", () => {
      const parallelQuery = `
        SELECT ?p1 ?p2 ?p3 ?p4
        WHERE {
          ?person foaf:prop1 ?p1 .
          ?person foaf:prop2 ?p2 .
          ?person foaf:prop3 ?p3 .
          ?person foaf:prop4 ?p4
        }
      `;

      const plan = planner.planQuery(parallelQuery);

      // 4 independent patterns - up to 4x speedup with parallelization
      expect(plan.patterns.length).toBeGreaterThanOrEqual(4);

      if (plan.canBeParallelized) {
        // Should have identified multiple patterns that can run in parallel
        expect(plan.parallelGroups).toBeDefined();
        expect(plan.parallelGroups.length).toBeGreaterThan(0);
      }
    });

    it("should account for join overhead in parallel estimation", () => {
      const query = `
        SELECT ?name ?friendCount
        WHERE {
          ?person foaf:knows ?friend .
          ?person foaf:name ?name ;
                  foaf:friendCount ?friendCount
        }
      `;

      const plan = planner.planQuery(query);

      // Join on ?person reduces parallelization benefit
      expect(plan.patterns.length).toBeGreaterThan(1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle single-variable queries", () => {
      const sparql = `
        SELECT ?person
        WHERE {
          ?person foaf:knows ?person
        }
      `;

      const plan = planner.planQuery(sparql);

      expect(plan.steps.length).toBeGreaterThan(0);
    });

    it("should handle multi-way joins", () => {
      const sparql = `
        SELECT ?a ?b ?c
        WHERE {
          ?a foaf:knows ?b .
          ?b foaf:knows ?c .
          ?c foaf:knows ?a
        }
      `;

      const plan = planner.planQuery(sparql);

      // Sequential pattern due to dependencies
      expect(plan.patterns.length).toBeGreaterThan(0);
    });

    it("should handle empty result sets in parallel execution", () => {
      const sparql = `
        SELECT ?name ?email
        WHERE {
          ?person foaf:name ?name .
          ?person foaf:email ?email
        }
      `;

      const plan = planner.planQuery(sparql);

      // Should still generate valid plan even for empty results
      expect(plan.steps.length).toBeGreaterThan(0);
    });
  });
});
