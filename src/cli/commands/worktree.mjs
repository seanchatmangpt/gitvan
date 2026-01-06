#!/usr/bin/env node

/**
 * GitVan Worktree Command - Citty Implementation
 *
 * Provides comprehensive Git worktree management through CLI
 * Supports listing, creating, removing, and repairing worktrees
 */

import { defineCommand } from "citty";
import { useGitVan, withGitVan } from "../../core/context.mjs";
import { useWorktree } from "../../composables/worktree.mjs";
import { createLogger } from "../../utils/logger.mjs";
import consola from "consola";

const logger = createLogger("worktree-cli");

/**
 * List all worktrees
 */
const listSubcommand = defineCommand({
  meta: {
    name: "list",
    description: "List all Git worktrees",
    usage: "gitvan worktree list [options]",
    examples: [
      "gitvan worktree list",
      "gitvan worktree list --verbose",
      "gitvan worktree list --format json",
    ],
  },
  args: {
    verbose: {
      type: "boolean",
      description: "Show detailed worktree information",
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
        const worktree = useWorktree();
        const worktrees = await worktree.list();

        if (worktrees.length === 0) {
          consola.info("No worktrees found");
          return;
        }

        // Format output
        if (args.format === "json") {
          logger.info(JSON.stringify(worktrees, null, 2));
        } else if (args.format === "yaml") {
          for (const wt of worktrees) {
            logger.info(`- path: ${wt.path}`);
            logger.info(`  branch: ${wt.branch || "N/A"}`);
            logger.info(`  head: ${wt.head}`);
            logger.info(`  isMain: ${wt.isMain}`);
            if (wt.detached) {
              logger.info(`  detached: true`);
            }
          }
        } else {
          // Table format
          logger.info("\n🌳 Git Worktrees");
          logger.info("=".repeat(90));
          logger.info(
            `${"Path".padEnd(40)} ${"Branch".padEnd(25)} ${"Status".padEnd(15)}`
          );
          logger.info("=".repeat(90));

          for (const wt of worktrees) {
            const path =
              wt.path.length > 38 ? "..." + wt.path.slice(-35) : wt.path.padEnd(40);
            const branch = (wt.branch || "N/A").padEnd(25);
            const status = wt.isMain
              ? "Main"
              : wt.detached
                ? "Detached"
                : "Linked";

            const marker = wt.isMain ? "●" : "○";
            logger.info(`${marker} ${path} ${branch} ${status.padEnd(15)}`);

            if (args.verbose) {
              logger.info(`  HEAD: ${wt.head}`);
              logger.info("");
            }
          }

          logger.info("=".repeat(90));
          logger.info(`Total: ${worktrees.length} worktree(s)\n`);
        }
      });
    } catch (error) {
      logger.error("Failed to list worktrees:", error);
      consola.error(`Failed to list worktrees: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Create a new worktree
 */
const createSubcommand = defineCommand({
  meta: {
    name: "create",
    description: "Create a new Git worktree",
    usage: "gitvan worktree create <path> [branch] [options]",
    examples: [
      "gitvan worktree create ../my-feature feature/my-feature",
      "gitvan worktree create ../hotfix hotfix --start-from main",
      "gitvan worktree create ../experiment experiment",
    ],
  },
  args: {
    path: {
      type: "positional",
      description: "Path for the new worktree",
      required: true,
    },
    branch: {
      type: "positional",
      description: "Branch name for the worktree",
      required: false,
    },
    "start-from": {
      type: "string",
      description: "Starting point (branch/commit)",
      default: "HEAD",
    },
  },
  async run({ args }) {
    try {
      await withGitVan({ cwd: process.cwd() }, async () => {
        const worktree = useWorktree();

        consola.start(`Creating worktree at: ${args.path}`);
        if (args.branch) {
          consola.info(`Branch: ${args.branch}`);
        }
        if (args["start-from"] !== "HEAD") {
          consola.info(`Starting from: ${args["start-from"]}`);
        }

        const result = await worktree.create(args.path, args.branch, {
          startFrom: args["start-from"],
        });

        consola.success(`Worktree created successfully`);
        logger.info("\n🌳 Worktree Details:");
        logger.info(`  Path: ${result.path}`);
        logger.info(`  Branch: ${result.branch}\n`);
      });
    } catch (error) {
      logger.error("Failed to create worktree:", error);
      consola.error(`Failed to create worktree: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Remove a worktree
 */
const removeSubcommand = defineCommand({
  meta: {
    name: "remove",
    description: "Remove a Git worktree",
    usage: "gitvan worktree remove <path> [options]",
    examples: [
      "gitvan worktree remove ../my-feature",
      "gitvan worktree remove ../my-feature --force",
    ],
  },
  args: {
    path: {
      type: "positional",
      description: "Path of the worktree to remove",
      required: true,
    },
    force: {
      type: "boolean",
      description: "Force removal even with uncommitted changes",
      default: false,
    },
  },
  async run({ args }) {
    try {
      await withGitVan({ cwd: process.cwd() }, async () => {
        const worktree = useWorktree();

        consola.start(`Removing worktree: ${args.path}`);
        if (args.force) {
          consola.warn("Force mode enabled - uncommitted changes will be lost");
        }

        await worktree.remove(args.path, { force: args.force });

        consola.success(`Worktree removed: ${args.path}`);
      });
    } catch (error) {
      logger.error(`Failed to remove worktree ${args.path}:`, error);
      consola.error(`Failed to remove worktree: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Prune worktrees
 */
const pruneSubcommand = defineCommand({
  meta: {
    name: "prune",
    description: "Prune worktree information",
    usage: "gitvan worktree prune",
    examples: ["gitvan worktree prune"],
  },
  async run() {
    try {
      await withGitVan({ cwd: process.cwd() }, async () => {
        const worktree = useWorktree();

        consola.start("Pruning worktree information...");
        await worktree.prune();
        consola.success("Worktree information pruned");
      });
    } catch (error) {
      logger.error("Failed to prune worktrees:", error);
      consola.error(`Failed to prune worktrees: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Repair a worktree
 */
const repairSubcommand = defineCommand({
  meta: {
    name: "repair",
    description: "Repair worktree administrative files",
    usage: "gitvan worktree repair <path>",
    examples: ["gitvan worktree repair ../my-feature"],
  },
  args: {
    path: {
      type: "positional",
      description: "Path of the worktree to repair",
      required: true,
    },
  },
  async run({ args }) {
    try {
      await withGitVan({ cwd: process.cwd() }, async () => {
        const worktree = useWorktree();

        consola.start(`Repairing worktree: ${args.path}`);
        await worktree.repair(args.path);
        consola.success(`Worktree repaired: ${args.path}`);
      });
    } catch (error) {
      logger.error(`Failed to repair worktree ${args.path}:`, error);
      consola.error(`Failed to repair worktree: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Get current worktree info
 */
const infoSubcommand = defineCommand({
  meta: {
    name: "info",
    description: "Show current worktree information",
    usage: "gitvan worktree info",
    examples: ["gitvan worktree info"],
  },
  async run() {
    try {
      await withGitVan({ cwd: process.cwd() }, async () => {
        const worktree = useWorktree();
        const info = await worktree.info();

        logger.info("\n🌳 Current Worktree Information");
        logger.info("=".repeat(80));
        logger.info(`Worktree: ${info.worktree}`);
        logger.info(`Branch: ${info.branch}`);
        logger.info(`HEAD: ${info.head}`);
        logger.info(`Common Dir: ${info.commonDir}`);
        logger.info("=".repeat(80) + "\n");
      });
    } catch (error) {
      logger.error("Failed to get worktree info:", error);
      consola.error(`Failed to get worktree info: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Get worktree status
 */
const statusSubcommand = defineCommand({
  meta: {
    name: "status",
    description: "Show worktree status",
    usage: "gitvan worktree status",
    examples: ["gitvan worktree status"],
  },
  async run() {
    try {
      await withGitVan({ cwd: process.cwd() }, async () => {
        const worktree = useWorktree();
        const status = await worktree.status();

        logger.info("\n📊 Worktree Status");
        logger.info("=".repeat(80));
        logger.info("\nCurrent Worktree:");
        logger.info(`  Path: ${status.current.path}`);
        logger.info(`  Branch: ${status.current.branch}`);
        logger.info(`  HEAD: ${status.current.head}`);
        logger.info(`  Is Main: ${status.isMain ? "Yes" : "No"}`);
        logger.info(`\nTotal Worktrees: ${status.count}`);
        logger.info("=".repeat(80) + "\n");
      });
    } catch (error) {
      logger.error("Failed to get worktree status:", error);
      consola.error(`Failed to get worktree status: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Switch to a worktree
 */
const switchSubcommand = defineCommand({
  meta: {
    name: "switch",
    description: "Switch to a different worktree",
    usage: "gitvan worktree switch <path>",
    examples: ["gitvan worktree switch ../my-feature"],
  },
  args: {
    path: {
      type: "positional",
      description: "Path of the worktree to switch to",
      required: true,
    },
  },
  async run({ args }) {
    try {
      await withGitVan({ cwd: process.cwd() }, async () => {
        const worktree = useWorktree();

        consola.start(`Switching to worktree: ${args.path}`);
        await worktree.switchTo(args.path);
        consola.success(`Switched to: ${args.path}`);
      });
    } catch (error) {
      logger.error(`Failed to switch to worktree ${args.path}:`, error);
      consola.error(`Failed to switch to worktree: ${error.message}`);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Main worktree command with all subcommands
 */
export const worktreeCommand = defineCommand({
  meta: {
    name: "worktree",
    description: "Manage Git Worktrees",
    usage: "gitvan worktree <subcommand> [options]",
    examples: [
      "gitvan worktree list",
      "gitvan worktree create ../my-feature feature/my-feature",
      "gitvan worktree remove ../my-feature",
      "gitvan worktree repair ../my-feature",
      "gitvan worktree prune",
      "gitvan worktree info",
      "gitvan worktree status",
      "gitvan worktree switch ../my-feature",
    ],
  },
  subCommands: {
    list: listSubcommand,
    create: createSubcommand,
    remove: removeSubcommand,
    prune: pruneSubcommand,
    repair: repairSubcommand,
    info: infoSubcommand,
    status: statusSubcommand,
    switch: switchSubcommand,
  },
});

export default worktreeCommand;
