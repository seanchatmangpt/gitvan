#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "pathe";
import { GitVanDaemon, startDaemon } from "./runtime/daemon.mjs";
import { discoverEvents, loadEventDefinition } from "./runtime/events.mjs";
import { readReceiptsRange } from "./runtime/receipt.mjs";
import {
import { createLogger } from "./utils/logger.mjs";
const logger = createLogger("cli-old");
  discoverJobs,
  findJobFile,
  findAllJobs,
  loadJobDefinition,
} from "./runtime/jobs.mjs";
import { useGit } from "./composables/git/index.mjs";
import { runJobWithContext } from "./runtime/boot.mjs";
import { loadConfig } from "./runtime/config.mjs";

// Import new CLI commands
import { cronCommand } from "./cli/cron.mjs";
import { daemonCommand } from "./cli/daemon.mjs";
import { eventCommand } from "./cli/event.mjs";
import { auditCommand } from "./cli/audit.mjs";
import { chatCommand } from "./cli/chat.mjs";
import { graphCommand } from "./cli/graph-command.mjs";

const commands = {
  daemon: handleDaemon,
  run: handleRun,
  list: handleList,
  event: handleEvent,
  schedule: handleSchedule,
  worktree: handleWorktree,
  job: handleJob,
  help: handleHelp,

  // New v2 commands
  cron: cronCommand,
  audit: auditCommand,
  chat: handleChat,
  llm: handleLLM,
  graph: graphCommand,
};

async function main() {
  const [, , command, ...args] = process.argv;

  if (!command || command === "help") {
    handleHelp();
    return;
  }

  const handler = commands[command];
  if (!handler) {
    logger.error(`Unknown command: ${command}`);
    handleHelp();
    await exitWithError(new Error("Operation failed"), 1);
  }

  try {
    await handler(...args);
  } catch (err) {
    logger.error("Error:", err.message);
    await exitWithError(new Error("Operation failed"), 1);
  }
}

async function handleDaemon(action = "start", ...options) {
  const worktreePath = process.cwd();

  // Parse options
  const opts = {};
  for (let i = 0; i < options.length; i += 2) {
    const key = options[i]?.replace(/^--/, "");
    const value = options[i + 1];
    if (key) opts[key] = value;
  }

  switch (action) {
    case "start":
      if (opts.worktrees === "all") {
        logger.info("Starting daemon for all worktrees...");
        await startDaemon({ rootDir: worktreePath }, null, "all");
      } else {
        const daemon = new GitVanDaemon(worktreePath);
        await daemon.start();
      }
      break;
    case "stop":
      const daemon = new GitVanDaemon(worktreePath);
      daemon.stop();
      break;
    case "status":
      const statusDaemon = new GitVanDaemon(worktreePath);
      logger.info(
        `Daemon ${
          statusDaemon.isRunning() ? "running" : "not running"
        } for: ${worktreePath}`
      );
      break;
    default:
      logger.error(`Unknown daemon action: ${action}`);
      await exitWithError(new Error("Operation failed"), 1);
  }
}

async function handleEvent(action = "list", ...args) {
  // Use new event command handler
  return await eventCommand(action, parseArgs(args));
}

async function handleChat(action = "draft", ...args) {
  // Use new chat command handler
  return await chatCommand(action, parseArgs(args));
}

function parseArgs(args) {
  const parsed = {};
  let positionalIndex = 0;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith("--")) {
      // Named argument
      const key = arg.replace(/^--/, "");
      const value = args[i + 1];
      if (value && !value.startsWith("--")) {
        parsed[key] = value;
        i++; // Skip the value
      } else {
        parsed[key] = true;
      }
    } else {
      // Positional argument
      parsed[`arg${positionalIndex}`] = arg;
      positionalIndex++;
    }
  }

  return parsed;
}

async function handleSchedule(action = "apply") {
  switch (action) {
    case "apply":
      logger.info("Schedule management not yet implemented");
      // v4.1.0: Implement cron-like scheduling for advanced job scheduling
      break;
    default:
      logger.error(`Unknown schedule action: ${action}`);
      await exitWithError(new Error("Operation failed"), 1);
  }
}

async function handleWorktree(action = "list") {
  switch (action) {
    case "list":
      try {
        // We need to create a minimal context for Git operations
        const ctx = {
          root: process.cwd(),
          env: process.env,
          now: () => new Date().toISOString(),
        };

        const { withGitVan } = await import("./composables/ctx.mjs");
        await withGitVan(ctx, async () => {
          const git = useGit();
          const worktrees = git.listWorktrees();

          if (worktrees.length === 0) {
            logger.info("No worktrees found");
            return;
          }

          logger.info("\nWorktrees:");
          logger.info("==========");
          for (const wt of worktrees) {
            logger.info(`${wt.path} ${wt.isMain ? "(main)" : ""}`);
            logger.info(`  Branch: ${wt.branch || "detached"}`);
            if (wt.head) logger.info(`  HEAD: ${wt.head.slice(0, 8)}`);
            logger.info();
          }
        });
      } catch (err) {
        logger.error("Error listing worktrees:", err.message);
      }
      break;
    default:
      logger.error(`Unknown worktree action: ${action}`);
      await exitWithError(new Error("Operation failed"), 1);
  }
}

async function handleJob(action = "list", ...args) {
  const worktreePath = process.cwd();
  const jobsDir = join(worktreePath, "jobs");

  switch (action) {
    case "list":
      if (!statSync(jobsDir).isDirectory()) {
        logger.info("No jobs directory found");
        return;
      }

      const jobs = discoverJobs(jobsDir);
      if (jobs.length === 0) {
        logger.info("No jobs found");
        return;
      }

      logger.info("Available jobs:");
      logger.info("==============");
      jobs.forEach((job) => {
        logger.info(`${job.id}`);
        logger.info(`  File: ${job.relativePath}`);
        logger.info(`  Directory: ${job.directory}`);
        logger.info();
      });
      break;

    case "run":
      const nameIndex = args.indexOf("--name");
      if (nameIndex === -1 || !args[nameIndex + 1]) {
        logger.error("Job name required: gitvan job run --name <job-name>");
        await exitWithError(new Error("Operation failed"), 1);
      }
      const jobName = args[nameIndex + 1];

      const jobPath = findJobFile(jobsDir, jobName);
      if (!jobPath) {
        logger.error(`Job not found: ${jobName}`);
        await exitWithError(new Error("Operation failed"), 1);
      }

      try {
        const jobDef = await loadJobDefinition(jobPath);
        if (!jobDef) {
          logger.error(`Failed to load job: ${jobName}`);
          await exitWithError(new Error("Operation failed"), 1);
        }

        const ctx = {
          root: worktreePath,
          env: process.env,
          now: () => new Date().toISOString(),
          nowISO: new Date().toISOString(),
          id: jobName,
          logger: {
            log: logger.log.bind(logger),
            warn: logger.warn.bind(logger),
            error: logger.error.bind(logger),
            info: logger.info.bind(logger),
          },
        };

        logger.info(`Running job: ${jobName}`);
        const result = await runJobWithContext(ctx, jobDef);
        logger.info("Result:", JSON.stringify(result, null, 2));
      } catch (error) {
        logger.error(`Error running job ${jobName}:`, error.message);
        await exitWithError(new Error("Operation failed"), 1);
      }
      break;

    default:
      logger.error(`Unknown job action: ${action}`);
      await exitWithError(new Error("Operation failed"), 1);
  }
}

async function handleRun(jobName) {
  if (!jobName) {
    logger.error("Job name required");
    await exitWithError(new Error("Operation failed"), 1);
  }

  const worktreePath = process.cwd();
  const jobsDir = join(worktreePath, "jobs");
  const jobPath = findJobFile(jobsDir, jobName);

  if (!jobPath) {
    logger.error(`Job not found: ${jobName}`);
    await exitWithError(new Error("Operation failed"), 1);
  }

  try {
    const jobDef = await loadJobDefinition(jobPath);
    if (!jobDef) {
      logger.error(`Failed to load job: ${jobName}`);
      await exitWithError(new Error("Operation failed"), 1);
    }

    const ctx = {
      root: worktreePath,
      env: process.env,
      now: () => new Date().toISOString(),
      nowISO: new Date().toISOString(),
      id: jobName,
      logger: {
        log: console.log,
        warn: console.warn,
        error: console.error,
        info: console.info,
      },
    };

    logger.info(`Running job: ${jobName}`);
    const result = await runJobWithContext(ctx, jobDef);
    logger.info("Result:", JSON.stringify(result, null, 2));
  } catch (error) {
    logger.error(`Error running job ${jobName}:`, error.message);
    await exitWithError(new Error("Operation failed"), 1);
  }
}

function handleList() {
  const worktreePath = process.cwd();
  const jobsDir = join(worktreePath, "jobs");

  if (!statSync(jobsDir).isDirectory()) {
    logger.info("No jobs directory found");
    return;
  }

  const jobs = findAllJobs(jobsDir);
  logger.info("Available jobs:");
  jobs.forEach((job) => logger.info(`  ${job}`));
}

// LLM command handler
async function handleLLM(subcommand = "call", ...args) {
  const { generateText, checkAIAvailability } = await import(
    "./ai/provider.mjs"
  );
  const { loadOptions } = await import("./config/loader.mjs");

  const config = await loadOptions();

  switch (subcommand) {
    case "call":
      if (!args[0]) {
        logger.error('Prompt required: gitvan llm call "<prompt>"');
        await exitWithError(new Error("Operation failed"), 1);
      }

      const prompt = args[0];
      const model = args.includes("--model")
        ? args[args.indexOf("--model") + 1]
        : undefined;

      try {
        const result = await generateText({ prompt, model, config });
        logger.info(result.output);
      } catch (error) {
        logger.error("LLM call failed:", error.message);
        await exitWithError(new Error("Operation failed"), 1);
      }
      break;

    case "models":
      const availability = await checkAIAvailability(config);
      logger.info(`Provider: ${availability.provider}`);
      logger.info(`Model: ${availability.model}`);
      logger.info(`Available: ${availability.available ? "Yes" : "No"}`);
      if (!availability.available) {
        logger.info(`Message: ${availability.message}`);
      }
      break;

    default:
      logger.error(`Unknown llm subcommand: ${subcommand}`);
      await exitWithError(new Error("Operation failed"), 1);
  }
}

function handleHelp() {
  logger.info(`
GitVan v2 - AI-powered Git workflow automation

Usage:
  gitvan daemon [start|stop|status] [--worktrees all]    Manage daemon
  gitvan job [list|run] [--name <job-name>]              Job management
  gitvan event [list|simulate|test]                      Event management
  gitvan cron [list|start|dry-run]                       Cron job management
  gitvan audit [build|verify|list]                       Receipt audit
  gitvan chat [draft|generate|explain]                    AI job generation
  gitvan llm [call|models]                               AI operations
  gitvan graph [save|load|init-default|stats]            Graph persistence
  gitvan schedule apply                                  Apply scheduled tasks
  gitvan worktree list                                   List all worktrees
  gitvan run <job-name>                                  Run a specific job (legacy)
  gitvan list                                            List available jobs (legacy)
  gitvan help                                            Show this help

Examples:
  gitvan daemon start                                    Start daemon for current worktree
  gitvan cron list                                       List all cron jobs
  gitvan event simulate --files "src/**"                Simulate file change event
  gitvan chat generate "Create a changelog job"         Generate job via AI
  gitvan llm call "Summarize recent commits"            Call AI directly
  gitvan audit build --out audit.json                  Build audit pack
  gitvan graph save my-data --backup true               Save graph with backup
  gitvan graph init-default                             Initialize default graph
  gitvan graph stats                                    Show graph statistics
`);
}

export { main };

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
