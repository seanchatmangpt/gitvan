// hooks/knowledge-hooks-suite/pre-receive-git-state-validator.mjs
// Pre-receive Git State Validator - Validates Git state before receiving pushes

import { defineJob } from "../../src/core/job-registry.mjs";
import { useGitVan } from "../../src/core/context.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export default defineJob({
  meta: {
    name: "pre-receive-git-state-validator",
    desc: "Validates Git state before receiving pushes and writes comprehensive validation report",
    tags: ["knowledge-hooks", "git-validation", "pre-receive", "server-side"],
    version: "1.0.0",
  },

  hooks: ["pre-receive"],

  async run(context) {
    console.log("📥 Pre-receive Git State Validation");

    try {
      const gitvanContext = useGitVan();
      const { execSync } = await import("node:child_process");

      // Create reports directory
      const reportsDir = join(process.cwd(), "reports", "git-state");
      mkdirSync(reportsDir, { recursive: true });

      // Get comprehensive Git state
      const gitState = await this.capturePreReceiveState(context);

      // Generate validation report
      const validationReport = {
        timestamp: new Date().toISOString(),
        hookType: "pre-receive",
        gitState: gitState,
        validation: {
          refsToUpdate: gitState.refsToUpdate.length,
          commitsToReceive: gitState.commitsToReceive.length,
          filesToReceive: gitState.filesToReceive.length,
          knowledgeFilesToReceive: gitState.knowledgeFilesToReceive.length,
          hooksToReceive: gitState.hooksToReceive.length,
          pushSize: gitState.pushSize,
          repositoryHealth: gitState.repositoryHealth,
        },
        knowledgeGraph: {
          filesAffected: gitState.knowledgeFilesToReceive,
          hooksAffected: gitState.hooksToReceive,
          impactAssessment: this.assessPreReceiveImpact(gitState),
        },
        recommendations: this.generatePreReceiveRecommendations(gitState),
        warnings: this.generatePreReceiveWarnings(gitState),
      };

      // Write report to disk
      const reportPath = join(reportsDir, `pre-receive-${Date.now()}.json`);
      writeFileSync(reportPath, JSON.stringify(validationReport, null, 2));

      console.log(`   📊 Pre-receive Validation Report: ${reportPath}`);
      console.log(`   📁 Refs to update: ${gitState.refsToUpdate.length}`);
      console.log(
        `   📁 Commits to receive: ${gitState.commitsToReceive.length}`
      );
      console.log(`   📁 Files to receive: ${gitState.filesToReceive.length}`);
      console.log(
        `   🧠 Knowledge files: ${gitState.knowledgeFilesToReceive.length}`
      );
      console.log(`   🔗 Hooks affected: ${gitState.hooksToReceive.length}`);

      return {
        success: true,
        reportPath: reportPath,
        validation: validationReport.validation,
        artifacts: [reportPath],
      };
    } catch (error) {
      console.error("❌ Pre-receive validation failed:", error.message);
      throw error;
    }
  },

  async capturePreReceiveState(context) {
    const { execSync } = await import("node:child_process");

    try {
      // Parse stdin for pre-receive hook
      const stdin = process.stdin;
      let refsToUpdate = [];

      if (stdin && !stdin.isTTY) {
        const input = await new Promise((resolve) => {
          let data = "";
          stdin.on("data", (chunk) => (data += chunk));
          stdin.on("end", () => resolve(data));
        });

        refsToUpdate = input
          .trim()
          .split("\n")
          .filter((line) => line.length > 0);
      }

      // Get commits to receive
      const commitsToReceive = [];
      const filesToReceive = new Set();

      for (const refLine of refsToUpdate) {
        const [oldSha, newSha, refName] = refLine.split(" ");
        if (oldSha === "0000000000000000000000000000000000000000") {
          // New branch
          try {
            const commits = execSync(`git rev-list ${newSha}`, {
              encoding: "utf8",
            })
              .trim()
              .split("\n")
              .filter((c) => c.length > 0);
            commitsToReceive.push(...commits);
          } catch {
            // Could not get commits
          }
        } else {
          // Update existing branch
          try {
            const commits = execSync(`git rev-list ${oldSha}..${newSha}`, {
              encoding: "utf8",
            })
              .trim()
              .split("\n")
              .filter((c) => c.length > 0);
            commitsToReceive.push(...commits);
          } catch {
            // Could not get commits
          }
        }
      }

      // Get files to receive
      for (const commit of commitsToReceive) {
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
          files.forEach((f) => filesToReceive.add(f));
        } catch {
          // Could not get files for commit
        }
      }

      const filesToReceiveArray = Array.from(filesToReceive);

      // Get push statistics
      const pushStats = execSync(
        "git diff --stat HEAD~1 HEAD 2>/dev/null || echo ''",
        {
          encoding: "utf8",
        }
      ).trim();

      // Parse push size
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

      return {
        refsToUpdate,
        commitsToReceive,
        filesToReceive: filesToReceiveArray,
        knowledgeFilesToReceive: filesToReceiveArray.filter(
          (f) =>
            f.includes(".ttl") || f.includes(".rdf") || f.includes("graph/")
        ),
        hooksToReceive: filesToReceiveArray.filter(
          (f) => f.includes("hooks/") || f.includes(".hook.")
        ),
        pushSize: {
          linesAdded: parseInt(linesAdded) || 0,
          linesDeleted: parseInt(linesDeleted) || 0,
          filesChanged: filesToReceiveArray.length,
          stats: pushStats,
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
        "⚠️ Could not capture complete pre-receive state:",
        error.message
      );
      return {
        refsToUpdate: [],
        commitsToReceive: [],
        filesToReceive: [],
        knowledgeFilesToReceive: [],
        hooksToReceive: [],
        pushSize: {
          linesAdded: 0,
          linesDeleted: 0,
          filesChanged: 0,
          stats: "",
        },
        repositoryHealth: { totalCommits: 0, totalBranches: 0, totalTags: 0 },
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  },

  assessPreReceiveImpact(gitState) {
    const impact = {
      level: "low",
      description: "",
      affectedAreas: [],
      riskFactors: [],
    };

    const knowledgeFiles = gitState.knowledgeFilesToReceive;
    const hooksFiles = gitState.hooksToReceive;
    const commitsCount = gitState.commitsToReceive.length;

    if (knowledgeFiles.length > 0) {
      impact.affectedAreas.push("knowledge-graph");
      impact.level = "medium";
    }

    if (hooksFiles.length > 0) {
      impact.affectedAreas.push("hooks-system");
      impact.level = "high";
    }

    if (commitsCount > 20) {
      impact.riskFactors.push("large-push");
      impact.level = "high";
    }

    if (gitState.pushSize.linesAdded > 10000) {
      impact.riskFactors.push("massive-changes");
      impact.level = "high";
    }

    impact.description = `Impact level: ${
      impact.level
    }. Affected areas: ${impact.affectedAreas.join(
      ", "
    )}. Risk factors: ${impact.riskFactors.join(", ")}`;

    return impact;
  },

  generatePreReceiveRecommendations(gitState) {
    const recommendations = [];

    if (gitState.refsToUpdate.length === 0) {
      recommendations.push("No refs to update - push rejected");
    }

    if (gitState.knowledgeFilesToReceive.length > 0) {
      recommendations.push(
        `Knowledge graph will be updated with ${gitState.knowledgeFilesToReceive.length} files`
      );
    }

    if (gitState.hooksToReceive.length > 0) {
      recommendations.push(
        `Hooks system will be updated with ${gitState.hooksToReceive.length} files`
      );
    }

    if (gitState.commitsToReceive.length > 10) {
      recommendations.push(
        "Large push detected - consider breaking into smaller pushes"
      );
    }

    if (gitState.pushSize.linesAdded > 5000) {
      recommendations.push(
        "Large changes detected - ensure all tests pass before accepting"
      );
    }

    return recommendations;
  },

  generatePreReceiveWarnings(gitState) {
    const warnings = [];

    if (gitState.commitsToReceive.length > 50) {
      warnings.push(
        "⚠️ Very large push detected - may cause performance issues"
      );
    }

    if (gitState.pushSize.linesAdded > 50000) {
      warnings.push("⚠️ Massive changes detected - consider code review");
    }

    if (gitState.hooksToReceive.length > 0) {
      warnings.push("⚠️ Hooks system changes detected - ensure compatibility");
    }

    if (gitState.refsToUpdate.length > 10) {
      warnings.push("⚠️ Multiple refs update detected - ensure consistency");
    }

    return warnings;
  },
});
