/**
 * @fileoverview GitVan v3.2.0 — Git Event Capture
 *
 * This module captures git lifecycle events from 10 different git hooks
 * and stores them as RDF triples using PROV-O ontology. Events are captured
 * in real-time as git operations occur and persisted to the knowledge substrate.
 *
 * Key Features:
 * - Captures 10 git lifecycle events (pre-commit, post-commit, etc.)
 * - Stores events as RDF triples using PROV-O vocabulary
 * - Integrates with unrdf KnowledgeSubstrateCore
 * - Provides structured event data with complete provenance
 * - Supports error handling and diagnostic data capture
 * - Thread-safe event capture with locking
 *
 * @version 3.2.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import { execSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { createKnowledgeSubstrateCore, namedNode, literal, quad } from "../lib/unrdf-loader.mjs";

// Git event types mapping to hook names
const GIT_EVENT_TYPES = {
  "pre-commit": "PreCommitEvent",
  "post-commit": "PostCommitEvent",
  "prepare-commit-msg": "PrepareCommitMsgEvent",
  "commit-msg": "CommitMsgEvent",
  "pre-push": "PrePushEvent",
  "post-push": "PostPushEvent",
  "post-checkout": "PostCheckoutEvent",
  "post-merge": "PostMergeEvent",
  "post-rewrite": "PostRewriteEvent",
  "post-update": "PostUpdateEvent",
};

// RDF namespace constants
const GITV = "https://gitvan.dev/ontology/git#";
const PROV = "http://www.w3.org/ns/prov#";
const XSD = "http://www.w3.org/2001/XMLSchema#";
const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";

/**
 * Git Event Capture System
 *
 * Captures git lifecycle events and stores them as RDF triples in the knowledge substrate.
 * This class provides thread-safe event capture with comprehensive error handling and
 * diagnostic data collection.
 *
 * @class GitEventCapture
 */
export class GitEventCapture {
  /**
   * Create GitEventCapture instance
   *
   * @constructor
   * @param {Object} [options={}] - Configuration options
   * @param {string} [options.cwd=process.cwd()] - Working directory (git repository root)
   * @param {Object} [options.logger=console] - Logger instance
   * @param {Object} [options.core] - Existing KnowledgeSubstrateCore instance
   * @param {boolean} [options.enableObservability=true] - Enable OpenTelemetry tracing
   * @param {boolean} [options.captureEnvironment=true] - Capture environment variables
   * @param {boolean} [options.captureDiagnostics=true] - Capture diagnostic data
   */
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.logger = options.logger || console;
    this.core = options.core || null;
    this.enableObservability = options.enableObservability ?? true;
    this.captureEnvironment = options.captureEnvironment ?? true;
    this.captureDiagnostics = options.captureDiagnostics ?? true;
    this.initialized = false;
  }

  /**
   * Initialize the event capture system
   * Creates KnowledgeSubstrateCore if not provided
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
      if (!this.core) {
        this.core = await createKnowledgeSubstrateCore({
          enableObservability: this.enableObservability,
          enableKnowledgeHookManager: true,
          enableTransactionManager: true,
        });
      }

      this.initialized = true;
      this.logger.info("✅ GitEventCapture initialized");
    } catch (error) {
      this.logger.error("❌ GitEventCapture initialization failed:", error);
      throw new Error(`Failed to initialize GitEventCapture: ${error.message}`);
    }
  }

  /**
   * Capture a git lifecycle event
   *
   * @async
   * @param {string} eventType - Git hook name (e.g., 'pre-commit', 'post-commit')
   * @param {Object} [eventData={}] - Additional event data
   * @param {number} [eventData.exitCode=0] - Process exit code
   * @param {number} [eventData.duration] - Event duration in milliseconds
   * @param {string} [eventData.commitHash] - Git commit hash
   * @param {string} [eventData.commitMessage] - Commit message
   * @param {Array<string>} [eventData.stagedFiles] - List of staged files
   * @param {string} [eventData.branchName] - Current branch name
   * @param {string} [eventData.previousBranch] - Previous branch (for checkout)
   * @param {string} [eventData.remoteName] - Remote name (for push)
   * @param {Array<string>} [eventData.pushedRefs] - Pushed references
   * @param {Object} [eventData.error] - Error object if hook failed
   * @returns {Promise<Object>} Event capture result with event URI and quads added
   * @throws {Error} If event capture fails
   */
  async captureEvent(eventType, eventData = {}) {
    await this.initialize();

    const startTime = performance.now();
    const timestamp = new Date().toISOString();
    const eventId = this._generateEventId(eventType, timestamp);
    const eventUri = `${GITV}event/${eventId}`;

    try {
      this.logger.debug(`📸 Capturing ${eventType} event: ${eventId}`);

      // Start transaction for atomic event capture
      await this.core.transactionManager?.beginTransaction();

      try {
        // Create event quads
        const quads = this._createEventQuads(
          eventUri,
          eventType,
          timestamp,
          eventData
        );

        // Add quads to store
        for (const q of quads) {
          this.core.store.add(q);
        }

        // Commit transaction
        await this.core.transactionManager?.commitTransaction();

        const duration = performance.now() - startTime;
        this.logger.info(
          `✅ Captured ${eventType} event (${quads.length} quads, ${duration.toFixed(2)}ms)`
        );

        return {
          success: true,
          eventId,
          eventUri,
          eventType,
          timestamp,
          quadsAdded: quads.length,
          duration,
        };
      } catch (error) {
        // Rollback transaction on error
        await this.core.transactionManager?.rollbackTransaction();
        throw error;
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logger.error(
        `❌ Failed to capture ${eventType} event:`,
        error
      );

      return {
        success: false,
        eventId,
        eventUri,
        eventType,
        timestamp,
        error: error.message,
        duration,
      };
    }
  }

  /**
   * Capture pre-commit event
   * Fired before commit is created, can prevent commit if validation fails
   *
   * @async
   * @param {Object} [data={}] - Event data
   * @returns {Promise<Object>} Event capture result
   */
  async capturePreCommit(data = {}) {
    const eventData = {
      ...data,
      stagedFiles: data.stagedFiles || this._getStagedFiles(),
      branchName: data.branchName || this._getCurrentBranch(),
    };
    return this.captureEvent("pre-commit", eventData);
  }

  /**
   * Capture post-commit event
   * Fired after commit is successfully created
   *
   * @async
   * @param {Object} [data={}] - Event data
   * @returns {Promise<Object>} Event capture result
   */
  async capturePostCommit(data = {}) {
    const eventData = {
      ...data,
      commitHash: data.commitHash || this._getLatestCommitHash(),
      commitMessage: data.commitMessage || this._getLatestCommitMessage(),
      branchName: data.branchName || this._getCurrentBranch(),
      filesChanged: data.filesChanged || this._getFilesChangedCount(),
      linesAdded: data.linesAdded,
      linesDeleted: data.linesDeleted,
    };
    return this.captureEvent("post-commit", eventData);
  }

  /**
   * Capture prepare-commit-msg event
   * Fired to prepare or modify commit message before user edits
   *
   * @async
   * @param {Object} [data={}] - Event data
   * @returns {Promise<Object>} Event capture result
   */
  async capturePrepareCommitMsg(data = {}) {
    const eventData = {
      ...data,
      branchName: data.branchName || this._getCurrentBranch(),
      commitMessage: data.commitMessage,
    };
    return this.captureEvent("prepare-commit-msg", eventData);
  }

  /**
   * Capture commit-msg event
   * Fired after commit message is entered, used for validation
   *
   * @async
   * @param {Object} [data={}] - Event data
   * @returns {Promise<Object>} Event capture result
   */
  async captureCommitMsg(data = {}) {
    const eventData = {
      ...data,
      commitMessage: data.commitMessage,
      branchName: data.branchName || this._getCurrentBranch(),
    };
    return this.captureEvent("commit-msg", eventData);
  }

  /**
   * Capture pre-push event
   * Fired before commits are pushed to remote
   *
   * @async
   * @param {Object} [data={}] - Event data
   * @returns {Promise<Object>} Event capture result
   */
  async capturePrePush(data = {}) {
    const eventData = {
      ...data,
      remoteName: data.remoteName || "origin",
      branchName: data.branchName || this._getCurrentBranch(),
      pushedRefs: data.pushedRefs || [],
    };
    return this.captureEvent("pre-push", eventData);
  }

  /**
   * Capture post-push event
   * Fired after commits are successfully pushed to remote
   *
   * @async
   * @param {Object} [data={}] - Event data
   * @returns {Promise<Object>} Event capture result
   */
  async capturePostPush(data = {}) {
    const eventData = {
      ...data,
      remoteName: data.remoteName || "origin",
      branchName: data.branchName || this._getCurrentBranch(),
      pushedRefs: data.pushedRefs || [],
    };
    return this.captureEvent("post-push", eventData);
  }

  /**
   * Capture post-checkout event
   * Fired after checkout operation (branch switch or file checkout)
   *
   * @async
   * @param {Object} [data={}] - Event data
   * @returns {Promise<Object>} Event capture result
   */
  async capturePostCheckout(data = {}) {
    const eventData = {
      ...data,
      branchName: data.branchName || this._getCurrentBranch(),
      previousBranch: data.previousBranch,
    };
    return this.captureEvent("post-checkout", eventData);
  }

  /**
   * Capture post-merge event
   * Fired after successful merge operation
   *
   * @async
   * @param {Object} [data={}] - Event data
   * @returns {Promise<Object>} Event capture result
   */
  async capturePostMerge(data = {}) {
    const eventData = {
      ...data,
      branchName: data.branchName || this._getCurrentBranch(),
      filesChanged: data.filesChanged || this._getFilesChangedCount(),
    };
    return this.captureEvent("post-merge", eventData);
  }

  /**
   * Capture post-rewrite event
   * Fired after commits are rewritten (rebase, amend, filter-branch)
   *
   * @async
   * @param {Object} [data={}] - Event data
   * @returns {Promise<Object>} Event capture result
   */
  async capturePostRewrite(data = {}) {
    const eventData = {
      ...data,
      branchName: data.branchName || this._getCurrentBranch(),
      rewriteType: data.rewriteType || "unknown",
    };
    return this.captureEvent("post-rewrite", eventData);
  }

  /**
   * Capture post-update event (server-side)
   * Fired after refs are updated on remote
   *
   * @async
   * @param {Object} [data={}] - Event data
   * @returns {Promise<Object>} Event capture result
   */
  async capturePostUpdate(data = {}) {
    const eventData = {
      ...data,
      updatedRefs: data.updatedRefs || [],
    };
    return this.captureEvent("post-update", eventData);
  }

  /**
   * Create RDF quads for a git event
   *
   * @private
   * @param {string} eventUri - Event URI
   * @param {string} eventType - Git hook name
   * @param {string} timestamp - ISO 8601 timestamp
   * @param {Object} eventData - Event data
   * @returns {Array<Object>} Array of RDF quads
   */
  _createEventQuads(eventUri, eventType, timestamp, eventData) {
    const quads = [];
    const eventNode = namedNode(eventUri);
    const eventClass = GIT_EVENT_TYPES[eventType] || "GitEvent";

    // Event type declaration
    quads.push(
      quad(
        eventNode,
        namedNode(RDF + "type"),
        namedNode(GITV + eventClass)
      )
    );

    // Event type string
    quads.push(
      quad(
        eventNode,
        namedNode(GITV + "eventType"),
        literal(eventType)
      )
    );

    // Timestamp (PROV-O atTime)
    quads.push(
      quad(
        eventNode,
        namedNode(PROV + "atTime"),
        literal(timestamp, namedNode(XSD + "dateTime"))
      )
    );

    // Exit code
    quads.push(
      quad(
        eventNode,
        namedNode(GITV + "exitCode"),
        literal(String(eventData.exitCode ?? 0), namedNode(XSD + "integer"))
      )
    );

    // Duration
    if (eventData.duration !== undefined) {
      quads.push(
        quad(
          eventNode,
          namedNode(GITV + "duration"),
          literal(String(eventData.duration), namedNode(XSD + "decimal"))
        )
      );
    }

    // Commit information
    if (eventData.commitHash) {
      quads.push(
        quad(
          eventNode,
          namedNode(GITV + "commitHash"),
          literal(eventData.commitHash)
        )
      );
    }
    if (eventData.commitMessage) {
      quads.push(
        quad(
          eventNode,
          namedNode(GITV + "commitMessage"),
          literal(eventData.commitMessage)
        )
      );
    }

    // Branch information
    if (eventData.branchName) {
      quads.push(
        quad(
          eventNode,
          namedNode(GITV + "branchName"),
          literal(eventData.branchName)
        )
      );
    }
    if (eventData.previousBranch) {
      quads.push(
        quad(
          eventNode,
          namedNode(GITV + "previousBranch"),
          literal(eventData.previousBranch)
        )
      );
    }

    // File and change statistics
    if (eventData.filesChanged !== undefined) {
      quads.push(
        quad(
          eventNode,
          namedNode(GITV + "filesChanged"),
          literal(String(eventData.filesChanged), namedNode(XSD + "integer"))
        )
      );
    }
    if (eventData.linesAdded !== undefined) {
      quads.push(
        quad(
          eventNode,
          namedNode(GITV + "linesAdded"),
          literal(String(eventData.linesAdded), namedNode(XSD + "integer"))
        )
      );
    }
    if (eventData.linesDeleted !== undefined) {
      quads.push(
        quad(
          eventNode,
          namedNode(GITV + "linesDeleted"),
          literal(String(eventData.linesDeleted), namedNode(XSD + "integer"))
        )
      );
    }

    // Staged files (as JSON array)
    if (eventData.stagedFiles && eventData.stagedFiles.length > 0) {
      quads.push(
        quad(
          eventNode,
          namedNode(GITV + "stagedFiles"),
          literal(JSON.stringify(eventData.stagedFiles))
        )
      );
    }

    // Remote information
    if (eventData.remoteName) {
      quads.push(
        quad(
          eventNode,
          namedNode(GITV + "remoteName"),
          literal(eventData.remoteName)
        )
      );
    }
    if (eventData.pushedRefs && eventData.pushedRefs.length > 0) {
      quads.push(
        quad(
          eventNode,
          namedNode(GITV + "pushedRefs"),
          literal(JSON.stringify(eventData.pushedRefs))
        )
      );
    }

    // Error information
    if (eventData.error) {
      quads.push(
        quad(
          eventNode,
          namedNode(GITV + "errorMessage"),
          literal(eventData.error.message || String(eventData.error))
        )
      );
      if (eventData.error.stack) {
        quads.push(
          quad(
            eventNode,
            namedNode(GITV + "stackTrace"),
            literal(eventData.error.stack)
          )
        );
      }
    }

    // Environment variables (if enabled)
    if (this.captureEnvironment && eventData.environmentVars) {
      quads.push(
        quad(
          eventNode,
          namedNode(GITV + "environmentVars"),
          literal(JSON.stringify(eventData.environmentVars))
        )
      );
    }

    // Diagnostic data (if enabled)
    if (this.captureDiagnostics && eventData.diagnosticData) {
      quads.push(
        quad(
          eventNode,
          namedNode(GITV + "diagnosticData"),
          literal(JSON.stringify(eventData.diagnosticData))
        )
      );
    }

    // Retention policy (default: detail for 90 days)
    const retentionPolicy = eventData.retentionPolicy || "detail";
    quads.push(
      quad(
        eventNode,
        namedNode(GITV + "retentionPolicy"),
        literal(retentionPolicy)
      )
    );

    // Expiration date (90 days for detail, 1 year for aggregate)
    const expirationDays = retentionPolicy === "detail" ? 90 : 365;
    const expiresAt = new Date(
      Date.now() + expirationDays * 24 * 60 * 60 * 1000
    ).toISOString();
    quads.push(
      quad(
        eventNode,
        namedNode(GITV + "expiresAt"),
        literal(expiresAt, namedNode(XSD + "dateTime"))
      )
    );

    return quads;
  }

  /**
   * Generate unique event ID
   *
   * @private
   * @param {string} eventType - Event type
   * @param {string} timestamp - ISO timestamp
   * @returns {string} Event ID
   */
  _generateEventId(eventType, timestamp) {
    const randomPart = Math.random().toString(36).substring(2, 10);
    const timestampPart = timestamp.replace(/[^0-9]/g, "").substring(0, 14);
    return `${eventType}-${timestampPart}-${randomPart}`;
  }

  /**
   * Get currently staged files
   *
   * @private
   * @returns {Array<string>} Array of staged file paths
   */
  _getStagedFiles() {
    try {
      const output = execSync("git diff --cached --name-only", {
        cwd: this.cwd,
        encoding: "utf8",
      });
      return output.trim().split("\n").filter(Boolean);
    } catch (error) {
      this.logger.warn("Failed to get staged files:", error.message);
      return [];
    }
  }

  /**
   * Get current branch name
   *
   * @private
   * @returns {string} Branch name
   */
  _getCurrentBranch() {
    try {
      return execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: this.cwd,
        encoding: "utf8",
      }).trim();
    } catch (error) {
      this.logger.warn("Failed to get current branch:", error.message);
      return "unknown";
    }
  }

  /**
   * Get latest commit hash
   *
   * @private
   * @returns {string} Commit hash
   */
  _getLatestCommitHash() {
    try {
      return execSync("git rev-parse HEAD", {
        cwd: this.cwd,
        encoding: "utf8",
      }).trim();
    } catch (error) {
      this.logger.warn("Failed to get commit hash:", error.message);
      return "unknown";
    }
  }

  /**
   * Get latest commit message
   *
   * @private
   * @returns {string} Commit message
   */
  _getLatestCommitMessage() {
    try {
      return execSync("git log -1 --pretty=%B", {
        cwd: this.cwd,
        encoding: "utf8",
      }).trim();
    } catch (error) {
      this.logger.warn("Failed to get commit message:", error.message);
      return "unknown";
    }
  }

  /**
   * Get count of files changed in last commit
   *
   * @private
   * @returns {number} Number of files changed
   */
  _getFilesChangedCount() {
    try {
      const output = execSync("git diff --name-only HEAD~1 HEAD", {
        cwd: this.cwd,
        encoding: "utf8",
      });
      return output.trim().split("\n").filter(Boolean).length;
    } catch (error) {
      this.logger.warn("Failed to get files changed count:", error.message);
      return 0;
    }
  }

  /**
   * Get statistics about captured events
   *
   * @async
   * @returns {Promise<Object>} Event statistics
   */
  async getStats() {
    await this.initialize();

    const store = this.core.store;
    const totalEvents = store.countQuads(
      null,
      namedNode(RDF + "type"),
      null,
      null
    );

    const stats = {
      totalEvents,
      initialized: this.initialized,
      storeSize: store.size,
      eventTypes: {},
    };

    // Count events by type
    for (const [hookName, className] of Object.entries(GIT_EVENT_TYPES)) {
      const count = store.countQuads(
        null,
        namedNode(RDF + "type"),
        namedNode(GITV + className),
        null
      );
      if (count > 0) {
        stats.eventTypes[hookName] = count;
      }
    }

    return stats;
  }

  /**
   * Cleanup resources
   *
   * @async
   * @returns {Promise<void>}
   */
  async cleanup() {
    if (this.core && this.core.transactionManager) {
      await this.core.transactionManager.rollbackTransaction?.();
    }
    this.initialized = false;
    this.logger.info("🧹 GitEventCapture cleaned up");
  }
}
