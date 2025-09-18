// src/workflow/WorkflowParser.mjs
// Parser and validator for workflow definitions in Turtle format
// Loads workflow definitions and validates their structure

import { useGraph } from "../composables/graph.mjs";

/**
 * Workflow parser that loads and validates Turtle workflow definitions
 */
export class WorkflowParser {
  /**
   * @param {object} options
   * @param {object} [options.logger] - Logger instance
   */
  constructor(options = {}) {
    this.logger = options.logger || console;
  }

  /**
   * Parse a workflow definition from Turtle data
   * @param {object} turtle - useTurtle instance
   * @param {string} workflowId - The ID of the workflow to parse
   * @returns {Promise<object|null>} Parsed workflow or null if not found
   */
  async parseWorkflow(turtle, workflowId) {
    this.logger.info(`🔍 Looking for workflow: ${workflowId}`);

    try {
      // Find the workflow hook
      const hooks = turtle.getHooks();
      const workflowHook = hooks.find((hook) => hook.id === workflowId);

      if (!workflowHook) {
        this.logger.warn(`⚠️ Workflow not found: ${workflowId}`);
        return null;
      }

      this.logger.info(`🔍 Found workflow hook: ${workflowHook.title}`);

      // Parse workflow steps
      const steps = await this._parseWorkflowSteps(turtle, workflowHook);

      // Validate workflow structure
      await this._validateWorkflow(steps);

      const workflow = {
        id: workflowId,
        title: workflowHook.title,
        predicate: workflowHook.pred,
        steps: steps,
        metadata: {
          parsedAt: new Date().toISOString(),
          stepCount: steps.length,
        },
      };

      this.logger.info(
        `✅ Parsed workflow: ${workflowId} with ${steps.length} steps`
      );
      return workflow;
    } catch (error) {
      this.logger.error(`❌ Failed to parse workflow: ${workflowId}`, error);
      throw new Error(`Workflow parsing failed: ${error.message}`);
    }
  }

  /**
   * Parse workflow steps from the hook's pipelines
   * @private
   */
  async _parseWorkflowSteps(turtle, workflowHook) {
    const steps = [];
    const stepIds = new Set();

    for (const pipelineNode of workflowHook.pipelines) {
      const pipelineSteps = turtle.getPipelineSteps(pipelineNode);

      for (const stepNode of pipelineSteps) {
        const step = await this._parseStep(turtle, stepNode);
        if (step && !stepIds.has(step.id)) {
          stepIds.add(step.id);
          steps.push(step);
        }
      }
    }

    return steps;
  }

  /**
   * Parse a single workflow step
   * @private
   */
  async _parseStep(turtle, stepNode) {
    try {
      const stepId = this._extractStepId(stepNode);
      const stepType = this._extractStepType(turtle, stepNode);
      const config = await this._extractStepConfig(turtle, stepNode);
      const dependencies = this._extractDependencies(turtle, stepNode);

      return {
        id: stepId,
        type: stepType,
        config: config,
        dependsOn: dependencies,
        node: stepNode,
      };
    } catch (error) {
      this.logger.warn(`⚠️ Failed to parse step: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract step ID from step node
   * @private
   */
  _extractStepId(stepNode) {
    // Extract ID from the node URI or use a generated one
    if (stepNode && stepNode.value) {
      const uri = stepNode.value;
      const parts = uri.split("/");
      return parts[parts.length - 1] || uri;
    }
    return `step_${Date.now()}`;
  }

  /**
   * Extract step type from step node
   * @private
   */
  _extractStepType(turtle, stepNode) {
    const GV = "https://gitvan.dev/ontology#";

    // Check for specific step types
    if (turtle.isA(stepNode, GV + "SparqlStep")) {
      return "sparql";
    } else if (turtle.isA(stepNode, GV + "TemplateStep")) {
      return "template";
    } else if (turtle.isA(stepNode, GV + "FileStep")) {
      return "file";
    } else if (turtle.isA(stepNode, GV + "HttpStep")) {
      return "http";
    } else if (turtle.isA(stepNode, GV + "GitStep")) {
      return "git";
    }

    return "unknown";
  }

  /**
   * Extract step configuration
   * @private
   */
  async _extractStepConfig(turtle, stepNode) {
    const GV = "https://gitvan.dev/ontology#";
    const config = {};

    // Extract SPARQL query
    const queryText = await turtle.getQueryText(stepNode);
    if (queryText) {
      config.query = queryText;
    }

    // Extract template
    const templateText = await turtle.getTemplateText(stepNode);
    if (templateText) {
      config.template = templateText;
    }

    // Extract file path
    const filePath = turtle.getOne(stepNode, GV + "filePath");
    if (filePath) {
      config.filePath = filePath.value;
    }

    // Extract HTTP configuration
    const httpUrl = turtle.getOne(stepNode, GV + "httpUrl");
    if (httpUrl) {
      config.httpUrl = httpUrl.value;
    }

    const httpMethod = turtle.getOne(stepNode, GV + "httpMethod");
    if (httpMethod) {
      config.httpMethod = httpMethod.value;
    }

    // Extract Git configuration
    const gitCommand = turtle.getOne(stepNode, GV + "gitCommand");
    if (gitCommand) {
      config.gitCommand = gitCommand.value;
    }

    // Extract input/output mappings
    const inputMapping = turtle.getOne(stepNode, GV + "inputMapping");
    if (inputMapping) {
      config.inputMapping = inputMapping.value;
    }

    const outputMapping = turtle.getOne(stepNode, GV + "outputMapping");
    if (outputMapping) {
      config.outputMapping = outputMapping.value;
    }

    // Extract timeout
    const timeout = turtle.getOne(stepNode, GV + "timeout");
    if (timeout) {
      config.timeout = parseInt(timeout.value);
    }

    return config;
  }

  /**
   * Extract step dependencies
   * @private
   */
  _extractDependencies(turtle, stepNode) {
    const GV = "https://gitvan.dev/ontology#";
    const dependencies = [];

    const dependsOnList = turtle.getOne(stepNode, GV + "dependsOn");
    if (dependsOnList) {
      const dependsOnItems = turtle.readList(dependsOnList);
      for (const item of dependsOnItems) {
        if (item && item.value) {
          dependencies.push(item.value);
        }
      }
    }

    return dependencies;
  }

  /**
   * Validate workflow structure
   * @private
   */
  async _validateWorkflow(steps) {
    this.logger.info(`🔍 Validating workflow structure`);

    // Check for duplicate step IDs
    const stepIds = steps.map((step) => step.id);
    const uniqueIds = new Set(stepIds);
    if (stepIds.length !== uniqueIds.size) {
      throw new Error("Duplicate step IDs found in workflow");
    }

    // Check for circular dependencies
    this._validateDependencies(steps);

    // Check for required configurations
    for (const step of steps) {
      this._validateStepConfig(step);
    }

    this.logger.info(`✅ Workflow validation passed`);
  }

  /**
   * Validate step dependencies for cycles
   * @private
   */
  _validateDependencies(steps) {
    const stepMap = new Map(steps.map((step) => [step.id, step]));

    for (const step of steps) {
      const visited = new Set();
      const visiting = new Set();

      if (this._hasCycle(step.id, stepMap, visited, visiting)) {
        throw new Error(
          `Circular dependency detected involving step: ${step.id}`
        );
      }
    }
  }

  /**
   * Check for cycles in dependency graph
   * @private
   */
  _hasCycle(stepId, stepMap, visited, visiting) {
    if (visiting.has(stepId)) {
      return true; // Cycle detected
    }

    if (visited.has(stepId)) {
      return false; // Already processed
    }

    visiting.add(stepId);

    const step = stepMap.get(stepId);
    if (step && step.dependsOn) {
      for (const depId of step.dependsOn) {
        if (this._hasCycle(depId, stepMap, visited, visiting)) {
          return true;
        }
      }
    }

    visiting.delete(stepId);
    visited.add(stepId);

    return false;
  }

  /**
   * Validate step configuration
   * @private
   */
  _validateStepConfig(step) {
    switch (step.type) {
      case "sparql":
        if (!step.config.query) {
          throw new Error(`SPARQL step ${step.id} missing query configuration`);
        }
        break;

      case "template":
        if (!step.config.template) {
          throw new Error(
            `Template step ${step.id} missing template configuration`
          );
        }
        break;

      case "file":
        if (!step.config.filePath) {
          throw new Error(
            `File step ${step.id} missing filePath configuration`
          );
        }
        break;

      case "http":
        if (!step.config.httpUrl) {
          throw new Error(`HTTP step ${step.id} missing httpUrl configuration`);
        }
        break;

      case "git":
        if (!step.config.gitCommand) {
          throw new Error(
            `Git step ${step.id} missing gitCommand configuration`
          );
        }
        break;
    }
  }

  /**
   * Get all available workflow IDs
   * @param {object} turtle - useTurtle instance
   * @returns {Promise<Array<string>>} List of workflow IDs
   */
  async getWorkflowIds(turtle) {
    const hooks = turtle.getHooks();
    return hooks.map((hook) => hook.id);
  }

  /**
   * Get workflow metadata without full parsing
   * @param {object} turtle - useTurtle instance
   * @param {string} workflowId - Workflow ID
   * @returns {Promise<object|null>} Workflow metadata or null
   */
  async getWorkflowMetadata(turtle, workflowId) {
    const hooks = turtle.getHooks();
    const workflowHook = hooks.find((hook) => hook.id === workflowId);

    if (!workflowHook) {
      return null;
    }

    return {
      id: workflowId,
      title: workflowHook.title,
      predicate: workflowHook.pred,
      pipelineCount: workflowHook.pipelines.length,
    };
  }
}
