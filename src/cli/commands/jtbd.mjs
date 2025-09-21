import { defineCommand } from "citty";
import { JTBDCLI } from "../jtbd.mjs";
import { useGitVan, withGitVan } from "../../core/context.mjs";

export const jtbdCommand = defineCommand({
  meta: {
    name: "jtbd",
    description: "Manage GitVan Jobs-to-be-Done (JTBD) Hooks",
    usage: "gitvan jtbd <command> [options]",
    examples: [
      "gitvan jtbd list",
      "gitvan jtbd evaluate --category core-development-lifecycle",
      "gitvan jtbd validate code-quality-gatekeeper",
      "gitvan jtbd stats",
      "gitvan jtbd workflow run code-quality-pipeline",
    ],
  },
  subCommands: {
    list: defineCommand({
      meta: {
        name: "list",
        description: "List all available JTBD hooks",
        usage: "gitvan jtbd list [--category <category>] [--domain <domain>]",
        examples: [
          "gitvan jtbd list",
          "gitvan jtbd list --category core-development-lifecycle",
          "gitvan jtbd list --domain security",
        ],
      },
      args: {
        category: {
          type: "string",
          description: "Filter hooks by JTBD category",
        },
        domain: {
          type: "string",
          description: "Filter hooks by domain",
        },
      },
      async run({ args }) {
        const cli = new JTBDCLI();

        try {
          await withGitVan({ cwd: process.cwd() }, async () => {
            const context = useGitVan();
            await cli.initialize(context);

            if (args.category) {
              await cli.listByCategory(args.category);
            } else if (args.domain) {
              await cli.listByDomain(args.domain);
            } else {
              await cli.list();
            }
          });
        } catch (error) {
          console.error(`❌ Failed to list JTBD hooks: ${error.message}`);
          process.exit(1);
        }
      },
    }),

    evaluate: defineCommand({
      meta: {
        name: "evaluate",
        description: "Evaluate JTBD hooks against current project state",
        usage:
          "gitvan jtbd evaluate [--category <category>] [--dry-run] [--verbose]",
        examples: [
          "gitvan jtbd evaluate",
          "gitvan jtbd evaluate --category core-development-lifecycle",
          "gitvan jtbd evaluate --dry-run --verbose",
        ],
      },
      args: {
        category: {
          type: "string",
          description: "Evaluate hooks from specific category",
        },
        "dry-run": {
          type: "boolean",
          description: "Show what would be evaluated without executing",
        },
        verbose: {
          type: "boolean",
          description: "Show detailed evaluation output",
        },
      },
      async run({ args }) {
        const cli = new JTBDCLI();

        try {
          await withGitVan({ cwd: process.cwd() }, async () => {
            const context = useGitVan();
            await cli.initialize(context);

            await cli.evaluate({
              category: args.category,
              dryRun: args["dry-run"],
              verbose: args.verbose,
            });
          });
        } catch (error) {
          console.error(`❌ Failed to evaluate JTBD hooks: ${error.message}`);
          process.exit(1);
        }
      },
    }),

    validate: defineCommand({
      meta: {
        name: "validate",
        description: "Validate specific JTBD hook definition",
        usage: "gitvan jtbd validate <hook-id>",
        examples: [
          "gitvan jtbd validate code-quality-gatekeeper",
          "gitvan jtbd validate dependency-vulnerability-scanner",
        ],
      },
      args: {
        hookId: {
          type: "positional",
          description: "JTBD hook ID to validate",
          required: true,
        },
      },
      async run({ args }) {
        const cli = new JTBDCLI();

        try {
          await withGitVan({ cwd: process.cwd() }, async () => {
            const context = useGitVan();
            await cli.initialize(context);

            await cli.validate(args.hookId);
          });
        } catch (error) {
          console.error(`❌ Failed to validate JTBD hook: ${error.message}`);
          process.exit(1);
        }
      },
    }),

    stats: defineCommand({
      meta: {
        name: "stats",
        description: "Show JTBD hooks registry statistics",
        usage: "gitvan jtbd stats",
        examples: ["gitvan jtbd stats"],
      },
      async run() {
        const cli = new JTBDCLI();

        try {
          await withGitVan({ cwd: process.cwd() }, async () => {
            const context = useGitVan();
            await cli.initialize(context);

            await cli.stats();
          });
        } catch (error) {
          console.error(`❌ Failed to get JTBD stats: ${error.message}`);
          process.exit(1);
        }
      },
    }),

    refresh: defineCommand({
      meta: {
        name: "refresh",
        description: "Refresh JTBD hooks registry",
        usage: "gitvan jtbd refresh",
        examples: ["gitvan jtbd refresh"],
      },
      async run() {
        const cli = new JTBDCLI();

        try {
          await withGitVan({ cwd: process.cwd() }, async () => {
            const context = useGitVan();
            await cli.initialize(context);

            await cli.refresh();
          });
        } catch (error) {
          console.error(`❌ Failed to refresh JTBD registry: ${error.message}`);
          process.exit(1);
        }
      },
    }),

    create: defineCommand({
      meta: {
        name: "create",
        description: "Create new JTBD hook template",
        usage: "gitvan jtbd create <hook-id> [title] [predicate-type]",
        examples: [
          "gitvan jtbd create my-jtbd-hook",
          'gitvan jtbd create security-scanner "Security Scanner" ask',
        ],
      },
      args: {
        hookId: {
          type: "positional",
          description: "JTBD hook ID",
          required: true,
        },
        title: {
          type: "positional",
          description: "Hook title",
        },
        predicateType: {
          type: "positional",
          description:
            "Predicate type (ask, resultDelta, selectThreshold, shacl)",
        },
      },
      async run({ args }) {
        const cli = new JTBDCLI();

        try {
          await withGitVan({ cwd: process.cwd() }, async () => {
            const context = useGitVan();
            await cli.initialize(context);

            await cli.create(args.hookId, args.title, args.predicateType);
          });
        } catch (error) {
          console.error(`❌ Failed to create JTBD hook: ${error.message}`);
          process.exit(1);
        }
      },
    }),

    workflow: defineCommand({
      meta: {
        name: "workflow",
        description: "Manage JTBD workflows",
        usage: "gitvan jtbd workflow <command> [options]",
        examples: [
          "gitvan jtbd workflow list",
          "gitvan jtbd workflow run code-quality-pipeline",
          "gitvan jtbd workflow status",
        ],
      },
      subCommands: {
        list: defineCommand({
          meta: {
            name: "list",
            description: "List available JTBD workflows",
          },
          async run() {
            const cli = new JTBDCLI();

            try {
              await withGitVan({ cwd: process.cwd() }, async () => {
                const context = useGitVan();
                await cli.initialize(context);

                await cli.listWorkflows();
              });
            } catch (error) {
              console.error(
                `❌ Failed to list JTBD workflows: ${error.message}`
              );
              process.exit(1);
            }
          },
        }),

        run: defineCommand({
          meta: {
            name: "run",
            description: "Run JTBD workflow",
            usage: "gitvan jtbd workflow run <workflow-id>",
          },
          args: {
            workflowId: {
              type: "positional",
              description: "Workflow ID to run",
              required: true,
            },
          },
          async run({ args }) {
            const cli = new JTBDCLI();

            try {
              await withGitVan({ cwd: process.cwd() }, async () => {
                const context = useGitVan();
                await cli.initialize(context);

                await cli.runWorkflow(args.workflowId);
              });
            } catch (error) {
              console.error(`❌ Failed to run JTBD workflow: ${error.message}`);
              process.exit(1);
            }
          },
        }),

        status: defineCommand({
          meta: {
            name: "status",
            description: "Show JTBD workflow status",
          },
          async run() {
            const cli = new JTBDCLI();

            try {
              await withGitVan({ cwd: process.cwd() }, async () => {
                const context = useGitVan();
                await cli.initialize(context);

                await cli.workflowStatus();
              });
            } catch (error) {
              console.error(
                `❌ Failed to get JTBD workflow status: ${error.message}`
              );
              process.exit(1);
            }
          },
        }),
      },
    }),

    analytics: defineCommand({
      meta: {
        name: "analytics",
        description: "Show JTBD analytics and insights",
        usage: "gitvan jtbd analytics [--category <category>]",
        examples: [
          "gitvan jtbd analytics",
          "gitvan jtbd analytics --category core-development-lifecycle",
        ],
      },
      args: {
        category: {
          type: "string",
          description: "Show analytics for specific category",
        },
      },
      async run({ args }) {
        const cli = new JTBDCLI();

        try {
          await withGitVan({ cwd: process.cwd() }, async () => {
            const context = useGitVan();
            await cli.initialize(context);

            await cli.analytics(args.category);
          });
        } catch (error) {
          console.error(`❌ Failed to get JTBD analytics: ${error.message}`);
          process.exit(1);
        }
      },
    }),

    help: defineCommand({
      meta: {
        name: "help",
        description: "Show JTBD help",
      },
      async run() {
        const cli = new JTBDCLI();
        await cli.help();
      },
    }),
  },
  async run({ args }) {
    // If no subcommand provided, show help
    const cli = new JTBDCLI();
    return await cli.help();
  },
});
