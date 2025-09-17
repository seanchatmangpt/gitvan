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
import { useGit } from "./composables/git.mjs";
import { runJobWithContext } from "./runtime/boot.mjs";
import { loadConfig } from "./runtime/config.mjs";

// Import new CLI commands
import { cronCommand } from "./cli/cron.mjs";
import { daemonCommand } from "./cli/daemon.mjs";
import { eventCommand } from "./cli/event.mjs";
import { auditCommand } from "./cli/audit.mjs";
import { chatCommand } from "./cli/chat.mjs";
import { packCommand } from "./cli/pack.mjs";
import { scaffoldCommand } from "./cli/scaffold.mjs";
import { marketplaceCommand } from "./cli/marketplace.mjs";
import { composeCommand } from "./cli/compose.mjs";
import { ensureCommand } from "./cli/ensure.mjs";

const commands = {
  init: handleInit,
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
  pack: handlePack,
  scaffold: handleScaffold,
  marketplace: handleMarketplace,
  compose: handleCompose,
  ensure: handleEnsure,
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

async function handleInit() {
  console.log("🚀 Initializing GitVan v2...\n");

  const { execSync } = await import("node:child_process");
  const { existsSync, mkdirSync, writeFileSync } = await import("node:fs");
  const { join } = await import("pathe");

  const cwd = process.cwd();

  // Check if already initialized
  if (existsSync(join(cwd, ".gitvan"))) {
    console.log("⚠️  GitVan is already initialized in this directory.");
    console.log("   Use 'gitvan ensure' to verify your configuration.\n");
    return;
  }

  // Initialize Git repository if not already done
  if (!existsSync(join(cwd, ".git"))) {
    console.log("📦 Initializing Git repository...");
    try {
      execSync("git init", { stdio: "inherit" });
      console.log("✅ Git repository initialized\n");
    } catch (error) {
      console.log("❌ Failed to initialize Git repository");
      console.log("   Please run 'git init' manually and try again.\n");
      return;
    }
  } else {
    console.log("✅ Git repository already exists\n");
  }

  // Create GitVan directories
  console.log("📁 Creating GitVan directories...");
  const directories = [
    ".gitvan",
    ".gitvan/packs",
    ".gitvan/state", 
    ".gitvan/backups",
    "jobs",
    "events",
    "templates",
    "packs"
  ];

  directories.forEach(dir => {
    const fullPath = join(cwd, dir);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
      console.log(`   ✅ Created: ${dir}`);
    } else {
      console.log(`   ⚠️  Exists: ${dir}`);
    }
  });

  // Create default configuration
  console.log("\n⚙️  Creating configuration...");
  const configPath = join(cwd, "gitvan.config.js");
  if (!existsSync(configPath)) {
    const defaultConfig = `export default {
  // GitVan v2 Configuration
  templates: {
    dirs: ["templates"],
    autoescape: false,
    noCache: true,
  },
  
  jobs: {
    dirs: ["jobs"],
  },
  
  events: {
    dirs: ["events"],
  },
  
  packs: {
    dirs: ["packs", ".gitvan/packs"],
  },
  
  daemon: {
    enabled: true,
    worktrees: "current",
  },
  
  shell: {
    allow: ["echo", "git", "npm", "pnpm", "yarn"],
  },
  
  ai: {
    provider: "openai",
    model: "gpt-4",
  },
  
  // Custom data available in templates
  data: {
    project: {
      name: "my-project",
      description: "A GitVan-powered project",
    },
  },
};
`;

    writeFileSync(configPath, defaultConfig);
    console.log("   ✅ Created: gitvan.config.js");
  } else {
    console.log("   ⚠️  Exists: gitvan.config.js");
  }

  // Create sample files
  console.log("\n📝 Creating sample files...");
  
  // Sample job
  const sampleJobPath = join(cwd, "jobs", "hello.mjs");
  if (!existsSync(sampleJobPath)) {
    const sampleJob = `export default {
  name: "hello",
  description: "A simple hello world job",
  
  async run() {
    console.log("Hello from GitVan! 🚀");
    console.log("This is a sample job. You can edit or remove it.");
  }
};
`;
    writeFileSync(sampleJobPath, sampleJob);
    console.log("   ✅ Created: jobs/hello.mjs");
  }

  // Sample template
  const sampleTemplatePath = join(cwd, "templates", "example.njk");
  if (!existsSync(sampleTemplatePath)) {
    const sampleTemplate = `---
to: "{{ name | kebabCase }}.txt"
force: "overwrite"
---
# {{ name | titleCase }}

This file was generated by GitVan!

Project: {{ project.name }}
Description: {{ project.description }}

Generated at: {{ nowISO }}
`;
    writeFileSync(sampleTemplatePath, sampleTemplate);
    console.log("   ✅ Created: templates/example.njk");
  }

  // Sample pack
  const samplePackPath = join(cwd, "packs", "example-pack.json");
  if (!existsSync(samplePackPath)) {
    const samplePack = {
      name: "example-pack",
      version: "1.0.0",
      description: "An example GitVan pack",
      author: "GitVan Team",
      scaffolds: {
        component: {
          description: "Generate a React component",
          templates: ["templates/example.njk"],
          inputs: {
            name: {
              type: "string",
              description: "Component name",
              required: true
            }
          }
        }
      }
    };
    writeFileSync(samplePackPath, JSON.stringify(samplePack, null, 2));
    console.log("   ✅ Created: packs/example-pack.json");
  }

  // Check Git configuration
  console.log("\n🔧 Checking Git configuration...");
  try {
    const userName = execSync("git config user.name", { encoding: "utf8" }).trim();
    const userEmail = execSync("git config user.email", { encoding: "utf8" }).trim();
    
    if (userName && userEmail) {
      console.log(`   ✅ Git user: ${userName} <${userEmail}>`);
    } else {
      console.log("   ⚠️  Git user not configured");
      console.log("   Run: git config user.name \"Your Name\"");
      console.log("   Run: git config user.email \"your@email.com\"");
    }
  } catch (error) {
    console.log("   ❌ Failed to check Git configuration");
  }

  console.log("\n🎉 GitVan initialization complete!");
  console.log("\nNext steps:");
  console.log("   1. Configure Git user: git config user.name \"Your Name\"");
  console.log("   2. Configure Git email: git config user.email \"your@email.com\"");
  console.log("   3. Test the setup: gitvan ensure");
  console.log("   4. Run the sample job: gitvan run hello");
  console.log("   5. Try the sample scaffold: gitvan scaffold example-pack:component --inputs '{\"name\":\"MyComponent\"}'");
  console.log("\nFor more help: gitvan help");
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
        `Daemon ${statusDaemon.isRunning() ? "running" : "not running"} for: ${worktreePath}`,
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

async function handlePack(action = "list", ...args) {
  // Use new pack command handler
  const parsedArgs = parseArgs(args);
  const commandArgs = {
    args: {
      [action]: true,
      ...parsedArgs,
    },
  };

  // Handle specific pack subcommands
  if (
    action === "apply" ||
    action === "plan" ||
    action === "remove" ||
    action === "update"
  ) {
    commandArgs.args.pack = parsedArgs.arg0 || parsedArgs.pack;
  }

  return (
    (await packCommand.subCommands[action]?.run(commandArgs)) ||
    packCommand.run(commandArgs)
  );
}

async function handleScaffold(scaffold, ...args) {
  // Use new scaffold command handler
  const parsedArgs = parseArgs(args);
  return await scaffoldCommand.run({ args: { scaffold, ...parsedArgs } });
}

async function handleMarketplace(action = "browse", ...args) {
  // Use new marketplace command handler
  const parsedArgs = parseArgs(args);

  // For search command, the first non-flag argument is the query
  if (action === "search" && args.length > 0 && !args[0].startsWith("--")) {
    parsedArgs.query = args[0];
  }

  // For inspect command, the first non-flag argument is the pack
  if (action === "inspect" && args.length > 0 && !args[0].startsWith("--")) {
    parsedArgs.pack = args[0];
  }

  if (marketplaceCommand.subCommands[action]) {
    return await marketplaceCommand.subCommands[action].run({
      args: parsedArgs,
    });
  }

  return await marketplaceCommand.run({ args: parsedArgs });
}

async function handleCompose(...args) {
  // Use new compose command handler
  const parsedArgs = parseArgs(args);
  parsedArgs.packs = args.filter((arg) => !arg.startsWith("--"));
  return await composeCommand.run({ args: parsedArgs });
}

async function handleEnsure(...args) {
  // Use new ensure command handler
  const parsedArgs = parseArgs(args);
  return await ensureCommand.run({ args: parsedArgs });
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

    case "help":
      console.log("GitVan LLM Commands:");
      console.log();
      console.log("  call <prompt>              Generate text using AI");
      console.log("  models                     Show available AI models");
      console.log("  help                       Show this help");
      console.log();
      console.log("Options:");
      console.log(
        "  --model <name>             AI model name (default: qwen3-coder:30b)",
      );
      console.log(
        "  --temp <number>            Temperature 0.0-1.0 (default: 0.7)",
      );
      console.log();
      console.log("Examples:");
      console.log('  gitvan llm call "What is GitVan?"');
      console.log(
        '  gitvan llm call "Generate a JavaScript function" --model qwen3-coder:30b',
      );
      console.log("  gitvan llm models");
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
  gitvan init                                             Initialize GitVan in current directory
  gitvan daemon [start|stop|status] [--worktrees all]    Manage daemon
  gitvan job [list|run] [--name <job-name>]              Job management
  gitvan event [list|simulate|test]                      Event management
  gitvan cron [list|start|dry-run]                       Cron job management
  gitvan audit [build|verify|list]                       Receipt audit
  gitvan chat [draft|generate|explain]                    AI job generation
  gitvan llm [call|models]                               AI operations
  gitvan pack [list|apply|plan|remove|update|status]     Pack management
  gitvan scaffold <pack:scaffold> [--inputs '{}']        Run pack scaffolds
  gitvan marketplace [browse|search|inspect|quickstart]  Marketplace commands
  gitvan compose <pack1> <pack2> [--inputs '{}']         Compose multiple packs
  gitvan ensure [--init-config] [--skip-git]             Ensure GitVan setup
  gitvan schedule apply                                  Apply scheduled tasks
  gitvan worktree list                                   List all worktrees
  gitvan run <job-name>                                  Run a specific job (legacy)
  gitvan list                                            List available jobs (legacy)
  gitvan help                                            Show this help

Examples:
  gitvan init                                             Initialize GitVan in current directory
  gitvan daemon start                                    Start daemon for current worktree
  gitvan cron list                                       List all cron jobs
  gitvan event simulate --files "src/**"                Simulate file change event
  gitvan chat generate "Create a changelog job"         Generate job via AI
  gitvan llm call "Summarize recent commits"            Call AI directly
  gitvan audit build --out audit.json                  Build audit pack
  gitvan pack apply my-pack --inputs '{"name":"test"}'  Apply a pack
  gitvan pack plan my-pack                             Show pack plan
  gitvan scaffold my-pack:component --inputs '{}'       Run scaffold
  gitvan marketplace browse --category docs            Browse marketplace
  gitvan marketplace search "changelog"                Search for packs
  gitvan marketplace quickstart docs                   Get docs quickstart
  gitvan compose my-pack1 my-pack2                     Compose multiple packs
  gitvan ensure --init-config                          Initialize GitVan config
`);
}

export { main };

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
