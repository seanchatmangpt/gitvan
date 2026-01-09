/**
 * Test Utilities - Job Bridge Stubs
 * Provides mock JobBridge and Bree Scheduler for testing
 */

import { useLock } from '../../src/composables/lock.mjs';
import { sleep } from './helpers.mjs';

/**
 * Global state for job bridge resets
 */
let jobBridgeInstance = null;

/**
 * Mock JobBridge for testing
 */
export class JobBridge {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.lock = useLock();
    this.jobs = new Map();
    this.executions = [];
    this.shutdown = this._shutdown.bind(this);
  }

  /**
   * Execute a job with lock protection
   * @param {Object} jobDef - Job definition
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executeJobWithLock(jobDef, options = {}) {
    const lockName = `job-${jobDef.name || jobDef.id}`;
    const { force = false, payload = {} } = options;

    // Try to acquire lock
    if (!force) {
      const acquired = await this.lock.acquire(lockName, {
        ttl: jobDef.ttl || 300000
      });

      if (!acquired) {
        throw new Error(`Job ${lockName} is already running`);
      }
    }

    try {
      // Execute the job
      const startTime = Date.now();
      let result;

      try {
        // Parse and execute the run function
        const runFn = this._parseRunFunction(jobDef.runFunction);
        result = await runFn({ payload });

        const duration = Date.now() - startTime;
        this.executions.push({
          jobId: jobDef.id,
          status: 'success',
          result,
          duration,
          timestamp: new Date().toISOString()
        });

        return {
          ok: true,
          job: jobDef.id,
          result,
          duration
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        this.executions.push({
          jobId: jobDef.id,
          status: 'error',
          error: error.message,
          duration,
          timestamp: new Date().toISOString()
        });

        throw error;
      }
    } finally {
      // Always release lock
      if (!force) {
        await this.lock.release(lockName).catch(error => {
          console.warn(`Failed to release lock ${lockName}: ${error.message}`);
        });
      }
    }
  }

  /**
   * Parse run function string and execute it
   * @private
   * @param {string} runFunctionCode - JavaScript code as string
   * @returns {Function}
   */
  _parseRunFunction(runFunctionCode) {
    // Create a module with the function
    const module = { exports: {} };

    // Evaluate the code in module context
    try {
      eval(`(function(module, exports) { ${runFunctionCode} })`)(module, module.exports);
      const runFn = module.exports.default || module.exports;

      if (typeof runFn !== 'function') {
        throw new Error('Run function must export a default function');
      }

      return runFn;
    } catch (error) {
      throw new Error(`Failed to parse run function: ${error.message}`);
    }
  }

  /**
   * Get execution history
   * @returns {Array<Object>}
   */
  getExecutionHistory() {
    return [...this.executions];
  }

  /**
   * Clear execution history
   */
  clearExecutionHistory() {
    this.executions = [];
  }

  /**
   * Shutdown the job bridge
   * @private
   */
  async _shutdown() {
    // Clean up any remaining locks
    const locks = [];
    // In a real implementation, we would get all locks from lock manager
    for (const lockName of locks) {
      await this.lock.release(lockName).catch(() => {});
    }
  }
}

/**
 * Reset the job bridge instance
 * Used to clean up between tests
 */
export function resetJobBridge() {
  jobBridgeInstance = null;
}

/**
 * Get singleton JobBridge instance
 * @param {Object} options
 * @returns {JobBridge}
 */
export function getJobBridge(options = {}) {
  if (!jobBridgeInstance) {
    jobBridgeInstance = new JobBridge(options);
  }
  return jobBridgeInstance;
}

/**
 * Global state for Bree scheduler resets
 */
let breeSchedulerInstance = null;

/**
 * Mock Bree Scheduler for testing
 */
export class BreeScheduler {
  constructor(options = {}) {
    this.jobs = new Map();
    this.queue = [];
    this.workers = [];
    this.running = false;
  }

  /**
   * Start the scheduler
   */
  async start() {
    this.running = true;
  }

  /**
   * Stop the scheduler
   */
  async stop() {
    this.running = false;
  }

  /**
   * Add a job to schedule
   * @param {Object} jobDef - Job definition
   * @param {Object} schedule - Schedule options
   */
  addJob(jobDef, schedule = {}) {
    this.jobs.set(jobDef.id, { jobDef, schedule });
  }

  /**
   * Remove a job
   * @param {string} jobId
   */
  removeJob(jobId) {
    this.jobs.delete(jobId);
  }

  /**
   * Execute a job immediately
   * @param {string} jobId
   * @param {*} data
   */
  async executeJob(jobId, data) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    // Simulate job execution
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ jobId, data, executed: true });
      }, 10);
    });
  }

  /**
   * Get job queue
   */
  getQueue() {
    return [...this.queue];
  }

  /**
   * Get execution statistics
   */
  getStats() {
    return {
      totalJobs: this.jobs.size,
      queueLength: this.queue.length,
      workerCount: this.workers.length,
      isRunning: this.running
    };
  }
}

/**
 * Reset the Bree scheduler instance
 */
export function resetBreeScheduler() {
  breeSchedulerInstance = null;
}

/**
 * Get singleton Bree scheduler instance
 * @param {Object} options
 * @returns {BreeScheduler}
 */
export function getBreeScheduler(options = {}) {
  if (!breeSchedulerInstance) {
    breeSchedulerInstance = new BreeScheduler(options);
  }
  return breeSchedulerInstance;
}

/**
 * Reset all test infrastructure
 * Call this in beforeEach for isolation
 */
export async function resetTestInfrastructure() {
  resetJobBridge();
  resetBreeScheduler();
  // Allow async cleanup
  await sleep(0);
}
