import { Worker } from "worker_threads";
import { promises as fs } from "fs";
import { join, dirname } from "path";
import { randomUUID } from "crypto";
import { useLog } from "../composables/log.mjs";

/**
 * Worker pool with isolated thread execution using worker_threads.
 * Executes jobs in separate threads to avoid blocking the main thread.
 */
export class WorkerPool {
  /**
   * @param {{cwd?:string,logger?:Console,workers?:import("../types.js").WorkerConfig}} [options]
   */
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.logger = options.logger || useLog("WorkerPool");
    this.config = options.workers || {};

    // Configuration
    this.maxThreads = this.config.threads || 2;
    this.maxJobs = this.config.maxJobs || 10;
    this.timeout = this.config.timeout || 30000;

    // Worker management
    this._workers = new Map();
    this._availableWorkers = [];
    this._busyWorkers = new Set();
    this._jobQueue = [];
    this._activeJobs = 0;

    // Statistics
    this._stats = {
      total: 0,
      active: 0,
      available: 0,
    };

    this._initialized = false;
    this._shuttingDown = false;
  }

  /**
   * Initialize worker pool.
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this._initialized) return;

    this.logger.info("Initializing WorkerPool...");

    // Create worker script if it doesn't exist
    await this._ensureWorkerScript();

    // Initialize workers
    for (let i = 0; i < this.maxThreads; i++) {
      await this._createWorker();
    }

    this._initialized = true;
    this.logger.info(`WorkerPool initialized with ${this.maxThreads} workers`);
  }

  /**
   * Execute a job in a worker thread.
   * @template T
   * @param {() => Promise<T>} jobFunction
   * @param {{timeout?:number}} [options]
   * @returns {Promise<T>}
   */
  async executeJob(jobFunction, options = {}) {
    await this._ensureInitialized();

    if (this._shuttingDown) {
      throw new Error("WorkerPool is shutting down");
    }

    const jobId = randomUUID();
    const timeout = options.timeout || this.timeout;

    return new Promise((resolve, reject) => {
      // Check if we can execute immediately
      if (
        this._availableWorkers.length > 0 &&
        this._activeJobs < this.maxJobs
      ) {
        this._executeJobImmediate(jobId, jobFunction, timeout, resolve, reject);
      } else {
        // Queue the job
        this._jobQueue.push({
          jobId,
          jobFunction,
          timeout,
          resolve,
          reject,
        });
      }
    });
  }

  /**
   * Get worker pool status.
   * @returns {{total:number,active:number,available:number}}
   */
  getStatus() {
    this._stats.total = this._workers.size;
    this._stats.active = this._busyWorkers.size;
    this._stats.available = this._availableWorkers.length;

    return { ...this._stats };
  }

  /**
   * Shutdown worker pool.
   * @returns {Promise<void>}
   */
  async shutdown() {
    if (!this._initialized) return;

    this.logger.info("Shutting down WorkerPool...");
    this._shuttingDown = true;

    // Reject all queued jobs
    for (const job of this._jobQueue) {
      job.reject(new Error("WorkerPool is shutting down"));
    }
    this._jobQueue = [];

    // Terminate all workers
    const terminationPromises = Array.from(this._workers.values()).map(
      (worker) => {
        return new Promise((resolve) => {
          worker.terminate().then(resolve).catch(resolve);
        });
      }
    );

    await Promise.all(terminationPromises);

    this._workers.clear();
    this._availableWorkers = [];
    this._busyWorkers.clear();

    this._initialized = false;
    this._shuttingDown = false;
    this.logger.info("WorkerPool shutdown complete");
  }

  /**
   * Ensure the system is initialized.
   * @private
   * @returns {Promise<void>}
   */
  async _ensureInitialized() {
    if (!this._initialized) {
      await this.initialize();
    }
  }

  /**
   * Create a new worker.
   * @private
   * @returns {Promise<void>}
   */
  async _createWorker() {
    const workerId = randomUUID();
    const workerScript = join(this.cwd, ".gitvan", "worker-thread.mjs");

    const worker = new Worker(workerScript, {
      workerData: { workerId, cwd: this.cwd },
    });

    // Set up worker event handlers
    worker.on("message", (message) => {
      this._handleWorkerMessage(workerId, message);
    });

    worker.on("error", (error) => {
      this.logger.error(`Worker ${workerId} error: ${error.message}`);
      this._handleWorkerError(workerId, error);
    });

    worker.on("exit", (code) => {
      this.logger.warn(`Worker ${workerId} exited with code ${code}`);
      this._handleWorkerExit(workerId, code);
    });

    this._workers.set(workerId, worker);
    this._availableWorkers.push(workerId);

    this.logger.debug(`Created worker ${workerId}`);
  }

  /**
   * Execute job immediately with available worker.
   * @private
   * @param {string} jobId
   * @param {Function} jobFunction
   * @param {number} timeout
   * @param {Function} resolve
   * @param {Function} reject
   * @returns {void}
   */
  _executeJobImmediate(jobId, jobFunction, timeout, resolve, reject) {
    if (this._availableWorkers.length === 0) {
      reject(new Error("No available workers"));
      return;
    }

    const workerId = this._availableWorkers.shift();
    const worker = this._workers.get(workerId);

    if (!worker) {
      reject(new Error("Worker not found"));
      return;
    }

    this._busyWorkers.add(workerId);
    this._activeJobs++;

    // Set up timeout
    const timeoutHandle = setTimeout(() => {
      this.logger.warn(`Job ${jobId} timed out after ${timeout}ms`);
      this._freeWorker(workerId);
      reject(new Error(`Job timed out after ${timeout}ms`));
    }, timeout);

    // Set up job completion handler
    const jobHandler = (message) => {
      if (message.jobId === jobId) {
        clearTimeout(timeoutHandle);
        this._freeWorker(workerId);

        if (message.success) {
          resolve(message.result);
        } else {
          reject(new Error(message.error));
        }
      }
    };

    // Listen for job completion
    worker.once("message", jobHandler);

    // Send job to worker
    worker.postMessage({
      jobId,
      jobFunction: jobFunction.toString(),
      timeout,
    });
  }

  /**
   * Handle worker message.
   * @private
   * @param {string} workerId
   * @param {any} message
   * @returns {void}
   */
  _handleWorkerMessage(workerId, message) {
    // Messages are handled by individual job handlers
    // This is just for logging
    this.logger.debug(`Worker ${workerId} message: ${JSON.stringify(message)}`);
  }

  /**
   * Handle worker error.
   * @private
   * @param {string} workerId
   * @param {Error} error
   * @returns {void}
   */
  _handleWorkerError(workerId, error) {
    this._freeWorker(workerId);

    // Reject any pending jobs for this worker
    for (const job of this._jobQueue) {
      if (job.workerId === workerId) {
        job.reject(error);
      }
    }

    // Remove from queue
    this._jobQueue = this._jobQueue.filter((job) => job.workerId !== workerId);
  }

  /**
   * Handle worker exit.
   * @private
   * @param {string} workerId
   * @param {number} code
   * @returns {void}
   */
  _handleWorkerExit(workerId, code) {
    this._freeWorker(workerId);

    // Remove worker from pool
    this._workers.delete(workerId);

    // Create replacement worker if not shutting down
    if (!this._shuttingDown) {
      this._createWorker().catch((error) => {
        this.logger.error(
          `Failed to create replacement worker: ${error.message}`
        );
      });
    }
  }

  /**
   * Free a worker and process queued jobs.
   * @private
   * @param {string} workerId
   * @returns {void}
   */
  _freeWorker(workerId) {
    this._busyWorkers.delete(workerId);
    this._activeJobs--;

    // Add back to available workers
    if (!this._availableWorkers.includes(workerId)) {
      this._availableWorkers.push(workerId);
    }

    // Process queued jobs
    this._processJobQueue();
  }

  /**
   * Process queued jobs.
   * @private
   * @returns {void}
   */
  _processJobQueue() {
    while (
      this._jobQueue.length > 0 &&
      this._availableWorkers.length > 0 &&
      this._activeJobs < this.maxJobs
    ) {
      const job = this._jobQueue.shift();
      this._executeJobImmediate(
        job.jobId,
        job.jobFunction,
        job.timeout,
        job.resolve,
        job.reject
      );
    }
  }

  /**
   * Ensure worker script exists.
   * @private
   * @returns {Promise<void>}
   */
  async _ensureWorkerScript() {
    const workerScriptPath = join(this.cwd, ".gitvan", "worker-thread.mjs");

    try {
      await fs.access(workerScriptPath);
      return; // Script already exists
    } catch (error) {
      // Script doesn't exist, create it
      await this._createWorkerScript(workerScriptPath);
    }
  }

  /**
   * Create worker script.
   * @private
   * @param {string} scriptPath
   * @returns {Promise<void>}
   */
  async _createWorkerScript(scriptPath) {
    const workerScript = `import { parentPort, workerData } from 'worker_threads';

// Worker thread entrypoint for GitNativeIO
// Executes jobs in isolation without blocking the main thread

parentPort.on('message', async (message) => {
  const { jobId, jobFunction, timeout } = message;
  
  try {
    // Create the job function from string with proper scoping
    const fn = new Function('return (' + jobFunction + ')')();
    
    // Execute the job with timeout
    const result = await Promise.race([
      fn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Job timeout')), timeout)
      )
    ]);
    
    // Send success result
    parentPort.postMessage({
      jobId,
      success: true,
      result
    });
    
  } catch (error) {
    // Send error result
    parentPort.postMessage({
      jobId,
      success: false,
      error: error.message
    });
  }
});

// Handle worker termination
process.on('SIGTERM', () => {
  process.exit(0);
});

process.on('SIGINT', () => {
  process.exit(0);
});
`;

    await fs.mkdir(dirname(scriptPath), { recursive: true });
    await fs.writeFile(scriptPath, workerScript);

    this.logger.debug(`Created worker script: ${scriptPath}`);
  }
}
