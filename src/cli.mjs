#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { defineCommand, runMain } from "citty";
import { createLogger } from "./utils/logger.mjs";
import { exitWithError } from "./core/error-handler.mjs";

const logger = createLogger("cli");
const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
);
const enterpriseMode = process.env.GITVAN_ENTERPRISE_MODE === "1";

process.on("uncaughtException", async (error) => {
  logger.error("Uncaught Exception", { error: error.message, stack: error.stack, code: error.code });
  await exitWithError(error, 1);
});

process.on("unhandledRejection", async (reason) => {
  logger.error("Unhandled Rejection", { reason });
  const error = reason instanceof Error ? reason : new Error(String(reason));
  await exitWithError(error, 1);
});

async function load(path, exportName) {
  return (await import(path))[exportName];
}

function refusedCommand(name) {
  return defineCommand({
    meta: {
      name,
      description: `${name} is outside the Fortune-5 enterprise runtime profile`,
    },
    async run() {
      const error = new Error(
        `Command '${name}' is not admitted while GITVAN_ENTERPRISE_MODE=1`
      );
      error.code = "CLI_ROUTE_REFUSED";
      logger.error(error.message, { code: error.code, command: name });
      process.exitCode = 64;
      return { standing: "REFUSED", code: error.code, command: name };
    },
  });
}

const restrictedNames = [
  "daemon",
  "event",
  "cron",
  "audit",
  "hooks",
  "jtbd",
  "cleanroom",
  "job",
  "schedule",
  "worktree",
  "submodule",
  "init",
  "setup",
  "save",
  "ensure",
  "pack",
  "marketplace",
  "scaffold",
  "compose",
  "chat",
  "llm",
  "revops",
  "studio",
];

let subCommands;
if (enterpriseMode) {
  const workflow = await load(
    "./enterprise/workflow-command.mjs",
    "enterpriseWorkflowCommand"
  );
  subCommands = {
    workflow,
    ...Object.fromEntries(restrictedNames.map((name) => [name, refusedCommand(name)])),
  };
} else {
  const [
    daemon,
    event,
    cron,
    audit,
    hooks,
    workflow,
    jtbd,
    cleanroom,
    job,
    schedule,
    worktree,
    llm,
    revops,
    submodule,
    setup,
    pack,
    marketplace,
    scaffold,
    compose,
    save,
    ensure,
    init,
    chat,
    studio,
  ] = await Promise.all([
    load("./cli/commands/daemon.mjs", "daemonCommand"),
    load("./cli/commands/event.mjs", "eventCommand"),
    load("./cli/commands/cron.mjs", "cronCommand"),
    load("./cli/commands/audit.mjs", "auditCommand"),
    load("./cli/commands/hooks.mjs", "hooksCommand"),
    load("./cli/commands/workflow.mjs", "workflowCommand"),
    load("./cli/commands/jtbd.mjs", "jtbdCommand"),
    load("./cli/commands/cleanroom.mjs", "cleanroomCommand"),
    load("./cli/commands/job.mjs", "jobCommand"),
    load("./cli/commands/schedule.mjs", "scheduleCommand"),
    load("./cli/commands/worktree.mjs", "worktreeCommand"),
    load("./cli/commands/llm.mjs", "llmCommand"),
    load("./cli/commands/revops.mjs", "revopsCommand"),
    load("./cli/commands/submodule.mjs", "submoduleCommand"),
    load("./cli/setup.mjs", "setupCommand"),
    load("./cli/pack.mjs", "packCommand"),
    load("./cli/marketplace.mjs", "marketplaceCommand"),
    load("./cli/scaffold.mjs", "scaffoldCommand"),
    load("./cli/compose.mjs", "composeCommand"),
    load("./cli/save.mjs", "saveCommand"),
    load("./cli/ensure.mjs", "ensureCommand"),
    load("./cli/init.mjs", "initCommand"),
    load("./cli/chat.mjs", "chatCommand"),
    load("./cli/commands/studio.mjs", "studioCommand"),
  ]);

  subCommands = {
    daemon,
    event,
    cron,
    audit,
    hooks,
    workflow,
    jtbd,
    cleanroom,
    job,
    schedule,
    worktree,
    submodule,
    init,
    setup,
    save,
    ensure,
    pack,
    marketplace,
    scaffold,
    compose,
    chat,
    llm,
    revops,
    studio,
  };
}

export const cli = defineCommand({
  meta: {
    name: "gitvan",
    version: packageJson.version,
    description: enterpriseMode
      ? "Git-native automation platform — Fortune-5 enterprise runtime profile"
      : "Git-native development automation platform",
    usage: "gitvan <command> [options]",
  },
  subCommands,
});

export default cli;

export async function main() {
  return runMain(cli);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMain(cli);
}
