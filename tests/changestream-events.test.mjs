/**
 * @fileoverview Change Stream Event Emission Tests
 *
 * Tests for proper event emission on store mutations
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { useChangeStream } from "../src/composables/useChangeStream.mjs";
import { withGitVan } from "../src/core/context.mjs";

describe("Change Stream - Event Emission", () => {
  let testDir;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "changestream-events-"));
    mkdirSync(join(testDir, ".git"));
  });

  afterEach(() => {
    if (testDir) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should emit store-mutated event on git changes", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        await stream.open();

        let eventReceived = null;
        stream.on("store-mutated", (event) => {
          eventReceived = event;
        });

        stream.addEvent("quad-added", { quad: "test-quad" });
        stream.flush();

        expect(eventReceived).toBeDefined();
        expect(eventReceived.timestamp).toBeDefined();
        // store-mutated is emitted for any type of mutation
        expect(eventReceived.type).toBe("quad-added");

        await stream.close();
      }
    );
  });

  it("should emit quad-added events", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        await stream.open();

        let eventReceived = null;
        stream.on("quad-added", (event) => {
          eventReceived = event;
        });

        stream.addEvent("quad-added", { quad: "test-quad" });
        stream.flush();

        expect(eventReceived).toBeDefined();
        expect(eventReceived.type).toBe("quad-added");
        expect(eventReceived.quad).toBe("test-quad");

        await stream.close();
      }
    );
  });

  it("should emit quad-removed events", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        await stream.open();

        let eventReceived = null;
        stream.on("quad-removed", (event) => {
          eventReceived = event;
        });

        stream.addEvent("quad-removed", { quad: "removed-quad" });
        stream.flush();

        expect(eventReceived).toBeDefined();
        expect(eventReceived.type).toBe("quad-removed");
        expect(eventReceived.quad).toBe("removed-quad");

        await stream.close();
      }
    );
  });

  it("should include timestamp in events", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        await stream.open();

        const beforeTime = Date.now();

        let receivedEvent = null;
        stream.on("quad-added", (event) => {
          receivedEvent = event;
        });

        stream.addEvent("quad-added", { quad: "test" });
        stream.flush();

        const afterTime = Date.now();

        expect(receivedEvent.timestamp).toBeDefined();
        expect(receivedEvent.timestamp).toBeGreaterThanOrEqual(beforeTime);
        expect(receivedEvent.timestamp).toBeLessThanOrEqual(afterTime);

        await stream.close();
      }
    );
  });

  it("should emit multiple events in sequence", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        await stream.open();

        const events = [];
        stream.on("quad-added", (event) => {
          events.push(event);
        });

        stream.addEvent("quad-added", { quad: "quad1" });
        stream.addEvent("quad-added", { quad: "quad2" });
        stream.addEvent("quad-added", { quad: "quad3" });
        stream.flush();

        expect(events.length).toBe(3);
        expect(events[0].quad).toBe("quad1");
        expect(events[1].quad).toBe("quad2");
        expect(events[2].quad).toBe("quad3");

        await stream.close();
      }
    );
  });

  it("should emit batch-flushed event", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        await stream.open();

        let batchEvent = null;
        stream.on("batch-flushed", (event) => {
          batchEvent = event;
        });

        stream.addEvent("quad-added", { quad: "test1" });
        stream.addEvent("quad-added", { quad: "test2" });
        stream.flush();

        expect(batchEvent).toBeDefined();
        expect(batchEvent.count).toBe(2);
        expect(batchEvent.events).toHaveLength(2);
        expect(batchEvent.timestamp).toBeDefined();

        await stream.close();
      }
    );
  });

  it("should properly route events based on type", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        await stream.open();

        const addedEvents = [];
        const removedEvents = [];
        const mutationEvents = [];

        stream.on("quad-added", (event) => {
          addedEvents.push(event);
        });

        stream.on("quad-removed", (event) => {
          removedEvents.push(event);
        });

        stream.on("store-mutated", (event) => {
          mutationEvents.push(event);
        });

        stream.addEvent("quad-added", { quad: "add1" });
        stream.addEvent("quad-removed", { quad: "remove1" });
        stream.addEvent("quad-added", { quad: "add2" });
        stream.flush();

        expect(addedEvents.length).toBe(2);
        expect(removedEvents.length).toBe(1);
        expect(mutationEvents.length).toBe(3); // All events trigger store-mutated

        await stream.close();
      }
    );
  });

  it("should not emit events while paused", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        await stream.open();

        let eventCount = 0;
        stream.on("quad-added", () => {
          eventCount++;
        });

        stream.pause();

        // Add events while paused
        stream.addEvent("quad-added", { quad: "test1" });
        stream.addEvent("quad-added", { quad: "test2" });
        stream.flush();

        // No events should be emitted while paused
        expect(eventCount).toBe(0);

        // Events should be in queue
        expect(stream._getQueue().length).toBe(2);

        // Resume and flush
        stream.resume();
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Now events should be emitted
        expect(eventCount).toBe(2);

        await stream.close();
      }
    );
  });

  it("should handle event data properly", async () => {
    await withGitVan(
      { cwd: testDir, env: { TZ: "UTC", LANG: "C" } },
      async () => {
        const stream = useChangeStream();
        await stream.open();

        let receivedEvent = null;
        stream.on("quad-added", (event) => {
          receivedEvent = event;
        });

        const testData = {
          subject: "http://example.org/test",
          predicate: "http://example.org/prop",
          object: "http://example.org/value",
        };

        stream.addEvent("quad-added", testData);
        stream.flush();

        expect(receivedEvent.subject).toBe(testData.subject);
        expect(receivedEvent.predicate).toBe(testData.predicate);
        expect(receivedEvent.object).toBe(testData.object);

        await stream.close();
      }
    );
  });
});
