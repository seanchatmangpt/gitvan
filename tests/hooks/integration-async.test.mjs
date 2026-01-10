/**
 * Integration tests for async predicates, composite predicates, and context enrichment
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CompositePredicates } from "../../src/hooks/CompositePredicates.mjs";
import { ContextEnricher } from "../../src/hooks/ContextEnricher.mjs";

describe("Async and Composite Predicates Integration", () => {
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

  describe("Composite Predicates with Async Support", () => {
    it("should evaluate AND composite predicate with async", async () => {
      const predicates = [
        (ctx) => ctx.a > 0,
        (ctx) => ctx.b > 0,
        async (ctx) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return ctx.c > 0;
        },
      ];

      const result = await composite.AND(predicates, {
        a: 1,
        b: 2,
        c: 3,
      });

      expect(result.result).toBe(true);
      expect(result.operator).toBe("AND");
    });

    it("should evaluate OR composite predicate with async", async () => {
      const predicates = [
        (ctx) => ctx.value === "a",
        (ctx) => ctx.value === "b",
        async (ctx) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return ctx.value === "c";
        },
      ];

      const result = await composite.OR(predicates, {
        value: "c",
      });

      expect(result.result).toBe(true);
      expect(result.operator).toBe("OR");
    });

    it("should evaluate NOT composite predicate with async", async () => {
      const predicate = async (ctx) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return ctx.flag === true;
      };

      const result = await composite.NOT(predicate, {
        flag: false,
      });

      expect(result.result).toBe(true);
      expect(result.operator).toBe("NOT");
    });

    it("should evaluate VOTE composite predicate with async", async () => {
      const predicates = [
        { predicate: (ctx) => ctx.score > 50, weight: 1 },
        { predicate: (ctx) => ctx.score < 100, weight: 1 },
        { predicate: async (ctx) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return ctx.score % 2 === 0;
        }, weight: 1 },
      ];

      const result = await composite.VOTE(predicates, {
        score: 75,
      });

      expect(result.operator).toBe("VOTE");
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });
  });

  describe("Complex Predicate Chains", () => {
    it("should chain multiple async predicates with AND", async () => {
      const validators = [
        async (ctx) => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return ctx.username.length > 3;
        },
        async (ctx) => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return ctx.email.includes("@");
        },
        async (ctx) => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return ctx.password.length > 8;
        },
      ];

      const result = await composite.AND(validators, {
        username: "john_doe",
        email: "john@example.com",
        password: "securePass123",
      });

      expect(result.result).toBe(true);
      expect(result.evaluatedCount).toBe(3);
    });

    it("should evaluate conditional logic with nested predicates", async () => {
      const isProd = (ctx) => ctx.env === "production";
      const hasBackup = async (ctx) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return ctx.backup === true;
      };
      const isHealthy = (ctx) => ctx.health === "green";

      // In production: must have backup AND be healthy
      // Otherwise: just needs to be healthy
      const predicate = async (ctx) => {
        if (isProd(ctx)) {
          const backup = await hasBackup(ctx);
          const health = isHealthy(ctx);
          return backup && health;
        }
        return isHealthy(ctx);
      };

      const result1 = await composite.AND([predicate], {
        env: "development",
        health: "green",
      });

      expect(result1.result).toBe(true);

      const result2 = await composite.AND([predicate], {
        env: "production",
        backup: true,
        health: "green",
      });

      expect(result2.result).toBe(true);
    });
  });

  describe("Error Handling in Complex Scenarios", () => {
    it("should handle errors in composite AND gracefully", async () => {
      const predicates = [
        (ctx) => true,
        async () => {
          throw new Error("Network error");
        },
        (ctx) => true,
      ];

      const result = await composite.AND(predicates, {});

      expect(result.result).toBe(false);
      expect(result.results[1].success).toBe(false);
    });

    it("should recover from timeout and continue with OR", async () => {
      const predicates = [
        async () => {
          return new Promise((resolve) => {
            setTimeout(() => resolve(false), 1000);
          });
        },
        (ctx) => true, // This should succeed even though first timed out
      ];

      const result = await composite.OR(predicates, {});

      expect(result.result).toBe(true);
    });

    it("should handle timeout in VOTE operator", async () => {
      const predicates = [
        { predicate: (ctx) => true, weight: 1 },
        { predicate: async () => {
          return new Promise((resolve) => {
            setTimeout(() => resolve(true), 1000);
          });
        }, weight: 1 },
        { predicate: (ctx) => true, weight: 1 },
      ];

      const result = await composite.VOTE(predicates, {}, 0.5);

      expect(result.operator).toBe("VOTE");
      expect(result.votes.length).toBe(3);
    });
  });

  describe("Performance and Optimization", () => {
    it("should short-circuit AND operator efficiently", async () => {
      let executionCount = 0;

      const predicates = [
        () => {
          executionCount += 1;
          return true;
        },
        () => {
          executionCount += 1;
          return false;
        },
        () => {
          executionCount += 1;
          return true; // Should not execute
        },
      ];

      await composite.AND(predicates, {});

      expect(executionCount).toBe(2);
    });

    it("should short-circuit OR operator efficiently", async () => {
      let executionCount = 0;

      const predicates = [
        () => {
          executionCount += 1;
          return false;
        },
        () => {
          executionCount += 1;
          return true;
        },
        () => {
          executionCount += 1;
          return false; // Should not execute
        },
      ];

      await composite.OR(predicates, {});

      expect(executionCount).toBe(2);
    });
  });

  describe("Real-world Scenarios", () => {
    it("should validate commit eligibility with multiple checks", async () => {
      const checks = [
        async (ctx) => {
          // Check all tests pass
          await new Promise((resolve) => setTimeout(resolve, 10));
          return ctx.testsPassed === true;
        },
        async (ctx) => {
          // Check no lint errors
          await new Promise((resolve) => setTimeout(resolve, 10));
          return ctx.lintErrors === 0;
        },
        async (ctx) => {
          // Check security scan passed
          await new Promise((resolve) => setTimeout(resolve, 10));
          return ctx.securityPassed === true;
        },
      ];

      const commitContext = {
        testsPassed: true,
        lintErrors: 0,
        securityPassed: true,
      };

      const result = await composite.AND(checks, commitContext);

      expect(result.result).toBe(true);
      expect(result.evaluatedCount).toBe(3);
    });

    it("should evaluate feature flags with weighted voting", async () => {
      const checks = [
        { predicate: (ctx) => ctx.isEnabled === true, weight: 3 },
        { predicate: (ctx) => ctx.rolloutPercentage > 50, weight: 2 },
        { predicate: async (ctx) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return ctx.userInBeta === true;
        }, weight: 1 },
      ];

      const context = {
        isEnabled: true,
        rolloutPercentage: 75,
        userInBeta: true,
      };

      const result = await composite.VOTE(checks, context);

      expect(result.result).toBe(true);
      expect(result.score).toBeGreaterThan(0.5);
    });
  });

  describe("Determinism and Reproducibility", () => {
    it("should produce identical results for identical inputs", async () => {
      const predicate = async (ctx) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return ctx.value > ctx.threshold;
      };

      const context = { value: 100, threshold: 50 };

      const results = [];
      for (let i = 0; i < 3; i++) {
        const result = await composite.AND([predicate], context);
        results.push(result.result);
      }

      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);
    });

    it("should maintain order in composite evaluation", async () => {
      const executionOrder = [];

      const predicates = [
        async (ctx) => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          executionOrder.push(1);
          return true;
        },
        async (ctx) => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          executionOrder.push(2);
          return true;
        },
        async (ctx) => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          executionOrder.push(3);
          return true;
        },
      ];

      await composite.AND(predicates, {});

      expect(executionOrder).toEqual([1, 2, 3]);
    });
  });
});

describe("Context Enrichment Integration", () => {
  it("should use enriched context in predicates", async () => {
    const enricher = new ContextEnricher({
      cwd: process.cwd(),
      enableCache: false,
      logger: {
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
      },
    });

    const composite = new CompositePredicates({
      timeoutMs: 500,
    });

    // Predicate that depends on Git metadata
    const predicate = async (ctx) => {
      // Check if we have git metadata available
      return ctx.gitMetadata !== undefined;
    };

    const enrichedCtx = await enricher.enrich({});
    const result = await composite.AND([predicate], enrichedCtx);

    expect(result).toBeDefined();
    expect(result.operator).toBe("AND");
  });

  it("should work with context enricher in isolation", async () => {
    const enricher = new ContextEnricher({
      cwd: process.cwd(),
      enableCache: false,
    });

    const baseCtx = { userId: "test-user" };
    const enriched = await enricher.enrich(baseCtx);

    expect(enriched.userId).toBe("test-user");
    expect(typeof enriched).toBe("object");
  });
});
