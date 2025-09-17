/**
 * GitVan Hookable Integration - Dark Matter 80/20
 *
 * This creates surgical precision for AI swarms by:
 * 1. Only scanning what actually changed (not entire repo)
 * 2. Using Git hooks for immediate event detection
 * 3. Providing change-only context to AI systems
 * 4. Eliminating the need for full repository scans
 */

import { createHooks } from "hookable";
import { useGit } from "../composables/git.mjs";
import { useUnrouting } from "../composables/unrouting.mjs";
import { discoverHooks, hookMatches } from "../runtime/events.mjs";
import { withGitVan } from "./context.mjs";

/**
 * GitVan Hookable System - Surgical Precision for AI Swarms
 *
 * Dark Matter 80/20 Principles:
 * - Only process what changed (not entire repo)
 * - Immediate event detection via Git hooks
 * - Change-only context for AI systems
 * - Zero-overhead repository scanning
 */
export class GitVanHookable {
  constructor() {
    this.hooks = createHooks();
    this.changeCache = new Map();
    this.eventQueue = [];
    this.isProcessing = false;

    // Register core GitVan hooks
    this.registerCoreHooks();
  }

  /**
   * Register core GitVan hooks for surgical precision
   */
  registerCoreHooks() {
    // Pre-commit: Analyze staged changes only
    this.hooks.hook("pre-commit", async (context) => {
      return await this.processStagedChanges(context);
    });

    // Post-commit: Process committed changes
    this.hooks.hook("post-commit", async (context) => {
      return await this.processCommittedChanges(context);
    });

    // Pre-push: Analyze push changes only
    this.hooks.hook("pre-push", async (context) => {
      return await this.processPushChanges(context);
    });

    // Post-merge: Process merged changes
    this.hooks.hook("post-merge", async (context) => {
      return await this.processMergedChanges(context);
    });

    // Post-checkout: Process checkout changes
    this.hooks.hook("post-checkout", async (context) => {
      return await this.processCheckoutChanges(context);
    });
  }

  /**
   * Process staged changes (pre-commit) - Dark Matter 80/20
   * Only analyzes what's staged, not entire repository
   */
  async processStagedChanges(context) {
    console.log("🔍 GitVan: Processing staged changes (surgical precision)");

    await withGitVan({ cwd: context.cwd }, async () => {
      const git = useGit();
      const unrouting = useUnrouting();

      // Get ONLY staged files - surgical precision
      const stagedDiff = await git.diff({ cached: true, nameOnly: true });
      const stagedFiles = stagedDiff.split("\n").filter((f) => f.trim());
      console.log(`   📁 Staged files: ${stagedFiles.length}`);

      if (stagedFiles.length === 0) {
        console.log("   ✅ No staged files to process");
        return { processed: 0, changes: [] };
      }

      // Process only staged changes
      const changes = await this.analyzeChanges(stagedFiles, "staged");
      const results = await this.routeChanges(changes, "pre-commit");

      console.log(`   🎯 Processed ${results.length} changes`);
      return { processed: results.length, changes: results };
    });
  }

  /**
   * Process committed changes (post-commit) - Dark Matter 80/20
   * Only analyzes the last commit, not entire history
   */
  async processCommittedChanges(context) {
    console.log("🔍 GitVan: Processing committed changes (surgical precision)");

    await withGitVan({ cwd: context.cwd }, async () => {
      const git = useGit();
      const unrouting = useUnrouting();

      // Get ONLY the last commit - surgical precision
      const lastCommitSha = await git.headSha();
      const changedFilesDiff = await git.diff({
        from: "HEAD~1",
        to: "HEAD",
        nameOnly: true,
      });
      const changedFiles = changedFilesDiff.split("\n").filter((f) => f.trim());

      console.log(`   📁 Changed files: ${changedFiles.length}`);

      if (changedFiles.length === 0) {
        console.log("   ✅ No changes to process");
        return { processed: 0, changes: [] };
      }

      // Process only committed changes
      const changes = await this.analyzeChanges(changedFiles, "committed");
      const results = await this.routeChanges(changes, "post-commit");

      console.log(`   🎯 Processed ${results.length} changes`);
      return { processed: results.length, changes: results };
    });
  }

  /**
   * Process push changes (pre-push) - Dark Matter 80/20
   * Only analyzes what's being pushed, not entire repository
   */
  async processPushChanges(context) {
    console.log("🔍 GitVan: Processing push changes (surgical precision)");

    await withGitVan({ cwd: context.cwd }, async () => {
      const git = useGit();
      const unrouting = useUnrouting();

      // Get ONLY push changes - surgical precision
      const pushChangesDiff = await git.diff({
        from: `${context.remote}/${context.branch}`,
        to: "HEAD",
        nameOnly: true,
      });
      const pushChanges = pushChangesDiff.split("\n").filter((f) => f.trim());
      console.log(`   📁 Push changes: ${pushChanges.length}`);

      if (pushChanges.length === 0) {
        console.log("   ✅ No push changes to process");
        return { processed: 0, changes: [] };
      }

      // Process only push changes
      const changes = await this.analyzeChanges(pushChanges, "push");
      const results = await this.routeChanges(changes, "pre-push");

      console.log(`   🎯 Processed ${results.length} changes`);
      return { processed: results.length, changes: results };
    });
  }

  /**
   * Process merged changes (post-merge) - Dark Matter 80/20
   * Only analyzes what was merged, not entire repository
   */
  async processMergedChanges(context) {
    console.log("🔍 GitVan: Processing merged changes (surgical precision)");

    await withGitVan({ cwd: context.cwd }, async () => {
      const git = useGit();
      const unrouting = useUnrouting();

      // Get ONLY merged changes - surgical precision
      const mergedChangesDiff = await git.diff({
        from: "HEAD~1",
        to: "HEAD",
        nameOnly: true,
      });
      const mergedChanges = mergedChangesDiff
        .split("\n")
        .filter((f) => f.trim());
      console.log(`   📁 Merged changes: ${mergedChanges.length}`);

      if (mergedChanges.length === 0) {
        console.log("   ✅ No merged changes to process");
        return { processed: 0, changes: [] };
      }

      // Process only merged changes
      const changes = await this.analyzeChanges(mergedChanges, "merged");
      const results = await this.routeChanges(changes, "post-merge");

      console.log(`   🎯 Processed ${results.length} changes`);
      return { processed: results.length, changes: results };
    });
  }

  /**
   * Process checkout changes (post-checkout) - Dark Matter 80/20
   * Only analyzes what changed in checkout, not entire repository
   */
  async processCheckoutChanges(context) {
    console.log("🔍 GitVan: Processing checkout changes (surgical precision)");

    await withGitVan({ cwd: context.cwd }, async () => {
      const git = useGit();
      const unrouting = useUnrouting();

      // Get ONLY checkout changes - surgical precision
      const checkoutChangesDiff = await git.diff({
        from: context.prevHead,
        to: context.newHead,
        nameOnly: true,
      });
      const checkoutChanges = checkoutChangesDiff
        .split("\n")
        .filter((f) => f.trim());
      console.log(`   📁 Checkout changes: ${checkoutChanges.length}`);

      if (checkoutChanges.length === 0) {
        console.log("   ✅ No checkout changes to process");
        return { processed: 0, changes: [] };
      }

      // Process only checkout changes
      const changes = await this.analyzeChanges(checkoutChanges, "checkout");
      const results = await this.routeChanges(changes, "post-checkout");

      console.log(`   🎯 Processed ${results.length} changes`);
      return { processed: results.length, changes: results };
    });
  }

  /**
   * Analyze changes with surgical precision - Dark Matter 80/20
   * Only processes the specific files that changed
   */
  async analyzeChanges(changedFiles, changeType) {
    const unrouting = useUnrouting();
    const analysis = [];

    for (const file of changedFiles) {
      // Parse file path for intelligence
      const parsed = unrouting.parsePath(file);

      // Extract metadata from file path
      const metadata = this.extractFileMetadata(file, parsed);

      // Determine file type and context
      const context = this.determineFileContext(file, metadata);

      analysis.push({
        file,
        changeType,
        metadata,
        context,
        timestamp: Date.now(),
        parsed,
      });
    }

    return analysis;
  }

  /**
   * Extract file metadata - Dark Matter 80/20
   * Intelligent extraction without full repository scan
   */
  extractFileMetadata(filePath, parsed) {
    const metadata = {
      path: filePath,
      directory: filePath.split("/").slice(0, -1).join("/"),
      filename: filePath.split("/").pop(),
      extension: filePath.split(".").pop(),
      depth: filePath.split("/").length - 1,
    };

    // Extract semantic meaning from path
    if (filePath.includes("/components/")) {
      metadata.type = "component";
      metadata.componentName = parsed.segments?.find(
        (s) => s.type === "dynamic"
      )?.name;
    } else if (filePath.includes("/pages/")) {
      metadata.type = "page";
      metadata.pageName = parsed.segments?.find(
        (s) => s.type === "dynamic"
      )?.name;
    } else if (filePath.includes("/api/")) {
      metadata.type = "api";
      metadata.endpoint = parsed.segments?.find(
        (s) => s.type === "dynamic"
      )?.name;
    } else if (filePath.includes("/tests/") || filePath.includes(".test.")) {
      metadata.type = "test";
    } else if (filePath.includes("/config/") || filePath.endsWith(".json")) {
      metadata.type = "config";
    } else if (filePath.includes("/docs/") || filePath.endsWith(".md")) {
      metadata.type = "documentation";
    } else {
      metadata.type = "source";
    }

    return metadata;
  }

  /**
   * Determine file context - Dark Matter 80/20
   * Context-aware analysis without full repository scan
   */
  determineFileContext(filePath, metadata) {
    const context = {
      priority: "normal",
      impact: "local",
      automation: "standard",
    };

    // Determine priority based on file type
    if (metadata.type === "component") {
      context.priority = "high";
      context.impact = "ui";
      context.automation = "component-pipeline";
    } else if (metadata.type === "api") {
      context.priority = "high";
      context.impact = "backend";
      context.automation = "api-pipeline";
    } else if (metadata.type === "config") {
      context.priority = "critical";
      context.impact = "system";
      context.automation = "config-reload";
    } else if (metadata.type === "test") {
      context.priority = "medium";
      context.impact = "quality";
      context.automation = "test-run";
    }

    return context;
  }

  /**
   * Route changes to appropriate jobs - Dark Matter 80/20
   * Intelligent routing without full repository scan
   */
  async routeChanges(changes, eventType) {
    const gitvanHooks = discoverHooks("./hooks");
    const results = [];

    for (const change of changes) {
      // Find matching GitVan hooks
      const matchingHooks = gitvanHooks.filter((hook) => {
        return hookMatches(hook, {
          changedPaths: [change.file],
          eventType,
          metadata: change.metadata,
          context: change.context,
        });
      });

      if (matchingHooks.length > 0) {
        results.push({
          change,
          hooks: matchingHooks,
          routed: true,
        });
      } else {
        results.push({
          change,
          hooks: [],
          routed: false,
        });
      }
    }

    return results;
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
   * Get change cache for AI swarms - Dark Matter 80/20
   * Provides surgical precision data without full repository scan
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
   * Get change type summary - Dark Matter 80/20
   */
  getChangeTypeSummary() {
    const summary = {};
    for (const change of this.changeCache.values()) {
      const type = change.metadata.type;
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
 * GitVan Hookable for AI Swarms - Dark Matter 80/20
 *
 * This provides surgical precision for AI systems by:
 * 1. Only processing what actually changed
 * 2. Providing change-only context
 * 3. Eliminating full repository scans
 * 4. Enabling immediate event detection
 */
export const gitvanHookable = createGitVanHookable();

export default gitvanHookable;
