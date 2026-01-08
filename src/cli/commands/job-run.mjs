/**
 * GitVan Job Run Command
 * Executes a specific job
 */

import { defineCommand } from "citty";
import consola from "consola";
import { withGitVan } from "../../core/context.mjs";
import { useJob } from "../../composables/job.mjs";
import { createLogger } from "../../utils/logger.mjs";
import { exitWithError } from "../../core/error-handler.mjs";

const logger = createLogger("job-run-cli");

export const runSubcommand = defineCommand({
  meta: {
    name: "run",
    description: "Execute a job",
    usage: "gitvan job run <job-id> [options]",
    examples: [
      "gitvan job run my-job",
      "gitvan job run my-job --payload key=value",
      "gitvan job run my-job --with-lock",
    ],
  },
  args: {
    jobId: {
      type: "positional",
      description: "Job ID to execute",
      required: true,
    },
    payload: {
      type: "string",
      description: "Payload in key=value format (can be used multiple times)",
    },
    "with-lock": {
      type: "boolean",
      description: "Run job with lock to prevent concurrent execution",
      default: false,
    },
  },
  async run({ args }) {
    try {
      await withGitVan({ cwd: process.cwd() }, async () => {
        const job = useJob();

        // Parse payload
        const payload = {};
        if (args.payload) {
          const payloadArray = Array.isArray(args.payload)
            ? args.payload
            : [args.payload];
          for (const p of payloadArray) {
            const [key, value] = p.split("=");
            if (key && value !== undefined) {
              payload[key] = value;
            }
          }
        }

        consola.start(`Running job: ${args.jobId}`);

        let result;
        if (args["with-lock"]) {
          result = await job.runWithLock(args.jobId, { payload });
        } else {
          result = await job.run(args.jobId, { payload });
        }

        consola.success(`Job completed: ${args.jobId}`);

        if (result && typeof result === "object") {
          logger.info("\nResult:");
          logger.info(JSON.stringify(result, null, 2));
        }
      });
    } catch (error) {
      logger.error(`Failed to run job ${args.jobId}:`, error);
      consola.error(`Failed to run job: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

export default runSubcommand;
