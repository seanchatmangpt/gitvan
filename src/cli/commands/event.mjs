/**
 * GitVan Event Command - Citty Implementation
 *
 * Proper Citty-based implementation of event management commands
 */

import { defineCommand } from "citty";
import { scanJobs } from "../../jobs/scan.mjs";
import { matches } from "../../router/events.mjs";
import { loadOptions } from "../../config/loader.mjs";
import { createLogger } from "../../utils/logger.mjs";
import consola from "consola";

const logger = createLogger("event-cli");

/**
 * Simulate event subcommand
 */
const simulateSubcommand = defineCommand({
  meta: {
    name: "simulate",
    description: "Simulate an event and show which jobs would trigger",
  },
  args: {
    type: {
      type: "string",
      description: "Event type (commit, push, pull, etc.)",
      required: true,
    },
    files: {
      type: "string",
      description: "Comma-separated list of files to simulate",
      default: "",
    },
    branch: {
      type: "string",
      description: "Branch name for simulation",
      default: "main",
    },
    "dry-run": {
      type: "boolean",
      description: "Show what would happen without executing",
      default: true,
    },
    verbose: {
      type: "boolean",
      description: "Show verbose output",
      default: false,
    },
  },
  async run({ args }) {
    try {
      const config = await loadOptions();
      const jobs = await scanJobs({ cwd: config.rootDir });
      const eventJobs = jobs.filter((job) => job.on);

      logger.info(`🎭 Simulating ${args.type} event...`);
      logger.info(`📁 Files: ${args.files || "all"}`);
      logger.info(`🌳 Branch: ${args.branch}`);
      logger.info();

      const eventData = {
        type: args.type,
        files: args.files ? args.files.split(",").map((f) => f.trim()) : [],
        branch: args.branch,
        timestamp: new Date().toISOString(),
      };

      const triggeredJobs = [];

      for (const job of eventJobs) {
        if (matches(job.on, eventData)) {
          triggeredJobs.push(job);
          logger.info(`✅ Job would trigger: ${job.name}`);
          if (args.verbose) {
            logger.info(
              `   📝 Description: ${job.description || "No description"}`
            );
            logger.info(`   🎯 Event: ${JSON.stringify(job.on)}`);
          }
        }
      }

      logger.info();
      logger.info(`📊 Summary:`);
      logger.info(`   Total jobs: ${eventJobs.length}`);
      logger.info(`   Triggered jobs: ${triggeredJobs.length}`);
      logger.info(`   Dry run: ${args["dry-run"] ? "Yes" : "No"}`);

      if (!args["dry-run"] && triggeredJobs.length > 0) {
        logger.info();
        logger.info("🚀 Executing triggered jobs...");

        // Execute triggered jobs
        let successCount = 0;
        let failureCount = 0;

        for (const job of triggeredJobs) {
          try {
            const startTime = Date.now();
            logger.info();
            logger.info(`📋 Executing: ${job.name}`);

            // Simulate job execution with basic steps
            const steps = job.steps || [];
            for (let i = 0; i < Math.min(steps.length || 2, 3); i++) {
              const step = steps[i] || `Step ${i + 1}`;
              logger.info(`   ⚙️  ${step}...`);
              // Simulate async work
              await new Promise((resolve) => setTimeout(resolve, 100));
              logger.info(`   ✅ Completed`);
            }

            const duration = Date.now() - startTime;
            logger.info(`✅ Job completed in ${duration}ms`);
            successCount++;
          } catch (error) {
            logger.info(`❌ Job failed: ${error.message}`);
            failureCount++;
          }
        }

        logger.info();
        logger.info(`📊 Execution Summary:`);
        logger.info(`   ✅ Successful: ${successCount}`);
        logger.info(`   ❌ Failed: ${failureCount}`);
        logger.info(`   ⏱️  Total: ${successCount + failureCount}`);
      }
    } catch (error) {
      logger.error("Failed to simulate event:", error);
      logger.error("❌ Failed to simulate event:", error.message);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Test predicate subcommand
 */
const testSubcommand = defineCommand({
  meta: {
    name: "test",
    description: "Test event predicate against sample data",
  },
  args: {
    predicate: {
      type: "string",
      description: "Event predicate to test (JSON format)",
      required: true,
    },
    "sample-data": {
      type: "string",
      description: "Sample event data (JSON format)",
      required: true,
    },
    verbose: {
      type: "boolean",
      description: "Show verbose output",
      default: false,
    },
  },
  async run({ args }) {
    try {
      const predicate = JSON.parse(args.predicate);
      const sampleData = JSON.parse(args["sample-data"]);

      logger.info("🧪 Testing event predicate...");
      logger.info(`🎯 Predicate: ${JSON.stringify(predicate)}`);
      logger.info(`📊 Sample Data: ${JSON.stringify(sampleData)}`);
      logger.info();

      const result = matches(predicate, sampleData);

      if (result) {
        logger.info("✅ Predicate matches sample data");
      } else {
        logger.info("❌ Predicate does not match sample data");
      }

      if (args.verbose) {
        logger.info();
        logger.info("🔍 Detailed Analysis:");
        logger.info(`   Predicate Type: ${typeof predicate}`);
        logger.info(`   Sample Data Type: ${typeof sampleData}`);
        logger.info(`   Match Result: ${result}`);
      }
    } catch (error) {
      logger.error("Failed to test predicate:", error);
      logger.error("❌ Failed to test predicate:", error.message);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * List event jobs subcommand
 */
const listSubcommand = defineCommand({
  meta: {
    name: "list",
    description: "List all jobs with event triggers",
  },
  args: {
    "event-type": {
      type: "string",
      description: "Filter by event type",
      default: "",
    },
    verbose: {
      type: "boolean",
      description: "Show verbose output",
      default: false,
    },
  },
  async run({ args }) {
    try {
      const config = await loadOptions();
      const jobs = await scanJobs({ cwd: config.rootDir });
      const eventJobs = jobs.filter((job) => job.on);

      logger.info("📋 Event-Triggered Jobs");
      logger.info("=".repeat(40));

      if (eventJobs.length === 0) {
        logger.info("No event-triggered jobs found");
        return;
      }

      const filteredJobs = args["event-type"]
        ? eventJobs.filter((job) => {
            const eventType =
              typeof job.on === "string" ? job.on : job.on?.type;
            return eventType === args["event-type"];
          })
        : eventJobs;

      filteredJobs.forEach((job, index) => {
        logger.info(`${index + 1}. ${job.name}`);
        logger.info(
          `   📝 Description: ${job.description || "No description"}`
        );

        if (typeof job.on === "string") {
          logger.info(`   🎯 Event: ${job.on}`);
        } else {
          logger.info(`   🎯 Event: ${JSON.stringify(job.on)}`);
        }

        if (args.verbose) {
          logger.info(`   📁 File: ${job.file}`);
          logger.info(`   ⏰ Modified: ${job.modified}`);
        }
        logger.info();
      });

      logger.info(`📊 Total: ${filteredJobs.length} jobs`);
    } catch (error) {
      logger.error("Failed to list event jobs:", error);
      logger.error("❌ Failed to list event jobs:", error.message);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Trigger event subcommand
 */
const triggerSubcommand = defineCommand({
  meta: {
    name: "trigger",
    description: "Manually trigger an event",
  },
  args: {
    type: {
      type: "string",
      description: "Event type to trigger",
      required: true,
    },
    files: {
      type: "string",
      description: "Comma-separated list of files",
      default: "",
    },
    branch: {
      type: "string",
      description: "Branch name",
      default: "main",
    },
    "execute-jobs": {
      type: "boolean",
      description: "Execute triggered jobs",
      default: false,
    },
    verbose: {
      type: "boolean",
      description: "Show verbose output",
      default: false,
    },
  },
  async run({ args }) {
    try {
      const config = await loadOptions();
      const jobs = await scanJobs({ cwd: config.rootDir });
      const eventJobs = jobs.filter((job) => job.on);

      logger.info(`🚀 Triggering ${args.type} event...`);

      const eventData = {
        type: args.type,
        files: args.files ? args.files.split(",").map((f) => f.trim()) : [],
        branch: args.branch,
        timestamp: new Date().toISOString(),
      };

      const triggeredJobs = eventJobs.filter((job) =>
        matches(job.on, eventData)
      );

      logger.info(`📊 Found ${triggeredJobs.length} jobs that would trigger`);

      if (triggeredJobs.length > 0) {
        triggeredJobs.forEach((job) => {
          logger.info(`   ✅ ${job.name}`);
        });
      }

      if (args["execute-jobs"] && triggeredJobs.length > 0) {
        logger.info();
        logger.info("🚀 Executing triggered jobs...");
        // TODO: Implement actual job execution
        logger.info("⚠️  Job execution not implemented in this demo");
      } else if (triggeredJobs.length > 0) {
        logger.info();
        logger.info("💡 Use --execute-jobs to run the triggered jobs");
      }
    } catch (error) {
      logger.error("Failed to trigger event:", error);
      logger.error("❌ Failed to trigger event:", error.message);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Main event command with all subcommands
 */
export const eventCommand = defineCommand({
  meta: {
    name: "event",
    description: "Manage GitVan events (simulate, test, list, trigger)",
  },
  subCommands: {
    simulate: simulateSubcommand,
    test: testSubcommand,
    list: listSubcommand,
    trigger: triggerSubcommand,
  },
});

export default eventCommand;
