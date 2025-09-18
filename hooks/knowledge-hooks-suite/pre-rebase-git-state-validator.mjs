// hooks/knowledge-hooks-suite/pre-rebase-git-state-validator.mjs
// Pre-rebase Git State Validator - Validates Git state before rebases

import { defineJob } from "../../src/core/job-registry.mjs";
import { useGitVan } from "../../src/core/context.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export default defineJob({
  meta: {
    name: "pre-rebase-git-state-validator",
    desc: "Validates Git state before rebases and writes comprehensive validation report",
    tags: ["knowledge-hooks", "git-validation", "pre-rebase"],
    version: "1.0.0",
  },

  hooks: ["pre-rebase"],

  async run(context) {
    console.log("🔄 Pre-rebase Git State Validation");

    try {
      const gitvanContext = useGitVan();
      const { execSync } = await import("node:child_process");

      // Create reports directory
      const reportsDir = join(process.cwd(), "reports", "git-state");
      mkdirSync(reportsDir, { recursive: true });

      // Get comprehensive Git state
      const gitState = await this.capturePreRebaseState(context);

      // Generate validation report
      const validationReport = {
        timestamp: new Date().toISOString(),
        hookType: "pre-rebase",
        gitState: gitState,
        validation: {
          rebaseTarget: gitState.rebaseTarget,
          commitsToRebase: gitState.commitsToRebase.length,
          filesToRebase: gitState.filesToRebase.length,
          knowledgeFilesToRebase: gitState.knowledgeFilesToRebase.length,
          hooksToRebase: gitState.hooksToRebase.length,
          rebaseSize: gitState.rebaseSize,
          workingTreeStatus: gitState.workingTreeStatus,
        },
        knowledgeGraph: {
          filesAffected: gitState.knowledgeFilesToRebase,
          hooksAffected: gitState.hooksToRebase,
          impactAssessment: this.assessPreRebaseImpact(gitState),
        },
        recommendations: this.generatePreRebaseRecommendations(gitState),
        warnings: this.generatePreRebaseWarnings(gitState),
      };

      // Write report to disk
      const reportPath = join(reportsDir, `pre-rebase-${Date.now()}.json`);
      writeFileSync(reportPath, JSON.stringify(validationReport, null, 2));

      console.log(`   📊 Pre-rebase Validation Report: ${reportPath}`);
      console.log(`   🎯 Rebase target: ${gitState.rebaseTarget}`);
      console.log(
        `   📁 Commits to rebase: ${gitState.commitsToRebase.length}`
      );
      console.log(`   📁 Files to rebase: ${gitState.filesToRebase.length}`);
      console.log(
        `   🧠 Knowledge files: ${gitState.knowledgeFilesToRebase.length}`
      );
      console.log(`   🔗 Hooks affected: ${gitState.hooksToRebase.length}`);

      return {
        success: true,
        reportPath: reportPath,
        validation: validationReport.validation,
        artifacts: [reportPath],
      };
    } catch (error) {
      console.error("❌ Pre-rebase validation failed:", error.message);
      throw error;
    }
  },

  async capturePreRebaseState(context) {
    const { execSync } = await import("node:child_process");

    try {
      // Parse stdin for pre-rebase hook
      const stdin = process.stdin;
      let rebaseTarget = "unknown";

      if (stdin && !stdin.isTTY) {
        const input = await new Promise((resolve) => {
          let data = "";
          stdin.on("data", (chunk) => (data += chunk));
          stdin.on("end", () => resolve(data));
        });

        const lines = input
          .trim()
          .split("\n")
          .filter((line) => line.length > 0);
        if (lines.length > 0) {
          rebaseTarget = lines[0];
        }
      }

      // Get current branch
      const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
        encoding: "utf8",
      }).trim();

      // Get commits to rebase
      const commitsToRebase = execSync(`git rev-list ${rebaseTarget}..HEAD`, {
        encoding: "utf8",
      })
        .trim()
        .split("\n")
        .filter((c) => c.length > 0);

      // Get files to rebase
      const filesToRebase = new Set();
      for (const commit of commitsToRebase) {
        try {
          const files = execSync(
            `git diff-tree --no-commit-id --name-only -r ${commit}`,
            {
              encoding: "utf8",
            }
          )
            .trim()
            .split("\n")
            .filter((f) => f.length > 0);
          files.forEach((f) => filesToRebase.add(f));
        } catch {
          // Could not get files for commit
        }
      }

      const filesToRebaseArray = Array.from(filesToRebase);

      // Get rebase statistics
      const rebaseStats = execSync(`git diff --stat ${rebaseTarget}..HEAD`, {
        encoding: "utf8",
      }).trim();

      // Parse rebase size
      const linesAdded = execSync(
        `git diff --numstat ${rebaseTarget}..HEAD | awk '{sum+=$1} END {print sum+0}'`,
        {
          encoding: "utf8",
        }
      ).trim();

      const linesDeleted = execSync(
        `git diff --numstat ${rebaseTarget}..HEAD | awk '{sum+=$2} END {print sum+0}'`,
        {
          encoding: "utf8",
        }
      ).trim();

      // Get working tree status
      const workingTreeStatus = execSync("git status --porcelain", {
        encoding: "utf8",
      }).trim();

      const workingTreeClean = workingTreeStatus.length === 0;

      // Check repository health
      const repositoryHealth = await this.checkRepositoryHealth();

      return {
        rebaseTarget,
        currentBranch,
        commitsToRebase,
        filesToRebase: filesToRebaseArray,
        knowledgeFilesToRebase: filesToRebaseArray.filter(
          (f) =>
            f.includes(".ttl") || f.includes(".rdf") || f.includes("graph/")
        ),
        hooksToRebase: filesToRebaseArray.filter(
          (f) => f.includes("hooks/") || f.includes(".hook.")
        ),
        rebaseSize: {
          linesAdded: parseInt(linesAdded) || 0,
          linesDeleted: parseInt(linesDeleted) || 0,
          filesChanged: filesToRebaseArray.length,
          stats: rebaseStats,
        },
        workingTreeStatus: {
          status: workingTreeClean ? "clean" : "dirty",
          clean: workingTreeClean,
          files: workingTreeStatus.split("\n").filter((l) => l.length > 0),
        },
        repositoryHealth,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.warn(
        "⚠️ Could not capture complete pre-rebase state:",
        error.message
      );
      return {
        rebaseTarget: "unknown",
        currentBranch: "unknown",
        commitsToRebase: [],
        filesToRebase: [],
        knowledgeFilesToRebase: [],
        hooksToRebase: [],
        rebaseSize: {
          linesAdded: 0,
          linesDeleted: 0,
          filesChanged: 0,
          stats: "",
        },
        workingTreeStatus: { status: "unknown", clean: false, files: [] },
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  },

  assessPreRebaseImpact(gitState) {
    const impact = {
      level: "low",
      description: "",
      affectedAreas: [],
      riskFactors: [],
    };

    const knowledgeFiles = gitState.knowledgeFilesToRebase;
    const hooksFiles = gitState.hooksToRebase;
    const commitsCount = gitState.commitsToRebase.length;
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

    if (commitsCount > 10) {
      impact.riskFactors.push("large-rebase");
      impact.level = "high";
    }

    if (gitState.rebaseSize.linesAdded > 5000) {
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

  generatePreRebaseRecommendations(gitState) {
    const recommendations = [];

    if (gitState.commitsToRebase.length === 0) {
      recommendations.push("No commits to rebase - already up to date");
    }

    if (gitState.knowledgeFilesToRebase.length > 0) {
      recommendations.push(
        `Knowledge graph will be affected by rebase: ${gitState.knowledgeFilesToRebase.length} files`
      );
    }

    if (gitState.hooksToRebase.length > 0) {
      recommendations.push(
        `Hooks system will be affected by rebase: ${gitState.hooksToRebase.length} files`
      );
    }

    if (!gitState.workingTreeStatus.clean) {
      recommendations.push(
        "Working tree is dirty - consider stashing changes before rebase"
      );
    }

    if (gitState.commitsToRebase.length > 5) {
      recommendations.push(
        "Large rebase detected - consider breaking into smaller rebases"
      );
    }

    return recommendations;
  },

  generatePreRebaseWarnings(gitState) {
    const warnings = [];

    if (gitState.commitsToRebase.length > 20) {
      warnings.push("⚠️ Very large rebase detected - may cause conflicts");
    }

    if (gitState.rebaseSize.linesAdded > 10000) {
      warnings.push("⚠️ Massive changes in rebase - ensure compatibility");
    }

    if (gitState.hooksToRebase.length > 0) {
      warnings.push("⚠️ Hooks system changes in rebase - ensure compatibility");
    }

    if (!gitState.workingTreeStatus.clean) {
      warnings.push("⚠️ Dirty working tree - rebase may fail");
    }

    return warnings;
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
