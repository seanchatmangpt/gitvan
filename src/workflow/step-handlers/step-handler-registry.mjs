// src/workflow/step-handlers/StepHandlerRegistry.mjs
// Registry for managing step handlers

import { SparqlStepHandler } from "./sparql-step-handler.mjs";
import { TemplateStepHandler } from "./template-step-handler.mjs";
import { FileStepHandler } from "./file-step-handler.mjs";
import { HttpStepHandler } from "./http-step-handler.mjs";
import { CliStepHandler } from "./cli-step-handler.mjs";

/**
 * Registry for step handlers
 */
export class StepHandlerRegistry {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.handlers = new Map();
    this.registerDefaultHandlers();
  }

  /**
   * Register default step handlers
   */
  registerDefaultHandlers() {
    const handlerOptions = {
      logger: this.logger,
    };

    // Register core handlers
    this.register("sparql", new SparqlStepHandler(handlerOptions));
    this.register("template", new TemplateStepHandler(handlerOptions));
    this.register("file", new FileStepHandler(handlerOptions));
    this.register("http", new HttpStepHandler(handlerOptions));
    this.register("cli", new CliStepHandler(handlerOptions));

    // TODO: Register additional handlers as they are created
    // this.register("database", new DatabaseStepHandler(handlerOptions));
    // this.register("filesystem", new FilesystemStepHandler(handlerOptions));
    // this.register("conditional", new ConditionalStepHandler(handlerOptions));
    // this.register("loop", new LoopStepHandler(handlerOptions));
    // this.register("parallel", new ParallelStepHandler(handlerOptions));
    // this.register("error-handling", new ErrorHandlingStepHandler(handlerOptions));
    // this.register("notification", new NotificationStepHandler(handlerOptions));
  }

  /**
   * Register a step handler
   * @param {string} stepType - Step type name
   * @param {object} handler - Step handler instance
   */
  register(stepType, handler) {
    if (!handler || typeof handler.execute !== "function") {
      throw new Error(
        `Handler for step type '${stepType}' must implement execute method`
      );
    }

    if (!handler.getStepType || handler.getStepType() !== stepType) {
      throw new Error(
        `Handler for step type '${stepType}' must implement getStepType method returning '${stepType}'`
      );
    }

    this.handlers.set(stepType, handler);
    this.logger.info(`📝 Registered step handler: ${stepType}`);
  }

  /**
   * Get a step handler by type
   * @param {string} stepType - Step type name
   * @returns {object|null} Step handler instance or null if not found
   */
  getHandler(stepType) {
    return this.handlers.get(stepType) || null;
  }

  /**
   * Check if a step handler is registered
   * @param {string} stepType - Step type name
   * @returns {boolean} True if handler is registered
   */
  hasHandler(stepType) {
    return this.handlers.has(stepType);
  }

  /**
   * Get all registered step types
   * @returns {string[]} Array of step type names
   */
  getRegisteredTypes() {
    return Array.from(this.handlers.keys());
  }

  /**
   * Validate a step using its handler
   * @param {object} step - Step definition
   * @returns {boolean} True if step is valid
   */
  validateStep(step) {
    const handler = this.getHandler(step.type);
    if (!handler) {
      throw new Error(`No handler registered for step type: ${step.type}`);
    }

    return handler.validate(step);
  }

  /**
   * Execute a step using its handler
   * @param {object} step - Step definition
   * @param {object} inputs - Step inputs
   * @param {object} context - Execution context
   * @returns {Promise<object>} Step execution result
   */
  async executeStep(step, inputs, context) {
    const handler = this.getHandler(step.type);
    if (!handler) {
      throw new Error(`No handler registered for step type: ${step.type}`);
    }

    return await handler.execute(step, inputs, context);
  }
}
