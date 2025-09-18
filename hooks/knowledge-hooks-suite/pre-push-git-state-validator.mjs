// hooks/knowledge-hooks-suite/pre-push-git-state-validator.mjs
// Pre-push Git State Validator - Validates Git state before pushes

import { defineJob } from "../../src/core/job-registry.mjs";
import { useGitVan } from "../../src/core/context.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export default defineJob({
  meta: {
    name: "pre-push-git-state-validator",
    desc: "Validates Git state before pushes and writes comprehensive validation report",
    tags: ["knowledge-hooks", "git-validation", "pre-push"],
    version: "1.0.0",
  },

  hooks: ["pre-push"],

  async run(context) {
    console.log("🚀 Pre-push Git State Validation");

    try {
      const gitvanContext = useGitVan();
      const { execSync } = await import("node:child_process");

      // Create reports directory
      const reportsDir = join(process.cwd(), "reports", "git-state");
      mkdirSync(reportsDir, { recursive: true });

      // Get comprehensive Git state
      const gitState = await this.capturePrePushState(context);

      // Generate validation report
      const validationReport = {
        timestamp: new Date().toISOString(),
        hookType: "pre-push",
        gitState: gitState,
        validation: {
          commitsToPush: gitState.commitsToPush.length,
          filesToPush: gitState.filesToPush.length,
          knowledgeFilesToPush: gitState.knowledgeFilesToPush.length,
          hooksToPush: gitState.hooksToPush.length,
          pushSize: gitState.pushSize,
          branchStatus: gitState.branchStatus,
          repositoryHealth: gitState.repositoryHealth,
        },
        knowledgeGraph: {
          filesAffected: gitState.knowledgeFilesToPush,
          hooksAffected: gitState.hooksToPush,
          impactAssessment: this.assessPushImpact(gitState),
        },
        recommendations: this.generatePrePushRecommendations(gitState),
        warnings: this.generatePrePushWarnings(gitState),
      };

      // Write report to disk
      const reportPath = join(reportsDir, `pre-push-${Date.now()}.json`);
      writeFileSync(reportPath, JSON.stringify(validationReport, null, 2));

      console.log(`   📊 Pre-push Validation Report: ${reportPath}`);
      console.log(`   📁 Commits to push: ${gitState.commitsToPush.length}`);
      console.log(`   📁 Files to push: ${gitState.filesToPush.length}`);
      console.log(
        `   🧠 Knowledge files: ${gitState.knowledgeFilesToPush.length}`
      );
      console.log(`   🔗 Hooks affected: ${gitState.hooksToPush.length}`);

      return {
        success: true,
        reportPath: reportPath,
        validation: validationReport.validation,
        artifacts: [reportPath],
      };
    } catch (error) {
      console.error("❌ Pre-push validation failed:", error.message);
      throw error;
    }
  },

  async capturePrePushState(context) {
    const { execSync } = await import("node:child_process");

    try {
      // Get commits to push
      const commitsToPush = execSync("git rev-list @{u}..HEAD", {
        encoding: "utf8",
      })
        .trim()
        .split("\n")
        .filter((c) => c.length > 0);

      // Get files to push
      const filesToPush = execSync("git diff --name-only @{u}..HEAD", {
        encoding: "utf8",
      })
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      // Get push statistics
      const pushStats = execSync("git diff --stat @{u}..HEAD", {
        encoding: "utf8",
      }).trim();

      // Parse push size
      const linesAdded = execSync(
        "git diff --numstat @{u}..HEAD | awk '{sum+=$1} END {print sum+0}'",
        {
          encoding: "utf8",
        }
      ).trim();

      const linesDeleted = execSync(
        "git diff --numstat @{u}..HEAD | awk '{sum+=$2} END {print sum+0}'",
        {
          encoding: "utf8",
        }
      ).trim();

      // Get branch information
      const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
        encoding: "utf8",
      }).trim();

      const upstreamBranch = execSync(
        "git rev-parse --abbrev-ref @{u} 2>/dev/null || echo 'none'",
        {
          encoding: "utf8",
        }
      ).trim();

      // Get repository health metrics
      const totalCommits = execSync("git rev-list --count HEAD", {
        encoding: "utf8",
      }).trim();
      const totalBranches = execSync("git branch -r | wc -l", {
        encoding: "utf8",
      }).trim();
      const totalTags = execSync("git tag | wc -l", {
        encoding: "utf8",
      }).trim();

      // Get commit messages for analysis
      const commitMessages = commitsToPush.map((sha) => {
        try {
          return execSync(`git log --format=%s -n 1 ${sha}`, {
            encoding: "utf8",
          }).trim();
        } catch {
          return "unknown";
        }
      });

      return {
        commitsToPush,
        filesToPush,
        knowledgeFilesToPush: filesToPush.filter(
          (f) =>
            f.includes(".ttl") || f.includes(".rdf") || f.includes("graph/")
        ),
        hooksToPush: filesToPush.filter(
          (f) => f.includes("hooks/") || f.includes(".hook.")
        ),
        pushSize: {
          linesAdded: parseInt(linesAdded) || 0,
          linesDeleted: parseInt(linesDeleted) || 0,
          filesChanged: filesToPush.length,
          stats: pushStats,
        },
        branchStatus: {
          currentBranch,
          upstreamBranch,
          hasUpstream: upstreamBranch !== "none",
        },
        repositoryHealth: {
          totalCommits: parseInt(totalCommits),
          totalBranches: parseInt(totalBranches),
          totalTags: parseInt(totalTags),
        },
        commitMessages,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.warn(
        "⚠️ Could not capture complete pre-push state:",
        error.message
      );
      return {
        commitsToPush: [],
        filesToPush: [],
        knowledgeFilesToPush: [],
        hooksToPush: [],
        pushSize: {
          linesAdded: 0,
          linesDeleted: 0,
          filesChanged: 0,
          stats: "",
        },
        branchStatus: {
          currentBranch: "unknown",
          upstreamBranch: "none",
          hasUpstream: false,
        },
        repositoryHealth: { totalCommits: 0, totalBranches: 0, totalTags: 0 },
        commitMessages: [],
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  },

  assessPushImpact(gitState) {
    const impact = {
      level: "low",
      description: "",
      affectedAreas: [],
      riskFactors: [],
    };

    const knowledgeFiles = gitState.knowledgeFilesToPush;
    const hooksFiles = gitState.hooksToPush;
    const commitsCount = gitState.commitsToPush.length;

    if (knowledgeFiles.length > 0) {
      impact.affectedAreas.push("knowledge-graph");
      impact.level = "medium";
    }

    if (hooksFiles.length > 0) {
      impact.affectedAreas.push("hooks-system");
      impact.level = "high";
    }

    if (commitsCount > 10) {
      impact.riskFactors.push("large-push");
      impact.level = "high";
    }

    if (gitState.pushSize.linesAdded > 5000) {
      impact.riskFactors.push("large-changes");
      impact.level = "high";
    }

    impact.description = `Impact level: ${
      impact.level
    }. Affected areas: ${impact.affectedAreas.join(
      ", "
    )}. Risk factors: ${impact.riskFactors.join(", ")}`;

    return impact;
  },

  generatePrePushRecommendations(gitState) {
    const recommendations = [];

    if (gitState.commitsToPush.length === 0) {
      recommendations.push("No commits to push - repository is up to date");
    }

    if (gitState.knowledgeFilesToPush.length > 0) {
      recommendations.push(
        `Knowledge graph will be updated with ${gitState.knowledgeFilesToPush.length} files`
      );
    }

    if (gitState.hooksToPush.length > 0) {
      recommendations.push(
        `Hooks system will be updated with ${gitState.hooksToPush.length} files`
      );
    }

    if (gitState.commitsToPush.length > 5) {
      recommendations.push(
        "Large push detected - consider breaking into smaller pushes"
      );
    }

    if (gitState.pushSize.linesAdded > 1000) {
      recommendations.push(
        "Large changes detected - ensure all tests pass before pushing"
      );
    }

    return recommendations;
  },

  generatePrePushWarnings(gitState) {
    const warnings = [];

    if (gitState.commitsToPush.length > 20) {
      warnings.push(
        "⚠️ Very large push detected - may cause issues for other developers"
      );
    }

    if (gitState.pushSize.linesAdded > 10000) {
      warnings.push("⚠️ Massive changes detected - consider code review");
    }

    if (gitState.hooksToPush.length > 0) {
      warnings.push("⚠️ Hooks system changes detected - ensure compatibility");
    }

    if (!gitState.branchStatus.hasUpstream) {
      warnings.push("⚠️ No upstream branch set - push may fail");
    }

    return warnings;
  },
});
