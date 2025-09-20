// Query/Graph Algebra Implementation
// Implements: T(s,p,o), Join/projection/selection, Aggregation, Predicates

import { useLog } from "../composables/log.mjs";

const logger = useLog("QueryGraphAlgebra");

/**
 * Query/Graph Algebra implementation
 * Base relation T(s,p,o) from K_t
 * Join/projection/selection: Q_t = π_A σ_θ (T⋈T⋈⋯)
 * Aggregation: γ_{g;f}(Q_t)
 */
export class QueryGraphAlgebra {
  constructor(knowledgeSubstrate, options = {}) {
    this.knowledgeSubstrate = knowledgeSubstrate;
    this.logger = options.logger || logger;
    this.queryCache = new Map();
    this.predicateCache = new Map();
  }

  /**
   * Base relation T(s,p,o) from K_t
   */
  baseRelation(
    subject = null,
    predicate = null,
    object = null,
    timestamp = null
  ) {
    const cacheKey = `base:${subject}|${predicate}|${object}|${timestamp}`;

    if (this.queryCache.has(cacheKey)) {
      return this.queryCache.get(cacheKey);
    }

    const results = this.knowledgeSubstrate.query(
      subject,
      predicate,
      object,
      timestamp
    );
    this.queryCache.set(cacheKey, results);

    return results;
  }

  /**
   * Join operation: T₁ ⋈ T₂
   */
  join(relation1, relation2, joinCondition) {
    const results = [];

    for (const t1 of relation1) {
      for (const t2 of relation2) {
        if (joinCondition(t1, t2)) {
          results.push({ ...t1, ...t2 });
        }
      }
    }

    this.logger.info(
      `🔗 Join operation: ${relation1.length} × ${relation2.length} → ${results.length}`
    );
    return results;
  }

  /**
   * Projection: π_A(Q_t)
   */
  project(relation, attributes) {
    const results = relation.map((triple) => {
      const projected = {};
      for (const attr of attributes) {
        if (triple[attr] !== undefined) {
          projected[attr] = triple[attr];
        }
      }
      return projected;
    });

    this.logger.info(
      `📊 Projection: ${relation.length} → ${results.length} (${attributes.join(
        ", "
      )})`
    );
    return results;
  }

  /**
   * Selection: σ_θ(Q_t)
   */
  select(relation, condition) {
    const results = relation.filter((triple) => condition(triple));

    this.logger.info(`🔍 Selection: ${relation.length} → ${results.length}`);
    return results;
  }

  /**
   * Aggregation: γ_{g;f}(Q_t)
   */
  aggregate(relation, groupBy, aggregateFunction) {
    const groups = new Map();

    for (const triple of relation) {
      const key = groupBy(triple);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(triple);
    }

    const results = [];
    for (const [key, group] of groups) {
      results.push({
        group: key,
        aggregate: aggregateFunction(group),
        count: group.length,
      });
    }

    this.logger.info(
      `📈 Aggregation: ${relation.length} → ${results.length} groups`
    );
    return results;
  }

  /**
   * Complex query: Q_t = π_A σ_θ (T⋈T⋈⋯)
   */
  complexQuery(steps) {
    let currentRelation = [];

    for (const step of steps) {
      switch (step.type) {
        case "base":
          currentRelation = this.baseRelation(
            step.subject,
            step.predicate,
            step.object,
            step.timestamp
          );
          break;

        case "join":
          currentRelation = this.join(
            currentRelation,
            step.relation,
            step.condition
          );
          break;

        case "project":
          currentRelation = this.project(currentRelation, step.attributes);
          break;

        case "select":
          currentRelation = this.select(currentRelation, step.condition);
          break;

        case "aggregate":
          currentRelation = this.aggregate(
            currentRelation,
            step.groupBy,
            step.aggregateFunction
          );
          break;

        default:
          this.logger.warn(`⚠️ Unknown query step type: ${step.type}`);
      }
    }

    return currentRelation;
  }
}

/**
 * Predicate implementations
 * ASK: φ_ask(K_t) = 1{∃x∈Q_t}
 * Threshold: φ_≥(K_t) = 1{|Q_t|≥τ}
 * ResultDelta: φ_Δ(K_t) = 1{Q_t≠Q_{t^-}}
 * SHACL-all-conform: φ_shape(K_t) = ∏_{c∈C} 1{c(K_t)=true}
 */
export class PredicateEngine {
  constructor(queryAlgebra, options = {}) {
    this.queryAlgebra = queryAlgebra;
    this.logger = options.logger || logger;
    this.previousResults = new Map();
    this.predicateCache = new Map();
  }

  /**
   * ASK predicate: φ_ask(K_t) = 1{∃x∈Q_t}
   * Returns true if query has any results
   */
  ask(query, timestamp = null) {
    const cacheKey = `ask:${JSON.stringify(query)}|${timestamp}`;

    if (this.predicateCache.has(cacheKey)) {
      return this.predicateCache.get(cacheKey);
    }

    const results = this.queryAlgebra.complexQuery(query);
    const result = results.length > 0;

    this.predicateCache.set(cacheKey, result);
    this.logger.info(
      `❓ ASK predicate: ${result ? "TRUE" : "FALSE"} (${
        results.length
      } results)`
    );

    return result;
  }

  /**
   * Threshold predicate: φ_≥(K_t) = 1{|Q_t|≥τ}
   * Returns true if query has at least threshold results
   */
  threshold(query, threshold, timestamp = null) {
    const cacheKey = `threshold:${JSON.stringify(
      query
    )}|${threshold}|${timestamp}`;

    if (this.predicateCache.has(cacheKey)) {
      return this.predicateCache.get(cacheKey);
    }

    const results = this.queryAlgebra.complexQuery(query);
    const result = results.length >= threshold;

    this.predicateCache.set(cacheKey, result);
    this.logger.info(
      `📊 Threshold predicate: ${result ? "TRUE" : "FALSE"} (${
        results.length
      }/${threshold})`
    );

    return result;
  }

  /**
   * ResultDelta predicate: φ_Δ(K_t) = 1{Q_t≠Q_{t^-}}
   * Returns true if query results changed since last evaluation
   */
  resultDelta(query, timestamp = null) {
    const cacheKey = `delta:${JSON.stringify(query)}`;
    const currentResults = this.queryAlgebra.complexQuery(query);
    const previousResults = this.previousResults.get(cacheKey) || [];

    // Compare results (simple string comparison for now)
    const currentStr = JSON.stringify(currentResults.sort());
    const previousStr = JSON.stringify(previousResults.sort());
    const result = currentStr !== previousStr;

    // Update previous results
    this.previousResults.set(cacheKey, [...currentResults]);

    this.logger.info(
      `🔄 ResultDelta predicate: ${result ? "TRUE" : "FALSE"} (${
        currentResults.length
      } results)`
    );

    return result;
  }

  /**
   * SHACL-all-conform predicate: φ_shape(K_t) = ∏_{c∈C} 1{c(K_t)=true}
   * Returns true if all shape constraints are satisfied
   */
  shaclAllConform(constraints, timestamp = null) {
    const cacheKey = `shacl:${JSON.stringify(constraints)}|${timestamp}`;

    if (this.predicateCache.has(cacheKey)) {
      return this.predicateCache.get(cacheKey);
    }

    let allConform = true;
    const results = [];

    for (const constraint of constraints) {
      const conforms = this.evaluateConstraint(constraint, timestamp);
      results.push({ constraint: constraint.name, conforms });

      if (!conforms) {
        allConform = false;
      }
    }

    this.predicateCache.set(cacheKey, allConform);
    this.logger.info(
      `🔒 SHACL predicate: ${allConform ? "TRUE" : "FALSE"} (${
        results.length
      } constraints)`
    );

    return allConform;
  }

  /**
   * Evaluate individual constraint
   */
  evaluateConstraint(constraint, timestamp = null) {
    switch (constraint.type) {
      case "minCount":
        const minResults = this.queryAlgebra.baseRelation(
          constraint.subject,
          constraint.predicate,
          null,
          timestamp
        );
        return minResults.length >= constraint.minCount;

      case "maxCount":
        const maxResults = this.queryAlgebra.baseRelation(
          constraint.subject,
          constraint.predicate,
          null,
          timestamp
        );
        return maxResults.length <= constraint.maxCount;

      case "hasValue":
        const hasValueResults = this.queryAlgebra.baseRelation(
          constraint.subject,
          constraint.predicate,
          constraint.value,
          timestamp
        );
        return hasValueResults.length > 0;

      case "datatype":
        const datatypeResults = this.queryAlgebra.baseRelation(
          constraint.subject,
          constraint.predicate,
          null,
          timestamp
        );
        return datatypeResults.every((triple) =>
          this.isValidDatatype(triple.object, constraint.datatype)
        );

      default:
        this.logger.warn(`⚠️ Unknown constraint type: ${constraint.type}`);
        return false;
    }
  }

  /**
   * Check if value matches datatype
   */
  isValidDatatype(value, datatype) {
    switch (datatype) {
      case "xsd:string":
        return typeof value === "string";
      case "xsd:integer":
        return Number.isInteger(parseInt(value));
      case "xsd:float":
        return !isNaN(parseFloat(value));
      case "xsd:boolean":
        return value === "true" || value === "false";
      case "xsd:dateTime":
        return !isNaN(Date.parse(value));
      default:
        return true; // Unknown datatype, assume valid
    }
  }

  /**
   * Composite predicate: Combine multiple predicates with logical operators
   */
  composite(predicates, operator = "AND") {
    const results = predicates.map((pred) => pred());

    switch (operator.toUpperCase()) {
      case "AND":
        return results.every((result) => result);
      case "OR":
        return results.some((result) => result);
      case "NOT":
        return !results[0];
      default:
        this.logger.warn(`⚠️ Unknown operator: ${operator}`);
        return false;
    }
  }

  /**
   * Clear predicate cache
   */
  clearCache() {
    this.predicateCache.clear();
    this.previousResults.clear();
    this.logger.info(`🧹 Cleared predicate cache`);
  }

  /**
   * Get predicate statistics
   */
  getStats() {
    return {
      cacheSize: this.predicateCache.size,
      previousResultsSize: this.previousResults.size,
      queryCacheSize: this.queryAlgebra.queryCache.size,
    };
  }
}
