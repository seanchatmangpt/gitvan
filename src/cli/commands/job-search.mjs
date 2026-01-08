/**
 * GitVan Job Search and Chain Commands
 * Search jobs and chain multiple jobs for sequential execution
 */

import { defineCommand } from "citty";
import consola from "consola";
import { withGitVan } from "../../core/context.mjs";
import { useJob } from "../../composables/job.mjs";
import { createLogger } from "../../utils/logger.mjs";
import { exitWithError } from "../../core/error-handler.mjs";

const logger = createLogger("job-search-cli");

export const searchSubcommand = defineCommand({
  meta: {
    name: "search",
    description: "Search jobs by query",
    usage: "gitvan job search <query>",
    examples: ["gitvan job search test", "gitvan job search deploy"],
  },
  args: {
    query: {
      type: "positional",
      description: "Search query",
      required: true,
    },
  },
  async run({ args }) {
    try {
      await withGitVan({ cwd: process.cwd() }, async () => {
        const job = useJob();
        const results = await job.search(args.query);

        if (results.length === 0) {
          consola.info(`No jobs found matching: ${args.query}`);
          return;
        }

        logger.info(`\n🔍 Search Results for "${args.query}"`);
        logger.info("=".repeat(80));

        for (const j of results) {
          logger.info(`\n${j.id}`);
          logger.info(`  Name: ${j.name}`);
          logger.info(`  Description: ${j.description}`);
          if (j.tags.length > 0) {
            logger.info(`  Tags: ${j.tags.join(", ")}`);
          }
        }

        logger.info("\n" + "=".repeat(80));
        logger.info(`Found: ${results.length} job(s)\n`);
      });
    } catch (error) {
      logger.error("Failed to search jobs:", error);
      consola.error(`Failed to search jobs: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

export const chainSubcommand = defineCommand({
  meta: {
    name: "chain",
    description: "Chain multiple jobs for sequential execution",
    usage: "gitvan job chain <job1> <job2> [job3...]",
    examples: [
      "gitvan job chain build test deploy",
      "gitvan job chain job1 job2 job3",
    ],
  },
  args: {
    jobs: {
      type: "positional",
      description: "Jobs to chain (space separated)",
      required: true,
    },
  },
  async run({ args }) {
    try {
      // Parse job IDs from positional arguments
      const jobIds = args._;

      if (!jobIds || jobIds.length < 2) {
        consola.error("Please specify at least 2 jobs to chain");
        await exitWithError(new Error("Operation failed"), 1);
      }

      await withGitVan({ cwd: process.cwd() }, async () => {
        const job = useJob();

        consola.start(`Chaining ${jobIds.length} jobs: ${jobIds.join(" → ")}`);

        const results = [];
        let previousResult = null;

        for (let i = 0; i < jobIds.length; i++) {
          const jobId = jobIds[i];
          consola.info(`[${i + 1}/${jobIds.length}] Running: ${jobId}`);

          try {
            const result = await job.run(jobId, {
              payload: {
                previousResult,
                chainIndex: i,
                chainTotal: jobIds.length,
              },
            });

            results.push({ jobId, status: "success", result });
            previousResult = result;
            consola.success(`[${i + 1}/${jobIds.length}] Completed: ${jobId}`);
          } catch (error) {
            results.push({ jobId, status: "error", error: error.message });
            consola.error(`[${i + 1}/${jobIds.length}] Failed: ${jobId}`);
            consola.error(`Error: ${error.message}`);

            logger.info("\n❌ Job chain failed");
            logger.info(`Failed at: ${jobId} (step ${i + 1}/${jobIds.length})`);
            await exitWithError(new Error("Operation failed"), 1);
          }
        }

        logger.info("\n✅ Job chain completed successfully");
        logger.info(`Executed: ${jobIds.join(" → ")}\n`);
      });
    } catch (error) {
      logger.error("Failed to chain jobs:", error);
      consola.error(`Failed to chain jobs: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

export default searchSubcommand;
