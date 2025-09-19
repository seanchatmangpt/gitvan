// hooks/knowledge-hooks-suite/post-update-git-state-analyzer.mjs
// Post-update Git State Analyzer - Analyzes Git state after remote repository updates

import { defineJob } from "../../src/core/job-registry.mjs";
import { useGitVan } from "../../src/core/context.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export default defineJob({
  meta: {
    name: "post-update-git-state-analyzer",
    desc: "Analyzes Git state after remote repository updates and writes comprehensive analysis report",
    tags: ["knowledge-hooks", "git-analysis", "post-update", "server-side"],
    version: "1.0.0",
  },

  hooks: ["post-update"],

  async run(context) {
    console.log("🔄 Post-update Git State Analysis");

    try {
      const gitvanContext = useGitVan();
      const { execSync } = await import("node:child_process");

      // Create reports directory
      const reportsDir = join(process.cwd(), "reports", "git-state");
      mkdirSync(reportsDir, { recursive: true });

      // Get comprehensive Git state
      const gitState = await this.capturePostUpdateState(context);

      // Generate analysis report
      const analysisReport = {
        timestamp: new Date().toISOString(),
        hookType: "post-update",
        updateInfo: gitState.updateInfo,
        gitState: gitState,
        analysis: {
          refsUpdated: gitState.refsUpdated.length,
          commitsUpdated: gitState.commitsUpdated.length,
          filesUpdated: gitState.filesUpdated.length,
          knowledgeFilesUpdated: gitState.knowledgeFilesUpdated.length,
          hooksUpdated: gitState.hooksUpdated.length,
          updateSize: gitState.updateSize,
          repositoryHealth: gitState.repositoryHealth,
        },
        knowledgeGraph: {
          filesAffected: gitState.knowledgeFilesUpdated,
          hooksAffected: gitState.hooksUpdated,
          impactAssessment: this.assessPostUpdateImpact(gitState),
        },
        recommendations: this.generatePostUpdateRecommendations(gitState),
      };

      // Write report to disk
      const reportPath = join(reportsDir, `post-update-${Date.now()}.json`);
      writeFileSync(reportPath, JSON.stringify(analysisReport, null, 2));

      console.log(`   📊 Post-update Analysis Report: ${reportPath}`);
      console.log(`   🔄 Refs updated: ${gitState.refsUpdated.length}`);
      console.log(`   📁 Commits updated: ${gitState.commitsUpdated.length}`);
      console.log(`   📁 Files updated: ${gitState.filesUpdated.length}`);
      console.log(
        `   🧠 Knowledge files: ${gitState.knowledgeFilesUpdated.length}`
      );
      console.log(`   🔗 Hooks affected: ${gitState.hooksUpdated.length}`);

      return {
        success: true,
        reportPath: reportPath,
        analysis: analysisReport.analysis,
        artifacts: [reportPath],
      };
    } catch (error) {
      console.error("❌ Post-update analysis failed:", error.message);
      throw error;
    }
  },

  async capturePostUpdateState(context) {
    const { execSync } = await import("node:child_process");

    try {
      // Parse stdin for post-update hook
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

      // Get commits updated
      const commitsUpdated = [];
      const filesUpdated = new Set();

      for (const ref of refsUpdated) {
        try {
          const commits = execSync(`git rev-list ${ref}`, {
            encoding: "utf8",
          })
            .trim()
            .split("\n")
            .filter((c) => c.length > 0);
          commitsUpdated.push(...commits);
        } catch {
          // Could not get commits for ref
        }
      }

      // Get files updated
      for (const commit of commitsUpdated) {
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
          files.forEach((f) => filesUpdated.add(f));
        } catch {
          // Could not get files for commit
        }
      }

      const filesUpdatedArray = Array.from(filesUpdated);

      // Get update statistics
      const updateStats = execSync(
        "git diff --stat HEAD~1 HEAD 2>/dev/null || echo ''",
        {
          encoding: "utf8",
        }
      ).trim();

      // Parse update size
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
      const commitMessages = commitsUpdated.map((sha) => {
        try {
          return execSync(`git log --format=%s -n 1 ${sha}`, {
            encoding: "utf8",
          }).trim();
        } catch {
          return "unknown";
        }
      });

      return {
        updateInfo: {
          refsUpdated,
          commitsUpdated,
          commitMessages,
          timestamp: new Date().toISOString(),
        },
        refsUpdated,
        commitsUpdated,
        filesUpdated: filesUpdatedArray,
        knowledgeFilesUpdated: filesUpdatedArray.filter(
          (f) =>
            f.includes(".ttl") || f.includes(".rdf") || f.includes("graph/")
        ),
        hooksUpdated: filesUpdatedArray.filter(
          (f) => f.includes("hooks/") || f.includes(".hook.")
        ),
        updateSize: {
          linesAdded: parseInt(linesAdded) || 0,
          linesDeleted: parseInt(linesDeleted) || 0,
          filesChanged: filesUpdatedArray.length,
          stats: updateStats,
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
        "⚠️ Could not capture complete post-update state:",
        error.message
      );
      return {
        updateInfo: {
          refsUpdated: [],
          commitsUpdated: [],
          commitMessages: [],
          timestamp: new Date().toISOString(),
        },
        refsUpdated: [],
        commitsUpdated: [],
        filesUpdated: [],
        knowledgeFilesUpdated: [],
        hooksUpdated: [],
        updateSize: {
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

  assessPostUpdateImpact(gitState) {
    const impact = {
      level: "low",
      description: "",
      affectedAreas: [],
      riskFactors: [],
    };

    const knowledgeFiles = gitState.knowledgeFilesUpdated;
    const hooksFiles = gitState.hooksUpdated;
    const commitsCount = gitState.commitsUpdated.length;

    if (knowledgeFiles.length > 0) {
      impact.affectedAreas.push("knowledge-graph");
      impact.level = "medium";
    }

    if (hooksFiles.length > 0) {
      impact.affectedAreas.push("hooks-system");
      impact.level = "high";
    }

    if (commitsCount > 20) {
      impact.riskFactors.push("large-update");
      impact.level = "high";
    }

    if (gitState.updateSize.linesAdded > 10000) {
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

  generatePostUpdateRecommendations(gitState) {
    const recommendations = [];

    if (gitState.refsUpdated.length === 0) {
      recommendations.push("No refs updated - repository unchanged");
    }

    if (gitState.knowledgeFilesUpdated.length > 0) {
      recommendations.push(
        `Knowledge graph updated with ${gitState.knowledgeFilesUpdated.length} files`
      );
    }

    if (gitState.hooksUpdated.length > 0) {
      recommendations.push(
        `Hooks system updated with ${gitState.hooksUpdated.length} files`
      );
    }

    if (gitState.commitsUpdated.length > 10) {
      recommendations.push(
        "Large update received - consider monitoring repository performance"
      );
    }

    if (gitState.updateSize.linesAdded > 5000) {
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

