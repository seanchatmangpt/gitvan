/**
 * src/workflow/critical-path-analyzer.mjs
 *
 * Critical Path Method (CPM) implementation for workflow optimization
 * Analyzes workflow dependency graphs to identify the longest execution path,
 * estimate total workflow duration, and find optimization opportunities.
 */

/**
 * Critical Path Analyzer
 *
 * Uses Critical Path Method to:
 * - Identify the critical path (longest dependency chain)
 * - Calculate total estimated workflow duration
 * - Estimate execution times with and without parallelization
 * - Find steps on the critical path that should be optimized
 * - Provide performance metrics and bottleneck identification
 */
export class CriticalPathAnalyzer {
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
   * Analyze workflow performance characteristics
   *
   * @param {object} workflow - Workflow definition with id, title, steps
   * @returns {Promise<object>} Performance analysis including critical path
   */
  async analyzePerformance(workflow) {
    this.logger.info(`Analyzing workflow performance: ${workflow.id}`);

    try {
      // Build dependency graph
      const graph = this._buildGraph(workflow.steps);

      // Calculate earliest and latest times
      const timing = this._calculateTiming(graph, workflow.steps);

      // Find critical path
      const criticalPath = this._findCriticalPath(graph, timing, workflow.steps);

      // Calculate metrics
      const metrics = this._calculateMetrics(workflow.steps, criticalPath, timing);

      // Identify bottlenecks
      const bottlenecks = this._identifyBottlenecks(workflow.steps, criticalPath);

      // Find optimization opportunities
      const optimizationOpportunities = this._findOptimizationOpportunities(
        workflow.steps,
        criticalPath,
        graph
      );

      return {
        success: true,
        workflowId: workflow.id,
        criticalPath,
        criticalPaths: [criticalPath], // Support multiple critical paths
        estimatedDuration: metrics.totalDuration,
        sequentialDuration: metrics.sequentialDuration,
        parallelizationGain: metrics.parallelizationGain,
        performanceByType: metrics.performanceByType,
        bottlenecks,
        optimizationOpportunities,
        potentialTimeSavings: metrics.potentialTimeSavings,
        metrics: {
          stepCount: workflow.steps.length,
          criticalPathLength: criticalPath.length,
          criticalPathPercentage: (
            (criticalPath.length / workflow.steps.length) * 100
          ).toFixed(2),
        },
      };
    } catch (error) {
      this.logger.error(`Performance analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build dependency graph
   * @private
   */
  _buildGraph(steps) {
    const graph = new Map();

    // Initialize nodes
    for (const step of steps) {
      graph.set(step.id, {
        step,
        dependencies: new Set(step.dependsOn || []),
        dependents: new Set(),
        duration: step.metadata?.duration || 1000,
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
   * Calculate earliest start (ES) and earliest finish (EF) times using forward pass
   * Then calculate latest start (LS) and latest finish (LF) times using backward pass
   * @private
   */
  _calculateTiming(graph, steps) {
    const timing = new Map();

    // Forward pass: calculate earliest times
    const visited = new Set();
    const visit = (stepId) => {
      if (visited.has(stepId)) return;

      const node = graph.get(stepId);
      if (!node) return;

      // Calculate earliest start time (max EF of dependencies)
      let es = 0;
      for (const depId of node.dependencies) {
        visit(depId);
        const depTiming = timing.get(depId);
        if (depTiming && depTiming.ef > es) {
          es = depTiming.ef;
        }
      }

      // Earliest finish = earliest start + duration
      const ef = es + node.duration;

      timing.set(stepId, {
        es, // Earliest Start
        ef, // Earliest Finish
        ls: null, // Will be calculated in backward pass
        lf: null, // Will be calculated in backward pass
        slack: null, // Will be calculated after backward pass
      });

      visited.add(stepId);
    };

    // Visit all steps (topological order)
    for (const step of steps) {
      visit(step.id);
    }

    // Backward pass: calculate latest times
    const projectDuration = Math.max(...Array.from(timing.values()).map(t => t.ef));

    const backwardVisited = new Set();
    const backwardVisit = (stepId) => {
      if (backwardVisited.has(stepId)) return;

      const node = graph.get(stepId);
      if (!node) return;

      const stepTiming = timing.get(stepId);
      if (!stepTiming) return;

      // For end nodes, latest finish = project duration
      let lf = projectDuration;

      if (node.dependents.size > 0) {
        // For other nodes, latest finish = min LS of dependents
        let minLS = Infinity;
        for (const depId of node.dependents) {
          backwardVisit(depId);
          const depTiming = timing.get(depId);
          if (depTiming && depTiming.ls < minLS) {
            minLS = depTiming.ls;
          }
        }
        lf = Math.min(lf, minLS);
      }

      // Latest start = latest finish - duration
      const ls = lf - node.duration;

      // Update timing
      stepTiming.lf = lf;
      stepTiming.ls = ls;
      stepTiming.slack = ls - stepTiming.es;

      backwardVisited.add(stepId);
    };

    // Visit all steps in reverse topological order
    for (const step of steps.reverse()) {
      backwardVisit(step.id);
    }

    return timing;
  }

  /**
   * Find the critical path (path with zero slack)
   * @private
   */
  _findCriticalPath(graph, timing, steps) {
    const criticalSteps = [];

    // Find all steps on the critical path (slack = 0)
    for (const [stepId, stepTiming] of timing) {
      if (stepTiming.slack === 0) {
        const step = steps.find(s => s.id === stepId);
        if (step) {
          criticalSteps.push({
            ...step,
            timing: {
              es: stepTiming.es,
              ef: stepTiming.ef,
              ls: stepTiming.ls,
              lf: stepTiming.lf,
              slack: stepTiming.slack,
            },
          });
        }
      }
    }

    // Sort by timing
    criticalSteps.sort((a, b) => a.timing.es - b.timing.es);

    return criticalSteps;
  }

  /**
   * Calculate performance metrics
   * @private
   */
  _calculateMetrics(steps, criticalPath, timing) {
    // Sequential duration (sum of all)
    const sequentialDuration = steps.reduce((sum, step) => {
      return sum + (step.metadata?.duration || 1000);
    }, 0);

    // Parallel duration (project duration from critical path)
    const parallelDuration = Math.max(
      ...Array.from(timing.values()).map(t => t.ef)
    );

    // Performance by type
    const performanceByType = {};
    for (const step of steps) {
      const type = step.type || 'unknown';
      if (!performanceByType[type]) {
        performanceByType[type] = {
          count: 0,
          totalDuration: 0,
          avgDuration: 0,
          onCriticalPath: 0,
        };
      }

      performanceByType[type].count++;
      performanceByType[type].totalDuration += step.metadata?.duration || 1000;

      if (criticalPath.some(cp => cp.id === step.id)) {
        performanceByType[type].onCriticalPath++;
      }
    }

    // Calculate averages
    for (const type in performanceByType) {
      performanceByType[type].avgDuration =
        performanceByType[type].totalDuration / performanceByType[type].count;
    }

    return {
      totalDuration: parallelDuration,
      sequentialDuration,
      parallelizationGain: (
        ((sequentialDuration - parallelDuration) / sequentialDuration) * 100
      ).toFixed(2),
      potentialTimeSavings: sequentialDuration - parallelDuration,
      performanceByType,
    };
  }

  /**
   * Identify bottleneck steps
   * @private
   */
  _identifyBottlenecks(steps, criticalPath) {
    const bottlenecks = [];

    for (const step of criticalPath) {
      const duration = step.metadata?.duration || 1000;

      // Steps on critical path with high duration are bottlenecks
      if (duration > 1500) {
        bottlenecks.push({
          stepId: step.id,
          stepType: step.type,
          duration,
          onCriticalPath: true,
          optimizationPotential: Math.floor(duration * 0.3), // Assume 30% optimization possible
        });
      }
    }

    // Sort by potential impact
    bottlenecks.sort((a, b) => b.optimizationPotential - a.optimizationPotential);

    return bottlenecks;
  }

  /**
   * Find optimization opportunities
   * @private
   */
  _findOptimizationOpportunities(steps, criticalPath, graph) {
    const opportunities = [];

    // Opportunity 1: Parallelize non-critical paths
    for (const step of steps) {
      if (!criticalPath.some(cp => cp.id === step.id)) {
        const node = graph.get(step.id);
        if (node && node.dependents.size > 0) {
          opportunities.push({
            type: 'parallelize-non-critical',
            stepId: step.id,
            description: `This non-critical step could be parallelized with critical path steps`,
            potential: 'medium',
          });
        }
      }
    }

    // Opportunity 2: Optimize critical path bottlenecks
    for (const step of criticalPath) {
      const duration = step.metadata?.duration || 1000;
      if (duration > 2000) {
        opportunities.push({
          type: 'optimize-critical-bottleneck',
          stepId: step.id,
          description: `Optimize this critical path bottleneck (${duration}ms)`,
          potential: 'high',
        });
      }
    }

    // Opportunity 3: Cache frequently used steps
    for (const [stepId, node] of graph) {
      if (node.dependents.size >= 2) {
        opportunities.push({
          type: 'cache-reusable',
          stepId,
          description: `Cache results of this step used by ${node.dependents.size} dependents`,
          potential: 'medium',
        });
      }
    }

    return opportunities;
  }

  /**
   * Generate SPARQL query for critical path analysis
   * @returns {string} SPARQL query
   */
  generateCriticalPathQuery() {
    return `
      PREFIX gv: <https://gitvan.dev/ontology#>
      PREFIX opt: <https://gitvan.dev/workflow/optimization#>

      SELECT ?step ?duration ?slack
      WHERE {
        ?step a opt:WorkflowStep ;
          opt:duration ?duration ;
          opt:slack ?slack .
        FILTER (?slack = 0)
      }
      ORDER BY ?step
    `;
  }

  /**
   * Generate SPARQL query for timing analysis
   * @returns {string} SPARQL query
   */
  generateTimingQuery() {
    return `
      PREFIX opt: <https://gitvan.dev/workflow/optimization#>

      SELECT ?step ?es ?ef ?ls ?lf
      WHERE {
        ?step a opt:WorkflowStep .
        OPTIONAL {
          ?step opt:earliestStart ?es ;
            opt:earliestFinish ?ef ;
            opt:latestStart ?ls ;
            opt:latestFinish ?lf .
        }
      }
      ORDER BY ?es
    `;
  }

  /**
   * Generate SPARQL query for bottleneck analysis
   * @returns {string} SPARQL query
   */
  generateBottleneckQuery() {
    return `
      PREFIX opt: <https://gitvan.dev/workflow/optimization#>

      SELECT ?step ?duration ?dependentCount
      WHERE {
        ?step a opt:WorkflowStep ;
          opt:duration ?duration ;
          opt:onCriticalPath true .
        {
          SELECT ?step (COUNT(?dependent) as ?dependentCount)
          WHERE {
            ?step ^opt:dependsOn ?dependent .
          }
          GROUP BY ?step
        }
        FILTER (?duration > 1500)
      }
      ORDER BY DESC(?duration)
    `;
  }

  /**
   * Export analysis as RDF
   * @param {object} analysis - Analysis results
   * @returns {string} Turtle RDF representation
   */
  exportAsRDF(analysis) {
    let ttl = `@prefix opt: <https://gitvan.dev/workflow/optimization#> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

`;

    // Document the analysis
    const analysisUri = `<https://example.org/analysis/${Date.now()}>`;
    ttl += `${analysisUri} a opt:PerformanceProfile ;
  opt:estimatedDuration "${analysis.estimatedDuration}"^^xsd:int ;
  opt:potentialTimeSavings "${analysis.potentialTimeSavings}"^^xsd:int ;
  opt:parallelizationGain "${analysis.parallelizationGain}"^^xsd:float .\n\n`;

    // Document critical path
    if (analysis.criticalPath && analysis.criticalPath.length > 0) {
      const cpUri = `<https://example.org/critical-path/${Date.now()}>`;
      ttl += `${cpUri} a opt:CriticalPath ;
  opt:criticalPathDuration "${analysis.estimatedDuration}"^^xsd:int ;
  opt:pathLength "${analysis.criticalPath.length}"^^xsd:int .\n\n`;

      // Add critical path steps
      for (let i = 0; i < analysis.criticalPath.length; i++) {
        const step = analysis.criticalPath[i];
        ttl += `<${step.id}> opt:onCriticalPath true ;
  opt:criticalPathIndex "${i}"^^xsd:int .\n`;
      }
    }

    return ttl;
  }

  /**
   * Get timing summary
   * @param {object} timing - Timing map from calculateTiming
   * @returns {object} Summary object
   */
  getTimingSummary(timing) {
    const summary = {
      projectDuration: 0,
      stepCount: timing.size,
      criticalStepCount: 0,
    };

    for (const [, stepTiming] of timing) {
      summary.projectDuration = Math.max(summary.projectDuration, stepTiming.ef);
      if (stepTiming.slack === 0) {
        summary.criticalStepCount++;
      }
    }

    return summary;
  }
}
