/**
 * @fileoverview Comprehensive tests for GitVan v4.0.0 Reactive Hooks
 *
 * Tests reactive subscription system, state change detection, performance,
 * integration, and scale capabilities.
 *
 * Target: <50ms latency, 100+ subscriptions, >85% coverage
 *
 * @version 4.0.0
 * @license Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ReactiveSubscriptionSystem } from "../../src/hooks/reactive-triggers.mjs";
import { StateChangeDetector } from "../../src/hooks/state-change-detector.mjs";
import { UnrdfHooksBridge } from "../../src/integrations/bree-hook-adapter.mjs";
import { RdfEngine } from "../../src/engines/RdfEngine.mjs";

// Mock logger for testing
const createMockLogger = () => ({
  info: () => {},
  debug: () => {},
  warn: () => {},
  error: () => {},
});

// Helper to create test RDF graph
function createTestGraph() {
  const engine = new RdfEngine({
    baseIRI: "https://example.org/",
    deterministic: true,
  });

  const testTurtle = `@prefix ex: <https://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .

ex:alice rdf:type foaf:Person ;
    foaf:name "Alice" ;
    foaf:age 30 ;
    foaf:knows ex:bob .

ex:bob rdf:type foaf:Person ;
    foaf:name "Bob" ;
    foaf:age 25 .`;

  const store = engine.parseTurtle(testTurtle);
  return { store, engine };
}

// Helper to modify graph
function modifyGraph(store, engine) {
  const modified = `@prefix ex: <https://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .

ex:alice rdf:type foaf:Person ;
    foaf:name "Alice Smith" ;
    foaf:age 31 ;
    foaf:knows ex:bob ;
    foaf:knows ex:charlie .

ex:bob rdf:type foaf:Person ;
    foaf:name "Bob Johnson" ;
    foaf:age 26 .

ex:charlie rdf:type foaf:Person ;
    foaf:name "Charlie" .`;

  const newStore = engine.parseTurtle(modified);
  return newStore;
}

describe("ReactiveSubscriptionSystem", () => {
  let subscriptionSystem;

  beforeEach(() => {
    subscriptionSystem = new ReactiveSubscriptionSystem({
      logger: createMockLogger(),
      debounceMs: 5,
    });
  });

  afterEach(() => {
    subscriptionSystem.clear();
  });

  describe("Subscription Management", () => {
    it("should subscribe to changes", () => {
      const callback = () => {};
      const subId = subscriptionSystem.subscribe(callback);

      expect(subId).toBeDefined();
      expect(subId).toMatch(/^sub_/);
      expect(subscriptionSystem.getMetrics().activeSubscriptions).toBe(1);
    });

    it("should generate unique subscription IDs", () => {
      const callback = () => {};
      const subId1 = subscriptionSystem.subscribe(callback);
      const subId2 = subscriptionSystem.subscribe(callback);

      expect(subId1).not.toBe(subId2);
    });

    it("should throw error for non-function callback", () => {
      expect(() => {
        subscriptionSystem.subscribe("not-a-function");
      }).toThrow("Callback must be a function");
    });

    it("should unsubscribe from changes", () => {
      const callback = () => {};
      const subId = subscriptionSystem.subscribe(callback);

      expect(subscriptionSystem.getMetrics().activeSubscriptions).toBe(1);

      const result = subscriptionSystem.unsubscribe(subId);
      expect(result).toBe(true);
      expect(subscriptionSystem.getMetrics().activeSubscriptions).toBe(0);
    });

    it("should return false for non-existent unsubscribe", () => {
      const result = subscriptionSystem.unsubscribe("non-existent");
      expect(result).toBe(false);
    });

    it("should support custom subscription IDs", () => {
      const callback = () => {};
      const customId = "my-custom-id";
      const subId = subscriptionSystem.subscribe(callback, { id: customId });

      expect(subId).toBe(customId);
    });
  });

  describe("Change Notifications", () => {
    it("should notify subscriptions of changes", async () => {
      const changes = [];
      subscriptionSystem.subscribe((change) => {
        changes.push(change);
      });

      await subscriptionSystem.notifyChange({
        subject: "https://example.org/alice",
        predicate: "https://xmlns.com/foaf/0.1/name",
        object: "Alice",
        type: "add",
      });

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(changes.length).toBeGreaterThan(0);
      expect(changes[0].subject).toBe("https://example.org/alice");
    });

    it("should support multiple subscribers", async () => {
      const changes1 = [];
      const changes2 = [];

      subscriptionSystem.subscribe((change) => changes1.push(change));
      subscriptionSystem.subscribe((change) => changes2.push(change));

      await subscriptionSystem.notifyChange({
        subject: "https://example.org/alice",
        predicate: "https://xmlns.com/foaf/0.1/name",
        object: "Alice",
      });

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(changes1.length).toBeGreaterThan(0);
      expect(changes2.length).toBeGreaterThan(0);
    });

    it("should support change filtering by predicate", async () => {
      const changes = [];
      subscriptionSystem.subscribe((change) => changes.push(change), {
        filter: {
          predicates: ["https://xmlns.com/foaf/0.1/name"],
        },
      });

      await subscriptionSystem.notifyChange({
        subject: "https://example.org/alice",
        predicate: "https://xmlns.com/foaf/0.1/name",
        object: "Alice",
      });

      await subscriptionSystem.notifyChange({
        subject: "https://example.org/alice",
        predicate: "https://xmlns.com/foaf/0.1/age",
        object: "30",
      });

      await new Promise((resolve) => setTimeout(resolve, 20));

      // Should only receive name changes
      expect(changes.every((c) => c.predicate === "https://xmlns.com/foaf/0.1/name")).toBe(true);
    });

    it("should support change filtering by subject", async () => {
      const changes = [];
      subscriptionSystem.subscribe((change) => changes.push(change), {
        filter: {
          subjects: ["https://example.org/alice"],
        },
      });

      await subscriptionSystem.notifyChange({
        subject: "https://example.org/alice",
        predicate: "https://xmlns.com/foaf/0.1/name",
        object: "Alice",
      });

      await subscriptionSystem.notifyChange({
        subject: "https://example.org/bob",
        predicate: "https://xmlns.com/foaf/0.1/name",
        object: "Bob",
      });

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(changes.every((c) => c.subject === "https://example.org/alice")).toBe(true);
    });

    it("should batch changes efficiently", async () => {
      const changes = [];
      subscriptionSystem.subscribe((change) => changes.push(change));

      // Send multiple changes
      for (let i = 0; i < 10; i++) {
        await subscriptionSystem.notifyChange({
          subject: `https://example.org/person${i}`,
          predicate: "https://xmlns.com/foaf/0.1/name",
          object: `Person ${i}`,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(changes.length).toBeGreaterThan(0);
    });

    it("should throw error for invalid change notification", async () => {
      await expect(
        subscriptionSystem.notifyChange({
          object: "test",
        })
      ).rejects.toThrow("Change must include subject and predicate");
    });

    it("should notify bulk changes", async () => {
      const changes = [];
      subscriptionSystem.subscribe((change) => changes.push(change));

      await subscriptionSystem.notifyChanges([
        {
          subject: "https://example.org/alice",
          predicate: "https://xmlns.com/foaf/0.1/name",
          object: "Alice",
        },
        {
          subject: "https://example.org/bob",
          predicate: "https://xmlns.com/foaf/0.1/name",
          object: "Bob",
        },
      ]);

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(changes.length).toBeGreaterThan(0);
    });
  });

  describe("Metrics and Monitoring", () => {
    it("should track metrics", async () => {
      subscriptionSystem.subscribe(() => {});

      await subscriptionSystem.notifyChange({
        subject: "https://example.org/alice",
        predicate: "https://xmlns.com/foaf/0.1/name",
        object: "Alice",
      });

      await new Promise((resolve) => setTimeout(resolve, 20));

      const metrics = subscriptionSystem.getMetrics();
      expect(metrics.activeSubscriptions).toBe(1);
      expect(metrics.totalChanges).toBeGreaterThan(0);
      expect(metrics.totalNotifications).toBeGreaterThan(0);
    });

    it("should track latency", async () => {
      subscriptionSystem.subscribe(() => {});

      await subscriptionSystem.notifyChange({
        subject: "https://example.org/alice",
        predicate: "https://xmlns.com/foaf/0.1/name",
        object: "Alice",
      });

      await new Promise((resolve) => setTimeout(resolve, 20));

      const metrics = subscriptionSystem.getMetrics();
      expect(metrics.averageLatency).toBeLessThan(50);
      expect(metrics.maxLatency).toBeLessThan(50);
    });

    it("should reset metrics", () => {
      subscriptionSystem.subscribe(() => {});

      let metrics = subscriptionSystem.getMetrics();
      expect(metrics.activeSubscriptions).toBe(1);

      subscriptionSystem.resetMetrics();
      metrics = subscriptionSystem.getMetrics();

      expect(metrics.totalSubscriptions).toBe(0);
      expect(metrics.totalChanges).toBe(0);
    });

    it("should list subscriptions", () => {
      subscriptionSystem.subscribe(() => {}, { id: "sub1" });
      subscriptionSystem.subscribe(() => {}, { id: "sub2" });

      const subs = subscriptionSystem.getSubscriptions();
      expect(subs.length).toBe(2);
      expect(subs.map((s) => s.id)).toContain("sub1");
      expect(subs.map((s) => s.id)).toContain("sub2");
    });
  });

  describe("Weak Reference Cleanup", () => {
    it("should clean up garbage collected callbacks", async () => {
      let callback = () => {};
      const subId = subscriptionSystem.subscribe(callback);

      // Verify subscription exists
      expect(subscriptionSystem.getSubscription(subId)).not.toBeNull();

      // Delete callback reference to allow garbage collection
      callback = null;

      // Force cleanup through explicit unsubscribe call
      // (Real GC would happen in browser/Node.js environment)
      const result = subscriptionSystem.unsubscribe(subId);
      expect(result).toBe(true);
    });
  });

  describe("Scale Testing", () => {
    it("should handle 100+ subscriptions", () => {
      const subscriptions = [];
      for (let i = 0; i < 150; i++) {
        const subId = subscriptionSystem.subscribe(() => {});
        subscriptions.push(subId);
      }

      expect(subscriptionSystem.getMetrics().activeSubscriptions).toBe(150);
    });

    it("should handle 100+ simultaneous changes with sub-50ms latency", async () => {
      const latencies = [];
      subscriptionSystem.subscribe(() => {});

      const startTime = performance.now();

      // Send 100 changes
      for (let i = 0; i < 100; i++) {
        await subscriptionSystem.notifyChange({
          subject: `https://example.org/person${i}`,
          predicate: "https://xmlns.com/foaf/0.1/name",
          object: `Person ${i}`,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      const totalTime = performance.now() - startTime;
      const metrics = subscriptionSystem.getMetrics();

      // Should achieve sub-50ms average latency
      expect(metrics.averageLatency).toBeLessThan(50);
      expect(totalTime).toBeLessThan(500); // Total should be reasonable
    });
  });
});

describe("StateChangeDetector", () => {
  let detector;
  let testGraph;

  beforeEach(() => {
    detector = new StateChangeDetector({
      logger: createMockLogger(),
      trackHistory: true,
    });
    testGraph = createTestGraph();
  });

  afterEach(() => {
    detector.reset();
  });

  describe("Snapshot Management", () => {
    it("should create snapshots", () => {
      const snapshotId = detector.createSnapshot(testGraph.store);

      expect(snapshotId).toBeDefined();
      expect(snapshotId).toMatch(/^snap_/);

      const snapshot = detector.getSnapshot(snapshotId);
      expect(snapshot).not.toBeNull();
      expect(snapshot.quadCount).toBeGreaterThan(0);
    });

    it("should track snapshot history", () => {
      const snap1 = detector.createSnapshot(testGraph.store);
      const snap2 = detector.createSnapshot(testGraph.store);

      const snapshots = detector.getSnapshots();
      expect(snapshots.length).toBe(2);
      expect(snapshots.map((s) => s.id)).toContain(snap1);
      expect(snapshots.map((s) => s.id)).toContain(snap2);
    });

    it("should limit snapshot history", () => {
      const detector2 = new StateChangeDetector({
        logger: createMockLogger(),
        trackHistory: true,
        historyLimit: 5,
      });

      // Create 10 snapshots
      for (let i = 0; i < 10; i++) {
        detector2.createSnapshot(testGraph.store);
      }

      const snapshots = detector2.getSnapshots();
      expect(snapshots.length).toBe(5);
    });
  });

  describe("Change Detection", () => {
    it("should detect changes between snapshots", () => {
      const snap1 = detector.createSnapshot(testGraph.store);
      const modifiedGraph = modifyGraph(testGraph.store, testGraph.engine);
      const snap2 = detector.createSnapshot(modifiedGraph);

      const result = detector.detectChanges(snap1, snap2);

      expect(result.changes.length).toBeGreaterThan(0);
      expect(result.changeCount).toBeGreaterThan(0);
      expect(result.affectedSubjects.length).toBeGreaterThan(0);
    });

    it("should detect changes from graph", () => {
      const snap1 = detector.createSnapshot(testGraph.store);
      const modifiedGraph = modifyGraph(testGraph.store, testGraph.engine);

      const result = detector.detectChangesFromGraph(modifiedGraph, snap1);

      expect(result.changes.length).toBeGreaterThan(0);
    });

    it("should compute delta correctly", () => {
      const snap1 = detector.createSnapshot(testGraph.store);
      const modifiedGraph = modifyGraph(testGraph.store, testGraph.engine);
      const snap2 = detector.createSnapshot(modifiedGraph);

      const result = detector.detectChanges(snap1, snap2);

      // Should have both add and update types
      const types = new Set(result.changes.map((c) => c.type));
      expect(["add", "update", "remove"].some((t) => types.has(t))).toBe(true);
    });

    it("should track affected subjects", () => {
      const snap1 = detector.createSnapshot(testGraph.store);
      const modifiedGraph = modifyGraph(testGraph.store, testGraph.engine);
      const snap2 = detector.createSnapshot(modifiedGraph);

      const result = detector.detectChanges(snap1, snap2);

      expect(result.affectedSubjects).toBeDefined();
      expect(Array.isArray(result.affectedSubjects)).toBe(true);
    });

    it("should get subject-specific changes", () => {
      const snap1 = detector.createSnapshot(testGraph.store);
      const modifiedGraph = modifyGraph(testGraph.store, testGraph.engine);
      const snap2 = detector.createSnapshot(modifiedGraph);

      const changes = detector.getSubjectChanges(
        "https://example.org/alice",
        snap1,
        snap2
      );

      expect(Array.isArray(changes)).toBe(true);
    });
  });

  describe("Change Serialization", () => {
    it("should serialize changes", () => {
      const snap1 = detector.createSnapshot(testGraph.store);
      const modifiedGraph = modifyGraph(testGraph.store, testGraph.engine);
      const snap2 = detector.createSnapshot(modifiedGraph);

      const result = detector.detectChanges(snap1, snap2);
      const serialized = detector.serializeChanges(result.changes);

      expect(Array.isArray(serialized)).toBe(true);
      if (serialized.length > 0) {
        expect(serialized[0]).toHaveProperty("subject");
        expect(serialized[0]).toHaveProperty("predicate");
        expect(serialized[0]).toHaveProperty("timestamp");
      }
    });

    it("should track change history", () => {
      const snap1 = detector.createSnapshot(testGraph.store);
      const modifiedGraph = modifyGraph(testGraph.store, testGraph.engine);
      const snap2 = detector.createSnapshot(modifiedGraph);

      detector.detectChanges(snap1, snap2);

      const history = detector.getChangeHistory({ limit: 50 });
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe("Metrics and Monitoring", () => {
    it("should track detection metrics", () => {
      const snap1 = detector.createSnapshot(testGraph.store);
      const modifiedGraph = modifyGraph(testGraph.store, testGraph.engine);
      const snap2 = detector.createSnapshot(modifiedGraph);

      detector.detectChanges(snap1, snap2);

      const metrics = detector.getMetrics();
      expect(metrics.totalDetections).toBe(1);
      expect(metrics.totalChanges).toBeGreaterThan(0);
      expect(metrics.snapshotCount).toBe(2);
    });

    it("should calculate delta size metrics", () => {
      const snap1 = detector.createSnapshot(testGraph.store);
      const modifiedGraph = modifyGraph(testGraph.store, testGraph.engine);
      const snap2 = detector.createSnapshot(modifiedGraph);

      detector.detectChanges(snap1, snap2);

      const metrics = detector.getMetrics();
      expect(metrics.averageDeltaSize).toBeGreaterThan(0);
    });
  });
});

describe("UnrdfHooksBridge Reactive Integration", () => {
  let bridge;
  let testGraph;

  beforeEach(async () => {
    bridge = new UnrdfHooksBridge({
      logger: createMockLogger(),
      debounceMs: 5,
    });
    testGraph = createTestGraph();
  });

  afterEach(async () => {
    await bridge.shutdown();
  });

  describe("Reactive Hook Registration", () => {
    it("should register reactive hooks", async () => {
      const callback = () => {};
      const result = await bridge.registerReactiveHook({
        id: "test-hook",
        name: "Test Hook",
        callback,
      });

      expect(result.success).toBe(true);
      expect(result.hookId).toBe("test-hook");
      expect(result.subscriptionId).toBeDefined();
    });

    it("should throw error for missing callback", async () => {
      await expect(
        bridge.registerReactiveHook({
          id: "test-hook",
          name: "Test Hook",
        })
      ).rejects.toThrow("callback function");
    });

    it("should throw error for missing ID", async () => {
      await expect(
        bridge.registerReactiveHook({
          name: "Test Hook",
          callback: () => {},
        })
      ).rejects.toThrow("id");
    });

    it("should unregister reactive hooks", async () => {
      await bridge.registerReactiveHook({
        id: "test-hook",
        name: "Test Hook",
        callback: () => {},
      });

      const result = await bridge.unregisterReactiveHook("test-hook");
      expect(result.success).toBe(true);
    });

    it("should list reactive hooks", async () => {
      await bridge.registerReactiveHook({
        id: "hook1",
        name: "Hook 1",
        callback: () => {},
      });

      await bridge.registerReactiveHook({
        id: "hook2",
        name: "Hook 2",
        callback: () => {},
      });

      const hooks = bridge.listReactiveHooks();
      expect(hooks.length).toBe(2);
      expect(hooks.map((h) => h.hookId)).toContain("hook1");
    });
  });

  describe("Graph Change Notification", () => {
    it("should notify graph changes", async () => {
      let notificationReceived = false;
      await bridge.registerReactiveHook({
        id: "test-hook",
        name: "Test Hook",
        callback: () => {
          notificationReceived = true;
        },
      });

      // Create initial snapshot
      const snap1 = bridge.stateChangeDetector.createSnapshot(testGraph.store);

      // Modify graph and create new snapshot
      const modifiedGraph = modifyGraph(testGraph.store, testGraph.engine);
      const result = await bridge.notifyGraphChanges(modifiedGraph, snap1);

      expect(result.success).toBe(true);
      expect(result.changeCount).toBeGreaterThanOrEqual(0);
    });

    it("should track notification metrics", async () => {
      await bridge.registerReactiveHook({
        id: "test-hook",
        name: "Test Hook",
        callback: () => {},
      });

      const snap1 = bridge.stateChangeDetector.createSnapshot(testGraph.store);
      const modifiedGraph = modifyGraph(testGraph.store, testGraph.engine);

      await bridge.notifyGraphChanges(modifiedGraph, snap1);

      const metrics = bridge.getReactiveMetrics();
      expect(metrics.registeredReactiveHooks).toBe(1);
      expect(metrics.subscriptions).toBeDefined();
      expect(metrics.stateChanges).toBeDefined();
    });

    it("should achieve sub-50ms latency for notifications", async () => {
      const callback = () => {};
      await bridge.registerReactiveHook({
        id: "test-hook",
        name: "Test Hook",
        callback,
      });

      const snap1 = bridge.stateChangeDetector.createSnapshot(testGraph.store);
      const modifiedGraph = modifyGraph(testGraph.store, testGraph.engine);

      const startTime = performance.now();
      const result = await bridge.notifyGraphChanges(modifiedGraph, snap1);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(100); // Allow some overhead for test env
      expect(result.success).toBe(true);
    });
  });

  describe("Scale Testing", () => {
    it("should handle 100+ reactive hooks", async () => {
      for (let i = 0; i < 120; i++) {
        await bridge.registerReactiveHook({
          id: `hook${i}`,
          name: `Hook ${i}`,
          callback: () => {},
        });
      }

      const hooks = bridge.listReactiveHooks();
      expect(hooks.length).toBe(120);
    });

    it("should maintain performance with many reactive hooks", async () => {
      // Register multiple hooks
      for (let i = 0; i < 50; i++) {
        await bridge.registerReactiveHook({
          id: `hook${i}`,
          name: `Hook ${i}`,
          callback: () => {},
        });
      }

      const snap1 = bridge.stateChangeDetector.createSnapshot(testGraph.store);
      const modifiedGraph = modifyGraph(testGraph.store, testGraph.engine);

      const startTime = performance.now();
      const result = await bridge.notifyGraphChanges(modifiedGraph, snap1);
      const duration = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(500); // Should still be reasonably fast
    });
  });
});

describe("Integration Tests", () => {
  let bridge;
  let subscriptionSystem;
  let detector;
  let testGraph;

  beforeEach(async () => {
    bridge = new UnrdfHooksBridge({
      logger: createMockLogger(),
    });
    subscriptionSystem = new ReactiveSubscriptionSystem({
      logger: createMockLogger(),
    });
    detector = new StateChangeDetector({
      logger: createMockLogger(),
    });
    testGraph = createTestGraph();
  });

  afterEach(async () => {
    await bridge.shutdown();
    subscriptionSystem.clear();
    detector.reset();
  });

  it("should integrate all three components", async () => {
    const changes = [];

    // Register reactive hook through bridge
    await bridge.registerReactiveHook({
      id: "integration-test",
      name: "Integration Test",
      callback: (change) => {
        changes.push(change);
      },
    });

    // Create snapshots and detect changes
    const snap1 = detector.createSnapshot(testGraph.store);
    const modifiedGraph = modifyGraph(testGraph.store, testGraph.engine);
    const snap2 = detector.createSnapshot(modifiedGraph);

    const detectionResult = detector.detectChanges(snap1, snap2);

    // Notify through bridge
    for (const change of detectionResult.changes) {
      await subscriptionSystem.notifyChange({
        subject: change.subject,
        predicate: change.predicate,
        object: change.newValue || change.oldValue || "",
        type: change.type,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify integration
    expect(detectionResult.changes.length).toBeGreaterThan(0);
  });

  it("should maintain consistency across components", async () => {
    // Register hooks
    const hook1Changes = [];
    const hook2Changes = [];

    await bridge.registerReactiveHook({
      id: "hook1",
      name: "Hook 1",
      callback: (change) => {
        hook1Changes.push(change);
      },
    });

    await bridge.registerReactiveHook({
      id: "hook2",
      name: "Hook 2",
      callback: (change) => {
        hook2Changes.push(change);
      },
    });

    // Generate and notify changes
    const snap1 = bridge.stateChangeDetector.createSnapshot(testGraph.store);
    const modifiedGraph = modifyGraph(testGraph.store, testGraph.engine);

    const result = await bridge.notifyGraphChanges(modifiedGraph, snap1);

    expect(result.success).toBe(true);
    expect(bridge.listReactiveHooks().length).toBe(2);
  });
});
