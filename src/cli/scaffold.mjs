import { defineCommand } from 'citty';
import { createLogger } from '../utils/logger.mjs';
import consola from 'consola';

const logger = createLogger('cli:scaffold');

export const scaffoldCommand = defineCommand({
  meta: {
    name: 'scaffold',
    description: 'Run a pack scaffold to generate content'
  },
  args: {
    scaffold: {
      type: 'positional',
      required: true,
      description: 'Scaffold ID (pack:scaffold format)'
    },
    inputs: {
      type: 'string',
      description: 'JSON inputs for the scaffold'
    },
    target: {
      type: 'string',
      description: 'Target directory (defaults to current directory)'
    }
  },
  async run({ args }) {
    try {
      const { ScaffoldRunner } = await import('../pack/scaffold.mjs');
      const runner = new ScaffoldRunner();

      // Parse scaffold ID
      const [packId, scaffoldId] = args.scaffold.split(':');
      if (!packId || !scaffoldId) {
        consola.error('Invalid scaffold ID. Use format: pack:scaffold');
        return;
      }

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

      const targetDir = args.target || process.cwd();
      consola.start(`Running scaffold: ${args.scaffold}`);

      const result = await runner.run(packId, scaffoldId, inputs, {
        targetDir,
        interactive: true
      });

      if (result.status === 'OK') {
        consola.success('Scaffold completed successfully');
        consola.info(`Created ${result.created.length} files`);
        for (const file of result.created) {
          consola.info(`  + ${file}`);
        }

        if (result.modified && result.modified.length > 0) {
          consola.info(`Modified ${result.modified.length} files`);
          for (const file of result.modified) {
            consola.info(`  ~ ${file}`);
          }
        }

        if (result.commands && result.commands.length > 0) {
          consola.info('\nRun these commands to complete setup:');
          for (const cmd of result.commands) {
            consola.info(`  $ ${cmd}`);
          }
        }
      } else if (result.status === 'ERROR') {
        consola.error('Scaffold failed:', result.errors);
        if (result.partialResults) {
          consola.warn('Some files were created before the error occurred');
        }
      } else if (result.status === 'PARTIAL') {
        consola.warn(`Scaffold partially completed with ${result.errors.length} errors`);
        consola.info(`Created ${result.created.length} files successfully`);
        for (const error of result.errors) {
          consola.error(`  - ${error.step}: ${error.error}`);
        }
      }
    } catch (error) {
      consola.error('Failed to run scaffold:', error.message);
      logger.error('Scaffold error:', error);
    }
  }
});