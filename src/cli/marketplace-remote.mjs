/**
 * GitVan Marketplace Command - Enhanced with Giget Remote Pack Support
 * 
 * This command extends the marketplace functionality to support:
 * - Remote pack installation from GitHub, GitLab, Bitbucket, etc.
 * - Template registry integration
 * - Offline caching and authentication
 * - Custom pack providers
 */

import { defineCommand } from 'citty';
import { Marketplace } from '../pack/marketplace.mjs';
import { EnhancedPackManager } from '../pack/giget-integration.mjs';
import { createLogger } from '../utils/logger.mjs';
import consola from 'consola';

const logger = createLogger('cli:marketplace');

export const remoteMarketplaceCommand = defineCommand({
  meta: {
    name: 'marketplace',
    description: 'GitVan Marketplace with remote pack support via giget'
  },
  subCommands: {
    browse: defineCommand({
      meta: {
        name: 'browse',
        description: 'Browse available packs (local and remote)'
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
        source: {
          type: 'string',
          description: 'Filter by source (local, remote, registry)'
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
        
        consola.start('Browsing marketplace (local and remote packs)...');
        
        try {
          const results = await marketplace.browse({
            query: args.query,
            filters: {
              category: args.category,
              tag: args.tag,
              source: args.source,
            },
            page: args.page,
            limit: args.limit,
          });

          if (results.packs.length === 0) {
            consola.info('No packs found matching your criteria');
            return;
          }

          // Display results with source information
          consola.success(`Found ${results.total} packs`);
          console.log();

          for (const pack of results.packs) {
            const sourceIcon = pack.source === 'remote' ? '🌐' : '📦';
            console.log(`${sourceIcon} ${pack.name} v${pack.version}`);
            console.log(`   ${pack.description}`);
            console.log(`   ID: ${pack.id}`);
            console.log(`   Source: ${pack.source || 'local'}`);
            
            if (pack.tags && pack.tags.length > 0) {
              console.log(`   Tags: ${pack.tags.join(', ')}`);
            }
            
            if (pack.capabilities && pack.capabilities.length > 0) {
              console.log(`   Capabilities: ${pack.capabilities.join(', ')}`);
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
        description: 'Install a pack (local or remote)'
      },
      args: {
        source: {
          type: 'string',
          description: 'Pack source (local ID or remote source like github:owner/repo)'
        },
        'install-deps': {
          type: 'boolean',
          description: 'Install pack dependencies after installation'
        },
        force: {
          type: 'boolean',
          description: 'Force installation even if pack exists'
        },
        'force-clean': {
          type: 'boolean',
          description: 'Clean existing directory before installation'
        },
        offline: {
          type: 'boolean',
          description: 'Use cached version only'
        },
        'prefer-offline': {
          type: 'boolean',
          description: 'Use cache if available, otherwise download'
        },
        auth: {
          type: 'string',
          description: 'Authentication token for private repositories'
        }
      },
      async run({ args }) {
        if (!args.source) {
          consola.error('Pack source is required');
          process.exit(1);
        }

        const packManager = new EnhancedPackManager({
          auth: args.auth || process.env.GIGET_AUTH,
        });

        consola.start(`Installing pack: ${args.source}`);

        try {
          const installResult = await packManager.installPack(args.source, {
            install: args['install-deps'] !== false,
            force: args.force || false,
            forceClean: args['force-clean'] || false,
            offline: args.offline || false,
            preferOffline: args['prefer-offline'] || false,
          });
          
          if (installResult.success) {
            consola.success(`Pack installed successfully`);
            console.log(`   ID: ${installResult.packId}`);
            console.log(`   Path: ${installResult.path}`);
            console.log(`   Source: ${installResult.source}`);
            
            if (installResult.url) {
              console.log(`   URL: ${installResult.url}`);
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

    remote: defineCommand({
      meta: {
        name: 'remote',
        description: 'Manage remote packs'
      },
      subCommands: {
        list: defineCommand({
          meta: {
            name: 'list',
            description: 'List installed remote packs'
          },
          async run() {
            const packManager = new EnhancedPackManager();

            consola.start('Listing remote packs...');

            try {
              const remotePacks = await packManager.listRemotePacks();

              if (remotePacks.length === 0) {
                consola.info('No remote packs installed');
                return;
              }

              console.log(`Found ${remotePacks.length} remote packs:`);
              console.log();

              for (const pack of remotePacks) {
                console.log(`🌐 ${pack.name} v${pack.version}`);
                console.log(`   ID: ${pack.id}`);
                console.log(`   Path: ${pack.path}`);
                console.log(`   Installed: ${pack.installedAt}`);
                console.log();
              }

            } catch (error) {
              consola.error('Failed to list remote packs:', error.message);
              process.exit(1);
            }
          }
        }),

        update: defineCommand({
          meta: {
            name: 'update',
            description: 'Update a remote pack'
          },
          args: {
            pack: {
              type: 'string',
              description: 'Pack ID to update'
            },
            force: {
              type: 'boolean',
              description: 'Force update even if no changes'
            }
          },
          async run({ args }) {
            if (!args.pack) {
              consola.error('Pack ID is required');
              process.exit(1);
            }

            const packManager = new EnhancedPackManager();

            consola.start(`Updating remote pack: ${args.pack}`);

            try {
              const updateResult = await packManager.updateRemotePack(args.pack, {
                force: args.force || false,
              });

              if (updateResult.success) {
                consola.success(`Pack updated successfully`);
                console.log(`   ID: ${updateResult.packId}`);
                console.log(`   Path: ${updateResult.path}`);
              }

            } catch (error) {
              consola.error('Update failed:', error.message);
              process.exit(1);
            }
          }
        }),

        remove: defineCommand({
          meta: {
            name: 'remove',
            description: 'Remove a remote pack'
          },
          args: {
            pack: {
              type: 'string',
              description: 'Pack ID to remove'
            }
          },
          async run({ args }) {
            if (!args.pack) {
              consola.error('Pack ID is required');
              process.exit(1);
            }

            const packManager = new EnhancedPackManager();

            consola.start(`Removing remote pack: ${args.pack}`);

            try {
              const removeResult = await packManager.removeRemotePack(args.pack);

              if (removeResult.success) {
                consola.success(`Pack removed successfully`);
                console.log(`   ID: ${removeResult.packId}`);
                console.log(`   Removed from: ${removeResult.removedPath}`);
              }

            } catch (error) {
              consola.error('Removal failed:', error.message);
              process.exit(1);
            }
          }
        }),

        search: defineCommand({
          meta: {
            name: 'search',
            description: 'Search remote packs from registry'
          },
          args: {
            query: {
              type: 'string',
              description: 'Search query'
            },
            registry: {
              type: 'string',
              description: 'Custom registry URL'
            }
          },
          async run({ args }) {
            if (!args.query) {
              consola.error('Search query is required');
              process.exit(1);
            }

            const packManager = new EnhancedPackManager({
              registry: args.registry,
            });

            consola.start(`Searching remote packs: ${args.query}`);

            try {
              const results = await packManager.searchRemotePacks(args.query);

              if (results.length === 0) {
                consola.info('No remote packs found');
                return;
              }

              console.log(`Found ${results.length} remote packs:`);
              console.log();

              for (const pack of results) {
                console.log(`🌐 ${pack.name}`);
                console.log(`   ID: ${pack.id}`);
                console.log(`   Description: ${pack.description}`);
                console.log(`   Source: ${pack.source}`);
                if (pack.url) {
                  console.log(`   URL: ${pack.url}`);
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
    }),

    search: defineCommand({
      meta: {
        name: 'search',
        description: 'Search packs (local and remote)'
      },
      args: {
        query: {
          type: 'string',
          description: 'Search query'
        },
        source: {
          type: 'string',
          description: 'Filter by source (local, remote, registry)'
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
            source: args.source,
          });

          if (results.length === 0) {
            consola.info('No packs found matching your search');
            return;
          }

          console.log(`Found ${results.length} packs:`);
          console.log();

          for (const pack of results) {
            const sourceIcon = pack.source === 'remote' ? '🌐' : '📦';
            console.log(`${sourceIcon} ${pack.name} v${pack.version}`);
            console.log(`   ${pack.description}`);
            console.log(`   ID: ${pack.id}`);
            console.log(`   Source: ${pack.source || 'local'}`);
            console.log();
          }

        } catch (error) {
          consola.error('Search failed:', error.message);
          process.exit(1);
        }
      }
    }),

    examples: defineCommand({
      meta: {
        name: 'examples',
        description: 'Show examples of remote pack installation'
      },
      async run() {
        console.log('GitVan Remote Pack Installation Examples');
        console.log('=====================================');
        console.log();
        
        console.log('GitHub Packs:');
        console.log('  gitvan marketplace install github:unjs/template');
        console.log('  gitvan marketplace install github:unjs/template#dev');
        console.log('  gitvan marketplace install github:unjs/template/packages/core');
        console.log();
        
        console.log('GitLab Packs:');
        console.log('  gitvan marketplace install gitlab:unjs/template');
        console.log('  gitvan marketplace install gitlab:unjs/template#main');
        console.log();
        
        console.log('Bitbucket Packs:');
        console.log('  gitvan marketplace install bitbucket:unjs/template');
        console.log();
        
        console.log('Sourcehut Packs:');
        console.log('  gitvan marketplace install sourcehut:pi0/unjs-template');
        console.log();
        
        console.log('Registry Packs:');
        console.log('  gitvan marketplace install registry:nuxt');
        console.log('  gitvan marketplace install registry:vue');
        console.log();
        
        console.log('With Options:');
        console.log('  gitvan marketplace install github:owner/repo --force');
        console.log('  gitvan marketplace install github:owner/repo --install-deps');
        console.log('  gitvan marketplace install github:owner/repo --auth TOKEN');
        console.log('  gitvan marketplace install github:owner/repo --offline');
        console.log();
        
        console.log('Private Repositories:');
        console.log('  export GIGET_AUTH=your_token');
        console.log('  gitvan marketplace install github:private-org/private-repo');
        console.log();
        
        console.log('Custom Registry:');
        console.log('  gitvan marketplace remote search "react" --registry https://custom-registry.com');
      }
    })
  }
});
