/**
 * GitVan v2 Daemon CLI - Daemon management commands
 * Provides commands for starting, stopping, and monitoring the daemon
 */

import { startDaemon, daemonStatus, stopDaemon } from "../runtime/daemon.mjs";
import { createLogger } from "../utils/logger.mjs";

const logger = createLogger("daemon-cli");

/**
 * Daemon CLI command handler
 * @param {string} subcommand - Subcommand (start, stop, status, restart)
 * @param {object} args - Command arguments
 * @returns {Promise<void>}
 */
export async function daemonCommand(subcommand = "start", args = {}) {
  switch (subcommand) {
    case "start":
      return await startDaemonCommand(args);

    case "stop":
      return await stopDaemonCommand();

    case "status":
      return await statusCommand();

    case "restart":
      return await restartCommand(args);

    default:
      throw new Error(`Unknown daemon subcommand: ${subcommand}`);
  }
}

/**
 * Start daemon command
 * @param {object} args - Start arguments
 * @returns {Promise<void>}
 */
async function startDaemonCommand(args) {
  try {
    console.log("Starting GitVan daemon...");

    const options = {
      rootDir: args.rootDir || process.cwd(),
      worktrees: args.worktrees || "current",
      ...args,
    };

    await startDaemon(options);

    console.log("Daemon started successfully");
    console.log(`  Root: ${options.rootDir}`);
    console.log(`  Worktrees: ${options.worktrees}`);
  } catch (error) {
    logger.error("Failed to start daemon:", error.message);
    throw error;
  }
}

/**
 * Stop daemon command
 * @returns {Promise<void>}
 */
async function stopDaemonCommand() {
  try {
    console.log("Stopping GitVan daemon...");

    await stopDaemon();

    console.log("Daemon stopped successfully");
  } catch (error) {
    logger.error("Failed to stop daemon:", error.message);
    throw error;
  }
}

/**
 * Status command
 * @returns {Promise<void>}
 */
async function statusCommand() {
  try {
    const status = await daemonStatus();

    console.log("GitVan Daemon Status:");
    console.log(`  Running: ${status.running ? "Yes" : "No"}`);

    if (status.running) {
      console.log(`  PID: ${status.pid || "Unknown"}`);
      console.log(`  Uptime: ${status.uptime || "Unknown"}`);
      console.log(`  Worktrees: ${status.worktrees || "Unknown"}`);
    }

    if (status.jobs) {
      console.log(`  Active Jobs: ${status.jobs.active || 0}`);
      console.log(`  Completed Jobs: ${status.jobs.completed || 0}`);
      console.log(`  Failed Jobs: ${status.jobs.failed || 0}`);
    }
  } catch (error) {
    logger.error("Failed to get daemon status:", error.message);
    throw error;
  }
}

/**
 * Restart daemon command
 * @param {object} args - Restart arguments
 * @returns {Promise<void>}
 */
async function restartCommand(args) {
  try {
    console.log("Restarting GitVan daemon...");

    await stopDaemon();

    // Wait a moment for cleanup
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await startDaemonCommand(args);

    console.log("Daemon restarted successfully");
  } catch (error) {
    logger.error("Failed to restart daemon:", error.message);
    throw error;
  }
}

