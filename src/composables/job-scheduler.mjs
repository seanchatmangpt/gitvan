/**
 * GitVan - Job Scheduler Composable
 * Provides Bree scheduler management functionality
 */

import { createLogger } from "../utils/logger.mjs";

const logger = createLogger("composables:job-scheduler");

/**
 * Create job scheduler composable
 * @param {Object} deps - Dependencies (jobBridge, discovery)
 * @returns {Object} Job scheduler methods
 */
export function createJobScheduler(deps) {
  const { jobBridge, discovery } = deps;

  return {
    /**
     * Schedule a job with Bree
     * @param {string} jobId - Job ID
     * @param {Object} options - Schedule options
     * @returns {Promise<Object>} Schedule result
     */
    async schedule(jobId, options = {}) {
      try {
        const job = await discovery.get(jobId);
        if (!job.definition) {
          throw new Error(`Job definition not found: ${jobId}`);
        }

        // Combine discovery metadata with loaded definition
        // This ensures we have both the file path AND the job exports (meta, cron, etc.)
        const fullJobDef = {
          ...job.definition, // Exports from job module (meta, cron, run, etc.)
          id: job.id,        // Job ID
          name: job.name,    // Job name
          file: job.file,    // File path (critical for execution)
        };

        await jobBridge.scheduleJob(fullJobDef, options);
        logger.info(`Job scheduled: ${jobId}`);

        return { jobId, scheduled: true };
      } catch (error) {
        throw new Error(`Failed to schedule job ${jobId}: ${error.message}`);
      }
    },

    /**
     * Unschedule a job
     * @param {string} jobId - Job ID
     * @returns {Promise<Object>} Unschedule result
     */
    async unschedule(jobId) {
      try {
        await jobBridge.unscheduleJob(jobId);
        logger.info(`Job unscheduled: ${jobId}`);

        return { jobId, unscheduled: true };
      } catch (error) {
        throw new Error(`Failed to unschedule job ${jobId}: ${error.message}`);
      }
    },

    /**
     * Start the scheduler
     * @returns {Promise<Object>} Start result
     */
    async startScheduler() {
      try {
        await jobBridge.start();
        logger.info("Job scheduler started");

        return { started: true };
      } catch (error) {
        throw new Error(`Failed to start scheduler: ${error.message}`);
      }
    },

    /**
     * Stop the scheduler
     * @returns {Promise<Object>} Stop result
     */
    async stopScheduler() {
      try {
        await jobBridge.stop();
        logger.info("Job scheduler stopped");

        return { stopped: true };
      } catch (error) {
        throw new Error(`Failed to stop scheduler: ${error.message}`);
      }
    },

    /**
     * Get scheduler status
     * @returns {Object} Scheduler status
     */
    getSchedulerStatus() {
      try {
        return jobBridge.getStatus();
      } catch (error) {
        throw new Error(`Failed to get scheduler status: ${error.message}`);
      }
    },

    /**
     * List scheduled jobs
     * @returns {Array} Scheduled jobs
     */
    listScheduledJobs() {
      try {
        const status = jobBridge.getStatus();
        return status.jobs || [];
      } catch (error) {
        throw new Error(`Failed to list scheduled jobs: ${error.message}`);
      }
    },

    /**
     * Run a job with Bree (for scheduled execution)
     * @param {string} jobId - Job ID
     * @param {Object} options - Execution options
     * @returns {Promise<Object>} Execution result
     */
    async runWithBree(jobId, options = {}) {
      try {
        const job = await discovery.get(jobId);
        if (!job.definition) {
          throw new Error(`Job definition not found: ${jobId}`);
        }

        // Combine discovery metadata with loaded definition
        // This ensures we have both the file path AND the job exports (meta, cron, etc.)
        const fullJobDef = {
          ...job.definition, // Exports from job module
          id: job.id,        // Job ID
          name: job.name,    // Job name
          file: job.file,    // File path (critical for execution)
        };

        const result = await jobBridge.executeJobWithLock(
          fullJobDef,
          options
        );

        return result;
      } catch (error) {
        throw new Error(
          `Failed to run job with Bree ${jobId}: ${error.message}`
        );
      }
    },

    /**
     * Auto-schedule all cron jobs
     * @returns {Promise<Array>} Schedule results
     */
    async autoScheduleCronJobs() {
      try {
        const cronJobs = await discovery.getCronJobs();
        const results = [];

        for (const job of cronJobs) {
          try {
            await this.schedule(job.id, { cron: job.cron });
            results.push({ jobId: job.id, scheduled: true });
            logger.info(`Auto-scheduled cron job: ${job.id}`);
          } catch (error) {
            results.push({
              jobId: job.id,
              scheduled: false,
              error: error.message,
            });
            logger.warn(`Failed to auto-schedule ${job.id}:`, error.message);
          }
        }

        return results;
      } catch (error) {
        throw new Error(`Failed to auto-schedule cron jobs: ${error.message}`);
      }
    },

    /**
     * Shutdown scheduler gracefully
     * @returns {Promise<Object>} Shutdown result
     */
    async shutdownScheduler() {
      try {
        await jobBridge.shutdown();
        logger.info("Job scheduler shut down");

        return { shutdown: true };
      } catch (error) {
        throw new Error(`Failed to shutdown scheduler: ${error.message}`);
      }
    },
  };
}
