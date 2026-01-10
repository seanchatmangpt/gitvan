/**
 * @fileoverview Change Stream Batching & Hook Integration Tests
 *
 * Tests for event batching, timing, and integration with hook orchestrator
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { useChangeStream } from "../src/composables/useChangeStream.mjs";
import { withGitVan } from "../src/core/context.mjs";

describe("Change Stream - Batching & Hook Integration", () => {
  let testDir;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "changestream-batching-"));
    mkdirSync(join(testDir, ".git"));
    mkdirSync(join(testDir, "hooks"));
  });

  afterEach(() => {
    if (testDir) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should batch events within flush interval", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        await stream.open({ flushIntervalMs: 200, batchSize: 1000 });

        const batchedEvents = [];
        stream.on("batch-flushed", (event) => {
          batchedEvents.push({
            count: event.count,
            timestamp: event.timestamp,
          });
        });

        // Rapidly add events
        for (let i = 0; i < 5; i++) {
          stream.addEvent("quad-added", { quad: `test${i}` });
        }

        // Wait for automatic flush
        await new Promise((resolve) => setTimeout(resolve, 250));

        // Should have one batch with all 5 events
        expect(batchedEvents.length).toBeGreaterThanOrEqual(1);
        const firstBatch = batchedEvents[0];
        expect(firstBatch.count).toBe(5);

        await stream.close();
      }
    );
  });

  it("should respect flush interval configuration", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        const flushIntervalMs = 150;
        await stream.open({ flushIntervalMs, batchSize: 1000 });

        const flushTimes = [];
        stream.on("batch-flushed", () => {
          flushTimes.push(Date.now());
        });

        // Add one event
        stream.addEvent("quad-added", { quad: "test1" });

        // Wait for at least one automatic flush
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Should have flushed within approximately the interval
        expect(flushTimes.length).toBeGreaterThan(0);

        await stream.close();
      }
    );
  });

  it("should collect multiple events into single batch", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        await stream.open();

        let lastBatchEvent = null;
        stream.on("batch-flushed", (event) => {
          lastBatchEvent = event;
        });

        // Add multiple events
        stream.addEvent("quad-added", { quad: "q1" });
        stream.addEvent("quad-added", { quad: "q2" });
        stream.addEvent("quad-removed", { quad: "q3" });

        stream.flush();

        expect(lastBatchEvent).toBeDefined();
        expect(lastBatchEvent.count).toBe(3);
        expect(lastBatchEvent.events.length).toBe(3);

        // Check event order preserved
        expect(lastBatchEvent.events[0].quad).toBe("q1");
        expect(lastBatchEvent.events[1].quad).toBe("q2");
        expect(lastBatchEvent.events[2].quad).toBe("q3");

        await stream.close();
      }
    );
  });

  it("should handle multiple concurrent streams", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream1 = useChangeStream();
        const stream2 = useChangeStream();

        await stream1.open({ batchSize: 5 });
        await stream2.open({ batchSize: 10 });

        expect(stream1.getStatus().isOpen).toBe(true);
        expect(stream2.getStatus().isOpen).toBe(true);

        stream1.addEvent("quad-added", { quad: "s1-q1" });
        stream2.addEvent("quad-added", { quad: "s2-q1" });

        const stats1 = stream1.getStats();
        const stats2 = stream2.getStats();

        expect(stats1.eventsQueued).toBe(1);
        expect(stats2.eventsQueued).toBe(1);

        await stream1.close();
        await stream2.close();
      }
    );
  });

  it("should handle rapid batch flushes", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        await stream.open({ batchSize: 10, flushIntervalMs: 50 });

        const batches = [];
        stream.on("batch-flushed", (event) => {
          batches.push(event.count);
        });

        // Rapidly add and manually flush multiple times
        for (let batch = 0; batch < 5; batch++) {
          for (let i = 0; i < 5; i++) {
            stream.addEvent("quad-added", { quad: `batch${batch}-event${i}` });
          }
          stream.flush();
        }

        expect(batches.length).toBe(5);
        batches.forEach((count) => {
          expect(count).toBe(5);
        });

        await stream.close();
      }
    );
  });

  it("should measure event processing latency", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        await stream.open();

        const addTime = Date.now();

        let receiveTime = null;
        stream.on("quad-added", () => {
          receiveTime = Date.now();
        });

        stream.addEvent("quad-added", { quad: "test" });
        stream.flush();

        const latency = receiveTime - addTime;

        // Should be very fast (less than 50ms)
        expect(latency).toBeLessThan(50);

        await stream.close();
      }
    );
  });

  it("should handle interleaved pause/resume with batching", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        await stream.open({ batchSize: 2 }); // Small batch size to trigger flush

        const emittedEvents = [];
        stream.on("quad-added", (event) => {
          emittedEvents.push(event);
        });

        // Add events - will auto-flush when reaching batchSize of 2
        stream.addEvent("quad-added", { quad: "q1" });
        stream.addEvent("quad-added", { quad: "q2" });

        // At this point, should have flushed automatically (batch size reached)
        expect(emittedEvents.length).toBe(2);

        // Pause
        stream.pause();

        // Add more events while paused
        stream.addEvent("quad-added", { quad: "q3" });
        stream.addEvent("quad-added", { quad: "q4" });

        // Still 2 because we're paused
        expect(emittedEvents.length).toBe(2);

        // Resume
        stream.resume();
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Now should have emitted the queued events
        expect(emittedEvents.length).toBe(4);

        await stream.close();
      }
    );
  });

  it("should preserve event order across flushes", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        await stream.open({ batchSize: 100 });

        const eventSequence = [];
        stream.on("batch-flushed", (event) => {
          eventSequence.push(...event.events.map((e) => e.quad));
        });

        // Add 20 events with multiple flushes
        for (let i = 0; i < 20; i++) {
          stream.addEvent("quad-added", { quad: `seq-${i}` });
          if (i % 10 === 9) {
            stream.flush();
          }
        }
        stream.flush();

        expect(eventSequence.length).toBe(20);
        for (let i = 0; i < 20; i++) {
          expect(eventSequence[i]).toBe(`seq-${i}`);
        }

        await stream.close();
      }
    );
  });

  it("should accumulate stats across batches", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        await stream.open({ batchSize: 5 });

        // Batch 1
        for (let i = 0; i < 5; i++) {
          stream.addEvent("quad-added", { quad: `add-${i}` });
        }

        // Batch 2
        for (let i = 0; i < 3; i++) {
          stream.addEvent("quad-removed", { quad: `rem-${i}` });
        }
        stream.flush();

        const stats = stream.getStats();

        expect(stats.quadsAdded).toBe(5);
        expect(stats.quadsRemoved).toBe(3);
        expect(stats.eventsFlushed).toBe(8);
        expect(stats.flushes).toBe(2); // 1 auto from batch size, 1 manual

        await stream.close();
      }
    );
  });

  it("should handle stream statistics over multiple operations", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        await stream.open({ batchSize: 10 });

        let stats = stream.getStats();
        expect(stats.isOpen).toBe(true);
        expect(stats.eventsFlushed).toBe(0);

        // Add and flush multiple times
        for (let i = 0; i < 3; i++) {
          stream.addEvent("quad-added", { quad: `test-${i}` });
        }
        stream.flush();

        stats = stream.getStats();
        expect(stats.eventsFlushed).toBe(3);
        expect(stats.flushes).toBe(1);

        await stream.close();
      }
    );
  });
});
