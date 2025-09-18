// src/workflow/StepRunner.mjs
// Step execution engine that executes individual workflow steps
// Handles different step types and integrates with GitVan composables

import { promises as fs } from "node:fs";
import { join } from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

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
   * @returns {Promise<object>} Step execution result
   */
  async executeStep(step, contextManager, graph, turtle) {
    const startTime = performance.now();
    this.logger.info(`⚡ Executing step: ${step.id} (${step.type})`);

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
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      // Store step outputs in context
      await this._storeStepOutputs(step, result, contextManager);

      const endTime = performance.now();
      const duration = endTime - startTime;

      this.logger.info(
        `✅ Step completed: ${step.id} (${Math.round(duration)}ms)`
      );

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

    // Get template content
    let templateContent = step.config.template;

    // If template is a file path, read it
    if (
      templateContent.startsWith("file://") ||
      templateContent.includes("/")
    ) {
      const templatePath = templateContent.replace("file://", "");
      templateContent = await fs.readFile(templatePath, "utf8");
    }

    // Simple template processing (replace variables)
    let rendered = templateContent;

    // Process filters first
    for (const [key, value] of Object.entries(inputs)) {
      // Handle length filter
      if (rendered.includes(`{{ ${key} | length }}`)) {
        const length = Array.isArray(value)
          ? value.length
          : typeof value === "object"
          ? Object.keys(value).length
          : String(value).length;
        rendered = rendered.replace(`{{ ${key} | length }}`, String(length));
      }

      // Handle tojson filter
      if (rendered.includes(`{{ ${key} | tojson }}`)) {
        rendered = rendered.replace(
          `{{ ${key} | tojson }}`,
          JSON.stringify(value)
        );
      }

      // Regular variable replacement (only if no filters were applied)
      if (
        rendered.includes(`{{ ${key} }}`) &&
        !rendered.includes(`{{ ${key} |`)
      ) {
        rendered = rendered.replace(`{{ ${key} }}`, String(value));
      }
    }

    // Write output if file path specified
    if (step.config.filePath) {
      await fs.writeFile(step.config.filePath, rendered, "utf8");
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
        const writeContent = step.config.content || "";
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
}
