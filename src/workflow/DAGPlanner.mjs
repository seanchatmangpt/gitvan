// src/workflow/DAGPlanner.mjs
// Execution planner that creates valid execution orders from workflow steps
// Performs topological sorting and dependency resolution

/**
 * DAG (Directed Acyclic Graph) planner for workflow execution
 * Creates valid execution orders from workflow steps with dependencies
 */
export class DAGPlanner {
  /**
   * @param {object} options
   * @param {object} [options.logger] - Logger instance
   */
  constructor(options = {}) {
    this.logger = options.logger || console;
  }

  /**
   * Create an execution plan from workflow steps
   * @param {Array<object>} steps - Array of workflow steps
   * @param {object} graph - useGraph instance for additional analysis
   * @returns {Promise<Array<object>>} Ordered execution plan
   */
  async createPlan(steps, graph) {
    this.logger.info(`📋 Planning execution for ${steps.length} steps`);

    try {
      // Build dependency graph
      const dependencyGraph = this._buildDependencyGraph(steps);

      // Perform topological sort
      const executionOrder = this._topologicalSort(dependencyGraph);

      // Validate execution order
      this._validateExecutionOrder(executionOrder, steps);

      // Enhance plan with additional metadata
      const enhancedPlan = await this._enhancePlan(
        executionOrder,
        steps,
        graph
      );

      this.logger.info(
        `📋 Created execution plan with ${enhancedPlan.length} steps`
      );
      return enhancedPlan;
    } catch (error) {
      this.logger.error(`❌ Planning failed: ${error.message}`);
      throw new Error(`Execution planning failed: ${error.message}`);
    }
  }

  /**
   * Build dependency graph from steps
   * @private
   */
  _buildDependencyGraph(steps) {
    const graph = new Map();

    // Initialize graph with all steps
    for (const step of steps) {
      graph.set(step.id, {
        step: step,
        dependencies: new Set(step.dependsOn || []),
        dependents: new Set(),
      });
    }

    // Build dependency relationships
    for (const [stepId, node] of graph) {
      for (const depId of node.dependencies) {
        if (graph.has(depId)) {
          graph.get(depId).dependents.add(stepId);
        } else {
          this.logger.warn(
            `⚠️ Step ${stepId} depends on unknown step: ${depId}`
          );
        }
      }
    }

    return graph;
  }

  /**
   * Perform topological sort using Kahn's algorithm
   * @private
   */
  _topologicalSort(dependencyGraph) {
    const result = [];
    const queue = [];
    const inDegree = new Map();

    // Calculate in-degrees
    for (const [stepId, node] of dependencyGraph) {
      inDegree.set(stepId, node.dependencies.size);
      if (node.dependencies.size === 0) {
        queue.push(stepId);
      }
    }

    // Process queue
    while (queue.length > 0) {
      const currentStepId = queue.shift();
      result.push(currentStepId);

      const currentNode = dependencyGraph.get(currentStepId);
      if (currentNode) {
        // Reduce in-degree for dependents
        for (const dependentId of currentNode.dependents) {
          const newInDegree = inDegree.get(dependentId) - 1;
          inDegree.set(dependentId, newInDegree);

          if (newInDegree === 0) {
            queue.push(dependentId);
          }
        }
      }
    }

    // Check for cycles
    if (result.length !== dependencyGraph.size) {
      const remaining = Array.from(dependencyGraph.keys()).filter(
        (id) => !result.includes(id)
      );
      throw new Error(
        `Circular dependency detected. Remaining steps: ${remaining.join(", ")}`
      );
    }

    return result;
  }

  /**
   * Validate execution order
   * @private
   */
  _validateExecutionOrder(executionOrder, steps) {
    const stepMap = new Map(steps.map((step) => [step.id, step]));

    for (let i = 0; i < executionOrder.length; i++) {
      const stepId = executionOrder[i];
      const step = stepMap.get(stepId);

      if (!step) {
        throw new Error(`Step not found in execution order: ${stepId}`);
      }

      // Check that all dependencies are satisfied
      for (const depId of step.dependsOn || []) {
        const depIndex = executionOrder.indexOf(depId);
        if (depIndex === -1) {
          throw new Error(`Dependency not found: ${depId}`);
        }
        if (depIndex >= i) {
          throw new Error(
            `Dependency order violation: ${depId} should come before ${stepId}`
          );
        }
      }
    }
  }

  /**
   * Enhance plan with additional metadata
   * @private
   */
  async _enhancePlan(executionOrder, steps, graph) {
    const stepMap = new Map(steps.map((step) => [step.id, step]));
    const enhancedPlan = [];

    for (let i = 0; i < executionOrder.length; i++) {
      const stepId = executionOrder[i];
      const step = stepMap.get(stepId);

      const enhancedStep = {
        ...step,
        executionOrder: i,
        canRunInParallel: this._canRunInParallel(
          stepId,
          executionOrder,
          stepMap
        ),
        estimatedDuration: this._estimateStepDuration(step),
        priority: this._calculatePriority(step, i, executionOrder.length),
      };

      // Add graph analysis if available
      if (graph) {
        enhancedStep.graphAnalysis = await this._analyzeStepInGraph(
          step,
          graph
        );
      }

      enhancedPlan.push(enhancedStep);
    }

    return enhancedPlan;
  }

  /**
   * Check if step can run in parallel with others
   * @private
   */
  _canRunInParallel(stepId, executionOrder, stepMap) {
    const step = stepMap.get(stepId);
    const stepIndex = executionOrder.indexOf(stepId);

    // Check if any subsequent steps depend on this one
    for (let i = stepIndex + 1; i < executionOrder.length; i++) {
      const laterStep = stepMap.get(executionOrder[i]);
      if (
        laterStep &&
        laterStep.dependsOn &&
        laterStep.dependsOn.includes(stepId)
      ) {
        return false; // This step blocks later steps
      }
    }

    return true;
  }

  /**
   * Estimate step duration based on type and configuration
   * @private
   */
  _estimateStepDuration(step) {
    const baseEstimates = {
      sparql: 1000, // 1 second
      template: 500, // 0.5 seconds
      file: 200, // 0.2 seconds
      http: 2000, // 2 seconds
      git: 1000, // 1 second
    };

    let estimate = baseEstimates[step.type] || 1000;

    // Adjust based on configuration complexity
    if (step.config.query && step.config.query.length > 1000) {
      estimate *= 2; // Complex queries take longer
    }

    if (step.config.template && step.config.template.length > 5000) {
      estimate *= 1.5; // Large templates take longer
    }

    return estimate;
  }

  /**
   * Calculate step priority
   * @private
   */
  _calculatePriority(step, index, totalSteps) {
    let priority = 1.0;

    // Earlier steps have higher priority
    priority += (totalSteps - index) * 0.1;

    // Steps with more dependents have higher priority
    const dependentCount = this._countDependents(step.id);
    priority += dependentCount * 0.2;

    // Critical step types have higher priority
    if (step.type === "sparql" || step.type === "template") {
      priority += 0.3;
    }

    return Math.min(priority, 10.0); // Cap at 10
  }

  /**
   * Count how many steps depend on this step
   * @private
   */
  _countDependents(stepId) {
    // This would need access to the full dependency graph
    // For now, return a simple estimate
    return 0;
  }

  /**
   * Analyze step in the context of the graph
   * @private
   */
  async _analyzeStepInGraph(step, graph) {
    try {
      const analysis = {
        complexity: "low",
        dataFlow: "unknown",
        resourceUsage: "minimal",
      };

      // Analyze SPARQL queries
      if (step.type === "sparql" && step.config.query) {
        analysis.complexity = this._analyzeSparqlComplexity(step.config.query);
        analysis.dataFlow = await this._analyzeDataFlow(
          step.config.query,
          graph
        );
      }

      // Analyze template complexity
      if (step.type === "template" && step.config.template) {
        analysis.complexity = this._analyzeTemplateComplexity(
          step.config.template
        );
      }

      return analysis;
    } catch (error) {
      this.logger.warn(`⚠️ Failed to analyze step: ${error.message}`);
      return {
        complexity: "unknown",
        dataFlow: "unknown",
        resourceUsage: "unknown",
      };
    }
  }

  /**
   * Analyze SPARQL query complexity
   * @private
   */
  _analyzeSparqlComplexity(query) {
    const complexity = {
      joins: (query.match(/JOIN|UNION/gi) || []).length,
      filters: (query.match(/FILTER/gi) || []).length,
      functions: (query.match(/COUNT|SUM|AVG|MAX|MIN/gi) || []).length,
      subqueries: (query.match(/SELECT.*SELECT/gi) || []).length,
    };

    const totalComplexity = Object.values(complexity).reduce(
      (sum, val) => sum + val,
      0
    );

    if (totalComplexity > 10) return "high";
    if (totalComplexity > 5) return "medium";
    return "low";
  }

  /**
   * Analyze data flow in SPARQL query
   * @private
   */
  async _analyzeDataFlow(query, graph) {
    try {
      // Simple analysis based on query structure
      if (query.includes("CONSTRUCT")) return "transform";
      if (query.includes("INSERT") || query.includes("DELETE")) return "modify";
      if (query.includes("ASK")) return "boolean";
      return "select";
    } catch (error) {
      return "unknown";
    }
  }

  /**
   * Analyze template complexity
   * @private
   */
  _analyzeTemplateComplexity(template) {
    const complexity = {
      loops: (template.match(/{%\s*for/gi) || []).length,
      conditions: (template.match(/{%\s*if/gi) || []).length,
      filters: (template.match(/\|/g) || []).length,
      variables: (template.match(/{{/g) || []).length,
    };

    const totalComplexity = Object.values(complexity).reduce(
      (sum, val) => sum + val,
      0
    );

    if (totalComplexity > 20) return "high";
    if (totalComplexity > 10) return "medium";
    return "low";
  }

  /**
   * Get execution statistics
   * @param {Array<object>} plan - Execution plan
   * @returns {object} Execution statistics
   */
  getExecutionStats(plan) {
    const stats = {
      totalSteps: plan.length,
      parallelSteps: plan.filter((step) => step.canRunInParallel).length,
      estimatedDuration: plan.reduce(
        (sum, step) => sum + step.estimatedDuration,
        0
      ),
      complexityDistribution: {
        high: plan.filter((step) => step.graphAnalysis?.complexity === "high")
          .length,
        medium: plan.filter(
          (step) => step.graphAnalysis?.complexity === "medium"
        ).length,
        low: plan.filter((step) => step.graphAnalysis?.complexity === "low")
          .length,
      },
    };

    return stats;
  }

  /**
   * Optimize execution plan for parallel execution
   * @param {Array<object>} plan - Execution plan
   * @returns {Array<Array<object>>} Optimized plan with parallel groups
   */
  optimizeForParallelExecution(plan) {
    const parallelGroups = [];
    const processed = new Set();

    for (const step of plan) {
      if (processed.has(step.id)) continue;

      const group = [step];
      processed.add(step.id);

      // Find steps that can run in parallel with this one
      for (const otherStep of plan) {
        if (processed.has(otherStep.id)) continue;

        if (this._canRunInParallelWithGroup(otherStep, group, plan)) {
          group.push(otherStep);
          processed.add(otherStep.id);
        }
      }

      parallelGroups.push(group);
    }

    return parallelGroups;
  }

  /**
   * Check if step can run in parallel with a group
   * @private
   */
  _canRunInParallelWithGroup(step, group, plan) {
    // Check if step has any dependencies in the group
    for (const groupStep of group) {
      if (step.dependsOn && step.dependsOn.includes(groupStep.id)) {
        return false;
      }
      if (groupStep.dependsOn && groupStep.dependsOn.includes(step.id)) {
        return false;
      }
    }

    return true;
  }
}
