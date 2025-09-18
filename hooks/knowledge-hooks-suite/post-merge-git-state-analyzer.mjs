// hooks/knowledge-hooks-suite/post-merge-git-state-analyzer.mjs
// Post-merge Git State Analyzer - Analyzes Git state after merges

import { defineJob } from "../../src/core/job-registry.mjs";
import { useGitVan } from "../../src/core/context.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export default defineJob({
  meta: {
    name: "post-merge-git-state-analyzer",
    desc: "Analyzes Git state after merges and writes comprehensive merge analysis report",
    tags: ["knowledge-hooks", "git-analysis", "post-merge"],
    version: "1.0.0",
  },

  hooks: ["post-merge"],

  async run(context) {
    console.log("🔄 Post-merge Git State Analysis");

    try {
      const gitvanContext = useGitVan();
      const { execSync } = await import("node:child_process");

      // Create reports directory
      const reportsDir = join(process.cwd(), "reports", "git-state");
      mkdirSync(reportsDir, { recursive: true });

      // Get comprehensive Git state
      const gitState = await this.capturePostMergeState(context);

      // Generate analysis report
      const analysisReport = {
        timestamp: new Date().toISOString(),
        hookType: "post-merge",
        mergeInfo: gitState.mergeInfo,
        gitState: gitState,
        analysis: {
          filesMerged: gitState.filesMerged.length,
          knowledgeFilesMerged: gitState.knowledgeFilesMerged.length,
          hooksMerged: gitState.hooksMerged.length,
          mergeSize: gitState.mergeSize,
          conflictResolution: gitState.conflictResolution,
          branchImpact: gitState.branchImpact,
        },
        knowledgeGraph: {
          filesAffected: gitState.knowledgeFilesMerged,
          hooksAffected: gitState.hooksMerged,
          impactAssessment: this.assessMergeImpact(gitState),
        },
        recommendations: this.generatePostMergeRecommendations(gitState),
      };

      // Write report to disk
      const reportPath = join(reportsDir, `post-merge-${Date.now()}.json`);
      writeFileSync(reportPath, JSON.stringify(analysisReport, null, 2));

      console.log(`   📊 Post-merge Analysis Report: ${reportPath}`);
      console.log(`   📁 Files merged: ${gitState.filesMerged.length}`);
      console.log(
        `   🧠 Knowledge files: ${gitState.knowledgeFilesMerged.length}`
      );
      console.log(`   🔗 Hooks affected: ${gitState.hooksMerged.length}`);
      console.log(
        `   📏 Merge size: ${gitState.mergeSize.linesAdded} additions, ${gitState.mergeSize.linesDeleted} deletions`
      );

      return {
        success: true,
        reportPath: reportPath,
        analysis: analysisReport.analysis,
        artifacts: [reportPath],
      };
    } catch (error) {
      console.error("❌ Post-merge analysis failed:", error.message);
      throw error;
    }
  },

  async capturePostMergeState(context) {
    const { execSync } = await import("node:child_process");

    try {
      // Get merge information
      const mergeSha = execSync("git rev-parse HEAD", {
        encoding: "utf8",
      }).trim();
      const mergeMessage = execSync("git log -1 --pretty=%B", {
        encoding: "utf8",
      }).trim();
      const mergeAuthor = execSync("git log -1 --pretty=%ae", {
        encoding: "utf8",
      }).trim();
      const mergeDate = execSync("git log -1 --pretty=%cd", {
        encoding: "utf8",
      }).trim();

      // Get parent commits
      const parents = execSync("git log -1 --pretty=%P", { encoding: "utf8" })
        .trim()
        .split(" ");
      const isMerge = parents.length > 1;

      // Get merged files
      const filesMerged = execSync(
        "git diff-tree --no-commit-id --name-only -r HEAD",
        {
          encoding: "utf8",
        }
      )
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      // Get merge statistics
      const mergeStats = execSync("git diff --stat HEAD~1 HEAD", {
        encoding: "utf8",
      }).trim();

      // Parse merge size
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

      // Check for conflicts
      const conflictFiles = execSync(
        "git diff --name-only --diff-filter=U 2>/dev/null || echo ''",
        {
          encoding: "utf8",
        }
      )
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

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

      // Check repository health
      const repositoryHealth = await this.checkRepositoryHealth();

      // Get merge source branch
      let sourceBranch = "unknown";
      if (isMerge) {
        try {
          const mergeMatch = mergeMessage.match(
            /Merge branch ['"]([^'"]+)['"]/
          );
          if (mergeMatch) {
            sourceBranch = mergeMatch[1];
          }
        } catch {
          // Could not determine source branch
        }
      }

      return {
        mergeInfo: {
          sha: mergeSha,
          message: mergeMessage,
          author: mergeAuthor,
          date: mergeDate,
          shortSha: mergeSha.substring(0, 8),
          isMerge,
          sourceBranch,
          parents,
        },
        filesMerged,
        knowledgeFilesMerged: filesMerged.filter(
          (f) =>
            f.includes(".ttl") || f.includes(".rdf") || f.includes("graph/")
        ),
        hooksMerged: filesMerged.filter(
          (f) => f.includes("hooks/") || f.includes(".hook.")
        ),
        mergeSize: {
          linesAdded: parseInt(linesAdded) || 0,
          linesDeleted: parseInt(linesDeleted) || 0,
          filesChanged: filesMerged.length,
          stats: mergeStats,
        },
        conflictResolution: {
          hasConflicts: conflictFiles.length > 0,
          conflictFiles,
          resolvedConflicts: conflictFiles.length === 0,
        },
        branchImpact: {
          currentBranch,
          ahead: parseInt(branchAhead),
          hasUpstream: branchAhead !== "0",
        },
        repositoryHealth,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.warn(
        "⚠️ Could not capture complete post-merge state:",
        error.message
      );
      return {
        mergeInfo: {
          sha: "unknown",
          message: "unknown",
          author: "unknown",
          date: "unknown",
          shortSha: "unknown",
          isMerge: false,
          sourceBranch: "unknown",
          parents: [],
        },
        filesMerged: [],
        knowledgeFilesMerged: [],
        hooksMerged: [],
        mergeSize: {
          linesAdded: 0,
          linesDeleted: 0,
          filesChanged: 0,
          stats: "",
        },
        conflictResolution: {
          hasConflicts: false,
          conflictFiles: [],
          resolvedConflicts: true,
        },
        branchImpact: {
          currentBranch: "unknown",
          ahead: 0,
          hasUpstream: false,
        },
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  },

  assessMergeImpact(gitState) {
    const impact = {
      level: "low",
      description: "",
      affectedAreas: [],
      riskFactors: [],
    };

    const knowledgeFiles = gitState.knowledgeFilesMerged;
    const hooksFiles = gitState.hooksMerged;
    const hasConflicts = gitState.conflictResolution.hasConflicts;

    if (knowledgeFiles.length > 0) {
      impact.affectedAreas.push("knowledge-graph");
      impact.level = "medium";
    }

    if (hooksFiles.length > 0) {
      impact.affectedAreas.push("hooks-system");
      impact.level = "high";
    }

    if (hasConflicts) {
      impact.riskFactors.push("conflicts-detected");
      impact.level = "high";
    }

    if (gitState.mergeSize.linesAdded > 1000) {
      impact.riskFactors.push("large-merge");
      impact.level = "high";
    }

    impact.description = `Impact level: ${
      impact.level
    }. Affected areas: ${impact.affectedAreas.join(
      ", "
    )}. Risk factors: ${impact.riskFactors.join(", ")}`;

    return impact;
  },

  generatePostMergeRecommendations(gitState) {
    const recommendations = [];

    if (gitState.knowledgeFilesMerged.length > 0) {
      recommendations.push(
        `Knowledge graph updated with ${gitState.knowledgeFilesMerged.length} files from merge`
      );
    }

    if (gitState.hooksMerged.length > 0) {
      recommendations.push(
        `Hooks system updated with ${gitState.hooksMerged.length} files from merge`
      );
    }

    if (gitState.conflictResolution.hasConflicts) {
      recommendations.push(
        `Conflicts detected in ${gitState.conflictResolution.conflictFiles.length} files - review resolution`
      );
    }

    if (gitState.mergeSize.linesAdded > 1000) {
      recommendations.push(
        "Large merge detected - consider testing thoroughly"
      );
    }

    if (gitState.branchImpact.ahead > 0) {
      recommendations.push(
        `Branch is ${gitState.branchImpact.ahead} commits ahead - consider pushing`
      );
    }

    return recommendations;
  },

  async checkRepositoryHealth() {
    const { execSync } = await import("node:child_process");

    try {
      // Check if repository is valid
      execSync("git rev-parse --git-dir", { encoding: "utf8" });

      // Check for corruption
      const fsckResult = execSync("git fsck --no-dangling 2>&1", {
        encoding: "utf8",
      });

      // Check repository size
      const repoSize = execSync("du -sh .git 2>/dev/null || echo 'unknown'", {
        encoding: "utf8",
      }).trim();

      return {
        isValid: true,
        isCorrupted:
          fsckResult.includes("error") || fsckResult.includes("fatal"),
        fsckOutput: fsckResult,
        repositorySize: repoSize,
        healthScore: fsckResult.includes("error") ? 0 : 100,
      };
    } catch (error) {
      return {
        isValid: false,
        isCorrupted: true,
        fsckOutput: error.message,
        repositorySize: "unknown",
        healthScore: 0,
        error: error.message,
      };
    }
  },
});
