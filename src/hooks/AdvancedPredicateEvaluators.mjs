// src/hooks/AdvancedPredicateEvaluators.mjs
// Advanced predicate evaluation: CONSTRUCT, DESCRIBE, Federated, Temporal, N3Rule
// Plus async evaluation with timeout and composite predicate support (AND/OR/NOT/VOTE)

/**
 * Evaluate CONSTRUCT predicate - builds knowledge graphs dynamically
 * @param {object} evaluator - PredicateEvaluator instance (provides logger, _injectPrefixes, _executeQueryWithCache)
 * @param {object} predicate
 * @param {object} currentGraph
 * @returns {Promise<object>}
 */
export async function evaluateCONSTRUCT(evaluator, predicate, currentGraph) {
  evaluator.logger.info("Evaluating CONSTRUCT predicate");

  try {
    const query = predicate.definition.query;
    const queryWithPrefixes = evaluator._injectPrefixes(query, currentGraph);

    const results = await evaluator._executeQueryWithCache(queryWithPrefixes, {
      queryType: "construct",
    });

    const hasResults = results && results.length > 0;
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
    evaluator.logger.error(`CONSTRUCT evaluation failed: ${error.message}`);
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
 */
export async function evaluateDESCRIBE(evaluator, predicate, currentGraph) {
  evaluator.logger.info("Evaluating DESCRIBE predicate");

  try {
    const query = predicate.definition.query;
    const queryWithPrefixes = evaluator._injectPrefixes(query, currentGraph);

    const results = await evaluator._executeQueryWithCache(queryWithPrefixes, {
      queryType: "describe",
    });

    const hasResults = results && results.length > 0;
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
    evaluator.logger.error(`DESCRIBE evaluation failed: ${error.message}`);
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
 */
export async function evaluateFederated(evaluator, predicate, currentGraph) {
  evaluator.logger.info("Evaluating Federated predicate");

  try {
    const query = predicate.definition.query;
    const queryWithPrefixes = evaluator._injectPrefixes(query, currentGraph);
    const endpoints = predicate.definition.endpoints || [];

    const federatedResults = [];

    for (const endpoint of endpoints) {
      try {
        const endpointResults = await evaluator._executeQueryWithCache(queryWithPrefixes, {
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
        evaluator.logger.warn(
          `Federated query failed for ${endpoint.url}: ${error.message}`
        );
        federatedResults.push({
          endpoint: endpoint.url,
          results: [],
          success: false,
          error: error.message,
        });
      }
    }

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
    evaluator.logger.error(`Federated evaluation failed: ${error.message}`);
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
 */
export async function evaluateTemporal(evaluator, predicate, currentGraph) {
  evaluator.logger.info("Evaluating Temporal predicate");

  try {
    const query = predicate.definition.query;
    const timeCondition = predicate.definition.timeCondition;
    const timeWindow = predicate.definition.timeWindow || 3600000;
    const queryWithPrefixes = evaluator._injectPrefixes(query, currentGraph);

    const now = new Date();
    const timeWindowStart = new Date(now.getTime() - timeWindow);

    const results = await evaluator._executeQueryWithCache(queryWithPrefixes, {
      queryType: "temporal",
      timeCondition,
      timeWindow: {
        start: timeWindowStart,
        end: now,
      },
    });

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
    evaluator.logger.error(`Temporal evaluation failed: ${error.message}`);
    return {
      triggered: false,
      context: {
        query: predicate.definition.query,
        error: error.message,
      },
    };
  }
}

/**
 * Evaluate N3Rule predicate - forward-chaining inference
 */
export async function evaluateN3Rule(evaluator, predicate, currentGraph) {
  evaluator.logger.info("Evaluating N3Rule predicate");

  try {
    if (!predicate.definition.engine) {
      throw new Error("N3Rule predicate missing engine");
    }

    const engine = predicate.definition.engine;
    const store = predicate.definition.store || currentGraph.store;
    const ruleIds = predicate.definition.ruleIds || [predicate.definition.ruleId];

    if (!ruleIds || ruleIds.length === 0) {
      throw new Error("N3Rule predicate missing ruleIds or ruleId");
    }

    const inferred = await engine.executeRules(store, {
      ruleIds: ruleIds,
      maxIterations: predicate.definition.maxIterations || 10,
    });

    const hasInferences = inferred && inferred.length > 0;

    return {
      hasInferences: hasInferences,
      context: {
        ruleIds: ruleIds,
        inferredCount: inferred.length,
        inferred: inferred,
      },
    };
  } catch (error) {
    evaluator.logger.error(`N3Rule evaluation failed: ${error.message}`);
    return {
      hasInferences: false,
      context: {
        error: error.message,
      },
    };
  }
}

/**
 * Evaluate async predicate with timeout protection
 * @param {object} evaluator - PredicateEvaluator instance
 * @param {Function} predicateFn - Predicate function (sync or async)
 * @param {object} context - Evaluation context with Git metadata
 * @returns {Promise<object>} Evaluation result
 */
export async function evaluateAsync(evaluator, predicateFn, context = {}) {
  if (typeof predicateFn !== "function") {
    throw new Error("Predicate must be a function");
  }

  try {
    let enrichedContext = context;
    if (evaluator.enableContextEnrichment && !context.gitMetadata) {
      enrichedContext = await evaluator.contextEnricher.enrich(context);
    }

    const result = await Promise.race([
      Promise.resolve(predicateFn(enrichedContext)),
      new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(`Async predicate timeout after ${evaluator.asyncTimeoutMs}ms`)
            ),
          evaluator.asyncTimeoutMs
        )
      ),
    ]);

    return {
      result: !!result,
      success: true,
      context: enrichedContext,
    };
  } catch (error) {
    evaluator.logger.error(`Async predicate evaluation failed: ${error.message}`);
    return {
      result: false,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Evaluate composite predicate (AND/OR/NOT/VOTE)
 * @param {object} evaluator - PredicateEvaluator instance
 * @param {string} operator - Operator type (AND, OR, NOT, VOTE)
 * @param {Array|Function} predicates - Predicates to combine
 * @param {object} context - Evaluation context
 * @returns {Promise<object>} Composite evaluation result
 */
export async function evaluateComposite(evaluator, operator, predicates, context = {}) {
  let enrichedContext = context;
  if (evaluator.enableContextEnrichment && !context.gitMetadata) {
    enrichedContext = await evaluator.contextEnricher.enrich(context);
  }

  switch (operator.toUpperCase()) {
    case "AND":
      return await evaluator.compositePredicates.AND(predicates, enrichedContext);
    case "OR":
      return await evaluator.compositePredicates.OR(predicates, enrichedContext);
    case "NOT":
      if (typeof predicates === "function") {
        return await evaluator.compositePredicates.NOT(predicates, enrichedContext);
      }
      throw new Error("NOT operator requires a single predicate function");
    case "VOTE":
      if (Array.isArray(predicates)) {
        return await evaluator.compositePredicates.VOTE(
          predicates,
          enrichedContext,
          0.5
        );
      }
      throw new Error("VOTE operator requires an array of weighted predicates");
    default:
      throw new Error(`Unknown composite operator: ${operator}`);
  }
}
