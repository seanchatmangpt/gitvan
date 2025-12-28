/**
 * @fileoverview GitVan v4 - Performance Optimization Benchmark Tests
 *
 * Comprehensive benchmark tests for the performance optimization layer.
 * Measures improvements in memoization, caching, batching, and timing.
 *
 * @version 4.0.0
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  useMemo,
  useComputed,
  useWeakMemo,
  createSelector,
  useBatchMemo,
} from "../../src/performance/memoization.mjs";
import {
  useQueryCache,
  useResultCache,
  useComputedCache,
  useCacheManager,
} from "../../src/performance/cache-hooks.mjs";
import {
  createSelectiveStore,
  useLazy,
  useDependencyTracker,
} from "../../src/performance/subscriptions.mjs";
import {
  usePerformanceMonitor,
  createProfilingSession,
  useExecutionTracer,
} from "../../src/performance/monitoring.mjs";
import {
  useDebounce,
  useThrottle,
  useRateLimiter,
  useCoalescer,
  useAdaptiveTiming,
} from "../../src/performance/timing.mjs";
import {
  useBatchProcessor,
  useTransactionalBatch,
  usePriorityBatchQueue,
} from "../../src/performance/batch.mjs";

// Helper to simulate async operations
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to measure execution time
const measureTime = async (fn) => {
  const start = performance.now();
  const result = await fn();
  return { result, duration: performance.now() - start };
};

describe("Performance Optimization - Memoization", () => {
  describe("useMemo", () => {
    it("should memoize function results", async () => {
      let callCount = 0;
      const expensiveFn = async (x) => {
        callCount++;
        await delay(10);
        return x * 2;
      };

      const memoized = useMemo(expensiveFn, { maxSize: 10 });

      // First call - should execute
      const result1 = await memoized(5);
      expect(result1).toBe(10);
      expect(callCount).toBe(1);

      // Second call with same arg - should be cached
      const result2 = await memoized(5);
      expect(result2).toBe(10);
      expect(callCount).toBe(1);

      // Different arg - should execute
      const result3 = await memoized(10);
      expect(result3).toBe(20);
      expect(callCount).toBe(2);

      // Check stats
      const stats = memoized.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(2);
    });

    it("should improve performance on repeated calls", async () => {
      const slowFn = async (x) => {
        await delay(20);
        return x;
      };

      const memoized = useMemo(slowFn);

      // First call - slow
      const { duration: first } = await measureTime(() => memoized("test"));
      expect(first).toBeGreaterThan(15);

      // Second call - fast (cached)
      const { duration: second } = await measureTime(() => memoized("test"));
      expect(second).toBeLessThan(5);

      // Improvement factor
      const improvement = first / second;
      expect(improvement).toBeGreaterThan(4);
    });

    it("should respect TTL", async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        return "result";
      };

      const memoized = useMemo(fn, { ttl: 50 });

      await memoized();
      expect(callCount).toBe(1);

      await memoized();
      expect(callCount).toBe(1);

      // Wait for TTL to expire
      await delay(60);

      await memoized();
      expect(callCount).toBe(2);
    });

    it("should support cache invalidation", async () => {
      let callCount = 0;
      const fn = async (x) => {
        callCount++;
        return x;
      };

      const memoized = useMemo(fn);

      await memoized("a");
      await memoized("b");
      expect(callCount).toBe(2);

      // Clear cache
      memoized.clear();

      await memoized("a");
      expect(callCount).toBe(3);
    });
  });

  describe("useComputed", () => {
    it("should compute values lazily", () => {
      let computeCount = 0;
      let value = 5;

      const computed = useComputed(() => {
        computeCount++;
        return value * 2;
      }, [value]);

      // Not computed until accessed
      expect(computeCount).toBe(0);

      // First access
      expect(computed.get()).toBe(10);
      expect(computeCount).toBe(1);

      // Second access - cached
      expect(computed.get()).toBe(10);
      expect(computeCount).toBe(1);

      // Invalidate
      computed.invalidate();
      expect(computed.get()).toBe(10);
      expect(computeCount).toBe(2);
    });
  });

  describe("createSelector", () => {
    it("should memoize derived state", () => {
      let computeCount = 0;

      const selectItems = (state) => state.items;
      const selectFilter = (state) => state.filter;

      const selectFiltered = createSelector(
        [selectItems, selectFilter],
        (items, filter) => {
          computeCount++;
          return items.filter((item) => item.includes(filter));
        }
      );

      const state1 = { items: ["apple", "banana", "apricot"], filter: "ap" };
      const result1 = selectFiltered(state1);
      expect(result1).toEqual(["apple", "apricot"]);
      expect(computeCount).toBe(1);

      // Same state - cached
      const result2 = selectFiltered(state1);
      expect(result2).toBe(result1);
      expect(computeCount).toBe(1);

      // Different filter - recompute
      const state2 = { ...state1, filter: "ban" };
      const result3 = selectFiltered(state2);
      expect(result3).toEqual(["banana"]);
      expect(computeCount).toBe(2);
    });
  });
});

describe("Performance Optimization - Caching", () => {
  describe("useQueryCache", () => {
    it("should cache query results", async () => {
      const queryCache = useQueryCache({ maxSize: 100, ttl: 60000 });

      let queryCount = 0;
      const mockGraph = {
        query: async (q) => {
          queryCount++;
          await delay(10);
          return { results: [{ value: q }] };
        },
      };

      // First query
      const result1 = await queryCache.execute(mockGraph, "SELECT ?x WHERE { ?x ?y ?z }");
      expect(queryCount).toBe(1);

      // Same query - cached
      const result2 = await queryCache.execute(mockGraph, "SELECT ?x WHERE { ?x ?y ?z }");
      expect(queryCount).toBe(1);
      expect(result2).toEqual(result1);

      const stats = queryCache.getStats();
      expect(stats.l1Hits + stats.l2Hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it("should implement L1/L2 caching", async () => {
      const queryCache = useQueryCache();

      const mockGraph = {
        query: async (q) => ({ results: [q] }),
      };

      // Execute many queries to fill L1
      for (let i = 0; i < 60; i++) {
        await queryCache.execute(mockGraph, `query${i}`);
      }

      const stats = queryCache.getStats();
      expect(stats.l1Size).toBeLessThanOrEqual(50);
      expect(stats.l2Size).toBeGreaterThan(stats.l1Size);
    });
  });

  describe("useResultCache", () => {
    it("should cache and retrieve results", async () => {
      const cache = useResultCache({ maxSize: 100 });

      let computeCount = 0;
      const result = await cache.getOrCompute("key1", async () => {
        computeCount++;
        await delay(10);
        return "value1";
      });

      expect(result).toBe("value1");
      expect(computeCount).toBe(1);

      // Second call - cached
      const result2 = await cache.getOrCompute("key1", async () => {
        computeCount++;
        return "value1";
      });

      expect(result2).toBe("value1");
      expect(computeCount).toBe(1);

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });
  });
});

describe("Performance Optimization - Subscriptions", () => {
  describe("createSelectiveStore", () => {
    it("should notify only relevant subscribers", () => {
      const store = createSelectiveStore({
        users: [{ id: 1, name: "Alice" }],
        settings: { theme: "dark" },
      });

      let userNotifications = 0;
      let settingsNotifications = 0;

      store.subscribe(["users"], () => userNotifications++);
      store.subscribe(["settings", "theme"], () => settingsNotifications++);

      // Update settings
      store.set(["settings", "theme"], "light");
      store.flush();

      expect(settingsNotifications).toBe(1);
      expect(userNotifications).toBe(0);

      // Update users
      store.set(["users"], [{ id: 2, name: "Bob" }]);
      store.flush();

      expect(userNotifications).toBe(1);
      expect(settingsNotifications).toBe(1);
    });

    it("should batch updates", () => {
      const store = createSelectiveStore({ count: 0 });

      let notifications = 0;
      store.subscribe(["count"], () => notifications++);

      store.batch((s) => {
        s.set(["count"], 1);
        s.set(["count"], 2);
        s.set(["count"], 3);
      });

      // Should be batched into single notification
      expect(notifications).toBe(1);
      expect(store.get(["count"])).toBe(3);
    });
  });

  describe("useLazy", () => {
    it("should initialize lazily", async () => {
      let initCount = 0;
      const lazy = useLazy(async () => {
        initCount++;
        await delay(10);
        return "initialized";
      });

      expect(lazy.isInitialized).toBe(false);
      expect(initCount).toBe(0);

      const value = await lazy.get();
      expect(value).toBe("initialized");
      expect(lazy.isInitialized).toBe(true);
      expect(initCount).toBe(1);

      // Second call - already initialized
      await lazy.get();
      expect(initCount).toBe(1);
    });
  });
});

describe("Performance Optimization - Monitoring", () => {
  describe("usePerformanceMonitor", () => {
    it("should track operation performance", async () => {
      const monitor = usePerformanceMonitor({
        slowThreshold: 50,
        warnThreshold: 100,
      });

      await monitor.track("fastOp", async () => {
        await delay(10);
        return "fast";
      });

      await monitor.track("slowOp", async () => {
        await delay(60);
        return "slow";
      });

      const metrics = monitor.getMetrics("fastOp");
      expect(metrics.count).toBe(1);
      expect(metrics.avgTime).toBeLessThan(50);

      const slowMetrics = monitor.getMetrics("slowOp");
      expect(slowMetrics.count).toBe(1);
      expect(slowMetrics.avgTime).toBeGreaterThan(50);

      const aggregates = monitor.getAggregates();
      expect(aggregates.totalOperations).toBe(2);
      expect(aggregates.slowCount).toBe(1);
    });

    it("should generate performance report", async () => {
      const monitor = usePerformanceMonitor();

      for (let i = 0; i < 10; i++) {
        await monitor.track("op", async () => {
          await delay(5);
        });
      }

      const report = monitor.getReport();
      expect(report.summary.totalOperations).toBe(10);
      expect(report.operationTypes.op).toBeDefined();
      expect(parseFloat(report.operationTypes.op.avgTime)).toBeLessThan(50);
    });
  });

  describe("createProfilingSession", () => {
    it("should track execution timeline", async () => {
      const session = createProfilingSession("test-session");

      session.mark("start");
      await delay(10);
      session.mark("step1");
      await delay(20);
      session.mark("step2");

      const result = session.end();

      expect(result.markCount).toBeGreaterThanOrEqual(3); // At minimum: start, step1, step2
      expect(result.totalDuration).toBeGreaterThan(25);

      // Verify marks were created
      expect(result.timeline.map(m => m.label)).toContain("start");

      const timeline = result.timeline;
      expect(timeline.length).toBeGreaterThanOrEqual(3);
    });
  });
});

describe("Performance Optimization - Timing", () => {
  describe("useDebounce", () => {
    it("should debounce function calls", async () => {
      let callCount = 0;
      const fn = async (x) => {
        callCount++;
        return x;
      };

      const debounced = useDebounce(fn, 50);

      // Multiple calls
      debounced(1);
      debounced(2);
      debounced(3);

      expect(callCount).toBe(0);

      // Wait for debounce
      await delay(60);

      expect(callCount).toBe(1);

      const stats = debounced.getStats();
      expect(stats.calls).toBe(3);
      expect(stats.executions).toBe(1);
    });
  });

  describe("useThrottle", () => {
    it("should throttle function calls", async () => {
      let callCount = 0;
      const fn = (x) => {
        callCount++;
        return x;
      };

      const throttled = useThrottle(fn, 50);

      // Rapid calls
      throttled(1);
      throttled(2);
      throttled(3);

      expect(callCount).toBe(1); // First call executes immediately

      await delay(60);

      const stats = throttled.getStats();
      expect(stats.calls).toBe(3);
      expect(stats.throttled).toBe(2);
    });
  });

  describe("useRateLimiter", () => {
    it("should limit request rate", async () => {
      const limiter = useRateLimiter({
        tokensPerInterval: 2,
        interval: 100,
        maxBurst: 2,
      });

      // Should succeed
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(true);

      // Should fail - no tokens
      expect(limiter.tryAcquire()).toBe(false);

      // Wait for refill
      await delay(110);

      expect(limiter.tryAcquire()).toBe(true);
    });
  });

  describe("useCoalescer", () => {
    it("should batch multiple requests", async () => {
      let batchCount = 0;
      const coalescer = useCoalescer(
        async (keys) => {
          batchCount++;
          // Return a map of key -> result
          const results = {};
          for (const k of keys) {
            results[k] = k.toUpperCase();
          }
          return results;
        },
        { maxWait: 20 }
      );

      // Make multiple concurrent requests
      const [r1, r2, r3] = await Promise.all([
        coalescer.request("a"),
        coalescer.request("b"),
        coalescer.request("c"),
      ]);

      // Should be batched into single call
      expect(batchCount).toBe(1);
      expect(r1).toBe("A");
      expect(r2).toBe("B");
      expect(r3).toBe("C");
    });
  });
});

describe("Performance Optimization - Batch Processing", () => {
  describe("useBatchProcessor", () => {
    it("should batch items for processing", async () => {
      let batchCount = 0;
      const batcher = useBatchProcessor({
        maxBatchSize: 5,
        maxWaitMs: 50,
        processFn: async (items) => {
          batchCount++;
          return items.map((i) => i * 2);
        },
      });

      // Add items
      const promises = [];
      for (let i = 1; i <= 10; i++) {
        promises.push(batcher.add(i));
      }

      const results = await Promise.all(promises);

      // Should process in 2 batches
      expect(batchCount).toBe(2);
      expect(results).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
    });
  });

  describe("useTransactionalBatch", () => {
    it("should support transactional updates", async () => {
      const updates = [];
      const tx = useTransactionalBatch({
        onCommit: async (ops) => {
          updates.push(...ops);
        },
      });

      tx.begin();
      tx.update("key1", "value1");
      tx.update("key2", "value2");

      const result = await tx.commit();

      expect(result.length).toBe(2);
      expect(updates.length).toBe(2);
    });

    it("should support rollback", async () => {
      let committed = false;
      let rolledBack = false;

      const tx = useTransactionalBatch({
        onCommit: async () => {
          committed = true;
          throw new Error("Commit failed");
        },
        onRollback: async () => {
          rolledBack = true;
        },
      });

      tx.begin();
      tx.update("key1", "value1");

      await expect(tx.commit()).rejects.toThrow("Commit failed");
      expect(rolledBack).toBe(true);
    });
  });

  describe("usePriorityBatchQueue", () => {
    it("should process by priority", async () => {
      const processOrder = [];
      const queue = usePriorityBatchQueue({
        priorities: ["critical", "high", "normal"],
        processFn: async (items, priority) => {
          processOrder.push(priority);
        },
        batchSize: 1,
        processInterval: 10,
      });

      queue.enqueue("item1", "normal");
      queue.enqueue("item2", "critical");
      queue.enqueue("item3", "high");

      await queue.flush();

      // Critical should be processed first
      expect(processOrder[0]).toBe("critical");
    });
  });
});

describe("Performance Benchmarks", () => {
  it("should demonstrate memoization improvement", async () => {
    const iterations = 100;

    // Without memoization
    let unmemoizedTime = 0;
    const slowFn = async (x) => {
      await delay(1);
      return x * 2;
    };

    for (let i = 0; i < iterations; i++) {
      const { duration } = await measureTime(() => slowFn(i % 10));
      unmemoizedTime += duration;
    }

    // With memoization
    let memoizedTime = 0;
    const memoizedFn = useMemo(slowFn);

    for (let i = 0; i < iterations; i++) {
      const { duration } = await measureTime(() => memoizedFn(i % 10));
      memoizedTime += duration;
    }

    console.log(`Unmemoized: ${unmemoizedTime.toFixed(2)}ms`);
    console.log(`Memoized: ${memoizedTime.toFixed(2)}ms`);
    console.log(`Improvement: ${(unmemoizedTime / memoizedTime).toFixed(2)}x`);

    expect(memoizedTime).toBeLessThan(unmemoizedTime);
  });

  it("should demonstrate batching efficiency", async () => {
    const itemCount = 100;

    // Without batching - individual processing
    let individualTime = 0;
    const processOne = async (item) => {
      await delay(1);
      return item * 2;
    };

    const start1 = performance.now();
    for (let i = 0; i < itemCount; i++) {
      await processOne(i);
    }
    individualTime = performance.now() - start1;

    // With batching
    let batchTime = 0;
    const batcher = useBatchProcessor({
      maxBatchSize: 50,
      maxWaitMs: 5,
      processFn: async (items) => {
        await delay(1);
        return items.map((i) => i * 2);
      },
    });

    const start2 = performance.now();
    const promises = [];
    for (let i = 0; i < itemCount; i++) {
      promises.push(batcher.add(i));
    }
    await Promise.all(promises);
    batchTime = performance.now() - start2;

    console.log(`Individual: ${individualTime.toFixed(2)}ms`);
    console.log(`Batched: ${batchTime.toFixed(2)}ms`);
    console.log(`Improvement: ${(individualTime / batchTime).toFixed(2)}x`);

    expect(batchTime).toBeLessThan(individualTime);
  });

  it("should demonstrate cache effectiveness", async () => {
    const queryCache = useQueryCache({ maxSize: 50 });
    const iterations = 100;

    let queryCount = 0;
    const mockGraph = {
      query: async (q) => {
        queryCount++;
        await delay(2);
        return { results: [q] };
      },
    };

    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      const queryNum = i % 10;
      await queryCache.execute(mockGraph, `SELECT * WHERE { ?x ?y ${queryNum} }`);
    }

    const duration = performance.now() - start;
    const stats = queryCache.getStats();

    console.log(`Total queries: ${iterations}`);
    console.log(`Actual executions: ${queryCount}`);
    console.log(`Cache hit rate: ${stats.hitRate}`);
    console.log(`Total time: ${duration.toFixed(2)}ms`);

    expect(stats.l1Hits + stats.l2Hits).toBeGreaterThan(50);
  });
});
