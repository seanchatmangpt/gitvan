// src/workflow/step-handlers/BaseStepHandler.mjs
// Base class for all step handlers

/**
 * Base class for step handlers
 */
export class BaseStepHandler {
  /**
   * @param {object} options
   * @param {object} [options.logger] - Logger instance
   * @param {number} [options.defaultTimeout] - Default timeout for steps
   */
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.defaultTimeout = options.defaultTimeout || 30000;
  }

  /**
   * Execute the step
   * @param {object} step - Step definition
   * @param {object} inputs - Step inputs
   * @param {object} context - Execution context
   * @returns {Promise<object>} Step execution result
   */
  async execute(step, inputs, context) {
    throw new Error(
      `execute method must be implemented by ${this.constructor.name}`
    );
  }

  /**
   * Validate step configuration
   * @param {object} step - Step definition
   * @returns {boolean} True if valid
   */
  validate(step) {
    return true; // Override in subclasses for specific validation
  }

  /**
   * Get step type name
   * @returns {string} Step type
   */
  getStepType() {
    throw new Error(
      `getStepType method must be implemented by ${this.constructor.name}`
    );
  }

  /**
   * Replace variables in a string with input values
   * @param {string} template - Template string
   * @param {object} inputs - Input values
   * @returns {string} Processed string
   */
  replaceVariables(template, inputs) {
    let result = template;
    for (const [key, value] of Object.entries(inputs)) {
      const placeholder = `{{${key}}}`;
      if (result.includes(placeholder)) {
        result = result.replace(
          new RegExp(placeholder, "g"),
          JSON.stringify(value)
        );
      }
    }
    return result;
  }

  /**
   * Create a standardized step result
   * @param {object} data - Result data
   * @param {boolean} success - Success status
   * @param {string} [error] - Error message if failed
   * @returns {object} Standardized result
   */
  createResult(data, success = true, error = null) {
    return {
      success,
      data,
      error,
      timestamp: new Date().toISOString(),
    };
  }
}
