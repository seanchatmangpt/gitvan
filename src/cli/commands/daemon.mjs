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
      console.log("🚀 Starting GitVan daemon...");

      const options = {
        rootDir: args["root-dir"],
        worktrees: args.worktrees,
        autoStart: args["auto-start"],
        port: args.port,
      };

      await startDaemon(options);

      console.log("✅ GitVan daemon started successfully");
      console.log(`📁 Monitoring: ${options.rootDir}`);
      console.log(`🌳 Worktrees: ${options.worktrees}`);
      console.log(`🔌 Port: ${options.port}`);
    } catch (error) {
      logger.error("Failed to start daemon:", error);
      console.error("❌ Failed to start daemon:", error.message);
      process.exit(1);
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
      console.log("🛑 Stopping GitVan daemon...");

      await stopDaemon({ force: args.force });

      console.log("✅ GitVan daemon stopped successfully");
    } catch (error) {
      logger.error("Failed to stop daemon:", error);
      console.error("❌ Failed to stop daemon:", error.message);
      process.exit(1);
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

      console.log("📊 GitVan Daemon Status");
      console.log("=".repeat(30));

      if (status.running) {
        console.log("🟢 Status: Running");
        console.log(`📁 Root Directory: ${status.rootDir}`);
        console.log(`⏰ Started: ${status.startedAt}`);
        console.log(`🔄 Uptime: ${status.uptime}`);

        if (args.verbose) {
          console.log(`🌳 Worktrees: ${status.worktrees?.length || 0}`);
          console.log(`📊 Jobs Executed: ${status.jobsExecuted || 0}`);
          console.log(`🔌 Port: ${status.port || "N/A"}`);
        }
      } else {
        console.log("🔴 Status: Not Running");
        console.log(`📁 Root Directory: ${args["root-dir"]}`);
      }
    } catch (error) {
      logger.error("Failed to get daemon status:", error);
      console.error("❌ Failed to get daemon status:", error.message);
      process.exit(1);
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
      console.log("🔄 Restarting GitVan daemon...");

      // Stop daemon first
      try {
        await stopDaemon({ force: args.force });
        console.log("✅ Daemon stopped");
      } catch (error) {
        if (!args.force) {
          throw error;
        }
        console.log("⚠️  Force stopping daemon");
      }

      // Start daemon
      const options = {
        rootDir: args["root-dir"],
        worktrees: args.worktrees,
        autoStart: args["auto-start"],
        port: args.port,
      };

      await startDaemon(options);

      console.log("✅ GitVan daemon restarted successfully");
      console.log(`📁 Monitoring: ${options.rootDir}`);
      console.log(`🌳 Worktrees: ${options.worktrees}`);
      console.log(`🔌 Port: ${options.port}`);
    } catch (error) {
      logger.error("Failed to restart daemon:", error);
      console.error("❌ Failed to restart daemon:", error.message);
      process.exit(1);
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
