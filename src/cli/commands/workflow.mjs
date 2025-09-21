#!/usr/bin/env node

/**
 * GitVan Workflow Command - Citty Implementation
 *
 * Provides comprehensive workflow management through CLI
 * Supports listing, execution, validation, creation, and Cursor integration
 */

import { defineCommand } from "citty";
import { WorkflowCLI } from "../workflow.mjs";
import { useGitVan, withGitVan } from "../../core/context.mjs";

/**
 * Main workflow command with all subcommands
 */
export const workflowCommand = defineCommand({
  meta: {
    name: "workflow",
    description: "Manage GitVan Workflows",
    usage: "gitvan workflow <subcommand> [options]",
    examples: [
      "gitvan workflow list",
      "gitvan workflow run my-workflow",
      "gitvan workflow run my-workflow --dry-run",
      "gitvan workflow validate my-workflow",
      "gitvan workflow create my-workflow 'My Workflow'",
      "gitvan workflow stats",
      "gitvan workflow cursor my-workflow --interactive",
    ],
  },
  subCommands: {
    /**
     * List all available workflows
     */
    list: defineCommand({
      meta: {
        name: "list",
        description: "List all available workflows",
        usage: "gitvan workflow list [options]",
        examples: ["gitvan workflow list", "gitvan workflow list --verbose"],
      },
      args: {
        verbose: {
          type: "boolean",
          description: "Show detailed workflow information",
          default: false,
        },
      },
      async run({ args }) {
        const cli = new WorkflowCLI();

        try {
          await withGitVan({ cwd: process.cwd() }, async () => {
            const context = useGitVan();
            await cli.initialize(context);
            await cli.list();
          });
        } catch (error) {
          console.error(`❌ Failed to list workflows: ${error.message}`);
          process.exit(1);
        }
      },
    }),

    /**
     * Execute a workflow
     */
    run: defineCommand({
      meta: {
        name: "run",
        description: "Execute a workflow",
        usage: "gitvan workflow run <workflow-id> [options]",
        examples: [
          "gitvan workflow run my-workflow",
          "gitvan workflow run my-workflow --dry-run",
          "gitvan workflow run my-workflow --verbose",
          "gitvan workflow run my-workflow --input key=value",
        ],
      },
      args: {
        workflowId: {
          type: "positional",
          description: "Workflow ID to execute",
          required: true,
        },
        "dry-run": {
          type: "boolean",
          description: "Show what would be executed without actually running",
          default: false,
        },
        verbose: {
          type: "boolean",
          description: "Show detailed execution information",
          default: false,
        },
        input: {
          type: "string",
          description:
            "Input parameters in key=value format (can be used multiple times)",
        },
      },
      async run({ args }) {
        const cli = new WorkflowCLI();

        try {
          await withGitVan({ cwd: process.cwd() }, async () => {
            const context = useGitVan();
            await cli.initialize(context);

            // Parse input parameters
            const inputs = {};
            if (args.input) {
              const inputArray = Array.isArray(args.input)
                ? args.input
                : [args.input];
              for (const input of inputArray) {
                const [key, value] = input.split("=");
                if (key && value !== undefined) {
                  inputs[key] = value;
                }
              }
            }

            const runOptions = {
              inputs,
              dryRun: args["dry-run"],
              verbose: args.verbose,
            };

            await cli.run(args.workflowId, runOptions);
          });
        } catch (error) {
          console.error(`❌ Failed to run workflow: ${error.message}`);
          process.exit(1);
        }
      },
    }),

    /**
     * Validate a workflow
     */
    validate: defineCommand({
      meta: {
        name: "validate",
        description: "Validate a workflow definition",
        usage: "gitvan workflow validate <workflow-id>",
        examples: ["gitvan workflow validate my-workflow"],
      },
      args: {
        workflowId: {
          type: "positional",
          description: "Workflow ID to validate",
          required: true,
        },
      },
      async run({ args }) {
        const cli = new WorkflowCLI();

        try {
          await withGitVan({ cwd: process.cwd() }, async () => {
            const context = useGitVan();
            await cli.initialize(context);
            await cli.validate(args.workflowId);
          });
        } catch (error) {
          console.error(`❌ Failed to validate workflow: ${error.message}`);
          process.exit(1);
        }
      },
    }),

    /**
     * Create a new workflow
     */
    create: defineCommand({
      meta: {
        name: "create",
        description: "Create a new workflow template",
        usage: "gitvan workflow create <workflow-id> [title]",
        examples: [
          "gitvan workflow create my-workflow",
          "gitvan workflow create my-workflow 'My Custom Workflow'",
        ],
      },
      args: {
        workflowId: {
          type: "positional",
          description: "Workflow ID to create",
          required: true,
        },
        title: {
          type: "positional",
          description: "Optional title for the workflow",
          required: false,
        },
      },
      async run({ args }) {
        const cli = new WorkflowCLI();

        try {
          await withGitVan({ cwd: process.cwd() }, async () => {
            const context = useGitVan();
            await cli.initialize(context);
            await cli.create(args.workflowId, args.title);
          });
        } catch (error) {
          console.error(`❌ Failed to create workflow: ${error.message}`);
          process.exit(1);
        }
      },
    }),

    /**
     * Show workflow statistics
     */
    stats: defineCommand({
      meta: {
        name: "stats",
        description: "Show workflow statistics",
        usage: "gitvan workflow stats",
        examples: ["gitvan workflow stats"],
      },
      async run() {
        const cli = new WorkflowCLI();

        try {
          await withGitVan({ cwd: process.cwd() }, async () => {
            const context = useGitVan();
            await cli.initialize(context);
            await cli.stats();
          });
        } catch (error) {
          console.error(`❌ Failed to show stats: ${error.message}`);
          process.exit(1);
        }
      },
    }),

    /**
     * Connect with Cursor CLI
     */
    cursor: defineCommand({
      meta: {
        name: "cursor",
        description: "Connect workflow with Cursor CLI",
        usage: "gitvan workflow cursor <workflow-id> [options]",
        examples: [
          "gitvan workflow cursor my-workflow --interactive",
          "gitvan workflow cursor my-workflow --non-interactive",
          "gitvan workflow cursor my-workflow --model gpt-4",
          "gitvan workflow cursor my-workflow --prompt 'Custom prompt'",
        ],
      },
      args: {
        workflowId: {
          type: "positional",
          description: "Workflow ID to connect with Cursor",
          required: true,
        },
        interactive: {
          type: "boolean",
          description: "Use interactive mode",
          default: false,
        },
        "non-interactive": {
          type: "boolean",
          description: "Use non-interactive mode",
          default: false,
        },
        model: {
          type: "string",
          description: "AI model to use (e.g., gpt-4, claude-3)",
        },
        prompt: {
          type: "string",
          description: "Custom prompt for the workflow",
        },
      },
      async run({ args }) {
        const cli = new WorkflowCLI();

        try {
          await withGitVan({ cwd: process.cwd() }, async () => {
            const context = useGitVan();
            await cli.initialize(context);

            const cursorOptions = {
              interactive: args.interactive,
              nonInteractive: args["non-interactive"],
              model: args.model,
              prompt: args.prompt,
            };

            await cli.cursor(args.workflowId, cursorOptions);
          });
        } catch (error) {
          console.error(`❌ Failed to connect with Cursor: ${error.message}`);
          process.exit(1);
        }
      },
    }),

    /**
     * Generate Cursor integration script
     */
    "cursor-script": defineCommand({
      meta: {
        name: "cursor-script",
        description: "Generate Cursor integration script for a workflow",
        usage: "gitvan workflow cursor-script <workflow-id>",
        examples: ["gitvan workflow cursor-script my-workflow"],
      },
      args: {
        workflowId: {
          type: "positional",
          description: "Workflow ID to generate script for",
          required: true,
        },
      },
      async run({ args }) {
        const cli = new WorkflowCLI();

        try {
          await withGitVan({ cwd: process.cwd() }, async () => {
            const context = useGitVan();
            await cli.initialize(context);
            await cli.generateCursorScript(args.workflowId);
          });
        } catch (error) {
          console.error(
            `❌ Failed to generate Cursor script: ${error.message}`
          );
          process.exit(1);
        }
      },
    }),

    /**
     * Show workflow help
     */
    help: defineCommand({
      meta: {
        name: "help",
        description: "Show workflow command help",
        usage: "gitvan workflow help",
      },
      async run() {
        const cli = new WorkflowCLI();
        cli.help();
      },
    }),
  },
});
