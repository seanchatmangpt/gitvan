#!/usr/bin/env node

/**
 * GitVan Job Command - Citty Implementation
 *
 * Provides comprehensive job management through CLI
 * Supports listing, execution, validation, status checking, and chaining
 */

import { defineCommand } from "citty";
import { useGitVan, withGitVan } from "../../core/context.mjs";
import { useJob } from "../../composables/job.mjs";
import { createLogger } from "../../utils/logger.mjs";
import consola from "consola";

const logger = createLogger("job-cli");

/**
 * List all available jobs
 */
const listSubcommand = defineCommand({
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
          console.log(JSON.stringify(jobs, null, 2));
        } else if (args.format === "yaml") {
          for (const j of jobs) {
            console.log(`- id: ${j.id}`);
            console.log(`  name: ${j.name}`);
            console.log(`  description: ${j.description}`);
            if (j.tags.length > 0) {
              console.log(`  tags: [${j.tags.join(", ")}]`);
            }
            if (j.cron) {
              console.log(`  cron: ${j.cron}`);
            }
          }
        } else {
          // Table format
          console.log("\n📋 Available Jobs");
          console.log("=".repeat(80));
          console.log(
            `${"ID".padEnd(20)} ${"Name".padEnd(25)} ${"Description".padEnd(30)}`
          );
          console.log("=".repeat(80));

          for (const j of jobs) {
            const id = j.id.length > 18 ? j.id.slice(0, 17) + "…" : j.id.padEnd(20);
            const name = j.name.length > 23 ? j.name.slice(0, 22) + "…" : j.name.padEnd(25);
            const desc =
              j.description.length > 28
                ? j.description.slice(0, 27) + "…"
                : j.description.padEnd(30);

            console.log(`${id} ${name} ${desc}`);

            if (args.verbose) {
              if (j.tags.length > 0) {
                console.log(`  Tags: ${j.tags.join(", ")}`);
              }
              if (j.cron) {
                console.log(`  Cron: ${j.cron}`);
              }
              console.log(`  File: ${j.file}`);
              console.log("");
            }
          }

          console.log("=".repeat(80));
          console.log(`Total: ${jobs.length} job(s)\n`);
        }
      });
    } catch (error) {
      logger.error("Failed to list jobs:", error);
      consola.error(`Failed to list jobs: ${error.message}`);
      process.exit(1);
    }
  },
});

/**
 * Run a specific job
 */
const runSubcommand = defineCommand({
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
          console.log("\nResult:");
          console.log(JSON.stringify(result, null, 2));
        }
      });
    } catch (error) {
      logger.error(`Failed to run job ${args.jobId}:`, error);
      consola.error(`Failed to run job: ${error.message}`);
      process.exit(1);
    }
  },
});

/**
 * Validate a job
 */
const validateSubcommand = defineCommand({
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

          console.log("\n📋 Validation Results");
          console.log("=".repeat(80));

          for (const result of results) {
            if (result.valid) {
              validCount++;
              console.log(`✓ ${result.id.padEnd(30)} VALID`);
            } else {
              invalidCount++;
              console.log(`✗ ${result.id.padEnd(30)} INVALID`);
              for (const error of result.errors) {
                console.log(`  Error: ${error}`);
              }
            }

            if (result.warnings.length > 0) {
              for (const warning of result.warnings) {
                console.log(`  Warning: ${warning}`);
              }
            }
          }

          console.log("=".repeat(80));
          console.log(`Valid: ${validCount} | Invalid: ${invalidCount}\n`);
        } else if (args.jobId) {
          consola.start(`Validating job: ${args.jobId}`);
          const result = await job.validate(args.jobId);

          console.log("\n📋 Validation Result");
          console.log("=".repeat(80));
          console.log(`Job: ${result.id}`);
          console.log(`Status: ${result.valid ? "✓ VALID" : "✗ INVALID"}`);

          if (result.errors.length > 0) {
            console.log("\nErrors:");
            for (const error of result.errors) {
              console.log(`  - ${error}`);
            }
          }

          if (result.warnings.length > 0) {
            console.log("\nWarnings:");
            for (const warning of result.warnings) {
              console.log(`  - ${warning}`);
            }
          }

          console.log("=".repeat(80) + "\n");

          if (!result.valid) {
            process.exit(1);
          }
        } else {
          consola.error("Please specify a job ID or use --all flag");
          process.exit(1);
        }
      });
    } catch (error) {
      logger.error("Failed to validate job:", error);
      consola.error(`Failed to validate job: ${error.message}`);
      process.exit(1);
    }
  },
});

/**
 * Get job status
 */
const statusSubcommand = defineCommand({
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

        console.log("\n📊 Job Status");
        console.log("=".repeat(80));
        console.log(`Job: ${status.id}`);
        console.log(`Running: ${status.isRunning ? "Yes" : "No"}`);
        console.log(`Last Run: ${status.lastRun || "Never"}`);
        console.log(`Last Status: ${status.lastStatus || "N/A"}`);
        console.log(`Total Runs: ${status.totalRuns}`);
        console.log(`Success Rate: ${status.successRate}%`);
        console.log("=".repeat(80) + "\n");
      });
    } catch (error) {
      logger.error(`Failed to get job status for ${args.jobId}:`, error);
      consola.error(`Failed to get job status: ${error.message}`);
      process.exit(1);
    }
  },
});

/**
 * Get job history
 */
const historySubcommand = defineCommand({
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

        console.log("\n📜 Job History");
        console.log("=".repeat(80));
        console.log(
          `${"Timestamp".padEnd(25)} ${"Status".padEnd(15)} ${"Duration".padEnd(10)}`
        );
        console.log("=".repeat(80));

        for (const entry of history) {
          const timestamp = entry.timestamp || "N/A";
          const status = entry.status || "N/A";
          const duration = entry.duration ? `${entry.duration}ms` : "N/A";

          console.log(
            `${timestamp.padEnd(25)} ${status.padEnd(15)} ${duration.padEnd(10)}`
          );
        }

        console.log("=".repeat(80));
        console.log(`Total: ${history.length} execution(s)\n`);
      });
    } catch (error) {
      logger.error(`Failed to get job history for ${args.jobId}:`, error);
      consola.error(`Failed to get job history: ${error.message}`);
      process.exit(1);
    }
  },
});

/**
 * Chain multiple jobs
 */
const chainSubcommand = defineCommand({
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
        process.exit(1);
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

            console.log("\n❌ Job chain failed");
            console.log(`Failed at: ${jobId} (step ${i + 1}/${jobIds.length})`);
            process.exit(1);
          }
        }

        console.log("\n✅ Job chain completed successfully");
        console.log(`Executed: ${jobIds.join(" → ")}\n`);
      });
    } catch (error) {
      logger.error("Failed to chain jobs:", error);
      consola.error(`Failed to chain jobs: ${error.message}`);
      process.exit(1);
    }
  },
});

/**
 * Search jobs
 */
const searchSubcommand = defineCommand({
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

        console.log(`\n🔍 Search Results for "${args.query}"`);
        console.log("=".repeat(80));

        for (const j of results) {
          console.log(`\n${j.id}`);
          console.log(`  Name: ${j.name}`);
          console.log(`  Description: ${j.description}`);
          if (j.tags.length > 0) {
            console.log(`  Tags: ${j.tags.join(", ")}`);
          }
        }

        console.log("\n" + "=".repeat(80));
        console.log(`Found: ${results.length} job(s)\n`);
      });
    } catch (error) {
      logger.error("Failed to search jobs:", error);
      consola.error(`Failed to search jobs: ${error.message}`);
      process.exit(1);
    }
  },
});

/**
 * Main job command with all subcommands
 */
export const jobCommand = defineCommand({
  meta: {
    name: "job",
    description: "Manage GitVan Jobs",
    usage: "gitvan job <subcommand> [options]",
    examples: [
      "gitvan job list",
      "gitvan job run my-job",
      "gitvan job validate my-job",
      "gitvan job status my-job",
      "gitvan job history my-job",
      "gitvan job chain job1 job2 job3",
      "gitvan job search test",
    ],
  },
  subCommands: {
    list: listSubcommand,
    run: runSubcommand,
    validate: validateSubcommand,
    status: statusSubcommand,
    history: historySubcommand,
    chain: chainSubcommand,
    search: searchSubcommand,
  },
});

export default jobCommand;
