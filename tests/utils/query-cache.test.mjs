/**
 * Tests for QueryCache Utility
 * @fileoverview Comprehensive test suite for SPARQL query result caching
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { QueryCache } from "../../src/utils/query-cache.mjs";

// Mock query executor for testing
async function mockExecuteQuery(results = []) {
  return Promise.resolve(results);
}

describe("QueryCache - SPARQL Query Result Caching", () => {
  let cache;

  beforeEach(() => {
    cache = new QueryCache({
      maxEntries: 100,
      defaultTTL: 5000,
    });
  });

  describe("Initialization", () => {
    it("should create cache with default options", () => {
      const c = new QueryCache();
      expect(c).toBeDefined();
      expect(c.cache).toBeDefined();
      expect(c.stats).toBeDefined();
    });

    it("should accept custom options", () => {
      const c = new QueryCache({
        maxEntries: 500,
        defaultTTL: 10000,
      });
      expect(c.maxEntries).toBe(500);
      expect(c.defaultTTL).toBe(10000);
    });

    it("should initialize with empty cache", () => {
      expect(cache.cache.size).toBe(0);
      expect(cache.getStats().hits).toBe(0);
      expect(cache.getStats().misses).toBe(0);
    });

    it("should cap maxTTL at 1 hour", () => {
      const c = new QueryCache({ maxTTL: 5 * 3600000 }); // 5 hours
      expect(c.maxTTL).toBe(3600000); // 1 hour
    });
  });

  describe("query() - Basic Caching", () => {
    it("should execute query on cache miss", async () => {
      const executor = vi.fn(async () => [{ result: "data" }]);

      const result = await cache.query(
        "SELECT * WHERE { ?s ?p ?o }",
        executor
      );

      expect(executor).toHaveBeenCalled();
      expect(result).toEqual([{ result: "data" }]);
      expect(cache.getStats().misses).toBe(1);
    });

    it("should return cached result on cache hit", async () => {
      const executor = vi.fn(async () => [{ result: "data" }]);

      // First query (miss)
      await cache.query("SELECT * WHERE { ?s ?p ?o }", executor);

      // Second query (hit)
      await cache.query("SELECT * WHERE { ?s ?p ?o }", executor);

      // Executor called only once
      expect(executor).toHaveBeenCalledTimes(1);
      expect(cache.getStats().hits).toBe(1);
      expect(cache.getStats().misses).toBe(1);
    });

    it("should handle whitespace normalization", async () => {
      const executor = vi.fn(async () => [{ result: "data" }]);

      const query1 = "SELECT * WHERE { ?s ?p ?o }";
      const query2 = "SELECT  *  WHERE  {  ?s  ?p  ?o  }";

      await cache.query(query1, executor);
      await cache.query(query2, executor);

      // Should be treated as same query
      expect(executor).toHaveBeenCalledTimes(1);
      expect(cache.getStats().hits).toBe(1);
    });

    it("should normalize PREFIX queries", async () => {
      const executor = vi.fn(async () => []);

      const query1 = "PREFIX ex: <http://example.com/> SELECT * WHERE { }";
      const query2 = "PREFIX  ex:  <http://example.com/>  SELECT  *  WHERE  {  }";

      await cache.query(query1, executor);
      await cache.query(query2, executor);

      expect(executor).toHaveBeenCalledTimes(1);
    });

    it("should reject invalid query type", async () => {
      await expect(cache.query(123, mockExecuteQuery)).rejects.toThrow(
        "Query must be a string"
      );
    });

    it("should reject invalid executor type", async () => {
      await expect(
        cache.query("SELECT * WHERE { }", "not-a-function")
      ).rejects.toThrow("executeQuery must be a function");
    });
  });

  describe("TTL Management", () => {
    it("should use default TTL", async () => {
      cache = new QueryCache({ defaultTTL: 2000 });
      await cache.query("SELECT *", mockExecuteQuery);

      const info = cache.getEntryInfo("SELECT *");
      expect(info.ttl).toBe(2000);
    });

    it("should allow per-query TTL override", async () => {
      await cache.query("SELECT *", mockExecuteQuery, { ttl: 1000 });

      const info = cache.getEntryInfo("SELECT *");
      expect(info.ttl).toBe(1000);
    });

    it("should expire entries after TTL", async () => {
      cache = new QueryCache({ defaultTTL: 100 });

      await cache.query("SELECT *", mockExecuteQuery);
      expect(cache.get("SELECT *")).toBeDefined();

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(cache.get("SELECT *")).toBeNull();
    });

    it("should not use expired cached result", async () => {
      cache = new QueryCache({ defaultTTL: 100 });
      const executor = vi.fn(async () => [{ data: "result" }]);

      await cache.query("SELECT *", executor);
      expect(executor).toHaveBeenCalledTimes(1);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      await cache.query("SELECT *", executor);
      expect(executor).toHaveBeenCalledTimes(2);
    });

    it("should cap TTL at maxTTL", async () => {
      cache = new QueryCache({ maxTTL: 5000 });

      await cache.query("SELECT *", mockExecuteQuery, { ttl: 10000 });

      const info = cache.getEntryInfo("SELECT *");
      expect(info.ttl).toBe(5000);
    });
  });

  describe("invalidate()", () => {
    beforeEach(async () => {
      await cache.query("SELECT * WHERE { ?event a ex:PostCommitEvent }", mockExecuteQuery);
      await cache.query("SELECT * WHERE { ?event a ex:PreCommitEvent }", mockExecuteQuery);
      await cache.query("SELECT * WHERE { ?measurement a ex:Measurement }", mockExecuteQuery);
    });

    it("should invalidate entries by string pattern", () => {
      const result = cache.invalidate("PostCommit");
      expect(result.matchCount).toBe(1);
      expect(cache.cache.size).toBe(2);
    });

    it("should invalidate entries by regex pattern", () => {
      const result = cache.invalidate(/event/i);
      expect(result.matchCount).toBe(2);
      expect(cache.cache.size).toBe(1);
    });

    it("should track invalidation count", () => {
      cache.invalidate("event");
      let stats = cache.getStats();
      expect(stats.invalidations).toBeGreaterThan(0);

      cache.invalidate("measurement");
      stats = cache.getStats();
      expect(stats.invalidations).toBeGreaterThan(2);
    });

    it("should update access order on invalidation", () => {
      const initialSize = cache.accessOrder.length;
      cache.invalidate("PostCommit");
      expect(cache.accessOrder.length).toBeLessThan(initialSize);
    });

    it("should reject invalid pattern type", () => {
      expect(() => cache.invalidate(123)).toThrow(
        "Pattern must be string or RegExp"
      );
    });
  });

  describe("set() - Manual Cache Entry", () => {
    it("should set cache entry", () => {
      const result = [{ id: 1, name: "test" }];
      cache.set("SELECT *", result);

      expect(cache.get("SELECT *")).toEqual(result);
    });

    it("should override existing entry", () => {
      cache.set("SELECT *", [{ data: "old" }]);
      cache.set("SELECT *", [{ data: "new" }]);

      expect(cache.get("SELECT *")).toEqual([{ data: "new" }]);
    });

    it("should accept custom TTL", () => {
      cache.set("SELECT *", [], { ttl: 2000 });

      const info = cache.getEntryInfo("SELECT *");
      expect(info.ttl).toBe(2000);
    });

    it("should update LRU order", () => {
      cache.set("SELECT * 1", []);
      cache.set("SELECT * 2", []);
      cache.set("SELECT * 1", []);

      // Last set should be most recent
      expect(cache.accessOrder[cache.accessOrder.length - 1]).toBeDefined();
    });
  });

  describe("get() - Direct Access", () => {
    it("should return cached result", async () => {
      const expected = [{ result: "data" }];
      await cache.query("SELECT *", async () => expected);

      const result = cache.get("SELECT *");
      expect(result).toEqual(expected);
    });

    it("should return null for non-existent entry", () => {
      const result = cache.get("SELECT non-existent");
      expect(result).toBeNull();
    });

    it("should return null for expired entry", async () => {
      cache = new QueryCache({ defaultTTL: 100 });
      await cache.query("SELECT *", mockExecuteQuery);

      await new Promise((resolve) => setTimeout(resolve, 150));

      const result = cache.get("SELECT *");
      expect(result).toBeNull();
    });
  });

  describe("clear()", () => {
    it("should clear all cache entries", async () => {
      await cache.query("SELECT 1", mockExecuteQuery);
      await cache.query("SELECT 2", mockExecuteQuery);

      const result = cache.clear();

      expect(result.cleared).toBe(2);
      expect(result.remaining).toBe(0);
      expect(cache.cache.size).toBe(0);
    });

    it("should reset access order", async () => {
      await cache.query("SELECT 1", mockExecuteQuery);
      cache.clear();

      expect(cache.accessOrder.length).toBe(0);
    });
  });

  describe("getStats()", () => {
    it("should return statistics object", () => {
      const stats = cache.getStats();

      expect(stats).toHaveProperty("hits");
      expect(stats).toHaveProperty("misses");
      expect(stats).toHaveProperty("evictions");
      expect(stats).toHaveProperty("invalidations");
      expect(stats).toHaveProperty("totalQueries");
      expect(stats).toHaveProperty("hitRate");
      expect(stats).toHaveProperty("currentSize");
      expect(stats).toHaveProperty("maxSize");
      expect(stats).toHaveProperty("utilizationPercent");
    });

    it("should calculate hit rate correctly", async () => {
      const executor = vi.fn(async () => []);

      // Miss
      await cache.query("SELECT 1", executor);
      // Hit
      await cache.query("SELECT 1", executor);
      // Hit
      await cache.query("SELECT 1", executor);

      const stats = cache.getStats();
      expect(stats.hitRate).toBe("66.7%");
    });

    it("should handle zero queries", () => {
      const stats = cache.getStats();
      expect(stats.hitRate).toBe("0%");
    });

    it("should track cache utilization", async () => {
      await cache.query("SELECT 1", mockExecuteQuery);

      const stats = cache.getStats();
      expect(stats.currentSize).toBe(1);
      expect(stats.maxSize).toBe(100);
      expect(stats.utilizationPercent).toBe("1.0%");
    });
  });

  describe("getEntryInfo()", () => {
    it("should return entry metadata", async () => {
      await cache.query("SELECT *", mockExecuteQuery);

      const info = cache.getEntryInfo("SELECT *");

      expect(info).toBeDefined();
      expect(info).toHaveProperty("cacheKey");
      expect(info).toHaveProperty("age");
      expect(info).toHaveProperty("ttl");
      expect(info).toHaveProperty("expired");
      expect(info).toHaveProperty("accessCount");
      expect(info).toHaveProperty("resultSize");
    });

    it("should return null for non-existent entry", () => {
      const info = cache.getEntryInfo("SELECT non-existent");
      expect(info).toBeNull();
    });

    it("should track access count", async () => {
      const executor = vi.fn(async () => []);

      await cache.query("SELECT *", executor);
      await cache.query("SELECT *", executor);

      const info = cache.getEntryInfo("SELECT *");
      expect(info.accessCount).toBe(2);
    });

    it("should detect expired entries", async () => {
      cache = new QueryCache({ defaultTTL: 100 });
      await cache.query("SELECT *", mockExecuteQuery);

      let info = cache.getEntryInfo("SELECT *");
      expect(info.expired).toBe(false);

      await new Promise((resolve) => setTimeout(resolve, 150));

      info = cache.getEntryInfo("SELECT *");
      expect(info.expired).toBe(true);
    });
  });

  describe("LRU Eviction", () => {
    it("should evict oldest entry when at capacity", async () => {
      cache = new QueryCache({ maxEntries: 3 });

      await cache.query("SELECT 1", mockExecuteQuery);
      await cache.query("SELECT 2", mockExecuteQuery);
      await cache.query("SELECT 3", mockExecuteQuery);

      expect(cache.cache.size).toBe(3);

      // This should trigger eviction of oldest (SELECT 1)
      await cache.query("SELECT 4", mockExecuteQuery);

      expect(cache.cache.size).toBe(3);
      expect(cache.get("SELECT 1")).toBeNull();
      expect(cache.get("SELECT 4")).toBeDefined();
    });

    it("should track eviction count", async () => {
      cache = new QueryCache({ maxEntries: 2 });

      await cache.query("SELECT 1", mockExecuteQuery);
      await cache.query("SELECT 2", mockExecuteQuery);
      await cache.query("SELECT 3", mockExecuteQuery); // Eviction 1
      await cache.query("SELECT 4", mockExecuteQuery); // Eviction 2

      const stats = cache.getStats();
      expect(stats.evictions).toBe(2);
    });

    it("should use LRU order, not insertion order", async () => {
      cache = new QueryCache({ maxEntries: 2 });

      await cache.query("SELECT 1", mockExecuteQuery);
      await cache.query("SELECT 2", mockExecuteQuery);

      // Access SELECT 1 again (making it more recently used)
      await cache.query("SELECT 1", mockExecuteQuery);

      // Adding new query should evict SELECT 2 (less recently used)
      await cache.query("SELECT 3", mockExecuteQuery);

      expect(cache.get("SELECT 1")).toBeDefined();
      expect(cache.get("SELECT 2")).toBeNull();
      expect(cache.get("SELECT 3")).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should catch query execution errors", async () => {
      const failingExecutor = async () => {
        throw new Error("Query failed");
      };

      await expect(
        cache.query("SELECT *", failingExecutor)
      ).rejects.toThrow("Query execution failed");
    });

    it("should not cache failed queries", async () => {
      const executor = vi
        .fn()
        .mockRejectedValueOnce(new Error("Error"))
        .mockResolvedValueOnce([{ data: "success" }]);

      await expect(
        cache.query("SELECT *", executor)
      ).rejects.toThrow();

      // Second call should execute again
      const result = await cache.query("SELECT *", executor);
      expect(result).toEqual([{ data: "success" }]);
      expect(executor).toHaveBeenCalledTimes(2);
    });
  });

  describe("Performance Characteristics", () => {
    it("should handle large result sets", async () => {
      const largeResult = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        data: `item-${i}`,
      }));

      const start = performance.now();
      await cache.query("SELECT large", async () => largeResult);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1000); // Should be fast
      expect(cache.get("SELECT large")).toEqual(largeResult);
    });

    it("should have efficient cache hit performance", async () => {
      const executor = vi.fn(async () => [{ data: "result" }]);

      // Prime the cache
      await cache.query("SELECT *", executor);

      // Measure hit performance
      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        await cache.query("SELECT *", executor);
      }

      const duration = performance.now() - start;
      const avgTime = duration / iterations;

      // Cache hit should be very fast (< 1ms)
      expect(avgTime).toBeLessThan(1);
      expect(executor).toHaveBeenCalledTimes(1);
    });

    it("should efficiently scale with cache size", async () => {
      const iterations = 100;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        await cache.query(
          `SELECT * WHERE { ?s ?p ?o } LIMIT ${i}`,
          mockExecuteQuery
        );
      }
      const duration = performance.now() - start;

      expect(cache.cache.size).toBe(iterations);
      expect(duration).toBeLessThan(500); // Should stay fast
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle concurrent queries", async () => {
      const executor = vi.fn(async () => [{ result: "data" }]);

      const promises = Array.from({ length: 10 }, (_, i) =>
        cache.query(`SELECT ${i}`, executor)
      );

      await Promise.all(promises);

      expect(cache.cache.size).toBe(10);
      expect(executor).toHaveBeenCalledTimes(10);
    });

    it("should handle concurrent same-query requests", async () => {
      let resolveExecutor;
      const executor = vi.fn(
        () =>
          new Promise((resolve) => {
            resolveExecutor = resolve;
          })
      );

      // Start multiple queries with same value
      const promises = [
        cache.query("SELECT *", executor),
        cache.query("SELECT *", executor),
        cache.query("SELECT *", executor),
      ];

      // All should be pending
      expect(executor).toHaveBeenCalledTimes(3);

      // Resolve all
      resolveExecutor?.([{ data: "result" }]);

      await Promise.all(promises);
    });
  });

  describe("Integration Scenarios", () => {
    it("should support GitEventStore query pattern", async () => {
      const queries = [
        "SELECT ?event WHERE { ?event a ex:PostCommitEvent }",
        "SELECT ?event WHERE { ?event a ex:PrePushEvent }",
        "SELECT ?event WHERE { ?event prov:atTime ?t }",
      ];

      const executor = async (query) => [
        { event: `result-for-${query.substring(0, 10)}` },
      ];

      // Simulate repeated queries
      for (let i = 0; i < 5; i++) {
        for (const query of queries) {
          await cache.query(query, () => executor(query));
        }
      }

      const stats = cache.getStats();
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.hitRate).toBe("80.0%"); // 12 hits out of 15 queries
    });

    it("should support cache invalidation pattern", async () => {
      // Populate cache
      await cache.query("SELECT event WHERE type='commit'", mockExecuteQuery);
      await cache.query("SELECT event WHERE type='push'", mockExecuteQuery);
      await cache.query("SELECT measurement WHERE id=1", mockExecuteQuery);

      // Invalidate event queries
      const result = cache.invalidate("event");
      expect(result.matchCount).toBe(2);

      // Measurement query should still be cached
      const mStats = cache.getStats();
      expect(mStats.currentSize).toBe(1);
    });
  });
});
