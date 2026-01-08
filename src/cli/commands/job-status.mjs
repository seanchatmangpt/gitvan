/**
 * GitVan Job Status Command
 * Gets job status and execution history
 */

import { defineCommand } from "citty";
import consola from "consola";
import { withGitVan } from "../../core/context.mjs";
import { useJob } from "../../composables/job.mjs";
import { createLogger } from "../../utils/logger.mjs";
import { exitWithError } from "../../core/error-handler.mjs";

const logger = createLogger("job-status-cli");

export const statusSubcommand = defineCommand({
  meta: {
    name: "status",
    description: "Get job status and execution history",
    usage: "gitvan job status <job-id>",
    examples: ["gitvan job status my-job"],
  },
  args: {
    jobId: {
      type: "positional",
      description: "Job ID to check status",
      required: true,
    },
  },
  async run({ args }) {
    try {
      await withGitVan({ cwd: process.cwd() }, async () => {
        const job = useJob();
        const status = await job.status(args.jobId);

        logger.info("\n📊 Job Status");
        logger.info("=".repeat(80));
        logger.info(`Job: ${status.id}`);
        logger.info(`Running: ${status.isRunning ? "Yes" : "No"}`);
        logger.info(`Last Run: ${status.lastRun || "Never"}`);
        logger.info(`Last Status: ${status.lastStatus || "N/A"}`);
        logger.info(`Total Runs: ${status.totalRuns}`);
        logger.info(`Success Rate: ${status.successRate}%`);
        logger.info("=".repeat(80) + "\n");
      });
    } catch (error) {
      logger.error(`Failed to get job status for ${args.jobId}:`, error);
      consola.error(`Failed to get job status: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

export const historySubcommand = defineCommand({
  meta: {
    name: "history",
    description: "Get job execution history",
    usage: "gitvan job history <job-id> [options]",
    examples: [
      "gitvan job history my-job",
      "gitvan job history my-job --limit 10",
      "gitvan job history my-job --status success",
    ],
  },
  args: {
    jobId: {
      type: "positional",
      description: "Job ID to get history",
      required: true,
    },
    limit: {
      type: "number",
      description: "Limit number of results",
      default: 50,
    },
    status: {
      type: "string",
      description: "Filter by status (success, error)",
    },
  },
  async run({ args }) {
    try {
      await withGitVan({ cwd: process.cwd() }, async () => {
        const job = useJob();
        const history = await job.history(args.jobId, {
          limit: args.limit,
          status: args.status,
        });

        if (history.length === 0) {
          consola.info("No execution history found");
          return;
        }

        logger.info("\n📜 Job History");
        logger.info("=".repeat(80));
        logger.info(
          `${"Timestamp".padEnd(25)} ${"Status".padEnd(15)} ${"Duration".padEnd(10)}`
        );
        logger.info("=".repeat(80));

        for (const entry of history) {
          const timestamp = entry.timestamp || "N/A";
          const status = entry.status || "N/A";
          const duration = entry.duration ? `${entry.duration}ms` : "N/A";

          logger.info(
            `${timestamp.padEnd(25)} ${status.padEnd(15)} ${duration.padEnd(10)}`
          );
        }

        logger.info("=".repeat(80));
        logger.info(`Total: ${history.length} execution(s)\n`);
      });
    } catch (error) {
      logger.error(`Failed to get job history for ${args.jobId}:`, error);
      consola.error(`Failed to get job history: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

export default statusSubcommand;
