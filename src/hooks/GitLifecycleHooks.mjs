/**
 * @fileoverview GitVan v3.2.0 — Git Lifecycle Hooks Evaluator
 *
 * This module evaluates knowledge hooks when git lifecycle events occur.
 * It integrates GitEventCapture, GitEventStore, and HookOrchestrator to provide
 * a complete git-native knowledge hook system.
 *
 * Key Features:
 * - Automatic hook evaluation on git events
 * - Integration with existing HookOrchestrator
 * - Event-driven workflow execution
 * - SPARQL predicates for git event queries
 * - Real-time hook triggering based on git operations
 * - Complete provenance tracking via PROV-O
 *
 * @version 3.2.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import { GitEventCapture } from "../git-lifecycle/GitEventCapture.mjs";
import { GitEventStore } from "../git-lifecycle/GitEventStore.mjs";
import { HookOrchestrator } from "./HookOrchestrator.mjs";

/**
 * Git Lifecycle Hooks Evaluator
 *
 * Evaluates knowledge hooks when git lifecycle events occur.
 * Bridges git operations with the knowledge hook system.
 *
 * @class GitLifecycleHooks
 */
export class GitLifecycleHooks {
  /**
   * Create GitLifecycleHooks instance
   *
   * @constructor
   * @param {Object} [options={}] - Configuration options
   * @param {string} [options.cwd=process.cwd()] - Working directory
   * @param {string} [options.graphDir="./hooks"] - Directory containing hook definitions
   * @param {string} [options.storePath] - Path to persist event data
   * @param {Object} [options.logger=console] - Logger instance
   * @param {Object} [options.core] - Existing KnowledgeSubstrateCore instance
   * @param {boolean} [options.enableObservability=true] - Enable OpenTelemetry tracing
   * @param {boolean} [options.captureEvents=true] - Capture events in store
   * @param {boolean} [options.evaluateHooks=true] - Evaluate hooks on events
   */
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.graphDir = options.graphDir || "./hooks";
    this.logger = options.logger || console;
    this.enableObservability = options.enableObservability ?? true;
    this.captureEvents = options.captureEvents ?? true;
    this.evaluateHooks = options.evaluateHooks ?? true;

    // Initialize components
    this.eventCapture = new GitEventCapture({
      cwd: this.cwd,
      logger: this.logger,
      core: options.core,
      enableObservability: this.enableObservability,
    });

    this.eventStore = new GitEventStore({
      storePath: options.storePath,
      logger: this.logger,
      core: options.core,
      enableObservability: this.enableObservability,
    });

    this.hookOrchestrator = new HookOrchestrator({
      graphDir: this.graphDir,
      cwd: this.cwd,
      logger: this.logger,
    });

    this.initialized = false;
  }

  /**
   * Initialize the git lifecycle hooks system
   *
   * @async
   * @returns {Promise<void>}
   * @throws {Error} If initialization fails
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      this.logger.info("🔧 Initializing GitLifecycleHooks...");

      // Initialize all components
      await Promise.all([
        this.eventCapture.initialize(),
        this.eventStore.initialize(),
      ]);

      this.initialized = true;
      this.logger.info("✅ GitLifecycleHooks initialized");
    } catch (error) {
      this.logger.error("❌ GitLifecycleHooks initialization failed:", error);
      throw new Error(
        `Failed to initialize GitLifecycleHooks: ${error.message}`
      );
    }
  }

  /**
   * Handle a git lifecycle event
   * Captures event, stores it, and evaluates hooks
   *
   * @async
   * @param {string} eventType - Git hook name (e.g., 'pre-commit', 'post-commit')
   * @param {Object} [eventData={}] - Event data
   * @param {Object} [options={}] - Processing options
   * @param {boolean} [options.captureOnly=false] - Only capture event, don't evaluate hooks
   * @param {boolean} [options.dryRun=false] - Dry run mode
   * @returns {Promise<Object>} Processing result
   * @throws {Error} If event handling fails
   */
  async handleGitEvent(eventType, eventData = {}, options = {}) {
    await this.initialize();

    const startTime = performance.now();
    const result = {
      eventType,
      captured: false,
      hooksEvaluated: false,
      hookResults: null,
      error: null,
    };

    try {
      this.logger.info(`🎯 Handling ${eventType} event`);

      // Step 1: Capture the event
      if (this.captureEvents) {
        const captureResult = await this._captureEvent(eventType, eventData);
        result.captured = captureResult.success;
        result.captureResult = captureResult;

        if (!captureResult.success) {
          throw new Error(
            `Event capture failed: ${captureResult.error}`
          );
        }
      }

      // Step 2: Evaluate hooks (unless captureOnly mode)
      if (this.evaluateHooks && !options.captureOnly) {
        const hookResults = await this._evaluateHooks(
          eventType,
          eventData,
          options
        );
        result.hooksEvaluated = true;
        result.hookResults = hookResults;
      }

      const duration = performance.now() - startTime;
      result.duration = duration;
      result.success = true;

      this.logger.info(
        `✅ ${eventType} event handled (${duration.toFixed(2)}ms)`
      );

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      result.duration = duration;
      result.success = false;
      result.error = error.message;

      this.logger.error(`❌ Failed to handle ${eventType} event:`, error);

      return result;
    }
  }

  /**
   * Handle pre-commit event
   *
   * @async
   * @param {Object} [data={}] - Event data
   * @param {Object} [options={}] - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async handlePreCommit(data = {}, options = {}) {
    return this.handleGitEvent("pre-commit", data, options);
  }

  /**
   * Handle post-commit event
   *
   * @async
   * @param {Object} [data={}] - Event data
   * @param {Object} [options={}] - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async handlePostCommit(data = {}, options = {}) {
    return this.handleGitEvent("post-commit", data, options);
  }

  /**
   * Handle prepare-commit-msg event
   *
   * @async
   * @param {Object} [data={}] - Event data
   * @param {Object} [options={}] - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async handlePrepareCommitMsg(data = {}, options = {}) {
    return this.handleGitEvent("prepare-commit-msg", data, options);
  }

  /**
   * Handle commit-msg event
   *
   * @async
   * @param {Object} [data={}] - Event data
   * @param {Object} [options={}] - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async handleCommitMsg(data = {}, options = {}) {
    return this.handleGitEvent("commit-msg", data, options);
  }

  /**
   * Handle pre-push event
   *
   * @async
   * @param {Object} [data={}] - Event data
   * @param {Object} [options={}] - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async handlePrePush(data = {}, options = {}) {
    return this.handleGitEvent("pre-push", data, options);
  }

  /**
   * Handle post-push event
   *
   * @async
   * @param {Object} [data={}] - Event data
   * @param {Object} [options={}] - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async handlePostPush(data = {}, options = {}) {
    return this.handleGitEvent("post-push", data, options);
  }

  /**
   * Handle post-checkout event
   *
   * @async
   * @param {Object} [data={}] - Event data
   * @param {Object} [options={}] - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async handlePostCheckout(data = {}, options = {}) {
    return this.handleGitEvent("post-checkout", data, options);
  }

  /**
   * Handle post-merge event
   *
   * @async
   * @param {Object} [data={}] - Event data
   * @param {Object} [options={}] - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async handlePostMerge(data = {}, options = {}) {
    return this.handleGitEvent("post-merge", data, options);
  }

  /**
   * Handle post-rewrite event
   *
   * @async
   * @param {Object} [data={}] - Event data
   * @param {Object} [options={}] - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async handlePostRewrite(data = {}, options = {}) {
    return this.handleGitEvent("post-rewrite", data, options);
  }

  /**
   * Handle post-update event
   *
   * @async
   * @param {Object} [data={}] - Event data
   * @param {Object} [options={}] - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async handlePostUpdate(data = {}, options = {}) {
    return this.handleGitEvent("post-update", data, options);
  }

  /**
   * Capture git event
   *
   * @private
   * @async
   * @param {string} eventType - Event type
   * @param {Object} eventData - Event data
   * @returns {Promise<Object>} Capture result
   */
  async _captureEvent(eventType, eventData) {
    try {
      // Use specialized capture methods based on event type
      switch (eventType) {
        case "pre-commit":
          return await this.eventCapture.capturePreCommit(eventData);
        case "post-commit":
          return await this.eventCapture.capturePostCommit(eventData);
        case "prepare-commit-msg":
          return await this.eventCapture.capturePrepareCommitMsg(eventData);
        case "commit-msg":
          return await this.eventCapture.captureCommitMsg(eventData);
        case "pre-push":
          return await this.eventCapture.capturePrePush(eventData);
        case "post-push":
          return await this.eventCapture.capturePostPush(eventData);
        case "post-checkout":
          return await this.eventCapture.capturePostCheckout(eventData);
        case "post-merge":
          return await this.eventCapture.capturePostMerge(eventData);
        case "post-rewrite":
          return await this.eventCapture.capturePostRewrite(eventData);
        case "post-update":
          return await this.eventCapture.capturePostUpdate(eventData);
        default:
          return await this.eventCapture.captureEvent(eventType, eventData);
      }
    } catch (error) {
      this.logger.error(`Failed to capture ${eventType} event:`, error);
      throw error;
    }
  }

  /**
   * Evaluate hooks for git event
   *
   * @private
   * @async
   * @param {string} eventType - Event type
   * @param {Object} eventData - Event data
   * @param {Object} options - Evaluation options
   * @returns {Promise<Object>} Hook evaluation results
   */
  async _evaluateHooks(eventType, eventData, options) {
    try {
      // Create evaluation context with git event data
      const evaluationContext = {
        gitEvent: {
          type: eventType,
          ...eventData,
        },
        timestamp: new Date().toISOString(),
        cwd: this.cwd,
      };

      // Evaluate all hooks with the git event context
      const hookResults = await this.hookOrchestrator.evaluate({
        ...options,
        context: evaluationContext,
      });

      return hookResults;
    } catch (error) {
      this.logger.error(
        `Failed to evaluate hooks for ${eventType}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Query events using SPARQL
   *
   * @async
   * @param {string} query - SPARQL query
   * @returns {Promise<Array<Object>>} Query results
   */
  async queryEvents(query) {
    await this.initialize();
    return this.eventStore.query(query);
  }

  /**
   * Get events by type
   *
   * @async
   * @param {string} eventType - Event type
   * @param {Object} [options={}] - Query options
   * @returns {Promise<Array<Object>>} Events
   */
  async getEventsByType(eventType, options = {}) {
    await this.initialize();
    return this.eventStore.getEventsByType(eventType, options);
  }

  /**
   * Get events by date range
   *
   * @async
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} [options={}] - Query options
   * @returns {Promise<Array<Object>>} Events
   */
  async getEventsByDateRange(startDate, endDate, options = {}) {
    await this.initialize();
    return this.eventStore.getEventsByDateRange(startDate, endDate, options);
  }

  /**
   * Get events by branch
   *
   * @async
   * @param {string} branchName - Branch name
   * @param {Object} [options={}] - Query options
   * @returns {Promise<Array<Object>>} Events
   */
  async getEventsByBranch(branchName, options = {}) {
    await this.initialize();
    return this.eventStore.getEventsByBranch(branchName, options);
  }

  /**
   * Get statistics
   *
   * @async
   * @returns {Promise<Object>} Statistics
   */
  async getStats() {
    await this.initialize();

    const [eventCaptureStats, eventStoreStats, hookOrchestratorStats] =
      await Promise.all([
        this.eventCapture.getStats(),
        this.eventStore.getStats(),
        this.hookOrchestrator.getStats(),
      ]);

    return {
      eventCapture: eventCaptureStats,
      eventStore: eventStoreStats,
      hookOrchestrator: hookOrchestratorStats,
    };
  }

  /**
   * Enforce retention policies
   *
   * @async
   * @param {Object} [options={}] - Retention options
   * @returns {Promise<Object>} Retention result
   */
  async enforceRetention(options = {}) {
    await this.initialize();
    return this.eventStore.enforceRetention(options);
  }

  /**
   * Persist event store
   *
   * @async
   * @returns {Promise<Object>} Persistence result
   */
  async persist() {
    await this.initialize();
    return this.eventStore.persist();
  }

  /**
   * Cleanup resources
   *
   * @async
   * @returns {Promise<void>}
   */
  async cleanup() {
    await Promise.all([
      this.eventCapture.cleanup(),
      this.eventStore.cleanup(),
    ]);

    this.initialized = false;
    this.logger.info("🧹 GitLifecycleHooks cleaned up");
  }
}
