/**
 * Nitro Store Plugin - Initialize and expose @unrdf/core store
 *
 * Provides:
 * - Global store instance initialization on server start
 * - Event handler context injection ($store)
 * - Health check endpoint
 * - Graceful shutdown
 */

import { createLogger } from '../src/utils/logger.mjs';
import { unrdfStore } from '../src/core/unrdf-store.mjs';

const logger = createLogger('plugin:store');

export default (nitroApp) => {
  logger.info('Initializing store plugin...');

  /**
   * Hook: Initialize store on server startup
   */
  nitroApp.hooks.hook('listen', async () => {
    try {
      logger.info('Starting store initialization...');
      await unrdfStore.initialize();
      logger.info('✅ Store initialized successfully');

      const stats = unrdfStore.getStats();
      logger.info('Store stats:', {
        initialized: stats.initialized,
        totalQuads: stats.totalQuads,
        quadsRead: stats.quadsRead,
      });
    } catch (error) {
      logger.error('Failed to initialize store on startup:', error);
      throw new Error(`Store initialization failed: ${error.message}`);
    }
  });

  /**
   * Hook: Add store to event handler context
   * Makes store available as $store in route handlers
   */
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    if (event) {
      event.node.res.$store = unrdfStore;
    }
  });

  /**
   * Hook: Log store statistics periodically
   */
  let statsInterval;
  nitroApp.hooks.hook('listen', () => {
    statsInterval = setInterval(() => {
      const stats = unrdfStore.getStats();
      logger.debug('Store metrics:', stats);
    }, 60000); // Every minute
  });

  /**
   * Hook: Graceful shutdown
   */
  nitroApp.hooks.hook('close', () => {
    if (statsInterval) {
      clearInterval(statsInterval);
    }
    logger.info('Store plugin shutdown complete');
  });

  /**
   * Health check helper
   */
  nitroApp.$store = {
    /**
     * Check if store is healthy
     */
    isHealthy: () => {
      if (!unrdfStore.initialized) {
        return { healthy: false, reason: 'Store not initialized' };
      }
      return { healthy: true, stats: unrdfStore.getStats() };
    },

    /**
     * Get store instance
     */
    getInstance: () => unrdfStore,

    /**
     * Execute SPARQL query
     */
    sparql: (query, options) => unrdfStore.sparql(query, options),
  };

  logger.info('✅ Store plugin initialized');
};
