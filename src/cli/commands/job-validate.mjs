/**
 * GitVan Job Validate Command
 * Validates job definitions
 */

import { defineCommand } from "citty";
import consola from "consola";
import { withGitVan } from "../../core/context.mjs";
import { useJob } from "../../composables/job.mjs";
import { createLogger } from "../../utils/logger.mjs";
import { exitWithError } from "../../core/error-handler.mjs";

const logger = createLogger("job-validate-cli");

export const validateSubcommand = defineCommand({
  meta: {
    name: "validate",
    description: "Validate a job definition",
    usage: "gitvan job validate <job-id>",
    examples: [
      "gitvan job validate my-job",
      "gitvan job validate --all",
    ],
  },
  args: {
    jobId: {
      type: "positional",
      description: "Job ID to validate",
      required: false,
    },
    all: {
      type: "boolean",
      description: "Validate all jobs",
      default: false,
    },
  },
  async run({ args }) {
    try {
      await withGitVan({ cwd: process.cwd() }, async () => {
        const job = useJob();

        if (args.all) {
          consola.start("Validating all jobs...");
          const results = await job.validateAll();

          let validCount = 0;
          let invalidCount = 0;

          logger.info("\n📋 Validation Results");
          logger.info("=".repeat(80));

          for (const result of results) {
            if (result.valid) {
              validCount++;
              logger.info(`✓ ${result.id.padEnd(30)} VALID`);
            } else {
              invalidCount++;
              logger.info(`✗ ${result.id.padEnd(30)} INVALID`);
              for (const error of result.errors) {
                logger.info(`  Error: ${error}`);
              }
            }

            if (result.warnings.length > 0) {
              for (const warning of result.warnings) {
                logger.info(`  Warning: ${warning}`);
              }
            }
          }

          logger.info("=".repeat(80));
          logger.info(`Valid: ${validCount} | Invalid: ${invalidCount}\n`);
        } else if (args.jobId) {
          consola.start(`Validating job: ${args.jobId}`);
          const result = await job.validate(args.jobId);

          logger.info("\n📋 Validation Result");
          logger.info("=".repeat(80));
          logger.info(`Job: ${result.id}`);
          logger.info(`Status: ${result.valid ? "✓ VALID" : "✗ INVALID"}`);

          if (result.errors.length > 0) {
            logger.info("\nErrors:");
            for (const error of result.errors) {
              logger.info(`  - ${error}`);
            }
          }

          if (result.warnings.length > 0) {
            logger.info("\nWarnings:");
            for (const warning of result.warnings) {
              logger.info(`  - ${warning}`);
            }
          }

          logger.info("=".repeat(80) + "\n");

          if (!result.valid) {
            await exitWithError(new Error("Operation failed"), 1);
          }
        } else {
          consola.error("Please specify a job ID or use --all flag");
          await exitWithError(new Error("Operation failed"), 1);
        }
      });
    } catch (error) {
      logger.error("Failed to validate job:", error);
      consola.error(`Failed to validate job: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

export default validateSubcommand;
