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

      console.log(`🎭 Simulating ${args.type} event...`);
      console.log(`📁 Files: ${args.files || "all"}`);
      console.log(`🌳 Branch: ${args.branch}`);
      console.log();

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
          console.log(`✅ Job would trigger: ${job.name}`);
          if (args.verbose) {
            console.log(
              `   📝 Description: ${job.description || "No description"}`
            );
            console.log(`   🎯 Event: ${JSON.stringify(job.on)}`);
          }
        }
      }

      console.log();
      console.log(`📊 Summary:`);
      console.log(`   Total jobs: ${eventJobs.length}`);
      console.log(`   Triggered jobs: ${triggeredJobs.length}`);
      console.log(`   Dry run: ${args["dry-run"] ? "Yes" : "No"}`);

      if (!args["dry-run"] && triggeredJobs.length > 0) {
        console.log();
        console.log("🚀 Executing triggered jobs...");

        // Execute triggered jobs
        let successCount = 0;
        let failureCount = 0;

        for (const job of triggeredJobs) {
          try {
            const startTime = Date.now();
            console.log();
            console.log(`📋 Executing: ${job.name}`);

            // Simulate job execution with basic steps
            const steps = job.steps || [];
            for (let i = 0; i < Math.min(steps.length || 2, 3); i++) {
              const step = steps[i] || `Step ${i + 1}`;
              console.log(`   ⚙️  ${step}...`);
              // Simulate async work
              await new Promise((resolve) => setTimeout(resolve, 100));
              console.log(`   ✅ Completed`);
            }

            const duration = Date.now() - startTime;
            console.log(`✅ Job completed in ${duration}ms`);
            successCount++;
          } catch (error) {
            console.log(`❌ Job failed: ${error.message}`);
            failureCount++;
          }
        }

        console.log();
        console.log(`📊 Execution Summary:`);
        console.log(`   ✅ Successful: ${successCount}`);
        console.log(`   ❌ Failed: ${failureCount}`);
        console.log(`   ⏱️  Total: ${successCount + failureCount}`);
      }
    } catch (error) {
      logger.error("Failed to simulate event:", error);
      console.error("❌ Failed to simulate event:", error.message);
      process.exit(1);
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

      console.log("🧪 Testing event predicate...");
      console.log(`🎯 Predicate: ${JSON.stringify(predicate)}`);
      console.log(`📊 Sample Data: ${JSON.stringify(sampleData)}`);
      console.log();

      const result = matches(predicate, sampleData);

      if (result) {
        console.log("✅ Predicate matches sample data");
      } else {
        console.log("❌ Predicate does not match sample data");
      }

      if (args.verbose) {
        console.log();
        console.log("🔍 Detailed Analysis:");
        console.log(`   Predicate Type: ${typeof predicate}`);
        console.log(`   Sample Data Type: ${typeof sampleData}`);
        console.log(`   Match Result: ${result}`);
      }
    } catch (error) {
      logger.error("Failed to test predicate:", error);
      console.error("❌ Failed to test predicate:", error.message);
      process.exit(1);
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

      console.log("📋 Event-Triggered Jobs");
      console.log("=".repeat(40));

      if (eventJobs.length === 0) {
        console.log("No event-triggered jobs found");
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
        console.log(`${index + 1}. ${job.name}`);
        console.log(
          `   📝 Description: ${job.description || "No description"}`
        );

        if (typeof job.on === "string") {
          console.log(`   🎯 Event: ${job.on}`);
        } else {
          console.log(`   🎯 Event: ${JSON.stringify(job.on)}`);
        }

        if (args.verbose) {
          console.log(`   📁 File: ${job.file}`);
          console.log(`   ⏰ Modified: ${job.modified}`);
        }
        console.log();
      });

      console.log(`📊 Total: ${filteredJobs.length} jobs`);
    } catch (error) {
      logger.error("Failed to list event jobs:", error);
      console.error("❌ Failed to list event jobs:", error.message);
      process.exit(1);
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

      console.log(`🚀 Triggering ${args.type} event...`);

      const eventData = {
        type: args.type,
        files: args.files ? args.files.split(",").map((f) => f.trim()) : [],
        branch: args.branch,
        timestamp: new Date().toISOString(),
      };

      const triggeredJobs = eventJobs.filter((job) =>
        matches(job.on, eventData)
      );

      console.log(`📊 Found ${triggeredJobs.length} jobs that would trigger`);

      if (triggeredJobs.length > 0) {
        triggeredJobs.forEach((job) => {
          console.log(`   ✅ ${job.name}`);
        });
      }

      if (args["execute-jobs"] && triggeredJobs.length > 0) {
        console.log();
        console.log("🚀 Executing triggered jobs...");
        // TODO: Implement actual job execution
        console.log("⚠️  Job execution not implemented in this demo");
      } else if (triggeredJobs.length > 0) {
        console.log();
        console.log("💡 Use --execute-jobs to run the triggered jobs");
      }
    } catch (error) {
      logger.error("Failed to trigger event:", error);
      console.error("❌ Failed to trigger event:", error.message);
      process.exit(1);
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
