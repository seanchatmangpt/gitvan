// src/git-native/QueueManager.mjs
// Git-Native Queue Management with p-queue and Git refs

import PQueue from "p-queue";
import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { randomBytes } from "node:crypto";

/**
 * Git-Native Queue Manager
 * Manages priority queues using Git refs and file-backed queues
 */
export class QueueManager {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.logger = options.logger || console;

    // Queue configuration
    this.config = {
      concurrency: 256, // Conservative, smooth processing
      interval: 50, // Queue processing interval (ms)
      intervalCap: 32, // Operations per interval
      ...options.queue,
    };

    // Paths configuration
    this.paths = {
      tmp: ".gitvan/tmp",
      queue: ".gitvan/queue",
      cache: ".gitvan/cache",
      artifacts: ".gitvan/artifacts",
      notesRef: "refs/notes/gitvan/results",
      locksRef: "refs/gitvan/locks",
      execRef: "refs/gitvan/executions",
      ...options.paths,
    };

    // Initialize priority queues
    this.queues = {
      high: new PQueue({
        concurrency: this.config.concurrency,
        interval: this.config.interval,
        intervalCap: this.config.intervalCap,
        priority: 1,
      }),
      medium: new PQueue({
        concurrency: this.config.concurrency,
        interval: this.config.interval,
        intervalCap: this.config.intervalCap,
        priority: 2,
      }),
      low: new PQueue({
        concurrency: this.config.concurrency,
        interval: this.config.interval,
        intervalCap: this.config.intervalCap,
        priority: 3,
      }),
    };

    // Initialize Git refs for mailbox queues
    this.mailboxRefs = {
      high: "refs/gitvan/queue/hi",
      medium: "refs/gitvan/queue/med",
      low: "refs/gitvan/queue/lo",
    };

    // File queue paths
    this.fileQueuePaths = {
      high: join(this.cwd, this.paths.queue, "hi"),
      medium: join(this.cwd, this.paths.queue, "med"),
      low: join(this.cwd, this.paths.queue, "lo"),
    };

    // Initialize directories
    this._initializeDirectories();
  }

  /**
   * Initialize required directories
   * @private
   */
  async _initializeDirectories() {
    const dirs = [
      this.paths.tmp,
      this.paths.queue,
      this.paths.cache,
      this.paths.artifacts,
      ...Object.values(this.fileQueuePaths),
    ];

    for (const dir of dirs) {
      const fullPath = join(this.cwd, dir);
      try {
        await fs.mkdir(fullPath, { recursive: true });
        this.logger.debug(`Created directory: ${fullPath}`);
      } catch (error) {
        this.logger.warn(`Failed to create directory ${dir}: ${error.message}`);
      }
    }
  }

  /**
   * Add a job to the queue
   * @param {string} priority - 'high', 'medium', or 'low'
   * @param {Function} job - The job function to execute
   * @param {object} metadata - Job metadata
   * @returns {Promise} Job execution promise
   */
  async addJob(priority, job, metadata = {}) {
    const queue = this.queues[priority];
    if (!queue) {
      throw new Error(
        `Invalid priority: ${priority}. Must be 'high', 'medium', or 'low'`
      );
    }

    const jobId = this._generateJobId();
    const jobData = {
      id: jobId,
      priority,
      metadata,
      timestamp: Date.now(),
      status: "queued",
    };

    // Write to file queue for persistence
    await this._writeToFileQueue(priority, jobId, jobData);

    // Write to Git ref for mailbox
    await this._writeToMailboxRef(priority, jobId, jobData);

    // Add to priority queue
    return queue.add(
      async () => {
        try {
          jobData.status = "running";
          jobData.startedAt = Date.now();

          const result = await job();

          jobData.status = "completed";
          jobData.completedAt = Date.now();
          jobData.result = result;

          // Update file queue
          await this._updateFileQueue(priority, jobId, jobData);

          return result;
        } catch (error) {
          jobData.status = "failed";
          jobData.completedAt = Date.now();
          jobData.error = error.message;

          // Update file queue
          await this._updateFileQueue(priority, jobId, jobData);

          throw error;
        }
      },
      { priority: this._getPriorityValue(priority) }
    );
  }

  /**
   * Write job to file queue
   * @private
   */
  async _writeToFileQueue(priority, jobId, jobData) {
    const queuePath = this.fileQueuePaths[priority];

    // Ensure the queue directory exists
    try {
      await fs.mkdir(queuePath, { recursive: true });
    } catch (error) {
      this.logger.warn(
        `Failed to create queue directory ${queuePath}: ${error.message}`
      );
    }

    const fileName = `${Date.now()}_${jobId}.json`;
    const filePath = join(queuePath, fileName);

    // Atomic write: write to temp file then rename
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(jobData, null, 2));
    await fs.rename(tempPath, filePath);
  }

  /**
   * Update job in file queue
   * @private
   */
  async _updateFileQueue(priority, jobId, jobData) {
    const queuePath = this.fileQueuePaths[priority];

    try {
      const files = await fs.readdir(queuePath);
      const jobFile = files.find((file) => file.includes(jobId));

      if (jobFile) {
        const filePath = join(queuePath, jobFile);
        const tempPath = `${filePath}.tmp`;

        await fs.writeFile(tempPath, JSON.stringify(jobData, null, 2));
        await fs.rename(tempPath, filePath);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to update file queue for job ${jobId}: ${error.message}`
      );
    }
  }

  /**
   * Write job to Git mailbox ref
   * @private
   */
  async _writeToMailboxRef(priority, jobId, jobData) {
    const refName = `${this.mailboxRefs[priority]}/${jobId}`;

    try {
      // Create a Git ref pointing to the current HEAD
      execSync(`git update-ref ${refName} HEAD`, {
        cwd: this.cwd,
        stdio: "pipe",
      });

      // Add job metadata as a Git note
      const noteContent = JSON.stringify(jobData);
      execSync(`git notes add -f -m "${noteContent}" ${refName}`, {
        cwd: this.cwd,
        stdio: "pipe",
      });
    } catch (error) {
      this.logger.warn(
        `Failed to write to mailbox ref ${refName}: ${error.message}`
      );
    }
  }

  /**
   * Generate a unique job ID
   * @private
   */
  _generateJobId() {
    return randomBytes(8).toString("hex");
  }

  /**
   * Get priority value for p-queue
   * @private
   */
  _getPriorityValue(priority) {
    const values = { high: 1, medium: 2, low: 3 };
    return values[priority] || 3;
  }

  /**
   * Get queue status
   * @returns {object} Queue status information
   */
  getStatus() {
    const status = {};

    for (const [priority, queue] of Object.entries(this.queues)) {
      status[priority] = {
        pending: queue.pending,
        size: queue.size,
        isPaused: queue.isPaused,
        concurrency: queue.concurrency,
      };
    }

    return status;
  }

  /**
   * Pause all queues
   */
  pauseAll() {
    for (const queue of Object.values(this.queues)) {
      queue.pause();
    }
  }

  /**
   * Resume all queues
   */
  resumeAll() {
    for (const queue of Object.values(this.queues)) {
      queue.start();
    }
  }

  /**
   * Clear completed jobs from file queues
   */
  async clearCompleted() {
    for (const priority of Object.keys(this.fileQueuePaths)) {
      const queuePath = this.fileQueuePaths[priority];

      try {
        const files = await fs.readdir(queuePath);

        for (const file of files) {
          if (file.endsWith(".json")) {
            const filePath = join(queuePath, file);
            const content = await fs.readFile(filePath, "utf8");
            const jobData = JSON.parse(content);

            if (jobData.status === "completed" || jobData.status === "failed") {
              await fs.unlink(filePath);
            }
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to clear completed jobs in ${priority} queue: ${error.message}`
        );
      }
    }
  }

  /**
   * Reconcile queue state on startup
   * Scans file queues and recovers any incomplete jobs
   */
  async reconcile() {
    this.logger.info("Reconciling queue state...");

    for (const priority of Object.keys(this.fileQueuePaths)) {
      const queuePath = this.fileQueuePaths[priority];

      try {
        const files = await fs.readdir(queuePath);
        let recovered = 0;

        for (const file of files) {
          if (file.endsWith(".json")) {
            const filePath = join(queuePath, file);
            const content = await fs.readFile(filePath, "utf8");
            const jobData = JSON.parse(content);

            // Recover running jobs that may have been interrupted
            if (jobData.status === "running") {
              jobData.status = "queued";
              jobData.recovered = true;
              jobData.recoveredAt = Date.now();

              await this._updateFileQueue(priority, jobData.id, jobData);
              recovered++;
            }
          }
        }

        if (recovered > 0) {
          this.logger.info(
            `Recovered ${recovered} jobs from ${priority} queue`
          );
        }
      } catch (error) {
        this.logger.warn(
          `Failed to reconcile ${priority} queue: ${error.message}`
        );
      }
    }
  }
}
