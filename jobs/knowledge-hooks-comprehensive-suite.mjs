// jobs/knowledge-hooks-comprehensive-suite.mjs
// Comprehensive Knowledge Hooks Suite Job - Master integration for all Git lifecycle operations

import { defineJob } from "../src/core/job-registry.mjs";
import { HookOrchestrator } from "../src/hooks/HookOrchestrator.mjs";
import { useGitVan } from "../src/core/context.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export default defineJob({
  meta: {
    name: "knowledge-hooks-comprehensive-suite",
    desc: "Comprehensive Knowledge Hooks Suite - Complete Git lifecycle coverage with disk-based reporting",
    tags: [
      "knowledge-hooks",
      "git-lifecycle",
      "comprehensive",
      "reporting",
      "master",
    ],
    version: "1.0.0",
  },

  // Complete Git lifecycle coverage
  hooks: [
    // Client-side hooks
    "pre-commit",
    "post-commit",
    "pre-push",
    "post-merge",
    "post-checkout",
    // Apply patch hooks
    "applypatch-msg",
    "pre-applypatch",
    "post-applypatch",
    // Server-side hooks
    "pre-receive",
    "post-receive",
    "post-update",
    // Advanced hooks
    "pre-rebase",
    "post-rewrite",
    // Additional hooks
    "prepare-commit-msg",
    "commit-msg",
    "pre-checkout",
    "pre-auto-gc",
    "push-to-checkout",
  ],

  async run(context) {
    console.log("🧠 Knowledge Hooks Comprehensive Suite - Master Integration");

    try {
      // Get GitVan context
      const gitvanContext = useGitVan();

      // Initialize Knowledge Hook Orchestrator
      const orchestrator = new HookOrchestrator({
        graphDir: "./hooks",
        context: gitvanContext,
        logger: console,
      });

      // Get comprehensive Git context
      const gitContext = await this.getComprehensiveGitContext(context);

      // Create reports directory
      const reportsDir = join(process.cwd(), "reports", "knowledge-hooks");
      mkdirSync(reportsDir, { recursive: true });

      console.log(
        `   📊 Git Context: ${gitContext.event} - ${gitContext.commitSha}`
      );
      console.log(`   📁 Changed files: ${gitContext.changedFiles.length}`);
      console.log(`   🧠 Knowledge files: ${gitContext.knowledgeFiles.length}`);
      console.log(`   🔗 Hooks affected: ${gitContext.hooksAffected.length}`);

      // Evaluate knowledge hooks with comprehensive Git context
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

      // Generate comprehensive suite report
      const suiteReport = {
        timestamp: new Date().toISOString(),
        hookType: context.hookName || "unknown",
        gitContext: gitContext,
        evaluationResult: evaluationResult,
        suite: {
          name: "Knowledge Hooks Comprehensive Suite",
          version: "1.0.0",
          coverage: {
            totalHooks: 21,
            supportedHooks: 18,
            coveragePercentage: 86,
            supportedHooksList: [
              "pre-commit",
              "post-commit",
              "pre-push",
              "post-merge",
              "post-checkout",
              "applypatch-msg",
              "pre-applypatch",
              "post-applypatch",
              "pre-receive",
              "post-receive",
              "post-update",
              "pre-rebase",
              "post-rewrite",
              "prepare-commit-msg",
              "commit-msg",
              "pre-checkout",
              "pre-auto-gc",
              "push-to-checkout",
            ],
            unsupportedHooksList: [
              "post-push",
              "pre-merge",
              "update",
              "pre-auto-gc",
              "post-auto-gc",
              "applypatch-msg",
              "pre-applypatch",
              "post-applypatch",
            ],
          },
          features: [
            "Comprehensive Git state capture",
            "Knowledge graph impact assessment",
            "Disk-based reporting system",
            "Multi-hook lifecycle coverage",
            "Repository health monitoring",
            "Knowledge hooks evaluation",
            "Workflow execution tracking",
          ],
        },
        analysis: {
          gitStateSummary: this.getGitStateSummary(gitContext),
          knowledgeGraphImpact: this.assessKnowledgeGraphImpact(gitContext),
          repositoryHealth: gitContext.repositoryHealth,
          recommendations: this.generateComprehensiveRecommendations(
            gitContext,
            evaluationResult
          ),
        },
        artifacts: [
          `reports/knowledge-hooks/comprehensive-suite-${Date.now()}.json`,
          `reports/git-state/${
            context.hookName || "unknown"
          }-${Date.now()}.json`,
        ],
      };

      // Write comprehensive suite report to disk
      const suiteReportPath = join(
        reportsDir,
        `comprehensive-suite-${Date.now()}.json`
      );
      writeFileSync(suiteReportPath, JSON.stringify(suiteReport, null, 2));

      console.log(`   📊 Comprehensive Suite Report: ${suiteReportPath}`);
      console.log(
        `   🧠 Suite Coverage: ${suiteReport.suite.coverage.coveragePercentage}%`
      );
      console.log(
        `   📁 Git State Summary: ${suiteReport.analysis.gitStateSummary}`
      );
      console.log(
        `   🎯 Knowledge Graph Impact: ${suiteReport.analysis.knowledgeGraphImpact.level}`
      );

      return {
        success: true,
        hooksEvaluated: evaluationResult.hooksEvaluated,
        hooksTriggered: evaluationResult.hooksTriggered,
        workflowsExecuted: evaluationResult.workflowsExecuted,
        gitContext: gitContext,
        suiteReport: suiteReport,
        artifacts: [suiteReportPath],
      };
    } catch (error) {
      console.error(
        "❌ Knowledge Hooks Comprehensive Suite failed:",
        error.message
      );
      throw error;
    }
  },

  /**
   * Get comprehensive Git context information
   */
  async getComprehensiveGitContext(context) {
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
      } else if (context.hookName === "pre-commit") {
        // Get staged files
        const stagedOutput = execSync("git diff --cached --name-only", {
          encoding: "utf8",
        });
        changedFiles = stagedOutput
          .trim()
          .split("\n")
          .filter((f) => f.length > 0);
        event = "pre-commit";
      } else if (context.hookName === "pre-push") {
        // Get files to push
        const pushOutput = execSync("git diff --name-only @{u}..HEAD", {
          encoding: "utf8",
        });
        changedFiles = pushOutput
          .trim()
          .split("\n")
          .filter((f) => f.length > 0);
        event = "pre-push";
      }

      // Get branch information
      const branch = execSync("git rev-parse --abbrev-ref HEAD", {
        encoding: "utf8",
      }).trim();

      // Get commit message
      const commitMessage = execSync("git log -1 --pretty=%B", {
        encoding: "utf8",
      }).trim();

      // Get repository health metrics
      const totalCommits = execSync(
        "git rev-list --count HEAD 2>/dev/null || echo 0",
        { encoding: "utf8" }
      ).trim();
      const totalBranches = execSync(
        "git branch -r | wc -l 2>/dev/null || echo 0",
        { encoding: "utf8" }
      ).trim();
      const totalTags = execSync("git tag | wc -l 2>/dev/null || echo 0", {
        encoding: "utf8",
      }).trim();

      // Get branch status
      const branchAhead = execSync(
        "git rev-list --count HEAD @{u} 2>/dev/null || echo 0",
        {
          encoding: "utf8",
        }
      ).trim();

      const branchBehind = execSync(
        "git rev-list --count @{u} HEAD 2>/dev/null || echo 0",
        {
          encoding: "utf8",
        }
      ).trim();

      // Categorize files
      const knowledgeFiles = changedFiles.filter(
        (f) => f.includes(".ttl") || f.includes(".rdf") || f.includes("graph/")
      );

      const hooksAffected = changedFiles.filter(
        (f) => f.includes("hooks/") || f.includes(".hook.")
      );

      return {
        event: event,
        commitSha: commitSha,
        branch: branch,
        commitMessage: commitMessage,
        changedFiles: changedFiles,
        knowledgeFiles: knowledgeFiles,
        hooksAffected: hooksAffected,
        hookName: context.hookName,
        repositoryHealth: {
          totalCommits: parseInt(totalCommits),
          totalBranches: parseInt(totalBranches),
          totalTags: parseInt(totalTags),
          branchAhead: parseInt(branchAhead),
          branchBehind: parseInt(branchBehind),
          hasUpstream: branchAhead !== "0" || branchBehind !== "0",
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.warn(
        "⚠️ Could not extract comprehensive Git context:",
        error.message
      );
      return {
        event: "unknown",
        commitSha: "unknown",
        branch: "unknown",
        commitMessage: "unknown",
        changedFiles: [],
        knowledgeFiles: [],
        hooksAffected: [],
        hookName: context.hookName || "unknown",
        repositoryHealth: {
          totalCommits: 0,
          totalBranches: 0,
          totalTags: 0,
          branchAhead: 0,
          branchBehind: 0,
          hasUpstream: false,
        },
        timestamp: new Date().toISOString(),
      };
    }
  },

  getGitStateSummary(gitContext) {
    const changed = gitContext.changedFiles.length;
    const knowledge = gitContext.knowledgeFiles.length;
    const hooks = gitContext.hooksAffected.length;

    return `${changed} changed, ${knowledge} knowledge, ${hooks} hooks`;
  },

  assessKnowledgeGraphImpact(gitContext) {
    const knowledgeFiles = gitContext.knowledgeFiles;
    const hooksFiles = gitContext.hooksAffected;

    if (hooksFiles.length > 0) {
      return { level: "high", description: "Hooks system changes detected" };
    } else if (knowledgeFiles.length > 0) {
      return {
        level: "medium",
        description: "Knowledge graph changes detected",
      };
    } else {
      return { level: "low", description: "No knowledge graph changes" };
    }
  },

  generateComprehensiveRecommendations(gitContext, evaluationResult) {
    const recommendations = [];

    if (gitContext.knowledgeFiles.length > 0) {
      recommendations.push(
        `Knowledge graph affected: ${gitContext.knowledgeFiles.length} files`
      );
    }

    if (gitContext.hooksAffected.length > 0) {
      recommendations.push(
        `Hooks system affected: ${gitContext.hooksAffected.length} files`
      );
    }

    if (evaluationResult.hooksTriggered > 0) {
      recommendations.push(
        `${evaluationResult.hooksTriggered} knowledge hooks triggered`
      );
    }

    if (evaluationResult.workflowsExecuted > 0) {
      recommendations.push(
        `${evaluationResult.workflowsExecuted} workflows executed`
      );
    }

    if (gitContext.repositoryHealth.branchAhead > 0) {
      recommendations.push(
        `Branch is ${gitContext.repositoryHealth.branchAhead} commits ahead - consider pushing`
      );
    }

    if (gitContext.repositoryHealth.branchBehind > 0) {
      recommendations.push(
        `Branch is ${gitContext.repositoryHealth.branchBehind} commits behind - consider pulling`
      );
    }

    return recommendations;
  },
});
