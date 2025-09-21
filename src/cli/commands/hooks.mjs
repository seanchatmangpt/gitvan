#!/usr/bin/env node

/**
 * GitVan Hooks Command - Citty Implementation
 *
 * Provides comprehensive Knowledge Hook Engine management through CLI
 * Supports listing, evaluation, validation, and creation of hooks
 */

import { defineCommand } from "citty";
import { HooksCLI } from "../hooks.mjs";
import { useGitVan, withGitVan } from "../../core/context.mjs";

/**
 * Main hooks command with all subcommands
 */
export const hooksCommand = defineCommand({
  meta: {
    name: "hooks",
    description: "Manage GitVan Knowledge Hooks",
    usage: "gitvan hooks <subcommand> [options]",
    examples: [
      "gitvan hooks list",
      "gitvan hooks evaluate --dry-run",
      "gitvan hooks create my-hook 'My Hook Title' ask",
      "gitvan hooks validate my-hook",
      "gitvan hooks stats",
    ],
  },
  subCommands: {
    /**
     * List all available hooks
     */
    list: defineCommand({
      meta: {
        name: "list",
        description: "List all available Knowledge Hooks",
        usage: "gitvan hooks list [options]",
        examples: [
          "gitvan hooks list",
          "gitvan hooks list --category development",
          "gitvan hooks list --domain git",
        ],
      },
      args: {
        category: {
          type: "string",
          description: "Filter hooks by category",
        },
        domain: {
          type: "string",
          description: "Filter hooks by domain",
        },
      },
      async run({ args }) {
        const cli = new HooksCLI();

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
          console.error(`❌ Failed to list hooks: ${error.message}`);
          process.exit(1);
        }
      },
    }),

    /**
     * Evaluate all hooks
     */
    evaluate: defineCommand({
      meta: {
        name: "evaluate",
        description: "Evaluate all Knowledge Hooks",
        usage: "gitvan hooks evaluate [options]",
        examples: [
          "gitvan hooks evaluate",
          "gitvan hooks evaluate --dry-run",
          "gitvan hooks evaluate --verbose",
        ],
      },
      args: {
        "dry-run": {
          type: "boolean",
          description: "Show what would be evaluated without executing",
          default: false,
        },
        verbose: {
          type: "boolean",
          description: "Show detailed evaluation results",
          default: false,
        },
        category: {
          type: "string",
          description: "Evaluate hooks in specific category only",
        },
        domain: {
          type: "string",
          description: "Evaluate hooks in specific domain only",
        },
      },
      async run({ args }) {
        const cli = new HooksCLI();

        try {
          await withGitVan({ cwd: process.cwd() }, async () => {
            const context = useGitVan();
            await cli.initialize(context);

            const options = {
              dryRun: args["dry-run"],
              verbose: args.verbose,
            };

            if (args.category) {
              await cli.evaluateByCategory(args.category, options);
            } else if (args.domain) {
              await cli.evaluateByDomain(args.domain, options);
            } else {
              await cli.evaluate(options);
            }
          });
        } catch (error) {
          console.error(`❌ Failed to evaluate hooks: ${error.message}`);
          process.exit(1);
        }
      },
    }),

    /**
     * Validate a specific hook
     */
    validate: defineCommand({
      meta: {
        name: "validate",
        description: "Validate a specific Knowledge Hook",
        usage: "gitvan hooks validate <hook-id>",
        examples: [
          "gitvan hooks validate version-change",
          "gitvan hooks validate critical-issues",
        ],
      },
      args: {
        hookId: {
          type: "positional",
          description: "Hook ID to validate",
          required: true,
        },
      },
      async run({ args }) {
        const cli = new HooksCLI();

        try {
          await withGitVan({ cwd: process.cwd() }, async () => {
            const context = useGitVan();
            await cli.initialize(context);

            await cli.validate(args.hookId);
          });
        } catch (error) {
          console.error(`❌ Failed to validate hook: ${error.message}`);
          process.exit(1);
        }
      },
    }),

    /**
     * Show registry statistics
     */
    stats: defineCommand({
      meta: {
        name: "stats",
        description: "Show Knowledge Hook registry statistics",
        usage: "gitvan hooks stats",
        examples: ["gitvan hooks stats"],
      },
      async run() {
        const cli = new HooksCLI();

        try {
          await withGitVan({ cwd: process.cwd() }, async () => {
            const context = useGitVan();
            await cli.initialize(context);

            await cli.stats();
          });
        } catch (error) {
          console.error(`❌ Failed to get stats: ${error.message}`);
          process.exit(1);
        }
      },
    }),

    /**
     * Refresh the hook registry
     */
    refresh: defineCommand({
      meta: {
        name: "refresh",
        description: "Refresh the Knowledge Hook registry",
        usage: "gitvan hooks refresh",
        examples: ["gitvan hooks refresh"],
      },
      async run() {
        const cli = new HooksCLI();

        try {
          await withGitVan({ cwd: process.cwd() }, async () => {
            const context = useGitVan();
            await cli.initialize(context);

            await cli.refresh();
          });
        } catch (error) {
          console.error(`❌ Failed to refresh registry: ${error.message}`);
          process.exit(1);
        }
      },
    }),

    /**
     * Create a new hook template
     */
    create: defineCommand({
      meta: {
        name: "create",
        description: "Create a new Knowledge Hook template",
        usage: "gitvan hooks create <hook-id> [title] [predicate-type]",
        examples: [
          "gitvan hooks create my-hook",
          "gitvan hooks create backup-hook 'Backup Hook' ask",
          "gitvan hooks create threshold-hook 'Threshold Monitor' selectThreshold",
        ],
      },
      args: {
        hookId: {
          type: "positional",
          description: "Hook ID (will be used as filename)",
          required: true,
        },
        title: {
          type: "positional",
          description: "Human-readable title for the hook",
        },
        predicateType: {
          type: "positional",
          description:
            "Predicate type (ask, resultDelta, selectThreshold, shacl)",
          default: "ask",
        },
      },
      async run({ args }) {
        const cli = new HooksCLI();

        try {
          await withGitVan({ cwd: process.cwd() }, async () => {
            const context = useGitVan();
            await cli.initialize(context);

            await cli.create(args.hookId, args.title, args.predicateType);
          });
        } catch (error) {
          console.error(`❌ Failed to create hook: ${error.message}`);
          process.exit(1);
        }
      },
    }),

    /**
     * Show help for hooks commands
     */
    help: defineCommand({
      meta: {
        name: "help",
        description: "Show help for Knowledge Hook commands",
        usage: "gitvan hooks help",
        examples: ["gitvan hooks help"],
      },
      async run() {
        const cli = new HooksCLI();
        cli.help();
      },
    }),
  },

  /**
   * Default action - show help if no subcommand provided
   */
  async run() {
    const cli = new HooksCLI();
    cli.help();
  },
});

export default hooksCommand;
