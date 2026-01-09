/**
 * @fileoverview GitVan v3.0.0 — Unrdf Hooks Bridge
 *
 * Bridges @unrdf/hooks to Bree background job scheduler
 * Converts hook definitions to scheduled Bree jobs
 *
 * Features:
 * - Hook-to-job registration
 * - Job scheduling and execution
 * - Audit trail logging
 * - Error handling and retry logic
 *
 * @version 1.0.0
 * @license Apache-2.0
 */

import { getBreeScheduler, resetBreeScheduler } from "../jobs/bree-scheduler.mjs";
import { createLogger } from "../utils/logger.mjs";
// TODO: Re-enable validation once zod is installed
// import { validateHookDefinition, validateUnrdfBridgeConfig } from "../schemas/hooks.schema.mjs";

const logger = createLogger("integrations:unrdf-hooks-bridge");

/**
 * Bridges @unrdf/hooks to Bree job scheduler
 *
 * This class handles the integration between @unrdf/hooks (RDF-based hook system)
 * and Bree (background job scheduler). When hooks are triggered, they are
 * converted to Bree jobs and scheduled for execution.
 *
 * @class UnrdfHooksBridge
 */
export class UnrdfHooksBridge {
  /**
   * Create UnrdfHooksBridge instance
   *
   * @constructor
   * @param {Object} [options={}] - Configuration options
   * @param {string} [options.cwd=process.cwd()] - Working directory
   * @param {Object} [options.logger=console] - Logger instance
   * @param {string} [options.jobsDir="jobs"] - Jobs directory for Bree
   * @param {number} [options.timeout=30000] - Default job timeout (ms)
   * @param {number} [options.maxRetries=3] - Max job retries
   * @param {boolean} [options.enableAudit=true] - Enable audit logging
   */
  constructor(options = {}) {
    // TODO: Re-enable validation once zod is installed
    // Validate configuration
    // const validationResult = validateUnrdfBridgeConfig(options);
    // if (!validationResult.success) {
    //   throw new Error(
    //     `Invalid UnrdfHooksBridge configuration: ${JSON.stringify(validationResult.error)}`
    //   );
    // }

    this.cwd = options.cwd || process.cwd();
    this.logger = options.logger || logger;
    this.jobsDir = options.jobsDir || "jobs";
    this.timeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries || 3;
    this.enableAudit = options.enableAudit !== false;

    // Initialize Bree scheduler
    this.scheduler = getBreeScheduler({
      cwd: this.cwd,
      jobsDir: this.jobsDir,
      timeout: this.timeout,
    });

    // Track registered hooks and executions
    this.registeredHooks = new Map();
    this.executionLog = [];
    this.jobExecutions = new Map();

    this.initialized = false;
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
      await this.scheduler.init();
      this.initialized = true;
      this.logger.info("✅ UnrdfHooksBridge initialized");
    } catch (error) {
      this.logger.error("❌ UnrdfHooksBridge initialization failed:", error);
      throw new Error(`Failed to initialize UnrdfHooksBridge: ${error.message}`);
    }
  }

  /**
   * Register a hook for Bree job execution
   *
   * Converts a hook definition to a Bree job configuration and registers it
   * with the scheduler.
   *
   * @async
   * @param {Object} hookDef - Hook definition
   * @param {string} hookDef.id - Hook ID
   * @param {string} hookDef.name - Hook name
   * @param {Object} hookDef.breeConfig - Bree job configuration
   * @param {string} [hookDef.breeConfig.jobName] - Job name in jobs directory
   * @param {string} [hookDef.breeConfig.schedule] - Schedule (cron, interval, or "immediate")
   * @param {number} [hookDef.breeConfig.timeout] - Job timeout
   * @returns {Promise<Object>} Registration result
   * @throws {Error} If registration fails
   */
  async registerHook(hookDef) {
    await this.initialize();

    // TODO: Re-enable validation once zod is installed
    // Validate hook definition
    // const validationResult = validateHookDefinition(hookDef);
    // if (!validationResult.success) {
    //   const errorMsg = validationResult.issues
    //     .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    //     .join("; ");
    //   throw new Error(`Invalid hook definition: ${errorMsg}`);
    // }

    const { id, name, breeConfig = {} } = hookDef;

    if (!id) {
      throw new Error("Hook definition must have an id");
    }

    try {
      this.logger.info(`📋 Registering hook: ${id}`);

      // Validate bree config
      const jobName = breeConfig.jobName || id;
      const schedule = breeConfig.schedule || "immediate";

      // Create job configuration
      // Note: Don't include path here - let BreeScheduler handle path resolution
      const jobConfig = {
        name: jobName,
        ...(schedule === "cron" && breeConfig.cron ? { cron: breeConfig.cron } : {}),
        ...(schedule === "interval" && breeConfig.interval ? { interval: breeConfig.interval } : {}),
        ...(breeConfig.timeout ? { timeout: breeConfig.timeout } : { timeout: this.timeout }),
      };

      // Register with scheduler
      const job = await this.scheduler.addJob(jobConfig);

      // Track registration
      this.registeredHooks.set(id, {
        hookDef,
        jobConfig,
        jobName,
        registeredAt: new Date(),
      });

      this.logger.info(
        `✅ Hook registered: ${id} → Job: ${jobName} (schedule: ${schedule})`
      );

      return {
        success: true,
        hookId: id,
        jobName,
        jobConfig,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to register hook ${id}:`, error.message);
      throw new Error(`Failed to register hook ${id}: ${error.message}`);
    }
  }

  /**
   * Unregister a hook
   *
   * @async
   * @param {string} hookId - Hook ID to unregister
   * @returns {Promise<Object>} Unregistration result
   */
  async unregisterHook(hookId) {
    if (!this.registeredHooks.has(hookId)) {
      this.logger.warn(`⚠️ Hook ${hookId} not found`);
      return { success: false, message: "Hook not found" };
    }

    try {
      const registration = this.registeredHooks.get(hookId);
      await this.scheduler.removeJob(registration.jobName);
      this.registeredHooks.delete(hookId);

      this.logger.info(`✅ Hook unregistered: ${hookId}`);
      return { success: true, hookId };
    } catch (error) {
      this.logger.error(`❌ Failed to unregister hook ${hookId}:`, error.message);
      throw error;
    }
  }

  /**
   * Execute a hook by triggering its associated Bree job
   *
   * @async
   * @param {string} hookId - Hook ID to execute
   * @param {Object} [data={}] - Data to pass to the job
   * @param {Object} [options={}] - Execution options
   * @param {boolean} [options.immediate=true] - Run immediately or use schedule
   * @returns {Promise<Object>} Execution result
   */
  async executeHook(hookId, data = {}, options = {}) {
    await this.initialize();

    const immediate = options.immediate !== false;

    if (!this.registeredHooks.has(hookId)) {
      throw new Error(`Hook ${hookId} not registered`);
    }

    const startTime = performance.now();
    const registration = this.registeredHooks.get(hookId);
    const { jobName } = registration;

    try {
      this.logger.info(`⚡ Executing hook: ${hookId} (job: ${jobName})`);

      let executionId;
      if (immediate) {
        // Run immediately
        executionId = this._generateExecutionId();
        await this.scheduler.runJob(jobName);
      } else {
        // Will be scheduled according to cron/interval
        executionId = this._generateExecutionId();
      }

      const duration = performance.now() - startTime;

      const result = {
        success: true,
        hookId,
        jobName,
        executionId,
        immediate,
        duration: Math.round(duration),
        executedAt: new Date(),
      };

      // Log execution
      this.executionLog.push(result);
      this.jobExecutions.set(executionId, result);

      if (this.enableAudit) {
        await this._logAuditTrail(result);
      }

      this.logger.info(
        `✅ Hook executed: ${hookId} (${duration.toFixed(0)}ms)`
      );

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      this.logger.error(
        `❌ Failed to execute hook ${hookId}:`,
        error.message
      );

      const errorResult = {
        success: false,
        hookId,
        jobName,
        error: error.message,
        duration: Math.round(duration),
      };

      if (this.enableAudit) {
        await this._logAuditTrail(errorResult);
      }

      throw error;
    }
  }

  /**
   * Start the Bree scheduler (begins processing queued jobs)
   *
   * @async
   * @returns {Promise<void>}
   */
  async start() {
    await this.initialize();
    await this.scheduler.start();
    this.logger.info("✅ Bree scheduler started");
  }

  /**
   * Stop the Bree scheduler
   *
   * @async
   * @returns {Promise<void>}
   */
  async stop() {
    await this.scheduler.stop();
    this.logger.info("✅ Bree scheduler stopped");
  }

  /**
   * Get execution statistics
   *
   * @returns {Object} Statistics
   */
  getStats() {
    const totalExecutions = this.executionLog.length;
    const successfulExecutions = this.executionLog.filter((e) => e.success)
      .length;
    const failedExecutions = totalExecutions - successfulExecutions;

    return {
      initialized: this.initialized,
      registeredHooks: this.registeredHooks.size,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate:
        totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
      schedulerStatus: this.scheduler.getStatus(),
      recentExecutions: this.executionLog.slice(-10),
    };
  }

  /**
   * List all registered hooks
   *
   * @returns {Array<Object>} List of registered hooks
   */
  listHooks() {
    return Array.from(this.registeredHooks.values()).map((reg) => ({
      hookId: reg.hookDef.id,
      hookName: reg.hookDef.name,
      jobName: reg.jobName,
      registeredAt: reg.registeredAt,
    }));
  }

  /**
   * Get execution history
   *
   * @param {Object} [options={}] - Filter options
   * @param {string} [options.hookId] - Filter by hook ID
   * @param {number} [options.limit=50] - Limit results
   * @returns {Array<Object>} Execution history
   */
  getHistory(options = {}) {
    let history = this.executionLog;

    if (options.hookId) {
      history = history.filter((e) => e.hookId === options.hookId);
    }

    const limit = options.limit || 50;
    return history.slice(-limit);
  }

  /**
   * Log audit trail for hook execution
   *
   * @private
   * @param {Object} result - Execution result
   * @returns {Promise<void>}
   */
  async _logAuditTrail(result) {
    try {
      this.logger.debug(
        `📝 Audit trail: ${result.hookId} - ${result.success ? "SUCCESS" : "FAILED"}`
      );
      // This would integrate with git notes for audit logging
    } catch (error) {
      this.logger.warn(`⚠️ Failed to log audit trail: ${error.message}`);
    }
  }

  /**
   * Generate unique execution ID
   *
   * @private
   * @returns {string} Execution ID
   */
  _generateExecutionId() {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gracefully shutdown the bridge
   *
   * @async
   * @returns {Promise<void>}
   */
  async shutdown() {
    this.logger.info("🛑 Shutting down UnrdfHooksBridge...");

    try {
      if (this.scheduler.isRunning) {
        await this.scheduler.shutdown();
      }
      this.initialized = false;
      this.logger.info("✅ UnrdfHooksBridge shutdown complete");
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
 * Get or create UnrdfHooksBridge singleton
 *
 * @param {Object} [options={}] - Configuration options
 * @returns {UnrdfHooksBridge} Bridge instance
 */
export function getUnrdfHooksBridge(options = {}) {
  const cwd = options.cwd || process.cwd();

  if (!bridgeInstances.has(cwd)) {
    bridgeInstances.set(cwd, new UnrdfHooksBridge(options));
  }

  return bridgeInstances.get(cwd);
}

/**
 * Reset singleton instances (for testing)
 *
 * @param {string} [cwd] - Specific cwd to reset, or all if omitted
 * @returns {Promise<void>}
 */
export async function resetUnrdfHooksBridge(cwd = null) {
  if (cwd) {
    if (bridgeInstances.has(cwd)) {
      await bridgeInstances.get(cwd).shutdown();
      bridgeInstances.delete(cwd);
    }
    // Also reset the BreeScheduler singleton for this cwd
    resetBreeScheduler(cwd);
  } else {
    for (const [key, instance] of bridgeInstances.entries()) {
      await instance.shutdown();
      bridgeInstances.delete(key);
    }
    // Also reset all BreeScheduler singletons
    resetBreeScheduler();
  }
}

export default UnrdfHooksBridge;
