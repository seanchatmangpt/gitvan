// src/hooks/PredicateEvaluator.mjs
// The "brain" of the Knowledge Hook Engine
// Executes SPARQL queries to determine if a hook's logical condition has been met

import { useGraph } from "../composables/graph.mjs";

/**
 * Predicate evaluator that determines if hook conditions are met
 * This is the core intelligence of the Knowledge Hook Engine
 */
export class PredicateEvaluator {
  /**
   * @param {object} options
   * @param {object} [options.logger] - Logger instance
   */
  constructor(options = {}) {
    this.logger = options.logger || console;
  }

  /**
   * Evaluate a hook's predicate against the current knowledge graph
   * @param {object} hook - Parsed hook definition
   * @param {object} currentGraph - Current knowledge graph
   * @param {object} [previousGraph] - Previous knowledge graph for comparison
   * @param {object} [options] - Evaluation options
   * @returns {Promise<object>} Evaluation result
   */
  async evaluate(hook, currentGraph, previousGraph = null, options = {}) {
    if (options.verbose) {
      this.logger.info(
        `🧠 Evaluating predicate: ${hook.predicateDefinition.type}`
      );
    }

    try {
      const predicate = hook.predicateDefinition;
      let result = false;
      let context = {};

      switch (predicate.type) {
        case "resultDelta":
          const deltaResult = await this._evaluateResultDelta(
            predicate,
            currentGraph,
            previousGraph
          );
          result = deltaResult.changed;
          context = deltaResult.context;
          break;

        case "ask":
          result = await this._evaluateASK(predicate, currentGraph);
          context = { query: predicate.definition.query };
          break;

        case "selectThreshold":
          const thresholdResult = await this._evaluateSELECTThreshold(
            predicate,
            currentGraph
          );
          result = thresholdResult.triggered;
          context = thresholdResult.context;
          break;

        case "shaclAllConform":
          const shaclResult = await this._evaluateSHACL(
            predicate,
            currentGraph
          );
          result = shaclResult.conforms;
          context = shaclResult.context;
          break;

        case "construct":
          const constructResult = await this._evaluateCONSTRUCT(
            predicate,
            currentGraph
          );
          result = constructResult.hasResults;
          context = constructResult.context;
          break;

        case "describe":
          const describeResult = await this._evaluateDESCRIBE(
            predicate,
            currentGraph
          );
          result = describeResult.hasResults;
          context = describeResult.context;
          break;

        case "federated":
          const federatedResult = await this._evaluateFederated(
            predicate,
            currentGraph
          );
          result = federatedResult.hasResults;
          context = federatedResult.context;
          break;

        case "temporal":
          const temporalResult = await this._evaluateTemporal(
            predicate,
            currentGraph
          );
          result = temporalResult.triggered;
          context = temporalResult.context;
          break;

        default:
          throw new Error(`Unknown predicate type: ${predicate.type}`);
      }

      if (options.verbose) {
        this.logger.info(`🧠 Predicate evaluation result: ${result}`);
      }

      return {
        result: result,
        predicateType: predicate.type,
        context: context,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`❌ Predicate evaluation failed: ${error.message}`);
      throw new Error(`Predicate evaluation failed: ${error.message}`);
    }
  }

  /**
   * Evaluate ResultDelta predicate - detects changes in query results
   * @private
   */
  async _evaluateResultDelta(predicate, currentGraph, previousGraph) {
    this.logger.info("🔍 Evaluating ResultDelta predicate");

    if (!predicate.definition.query) {
      throw new Error("ResultDelta predicate missing query");
    }

    // Execute query against current graph
    const currentResult = await currentGraph.query(predicate.definition.query);
    const currentHash = this._hashQueryResult(currentResult);

    let previousHash = null;
    let previousResult = null;
    if (previousGraph) {
      try {
        previousResult = await previousGraph.query(predicate.definition.query);
        previousHash = this._hashQueryResult(previousResult);
      } catch (error) {
        this.logger.warn(`⚠️ Failed to query previous graph: ${error.message}`);
      }
    }

    const changed = currentHash !== previousHash;

    return {
      changed: changed,
      context: {
        query: predicate.definition.query,
        changed: changed,
        currentHash: currentHash,
        previousHash: previousHash,
        currentResultSize: this._getResultSize(currentResult),
        previousResultSize: previousHash
          ? this._getResultSize(previousResult)
          : 0,
      },
    };
  }

  /**
   * Evaluate ASK predicate - boolean condition evaluation
   * @private
   */
  async _evaluateASK(predicate, currentGraph) {
    this.logger.info("❓ Evaluating ASK predicate");

    if (!predicate.definition.query) {
      throw new Error("ASK predicate missing query");
    }

    const result = await currentGraph.query(predicate.definition.query);
    return result.boolean || false;
  }

  /**
   * Evaluate SELECTThreshold predicate - numerical threshold monitoring
   * @private
   */
  async _evaluateSELECTThreshold(predicate, currentGraph) {
    this.logger.info("📊 Evaluating SELECTThreshold predicate");

    if (!predicate.definition.query) {
      throw new Error("SELECTThreshold predicate missing query");
    }

    const result = await currentGraph.query(predicate.definition.query);
    const value = this._extractNumericValue(result);
    const threshold = predicate.definition.threshold || 0;
    const operator = predicate.definition.operator || ">";

    let triggered = false;
    switch (operator) {
      case ">":
        triggered = value > threshold;
        break;
      case ">=":
        triggered = value >= threshold;
        break;
      case "<":
        triggered = value < threshold;
        break;
      case "<=":
        triggered = value <= threshold;
        break;
      case "==":
        triggered = value === threshold;
        break;
      case "!=":
        triggered = value !== threshold;
        break;
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }

    return {
      triggered: triggered,
      context: {
        query: predicate.definition.query,
        value: value,
        threshold: threshold,
        operator: operator,
        resultSize: this._getResultSize(result),
      },
    };
  }

  /**
   * Evaluate SHACL predicate - graph conformance validation
   * @private
   */
  async _evaluateSHACL(predicate, currentGraph) {
    this.logger.info("🔍 Evaluating SHACL predicate");

    if (!predicate.definition.shapes) {
      throw new Error("SHACL predicate missing shapes definition");
    }

    // This would integrate with SHACL validation
    // For now, simulate validation
    const conforms = true; // Would be actual SHACL validation result
    const violations = []; // Would be actual violations

    return {
      conforms: conforms,
      context: {
        shapes: predicate.definition.shapes,
        violations: violations,
        violationCount: violations.length,
      },
    };
  }

  /**
   * Hash query result for comparison
   * @private
   */
  _hashQueryResult(result) {
    if (!result) return null;

    // Create a simple hash of the result
    const resultString = JSON.stringify(result, null, 0);
    return this._simpleHash(resultString);
  }

  /**
   * Simple hash function
   * @private
   */
  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Get result size for context
   * @private
   */
  _getResultSize(result) {
    if (!result) return 0;

    if (result.results) {
      return result.results.length;
    } else if (result.quads) {
      return result.quads.length;
    } else if (Array.isArray(result)) {
      return result.length;
    }

    return 1; // Single result
  }

  /**
   * Extract numeric value from query result
   * @private
   */
  _extractNumericValue(result) {
    if (!result) return 0;

    if (result.results && result.results.length > 0) {
      const firstResult = result.results[0];
      const values = Object.values(firstResult);
      if (values.length > 0) {
        const value = values[0];
        if (value && value.value) {
          return parseFloat(value.value) || 0;
        }
      }
    }

    return 0;
  }

  /**
   * Get evaluation statistics
   * @param {Array<object>} evaluations - Array of evaluation results
   * @returns {object} Evaluation statistics
   */
  getEvaluationStats(evaluations) {
    const stats = {
      totalEvaluations: evaluations.length,
      triggeredHooks: evaluations.filter((e) => e.result).length,
      predicateTypes: {},
      averageEvaluationTime: 0,
    };

    // Count predicate types
    for (const evaluation of evaluations) {
      const type = evaluation.predicateType || "unknown";
      stats.predicateTypes[type] = (stats.predicateTypes[type] || 0) + 1;
    }

    // Calculate average evaluation time (if available)
    const evaluationsWithTime = evaluations.filter((e) => e.evaluationTime);
    if (evaluationsWithTime.length > 0) {
      stats.averageEvaluationTime =
        evaluationsWithTime.reduce((sum, e) => sum + e.evaluationTime, 0) /
        evaluationsWithTime.length;
    }

    return stats;
  }

  /**
   * Validate predicate definition
   * @param {object} predicate - Predicate definition
   * @returns {Promise<boolean>} Validation result
   */
  async validatePredicate(predicate) {
    try {
      switch (predicate.type) {
        case "resultDelta":
          if (!predicate.definition.query) {
            throw new Error("ResultDelta predicate missing query");
          }
          break;

        case "ask":
          if (!predicate.definition.query) {
            throw new Error("ASK predicate missing query");
          }
          break;

        case "selectThreshold":
          if (!predicate.definition.query) {
            throw new Error("SELECTThreshold predicate missing query");
          }
          if (predicate.definition.threshold === undefined) {
            throw new Error("SELECTThreshold predicate missing threshold");
          }
          break;

        case "shaclAllConform":
          if (!predicate.definition.shapes) {
            throw new Error("SHACL predicate missing shapes");
          }
          break;

        default:
          throw new Error(`Unknown predicate type: ${predicate.type}`);
      }

      return true;
    } catch (error) {
      this.logger.warn(`⚠️ Predicate validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Analyze predicate complexity
   * @param {object} predicate - Predicate definition
   * @returns {object} Complexity analysis
   */
  analyzePredicateComplexity(predicate) {
    const analysis = {
      complexity: "low",
      estimatedExecutionTime: 100, // milliseconds
      resourceUsage: "minimal",
    };

    if (predicate.type === "resultDelta") {
      // Analyze query complexity
      const query = predicate.definition.query || "";
      const complexity = this._analyzeQueryComplexity(query);
      analysis.complexity = complexity.complexity;
      analysis.estimatedExecutionTime = complexity.estimatedTime;
    } else if (predicate.type === "selectThreshold") {
      analysis.complexity = "medium";
      analysis.estimatedExecutionTime = 200;
    } else if (predicate.type === "shaclAllConform") {
      analysis.complexity = "high";
      analysis.estimatedExecutionTime = 500;
    }

    return analysis;
  }

  /**
   * Analyze query complexity
   * @private
   */
  _analyzeQueryComplexity(query) {
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

    let complexityLevel = "low";
    let estimatedTime = 100;

    if (totalComplexity > 10) {
      complexityLevel = "high";
      estimatedTime = 500;
    } else if (totalComplexity > 5) {
      complexityLevel = "medium";
      estimatedTime = 200;
    }

    return {
      complexity: complexityLevel,
      estimatedTime: estimatedTime,
      details: complexity,
    };
  }

  /**
   * Evaluate CONSTRUCT predicate - builds knowledge graphs dynamically
   * @private
   */
  async _evaluateCONSTRUCT(predicate, currentGraph) {
    this.logger.info("🔨 Evaluating CONSTRUCT predicate");

    try {
      const query = predicate.definition.query;

      // Execute CONSTRUCT query
      const results = await currentGraph.query(query, {
        queryType: "construct",
      });

      // Check if results were generated
      const hasResults = results && results.length > 0;

      // Store constructed triples for potential use in workflows
      const constructedTriples = results || [];

      return {
        hasResults,
        context: {
          query,
          constructedTriples,
          tripleCount: constructedTriples.length,
        },
      };
    } catch (error) {
      this.logger.error(`❌ CONSTRUCT evaluation failed: ${error.message}`);
      return {
        hasResults: false,
        context: {
          query: predicate.definition.query,
          error: error.message,
        },
      };
    }
  }

  /**
   * Evaluate DESCRIBE predicate - describes resources in detail
   * @private
   */
  async _evaluateDESCRIBE(predicate, currentGraph) {
    this.logger.info("📝 Evaluating DESCRIBE predicate");

    try {
      const query = predicate.definition.query;

      // Execute DESCRIBE query
      const results = await currentGraph.query(query, {
        queryType: "describe",
      });

      // Check if results were generated
      const hasResults = results && results.length > 0;

      // Extract resource descriptions
      const resourceDescriptions = results || [];

      return {
        hasResults,
        context: {
          query,
          resourceDescriptions,
          descriptionCount: resourceDescriptions.length,
        },
      };
    } catch (error) {
      this.logger.error(`❌ DESCRIBE evaluation failed: ${error.message}`);
      return {
        hasResults: false,
        context: {
          query: predicate.definition.query,
          error: error.message,
        },
      };
    }
  }

  /**
   * Evaluate Federated predicate - queries multiple data sources
   * @private
   */
  async _evaluateFederated(predicate, currentGraph) {
    this.logger.info("🌐 Evaluating Federated predicate");

    try {
      const query = predicate.definition.query;
      const endpoints = predicate.definition.endpoints || [];

      // Execute federated query across multiple endpoints
      const federatedResults = [];

      for (const endpoint of endpoints) {
        try {
          const endpointResults = await currentGraph.query(query, {
            queryType: "federated",
            endpoint: endpoint.url,
            timeout: endpoint.timeout || 5000,
          });

          federatedResults.push({
            endpoint: endpoint.url,
            results: endpointResults,
            success: true,
          });
        } catch (error) {
          this.logger.warn(
            `⚠️ Federated query failed for ${endpoint.url}: ${error.message}`
          );
          federatedResults.push({
            endpoint: endpoint.url,
            results: [],
            success: false,
            error: error.message,
          });
        }
      }

      // Check if any results were generated
      const hasResults = federatedResults.some(
        (result) => result.success && result.results.length > 0
      );

      return {
        hasResults,
        context: {
          query,
          federatedResults,
          endpointCount: endpoints.length,
          successfulEndpoints: federatedResults.filter((r) => r.success).length,
        },
      };
    } catch (error) {
      this.logger.error(`❌ Federated evaluation failed: ${error.message}`);
      return {
        hasResults: false,
        context: {
          query: predicate.definition.query,
          error: error.message,
        },
      };
    }
  }

  /**
   * Evaluate Temporal predicate - time-based condition evaluation
   * @private
   */
  async _evaluateTemporal(predicate, currentGraph) {
    this.logger.info("⏰ Evaluating Temporal predicate");

    try {
      const query = predicate.definition.query;
      const timeCondition = predicate.definition.timeCondition;
      const timeWindow = predicate.definition.timeWindow || 3600000; // 1 hour default

      // Get current time
      const now = new Date();
      const timeWindowStart = new Date(now.getTime() - timeWindow);

      // Execute temporal query with time constraints
      const results = await currentGraph.query(query, {
        queryType: "temporal",
        timeCondition,
        timeWindow: {
          start: timeWindowStart,
          end: now,
        },
      });

      // Check if temporal condition is met
      const triggered = results && results.length > 0;

      return {
        triggered,
        context: {
          query,
          timeCondition,
          timeWindow,
          results,
          resultCount: results ? results.length : 0,
          evaluationTime: now.toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`❌ Temporal evaluation failed: ${error.message}`);
      return {
        triggered: false,
        context: {
          query: predicate.definition.query,
          error: error.message,
        },
      };
    }
  }
}
