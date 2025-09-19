// hooks/knowledge-hooks-suite/push-to-checkout-git-state-analyzer.mjs
// Push-to-checkout Git State Analyzer - Analyzes Git state when push updates currently checked-out branch

import { defineJob } from "../../src/core/job-registry.mjs";
import { useGitVan } from "../../src/core/context.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export default defineJob({
  meta: {
    name: "push-to-checkout-git-state-analyzer",
    desc: "Analyzes Git state when push updates currently checked-out branch and writes comprehensive analysis report",
    tags: ["knowledge-hooks", "git-analysis", "push-to-checkout"],
    version: "1.0.0",
  },

  hooks: ["push-to-checkout"],

  async run(context) {
    console.log("🔄 Push-to-checkout Git State Analysis");

    try {
      const gitvanContext = useGitVan();
      const { execSync } = await import("node:child_process");

      // Create reports directory
      const reportsDir = join(process.cwd(), "reports", "git-state");
      mkdirSync(reportsDir, { recursive: true });

      // Get comprehensive Git state
      const gitState = await this.capturePushToCheckoutState(context);

      // Generate analysis report
      const analysisReport = {
        timestamp: new Date().toISOString(),
        hookType: "push-to-checkout",
        pushInfo: gitState.pushInfo,
        gitState: gitState,
        analysis: {
          branchUpdated: gitState.branchUpdated,
          commitsPushed: gitState.commitsPushed.length,
          filesPushed: gitState.filesPushed.length,
          knowledgeFilesPushed: gitState.knowledgeFilesPushed.length,
          hooksPushed: gitState.hooksPushed.length,
          pushSize: gitState.pushSize,
          workingTreeStatus: gitState.workingTreeStatus,
        },
        knowledgeGraph: {
          filesAffected: gitState.knowledgeFilesPushed,
          hooksAffected: gitState.hooksPushed,
          impactAssessment: this.assessPushToCheckoutImpact(gitState),
        },
        recommendations: this.generatePushToCheckoutRecommendations(gitState),
        warnings: this.generatePushToCheckoutWarnings(gitState),
      };

      // Write report to disk
      const reportPath = join(
        reportsDir,
        `push-to-checkout-${Date.now()}.json`
      );
      writeFileSync(reportPath, JSON.stringify(analysisReport, null, 2));

      console.log(`   📊 Push-to-checkout Analysis Report: ${reportPath}`);
      console.log(`   🌿 Branch updated: ${gitState.branchUpdated}`);
      console.log(`   📁 Commits pushed: ${gitState.commitsPushed.length}`);
      console.log(`   📁 Files pushed: ${gitState.filesPushed.length}`);
      console.log(
        `   🧠 Knowledge files: ${gitState.knowledgeFilesPushed.length}`
      );
      console.log(`   🔗 Hooks affected: ${gitState.hooksPushed.length}`);

      return {
        success: true,
        reportPath: reportPath,
        analysis: analysisReport.analysis,
        artifacts: [reportPath],
      };
    } catch (error) {
      console.error("❌ Push-to-checkout analysis failed:", error.message);
      throw error;
    }
  },

  async capturePushToCheckoutState(context) {
    const { execSync } = await import("node:child_process");

    try {
      // Get branch information
      const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
        encoding: "utf8",
      }).trim();

      const branchUpdated = currentBranch;

      // Get commits pushed
      const commitsPushed = execSync(`git rev-list @{u}..HEAD`, {
        encoding: "utf8",
      })
        .trim()
        .split("\n")
        .filter((c) => c.length > 0);

      // Get files pushed
      const filesPushed = execSync(`git diff --name-only @{u}..HEAD`, {
        encoding: "utf8",
      })
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      // Get push statistics
      const pushStats = execSync(`git diff --stat @{u}..HEAD`, {
        encoding: "utf8",
      }).trim();

      // Parse push size
      const linesAdded = execSync(
        `git diff --numstat @{u}..HEAD | awk '{sum+=$1} END {print sum+0}'`,
        {
          encoding: "utf8",
        }
      ).trim();

      const linesDeleted = execSync(
        `git diff --numstat @{u}..HEAD | awk '{sum+=$2} END {print sum+0}'`,
        {
          encoding: "utf8",
        }
      ).trim();

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

      // Get commit messages for analysis
      const commitMessages = commitsPushed.map((sha) => {
        try {
          return execSync(`git log --format=%s -n 1 ${sha}`, {
            encoding: "utf8",
          }).trim();
        } catch {
          return "unknown";
        }
      });

      return {
        pushInfo: {
          branchUpdated,
          commitsPushed,
          commitMessages,
          timestamp: new Date().toISOString(),
        },
        branchUpdated,
        commitsPushed,
        filesPushed,
        knowledgeFilesPushed: filesPushed.filter(
          (f) =>
            f.includes(".ttl") || f.includes(".rdf") || f.includes("graph/")
        ),
        hooksPushed: filesPushed.filter(
          (f) => f.includes("hooks/") || f.includes(".hook.")
        ),
        pushSize: {
          linesAdded: parseInt(linesAdded) || 0,
          linesDeleted: parseInt(linesDeleted) || 0,
          filesChanged: filesPushed.length,
          stats: pushStats,
        },
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
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.warn(
        "⚠️ Could not capture complete push-to-checkout state:",
        error.message
      );
      return {
        pushInfo: {
          branchUpdated: "unknown",
          commitsPushed: [],
          commitMessages: [],
          timestamp: new Date().toISOString(),
        },
        branchUpdated: "unknown",
        commitsPushed: [],
        filesPushed: [],
        knowledgeFilesPushed: [],
        hooksPushed: [],
        pushSize: {
          linesAdded: 0,
          linesDeleted: 0,
          filesChanged: 0,
          stats: "",
        },
        workingTreeStatus: { status: "unknown", clean: false, files: [] },
        repositoryHealth: { totalCommits: 0, totalBranches: 0, totalTags: 0 },
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  },

  assessPushToCheckoutImpact(gitState) {
    const impact = {
      level: "low",
      description: "",
      affectedAreas: [],
      riskFactors: [],
    };

    const knowledgeFiles = gitState.knowledgeFilesPushed;
    const hooksFiles = gitState.hooksPushed;
    const commitsCount = gitState.commitsPushed.length;
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

  generatePushToCheckoutRecommendations(gitState) {
    const recommendations = [];

    if (gitState.branchUpdated) {
      recommendations.push(`Branch ${gitState.branchUpdated} updated via push`);
    }

    if (gitState.knowledgeFilesPushed.length > 0) {
      recommendations.push(
        `Knowledge graph updated with ${gitState.knowledgeFilesPushed.length} files`
      );
    }

    if (gitState.hooksPushed.length > 0) {
      recommendations.push(
        `Hooks system updated with ${gitState.hooksPushed.length} files`
      );
    }

    if (!gitState.workingTreeStatus.clean) {
      recommendations.push(
        "Working tree is dirty - consider committing or stashing changes"
      );
    }

    if (gitState.commitsPushed.length > 5) {
      recommendations.push(
        "Large push detected - consider breaking into smaller pushes"
      );
    }

    if (gitState.pushSize.linesAdded > 1000) {
      recommendations.push("Large changes detected - ensure all tests pass");
    }

    return recommendations;
  },

  generatePushToCheckoutWarnings(gitState) {
    const warnings = [];

    if (gitState.commitsPushed.length > 20) {
      warnings.push(
        "⚠️ Very large push detected - may cause issues for other developers"
      );
    }

    if (gitState.pushSize.linesAdded > 10000) {
      warnings.push("⚠️ Massive changes detected - consider code review");
    }

    if (gitState.hooksPushed.length > 0) {
      warnings.push("⚠️ Hooks system changes detected - ensure compatibility");
    }

    if (!gitState.workingTreeStatus.clean) {
      warnings.push("⚠️ Dirty working tree - push may cause conflicts");
    }

    return warnings;
  },
});

