#!/usr/bin/env node

// GitVan v3.0.0 - Main CLI Entry Point
// Simplified and refactored for v3 preparation

import { createLogger } from "./utils/logger.mjs";

const logger = createLogger("cli");

// Simple command routing
const commands = {
  init: () => import("./cli/init.mjs").then(m => m.initCommand.run()),
  daemon: (args) => import("./cli/daemon.mjs").then(m => m.daemonCommand(args[0] || "start")),
  run: (args) => import("./cli/run.mjs").then(m => m.handleRun(args)),
  list: (args) => import("./cli/list.mjs").then(m => m.handleList(args)),
  event: (args) => import("./cli/event.mjs").then(m => m.eventCommand(args)),
  schedule: (args) => import("./cli/schedule.mjs").then(m => m.handleSchedule(args)),
  worktree: (args) => import("./cli/worktree.mjs").then(m => m.handleWorktree(args)),
  job: (args) => import("./cli/job.mjs").then(m => m.handleJob(args)),
  help: () => import("./cli/help.mjs").then(m => m.handleHelp()),
  
  // New commands
  cron: (args) => import("./cli/cron.mjs").then(m => m.cronCommand(args)),
  audit: (args) => import("./cli/audit.mjs").then(m => m.auditCommand(args)),
  chat: (args) => import("./cli/chat.mjs").then(m => m.chatCommand(args)),
  pack: (args) => import("./cli/pack.mjs").then(m => m.packCommand(args)),
  scaffold: (args) => import("./cli/scaffold.mjs").then(m => m.scaffoldCommand(args)),
  marketplace: (args) => import("./cli/marketplace.mjs").then(m => m.marketplaceCommand(args)),
  "marketplace-scan": (args) => import("./cli/marketplace-scan.mjs").then(m => m.marketplaceScanCommand(args)),
  compose: (args) => import("./cli/compose.mjs").then(m => m.composeCommand(args)),
  save: (args) => import("./cli/save.mjs").then(m => m.saveCommand(args)),
  ensure: (args) => import("./cli/ensure.mjs").then(m => m.ensureCommand(args)),
  hooks: (args) => import("./cli/hooks.mjs").then(m => m.handleHooksCommand(args)),
  workflow: (args) => import("./cli/workflow.mjs").then(m => m.handleWorkflowCommand(args)),
  setup: (args) => import("./cli/setup.mjs").then(m => m.setupCommand(args)),
};

async function runCLI() {
  const args = process.argv.slice(2);
  const [command, ...commandArgs] = args;
  
  if (!command || command === 'help') {
    return showHelp();
  }

  const handler = commands[command];
  if (!handler) {
    console.error(`❌ Unknown command: ${command}`);
    console.error(`Run 'gitvan help' to see available commands`);
    process.exit(1);
  }

  try {
    await handler(commandArgs);
  } catch (error) {
    logger.error(`❌ Error running command '${command}':`, error.message);
    console.error(`❌ Error running command '${command}':`, error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
🚀 GitVan v3.0.0 - Git-native development automation

USAGE:
  gitvan <command> [options]

COMMANDS:
  init          Initialize GitVan in current directory
  daemon        Start/stop GitVan daemon
  run           Run a job or workflow
  list          List available jobs, events, or schedules
  event         Manage events
  schedule      Manage schedules
  worktree      Manage Git worktrees
  job           Manage jobs
  pack          Manage packs
  scaffold      Scaffold new projects
  marketplace   Browse pack marketplace
  chat          AI-powered chat interface
  hooks         Manage Git hooks
  workflow      Manage workflows
  setup         Setup GitVan environment
  help          Show this help message

EXAMPLES:
  gitvan init
  gitvan run my-job
  gitvan pack install react-pack
  gitvan chat "help me with my workflow"

For more information, visit: https://github.com/seanchatmangpt/gitvan
  `);
}

// Run the CLI
runCLI().catch((error) => {
  console.error("❌ Fatal error:", error.message);
  process.exit(1);
});