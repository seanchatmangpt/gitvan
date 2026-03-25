/**
 * Test suite for async predicate support with timeout handling
 * Tests the composite predicates which form the foundation of async support
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CompositePredicates } from "../../src/hooks/CompositePredicates.mjs";

describe("Async Predicate Support (via CompositePredicates)", () => {
  let composite;

  beforeEach(() => {
    composite = new CompositePredicates({
      timeoutMs: 100,
      logger: {
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
      },
    });
  });

  describe("Basic Async Execution", () => {
    it("should evaluate sync predicates that return boolean", async () => {
      const predicates = [() => true];
      const result = await composite.AND(predicates, {});

      expect(result.result).toBe(true);
    });

    it("should evaluate async predicates that return promise", async () => {
      const predicates = [async () => true];
      const result = await composite.AND(predicates, {});

      expect(result.result).toBe(true);
    });

    it("should evaluate predicates that return falsy values", async () => {
      const predicates = [async () => false];
      const result = await composite.AND(predicates, {});

      expect(result.result).toBe(false);
    });

    it("should coerce truthy values to boolean", async () => {
      const predicates = [async () => "truthy string"];
      const result = await composite.AND(predicates, {});

      // Note: The AND operator expects boolean predicates
      // but will handle truthy/falsy in evaluation
      expect(result.result).toBe(true);
    });

    it("should coerce falsy values to boolean", async () => {
      const predicates = [async () => 0];
      const result = await composite.AND(predicates, {});

      expect(result.result).toBe(false);
    });
  });

  describe("Timeout Handling", () => {
    it("should timeout slow async predicates", async () => {
      const slowPredicate = async () => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(true), 500);
        });
      };

      const result = await composite.AND([slowPredicate], {});

      expect(result.result).toBe(false);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain("timeout");
    });

    it("should succeed for predicates faster than timeout", async () => {
      const fastPredicate = async () => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(true), 10);
        });
      };

      const result = await composite.AND([fastPredicate], {});

      expect(result.result).toBe(true);
      expect(result.results[0].success).toBe(true);
    });

    it("should timeout predicates exactly at timeout boundary", async () => {
      const timeoutComposite = new CompositePredicates({
        timeoutMs: 50,
        logger: {
          info: () => {},
          warn: () => {},
          error: () => {},
          debug: () => {},
        },
      });

      const boundaryPredicate = async () => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(true), 60);
        });
      };

      const result = await timeoutComposite.AND([boundaryPredicate], {});

      expect(result.result).toBe(false);
    });

    it("should support custom timeout via constructor", async () => {
      const customComposite = new CompositePredicates({
        timeoutMs: 200,
        logger: {
          info: () => {},
          warn: () => {},
          error: () => {},
          debug: () => {},
        },
      });

      const predicate = async () => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(true), 150);
        });
      };

      const result = await customComposite.AND([predicate], {});

      expect(result.result).toBe(true);
      expect(result.results[0].success).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle predicate function errors gracefully", async () => {
      const errorPredicate = async () => {
        throw new Error("Predicate failed");
      };

      const result = await composite.AND([errorPredicate], {});

      expect(result.result).toBe(false);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain("Predicate failed");
    });

    it("should handle sync errors in async predicates", async () => {
      const syncErrorPredicate = () => {
        throw new Error("Sync error");
      };

      const result = await composite.AND([syncErrorPredicate], {});

      expect(result.result).toBe(false);
      expect(result.results[0].success).toBe(false);
    });

    it("should reject non-function predicates", async () => {
      const result = await composite.AND(["not a function"], {});

      expect(result.result).toBe(false);
      expect(result.results[0].error).toContain("function");
    });

    it("should handle promise rejection", async () => {
      const rejectingPredicate = async () => {
        return Promise.reject(new Error("Promise rejected"));
      };

      const result = await composite.AND([rejectingPredicate], {});

      expect(result.result).toBe(false);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain("Promise rejected");
    });
  });

  describe("Context Passing", () => {
    it("should pass context to predicates", async () => {
      let receivedContext = null;

      const predicate = async (ctx) => {
        receivedContext = ctx;
        return true;
      };

      const customContext = { custom: "value" };
      await composite.AND([predicate], customContext);

      expect(receivedContext).toBeDefined();
      expect(receivedContext.custom).toBe("value");
    });

    it("should pass empty context if not provided", async () => {
      let receivedContext = null;

      const predicate = async (ctx) => {
        receivedContext = ctx;
        return true;
      };

      await composite.AND([predicate], {});

      expect(receivedContext).toBeDefined();
      expect(typeof receivedContext).toBe("object");
    });

    it("should preserve context through async operations", async () => {
      let contextSnapshot = null;

      const predicate = async (ctx) => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        contextSnapshot = { ...ctx };
        return true;
      };

      const initialContext = { timestamp: 12345, userId: "user1" };
      await composite.AND([predicate], initialContext);

      expect(contextSnapshot.timestamp).toBe(12345);
      expect(contextSnapshot.userId).toBe("user1");
    });
  });

  describe("Parallel Async Execution in AND", () => {
    it("should handle multiple async predicates sequentially", async () => {
      const predicate1 = async () => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(true), 20);
        });
      };

      const predicate2 = async () => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(true), 30);
        });
      };

      const result = await composite.AND([predicate1, predicate2], {});

      expect(result.result).toBe(true);
      expect(result.evaluatedCount).toBe(2);
    });

    it("should timeout one predicate without affecting evaluation logic", async () => {
      const slowPredicate = async () => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(true), 500);
        });
      };

      const fastPredicate = async () => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(true), 10);
        });
      };

      const result = await composite.AND([slowPredicate, fastPredicate], {});

      expect(result.result).toBe(false);
      expect(result.results[0].success).toBe(false);
    });
  });

  describe("Deterministic Behavior", () => {
    it("should always return same result for same input", async () => {
      const deterministicPredicate = async (ctx) => {
        return ctx.value === 42;
      };

      const context = { value: 42 };

      const result1 = await composite.AND([deterministicPredicate], context);
      const result2 = await composite.AND([deterministicPredicate], context);

      expect(result1.result).toBe(result2.result);
      expect(result1.evaluatedCount).toBe(result2.evaluatedCount);
    });

    it("should not depend on timing variations", async () => {
      const pred = async (ctx) => ctx.condition === true;

      const context = { condition: true };

      const results = [];
      for (let i = 0; i < 5; i++) {
        const result = await composite.AND([pred], context);
        results.push(result.result);
      }

      // All results should be identical
      expect(results.every((r) => r === true)).toBe(true);
    });
  });

  describe("Async Wrapper for Individual Predicates", () => {
    it("should have internal timeout protection mechanism", async () => {
      // Test that timeouts are enforced internally
      const timeoutComposite = new CompositePredicates({
        timeoutMs: 50,
      });

      const slowFn = async () => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(true), 200);
        });
      };

      const result = await timeoutComposite.AND([slowFn], {});

      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain("timeout");
    });

    it("should handle multiple timeouts in same call", async () => {
      const predicates = [
        async () => new Promise((r) => setTimeout(() => r(true), 200)),
        async () => new Promise((r) => setTimeout(() => r(true), 200)),
        async () => new Promise((r) => setTimeout(() => r(true), 200)),
      ];

      const result = await composite.AND(predicates, {});

      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain("timeout");
    });
  });

  describe("OR Operator with Async", () => {
    it("should short-circuit OR on first true async predicate", async () => {
      let callCount = 0;

      const predicates = [
        async () => {
          callCount += 1;
          await new Promise((r) => setTimeout(r, 10));
          return false;
        },
        async () => {
          callCount += 1;
          await new Promise((r) => setTimeout(r, 10));
          return true;
        },
        async () => {
          callCount += 1; // Should not be called
          return false;
        },
      ];

      await composite.OR(predicates, {});

      expect(callCount).toBe(2);
    });
  });

  describe("NOT Operator with Async", () => {
    it("should negate async true to false", async () => {
      const asyncTrue = async () => {
        await new Promise((r) => setTimeout(r, 10));
        return true;
      };

      const result = await composite.NOT(asyncTrue, {});

      expect(result.result).toBe(false);
      expect(result.originalResult).toBe(true);
    });

    it("should timeout in NOT operator", async () => {
      const slowPred = async () => {
        return new Promise((r) => {
          setTimeout(() => r(true), 500);
        });
      };

      const result = await composite.NOT(slowPred, {});

      expect(result.result).toBe(true); // Fail open
      expect(result.success).toBe(false);
    });
  });

  describe("VOTE Operator with Async", () => {
    it("should handle async predicates in VOTE", async () => {
      const predicates = [
        { predicate: async () => {
          await new Promise((r) => setTimeout(r, 10));
          return true;
        }, weight: 1 },
        { predicate: async () => {
          await new Promise((r) => setTimeout(r, 10));
          return false;
        }, weight: 1 },
      ];

      const result = await composite.VOTE(predicates, {}, 0.5);

      expect(result.score).toBeCloseTo(0.5, 1);
    });

    it("should handle timeouts in VOTE voting", async () => {
      const predicates = [
        { predicate: async () => new Promise((r) => {
          setTimeout(() => r(true), 500);
        }), weight: 1 },
        { predicate: async () => {
          await new Promise((r) => setTimeout(r, 10));
          return true;
        }, weight: 1 },
      ];

      const result = await composite.VOTE(predicates, {}, 0.5);

      expect(result.votes.length).toBe(2);
      // First vote should have failed due to timeout
      expect(result.votes[0].success).toBe(false);
    });
  });
});
