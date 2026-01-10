/**
 * @fileoverview Change Stream Lifecycle Tests
 *
 * Tests for stream opening, closing, pause, and resume operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { useChangeStream } from "../src/composables/useChangeStream.mjs";
import { withGitVan } from "../src/core/context.mjs";

describe("Change Stream - Lifecycle", () => {
  let testDir;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "changestream-lifecycle-"));
    mkdirSync(join(testDir, ".git"));
  });

  afterEach(() => {
    if (testDir) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should create a change stream instance", () => {
    const stream = useChangeStream();
    expect(stream).toBeDefined();
    expect(typeof stream.open).toBe("function");
    expect(typeof stream.close).toBe("function");
    expect(typeof stream.pause).toBe("function");
    expect(typeof stream.resume).toBe("function");
  });

  it("should open and close stream", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();

        // Initially closed
        expect(stream.getStatus().isOpen).toBe(false);

        // Open stream
        await stream.open();
        expect(stream.getStatus().isOpen).toBe(true);

        // Close stream
        await stream.close();
        expect(stream.getStatus().isOpen).toBe(false);
      }
    );
  });

  it("should throw when opening already open stream", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();

        await stream.open();
        expect(stream.getStatus().isOpen).toBe(true);

        // Try to open again
        let error = null;
        try {
          await stream.open();
        } catch (e) {
          error = e;
        }

        expect(error).toBeDefined();
        expect(error.message).toContain("already open");

        await stream.close();
      }
    );
  });

  it("should not throw when closing already closed stream", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();

        // Close without opening should not throw
        await expect(stream.close()).resolves.toBeUndefined();
      }
    );
  });

  it("should pause event emission", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        await stream.open();

        expect(stream.getStatus().isPaused).toBe(false);

        stream.pause();
        expect(stream.getStatus().isPaused).toBe(true);

        stream.resume();
        expect(stream.getStatus().isPaused).toBe(false);

        await stream.close();
      }
    );
  });

  it("should queue events while paused", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        await stream.open({ batchSize: 10 });

        stream.pause();

        // Add events while paused
        stream.addEvent("quad-added", { quad: "test1" });
        stream.addEvent("quad-added", { quad: "test2" });

        const queueBefore = stream._getQueue();
        expect(queueBefore.length).toBe(2);

        // Resume should process queue
        stream.resume();

        // After resume and automatic flush
        await new Promise((resolve) => setTimeout(resolve, 150));

        const queueAfter = stream._getQueue();
        expect(queueAfter.length).toBe(0);

        await stream.close();
      }
    );
  });

  it("should provide lifecycle stats", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();

        const initialStats = stream.getStats();
        expect(initialStats.isOpen).toBe(false);
        expect(initialStats.quadsAdded).toBe(0);

        await stream.open();

        stream.addEvent("quad-added", {});
        stream.addEvent("quad-added", {});
        stream.flush();

        const statsAfterEvents = stream.getStats();
        expect(statsAfterEvents.quadsAdded).toBe(2);
        expect(statsAfterEvents.eventsFlushed).toBe(2);

        await stream.close();

        const finalStats = stream.getStats();
        expect(finalStats.isOpen).toBe(false);
      }
    );
  });

  it("should support one-time event handlers", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        await stream.open();

        let callCount = 0;
        stream.once("store-mutated", () => {
          callCount++;
        });

        stream.addEvent("quad-added", {});
        stream.flush();
        await new Promise((resolve) => setTimeout(resolve, 100));

        stream.addEvent("quad-added", {});
        stream.flush();
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(callCount).toBe(1); // Should only be called once

        await stream.close();
      }
    );
  });

  it("should support unsubscribe", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        await stream.open();

        let callCount = 0;
        const handler = () => {
          callCount++;
        };

        stream.on("store-mutated", handler);
        stream.addEvent("quad-added", {});
        stream.flush();
        await new Promise((resolve) => setTimeout(resolve, 100));

        stream.off("store-mutated", handler);
        stream.addEvent("quad-added", {});
        stream.flush();
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(callCount).toBe(1);

        await stream.close();
      }
    );
  });

  it("should emit stream-closed event", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        await stream.open();

        let closedEvent = null;
        stream.on("stream-closed", (event) => {
          closedEvent = event;
        });

        stream.addEvent("quad-added", {});
        await stream.close();

        expect(closedEvent).toBeDefined();
        expect(closedEvent.stats).toBeDefined();
        expect(closedEvent.stats.quadsAdded).toBe(1);
      }
    );
  });
});
