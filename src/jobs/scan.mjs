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
 * Get job by ID
 * @param {string} jobId - Job ID to find
 * @param {object} options - Scan options
 * @returns {Promise<object|null>} Job definition or null
 */
export async function getJobById(jobId, options = {}) {
  const jobs = await scanJobs(options);
  return jobs.find((job) => job.id === jobId) || null;
}

/**
 * Validate jobs
 * @param {Array} jobs - Array of job definitions
 * @returns {object} Validation result
 */
export function validateJobs(jobs) {
  const errors = [];

  for (const job of jobs) {
    if (!job.id) {
      errors.push({ job, error: "Missing job ID" });
    }
    if (!job.hasRun && job.definition && typeof job.definition.run !== "function") {
      errors.push({ job, error: "Missing or invalid run function" });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    count: jobs.length,
  };
}

/**
 * Get job statistics
 * @param {Array|object} jobsOrOptions - Array of jobs or scan options
 * @returns {Promise<object>|object} Job statistics
 */
export function getJobStats(jobsOrOptions) {
  // Support both direct jobs array and options object
  let jobs;

  // If it's an array, use it directly (synchronous mode)
  if (Array.isArray(jobsOrOptions)) {
    jobs = jobsOrOptions;

    // Count jobs by mode
    const byMode = {
      "on-demand": 0,
      "cron": 0,
      "event": 0,
    };

    for (const job of jobs) {
      if (job.mode) {
        byMode[job.mode] = (byMode[job.mode] || 0) + 1;
      } else if (job.cron) {
        byMode.cron++;
      } else if (job.definition?.on) {
        byMode.event++;
      } else {
        byMode["on-demand"]++;
      }
    }

    return {
      total: jobs.length,
      byMode,
      withCron: jobs.filter((j) => j.cron).length,
      withMeta: jobs.filter((j) => j.meta && Object.keys(j.meta).length > 0).length,
      valid: jobs.filter((j) => j.hasRun).length,
      invalid: jobs.filter((j) => !j.hasRun).length,
    };
  }

  // Otherwise, async scan and return Promise
  return scanJobs(jobsOrOptions).then((scannedJobs) => {
    const byMode = {
      "on-demand": 0,
      "cron": 0,
      "event": 0,
    };

    for (const job of scannedJobs) {
      if (job.mode) {
        byMode[job.mode] = (byMode[job.mode] || 0) + 1;
      } else if (job.cron) {
        byMode.cron++;
      } else if (job.definition?.on) {
        byMode.event++;
      } else {
        byMode["on-demand"]++;
      }
    }

    return {
      total: scannedJobs.length,
      byMode,
      withCron: scannedJobs.filter((j) => j.cron).length,
      withMeta: scannedJobs.filter((j) => j.meta && Object.keys(j.meta).length > 0).length,
      valid: scannedJobs.filter((j) => j.hasRun).length,
      invalid: scannedJobs.filter((j) => !j.hasRun).length,
    };
  });
}
