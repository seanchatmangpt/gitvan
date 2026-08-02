#!/usr/bin/env node

/**
 * GitVan CLI - Unified Entry Point (Citty Implementation)
 *
 * This is the corrected main CLI entry point using Citty framework
 * following the C4 model architecture. All commands are properly
 * implemented using Citty's defineCommand pattern.
 */

import { defineCommand, runMain } from "citty";
import { createLogger } from "./utils/logger.mjs";
import { exitWithError } from "./core/error-handler.mjs";

const logger = createLogger("cli");

process.on("uncaughtException", async (error) => {
  logger.error("Uncaught Exception", { error: error.message, stack: error.stack });
  await exitWithError(error, 1);
});

process.on("unhandledRejection", async (reason) => {
  logger.error("Unhandled Rejection", { reason });
  const error = reason instanceof Error ? reason : new Error(String(reason));
  await exitWithError(error, 1);
});

import { daemonCommand } from "./cli/commands/daemon.mjs";
import { eventCommand } from "./cli/commands/event.mjs";
import { cronCommand } from "./cli/commands/cron.mjs";
import { auditCommand } from "./cli/commands/audit.mjs";
import { hooksCommand } from "./cli/commands/hooks.mjs";
import { workflowCommand } from "./cli/commands/workflow.mjs";
import { jtbdCommand } from "./cli/commands/jtbd.mjs";
import { cleanroomCommand } from "./cli/commands/cleanroom.mjs";
import { jobCommand } from "./cli/commands/job.mjs";
import { scheduleCommand } from "./cli/commands/schedule.mjs";
import { worktreeCommand } from "./cli/commands/worktree.mjs";
import { llmCommand } from "./cli/commands/llm.mjs";
import { revopsCommand } from "./cli/commands/revops.mjs";
import { submoduleCommand } from "./cli/commands/submodule.mjs";
import { capabilityCommand } from "./cli/commands/capability.mjs";

import { setupCommand } from "./cli/setup.mjs";
import { packCommand } from "./cli/pack.mjs";
import { marketplaceCommand } from "./cli/marketplace.mjs";
import { scaffoldCommand } from "./cli/scaffold.mjs";
import { composeCommand } from "./cli/compose.mjs";
import { saveCommand } from "./cli/save.mjs";
import { ensureCommand } from "./cli/ensure.mjs";
import { initCommand } from "./cli/init.mjs";
import { chatCommand } from "./cli/chat.mjs";
import { studioCommand } from "./cli/commands/studio.mjs";

export const cli = defineCommand({
  meta: {
    name: "gitvan",
    version: "4.0.1",
    description: "Git-native development automation platform",
    usage: "gitvan <command> [options]",
    examples: [
      "gitvan init",
      "gitvan daemon start --worktrees all",
      'gitvan event simulate commit --files "src/**"',
      "gitvan cron list --verbose",
      "gitvan audit build --output audit.json",
      "gitvan hooks list",
      "gitvan hooks evaluate --dry-run",
      "gitvan jtbd list",
      "gitvan jtbd evaluate --category core-development-lifecycle",
      "gitvan cleanroom build",
      "gitvan cleanroom test --suite core",
      "gitvan workflow list",
      "gitvan workflow run my-workflow --dry-run",
      "gitvan workflow cursor my-workflow --interactive",
      "gitvan job list",
      "gitvan job run my-job",
      "gitvan job chain build test deploy",
      'gitvan schedule apply my-job "*/5 * * * *"',
      "gitvan schedule list --enabled-only",
      "gitvan worktree list",
      "gitvan worktree create ../feature feature/new",
      'gitvan llm generate "create a backup job"',
      'gitvan llm job "run tests on push" --save',
      "gitvan revops metrics",
      "gitvan revops report monthly",
      "gitvan revops health",
      "gitvan revops forecast --growth-rate=15 --months=12",
      "gitvan revops customers --at-risk",
      "gitvan setup",
      "gitvan pack install react-pack",
      'gitvan marketplace search "react"',
      "gitvan scaffold component MyComponent",
      "gitvan compose up --detach",
      "gitvan save",
      "gitvan ensure",
      'gitvan chat "help me with my workflow"',
      "gitvan submodule status",
      "gitvan submodule check",
      "gitvan submodule init",
      "gitvan submodule update",
      "gitvan submodule verify --list-methods",
      "gitvan capability list",
      "gitvan capability show gitvan.job.execution",
      "gitvan capability verify gitvan.receipt",
      "gitvan capability graph --format mermaid",
      "gitvan capability admit gitvan.job.execution",
    ],
  },
  subCommands: {
    daemon: daemonCommand,
    event: eventCommand,
    cron: cronCommand,
    audit: auditCommand,
    hooks: hooksCommand,
    workflow: workflowCommand,
    jtbd: jtbdCommand,
    cleanroom: cleanroomCommand,
    job: jobCommand,
    schedule: scheduleCommand,
    worktree: worktreeCommand,
    submodule: submoduleCommand,
    capability: capabilityCommand,
    init: initCommand,
    setup: setupCommand,
    save: saveCommand,
    ensure: ensureCommand,
    pack: packCommand,
    marketplace: marketplaceCommand,
    scaffold: scaffoldCommand,
    compose: composeCommand,
    chat: chatCommand,
    llm: llmCommand,
    revops: revopsCommand,
    studio: studioCommand,
  },
});

export default cli;

export async function main() {
  return runMain(cli);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMain(cli);
}
