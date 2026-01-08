/**
 * GitVan Job Schedule Commands
 * Manages job scheduling with Bree scheduler
 */

import { defineCommand } from "citty";
import consola from "consola";
import { withGitVan } from "../../core/context.mjs";
import { useJob } from "../../composables/job.mjs";
import { createLogger } from "../../utils/logger.mjs";
import { exitWithError } from "../../core/error-handler.mjs";

const logger = createLogger("job-schedule-cli");

export const scheduleSubcommand = defineCommand({
  meta: {
    name: "schedule",
    description: "Schedule a job with Bree scheduler",
    usage: "gitvan job schedule <job-id> [options]",
    examples: [
      "gitvan job schedule my-job --cron '0 * * * *'",
      "gitvan job schedule my-job --interval 60000",
    ],
  },
  args: {
    jobId: {
      type: "positional",
      description: "Job ID to schedule",
      required: true,
    },
    cron: {
      type: "string",
      description: "Cron expression for scheduling",
    },
    interval: {
      type: "number",
      description: "Interval in milliseconds",
    },
  },
  async run({ args }) {
    try {
      await withGitVan({ cwd: process.cwd() }, async () => {
        const job = useJob();

        const options = {};
        if (args.cron) options.cron = args.cron;
        if (args.interval) options.interval = args.interval;

        consola.start(`Scheduling job: ${args.jobId}`);
        await job.schedule(args.jobId, options);
        consola.success(`Job scheduled: ${args.jobId}`);
      });
    } catch (error) {
      logger.error(`Failed to schedule job ${args.jobId}:`, error);
      consola.error(`Failed to schedule job: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

export const unscheduleSubcommand = defineCommand({
  meta: {
    name: "unschedule",
    description: "Unschedule a job from Bree scheduler",
    usage: "gitvan job unschedule <job-id>",
    examples: ["gitvan job unschedule my-job"],
  },
  args: {
    jobId: {
      type: "positional",
      description: "Job ID to unschedule",
      required: true,
    },
  },
  async run({ args }) {
    try {
      await withGitVan({ cwd: process.cwd() }, async () => {
        const job = useJob();

        consola.start(`Unscheduling job: ${args.jobId}`);
        await job.unschedule(args.jobId);
        consola.success(`Job unscheduled: ${args.jobId}`);
      });
    } catch (error) {
      logger.error(`Failed to unschedule job ${args.jobId}:`, error);
      consola.error(`Failed to unschedule job: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

export const startSchedulerSubcommand = defineCommand({
  meta: {
    name: "start-scheduler",
    description: "Start the Bree job scheduler",
    usage: "gitvan job start-scheduler",
    examples: ["gitvan job start-scheduler"],
  },
  async run() {
    try {
      await withGitVan({ cwd: process.cwd() }, async () => {
        const job = useJob();

        consola.start("Starting job scheduler...");
        await job.startScheduler();
        consola.success("Job scheduler started");

        const status = job.getSchedulerStatus();
        logger.info(`Scheduler is running with ${status.jobCount} job(s)`);
      });
    } catch (error) {
      logger.error("Failed to start scheduler:", error);
      consola.error(`Failed to start scheduler: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

export const stopSchedulerSubcommand = defineCommand({
  meta: {
    name: "stop-scheduler",
    description: "Stop the Bree job scheduler",
    usage: "gitvan job stop-scheduler",
    examples: ["gitvan job stop-scheduler"],
  },
  async run() {
    try {
      await withGitVan({ cwd: process.cwd() }, async () => {
        const job = useJob();

        consola.start("Stopping job scheduler...");
        await job.stopScheduler();
        consola.success("Job scheduler stopped");
      });
    } catch (error) {
      logger.error("Failed to stop scheduler:", error);
      consola.error(`Failed to stop scheduler: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

export const schedulerStatusSubcommand = defineCommand({
  meta: {
    name: "scheduler-status",
    description: "Get Bree scheduler status",
    usage: "gitvan job scheduler-status",
    examples: ["gitvan job scheduler-status"],
  },
  async run() {
    try {
      await withGitVan({ cwd: process.cwd() }, async () => {
        const job = useJob();

        const status = job.getSchedulerStatus();

        logger.info("\n📊 Scheduler Status");
        logger.info("=".repeat(80));
        logger.info(`Running: ${status.isRunning ? "Yes" : "No"}`);
        logger.info(`Scheduled Jobs: ${status.jobCount}`);

        if (status.jobs && status.jobs.length > 0) {
          logger.info("\nScheduled Jobs:");
          logger.info("=".repeat(80));

          for (const scheduledJob of status.jobs) {
            logger.info(`\n  ${scheduledJob.name}`);
            if (scheduledJob.cron) {
              logger.info(`    Cron: ${scheduledJob.cron}`);
            }
            if (scheduledJob.interval) {
              logger.info(`    Interval: ${scheduledJob.interval}ms`);
            }
          }
        }

        logger.info("\n" + "=".repeat(80) + "\n");
      });
    } catch (error) {
      logger.error("Failed to get scheduler status:", error);
      consola.error(`Failed to get scheduler status: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

export const autoScheduleSubcommand = defineCommand({
  meta: {
    name: "auto-schedule",
    description: "Auto-schedule all cron jobs",
    usage: "gitvan job auto-schedule",
    examples: ["gitvan job auto-schedule"],
  },
  async run() {
    try {
      await withGitVan({ cwd: process.cwd() }, async () => {
        const job = useJob();

        consola.start("Auto-scheduling cron jobs...");
        const results = await job.autoScheduleCronJobs();

        const scheduled = results.filter((r) => r.scheduled).length;
        const failed = results.filter((r) => !r.scheduled).length;

        logger.info("\n📋 Auto-Schedule Results");
        logger.info("=".repeat(80));
        logger.info(`Scheduled: ${scheduled}`);
        logger.info(`Failed: ${failed}`);

        if (failed > 0) {
          logger.info("\nFailed Jobs:");
          for (const result of results.filter((r) => !r.scheduled)) {
            logger.info(`  ${result.jobId}: ${result.error}`);
          }
        }

        logger.info("=".repeat(80) + "\n");

        consola.success(`Auto-scheduled ${scheduled} cron job(s)`);
      });
    } catch (error) {
      logger.error("Failed to auto-schedule cron jobs:", error);
      consola.error(`Failed to auto-schedule: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

export default scheduleSubcommand;
