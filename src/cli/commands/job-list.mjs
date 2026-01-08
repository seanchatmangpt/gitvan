/**
 * GitVan Job List Command
 * Lists all available jobs
 */

import { defineCommand } from "citty";
import consola from "consola";
import { withGitVan } from "../../core/context.mjs";
import { useJob } from "../../composables/job.mjs";
import { createLogger } from "../../utils/logger.mjs";
import { exitWithError } from "../../core/error-handler.mjs";

const logger = createLogger("job-list-cli");

export const listSubcommand = defineCommand({
  meta: {
    name: "list",
    description: "List all available jobs",
    usage: "gitvan job list [options]",
    examples: [
      "gitvan job list",
      "gitvan job list --verbose",
      "gitvan job list --filter name=test",
      "gitvan job list --format json",
    ],
  },
  args: {
    verbose: {
      type: "boolean",
      description: "Show detailed job information",
      default: false,
    },
    filter: {
      type: "string",
      description: "Filter jobs by name, tag, or type",
    },
    format: {
      type: "string",
      description: "Output format (table, json, yaml)",
      default: "table",
    },
  },
  async run({ args }) {
    try {
      await withGitVan({ cwd: process.cwd() }, async () => {
        const job = useJob();

        // Build filter options
        const filterOptions = {};
        if (args.filter) {
          const [filterType, filterValue] = args.filter.split("=");
          if (filterType && filterValue) {
            if (filterType === "name") {
              filterOptions.name = filterValue;
            } else if (filterType === "tag") {
              filterOptions.tags = [filterValue];
            }
          }
        }

        const jobs = await job.list({
          includeMetadata: args.verbose,
          filter: filterOptions,
        });

        if (jobs.length === 0) {
          consola.info("No jobs found");
          return;
        }

        // Format output
        if (args.format === "json") {
          logger.info(JSON.stringify(jobs, null, 2));
        } else if (args.format === "yaml") {
          for (const j of jobs) {
            logger.info(`- id: ${j.id}`);
            logger.info(`  name: ${j.name}`);
            logger.info(`  description: ${j.description}`);
            if (j.tags.length > 0) {
              logger.info(`  tags: [${j.tags.join(", ")}]`);
            }
            if (j.cron) {
              logger.info(`  cron: ${j.cron}`);
            }
          }
        } else {
          // Table format
          logger.info("\n📋 Available Jobs");
          logger.info("=".repeat(80));
          logger.info(
            `${"ID".padEnd(20)} ${"Name".padEnd(25)} ${"Description".padEnd(30)}`
          );
          logger.info("=".repeat(80));

          for (const j of jobs) {
            const id = j.id.length > 18 ? j.id.slice(0, 17) + "…" : j.id.padEnd(20);
            const name = j.name.length > 23 ? j.name.slice(0, 22) + "…" : j.name.padEnd(25);
            const desc =
              j.description.length > 28
                ? j.description.slice(0, 27) + "…"
                : j.description.padEnd(30);

            logger.info(`${id} ${name} ${desc}`);

            if (args.verbose) {
              if (j.tags.length > 0) {
                logger.info(`  Tags: ${j.tags.join(", ")}`);
              }
              if (j.cron) {
                logger.info(`  Cron: ${j.cron}`);
              }
              logger.info(`  File: ${j.file}`);
              logger.info("");
            }
          }

          logger.info("=".repeat(80));
          logger.info(`Total: ${jobs.length} job(s)\n`);
        }
      });
    } catch (error) {
      logger.error("Failed to list jobs:", error);
      consola.error(`Failed to list jobs: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

export default listSubcommand;
