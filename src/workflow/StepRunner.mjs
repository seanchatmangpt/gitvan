// src/workflow/StepRunner.mjs
// Refactored step execution engine using modular step handlers

import { StepHandlerRegistry } from "./step-handlers/step-handler-registry.mjs";

/**
 * Step runner that executes individual workflow steps using modular handlers
 */
export class StepRunner {
  /**
   * @param {object} options
   * @param {object} [options.logger] - Logger instance
   * @param {number} [options.defaultTimeout] - Default timeout for steps
   */
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.defaultTimeout = options.defaultTimeout || 30000; // 30 seconds
    this.handlerRegistry = new StepHandlerRegistry({ logger: this.logger });
  }

  /**
   * Execute a single workflow step using the appropriate handler
   * @param {object} step - Step definition
   * @param {object} contextManager - Context manager instance
   * @param {object} graph - useGraph instance
   * @param {object} turtle - useTurtle instance
   * @param {object} [options] - Execution options
   * @returns {Promise<object>} Step execution result
   */
  async executeStep(step, contextManager, graph, turtle, options = {}) {
    const startTime = performance.now();
    if (options.verbose) {
      this.logger.info(`⚡ Executing step: ${step.id} (${step.type})`);
    }

    try {
      // Validate step using handler
      this.handlerRegistry.validateStep(step);

      // Get step inputs from context
      const inputs = await this._getStepInputs(step, contextManager);

      // Prepare execution context
      const context = {
        graph,
        turtle,
        contextManager,
        logger: this.logger,
        options,
        files: options.files, // Pass files from options if available
      };

      // Execute step using appropriate handler
      const result = await this.handlerRegistry.executeStep(
        step,
        inputs,
        context
      );

      // Store step outputs in context
      await this._storeStepOutputs(step, result, contextManager);

      const endTime = performance.now();
      const duration = endTime - startTime;

      if (options.verbose) {
        this.logger.info(
          `✅ Step completed: ${step.id} (${duration.toFixed(2)}ms)`
        );
      }

      return {
        stepId: step.id,
        success: true,
        duration,
        outputs: result.data || {},
        timestamp: new Date().toISOString(),
        stepType: step.type,
        handlerUsed: step.type,
      };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.logger.error(`❌ Step failed: ${step.id} - ${error.message}`);

      return {
        stepId: step.id,
        success: false,
        duration,
        error: error.message,
        timestamp: new Date().toISOString(),
        stepType: step.type,
        handlerUsed: step.type,
      };
    }
  }

  /**
   * Get step inputs from context manager
   * @param {object} step - Step definition
   * @param {object} contextManager - Context manager instance
   * @returns {Promise<object>} Step inputs
   */
  async _getStepInputs(step, contextManager) {
    if (!step.inputMapping) {
      return {};
    }

    const inputs = {};
    for (const [inputKey, contextKey] of Object.entries(step.inputMapping)) {
      try {
        inputs[inputKey] = await contextManager.get(contextKey);
      } catch (error) {
        this.logger.warn(
          `⚠️ Could not get input '${inputKey}' from context key '${contextKey}': ${error.message}`
        );
        inputs[inputKey] = null;
      }
    }

    return inputs;
  }

  /**
   * Store step outputs in context manager
   * @param {object} step - Step definition
   * @param {object} result - Step execution result
   * @param {object} contextManager - Context manager instance
   * @returns {Promise<void>}
   */
  async _storeStepOutputs(step, result, contextManager) {
    if (!step.outputMapping || !result.success) {
      return;
    }

    for (const [contextKey, outputKey] of Object.entries(step.outputMapping)) {
      try {
        const value = outputKey ? result.data?.[outputKey] : result.data;
        await contextManager.set(contextKey, value);
      } catch (error) {
        this.logger.warn(
          `⚠️ Could not store output '${outputKey}' to context key '${contextKey}': ${error.message}`
        );
      }
    }
  }

  /**
   * Register a custom step handler
   * @param {string} stepType - Step type name
   * @param {object} handler - Step handler instance
   */
  registerHandler(stepType, handler) {
    this.handlerRegistry.register(stepType, handler);
  }

  /**
   * Get registered step types
   * @returns {string[]} Array of registered step types
   */
  getRegisteredStepTypes() {
    return this.handlerRegistry.getRegisteredTypes();
  }

  /**
   * Check if a step type is supported
   * @param {string} stepType - Step type name
   * @returns {boolean} True if step type is supported
   */
  isStepTypeSupported(stepType) {
    return this.handlerRegistry.hasHandler(stepType);
  }

  /**
   * Get handler registry for advanced operations
   * @returns {StepHandlerRegistry} Handler registry instance
   */
  getHandlerRegistry() {
    return this.handlerRegistry;
  }
}
