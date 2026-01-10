/**
 * @fileoverview GitVan Composite Predicates
 *
 * Provides logical operators for combining multiple predicates:
 * - AND: All predicates must be true (short-circuit on first false)
 * - OR: Any predicate must be true (short-circuit on first true)
 * - NOT: Negates a predicate
 * - VOTE: Multiple predicates scored by weight
 *
 * All operators support async predicates with timeout handling.
 *
 * @version 1.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

/**
 * Composite predicate operators for logical combinations
 *
 * @class CompositePredicates
 */
export class CompositePredicates {
  /**
   * Create composite predicates instance
   * @param {Object} options - Configuration options
   * @param {number} [options.timeoutMs=5000] - Async timeout in milliseconds
   * @param {Object} [options.logger=console] - Logger instance
   */
  constructor(options = {}) {
    this.timeoutMs = options.timeoutMs || 5000;
    this.logger = options.logger || console;
  }

  /**
   * AND operator - all predicates must be true
   * Short-circuits on first false result
   * Executes predicates sequentially for deterministic behavior
   *
   * @async
   * @param {Array<Function>} predicates - Array of predicate functions
   * @param {Object} context - Evaluation context
   * @returns {Promise<Object>} Result with boolean and details
   */
  async AND(predicates, context) {
    if (!Array.isArray(predicates) || predicates.length === 0) {
      return {
        result: true,
        operator: "AND",
        evaluatedCount: 0,
        details: "No predicates to evaluate",
      };
    }

    const results = [];
    let allTrue = true;

    for (let i = 0; i < predicates.length; i++) {
      const predicate = predicates[i];
      try {
        const result = await this._executeWithTimeout(predicate, context);
        results.push({
          index: i,
          result,
          success: true,
        });

        if (!result) {
          allTrue = false;
          // Short-circuit: stop evaluating if any predicate is false
          break;
        }
      } catch (error) {
        results.push({
          index: i,
          result: false,
          success: false,
          error: error.message,
        });
        allTrue = false;
        // Short-circuit on error
        break;
      }
    }

    return {
      result: allTrue,
      operator: "AND",
      evaluatedCount: results.length,
      results: results,
      shortCircuited: results.length < predicates.length,
    };
  }

  /**
   * OR operator - any predicate must be true
   * Short-circuits on first true result
   * Executes predicates sequentially for deterministic behavior
   *
   * @async
   * @param {Array<Function>} predicates - Array of predicate functions
   * @param {Object} context - Evaluation context
   * @returns {Promise<Object>} Result with boolean and details
   */
  async OR(predicates, context) {
    if (!Array.isArray(predicates) || predicates.length === 0) {
      return {
        result: false,
        operator: "OR",
        evaluatedCount: 0,
        details: "No predicates to evaluate",
      };
    }

    const results = [];
    let anyTrue = false;

    for (let i = 0; i < predicates.length; i++) {
      const predicate = predicates[i];
      try {
        const result = await this._executeWithTimeout(predicate, context);
        results.push({
          index: i,
          result,
          success: true,
        });

        if (result) {
          anyTrue = true;
          // Short-circuit: stop evaluating if any predicate is true
          break;
        }
      } catch (error) {
        results.push({
          index: i,
          result: false,
          success: false,
          error: error.message,
        });
        // Continue on error for OR
      }
    }

    return {
      result: anyTrue,
      operator: "OR",
      evaluatedCount: results.length,
      results: results,
      shortCircuited: results.length < predicates.length,
    };
  }

  /**
   * NOT operator - negates a single predicate
   *
   * @async
   * @param {Function} predicate - Predicate function to negate
   * @param {Object} context - Evaluation context
   * @returns {Promise<Object>} Negated result
   */
  async NOT(predicate, context) {
    try {
      const result = await this._executeWithTimeout(predicate, context);
      return {
        result: !result,
        operator: "NOT",
        originalResult: result,
        success: true,
      };
    } catch (error) {
      return {
        result: true, // Fail open: NOT of error is true
        operator: "NOT",
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * VOTE operator - weighted scoring of multiple predicates
   * A predicate passes if its weighted score exceeds threshold
   *
   * @async
   * @param {Array<Object>} predicates - Array of {predicate, weight} objects
   * @param {Object} context - Evaluation context
   * @param {number} [threshold=0.5] - Score threshold (0-1)
   * @returns {Promise<Object>} Voting result with scores
   */
  async VOTE(predicates, context, threshold = 0.5) {
    if (!Array.isArray(predicates) || predicates.length === 0) {
      return {
        result: false,
        operator: "VOTE",
        score: 0,
        threshold,
        details: "No predicates to evaluate",
      };
    }

    let totalWeight = 0;
    let weightedScore = 0;
    const votes = [];

    for (let i = 0; i < predicates.length; i++) {
      const { predicate, weight = 1 } = predicates[i];
      totalWeight += weight;

      try {
        const result = await this._executeWithTimeout(predicate, context);
        if (result) {
          weightedScore += weight;
        }
        votes.push({
          index: i,
          result,
          weight,
          success: true,
        });
      } catch (error) {
        votes.push({
          index: i,
          result: false,
          weight,
          success: false,
          error: error.message,
        });
      }
    }

    const normalizedScore =
      totalWeight > 0 ? weightedScore / totalWeight : 0;
    const result = normalizedScore >= threshold;

    return {
      result,
      operator: "VOTE",
      score: normalizedScore,
      threshold,
      weightedScore,
      totalWeight,
      votes,
    };
  }

  /**
   * Execute a predicate with timeout protection
   * @private
   * @async
   * @param {Function} predicate - Predicate function
   * @param {Object} context - Evaluation context
   * @returns {Promise<boolean>} Predicate result
   * @throws {Error} If predicate times out or fails
   */
  async _executeWithTimeout(predicate, context) {
    if (typeof predicate !== "function") {
      throw new Error("Predicate must be a function");
    }

    return Promise.race([
      Promise.resolve(predicate(context)),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Predicate timeout after ${this.timeoutMs}ms`)),
          this.timeoutMs
        )
      ),
    ]);
  }

  /**
   * Combine multiple composite results with AND logic
   * Useful for chaining composite operations
   *
   * @async
   * @param {Array<Promise>} compositeResults - Promises returning composite results
   * @param {Object} context - Evaluation context
   * @returns {Promise<Object>} Combined result
   */
  async combineResults(compositeResults, context) {
    if (!Array.isArray(compositeResults) || compositeResults.length === 0) {
      return {
        result: true,
        operator: "COMBINE",
        combinedCount: 0,
      };
    }

    const results = [];
    let allTrue = true;

    for (const compositePromise of compositeResults) {
      try {
        const result = await Promise.race([
          compositePromise,
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    `Composite timeout after ${this.timeoutMs}ms`
                  )
                ),
              this.timeoutMs
            )
          ),
        ]);
        results.push(result);
        if (!result.result) {
          allTrue = false;
        }
      } catch (error) {
        results.push({
          result: false,
          error: error.message,
        });
        allTrue = false;
      }
    }

    return {
      result: allTrue,
      operator: "COMBINE",
      combinedCount: results.length,
      results: results,
    };
  }
}

/**
 * Create default composite predicates instance
 * @param {Object} options - Configuration options
 * @returns {CompositePredicates} Composite predicates instance
 */
export function createCompositePredicates(options = {}) {
  return new CompositePredicates(options);
}

/**
 * Default composite predicates instance
 */
export const compositePredicates = createCompositePredicates();
