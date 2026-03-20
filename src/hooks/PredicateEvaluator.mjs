// src/hooks/PredicateEvaluator.mjs
// The "brain" of the Knowledge Hook Engine
// Executes SPARQL queries to determine if a hook's logical condition has been met

import { useGraph } from "../composables/graph.mjs";
import { useGraphCache } from "../composables/useGraphCache.mjs";
import { CompositePredicates } from "./CompositePredicates.mjs";
import { ContextEnricher } from "./ContextEnricher.mjs";
import {
  evaluateCONSTRUCT, evaluateDESCRIBE, evaluateFederated,
  evaluateTemporal, evaluateN3Rule,
  evaluateAsync as _evaluateAsync,
  evaluateComposite as _evaluateComposite,
} from "./AdvancedPredicateEvaluators.mjs";

/**
 * Predicate evaluator - core intelligence of the Knowledge Hook Engine
 * Features: SPARQL query execution with caching, 10x+ speedup for repeated predicates
 */
export class PredicateEvaluator {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.enableCache = options.enableCache !== false;
    this.cache = options.cache || (this.enableCache ? useGraphCache({
      maxEntries: 500, maxSize: 50 * 1024 * 1024, ttlMs: 5 * 60 * 1000,
    }) : null);
    this.compositePredicates = new CompositePredicates({
      timeoutMs: options.asyncTimeoutMs || 5000, logger: this.logger,
    });
    this.contextEnricher = new ContextEnricher({
      cwd: options.cwd || process.cwd(), logger: this.logger,
      enableCache: options.enableCache !== false,
    });
    this.asyncTimeoutMs = options.asyncTimeoutMs || 5000;
    this.enableContextEnrichment = options.enableContextEnrichment !== false;
  }

  /**
   * Evaluate a hook's predicate against the current knowledge graph
   */
  async evaluate(hook, currentGraph, previousGraph = null, options = {}) {
    if (options.verbose) {
      this.logger.info(`Evaluating predicate: ${hook.predicateDefinition.type}`);
    }

    try {
      const predicate = hook.predicateDefinition;
      let result = false;
      let context = {};

      if (this.enableContextEnrichment) {
        context = await this.contextEnricher.enrich(context);
      }

      // Result extraction map: { resultKey, contextKey }
      const evalResult = await this._dispatchEvaluation(predicate, currentGraph, previousGraph);
      result = evalResult.result;
      context = evalResult.context;

      if (options.verbose) {
        this.logger.info(`Predicate evaluation result: ${result}`);
      }

      return { result, predicateType: predicate.type, context, timestamp: new Date().toISOString() };
    } catch (error) {
      this.logger.error(`Predicate evaluation failed: ${error.message}`);
      throw new Error(`Predicate evaluation failed: ${error.message}`);
    }
  }

  /** @private Dispatch to the appropriate evaluator based on predicate type */
  async _dispatchEvaluation(predicate, currentGraph, previousGraph) {
    switch (predicate.type) {
      case "resultDelta": {
        const r = await this._evaluateResultDelta(predicate, currentGraph, previousGraph);
        return { result: r.changed, context: r.context };
      }
      case "ask":
        return { result: await this._evaluateASK(predicate, currentGraph), context: { query: predicate.definition.query } };
      case "selectThreshold": {
        const r = await this._evaluateSELECTThreshold(predicate, currentGraph);
        return { result: r.triggered, context: r.context };
      }
      case "shaclAllConform": {
        const r = await this._evaluateSHACL(predicate, currentGraph);
        return { result: r.conforms, context: r.context };
      }
      case "construct": {
        const r = await this._evaluateCONSTRUCT(predicate, currentGraph);
        return { result: r.hasResults, context: r.context };
      }
      case "describe": {
        const r = await this._evaluateDESCRIBE(predicate, currentGraph);
        return { result: r.hasResults, context: r.context };
      }
      case "federated": {
        const r = await this._evaluateFederated(predicate, currentGraph);
        return { result: r.hasResults, context: r.context };
      }
      case "temporal": {
        const r = await this._evaluateTemporal(predicate, currentGraph);
        return { result: r.triggered, context: r.context };
      }
      case "n3Rule": {
        const r = await this._evaluateN3Rule(predicate, currentGraph);
        return { result: r.hasInferences, context: r.context };
      }
      default:
        throw new Error(`Unknown predicate type: ${predicate.type}`);
    }
  }

  /** @private Execute SPARQL query with optional caching */
  async _executeQueryWithCache(query, graph, bindings = {}) {
    if (!this.cache) return graph.query(query);
    const cacheKey = this.cache.getCacheKey(query, bindings);
    let result = this.cache.get(cacheKey);
    if (result) return result;
    result = await graph.query(query);
    this.cache.set(cacheKey, result);
    return result;
  }

  /** @private Evaluate ResultDelta predicate - detects changes in query results */
  async _evaluateResultDelta(predicate, currentGraph, previousGraph) {
    this.logger.info("Evaluating ResultDelta predicate");
    if (!predicate.definition.query) throw new Error("ResultDelta predicate missing query");

    const queryWithPrefixes = this._injectPrefixes(predicate.definition.query, currentGraph);
    const currentResult = await this._executeQueryWithCache(queryWithPrefixes, currentGraph);
    const currentHash = this._hashQueryResult(currentResult);

    let previousHash = null;
    let previousResult = null;
    if (previousGraph) {
      try {
        previousResult = await this._executeQueryWithCache(queryWithPrefixes, previousGraph);
        previousHash = this._hashQueryResult(previousResult);
      } catch (error) {
        this.logger.warn(`Failed to query previous graph: ${error.message}`);
      }
    }

    const changed = currentHash !== previousHash;
    return {
      changed,
      context: {
        query: predicate.definition.query, changed, currentHash, previousHash,
        currentResultSize: this._getResultSize(currentResult),
        previousResultSize: previousHash ? this._getResultSize(previousResult) : 0,
      },
    };
  }

  /** @private Evaluate ASK predicate - boolean condition evaluation */
  async _evaluateASK(predicate, currentGraph) {
    this.logger.info("Evaluating ASK predicate");
    if (!predicate.definition.query) throw new Error("ASK predicate missing query");
    const queryWithPrefixes = this._injectPrefixes(predicate.definition.query, currentGraph);
    const result = await this._executeQueryWithCache(queryWithPrefixes, currentGraph);
    return result.boolean || false;
  }

  /** @private Evaluate SELECTThreshold predicate - numerical threshold monitoring */
  async _evaluateSELECTThreshold(predicate, currentGraph) {
    this.logger.info("Evaluating SELECTThreshold predicate");
    if (!predicate.definition.query) throw new Error("SELECTThreshold predicate missing query");

    const queryWithPrefixes = this._injectPrefixes(predicate.definition.query, currentGraph);
    const result = await this._executeQueryWithCache(queryWithPrefixes, currentGraph);
    const value = this._extractNumericValue(result);
    const threshold = predicate.definition.threshold || 0;
    const operator = predicate.definition.operator || ">";

    const ops = { ">": (a, b) => a > b, ">=": (a, b) => a >= b, "<": (a, b) => a < b, "<=": (a, b) => a <= b, "==": (a, b) => a === b, "!=": (a, b) => a !== b };
    const opFn = ops[operator];
    if (!opFn) throw new Error(`Unknown operator: ${operator}`);

    return {
      triggered: opFn(value, threshold),
      context: { query: predicate.definition.query, value, threshold, operator, resultSize: this._getResultSize(result) },
    };
  }

  /** @private Evaluate SHACL predicate - graph conformance validation */
  async _evaluateSHACL(predicate, currentGraph) {
    this.logger.info("Evaluating SHACL predicate");
    if (!predicate.definition.shapes) throw new Error("SHACL predicate missing shapes definition");

    try {
      const { useSHACLValidator } = await import("../composables/useSHACLValidator.mjs");
      const validator = useSHACLValidator({ logger: this.logger });
      const shapesDefinition = predicate.definition.shapes;
      if (typeof shapesDefinition === "string") await validator.loadShapes(shapesDefinition);
      const result = await validator.validate(currentGraph.store || currentGraph, predicate.definition.shapeIds);
      return {
        conforms: result.conforms,
        context: { shapes: predicate.definition.shapes, violations: result.violations, violationCount: result.violationCount },
      };
    } catch (error) {
      this.logger.warn(`SHACL validation error: ${error.message}`);
      return {
        conforms: false,
        context: { shapes: predicate.definition.shapes, violations: [], violationCount: 0, error: error.message },
      };
    }
  }

  // --- Delegated advanced predicate evaluators ---
  async _evaluateCONSTRUCT(predicate, currentGraph) { return evaluateCONSTRUCT(this, predicate, currentGraph); }
  async _evaluateDESCRIBE(predicate, currentGraph) { return evaluateDESCRIBE(this, predicate, currentGraph); }
  async _evaluateFederated(predicate, currentGraph) { return evaluateFederated(this, predicate, currentGraph); }
  async _evaluateTemporal(predicate, currentGraph) { return evaluateTemporal(this, predicate, currentGraph); }
  async _evaluateN3Rule(predicate, currentGraph) { return evaluateN3Rule(this, predicate, currentGraph); }
  async evaluateAsync(predicateFn, context = {}) { return _evaluateAsync(this, predicateFn, context); }
  async evaluateComposite(operator, predicates, context = {}) { return _evaluateComposite(this, operator, predicates, context); }
  async getEnrichedContext(baseContext = {}) { return await this.contextEnricher.enrich(baseContext); }

  // --- Utility methods ---
  _hashQueryResult(result) {
    if (!result) return null;
    return this._simpleHash(JSON.stringify(result, null, 0));
  }

  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  _getResultSize(result) {
    if (!result) return 0;
    if (result.results) return result.results.length;
    if (result.quads) return result.quads.length;
    if (Array.isArray(result)) return result.length;
    return 1;
  }

  _extractNumericValue(result) {
    if (!result) return 0;
    if (result.results && result.results.length > 0) {
      const values = Object.values(result.results[0]);
      if (values.length > 0 && values[0] && values[0].value) {
        return parseFloat(values[0].value) || 0;
      }
    }
    return 0;
  }

  getEvaluationStats(evaluations) {
    const stats = {
      totalEvaluations: evaluations.length,
      triggeredHooks: evaluations.filter((e) => e.result).length,
      predicateTypes: {},
      averageEvaluationTime: 0,
    };
    for (const evaluation of evaluations) {
      const type = evaluation.predicateType || "unknown";
      stats.predicateTypes[type] = (stats.predicateTypes[type] || 0) + 1;
    }
    const evaluationsWithTime = evaluations.filter((e) => e.evaluationTime);
    if (evaluationsWithTime.length > 0) {
      stats.averageEvaluationTime =
        evaluationsWithTime.reduce((sum, e) => sum + e.evaluationTime, 0) / evaluationsWithTime.length;
    }
    return stats;
  }

  async validatePredicate(predicate) {
    try {
      switch (predicate.type) {
        case "resultDelta":
          if (!predicate.definition.query) throw new Error("ResultDelta predicate missing query");
          break;
        case "ask":
          if (!predicate.definition.query) throw new Error("ASK predicate missing query");
          break;
        case "selectThreshold":
          if (!predicate.definition.query) throw new Error("SELECTThreshold predicate missing query");
          if (predicate.definition.threshold === undefined) throw new Error("SELECTThreshold predicate missing threshold");
          break;
        case "shaclAllConform":
          if (!predicate.definition.shapes) throw new Error("SHACL predicate missing shapes");
          break;
        case "n3Rule":
          if (!predicate.definition.engine) throw new Error("N3Rule predicate missing engine");
          if (!predicate.definition.ruleIds && !predicate.definition.ruleId) throw new Error("N3Rule predicate missing ruleIds or ruleId");
          break;
        default:
          throw new Error(`Unknown predicate type: ${predicate.type}`);
      }
      return true;
    } catch (error) {
      this.logger.warn(`Predicate validation failed: ${error.message}`);
      return false;
    }
  }

  analyzePredicateComplexity(predicate) {
    const analysis = { complexity: "low", estimatedExecutionTime: 100, resourceUsage: "minimal" };
    if (predicate.type === "resultDelta") {
      const c = this._analyzeQueryComplexity(predicate.definition.query || "");
      analysis.complexity = c.complexity;
      analysis.estimatedExecutionTime = c.estimatedTime;
    } else if (predicate.type === "selectThreshold") {
      analysis.complexity = "medium";
      analysis.estimatedExecutionTime = 200;
    } else if (predicate.type === "shaclAllConform") {
      analysis.complexity = "high";
      analysis.estimatedExecutionTime = 500;
    }
    return analysis;
  }

  _analyzeQueryComplexity(query) {
    const complexity = {
      joins: (query.match(/JOIN|UNION/gi) || []).length,
      filters: (query.match(/FILTER/gi) || []).length,
      functions: (query.match(/COUNT|SUM|AVG|MAX|MIN/gi) || []).length,
      subqueries: (query.match(/SELECT.*SELECT/gi) || []).length,
    };
    const total = Object.values(complexity).reduce((sum, val) => sum + val, 0);
    if (total > 10) return { complexity: "high", estimatedTime: 500, details: complexity };
    if (total > 5) return { complexity: "medium", estimatedTime: 200, details: complexity };
    return { complexity: "low", estimatedTime: 100, details: complexity };
  }

  _injectPrefixes(query, currentGraph) {
    if (query.includes("PREFIX ")) return query;
    const prefixes = this._extractPrefixesFromTurtle(currentGraph);
    if (prefixes.length === 0) return query;
    const decls = prefixes.map((p) => `PREFIX ${p.name}: <${p.uri}>`).join("\n");
    return `${decls}\n\n${query}`;
  }

  _extractPrefixesFromTurtle(currentGraph) {
    const prefixes = [];
    try {
      const quads = currentGraph.store.getQuads();
      const commonPrefixes = [
        { name: "rdf", uri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#" },
        { name: "rdfs", uri: "http://www.w3.org/2000/01/rdf-schema#" },
        { name: "owl", uri: "http://www.w3.org/2002/07/owl#" },
        { name: "xsd", uri: "http://www.w3.org/2001/XMLSchema#" },
        { name: "dct", uri: "http://purl.org/dc/terms/" },
        { name: "gv", uri: "https://gitvan.dev/ontology#" },
        { name: "gh", uri: "https://gitvan.dev/graph-hook#" },
        { name: "op", uri: "https://gitvan.dev/op#" },
        { name: "ex", uri: "http://example.org/" },
      ];
      for (const prefix of commonPrefixes) {
        if (quads.some((q) =>
          q.subject.value.startsWith(prefix.uri) ||
          q.predicate.value.startsWith(prefix.uri) ||
          q.object.value.startsWith(prefix.uri)
        )) {
          prefixes.push(prefix);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to extract prefixes: ${error.message}`);
    }
    return prefixes;
  }
}
