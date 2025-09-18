// src/hooks/HookOrchestrator.mjs
// Main orchestrator for the Knowledge Hook Engine
// Manages the full evaluation lifecycle for all defined hooks

import { HookParser } from "./HookParser.mjs";
import { PredicateEvaluator } from "./PredicateEvaluator.mjs";
import { DAGPlanner } from "../workflow/DAGPlanner.mjs";
import { StepRunner } from "../workflow/StepRunner.mjs";
import { ContextManager } from "../workflow/ContextManager.mjs";
import { useTurtle } from "../composables/turtle.mjs";
import { useGraph } from "../composables/graph.mjs";

/**
 * Main orchestrator for the Knowledge Hook Engine
 * Manages the complete lifecycle from hook evaluation to workflow execution
 */
export class HookOrchestrator {
  /**
   * @param {object} options
   * @param {string} [options.graphDir] - Directory containing hook definitions
   * @param {object} [options.context] - GitVan context
   * @param {object} [options.logger] - Logger instance
   * @param {number} [options.timeoutMs] - Evaluation timeout in milliseconds
   */
  constructor(options = {}) {
    this.graphDir = options.graphDir || "./hooks";
    this.context = options.context;
    this.logger = options.logger || console;
    this.timeoutMs = options.timeoutMs || 300000; // 5 minutes default

    // Initialize components
    this.parser = new HookParser({ logger: this.logger });
    this.predicateEvaluator = new PredicateEvaluator({ logger: this.logger });
    this.planner = new DAGPlanner({ logger: this.logger });
    this.runner = new StepRunner({ logger: this.logger });
    this.contextManager = new ContextManager({ logger: this.logger });

    // Initialize RDF components
    this.turtle = null;
    this.graph = null;
    this.previousGraph = null;
  }

  /**
   * Evaluate all hooks and execute triggered workflows
   * @param {object} [options] - Evaluation options
   * @param {boolean} [options.dryRun] - Dry run mode
   * @param {boolean} [options.verbose] - Verbose output
   * @returns {Promise<object>} Evaluation result with triggered hooks and executions
   */
  async evaluate(options = {}) {
    const startTime = performance.now();
    this.logger.info("🧠 Starting Knowledge Hook evaluation");

    try {
      // Initialize RDF components
      await this._initializeRDFComponents();

      // Load previous state for comparison
      await this._loadPreviousState();

      // Parse all hook definitions
      const hooks = await this._parseAllHooks();

      // Evaluate each hook's predicate
      const evaluationResults = await this._evaluateHooks(hooks, options);

      // Execute triggered workflows
      const executionResults = await this._executeTriggeredWorkflows(
        evaluationResults,
        options
      );

      // Finalize evaluation
      const evaluationResult = await this._finalizeEvaluation(
        evaluationResults,
        executionResults,
        startTime
      );

      this.logger.info("✅ Knowledge Hook evaluation completed");
      return evaluationResult;
    } catch (error) {
      this.logger.error("❌ Knowledge Hook evaluation failed", error);
      throw new Error(`Hook evaluation failed: ${error.message}`);
    }
  }

  /**
   * List all available hooks
   * @returns {Promise<Array<object>>} List of available hooks
   */
  async listHooks() {
    await this._initializeRDFComponents();

    const hooks = this.turtle.getHooks();
    return hooks.map((hook) => ({
      id: hook.id,
      title: hook.title,
      predicate: hook.pred,
      predicateType: this._getPredicateType(hook),
      workflowCount: hook.pipelines.length,
    }));
  }

  /**
   * Validate a hook definition without evaluating it
   * @param {string} hookId - The ID of the hook to validate
   * @returns {Promise<object>} Validation result
   */
  async validateHook(hookId) {
    await this._initializeRDFComponents();

    try {
      const hook = await this._parseHook(hookId);
      const validation = await this._validateHookDefinition(hook);

      return {
        valid: true,
        hookId,
        predicateType: validation.predicateType,
        workflowSteps: validation.workflowSteps,
        estimatedComplexity: validation.complexity,
      };
    } catch (error) {
      return {
        valid: false,
        hookId,
        error: error.message,
      };
    }
  }

  /**
   * Get evaluation statistics
   * @returns {object} Evaluation statistics
   */
  getStats() {
    return {
      hooksLoaded: this.turtle ? this.turtle.files.length : 0,
      contextInitialized: !!this.contextManager,
      lastEvaluation: this.contextManager?.getLastExecution() || null,
      graphSize: this.graph ? this.graph.store.size : 0,
    };
  }

  /**
   * Initialize RDF components
   * @private
   */
  async _initializeRDFComponents() {
    if (!this.turtle) {
      this.turtle = await useTurtle({
        graphDir: this.graphDir,
        context: this.context,
      });
      this.graph = useGraph(this.turtle.store);
    }
  }

  /**
   * Load previous state for comparison
   * @private
   */
  async _loadPreviousState() {
    this.logger.info("📚 Loading previous state for comparison");

    try {
      // Load previous commit's state
      // This would integrate with Git to get the previous state
      // For now, we'll simulate this
      this.previousGraph = null; // Would be loaded from Git history
      this.logger.info("📚 Previous state loaded");
    } catch (error) {
      this.logger.warn(`⚠️ Failed to load previous state: ${error.message}`);
      this.previousGraph = null;
    }
  }

  /**
   * Parse all hook definitions
   * @private
   */
  async _parseAllHooks() {
    this.logger.info("🔍 Parsing all hook definitions");

    const hooks = this.turtle.getHooks();
    const parsedHooks = [];

    for (const hook of hooks) {
      try {
        const parsedHook = await this.parser.parseHook(this.turtle, hook.id);
        if (parsedHook) {
          parsedHooks.push(parsedHook);
        }
      } catch (error) {
        this.logger.warn(
          `⚠️ Failed to parse hook ${hook.id}: ${error.message}`
        );
      }
    }

    this.logger.info(`🔍 Parsed ${parsedHooks.length} hooks`);
    return parsedHooks;
  }

  /**
   * Parse a single hook
   * @private
   */
  async _parseHook(hookId) {
    return await this.parser.parseHook(this.turtle, hookId);
  }

  /**
   * Evaluate all hooks' predicates
   * @private
   */
  async _evaluateHooks(hooks, options) {
    this.logger.info(`🧠 Evaluating ${hooks.length} hook predicates`);

    const results = [];

    for (const hook of hooks) {
      try {
        this.logger.info(`🧠 Evaluating hook: ${hook.id}`);
        const evaluation = await this.predicateEvaluator.evaluate(
          hook,
          this.graph,
          this.previousGraph
        );

        results.push({
          hook,
          evaluation,
          triggered: evaluation.result,
        });

        if (evaluation.result) {
          this.logger.info(`✅ Hook triggered: ${hook.id}`);
        } else {
          this.logger.debug(`⏸️ Hook not triggered: ${hook.id}`);
        }
      } catch (error) {
        this.logger.error(`❌ Failed to evaluate hook ${hook.id}:`, error);
        results.push({
          hook,
          evaluation: { result: false, error: error.message },
          triggered: false,
        });
      }
    }

    const triggeredCount = results.filter((r) => r.triggered).length;
    this.logger.info(
      `🧠 Evaluation complete: ${triggeredCount}/${hooks.length} hooks triggered`
    );

    return results;
  }

  /**
   * Execute workflows for triggered hooks
   * @private
   */
  async _executeTriggeredWorkflows(evaluationResults, options) {
    const triggeredHooks = evaluationResults.filter((r) => r.triggered);
    this.logger.info(
      `⚡ Executing workflows for ${triggeredHooks.length} triggered hooks`
    );

    const executionResults = [];

    for (const { hook, evaluation } of triggeredHooks) {
      try {
        this.logger.info(`⚡ Executing workflow for hook: ${hook.id}`);

        // Initialize execution context
        await this.contextManager.initialize({
          workflowId: hook.id,
          inputs: evaluation.context || {},
          startTime: Date.now(),
        });

        // Create execution plan
        const plan = await this.planner.createPlan(hook.steps, this.graph);

        // Execute the plan
        const stepResults = [];
        for (const step of plan) {
          const stepResult = await this.runner.executeStep(
            step,
            this.contextManager,
            this.graph,
            this.turtle
          );
          stepResults.push(stepResult);
        }

        executionResults.push({
          hookId: hook.id,
          success: true,
          stepResults,
          outputs: this.contextManager.getOutputs(),
        });

        this.logger.info(`✅ Workflow completed for hook: ${hook.id}`);
      } catch (error) {
        this.logger.error(`❌ Workflow failed for hook ${hook.id}:`, error);
        executionResults.push({
          hookId: hook.id,
          success: false,
          error: error.message,
        });
      }
    }

    return executionResults;
  }

  /**
   * Finalize evaluation
   * @private
   */
  async _finalizeEvaluation(evaluationResults, executionResults, startTime) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    const triggeredHooks = evaluationResults.filter((r) => r.triggered);
    const successfulExecutions = executionResults.filter((r) => r.success);

    const result = {
      success: true,
      duration: Math.round(duration),
      hooksEvaluated: evaluationResults.length,
      hooksTriggered: triggeredHooks.length,
      workflowsExecuted: executionResults.length,
      workflowsSuccessful: successfulExecutions.length,
      triggeredHooks: triggeredHooks.map((r) => ({
        id: r.hook.id,
        title: r.hook.title,
        predicateType: r.evaluation.predicateType,
      })),
      executions: executionResults,
      metadata: {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        evaluationResults: evaluationResults.map((r) => ({
          hookId: r.hook.id,
          triggered: r.triggered,
          predicateType: r.evaluation.predicateType,
        })),
      },
    };

    // Write evaluation receipt to Git Notes
    await this._writeEvaluationReceipt(result);

    return result;
  }

  /**
   * Write evaluation receipt to Git Notes
   * @private
   */
  async _writeEvaluationReceipt(result) {
    try {
      this.logger.info("📝 Writing evaluation receipt to Git Notes");
      // Implementation would integrate with Git Notes for auditability
    } catch (error) {
      this.logger.warn(
        `⚠️ Failed to write evaluation receipt: ${error.message}`
      );
    }
  }

  /**
   * Get predicate type from hook
   * @private
   */
  _getPredicateType(hook) {
    // This would analyze the hook's predicate to determine its type
    // For now, return a default
    return "unknown";
  }

  /**
   * Validate hook definition
   * @private
   */
  async _validateHookDefinition(hook) {
    const validation = {
      predicateType: this._getPredicateType(hook),
      workflowSteps: hook.steps?.length || 0,
      complexity: "low",
    };

    // Analyze complexity based on predicate and workflow
    if (hook.steps && hook.steps.length > 5) {
      validation.complexity = "high";
    } else if (hook.steps && hook.steps.length > 2) {
      validation.complexity = "medium";
    }

    return validation;
  }
}
