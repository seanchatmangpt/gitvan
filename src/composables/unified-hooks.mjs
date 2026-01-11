/**
 * @fileoverview GitVan v3.0.0 — Unified Hooks Composable
 *
 * Provides a clean, composable API for the integrated Husky + @unrdf/hooks + Bree system
 *
 * @version 1.0.0
 * @license Apache-2.0
 */

import { getHuskyHookBridge } from "../integrations/husky-hook-bridge.mjs";
import { getUnrdfHooksBridge } from "../integrations/bree-hook-adapter.mjs";
import { createLogger } from "../utils/logger.mjs";

const logger = createLogger("composables:unified-hooks");

/**
 * Unified hooks composable
 *
 * Provides a simple API for interacting with the integrated Husky + @unrdf/hooks + Bree system.
 * This composable handles registration, execution, and monitoring of hooks across all three layers.
 *
 * @function useUnifiedHooks
 * @param {Object} [options={}] - Configuration options
 * @param {string} [options.cwd=process.cwd()] - Working directory
 * @param {boolean} [options.autoStart=false] - Auto-start scheduler
 * @param {boolean} [options.enableAudit=true] - Enable audit logging
 * @returns {Object} Unified hooks interface
 */
export function useUnifiedHooks(options = {}) {
  const cwd = options.cwd || process.cwd();
  const autoStart = options.autoStart !== false;
  const enableAudit = options.enableAudit !== false;

  // Get bridge instances
  const huskyBridge = getHuskyHookBridge({
    cwd,
    logger,
    enableAudit,
  });

  const unrdfBridge = getUnrdfHooksBridge({
    cwd,
    logger,
    enableAudit,
  });

  // Track registered hooks
  const hooks = new Map();

  return {
    /**
     * Register a hook with predicate-based trigger
     *
     * @async
     * @param {string} gitEvent - Git event name (e.g., 'pre-commit', 'post-commit')
     * @param {Object} hookConfig - Hook configuration
     * @param {Function} [hookConfig.predicate] - Predicate function for evaluation
     * @param {string} [hookConfig.sparql] - SPARQL query for evaluation
     * @param {Function} hookConfig.handler - Handler function
     * @param {Object} [hookConfig.breeConfig] - Bree job configuration
     * @param {string} [hookConfig.name] - Hook name
     * @returns {Promise<Object>} Registration result
     */
    async on(gitEvent, hookConfig) {
      try {
        // Validate configuration
        if (!gitEvent) {
          throw new Error("Git event name is required");
        }

        if (!hookConfig.handler && !hookConfig.predicate && !hookConfig.sparql) {
          throw new Error("Handler or predicate/sparql is required");
        }

        const hookId = hookConfig.name || `${gitEvent}-${Date.now()}`;
        const hookDef = {
          id: hookId,
          name: hookConfig.name || hookId,
          gitEvent,
          predicate: hookConfig.predicate || hookConfig.sparql,
          handler: hookConfig.handler,
          breeConfig: hookConfig.breeConfig || {},
        };

        // Register with Unrdf bridge
        const registrationResult = await unrdfBridge.registerHook(hookDef);

        // Track locally
        hooks.set(hookId, {
          gitEvent,
          hookConfig,
          hookDef,
          registeredAt: new Date(),
        });

        logger.info(`✅ Hook registered: ${hookId}`);

        return {
          success: true,
          hookId,
          ...registrationResult,
        };
      } catch (error) {
        logger.error(`❌ Failed to register hook:`, error.message);
        throw error;
      }
    },

    /**
     * Emit a git event and trigger hook evaluation
     *
     * @async
     * @param {string} gitEvent - Git event name
     * @param {Object} [eventData={}] - Event data
     * @returns {Promise<Object>} Emission result
     */
    async emit(gitEvent, eventData = {}) {
      try {
        // Process through Husky bridge
        const result = await huskyBridge.processHook(gitEvent, eventData);

        // Execute triggered hooks
        const executionPromises = result.triggeredHooks.map((hook) =>
          unrdfBridge.executeHook(hook.id, eventData, { immediate: true })
            .catch((error) => ({
              success: false,
              hookId: hook.id,
              error: error.message,
            }))
        );

        const executionResults = await Promise.allSettled(executionPromises);

        const successCount = executionResults.filter(
          (r) => r.status === "fulfilled" && r.value.success
        ).length;

        logger.info(
          `⚡ Event emitted: ${gitEvent} (${successCount}/${result.triggeredHooks.length} hooks executed)`
        );

        return {
          success: true,
          gitEvent,
          eventUri: result.eventUri,
          triggeredHooks: result.triggeredHooks.length,
          executedHooks: successCount,
          details: executionResults,
        };
      } catch (error) {
        logger.error(`❌ Failed to emit event ${gitEvent}:`, error.message);
        throw error;
      }
    },

    /**
     * Unregister a hook
     *
     * @async
     * @param {string} hookId - Hook ID to unregister
     * @returns {Promise<Object>} Unregistration result
     */
    async off(hookId) {
      try {
        await unrdfBridge.unregisterHook(hookId);
        hooks.delete(hookId);

        logger.info(`✅ Hook unregistered: ${hookId}`);

        return { success: true, hookId };
      } catch (error) {
        logger.error(`❌ Failed to unregister hook ${hookId}:`, error.message);
        throw error;
      }
    },

    /**
     * List all registered hooks
     *
     * @returns {Array<Object>} List of hooks
     */
    listHooks() {
      return unrdfBridge.listHooks();
    },

    /**
     * Get hook execution history
     *
     * @param {Object} [options={}] - Filter options
     * @returns {Array<Object>} Execution history
     */
    getHistory(options = {}) {
      return unrdfBridge.getHistory(options);
    },

    /**
     * Get unified system status
     *
     * @async
     * @returns {Promise<Object>} Status object
     */
    async getStatus() {
      try {
        const huskyStats = await huskyBridge.getStats();
        const unrdfStats = unrdfBridge.getStats();

        return {
          initialized: huskyBridge.initialized && unrdfBridge.initialized,
          registerHooks: hooks.size,
          ...huskyStats,
          ...unrdfStats,
          hooks: this.listHooks(),
        };
      } catch (error) {
        logger.error("❌ Failed to get status:", error.message);
        return {
          error: error.message,
        };
      }
    },

    /**
     * Start the background job scheduler
     *
     * @async
     * @returns {Promise<void>}
     */
    async start() {
      try {
        if (autoStart) {
          await unrdfBridge.start();
          logger.info("✅ Unified hooks started");
        }
      } catch (error) {
        logger.error("❌ Failed to start unified hooks:", error.message);
        throw error;
      }
    },

    /**
     * Stop the background job scheduler
     *
     * @async
     * @returns {Promise<void>}
     */
    async stop() {
      try {
        await unrdfBridge.stop();
        logger.info("✅ Unified hooks stopped");
      } catch (error) {
        logger.error("❌ Failed to stop unified hooks:", error.message);
        throw error;
      }
    },

    /**
     * Validate a hook before registration
     *
     * @async
     * @param {string} hookId - Hook ID to validate
     * @returns {Promise<Object>} Validation result
     */
    async validate(hookId) {
      try {
        const validation = await huskyBridge.validateHook(hookId);
        return validation;
      } catch (error) {
        logger.error(
          `❌ Failed to validate hook ${hookId}:`,
          error.message
        );
        throw error;
      }
    },

    /**
     * Gracefully shutdown the unified hooks system
     *
     * @async
     * @returns {Promise<void>}
     */
    async cleanup() {
      try {
        await unrdfBridge.shutdown();
        await huskyBridge.shutdown();
        logger.info("✅ Unified hooks cleaned up");
      } catch (error) {
        logger.error("❌ Failed to cleanup unified hooks:", error.message);
        throw error;
      }
    },

    /**
     * Get internal bridge instances (for advanced usage)
     *
     * @returns {Object} Bridge instances
     */
    _getBridges() {
      return {
        huskyBridge,
        unrdfBridge,
      };
    },
  };
}

export default useUnifiedHooks;
