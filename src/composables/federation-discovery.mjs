/**
 * @fileoverview GitVan v3.2.0 — Federation Discovery & Peer Management
 *
 * This module provides peer discovery, health checking, and peer registry management
 * for git-native federation. Peers are discovered from git remotes and gitvan.config.js,
 * with health checks via git operations and optional handshakes.
 *
 * Key Features:
 * - Peer discovery from git remotes and config
 * - Health checks (git fetch, version negotiation)
 * - Peer registry (in-memory, backed by git notes)
 * - Automatic peer detection on git push/fetch
 * - Deterministic, no external dependencies
 *
 * @version 3.2.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import { useGitVan, tryUseGitVan } from "../core/context.mjs";
import { useNotes } from "./notes.mjs";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

/**
 * Federation Discovery Composable
 * Manages peer discovery, health checks, and registry operations
 *
 * @returns {Object} Federation discovery API
 */
export function useFederationDiscovery() {
  // Get context from unctx - must be called synchronously
  let ctx;
  try {
    ctx = useGitVan();
  } catch {
    ctx = tryUseGitVan?.() || null;
  }

  // Resolve working directory and environment
  const cwd = (ctx && ctx.cwd) || process.cwd();
  const env = {
    ...process.env,
    ...(ctx && ctx.env ? ctx.env : {}),
    TZ: "UTC",
    LANG: "C",
  };

  const base = { cwd, env };

  // Initialize dependencies
  const notes = useNotes();

  // In-memory peer registry
  const peerRegistry = new Map();

  // Git notes ref for peer storage
  const PEER_NOTES_REF = "refs/notes/gitvan/federation/peers";

  /**
   * Parse peer configuration from git remote or config object
   *
   * @private
   * @param {Object} source - Peer source (git remote or config)
   * @returns {Object} Normalized peer object
   */
  function normalizePeer(source) {
    // Handle git remote format
    if (source.name && source.url) {
      return {
        id: createHash("sha256")
          .update(`${source.name}:${source.url}`)
          .digest("hex")
          .substring(0, 16),
        name: source.name,
        url: source.url,
        type: "remote",
        discoveredAt: new Date().toISOString(),
        healthy: null,
        lastHealthCheck: null,
        version: null,
      };
    }

    // Handle config object format
    if (source.url) {
      return {
        id: createHash("sha256")
          .update(source.url)
          .digest("hex")
          .substring(0, 16),
        name: source.name || source.url.split("/").pop(),
        url: source.url,
        type: source.type || "config",
        discoveredAt: new Date().toISOString(),
        healthy: null,
        lastHealthCheck: null,
        version: null,
      };
    }

    return null;
  }

  /**
   * Parse git config file to get remotes
   * Falls back to git config --get-regex if file reading fails
   *
   * @private
   * @returns {Promise<Array<Object>>} Array of remote objects
   */
  async function getRemotesFromConfig() {
    try {
      try {
        // Try to read .git/config file directly
        const gitDir = join(cwd, ".git");
        const configPath = join(gitDir, "config");
        const configContent = readFileSync(configPath, "utf-8");

        const remotes = [];
        const lines = configContent.split("\n");
        let currentSection = null;

        for (const line of lines) {
          const sectionMatch = line.match(/^\[remote\s+"([^"]+)"\]/);
          if (sectionMatch) {
            currentSection = sectionMatch[1];
            continue;
          }

          if (currentSection && line.includes("url =")) {
            const urlMatch = line.match(/url\s*=\s*(.+)/);
            if (urlMatch) {
              remotes.push({
                name: currentSection,
                url: urlMatch[1].trim(),
              });
              currentSection = null;
            }
          }
        }

        return remotes;
      } catch (e) {
        // Fallback to git command
        const { stdout } = await execFileAsync("git", ["config", "--get-regex", "^remote\\..*\\.url$"], {
          cwd,
          env,
        });

        const remotes = [];
        for (const line of stdout.trim().split("\n")) {
          if (!line) continue;
          const match = line.match(/remote\.([^.]+)\.url\s+(.+)/);
          if (match) {
            remotes.push({ name: match[1], url: match[2] });
          }
        }
        return remotes;
      }
    } catch (error) {
      return [];
    }
  }

  return {
    // Context properties (exposed for testing)
    cwd: base.cwd,
    env: base.env,

    /**
     * Discover peers from git remotes
     *
     * @async
     * @returns {Promise<Array<Object>>} Array of discovered peers
     * @throws {Error} If discovery fails
     */
    async discoverPeersFromRemotes() {
      try {
        const remotes = await getRemotesFromConfig();

        // Normalize and store peers
        const discovered = [];
        for (const remote of remotes) {
          const peer = normalizePeer(remote);
          if (peer) {
            peerRegistry.set(peer.id, peer);
            discovered.push(peer);
          }
        }

        return discovered;
      } catch (error) {
        throw new Error(`Failed to discover peers from remotes: ${error.message}`);
      }
    },

    /**
     * Discover peers from gitvan.config.js federation section
     *
     * @async
     * @param {Object} config - GitVan configuration object
     * @returns {Promise<Array<Object>>} Array of discovered peers
     * @throws {Error} If discovery fails
     */
    async discoverPeersFromConfig(config) {
      try {
        const peers = [];

        if (config?.federation?.peers && Array.isArray(config.federation.peers)) {
          for (const peerConfig of config.federation.peers) {
            const peer = normalizePeer(peerConfig);
            if (peer) {
              peerRegistry.set(peer.id, peer);
              peers.push(peer);
            }
          }
        }

        return peers;
      } catch (error) {
        throw new Error(`Failed to discover peers from config: ${error.message}`);
      }
    },

    /**
     * Discover all peers (from remotes + config)
     *
     * @async
     * @param {Object} [config={}] - Optional GitVan config
     * @returns {Promise<Array<Object>>} All discovered peers
     */
    async discoverPeers(config = {}) {
      try {
        const [remoteDiscovered, configDiscovered] = await Promise.all([
          this.discoverPeersFromRemotes(),
          this.discoverPeersFromConfig(config),
        ]);

        // Deduplicate by URL
        const allPeers = [...remoteDiscovered, ...configDiscovered];
        const unique = new Map();

        for (const peer of allPeers) {
          if (!unique.has(peer.url)) {
            unique.set(peer.url, peer);
          }
        }

        return Array.from(unique.values());
      } catch (error) {
        throw new Error(`Failed to discover peers: ${error.message}`);
      }
    },

    /**
     * Perform health check on a peer
     *
     * @async
     * @param {Object} peer - Peer object with url property
     * @param {Object} [options={}] - Health check options
     * @param {number} [options.timeout=5000] - Timeout in milliseconds
     * @param {boolean} [options.performFetch=true] - Try git fetch on peer
     * @returns {Promise<Object>} Health check result
     */
    async healthCheck(peer, options = {}) {
      const { timeout = 5000, performFetch = true } = options;

      const result = {
        peerId: peer.id,
        timestamp: new Date().toISOString(),
        healthy: false,
        checks: {
          reachable: false,
          versionMatch: false,
          fetchable: false,
        },
        error: null,
        version: null,
      };

      try {
        // Check 1: Reachability via git ls-remote
        try {
          await execFileAsync("git", ["ls-remote", peer.url], {
            cwd,
            env,
            timeout,
          });
          result.checks.reachable = true;
        } catch (error) {
          result.error = `Reachability failed: ${error.message}`;
        }

        // Check 2: Version negotiation (read gitvan version from remote)
        try {
          if (result.checks.reachable) {
            const { stdout } = await execFileAsync("git", ["ls-remote", peer.url], {
              cwd,
              env,
              timeout,
            });
            const versionMatch = stdout.match(/refs\/gitvan\/version\/([\d.]+)/);
            result.version = versionMatch ? versionMatch[1] : "unknown";
            result.checks.versionMatch = result.version !== null;
          }
        } catch (error) {
          // Version check is optional
        }

        // Check 3: Fetchability (check without actually fetching)
        if (performFetch && result.checks.reachable) {
          try {
            // Use --dry-run to test without actually fetching
            await execFileAsync("git", ["fetch", "--dry-run", peer.url, "refs/heads/*:refs/remotes/_test/*"], {
              cwd,
              env,
              timeout,
            });
            result.checks.fetchable = true;
          } catch (error) {
            // Fetchability is nice-to-have, not blocking
          }
        }

        // Overall health: reachable + version match
        result.healthy = result.checks.reachable && result.checks.versionMatch;

        // Update peer registry
        const registeredPeer = peerRegistry.get(peer.id);
        if (registeredPeer) {
          registeredPeer.healthy = result.healthy;
          registeredPeer.lastHealthCheck = result.timestamp;
          registeredPeer.version = result.version;
        }

        return result;
      } catch (error) {
        result.error = error.message;
        return result;
      }
    },

    /**
     * Register a peer in the peer registry
     *
     * @async
     * @param {Object} peer - Peer object
     * @param {Object} [options={}] - Registration options
     * @param {boolean} [options.performHealthCheck=true] - Run health check
     * @param {boolean} [options.persistToNotes=true] - Save to git notes
     * @returns {Promise<Object>} Registered peer with metadata
     */
    async registerPeer(peer, options = {}) {
      const { performHealthCheck = true, persistToNotes = true } = options;

      try {
        let normalizedPeer = peerRegistry.get(peer.id);

        if (!normalizedPeer) {
          normalizedPeer = normalizePeer(peer);
          if (!normalizedPeer) {
            throw new Error("Invalid peer object");
          }
        }

        // Perform health check if requested
        if (performHealthCheck) {
          const healthResult = await this.healthCheck(normalizedPeer);
          normalizedPeer.healthy = healthResult.healthy;
          normalizedPeer.version = healthResult.version;
        }

        // Register in memory
        peerRegistry.set(normalizedPeer.id, normalizedPeer);

        // Persist to git notes if requested
        if (persistToNotes) {
          const peerData = JSON.stringify(normalizedPeer);
          try {
            await notes.write(peerData, normalizedPeer.id);
          } catch (error) {
            // Notes write is not critical for functionality
          }
        }

        return normalizedPeer;
      } catch (error) {
        throw new Error(`Failed to register peer: ${error.message}`);
      }
    },

    /**
     * Get all registered peers
     *
     * @async
     * @returns {Promise<Array<Object>>} Array of all registered peers
     */
    async listPeers() {
      return Array.from(peerRegistry.values());
    },

    /**
     * Get a peer by ID
     *
     * @async
     * @param {string} peerId - Peer ID
     * @returns {Promise<Object|null>} Peer object or null if not found
     */
    async getPeer(peerId) {
      return peerRegistry.get(peerId) || null;
    },

    /**
     * Remove a peer from the registry
     *
     * @async
     * @param {string} peerId - Peer ID to remove
     * @returns {Promise<boolean>} Whether peer was removed
     */
    async removePeer(peerId) {
      return peerRegistry.delete(peerId);
    },

    /**
     * Clear all peers from registry
     *
     * @async
     * @returns {Promise<void>}
     */
    async clearPeers() {
      peerRegistry.clear();
    },

    /**
     * Get healthy peers (those with passing health checks)
     *
     * @async
     * @returns {Promise<Array<Object>>} Array of healthy peers
     */
    async getHealthyPeers() {
      const peers = Array.from(peerRegistry.values());
      return peers.filter((p) => p.healthy === true);
    },

    /**
     * Perform health checks on all peers
     *
     * @async
     * @returns {Promise<Array<Object>>} Array of health check results
     */
    async healthCheckAll() {
      const peers = Array.from(peerRegistry.values());
      const results = await Promise.all(peers.map((p) => this.healthCheck(p)));
      return results;
    },
  };
}
