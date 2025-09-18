// hooks/knowledge-hooks-suite/post-applypatch-git-state-analyzer.mjs
// Post-applypatch Git State Analyzer - Analyzes Git state after applying patches

import { defineJob } from "../../src/core/job-registry.mjs";
import { useGitVan } from "../../src/core/context.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export default defineJob({
  meta: {
    name: "post-applypatch-git-state-analyzer",
    desc: "Analyzes Git state after applying patches and writes comprehensive analysis report",
    tags: ["knowledge-hooks", "git-analysis", "post-applypatch"],
    version: "1.0.0",
  },

  hooks: ["post-applypatch"],

  async run(context) {
    console.log("✅ Post-applypatch Git State Analysis");

    try {
      const gitvanContext = useGitVan();
      const { execSync } = await import("node:child_process");

      // Create reports directory
      const reportsDir = join(process.cwd(), "reports", "git-state");
      mkdirSync(reportsDir, { recursive: true });

      // Get comprehensive Git state
      const gitState = await this.capturePostApplypatchState(context);

      // Generate analysis report
      const analysisReport = {
        timestamp: new Date().toISOString(),
        hookType: "post-applypatch",
        patchInfo: gitState.patchInfo,
        gitState: gitState,
        analysis: {
          patchApplied: gitState.patchApplied,
          filesPatched: gitState.filesPatched.length,
          knowledgeFilesPatched: gitState.knowledgeFilesPatched.length,
          hooksPatched: gitState.hooksPatched.length,
          patchSize: gitState.patchSize,
          workingTreeStatus: gitState.workingTreeStatus,
        },
        knowledgeGraph: {
          filesAffected: gitState.knowledgeFilesPatched,
          hooksAffected: gitState.hooksPatched,
          impactAssessment: this.assessPostApplypatchImpact(gitState),
        },
        recommendations: this.generatePostApplypatchRecommendations(gitState),
      };

      // Write report to disk
      const reportPath = join(reportsDir, `post-applypatch-${Date.now()}.json`);
      writeFileSync(reportPath, JSON.stringify(analysisReport, null, 2));

      console.log(`   📊 Post-applypatch Analysis Report: ${reportPath}`);
      console.log(`   ✅ Patch applied: ${gitState.patchApplied}`);
      console.log(`   📁 Files patched: ${gitState.filesPatched.length}`);
      console.log(
        `   🧠 Knowledge files: ${gitState.knowledgeFilesPatched.length}`
      );
      console.log(`   🔗 Hooks affected: ${gitState.hooksPatched.length}`);

      return {
        success: true,
        reportPath: reportPath,
        analysis: analysisReport.analysis,
        artifacts: [reportPath],
      };
    } catch (error) {
      console.error("❌ Post-applypatch analysis failed:", error.message);
      throw error;
    }
  },

  async capturePostApplypatchState(context) {
    const { execSync } = await import("node:child_process");

    try {
      // Get patch information
      const patchFile = context.patchFile || "unknown";
      const patchApplied = true; // If we're in post-applypatch, patch was applied

      // Get current branch
      const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
        encoding: "utf8",
      }).trim();

      // Get working tree status
      const workingTreeStatus = execSync("git status --porcelain", {
        encoding: "utf8",
      }).trim();

      const workingTreeClean = workingTreeStatus.length === 0;

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

      // Get staged files
      const stagedFiles = execSync("git diff --cached --name-only", {
        encoding: "utf8",
      })
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      // Get unstaged files
      const unstagedFiles = execSync("git diff --name-only", {
        encoding: "utf8",
      })
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      // Get untracked files
      const untrackedFiles = execSync(
        "git ls-files --others --exclude-standard",
        {
          encoding: "utf8",
        }
      )
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      // Get patch statistics
      const patchStats = execSync(
        "git diff --stat HEAD~1 HEAD 2>/dev/null || echo ''",
        {
          encoding: "utf8",
        }
      ).trim();

      // Parse patch size
      const linesAdded = execSync(
        "git diff --numstat HEAD~1 HEAD 2>/dev/null | awk '{sum+=$1} END {print sum+0}' || echo 0",
        {
          encoding: "utf8",
        }
      ).trim();

      const linesDeleted = execSync(
        "git diff --numstat HEAD~1 HEAD 2>/dev/null | awk '{sum+=$2} END {print sum+0}' || echo 0",
        {
          encoding: "utf8",
        }
      ).trim();

      return {
        patchInfo: {
          patchFile,
          patchApplied,
          timestamp: new Date().toISOString(),
        },
        patchApplied,
        currentBranch,
        workingTreeStatus: {
          status: workingTreeClean ? "clean" : "dirty",
          clean: workingTreeClean,
          files: workingTreeStatus.split("\n").filter((l) => l.length > 0),
        },
        repositoryHealth: {
          totalCommits: parseInt(totalCommits),
          totalBranches: parseInt(totalBranches),
          totalTags: parseInt(totalTags),
        },
        stagedFiles,
        unstagedFiles,
        untrackedFiles,
        filesPatched: [...stagedFiles, ...unstagedFiles, ...untrackedFiles],
        patchSize: {
          linesAdded: parseInt(linesAdded) || 0,
          linesDeleted: parseInt(linesDeleted) || 0,
          filesChanged: stagedFiles.length,
          stats: patchStats,
        },
        knowledgeFilesPatched: [
          ...stagedFiles.filter(
            (f) =>
              f.includes(".ttl") || f.includes(".rdf") || f.includes("graph/")
          ),
          ...unstagedFiles.filter(
            (f) =>
              f.includes(".ttl") || f.includes(".rdf") || f.includes("graph/")
          ),
          ...untrackedFiles.filter(
            (f) =>
              f.includes(".ttl") || f.includes(".rdf") || f.includes("graph/")
          ),
        ],
        hooksPatched: [
          ...stagedFiles.filter(
            (f) => f.includes("hooks/") || f.includes(".hook.")
          ),
          ...unstagedFiles.filter(
            (f) => f.includes("hooks/") || f.includes(".hook.")
          ),
          ...untrackedFiles.filter(
            (f) => f.includes("hooks/") || f.includes(".hook.")
          ),
        ],
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.warn(
        "⚠️ Could not capture complete post-applypatch state:",
        error.message
      );
      return {
        patchInfo: {
          patchFile: "unknown",
          patchApplied: false,
          timestamp: new Date().toISOString(),
        },
        patchApplied: false,
        currentBranch: "unknown",
        workingTreeStatus: { status: "unknown", clean: false, files: [] },
        repositoryHealth: { totalCommits: 0, totalBranches: 0, totalTags: 0 },
        stagedFiles: [],
        unstagedFiles: [],
        untrackedFiles: [],
        filesPatched: [],
        patchSize: {
          linesAdded: 0,
          linesDeleted: 0,
          filesChanged: 0,
          stats: "",
        },
        knowledgeFilesPatched: [],
        hooksPatched: [],
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  },

  assessPostApplypatchImpact(gitState) {
    const impact = {
      level: "low",
      description: "",
      affectedAreas: [],
      riskFactors: [],
    };

    const knowledgeFiles = gitState.knowledgeFilesPatched;
    const hooksFiles = gitState.hooksPatched;
    const workingTreeDirty = !gitState.workingTreeStatus.clean;

    if (knowledgeFiles.length > 0) {
      impact.affectedAreas.push("knowledge-graph");
      impact.level = "medium";
    }

    if (hooksFiles.length > 0) {
      impact.affectedAreas.push("hooks-system");
      impact.level = "high";
    }

    if (workingTreeDirty) {
      impact.riskFactors.push("dirty-working-tree");
      impact.level = "high";
    }

    if (gitState.patchSize.linesAdded > 1000) {
      impact.riskFactors.push("large-patch");
      impact.level = "high";
    }

    impact.description = `Impact level: ${
      impact.level
    }. Affected areas: ${impact.affectedAreas.join(
      ", "
    )}. Risk factors: ${impact.riskFactors.join(", ")}`;

    return impact;
  },

  generatePostApplypatchRecommendations(gitState) {
    const recommendations = [];

    if (gitState.patchApplied) {
      recommendations.push("Patch successfully applied");
    } else {
      recommendations.push("Patch application failed - review errors");
    }

    if (gitState.knowledgeFilesPatched.length > 0) {
      recommendations.push(
        `Knowledge graph updated with ${gitState.knowledgeFilesPatched.length} files`
      );
    }

    if (gitState.hooksPatched.length > 0) {
      recommendations.push(
        `Hooks system updated with ${gitState.hooksPatched.length} files`
      );
    }

    if (!gitState.workingTreeStatus.clean) {
      recommendations.push(
        "Working tree is dirty - consider committing or stashing changes"
      );
    }

    if (gitState.patchSize.linesAdded > 500) {
      recommendations.push("Large patch applied - consider testing thoroughly");
    }

    return recommendations;
  },
});
