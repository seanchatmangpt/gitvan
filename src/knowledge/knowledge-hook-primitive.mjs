// Knowledge Hook Primitive Implementation
// Implements: Hook h=(e,φ,a), Trigger times T_e={t: E_e(t)=1}
// Execution rule: t∈T_e ∧ φ(K_t)=1 ⇒ x_{t^+}=a(x_t,K_t)

import { useLog } from "../composables/log.mjs";

const logger = useLog("KnowledgeHookPrimitive");

/**
 * Knowledge Hook Primitive: h=(e,φ,a)
 * Hook h=(e,φ,a) where:
 * - e: event type
 * - φ: predicate function
 * - a: action function
 */
export class KnowledgeHook {
  constructor(eventType, predicate, action, options = {}) {
    this.eventType = eventType; // e
    this.predicate = predicate; // φ
    this.action = action; // a
    this.logger = options.logger || logger;
    this.enabled = options.enabled !== false;
    this.executionCount = 0;
    this.lastExecution = null;
    this.executionHistory = [];
    this.id = options.id || `hook_${eventType}_${Date.now()}`;
  }

  /**
   * Execute hook: t∈T_e ∧ φ(K_t)=1 ⇒ x_{t^+}=a(x_t,K_t)
   */
  async execute(event, knowledgeState, currentState = {}) {
    if (!this.enabled) {
      this.logger.info(`🔗 Hook ${this.id} disabled, skipping execution`);
      return { executed: false, reason: "disabled" };
    }

    const timestamp = event.timestamp || Date.now();

    try {
      // Check predicate: φ(K_t)=1
      const predicateResult = await this.evaluatePredicate(
        knowledgeState,
        timestamp
      );

      if (!predicateResult) {
        this.logger.info(
          `🔗 Hook ${this.id} predicate false, skipping execution`
        );
        return { executed: false, reason: "predicate_false" };
      }

      // Execute action: x_{t^+}=a(x_t,K_t)
      const actionResult = await this.executeAction(
        currentState,
        knowledgeState,
        event
      );

      // Update execution tracking
      this.executionCount++;
      this.lastExecution = timestamp;
      this.executionHistory.push({
        timestamp: timestamp,
        event: event,
        predicateResult: predicateResult,
        actionResult: actionResult,
        success: true,
      });

      this.logger.info(
        `🔗 Hook ${this.id} executed successfully (count: ${this.executionCount})`
      );

      return {
        executed: true,
        actionResult: actionResult,
        executionCount: this.executionCount,
      };
    } catch (error) {
      this.logger.error(
        `❌ Hook ${this.id} execution failed: ${error.message}`
      );

      this.executionHistory.push({
        timestamp: timestamp,
        event: event,
        predicateResult: false,
        actionResult: null,
        success: false,
        error: error.message,
      });

      return {
        executed: false,
        reason: "error",
        error: error.message,
      };
    }
  }

  /**
   * Evaluate predicate: φ(K_t)
   */
  async evaluatePredicate(knowledgeState, timestamp) {
    try {
      if (typeof this.predicate === "function") {
        return await this.predicate(knowledgeState, timestamp);
      } else if (typeof this.predicate === "object" && this.predicate.type) {
        return await this.evaluatePredicateObject(
          this.predicate,
          knowledgeState,
          timestamp
        );
      } else {
        this.logger.warn(`⚠️ Invalid predicate type for hook ${this.id}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`❌ Predicate evaluation error: ${error.message}`);
      return false;
    }
  }

  /**
   * Evaluate predicate object
   */
  async evaluatePredicateObject(predicateObj, knowledgeState, timestamp) {
    switch (predicateObj.type) {
      case "ask":
        return this.evaluateAskPredicate(
          predicateObj,
          knowledgeState,
          timestamp
        );

      case "threshold":
        return this.evaluateThresholdPredicate(
          predicateObj,
          knowledgeState,
          timestamp
        );

      case "resultDelta":
        return this.evaluateResultDeltaPredicate(
          predicateObj,
          knowledgeState,
          timestamp
        );

      case "shacl":
        return this.evaluateShaclPredicate(
          predicateObj,
          knowledgeState,
          timestamp
        );

      case "composite":
        return this.evaluateCompositePredicate(
          predicateObj,
          knowledgeState,
          timestamp
        );

      default:
        this.logger.warn(`⚠️ Unknown predicate type: ${predicateObj.type}`);
        return false;
    }
  }

  /**
   * Evaluate ASK predicate: φ_ask(K_t) = 1{∃x∈Q_t}
   */
  evaluateAskPredicate(predicateObj, knowledgeState, timestamp) {
    const query = predicateObj.query;
    const results = knowledgeState.query(
      query.subject,
      query.predicate,
      query.object,
      timestamp
    );
    return results.length > 0;
  }

  /**
   * Evaluate Threshold predicate: φ_≥(K_t) = 1{|Q_t|≥τ}
   */
  evaluateThresholdPredicate(predicateObj, knowledgeState, timestamp) {
    const query = predicateObj.query;
    const threshold = predicateObj.threshold;
    const results = knowledgeState.query(
      query.subject,
      query.predicate,
      query.object,
      timestamp
    );
    return results.length >= threshold;
  }

  /**
   * Evaluate ResultDelta predicate: φ_Δ(K_t) = 1{Q_t≠Q_{t^-}}
   */
  evaluateResultDeltaPredicate(predicateObj, knowledgeState, timestamp) {
    const query = predicateObj.query;
    const currentResults = knowledgeState.query(
      query.subject,
      query.predicate,
      query.object,
      timestamp
    );

    // Get previous results from execution history
    const previousExecution =
      this.executionHistory[this.executionHistory.length - 1];
    const previousResults = previousExecution
      ? knowledgeState.query(
          query.subject,
          query.predicate,
          query.object,
          previousExecution.timestamp
        )
      : [];

    // Compare results
    const currentStr = JSON.stringify(currentResults.sort());
    const previousStr = JSON.stringify(previousResults.sort());

    return currentStr !== previousStr;
  }

  /**
   * Evaluate SHACL predicate: φ_shape(K_t) = ∏_{c∈C} 1{c(K_t)=true}
   */
  evaluateShaclPredicate(predicateObj, knowledgeState, timestamp) {
    const constraints = predicateObj.constraints;

    for (const constraint of constraints) {
      if (!this.evaluateConstraint(constraint, knowledgeState, timestamp)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate individual constraint
   */
  evaluateConstraint(constraint, knowledgeState, timestamp) {
    switch (constraint.type) {
      case "minCount":
        const minResults = knowledgeState.query(
          constraint.subject,
          constraint.predicate,
          null,
          timestamp
        );
        return minResults.length >= constraint.minCount;

      case "maxCount":
        const maxResults = knowledgeState.query(
          constraint.subject,
          constraint.predicate,
          null,
          timestamp
        );
        return maxResults.length <= constraint.maxCount;

      case "hasValue":
        const hasValueResults = knowledgeState.query(
          constraint.subject,
          constraint.predicate,
          constraint.value,
          timestamp
        );
        return hasValueResults.length > 0;

      default:
        this.logger.warn(`⚠️ Unknown constraint type: ${constraint.type}`);
        return false;
    }
  }

  /**
   * Evaluate Composite predicate
   */
  evaluateCompositePredicate(predicateObj, knowledgeState, timestamp) {
    const predicates = predicateObj.predicates;
    const operator = predicateObj.operator || "AND";

    const results = predicates.map((pred) =>
      this.evaluatePredicateObject(pred, knowledgeState, timestamp)
    );

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
   * Execute action: a(x_t,K_t)
   */
  async executeAction(currentState, knowledgeState, event) {
    try {
      if (typeof this.action === "function") {
        return await this.action(currentState, knowledgeState, event);
      } else if (typeof this.action === "object" && this.action.type) {
        return await this.executeActionObject(
          this.action,
          currentState,
          knowledgeState,
          event
        );
      } else {
        this.logger.warn(`⚠️ Invalid action type for hook ${this.id}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`❌ Action execution error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute action object
   */
  async executeActionObject(actionObj, currentState, knowledgeState, event) {
    switch (actionObj.type) {
      case "addTriple":
        return knowledgeState.addTriple(
          actionObj.subject,
          actionObj.predicate,
          actionObj.object,
          event.timestamp
        );

      case "removeTriple":
        return knowledgeState.removeTriple(
          actionObj.subject,
          actionObj.predicate,
          actionObj.object,
          event.timestamp
        );

      case "updateState":
        return this.updateState(actionObj, currentState, knowledgeState, event);

      case "log":
        this.logger.info(`📝 Action log: ${actionObj.message}`);
        return { logged: true, message: actionObj.message };

      case "composite":
        return this.executeCompositeAction(
          actionObj,
          currentState,
          knowledgeState,
          event
        );

      default:
        this.logger.warn(`⚠️ Unknown action type: ${actionObj.type}`);
        return null;
    }
  }

  /**
   * Update state
   */
  updateState(actionObj, currentState, knowledgeState, event) {
    const updates = actionObj.updates || {};
    const newState = { ...currentState, ...updates };

    // Add state update to knowledge base
    for (const [key, value] of Object.entries(updates)) {
      knowledgeState.addTriple(
        `state:${event.timestamp}`,
        `state:${key}`,
        typeof value === "object" ? JSON.stringify(value) : value.toString(),
        event.timestamp
      );
    }

    return newState;
  }

  /**
   * Execute composite action
   */
  async executeCompositeAction(actionObj, currentState, knowledgeState, event) {
    const actions = actionObj.actions || [];
    const results = [];

    for (const action of actions) {
      const result = await this.executeActionObject(
        action,
        currentState,
        knowledgeState,
        event
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Enable/disable hook
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    this.logger.info(`🔗 Hook ${this.id} ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Get hook statistics
   */
  getStats() {
    return {
      id: this.id,
      eventType: this.eventType,
      enabled: this.enabled,
      executionCount: this.executionCount,
      lastExecution: this.lastExecution,
      executionHistory: this.executionHistory.length,
      successRate:
        this.executionHistory.length > 0
          ? this.executionHistory.filter((h) => h.success).length /
            this.executionHistory.length
          : 0,
    };
  }

  /**
   * Get execution history
   */
  getExecutionHistory() {
    return [...this.executionHistory];
  }

  /**
   * Clear execution history
   */
  clearHistory() {
    this.executionHistory = [];
    this.executionCount = 0;
    this.lastExecution = null;
    this.logger.info(`🧹 Cleared execution history for hook ${this.id}`);
  }
}
