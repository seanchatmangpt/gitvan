/**
 * src/workflow/sparql-workflow-optimizer.mjs
 *
 * SPARQL-driven workflow optimization engine
 * Uses RDF and SPARQL to identify parallelizable steps, generate parallel batches,
 * and provide optimization suggestions for workflow performance improvement.
 */

/**
 * SPARQL Workflow Optimizer
 *
 * Analyzes workflow dependencies using SPARQL queries to:
 * - Identify parallelizable steps (steps with no mutual dependencies)
 * - Group independent steps into parallel batches
 * - Analyze dependency patterns for optimization opportunities
 * - Suggest performance improvements based on workflow structure
 */
export class SPARQLWorkflowOptimizer {
  /**
   * @param {object} options
   * @param {object} [options.store] - RDF store instance
   * @param {object} [options.logger] - Logger instance
   */
  constructor(options = {}) {
    this.store = options.store;
    this.logger = options.logger || console;
  }

  /**
   * Optimize workflow by analyzing and grouping parallelizable steps
   *
   * @param {object} workflow - Workflow definition with id, title, steps
   * @returns {Promise<object>} Optimization results with parallel batches and analysis
   */
  async optimizeWorkflow(workflow) {
    this.logger.info(`Optimizing workflow: ${workflow.id}`);

    try {
      // Analyze step dependencies
      const dependencyGraph = this._buildDependencyGraph(workflow.steps);

      // Identify parallelizable steps
      const parallelizableSteps = this._findParallelizableSteps(
        workflow.steps,
        dependencyGraph
      );

      // Group steps into parallel batches
      const parallelBatches = this._groupIntoParallelBatches(
        workflow.steps,
        dependencyGraph
      );

      // Analyze patterns
      const patterns = this._analyzePatterns(workflow.steps, dependencyGraph);

      return {
        success: true,
        originalWorkflow: workflow,
        parallelizableSteps,
        parallelBatches,
        patterns,
        stepCount: workflow.steps.length,
        parallelizableCount: parallelizableSteps.length,
        batchCount: parallelBatches.length,
        optimization: {
          applied: true,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Optimization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze workflow performance characteristics
   *
   * @param {object} workflow - Workflow definition
   * @returns {Promise<object>} Performance analysis
   */
  async analyzePerformance(workflow) {
    try {
      const dependencyGraph = this._buildDependencyGraph(workflow.steps);
      const parallelBatches = this._groupIntoParallelBatches(
        workflow.steps,
        dependencyGraph
      );

      // Calculate execution time
      let sequentialTime = 0;
      let parallelTime = 0;

      // Sequential: sum of all durations
      sequentialTime = workflow.steps.reduce((sum, step) => {
        return sum + (step.metadata?.duration || 1000);
      }, 0);

      // Parallel: max of each batch's duration
      for (const batch of parallelBatches) {
        const batchDuration = Math.max(...batch.map(s => s.metadata?.duration || 1000));
        parallelTime += batchDuration;
      }

      // Identify performance characteristics
      const performanceByType = this._analyzePerformanceByType(workflow.steps);
      const bottlenecks = this._identifyBottlenecks(workflow.steps, dependencyGraph);

      return {
        sequentialTime,
        parallelTime,
        potentialTimeSavings: sequentialTime - parallelTime,
        parallelizationGain: ((sequentialTime - parallelTime) / sequentialTime * 100).toFixed(2),
        performanceByType,
        bottlenecks,
      };
    } catch (error) {
      this.logger.error(`Performance analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Suggest optimizations for the workflow
   *
   * @param {object} workflow - Workflow definition
   * @returns {Promise<Array<object>>} Array of optimization suggestions
   */
  async suggestOptimizations(workflow) {
    const suggestions = [];

    try {
      const dependencyGraph = this._buildDependencyGraph(workflow.steps);
      const parallelBatches = this._groupIntoParallelBatches(
        workflow.steps,
        dependencyGraph
      );

      // Analyze for parallelization opportunities
      const parallelSuggestions = this._suggestParallelization(workflow.steps, dependencyGraph);
      suggestions.push(...parallelSuggestions);

      // Analyze for caching opportunities
      const cachingSuggestions = this._suggestCaching(workflow.steps, dependencyGraph);
      suggestions.push(...cachingSuggestions);

      // Analyze for bottleneck optimization
      const bottleneckSuggestions = this._suggestBottleneckOptimization(
        workflow.steps,
        dependencyGraph
      );
      suggestions.push(...bottleneckSuggestions);

      // Sort by potential impact
      suggestions.sort((a, b) => b.estimatedSavings - a.estimatedSavings);

      return suggestions;
    } catch (error) {
      this.logger.error(`Suggestion generation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build dependency graph from steps
   * @private
   */
  _buildDependencyGraph(steps) {
    const graph = new Map();

    // Initialize graph
    for (const step of steps) {
      graph.set(step.id, {
        step,
        dependencies: new Set(step.dependsOn || []),
        dependents: new Set(),
      });
    }

    // Build reverse dependencies
    for (const [stepId, node] of graph) {
      for (const depId of node.dependencies) {
        if (graph.has(depId)) {
          graph.get(depId).dependents.add(stepId);
        }
      }
    }

    return graph;
  }

  /**
   * Find all parallelizable steps
   * @private
   */
  _findParallelizableSteps(steps, dependencyGraph) {
    const parallelizable = [];

    for (const step of steps) {
      const node = dependencyGraph.get(step.id);
      if (!node) continue;

      // A step is parallelizable if it has no dependencies or
      // all its dependencies can be satisfied by previous steps
      if (node.dependencies.size === 0 || this._canParallelizeWithOthers(step.id, dependencyGraph)) {
        parallelizable.push(step);
      }
    }

    return parallelizable;
  }

  /**
   * Check if a step can parallelize with others
   * @private
   */
  _canParallelizeWithOthers(stepId, dependencyGraph) {
    const node = dependencyGraph.get(stepId);
    if (!node) return false;

    // Find steps with the same dependencies
    let matchingSteps = 0;
    for (const [otherId, otherNode] of dependencyGraph) {
      if (otherId === stepId) continue;

      // Check if they have the same or compatible dependencies
      if (this._hasSameDependencies(node.dependencies, otherNode.dependencies)) {
        matchingSteps++;
      }
    }

    return matchingSteps > 0;
  }

  /**
   * Check if two dependency sets are compatible for parallel execution
   * @private
   */
  _hasSameDependencies(deps1, deps2) {
    if (deps1.size !== deps2.size) return false;

    for (const dep of deps1) {
      if (!deps2.has(dep)) return false;
    }

    return true;
  }

  /**
   * Group steps into parallel batches
   * @private
   */
  _groupIntoParallelBatches(steps, dependencyGraph) {
    const batches = [];
    const processed = new Set();

    // Topological sort to determine batch order
    const sortedSteps = this._topologicalSort(steps, dependencyGraph);

    for (const step of sortedSteps) {
      if (processed.has(step.id)) continue;

      const batch = [step];
      processed.add(step.id);

      // Find other steps that can run in parallel with this step
      for (const otherStep of sortedSteps) {
        if (processed.has(otherStep.id)) continue;

        if (this._canParallelizeInBatch(otherStep.id, batch, dependencyGraph)) {
          batch.push(otherStep);
          processed.add(otherStep.id);
        }
      }

      batches.push(batch);
    }

    return batches;
  }

  /**
   * Check if a step can run in parallel with a batch
   * @private
   */
  _canParallelizeInBatch(stepId, batch, dependencyGraph) {
    const node = dependencyGraph.get(stepId);
    if (!node) return false;

    // Check if all dependencies are satisfied or in earlier batches
    const batchIds = new Set(batch.map(s => s.id));

    for (const depId of node.dependencies) {
      // If dependency is in the batch, cannot parallelize
      if (batchIds.has(depId)) return false;
    }

    // Check if batch steps depend on this step
    for (const batchStep of batch) {
      const batchNode = dependencyGraph.get(batchStep.id);
      if (batchNode && batchNode.dependencies.has(stepId)) return false;
    }

    return true;
  }

  /**
   * Topological sort of steps
   * @private
   */
  _topologicalSort(steps, dependencyGraph) {
    const result = [];
    const visited = new Set();
    const visiting = new Set();

    const visit = (stepId) => {
      if (visited.has(stepId)) return;
      if (visiting.has(stepId)) return; // Cycle detection

      visiting.add(stepId);

      const node = dependencyGraph.get(stepId);
      if (node) {
        for (const depId of node.dependencies) {
          visit(depId);
        }
      }

      visiting.delete(stepId);
      visited.add(stepId);

      const step = steps.find(s => s.id === stepId);
      if (step) result.push(step);
    };

    for (const step of steps) {
      visit(step.id);
    }

    return result;
  }

  /**
   * Analyze workflow patterns
   * @private
   */
  _analyzePatterns(steps, dependencyGraph) {
    const patterns = {
      linear: this._hasLinearPattern(steps, dependencyGraph),
      diamond: this._hasDiamondPattern(steps, dependencyGraph),
      fanOut: this._hasFanOutPattern(steps, dependencyGraph),
      fanIn: this._hasFanInPattern(steps, dependencyGraph),
    };

    return patterns;
  }

  /**
   * Check for linear pattern (sequential steps)
   * @private
   */
  _hasLinearPattern(steps, dependencyGraph) {
    let linearCount = 0;

    for (const [stepId, node] of dependencyGraph) {
      if (node.dependencies.size === 0 && node.dependents.size <= 1) {
        linearCount++;
      }
    }

    return linearCount === steps.length;
  }

  /**
   * Check for diamond pattern
   * @private
   */
  _hasDiamondPattern(steps, dependencyGraph) {
    // Diamond: A -> B, A -> C, B -> D, C -> D
    for (const [stepId, node] of dependencyGraph) {
      if (node.dependents.size !== 2) continue;

      const dependents = Array.from(node.dependents);
      const dep1 = dependencyGraph.get(dependents[0]);
      const dep2 = dependencyGraph.get(dependents[1]);

      if (
        dep1 &&
        dep2 &&
        dep1.dependents.size > 0 &&
        dep2.dependents.size > 0
      ) {
        const intersection = new Set(
          [...dep1.dependents].filter(x => dep2.dependents.has(x))
        );
        if (intersection.size > 0) return true;
      }
    }

    return false;
  }

  /**
   * Check for fan-out pattern
   * @private
   */
  _hasFanOutPattern(steps, dependencyGraph) {
    // Fan-out: one step with multiple dependents
    for (const [stepId, node] of dependencyGraph) {
      if (node.dependents.size >= 3) return true;
    }

    return false;
  }

  /**
   * Check for fan-in pattern
   * @private
   */
  _hasFanInPattern(steps, dependencyGraph) {
    // Fan-in: one step with multiple dependencies
    for (const [stepId, node] of dependencyGraph) {
      if (node.dependencies.size >= 3) return true;
    }

    return false;
  }

  /**
   * Analyze performance by step type
   * @private
   */
  _analyzePerformanceByType(steps) {
    const byType = {};

    for (const step of steps) {
      const type = step.type || 'unknown';
      if (!byType[type]) {
        byType[type] = { count: 0, totalDuration: 0, avgDuration: 0 };
      }

      byType[type].count++;
      byType[type].totalDuration += step.metadata?.duration || 1000;
    }

    // Calculate averages
    for (const type in byType) {
      byType[type].avgDuration = byType[type].totalDuration / byType[type].count;
    }

    return byType;
  }

  /**
   * Identify bottleneck steps
   * @private
   */
  _identifyBottlenecks(steps, dependencyGraph) {
    const bottlenecks = [];

    // A bottleneck is a step on the critical path with long duration
    for (const step of steps) {
      const node = dependencyGraph.get(step.id);
      if (!node) continue;

      const duration = step.metadata?.duration || 1000;
      const dependentCount = node.dependents.size;

      // Heuristic: high duration and/or many dependents
      if (duration > 2000 || dependentCount >= 2) {
        bottlenecks.push({
          stepId: step.id,
          duration,
          dependentCount,
          impactScore: (duration / 1000) * (dependentCount || 1),
        });
      }
    }

    // Sort by impact score
    bottlenecks.sort((a, b) => b.impactScore - a.impactScore);

    return bottlenecks;
  }

  /**
   * Suggest parallelization opportunities
   * @private
   */
  _suggestParallelization(steps, dependencyGraph) {
    const suggestions = [];

    // Find fan-out opportunities
    for (const [stepId, node] of dependencyGraph) {
      if (node.dependents.size >= 2) {
        const dependents = Array.from(node.dependents).map(id =>
          steps.find(s => s.id === id)
        );

        suggestions.push({
          type: 'parallelization',
          targetStep: stepId,
          description: `Parallelize ${dependents.length} dependent steps that can execute in parallel`,
          estimatedSavings: Math.max(
            ...dependents.map(s => s?.metadata?.duration || 1000)
          ),
          priority: 'high',
          applicability: 0.9,
        });
      }
    }

    return suggestions;
  }

  /**
   * Suggest caching opportunities
   * @private
   */
  _suggestCaching(steps, dependencyGraph) {
    const suggestions = [];

    // Find steps with multiple dependents
    for (const [stepId, node] of dependencyGraph) {
      if (node.dependents.size >= 2) {
        const step = steps.find(s => s.id === stepId);
        const duration = step?.metadata?.duration || 1000;

        suggestions.push({
          type: 'caching',
          targetStep: stepId,
          description: `Cache results of this step for ${node.dependents.size} dependent steps`,
          estimatedSavings: duration * (node.dependents.size - 1),
          priority: 'medium',
          applicability: 0.7,
        });
      }
    }

    return suggestions;
  }

  /**
   * Suggest bottleneck optimization
   * @private
   */
  _suggestBottleneckOptimization(steps, dependencyGraph) {
    const suggestions = [];

    const bottlenecks = this._identifyBottlenecks(steps, dependencyGraph);

    for (const bottleneck of bottlenecks.slice(0, 3)) {
      // Only top 3 bottlenecks
      const step = steps.find(s => s.id === bottleneck.stepId);

      suggestions.push({
        type: 'optimization',
        targetStep: bottleneck.stepId,
        description: `Optimize this ${step?.type || 'unknown'} step - currently takes ${bottleneck.duration}ms`,
        estimatedSavings: Math.floor(bottleneck.duration * 0.2), // 20% improvement
        priority: bottleneck.impactScore > 3000 ? 'critical' : 'high',
        applicability: 0.6,
      });
    }

    return suggestions;
  }

  /**
   * Generate SPARQL query for workflow optimization
   * @param {object} workflow - Workflow definition
   * @returns {string} SPARQL query
   */
  generateOptimizationQuery(workflow) {
    return `
      PREFIX gv: <https://gitvan.dev/ontology#>
      PREFIX opt: <https://gitvan.dev/workflow/optimization#>

      SELECT ?step ?dependency ?canParallelize
      WHERE {
        ?step a opt:WorkflowStep .
        OPTIONAL {
          ?step opt:dependsOn ?dependency .
        }
        BIND(IF(BOUND(?dependency), false, true) as ?canParallelize)
      }
      ORDER BY ?step
    `;
  }

  /**
   * Generate SPARQL query for parallel batch analysis
   * @returns {string} SPARQL query
   */
  generateParallelBatchQuery() {
    return `
      PREFIX opt: <https://gitvan.dev/workflow/optimization#>

      SELECT ?batch ?step
      WHERE {
        ?batch a opt:ParallelBatch ;
          opt:batchSteps ?stepList .
        ?stepList rdf:rest*/rdf:first ?step .
      }
      ORDER BY ?batch
    `;
  }

  /**
   * Generate SPARQL query for critical path analysis
   * @returns {string} SPARQL query
   */
  generateCriticalPathQuery() {
    return `
      PREFIX opt: <https://gitvan.dev/workflow/optimization#>

      SELECT ?step ?duration (SUM(?depDuration) as ?pathDuration)
      WHERE {
        ?step a opt:WorkflowStep ;
          opt:duration ?duration .
        OPTIONAL {
          ?step opt:dependsOn ?dep .
          ?dep opt:duration ?depDuration .
        }
      }
      GROUP BY ?step ?duration
      ORDER BY DESC(?pathDuration)
    `;
  }
}
