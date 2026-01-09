/**
 * GitVan Daemon Command - Citty Implementation
 *
 * Proper Citty-based implementation of daemon management commands
 */

import { defineCommand } from "citty";
import {
  startDaemon,
  daemonStatus,
  stopDaemon,
} from "../../runtime/daemon.mjs";
import { createLogger } from "../../utils/logger.mjs";
import { exitWithError } from "../../core/error-handler.mjs";
import consola from "consola";

const logger = createLogger("daemon-cli");

/**
 * Start daemon subcommand
 */
const startSubcommand = defineCommand({
  meta: {
    name: "start",
    description: "Start GitVan daemon",
  },
  args: {
    "root-dir": {
      type: "string",
      description: "Root directory for daemon",
      default: process.cwd(),
    },
    worktrees: {
      type: "string",
      description: "Worktrees to monitor (current, all)",
      default: "current",
    },
    "auto-start": {
      type: "boolean",
      description: "Auto-start daemon on system boot",
      default: false,
    },
    port: {
      type: "number",
      description: "Daemon port number",
      default: 3000,
    },
  },
  async run({ args }) {
    try {
      logger.info("🚀 Starting GitVan daemon...");

      const options = {
        rootDir: args["root-dir"],
        worktrees: args.worktrees,
        autoStart: args["auto-start"],
        port: args.port,
      };

      await startDaemon(options);

      logger.info("✅ GitVan daemon started successfully");
      logger.info(`📁 Monitoring: ${options.rootDir}`);
      logger.info(`🌳 Worktrees: ${options.worktrees}`);
      logger.info(`🔌 Port: ${options.port}`);
    } catch (error) {
      logger.error("Failed to start daemon:", error);
      logger.error("❌ Failed to start daemon:", error.message);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Stop daemon subcommand
 */
const stopSubcommand = defineCommand({
  meta: {
    name: "stop",
    description: "Stop GitVan daemon",
  },
  args: {
    force: {
      type: "boolean",
      description: "Force stop daemon",
      default: false,
    },
  },
  async run({ args }) {
    try {
      logger.info("🛑 Stopping GitVan daemon...");

      await stopDaemon({ force: args.force });

      logger.info("✅ GitVan daemon stopped successfully");
    } catch (error) {
      logger.error("Failed to stop daemon:", error);
      logger.error("❌ Failed to stop daemon:", error.message);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Status daemon subcommand
 */
const statusSubcommand = defineCommand({
  meta: {
    name: "status",
    description: "Check GitVan daemon status",
  },
  args: {
    "root-dir": {
      type: "string",
      description: "Root directory to check",
      default: process.cwd(),
    },
    verbose: {
      type: "boolean",
      description: "Show verbose status information",
      default: false,
    },
  },
  async run({ args }) {
    try {
      const status = await daemonStatus(args["root-dir"]);

      logger.info("📊 GitVan Daemon Status");
      logger.info("=".repeat(30));

      if (status.running) {
        logger.info("🟢 Status: Running");
        logger.info(`📁 Root Directory: ${status.rootDir}`);
        logger.info(`⏰ Started: ${status.startedAt}`);
        logger.info(`🔄 Uptime: ${status.uptime}`);

        if (args.verbose) {
          logger.info(`🌳 Worktrees: ${status.worktrees?.length || 0}`);
          logger.info(`📊 Jobs Executed: ${status.jobsExecuted || 0}`);
          logger.info(`🔌 Port: ${status.port || "N/A"}`);
        }
      } else {
        logger.info("🔴 Status: Not Running");
        logger.info(`📁 Root Directory: ${args["root-dir"]}`);
      }
    } catch (error) {
      logger.error("Failed to get daemon status:", error);
      logger.error("❌ Failed to get daemon status:", error.message);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Restart daemon subcommand
 */
const restartSubcommand = defineCommand({
  meta: {
    name: "restart",
    description: "Restart GitVan daemon",
  },
  args: {
    "root-dir": {
      type: "string",
      description: "Root directory for daemon",
      default: process.cwd(),
    },
    worktrees: {
      type: "string",
      description: "Worktrees to monitor (current, all)",
      default: "current",
    },
    "auto-start": {
      type: "boolean",
      description: "Auto-start daemon on system boot",
      default: false,
    },
    port: {
      type: "number",
      description: "Daemon port number",
      default: 3000,
    },
    force: {
      type: "boolean",
      description: "Force restart daemon",
      default: false,
    },
  },
  async run({ args }) {
    try {
      logger.info("🔄 Restarting GitVan daemon...");

      // Stop daemon first
      try {
        await stopDaemon({ force: args.force });
        logger.info("✅ Daemon stopped");
      } catch (error) {
        if (!args.force) {
          throw error;
        }
        logger.info("⚠️  Force stopping daemon");
      }

      // Start daemon
      const options = {
        rootDir: args["root-dir"],
        worktrees: args.worktrees,
        autoStart: args["auto-start"],
        port: args.port,
      };

      await startDaemon(options);

      logger.info("✅ GitVan daemon restarted successfully");
      logger.info(`📁 Monitoring: ${options.rootDir}`);
      logger.info(`🌳 Worktrees: ${options.worktrees}`);
      logger.info(`🔌 Port: ${options.port}`);
    } catch (error) {
      logger.error("Failed to restart daemon:", error);
      logger.error("❌ Failed to restart daemon:", error.message);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Main daemon command with all subcommands
 */
export const daemonCommand = defineCommand({
  meta: {
    name: "daemon",
    description: "Manage GitVan daemon (start, stop, status, restart)",
  },
  subCommands: {
    start: startSubcommand,
    stop: stopSubcommand,
    status: statusSubcommand,
    restart: restartSubcommand,
  },
});

export default daemonCommand;
