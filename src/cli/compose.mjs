import { defineCommand } from 'citty';
import { PackComposer } from '../pack/dependency/composer.mjs';
import { createLogger } from '../utils/logger.mjs';
import consola from 'consola';

const logger = createLogger('cli:compose');

export const composeCommand = defineCommand({
  meta: {
    name: 'compose',
    description: 'Compose multiple packs together'
  },
  args: {
    packs: {
      type: 'positional',
      required: true,
      description: 'Pack IDs to compose (space-separated)',
      multiple: true
    },
    inputs: {
      type: 'string',
      description: 'JSON inputs for packs'
    },
    'ignore-conflicts': {
      type: 'boolean',
      description: 'Continue despite conflicts'
    },
    'continue-on-error': {
      type: 'boolean',
      description: 'Continue if a pack fails'
    }
  },
  async run({ args }) {
    // Handle help case
    if (args.packs && args.packs.includes('help')) {
      consola.info('GitVan Compose Command');
      consola.info('Usage: gitvan compose <pack1> [pack2] ...');
      consola.info('');
      consola.info('Options:');
      consola.info('  --inputs <json>        JSON inputs for packs');
      consola.info('  --ignore-conflicts     Continue despite conflicts');
      consola.info('  --continue-on-error    Continue if a pack fails');
      consola.info('');
      consola.info('Examples:');
      consola.info('  gitvan compose next-minimal');
      consola.info('  gitvan compose next-minimal nodejs-basic');
      consola.info('  gitvan compose next-minimal --inputs \'{"name":"my-app"}\'');
      return;
    }

    const composer = new PackComposer({
      ignoreConflicts: args['ignore-conflicts'],
      continueOnError: args['continue-on-error']
    });
    
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
    
    consola.start(`Composing ${args.packs.length} packs...`);
    
    try {
      const result = await composer.compose(args.packs, process.cwd(), inputs);
      
      if (result.status === 'OK') {
        consola.success('All packs composed successfully');
        console.log(`\n✅ Applied ${result.applied.length} packs:`);
        for (const pack of result.applied) {
          console.log(`   • ${pack.id} v${pack.version}`);
        }
      } else if (result.status === 'PARTIAL') {
        consola.warn('Some packs failed to apply');
        
        if (result.applied.length > 0) {
          console.log(`\n✅ Applied ${result.applied.length} packs:`);
          for (const pack of result.applied) {
            console.log(`   • ${pack.id} v${pack.version}`);
          }
        }
        
        if (result.errors.length > 0) {
          console.log(`\n❌ Failed ${result.errors.length} packs:`);
          for (const error of result.errors) {
            console.log(`   • ${error.id}: ${error.error}`);
          }
        }
      } else if (result.status === 'ERROR') {
        consola.error('Composition failed');
        
        if (result.conflicts?.length > 0) {
          console.log('\n⚠️  Conflicts detected:');
          for (const conflict of result.conflicts) {
            console.log(`   • ${conflict.pack} conflicts with ${conflict.conflictsWith}`);
          }
        }
        
        if (result.errors?.length > 0) {
          console.log('\n❌ Errors:');
          for (const error of result.errors) {
            console.log(`   • ${error}`);
          }
        }
      }
    } catch (error) {
      consola.error('Failed to compose packs:', error.message);
      logger.error('Compose error:', error);
    }
  }
});
