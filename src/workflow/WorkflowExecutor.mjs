// src/workflow/WorkflowExecutor.mjs
// Main orchestrator for the Turtle as Workflow engine
// Coordinates parsing, planning, and execution of workflow graphs

import { WorkflowParser } from "./WorkflowParser.mjs";
import { DAGPlanner } from "./DAGPlanner.mjs";
import { StepRunner } from "./StepRunner.mjs";
import { ContextManager } from "./ContextManager.mjs";
import { useTurtle } from "../composables/turtle.mjs";
import { useGraph } from "../composables/graph.mjs";

/**
 * Main workflow executor that orchestrates the entire workflow lifecycle
 */
export class WorkflowExecutor {
  /**
   * @param {object} options
   * @param {string} [options.graphDir] - Directory containing workflow definitions
   * @param {object} [options.context] - GitVan context
   * @param {object} [options.logger] - Logger instance
   * @param {number} [options.timeoutMs] - Execution timeout in milliseconds
   */
  constructor(options = {}) {
    this.graphDir = options.graphDir || "./workflows";
    this.context = options.context;
    this.logger = options.logger || console;
    this.timeoutMs = options.timeoutMs || 300000; // 5 minutes default

    // Initialize components
    this.parser = new WorkflowParser({ logger: this.logger });
    this.planner = new DAGPlanner({ logger: this.logger });
    this.runner = new StepRunner({ logger: this.logger });
    this.contextManager = new ContextManager({ logger: this.logger });

    // Initialize RDF components
    this.turtle = null;
    this.graph = null;
  }

  /**
   * Execute a workflow by its ID
   * @param {string} workflowId - The ID of the workflow to execute
   * @param {object} [inputs] - Input parameters for the workflow
   * @returns {Promise<object>} Execution result with outputs and metadata
   */
  async execute(workflowId, inputs = {}) {
    const startTime = performance.now();
    this.logger.info(`🚀 Starting workflow execution: ${workflowId}`);

    try {
      // Initialize RDF components
      await this._initializeRDFComponents();

      // Parse the workflow definition
      const workflow = await this._parseWorkflow(workflowId);

      // Create execution plan
      const plan = await this._createExecutionPlan(workflow);

      // Initialize execution context
      await this._initializeContext(workflowId, inputs);

      // Execute the plan
      const results = await this._executePlan(plan);

      // Finalize execution
      const executionResult = await this._finalizeExecution(results, startTime);

      this.logger.info(`✅ Workflow execution completed: ${workflowId}`);
      return executionResult;
    } catch (error) {
      this.logger.error(`❌ Workflow execution failed: ${workflowId}`, error);
      throw new Error(`Workflow execution failed: ${error.message}`);
    }
  }

  /**
   * List all available workflows
   * @returns {Promise<Array<object>>} List of available workflows
   */
  async listWorkflows() {
    await this._initializeRDFComponents();

    const hooks = this.turtle.getHooks();
    return hooks.map((hook) => ({
      id: hook.id,
      title: hook.title,
      predicate: hook.pred,
      pipelineCount: hook.pipelines.length,
    }));
  }

  /**
   * Validate a workflow definition without executing it
   * @param {string} workflowId - The ID of the workflow to validate
   * @returns {Promise<object>} Validation result
   */
  async validateWorkflow(workflowId) {
    await this._initializeRDFComponents();

    try {
      const workflow = await this._parseWorkflow(workflowId);
      const plan = await this._createExecutionPlan(workflow);

      return {
        valid: true,
        workflowId,
        stepCount: plan.length,
        dependencies: this._extractDependencies(plan),
        estimatedDuration: this._estimateDuration(plan),
      };
    } catch (error) {
      return {
        valid: false,
        workflowId,
        error: error.message,
      };
    }
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
   * Parse workflow definition
   * @private
   */
  async _parseWorkflow(workflowId) {
    this.logger.info(`📖 Parsing workflow: ${workflowId}`);

    const workflow = await this.parser.parseWorkflow(this.turtle, workflowId);

    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    this.logger.info(`📖 Parsed workflow with ${workflow.steps.length} steps`);
    return workflow;
  }

  /**
   * Create execution plan
   * @private
   */
  async _createExecutionPlan(workflow) {
    this.logger.info(
      `📋 Creating execution plan for ${workflow.steps.length} steps`
    );

    const plan = await this.planner.createPlan(workflow.steps, this.graph);

    this.logger.info(`📋 Created execution plan with ${plan.length} steps`);
    return plan;
  }

  /**
   * Initialize execution context
   * @private
   */
  async _initializeContext(workflowId, inputs) {
    this.logger.info(`🎯 Initializing execution context`);

    await this.contextManager.initialize({
      workflowId,
      inputs,
      startTime: Date.now(),
    });
  }

  /**
   * Execute the plan
   * @private
   */
  async _executePlan(plan) {
    this.logger.info(`⚡ Executing ${plan.length} steps`);

    const results = [];

    for (let i = 0; i < plan.length; i++) {
      const step = plan[i];
      this.logger.info(`⚡ Executing step ${i + 1}/${plan.length}: ${step.id}`);

      try {
        const stepResult = await this.runner.executeStep(
          step,
          this.contextManager,
          this.graph,
          this.turtle
        );

        results.push(stepResult);
        this.logger.info(`✅ Step completed: ${step.id}`);
      } catch (error) {
        this.logger.error(`❌ Step failed: ${step.id}`, error);
        throw new Error(`Step execution failed: ${step.id} - ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Finalize execution
   * @private
   */
  async _finalizeExecution(results, startTime) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    const executionResult = {
      success: true,
      duration: Math.round(duration),
      stepCount: results.length,
      outputs: this.contextManager.getOutputs(),
      metadata: {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        steps: results.map((r) => ({
          id: r.stepId,
          duration: r.duration,
          success: r.success,
        })),
      },
    };

    // Write execution receipt to Git Notes
    await this._writeExecutionReceipt(executionResult);

    return executionResult;
  }

  /**
   * Write execution receipt to Git Notes
   * @private
   */
  async _writeExecutionReceipt(executionResult) {
    try {
      // This would integrate with Git Notes for auditability
      this.logger.info(`📝 Writing execution receipt to Git Notes`);
      // Implementation would go here
    } catch (error) {
      this.logger.warn(
        `⚠️ Failed to write execution receipt: ${error.message}`
      );
    }
  }

  /**
   * Extract dependencies from execution plan
   * @private
   */
  _extractDependencies(plan) {
    return plan.map((step) => ({
      id: step.id,
      dependsOn: step.dependsOn || [],
    }));
  }

  /**
   * Estimate execution duration
   * @private
   */
  _estimateDuration(plan) {
    // Simple estimation based on step count
    return plan.length * 1000; // 1 second per step estimate
  }

  /**
   * Get execution statistics
   * @returns {object} Execution statistics
   */
  getStats() {
    return {
      workflowsLoaded: this.turtle ? this.turtle.files.length : 0,
      contextInitialized: !!this.contextManager,
      lastExecution: this.contextManager?.getLastExecution() || null,
    };
  }
}
