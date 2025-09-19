/**
 * GitVan v2 - useNativeIO() Composable
 * Provides Git-native I/O operations with queues, locks, receipts, snapshots, and workers.
 * Deterministic, durable task execution with Git-backed state.
 *
 * @example
 * const io = useNativeIO();
 * await io.acquireLock("build");
 * await io.addJob("high", () => doWork(), { name: "build" });
 * await io.writeReceipt("hook://build", { ok: true });
 * console.log(await io.getStatus());
 */

import { useGitVan, tryUseGitVan, withGitVan } from "../core/context.mjs";
import { GitNativeIO } from "../git-native/git-native-io.mjs";
import { useLog } from "./log.mjs";

export function useNativeIO() {
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

  // Initialize logging
  const log = useLog("GitNativeIO");

  // Initialize GitNativeIO instance with Consola-based logging
  const io = new GitNativeIO({
    cwd: base.cwd,
    logger: log,
    config: ctx?.config || {},
  });

  return {
    // Context properties (exposed for testing)
    cwd: base.cwd,
    env: base.env,

    // === Initialization ===
    async initialize() {
      return await io.initialize();
    },

    // === Job Execution ===
    async executeJob(jobFunction, options = {}) {
      return await io.executeJob(jobFunction, options);
    },

    async addJob(priority, job, metadata = {}) {
      return await io.addJob(priority, job, metadata);
    },

    // === Lock Management ===
    async acquireLock(lockName, options = {}) {
      if (!io._initialized) {
        throw new Error(
          "GitNativeIO must be initialized before calling acquireLock()"
        );
      }
      return await io.acquireLock(lockName, options);
    },

    async releaseLock(lockName) {
      return await io.releaseLock(lockName);
    },

    async isLocked(lockName) {
      return await io.isLocked(lockName);
    },

    // === Receipt Management ===
    async writeReceipt(hookId, result, metadata = {}) {
      return await io.writeReceipt(hookId, result, metadata);
    },

    async writeMetrics(metrics) {
      return await io.writeMetrics(metrics);
    },

    async writeExecution(executionId, execution) {
      return await io.writeExecution(executionId, execution);
    },

    // === Snapshot Management ===
    async storeSnapshot(key, data, metadata = {}) {
      return await io.storeSnapshot(key, data, metadata);
    },

    async getSnapshot(key, contentHash = null) {
      return await io.getSnapshot(key, contentHash);
    },

    async hasSnapshot(key, contentHash = null) {
      return await io.hasSnapshot(key, contentHash);
    },

    async listSnapshots() {
      return await io.listSnapshots();
    },

    // === System Operations ===
    async flushAll() {
      return await io.flushAll();
    },

    async getStatistics() {
      return await io.getStatistics();
    },

    async getStatus() {
      if (!io._initialized) {
        throw new Error(
          "GitNativeIO must be initialized before calling getStatus()"
        );
      }
      return await io.getStatus();
    },

    async reconcile() {
      return await io.reconcile();
    },

    async cleanup() {
      return await io.cleanup();
    },

    async shutdown() {
      return await io.shutdown();
    },

    // === Context-Aware Operations ===
    async withContext(context, operation) {
      return await withGitVan(context, operation);
    },

    // === Utility Methods ===
    async isInitialized() {
      return io._initialized || false;
    },

    async getConfig() {
      return io.config;
    },

    // === Batch Operations ===
    async batchOperations(operations) {
      const results = [];
      for (const operation of operations) {
        try {
          const result = await this.executeOperation(operation);
          results.push({ success: true, result });
        } catch (error) {
          results.push({ success: false, error: error.message });
        }
      }
      return results;
    },

    async executeOperation(operation) {
      const { type, ...params } = operation;

      switch (type) {
        case "acquireLock":
          return await this.acquireLock(params.lockName, params.options);
        case "releaseLock":
          return await this.releaseLock(params.lockName);
        case "addJob":
          return await this.addJob(
            params.priority,
            params.job,
            params.metadata
          );
        case "writeReceipt":
          return await this.writeReceipt(
            params.hookId,
            params.result,
            params.metadata
          );
        case "storeSnapshot":
          return await this.storeSnapshot(
            params.key,
            params.data,
            params.metadata
          );
        case "getSnapshot":
          return await this.getSnapshot(params.key, params.contentHash);
        default:
          throw new Error(`Unknown operation type: ${type}`);
      }
    },

    // === Health Check ===
    async healthCheck() {
      try {
        const status = await this.getStatus();
        const isHealthy =
          status &&
          typeof status === "object" &&
          status.queue !== undefined &&
          status.locks !== undefined &&
          status.receipts !== undefined &&
          status.snapshots !== undefined &&
          status.workers !== undefined;

        return {
          healthy: isHealthy,
          status: status,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          healthy: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
    },

    // === Metrics and Monitoring ===
    async getMetrics(options = {}) {
      const { includeSystem = true, includePerformance = true } = options;

      try {
        const stats = await this.getStatistics();
        const status = await this.getStatus();

        const metrics = {
          timestamp: new Date().toISOString(),
          receipts: stats,
        };

        if (includeSystem) {
          metrics.system = {
            queue: status.queue,
            locks: status.locks,
            snapshots: status.snapshots,
            workers: status.workers,
          };
        }

        if (includePerformance) {
          // Add performance metrics if available
          metrics.performance = {
            initialized: await this.isInitialized(),
            uptime: process.uptime(),
          };
        }

        return metrics;
      } catch (error) {
        throw new Error(`Failed to get metrics: ${error.message}`);
      }
    },

    // === Logging Control ===
    setLogLevel(level) {
      return log.setLevel(level);
    },

    getLogLevel() {
      return log.getLevel();
    },

    enableVerboseLogging() {
      return log.enableVerbose();
    },

    disableVerboseLogging() {
      return log.disableVerbose();
    },

    // === Logging Access ===
    getLogger() {
      return log;
    },

    // === Configuration Management ===
    async updateConfig(newConfig) {
      try {
        // Merge with existing config
        const mergedConfig = this._deepMerge(io.config, newConfig);
        io.config = mergedConfig;

        // Reinitialize if already initialized
        if (await this.isInitialized()) {
          await io.shutdown();
          await io.initialize();
        }

        return mergedConfig;
      } catch (error) {
        throw new Error(`Failed to update config: ${error.message}`);
      }
    },

    async resetConfig() {
      try {
        const defaultConfig = io._mergeConfig({});
        return await this.updateConfig(defaultConfig);
      } catch (error) {
        throw new Error(`Failed to reset config: ${error.message}`);
      }
    },

    // === Helper Methods ===
    _deepMerge(target, source) {
      const result = { ...target };

      for (const key in source) {
        if (
          source[key] &&
          typeof source[key] === "object" &&
          !Array.isArray(source[key])
        ) {
          result[key] = this._deepMerge(target[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }

      return result;
    },

    // === Context Helpers ===
    async createContext(options = {}) {
      const { additionalContext = {} } = options;

      try {
        const gitInfo = await this.getStatus();

        return {
          io: {
            cwd: base.cwd,
            initialized: await this.isInitialized(),
            config: await this.getConfig(),
          },
          git: gitInfo,
          timestamp: new Date().toISOString(),
          ...additionalContext,
        };
      } catch (error) {
        throw new Error(`Failed to create IO context: ${error.message}`);
      }
    },

    // === Debugging and Diagnostics ===
    async diagnose() {
      try {
        const health = await this.healthCheck();
        const metrics = await this.getMetrics();
        const config = await this.getConfig();

        return {
          health,
          metrics,
          config,
          environment: {
            cwd: base.cwd,
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
          },
        };
      } catch (error) {
        return {
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
    },

    // === Export/Import ===
    async export(options = {}) {
      const { format = "json", includeSnapshots = false } = options;

      try {
        const config = await this.getConfig();

        const exportData = {
          config,
          timestamp: new Date().toISOString(),
        };

        // Only include status if initialized
        if (io._initialized) {
          exportData.status = await this.getStatus();
        }

        if (includeSnapshots && io._initialized) {
          exportData.snapshots = await this.listSnapshots();
        }

        if (format === "json") {
          return JSON.stringify(exportData, null, 2);
        } else {
          throw new Error(`Unsupported export format: ${format}`);
        }
      } catch (error) {
        throw new Error(`Failed to export IO data: ${error.message}`);
      }
    },
  };
}
