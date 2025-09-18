// hooks/knowledge-hooks-suite/post-receive-git-state-analyzer.mjs
// Post-receive Git State Analyzer - Analyzes Git state after receiving pushes

import { defineJob } from "../../src/core/job-registry.mjs";
import { useGitVan } from "../../src/core/context.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export default defineJob({
  meta: {
    name: "post-receive-git-state-analyzer",
    desc: "Analyzes Git state after receiving pushes and writes comprehensive analysis report",
    tags: ["knowledge-hooks", "git-analysis", "post-receive", "server-side"],
    version: "1.0.0",
  },

  hooks: ["post-receive"],

  async run(context) {
    console.log("📤 Post-receive Git State Analysis");

    try {
      const gitvanContext = useGitVan();
      const { execSync } = await import("node:child_process");

      // Create reports directory
      const reportsDir = join(process.cwd(), "reports", "git-state");
      mkdirSync(reportsDir, { recursive: true });

      // Get comprehensive Git state
      const gitState = await this.capturePostReceiveState(context);

      // Generate analysis report
      const analysisReport = {
        timestamp: new Date().toISOString(),
        hookType: "post-receive",
        receiveInfo: gitState.receiveInfo,
        gitState: gitState,
        analysis: {
          refsUpdated: gitState.refsUpdated.length,
          commitsReceived: gitState.commitsReceived.length,
          filesReceived: gitState.filesReceived.length,
          knowledgeFilesReceived: gitState.knowledgeFilesReceived.length,
          hooksReceived: gitState.hooksReceived.length,
          receiveSize: gitState.receiveSize,
          repositoryHealth: gitState.repositoryHealth,
        },
        knowledgeGraph: {
          filesAffected: gitState.knowledgeFilesReceived,
          hooksAffected: gitState.hooksReceived,
          impactAssessment: this.assessPostReceiveImpact(gitState),
        },
        recommendations: this.generatePostReceiveRecommendations(gitState),
      };

      // Write report to disk
      const reportPath = join(reportsDir, `post-receive-${Date.now()}.json`);
      writeFileSync(reportPath, JSON.stringify(analysisReport, null, 2));

      console.log(`   📊 Post-receive Analysis Report: ${reportPath}`);
      console.log(`   📁 Refs updated: ${gitState.refsUpdated.length}`);
      console.log(`   📁 Commits received: ${gitState.commitsReceived.length}`);
      console.log(`   📁 Files received: ${gitState.filesReceived.length}`);
      console.log(
        `   🧠 Knowledge files: ${gitState.knowledgeFilesReceived.length}`
      );
      console.log(`   🔗 Hooks affected: ${gitState.hooksReceived.length}`);

      return {
        success: true,
        reportPath: reportPath,
        analysis: analysisReport.analysis,
        artifacts: [reportPath],
      };
    } catch (error) {
      console.error("❌ Post-receive analysis failed:", error.message);
      throw error;
    }
  },

  async capturePostReceiveState(context) {
    const { execSync } = await import("node:child_process");

    try {
      // Parse stdin for post-receive hook
      const stdin = process.stdin;
      let refsUpdated = [];

      if (stdin && !stdin.isTTY) {
        const input = await new Promise((resolve) => {
          let data = "";
          stdin.on("data", (chunk) => (data += chunk));
          stdin.on("end", () => resolve(data));
        });

        refsUpdated = input
          .trim()
          .split("\n")
          .filter((line) => line.length > 0);
      }

      // Get commits received
      const commitsReceived = [];
      const filesReceived = new Set();

      for (const refLine of refsUpdated) {
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
            commitsReceived.push(...commits);
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
            commitsReceived.push(...commits);
          } catch {
            // Could not get commits
          }
        }
      }

      // Get files received
      for (const commit of commitsReceived) {
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
          files.forEach((f) => filesReceived.add(f));
        } catch {
          // Could not get files for commit
        }
      }

      const filesReceivedArray = Array.from(filesReceived);

      // Get receive statistics
      const receiveStats = execSync(
        "git diff --stat HEAD~1 HEAD 2>/dev/null || echo ''",
        {
          encoding: "utf8",
        }
      ).trim();

      // Parse receive size
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

      // Get commit messages for analysis
      const commitMessages = commitsReceived.map((sha) => {
        try {
          return execSync(`git log --format=%s -n 1 ${sha}`, {
            encoding: "utf8",
          }).trim();
        } catch {
          return "unknown";
        }
      });

      return {
        receiveInfo: {
          refsUpdated,
          commitsReceived,
          commitMessages,
          timestamp: new Date().toISOString(),
        },
        refsUpdated,
        commitsReceived,
        filesReceived: filesReceivedArray,
        knowledgeFilesReceived: filesReceivedArray.filter(
          (f) =>
            f.includes(".ttl") || f.includes(".rdf") || f.includes("graph/")
        ),
        hooksReceived: filesReceivedArray.filter(
          (f) => f.includes("hooks/") || f.includes(".hook.")
        ),
        receiveSize: {
          linesAdded: parseInt(linesAdded) || 0,
          linesDeleted: parseInt(linesDeleted) || 0,
          filesChanged: filesReceivedArray.length,
          stats: receiveStats,
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
        "⚠️ Could not capture complete post-receive state:",
        error.message
      );
      return {
        receiveInfo: {
          refsUpdated: [],
          commitsReceived: [],
          commitMessages: [],
          timestamp: new Date().toISOString(),
        },
        refsUpdated: [],
        commitsReceived: [],
        filesReceived: [],
        knowledgeFilesReceived: [],
        hooksReceived: [],
        receiveSize: {
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

  assessPostReceiveImpact(gitState) {
    const impact = {
      level: "low",
      description: "",
      affectedAreas: [],
      riskFactors: [],
    };

    const knowledgeFiles = gitState.knowledgeFilesReceived;
    const hooksFiles = gitState.hooksReceived;
    const commitsCount = gitState.commitsReceived.length;

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

    if (gitState.receiveSize.linesAdded > 10000) {
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

  generatePostReceiveRecommendations(gitState) {
    const recommendations = [];

    if (gitState.refsUpdated.length === 0) {
      recommendations.push("No refs updated - push was empty");
    }

    if (gitState.knowledgeFilesReceived.length > 0) {
      recommendations.push(
        `Knowledge graph updated with ${gitState.knowledgeFilesReceived.length} files`
      );
    }

    if (gitState.hooksReceived.length > 0) {
      recommendations.push(
        `Hooks system updated with ${gitState.hooksReceived.length} files`
      );
    }

    if (gitState.commitsReceived.length > 10) {
      recommendations.push(
        "Large push received - consider monitoring repository performance"
      );
    }

    if (gitState.receiveSize.linesAdded > 5000) {
      recommendations.push(
        "Large changes received - consider running comprehensive tests"
      );
    }

    if (gitState.repositoryHealth.totalCommits > 10000) {
      recommendations.push(
        "Large repository detected - consider cleanup and optimization"
      );
    }

    return recommendations;
  },
});
