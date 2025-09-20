#!/usr/bin/env node

/**
 * GitVan CLI - Unified Entry Point (Citty Implementation)
 *
 * This is the corrected main CLI entry point using Citty framework
 * following the C4 model architecture. All commands are properly
 * implemented using Citty's defineCommand pattern.
 */

import { defineCommand, runMain } from "citty";

// Import all Citty-based commands
import { graphCommand } from "./cli/commands/graph.mjs";
import { daemonCommand } from "./cli/commands/daemon.mjs";
import { eventCommand } from "./cli/commands/event.mjs";
import { cronCommand } from "./cli/commands/cron.mjs";
import { auditCommand } from "./cli/commands/audit.mjs";

// Import existing Citty commands that are already properly implemented
import { setupCommand } from "./cli/setup.mjs";
import { packCommand } from "./cli/pack.mjs";
import { marketplaceCommand } from "./cli/marketplace.mjs";
import { scaffoldCommand } from "./cli/scaffold.mjs";
import { composeCommand } from "./cli/compose.mjs";
import { saveCommand } from "./cli/save.mjs";
import { ensureCommand } from "./cli/ensure.mjs";
import { initCommand } from "./cli/init.mjs";

// Import legacy commands that need to be migrated (temporary)
import { chatCommand } from "./cli/chat.mjs";

/**
 * Main GitVan CLI using Citty framework
 *
 * This follows the C4 model architecture:
 * - Level 1: Developer → GitVan CLI → File System
 * - Level 2: CLI Runner → Command Registry → Module System
 * - Level 3: Commands → Composables → Engines
 * - Level 4: Specific operations and data flow
 */
export const cli = defineCommand({
  meta: {
    name: "gitvan",
    version: "3.0.0",
    description: "Git-native development automation platform",
    usage: "gitvan <command> [options]",
    examples: [
      "gitvan init",
      "gitvan graph save my-data --backup true",
      "gitvan daemon start --worktrees all",
      'gitvan event simulate commit --files "src/**"',
      "gitvan cron list --verbose",
      "gitvan audit build --output audit.json",
      "gitvan setup",
      "gitvan pack install react-pack",
      'gitvan marketplace search "react"',
      "gitvan scaffold component MyComponent",
      "gitvan compose up --detach",
      "gitvan save",
      "gitvan ensure",
      'gitvan chat "help me with my workflow"',
    ],
  },
  subCommands: {
    // Core GitVan commands (properly implemented with Citty)
    graph: graphCommand,
    daemon: daemonCommand,
    event: eventCommand,
    cron: cronCommand,
    audit: auditCommand,

    // Project management commands
    init: initCommand,
    setup: setupCommand,
    save: saveCommand,
    ensure: ensureCommand,

    // Package and marketplace commands
    pack: packCommand,
    marketplace: marketplaceCommand,
    scaffold: scaffoldCommand,
    compose: composeCommand,

    // AI and automation commands
    chat: chatCommand,

    // TODO: Migrate these legacy commands to Citty
    // run: runCommand,           // Legacy handler
    // list: listCommand,         // Legacy handler
    // schedule: scheduleCommand, // Legacy handler
    // worktree: worktreeCommand, // Legacy handler
    // job: jobCommand,          // Legacy handler
    // hooks: hooksCommand,      // Legacy handler
    // workflow: workflowCommand, // Legacy handler
  },
});

// Export for programmatic usage
export default cli;

// Export main function for bin/gitvan.mjs compatibility
export async function main() {
  return runMain(cli);
}

// Run CLI if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  runMain(cli);
}
