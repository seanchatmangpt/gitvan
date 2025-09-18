// hooks/knowledge-hooks-suite/post-checkout-git-state-analyzer.mjs
// Post-checkout Git State Analyzer - Analyzes Git state after checkouts

import { defineJob } from "../../src/core/job-registry.mjs";
import { useGitVan } from "../../src/core/context.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export default defineJob({
  meta: {
    name: "post-checkout-git-state-analyzer",
    desc: "Analyzes Git state after checkouts and writes comprehensive checkout analysis report",
    tags: ["knowledge-hooks", "git-analysis", "post-checkout"],
    version: "1.0.0",
  },

  hooks: ["post-checkout"],

  async run(context) {
    console.log("🌿 Post-checkout Git State Analysis");

    try {
      const gitvanContext = useGitVan();
      const { execSync } = await import("node:child_process");

      // Create reports directory
      const reportsDir = join(process.cwd(), "reports", "git-state");
      mkdirSync(reportsDir, { recursive: true });

      // Get comprehensive Git state
      const gitState = await this.capturePostCheckoutState(context);

      // Generate analysis report
      const analysisReport = {
        timestamp: new Date().toISOString(),
        hookType: "post-checkout",
        checkoutInfo: gitState.checkoutInfo,
        gitState: gitState,
        analysis: {
          branchSwitch: gitState.branchSwitch,
          workingTreeStatus: gitState.workingTreeStatus,
          knowledgeFilesStatus: gitState.knowledgeFilesStatus,
          hooksStatus: gitState.hooksStatus,
          repositoryState: gitState.repositoryState,
        },
        knowledgeGraph: {
          filesAffected: gitState.knowledgeFilesStatus,
          hooksAffected: gitState.hooksStatus,
          impactAssessment: this.assessCheckoutImpact(gitState),
        },
        recommendations: this.generatePostCheckoutRecommendations(gitState),
      };

      // Write report to disk
      const reportPath = join(reportsDir, `post-checkout-${Date.now()}.json`);
      writeFileSync(reportPath, JSON.stringify(analysisReport, null, 2));

      console.log(`   📊 Post-checkout Analysis Report: ${reportPath}`);
      console.log(`   🌿 Branch: ${gitState.checkoutInfo.currentBranch}`);
      console.log(
        `   📁 Working tree status: ${gitState.workingTreeStatus.status}`
      );
      console.log(
        `   🧠 Knowledge files: ${gitState.knowledgeFilesStatus.length}`
      );
      console.log(`   🔗 Hooks affected: ${gitState.hooksStatus.length}`);

      return {
        success: true,
        reportPath: reportPath,
        analysis: analysisReport.analysis,
        artifacts: [reportPath],
      };
    } catch (error) {
      console.error("❌ Post-checkout analysis failed:", error.message);
      throw error;
    }
  },

  async capturePostCheckoutState(context) {
    const { execSync } = await import("node:child_process");

    try {
      // Get checkout information
      const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
        encoding: "utf8",
      }).trim();

      const currentCommit = execSync("git rev-parse HEAD", {
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

      // Get working tree status
      const workingTreeStatus = execSync("git status --porcelain", {
        encoding: "utf8",
      }).trim();

      const workingTreeClean = workingTreeStatus.length === 0;

      // Get branch information
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

      // Get repository state
      const totalCommits = execSync("git rev-list --count HEAD", {
        encoding: "utf8",
      }).trim();
      const totalBranches = execSync("git branch -r | wc -l", {
        encoding: "utf8",
      }).trim();
      const totalTags = execSync("git tag | wc -l", {
        encoding: "utf8",
      }).trim();

      // Check repository health
      const repositoryHealth = await this.checkRepositoryHealth();

      // Get knowledge files status
      const knowledgeFiles = execSync(
        "find . -name '*.ttl' -o -name '*.rdf' -o -path '*/graph/*' | head -20",
        {
          encoding: "utf8",
        }
      )
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      // Get hooks status
      const hooksFiles = execSync(
        "find . -path '*/hooks/*' -o -name '*.hook.*' | head -20",
        {
          encoding: "utf8",
        }
      )
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      // Check if this is a branch switch
      const branchSwitch = {
        isBranchSwitch: true, // Assume branch switch for post-checkout
        previousBranch: "unknown", // Would need context to determine
        currentBranch,
      };

      return {
        checkoutInfo: {
          currentBranch,
          currentCommit,
          commitMessage,
          commitAuthor,
          commitDate,
          shortSha: currentCommit.substring(0, 8),
        },
        branchSwitch,
        workingTreeStatus: {
          status: workingTreeClean ? "clean" : "dirty",
          clean: workingTreeClean,
          files: workingTreeStatus.split("\n").filter((l) => l.length > 0),
        },
        knowledgeFilesStatus: knowledgeFiles,
        hooksStatus: hooksFiles,
        repositoryState: {
          totalCommits: parseInt(totalCommits),
          totalBranches: parseInt(totalBranches),
          totalTags: parseInt(totalTags),
          branchAhead: parseInt(branchAhead),
          branchBehind: parseInt(branchBehind),
          hasUpstream: branchAhead !== "0" || branchBehind !== "0",
        },
        repositoryHealth,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.warn(
        "⚠️ Could not capture complete post-checkout state:",
        error.message
      );
      return {
        checkoutInfo: {
          currentBranch: "unknown",
          currentCommit: "unknown",
          commitMessage: "unknown",
          commitAuthor: "unknown",
          commitDate: "unknown",
          shortSha: "unknown",
        },
        branchSwitch: {
          isBranchSwitch: false,
          previousBranch: "unknown",
          currentBranch: "unknown",
        },
        workingTreeStatus: { status: "unknown", clean: false, files: [] },
        knowledgeFilesStatus: [],
        hooksStatus: [],
        repositoryState: {
          totalCommits: 0,
          totalBranches: 0,
          totalTags: 0,
          branchAhead: 0,
          branchBehind: 0,
          hasUpstream: false,
        },
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  },

  assessCheckoutImpact(gitState) {
    const impact = {
      level: "low",
      description: "",
      affectedAreas: [],
      riskFactors: [],
    };

    const knowledgeFiles = gitState.knowledgeFilesStatus;
    const hooksFiles = gitState.hooksStatus;
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

    if (gitState.repositoryState.branchAhead > 10) {
      impact.riskFactors.push("branch-ahead");
      impact.level = "medium";
    }

    impact.description = `Impact level: ${
      impact.level
    }. Affected areas: ${impact.affectedAreas.join(
      ", "
    )}. Risk factors: ${impact.riskFactors.join(", ")}`;

    return impact;
  },

  generatePostCheckoutRecommendations(gitState) {
    const recommendations = [];

    if (gitState.branchSwitch.isBranchSwitch) {
      recommendations.push(
        `Switched to branch: ${gitState.checkoutInfo.currentBranch}`
      );
    }

    if (gitState.knowledgeFilesStatus.length > 0) {
      recommendations.push(
        `Knowledge graph files available: ${gitState.knowledgeFilesStatus.length}`
      );
    }

    if (gitState.hooksStatus.length > 0) {
      recommendations.push(
        `Hooks system files available: ${gitState.hooksStatus.length}`
      );
    }

    if (!gitState.workingTreeStatus.clean) {
      recommendations.push(
        "Working tree is dirty - consider committing or stashing changes"
      );
    }

    if (gitState.repositoryState.branchAhead > 0) {
      recommendations.push(
        `Branch is ${gitState.repositoryState.branchAhead} commits ahead - consider pushing`
      );
    }

    if (gitState.repositoryState.branchBehind > 0) {
      recommendations.push(
        `Branch is ${gitState.repositoryState.branchBehind} commits behind - consider pulling`
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
