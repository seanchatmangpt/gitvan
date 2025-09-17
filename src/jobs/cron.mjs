/**
 * GitVan v2 Cron Scheduler - Cron job execution system
 * Provides cron-based job scheduling and execution
 */

import { discoverJobs, loadJobDefinition } from "../runtime/jobs.mjs";
import { runJobWithContext } from "../runtime/boot.mjs";
import { writeReceipt } from "../runtime/receipt.mjs";
import { createLogger } from "../utils/logger.mjs";
import { join } from "pathe";

const logger = createLogger("cron-scheduler");

/**
 * Start the cron scheduler
 * @param {object} config - GitVan configuration
 * @returns {Promise<void>}
 */
export async function startCronScheduler(config = {}) {
  const {
    rootDir = process.cwd(),
    cron = {
      enabled: true,
      interval: 60000, // 1 minute
      timezone: "UTC"
    }
  } = config;

  if (!cron.enabled) {
    logger.info("Cron scheduler disabled");
    return;
  }

  logger.info(`Starting cron scheduler (interval: ${cron.interval}ms)`);

  // Discover all jobs with cron schedules
  const jobsDir = join(rootDir, "jobs");
  const allJobs = discoverJobs(jobsDir);
  const cronJobs = [];

  for (const jobInfo of allJobs) {
    try {
      const jobDef = await loadJobDefinition(jobInfo.file);
      if (jobDef && jobDef.cron) {
        cronJobs.push({
          ...jobInfo,
          definition: jobDef,
          cron: jobDef.cron,
          lastRun: null,
          nextRun: calculateNextRun(jobDef.cron)
        });
      }
    } catch (error) {
      logger.warn(`Failed to load job ${jobInfo.id}:`, error.message);
    }
  }

  logger.info(`Found ${cronJobs.length} cron jobs`);

  if (cronJobs.length === 0) {
    logger.info("No cron jobs found, scheduler will not start");
    return;
  }

  // Start the scheduler loop
  return runCronLoop(cronJobs, config);
}

/**
 * Run the main cron loop
 * @param {Array} cronJobs - Array of cron job definitions
 * @param {object} config - Configuration
 * @returns {Promise<void>}
 */
async function runCronLoop(cronJobs, config) {
  const { cron = { interval: 60000 } } = config;

  logger.info("Cron scheduler started");

  while (true) {
    try {
      const now = new Date();
      
      for (const job of cronJobs) {
        if (shouldRunJob(job, now)) {
          await executeCronJob(job, config);
          job.lastRun = now;
          job.nextRun = calculateNextRun(job.cron, now);
        }
      }

      await sleep(cron.interval);
    } catch (error) {
      logger.error("Error in cron loop:", error.message);
      await sleep(5000); // Wait 5 seconds on error
    }
  }
}

/**
 * Check if a job should run at the given time
 * @param {object} job - Job definition with cron info
 * @param {Date} now - Current time
 * @returns {boolean} True if job should run
 */
function shouldRunJob(job, now) {
  // Simple cron matching - in production would use proper cron parser
  const cronParts = job.cron.trim().split(/\s+/);
  if (cronParts.length !== 5) return false;

  const [minute, hour, day, month, weekday] = cronParts;
  
  // Get current time components
  const currentMinute = now.getMinutes();
  const currentHour = now.getHours();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth() + 1; // 0-based to 1-based
  const currentWeekday = now.getDay();

  // Simple pattern matching
  if (minute === "*" && hour === "*") return true; // Every minute
  if (minute === "0" && hour === "*") return true; // Every hour
  if (minute === "0" && hour === "0") return true; // Daily at midnight
  
  // Check specific times
  if (minute !== "*" && parseInt(minute) !== currentMinute) return false;
  if (hour !== "*" && parseInt(hour) !== currentHour) return false;
  if (day !== "*" && parseInt(day) !== currentDay) return false;
  if (month !== "*" && parseInt(month) !== currentMonth) return false;
  if (weekday !== "*" && parseInt(weekday) !== currentWeekday) return false;

  return true;
}

/**
 * Execute a cron job
 * @param {object} job - Job definition
 * @param {object} config - Configuration
 * @returns {Promise<void>}
 */
async function executeCronJob(job, config) {
  const { rootDir = process.cwd() } = config;
  
  logger.info(`Executing cron job: ${job.id}`);

  try {
    const ctx = {
      root: rootDir,
      env: process.env,
      now: () => new Date().toISOString(),
      cron: {
        schedule: job.cron,
        lastRun: job.lastRun,
        nextRun: job.nextRun
      }
    };

    const startTime = Date.now();
    const result = await runJobWithContext(ctx, job.definition);
    const duration = Date.now() - startTime;

    // Write receipt
    writeReceipt({
      id: `cron-${job.id}`,
      status: "success",
      commit: "HEAD",
      action: "cron",
      result: {
        ...result,
        duration
      },
      meta: {
        cron: job.cron,
        scheduled: true
      }
    });

    logger.info(`Cron job ${job.id} completed successfully`);
  } catch (error) {
    logger.error(`Cron job ${job.id} failed:`, error.message);
    
    // Write failure receipt
    writeReceipt({
      id: `cron-${job.id}`,
      status: "error",
      commit: "HEAD",
      action: "cron",
      result: {
        error: error.message,
        duration: Date.now() - Date.now()
      },
      meta: {
        cron: job.cron,
        scheduled: true
      }
    });
  }
}

/**
 * Calculate next run time for a cron expression
 * @param {string} cron - Cron expression
 * @param {Date} from - Starting time (defaults to now)
 * @returns {Date} Next run time
 */
function calculateNextRun(cron, from = new Date()) {
  // Simplified calculation - in production would use proper cron parser
  const cronParts = cron.trim().split(/\s+/);
  if (cronParts.length !== 5) return new Date(from.getTime() + 60000);

  const [minute, hour, day, month, weekday] = cronParts;
  
  // Simple logic for common patterns
  if (minute === "*" && hour === "*") {
    return new Date(from.getTime() + 60000); // Next minute
  }
  
  if (minute === "0" && hour === "*") {
    return new Date(from.getTime() + 3600000); // Next hour
  }
  
  if (minute === "0" && hour === "0") {
    return new Date(from.getTime() + 86400000); // Next day
  }

  // Default to next minute for other patterns
  return new Date(from.getTime() + 60000);
}

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Scan jobs for cron schedules
 * @param {object} options - Scan options
 * @returns {Promise<Array>} Array of jobs with cron info
 */
export async function scanJobs(options = {}) {
  const { cwd = process.cwd() } = options;
  const jobsDir = join(cwd, "jobs");
  
  const allJobs = discoverJobs(jobsDir);
  const cronJobs = [];

  for (const jobInfo of allJobs) {
    try {
      const jobDef = await loadJobDefinition(jobInfo.file);
      if (jobDef && jobDef.cron) {
        cronJobs.push({
          ...jobInfo,
          cron: jobDef.cron,
          meta: jobDef.meta || {}
        });
      }
    } catch (error) {
      logger.warn(`Failed to scan job ${jobInfo.id}:`, error.message);
    }
  }

  return cronJobs;
}