import { defineCommand } from 'citty';
import { createLogger } from '../utils/logger.mjs';
import { resolve, join } from 'pathe';
import { existsSync, readFileSync } from 'node:fs';
import consola from 'consola';

const logger = createLogger('cli:pack');

export const packCommand = defineCommand({
  meta: {
    name: 'pack',
    description: 'Manage GitVan packs'
  },
  subCommands: {
    list: defineCommand({
      meta: {
        name: 'list',
        description: 'List installed packs'
      },
      async run() {
        const manager = new PackManager();
        const status = await manager.status(process.cwd());

        if (status.total === 0) {
          consola.info('No packs installed');
          return;
        }

        consola.box('Installed Packs');
        for (const pack of status.installed) {
          consola.info(`${pack.id} v${pack.version} (${pack.mode})`);
          consola.info(`  Applied: ${pack.applied}`);
          consola.info(`  Fingerprint: ${pack.fingerprint}`);
        }
      }
    }),

    apply: defineCommand({
      meta: {
        name: 'apply',
        description: 'Apply a pack to the current repository'
      },
      args: {
        pack: {
          type: 'positional',
          required: true,
          description: 'Pack path or ID'
        },
        inputs: {
          type: 'string',
          description: 'JSON inputs for the pack'
        },
        mode: {
          type: 'string',
          description: 'Installation mode (new-repo or existing-repo)'
        },
        yes: {
          type: 'boolean',
          alias: 'y',
          description: 'Skip confirmation prompts'
        }
      },
      async run({ args }) {
        const manager = new PackManager({ interactive: !args.yes });

        // Parse inputs
        let inputs = {};
        if (args.inputs) {
          try {
            inputs = JSON.parse(args.inputs);
          } catch (e) {
            consola.error('Invalid JSON inputs:', e.message);
            return;
          }
        }

        // Resolve pack path
        const packPath = await resolvePackPath(args.pack);
        if (!packPath) {
          consola.error(`Pack not found: ${args.pack}`);
          return;
        }

        consola.start(`Applying pack: ${args.pack}`);

        try {
          const result = await manager.applier.apply(
            packPath,
            process.cwd(),
            inputs
          );

          if (result.status === 'OK') {
            consola.success(`Pack applied successfully`);
            consola.info(`Applied ${result.applied.length} steps`);
          } else if (result.status === 'SKIP') {
            consola.info(result.message);
          } else if (result.status === 'ERROR') {
            consola.error('Pack application failed:', result.errors);
          } else if (result.status === 'PARTIAL') {
            consola.warn(`Pack partially applied with ${result.errors.length} errors`);
            for (const error of result.errors) {
              consola.error(`  - ${error.error}`);
            }
          }
        } catch (error) {
          consola.error('Failed to apply pack:', error.message);
        }
      }
    }),

    plan: defineCommand({
      meta: {
        name: 'plan',
        description: 'Show what a pack would do (dry-run)'
      },
      args: {
        pack: {
          type: 'positional',
          required: true,
          description: 'Pack path or ID'
        },
        inputs: {
          type: 'string',
          description: 'JSON inputs for the pack'
        },
        mode: {
          type: 'string',
          description: 'Installation mode'
        }
      },
      async run({ args }) {
        const planner = new PackPlanner({ mode: args.mode });

        // Parse inputs
        let inputs = {};
        if (args.inputs) {
          try {
            inputs = JSON.parse(args.inputs);
          } catch (e) {
            consola.error('Invalid JSON inputs:', e.message);
            return;
          }
        }

        // Resolve pack path
        const packPath = await resolvePackPath(args.pack);
        if (!packPath) {
          consola.error(`Pack not found: ${args.pack}`);
          return;
        }

        consola.start(`Planning pack: ${args.pack}`);

        try {
          const plan = await planner.plan(packPath, process.cwd(), inputs);

          consola.box('Pack Plan');
          consola.info(`Pack: ${plan.pack.name} v${plan.pack.version}`);
          consola.info(`Mode: ${plan.mode}`);
          consola.info(`Steps: ${plan.plan.steps.length}`);

          if (plan.impacts.creates.length > 0) {
            consola.info('\nFiles to create:');
            for (const file of plan.impacts.creates) {
              consola.info(`  + ${file}`);
            }
          }

          if (plan.impacts.modifies.length > 0) {
            consola.info('\nFiles to modify:');
            for (const file of plan.impacts.modifies) {
              consola.info(`  ~ ${file}`);
            }
          }

          if (plan.impacts.commands.length > 0) {
            consola.info('\nCommands to run:');
            for (const cmd of plan.impacts.commands) {
              consola.info(`  $ ${cmd}`);
            }
          }

          if (plan.impacts.risks.length > 0) {
            consola.warn('\nRisks:');
            for (const risk of plan.impacts.risks) {
              consola.warn(`  ! ${risk}`);
            }
          }
        } catch (error) {
          consola.error('Failed to plan pack:', error.message);
        }
      }
    }),

    remove: defineCommand({
      meta: {
        name: 'remove',
        description: 'Remove an installed pack'
      },
      args: {
        pack: {
          type: 'positional',
          required: true,
          description: 'Pack ID to remove'
        },
        yes: {
          type: 'boolean',
          alias: 'y',
          description: 'Skip confirmation'
        }
      },
      async run({ args }) {
        const manager = new PackManager();

        if (!args.yes) {
          const confirmed = await consola.prompt(
            `Remove pack ${args.pack}? This may delete files.`,
            { type: 'confirm' }
          );
          if (!confirmed) {
            consola.info('Cancelled');
            return;
          }
        }

        consola.start(`Removing pack: ${args.pack}`);

        try {
          const result = await manager.remove(args.pack, process.cwd());

          if (result.status === 'OK') {
            consola.success(`Pack removed successfully`);
            if (result.removed.length > 0) {
              consola.info(`Removed ${result.removed.length} files`);
            }
          } else if (result.status === 'NOT_FOUND') {
            consola.error(result.message);
          }
        } catch (error) {
          consola.error('Failed to remove pack:', error.message);
        }
      }
    }),

    update: defineCommand({
      meta: {
        name: 'update',
        description: 'Update an installed pack to a new version'
      },
      args: {
        pack: {
          type: 'positional',
          required: true,
          description: 'Pack path or ID'
        },
        inputs: {
          type: 'string',
          description: 'JSON inputs for the pack'
        }
      },
      async run({ args }) {
        const manager = new PackManager();

        // Parse inputs
        let inputs = {};
        if (args.inputs) {
          try {
            inputs = JSON.parse(args.inputs);
          } catch (e) {
            consola.error('Invalid JSON inputs:', e.message);
            return;
          }
        }

        // Resolve pack path
        const packPath = await resolvePackPath(args.pack);
        if (!packPath) {
          consola.error(`Pack not found: ${args.pack}`);
          return;
        }

        consola.start(`Updating pack: ${args.pack}`);

        try {
          const result = await manager.update(packPath, process.cwd(), inputs);

          if (result.status === 'OK') {
            consola.success(`Pack updated successfully`);
            if (result.previousVersion) {
              consola.info(`Updated from ${result.previousVersion} to ${result.pack.manifest.version}`);
            }
          } else if (result.status === 'CURRENT') {
            consola.info(result.message);
          } else if (result.status === 'ERROR') {
            consola.error('Pack update failed:', result.errors);
          }
        } catch (error) {
          consola.error('Failed to update pack:', error.message);
        }
      }
    }),

    status: defineCommand({
      meta: {
        name: 'status',
        description: 'Show pack installation status'
      },
      async run() {
        const manager = new PackManager();
        const status = await manager.status(process.cwd());

        consola.box('Pack Status');
        consola.info(`Total packs: ${status.total}`);

        if (status.total > 0) {
          consola.info('\nInstalled:');
          for (const pack of status.installed) {
            consola.info(`  - ${pack.id} v${pack.version} (${pack.mode})`);
          }
        }
      }
    })
  },
  async run() {
    consola.info('Use "gitvan pack --help" to see available commands');
  }
});

async function resolvePackPath(packId) {
  // Check if it's a local path
  if (existsSync(packId)) {
    return resolve(packId);
  }

  // Check in .gitvan/packs directory
  const localPackPath = join(process.cwd(), '.gitvan', 'packs', packId);
  if (existsSync(localPackPath)) {
    return localPackPath;
  }

  // Check in packs directory
  const packsPath = join(process.cwd(), 'packs', packId);
  if (existsSync(packsPath)) {
    return packsPath;
  }

  // Would check marketplace/registry here
  const registry = new PackRegistry();
  const registryPath = await registry.resolve(packId);
  if (registryPath) {
    return registryPath;
  }

  return null;
}