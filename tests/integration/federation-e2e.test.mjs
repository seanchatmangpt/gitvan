/**
 * End-to-End Federation Integration Tests
 * Tests complete federation workflows with peer discovery, querying, and event sync
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  withTestEnvironment,
  initTestRepo,
  createCommit,
  createBranch,
} from "../helpers/index.mjs";
import { useFederationDiscovery } from "../../src/composables/federation-discovery.mjs";
import { useFederatedQuery } from "../../src/composables/federated-query.mjs";
import { useFederationEvents } from "../../src/composables/federation-events.mjs";
import { withGitVan } from "../../src/core/context.mjs";
import { useGit } from "../../src/composables/git/index.mjs";
import { createStore, namedNode, literal, quad } from "@unrdf/core";

describe("Federation Integration - End-to-End Tests", () => {
  let testContext;
  let mockStore;

  beforeEach(async () => {
    testContext = await withTestEnvironment(async (ctx) => {
      return ctx;
    });

    // Create mock RDF store with federation data
    mockStore = await createStore();

    const subject = namedNode("https://gitvan.example.com/repo/test");
    const type = namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
    const repository = namedNode("https://gitvan.dev/ontology/Repository");

    mockStore.add(quad(subject, type, repository));
  });

  afterEach(() => {
    if (testContext?.cleanup) {
      testContext.cleanup();
    }
  });

  describe("Complete Peer Discovery Workflow", () => {
    it("should discover, register, and health-check peers", async () => {
      await withGitVan(testContext, async () => {
        const discovery = useFederationDiscovery();
        const git = useGit();

        // Step 1: Add git remotes
        await git.remoteAdd("origin", "https://github.com/nodejs/node.git");
        await git.remoteAdd("upstream", "https://github.com/nodejs/readable-stream.git");

        // Step 2: Discover peers from remotes
        const remoteDiscovered = await discovery.discoverPeersFromRemotes();
        expect(remoteDiscovered.length).toBeGreaterThanOrEqual(2);

        // Step 3: Discover from config
        const config = {
          federation: {
            peers: [
              { url: "https://github.com/electron/electron.git", name: "electron" },
            ],
          },
        };

        const configDiscovered = await discovery.discoverPeersFromConfig(config);
        expect(configDiscovered.length).toBeGreaterThanOrEqual(1);

        // Step 4: Combined discovery
        const allPeers = await discovery.discoverPeers(config);
        expect(allPeers.length).toBeGreaterThanOrEqual(3);

        // Step 5: Register peers
        for (const peer of allPeers) {
          const registered = await discovery.registerPeer(peer, {
            performHealthCheck: false,
            persistToNotes: false,
          });
          expect(registered.id).toBeDefined();
        }

        // Step 6: List registered peers
        const listed = await discovery.listPeers();
        expect(listed.length).toBeGreaterThanOrEqual(3);

        // Step 7: Health check all peers
        const healthChecks = await discovery.healthCheckAll();
        expect(Array.isArray(healthChecks)).toBe(true);
      });
    });

    it("should track peer health status over time", async () => {
      await withGitVan(testContext, async () => {
        const discovery = useFederationDiscovery();

        const peer = {
          url: "https://github.com/nodejs/node.git",
          name: "nodejs",
        };

        // Register peer without health check
        const registered = await discovery.registerPeer(peer, {
          performHealthCheck: false,
          persistToNotes: false,
        });

        // Initial health status should be null
        expect(registered.healthy).toBeNull();

        // Perform first health check
        const health1 = await discovery.healthCheck(registered, {
          performFetch: false,
        });

        expect(health1.timestamp).toBeDefined();
        expect(health1.checks).toBeDefined();

        // Simulate time passing
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Perform second health check
        const health2 = await discovery.healthCheck(registered, {
          performFetch: false,
        });

        // Both should have timestamps
        expect(health2.timestamp).toBeDefined();
        expect(health2.checks).toBeDefined();
      });
    });
  });

  describe("Federated Query Workflow", () => {
    it("should execute federated queries across peers", async () => {
      await withGitVan(testContext, async () => {
        const discovery = useFederationDiscovery();
        const queryApi = useFederatedQuery({ localStore: mockStore });

        // Step 1: Discover peers
        const config = {
          federation: {
            peers: [
              { url: "https://github.com/nodejs/node.git", name: "nodejs" },
              { url: "https://github.com/torvalds/linux.git", name: "linux" },
            ],
          },
        };

        const peers = await discovery.discoverPeers(config);

        // Step 2: Register discovered peers
        const registeredPeers = [];
        for (const peer of peers) {
          const registered = await discovery.registerPeer(peer, {
            performHealthCheck: false,
            persistToNotes: false,
          });
          registeredPeers.push(registered);
        }

        // Step 3: Execute local query
        const sparql = `SELECT ?s ?p ?o WHERE { ?s ?p ?o . }`;

        const result = await queryApi.query(sparql, {
          store: mockStore,
          peers: registeredPeers,
          type: "select",
          useCache: true,
        });

        expect(result).toBeDefined();
        expect(result.results).toBeDefined();
        expect(result.timestamp).toBeDefined();
      });
    });

    it("should cache federated query results", async () => {
      await withGitVan(testContext, async () => {
        const queryApi = useFederatedQuery({
          localStore: mockStore,
          cacheTTL: 3600000,
        });

        const sparql = `SELECT ?s WHERE { ?s ?p ?o . }`;

        // First query - not cached
        const result1 = await queryApi.query(sparql, {
          store: mockStore,
          peers: [],
          type: "select",
          useCache: true,
        });

        expect(result1.source).toBe("federated");

        // Second query - should be cached
        const result2 = await queryApi.query(sparql, {
          store: mockStore,
          peers: [],
          type: "select",
          useCache: true,
        });

        expect(result2.source).toBe("cache");

        // Verify same results
        expect(JSON.stringify(result2.results)).toBe(
          JSON.stringify(result1.results)
        );
      });
    });

    it("should retrieve and cache peer-specific results", async () => {
      await withGitVan(testContext, async () => {
        const queryApi = useFederatedQuery();

        const peer = {
          id: "peer-1",
          url: "https://github.com/nodejs/node.git",
          name: "nodejs",
        };

        const queryResult = {
          bindings: [{ repository: "nodejs/node" }],
        };

        // Cache a result for the peer
        await queryApi.cachePeerResult(peer, "all-repos", queryResult);

        // Retrieve cached result
        const cached = await queryApi.getCachedPeerResult(peer, "all-repos");

        expect(cached).toBeDefined();
        expect(cached.bindings).toBeDefined();
      });
    });
  });

  describe("Event Synchronization Workflow", () => {
    it("should broadcast and receive events across federation", async () => {
      await withGitVan(testContext, async () => {
        const events = useFederationEvents();
        const discovery = useFederationDiscovery();

        // Step 1: Setup federation
        const config = {
          federation: {
            peers: [
              { url: "https://github.com/nodejs/node.git", name: "nodejs" },
              { url: "https://github.com/electron/electron.git", name: "electron" },
            ],
          },
        };

        const peers = await discovery.discoverPeers(config);

        // Step 2: Create and broadcast local event
        const localEvent = {
          type: "post-commit",
          data: {
            commitHash: "abc123def456",
            message: "Federation test commit",
            author: "test@example.com",
          },
          timestamp: new Date().toISOString(),
        };

        const broadcastResult = await events.broadcastEvent(localEvent, {
          peers,
          persistent: false,
        });

        expect(broadcastResult).toBeDefined();
        expect(broadcastResult.eventId).toBeDefined();

        // Step 3: Subscribe to peer events
        const subscription = await events.subscribeToPeer(peers[0], {
          pollInterval: 0,
          onEvent: async (event) => {
            // Handle incoming events
          },
        });

        expect(subscription).toBeDefined();
        expect(subscription.active).toBe(true);

        // Step 4: Unsubscribe
        await events.unsubscribe(subscription);
        expect(subscription.active).toBe(false);
      });
    });

    it("should synchronize events between peers", async () => {
      await withGitVan(testContext, async () => {
        const events = useFederationEvents();

        const peer = {
          id: "peer-1",
          url: "https://github.com/nodejs/node.git",
          name: "nodejs",
        };

        // Create local events
        const localEvents = [
          {
            type: "post-commit",
            data: { commitHash: "abc123" },
            timestamp: new Date().toISOString(),
          },
          {
            type: "post-push",
            data: { branchName: "main" },
            timestamp: new Date().toISOString(),
          },
        ];

        // Sync with peer
        const syncResult = await events.syncWithPeer(peer, localEvents, {
          resolveConflicts: true,
        });

        expect(syncResult).toBeDefined();
        expect(syncResult.peerId).toBe("peer-1");
        expect(syncResult.sentEvents).toBeGreaterThanOrEqual(0);
        expect(syncResult.mergedEvents).toBeDefined();
      });
    });

    it("should track event statistics across federation", async () => {
      await withGitVan(testContext, async () => {
        const events = useFederationEvents();

        // Add events from multiple peers
        const peer1 = { id: "peer1", url: "https://peer1.example.com" };
        const peer2 = { id: "peer2", url: "https://peer2.example.com" };

        const event1 = {
          type: "post-commit",
          data: { commitHash: "abc" },
          timestamp: new Date().toISOString(),
        };

        const event2 = {
          type: "post-push",
          data: { branchName: "main" },
          timestamp: new Date().toISOString(),
        };

        await events.notifyPeer(peer1, event1);
        await events.notifyPeer(peer1, event2);
        await events.notifyPeer(peer2, event1);

        // Get statistics
        const stats = await events.getStats();

        expect(stats).toBeDefined();
        expect(stats.totalPeers).toBeGreaterThanOrEqual(2);
        expect(stats.totalEvents).toBeGreaterThanOrEqual(3);
        expect(stats.peersTracked.includes("peer1")).toBe(true);
        expect(stats.peersTracked.includes("peer2")).toBe(true);
      });
    });
  });

  describe("Multi-Peer Coordination", () => {
    it("should coordinate between multiple peers in federation", async () => {
      await withGitVan(testContext, async () => {
        const discovery = useFederationDiscovery();
        const events = useFederationEvents();
        const queryApi = useFederatedQuery({ localStore: mockStore });

        // Step 1: Setup 3 peers
        const peersConfig = {
          federation: {
            peers: [
              { url: "https://repo1.example.com", name: "repo1" },
              { url: "https://repo2.example.com", name: "repo2" },
              { url: "https://repo3.example.com", name: "repo3" },
            ],
          },
        };

        const discoveredPeers = await discovery.discoverPeers(peersConfig);
        const registeredPeers = [];

        for (const peer of discoveredPeers) {
          const registered = await discovery.registerPeer(peer, {
            performHealthCheck: false,
            persistToNotes: false,
          });
          registeredPeers.push(registered);
        }

        // Step 2: Broadcast event to all peers
        const event = {
          type: "post-commit",
          data: { message: "Multi-peer test" },
          timestamp: new Date().toISOString(),
        };

        const broadcastResult = await events.broadcastEvent(event, {
          peers: registeredPeers,
          persistent: false,
        });

        expect(broadcastResult.targetPeers).toBe(3);

        // Step 3: Execute federated query
        const sparql = `SELECT ?s WHERE { ?s ?p ?o . }`;
        const queryResult = await queryApi.query(sparql, {
          store: mockStore,
          peers: registeredPeers,
          type: "select",
          useCache: false,
        });

        expect(queryResult.peers).toBe(3);

        // Step 4: Synchronize with each peer
        for (const peer of registeredPeers) {
          const syncResult = await events.syncWithPeer(peer, [event]);
          expect(syncResult.peerId).toBeDefined();
        }

        // Step 5: Get federation statistics
        const stats = await events.getStats();
        expect(stats.totalPeers).toBeGreaterThanOrEqual(3);
      });
    });

    it("should handle peer failures gracefully", async () => {
      await withGitVan(testContext, async () => {
        const discovery = useFederationDiscovery();
        const events = useFederationEvents();

        // Setup peers with mix of healthy and unhealthy
        const peers = [
          { id: "peer1", url: "https://valid.example.com", name: "valid" },
          { id: "peer2", url: "https://invalid.example.com", name: "invalid" },
        ];

        for (const peer of peers) {
          await discovery.registerPeer(peer, {
            performHealthCheck: false,
            persistToNotes: false,
          });
        }

        // Broadcast should handle failures gracefully
        const event = {
          type: "post-commit",
          data: { message: "Test" },
          timestamp: new Date().toISOString(),
        };

        const result = await events.broadcastEvent(event, {
          peers,
          persistent: false,
        });

        expect(result).toBeDefined();
        // Some might fail, but broadcast completes
        expect(result.targetPeers).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("Complete Federation Lifecycle", () => {
    it("should complete full federation lifecycle", async () => {
      await withGitVan(testContext, async () => {
        const discovery = useFederationDiscovery();
        const events = useFederationEvents();
        const queryApi = useFederatedQuery({ localStore: mockStore });
        const git = useGit();

        // Phase 1: Initialize local repository
        createBranch(testContext.cwd, "feature", false);
        createCommit(testContext.cwd, "Initial commit");

        // Phase 2: Add remotes and discover peers
        await git.remoteAdd("origin", "https://github.com/nodejs/node.git");

        const peers = await discovery.discoverPeersFromRemotes();
        expect(peers.length).toBeGreaterThanOrEqual(1);

        // Phase 3: Register peers
        const registeredPeers = [];
        for (const peer of peers) {
          const registered = await discovery.registerPeer(peer, {
            performHealthCheck: false,
            persistToNotes: false,
          });
          registeredPeers.push(registered);
        }

        // Phase 4: Broadcast initialization event
        const initEvent = {
          type: "post-commit",
          data: { message: "Federation initialization" },
          timestamp: new Date().toISOString(),
        };

        await events.broadcastEvent(initEvent, {
          peers: registeredPeers,
          persistent: false,
        });

        // Phase 5: Execute federated query
        const sparql = `SELECT ?repo WHERE { ?repo ?p ?o . }`;
        const queryResult = await queryApi.query(sparql, {
          store: mockStore,
          peers: registeredPeers,
          type: "select",
          useCache: true,
        });

        expect(queryResult).toBeDefined();

        // Phase 6: Sync with peers
        for (const peer of registeredPeers) {
          await events.syncWithPeer(peer, [initEvent]);
        }

        // Phase 7: Verify federation state
        const listedPeers = await discovery.listPeers();
        expect(listedPeers.length).toBeGreaterThanOrEqual(1);

        const eventStats = await events.getStats();
        expect(eventStats).toBeDefined();

        const cacheStats = await queryApi.getCacheStats();
        expect(cacheStats).toBeDefined();
      });
    });
  });
});
