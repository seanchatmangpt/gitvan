// src/jobs/bree-scheduler.mjs
// GitVan v3.0.0 — Bree Scheduler Integration
// Manages Bree instance for job scheduling and execution

import Bree from "bree";
import { join } from "pathe";
import { mkdir } from "node:fs/promises";
import { createLogger } from "../utils/logger.mjs";

const logger = createLogger("jobs:bree-scheduler");

/**
 * Bree scheduler singleton for GitVan jobs
 * Manages job scheduling, execution, and lifecycle
 */
export class BreeScheduler {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.jobsDir = options.jobsDir || join(this.cwd, "jobs");
    this.bree = null;
    this.jobs = new Map();
    this.isRunning = false;
    this.workerMessageHandlers = new Map();

    // Configuration options
    this.config = {
      root: this.jobsDir,
      hasSeconds: false,
      timeout: options.timeout || 0,
      interval: options.interval || 1000,
      closeWorkerAfterMs: options.closeWorkerAfterMs || 5000,
      defaultExtension: "mjs",
      acceptedExtensions: [".mjs", ".js"],
      outputWorkerMetadata: true,
      removeCompleted: options.removeCompleted !== false,
      ...options.breeConfig,
    };
  }

  /**
   * Initialize Bree instance
   */
  async init() {
    if (this.bree) {
      logger.warn("Bree already initialized");
      return;
    }

    try {
      // Ensure jobs directory exists (Bree requires this)
      await mkdir(this.jobsDir, { recursive: true });

      this.bree = new Bree({
        ...this.config,
        jobs: [],
      });

      // Set up global error handlers
      this.bree.on("worker created", (name) => {
        logger.info(`Worker created: ${name}`);
      });

      this.bree.on("worker deleted", (name) => {
        logger.info(`Worker deleted: ${name}`);
      });

      this.bree.on("worker error", (error, workerMetadata) => {
        logger.error(`Worker error in ${workerMetadata.name}:`, error.message);
      });

      logger.info("Bree scheduler initialized");
    } catch (error) {
      logger.error("Failed to initialize Bree:", error.message);
      throw new Error(`Failed to initialize Bree scheduler: ${error.message}`);
    }
  }

  /**
   * Start the Bree scheduler
   */
  async start() {
    if (!this.bree) {
      await this.init();
    }

    if (this.isRunning) {
      logger.warn("Bree scheduler already running");
      return;
    }

    try {
      await this.bree.start();
      this.isRunning = true;
      logger.info("Bree scheduler started");
    } catch (error) {
      logger.error("Failed to start Bree scheduler:", error.message);
      throw new Error(`Failed to start Bree scheduler: ${error.message}`);
    }
  }

  /**
   * Stop the Bree scheduler
   */
  async stop() {
    if (!this.bree || !this.isRunning) {
      logger.warn("Bree scheduler not running");
      return;
    }

    try {
      await this.bree.stop();
      this.isRunning = false;
      logger.info("Bree scheduler stopped");
    } catch (error) {
      logger.error("Failed to stop Bree scheduler:", error.message);
      throw new Error(`Failed to stop Bree scheduler: ${error.message}`);
    }
  }

  /**
   * Add a job to the scheduler
   */
  async addJob(jobConfig) {
    const { name, path, cron, interval, timeout, date, worker } = jobConfig;

    if (!name) {
      throw new Error("Job name is required");
    }

    if (this.jobs.has(name)) {
      logger.warn(`Job ${name} already exists, updating...`);
      await this.removeJob(name);
    }

    try {
      // CRITICAL: Bree requires absolute paths
      // Ensure job path is absolute by joining with cwd
      const jobPath = path || join(this.cwd, this.jobsDir, `${name}.mjs`);

      const breeJobConfig = {
        name,
        path: jobPath,
        ...(cron ? { cron } : {}),
        ...(interval ? { interval } : {}),
        ...(timeout ? { timeout } : {}),
        ...(date ? { date } : {}),
        ...(worker ? { worker } : {}),
      };

      // Track it in our jobs map
      this.jobs.set(name, breeJobConfig);

      // CRITICAL FIX: Recreate Bree with all jobs
      // Bree's add() method is unreliable - jobs added dynamically
      // are not available for bree.run(). We must recreate the instance.
      await this._recreateBree();

      logger.info(`Job added: ${name}`);

      return breeJobConfig;
    } catch (error) {
      logger.error(`Failed to add job ${name}:`, error.message);
      throw new Error(`Failed to add job ${name}: ${error.message}`);
    }
  }

  /**
   * Remove a job from the scheduler
   */
  async removeJob(name) {
    if (!this.jobs.has(name)) {
      logger.warn(`Job ${name} does not exist in scheduler`);
      return;
    }

    try {
      // Remove from our tracking
      this.jobs.delete(name);

      // Recreate Bree with remaining jobs
      await this._recreateBree();

      logger.info(`Job removed: ${name}`);
    } catch (error) {
      logger.error(`Failed to remove job ${name}:`, error.message);
      throw new Error(`Failed to remove job ${name}: ${error.message}`);
    }
  }

  /**
   * Recreate Bree instance with current jobs
   *
   * This is necessary because Bree's add()/remove() methods are unreliable.
   * Jobs added after initialization are not available for run().
   *
   * @private
   */
  async _recreateBree() {
    const wasRunning = this.isRunning;

    // Stop and clean up existing Bree
    if (this.bree) {
      try {
        if (wasRunning) {
          await this.bree.stop();
        }
      } catch (error) {
        logger.warn("Error stopping Bree during recreate:", error.message);
      }
    }

    // Create new Bree with all current jobs
    this.bree = new Bree({
      ...this.config,
      jobs: Array.from(this.jobs.values()),
    });

    // Restore event handlers
    this.bree.on("worker created", (name) => {
      logger.info(`Worker created: ${name}`);
    });

    this.bree.on("worker deleted", (name) => {
      logger.info(`Worker deleted: ${name}`);
    });

    this.bree.on("worker error", (error, workerMetadata) => {
      logger.error(`Worker error in ${workerMetadata.name}:`, error.message);
    });

    // Start if it was running before
    if (wasRunning) {
      await this.bree.start();
      this.isRunning = true;
    } else {
      this.isRunning = false;
    }
  }

  /**
   * Run a job immediately
   */
  async runJob(name) {
    if (!this.bree) {
      await this.init();
    }

    if (!this.jobs.has(name)) {
      throw new Error(`Job ${name} does not exist`);
    }

    try {
      // Ensure Bree is started before running a job
      if (!this.isRunning) {
        await this.start();
      }

      // Run the job immediately (one-time execution)
      await this.bree.run(name);
      logger.info(`Job executed: ${name}`);
    } catch (error) {
      logger.error(`Failed to run job ${name}:`, error.message);
      throw new Error(`Failed to run job ${name}: ${error.message}`);
    }
  }

  /**
   * Start a specific job
   */
  async startJob(name) {
    if (!this.bree) {
      await this.init();
    }

    if (!this.jobs.has(name)) {
      throw new Error(`Job ${name} does not exist`);
    }

    try {
      await this.bree.start(name);
      logger.info(`Job started: ${name}`);
    } catch (error) {
      logger.error(`Failed to start job ${name}:`, error.message);
      throw new Error(`Failed to start job ${name}: ${error.message}`);
    }
  }

  /**
   * Stop a specific job
   */
  async stopJob(name) {
    if (!this.bree) {
      logger.warn("Bree not initialized");
      return;
    }

    if (!this.jobs.has(name)) {
      logger.warn(`Job ${name} does not exist`);
      return;
    }

    try {
      await this.bree.stop(name);
      logger.info(`Job stopped: ${name}`);
    } catch (error) {
      logger.error(`Failed to stop job ${name}:`, error.message);
      throw new Error(`Failed to stop job ${name}: ${error.message}`);
    }
  }

  /**
   * List all jobs
   */
  listJobs() {
    return Array.from(this.jobs.values());
  }

  /**
   * Get job configuration
   */
  getJob(name) {
    return this.jobs.get(name) || null;
  }

  /**
   * Check if a job exists
   */
  hasJob(name) {
    return this.jobs.has(name);
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      jobCount: this.jobs.size,
      jobs: this.listJobs().map((job) => ({
        name: job.name,
        cron: job.cron,
        interval: job.interval,
      })),
    };
  }

  /**
   * Gracefully shutdown the scheduler
   */
  async shutdown() {
    logger.info("Shutting down Bree scheduler...");

    try {
      if (this.isRunning) {
        await this.stop();
      }

      if (this.bree) {
        // Stop all jobs
        for (const jobName of this.jobs.keys()) {
          try {
            await this.stopJob(jobName);
          } catch (error) {
            logger.warn(`Failed to stop job ${jobName} during shutdown:`, error.message);
          }
        }

        this.bree = null;
      }

      this.jobs.clear();
      logger.info("Bree scheduler shut down successfully");
    } catch (error) {
      logger.error("Error during Bree scheduler shutdown:", error.message);
      throw error;
    }
  }

  /**
   * Register a worker message handler
   */
  onWorkerMessage(jobName, handler) {
    if (!this.workerMessageHandlers.has(jobName)) {
      this.workerMessageHandlers.set(jobName, []);
    }
    this.workerMessageHandlers.get(jobName).push(handler);
  }

  /**
   * Handle message from worker
   */
  async handleWorkerMessage(jobName, message) {
    const handlers = this.workerMessageHandlers.get(jobName) || [];
    for (const handler of handlers) {
      try {
        await handler(message);
      } catch (error) {
        logger.error(`Worker message handler error for ${jobName}:`, error.message);
      }
    }
  }
}

// Singleton instances keyed by cwd
const schedulerInstances = new Map();

/**
 * Get or create the BreeScheduler singleton for a specific cwd
 */
export function getBreeScheduler(options = {}) {
  const cwd = options.cwd || process.cwd();

  if (!schedulerInstances.has(cwd)) {
    schedulerInstances.set(cwd, new BreeScheduler(options));
  }

  return schedulerInstances.get(cwd);
}

/**
 * Reset the scheduler singleton for a specific cwd (mainly for testing)
 */
export function resetBreeScheduler(cwd = null) {
  if (cwd) {
    // Reset specific cwd
    if (schedulerInstances.has(cwd)) {
      const instance = schedulerInstances.get(cwd);
      instance.shutdown().catch((error) => {
        logger.error("Error resetting scheduler:", error.message);
      });
      schedulerInstances.delete(cwd);
    }
  } else {
    // Reset all instances
    for (const [key, instance] of schedulerInstances.entries()) {
      instance.shutdown().catch((error) => {
        logger.error("Error resetting scheduler:", error.message);
      });
      schedulerInstances.delete(key);
    }
  }
}

export default BreeScheduler;
