// jobs/knowledge-hooks-git-integration.mjs
// Job that integrates Knowledge Hooks with Git lifecycle events
// This job runs during Git operations to evaluate knowledge hooks

import { defineJob } from "../src/core/job-registry.mjs";
import { HookOrchestrator } from "../src/hooks/HookOrchestrator.mjs";
import { useGitVan } from "../src/core/context.mjs";

export default defineJob({
  meta: {
    name: "knowledge-hooks-git-integration",
    desc: "Integrates Knowledge Hooks with Git lifecycle events",
    tags: ["knowledge-hooks", "git-integration", "automation"],
    version: "1.0.0",
  },

  // Run on all Git lifecycle events
  hooks: [
    "post-commit",
    "post-merge",
    "post-checkout",
    "pre-commit",
    "pre-push",
    "pre-receive",
    "post-receive",
    "update",
    "prepare-commit-msg",
    "commit-msg",
    "pre-checkout",
    "pre-rebase",
    "post-rewrite",
    "pre-auto-gc",
    "applypatch-msg",
    "pre-applypatch",
    "post-applypatch",
    "post-update",
    "push-to-checkout",
  ],

  async run(context) {
    console.log("🧠 Starting Knowledge Hooks Git Integration");

    try {
      // Get GitVan context
      const gitvanContext = useGitVan();

      // Initialize Knowledge Hook Orchestrator
      const orchestrator = new HookOrchestrator({
        graphDir: "./hooks",
        context: gitvanContext,
        logger: console,
      });

      // Get Git context information
      const gitContext = await this.getGitContext(context);

      console.log(
        `   📊 Git Context: ${gitContext.event} - ${gitContext.commitSha}`
      );
      console.log(`   📁 Changed files: ${gitContext.changedFiles.length}`);

      // Evaluate knowledge hooks with Git context
      const evaluationResult = await orchestrator.evaluate({
        gitContext: gitContext,
        verbose: true,
      });

      console.log(
        `   🧠 Knowledge Hooks evaluated: ${evaluationResult.hooksEvaluated}`
      );
      console.log(`   ⚡ Hooks triggered: ${evaluationResult.hooksTriggered}`);
      console.log(
        `   🔄 Workflows executed: ${evaluationResult.workflowsExecuted}`
      );

      if (evaluationResult.hooksTriggered > 0) {
        console.log("   🎯 Triggered Knowledge Hooks:");
        for (const hook of evaluationResult.triggeredHooks) {
          console.log(`     ✅ ${hook.id} (${hook.predicateType})`);
        }
      }

      return {
        success: true,
        hooksEvaluated: evaluationResult.hooksEvaluated,
        hooksTriggered: evaluationResult.hooksTriggered,
        workflowsExecuted: evaluationResult.workflowsExecuted,
        gitContext: gitContext,
      };
    } catch (error) {
      console.error(
        "❌ Knowledge Hooks Git Integration failed:",
        error.message
      );
      throw error;
    }
  },

  /**
   * Extract Git context information from the hook context
   */
  async getGitContext(context) {
    const { execSync } = await import("node:child_process");

    try {
      // Get current commit SHA
      const commitSha = execSync("git rev-parse HEAD", {
        encoding: "utf8",
      }).trim();

      // Get changed files based on Git hook type
      let changedFiles = [];
      let event = "unknown";

      if (context.hookName === "post-commit") {
        // Get files changed in the last commit
        const diffOutput = execSync(
          "git diff-tree --no-commit-id --name-only -r HEAD",
          { encoding: "utf8" }
        );
        changedFiles = diffOutput
          .trim()
          .split("\n")
          .filter((f) => f.length > 0);
        event = "commit";
      } else if (context.hookName === "post-merge") {
        // Get files changed in the merge
        const diffOutput = execSync(
          "git diff-tree --no-commit-id --name-only -r HEAD",
          { encoding: "utf8" }
        );
        changedFiles = diffOutput
          .trim()
          .split("\n")
          .filter((f) => f.length > 0);
        event = "merge";
      } else if (context.hookName === "post-checkout") {
        // Get files changed in the checkout
        const diffOutput = execSync("git diff --name-only HEAD~1 HEAD", {
          encoding: "utf8",
        });
        changedFiles = diffOutput
          .trim()
          .split("\n")
          .filter((f) => f.length > 0);
        event = "checkout";
      }

      // Get branch information
      const branch = execSync("git rev-parse --abbrev-ref HEAD", {
        encoding: "utf8",
      }).trim();

      // Get commit message
      const commitMessage = execSync("git log -1 --pretty=%B", {
        encoding: "utf8",
      }).trim();

      return {
        event: event,
        commitSha: commitSha,
        branch: branch,
        commitMessage: commitMessage,
        changedFiles: changedFiles,
        hookName: context.hookName,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.warn("⚠️ Could not extract Git context:", error.message);
      return {
        event: "unknown",
        commitSha: "unknown",
        branch: "unknown",
        commitMessage: "unknown",
        changedFiles: [],
        hookName: context.hookName || "unknown",
        timestamp: new Date().toISOString(),
      };
    }
  },
});
