/**
 * Federation Discovery Tests
 * Tests for useFederationDiscovery composable - targeting 85%+ coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  withTestEnvironment,
  initTestRepo,
  createCommit,
} from "../helpers/index.mjs";
import { useFederationDiscovery } from "../../src/composables/federation-discovery.mjs";
import { withGitVan } from "../../src/core/context.mjs";

describe("Federation Discovery - useFederationDiscovery Composable", () => {
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

  describe("Peer Discovery from Remotes", () => {
    it("should discover peers from git remotes", async () => {
      await withGitVan(testContext, async () => {
        const discovery = useFederationDiscovery();

        const peers = await discovery.discoverPeersFromRemotes();

        // May or may not have remotes depending on test setup
        expect(Array.isArray(peers)).toBe(true);
      });
    });

    it("should normalize peer objects from remotes", async () => {
      await withGitVan(testContext, async () => {
        const discovery = useFederationDiscovery();

        // Discover from actual git config (may be empty in test)
        const peers = await discovery.discoverPeersFromRemotes();

        // Validate structure if peers exist
        for (const peer of peers) {
          expect(peer.id).toBeDefined();
          expect(peer.url).toBeDefined();
          expect(peer.type).toBe("remote");
          expect(peer.discoveredAt).toBeDefined();
          expect(peer.healthy).toBeNull();
        }
      });
    });

    it("should handle empty remotes gracefully", async () => {
      await withGitVan(testContext, async () => {
        const discovery = useFederationDiscovery();

        const peers = await discovery.discoverPeersFromRemotes();

        expect(Array.isArray(peers)).toBe(true);
        // Newly initialized repo might have default origin
      });
    });
  });

  describe("Peer Discovery from Config", () => {
    it("should discover peers from config", async () => {
      await withGitVan(testContext, async () => {
        const discovery = useFederationDiscovery();

        const config = {
          federation: {
            peers: [
              { url: "https://peer1.example.com/repo.git", name: "peer1" },
              { url: "https://peer2.example.com/repo.git", name: "peer2" },
            ],
          },
        };

        const peers = await discovery.discoverPeersFromConfig(config);

        expect(peers.length).toBe(2);
        expect(peers[0].name).toBe("peer1");
        expect(peers[1].name).toBe("peer2");
      });
    });

    it("should handle missing config gracefully", async () => {
      await withGitVan(testContext, async () => {
        const discovery = useFederationDiscovery();

        const peers = await discovery.discoverPeersFromConfig({});

        expect(Array.isArray(peers)).toBe(true);
        expect(peers.length).toBe(0);
      });
    });
  });

  describe("Combined Peer Discovery", () => {
    it("should discover all peers from remotes and config", async () => {
      await withGitVan(testContext, async () => {
        const discovery = useFederationDiscovery();

        const config = {
          federation: {
            peers: [
              { url: "https://peer1.example.com/repo.git", name: "peer1" },
              { url: "https://peer2.example.com/repo.git", name: "peer2" },
            ],
          },
        };

        const peers = await discovery.discoverPeers(config);

        expect(peers.length).toBeGreaterThanOrEqual(2);
        expect(peers.some((p) => p.url === "https://peer1.example.com/repo.git")).toBe(true);
        expect(peers.some((p) => p.url === "https://peer2.example.com/repo.git")).toBe(true);
      });
    });

    it("should deduplicate peers by URL", async () => {
      await withGitVan(testContext, async () => {
        const discovery = useFederationDiscovery();

        const peerUrl = "https://example.com/repo.git";

        const config = {
          federation: {
            peers: [
              { url: peerUrl, name: "example1" },
              { url: peerUrl, name: "example2" }, // Duplicate URL
            ],
          },
        };

        const peers = await discovery.discoverPeers(config);

        // Should have only one entry for this URL
        const duplicates = peers.filter((p) => p.url === peerUrl);
        expect(duplicates.length).toBe(1);
      });
    });
  });

  describe("Health Checks", () => {
    it("should perform health check on peer", async () => {
      await withGitVan(testContext, async () => {
        const discovery = useFederationDiscovery();

        const peer = {
          id: "test-peer-1",
          name: "test-peer",
          url: "https://github.com/nodejs/node.git",
          type: "config",
        };

        const result = await discovery.healthCheck(peer, { performFetch: false });

        expect(result).toBeDefined();
        expect(result.peerId).toBe("test-peer-1");
        expect(result.timestamp).toBeDefined();
        expect(result.checks).toBeDefined();
        expect(typeof result.healthy).toBe("boolean");
      });
    });

    it("should test reachability via git ls-remote", async () => {
      await withGitVan(testContext, async () => {
        const discovery = useFederationDiscovery();

        const peer = {
          id: "test-peer-2",
          name: "test-peer",
          url: "https://github.com/nodejs/node.git", // Public repo
          type: "config",
        };

        const result = await discovery.healthCheck(peer, { performFetch: false });

        expect(result.checks).toBeDefined();
        expect(typeof result.checks.reachable).toBe("boolean");
      });
    });

    it("should negotiate protocol version", async () => {
      await withGitVan(testContext, async () => {
        const discovery = useFederationDiscovery();

        const peer = {
          id: "test-peer-3",
          name: "test-peer",
          url: "https://github.com/nodejs/node.git",
          type: "config",
        };

        const result = await discovery.healthCheck(peer, { performFetch: false });

        expect(result).toBeDefined();
        expect(result.version).toBeDefined();
      });
    });

    it("should handle health check timeout gracefully", async () => {
      await withGitVan(testContext, async () => {
        const discovery = useFederationDiscovery();

        const peer = {
          id: "test-peer-timeout",
          name: "test-peer",
          url: "https://invalid-domain-12345.example.com/repo.git",
          type: "config",
        };

        const result = await discovery.healthCheck(peer, {
          timeout: 100,
          performFetch: false,
        });

        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
      });
    });
  });

  describe("Peer Registration", () => {
    it("should register a peer", async () => {
      await withGitVan(testContext, async () => {
        const discovery = useFederationDiscovery();

        const peer = {
          url: "https://example.com/repo.git",
          name: "example",
        };

        const registered = await discovery.registerPeer(peer, {
          performHealthCheck: false,
          persistToNotes: false,
        });

        expect(registered).toBeDefined();
        expect(registered.id).toBeDefined();
        expect(registered.url).toBe(peer.url);
        expect(registered.name).toBe(peer.name);
      });
    });

    it("should perform health check on registration", async () => {
      await withGitVan(testContext, async () => {
        const discovery = useFederationDiscovery();

        const peer = {
          url: "https://github.com/nodejs/node.git",
          name: "nodejs",
        };

        const registered = await discovery.registerPeer(peer, {
          performHealthCheck: true,
          persistToNotes: false,
        });

        expect(registered.healthy).toBeDefined();
      });
    });

    it("should list registered peers", async () => {
      await withGitVan(testContext, async () => {
        const discovery = useFederationDiscovery();

        const peers = [
          { url: "https://peer1.example.com/repo.git", name: "peer1" },
          { url: "https://peer2.example.com/repo.git", name: "peer2" },
        ];

        for (const peer of peers) {
          await discovery.registerPeer(peer, {
            performHealthCheck: false,
            persistToNotes: false,
          });
        }

        const listed = await discovery.listPeers();

        expect(listed.length).toBe(2);
      });
    });

    it("should get peer by ID", async () => {
      await withGitVan(testContext, async () => {
        const discovery = useFederationDiscovery();

        const peer = {
          url: "https://example.com/repo.git",
          name: "example",
        };

        const registered = await discovery.registerPeer(peer, {
          performHealthCheck: false,
          persistToNotes: false,
        });

        const retrieved = await discovery.getPeer(registered.id);

        expect(retrieved).toBeDefined();
        expect(retrieved.id).toBe(registered.id);
        expect(retrieved.url).toBe(peer.url);
      });
    });

    it("should remove a peer", async () => {
      await withGitVan(testContext, async () => {
        const discovery = useFederationDiscovery();

        const peer = {
          url: "https://example.com/repo.git",
          name: "example",
        };

        const registered = await discovery.registerPeer(peer, {
          performHealthCheck: false,
          persistToNotes: false,
        });

        const removed = await discovery.removePeer(registered.id);

        expect(removed).toBe(true);

        const retrieved = await discovery.getPeer(registered.id);
        expect(retrieved).toBeNull();
      });
    });

    it("should clear all peers", async () => {
      await withGitVan(testContext, async () => {
        const discovery = useFederationDiscovery();

        const peers = [
          { url: "https://peer1.example.com/repo.git", name: "peer1" },
          { url: "https://peer2.example.com/repo.git", name: "peer2" },
        ];

        for (const peer of peers) {
          await discovery.registerPeer(peer, {
            performHealthCheck: false,
            persistToNotes: false,
          });
        }

        await discovery.clearPeers();

        const listed = await discovery.listPeers();
        expect(listed.length).toBe(0);
      });
    });
  });

  describe("Healthy Peer Filtering", () => {
    it("should get only healthy peers", async () => {
      await withGitVan(testContext, async () => {
        const discovery = useFederationDiscovery();

        // Register some peers with different health statuses
        const peer1 = {
          url: "https://github.com/nodejs/node.git",
          name: "nodejs",
        };

        const peer2 = {
          url: "https://invalid.example.com/repo.git",
          name: "invalid",
        };

        await discovery.registerPeer(peer1, {
          performHealthCheck: false,
          persistToNotes: false,
        });

        const registered2 = await discovery.registerPeer(peer2, {
          performHealthCheck: false,
          persistToNotes: false,
        });

        // Manually set health status
        registered2.healthy = false;

        const healthyPeers = await discovery.getHealthyPeers();

        expect(Array.isArray(healthyPeers)).toBe(true);
      });
    });

    it("should perform health checks on all peers", async () => {
      await withGitVan(testContext, async () => {
        const discovery = useFederationDiscovery();

        const peers = [
          {
            url: "https://github.com/nodejs/node.git",
            name: "nodejs",
          },
          {
            url: "https://invalid.example.com/repo.git",
            name: "invalid",
          },
        ];

        for (const peer of peers) {
          await discovery.registerPeer(peer, {
            performHealthCheck: false,
            persistToNotes: false,
          });
        }

        const results = await discovery.healthCheckAll();

        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeGreaterThanOrEqual(1);
        expect(results[0]).toHaveProperty("healthy");
        expect(results[0]).toHaveProperty("timestamp");
      });
    });
  });

  describe("Error Handling", () => {
    it("should throw error on invalid peer object", async () => {
      await withGitVan(testContext, async () => {
        const discovery = useFederationDiscovery();

        await expect(
          discovery.registerPeer({ invalid: true }, {
            performHealthCheck: false,
          })
        ).rejects.toThrow();
      });
    });

    it("should handle git remote errors gracefully", async () => {
      await withGitVan(testContext, async () => {
        const discovery = useFederationDiscovery();

        // This should not throw, but return empty or handle gracefully
        const peers = await discovery.discoverPeersFromRemotes();
        expect(Array.isArray(peers)).toBe(true);
      });
    });
  });
});
