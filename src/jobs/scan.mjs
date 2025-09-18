/**
 * GitVan v2 Job Scanner - Job discovery and scanning utilities
 * Provides functions for discovering and scanning jobs across the filesystem
 */

import { discoverJobs, loadJobDefinition } from "../runtime/jobs.mjs";
import { createLogger } from "../utils/logger.mjs";
import { join } from "pathe";

const logger = createLogger("job-scanner");

/**
 * Scan jobs in a directory
 * @param {object} options - Scan options
 * @returns {Promise<Array>} Array of job definitions
 */
export async function scanJobs(options = {}) {
  const { cwd = process.cwd() } = options;
  const jobsDir = join(cwd, "jobs");

  const allJobs = discoverJobs(jobsDir);
  const scannedJobs = [];

  for (const jobInfo of allJobs) {
    try {
      const jobDef = await loadJobDefinition(jobInfo.file);
      if (jobDef) {
        scannedJobs.push({
          ...jobInfo,
          definition: jobDef,
          cron: jobDef.cron,
          meta: jobDef.meta || {},
          hasRun: typeof jobDef.run === "function",
        });
      }
    } catch (error) {
      logger.warn(`Failed to scan job ${jobInfo.id}:`, error.message);
    }
  }

  return scannedJobs;
}

/**
 * Scan jobs with specific criteria
 * @param {object} options - Scan options
 * @param {object} criteria - Filter criteria
 * @returns {Promise<Array>} Filtered array of jobs
 */
export async function scanJobsWithCriteria(options = {}, criteria = {}) {
  const allJobs = await scanJobs(options);

  return allJobs.filter((job) => {
    if (criteria.cron && !job.cron) return false;
    if (criteria.hasRun && !job.hasRun) return false;
    if (criteria.meta && criteria.meta.key) {
      if (!job.meta || !job.meta[criteria.meta.key]) return false;
    }
    return true;
  });
}

/**
 * Get job statistics
 * @param {object} options - Scan options
 * @returns {Promise<object>} Job statistics
 */
export async function getJobStats(options = {}) {
  const jobs = await scanJobs(options);

  const stats = {
    total: jobs.length,
    withCron: jobs.filter((j) => j.cron).length,
    withMeta: jobs.filter((j) => j.meta && Object.keys(j.meta).length > 0)
      .length,
    valid: jobs.filter((j) => j.hasRun).length,
    invalid: jobs.filter((j) => !j.hasRun).length,
  };

  return stats;
}
