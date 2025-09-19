/**
 * GitVan Hookable Integration - Knowledge Hook Signal Layer
 *
 * This creates surgical precision for AI swarms by:
 * 1. Only scanning what actually changed (not entire repo)
 * 2. Using Git hooks as signals for Knowledge Hook evaluation
 * 3. Providing change-only context to Knowledge Hook system
 * 4. Eliminating the need for full repository scans
 */

import { createHooks } from "hookable";
import { useGit } from "../composables/git.mjs";
import { useUnrouting } from "../composables/unrouting.mjs";
import { HookOrchestrator } from "../hooks/HookOrchestrator.mjs";
import { withGitVan } from "./context.mjs";

/**
 * GitVan Hookable System - Knowledge Hook Signal Layer
 *
 * Two-Layer Architecture Principles:
 * - Git hooks provide signals (when to evaluate)
 * - Knowledge Hooks provide intelligence (what to evaluate with SPARQL)
 * - Only process what changed (not entire repo)
 * - Change-only context for Knowledge Hook system
 */
export class GitVanHookable {
  constructor() {
    this.hooks = createHooks();
    this.changeCache = new Map();
    this.eventQueue = [];
    this.isProcessing = false;
    this.knowledgeHookOrchestrator = null;

    // Register Git signal hooks
    this.registerGitSignalHooks();
  }

  /**
   * Register Git signal hooks that trigger Knowledge Hook evaluation
   */
  registerGitSignalHooks() {
    // Pre-commit: Signal for code quality validation
    this.hooks.hook("pre-commit", async (context) => {
      return await this.processGitSignal("pre-commit", context);
    });

    // Post-commit: Signal for code analysis
    this.hooks.hook("post-commit", async (context) => {
      return await this.processGitSignal("post-commit", context);
    });

    // Pre-push: Signal for security validation
    this.hooks.hook("pre-push", async (context) => {
      return await this.processGitSignal("pre-push", context);
    });

    // Post-merge: Signal for integration validation
    this.hooks.hook("post-merge", async (context) => {
      return await this.processGitSignal("post-merge", context);
    });

    // Post-checkout: Signal for environment validation
    this.hooks.hook("post-checkout", async (context) => {
      return await this.processGitSignal("post-checkout", context);
    });
  }

  /**
   * Process Git signal and trigger Knowledge Hook evaluation
   * Two-layer architecture: Git signal → Knowledge Hook intelligence
   */
  async processGitSignal(signalType, context) {
    console.log(`🔍 GitVan: Processing Git signal '${signalType}' for Knowledge Hook evaluation`);

    return await withGitVan({ cwd: context.cwd }, async () => {
      const git = useGit();
      const unrouting = useUnrouting();

      // Extract Git context for the signal
      const gitContext = await this.extractGitContext(signalType, context, git);
      
      // Initialize Knowledge Hook Orchestrator if not already done
      if (!this.knowledgeHookOrchestrator) {
        this.knowledgeHookOrchestrator = new HookOrchestrator({
          graphDir: "./hooks",
          context: { cwd: context.cwd },
          logger: console,
        });
      }

      console.log(`   📡 Git Signal: ${signalType}`);
      console.log(`   📁 Changed files: ${gitContext.changedFiles.length}`);
      console.log(`   🎯 Branch: ${gitContext.branch}`);
      console.log(`   📝 Commit: ${gitContext.commitSha?.substring(0, 8) || 'N/A'}`);

      if (gitContext.changedFiles.length === 0) {
        console.log("   ✅ No changes to process");
        return { processed: 0, changes: [], knowledgeHooksTriggered: 0 };
      }

      // Cache the changes for Knowledge Hook context
      this.cacheChanges(gitContext.changedFiles, signalType);

      // Evaluate Knowledge Hooks with Git context
      const evaluationResult = await this.knowledgeHookOrchestrator.evaluate({
        gitSignal: signalType,
        gitContext: gitContext,
        verbose: true,
      });

      console.log(`   🧠 Knowledge Hooks evaluated: ${evaluationResult.hooksEvaluated}`);
      console.log(`   ⚡ Knowledge Hooks triggered: ${evaluationResult.hooksTriggered}`);
      console.log(`   🔄 Workflows executed: ${evaluationResult.workflowsExecuted}`);

      return {
        processed: gitContext.changedFiles.length,
        changes: gitContext.changedFiles,
        knowledgeHooksTriggered: evaluationResult.hooksTriggered,
        evaluationResult: evaluationResult,
      };
    });
  }

  /**
   * Extract Git context for Knowledge Hook evaluation
   */
  async extractGitContext(signalType, context, git) {
    const gitContext = {
      signalType,
      branch: await git.currentBranch(),
      commitSha: null,
      changedFiles: [],
      timestamp: Date.now(),
    };

    try {
      switch (signalType) {
        case "pre-commit":
          // Get staged files
          const stagedDiff = await git.diff({ cached: true, nameOnly: true });
          gitContext.changedFiles = stagedDiff.split("\n").filter((f) => f.trim());
          break;

        case "post-commit":
          // Get last commit SHA and changed files
          gitContext.commitSha = await git.headSha();
          const commitDiff = await git.diff({
            from: "HEAD~1",
            to: "HEAD",
            nameOnly: true,
          });
          gitContext.changedFiles = commitDiff.split("\n").filter((f) => f.trim());
          break;

        case "pre-push":
          // Get push changes
          const pushDiff = await git.diff({
            from: `${context.remote}/${context.branch}`,
            to: "HEAD",
            nameOnly: true,
          });
          gitContext.changedFiles = pushDiff.split("\n").filter((f) => f.trim());
          break;

        case "post-merge":
          // Get merged changes
          gitContext.commitSha = await git.headSha();
          const mergeDiff = await git.diff({
            from: "HEAD~1",
            to: "HEAD",
            nameOnly: true,
          });
          gitContext.changedFiles = mergeDiff.split("\n").filter((f) => f.trim());
          break;

        case "post-checkout":
          // Get checkout changes
          const checkoutDiff = await git.diff({
            from: context.prevHead,
            to: context.newHead,
            nameOnly: true,
          });
          gitContext.changedFiles = checkoutDiff.split("\n").filter((f) => f.trim());
          break;

        default:
          console.warn(`   ⚠️ Unknown signal type: ${signalType}`);
      }
    } catch (error) {
      console.warn(`   ⚠️ Error extracting Git context for ${signalType}:`, error.message);
    }

    return gitContext;
  }

  /**
   * Cache changes for Knowledge Hook context
   */
  cacheChanges(changedFiles, signalType) {
    for (const file of changedFiles) {
      const changeKey = `${signalType}:${file}:${Date.now()}`;
      this.changeCache.set(changeKey, {
        file,
        signalType,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Call GitVan hookable system
   */
  async callHook(hookName, context = {}) {
    try {
      const result = await this.hooks.callHook(hookName, context);
      return result;
    } catch (error) {
      console.error(`❌ GitVan Hookable Error in ${hookName}:`, error.message);
      throw error;
    }
  }

  /**
   * Get change cache for Knowledge Hook context
   */
  getChangeCache() {
    return {
      changes: Array.from(this.changeCache.values()),
      summary: {
        totalChanges: this.changeCache.size,
        changeTypes: this.getChangeTypeSummary(),
        lastProcessed: this.getLastProcessedTime(),
      },
    };
  }

  /**
   * Get change type summary
   */
  getChangeTypeSummary() {
    const summary = {};
    for (const change of this.changeCache.values()) {
      const type = change.signalType;
      summary[type] = (summary[type] || 0) + 1;
    }
    return summary;
  }

  /**
   * Get last processed time
   */
  getLastProcessedTime() {
    const times = Array.from(this.changeCache.values()).map((c) => c.timestamp);
    return Math.max(...times, 0);
  }
}

/**
 * Create GitVan Hookable instance
 */
export function createGitVanHookable() {
  return new GitVanHookable();
}

/**
 * GitVan Hookable for Knowledge Hook System - Two-Layer Architecture
 *
 * This provides surgical precision for Knowledge Hook systems by:
 * 1. Git hooks provide signals (when to evaluate)
 * 2. Knowledge Hooks provide intelligence (what to evaluate with SPARQL)
 * 3. Only processing what actually changed
 * 4. Providing change-only context to Knowledge Hook system
 */
export const gitvanHookable = createGitVanHookable();

export default gitvanHookable;
