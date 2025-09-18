/**
 * GitVan CLI - Enhanced Marketplace Command with Unplugin Support
 * 
 * This is the main CLI command that integrates unplugin support into GitVan's marketplace
 */

import { defineCommand } from 'citty';
import { marketplaceCommand } from './marketplace-unplugin.mjs';
import { createLogger } from '../utils/logger.mjs';
import consola from 'consola';

const logger = createLogger('cli:marketplace');

export const enhancedMarketplaceCommand = defineCommand({
  meta: {
    name: 'marketplace',
    description: 'GitVan Marketplace with unplugin support for build tool integration'
  },
  subCommands: {
    // Include all the unplugin-enhanced marketplace commands
    ...marketplaceCommand.subCommands,
    
    // Additional unplugin-specific commands
    'unplugin': defineCommand({
      meta: {
        name: 'unplugin',
        description: 'Unplugin-specific marketplace operations'
      },
      subCommands: {
        'discover': defineCommand({
          meta: {
            name: 'discover',
            description: 'Discover packs with unplugin support'
          },
          args: {
            framework: {
              type: 'string',
              description: 'Filter by framework support'
            },
            'output-format': {
              type: 'string',
              description: 'Output format (json, table, list)',
              default: 'table'
            }
          },
          async run({ args }) {
            const { Marketplace } = await import('../pack/marketplace.mjs');
            const marketplace = new Marketplace();

            consola.start('Discovering unplugin-compatible packs...');

            try {
              const results = await marketplace.browse({
                filters: { unplugin: true },
              });

              if (results.packs.length === 0) {
                consola.info('No unplugin-compatible packs found');
                return;
              }

              // Filter by framework if specified
              let filteredPacks = results.packs;
              if (args.framework) {
                filteredPacks = results.packs.filter(pack => 
                  pack.unplugin && 
                  pack.unplugin.frameworks && 
                  pack.unplugin.frameworks.includes(args.framework)
                );
              }

              if (args['output-format'] === 'json') {
                console.log(JSON.stringify(filteredPacks, null, 2));
              } else if (args['output-format'] === 'list') {
                for (const pack of filteredPacks) {
                  console.log(`${pack.id} - ${pack.name} v${pack.version}`);
                }
              } else {
                // Table format
                console.log(`Found ${filteredPacks.length} unplugin-compatible packs:`);
                console.log();
                
                for (const pack of filteredPacks) {
                  console.log(`📦 ${pack.name} v${pack.version}`);
                  console.log(`   ID: ${pack.id}`);
                  console.log(`   Description: ${pack.description}`);
                  
                  if (pack.unplugin) {
                    const frameworks = pack.unplugin.frameworks || ['vite', 'webpack', 'rollup'];
                    console.log(`   🔌 Frameworks: ${frameworks.join(', ')}`);
                    
                    if (pack.unplugin.description) {
                      console.log(`   Plugin: ${pack.unplugin.description}`);
                    }
                  }
                  
                  console.log();
                }
              }

            } catch (error) {
              consola.error('Failed to discover unplugin packs:', error.message);
              process.exit(1);
            }
          }
        }),

        'generate-all': defineCommand({
          meta: {
            name: 'generate-all',
            description: 'Generate unplugin plugins for all compatible packs'
          },
          args: {
            frameworks: {
              type: 'string',
              description: 'Comma-separated list of frameworks',
              default: 'vite,webpack,rollup'
            },
            'output-dir': {
              type: 'string',
              description: 'Output directory for generated plugins',
              default: 'dist/plugins'
            },
            'pack-filter': {
              type: 'string',
              description: 'Filter packs by ID pattern'
            }
          },
          async run({ args }) {
            const { Marketplace } = await import('../pack/marketplace.mjs');
            const { UnpluginIntegration } = await import('../pack/unplugin-integration.mjs');
            
            const marketplace = new Marketplace();
            const unpluginIntegration = new UnpluginIntegration({
              outputDir: args['output-dir'],
              frameworks: args.frameworks.split(','),
            });

            consola.start('Generating unplugin plugins for all compatible packs...');

            try {
              const results = await marketplace.browse({
                filters: { unplugin: true },
              });

              let packsToProcess = results.packs;
              if (args['pack-filter']) {
                packsToProcess = results.packs.filter(pack => 
                  pack.id.includes(args['pack-filter'])
                );
              }

              if (packsToProcess.length === 0) {
                consola.info('No packs found to process');
                return;
              }

              consola.info(`Processing ${packsToProcess.length} packs...`);

              const generatedPlugins = [];
              for (const pack of packsToProcess) {
                try {
                  consola.start(`Generating plugins for ${pack.id}...`);
                  
                  const pluginResult = await unpluginIntegration.generatePlugins(
                    pack,
                    pack.path
                  );

                  if (pluginResult) {
                    generatedPlugins.push({
                      packId: pack.id,
                      packName: pack.name,
                      plugins: pluginResult.plugins,
                    });
                    
                    consola.success(`Generated ${pluginResult.plugins.length} plugins for ${pack.id}`);
                  }
                } catch (error) {
                  consola.error(`Failed to generate plugins for ${pack.id}:`, error.message);
                }
              }

              // Generate summary
              const totalPlugins = generatedPlugins.reduce((sum, p) => sum + p.plugins.length, 0);
              consola.success(`Generated ${totalPlugins} plugins for ${generatedPlugins.length} packs`);
              
              console.log();
              console.log('Generated plugins:');
              for (const packResult of generatedPlugins) {
                console.log(`📦 ${packResult.packName}:`);
                for (const plugin of packResult.plugins) {
                  console.log(`   🔌 ${plugin.framework}: ${plugin.path}`);
                }
              }

            } catch (error) {
              consola.error('Failed to generate plugins:', error.message);
              process.exit(1);
            }
          }
        }),

        'test': defineCommand({
          meta: {
            name: 'test',
            description: 'Test unplugin integration with a specific pack'
          },
          args: {
            pack: {
              type: 'string',
              description: 'Pack ID to test'
            },
            framework: {
              type: 'string',
              description: 'Framework to test with',
              default: 'vite'
            }
          },
          async run({ args }) {
            if (!args.pack) {
              consola.error('Pack ID is required');
              process.exit(1);
            }

            const { PackManager } = await import('../pack/manager.mjs');
            const { UnpluginIntegration } = await import('../pack/unplugin-integration.mjs');
            
            const packManager = new PackManager();
            const unpluginIntegration = new UnpluginIntegration({
              frameworks: [args.framework],
            });

            consola.start(`Testing unplugin integration for ${args.pack} with ${args.framework}...`);

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

              // Generate plugin
              const pluginResult = await unpluginIntegration.generatePlugins(
                packInfo,
                packInfo.path
              );

              if (pluginResult) {
                const plugin = pluginResult.plugins.find(p => p.framework === args.framework);
                if (plugin) {
                  consola.success(`Plugin generated successfully: ${plugin.path}`);
                  
                  // Test plugin loading
                  try {
                    const pluginCode = await import(plugin.path);
                    consola.success(`Plugin loads successfully`);
                    
                    // Test plugin configuration
                    if (pluginCode.default) {
                      const pluginInstance = pluginCode.default({});
                      consola.success(`Plugin instantiation successful`);
                      
                      console.log();
                      console.log('Plugin configuration:');
                      console.log(`  Name: ${pluginInstance.name}`);
                      console.log(`  Framework: ${pluginInstance.framework}`);
                      console.log(`  Hooks: ${Object.keys(pluginInstance).filter(k => typeof pluginInstance[k] === 'function').join(', ')}`);
                    }
                  } catch (error) {
                    consola.error(`Plugin loading failed:`, error.message);
                  }
                } else {
                  consola.error(`No plugin generated for framework ${args.framework}`);
                }
              }

            } catch (error) {
              consola.error('Test failed:', error.message);
              process.exit(1);
            }
          }
        })
      }
    })
  }
});
