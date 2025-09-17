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
        try {
          const { PackManager } = await import('../pack/manager.mjs');
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
        } catch (error) {
          consola.error('Failed to list packs:', error.message);
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
        try {
          const { PackManager } = await import('../pack/manager.mjs');
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
          logger.error('Pack apply error:', error);
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
        try {
          const { PackPlanner } = await import('../pack/planner.mjs');
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

          const plan = await planner.plan(packPath, process.cwd(), inputs);

          consola.box('Pack Plan');
          consola.info(`Pack: ${plan.pack.manifest.name} v${plan.pack.manifest.version}`);
          consola.info(`Mode: ${plan.mode}`);
          consola.info(`Steps: ${plan.plan.steps.length}`);

          if (plan.impacts.creates && plan.impacts.creates.length > 0) {
            consola.info('\nFiles to create:');
            for (const file of plan.impacts.creates) {
              consola.info(`  + ${file.path || file.target || file}`);
            }
          }

          if (plan.impacts.modifies && plan.impacts.modifies.length > 0) {
            consola.info('\nFiles to modify:');
            for (const file of plan.impacts.modifies) {
              consola.info(`  ~ ${file.path || file.target || file}`);
            }
          }

          if (plan.impacts.commands && plan.impacts.commands.length > 0) {
            consola.info('\nCommands to run:');
            for (const cmd of plan.impacts.commands) {
              consola.info(`  $ ${cmd.command || cmd.args?.join(' ') || cmd}`);
            }
          }

          if (plan.impacts.conflicts && plan.impacts.conflicts.length > 0) {
            consola.warn('\nConflicts:');
            for (const conflict of plan.impacts.conflicts) {
              consola.warn(`  ! ${conflict}`);
            }
          }
        } catch (error) {
          consola.error('Failed to plan pack:', error.message);
          logger.error('Pack plan error:', error);
        }
      }
    }),

    status: defineCommand({
      meta: {
        name: 'status',
        description: 'Show pack installation status'
      },
      async run() {
        try {
          const { PackManager } = await import('../pack/manager.mjs');
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
        } catch (error) {
          consola.error('Failed to get pack status:', error.message);
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
  try {
    const { PackRegistry } = await import('../pack/registry.mjs');
    const registry = new PackRegistry();
    const registryPath = await registry.resolve(packId);
    if (registryPath) {
      return registryPath;
    }
  } catch (error) {
    logger.warn('Registry unavailable:', error.message);
  }

  return null;
}