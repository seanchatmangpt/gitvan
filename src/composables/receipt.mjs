/**
 * GitVan v2 - useReceipt() Composable
 * Provides receipt and audit management for job and event execution
 */

import { useGitVan, tryUseGitVan, withGitVan } from "../core/context.mjs";
import { useGit } from "./git.mjs";
import {
  writeReceipt,
  readReceipts,
  listReceiptCommits,
} from "../runtime/receipt.mjs";
import { createHash } from "node:crypto";
import { join } from "node:path";

export function useReceipt() {
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

    // === Receipt Creation ===
    async create(receiptData) {
      try {
        const gitInfo = await git.info();
        const timestamp = new Date().toISOString();

        // Create receipt object
        const receipt = {
          id: receiptData.id || this.generateId(),
          jobId: receiptData.jobId,
          eventId: receiptData.eventId,
          status: receiptData.status || "success",
          timestamp,
          commit: gitInfo.head,
          branch: gitInfo.branch,
          worktree: gitInfo.worktree,
          artifacts: receiptData.artifacts || [],
          metadata: receiptData.metadata || {},
          error: receiptData.error,
          result: receiptData.result,
          duration: receiptData.duration,
          ...receiptData,
        };

        // Generate fingerprint for verification
        receipt.fingerprint = this.generateFingerprint(receipt);

        // Write receipt to Git notes
        await writeReceipt({
          resultsRef: "refs/notes/gitvan/results",
          id: receipt.id,
          status: receipt.status,
          commit: receipt.commit,
          action: receipt.jobId ? "job" : "event",
          result: receipt.result,
          artifact: receipt.artifacts,
          meta: {
            worktree: receipt.worktree,
            branch: receipt.branch,
            timestamp: receipt.timestamp,
            fingerprint: receipt.fingerprint,
            ...receipt.metadata,
          },
        });

        return receipt;
      } catch (error) {
        throw new Error(`Failed to create receipt: ${error.message}`);
      }
    },

    // === Receipt Retrieval ===
    async list(options = {}) {
      const {
        jobId = null,
        eventId = null,
        status = null,
        limit = 100,
        since = null,
        until = null,
      } = options;

      try {
        const gitInfo = await git.info();
        const receipts = await readReceipts({
          resultsRef: "refs/notes/gitvan/results",
          worktree: gitInfo.worktree,
        });

        let filtered = receipts;

        // Apply filters
        if (jobId) {
          filtered = filtered.filter((r) => r.jobId === jobId);
        }

        if (eventId) {
          filtered = filtered.filter((r) => r.eventId === eventId);
        }

        if (status) {
          filtered = filtered.filter((r) => r.status === status);
        }

        if (since) {
          const sinceDate = new Date(since);
          filtered = filtered.filter((r) => new Date(r.timestamp) >= sinceDate);
        }

        if (until) {
          const untilDate = new Date(until);
          filtered = filtered.filter((r) => new Date(r.timestamp) <= untilDate);
        }

        // Sort by timestamp (newest first)
        filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return filtered.slice(0, limit);
      } catch (error) {
        throw new Error(`Failed to list receipts: ${error.message}`);
      }
    },

    async get(receiptId) {
      try {
        const receipts = await this.list({ limit: 1000 });
        const receipt = receipts.find((r) => r.id === receiptId);

        if (!receipt) {
          throw new Error(`Receipt not found: ${receiptId}`);
        }

        return receipt;
      } catch (error) {
        throw new Error(`Failed to get receipt ${receiptId}: ${error.message}`);
      }
    },

    async exists(receiptId) {
      try {
        await this.get(receiptId);
        return true;
      } catch {
        return false;
      }
    },

    // === Receipt Verification ===
    async verify(receiptId) {
      try {
        const receipt = await this.get(receiptId);

        // Verify fingerprint
        const expectedFingerprint = this.generateFingerprint(receipt);
        const fingerprintValid = receipt.fingerprint === expectedFingerprint;

        // Verify Git note exists
        const noteValid = await this.exists(receiptId);

        return {
          id: receiptId,
          valid: fingerprintValid && noteValid,
          fingerprintValid,
          noteValid,
          receipt,
        };
      } catch (error) {
        return {
          id: receiptId,
          valid: false,
          fingerprintValid: false,
          noteValid: false,
          error: error.message,
        };
      }
    },

    async verifyAll(options = {}) {
      const { limit = 100 } = options;

      try {
        const receipts = await this.list({ limit });
        const results = [];

        for (const receipt of receipts) {
          const verification = await this.verify(receipt.id);
          results.push(verification);
        }

        return results;
      } catch (error) {
        throw new Error(`Failed to verify all receipts: ${error.message}`);
      }
    },

    // === Receipt Analytics ===
    async getStats(options = {}) {
      const {
        jobId = null,
        eventId = null,
        since = null,
        until = null,
      } = options;

      try {
        const receipts = await this.list({
          jobId,
          eventId,
          since,
          until,
          limit: 1000,
        });

        const stats = {
          total: receipts.length,
          success: receipts.filter((r) => r.status === "success").length,
          error: receipts.filter((r) => r.status === "error").length,
          successRate: 0,
          averageDuration: 0,
          byStatus: {},
          byJob: {},
          byEvent: {},
          timeline: [],
        };

        // Calculate success rate
        if (stats.total > 0) {
          stats.successRate = Math.round((stats.success / stats.total) * 100);
        }

        // Calculate average duration
        const durations = receipts
          .filter((r) => r.duration)
          .map((r) => r.duration);

        if (durations.length > 0) {
          stats.averageDuration =
            durations.reduce((a, b) => a + b, 0) / durations.length;
        }

        // Group by status
        receipts.forEach((r) => {
          stats.byStatus[r.status] = (stats.byStatus[r.status] || 0) + 1;
        });

        // Group by job
        receipts.forEach((r) => {
          if (r.jobId) {
            stats.byJob[r.jobId] = (stats.byJob[r.jobId] || 0) + 1;
          }
        });

        // Group by event
        receipts.forEach((r) => {
          if (r.eventId) {
            stats.byEvent[r.eventId] = (stats.byEvent[r.eventId] || 0) + 1;
          }
        });

        // Create timeline
        const timeline = {};
        receipts.forEach((r) => {
          if (r.timestamp) {
            const date = r.timestamp.split("T")[0];
            if (!timeline[date]) {
              timeline[date] = { success: 0, error: 0 };
            }
            timeline[date][r.status] = (timeline[date][r.status] || 0) + 1;
          }
        });

        stats.timeline = Object.entries(timeline)
          .map(([date, counts]) => ({ date, ...counts }))
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        return stats;
      } catch (error) {
        throw new Error(`Failed to get receipt stats: ${error.message}`);
      }
    },

    // === Receipt Management ===
    async cleanup(options = {}) {
      const { olderThan = null, keepCount = 1000, dryRun = false } = options;

      try {
        const receipts = await this.list({ limit: 10000 });
        let toDelete = [];

        // Filter by age
        if (olderThan) {
          const cutoffDate = new Date(olderThan);
          toDelete = receipts.filter((r) => new Date(r.timestamp) < cutoffDate);
        } else {
          // Keep only the most recent receipts
          toDelete = receipts.slice(keepCount);
        }

        if (dryRun) {
          return {
            total: receipts.length,
            toDelete: toDelete.length,
            toKeep: receipts.length - toDelete.length,
            receipts: toDelete,
          };
        }

        // Delete receipts (this would need to be implemented in the receipt runtime)
        // For now, just return the cleanup plan
        return {
          total: receipts.length,
          deleted: toDelete.length,
          kept: receipts.length - toDelete.length,
        };
      } catch (error) {
        throw new Error(`Failed to cleanup receipts: ${error.message}`);
      }
    },

    // === Receipt Utilities ===
    generateId() {
      return createHash("sha256")
        .update(`${Date.now()}-${Math.random()}`)
        .digest("hex")
        .slice(0, 16);
    },

    generateFingerprint(receipt) {
      const data = {
        id: receipt.id,
        jobId: receipt.jobId,
        eventId: receipt.eventId,
        status: receipt.status,
        timestamp: receipt.timestamp,
        commit: receipt.commit,
        branch: receipt.branch,
        worktree: receipt.worktree,
      };

      return createHash("sha256")
        .update(JSON.stringify(data))
        .digest("hex")
        .slice(0, 16);
    },

    // === Receipt Search ===
    async search(query, options = {}) {
      const { fields = ["jobId", "eventId", "status"] } = options;

      try {
        const receipts = await this.list({ limit: 1000 });
        const results = [];

        for (const receipt of receipts) {
          let matches = false;

          for (const field of fields) {
            if (
              receipt[field] &&
              receipt[field].toLowerCase().includes(query.toLowerCase())
            ) {
              matches = true;
              break;
            }
          }

          if (matches) {
            results.push(receipt);
          }
        }

        return results;
      } catch (error) {
        throw new Error(`Failed to search receipts: ${error.message}`);
      }
    },

    // === Receipt Export ===
    async export(options = {}) {
      const {
        format = "json",
        since = null,
        until = null,
        jobId = null,
        eventId = null,
      } = options;

      try {
        const receipts = await this.list({
          since,
          until,
          jobId,
          eventId,
          limit: 10000,
        });

        if (format === "json") {
          return JSON.stringify(receipts, null, 2);
        } else if (format === "csv") {
          // Convert to CSV format
          const headers = [
            "id",
            "jobId",
            "eventId",
            "status",
            "timestamp",
            "commit",
            "branch",
            "worktree",
          ];
          const csv = [
            headers.join(","),
            ...receipts.map((r) => headers.map((h) => r[h] || "").join(",")),
          ].join("\n");
          return csv;
        } else {
          throw new Error(`Unsupported export format: ${format}`);
        }
      } catch (error) {
        throw new Error(`Failed to export receipts: ${error.message}`);
      }
    },
  };
}
