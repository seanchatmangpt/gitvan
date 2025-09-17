/**
 * GitVan v2 - useLock() Composable
 * Provides distributed locking for job coordination and concurrency control
 */

import { useGitVan, tryUseGitVan, withGitVan } from "../core/context.mjs";
import { useGit } from "./git.mjs";
import {
  acquireLock,
  releaseLock,
  generateLockRef,
} from "../runtime/locks.mjs";
import { createHash } from "node:crypto";
import { join } from "node:path";

export function useLock() {
  // Get context from unctx - this must be called synchronously
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
    TZ: "UTC", // Always override to UTC for determinism
    LANG: "C", // Always override to C locale for determinism
  };

  const base = { cwd, env };

  // Initialize dependencies
  const git = useGit();

  return {
    // Context properties (exposed for testing)
    cwd: base.cwd,
    env: base.env,

    // === Lock Management ===
    async acquire(lockName, options = {}) {
      const {
        timeout = 30000,
        retryInterval = 1000,
        maxRetries = 30,
        metadata = {},
      } = options;

      try {
        const gitInfo = await git.info();
        const lockRef = this.getLockRef(lockName, gitInfo);

        // Create lock data
        const lockData = {
          id: this.generateLockId(),
          name: lockName,
          worktree: gitInfo.worktree,
          branch: gitInfo.branch,
          commit: gitInfo.head,
          timestamp: new Date().toISOString(),
          timeout: timeout,
          metadata,
        };

        // Try to acquire lock
        const acquired = await acquireLock(lockRef, JSON.stringify(lockData));

        if (acquired) {
          return {
            id: lockData.id,
            name: lockName,
            ref: lockRef,
            acquired: true,
            timestamp: lockData.timestamp,
            timeout: timeout,
          };
        } else {
          return {
            id: null,
            name: lockName,
            ref: lockRef,
            acquired: false,
            error: "Lock acquisition timeout",
          };
        }
      } catch (error) {
        throw new Error(`Failed to acquire lock ${lockName}: ${error.message}`);
      }
    },

    async release(lockName) {
      try {
        const gitInfo = await git.info();
        const lockRef = this.getLockRef(lockName, gitInfo);

        const released = await releaseLock(lockRef);

        return {
          name: lockName,
          ref: lockRef,
          released,
        };
      } catch (error) {
        throw new Error(`Failed to release lock ${lockName}: ${error.message}`);
      }
    },

    async isLocked(lockName) {
      try {
        const gitInfo = await git.info();
        const lockRef = this.getLockRef(lockName, gitInfo);

        // Check if lock ref exists
        const lockData = await git.getRef(lockRef);
        return !!lockData;
      } catch (error) {
        return false;
      }
    },

    async getLockInfo(lockName) {
      try {
        const gitInfo = await git.info();
        const lockRef = this.getLockRef(lockName, gitInfo);

        const locked = await isLocked(lockRef);
        if (!locked) {
          return null;
        }

        // Get lock data from Git ref
        const lockData = await git.getRef(lockRef);
        if (!lockData) {
          return null;
        }

        return {
          name: lockName,
          ref: lockRef,
          locked: true,
          data: lockData,
        };
      } catch (error) {
        return null;
      }
    },

    // === Lock Status ===
    async status(lockName) {
      try {
        const gitInfo = await git.info();
        const lockRef = this.getLockRef(lockName, gitInfo);

        const locked = await isLocked(lockRef);
        const lockInfo = locked ? await this.getLockInfo(lockName) : null;

        return {
          name: lockName,
          locked,
          ref: lockRef,
          info: lockInfo,
          worktree: gitInfo.worktree,
          branch: gitInfo.branch,
        };
      } catch (error) {
        return {
          name: lockName,
          locked: false,
          error: error.message,
        };
      }
    },

    async list(options = {}) {
      const {
        worktree = null,
        branch = null,
        includeExpired = false,
      } = options;

      try {
        const gitInfo = await git.info();
        const locksRoot = "refs/gitvan/locks";

        // Get all lock refs
        const lockRefs = await git.listRefs(locksRoot);
        const locks = [];

        for (const ref of lockRefs) {
          try {
            const lockData = await git.getRef(ref);
            if (!lockData) continue;

            const lock = {
              name: lockData.name,
              ref: ref,
              locked: true,
              worktree: lockData.worktree,
              branch: lockData.branch,
              commit: lockData.commit,
              timestamp: lockData.timestamp,
              timeout: lockData.timeout,
              metadata: lockData.metadata,
            };

            // Apply filters
            if (worktree && lock.worktree !== worktree) continue;
            if (branch && lock.branch !== branch) continue;

            // Check if expired
            if (!includeExpired) {
              const now = new Date();
              const lockTime = new Date(lock.timestamp);
              const expiryTime = new Date(lockTime.getTime() + lock.timeout);

              if (now > expiryTime) {
                continue; // Skip expired locks
              }
            }

            locks.push(lock);
          } catch (error) {
            console.warn(`Failed to process lock ref ${ref}:`, error.message);
          }
        }

        return locks;
      } catch (error) {
        throw new Error(`Failed to list locks: ${error.message}`);
      }
    },

    // === Lock Cleanup ===
    async cleanup(options = {}) {
      const { expired = true, orphaned = true, dryRun = false } = options;

      try {
        const locks = await this.list({ includeExpired: true });
        const toCleanup = [];

        for (const lock of locks) {
          let shouldCleanup = false;

          // Check if expired
          if (expired) {
            const now = new Date();
            const lockTime = new Date(lock.timestamp);
            const expiryTime = new Date(lockTime.getTime() + lock.timeout);

            if (now > expiryTime) {
              shouldCleanup = true;
            }
          }

          // Check if orphaned (worktree no longer exists)
          if (orphaned) {
            try {
              const worktreeExists = await git.worktreeExists(lock.worktree);
              if (!worktreeExists) {
                shouldCleanup = true;
              }
            } catch {
              shouldCleanup = true;
            }
          }

          if (shouldCleanup) {
            toCleanup.push(lock);
          }
        }

        if (dryRun) {
          return {
            total: locks.length,
            toCleanup: toCleanup.length,
            locks: toCleanup,
          };
        }

        // Clean up locks
        let cleaned = 0;
        for (const lock of toCleanup) {
          try {
            await this.release(lock.name);
            cleaned++;
          } catch (error) {
            console.warn(`Failed to cleanup lock ${lock.name}:`, error.message);
          }
        }

        return {
          total: locks.length,
          cleaned,
          remaining: locks.length - cleaned,
        };
      } catch (error) {
        throw new Error(`Failed to cleanup locks: ${error.message}`);
      }
    },

    // === Lock Utilities ===
    generateLockId() {
      return createHash("sha256")
        .update(`${Date.now()}-${Math.random()}`)
        .digest("hex")
        .slice(0, 16);
    },

    getLockRef(lockName, gitInfo) {
      const worktreeId = this.getWorktreeId(gitInfo.worktree);
      const lockHash = createHash("sha256")
        .update(lockName)
        .digest("hex")
        .slice(0, 8);

      return `refs/gitvan/locks/${lockName}-${worktreeId}-${lockHash}`;
    },

    getWorktreeId(worktreePath) {
      return createHash("sha256")
        .update(worktreePath)
        .digest("hex")
        .slice(0, 8);
    },

    // === Lock Context Helpers ===
    async createContext(lockName, options = {}) {
      const { additionalContext = {} } = options;

      try {
        const gitInfo = await git.info();
        const lockRef = this.getLockRef(lockName, gitInfo);

        return {
          lock: {
            name: lockName,
            ref: lockRef,
            worktree: gitInfo.worktree,
            branch: gitInfo.branch,
          },
          git: gitInfo,
          timestamp: new Date().toISOString(),
          ...additionalContext,
        };
      } catch (error) {
        throw new Error(
          `Failed to create lock context for ${lockName}: ${error.message}`
        );
      }
    },

    // === Lock Fingerprinting ===
    async getFingerprint(lockName) {
      try {
        const gitInfo = await git.info();
        const lockRef = this.getLockRef(lockName, gitInfo);

        return createHash("sha256").update(lockRef).digest("hex").slice(0, 16);
      } catch (error) {
        throw new Error(
          `Failed to get lock fingerprint for ${lockName}: ${error.message}`
        );
      }
    },

    // === Lock Search ===
    async search(query, options = {}) {
      const { fields = ["name", "worktree", "branch"] } = options;

      try {
        const locks = await this.list();
        const results = [];

        for (const lock of locks) {
          let matches = false;

          for (const field of fields) {
            if (
              lock[field] &&
              lock[field].toLowerCase().includes(query.toLowerCase())
            ) {
              matches = true;
              break;
            }
          }

          if (matches) {
            results.push(lock);
          }
        }

        return results;
      } catch (error) {
        throw new Error(`Failed to search locks: ${error.message}`);
      }
    },

    // === Lock Analytics ===
    async getStats(options = {}) {
      const {
        worktree = null,
        branch = null,
        since = null,
        until = null,
      } = options;

      try {
        const locks = await this.list({ worktree, branch });

        const stats = {
          total: locks.length,
          active: locks.filter((l) => l.locked).length,
          expired: locks.filter((l) => {
            const now = new Date();
            const lockTime = new Date(l.timestamp);
            const expiryTime = new Date(lockTime.getTime() + l.timeout);
            return now > expiryTime;
          }).length,
          byWorktree: {},
          byBranch: {},
          timeline: [],
        };

        // Group by worktree
        locks.forEach((lock) => {
          stats.byWorktree[lock.worktree] =
            (stats.byWorktree[lock.worktree] || 0) + 1;
        });

        // Group by branch
        locks.forEach((lock) => {
          stats.byBranch[lock.branch] = (stats.byBranch[lock.branch] || 0) + 1;
        });

        // Create timeline
        const timeline = {};
        locks.forEach((lock) => {
          const date = lock.timestamp.split("T")[0];
          if (!timeline[date]) {
            timeline[date] = { acquired: 0, released: 0 };
          }
          timeline[date].acquired = (timeline[date].acquired || 0) + 1;
        });

        stats.timeline = Object.entries(timeline)
          .map(([date, counts]) => ({ date, ...counts }))
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        return stats;
      } catch (error) {
        throw new Error(`Failed to get lock stats: ${error.message}`);
      }
    },

    // === Lock Export ===
    async export(options = {}) {
      const { format = "json", worktree = null, branch = null } = options;

      try {
        const locks = await this.list({ worktree, branch });

        if (format === "json") {
          return JSON.stringify(locks, null, 2);
        } else if (format === "csv") {
          // Convert to CSV format
          const headers = [
            "name",
            "worktree",
            "branch",
            "commit",
            "timestamp",
            "timeout",
          ];
          const csv = [
            headers.join(","),
            ...locks.map((lock) => headers.map((h) => lock[h] || "").join(",")),
          ].join("\n");
          return csv;
        } else {
          throw new Error(`Unsupported export format: ${format}`);
        }
      } catch (error) {
        throw new Error(`Failed to export locks: ${error.message}`);
      }
    },
  };
}
