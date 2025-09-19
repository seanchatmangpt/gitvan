// jtbd-git-signals-integration.mjs
// Git hook signals that trigger JTBD Knowledge Hook evaluation
// This job provides the SIGNAL layer for JTBD automation

import { defineJob } from "../src/core/job-registry.mjs";
import { HookOrchestrator } from "../src/hooks/HookOrchestrator.mjs";
import { useGitVan } from "../src/core/context.mjs";

export default defineJob({
  meta: {
    name: "jtbd-git-signals-integration",
    desc: "Git hook signals that trigger JTBD Knowledge Hook evaluation",
    tags: ["jtbd", "git-signals", "knowledge-hooks", "automation"],
    version: "1.0.0",
  },

  // Git hooks provide SIGNALS for JTBD evaluation
  hooks: [
    // Core Development Lifecycle Signals
    "pre-commit", // Signal: Code quality validation needed
    "post-commit", // Signal: Code analysis needed
    "pre-push", // Signal: Security validation needed

    // Infrastructure & DevOps Signals
    "post-merge", // Signal: Integration validation needed
    "post-checkout", // Signal: Environment validation needed

    // Advanced Git Signals
    "pre-rebase", // Signal: History validation needed
    "post-rewrite", // Signal: History analysis needed
  ],

  async run(context) {
    console.log(
      "🚨 JTBD Git Signals Integration - Triggering Knowledge Hook Evaluation"
    );
    console.log(`   📡 Git Signal: ${context.hookName}`);

    try {
      // Get GitVan context
      const gitvanContext = useGitVan();

      // Initialize Knowledge Hook Orchestrator for JTBD hooks
      const orchestrator = new HookOrchestrator({
        graphDir: "./hooks/jtbd-hooks",
        context: gitvanContext,
        logger: console,
      });

      // Extract comprehensive Git context
      const gitContext = await this.extractGitContext(context);

      console.log(
        `   📊 Git Context: ${gitContext.event} - ${gitContext.commitSha}`
      );
      console.log(`   📁 Changed files: ${gitContext.changedFiles.length}`);
      console.log(`   🌿 Branch: ${gitContext.branch}`);

      // Determine which JTBD categories to evaluate based on Git signal
      const jtbdCategories = this.getJtbdCategoriesForSignal(context.hookName);
      console.log(`   🎯 JTBD Categories: ${jtbdCategories.join(", ")}`);

      // Evaluate JTBD knowledge hooks with Git context
      const evaluationResult = await orchestrator.evaluate({
        gitContext: gitContext,
        jtbdCategories: jtbdCategories,
        verbose: true,
      });

      console.log(
        `   🧠 JTBD Knowledge Hooks evaluated: ${evaluationResult.hooksEvaluated}`
      );
      console.log(
        `   ⚡ JTBD Hooks triggered: ${evaluationResult.hooksTriggered}`
      );
      console.log(
        `   🔄 JTBD Workflows executed: ${evaluationResult.workflowsExecuted}`
      );

      if (evaluationResult.hooksTriggered > 0) {
        console.log("   🎯 Triggered JTBD Knowledge Hooks:");
        for (const hook of evaluationResult.triggeredHooks) {
          console.log(
            `     ✅ ${hook.id} (${hook.predicateType}) - ${hook.jtbdCategory}`
          );
        }
      }

      // Generate JTBD signals report
      const signalsReport = {
        timestamp: new Date().toISOString(),
        gitSignal: context.hookName,
        gitContext: gitContext,
        jtbdCategories: jtbdCategories,
        evaluationResult: evaluationResult,
        summary: {
          hooksEvaluated: evaluationResult.hooksEvaluated,
          hooksTriggered: evaluationResult.hooksTriggered,
          workflowsExecuted: evaluationResult.workflowsExecuted,
          success: evaluationResult.hooksTriggered > 0,
        },
      };

      // Write signals report
      await this.writeSignalsReport(signalsReport);

      return {
        success: true,
        gitSignal: context.hookName,
        jtbdHooksTriggered: evaluationResult.hooksTriggered,
        report: signalsReport,
      };
    } catch (error) {
      console.error(
        `❌ JTBD Git Signals Integration Error (${context.hookName}):`,
        error.message
      );
      return {
        success: false,
        error: error.message,
        gitSignal: context.hookName,
      };
    }
  },

  /**
   * Extract comprehensive Git context for JTBD evaluation
   */
  async extractGitContext(context) {
    const { execSync } = await import("node:child_process");

    try {
      return {
        event: context.hookName,
        commitSha: execSync("git rev-parse HEAD", { encoding: "utf8" }).trim(),
        branch: execSync("git branch --show-current", {
          encoding: "utf8",
        }).trim(),
        changedFiles: execSync("git diff --name-only HEAD~1 HEAD", {
          encoding: "utf8",
        })
          .trim()
          .split("\n")
          .filter(Boolean),
        stagedFiles: execSync("git diff --cached --name-only", {
          encoding: "utf8",
        })
          .trim()
          .split("\n")
          .filter(Boolean),
        commitMessage: execSync("git log -1 --pretty=format:%s", {
          encoding: "utf8",
        }).trim(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        event: context.hookName,
        commitSha: "unknown",
        branch: "unknown",
        changedFiles: [],
        stagedFiles: [],
        commitMessage: "unknown",
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  },

  /**
   * Determine which JTBD categories to evaluate based on Git signal
   */
  getJtbdCategoriesForSignal(gitSignal) {
    const signalMapping = {
      // Core Development Lifecycle Signals
      "pre-commit": ["core-development-lifecycle"],
      "post-commit": ["core-development-lifecycle", "monitoring-observability"],
      "pre-push": ["core-development-lifecycle", "security-compliance"],

      // Infrastructure & DevOps Signals
      "post-merge": ["infrastructure-devops", "monitoring-observability"],
      "post-checkout": ["infrastructure-devops"],

      // Advanced Git Signals
      "pre-rebase": ["core-development-lifecycle", "security-compliance"],
      "post-rewrite": [
        "core-development-lifecycle",
        "monitoring-observability",
      ],

      // Server-side Signals
      "pre-receive": ["security-compliance", "infrastructure-devops"],
      "post-receive": ["infrastructure-devops", "monitoring-observability"],
      "post-update": ["infrastructure-devops", "business-intelligence"],
    };

    return signalMapping[gitSignal] || ["core-development-lifecycle"];
  },

  /**
   * Write JTBD signals report to disk
   */
  async writeSignalsReport(report) {
    const { writeFileSync, mkdirSync } = await import("node:fs");
    const { join } = await import("node:path");

    const reportsDir = join(process.cwd(), "reports", "jtbd", "git-signals");
    mkdirSync(reportsDir, { recursive: true });

    const filename = `jtbd-git-signals-${report.gitSignal}-${Date.now()}.json`;
    const filepath = join(reportsDir, filename);

    writeFileSync(filepath, JSON.stringify(report, null, 2));

    console.log(`📄 JTBD Git Signals report written to: ${filepath}`);
  },
});

