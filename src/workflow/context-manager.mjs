// src/workflow/context-manager.mjs
// State manager that holds the in-memory state of workflow execution
// Manages inputs, outputs, and intermediate results

/**
 * Context manager for workflow execution state
 */
export class ContextManager {
  /**
   * @param {object} options
   * @param {object} [options.logger] - Logger instance
   */
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.context = new Map();
    this.executionHistory = [];
    this.initialized = false;
  }

  /**
   * Initialize the context manager
   * @param {object} config - Initialization configuration
   * @param {string} config.workflowId - Workflow ID
   * @param {object} config.inputs - Initial inputs
   * @param {number} config.startTime - Execution start time
   */
  async initialize(config) {
    this.logger.info(`🎯 Initializing context manager`);

    this.workflowId = config.workflowId;
    this.startTime = config.startTime;
    this.context.clear();
    this.executionHistory = [];

    // Store initial inputs
    if (config.inputs) {
      for (const [key, value] of Object.entries(config.inputs)) {
        this.context.set(key, value);
      }
    }

    this.initialized = true;
    this.logger.info(
      `🎯 Context manager initialized with ${this.context.size} initial values`
    );
  }

  /**
   * Set an output value
   * @param {string} key - Output key
   * @param {any} value - Output value
   */
  async setOutput(key, value) {
    if (!this.initialized) {
      throw new Error("Context manager not initialized");
    }

    this.context.set(key, value);
    this.logger.debug(`📤 Set output: ${key}`);
  }

  /**
   * Get an output value
   * @param {string} key - Output key
   * @returns {any} Output value
   */
  async getOutput(key) {
    if (!this.initialized) {
      throw new Error("Context manager not initialized");
    }

    const value = this.context.get(key);
    this.logger.debug(`📥 Retrieved output: ${key}`);
    return value;
  }

  /**
   * Get all outputs
   * @returns {object} All outputs
   */
  getOutputs() {
    if (!this.initialized) {
      throw new Error("Context manager not initialized");
    }

    const outputs = {};
    for (const [key, value] of this.context.entries()) {
      outputs[key] = value;
    }
    return outputs;
  }

  /**
   * Get all inputs
   * @returns {object} All inputs
   */
  getInputs() {
    if (!this.initialized) {
      throw new Error("Context manager not initialized");
    }

    // Inputs are stored in the context but we can distinguish them
    // For now, return all context values as inputs
    return this.getOutputs();
  }

  /**
   * Check if a key exists in context
   * @param {string} key - Key to check
   * @returns {boolean} True if key exists
   */
  hasKey(key) {
    return this.context.has(key);
  }

  /**
   * Get context size
   * @returns {number} Number of items in context
   */
  getSize() {
    return this.context.size;
  }

  /**
   * Clear all context data
   */
  clear() {
    this.context.clear();
    this.executionHistory = [];
    this.logger.info(`🧹 Context cleared`);
  }

  /**
   * Record step execution
   * @param {object} stepResult - Step execution result
   */
  recordStepExecution(stepResult) {
    this.executionHistory.push({
      ...stepResult,
      timestamp: new Date().toISOString(),
      contextSize: this.context.size,
    });
  }

  /**
   * Get execution history
   * @returns {Array<object>} Execution history
   */
  getExecutionHistory() {
    return [...this.executionHistory];
  }

  /**
   * Get last execution
   * @returns {object|null} Last execution or null
   */
  getLastExecution() {
    if (this.executionHistory.length === 0) {
      return null;
    }
    return this.executionHistory[this.executionHistory.length - 1];
  }

  /**
   * Get execution statistics
   * @returns {object} Execution statistics
   */
  getExecutionStats() {
    const stats = {
      workflowId: this.workflowId,
      startTime: this.startTime,
      currentTime: Date.now(),
      duration: this.startTime ? Date.now() - this.startTime : 0,
      contextSize: this.context.size,
      stepCount: this.executionHistory.length,
      successfulSteps: this.executionHistory.filter((h) => h.success).length,
      failedSteps: this.executionHistory.filter((h) => !h.success).length,
    };

    if (stats.stepCount > 0) {
      stats.averageStepDuration =
        this.executionHistory.reduce((sum, h) => sum + h.duration, 0) /
        stats.stepCount;
    }

    return stats;
  }

  /**
   * Export context data
   * @param {object} options - Export options
   * @param {boolean} [options.includeHistory] - Include execution history
   * @param {boolean} [options.includeMetadata] - Include metadata
   * @returns {object} Exported context data
   */
  export(options = {}) {
    const exportData = {
      workflowId: this.workflowId,
      startTime: this.startTime,
      context: this.getOutputs(),
    };

    if (options.includeHistory) {
      exportData.executionHistory = this.getExecutionHistory();
    }

    if (options.includeMetadata) {
      exportData.metadata = {
        contextSize: this.context.size,
        initialized: this.initialized,
        exportTime: new Date().toISOString(),
      };
    }

    return exportData;
  }

  /**
   * Import context data
   * @param {object} data - Context data to import
   */
  async import(data) {
    this.logger.info(`📥 Importing context data`);

    if (data.workflowId) {
      this.workflowId = data.workflowId;
    }

    if (data.startTime) {
      this.startTime = data.startTime;
    }

    if (data.context) {
      this.context.clear();
      for (const [key, value] of Object.entries(data.context)) {
        this.context.set(key, value);
      }
    }

    if (data.executionHistory) {
      this.executionHistory = [...data.executionHistory];
    }

    this.initialized = true;
    this.logger.info(`📥 Context imported with ${this.context.size} values`);
  }

  /**
   * Create a snapshot of the current context
   * @returns {object} Context snapshot
   */
  createSnapshot() {
    return {
      timestamp: new Date().toISOString(),
      workflowId: this.workflowId,
      context: this.getOutputs(),
      executionHistory: this.getExecutionHistory(),
      stats: this.getExecutionStats(),
    };
  }

  /**
   * Restore context from snapshot
   * @param {object} snapshot - Context snapshot
   */
  async restoreSnapshot(snapshot) {
    this.logger.info(`🔄 Restoring context from snapshot`);

    if (snapshot.workflowId) {
      this.workflowId = snapshot.workflowId;
    }

    if (snapshot.context) {
      this.context.clear();
      for (const [key, value] of Object.entries(snapshot.context)) {
        this.context.set(key, value);
      }
    }

    if (snapshot.executionHistory) {
      this.executionHistory = [...snapshot.executionHistory];
    }

    this.initialized = true;
    this.logger.info(`🔄 Context restored with ${this.context.size} values`);
  }

  /**
   * Get context keys matching a pattern
   * @param {string|RegExp} pattern - Pattern to match
   * @returns {Array<string>} Matching keys
   */
  getKeysMatching(pattern) {
    const keys = Array.from(this.context.keys());

    if (typeof pattern === "string") {
      return keys.filter((key) => key.includes(pattern));
    } else if (pattern instanceof RegExp) {
      return keys.filter((key) => pattern.test(key));
    }

    return keys;
  }

  /**
   * Get context values of a specific type
   * @param {string} type - Type to filter by
   * @returns {Array<any>} Values of the specified type
   */
  getValuesOfType(type) {
    const values = Array.from(this.context.values());
    return values.filter((value) => typeof value === type);
  }

  /**
   * Merge context data
   * @param {object} data - Data to merge
   * @param {boolean} [overwrite] - Whether to overwrite existing keys
   */
  merge(data, overwrite = false) {
    for (const [key, value] of Object.entries(data)) {
      if (overwrite || !this.context.has(key)) {
        this.context.set(key, value);
      }
    }

    this.logger.info(
      `🔀 Merged ${Object.keys(data).length} values into context`
    );
  }

  /**
   * Remove a key from context
   * @param {string} key - Key to remove
   * @returns {boolean} True if key was removed
   */
  remove(key) {
    const removed = this.context.delete(key);
    if (removed) {
      this.logger.debug(`🗑️ Removed key: ${key}`);
    }
    return removed;
  }

  /**
   * Get context summary
   * @returns {object} Context summary
   */
  getSummary() {
    const summary = {
      workflowId: this.workflowId,
      initialized: this.initialized,
      contextSize: this.context.size,
      stepCount: this.executionHistory.length,
      keyTypes: {},
      valueTypes: {},
    };

    // Analyze key patterns
    for (const key of this.context.keys()) {
      const keyType = typeof key;
      summary.keyTypes[keyType] = (summary.keyTypes[keyType] || 0) + 1;
    }

    // Analyze value types
    for (const value of this.context.values()) {
      const valueType = typeof value;
      summary.valueTypes[valueType] = (summary.valueTypes[valueType] || 0) + 1;
    }

    return summary;
  }
}
