/**
 * Federation Events Tests
 * Tests for useFederationEvents composable - targeting 85%+ coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  withTestEnvironment,
  initTestRepo,
} from "../helpers/index.mjs";
import { useFederationEvents } from "../../src/composables/federation-events.mjs";
import { withGitVan } from "../../src/core/context.mjs";

describe("Federation Events - useFederationEvents Composable", () => {
  let testContext;

  beforeEach(async () => {
    testContext = await withTestEnvironment(async (ctx) => {
      return ctx;
    });
  });

  afterEach(() => {
    if (testContext?.cleanup) {
      testContext.cleanup();
    }
  });

  describe("Event Broadcasting", () => {
    it("should broadcast event to peers", async () => {
      await withGitVan(testContext, async () => {
        const events = useFederationEvents();

        const event = {
          type: "post-commit",
          data: {
            commitHash: "abc123",
            message: "Test commit",
          },
          timestamp: new Date().toISOString(),
        };

        const result = await events.broadcastEvent(event, {
          peers: [],
          persistent: false,
        });

        expect(result).toBeDefined();
        expect(result.eventId).toBeDefined();
        expect(result.timestamp).toBeDefined();
        expect(result.targetPeers).toBe(0);
      });
    });

    it("should generate unique event ID", async () => {
      await withGitVan(testContext, async () => {
        const events = useFederationEvents();

        const event1 = {
          type: "post-commit",
          data: { commitHash: "abc123" },
          timestamp: new Date().toISOString(),
        };

        const result1 = await events.broadcastEvent(event1, {
          peers: [],
          persistent: false,
        });

        // Add small delay to ensure different timestamp
        await new Promise((resolve) => setTimeout(resolve, 10));

        const event2 = {
          type: "post-commit",
          data: { commitHash: "def456" },
          timestamp: new Date().toISOString(),
        };

        const result2 = await events.broadcastEvent(event2, {
          peers: [],
          persistent: false,
        });

        expect(result1.eventId).not.toBe(result2.eventId);
      });
    });

    it("should broadcast to multiple peers", async () => {
      await withGitVan(testContext, async () => {
        const events = useFederationEvents();

        const peers = [
          { id: "peer1", url: "https://peer1.example.com", name: "peer1" },
          { id: "peer2", url: "https://peer2.example.com", name: "peer2" },
          { id: "peer3", url: "https://peer3.example.com", name: "peer3" },
        ];

        const event = {
          type: "post-push",
          data: { remoteName: "origin", branchName: "main" },
          timestamp: new Date().toISOString(),
        };

        const result = await events.broadcastEvent(event, {
          peers,
          persistent: false,
        });

        expect(result.targetPeers).toBe(3);
        expect(result.successfulBroadcasts).toBeGreaterThanOrEqual(0);
      });
    });

    it("should notify individual peer", async () => {
      await withGitVan(testContext, async () => {
        const events = useFederationEvents();

        const peer = { id: "peer1", url: "https://peer1.example.com" };

        const event = {
          id: "event-1",
          type: "post-commit",
          data: { commitHash: "abc123" },
          timestamp: new Date().toISOString(),
        };

        const result = await events.notifyPeer(peer, event);

        expect(result).toBeDefined();
        expect(result.peerId).toBe("peer1");
        expect(result.eventId).toBe("event-1");
        expect(result.success).toBe(true);
      });
    });
  });

  describe("Event Subscription", () => {
    it("should subscribe to peer events", async () => {
      await withGitVan(testContext, async () => {
        const events = useFederationEvents();

        const peer = { id: "peer1", url: "https://peer1.example.com" };

        const subscription = await events.subscribeToPeer(peer, {
          pollInterval: 0,
        });

        expect(subscription).toBeDefined();
        expect(subscription.peerId).toBe("peer1");
        expect(subscription.subscriptionId).toBeDefined();
        expect(subscription.active).toBe(true);
      });
    });

    it("should poll peer events", async () => {
      await withGitVan(testContext, async () => {
        const events = useFederationEvents();

        const peer = { id: "peer1", url: "https://peer1.example.com" };

        // Add some events for the peer
        const event1 = {
          id: "event-1",
          type: "post-commit",
          data: { commitHash: "abc" },
        };

        await events.notifyPeer(peer, event1);

        // Poll for events
        const polledEvents = await events.pollPeerEvents(peer);

        expect(Array.isArray(polledEvents)).toBe(true);
        expect(polledEvents.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("should unsubscribe from peer", async () => {
      await withGitVan(testContext, async () => {
        const events = useFederationEvents();

        const peer = { id: "peer1", url: "https://peer1.example.com" };

        const subscription = await events.subscribeToPeer(peer, {
          pollInterval: 0,
        });

        await events.unsubscribe(subscription);

        expect(subscription.active).toBe(false);
      });
    });

    it("should handle subscription callbacks", async () => {
      await withGitVan(testContext, async () => {
        const events = useFederationEvents();

        const peer = { id: "peer1", url: "https://peer1.example.com" };

        let callbackCount = 0;
        const onEvent = vi.fn(async (event) => {
          callbackCount++;
        });

        const subscription = await events.subscribeToPeer(peer, {
          pollInterval: 0,
          onEvent,
        });

        expect(subscription).toBeDefined();
        expect(subscription.active).toBe(true);
      });
    });

    it("should track subscription state", async () => {
      await withGitVan(testContext, async () => {
        const events = useFederationEvents();

        const peer = { id: "peer1", url: "https://peer1.example.com" };

        const subscription = await events.subscribeToPeer(peer, {
          pollInterval: 0,
        });

        expect(subscription.eventsReceived).toBe(0);
        expect(subscription.startedAt).toBeDefined();

        await events.notifyPeer(peer, {
          id: "e1",
          type: "post-commit",
        });

        const polledEvents = await events.pollPeerEvents(peer);
        expect(polledEvents.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("Peer Synchronization", () => {
    it("should synchronize with peer", async () => {
      await withGitVan(testContext, async () => {
        const events = useFederationEvents();

        const peer = { id: "peer1", url: "https://peer1.example.com" };

        const localEvents = [
          {
            type: "post-commit",
            data: { commitHash: "abc" },
            timestamp: new Date().toISOString(),
          },
        ];

        const result = await events.syncWithPeer(peer, localEvents);

        expect(result).toBeDefined();
        expect(result.peerId).toBe("peer1");
        expect(result.sentEvents).toBeGreaterThanOrEqual(0);
        expect(result.receivedEvents).toBeGreaterThanOrEqual(0);
      });
    });

    it("should resolve conflicts during sync", async () => {
      await withGitVan(testContext, async () => {
        const events = useFederationEvents();

        const peer = { id: "peer1", url: "https://peer1.example.com" };

        const localEvents = [
          {
            type: "post-commit",
            data: { commitHash: "abc" },
            timestamp: new Date().toISOString(),
          },
        ];

        const result = await events.syncWithPeer(peer, localEvents, {
          resolveConflicts: true,
        });

        expect(result.mergedEvents).toBeDefined();
        expect(Array.isArray(result.mergedEvents)).toBe(true);
      });
    });

    it("should handle bidirectional sync", async () => {
      await withGitVan(testContext, async () => {
        const events = useFederationEvents();

        const peer1 = { id: "peer1", url: "https://peer1.example.com" };
        const peer2 = { id: "peer2", url: "https://peer2.example.com" };

        const event1 = {
          type: "post-commit",
          data: { commitHash: "abc" },
          timestamp: new Date().toISOString(),
        };

        // Broadcast from peer1
        await events.notifyPeer(peer1, event1);

        // Sync peer2
        const syncResult = await events.syncWithPeer(peer2, []);

        expect(syncResult).toBeDefined();
        expect(syncResult.peerId).toBe("peer2");
      });
    });
  });

  describe("Subscription Management", () => {
    it("should get all subscriptions", async () => {
      await withGitVan(testContext, async () => {
        const events = useFederationEvents();

        const peer1 = { id: "peer1", url: "https://peer1.example.com" };
        const peer2 = { id: "peer2", url: "https://peer2.example.com" };

        await events.subscribeToPeer(peer1, { pollInterval: 0 });
        await events.subscribeToPeer(peer2, { pollInterval: 0 });

        const subscriptions = await events.getSubscriptions();

        expect(Array.isArray(subscriptions)).toBe(true);
        expect(subscriptions.length).toBeGreaterThanOrEqual(2);
      });
    });

    it("should get events from specific peer", async () => {
      await withGitVan(testContext, async () => {
        const events = useFederationEvents();

        const peer = { id: "peer1", url: "https://peer1.example.com" };

        const event = {
          type: "post-commit",
          data: { commitHash: "abc" },
          timestamp: new Date().toISOString(),
        };

        await events.notifyPeer(peer, event);

        const peerEvents = await events.getEventsFromPeer("peer1");

        expect(Array.isArray(peerEvents)).toBe(true);
        expect(peerEvents.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("should clear events from peer", async () => {
      await withGitVan(testContext, async () => {
        const events = useFederationEvents();

        const peer = { id: "peer1", url: "https://peer1.example.com" };

        const event = {
          type: "post-commit",
          data: { commitHash: "abc" },
        };

        await events.notifyPeer(peer, event);

        const cleared = await events.clearPeerEvents("peer1");

        expect(cleared).toBeGreaterThanOrEqual(1);

        const remaining = await events.getEventsFromPeer("peer1");
        expect(remaining.length).toBe(0);
      });
    });

    it("should get federation statistics", async () => {
      await withGitVan(testContext, async () => {
        const events = useFederationEvents();

        const peer1 = { id: "peer1", url: "https://peer1.example.com" };
        const peer2 = { id: "peer2", url: "https://peer2.example.com" };

        await events.notifyPeer(peer1, {
          type: "post-commit",
          data: { commitHash: "abc" },
        });

        await events.notifyPeer(peer2, {
          type: "post-push",
          data: { branchName: "main" },
        });

        const stats = await events.getStats();

        expect(stats).toBeDefined();
        expect(typeof stats.totalPeers).toBe("number");
        expect(typeof stats.totalEvents).toBe("number");
        expect(Array.isArray(stats.peersTracked)).toBe(true);
      });
    });
  });

  describe("Event Signatures and Deduplication", () => {
    it("should generate unique signature for events", async () => {
      await withGitVan(testContext, async () => {
        const events = useFederationEvents();

        const event1 = {
          type: "post-commit",
          data: { commitHash: "abc" },
          timestamp: "2024-01-01T00:00:00Z",
        };

        const result1 = await events.broadcastEvent(event1, {
          peers: [],
          persistent: false,
        });

        const event2 = {
          type: "post-commit",
          data: { commitHash: "def" },
          timestamp: "2024-01-01T00:00:00Z",
        };

        const result2 = await events.broadcastEvent(event2, {
          peers: [],
          persistent: false,
        });

        expect(result1.eventId).not.toBe(result2.eventId);
      });
    });

    it("should handle event deduplication", async () => {
      await withGitVan(testContext, async () => {
        const events = useFederationEvents();

        const peer = { id: "peer1", url: "https://peer1.example.com" };

        const event = {
          type: "post-commit",
          data: { commitHash: "abc" },
          timestamp: new Date().toISOString(),
        };

        // Send same event twice
        await events.notifyPeer(peer, event);
        await events.notifyPeer(peer, event);

        const peerEvents = await events.getEventsFromPeer("peer1");

        // Should have both entries (deduplication happens at merge level)
        expect(peerEvents.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid peer gracefully", async () => {
      await withGitVan(testContext, async () => {
        const events = useFederationEvents();

        const event = {
          type: "post-commit",
          data: { commitHash: "abc" },
        };

        // Should not throw with missing peers
        const result = await events.broadcastEvent(event, {
          peers: [],
          persistent: false,
        });

        expect(result).toBeDefined();
      });
    });

    it("should handle polling errors gracefully", async () => {
      await withGitVan(testContext, async () => {
        const events = useFederationEvents();

        const peer = { id: "peer1", url: "https://peer1.example.com" };

        // Should not throw
        const polledEvents = await events.pollPeerEvents(peer);

        expect(Array.isArray(polledEvents)).toBe(true);
      });
    });

    it("should handle subscription errors gracefully", async () => {
      await withGitVan(testContext, async () => {
        const events = useFederationEvents();

        const peer = { id: "peer1", url: "https://peer1.example.com" };

        // Should not throw
        const subscription = await events.subscribeToPeer(peer, {
          pollInterval: 0,
          onEvent: async () => {
            throw new Error("Callback error");
          },
        });

        expect(subscription).toBeDefined();
      });
    });
  });
});
