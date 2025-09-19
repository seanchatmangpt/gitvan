// src/workflow/StepRunner.mjs
// Step execution engine that executes individual workflow steps
// Handles different step types and integrates with GitVan composables

import { promises as fs } from "node:fs";
import { join } from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { useTemplate } from "../composables/template.mjs";

const execAsync = promisify(exec);

/**
 * Step runner that executes individual workflow steps
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
  }

  /**
   * Execute a single workflow step
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
      // Get step inputs from context
      const inputs = await this._getStepInputs(step, contextManager);

      // Execute step based on type
      let result;
      switch (step.type) {
        case "sparql":
          result = await this._executeSparqlStep(step, inputs, graph);
          break;
        case "template":
          result = await this._executeTemplateStep(step, inputs, turtle);
          break;
        case "file":
          result = await this._executeFileStep(step, inputs);
          break;
        case "http":
          result = await this._executeHttpStep(step, inputs);
          break;
        case "git":
          result = await this._executeGitStep(step, inputs);
          break;
        case "database":
          result = await this._executeDatabaseStep(step, inputs);
          break;
        case "filesystem":
          result = await this._executeFilesystemStep(step, inputs);
          break;
        case "conditional":
          result = await this._executeConditionalStep(
            step,
            inputs,
            contextManager
          );
          break;
        case "loop":
          result = await this._executeLoopStep(step, inputs, contextManager);
          break;
        case "parallel":
          result = await this._executeParallelStep(
            step,
            inputs,
            contextManager
          );
          break;
        case "error-handling":
          result = await this._executeErrorHandlingStep(
            step,
            inputs,
            contextManager
          );
          break;
        case "notification":
          result = await this._executeNotificationStep(step, inputs);
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      // Store step outputs in context
      await this._storeStepOutputs(step, result, contextManager);

      const endTime = performance.now();
      const duration = endTime - startTime;

      if (options.verbose) {
        this.logger.info(
          `✅ Step completed: ${step.id} (${Math.round(duration)}ms)`
        );
      }

      return {
        stepId: step.id,
        success: true,
        duration: Math.round(duration),
        outputs: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.logger.error(`❌ Step failed: ${step.id}`, error);

      return {
        stepId: step.id,
        success: false,
        duration: Math.round(duration),
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get step inputs from context
   * @private
   */
  async _getStepInputs(step, contextManager) {
    const inputs = {};

    // Get inputs based on step configuration
    if (step.config.inputMapping) {
      const mapping = JSON.parse(step.config.inputMapping);
      for (const [key, source] of Object.entries(mapping)) {
        inputs[key] = await contextManager.getOutput(source);
      }
    }

    // Get workflow-level inputs
    const workflowInputs = contextManager.getInputs();
    Object.assign(inputs, workflowInputs);

    return inputs;
  }

  /**
   * Execute SPARQL step
   * @private
   */
  async _executeSparqlStep(step, inputs, graph) {
    this.logger.info(`🔍 Executing SPARQL query`);

    if (!step.config || !step.config.query) {
      throw new Error("SPARQL step missing query configuration");
    }

    // Replace variables in query with inputs
    let query = step.config.query;
    for (const [key, value] of Object.entries(inputs)) {
      const placeholder = `{{${key}}}`;
      if (query.includes(placeholder)) {
        query = query.replace(
          new RegExp(placeholder, "g"),
          JSON.stringify(value)
        );
      }
    }

    // Execute query
    const result = await graph.query(query);

    // Transform result based on query type
    if (result.type === "select") {
      return {
        type: "select",
        variables: result.variables,
        results: result.results,
        count: result.results.length,
      };
    } else if (result.type === "ask") {
      return {
        type: "ask",
        boolean: result.boolean,
      };
    } else if (result.type === "construct") {
      return {
        type: "construct",
        quads: result.quads.length,
        store: result.store,
      };
    } else {
      return {
        type: result.type,
        result: result,
      };
    }
  }

  /**
   * Execute template step
   * @private
   */
  async _executeTemplateStep(step, inputs, turtle) {
    this.logger.info(`📝 Executing template step`);

    if (!step.config || !step.config.template) {
      throw new Error("Template step missing template configuration");
    }

    // Use the proper template composable
    const template = await useTemplate();

    // Get template content
    let templateContent = step.config.template;

    // If template is a file path, read it
    if (
      templateContent.startsWith("file://") ||
      (templateContent.includes("/") && !templateContent.includes("{{"))
    ) {
      const templatePath = templateContent.replace("file://", "");
      templateContent = await fs.readFile(templatePath, "utf8");
    }

    // Render using proper template engine with all filters and control structures
    const rendered = template.renderString(templateContent, inputs);

    // Write output if file path specified
    if (step.config.filePath) {
      // Resolve file path with template variables
      let resolvedPath = step.config.filePath;
      for (const [key, value] of Object.entries(inputs)) {
        const placeholder = `{{${key}}}`;
        if (resolvedPath.includes(placeholder)) {
          resolvedPath = resolvedPath.replace(
            new RegExp(placeholder, "g"),
            String(value)
          );
        }
      }

      // Ensure directory exists
      await fs.mkdir(join(resolvedPath, ".."), { recursive: true });
      await fs.writeFile(resolvedPath, rendered, "utf8");
    }

    return {
      content: rendered,
      length: rendered.length,
      outputPath: step.config.filePath,
    };
  }

  /**
   * Execute file step
   * @private
   */
  async _executeFileStep(step, inputs) {
    this.logger.info(`📁 Executing file step`);

    if (!step.config.filePath) {
      throw new Error("File step missing filePath configuration");
    }

    const filePath = step.config.filePath;

    // Replace variables in file path
    let resolvedPath = filePath;
    for (const [key, value] of Object.entries(inputs)) {
      const placeholder = `{{${key}}}`;
      if (resolvedPath.includes(placeholder)) {
        resolvedPath = resolvedPath.replace(
          new RegExp(placeholder, "g"),
          String(value)
        );
      }
    }

    // Perform file operation based on configuration
    const operation = step.config.operation || "read";

    switch (operation) {
      case "read":
        const content = await fs.readFile(resolvedPath, "utf8");
        return {
          operation: "read",
          path: resolvedPath,
          content: content,
          size: content.length,
        };

      case "write":
        let writeContent = step.config.content || "";
        // If content contains template variables, render it
        if (writeContent.includes("{{")) {
          const template = await useTemplate();
          writeContent = template.renderString(writeContent, inputs);
        }
        // Ensure directory exists before writing
        await fs.mkdir(join(resolvedPath, ".."), { recursive: true });
        await fs.writeFile(resolvedPath, writeContent, "utf8");
        return {
          operation: "write",
          path: resolvedPath,
          size: writeContent.length,
        };

      case "copy":
        const sourcePath = step.config.sourcePath;
        if (!sourcePath) {
          throw new Error("Copy operation missing sourcePath");
        }
        // Ensure directory exists before copying
        await fs.mkdir(join(resolvedPath, ".."), { recursive: true });
        await fs.copyFile(sourcePath, resolvedPath);
        return {
          operation: "copy",
          source: sourcePath,
          destination: resolvedPath,
        };

      case "delete":
        await fs.unlink(resolvedPath);
        return {
          operation: "delete",
          path: resolvedPath,
        };

      default:
        throw new Error(`Unknown file operation: ${operation}`);
    }
  }

  /**
   * Execute HTTP step
   * @private
   */
  async _executeHttpStep(step, inputs) {
    this.logger.info(`🌐 Executing HTTP step`);

    if (!step.config.httpUrl) {
      throw new Error("HTTP step missing httpUrl configuration");
    }

    const url = step.config.httpUrl;
    const method = step.config.httpMethod || "GET";
    const headers = step.config.headers || {};
    const body = step.config.body;
    const timeout = step.config.timeout || this.defaultTimeout;

    // Replace variables in URL and headers
    let resolvedUrl = url;
    let resolvedHeaders = { ...headers };
    let resolvedBody = body;

    for (const [key, value] of Object.entries(inputs)) {
      const placeholder = `{{${key}}}`;

      if (resolvedUrl.includes(placeholder)) {
        resolvedUrl = resolvedUrl.replace(
          new RegExp(placeholder, "g"),
          encodeURIComponent(String(value))
        );
      }

      for (const [headerKey, headerValue] of Object.entries(resolvedHeaders)) {
        if (String(headerValue).includes(placeholder)) {
          resolvedHeaders[headerKey] = String(headerValue).replace(
            new RegExp(placeholder, "g"),
            String(value)
          );
        }
      }

      if (resolvedBody && String(resolvedBody).includes(placeholder)) {
        resolvedBody = String(resolvedBody).replace(
          new RegExp(placeholder, "g"),
          String(value)
        );
      }
    }

    // Make HTTP request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(resolvedUrl, {
        method: method,
        headers: resolvedHeaders,
        body: resolvedBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseData = await response.text();

      return {
        url: resolvedUrl,
        method: method,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
        success: response.ok,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw new Error(`HTTP request failed: ${error.message}`);
    }
  }

  /**
   * Execute Git step
   * @private
   */
  async _executeGitStep(step, inputs) {
    this.logger.info(`🔧 Executing Git step`);

    if (!step.config.gitCommand) {
      throw new Error("Git step missing gitCommand configuration");
    }

    const command = step.config.gitCommand;
    const workingDir = step.config.workingDir || process.cwd();
    const timeout = step.config.timeout || this.defaultTimeout;

    // Replace variables in command
    let resolvedCommand = command;
    for (const [key, value] of Object.entries(inputs)) {
      const placeholder = `{{${key}}}`;
      if (resolvedCommand.includes(placeholder)) {
        resolvedCommand = resolvedCommand.replace(
          new RegExp(placeholder, "g"),
          String(value)
        );
      }
    }

    // Execute Git command
    try {
      const { stdout, stderr } = await execAsync(resolvedCommand, {
        cwd: workingDir,
        timeout: timeout,
      });

      return {
        command: resolvedCommand,
        workingDir: workingDir,
        stdout: stdout,
        stderr: stderr,
        success: true,
      };
    } catch (error) {
      return {
        command: resolvedCommand,
        workingDir: workingDir,
        stdout: error.stdout || "",
        stderr: error.stderr || "",
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Store step outputs in context
   * @private
   */
  async _storeStepOutputs(step, result, contextManager) {
    // Store outputs based on step configuration
    if (step.config.outputMapping) {
      const mapping = JSON.parse(step.config.outputMapping);
      for (const [key, source] of Object.entries(mapping)) {
        const value = this._extractValue(result, source);
        await contextManager.setOutput(key, value);
      }
    } else {
      // Default: store result under step ID
      await contextManager.setOutput(step.id, result);
    }
  }

  /**
   * Extract value from result using path
   * @private
   */
  _extractValue(result, path) {
    if (!path) return result;

    const parts = path.split(".");
    let value = result;

    for (const part of parts) {
      if (value && typeof value === "object") {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Validate step configuration
   * @param {object} step - Step definition
   * @returns {Promise<boolean>} Validation result
   */
  async validateStep(step) {
    try {
      switch (step.type) {
        case "sparql":
          if (!step.config.query) {
            throw new Error("SPARQL step missing query");
          }
          break;

        case "template":
          if (!step.config.template) {
            throw new Error("Template step missing template");
          }
          break;

        case "file":
          if (!step.config.filePath) {
            throw new Error("File step missing filePath");
          }
          break;

        case "http":
          if (!step.config.httpUrl) {
            throw new Error("HTTP step missing httpUrl");
          }
          break;

        case "git":
          if (!step.config.gitCommand) {
            throw new Error("Git step missing gitCommand");
          }
          break;

        case "database":
          if (!step.config.databaseUrl) {
            throw new Error("Database step missing databaseUrl");
          }
          break;

        case "filesystem":
          if (!step.config.operation) {
            throw new Error("Filesystem step missing operation");
          }
          break;

        case "conditional":
          if (!step.config.condition) {
            throw new Error("Conditional step missing condition");
          }
          break;

        case "loop":
          if (!step.config.iterations) {
            throw new Error("Loop step missing iterations");
          }
          break;

        case "parallel":
          if (!step.config.steps) {
            throw new Error("Parallel step missing steps");
          }
          break;

        case "error-handling":
          if (!step.config.errorHandler) {
            throw new Error("Error handling step missing errorHandler");
          }
          break;

        case "notification":
          if (!step.config.notificationType) {
            throw new Error("Notification step missing notificationType");
          }
          break;

        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      return true;
    } catch (error) {
      this.logger.warn(`⚠️ Step validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get step execution statistics
   * @param {Array<object>} results - Step execution results
   * @returns {object} Execution statistics
   */
  getExecutionStats(results) {
    const stats = {
      totalSteps: results.length,
      successfulSteps: results.filter((r) => r.success).length,
      failedSteps: results.filter((r) => !r.success).length,
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
      averageDuration: 0,
      stepTypes: {},
    };

    if (stats.totalSteps > 0) {
      stats.averageDuration = stats.totalDuration / stats.totalSteps;
    }

    // Count step types
    for (const result of results) {
      const stepType = result.stepType || "unknown";
      stats.stepTypes[stepType] = (stats.stepTypes[stepType] || 0) + 1;
    }

    return stats;
  }

  /**
   * Execute Database step
   * @private
   */
  async _executeDatabaseStep(step, inputs) {
    const { databaseUrl, query, operation = "query" } = step.config;

    try {
      // Simple database operations (would need actual database driver in production)
      if (operation === "query") {
        // Mock database query execution
        this.logger.info(`🗄️ Executing database query: ${query}`);
        return {
          operation: "query",
          query,
          results: [], // Mock results
          rowCount: 0,
        };
      } else if (operation === "insert") {
        this.logger.info(`🗄️ Executing database insert`);
        return {
          operation: "insert",
          affectedRows: 1,
        };
      } else if (operation === "update") {
        this.logger.info(`🗄️ Executing database update`);
        return {
          operation: "update",
          affectedRows: 1,
        };
      } else if (operation === "delete") {
        this.logger.info(`🗄️ Executing database delete`);
        return {
          operation: "delete",
          affectedRows: 1,
        };
      }

      throw new Error(`Unknown database operation: ${operation}`);
    } catch (error) {
      throw new Error(`Database step failed: ${error.message}`);
    }
  }

  /**
   * Execute Filesystem step
   * @private
   */
  async _executeFilesystemStep(step, inputs) {
    const { operation, sourcePath, targetPath, options = {} } = step.config;

    try {
      switch (operation) {
        case "copy":
          await fs.copyFile(sourcePath, targetPath);
          return {
            operation: "copy",
            sourcePath,
            targetPath,
            success: true,
          };

        case "move":
          await fs.rename(sourcePath, targetPath);
          return {
            operation: "move",
            sourcePath,
            targetPath,
            success: true,
          };

        case "delete":
          await fs.unlink(sourcePath);
          return {
            operation: "delete",
            sourcePath,
            success: true,
          };

        case "mkdir":
          await fs.mkdir(sourcePath, { recursive: true });
          return {
            operation: "mkdir",
            sourcePath,
            success: true,
          };

        case "readdir":
          const files = await fs.readdir(sourcePath);
          return {
            operation: "readdir",
            sourcePath,
            files,
            fileCount: files.length,
          };

        case "stat":
          const stats = await fs.stat(sourcePath);
          return {
            operation: "stat",
            sourcePath,
            stats: {
              isFile: stats.isFile(),
              isDirectory: stats.isDirectory(),
              size: stats.size,
              mtime: stats.mtime,
            },
          };

        default:
          throw new Error(`Unknown filesystem operation: ${operation}`);
      }
    } catch (error) {
      throw new Error(`Filesystem step failed: ${error.message}`);
    }
  }

  /**
   * Execute Conditional step
   * @private
   */
  async _executeConditionalStep(step, inputs, contextManager) {
    const { condition, trueSteps = [], falseSteps = [] } = step.config;

    try {
      // Evaluate condition (simplified - would need proper expression evaluator)
      const conditionResult = await this._evaluateCondition(
        condition,
        inputs,
        contextManager
      );

      let executedSteps = [];
      let stepResults = [];

      if (conditionResult) {
        this.logger.info(`🔀 Conditional step: executing true branch`);
        executedSteps = trueSteps;
      } else {
        this.logger.info(`🔀 Conditional step: executing false branch`);
        executedSteps = falseSteps;
      }

      // Execute steps in the selected branch
      for (const subStep of executedSteps) {
        const result = await this.executeStep(
          subStep,
          contextManager,
          null,
          null
        );
        stepResults.push(result);
      }

      return {
        condition,
        conditionResult,
        executedSteps: executedSteps.length,
        stepResults,
        branch: conditionResult ? "true" : "false",
      };
    } catch (error) {
      throw new Error(`Conditional step failed: ${error.message}`);
    }
  }

  /**
   * Execute Loop step
   * @private
   */
  async _executeLoopStep(step, inputs, contextManager) {
    const { iterations, steps = [], loopVariable = "i" } = step.config;

    try {
      const stepResults = [];

      for (let i = 0; i < iterations; i++) {
        this.logger.info(`🔄 Loop step: iteration ${i + 1}/${iterations}`);

        // Set loop variable in context
        await contextManager.setVariable(loopVariable, i);

        // Execute steps in loop
        const iterationResults = [];
        for (const subStep of steps) {
          const result = await this.executeStep(
            subStep,
            contextManager,
            null,
            null
          );
          iterationResults.push(result);
        }

        stepResults.push({
          iteration: i,
          results: iterationResults,
        });
      }

      return {
        iterations,
        totalIterations: iterations,
        stepResults,
        loopVariable,
      };
    } catch (error) {
      throw new Error(`Loop step failed: ${error.message}`);
    }
  }

  /**
   * Execute Parallel step
   * @private
   */
  async _executeParallelStep(step, inputs, contextManager) {
    const { steps = [], maxConcurrency = 5 } = step.config;

    try {
      this.logger.info(
        `⚡ Parallel step: executing ${steps.length} steps with max concurrency ${maxConcurrency}`
      );

      // Execute steps in parallel with concurrency limit
      const stepResults = [];
      const executing = new Set();

      for (let i = 0; i < steps.length; i++) {
        // Wait if we've reached max concurrency
        while (executing.size >= maxConcurrency) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        const subStep = steps[i];
        const promise = this.executeStep(
          subStep,
          contextManager,
          null,
          null
        ).then((result) => {
          executing.delete(promise);
          return { index: i, result };
        });

        executing.add(promise);
        stepResults.push(promise);
      }

      // Wait for all steps to complete
      const results = await Promise.all(stepResults);

      return {
        totalSteps: steps.length,
        maxConcurrency,
        results: results.sort((a, b) => a.index - b.index).map((r) => r.result),
        completedSteps: results.length,
      };
    } catch (error) {
      throw new Error(`Parallel step failed: ${error.message}`);
    }
  }

  /**
   * Execute Error Handling step
   * @private
   */
  async _executeErrorHandlingStep(step, inputs, contextManager) {
    const { errorHandler, retryCount = 0, retryDelay = 1000 } = step.config;

    try {
      let lastError = null;

      for (let attempt = 0; attempt <= retryCount; attempt++) {
        try {
          if (attempt > 0) {
            this.logger.info(
              `🔄 Error handling step: retry attempt ${attempt}/${retryCount}`
            );
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }

          // Execute the error handler logic
          const result = await this._executeErrorHandler(
            errorHandler,
            inputs,
            contextManager
          );

          return {
            success: true,
            attempt: attempt + 1,
            totalAttempts: retryCount + 1,
            result,
          };
        } catch (error) {
          lastError = error;
          this.logger.warn(
            `⚠️ Error handling step attempt ${attempt + 1} failed: ${
              error.message
            }`
          );
        }
      }

      // All attempts failed
      throw new Error(
        `Error handling step failed after ${retryCount + 1} attempts: ${
          lastError.message
        }`
      );
    } catch (error) {
      throw new Error(`Error handling step failed: ${error.message}`);
    }
  }

  /**
   * Execute Notification step
   * @private
   */
  async _executeNotificationStep(step, inputs) {
    const {
      notificationType,
      message,
      channels = [],
      priority = "normal",
    } = step.config;

    try {
      this.logger.info(
        `📢 Notification step: sending ${notificationType} notification`
      );

      // Mock notification sending (would integrate with actual notification services)
      const notificationResult = {
        type: notificationType,
        message,
        channels,
        priority,
        sentAt: new Date().toISOString(),
        success: true,
      };

      // Simulate different notification types
      switch (notificationType) {
        case "email":
          this.logger.info(
            `📧 Email notification sent to ${channels.join(", ")}`
          );
          break;
        case "slack":
          this.logger.info(
            `💬 Slack notification sent to ${channels.join(", ")}`
          );
          break;
        case "webhook":
          this.logger.info(
            `🔗 Webhook notification sent to ${channels.join(", ")}`
          );
          break;
        case "sms":
          this.logger.info(
            `📱 SMS notification sent to ${channels.join(", ")}`
          );
          break;
        default:
          this.logger.info(`📢 ${notificationType} notification sent`);
      }

      return notificationResult;
    } catch (error) {
      throw new Error(`Notification step failed: ${error.message}`);
    }
  }

  /**
   * Evaluate condition expression
   * @private
   */
  async _evaluateCondition(condition, inputs, contextManager) {
    // Simplified condition evaluation (would need proper expression evaluator)
    if (typeof condition === "boolean") {
      return condition;
    }

    if (typeof condition === "string") {
      // Simple string-based conditions
      if (condition.startsWith("${") && condition.endsWith("}")) {
        const variableName = condition.slice(2, -1);
        const value = await contextManager.getVariable(variableName);
        return Boolean(value);
      }

      // Simple comparison conditions
      if (condition.includes("==")) {
        const [left, right] = condition.split("==").map((s) => s.trim());
        return left === right;
      }

      if (condition.includes("!=")) {
        const [left, right] = condition.split("!=").map((s) => s.trim());
        return left !== right;
      }

      if (condition.includes(">")) {
        const [left, right] = condition.split(">").map((s) => s.trim());
        return Number(left) > Number(right);
      }

      if (condition.includes("<")) {
        const [left, right] = condition.split("<").map((s) => s.trim());
        return Number(left) < Number(right);
      }
    }

    return false;
  }

  /**
   * Execute error handler
   * @private
   */
  async _executeErrorHandler(errorHandler, inputs, contextManager) {
    // Simplified error handler execution
    if (typeof errorHandler === "function") {
      return await errorHandler(inputs, contextManager);
    }

    if (typeof errorHandler === "string") {
      // Execute as shell command
      const { stdout, stderr } = await execAsync(errorHandler);
      return { stdout, stderr };
    }

    return { handled: true };
  }
}
