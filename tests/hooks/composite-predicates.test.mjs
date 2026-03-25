/**
 * Test suite for composite predicates (AND/OR/NOT/VOTE)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CompositePredicates } from "../../src/hooks/CompositePredicates.mjs";

describe("Composite Predicates", () => {
  let composite;

  beforeEach(() => {
    composite = new CompositePredicates({
      timeoutMs: 500,
      logger: {
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
      },
    });
  });

  describe("AND Operator", () => {
    it("should return true when all predicates are true", async () => {
      const predicates = [
        () => true,
        () => true,
        () => true,
      ];

      const result = await composite.AND(predicates, {});

      expect(result.result).toBe(true);
      expect(result.operator).toBe("AND");
      expect(result.evaluatedCount).toBe(3);
    });

    it("should return false when any predicate is false", async () => {
      const predicates = [
        () => true,
        () => false,
        () => true,
      ];

      const result = await composite.AND(predicates, {});

      expect(result.result).toBe(false);
      expect(result.shortCircuited).toBe(true);
      expect(result.evaluatedCount).toBe(2); // Short-circuited after second
    });

    it("should short-circuit on first false", async () => {
      let evaluationCount = 0;

      const predicates = [
        () => {
          evaluationCount += 1;
          return true;
        },
        () => {
          evaluationCount += 1;
          return false;
        },
        () => {
          evaluationCount += 1;
          return true; // Should not be called
        },
      ];

      const result = await composite.AND(predicates, {});

      expect(result.result).toBe(false);
      expect(evaluationCount).toBe(2);
      expect(result.shortCircuited).toBe(true);
    });

    it("should handle async predicates", async () => {
      const predicates = [
        async () => true,
        async () => true,
        async () => false,
      ];

      const result = await composite.AND(predicates, {});

      expect(result.result).toBe(false);
      expect(result.evaluatedCount).toBe(3);
    });

    it("should return true for empty predicate array", async () => {
      const result = await composite.AND([], {});

      expect(result.result).toBe(true);
      expect(result.evaluatedCount).toBe(0);
    });

    it("should handle predicate errors", async () => {
      const predicates = [
        () => true,
        () => {
          throw new Error("Predicate error");
        },
      ];

      const result = await composite.AND(predicates, {});

      expect(result.result).toBe(false);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toContain("Predicate error");
    });

    it("should pass context to all predicates", async () => {
      const contexts = [];

      const predicates = [
        (ctx) => {
          contexts.push(ctx);
          return true;
        },
        (ctx) => {
          contexts.push(ctx);
          return true;
        },
      ];

      const testContext = { test: "value" };
      await composite.AND(predicates, testContext);

      expect(contexts.length).toBe(2);
      expect(contexts[0].test).toBe("value");
      expect(contexts[1].test).toBe("value");
    });
  });

  describe("OR Operator", () => {
    it("should return true when any predicate is true", async () => {
      const predicates = [
        () => false,
        () => true,
        () => false,
      ];

      const result = await composite.OR(predicates, {});

      expect(result.result).toBe(true);
      expect(result.shortCircuited).toBe(true);
    });

    it("should return false when all predicates are false", async () => {
      const predicates = [
        () => false,
        () => false,
        () => false,
      ];

      const result = await composite.OR(predicates, {});

      expect(result.result).toBe(false);
      expect(result.evaluatedCount).toBe(3);
    });

    it("should short-circuit on first true", async () => {
      let evaluationCount = 0;

      const predicates = [
        () => {
          evaluationCount += 1;
          return false;
        },
        () => {
          evaluationCount += 1;
          return true;
        },
        () => {
          evaluationCount += 1;
          return false; // Should not be called
        },
      ];

      const result = await composite.OR(predicates, {});

      expect(result.result).toBe(true);
      expect(evaluationCount).toBe(2);
      expect(result.shortCircuited).toBe(true);
    });

    it("should continue on errors in OR", async () => {
      const predicates = [
        () => false,
        () => {
          throw new Error("Error");
        },
        () => true,
      ];

      const result = await composite.OR(predicates, {});

      expect(result.result).toBe(true);
      expect(result.evaluatedCount).toBe(3);
    });

    it("should return false for empty predicate array", async () => {
      const result = await composite.OR([], {});

      expect(result.result).toBe(false);
      expect(result.evaluatedCount).toBe(0);
    });
  });

  describe("NOT Operator", () => {
    it("should negate true to false", async () => {
      const predicate = () => true;
      const result = await composite.NOT(predicate, {});

      expect(result.result).toBe(false);
      expect(result.originalResult).toBe(true);
      expect(result.operator).toBe("NOT");
    });

    it("should negate false to true", async () => {
      const predicate = () => false;
      const result = await composite.NOT(predicate, {});

      expect(result.result).toBe(true);
      expect(result.originalResult).toBe(false);
    });

    it("should handle async predicates", async () => {
      const predicate = async () => true;
      const result = await composite.NOT(predicate, {});

      expect(result.result).toBe(false);
    });

    it("should fail open on error (return true)", async () => {
      const errorPredicate = () => {
        throw new Error("Failed");
      };

      const result = await composite.NOT(errorPredicate, {});

      expect(result.result).toBe(true); // Fail open
      expect(result.success).toBe(false);
    });
  });

  describe("VOTE Operator", () => {
    it("should calculate weighted score correctly", async () => {
      const predicates = [
        { predicate: () => true, weight: 1 },
        { predicate: () => true, weight: 1 },
        { predicate: () => false, weight: 1 },
      ];

      const result = await composite.VOTE(predicates, {});

      expect(result.weightedScore).toBe(2);
      expect(result.totalWeight).toBe(3);
      expect(result.score).toBeCloseTo(2 / 3, 5);
    });

    it("should use threshold for decision", async () => {
      const predicates = [
        { predicate: () => true, weight: 1 },
        { predicate: () => false, weight: 1 },
        { predicate: () => false, weight: 1 },
      ];

      const result = await composite.VOTE(predicates, {}, 0.5);

      expect(result.score).toBeCloseTo(1 / 3, 5);
      expect(result.threshold).toBe(0.5);
      expect(result.result).toBe(false);
    });

    it("should support custom weights", async () => {
      const predicates = [
        { predicate: () => true, weight: 5 },
        { predicate: () => false, weight: 1 },
      ];

      const result = await composite.VOTE(predicates, {}, 0.5);

      expect(result.weightedScore).toBe(5);
      expect(result.totalWeight).toBe(6);
      expect(result.score).toBeCloseTo(5 / 6, 5);
      expect(result.result).toBe(true);
    });

    it("should default weight to 1", async () => {
      const predicates = [
        { predicate: () => true }, // No weight specified
        { predicate: () => true, weight: 1 },
      ];

      const result = await composite.VOTE(predicates, {}, 0.5);

      expect(result.totalWeight).toBe(2);
      expect(result.weightedScore).toBe(2);
    });

    it("should return false for empty predicates", async () => {
      const result = await composite.VOTE([], {}, 0.5);

      expect(result.result).toBe(false);
      expect(result.score).toBe(0);
    });

    it("should handle predicate errors in voting", async () => {
      const predicates = [
        { predicate: () => true, weight: 1 },
        { predicate: () => { throw new Error("Error"); }, weight: 1 },
        { predicate: () => true, weight: 1 },
      ];

      const result = await composite.VOTE(predicates, {}, 0.5);

      expect(result.votes.length).toBe(3);
      expect(result.votes[1].success).toBe(false);
    });
  });

  describe("Timeout Handling", () => {
    it("should timeout slow predicates in AND", async () => {
      const predicates = [
        () => true,
        async () => {
          return new Promise((resolve) => {
            setTimeout(() => resolve(true), 1000);
          });
        },
      ];

      const result = await composite.AND(predicates, {});

      expect(result.result).toBe(false);
      expect(result.results[1].success).toBe(false);
    });

    it("should timeout slow predicates in OR", async () => {
      const predicates = [
        () => false,
        async () => {
          return new Promise((resolve) => {
            setTimeout(() => resolve(true), 1000);
          });
        },
      ];

      const result = await composite.OR(predicates, {});

      expect(result.result).toBe(false);
    });
  });

  describe("Combine Results", () => {
    it("should combine multiple composite results", async () => {
      const composite1 = composite.AND(
        [() => true, () => true],
        {}
      );
      const composite2 = composite.OR(
        [() => false, () => true],
        {}
      );

      const combined = await composite.combineResults(
        [composite1, composite2],
        {}
      );

      expect(combined.result).toBe(true);
      expect(combined.combinedCount).toBe(2);
    });

    it("should short-circuit on first failed combined result", async () => {
      const composite1 = composite.AND(
        [() => true, () => false],
        {}
      );
      const composite2 = composite.OR(
        [() => true, () => false],
        {}
      );

      const combined = await composite.combineResults(
        [composite1, composite2],
        {}
      );

      expect(combined.result).toBe(false);
    });
  });

  describe("Deterministic Behavior", () => {
    it("should evaluate predicates in order", async () => {
      const order = [];

      const predicates = [
        () => {
          order.push(1);
          return true;
        },
        () => {
          order.push(2);
          return true;
        },
        () => {
          order.push(3);
          return true;
        },
      ];

      await composite.AND(predicates, {});

      expect(order).toEqual([1, 2, 3]);
    });

    it("should always produce same results for same inputs", async () => {
      const predicates = [
        (ctx) => ctx.value > 50,
        (ctx) => ctx.value < 100,
      ];

      const context = { value: 75 };

      const result1 = await composite.AND(predicates, context);
      const result2 = await composite.AND(predicates, context);

      expect(result1.result).toBe(result2.result);
      expect(result1.evaluatedCount).toBe(result2.evaluatedCount);
    });
  });
});
