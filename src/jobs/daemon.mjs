/**
 * GitVan Job Daemon
 *
 * Production-grade daemon with:
 * - Structured logging
 * - Graceful shutdown
 * - Error recovery
 * - Health checks
 * - No process.exit calls
 */

import { CronScheduler } from "./cron.mjs";
import { EventJobRunner } from "./events.mjs";
import { loadOptions } from "../config/loader.mjs";
import { useGit } from "../composables/git/index.mjs";
import { createLogger } from "../utils/logger.mjs";
import { GitVanError } from "../core/errors.mjs";
import {
  withErrorBoundary,
  trackOperation,
  registerErrorHandler,
} from "../core/error-handler.mjs";

const logger = createLogger("daemon");

/**
 * GitVan Job Daemon
 * Monitors git events and runs scheduled jobs
 */
export class JobDaemon {
  constructor(options = {}) {
    this.options = options;
    this.config = null;
    this.cronScheduler = null;
    this.eventRunner = null;
    this.git = null;
    this.isRunning = false;
    this.watchers = new Map();
    this.lastCommit = null;
    this.eventCheckInterval = options.eventCheckInterval || 30000; // Check every 30 seconds
    this.eventTimer = null;
    this.startTime = null;
    this.errorCount = 0;
    this.shutdownCallbacks = [];
  }

  async init() {
    const complete = trackOperation("daemon:init");

    try {
      logger.info("Initializing daemon");

      this.config = await loadOptions();
      this.cronScheduler = new CronScheduler({
        tickInterval: this.options.cronTickInterval || 60000,
      });
      this.eventRunner = new EventJobRunner();
      this.git = useGit();

      await this.cronScheduler.init();
      await this.eventRunner.init();

      logger.info("Daemon initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize daemon", {
        error: error.message,
      });
      throw error;
    } finally {
      complete();
    }
  }

  /**
   * Start the daemon
   */
  async start() {
    if (this.isRunning) {
      logger.warn("Job daemon is already running");
      return;
    }

    const complete = trackOperation("daemon:start");

    try {
      await withErrorBoundary(
        async () => {
          await this.init();

          logger.info("Starting GitVan Job Daemon", {
            rootDir: this.config.rootDir,
            receiptsRef: this.config.receipts.ref,
            eventCheckInterval: this.eventCheckInterval,
            cronTickInterval: this.cronScheduler.tickInterval,
          });

          this.isRunning = true;
          this.startTime = Date.now();

          // Start cron scheduler
          await this.cronScheduler.start();

          // Start event monitoring
          await this.startEventMonitoring();

          // Set up signal handlers
          this.setupSignalHandlers();

          logger.info("Job daemon started successfully", {
            uptime: 0,
          });
        },
        {
          maxRetries: 0, // Don't retry start
          fallback: undefined,
          onError: (error) => {
            logger.error("Failed to start daemon", {
              error: error.message,
              stack: error.stack,
            });
          },
        }
      );
    } finally {
      complete();
    }
  }

  /**
   * Stop the daemon gracefully
   */
  async stop() {
    if (!this.isRunning) {
      logger.warn("Daemon is not running");
      return;
    }

    const complete = trackOperation("daemon:stop");

    try {
      logger.info("Stopping GitVan Job Daemon");

      this.isRunning = false;

      // Run shutdown callbacks
      for (const callback of this.shutdownCallbacks) {
        try {
          await callback();
        } catch (error) {
          logger.error("Shutdown callback failed", {
            error: error.message,
          });
        }
      }

      // Stop cron scheduler
      if (this.cronScheduler) {
        this.cronScheduler.stop();
      }

      // Stop event monitoring
      this.stopEventMonitoring();

      logger.info("Job daemon stopped successfully");
    } finally {
      complete();
    }
  }

  /**
   * Start event monitoring
   */
  async startEventMonitoring() {
    const complete = trackOperation("daemon:start-event-monitoring");

    try {
      // Get initial commit
      try {
        this.lastCommit = await this.git.currentHead();
        logger.info("Initial commit loaded", {
          commit: this.lastCommit,
        });
      } catch (error) {
        logger.warn("Could not get initial commit", {
          error: error.message,
        });
      }

      // Set up periodic event checks
      this.eventTimer = setInterval(async () => {
        try {
          await this.checkForEvents();
        } catch (error) {
          this.errorCount++;
          logger.error("Event monitoring error", {
            error: error.message,
            errorCount: this.errorCount,
          });

          // If too many errors, something is seriously wrong
          if (this.errorCount > 10) {
            logger.error("Too many errors, stopping event monitoring");
            this.stopEventMonitoring();
          }
        }
      }, this.eventCheckInterval);

      logger.info("Event monitoring started", {
        interval: this.eventCheckInterval,
      });
    } finally {
      complete();
    }
  }

  /**
   * Stop event monitoring
   */
  stopEventMonitoring() {
    if (this.eventTimer) {
      clearInterval(this.eventTimer);
      this.eventTimer = null;
      logger.info("Event monitoring stopped");
    }
  }

  /**
   * Check for new git events
   */
  async checkForEvents() {
    const currentCommit = await this.git.currentHead();

    if (this.lastCommit && currentCommit !== this.lastCommit) {
      logger.info("Git event detected", {
        previous: this.lastCommit,
        current: currentCommit,
      });

      // Check for event-driven jobs
      await this.eventRunner.checkAndRunEventJobs({
        commit: currentCommit,
        previousCommit: this.lastCommit,
      });

      this.lastCommit = currentCommit;
      this.errorCount = 0; // Reset error count on success
    }
  }

  /**
   * Set up signal handlers for graceful shutdown
   * NOTE: Does NOT call process.exit - delegates to error handler
   */
  setupSignalHandlers() {
    const shutdown = async (signal) => {
      logger.info("Received shutdown signal", { signal });

      await this.stop();

      // Emit shutdown event for error handler to catch
      process.emit("beforeExit", 0);
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGHUP", () => shutdown("SIGHUP"));

    logger.info("Signal handlers registered");
  }

  /**
   * Register shutdown callback
   * @param {Function} callback - Callback to run on shutdown
   */
  onShutdown(callback) {
    this.shutdownCallbacks.push(callback);
  }

  /**
   * Enable health checks
   * @param {object} [options] - Health check options
   * @param {number} [options.port=9090] - Health check port
   * @param {string} [options.host="0.0.0.0"] - Health check host
   * @returns {Promise<void>}
   */
  async enableHealthChecks(options = {}) {
    const { createDefaultHealthChecks } = await import("../core/health-check.mjs");

    this.healthChecks = createDefaultHealthChecks(this);

    await this.healthChecks.start();

    // Mark as ready once daemon is running
    if (this.isRunning) {
      this.healthChecks.setReady(true);
    }

    // Add shutdown callback to stop health checks
    this.onShutdown(async () => {
      if (this.healthChecks) {
        await this.healthChecks.stop();
      }
    });

    logger.info("Health checks enabled");
  }

  /**
   * Get daemon status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      cronStatus: this.cronScheduler?.getStatus() || null,
      eventCheckInterval: this.eventCheckInterval,
      lastCommit: this.lastCommit,
      errorCount: this.errorCount,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      config: {
        rootDir: this.config?.rootDir,
        receiptsRef: this.config?.receipts?.ref,
      },
    };
  }

  /**
   * Force check for events (useful for testing)
   */
  async forceEventCheck() {
    if (!this.isRunning) {
      throw new Error("Daemon is not running");
    }

    await this.checkForEvents();
  }

  /**
   * Get daemon statistics
   */
  async getStats() {
    const cronSchedule = this.cronScheduler?.listSchedule() || [];
    const eventJobs = (await this.eventRunner?.listEventJobs()) || [];

    return {
      cronJobs: cronSchedule.length,
      eventJobs: eventJobs.length,
      totalJobs: cronSchedule.length + eventJobs.length,
      uptime: this.isRunning ? Date.now() - this.startTime : 0,
    };
  }
}

/**
 * CLI for daemon operations
 */
export class DaemonCLI {
  constructor() {
    this.daemon = null;
  }

  /**
   * Start the daemon
   */
  async start(options = {}) {
    this.daemon = new JobDaemon(options);
    await this.daemon.start();

    // Keep the process alive
    return new Promise((resolve) => {
      // The daemon will handle its own shutdown via signal handlers
      // This promise will never resolve, keeping the process alive
    });
  }

  /**
   * Stop the daemon (if running in same process)
   */
  async stop() {
    if (this.daemon) {
      await this.daemon.stop();
    }
  }

  /**
   * Get daemon status
   */
  async status() {
    if (!this.daemon) {
      logger.info("Daemon is not running");
      return;
    }

    const status = this.daemon.getStatus();

    logger.info("GitVan Job Daemon Status:");
    logger.info(`  Running: ${status.isRunning}`);
    logger.info(`  Root directory: ${status.config?.rootDir || "N/A"}`);
    logger.info(`  Receipts ref: ${status.config?.receiptsRef || "N/A"}`);
    logger.info(`  Last commit: ${status.lastCommit || "N/A"}`);

    if (status.cronStatus) {
      logger.info(
        `  Cron scheduler: ${
          status.cronStatus.isRunning ? "Running" : "Stopped"
        }`
      );
      logger.info(`  Scheduled jobs: ${status.cronStatus.scheduleSize}`);
    }
  }

  /**
   * Get daemon statistics
   */
  async stats() {
    if (!this.daemon) {
      logger.info("Daemon is not running");
      return;
    }

    const stats = await this.daemon.getStats();

    logger.info("GitVan Job Daemon Statistics:");
    logger.info(`  Cron jobs: ${stats.cronJobs}`);
    logger.info(`  Event jobs: ${stats.eventJobs}`);
    logger.info(`  Total jobs: ${stats.totalJobs}`);
    logger.info(`  Uptime: ${Math.round(stats.uptime / 1000)}s`);
  }

  /**
   * Force event check
   */
  async check() {
    if (!this.daemon) {
      logger.info("Daemon is not running");
      return;
    }

    await this.daemon.forceEventCheck();
    logger.info("Event check completed");
  }
}

/**
 * Start the job daemon
 */
export async function startJobDaemon(options = {}) {
  const cli = new DaemonCLI();
  return await cli.start(options);
}
