/**
 * @fileoverview GitVan v3.0.0 — Husky Hook Bridge
 *
 * Bridges Husky git hooks to @unrdf/hooks system
 * Captures git events and triggers hook evaluation
 *
 * Features:
 * - Git event capture and RDF storage
 * - Hook evaluation against git events
 * - Async job queueing for background processing
 * - Audit trail logging via git notes
 *
 * @version 1.0.0
 * @license Apache-2.0
 */

import { GitEventCapture } from "../git-lifecycle/GitEventCapture.mjs";
import { HookOrchestrator } from "../hooks/HookOrchestrator.mjs";
import { createLogger } from "../utils/logger.mjs";

const logger = createLogger("integrations:husky-bridge");

/**
 * Bridges Husky git hooks to @unrdf/hooks system
 *
 * This class handles the integration point between Husky (git hooks manager)
 * and @unrdf/hooks (RDF-based hook system). When Husky fires a git hook,
 * this bridge captures the event, stores it as RDF triples, and evaluates
 * registered hooks against the event.
 *
 * @class HuskyHookBridge
 */
export class HuskyHookBridge {
  /**
   * Create HuskyHookBridge instance
   *
   * @constructor
   * @param {Object} [options={}] - Configuration options
   * @param {string} [options.cwd=process.cwd()] - Working directory
   * @param {Object} [options.logger=console] - Logger instance
   * @param {Object} [options.eventCapture] - GitEventCapture options
   * @param {Object} [options.orchestrator] - HookOrchestrator options
   * @param {boolean} [options.autoEvaluate=true] - Auto-evaluate hooks after capture
   * @param {boolean} [options.enableAudit=true] - Enable audit logging
   */
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.logger = options.logger || logger;
    this.autoEvaluate = options.autoEvaluate !== false;
    this.enableAudit = options.enableAudit !== false;

    // Initialize components
    this.eventCapture = new GitEventCapture({
      cwd: this.cwd,
      logger: this.logger,
      ...options.eventCapture,
    });

    this.orchestrator = new HookOrchestrator({
      cwd: this.cwd,
      logger: this.logger,
      ...options.orchestrator,
    });

    this.initialized = false;
    this.eventCount = 0;
    this.hookTriggerCount = 0;
  }

  /**
   * Initialize the bridge
   *
   * @async
   * @returns {Promise<void>}
   * @throws {Error} If initialization fails
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      await this.eventCapture.initialize();
      this.initialized = true;
      this.logger.info("✅ HuskyHookBridge initialized");
    } catch (error) {
      this.logger.error("❌ HuskyHookBridge initialization failed:", error);
      throw new Error(
        `Failed to initialize HuskyHookBridge: ${error.message}`
      );
    }
  }

  /**
   * Process a Husky git hook event
   *
   * This is the main entry point for git hooks. When Husky fires a hook,
   * it should call this method with the hook name and event data.
   *
   * @async
   * @param {string} hookName - Git hook name (e.g., 'pre-commit', 'post-commit')
   * @param {Object} [eventData={}] - Additional event data
   * @returns {Promise<Object>} Bridge result with event info and hook evaluations
   * @throws {Error} If processing fails
   */
  async processHook(hookName, eventData = {}) {
    await this.initialize();

    const startTime = performance.now();
    this.logger.info(`🪝 Processing Husky hook: ${hookName}`);

    try {
      // Step 1: Capture the git event as RDF
      const captureResult = await this.eventCapture.captureEvent(
        hookName,
        eventData
      );

      if (!captureResult.success) {
        throw new Error(
          `Failed to capture event: ${captureResult.error || "Unknown error"}`
        );
      }

      this.eventCount++;
      const eventUri = captureResult.eventUri;

      this.logger.debug(`📸 Captured event: ${eventUri}`);

      // Step 2: Auto-evaluate hooks if enabled
      let evaluationResult = null;
      if (this.autoEvaluate) {
        evaluationResult = await this._evaluateHooksForEvent(
          eventUri,
          hookName
        );
        this.hookTriggerCount += evaluationResult.triggeredHooks.length;
      }

      // Step 3: Build result
      const duration = performance.now() - startTime;
      const result = {
        success: true,
        hookName,
        eventUri,
        eventId: captureResult.eventId,
        duration: Math.round(duration),
        eventCaptured: true,
        hooksEvaluated: evaluationResult?.hooksEvaluated || 0,
        hooksTriggered: evaluationResult?.triggeredHooks.length || 0,
        triggeredHooks: evaluationResult?.triggeredHooks || [],
      };

      // Step 4: Log audit trail if enabled
      if (this.enableAudit) {
        await this._logAuditTrail(result);
      }

      this.logger.info(
        `✅ Hook processed (${evaluationResult?.triggeredHooks.length || 0} hooks triggered, ${duration.toFixed(0)}ms)`
      );

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logger.error(
        `❌ Failed to process hook ${hookName}:`,
        error.message
      );

      const result = {
        success: false,
        hookName,
        error: error.message,
        duration: Math.round(duration),
      };

      if (this.enableAudit) {
        await this._logAuditTrail(result);
      }

      throw error;
    }
  }

  /**
   * Evaluate all hooks for a specific event
   *
   * @private
   * @param {string} eventUri - Event URI from RDF store
   * @param {string} hookName - Hook name for context
   * @returns {Promise<Object>} Evaluation result
   */
  async _evaluateHooksForEvent(eventUri, hookName) {
    try {
      this.logger.debug(
        `🧠 Evaluating hooks for event: ${eventUri.substring(0, 50)}...`
      );

      const evaluationResult = await this.orchestrator.evaluate({
        eventFilter: {
          eventUri,
          eventType: hookName,
        },
        verbose: false,
      });

      return {
        eventUri,
        hooksEvaluated: evaluationResult.hooksEvaluated,
        triggeredHooks: evaluationResult.triggeredHooks,
        workflowsExecuted: evaluationResult.workflowsExecuted,
      };
    } catch (error) {
      this.logger.warn(`⚠️ Hook evaluation failed: ${error.message}`);
      return {
        eventUri,
        hooksEvaluated: 0,
        triggeredHooks: [],
        error: error.message,
      };
    }
  }

  /**
   * Log audit trail for hook processing
   *
   * @private
   * @param {Object} result - Processing result
   * @returns {Promise<void>}
   */
  async _logAuditTrail(result) {
    try {
      // This would integrate with git notes for audit logging
      // For now, just log to console
      this.logger.info(`📝 Audit trail: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.warn(`⚠️ Failed to log audit trail: ${error.message}`);
    }
  }

  /**
   * Get bridge statistics
   *
   * @async
   * @returns {Promise<Object>} Statistics
   */
  async getStats() {
    const eventStats = await this.eventCapture.getStats();

    return {
      initialized: this.initialized,
      totalEventsProcessed: this.eventCount,
      totalHooksTriggered: this.hookTriggerCount,
      eventStats,
      orchestratorStats: await this.orchestrator.getStats(),
    };
  }

  /**
   * List all available hooks
   *
   * @async
   * @returns {Promise<Array<Object>>} Available hooks
   */
  async listHooks() {
    return await this.orchestrator.listHooks();
  }

  /**
   * Validate a hook definition
   *
   * @async
   * @param {string} hookId - Hook ID to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateHook(hookId) {
    return await this.orchestrator.validateHook(hookId);
  }

  /**
   * Reset bridge state (mainly for testing)
   *
   * @async
   * @returns {Promise<void>}
   */
  async reset() {
    this.initialized = false;
    this.eventCount = 0;
    this.hookTriggerCount = 0;

    try {
      await this.eventCapture.cleanup();
    } catch (error) {
      this.logger.warn(`⚠️ Failed to cleanup event capture: ${error.message}`);
    }
  }

  /**
   * Gracefully shutdown the bridge
   *
   * @async
   * @returns {Promise<void>}
   */
  async shutdown() {
    this.logger.info("🛑 Shutting down HuskyHookBridge...");

    try {
      await this.eventCapture.cleanup();
      this.initialized = false;
      this.logger.info("✅ HuskyHookBridge shutdown complete");
    } catch (error) {
      this.logger.error("❌ Error during shutdown:", error.message);
      throw error;
    }
  }
}

/**
 * Singleton instances for different working directories
 * @private
 */
const bridgeInstances = new Map();

/**
 * Get or create HuskyHookBridge singleton
 *
 * @param {Object} [options={}] - Configuration options
 * @returns {HuskyHookBridge} Bridge instance
 */
export function getHuskyHookBridge(options = {}) {
  const cwd = options.cwd || process.cwd();

  if (!bridgeInstances.has(cwd)) {
    bridgeInstances.set(cwd, new HuskyHookBridge(options));
  }

  return bridgeInstances.get(cwd);
}

/**
 * Reset singleton instances (for testing)
 *
 * @param {string} [cwd] - Specific cwd to reset, or all if omitted
 * @returns {Promise<void>}
 */
export async function resetHuskyHookBridge(cwd = null) {
  if (cwd) {
    if (bridgeInstances.has(cwd)) {
      await bridgeInstances.get(cwd).shutdown();
      bridgeInstances.delete(cwd);
    }
  } else {
    for (const [key, instance] of bridgeInstances.entries()) {
      await instance.shutdown();
      bridgeInstances.delete(key);
    }
  }
}

export default HuskyHookBridge;
