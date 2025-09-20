// Workflow DAG Execution Implementation
// Implements: Steps S={s_k}, edges D⊆S×S (DAG), Topological order ≺
// Step semantics: c_i^{out} = α_i(c^{in}, K_t)

import { useLog } from "../composables/log.mjs";

const logger = useLog("WorkflowDAGExecution");

/**
 * Workflow DAG Execution
 * Steps S={s_k}, edges D⊆S×S (DAG)
 * Topological order ≺: execute s_i iff all s_j≺s_i done
 * Step semantics: c_i^{out} = α_i(c^{in}, K_t)
 */
export class WorkflowDAGExecution {
  constructor(options = {}) {
    this.logger = options.logger || logger;
    this.steps = new Map(); // S = {s_k}
    this.edges = new Map(); // D ⊆ S × S
    this.executionOrder = []; // Topological order ≺
    this.executionHistory = [];
    this.currentState = {};
    this.isExecuting = false;
  }

  /**
   * Add step to workflow: s_k ∈ S
   */
  addStep(stepId, stepDefinition) {
    this.steps.set(stepId, {
      id: stepId,
      definition: stepDefinition,
      status: "pending",
      input: null,
      output: null,
      startTime: null,
      endTime: null,
      dependencies: new Set(),
      dependents: new Set(),
    });

    this.logger.info(`📋 Added step: ${stepId}`);
  }

  /**
   * Add edge to workflow: (s_i, s_j) ∈ D
   */
  addEdge(fromStepId, toStepId) {
    if (!this.steps.has(fromStepId) || !this.steps.has(toStepId)) {
      throw new Error(`Cannot add edge: step(s) not found`);
    }

    const fromStep = this.steps.get(fromStepId);
    const toStep = this.steps.get(toStepId);

    // Add dependency relationship
    toStep.dependencies.add(fromStepId);
    fromStep.dependents.add(toStepId);

    // Update edges map
    if (!this.edges.has(fromStepId)) {
      this.edges.set(fromStepId, new Set());
    }
    this.edges.get(fromStepId).add(toStepId);

    this.logger.info(`🔗 Added edge: ${fromStepId} → ${toStepId}`);
  }

  /**
   * Calculate topological order: ≺
   */
  calculateTopologicalOrder() {
    const visited = new Set();
    const temp = new Set();
    const order = [];

    const visit = (stepId) => {
      if (temp.has(stepId)) {
        throw new Error(`Cycle detected in workflow DAG`);
      }
      if (visited.has(stepId)) {
        return;
      }

      temp.add(stepId);

      const step = this.steps.get(stepId);
      for (const dependent of step.dependents) {
        visit(dependent);
      }

      temp.delete(stepId);
      visited.add(stepId);
      order.push(stepId);
    };

    // Visit all steps
    for (const stepId of this.steps.keys()) {
      if (!visited.has(stepId)) {
        visit(stepId);
      }
    }

    this.executionOrder = order.reverse(); // Reverse to get correct order
    this.logger.info(
      `📊 Calculated topological order: ${this.executionOrder.join(" → ")}`
    );

    return this.executionOrder;
  }

  /**
   * Execute workflow: c_i^{out} = α_i(c^{in}, K_t)
   */
  async execute(knowledgeState, initialState = {}) {
    if (this.isExecuting) {
      throw new Error(`Workflow already executing`);
    }

    this.isExecuting = true;
    this.currentState = { ...initialState };
    this.executionHistory = [];

    try {
      this.logger.info(`🚀 Starting workflow execution`);

      // Calculate execution order
      this.calculateTopologicalOrder();

      // Execute steps in topological order
      for (const stepId of this.executionOrder) {
        await this.executeStep(stepId, knowledgeState);
      }

      this.logger.info(`✅ Workflow execution completed`);

      return {
        success: true,
        finalState: this.currentState,
        executionHistory: this.executionHistory,
        totalSteps: this.steps.size,
        executedSteps: this.executionHistory.length,
      };
    } catch (error) {
      this.logger.error(`❌ Workflow execution failed: ${error.message}`);

      return {
        success: false,
        error: error.message,
        executionHistory: this.executionHistory,
        failedStep:
          this.executionHistory[this.executionHistory.length - 1]?.stepId,
      };
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Execute individual step: c_i^{out} = α_i(c^{in}, K_t)
   */
  async executeStep(stepId, knowledgeState) {
    const step = this.steps.get(stepId);
    if (!step) {
      throw new Error(`Step not found: ${stepId}`);
    }

    // Check if all dependencies are completed
    for (const depId of step.dependencies) {
      const depStep = this.steps.get(depId);
      if (depStep.status !== "completed") {
        throw new Error(
          `Dependency not completed: ${depId} for step ${stepId}`
        );
      }
    }

    step.status = "running";
    step.startTime = Date.now();

    try {
      this.logger.info(`🔄 Executing step: ${stepId}`);

      // Prepare input context
      const inputContext = this.prepareInputContext(stepId);

      // Execute step: α_i(c^{in}, K_t)
      const output = await this.executeStepFunction(
        step.definition,
        inputContext,
        knowledgeState
      );

      // Update step state
      step.output = output;
      step.endTime = Date.now();
      step.status = "completed";

      // Update current state
      this.currentState = { ...this.currentState, ...output };

      // Record execution
      this.executionHistory.push({
        stepId: stepId,
        startTime: step.startTime,
        endTime: step.endTime,
        duration: step.endTime - step.startTime,
        input: inputContext,
        output: output,
        status: "completed",
      });

      this.logger.info(
        `✅ Step completed: ${stepId} (${step.endTime - step.startTime}ms)`
      );

      return output;
    } catch (error) {
      step.status = "failed";
      step.endTime = Date.now();

      this.executionHistory.push({
        stepId: stepId,
        startTime: step.startTime,
        endTime: step.endTime,
        duration: step.endTime - step.startTime,
        input: this.prepareInputContext(stepId),
        output: null,
        status: "failed",
        error: error.message,
      });

      this.logger.error(`❌ Step failed: ${stepId} - ${error.message}`);
      throw error;
    }
  }

  /**
   * Prepare input context for step
   */
  prepareInputContext(stepId) {
    const step = this.steps.get(stepId);
    const context = { ...this.currentState };

    // Add outputs from dependencies
    for (const depId of step.dependencies) {
      const depStep = this.steps.get(depId);
      if (depStep.output) {
        context[`${depId}_output`] = depStep.output;
      }
    }

    return context;
  }

  /**
   * Execute step function: α_i(c^{in}, K_t)
   */
  async executeStepFunction(stepDefinition, inputContext, knowledgeState) {
    switch (stepDefinition.type) {
      case "sparql":
        return await this.executeSparqlStep(
          stepDefinition,
          inputContext,
          knowledgeState
        );

      case "template":
        return await this.executeTemplateStep(
          stepDefinition,
          inputContext,
          knowledgeState
        );

      case "file":
        return await this.executeFileStep(
          stepDefinition,
          inputContext,
          knowledgeState
        );

      case "http":
        return await this.executeHttpStep(
          stepDefinition,
          inputContext,
          knowledgeState
        );

      case "cli":
        return await this.executeCliStep(
          stepDefinition,
          inputContext,
          knowledgeState
        );

      case "function":
        return await this.executeFunctionStep(
          stepDefinition,
          inputContext,
          knowledgeState
        );

      default:
        throw new Error(`Unknown step type: ${stepDefinition.type}`);
    }
  }

  /**
   * Execute SPARQL step
   */
  async executeSparqlStep(stepDefinition, inputContext, knowledgeState) {
    const query = stepDefinition.query;
    const results = knowledgeState.query(
      query.subject,
      query.predicate,
      query.object
    );

    return {
      type: "sparql",
      query: query,
      results: results,
      count: results.length,
    };
  }

  /**
   * Execute Template step
   */
  async executeTemplateStep(stepDefinition, inputContext, knowledgeState) {
    const template = stepDefinition.template;
    const outputPath = stepDefinition.outputPath;

    // Simple template rendering (in real implementation, use proper template engine)
    let rendered = template;
    for (const [key, value] of Object.entries(inputContext)) {
      rendered = rendered.replace(new RegExp(`{{${key}}}`, "g"), value);
    }

    // In real implementation, write to file system
    return {
      type: "template",
      template: template,
      outputPath: outputPath,
      rendered: rendered,
      length: rendered.length,
    };
  }

  /**
   * Execute File step
   */
  async executeFileStep(stepDefinition, inputContext, knowledgeState) {
    const operation = stepDefinition.operation;
    const path = stepDefinition.path;
    const content = stepDefinition.content;

    // Simulate file operation
    return {
      type: "file",
      operation: operation,
      path: path,
      content: content,
      success: true,
    };
  }

  /**
   * Execute HTTP step
   */
  async executeHttpStep(stepDefinition, inputContext, knowledgeState) {
    const url = stepDefinition.url;
    const method = stepDefinition.method || "GET";
    const headers = stepDefinition.headers || {};
    const body = stepDefinition.body;

    // Simulate HTTP request
    return {
      type: "http",
      url: url,
      method: method,
      headers: headers,
      body: body,
      response: { status: 200, data: "simulated response" },
    };
  }

  /**
   * Execute CLI step
   */
  async executeCliStep(stepDefinition, inputContext, knowledgeState) {
    const command = stepDefinition.command;
    const args = stepDefinition.args || [];

    // Simulate CLI execution
    return {
      type: "cli",
      command: command,
      args: args,
      output: "simulated CLI output",
      exitCode: 0,
    };
  }

  /**
   * Execute Function step
   */
  async executeFunctionStep(stepDefinition, inputContext, knowledgeState) {
    const func = stepDefinition.function;

    if (typeof func === "function") {
      return await func(inputContext, knowledgeState);
    } else {
      throw new Error(`Invalid function in step definition`);
    }
  }

  /**
   * Get workflow statistics
   */
  getStats() {
    const stepStats = Array.from(this.steps.values()).map((step) => ({
      id: step.id,
      status: step.status,
      duration: step.endTime ? step.endTime - step.startTime : null,
      dependencies: step.dependencies.size,
      dependents: step.dependents.size,
    }));

    return {
      totalSteps: this.steps.size,
      totalEdges: Array.from(this.edges.values()).reduce(
        (sum, edges) => sum + edges.size,
        0
      ),
      executionOrder: this.executionOrder,
      stepStats: stepStats,
      isExecuting: this.isExecuting,
      executionHistory: this.executionHistory.length,
    };
  }

  /**
   * Reset workflow state
   */
  reset() {
    for (const step of this.steps.values()) {
      step.status = "pending";
      step.input = null;
      step.output = null;
      step.startTime = null;
      step.endTime = null;
    }

    this.executionHistory = [];
    this.currentState = {};
    this.isExecuting = false;

    this.logger.info(`🔄 Workflow state reset`);
  }

  /**
   * Validate workflow DAG
   */
  validate() {
    const errors = [];

    // Check for cycles
    try {
      this.calculateTopologicalOrder();
    } catch (error) {
      errors.push(`Cycle detected: ${error.message}`);
    }

    // Check for orphaned steps
    for (const stepId of this.steps.keys()) {
      const step = this.steps.get(stepId);
      if (step.dependencies.size === 0 && step.dependents.size === 0) {
        errors.push(`Orphaned step: ${stepId}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  }
}

