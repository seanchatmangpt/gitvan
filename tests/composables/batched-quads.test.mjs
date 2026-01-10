/**
 * Tests for useBatchedQuads() Composable
 * @fileoverview Comprehensive test suite for batched quad operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useBatchedQuads } from "../../src/composables/batched-quads.mjs";

// Mock store for testing
class MockStore {
  constructor() {
    this.quads = [];
    this.addCount = 0;
    this.addQuadsCount = 0;
  }

  add(quad) {
    this.quads.push(quad);
    this.addCount++;
  }

  async addQuads(quads) {
    this.quads.push(...quads);
    this.addQuadsCount++;
  }
}

// Helper to create test quads
function createTestQuad(id) {
  return {
    subject: { value: `http://example.com/subject/${id}` },
    predicate: { value: "http://example.com/predicate" },
    object: { value: `object-${id}` },
  };
}

describe("useBatchedQuads() - Composable Tests", () => {
  let store;
  let batch;

  beforeEach(() => {
    store = new MockStore();
  });

  afterEach(async () => {
    if (batch) {
      await batch.cleanup?.();
    }
  });

  describe("Initialization", () => {
    it("should create batch instance with default options", () => {
      batch = useBatchedQuads(store);
      expect(batch).toBeDefined();
      expect(batch.addQuad).toBeDefined();
      expect(batch.addQuads).toBeDefined();
      expect(batch.flush).toBeDefined();
      expect(batch.isFlushed).toBeDefined();
    });

    it("should accept custom batch size", () => {
      batch = useBatchedQuads(store, { batchSize: 25 });
      const stats = batch.getStats();
      expect(stats).toBeDefined();
    });

    it("should initialize with empty buffer", () => {
      batch = useBatchedQuads(store);
      expect(batch.isFlushed()).toBe(true);
    });
  });

  describe("addQuad()", () => {
    beforeEach(() => {
      batch = useBatchedQuads(store, { batchSize: 100 });
    });

    it("should add single quad to buffer", async () => {
      const quad = createTestQuad(1);
      await batch.addQuad(quad);

      expect(batch.isFlushed()).toBe(false);
      const stats = batch.getStats();
      expect(stats.bufferSize).toBe(1);
    });

    it("should reject null quad", async () => {
      await expect(batch.addQuad(null)).rejects.toThrow(
        "Cannot add null or undefined quad"
      );
    });

    it("should reject undefined quad", async () => {
      await expect(batch.addQuad(undefined)).rejects.toThrow(
        "Cannot add null or undefined quad"
      );
    });

    it("should auto-flush when batch size reached", async () => {
      batch = useBatchedQuads(store, { batchSize: 5 });

      for (let i = 0; i < 4; i++) {
        await batch.addQuad(createTestQuad(i));
      }

      expect(batch.isFlushed()).toBe(false);
      expect(store.quads.length).toBe(0);

      // This should trigger auto-flush
      await batch.addQuad(createTestQuad(4));

      // After auto-flush, should have attempted batch add
      // Verify stats reflect the flush
      const stats = batch.getStats();
      expect(stats.totalQuadsAdded).toBeGreaterThan(0);
    });
  });

  describe("addQuads()", () => {
    beforeEach(() => {
      batch = useBatchedQuads(store, { batchSize: 100 });
    });

    it("should add multiple quads to buffer", async () => {
      const quads = [
        createTestQuad(1),
        createTestQuad(2),
        createTestQuad(3),
      ];
      await batch.addQuads(quads);

      expect(batch.isFlushed()).toBe(false);
      const stats = batch.getStats();
      expect(stats.bufferSize).toBe(3);
    });

    it("should reject non-array input", async () => {
      await expect(batch.addQuads("not-an-array")).rejects.toThrow(
        "addQuads requires an array of quads"
      );
    });

    it("should handle empty array", async () => {
      await batch.addQuads([]);
      expect(batch.isFlushed()).toBe(true);
    });

    it("should auto-flush large batch", async () => {
      batch = useBatchedQuads(store, { batchSize: 10 });

      const quads = Array.from({ length: 15 }, (_, i) =>
        createTestQuad(i)
      );
      await batch.addQuads(quads);

      // Should have triggered auto-flush
      const stats = batch.getStats();
      expect(stats.totalQuadsAdded).toBeGreaterThan(0);
    });
  });

  describe("flush()", () => {
    beforeEach(() => {
      batch = useBatchedQuads(store, { batchSize: 100 });
    });

    it("should flush buffered quads to store", async () => {
      const quads = [
        createTestQuad(1),
        createTestQuad(2),
        createTestQuad(3),
      ];
      await batch.addQuads(quads);

      const result = await batch.flush();

      expect(result.success).toBe(true);
      expect(result.quadsAdded).toBe(3);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(store.addQuadsCount).toBeGreaterThan(0);
    });

    it("should clear buffer after flush", async () => {
      await batch.addQuad(createTestQuad(1));
      await batch.flush();

      const stats = batch.getStats();
      expect(stats.bufferSize).toBe(0);
    });

    it("should mark as flushed", async () => {
      await batch.addQuad(createTestQuad(1));
      expect(batch.isFlushed()).toBe(false);

      await batch.flush();
      expect(batch.isFlushed()).toBe(true);
    });

    it("should handle empty buffer", async () => {
      const result = await batch.flush();

      expect(result.success).toBe(true);
      expect(result.quadsAdded).toBe(0);
    });

    it("should track total quads added", async () => {
      await batch.addQuads([
        createTestQuad(1),
        createTestQuad(2),
      ]);
      await batch.flush();

      let stats = batch.getStats();
      expect(stats.totalQuadsAdded).toBe(2);

      await batch.addQuads([createTestQuad(3)]);
      await batch.flush();

      stats = batch.getStats();
      expect(stats.totalQuadsAdded).toBe(3);
    });

    it("should track flush count", async () => {
      await batch.addQuad(createTestQuad(1));
      await batch.flush();

      let stats = batch.getStats();
      expect(stats.totalFlushes).toBe(1);

      await batch.addQuad(createTestQuad(2));
      await batch.flush();

      stats = batch.getStats();
      expect(stats.totalFlushes).toBe(2);
    });
  });

  describe("isFlushed()", () => {
    beforeEach(() => {
      batch = useBatchedQuads(store, { batchSize: 100 });
    });

    it("should return true when buffer is empty", () => {
      expect(batch.isFlushed()).toBe(true);
    });

    it("should return false after adding quad", async () => {
      await batch.addQuad(createTestQuad(1));
      expect(batch.isFlushed()).toBe(false);
    });

    it("should return true after flush", async () => {
      await batch.addQuad(createTestQuad(1));
      await batch.flush();
      expect(batch.isFlushed()).toBe(true);
    });
  });

  describe("getStats()", () => {
    beforeEach(() => {
      batch = useBatchedQuads(store, { batchSize: 100 });
    });

    it("should return stats object with all fields", () => {
      const stats = batch.getStats();

      expect(stats).toHaveProperty("bufferSize");
      expect(stats).toHaveProperty("totalQuadsAdded");
      expect(stats).toHaveProperty("totalFlushes");
      expect(stats).toHaveProperty("lastFlushTime");
      expect(stats).toHaveProperty("isFlushed");
      expect(stats).toHaveProperty("avgQuadsPerFlush");
    });

    it("should track buffer size accurately", async () => {
      let stats = batch.getStats();
      expect(stats.bufferSize).toBe(0);

      await batch.addQuads([
        createTestQuad(1),
        createTestQuad(2),
      ]);
      stats = batch.getStats();
      expect(stats.bufferSize).toBe(2);
    });

    it("should calculate average quads per flush", async () => {
      await batch.addQuads([createTestQuad(1), createTestQuad(2)]);
      await batch.flush();

      await batch.addQuads([
        createTestQuad(3),
        createTestQuad(4),
        createTestQuad(5),
      ]);
      await batch.flush();

      const stats = batch.getStats();
      // (2 + 3) / 2 = 2.5
      expect(parseFloat(stats.avgQuadsPerFlush)).toBe(2.5);
    });
  });

  describe("reset()", () => {
    beforeEach(() => {
      batch = useBatchedQuads(store, { batchSize: 100 });
    });

    it("should clear stats", async () => {
      await batch.addQuad(createTestQuad(1));
      await batch.flush();

      let stats = batch.getStats();
      expect(stats.totalQuadsAdded).toBe(1);

      await batch.reset();

      stats = batch.getStats();
      expect(stats.totalQuadsAdded).toBe(0);
      expect(stats.totalFlushes).toBe(0);
    });

    it("should flush remaining quads before reset", async () => {
      await batch.addQuads([createTestQuad(1), createTestQuad(2)]);

      await batch.reset();

      expect(batch.isFlushed()).toBe(true);
    });
  });

  describe("Callback Handling", () => {
    it("should call onFlush callback", async () => {
      const onFlush = vi.fn();
      batch = useBatchedQuads(store, { batchSize: 100, onFlush });

      await batch.addQuad(createTestQuad(1));
      await batch.flush();

      expect(onFlush).toHaveBeenCalled();
      const result = onFlush.mock.calls[0][0];
      expect(result.quadsAdded).toBe(1);
      expect(result.success).toBe(true);
    });

    it("should call onError callback on flush failure", async () => {
      const onError = vi.fn();
      const failingStore = new MockStore();
      failingStore.addQuads = vi.fn().mockRejectedValue(new Error("Add failed"));

      batch = useBatchedQuads(failingStore, { onError });

      await batch.addQuad(createTestQuad(1));
      await expect(batch.flush()).rejects.toThrow("Failed to flush");

      expect(onError).toHaveBeenCalled();
    });
  });

  describe("Performance Characteristics", () => {
    it("should handle large batches efficiently", async () => {
      batch = useBatchedQuads(store, { batchSize: 1000 });

      const startTime = performance.now();
      const quads = Array.from({ length: 1000 }, (_, i) =>
        createTestQuad(i)
      );
      await batch.addQuads(quads);
      const addDuration = performance.now() - startTime;

      // Adding 1000 quads to buffer should be very fast (<100ms)
      expect(addDuration).toBeLessThan(100);

      const flushStart = performance.now();
      await batch.flush();
      const flushDuration = performance.now() - flushStart;

      expect(flushDuration).toBeGreaterThan(0);
    });

    it("should use batch add when available", async () => {
      batch = useBatchedQuads(store, { batchSize: 10 });

      const quads = Array.from({ length: 20 }, (_, i) =>
        createTestQuad(i)
      );
      await batch.addQuads(quads);

      // Should have triggered auto-flush due to batch size
      expect(store.addQuadsCount).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid successive flushes", async () => {
      batch = useBatchedQuads(store, { batchSize: 100 });

      const result1 = await batch.flush();
      const result2 = await batch.flush();

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.quadsAdded).toBe(0);
      expect(result2.quadsAdded).toBe(0);
    });

    it("should handle adding after flush", async () => {
      batch = useBatchedQuads(store, { batchSize: 100 });

      await batch.addQuad(createTestQuad(1));
      await batch.flush();
      expect(batch.isFlushed()).toBe(true);

      await batch.addQuad(createTestQuad(2));
      expect(batch.isFlushed()).toBe(false);
    });

    it("should maintain state across multiple operations", async () => {
      batch = useBatchedQuads(store, { batchSize: 5 });

      // First batch
      for (let i = 0; i < 3; i++) {
        await batch.addQuad(createTestQuad(i));
      }
      await batch.flush();

      let stats = batch.getStats();
      expect(stats.totalQuadsAdded).toBe(3);
      expect(stats.totalFlushes).toBe(1);

      // Second batch
      for (let i = 3; i < 8; i++) {
        await batch.addQuad(createTestQuad(i));
      }
      await batch.flush();

      stats = batch.getStats();
      expect(stats.totalQuadsAdded).toBe(8);
      expect(stats.totalFlushes).toBe(2);
    });
  });

  describe("Auto-flush Interval", () => {
    it("should start auto-flush timer", async () => {
      batch = useBatchedQuads(store, { flushIntervalMs: 100 });
      batch.startAutoFlush();

      await batch.addQuad(createTestQuad(1));

      // Wait for auto-flush interval
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be flushed now
      expect(batch.isFlushed()).toBe(true);

      await batch.stopAutoFlush();
    });

    it("should stop auto-flush timer", async () => {
      batch = useBatchedQuads(store, { flushIntervalMs: 50 });
      batch.startAutoFlush();

      await batch.stopAutoFlush();
      await batch.addQuad(createTestQuad(1));

      // Wait longer than interval
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should still have unflushed quad
      expect(batch.isFlushed()).toBe(false);
    });
  });
});
