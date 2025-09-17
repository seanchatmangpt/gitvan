import { defineCommand } from 'citty';
import { Marketplace } from '../pack/marketplace.mjs';
import { PackManager } from '../pack/manager.mjs';
import { createLogger } from '../utils/logger.mjs';
import consola from 'consola';

const logger = createLogger('cli:marketplace');

export const marketplaceCommand = defineCommand({
  meta: {
    name: 'marketplace',
    description: 'Browse and install packs from the GitVan marketplace'
  },
  subCommands: {
    browse: defineCommand({
      meta: {
        name: 'browse',
        description: 'Browse available packs'
      },
      args: {
        query: {
          type: 'string',
          description: 'Search query'
        },
        category: {
          type: 'string',
          description: 'Filter by category'
        },
        tag: {
          type: 'string',
          description: 'Filter by tag'
        },
        page: {
          type: 'number',
          default: 1,
          description: 'Page number'
        },
        limit: {
          type: 'number',
          default: 20,
          description: 'Results per page'
        }
      },
      async run({ args }) {
        const marketplace = new Marketplace();
        
        consola.start('Browsing marketplace...');
        
        try {
          const results = await marketplace.browse({
            query: args.query,
            filters: {
              capability: args.category,
              tag: args.tag
            },
            page: args.page,
            limit: args.limit
          });
          
          if (results.total === 0) {
            consola.info('No packs found matching your criteria');
            return;
          }
          
          consola.box(`GitVan Marketplace - Page ${results.page}/${results.pages}`);
          
          for (const pack of results.packs) {
            console.log(`\n📦 ${pack.id} v${pack.version}`);
            console.log(`   ${pack.description}`);
            
            if (pack.tags?.length > 0) {
              console.log(`   🏷️  ${pack.tags.join(', ')}`);
            }
            
            if (pack.capabilities?.length > 0) {
              console.log(`   ⚡ ${pack.capabilities.join(', ')}`);
            }
            
            if (pack.downloads > 0) {
              console.log(`   📥 ${pack.downloads} downloads`);
            }
            
            if (pack.rating > 0) {
              const stars = '★'.repeat(Math.floor(pack.rating)) + '☆'.repeat(5 - Math.floor(pack.rating));
              console.log(`   ${stars} (${pack.rating}/5)`);
            }
          }
          
          if (results.pages > 1) {
            console.log(`\n📄 Showing ${results.packs.length} of ${results.total} packs`);
            console.log(`   Use --page ${results.page + 1} to see more`);
          }
        } catch (error) {
          consola.error('Failed to browse marketplace:', error.message);
          logger.error('Browse error:', error);
        }
      }
    }),

    search: defineCommand({
      meta: {
        name: 'search',
        description: 'Search for specific packs'
      },
      args: {
        query: {
          type: 'positional',
          required: true,
          description: 'Search query'
        },
        limit: {
          type: 'number',
          default: 10,
          description: 'Maximum results'
        }
      },
      async run({ args }) {
        const marketplace = new Marketplace();
        
        consola.start(`Searching for "${args.query}"...`);
        
        try {
          const results = await marketplace.browse({
            query: args.query,
            limit: args.limit
          });
          
          if (results.total === 0) {
            consola.info('No packs found');
            return;
          }
          
          consola.success(`Found ${results.total} packs`);
          
          for (const pack of results.packs) {
            console.log(`\n📦 ${pack.id} v${pack.version} - ${pack.description}`);
            console.log(`   Install: gitvan pack apply ${pack.id}`);
          }
        } catch (error) {
          consola.error('Search failed:', error.message);
          logger.error('Search error:', error);
        }
      }
    }),

    inspect: defineCommand({
      meta: {
        name: 'inspect',
        description: 'Get detailed information about a pack'
      },
      args: {
        pack: {
          type: 'positional',
          required: true,
          description: 'Pack ID to inspect'
        }
      },
      async run({ args }) {
        const marketplace = new Marketplace();
        
        consola.start(`Inspecting ${args.pack}...`);
        
        try {
          const pack = await marketplace.inspect(args.pack);
          
          consola.box(`📦 ${pack.id} v${pack.version}`);
          
          console.log('\n📝 Description:');
          console.log(`   ${pack.description}`);
          
          if (pack.author) {
            console.log('\n👤 Author:');
            console.log(`   ${pack.author}`);
          }
          
          if (pack.license) {
            console.log('\n📄 License:');
            console.log(`   ${pack.license}`);
          }
          
          if (pack.homepage) {
            console.log('\n🌐 Homepage:');
            console.log(`   ${pack.homepage}`);
          }
          
          if (pack.repository) {
            console.log('\n📚 Repository:');
            console.log(`   ${pack.repository}`);
          }
          
          console.log('\n🎯 Capabilities:');
          for (const cap of pack.capabilities || []) {
            console.log(`   • ${cap}`);
          }
          
          console.log('\n📋 Requirements:');
          if (pack.requires?.gitvan) {
            console.log(`   • GitVan: ${pack.requires.gitvan}`);
          }
          if (pack.requires?.node) {
            console.log(`   • Node.js: ${pack.requires.node}`);
          }
          if (pack.requires?.git) {
            console.log(`   • Git: ${pack.requires.git}`);
          }
          
          console.log('\n📦 Provides:');
          console.log(`   • Templates: ${pack.provides?.templates || 0}`);
          console.log(`   • Files: ${pack.provides?.files || 0}`);
          console.log(`   • Jobs: ${pack.provides?.jobs || 0}`);
          console.log(`   • Events: ${pack.provides?.events || 0}`);
          console.log(`   • Scaffolds: ${pack.provides?.scaffolds || 0}`);
          
          if (pack.inputs?.length > 0) {
            console.log('\n⚙️  Configuration:');
            for (const input of pack.inputs) {
              const required = input.default === undefined ? ' (required)' : '';
              console.log(`   • ${input.key}: ${input.type}${required}`);
              if (input.prompt) {
                console.log(`     ${input.prompt}`);
              }
            }
          }
          
          console.log('\n📊 Statistics:');
          console.log(`   • Downloads: ${pack.downloads || 0}`);
          console.log(`   • Rating: ${pack.rating || 0}/5 (${pack.reviews || 0} reviews)`);
          
          console.log('\n💻 Installation:');
          console.log(`   gitvan pack apply ${pack.id}`);
          
          if (pack.inputs?.length > 0) {
            console.log('\n   With configuration:');
            const exampleInputs = {};
            for (const input of pack.inputs) {
              exampleInputs[input.key] = input.default || `<${input.type}>`;
            }
            console.log(`   gitvan pack apply ${pack.id} --inputs '${JSON.stringify(exampleInputs)}'`);
          }
        } catch (error) {
          consola.error('Failed to inspect pack:', error.message);
          logger.error('Inspect error:', error);
        }
      }
    }),

    quickstart: defineCommand({
      meta: {
        name: 'quickstart',
        description: 'Get quickstart packs for specific categories'
      },
      args: {
        category: {
          type: 'positional',
          description: 'Category (docs, next, compliance, enterprise)'
        }
      },
      async run({ args }) {
        const marketplace = new Marketplace();
        
        const categories = ['docs', 'next', 'compliance', 'enterprise'];
        
        if (args.category && !categories.includes(args.category)) {
          consola.error(`Invalid category. Choose from: ${categories.join(', ')}`);
          return;
        }
        
        if (!args.category) {
          consola.box('GitVan Quickstart Categories');
          
          console.log('\n📚 Documentation (docs)');
          console.log('   Changelog generation, MDBook, release notes');
          console.log('   gitvan marketplace quickstart docs');
          
          console.log('\n⚛️  Next.js (next)');
          console.log('   Next.js apps with TypeScript, MDX, and automation');
          console.log('   gitvan marketplace quickstart next');
          
          console.log('\n✅ Compliance (compliance)');
          console.log('   QMS, audit trails, attestation reports');
          console.log('   gitvan marketplace quickstart compliance');
          
          console.log('\n🏢 Enterprise (enterprise)');
          console.log('   Enterprise starters, incident management, ops');
          console.log('   gitvan marketplace quickstart enterprise');
          
          return;
        }
        
        consola.start(`Loading ${args.category} quickstart packs...`);
        
        try {
          const quickstart = await marketplace.quickstart(args.category);
          
          consola.box(`${args.category.toUpperCase()} Quickstart Packs`);
          
          for (const pack of quickstart.packs) {
            console.log(`\n📦 ${pack.id} v${pack.version}`);
            console.log(`   ${pack.description}`);
            console.log(`   Install: gitvan pack apply ${pack.id}`);
          }
          
          console.log('\n🚀 Quick Install All:');
          console.log(`   gitvan pack compose ${quickstart.packs.map(p => p.id).join(' ')}`);
        } catch (error) {
          consola.error('Failed to load quickstart:', error.message);
          logger.error('Quickstart error:', error);
        }
      }
    }),

    install: defineCommand({
      meta: {
        name: 'install',
        description: 'Install a pack from the marketplace'
      },
      args: {
        pack: {
          type: 'positional',
          required: true,
          description: 'Pack ID to install'
        },
        inputs: {
          type: 'string',
          description: 'JSON inputs for the pack'
        },
        yes: {
          type: 'boolean',
          alias: 'y',
          description: 'Skip confirmation'
        }
      },
      async run({ args }) {
        const marketplace = new Marketplace();
        const manager = new PackManager();
        
        consola.start(`Installing ${args.pack} from marketplace...`);
        
        try {
          // Get pack info
          const packInfo = await marketplace.inspect(args.pack);
          
          console.log(`\n📦 ${packInfo.name || packInfo.id} v${packInfo.version}`);
          console.log(`   ${packInfo.description}`);
          
          if (!args.yes) {
            const confirmed = await consola.prompt(
              'Install this pack?',
              { type: 'confirm' }
            );
            if (!confirmed) {
              consola.info('Installation cancelled');
              return;
            }
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
          
          // Download and install
          const registry = marketplace.registry;
          const packPath = await registry.resolve(args.pack);
          
          if (!packPath) {
            consola.error('Failed to download pack');
            return;
          }
          
          const result = await manager.applier.apply(packPath, process.cwd(), inputs);
          
          if (result.status === 'OK') {
            consola.success('Pack installed successfully');
          } else {
            consola.error('Installation failed:', result.errors);
          }
        } catch (error) {
          consola.error('Failed to install pack:', error.message);
          logger.error('Install error:', error);
        }
      }
    })
  },
  async run() {
    consola.info('Use "gitvan marketplace --help" to see available commands');
  }
});
