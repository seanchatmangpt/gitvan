// hooks/knowledge-hooks-suite/pre-commit-git-state-validator.mjs
// Pre-commit Git State Validator - Validates Git state before commits

import { defineJob } from "../../src/core/job-registry.mjs";
import { useGitVan } from "../../src/core/context.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export default defineJob({
  meta: {
    name: "pre-commit-git-state-validator",
    desc: "Validates Git state before commits and writes comprehensive state report",
    tags: ["knowledge-hooks", "git-validation", "pre-commit"],
    version: "1.0.0",
  },

  hooks: ["pre-commit"],

  async run(context) {
    console.log("🔍 Pre-commit Git State Validation");

    try {
      const gitvanContext = useGitVan();
      const { execSync } = await import("node:child_process");

      // Create reports directory
      const reportsDir = join(process.cwd(), "reports", "git-state");
      mkdirSync(reportsDir, { recursive: true });

      // Get comprehensive Git state
      const gitState = await this.captureGitState(context);

      // Generate validation report
      const validationReport = {
        timestamp: new Date().toISOString(),
        hookType: "pre-commit",
        gitState: gitState,
        validation: {
          stagedFiles: gitState.stagedFiles.length,
          unstagedFiles: gitState.unstagedFiles.length,
          untrackedFiles: gitState.untrackedFiles.length,
          branchStatus: gitState.branchStatus,
          workingTreeClean: gitState.workingTreeClean,
          hasStagedChanges: gitState.stagedFiles.length > 0,
        },
        knowledgeGraph: {
          filesAffected: gitState.stagedFiles.filter(
            (f) =>
              f.includes(".ttl") || f.includes(".rdf") || f.includes("graph/")
          ),
          hooksAffected: gitState.stagedFiles.filter(
            (f) => f.includes("hooks/") || f.includes(".hook.")
          ),
          impactAssessment: this.assessKnowledgeGraphImpact(gitState),
        },
        recommendations: this.generateRecommendations(gitState),
      };

      // Write report to disk
      const reportPath = join(reportsDir, `pre-commit-${Date.now()}.json`);
      writeFileSync(reportPath, JSON.stringify(validationReport, null, 2));

      console.log(`   📊 Git State Report: ${reportPath}`);
      console.log(`   📁 Staged files: ${gitState.stagedFiles.length}`);
      console.log(`   📁 Unstaged files: ${gitState.unstagedFiles.length}`);
      console.log(`   📁 Untracked files: ${gitState.untrackedFiles.length}`);
      console.log(`   🌿 Branch: ${gitState.branchStatus.currentBranch}`);

      return {
        success: true,
        reportPath: reportPath,
        validation: validationReport.validation,
        artifacts: [reportPath],
      };
    } catch (error) {
      console.error("❌ Pre-commit validation failed:", error.message);
      throw error;
    }
  },

  async captureGitState(context) {
    const { execSync } = await import("node:child_process");

    try {
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

      // Get branch status
      const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
        encoding: "utf8",
      }).trim();

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

      // Check working tree status
      const workingTreeStatus = execSync("git status --porcelain", {
        encoding: "utf8",
      }).trim();

      // Check repository health
      const repositoryHealth = await this.checkRepositoryHealth();

      return {
        stagedFiles,
        unstagedFiles,
        untrackedFiles,
        branchStatus: {
          currentBranch,
          ahead: parseInt(branchAhead),
          behind: parseInt(branchBehind),
          hasUpstream: branchAhead !== "0" || branchBehind !== "0",
        },
        workingTreeClean: workingTreeStatus.length === 0,
        workingTreeStatus: workingTreeStatus
          .split("\n")
          .filter((l) => l.length > 0),
        repositoryHealth,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.warn("⚠️ Could not capture complete Git state:", error.message);
      return {
        stagedFiles: [],
        unstagedFiles: [],
        untrackedFiles: [],
        branchStatus: {
          currentBranch: "unknown",
          ahead: 0,
          behind: 0,
          hasUpstream: false,
        },
        workingTreeClean: false,
        workingTreeStatus: [],
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  },

  generateRecommendations(gitState) {
    const recommendations = [];

    if (gitState.stagedFiles.length === 0) {
      recommendations.push(
        "No files staged for commit - consider staging changes"
      );
    }

    if (gitState.unstagedFiles.length > 0) {
      recommendations.push(
        `${gitState.unstagedFiles.length} unstaged files - consider staging or stashing`
      );
    }

    if (gitState.untrackedFiles.length > 0) {
      recommendations.push(
        `${gitState.untrackedFiles.length} untracked files - consider adding to .gitignore or staging`
      );
    }

    if (!gitState.workingTreeClean) {
      recommendations.push(
        "Working tree not clean - consider committing or stashing changes"
      );
    }

    const knowledgeFiles = gitState.stagedFiles.filter(
      (f) => f.includes(".ttl") || f.includes(".rdf") || f.includes("graph/")
    );

    if (knowledgeFiles.length > 0) {
      recommendations.push(
        `Knowledge graph files modified: ${knowledgeFiles.join(", ")}`
      );
    }

    return recommendations;
  },

  assessKnowledgeGraphImpact(gitState) {
    const knowledgeFiles = gitState.stagedFiles.filter(
      (f) => f.includes(".ttl") || f.includes(".rdf") || f.includes("graph/")
    );
    const hookFiles = gitState.stagedFiles.filter(
      (f) => f.includes("hooks/") || f.includes(".hook.")
    );

    let impactLevel = "low";
    let impactDescription = "No knowledge graph files affected";

    if (knowledgeFiles.length > 0) {
      impactLevel = "high";
      impactDescription = `Knowledge graph files modified: ${knowledgeFiles.length} files`;
    } else if (hookFiles.length > 0) {
      impactLevel = "medium";
      impactDescription = `Hook files modified: ${hookFiles.length} files`;
    }

    return {
      level: impactLevel,
      description: impactDescription,
      knowledgeFilesCount: knowledgeFiles.length,
      hookFilesCount: hookFiles.length,
      affectedFiles: [...knowledgeFiles, ...hookFiles],
    };
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
