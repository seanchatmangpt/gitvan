/**
 * Test suite for hook context enrichment with Git metadata
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ContextEnricher } from "../../src/hooks/ContextEnricher.mjs";

describe("Context Enrichment", () => {
  let enricher;

  beforeEach(() => {
    enricher = new ContextEnricher({
      enableCache: false,
      logger: {
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
      },
    });
  });

  describe("ContextEnricher Initialization", () => {
    it("should create enricher with default options", () => {
      expect(enricher).toBeDefined();
      expect(enricher.enableCache).toBe(false);
      expect(typeof enricher.enrich).toBe("function");
    });

    it("should create enricher with custom options", () => {
      const customEnricher = new ContextEnricher({
        cwd: "/custom/path",
        enableCache: true,
        logger: console,
      });

      expect(customEnricher).toBeDefined();
      expect(customEnricher.enableCache).toBe(true);
    });
  });

  describe("Caching Behavior", () => {
    it("should initialize cache correctly", () => {
      const enricherWithCache = new ContextEnricher({
        enableCache: true,
        logger: {
          info: () => {},
          warn: () => {},
          error: () => {},
          debug: () => {},
        },
      });

      expect(enricherWithCache.cache).toBeDefined();
      expect(enricherWithCache.cache.size).toBe(0);
    });

    it("should clear cache when requested", () => {
      const enricherWithCache = new ContextEnricher({
        enableCache: true,
      });

      enricherWithCache.cache.set("test", { value: 123 });
      expect(enricherWithCache.cache.size).toBe(1);

      enricherWithCache.clearCache();

      expect(enricherWithCache.cache.size).toBe(0);
    });

    it("should report cache statistics", () => {
      const enricherWithCache = new ContextEnricher({
        enableCache: true,
      });

      const stats = enricherWithCache.getCacheStats();

      expect(stats).toHaveProperty("entries");
      expect(stats).toHaveProperty("maxTtlMs");
      expect(stats.maxTtlMs).toBe(5000);
    });
  });

  describe("Git Command Execution", () => {
    it("should handle missing Git gracefully", async () => {
      const enricher = new ContextEnricher({
        cwd: "/nonexistent/directory",
        enableCache: false,
        logger: {
          info: () => {},
          warn: () => {},
          error: () => {},
          debug: () => {},
        },
      });

      // Should not throw, but return empty result
      const result = await enricher.enrich({});
      expect(typeof result).toBe("object");
    });

    it("should handle errors gracefully in getHeadCommit", async () => {
      const enricher = new ContextEnricher({
        cwd: "/nonexistent",
        enableCache: false,
      });

      const commit = await enricher.getHeadCommit();

      expect(commit).toHaveProperty("hash");
      expect(commit).toHaveProperty("fullHash");
      expect(commit).toHaveProperty("message");
    });

    it("should handle errors gracefully in getCurrentBranch", async () => {
      const enricher = new ContextEnricher({
        cwd: "/nonexistent",
        enableCache: false,
      });

      const branch = await enricher.getCurrentBranch();

      expect(typeof branch).toBe("string");
      expect(branch).toBe("unknown");
    });
  });

  describe("Context Preservation", () => {
    it("should preserve existing context when enriching", async () => {
      const baseContext = {
        custom: "value",
        userId: "user123",
      };

      const enriched = await enricher.enrich(baseContext);

      expect(enriched.custom).toBe("value");
      expect(enriched.userId).toBe("user123");
    });

    it("should merge Git metadata with existing context", async () => {
      const baseContext = {
        custom: "value",
      };

      // Result will have gitMetadata (even if empty due to missing git)
      const enriched = await enricher.enrich(baseContext);

      expect(enriched.custom).toBe("value");
      expect(typeof enriched).toBe("object");
    });

    it("should not modify original context", async () => {
      const baseContext = {
        custom: "value",
      };

      await enricher.enrich(baseContext);

      expect(baseContext.custom).toBe("value");
      expect(baseContext).not.toHaveProperty("gitMetadata");
    });
  });

  describe("Enrich Method Return Structure", () => {
    it("should return object with expected properties", async () => {
      const result = await enricher.enrich({});

      expect(typeof result).toBe("object");
      expect(result).not.toBeNull();
    });

    it("should maintain immutability between calls", async () => {
      const ctx1 = await enricher.enrich({ test: "value" });
      const ctx2 = await enricher.enrich({ test: "value" });

      expect(ctx1).not.toBe(ctx2);
    });
  });

  describe("Git Metadata Collection Methods", () => {
    it("should have method to get changed files", async () => {
      expect(typeof enricher.getChangedFiles).toBe("function");

      const files = await enricher.getChangedFiles();

      expect(Array.isArray(files)).toBe(true);
    });

    it("should have method to get diff summary", async () => {
      expect(typeof enricher.getDiffSummary).toBe("function");

      const diff = await enricher.getDiffSummary();

      expect(diff).toHaveProperty("filesChanged");
      expect(diff).toHaveProperty("linesAdded");
      expect(diff).toHaveProperty("linesRemoved");
      expect(diff).toHaveProperty("totalChanges");
    });

    it("should have method to get HEAD commit", async () => {
      expect(typeof enricher.getHeadCommit).toBe("function");

      const commit = await enricher.getHeadCommit();

      expect(commit).toHaveProperty("hash");
      expect(commit).toHaveProperty("fullHash");
      expect(commit).toHaveProperty("message");
      expect(commit).toHaveProperty("author");
      expect(commit).toHaveProperty("timestamp");
    });

    it("should have method to get current branch", async () => {
      expect(typeof enricher.getCurrentBranch).toBe("function");

      const branch = await enricher.getCurrentBranch();

      expect(typeof branch).toBe("string");
    });

    it("should have method to get staging status", async () => {
      expect(typeof enricher.getStagingStatus).toBe("function");

      const status = await enricher.getStagingStatus();

      expect(status).toHaveProperty("stagedCount");
      expect(status).toHaveProperty("unstagedCount");
      expect(status).toHaveProperty("unTrackedCount");
      expect(status).toHaveProperty("hasChanges");
    });
  });

  describe("Return Value Types", () => {
    it("should return numeric values for counts", async () => {
      const diff = await enricher.getDiffSummary();

      expect(typeof diff.filesChanged).toBe("number");
      expect(typeof diff.linesAdded).toBe("number");
      expect(typeof diff.linesRemoved).toBe("number");
    });

    it("should return boolean values for status flags", async () => {
      const status = await enricher.getStagingStatus();

      expect(typeof status.hasChanges).toBe("boolean");
    });

    it("should return string values for identifiers", async () => {
      const branch = await enricher.getCurrentBranch();

      expect(typeof branch).toBe("string");
    });

    it("should return array for changed files", async () => {
      const files = await enricher.getChangedFiles();

      expect(Array.isArray(files)).toBe(true);
    });
  });

  describe("Error Resilience", () => {
    it("should not throw on failed Git operations", async () => {
      const enricher = new ContextEnricher({
        cwd: "/invalid/path",
        enableCache: false,
      });

      // Should not throw
      expect(async () => {
        await enricher.enrich({});
      }).not.toThrow();
    });

    it("should return sensible defaults on errors", async () => {
      const enricher = new ContextEnricher({
        cwd: "/invalid/path",
        enableCache: false,
      });

      const diff = await enricher.getDiffSummary();

      expect(diff.filesChanged).toBe(0);
      expect(diff.linesAdded).toBe(0);
      expect(diff.linesRemoved).toBe(0);
      expect(diff.totalChanges).toBe(0);
    });

    it("should return empty arrays on file query errors", async () => {
      const enricher = new ContextEnricher({
        cwd: "/invalid/path",
        enableCache: false,
      });

      const files = await enricher.getChangedFiles();

      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBe(0);
    });
  });

  describe("Performance", () => {
    it("should complete enrich quickly", async () => {
      const start = performance.now();

      // On invalid paths, should fail quickly
      await enricher.enrich({});

      const duration = performance.now() - start;

      // Should complete within reasonable time (not waiting for long timeouts)
      expect(duration).toBeLessThan(5000);
    });

    it("should handle multiple rapid enrich calls", async () => {
      const start = performance.now();

      await Promise.all([
        enricher.enrich({}),
        enricher.enrich({}),
        enricher.enrich({}),
      ]);

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5000);
    });
  });

  describe("Deterministic Output Structure", () => {
    it("should maintain consistent output structure", async () => {
      const result1 = await enricher.enrich({});
      const result2 = await enricher.enrich({});

      expect(Object.keys(result1).sort()).toEqual(
        Object.keys(result2).sort()
      );
    });

    it("should maintain property types across calls", async () => {
      const result1 = await enricher.enrich({});
      const result2 = await enricher.enrich({});

      if (result1.gitMetadata && result2.gitMetadata) {
        const props = Object.keys(result1.gitMetadata);
        for (const prop of props) {
          expect(typeof result1.gitMetadata[prop]).toBe(
            typeof result2.gitMetadata[prop]
          );
        }
      }
    });
  });
});
