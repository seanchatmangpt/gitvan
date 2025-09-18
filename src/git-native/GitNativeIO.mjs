// src/git-native/GitNativeIO.mjs
// Git-Native I/O Layer integrating all Git-native components

import { QueueManager } from "./QueueManager.mjs";
import { LockManager } from "./LockManager.mjs";
import { ReceiptWriter } from "./ReceiptWriter.mjs";
import { SnapshotStore } from "./SnapshotStore.mjs";
import { Worker } from "node:worker_threads";
import { cpus } from "node:os";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

/**
 * Git-Native I/O Layer
 * Main orchestrator for all Git-native I/O operations
 */
export class GitNativeIO {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.logger = options.logger || console;

    // Configuration
    this.config = {
      queue: {
        concurrency: 256, // Conservative, smooth processing
        interval: 50, // Queue processing interval (ms)
        intervalCap: 32, // Operations per interval
      },
      workers: {
        threads: Math.min(8, cpus().length),
        maxJobs: 1000, // Max jobs per worker
        timeout: 60_000, // Worker timeout (ms)
      },
      fs: {
        retryDelay: 50, // Retry delay (ms)
        maxOpenFDsGuard: true, // graceful-fs enabled
      },
      paths: {
        tmp: ".gitvan/tmp",
        queue: ".gitvan/queue",
        cache: ".gitvan/cache",
        artifacts: ".gitvan/artifacts",
        notesRef: "refs/notes/gitvan/results",
        locksRef: "refs/gitvan/locks",
        execRef: "refs/gitvan/executions",
      },
      git: {
        notesBatchSize: 100, // Batch notes appends
        gcAuto: true, // Periodic git gc --auto
        shardQueues: true, // Sharded queue dirs
      },
      ...options,
    };

    // Initialize components
    this.queueManager = new QueueManager({
      cwd: this.cwd,
      logger: this.logger,
      queue: this.config.queue,
      paths: this.config.paths,
    });

    this.lockManager = new LockManager({
      cwd: this.cwd,
      logger: this.logger,
      lock: this.config.lock,
    });

    this.receiptWriter = new ReceiptWriter({
      cwd: this.cwd,
      logger: this.logger,
      receipt: this.config.git,
    });

    this.snapshotStore = new SnapshotStore({
      cwd: this.cwd,
      logger: this.logger,
      snapshot: this.config.snapshot,
    });

    // Worker pool
    this.workers = [];
    this.workerQueue = [];
    this.isShuttingDown = false;

    // Initialize worker pool
    this._initializeWorkerPool();

    // Setup graceful shutdown
    this._setupGracefulShutdown();
  }

  /**
   * Initialize worker pool
   * @private
   */
  _initializeWorkerPool() {
    const numWorkers = this.config.workers.threads;
    const workerPath = join(
      dirname(fileURLToPath(import.meta.url)),
      "worker.mjs"
    );

    for (let i = 0; i < numWorkers; i++) {
      const worker = new Worker(workerPath);

      worker.on("message", (message) => {
        this._handleWorkerMessage(message);
      });

      worker.on("error", (error) => {
        this.logger.error(`Worker error: ${error.message}`);
      });

      this.workers.push(worker);
    }

    this.logger.info(`Initialized ${numWorkers} workers`);
  }

  /**
   * Handle worker message
   * @private
   */
  _handleWorkerMessage(message) {
    const { jobId, result, error, success } = message;

    // Find the job in the queue
    const jobIndex = this.workerQueue.findIndex((job) => job.id === jobId);
    if (jobIndex === -1) {
      this.logger.warn(`Received message for unknown job ${jobId}`);
      return;
    }

    const job = this.workerQueue[jobIndex];
    this.workerQueue.splice(jobIndex, 1);

    // Resolve or reject the job promise
    if (success) {
      job.resolve(result);
    } else {
      job.reject(new Error(error));
    }
  }

  /**
   * Execute a job with worker pool
   * @param {Function} jobFunction - Function to execute
   * @param {object} options - Job options
   * @returns {Promise} Job execution promise
   */
  async executeJob(jobFunction, options = {}) {
    if (this.isShuttingDown) {
      throw new Error("GitNativeIO is shutting down");
    }

    const jobId = this._generateJobId();
    const timeout = options.timeout || this.config.workers.timeout;

    return new Promise((resolve, reject) => {
      // Add to worker queue
      this.workerQueue.push({
        id: jobId,
        resolve,
        reject,
        jobFunction: jobFunction.toString(),
        timeout,
      });

      // Find available worker
      const availableWorker = this.workers.find(
        (worker) => !this.workerQueue.some((job) => job.worker === worker)
      );

      if (availableWorker) {
        // Assign job to worker
        const job = this.workerQueue.find((job) => job.id === jobId);
        job.worker = availableWorker;

        // Send job to worker
        availableWorker.postMessage({
          jobId,
          jobFunction: jobFunction.toString(),
          timeout,
        });
      } else {
        // No available workers, job will be picked up when a worker becomes available
        this.logger.debug(`Job ${jobId} queued, waiting for available worker`);
      }
    });
  }

  /**
   * Add a job to the priority queue
   * @param {string} priority - 'high', 'medium', or 'low'
   * @param {Function} job - Job function
   * @param {object} metadata - Job metadata
   * @returns {Promise} Job execution promise
   */
  async addJob(priority, job, metadata = {}) {
    return this.queueManager.addJob(priority, job, metadata);
  }

  /**
   * Acquire a lock
   * @param {string} lockName - Lock name
   * @param {object} options - Lock options
   * @returns {Promise<boolean>} True if lock acquired
   */
  async acquireLock(lockName, options = {}) {
    return this.lockManager.acquireLock(lockName, options);
  }

  /**
   * Release a lock
   * @param {string} lockName - Lock name
   * @returns {Promise<boolean>} True if lock released
   */
  async releaseLock(lockName) {
    return this.lockManager.releaseLock(lockName);
  }

  /**
   * Write a receipt
   * @param {string} hookId - Hook identifier
   * @param {object} result - Execution result
   * @param {object} metadata - Additional metadata
   */
  async writeReceipt(hookId, result, metadata = {}) {
    return this.receiptWriter.writeReceipt(hookId, result, metadata);
  }

  /**
   * Write metrics
   * @param {object} metrics - Metrics data
   */
  async writeMetrics(metrics) {
    return this.receiptWriter.writeMetrics(metrics);
  }

  /**
   * Write execution information
   * @param {string} executionId - Execution identifier
   * @param {object} execution - Execution data
   */
  async writeExecution(executionId, execution) {
    return this.receiptWriter.writeExecution(executionId, execution);
  }

  /**
   * Store a snapshot
   * @param {string} key - Cache key
   * @param {any} data - Data to store
   * @param {object} metadata - Additional metadata
   * @returns {Promise<string>} Content hash
   */
  async storeSnapshot(key, data, metadata = {}) {
    return this.snapshotStore.storeSnapshot(key, data, metadata);
  }

  /**
   * Get a snapshot
   * @param {string} key - Cache key
   * @param {string} contentHash - Content hash (optional)
   * @returns {Promise<any>} Stored data or null
   */
  async getSnapshot(key, contentHash = null) {
    return this.snapshotStore.getSnapshot(key, contentHash);
  }

  /**
   * Check if a snapshot exists
   * @param {string} key - Cache key
   * @param {string} contentHash - Content hash (optional)
   * @returns {Promise<boolean>} True if snapshot exists
   */
  async hasSnapshot(key, contentHash = null) {
    return this.snapshotStore.hasSnapshot(key, contentHash);
  }

  /**
   * Flush all pending receipts
   */
  async flushAll() {
    return this.receiptWriter.flushAll();
  }

  /**
   * Check if a lock is held
   * @param {string} lockName - Lock name
   * @returns {Promise<boolean>} True if lock is held
   */
  async isLocked(lockName) {
    return this.lockManager.isLocked(lockName);
  }

  /**
   * List all snapshots
   * @returns {Promise<Array>} Array of snapshot information
   */
  async listSnapshots() {
    return this.snapshotStore.listSnapshots();
  }

  /**
   * Get receipt statistics
   * @returns {Promise<object>} Receipt statistics
   */
  async getStatistics() {
    return this.receiptWriter.getStatistics();
  }

  /**
   * Get system status
   * @returns {Promise<object>} System status
   */
  async getStatus() {
    const [locks, receipts, snapshots] = await Promise.all([
      this.lockManager.listLocks(),
      this.receiptWriter.getStatistics(),
      this.snapshotStore.getStatistics(),
    ]);

    return {
      queue: this.queueManager.getStatus(),
      locks,
      receipts,
      snapshots,
      workers: {
        total: this.workers.length,
        active: this.workerQueue.length,
        available: this.workers.length - this.workerQueue.length,
      },
    };
  }

  /**
   * Reconcile system state
   */
  async reconcile() {
    this.logger.info("Reconciling Git-Native I/O system...");

    await Promise.all([
      this.queueManager.reconcile(),
      this.lockManager.cleanupExpiredLocks(),
      this.receiptWriter.flushAll(),
      this.snapshotStore.cleanupCache(),
    ]);

    this.logger.info("Git-Native I/O system reconciled");
  }

  /**
   * Cleanup system resources
   */
  async cleanup() {
    this.logger.info("Cleaning up Git-Native I/O system...");

    // Flush all pending operations
    await this.receiptWriter.flushAll();

    // Clear completed jobs
    await this.queueManager.clearCompleted();

    // Cleanup cache
    await this.snapshotStore.cleanupCache();

    // Cleanup old receipts
    await this.receiptWriter.cleanupOldReceipts();

    this.logger.info("Git-Native I/O system cleaned up");
  }

  /**
   * Shutdown the system
   */
  async shutdown() {
    this.logger.info("Shutting down Git-Native I/O system...");

    this.isShuttingDown = true;

    // Flush all pending operations
    await this.receiptWriter.flushAll();

    // Terminate all workers
    for (const worker of this.workers) {
      worker.terminate();
    }

    this.logger.info("Git-Native I/O system shut down");
  }

  /**
   * Setup graceful shutdown
   * @private
   */
  _setupGracefulShutdown() {
    const shutdown = async () => {
      this.logger.info("Received shutdown signal, cleaning up...");
      await this.shutdown();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
    process.on("SIGUSR2", shutdown); // For nodemon
  }

  /**
   * Generate a unique job ID
   * @private
   */
  _generateJobId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
