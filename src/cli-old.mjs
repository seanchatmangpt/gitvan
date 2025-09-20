#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "pathe";
import { GitVanDaemon, startDaemon } from "./runtime/daemon.mjs";
import { discoverEvents, loadEventDefinition } from "./runtime/events.mjs";
import { readReceiptsRange } from "./runtime/receipt.mjs";
import {
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
    console.error(`Unknown command: ${command}`);
    handleHelp();
    process.exit(1);
  }

  try {
    await handler(...args);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
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
        console.log("Starting daemon for all worktrees...");
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
      console.log(
        `Daemon ${
          statusDaemon.isRunning() ? "running" : "not running"
        } for: ${worktreePath}`
      );
      break;
    default:
      console.error(`Unknown daemon action: ${action}`);
      process.exit(1);
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
      console.log("Schedule management not yet implemented");
      // TODO: Implement cron-like scheduling
      break;
    default:
      console.error(`Unknown schedule action: ${action}`);
      process.exit(1);
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
            console.log("No worktrees found");
            return;
          }

          console.log("\nWorktrees:");
          console.log("==========");
          for (const wt of worktrees) {
            console.log(`${wt.path} ${wt.isMain ? "(main)" : ""}`);
            console.log(`  Branch: ${wt.branch || "detached"}`);
            if (wt.head) console.log(`  HEAD: ${wt.head.slice(0, 8)}`);
            console.log();
          }
        });
      } catch (err) {
        console.error("Error listing worktrees:", err.message);
      }
      break;
    default:
      console.error(`Unknown worktree action: ${action}`);
      process.exit(1);
  }
}

async function handleJob(action = "list", ...args) {
  const worktreePath = process.cwd();
  const jobsDir = join(worktreePath, "jobs");

  switch (action) {
    case "list":
      if (!statSync(jobsDir).isDirectory()) {
        console.log("No jobs directory found");
        return;
      }

      const jobs = discoverJobs(jobsDir);
      if (jobs.length === 0) {
        console.log("No jobs found");
        return;
      }

      console.log("Available jobs:");
      console.log("==============");
      jobs.forEach((job) => {
        console.log(`${job.id}`);
        console.log(`  File: ${job.relativePath}`);
        console.log(`  Directory: ${job.directory}`);
        console.log();
      });
      break;

    case "run":
      const nameIndex = args.indexOf("--name");
      if (nameIndex === -1 || !args[nameIndex + 1]) {
        console.error("Job name required: gitvan job run --name <job-name>");
        process.exit(1);
      }
      const jobName = args[nameIndex + 1];

      const jobPath = findJobFile(jobsDir, jobName);
      if (!jobPath) {
        console.error(`Job not found: ${jobName}`);
        process.exit(1);
      }

      try {
        const jobDef = await loadJobDefinition(jobPath);
        if (!jobDef) {
          console.error(`Failed to load job: ${jobName}`);
          process.exit(1);
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

        console.log(`Running job: ${jobName}`);
        const result = await runJobWithContext(ctx, jobDef);
        console.log("Result:", JSON.stringify(result, null, 2));
      } catch (error) {
        console.error(`Error running job ${jobName}:`, error.message);
        process.exit(1);
      }
      break;

    default:
      console.error(`Unknown job action: ${action}`);
      process.exit(1);
  }
}

async function handleRun(jobName) {
  if (!jobName) {
    console.error("Job name required");
    process.exit(1);
  }

  const worktreePath = process.cwd();
  const jobsDir = join(worktreePath, "jobs");
  const jobPath = findJobFile(jobsDir, jobName);

  if (!jobPath) {
    console.error(`Job not found: ${jobName}`);
    process.exit(1);
  }

  try {
    const jobDef = await loadJobDefinition(jobPath);
    if (!jobDef) {
      console.error(`Failed to load job: ${jobName}`);
      process.exit(1);
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

    console.log(`Running job: ${jobName}`);
    const result = await runJobWithContext(ctx, jobDef);
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`Error running job ${jobName}:`, error.message);
    process.exit(1);
  }
}

function handleList() {
  const worktreePath = process.cwd();
  const jobsDir = join(worktreePath, "jobs");

  if (!statSync(jobsDir).isDirectory()) {
    console.log("No jobs directory found");
    return;
  }

  const jobs = findAllJobs(jobsDir);
  console.log("Available jobs:");
  jobs.forEach((job) => console.log(`  ${job}`));
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
        console.error('Prompt required: gitvan llm call "<prompt>"');
        process.exit(1);
      }

      const prompt = args[0];
      const model = args.includes("--model")
        ? args[args.indexOf("--model") + 1]
        : undefined;

      try {
        const result = await generateText({ prompt, model, config });
        console.log(result.output);
      } catch (error) {
        console.error("LLM call failed:", error.message);
        process.exit(1);
      }
      break;

    case "models":
      const availability = await checkAIAvailability(config);
      console.log(`Provider: ${availability.provider}`);
      console.log(`Model: ${availability.model}`);
      console.log(`Available: ${availability.available ? "Yes" : "No"}`);
      if (!availability.available) {
        console.log(`Message: ${availability.message}`);
      }
      break;

    default:
      console.error(`Unknown llm subcommand: ${subcommand}`);
      process.exit(1);
  }
}

function handleHelp() {
  console.log(`
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
