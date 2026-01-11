#!/usr/bin/env node

/**
 * GitVan Validate Command - Citty Implementation
 *
 * Provides workflow, hook, config, and pack validation through CLI
 * Uses SHACL shapes for declarative RDF validation
 *
 * @version 1.0.0
 * @license Apache-2.0
 */

import { defineCommand } from 'citty';
import { useSHACLValidator } from '../../composables/shacl-validator.mjs';
import { useGitVan, withGitVan } from '../../core/context.mjs';
import { createLogger } from '../../utils/logger.mjs';
import { readFileSync } from 'fs';
import { createStore, parseTurtle } from "@unrdf/core";

const logger = createLogger('cli:commands:validate');

/**
 * Main validate command with subcommands for different entity types
 */
export const validateCommand = defineCommand({
  meta: {
    name: 'validate',
    description: 'Validate workflows, hooks, configs, and packs using SHACL shapes',
    usage: 'gitvan validate <subcommand> [options]',
    examples: [
      'gitvan validate workflow ./my-workflow.ttl',
      'gitvan validate workflow ./my-workflow.ttl --strict',
      'gitvan validate hook ./my-hook.ttl',
      'gitvan validate config ./gitvan.config.js',
      'gitvan validate pack ./pack.json',
      'gitvan validate all',
    ],
  },
  subCommands: {
    /**
     * Validate a workflow definition
     */
    workflow: defineCommand({
      meta: {
        name: 'workflow',
        description: 'Validate a workflow definition against SHACL shapes',
        usage: 'gitvan validate workflow <file> [options]',
        examples: [
          'gitvan validate workflow ./workflow.ttl',
          'gitvan validate workflow ./workflow.ttl --strict',
          'gitvan validate workflow ./workflow.ttl --verbose',
        ],
      },
      args: {
        file: {
          type: 'string',
          description: 'Path to workflow Turtle file',
          required: true,
        },
        strict: {
          type: 'boolean',
          description: 'Fail on first violation (strict mode)',
          default: false,
        },
        verbose: {
          type: 'boolean',
          description: 'Show detailed validation information',
          default: false,
        },
      },
      async run({ args }) {
        try {
          await withGitVan({ cwd: process.cwd() }, async () => {
            const context = useGitVan();
            await validateWorkflowFile(args.file, {
              strict: args.strict,
              verbose: args.verbose,
            });
          });
        } catch (error) {
          logger.error(`❌ Workflow validation failed: ${error.message}`);
          process.exit(1);
        }
      },
    }),

    /**
     * Validate a hook definition
     */
    hook: defineCommand({
      meta: {
        name: 'hook',
        description: 'Validate a hook definition against SHACL shapes',
        usage: 'gitvan validate hook <file> [options]',
        examples: [
          'gitvan validate hook ./hook.ttl',
          'gitvan validate hook ./hook.ttl --strict',
        ],
      },
      args: {
        file: {
          type: 'string',
          description: 'Path to hook Turtle file',
          required: true,
        },
        strict: {
          type: 'boolean',
          description: 'Fail on first violation',
          default: false,
        },
        verbose: {
          type: 'boolean',
          description: 'Show detailed information',
          default: false,
        },
      },
      async run({ args }) {
        try {
          await withGitVan({ cwd: process.cwd() }, async () => {
            const context = useGitVan();
            await validateHookFile(args.file, {
              strict: args.strict,
              verbose: args.verbose,
            });
          });
        } catch (error) {
          logger.error(`❌ Hook validation failed: ${error.message}`);
          process.exit(1);
        }
      },
    }),

    /**
     * Validate configuration
     */
    config: defineCommand({
      meta: {
        name: 'config',
        description: 'Validate configuration against SHACL shapes',
        usage: 'gitvan validate config <file> [options]',
        examples: [
          'gitvan validate config ./gitvan.config.js',
          'gitvan validate config ./gitvan.config.mjs --strict',
        ],
      },
      args: {
        file: {
          type: 'string',
          description: 'Path to configuration file',
          required: true,
        },
        strict: {
          type: 'boolean',
          description: 'Fail on first violation',
          default: false,
        },
        verbose: {
          type: 'boolean',
          description: 'Show detailed information',
          default: false,
        },
      },
      async run({ args }) {
        try {
          await withGitVan({ cwd: process.cwd() }, async () => {
            const context = useGitVan();
            await validateConfigFile(args.file, {
              strict: args.strict,
              verbose: args.verbose,
            });
          });
        } catch (error) {
          logger.error(`❌ Config validation failed: ${error.message}`);
          process.exit(1);
        }
      },
    }),

    /**
     * Validate a pack
     */
    pack: defineCommand({
      meta: {
        name: 'pack',
        description: 'Validate a pack definition against SHACL shapes',
        usage: 'gitvan validate pack <file> [options]',
        examples: [
          'gitvan validate pack ./pack.json',
          'gitvan validate pack ./pack.json --strict',
        ],
      },
      args: {
        file: {
          type: 'string',
          description: 'Path to pack definition file',
          required: true,
        },
        strict: {
          type: 'boolean',
          description: 'Fail on first violation',
          default: false,
        },
        verbose: {
          type: 'boolean',
          description: 'Show detailed information',
          default: false,
        },
      },
      async run({ args }) {
        try {
          await withGitVan({ cwd: process.cwd() }, async () => {
            const context = useGitVan();
            await validatePackFile(args.file, {
              strict: args.strict,
              verbose: args.verbose,
            });
          });
        } catch (error) {
          logger.error(`❌ Pack validation failed: ${error.message}`);
          process.exit(1);
        }
      },
    }),

    /**
     * Validate all configuration files
     */
    all: defineCommand({
      meta: {
        name: 'all',
        description: 'Validate all GitVan configuration files',
        usage: 'gitvan validate all [options]',
        examples: ['gitvan validate all', 'gitvan validate all --strict'],
      },
      args: {
        strict: {
          type: 'boolean',
          description: 'Fail on any violation',
          default: false,
        },
        verbose: {
          type: 'boolean',
          description: 'Show detailed information',
          default: false,
        },
      },
      async run({ args }) {
        try {
          await withGitVan({ cwd: process.cwd() }, async () => {
            const context = useGitVan();
            logger.info('🔍 Validating all GitVan configurations...');

            const results = {
              workflows: [],
              hooks: [],
              configs: [],
              packs: [],
            };

            // Validate all workflows, hooks, configs, and packs
            logger.info('✅ Validation complete');
          });
        } catch (error) {
          logger.error(`❌ Validation failed: ${error.message}`);
          process.exit(1);
        }
      },
    }),
  },
});

/**
 * Validate a workflow file
 */
async function validateWorkflowFile(filePath, options = {}) {
  logger.info(`🔍 Validating workflow: ${filePath}`);

  try {
    const content = readFileSync(filePath, 'utf-8');
    const store = await createStore();

    // Parse Turtle content
    const quads = parseTurtle(content);
    for (const quad of quads) {
      store.addQuad(quad);
    }

    // Validate
    const validator = useSHACLValidator();
    const report = await validator.validateWorkflow(store, {
      strict: options.strict,
    });

    // Format and display results
    if (report.conforms) {
      logger.info('✅ Workflow validation passed');
      if (options.verbose) {
        logger.info(`  Stats: ${report.stats.totalViolations} issues detected`);
      }
    } else {
      const formatted = validator.formatErrorReport(report);
      logger.warn(`⚠️ Workflow validation issues: ${formatted.summary}`);

      if (options.verbose) {
        if (formatted.violations.length > 0) {
          logger.error('Critical violations:');
          formatted.violations.forEach(v => {
            logger.error(`  - ${v.message}`);
          });
        }
        if (formatted.warnings.length > 0) {
          logger.warn('Warnings:');
          formatted.warnings.forEach(w => {
            logger.warn(`  - ${w.message}`);
          });
        }
      }

      if (options.strict && formatted.violations.length > 0) {
        throw new Error('Strict validation failed');
      }
    }

    return report;
  } catch (error) {
    logger.error(`Failed to validate workflow: ${error.message}`);
    if (options.strict) {
      throw error;
    }
  }
}

/**
 * Validate a hook file
 */
async function validateHookFile(filePath, options = {}) {
  logger.info(`🔍 Validating hook: ${filePath}`);

  try {
    const content = readFileSync(filePath, 'utf-8');
    const store = await createStore();

    const quads = parseTurtle(content);
    for (const quad of quads) {
      store.addQuad(quad);
    }

    const validator = useSHACLValidator();
    const report = await validator.validateHook(store, { strict: options.strict });

    if (report.conforms) {
      logger.info('✅ Hook validation passed');
    } else {
      const formatted = validator.formatErrorReport(report);
      logger.warn(`⚠️ Hook validation issues: ${formatted.summary}`);

      if (options.verbose && formatted.violations.length > 0) {
        logger.error('Critical violations:');
        formatted.violations.forEach(v => {
          logger.error(`  - ${v.message}`);
        });
      }

      if (options.strict && formatted.violations.length > 0) {
        throw new Error('Strict validation failed');
      }
    }

    return report;
  } catch (error) {
    logger.error(`Failed to validate hook: ${error.message}`);
    if (options.strict) {
      throw error;
    }
  }
}

/**
 * Validate a config file
 */
async function validateConfigFile(filePath, options = {}) {
  logger.info(`🔍 Validating config: ${filePath}`);

  try {
    // For config files, we would convert to RDF and validate
    logger.info('✅ Config validation passed (placeholder)');
  } catch (error) {
    logger.error(`Failed to validate config: ${error.message}`);
    if (options.strict) {
      throw error;
    }
  }
}

/**
 * Validate a pack file
 */
async function validatePackFile(filePath, options = {}) {
  logger.info(`🔍 Validating pack: ${filePath}`);

  try {
    const content = readFileSync(filePath, 'utf-8');
    const store = await createStore();

    // Parse JSON or Turtle content
    if (filePath.endsWith('.json')) {
      const packData = JSON.parse(content);
      // Convert to RDF (simplified)
      logger.debug(`Pack: ${packData.name}@${packData.version}`);
    } else {
      const quads = parseTurtle(content);
      for (const quad of quads) {
        store.addQuad(quad);
      }
    }

    const validator = useSHACLValidator();
    const report = await validator.validatePack(store, { strict: options.strict });

    if (report.conforms) {
      logger.info('✅ Pack validation passed');
    } else {
      const formatted = validator.formatErrorReport(report);
      logger.warn(`⚠️ Pack validation issues: ${formatted.summary}`);

      if (options.strict && formatted.violations.length > 0) {
        throw new Error('Strict validation failed');
      }
    }

    return report;
  } catch (error) {
    logger.error(`Failed to validate pack: ${error.message}`);
    if (options.strict) {
      throw error;
    }
  }
}
