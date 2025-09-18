import { test, expect, describe, beforeEach, afterEach } from "vitest";
import {
  PackCache,
  PackOptimizer,
  PackProfiler,
} from "../../../src/pack/optimization/index.mjs";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "pathe";

describe("Pack Optimization System", () => {
  const testCacheDir = ".test-cache";

  beforeEach(() => {
    if (existsSync(testCacheDir)) {
      rmSync(testCacheDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (existsSync(testCacheDir)) {
      rmSync(testCacheDir, { recursive: true, force: true });
    }
  });

  describe("PackCache", () => {
    test("should cache and retrieve values", async () => {
      const cache = new PackCache({ cacheDir: testCacheDir });

      const testData = { test: "data" };
      const testValue = { result: "cached" };

      // Initial miss
      const miss = await cache.get("test", testData);
      expect(miss).toBeNull();

      // Set cache
      await cache.set("test", testData, testValue);

      // Cache hit
      const hit = await cache.get("test", testData);
      expect(hit).toEqual(testValue);

      // Verify stats
      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.writes).toBe(1);
    });

    test("should generate consistent keys", () => {
      const cache = new PackCache();

      const data1 = { a: 1, b: 2 };
      const data2 = { b: 2, a: 1 };

      const key1 = cache.generateKey("test", data1);
      const key2 = cache.generateKey("test", data2);

      expect(key1).toBe(key2);
      expect(key1).toHaveLength(16);
    });

    test("should respect TTL", async () => {
      const cache = new PackCache({
        cacheDir: testCacheDir,
        ttl: 100, // 100ms
      });

      const testData = { test: "ttl" };
      const testValue = { result: "ttl-test" };

      await cache.set("test", testData, testValue);

      // Should hit immediately
      let result = await cache.get("test", testData);
      expect(result).toEqual(testValue);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should miss after TTL
      result = await cache.get("test", testData);
      expect(result).toBeNull();
    });

    test("should clear cache by type", async () => {
      const cache = new PackCache({ cacheDir: testCacheDir });

      await cache.set("type1", { a: 1 }, { result: 1 });
      await cache.set("type2", { a: 2 }, { result: 2 });

      // Both should exist
      expect(await cache.get("type1", { a: 1 })).toEqual({ result: 1 });
      expect(await cache.get("type2", { a: 2 })).toEqual({ result: 2 });

      // Clear type1
      await cache.clear("type1");

      // type1 should be gone, type2 should remain
      expect(await cache.get("type1", { a: 1 })).toBeNull();
      expect(await cache.get("type2", { a: 2 })).toEqual({ result: 2 });
    });
  });

  describe("PackOptimizer", () => {
    test("should optimize manifest by removing empty arrays", async () => {
      const optimizer = new PackOptimizer();

      const manifest = {
        provides: {
          templates: [
            { target: "b.txt", src: "b.njk" },
            { target: "a.txt", src: "a.njk" },
          ],
          files: [],
          jobs: [
            { id: "z", src: "z.mjs" },
            { id: "a", src: "a.mjs" },
          ],
        },
      };

      const optimized = await optimizer.optimizeManifest(manifest);

      // Empty arrays should be removed
      expect(optimized.provides.files).toBeUndefined();

      // Arrays should be sorted
      expect(optimized.provides.templates[0].target).toBe("a.txt");
      expect(optimized.provides.templates[1].target).toBe("b.txt");
      expect(optimized.provides.jobs[0].id).toBe("a");
      expect(optimized.provides.jobs[1].id).toBe("z");
    });

    test("should optimize execution plan", async () => {
      const optimizer = new PackOptimizer();

      const plan = {
        steps: [
          { type: "transform", target: "c.js" },
          { type: "file", target: "a.txt" },
          { type: "template", target: "b.html" },
          { type: "file", target: "d.txt" },
          { type: "other", target: "e.exe" },
        ],
      };

      const optimized = await optimizer.optimizePlan(plan);

      // Should reorder: files, templates, transforms, others
      expect(optimized.steps[0].type).toBe("file");
      expect(optimized.steps[1].type).toBe("file");
      expect(optimized.steps[2].type).toBe("template");
      expect(optimized.steps[3].type).toBe("transform");
      expect(optimized.steps[4].type).toBe("other");

      // Should mark for parallel execution
      expect(optimized.parallel.files).toBe(true);
      expect(optimized.parallel.templates).toBe(false);
    });

    test("should deduplicate steps", async () => {
      const optimizer = new PackOptimizer();

      const steps = [
        { type: "file", target: "a.txt", action: "copy", src: "a.txt" },
        { type: "file", target: "b.txt", action: "copy", src: "b.txt" },
        { type: "file", target: "a.txt", action: "copy", src: "a.txt" },
      ];

      const deduplicated = await optimizer.deduplicateSteps(steps);

      expect(deduplicated).toHaveLength(2);
      expect(deduplicated[0].target).toBe("a.txt");
      expect(deduplicated[1].target).toBe("b.txt");
    });

    test("should generate consistent step fingerprints", () => {
      const optimizer = new PackOptimizer();

      const step1 = {
        type: "file",
        target: "a.txt",
        action: "copy",
        src: "a.txt",
      };
      const step2 = {
        type: "file",
        target: "a.txt",
        action: "copy",
        src: "a.txt",
      };
      const step3 = {
        type: "file",
        target: "b.txt",
        action: "copy",
        src: "b.txt",
      };

      const fp1 = optimizer.generateStepFingerprint(step1);
      const fp2 = optimizer.generateStepFingerprint(step2);
      const fp3 = optimizer.generateStepFingerprint(step3);

      expect(fp1).toBe(fp2);
      expect(fp1).not.toBe(fp3);
      expect(fp1).toHaveLength(16);
    });

    test("should track metrics", async () => {
      const optimizer = new PackOptimizer();

      // Perform operations
      await optimizer.optimizeManifest({ provides: {} });
      await optimizer.optimizePlan({ steps: [] });

      const metrics = optimizer.getMetrics();

      expect(metrics.optimizations).toBe(2);
      expect(metrics.cache).toBeDefined();
      expect(metrics.efficiency).toBeDefined();
    });
  });

  describe("PackProfiler", () => {
    test("should measure timing", () => {
      const profiler = new PackProfiler();

      profiler.start("test-operation");

      // Simulate work
      const start = Date.now();
      while (Date.now() - start < 10) {
        // Busy wait for ~10ms
      }

      const duration = profiler.end("test-operation");

      expect(duration).toBeGreaterThan(5);
      expect(duration).toBeLessThan(50);
    });

    test("should measure async functions", async () => {
      const profiler = new PackProfiler();

      const result = await profiler.measure("async-test", async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "completed";
      });

      expect(result).toBe("completed");

      const report = profiler.getReport();
      expect(report.timings["async-test"]).toBeDefined();
      expect(report.timings["async-test"].count).toBe(1);
      expect(report.timings["async-test"].total).toBeGreaterThan(5);
    });

    test("should generate performance report", () => {
      const profiler = new PackProfiler();

      // Create some measurements
      profiler.start("operation-1");
      profiler.end("operation-1");

      profiler.start("operation-2");
      profiler.end("operation-2");

      profiler.start("operation-1");
      profiler.end("operation-1");

      const report = profiler.getReport();

      expect(report.timings["operation-1"]).toBeDefined();
      expect(report.timings["operation-2"]).toBeDefined();
      expect(report.timings["operation-1"].count).toBe(2);
      expect(report.timings["operation-2"].count).toBe(1);
      expect(report.summary.operations).toBe(3);
      expect(report.top).toBeDefined();
    });

    test("should handle disabled profiling", () => {
      const profiler = new PackProfiler({ profile: false });

      profiler.start("test");
      const duration = profiler.end("test");

      expect(duration).toBeUndefined();

      const report = profiler.getReport();
      expect(report.summary.operations).toBe(0);
    });

    test("should reset measurements", () => {
      const profiler = new PackProfiler();

      profiler.start("test");
      profiler.end("test");

      expect(profiler.getReport().summary.operations).toBe(1);

      profiler.reset();

      expect(profiler.getReport().summary.operations).toBe(0);
    });
  });

  describe("Integration Tests", () => {
    test("should work together for complete optimization", async () => {
      const optimizer = new PackOptimizer({ cacheDir: testCacheDir });
      const profiler = new PackProfiler();

      // Test manifest optimization with profiling
      const manifest = {
        provides: {
          templates: [{ target: "component.vue", src: "component.njk" }],
          files: [],
          jobs: [],
        },
      };

      const optimized = await profiler.measure("manifest-optimization", () =>
        optimizer.optimizeManifest(manifest)
      );

      expect(optimized.provides.files).toBeUndefined();
      expect(optimized.provides.jobs).toBeUndefined();

      // Test template caching
      const template = "Hello {{ name }}";
      const context = { name: "World" };

      const result1 = await profiler.measure("template-render-1", () =>
        optimizer.optimizeTemplate(template, context)
      );

      const result2 = await profiler.measure("template-render-2", () =>
        optimizer.optimizeTemplate(template, context)
      );

      expect(result1).toEqual(result2);

      // Verify cache hit
      const cacheStats = optimizer.getMetrics().cache;
      expect(cacheStats.hits).toBeGreaterThan(0);

      // Get profiling report
      const report = profiler.getReport();
      expect(report.timings["manifest-optimization"]).toBeDefined();
      expect(report.timings["template-render-1"]).toBeDefined();
      expect(report.timings["template-render-2"]).toBeDefined();
    });
  });
});
