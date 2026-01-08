/**
 * GitVan - Job Execution Composable
 * Provides job execution and status tracking functionality
 */

import { withGitVan } from "../core/context.mjs";
import { createLogger } from "../utils/logger.mjs";

const logger = createLogger("composables:job-execution");

/**
 * Create job execution composable
 * @param {Object} base - Base context (cwd, env)
 * @param {Object} deps - Dependencies (git, receipt, lock, runner, discovery)
 * @returns {Object} Job execution methods
 */
export function createJobExecution(base, deps) {
  const { git, receipt, lock, runner, discovery } = deps;

  return {
    /**
     * Run a job
     * @param {string} jobId - Job ID
     * @param {Object} options - Execution options
     * @returns {Promise<Object>} Execution result
     */
    async run(jobId, options = {}) {
      const { payload = {}, context = {} } = options;

      try {
        const job = await discovery.get(jobId);
        if (!job.definition) {
          throw new Error(`Job definition not found: ${jobId}`);
        }

        // Combine discovery metadata with loaded definition
        // This ensures we have both the file path AND the job exports
        const fullJobDef = {
          ...job.definition,
          id: job.id,
          name: job.name,
          file: job.file, // File path (critical for execution)
        };

        // Create execution context
        const execContext = {
          ...context,
          cwd: base.cwd,
          env: base.env,
          git: await git.info(),
        };

        // Run the job with proper context
        const result = await withGitVan(execContext, async () => {
          return await runner.runJob(fullJobDef, {
            payload,
            context: execContext,
          });
        });

        return result;
      } catch (error) {
        throw new Error(`Failed to run job ${jobId}: ${error.message}`);
      }
    },

    /**
     * Run a job with distributed lock
     * @param {string} jobId - Job ID
     * @param {Object} options - Execution options
     * @returns {Promise<Object>} Execution result
     */
    async runWithLock(jobId, options = {}) {
      const { payload = {}, lockOptions = {} } = options;
      const lockName = `job-${jobId}`;

      try {
        // Acquire lock
        const acquired = await lock.acquire(lockName, lockOptions);
        if (!acquired) {
          throw new Error(`Job ${jobId} is already running`);
        }

        try {
          // Run job
          const result = await this.run(jobId, { payload });
          return result;
        } finally {
          // Always release lock
          await lock.release(lockName);
        }
      } catch (error) {
        throw new Error(
          `Failed to run job ${jobId} with lock: ${error.message}`
        );
      }
    },

    /**
     * Get job status
     * @param {string} jobId - Job ID
     * @returns {Promise<Object>} Job status
     */
    async status(jobId) {
      try {
        const lockName = `job-${jobId}`;
        const isRunning = await lock.isLocked(lockName);

        const receipts = await receipt.list({ jobId });
        const lastReceipt = receipts.length > 0 ? receipts[0] : null;

        return {
          id: jobId,
          isRunning,
          lastRun: lastReceipt?.timestamp || null,
          lastStatus: lastReceipt?.status || null,
          totalRuns: receipts.length,
          successRate:
            receipts.length > 0
              ? Math.round(
                  (receipts.filter((r) => r.status === "success").length /
                    receipts.length) *
                    100
                )
              : 0,
        };
      } catch (error) {
        throw new Error(
          `Failed to get job status for ${jobId}: ${error.message}`
        );
      }
    },

    /**
     * Check if a job is running
     * @param {string} jobId - Job ID
     * @returns {Promise<boolean>} True if job is running
     */
    async isRunning(jobId) {
      try {
        const lockName = `job-${jobId}`;
        return await lock.isLocked(lockName);
      } catch (error) {
        return false;
      }
    },

    /**
     * Get job execution history
     * @param {string} jobId - Job ID
     * @param {Object} options - History options
     * @returns {Promise<Array>} Execution history
     */
    async history(jobId, options = {}) {
      const { limit = 50, status = null } = options;

      try {
        const receipts = await receipt.list({ jobId });

        let filtered = receipts;
        if (status) {
          filtered = receipts.filter((r) => r.status === status);
        }

        return filtered.slice(0, limit);
      } catch (error) {
        throw new Error(
          `Failed to get job history for ${jobId}: ${error.message}`
        );
      }
    },
  };
}
