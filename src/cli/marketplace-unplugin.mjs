/**
 * GitVan Marketplace Command - Enhanced with Unplugin Support
 * 
 * This command extends the marketplace functionality to support:
 * - Unplugin-enabled pack discovery
 * - Build tool plugin generation
 * - Cross-framework compatibility browsing
 * - Plugin installation and configuration
 */

import { defineCommand } from 'citty';
import { Marketplace } from '../pack/marketplace.mjs';
import { PackManager } from '../pack/manager.mjs';
import { UnpluginIntegration } from '../pack/unplugin-integration.mjs';
import { createLogger } from '../utils/logger.mjs';
import consola from 'consola';

const logger = createLogger('cli:marketplace');

export const marketplaceCommand = defineCommand({
  meta: {
    name: 'marketplace',
    description: 'Browse and install packs from the GitVan marketplace with unplugin support'
  },
  subCommands: {
    browse: defineCommand({
      meta: {
        name: 'browse',
        description: 'Browse available packs with unplugin support'
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
        framework: {
          type: 'string',
          description: 'Filter by supported build framework (vite, webpack, rollup, esbuild, rspack)'
        },
        unplugin: {
          type: 'boolean',
          description: 'Show only packs with unplugin support'
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
        
        consola.start('Browsing marketplace with unplugin support...');
        
        try {
          const results = await marketplace.browse({
            query: args.query,
            filters: {
              category: args.category,
              tag: args.tag,
              framework: args.framework,
              unplugin: args.unplugin,
            },
            page: args.page,
            limit: args.limit,
          });

          if (results.packs.length === 0) {
            consola.info('No packs found matching your criteria');
            return;
          }

          // Display results with unplugin information
          consola.success(`Found ${results.total} packs`);
          console.log();

          for (const pack of results.packs) {
            console.log(`📦 ${pack.name} v${pack.version}`);
            console.log(`   ${pack.description}`);
            console.log(`   ID: ${pack.id}`);
            
            if (pack.tags && pack.tags.length > 0) {
              console.log(`   Tags: ${pack.tags.join(', ')}`);
            }
            
            if (pack.capabilities && pack.capabilities.length > 0) {
              console.log(`   Capabilities: ${pack.capabilities.join(', ')}`);
            }

            // Show unplugin support
            if (pack.unplugin) {
              console.log(`   🔌 Unplugin Support: ${pack.unplugin.frameworks?.join(', ') || 'All frameworks'}`);
              if (pack.unplugin.description) {
                console.log(`   Plugin: ${pack.unplugin.description}`);
              }
            }

            console.log();
          }

          // Show pagination info
          if (results.totalPages > 1) {
            console.log(`Page ${args.page} of ${results.totalPages}`);
            console.log(`Use --page to navigate, --limit to change page size`);
          }

        } catch (error) {
          consola.error('Failed to browse marketplace:', error.message);
          process.exit(1);
        }
      }
    }),

    install: defineCommand({
      meta: {
        name: 'install',
        description: 'Install a pack with optional unplugin support'
      },
      args: {
        pack: {
          type: 'string',
          description: 'Pack ID to install'
        },
        'generate-plugins': {
          type: 'boolean',
          description: 'Generate unplugin-compatible plugins'
        },
        frameworks: {
          type: 'string',
          description: 'Comma-separated list of frameworks to generate plugins for'
        },
        'output-dir': {
          type: 'string',
          description: 'Directory to output generated plugins'
        }
      },
      async run({ args }) {
        if (!args.pack) {
          consola.error('Pack ID is required');
          process.exit(1);
        }

        const packManager = new PackManager();
        const unpluginIntegration = new UnpluginIntegration({
          outputDir: args['output-dir'] || 'dist/plugins',
          frameworks: args.frameworks ? args.frameworks.split(',') : ['vite', 'webpack', 'rollup'],
        });

        consola.start(`Installing pack: ${args.pack}`);

        try {
          // Install the pack
          const installResult = await packManager.install(args.pack);
          
          if (installResult.success) {
            consola.success(`Pack ${args.pack} installed successfully`);
            
            // Generate unplugin plugins if requested
            if (args['generate-plugins']) {
              consola.start('Generating unplugin-compatible plugins...');
              
              try {
                const packInfo = await packManager.getPackInfo(args.pack);
                if (packInfo && packInfo.unplugin) {
                  const pluginResult = await unpluginIntegration.generatePlugins(
                    packInfo,
                    installResult.path
                  );
                  
                  if (pluginResult) {
                    consola.success(`Generated ${pluginResult.plugins.length} plugins:`);
                    for (const plugin of pluginResult.plugins) {
                      console.log(`   🔌 ${plugin.framework}: ${plugin.path}`);
                    }
                  }
                } else {
                  consola.warn(`Pack ${args.pack} does not have unplugin configuration`);
                }
              } catch (error) {
                consola.error('Failed to generate plugins:', error.message);
              }
            }
          } else {
            consola.error(`Failed to install pack: ${installResult.error}`);
            process.exit(1);
          }

        } catch (error) {
          consola.error('Installation failed:', error.message);
          process.exit(1);
        }
      }
    }),

    plugins: defineCommand({
      meta: {
        name: 'plugins',
        description: 'Manage unplugin-compatible plugins'
      },
      subCommands: {
        list: defineCommand({
          meta: {
            name: 'list',
            description: 'List available unplugin-compatible packs'
          },
          args: {
            framework: {
              type: 'string',
              description: 'Filter by framework'
            }
          },
          async run({ args }) {
            const marketplace = new Marketplace();
            const unpluginIntegration = new UnpluginIntegration();

            consola.start('Discovering unplugin-compatible packs...');

            try {
              const packs = await marketplace.browse({
                filters: { unplugin: true },
              });

              if (packs.packs.length === 0) {
                consola.info('No unplugin-compatible packs found');
                return;
              }

              console.log(`Found ${packs.packs.length} unplugin-compatible packs:`);
              console.log();

              for (const pack of packs.packs) {
                console.log(`📦 ${pack.name} v${pack.version}`);
                console.log(`   ID: ${pack.id}`);
                
                if (pack.unplugin) {
                  const frameworks = pack.unplugin.frameworks || ['vite', 'webpack', 'rollup'];
                  console.log(`   🔌 Frameworks: ${frameworks.join(', ')}`);
                  
                  if (args.framework && !frameworks.includes(args.framework)) {
                    continue;
                  }
                }

                console.log();
              }

            } catch (error) {
              consola.error('Failed to list plugins:', error.message);
              process.exit(1);
            }
          }
        }),

        generate: defineCommand({
          meta: {
            name: 'generate',
            description: 'Generate unplugin-compatible plugins from installed packs'
          },
          args: {
            pack: {
              type: 'string',
              description: 'Pack ID to generate plugins for'
            },
            frameworks: {
              type: 'string',
              description: 'Comma-separated list of frameworks'
            },
            'output-dir': {
              type: 'string',
              description: 'Output directory for generated plugins'
            }
          },
          async run({ args }) {
            const packManager = new PackManager();
            const unpluginIntegration = new UnpluginIntegration({
              outputDir: args['output-dir'] || 'dist/plugins',
              frameworks: args.frameworks ? args.frameworks.split(',') : ['vite', 'webpack', 'rollup'],
            });

            if (!args.pack) {
              consola.error('Pack ID is required');
              process.exit(1);
            }

            consola.start(`Generating plugins for pack: ${args.pack}`);

            try {
              const packInfo = await packManager.getPackInfo(args.pack);
              if (!packInfo) {
                consola.error(`Pack ${args.pack} not found`);
                process.exit(1);
              }

              if (!packInfo.unplugin) {
                consola.error(`Pack ${args.pack} does not have unplugin configuration`);
                process.exit(1);
              }

              const pluginResult = await unpluginIntegration.generatePlugins(
                packInfo,
                packInfo.path
              );

              if (pluginResult) {
                consola.success(`Generated ${pluginResult.plugins.length} plugins:`);
                for (const plugin of pluginResult.plugins) {
                  console.log(`   🔌 ${plugin.framework}: ${plugin.path}`);
                }
              }

            } catch (error) {
              consola.error('Failed to generate plugins:', error.message);
              process.exit(1);
            }
          }
        }),

        registry: defineCommand({
          meta: {
            name: 'registry',
            description: 'Generate plugin registry for all unplugin-compatible packs'
          },
          args: {
            'output-file': {
              type: 'string',
              description: 'Output file for plugin registry'
            }
          },
          async run({ args }) {
            const marketplace = new Marketplace();
            const unpluginIntegration = new UnpluginIntegration();

            consola.start('Generating plugin registry...');

            try {
              const registry = await unpluginIntegration.generatePluginRegistry(marketplace.registry);

              const outputFile = args['output-file'] || 'plugin-registry.json';
              const { writeFileSync } = await import('node:fs');
              writeFileSync(outputFile, JSON.stringify(registry, null, 2));

              consola.success(`Plugin registry generated: ${outputFile}`);
              console.log(`   📦 ${registry.plugins.length} packs with unplugin support`);
              console.log(`   🔌 ${registry.plugins.reduce((sum, p) => sum + p.plugins.length, 0)} total plugins`);

            } catch (error) {
              consola.error('Failed to generate plugin registry:', error.message);
              process.exit(1);
            }
          }
        }),

        install: defineCommand({
          meta: {
            name: 'install',
            description: 'Install unplugin dependencies'
          },
          async run() {
            const unpluginIntegration = new UnpluginIntegration();

            consola.start('Installing unplugin dependencies...');

            try {
              const dependencies = await unpluginIntegration.installDependencies();
              consola.success('Unplugin dependencies installed successfully');
              console.log(`   📦 ${dependencies.length} packages installed`);

            } catch (error) {
              consola.error('Failed to install dependencies:', error.message);
              process.exit(1);
            }
          }
        })
      }
    }),

    search: defineCommand({
      meta: {
        name: 'search',
        description: 'Search packs with unplugin support'
      },
      args: {
        query: {
          type: 'string',
          description: 'Search query'
        },
        framework: {
          type: 'string',
          description: 'Filter by framework support'
        },
        unplugin: {
          type: 'boolean',
          description: 'Only show packs with unplugin support'
        }
      },
      async run({ args }) {
        if (!args.query) {
          consola.error('Search query is required');
          process.exit(1);
        }

        const marketplace = new Marketplace();

        consola.start(`Searching for: ${args.query}`);

        try {
          const results = await marketplace.search(args.query, {
            framework: args.framework,
            unplugin: args.unplugin,
          });

          if (results.length === 0) {
            consola.info('No packs found matching your search');
            return;
          }

          console.log(`Found ${results.length} packs:`);
          console.log();

          for (const pack of results) {
            console.log(`📦 ${pack.name} v${pack.version}`);
            console.log(`   ${pack.description}`);
            console.log(`   ID: ${pack.id}`);
            
            if (pack.unplugin) {
              console.log(`   🔌 Unplugin: ${pack.unplugin.frameworks?.join(', ') || 'All frameworks'}`);
            }

            console.log();
          }

        } catch (error) {
          consola.error('Search failed:', error.message);
          process.exit(1);
        }
      }
    })
  }
});
