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
          logger.info();

          for (const pack of results.packs) {
            const sourceIcon = pack.source === 'remote' ? '🌐' : '📦';
            logger.info(`${sourceIcon} ${pack.name} v${pack.version}`);
            logger.info(`   ${pack.description}`);
            logger.info(`   ID: ${pack.id}`);
            logger.info(`   Source: ${pack.source || 'local'}`);
            
            if (pack.tags && pack.tags.length > 0) {
              logger.info(`   Tags: ${pack.tags.join(', ')}`);
            }
            
            if (pack.capabilities && pack.capabilities.length > 0) {
              logger.info(`   Capabilities: ${pack.capabilities.join(', ')}`);
            }

            logger.info();
          }

          // Show pagination info
          if (results.totalPages > 1) {
            logger.info(`Page ${args.page} of ${results.totalPages}`);
            logger.info(`Use --page to navigate, --limit to change page size`);
          }

        } catch (error) {
          consola.error('Failed to browse marketplace:', error.message);
          await exitWithError(new Error("Operation failed"), 1);
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
          await exitWithError(new Error("Operation failed"), 1);
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
            logger.info(`   ID: ${installResult.packId}`);
            logger.info(`   Path: ${installResult.path}`);
            logger.info(`   Source: ${installResult.source}`);
            
            if (installResult.url) {
              logger.info(`   URL: ${installResult.url}`);
            }
          } else {
            consola.error(`Failed to install pack: ${installResult.error}`);
            await exitWithError(new Error("Operation failed"), 1);
          }

        } catch (error) {
          consola.error('Installation failed:', error.message);
          await exitWithError(new Error("Operation failed"), 1);
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

              logger.info(`Found ${remotePacks.length} remote packs:`);
              logger.info();

              for (const pack of remotePacks) {
                logger.info(`🌐 ${pack.name} v${pack.version}`);
                logger.info(`   ID: ${pack.id}`);
                logger.info(`   Path: ${pack.path}`);
                logger.info(`   Installed: ${pack.installedAt}`);
                logger.info();
              }

            } catch (error) {
              consola.error('Failed to list remote packs:', error.message);
              await exitWithError(new Error("Operation failed"), 1);
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
              await exitWithError(new Error("Operation failed"), 1);
            }

            const packManager = new EnhancedPackManager();

            consola.start(`Updating remote pack: ${args.pack}`);

            try {
              const updateResult = await packManager.updateRemotePack(args.pack, {
                force: args.force || false,
              });

              if (updateResult.success) {
                consola.success(`Pack updated successfully`);
                logger.info(`   ID: ${updateResult.packId}`);
                logger.info(`   Path: ${updateResult.path}`);
              }

            } catch (error) {
              consola.error('Update failed:', error.message);
              await exitWithError(new Error("Operation failed"), 1);
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
              await exitWithError(new Error("Operation failed"), 1);
            }

            const packManager = new EnhancedPackManager();

            consola.start(`Removing remote pack: ${args.pack}`);

            try {
              const removeResult = await packManager.removeRemotePack(args.pack);

              if (removeResult.success) {
                consola.success(`Pack removed successfully`);
                logger.info(`   ID: ${removeResult.packId}`);
                logger.info(`   Removed from: ${removeResult.removedPath}`);
              }

            } catch (error) {
              consola.error('Removal failed:', error.message);
              await exitWithError(new Error("Operation failed"), 1);
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
              await exitWithError(new Error("Operation failed"), 1);
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

              logger.info(`Found ${results.length} remote packs:`);
              logger.info();

              for (const pack of results) {
                logger.info(`🌐 ${pack.name}`);
                logger.info(`   ID: ${pack.id}`);
                logger.info(`   Description: ${pack.description}`);
                logger.info(`   Source: ${pack.source}`);
                if (pack.url) {
                  logger.info(`   URL: ${pack.url}`);
                }
                logger.info();
              }

            } catch (error) {
              consola.error('Search failed:', error.message);
              await exitWithError(new Error("Operation failed"), 1);
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
          await exitWithError(new Error("Operation failed"), 1);
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

          logger.info(`Found ${results.length} packs:`);
          logger.info();

          for (const pack of results) {
            const sourceIcon = pack.source === 'remote' ? '🌐' : '📦';
            logger.info(`${sourceIcon} ${pack.name} v${pack.version}`);
            logger.info(`   ${pack.description}`);
            logger.info(`   ID: ${pack.id}`);
            logger.info(`   Source: ${pack.source || 'local'}`);
            logger.info();
          }

        } catch (error) {
          consola.error('Search failed:', error.message);
          await exitWithError(new Error("Operation failed"), 1);
        }
      }
    }),

    examples: defineCommand({
      meta: {
        name: 'examples',
        description: 'Show examples of remote pack installation'
      },
      async run() {
        logger.info('GitVan Remote Pack Installation Examples');
        logger.info('=====================================');
        logger.info();
        
        logger.info('GitHub Packs:');
        logger.info('  gitvan marketplace install github:unjs/template');
        logger.info('  gitvan marketplace install github:unjs/template#dev');
        logger.info('  gitvan marketplace install github:unjs/template/packages/core');
        logger.info();
        
        logger.info('GitLab Packs:');
        logger.info('  gitvan marketplace install gitlab:unjs/template');
        logger.info('  gitvan marketplace install gitlab:unjs/template#main');
        logger.info();
        
        logger.info('Bitbucket Packs:');
        logger.info('  gitvan marketplace install bitbucket:unjs/template');
        logger.info();
        
        logger.info('Sourcehut Packs:');
        logger.info('  gitvan marketplace install sourcehut:pi0/unjs-template');
        logger.info();
        
        logger.info('Registry Packs:');
        logger.info('  gitvan marketplace install registry:nuxt');
        logger.info('  gitvan marketplace install registry:vue');
        logger.info();
        
        logger.info('With Options:');
        logger.info('  gitvan marketplace install github:owner/repo --force');
        logger.info('  gitvan marketplace install github:owner/repo --install-deps');
        logger.info('  gitvan marketplace install github:owner/repo --auth TOKEN');
        logger.info('  gitvan marketplace install github:owner/repo --offline');
        logger.info();
        
        logger.info('Private Repositories:');
        logger.info('  export GIGET_AUTH=your_token');
        logger.info('  gitvan marketplace install github:private-org/private-repo');
        logger.info();
        
        logger.info('Custom Registry:');
        logger.info('  gitvan marketplace remote search "react" --registry https://custom-registry.com');
      }
    })
  }
});
