import { defineCommand } from "citty";
import { join } from "node:path";
import { WorkflowEngine } from "../workflow/workflow-engine.mjs";
import { useGitVan, withGitVan } from "../core/context.mjs";
import { createLogger } from "../utils/logger.mjs";
import { exitWithError } from "../core/error-handler.mjs";

const logger = createLogger("cli:enterprise:workflow");

function localName(iri) {
  const value = String(iri || "");
  const index = Math.max(value.lastIndexOf("#"), value.lastIndexOf("/"), value.lastIndexOf(":"));
  return value.slice(index + 1);
}

async function withEngine(fn) {
  return withGitVan({ cwd: process.cwd() }, async () => {
    const context = useGitVan();
    const root = context?.root || context?.cwd || process.cwd();
    const engine = new WorkflowEngine({
      graphDir: join(root, "workflows"),
      logger,
      enterprisePolicy: context?.enterprisePolicy || {},
    });
    await engine.initialize();
    try {
      return await fn(engine);
    } finally {
      await engine.cleanup();
    }
  });
}

async function fail(error, operation) {
  logger.error(`${operation}: ${error.message}`, { code: error.code });
  return exitWithError(error, 1);
}

function findWorkflow(workflows, workflowId) {
  const exact = workflows.find((workflow) => workflow.id === workflowId);
  if (exact) return exact;
  const candidates = workflows.filter((workflow) => localName(workflow.id) === workflowId);
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    const error = new Error(`Workflow ID is ambiguous: ${workflowId}`);
    error.code = "WORKFLOW_ID_AMBIGUOUS_REFUSED";
    throw error;
  }
  return null;
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
          await withEngine(async (engine) => {
            const workflows = await engine.listWorkflows();
            for (const workflow of workflows) {
              logger.info(`${workflow.id} — ${workflow.title} (${workflow.pipelineCount} pipeline(s))`);
            }
          });
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
          description: "Resolve the admitted workflow without actuation",
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
          await withEngine(async (engine) => {
            if (args["dry-run"]) {
              const workflow = findWorkflow(await engine.listWorkflows(), args.workflowId);
              if (!workflow) {
                const error = new Error(`Workflow not found: ${args.workflowId}`);
                error.code = "WORKFLOW_NOT_FOUND";
                throw error;
              }
              logger.info(`DRY_RUN_ADMITTED ${workflow.id} — ${workflow.title}`);
              return;
            }

            const result = await engine.executeWorkflow(args.workflowId, {
              verbose: args.verbose,
            });
            if (result.status !== "completed") {
              const failedStep = result.steps.at(-1);
              const error = new Error(
                failedStep?.error || `Workflow ended with standing ${result.standing}`
              );
              error.code = failedStep?.errorCode || "WORKFLOW_EXECUTION_FAILED";
              throw error;
            }
            logger.info(
              `WORKFLOW_EXECUTED ${result.workflowId} steps=${result.executedSteps} observations=${result.observationReceipts.length}`
            );
          });
        } catch (error) {
          await fail(error, "Failed to execute workflow");
        }
      },
    }),
    stats: defineCommand({
      meta: { name: "stats", description: "Show admitted workflow graph statistics" },
      async run() {
        try {
          await withEngine(async (engine) => {
            const stats = await engine.getStats();
            logger.info(
              `WORKFLOW_STATS workflows=${stats.workflows} quads=${stats.quadCount} observationReceipts=${stats.observationReceiptCount}`
            );
          });
        } catch (error) {
          await fail(error, "Failed to read workflow statistics");
        }
      },
    }),
  },
});
