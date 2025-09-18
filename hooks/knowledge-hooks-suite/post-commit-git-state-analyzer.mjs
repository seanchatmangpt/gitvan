// hooks/knowledge-hooks-suite/post-commit-git-state-analyzer.mjs
// Post-commit Git State Analyzer - Analyzes Git state after commits

import { defineJob } from "../../src/core/job-registry.mjs";
import { useGitVan } from "../../src/core/context.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export default defineJob({
  meta: {
    name: "post-commit-git-state-analyzer",
    desc: "Analyzes Git state after commits and writes comprehensive analysis report",
    tags: ["knowledge-hooks", "git-analysis", "post-commit"],
    version: "1.0.0",
  },

  hooks: ["post-commit"],

  async run(context) {
    console.log("📊 Post-commit Git State Analysis");

    try {
      const gitvanContext = useGitVan();
      const { execSync } = await import("node:child_process");

      // Create reports directory
      const reportsDir = join(process.cwd(), "reports", "git-state");
      mkdirSync(reportsDir, { recursive: true });

      // Get comprehensive Git state
      const gitState = await this.capturePostCommitState(context);

      // Generate analysis report
      const analysisReport = {
        timestamp: new Date().toISOString(),
        hookType: "post-commit",
        commitInfo: gitState.commitInfo,
        gitState: gitState,
        analysis: {
          filesCommitted: gitState.committedFiles.length,
          knowledgeFilesCommitted: gitState.knowledgeFilesCommitted.length,
          hooksCommitted: gitState.hooksCommitted.length,
          commitSize: gitState.commitSize,
          branchImpact: gitState.branchImpact,
          repositoryHealth: gitState.repositoryHealth,
        },
        knowledgeGraph: {
          filesAffected: gitState.knowledgeFilesCommitted,
          hooksAffected: gitState.hooksCommitted,
          impactAssessment: this.assessKnowledgeImpact(gitState),
        },
        recommendations: this.generatePostCommitRecommendations(gitState),
      };

      // Write report to disk
      const reportPath = join(reportsDir, `post-commit-${Date.now()}.json`);
      writeFileSync(reportPath, JSON.stringify(analysisReport, null, 2));

      console.log(`   📊 Post-commit Analysis Report: ${reportPath}`);
      console.log(`   📁 Files committed: ${gitState.committedFiles.length}`);
      console.log(
        `   🧠 Knowledge files: ${gitState.knowledgeFilesCommitted.length}`
      );
      console.log(`   🔗 Hooks affected: ${gitState.hooksCommitted.length}`);
      console.log(
        `   📏 Commit size: ${gitState.commitSize.linesAdded} additions, ${gitState.commitSize.linesDeleted} deletions`
      );

      return {
        success: true,
        reportPath: reportPath,
        analysis: analysisReport.analysis,
        artifacts: [reportPath],
      };
    } catch (error) {
      console.error("❌ Post-commit analysis failed:", error.message);
      throw error;
    }
  },

  async capturePostCommitState(context) {
    const { execSync } = await import("node:child_process");

    try {
      // Get commit information
      const commitSha = execSync("git rev-parse HEAD", {
        encoding: "utf8",
      }).trim();
      const commitMessage = execSync("git log -1 --pretty=%B", {
        encoding: "utf8",
      }).trim();
      const commitAuthor = execSync("git log -1 --pretty=%ae", {
        encoding: "utf8",
      }).trim();
      const commitDate = execSync("git log -1 --pretty=%cd", {
        encoding: "utf8",
      }).trim();

      // Get committed files
      const committedFiles = execSync(
        "git diff-tree --no-commit-id --name-only -r HEAD",
        {
          encoding: "utf8",
        }
      )
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      // Get commit statistics
      const commitStats = execSync("git diff --stat HEAD~1 HEAD", {
        encoding: "utf8",
      }).trim();

      // Parse commit size
      const linesAdded = execSync(
        "git diff --numstat HEAD~1 HEAD | awk '{sum+=$1} END {print sum+0}'",
        {
          encoding: "utf8",
        }
      ).trim();

      const linesDeleted = execSync(
        "git diff --numstat HEAD~1 HEAD | awk '{sum+=$2} END {print sum+0}'",
        {
          encoding: "utf8",
        }
      ).trim();

      // Get branch information
      const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
        encoding: "utf8",
      }).trim();

      const branchAhead = execSync(
        "git rev-list --count HEAD @{u} 2>/dev/null || echo 0",
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

      return {
        commitInfo: {
          sha: commitSha,
          message: commitMessage,
          author: commitAuthor,
          date: commitDate,
          shortSha: commitSha.substring(0, 8),
        },
        committedFiles,
        knowledgeFilesCommitted: committedFiles.filter(
          (f) =>
            f.includes(".ttl") || f.includes(".rdf") || f.includes("graph/")
        ),
        hooksCommitted: committedFiles.filter(
          (f) => f.includes("hooks/") || f.includes(".hook.")
        ),
        commitSize: {
          linesAdded: parseInt(linesAdded) || 0,
          linesDeleted: parseInt(linesDeleted) || 0,
          filesChanged: committedFiles.length,
          stats: commitStats,
        },
        branchImpact: {
          currentBranch,
          ahead: parseInt(branchAhead),
          hasUpstream: branchAhead !== "0",
        },
        repositoryHealth: {
          totalCommits: parseInt(totalCommits),
          totalBranches: parseInt(totalBranches),
          totalTags: parseInt(totalTags),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.warn(
        "⚠️ Could not capture complete post-commit state:",
        error.message
      );
      return {
        commitInfo: {
          sha: "unknown",
          message: "unknown",
          author: "unknown",
          date: "unknown",
          shortSha: "unknown",
        },
        committedFiles: [],
        knowledgeFilesCommitted: [],
        hooksCommitted: [],
        commitSize: {
          linesAdded: 0,
          linesDeleted: 0,
          filesChanged: 0,
          stats: "",
        },
        branchImpact: {
          currentBranch: "unknown",
          ahead: 0,
          hasUpstream: false,
        },
        repositoryHealth: { totalCommits: 0, totalBranches: 0, totalTags: 0 },
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  },

  assessKnowledgeImpact(gitState) {
    const impact = {
      level: "low",
      description: "",
      affectedAreas: [],
    };

    const knowledgeFiles = gitState.knowledgeFilesCommitted;
    const hooksFiles = gitState.hooksCommitted;

    if (knowledgeFiles.length > 0) {
      impact.affectedAreas.push("knowledge-graph");
      impact.level = "medium";
    }

    if (hooksFiles.length > 0) {
      impact.affectedAreas.push("hooks-system");
      impact.level = "high";
    }

    if (knowledgeFiles.length > 3 || hooksFiles.length > 2) {
      impact.level = "high";
    }

    impact.description = `Impact level: ${
      impact.level
    }. Affected areas: ${impact.affectedAreas.join(", ")}`;

    return impact;
  },

  generatePostCommitRecommendations(gitState) {
    const recommendations = [];

    if (gitState.knowledgeFilesCommitted.length > 0) {
      recommendations.push(
        `Knowledge graph updated with ${gitState.knowledgeFilesCommitted.length} files`
      );
    }

    if (gitState.hooksCommitted.length > 0) {
      recommendations.push(
        `Hooks system updated with ${gitState.hooksCommitted.length} files`
      );
    }

    if (gitState.commitSize.linesAdded > 1000) {
      recommendations.push(
        "Large commit detected - consider breaking into smaller commits"
      );
    }

    if (gitState.branchImpact.ahead > 5) {
      recommendations.push(
        `Branch is ${gitState.branchImpact.ahead} commits ahead - consider pushing`
      );
    }

    if (gitState.repositoryHealth.totalCommits > 1000) {
      recommendations.push(
        "Large repository detected - consider cleanup and optimization"
      );
    }

    return recommendations;
  },
});
