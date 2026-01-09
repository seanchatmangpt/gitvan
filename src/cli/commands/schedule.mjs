#!/usr/bin/env node

/**
 * GitVan Schedule Command - Citty Implementation
 *
 * Provides comprehensive schedule management through CLI
 * Supports listing, applying, enabling, disabling, and managing cron schedules
 */

import { defineCommand } from "citty";
import { useGitVan, withGitVan } from "../../core/context.mjs";
import { useSchedule } from "../../composables/schedule.mjs";
import { createLogger } from "../../utils/logger.mjs";
import { exitWithError } from "../../core/error-handler.mjs";
import consola from "consola";

const logger = createLogger("schedule-cli");

/**
 * List all schedules
 */
const listSubcommand = defineCommand({
  meta: {
    name: "list",
    description: "List all schedules",
    usage: "gitvan schedule list [options]",
    examples: [
      "gitvan schedule list",
      "gitvan schedule list --verbose",
      "gitvan schedule list --enabled-only",
    ],
  },
  args: {
    verbose: {
      type: "boolean",
      description: "Show detailed schedule information",
      default: false,
    },
    "enabled-only": {
      type: "boolean",
      description: "Show only enabled schedules",
      default: false,
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
        const schedule = useSchedule();

        const filterOptions = {};
        if (args["enabled-only"]) {
          filterOptions.enabled = true;
        }

        const schedules = await schedule.list({
          includeMetadata: args.verbose,
          filter: filterOptions,
        });

        if (schedules.length === 0) {
          consola.info("No schedules found");
          return;
        }

        // Format output
        if (args.format === "json") {
          logger.info(JSON.stringify(schedules, null, 2));
        } else if (args.format === "yaml") {
          for (const s of schedules) {
            logger.info(`- id: ${s.id}`);
            logger.info(`  name: ${s.name}`);
            logger.info(`  cron: ${s.cron}`);
            logger.info(`  jobId: ${s.jobId}`);
            logger.info(`  enabled: ${s.enabled}`);
            logger.info(`  timezone: ${s.timezone}`);
          }
        } else {
          // Table format
          logger.info("\n⏰ Schedules");
          logger.info("=".repeat(90));
          logger.info(
            `${"ID".padEnd(20)} ${"Cron".padEnd(15)} ${"Job".padEnd(20)} ${"Status".padEnd(10)} ${"TZ".padEnd(10)}`
          );
          logger.info("=".repeat(90));

          for (const s of schedules) {
            const id = s.id.length > 18 ? s.id.slice(0, 17) + "…" : s.id.padEnd(20);
            const cron =
              s.cron.length > 13 ? s.cron.slice(0, 12) + "…" : s.cron.padEnd(15);
            const jobId =
              s.jobId.length > 18 ? s.jobId.slice(0, 17) + "…" : s.jobId.padEnd(20);
            const status = s.enabled ? "✓ Enabled" : "✗ Disabled";
            const tz = s.timezone.padEnd(10);

            logger.info(`${id} ${cron} ${jobId} ${status.padEnd(10)} ${tz}`);

            if (args.verbose) {
              logger.info(`  Name: ${s.name}`);
              logger.info(`  Description: ${s.description}`);
              logger.info(`  File: ${s.file}`);
              logger.info("");
            }
          }

          logger.info("=".repeat(90));
          logger.info(`Total: ${schedules.length} schedule(s)\n`);
        }
      });
    } catch (error) {
      logger.error("Failed to list schedules:", error);
      consola.error(`Failed to list schedules: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Apply a schedule (create or update)
 */
const applySubcommand = defineCommand({
  meta: {
    name: "apply",
    description: "Apply a schedule to a job",
    usage: "gitvan schedule apply <job-id> <cron-expression> [options]",
    examples: [
      'gitvan schedule apply my-job "*/5 * * * *"',
      'gitvan schedule apply my-job "0 0 * * *" --name "Daily Backup"',
      'gitvan schedule apply my-job "0 */6 * * *" --disable',
      'gitvan schedule apply my-job "*/15 * * * *" --timezone America/New_York',
    ],
  },
  args: {
    jobId: {
      type: "positional",
      description: "Job ID to schedule",
      required: true,
    },
    cronExpression: {
      type: "positional",
      description: 'Cron expression (e.g., "*/5 * * * *")',
      required: true,
    },
    name: {
      type: "string",
      description: "Schedule name",
    },
    description: {
      type: "string",
      description: "Schedule description",
    },
    disable: {
      type: "boolean",
      description: "Create schedule in disabled state",
      default: false,
    },
    restart: {
      type: "boolean",
      description: "Restart scheduler after applying",
      default: false,
    },
    timezone: {
      type: "string",
      description: "Timezone (e.g., UTC, America/New_York)",
      default: "UTC",
    },
  },
  async run({ args }) {
    try {
      await withGitVan({ cwd: process.cwd() }, async () => {
        const schedule = useSchedule();

        // Generate schedule ID from job ID
        const scheduleId = `${args.jobId}-schedule`;

        consola.start(`Applying schedule to job: ${args.jobId}`);
        consola.info(`Cron expression: ${args.cronExpression}`);
        consola.info(`Timezone: ${args.timezone}`);

        const scheduleDef = await schedule.add(
          scheduleId,
          args.cronExpression,
          args.jobId,
          {
            name: args.name || `${args.jobId} Schedule`,
            description: args.description || `Automated schedule for ${args.jobId}`,
            enabled: !args.disable,
            timezone: args.timezone,
          }
        );

        consola.success(`Schedule applied: ${scheduleId}`);
        logger.info("\n📅 Schedule Details:");
        logger.info(`  ID: ${scheduleDef.id}`);
        logger.info(`  Name: ${scheduleDef.name}`);
        logger.info(`  Cron: ${scheduleDef.cron}`);
        logger.info(`  Job: ${scheduleDef.jobId}`);
        logger.info(`  Enabled: ${scheduleDef.enabled}`);
        logger.info(`  Timezone: ${scheduleDef.timezone}\n`);

        if (args.restart) {
          consola.start("Restarting scheduler...");
          await schedule.startScheduler({ timezone: args.timezone });
          consola.success("Scheduler restarted");
        }
      });
    } catch (error) {
      logger.error("Failed to apply schedule:", error);
      consola.error(`Failed to apply schedule: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Enable a schedule
 */
const enableSubcommand = defineCommand({
  meta: {
    name: "enable",
    description: "Enable a schedule",
    usage: "gitvan schedule enable <schedule-id>",
    examples: ["gitvan schedule enable my-job-schedule"],
  },
  args: {
    scheduleId: {
      type: "positional",
      description: "Schedule ID to enable",
      required: true,
    },
  },
  async run({ args }) {
    try {
      await withGitVan({ cwd: process.cwd() }, async () => {
        const schedule = useSchedule();

        consola.start(`Enabling schedule: ${args.scheduleId}`);
        await schedule.enable(args.scheduleId);
        consola.success(`Schedule enabled: ${args.scheduleId}`);
      });
    } catch (error) {
      logger.error(`Failed to enable schedule ${args.scheduleId}:`, error);
      consola.error(`Failed to enable schedule: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Disable a schedule
 */
const disableSubcommand = defineCommand({
  meta: {
    name: "disable",
    description: "Disable a schedule",
    usage: "gitvan schedule disable <schedule-id>",
    examples: ["gitvan schedule disable my-job-schedule"],
  },
  args: {
    scheduleId: {
      type: "positional",
      description: "Schedule ID to disable",
      required: true,
    },
  },
  async run({ args }) {
    try {
      await withGitVan({ cwd: process.cwd() }, async () => {
        const schedule = useSchedule();

        consola.start(`Disabling schedule: ${args.scheduleId}`);
        await schedule.disable(args.scheduleId);
        consola.success(`Schedule disabled: ${args.scheduleId}`);
      });
    } catch (error) {
      logger.error(`Failed to disable schedule ${args.scheduleId}:`, error);
      consola.error(`Failed to disable schedule: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Remove a schedule
 */
const removeSubcommand = defineCommand({
  meta: {
    name: "remove",
    description: "Remove a schedule",
    usage: "gitvan schedule remove <schedule-id>",
    examples: ["gitvan schedule remove my-job-schedule"],
  },
  args: {
    scheduleId: {
      type: "positional",
      description: "Schedule ID to remove",
      required: true,
    },
  },
  async run({ args }) {
    try {
      await withGitVan({ cwd: process.cwd() }, async () => {
        const schedule = useSchedule();

        consola.start(`Removing schedule: ${args.scheduleId}`);
        await schedule.remove(args.scheduleId);
        consola.success(`Schedule removed: ${args.scheduleId}`);
      });
    } catch (error) {
      logger.error(`Failed to remove schedule ${args.scheduleId}:`, error);
      consola.error(`Failed to remove schedule: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Get schedule status
 */
const statusSubcommand = defineCommand({
  meta: {
    name: "status",
    description: "Get schedule status",
    usage: "gitvan schedule status <schedule-id>",
    examples: ["gitvan schedule status my-job-schedule"],
  },
  args: {
    scheduleId: {
      type: "positional",
      description: "Schedule ID to check",
      required: true,
    },
  },
  async run({ args }) {
    try {
      await withGitVan({ cwd: process.cwd() }, async () => {
        const schedule = useSchedule();
        const status = await schedule.status(args.scheduleId);

        logger.info("\n📊 Schedule Status");
        logger.info("=".repeat(80));
        logger.info(`Schedule: ${status.id}`);
        logger.info(`Enabled: ${status.enabled ? "Yes" : "No"}`);
        logger.info(`Cron: ${status.cron}`);
        logger.info(`Job: ${status.jobId}`);
        logger.info(`Last Run: ${status.lastRun || "Never"}`);
        logger.info(`Last Status: ${status.lastStatus || "N/A"}`);
        logger.info(`Total Runs: ${status.totalRuns}`);
        logger.info(`Success Rate: ${status.successRate}%`);
        logger.info("=".repeat(80) + "\n");
      });
    } catch (error) {
      logger.error(`Failed to get schedule status for ${args.scheduleId}:`, error);
      consola.error(`Failed to get schedule status: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Validate schedules
 */
const validateSubcommand = defineCommand({
  meta: {
    name: "validate",
    description: "Validate schedule(s)",
    usage: "gitvan schedule validate [schedule-id]",
    examples: [
      "gitvan schedule validate my-job-schedule",
      "gitvan schedule validate --all",
    ],
  },
  args: {
    scheduleId: {
      type: "positional",
      description: "Schedule ID to validate",
      required: false,
    },
    all: {
      type: "boolean",
      description: "Validate all schedules",
      default: false,
    },
  },
  async run({ args }) {
    try {
      await withGitVan({ cwd: process.cwd() }, async () => {
        const schedule = useSchedule();

        if (args.all) {
          consola.start("Validating all schedules...");
          const results = await schedule.validateAll();

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
        } else if (args.scheduleId) {
          consola.start(`Validating schedule: ${args.scheduleId}`);
          const result = await schedule.validate(args.scheduleId);

          logger.info("\n📋 Validation Result");
          logger.info("=".repeat(80));
          logger.info(`Schedule: ${result.id}`);
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
          consola.error("Please specify a schedule ID or use --all flag");
          await exitWithError(new Error("Operation failed"), 1);
        }
      });
    } catch (error) {
      logger.error("Failed to validate schedule:", error);
      consola.error(`Failed to validate schedule: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Run a schedule manually
 */
const runSubcommand = defineCommand({
  meta: {
    name: "run",
    description: "Manually run a schedule",
    usage: "gitvan schedule run <schedule-id>",
    examples: ["gitvan schedule run my-job-schedule"],
  },
  args: {
    scheduleId: {
      type: "positional",
      description: "Schedule ID to run",
      required: true,
    },
  },
  async run({ args }) {
    try {
      await withGitVan({ cwd: process.cwd() }, async () => {
        const schedule = useSchedule();

        consola.start(`Running schedule: ${args.scheduleId}`);
        const result = await schedule.run(args.scheduleId);
        consola.success(`Schedule completed: ${args.scheduleId}`);

        if (result && typeof result === "object") {
          logger.info("\nResult:");
          logger.info(JSON.stringify(result, null, 2));
        }
      });
    } catch (error) {
      logger.error(`Failed to run schedule ${args.scheduleId}:`, error);
      consola.error(`Failed to run schedule: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Main schedule command with all subcommands
 */
export const scheduleCommand = defineCommand({
  meta: {
    name: "schedule",
    description: "Manage GitVan Schedules",
    usage: "gitvan schedule <subcommand> [options]",
    examples: [
      "gitvan schedule list",
      'gitvan schedule apply my-job "*/5 * * * *"',
      "gitvan schedule enable my-job-schedule",
      "gitvan schedule disable my-job-schedule",
      "gitvan schedule status my-job-schedule",
      "gitvan schedule validate --all",
      "gitvan schedule run my-job-schedule",
    ],
  },
  subCommands: {
    list: listSubcommand,
    apply: applySubcommand,
    enable: enableSubcommand,
    disable: disableSubcommand,
    remove: removeSubcommand,
    status: statusSubcommand,
    validate: validateSubcommand,
    run: runSubcommand,
  },
});

export default scheduleCommand;
