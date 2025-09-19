// hooks/knowledge-hooks-suite/pre-applypatch-git-state-validator.mjs
// Pre-applypatch Git State Validator - Validates Git state before applying patches

import { defineJob } from "../../src/core/job-registry.mjs";
import { useGitVan } from "../../src/core/context.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export default defineJob({
  meta: {
    name: "pre-applypatch-git-state-validator",
    desc: "Validates Git state before applying patches and writes comprehensive validation report",
    tags: ["knowledge-hooks", "git-validation", "pre-applypatch"],
    version: "1.0.0",
  },

  hooks: ["pre-applypatch"],

  async run(context) {
    console.log("🔧 Pre-applypatch Git State Validation");

    try {
      const gitvanContext = useGitVan();
      const { execSync } = await import("node:child_process");

      // Create reports directory
      const reportsDir = join(process.cwd(), "reports", "git-state");
      mkdirSync(reportsDir, { recursive: true });

      // Get comprehensive Git state
      const gitState = await this.capturePreApplypatchState(context);

      // Generate validation report
      const validationReport = {
        timestamp: new Date().toISOString(),
        hookType: "pre-applypatch",
        gitState: gitState,
        validation: {
          patchFile: gitState.patchFile,
          workingTreeStatus: gitState.workingTreeStatus,
          repositoryHealth: gitState.repositoryHealth,
          patchSize: gitState.patchSize,
        },
        knowledgeGraph: {
          filesAffected: gitState.filesAffected,
          hooksAffected: gitState.hooksAffected,
          impactAssessment: this.assessPreApplypatchImpact(gitState),
        },
        recommendations: this.generatePreApplypatchRecommendations(gitState),
        warnings: this.generatePreApplypatchWarnings(gitState),
      };

      // Write report to disk
      const reportPath = join(reportsDir, `pre-applypatch-${Date.now()}.json`);
      writeFileSync(reportPath, JSON.stringify(validationReport, null, 2));

      console.log(`   📊 Pre-applypatch Validation Report: ${reportPath}`);
      console.log(`   🔧 Patch file: ${gitState.patchFile}`);
      console.log(
        `   📁 Working tree status: ${gitState.workingTreeStatus.status}`
      );
      console.log(
        `   📏 Patch size: ${gitState.patchSize.linesAdded} additions, ${gitState.patchSize.linesDeleted} deletions`
      );

      return {
        success: true,
        reportPath: reportPath,
        validation: validationReport.validation,
        artifacts: [reportPath],
      };
    } catch (error) {
      console.error("❌ Pre-applypatch validation failed:", error.message);
      throw error;
    }
  },

  async capturePreApplypatchState(context) {
    const { execSync } = await import("node:child_process");

    try {
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
        patchFile: context.patchFile || "unknown",
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
        patchSize: {
          linesAdded: parseInt(linesAdded) || 0,
          linesDeleted: parseInt(linesDeleted) || 0,
          filesChanged: stagedFiles.length,
          stats: patchStats,
        },
        filesAffected: [
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
        hooksAffected: [
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
        "⚠️ Could not capture complete pre-applypatch state:",
        error.message
      );
      return {
        patchFile: "unknown",
        currentBranch: "unknown",
        workingTreeStatus: { status: "unknown", clean: false, files: [] },
        repositoryHealth: { totalCommits: 0, totalBranches: 0, totalTags: 0 },
        stagedFiles: [],
        unstagedFiles: [],
        untrackedFiles: [],
        patchSize: {
          linesAdded: 0,
          linesDeleted: 0,
          filesChanged: 0,
          stats: "",
        },
        filesAffected: [],
        hooksAffected: [],
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  },

  assessPreApplypatchImpact(gitState) {
    const impact = {
      level: "low",
      description: "",
      affectedAreas: [],
      riskFactors: [],
    };

    const knowledgeFiles = gitState.filesAffected;
    const hooksFiles = gitState.hooksAffected;
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

  generatePreApplypatchRecommendations(gitState) {
    const recommendations = [];

    if (gitState.filesAffected.length > 0) {
      recommendations.push(
        `Knowledge graph will be affected: ${gitState.filesAffected.length} files`
      );
    }

    if (gitState.hooksAffected.length > 0) {
      recommendations.push(
        `Hooks system will be affected: ${gitState.hooksAffected.length} files`
      );
    }

    if (!gitState.workingTreeStatus.clean) {
      recommendations.push(
        "Working tree is dirty - consider committing or stashing changes"
      );
    }

    if (gitState.patchSize.linesAdded > 500) {
      recommendations.push(
        "Large patch detected - consider breaking into smaller patches"
      );
    }

    return recommendations;
  },

  generatePreApplypatchWarnings(gitState) {
    const warnings = [];

    if (gitState.patchSize.linesAdded > 2000) {
      warnings.push("⚠️ Very large patch detected - may cause issues");
    }

    if (gitState.hooksAffected.length > 0) {
      warnings.push("⚠️ Hooks system changes detected - ensure compatibility");
    }

    if (!gitState.workingTreeStatus.clean) {
      warnings.push("⚠️ Dirty working tree - patch application may fail");
    }

    return warnings;
  },
});

