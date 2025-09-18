// src/hooks/HookParser.mjs
// Parser and validator for hook definitions in Turtle format
// Loads hook definitions and validates their structure

import { useGraph } from "../composables/graph.mjs";

/**
 * Hook parser that loads and validates Turtle hook definitions
 */
export class HookParser {
  /**
   * @param {object} options
   * @param {object} [options.logger] - Logger instance
   */
  constructor(options = {}) {
    this.logger = options.logger || console;
  }

  /**
   * Parse a hook definition from Turtle data
   * @param {object} turtle - useTurtle instance
   * @param {string} hookId - The ID of the hook to parse
   * @returns {Promise<object|null>} Parsed hook or null if not found
   */
  async parseHook(turtle, hookId) {
    this.logger.info(`🔍 Looking for hook: ${hookId}`);

    try {
      // Find the hook definition
      const hooks = turtle.getHooks();
      const hookDef = hooks.find((hook) => hook.id === hookId);

      if (!hookDef) {
        this.logger.warn(`⚠️ Hook not found: ${hookId}`);
        return null;
      }

      this.logger.info(`🔍 Found hook: ${hookDef.title}`);

      // Parse hook predicate
      const predicate = await this._parsePredicate(turtle, hookDef);

      // Parse associated workflows
      const workflows = await this._parseWorkflows(turtle, hookDef);

      // Validate hook structure
      await this._validateHook(predicate, workflows);

      const hook = {
        id: hookId,
        title: hookDef.title,
        predicate: hookDef.pred,
        predicateDefinition: predicate,
        workflows: workflows,
        metadata: {
          parsedAt: new Date().toISOString(),
          workflowCount: workflows.length,
        },
      };

      this.logger.info(
        `✅ Parsed hook: ${hookId} with ${workflows.length} workflows`
      );
      return hook;
    } catch (error) {
      this.logger.error(`❌ Failed to parse hook: ${hookId}`, error);
      throw new Error(`Hook parsing failed: ${error.message}`);
    }
  }

  /**
   * Parse hook predicate definition
   * @private
   */
  async _parsePredicate(turtle, hookDef) {
    const GH = "https://gitvan.dev/graph-hook#";
    const GV = "https://gitvan.dev/ontology#";

    const predicate = {
      type: "unknown",
      definition: null,
      parameters: {},
    };

    // Check predicate type
    if (turtle.isA(hookDef.pred, GH + "ResultDelta")) {
      predicate.type = "resultDelta";
      predicate.definition = await this._parseResultDeltaPredicate(
        turtle,
        hookDef
      );
    } else if (turtle.isA(hookDef.pred, GH + "ASKPredicate")) {
      predicate.type = "ask";
      predicate.definition = await this._parseASKPredicate(turtle, hookDef);
    } else if (turtle.isA(hookDef.pred, GH + "SELECTThreshold")) {
      predicate.type = "selectThreshold";
      predicate.definition = await this._parseSELECTThresholdPredicate(
        turtle,
        hookDef
      );
    } else if (turtle.isA(hookDef.pred, GH + "SHACLAllConform")) {
      predicate.type = "shaclAllConform";
      predicate.definition = await this._parseSHACLPredicate(turtle, hookDef);
    }

    return predicate;
  }

  /**
   * Parse ResultDelta predicate
   * @private
   */
  async _parseResultDeltaPredicate(turtle, hookDef) {
    const GH = "https://gitvan.dev/graph-hook#";

    const queryText = turtle.getOne(hookDef.pred, GH + "queryText");
    const previousCommit = turtle.getOne(hookDef.pred, GH + "previousCommit");

    return {
      query: queryText ? queryText.value : null,
      previousCommit: previousCommit ? previousCommit.value : null,
      description: "Detects changes in query result sets between commits",
    };
  }

  /**
   * Parse ASK predicate
   * @private
   */
  async _parseASKPredicate(turtle, hookDef) {
    const GH = "https://gitvan.dev/graph-hook#";

    const queryText = turtle.getOne(hookDef.pred, GH + "queryText");

    return {
      query: queryText ? queryText.value : null,
      description: "Evaluates a boolean condition using SPARQL ASK",
    };
  }

  /**
   * Parse SELECTThreshold predicate
   * @private
   */
  async _parseSELECTThresholdPredicate(turtle, hookDef) {
    const GH = "https://gitvan.dev/graph-hook#";

    const queryText = turtle.getOne(hookDef.pred, GH + "queryText");
    const threshold = turtle.getOne(hookDef.pred, GH + "threshold");
    const operator = turtle.getOne(hookDef.pred, GH + "operator");

    return {
      query: queryText ? queryText.value : null,
      threshold: threshold ? parseFloat(threshold.value) : 0,
      operator: operator ? operator.value : ">",
      description: "Monitors numerical values against thresholds",
    };
  }

  /**
   * Parse SHACL predicate
   * @private
   */
  async _parseSHACLPredicate(turtle, hookDef) {
    const GH = "https://gitvan.dev/graph-hook#";

    const shapesText = turtle.getOne(hookDef.pred, GH + "shapesText");

    return {
      shapes: shapesText ? shapesText.value : null,
      description: "Validates graph conformance against SHACL shapes",
    };
  }

  /**
   * Parse associated workflows
   * @private
   */
  async _parseWorkflows(turtle, hookDef) {
    const workflows = [];

    for (const pipelineNode of hookDef.pipelines) {
      const pipelineSteps = turtle.getPipelineSteps(pipelineNode);
      const workflow = await this._parseWorkflow(turtle, pipelineSteps);
      if (workflow) {
        workflows.push(workflow);
      }
    }

    return workflows;
  }

  /**
   * Parse a single workflow
   * @private
   */
  async _parseWorkflow(turtle, pipelineSteps) {
    const steps = [];

    for (const stepNode of pipelineSteps) {
      const step = await this._parseWorkflowStep(turtle, stepNode);
      if (step) {
        steps.push(step);
      }
    }

    return {
      steps: steps,
      stepCount: steps.length,
    };
  }

  /**
   * Parse a workflow step
   * @private
   */
  async _parseWorkflowStep(turtle, stepNode) {
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
      this.logger.warn(`⚠️ Failed to parse workflow step: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract step ID from step node
   * @private
   */
  _extractStepId(stepNode) {
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
   * Validate hook structure
   * @private
   */
  async _validateHook(predicate, workflows) {
    this.logger.info("🔍 Validating hook structure");

    // Validate predicate
    if (!predicate.definition) {
      throw new Error("Hook missing predicate definition");
    }

    // Validate workflows
    for (const workflow of workflows) {
      await this._validateWorkflow(workflow);
    }

    this.logger.info("✅ Hook validation passed");
  }

  /**
   * Validate workflow structure
   * @private
   */
  async _validateWorkflow(workflow) {
    // Check for duplicate step IDs
    const stepIds = workflow.steps.map((step) => step.id);
    const uniqueIds = new Set(stepIds);
    if (stepIds.length !== uniqueIds.size) {
      throw new Error("Duplicate step IDs found in workflow");
    }

    // Check for circular dependencies
    this._validateDependencies(workflow.steps);

    // Check for required configurations
    for (const step of workflow.steps) {
      this._validateStepConfig(step);
    }
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
   * Get all available hook IDs
   * @param {object} turtle - useTurtle instance
   * @returns {Promise<Array<string>>} List of hook IDs
   */
  async getHookIds(turtle) {
    const hooks = turtle.getHooks();
    return hooks.map((hook) => hook.id);
  }

  /**
   * Get hook metadata without full parsing
   * @param {object} turtle - useTurtle instance
   * @param {string} hookId - Hook ID
   * @returns {Promise<object|null>} Hook metadata or null
   */
  async getHookMetadata(turtle, hookId) {
    const hooks = turtle.getHooks();
    const hookDef = hooks.find((hook) => hook.id === hookId);

    if (!hookDef) {
      return null;
    }

    return {
      id: hookId,
      title: hookDef.title,
      predicate: hookDef.pred,
      workflowCount: hookDef.pipelines.length,
    };
  }
}
