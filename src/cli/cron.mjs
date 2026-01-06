/**
 * GitVan v2 Cron CLI - Cron job management commands
 * Provides commands for listing, starting, and managing cron jobs
 */

import { startCronScheduler, scanJobs } from "../jobs/cron.mjs";
import { loadConfig } from "../runtime/config.mjs";
import { createLogger } from "../utils/logger.mjs";

const logger = createLogger("cron-cli");

/**
 * Cron CLI command handler
 * @param {string} subcommand - Subcommand (list, start, dry-run)
 * @param {object} args - Command arguments
 * @returns {Promise<void>}
 */
export async function cronCommand(subcommand = "list", args = {}) {
  const config = await loadConfig();

  switch (subcommand) {
    case "list":
      return await listCronJobs(config);

    case "start":
      return await startCronScheduler(config);

    case "dry-run":
      return await dryRunCronJobs(config, args.at);

    case "status":
      return await cronStatus(config);

    default:
      throw new Error(`Unknown cron subcommand: ${subcommand}`);
  }
}

/**
 * List all cron jobs
 * @param {object} config - GitVan config
 * @returns {Promise<void>}
 */
async function listCronJobs(config) {
  try {
    const jobs = await scanJobs({ cwd: config.rootDir || process.cwd() });
    const cronJobs = jobs.filter((job) => job.cron);

    if (cronJobs.length === 0) {
      logger.info("No cron jobs found");
      return;
    }

    logger.info(`Found ${cronJobs.length} cron job(s):`);
    logger.info();

    for (const job of cronJobs) {
      logger.info(`📅 ${job.id || job.name}`);
      logger.info(`   Cron: ${job.cron}`);
      logger.info(`   File: ${job.relativePath}`);
      if (job.meta?.desc) {
        logger.info(`   Desc: ${job.meta.desc}`);
      }
      logger.info();
    }
  } catch (error) {
    logger.error("Failed to list cron jobs:", error.message);
    throw error;
  }
}

/**
 * Dry run cron jobs for a specific time
 * @param {object} config - GitVan config
 * @param {string} at - Time to check (ISO string)
 * @returns {Promise<void>}
 */
async function dryRunCronJobs(config, at) {
  try {
    const jobs = await scanJobs({ cwd: config.rootDir || process.cwd() });
    const cronJobs = jobs.filter((job) => job.cron);
    const checkTime = at ? new Date(at) : new Date();

    logger.info(`Dry run for ${checkTime.toISOString()}:`);
    logger.info();

    const matchingJobs = [];

    for (const job of cronJobs) {
      // Simple cron matching logic (would need proper cron parser in production)
      if (shouldRunAtTime(job.cron, checkTime)) {
        matchingJobs.push(job);
      }
    }

    if (matchingJobs.length === 0) {
      logger.info("No jobs would run at this time");
      return;
    }

    logger.info(`Jobs that would run:`);
    for (const job of matchingJobs) {
      logger.info(`  - ${job.id || job.name} (${job.cron})`);
    }
  } catch (error) {
    logger.error("Failed to dry run cron jobs:", error.message);
    throw error;
  }
}

/**
 * Check if cron job should run at given time
 * @param {string} cron - Cron expression
 * @param {Date} time - Time to check
 * @returns {boolean} True if should run
 */
function shouldRunAtTime(cron, time) {
  // Simplified cron matching - in production would use proper cron parser
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const [min, hour, day, month, weekday] = parts;

  // Simple patterns
  if (min === "*" && hour === "*") return true; // Every minute
  if (min === "0" && hour === "*") return true; // Every hour
  if (min === "0" && hour === "0") return true; // Daily

  return false;
}

/**
 * Get cron scheduler status
 * @param {object} config - GitVan config
 * @returns {Promise<void>}
 */
async function cronStatus(config) {
  logger.info("Cron scheduler status:");
  logger.info("  Status: Not implemented in this version");
  logger.info("  Config: ", JSON.stringify(config.jobs, null, 2));
}
