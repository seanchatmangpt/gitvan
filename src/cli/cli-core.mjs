// GitVan v3.0.0 - CLI Core
// Core CLI functionality and command routing

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "pathe";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import command handlers
import { cronCommand } from "./cron.mjs";
import { daemonCommand } from "./daemon.mjs";
import { eventCommand } from "./event.mjs";
import { auditCommand } from "./audit.mjs";
import { chatCommand } from "./chat.mjs";
import { packCommand } from "./pack.mjs";
import { scaffoldCommand } from "./scaffold.mjs";
import { marketplaceCommand } from "./marketplace.mjs";
import { marketplaceScanCommand } from "./marketplace-scan.mjs";
import { composeCommand } from "./compose.mjs";
import { saveCommand } from "./save.mjs";
import { ensureCommand } from "./ensure.mjs";
import { handleHooksCommand } from "./hooks.mjs";
import { handleWorkflowCommand } from "./workflow.mjs";
import { setupCommand } from "./setup.mjs";

// Import legacy command handlers
import { initCommand as handleInit } from "./init.mjs";
import { daemonCommand as handleDaemon } from "./daemon.mjs";
import { handleRun } from "./run.mjs";
import { handleList } from "./list.mjs";
import { eventCommand as handleEvent } from "./event.mjs";
import { handleSchedule } from "./schedule.mjs";
import { handleWorktree } from "./worktree.mjs";
import { handleJob } from "./job.mjs";
import { handleHelp } from "./help.mjs";

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
  
  // New commands
  cron: cronCommand,
  audit: auditCommand,
  chat: chatCommand,
  pack: packCommand,
  scaffold: scaffoldCommand,
  marketplace: marketplaceCommand,
  "marketplace-scan": marketplaceScanCommand,
  compose: composeCommand,
  save: saveCommand,
  ensure: ensureCommand,
  hooks: handleHooksCommand,
  workflow: handleWorkflowCommand,
  setup: setupCommand,
};

export class GitVanCLI {
  constructor() {
    this.commands = commands;
  }

  async run(args) {
    const [command, ...commandArgs] = args;
    
    if (!command || command === 'help') {
      return this.showHelp();
    }

    const handler = this.commands[command];
    if (!handler) {
      console.error(`❌ Unknown command: ${command}`);
      console.error(`Run 'gitvan help' to see available commands`);
      process.exit(1);
    }

    try {
      await handler(commandArgs);
    } catch (error) {
      console.error(`❌ Error running command '${command}':`, error.message);
      process.exit(1);
    }
  }

  showHelp() {
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
}

export default GitVanCLI;