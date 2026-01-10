/**
 * @fileoverview Change Stream Backpressure & Queueing Tests
 *
 * Tests for queue management, batching, and backpressure handling
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { useChangeStream } from "../src/composables/useChangeStream.mjs";
import { withGitVan } from "../src/core/context.mjs";

describe("Change Stream - Backpressure & Queueing", () => {
  let testDir;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "changestream-backpressure-"));
    mkdirSync(join(testDir, ".git"));
  });

  afterEach(() => {
    if (testDir) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should queue events before flush", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        await stream.open();

        // Add events without flushing
        stream.addEvent("quad-added", { quad: "test1" });
        stream.addEvent("quad-added", { quad: "test2" });
        stream.addEvent("quad-added", { quad: "test3" });

        const queue = stream._getQueue();
        expect(queue.length).toBe(3);

        stream.flush();
        const queueAfter = stream._getQueue();
        expect(queueAfter.length).toBe(0);

        await stream.close();
      }
    );
  });

  it("should auto-flush when batch size reached", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        const batchSize = 5;
        await stream.open({ batchSize });

        let flushedCount = 0;
        stream.on("batch-flushed", (event) => {
          flushedCount += event.count;
        });

        // Add exactly batchSize events
        for (let i = 0; i < batchSize; i++) {
          stream.addEvent("quad-added", { quad: `test${i}` });
        }

        // Should auto-flush when batch size reached
        expect(flushedCount).toBe(batchSize);

        await stream.close();
      }
    );
  });

  it("should handle batch size boundary", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        const batchSize = 10;
        await stream.open({ batchSize });

        let batchCount = 0;
        stream.on("batch-flushed", () => {
          batchCount++;
        });

        // Add batchSize events (should trigger one auto-flush)
        for (let i = 0; i < batchSize; i++) {
          stream.addEvent("quad-added", { quad: `test${i}` });
        }

        expect(batchCount).toBe(1);

        // Add one more (should not auto-flush yet)
        stream.addEvent("quad-added", { quad: "extra" });
        expect(batchCount).toBe(1);

        // Manual flush
        stream.flush();
        expect(batchCount).toBe(2);

        await stream.close();
      }
    );
  });

  it("should respect batch size configuration", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        const smallBatchSize = 3;
        await stream.open({ batchSize: smallBatchSize });

        const flushes = [];
        stream.on("batch-flushed", (event) => {
          flushes.push(event.count);
        });

        // Add 10 events with batch size 3
        for (let i = 0; i < 10; i++) {
          stream.addEvent("quad-added", { quad: `test${i}` });
        }

        // Should have auto-flushed 3 times (3+3+3, leaving 1)
        expect(flushes.length).toBe(3);
        expect(flushes[0]).toBe(3);
        expect(flushes[1]).toBe(3);
        expect(flushes[2]).toBe(3);

        // Final event still in queue
        const queue = stream._getQueue();
        expect(queue.length).toBe(1);

        await stream.close();
      }
    );
  });

  it("should track queue size in stats", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        await stream.open();

        stream.addEvent("quad-added", { quad: "test1" });
        stream.addEvent("quad-added", { quad: "test2" });

        const status = stream.getStatus();
        expect(status.queueSize).toBe(2);

        stream.flush();

        const statusAfter = stream.getStatus();
        expect(statusAfter.queueSize).toBe(0);

        await stream.close();
      }
    );
  });

  it("should accumulate stats across flushes", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        await stream.open();

        // First batch
        stream.addEvent("quad-added", { quad: "test1" });
        stream.addEvent("quad-added", { quad: "test2" });
        stream.flush();

        let stats = stream.getStats();
        expect(stats.eventsFlushed).toBe(2);
        expect(stats.flushes).toBe(1);

        // Second batch
        stream.addEvent("quad-removed", { quad: "test3" });
        stream.addEvent("quad-added", { quad: "test4" });
        stream.flush();

        stats = stream.getStats();
        expect(stats.eventsFlushed).toBe(4);
        expect(stats.flushes).toBe(2);
        expect(stats.quadsAdded).toBe(3);
        expect(stats.quadsRemoved).toBe(1);

        await stream.close();
      }
    );
  });

  it("should handle rapid event additions", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        await stream.open({ batchSize: 50 });

        // Rapidly add 100 events
        for (let i = 0; i < 100; i++) {
          stream.addEvent("quad-added", { quad: `rapid-${i}` });
        }

        const stats = stream.getStats();
        expect(stats.eventsQueued).toBe(100);

        // Should have auto-flushed twice (50+50)
        expect(stats.flushes).toBe(2);
        expect(stats.eventsFlushed).toBe(100);

        await stream.close();
      }
    );
  });

  it("should measure flush latency", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        await stream.open();

        stream.addEvent("quad-added", { quad: "test" });

        const before = stream.getStatus().lastFlushTime;
        await new Promise((resolve) => setTimeout(resolve, 50));
        stream.flush();
        const after = stream.getStatus().lastFlushTime;

        expect(after).toBeGreaterThanOrEqual(before);

        await stream.close();
      }
    );
  });

  it("should handle empty flushes gracefully", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        await stream.open();

        let flushCount = 0;
        stream.on("batch-flushed", () => {
          flushCount++;
        });

        // Flush empty queue
        stream.flush();
        expect(flushCount).toBe(0);

        // Add event and flush
        stream.addEvent("quad-added", { quad: "test" });
        stream.flush();
        expect(flushCount).toBe(1);

        // Flush empty queue again
        stream.flush();
        expect(flushCount).toBe(1);

        await stream.close();
      }
    );
  });

  it("should not exceed memory with continuous additions", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        await stream.open({ batchSize: 100 });

        const initialMem = process.memoryUsage().heapUsed;

        // Add many events with periodic flushes
        for (let i = 0; i < 1000; i++) {
          stream.addEvent("quad-added", { quad: `mem-test-${i}` });
          if (i % 500 === 0) {
            stream.flush();
          }
        }

        stream.flush();

        const finalMem = process.memoryUsage().heapUsed;
        const memIncrease = finalMem - initialMem;

        // Memory increase should be reasonable (less than 10MB for 1000 events)
        expect(memIncrease).toBeLessThan(10 * 1024 * 1024);

        await stream.close();
      }
    );
  });
});
