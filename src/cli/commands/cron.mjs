/**
 * GitVan Cron Command - Citty Implementation
 *
 * Proper Citty-based implementation of cron job management commands
 */

import { defineCommand } from "citty";
import { startCronScheduler, scanJobs } from "../../jobs/cron.mjs";
import { loadConfig } from "../../runtime/config.mjs";
import { createLogger } from "../../utils/logger.mjs";
import consola from "consola";
import cron from "node-cron";

const logger = createLogger("cron-cli");

/**
 * List cron jobs subcommand
 */
const listSubcommand = defineCommand({
  meta: {
    name: "list",
    description: "List all cron jobs",
  },
  args: {
    verbose: {
      type: "boolean",
      description: "Show verbose output",
      default: false,
    },
    "show-schedule": {
      type: "boolean",
      description: "Show next execution times",
      default: false,
    },
  },
  async run({ args }) {
    try {
      const config = await loadConfig();
      const jobs = await scanJobs({ cwd: config.rootDir || process.cwd() });
      const cronJobs = jobs.filter((job) => job.cron);

      logger.info("⏰ GitVan Cron Jobs");
      logger.info("=".repeat(40));

      if (cronJobs.length === 0) {
        logger.info("No cron jobs found");
        return;
      }

      cronJobs.forEach((job, index) => {
        logger.info(`${index + 1}. ${job.name}`);
        logger.info(
          `   📝 Description: ${job.description || "No description"}`
        );
        logger.info(`   ⏰ Schedule: ${job.cron}`);

        if (args.verbose) {
          logger.info(`   📁 File: ${job.file}`);
          logger.info(`   ⏰ Modified: ${job.modified}`);
        }

        if (args["show-schedule"]) {
          // Calculate next execution time using node-cron
          try {
            if (cron.validate(job.cron)) {
              const task = cron.schedule(job.cron, () => {}, { scheduled: false });
              // Get the next date by examining the cron expression
              const nextDate = new Date();
              nextDate.setSeconds(nextDate.getSeconds() + 1);

              // Simple approximation: find next execution within next 24 hours
              const maxIterations = 1440; // minutes in a day
              let found = false;

              for (let i = 1; i < maxIterations; i++) {
                const testDate = new Date(nextDate.getTime() + i * 60000);
                if (task._fnSchedule && cron.validate(job.cron)) {
                  // Use cron expression validation as heuristic
                  const parts = job.cron.split(' ');
                  if (parts.length === 5) {
                    const [min, hour, day, month, dow] = parts;
                    const testMin = testDate.getMinutes();
                    const testHour = testDate.getHours();
                    const testDay = testDate.getDate();
                    const testMonth = testDate.getMonth() + 1;
                    const testDow = testDate.getDay();

                    const minMatch = min === '*' || min === String(testMin) || (min.includes('/') && testMin % parseInt(min.split('/')[1]) === 0);
                    const hourMatch = hour === '*' || hour === String(testHour) || (hour.includes('/') && testHour % parseInt(hour.split('/')[1]) === 0);

                    if (minMatch && hourMatch) {
                      found = true;
                      logger.info(`   🔮 Next Run: ${testDate.toLocaleString()}`);
                      break;
                    }
                  }
                }
              }

              if (!found) {
                logger.info(`   🔮 Next Run: ${new Date(nextDate.getTime() + 3600000).toLocaleString()} (estimated)`);
              }
            } else {
              logger.info(`   🔮 Next Run: Invalid cron expression`);
            }
          } catch (error) {
            logger.info(`   🔮 Next Run: Unable to calculate`);
          }
        }

        logger.info();
      });

      logger.info(`📊 Total: ${cronJobs.length} cron jobs`);
    } catch (error) {
      logger.error("Failed to list cron jobs:", error);
      logger.error("❌ Failed to list cron jobs:", error.message);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Start cron scheduler subcommand
 */
const startSubcommand = defineCommand({
  meta: {
    name: "start",
    description: "Start the cron scheduler",
  },
  args: {
    "root-dir": {
      type: "string",
      description: "Root directory for cron jobs",
      default: process.cwd(),
    },
    "check-interval": {
      type: "number",
      description: "Check interval in seconds",
      default: 60,
    },
    "max-concurrent": {
      type: "number",
      description: "Maximum concurrent jobs",
      default: 5,
    },
    verbose: {
      type: "boolean",
      description: "Show verbose output",
      default: false,
    },
  },
  async run({ args }) {
    try {
      const config = await loadConfig();

      logger.info("🚀 Starting GitVan cron scheduler...");
      logger.info(`📁 Root Directory: ${args["root-dir"]}`);
      logger.info(`⏰ Check Interval: ${args["check-interval"]}s`);
      logger.info(`🔄 Max Concurrent: ${args["max-concurrent"]}`);

      const schedulerOptions = {
        rootDir: args["root-dir"],
        checkInterval: args["check-interval"] * 1000, // Convert to milliseconds
        maxConcurrent: args["max-concurrent"],
        verbose: args.verbose,
      };

      await startCronScheduler(schedulerOptions);

      logger.info("✅ Cron scheduler started successfully");
      logger.info("💡 Press Ctrl+C to stop the scheduler");
    } catch (error) {
      logger.error("Failed to start cron scheduler:", error);
      logger.error("❌ Failed to start cron scheduler:", error.message);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Dry run cron jobs subcommand
 */
const dryRunSubcommand = defineCommand({
  meta: {
    name: "dry-run",
    description: "Simulate cron job execution without running them",
  },
  args: {
    at: {
      type: "string",
      description: "Specific time to simulate (ISO format)",
      default: new Date().toISOString(),
    },
    "root-dir": {
      type: "string",
      description: "Root directory for cron jobs",
      default: process.cwd(),
    },
    verbose: {
      type: "boolean",
      description: "Show verbose output",
      default: false,
    },
  },
  async run({ args }) {
    try {
      const config = await loadConfig();
      const jobs = await scanJobs({ cwd: args["root-dir"] });
      const cronJobs = jobs.filter((job) => job.cron);

      logger.info("🧪 Dry Run - Cron Job Simulation");
      logger.info("=".repeat(40));
      logger.info(`⏰ Simulating time: ${args.at}`);
      logger.info();

      if (cronJobs.length === 0) {
        logger.info("No cron jobs found to simulate");
        return;
      }

      const simulationTime = new Date(args.at);
      const jobsToRun = [];

      for (const job of cronJobs) {
        // TODO: Implement actual cron schedule parsing and matching
        // For now, just show all jobs as potential candidates
        jobsToRun.push(job);

        logger.info(`✅ Would run: ${job.name}`);
        logger.info(`   ⏰ Schedule: ${job.cron}`);
        logger.info(
          `   📝 Description: ${job.description || "No description"}`
        );

        if (args.verbose) {
          logger.info(`   📁 File: ${job.file}`);
        }
        logger.info();
      }

      logger.info(`📊 Summary:`);
      logger.info(`   Total cron jobs: ${cronJobs.length}`);
      logger.info(`   Jobs that would run: ${jobsToRun.length}`);
      logger.info(`   Simulation time: ${simulationTime.toISOString()}`);
    } catch (error) {
      logger.error("Failed to dry run cron jobs:", error);
      logger.error("❌ Failed to dry run cron jobs:", error.message);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Cron status subcommand
 */
const statusSubcommand = defineCommand({
  meta: {
    name: "status",
    description: "Check cron scheduler status",
  },
  args: {
    "root-dir": {
      type: "string",
      description: "Root directory to check",
      default: process.cwd(),
    },
    verbose: {
      type: "boolean",
      description: "Show verbose status information",
      default: false,
    },
  },
  async run({ args }) {
    try {
      const config = await loadConfig();
      const jobs = await scanJobs({ cwd: args["root-dir"] });
      const cronJobs = jobs.filter((job) => job.cron);

      logger.info("📊 GitVan Cron Status");
      logger.info("=".repeat(30));

      logger.info(`📁 Root Directory: ${args["root-dir"]}`);
      logger.info(`⏰ Total Cron Jobs: ${cronJobs.length}`);

      if (cronJobs.length > 0) {
        logger.info();
        logger.info("📋 Cron Jobs:");
        cronJobs.forEach((job, index) => {
          logger.info(`   ${index + 1}. ${job.name} (${job.cron})`);
        });
      }

      // TODO: Check if scheduler is actually running
      logger.info();
      logger.info("🔄 Scheduler Status: Not implemented");
      logger.info("💡 Use 'gitvan cron start' to start the scheduler");

      if (args.verbose) {
        logger.info();
        logger.info("🔍 Detailed Information:");
        logger.info(`   Config Root: ${config.rootDir || "Not set"}`);
        logger.info(`   Jobs Directory: ${args["root-dir"]}`);
        logger.info(`   Last Check: Not implemented`);
      }
    } catch (error) {
      logger.error("Failed to get cron status:", error);
      logger.error("❌ Failed to get cron status:", error.message);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Main cron command with all subcommands
 */
export const cronCommand = defineCommand({
  meta: {
    name: "cron",
    description: "Manage GitVan cron jobs (list, start, dry-run, status)",
  },
  subCommands: {
    list: listSubcommand,
    start: startSubcommand,
    "dry-run": dryRunSubcommand,
    status: statusSubcommand,
  },
});

export default cronCommand;
