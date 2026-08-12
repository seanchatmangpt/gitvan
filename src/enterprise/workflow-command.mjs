import { defineCommand } from "citty";
import { WorkflowCLI } from "../cli/workflow.mjs";
import { useGitVan, withGitVan } from "../core/context.mjs";
import { createLogger } from "../utils/logger.mjs";
import { exitWithError } from "../core/error-handler.mjs";

const logger = createLogger("cli:enterprise:workflow");

async function withWorkflow(fn) {
  const cli = new WorkflowCLI();
  return withGitVan({ cwd: process.cwd() }, async () => {
    const context = useGitVan();
    await cli.initialize(context);
    return fn(cli);
  });
}

async function fail(error, operation) {
  logger.error(`${operation}: ${error.message}`, { code: error.code });
  return exitWithError(error, 1);
}

export const enterpriseWorkflowCommand = defineCommand({
  meta: {
    name: "workflow",
    description: "Enterprise-admitted workflow operations",
    usage: "gitvan workflow <list|run|stats>",
  },
  subCommands: {
    list: defineCommand({
      meta: { name: "list", description: "List admitted RDF workflows" },
      async run() {
        try {
          await withWorkflow((cli) => cli.list());
        } catch (error) {
          await fail(error, "Failed to list workflows");
        }
      },
    }),
    run: defineCommand({
      meta: {
        name: "run",
        description: "Execute a workflow through the enterprise actuation broker",
        usage: "gitvan workflow run <workflow-id> [--dry-run] [--verbose]",
      },
      args: {
        workflowId: {
          type: "positional",
          description: "Workflow IRI or unique local name",
          required: true,
        },
        "dry-run": {
          type: "boolean",
          description: "Resolve the workflow without actuation",
          default: false,
        },
        verbose: {
          type: "boolean",
          description: "Show execution details",
          default: false,
        },
      },
      async run({ args }) {
        try {
          await withWorkflow((cli) => cli.run(args.workflowId, {
            dryRun: args["dry-run"],
            verbose: args.verbose,
          }));
        } catch (error) {
          await fail(error, "Failed to execute workflow");
        }
      },
    }),
    stats: defineCommand({
      meta: { name: "stats", description: "Show admitted workflow graph statistics" },
      async run() {
        try {
          await withWorkflow((cli) => cli.stats());
        } catch (error) {
          await fail(error, "Failed to read workflow statistics");
        }
      },
    }),
  },
});
