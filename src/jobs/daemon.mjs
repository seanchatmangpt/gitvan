// src/jobs/daemon.mjs
// GitVan v2 — Job Daemon
// Combines cron scheduling and event monitoring

import { CronScheduler } from "./cron.mjs";
import { EventJobRunner } from "./events.mjs";
import { loadOptions } from "../config/loader.mjs";
import { useGit } from "../composables/git/index.mjs";

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
  }

  async init() {
    this.config = await loadOptions();
    this.cronScheduler = new CronScheduler({
      tickInterval: this.options.cronTickInterval || 60000,
    });
    this.eventRunner = new EventJobRunner();
    this.git = useGit();

    await this.cronScheduler.init();
    await this.eventRunner.init();
  }

  /**
   * Start the daemon
   */
  async start() {
    if (this.isRunning) {
      console.warn("Job daemon is already running");
      return;
    }

    await this.init();

    console.log("Starting GitVan Job Daemon...");
    console.log(`Configuration:`);
    console.log(`  Root directory: ${this.config.rootDir}`);
    console.log(`  Receipts ref: ${this.config.receipts.ref}`);
    console.log(`  Event check interval: ${this.eventCheckInterval / 1000}s`);
    console.log(
      `  Cron tick interval: ${this.cronScheduler.tickInterval / 1000}s`
    );

    this.isRunning = true;

    // Start cron scheduler
    await this.cronScheduler.start();

    // Start event monitoring
    await this.startEventMonitoring();

    // Set up signal handlers
    this.setupSignalHandlers();

    console.log("✅ Job daemon started successfully");
  }

  /**
   * Stop the daemon
   */
  async stop() {
    if (!this.isRunning) {
      console.warn("Job daemon is not running");
      return;
    }

    console.log("Stopping GitVan Job Daemon...");

    this.isRunning = false;

    // Stop cron scheduler
    this.cronScheduler.stop();

    // Stop event monitoring
    this.stopEventMonitoring();

    console.log("✅ Job daemon stopped");
  }

  /**
   * Start event monitoring
   */
  async startEventMonitoring() {
    // Get initial commit
    try {
      this.lastCommit = await this.git.head();
    } catch (error) {
      console.warn("Could not get initial commit:", error.message);
    }

    // Set up periodic event checks
    this.eventTimer = setInterval(async () => {
      try {
        await this.checkForEvents();
      } catch (error) {
        console.error("Event monitoring error:", error.message);
      }
    }, this.eventCheckInterval);

    console.log("Event monitoring started");
  }

  /**
   * Stop event monitoring
   */
  stopEventMonitoring() {
    if (this.eventTimer) {
      clearInterval(this.eventTimer);
      this.eventTimer = null;
    }

    console.log("Event monitoring stopped");
  }

  /**
   * Check for new git events
   */
  async checkForEvents() {
    try {
      const currentCommit = await this.git.head();

      if (this.lastCommit && currentCommit !== this.lastCommit) {
        console.log(
          `Git event detected: ${this.lastCommit} → ${currentCommit}`
        );

        // Check for event-driven jobs
        await this.eventRunner.checkAndRunEventJobs({
          commit: currentCommit,
          previousCommit: this.lastCommit,
        });

        this.lastCommit = currentCommit;
      }
    } catch (error) {
      console.warn("Error checking for events:", error.message);
    }
  }

  /**
   * Set up signal handlers for graceful shutdown
   */
  setupSignalHandlers() {
    const shutdown = async (signal) => {
      console.log(`\nReceived ${signal}, shutting down gracefully...`);
      await this.stop();
      process.exit(0);
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGHUP", () => shutdown("SIGHUP"));
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
      console.log("Daemon is not running");
      return;
    }

    const status = this.daemon.getStatus();

    console.log("GitVan Job Daemon Status:");
    console.log(`  Running: ${status.isRunning}`);
    console.log(`  Root directory: ${status.config?.rootDir || "N/A"}`);
    console.log(`  Receipts ref: ${status.config?.receiptsRef || "N/A"}`);
    console.log(`  Last commit: ${status.lastCommit || "N/A"}`);

    if (status.cronStatus) {
      console.log(
        `  Cron scheduler: ${
          status.cronStatus.isRunning ? "Running" : "Stopped"
        }`
      );
      console.log(`  Scheduled jobs: ${status.cronStatus.scheduleSize}`);
    }
  }

  /**
   * Get daemon statistics
   */
  async stats() {
    if (!this.daemon) {
      console.log("Daemon is not running");
      return;
    }

    const stats = await this.daemon.getStats();

    console.log("GitVan Job Daemon Statistics:");
    console.log(`  Cron jobs: ${stats.cronJobs}`);
    console.log(`  Event jobs: ${stats.eventJobs}`);
    console.log(`  Total jobs: ${stats.totalJobs}`);
    console.log(`  Uptime: ${Math.round(stats.uptime / 1000)}s`);
  }

  /**
   * Force event check
   */
  async check() {
    if (!this.daemon) {
      console.log("Daemon is not running");
      return;
    }

    await this.daemon.forceEventCheck();
    console.log("Event check completed");
  }
}

/**
 * Start the job daemon
 */
export async function startJobDaemon(options = {}) {
  const cli = new DaemonCLI();
  return await cli.start(options);
}
