// hooks/knowledge-hooks-suite/post-rewrite-git-state-analyzer.mjs
// Post-rewrite Git State Analyzer - Analyzes Git state after history rewriting

import { defineJob } from "../../src/core/job-registry.mjs";
import { useGitVan } from "../../src/core/context.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export default defineJob({
  meta: {
    name: "post-rewrite-git-state-analyzer",
    desc: "Analyzes Git state after history rewriting and writes comprehensive analysis report",
    tags: ["knowledge-hooks", "git-analysis", "post-rewrite"],
    version: "1.0.0",
  },

  hooks: ["post-rewrite"],

  async run(context) {
    console.log("✏️ Post-rewrite Git State Analysis");

    try {
      const gitvanContext = useGitVan();
      const { execSync } = await import("node:child_process");

      // Create reports directory
      const reportsDir = join(process.cwd(), "reports", "git-state");
      mkdirSync(reportsDir, { recursive: true });

      // Get comprehensive Git state
      const gitState = await this.capturePostRewriteState(context);

      // Generate analysis report
      const analysisReport = {
        timestamp: new Date().toISOString(),
        hookType: "post-rewrite",
        rewriteInfo: gitState.rewriteInfo,
        gitState: gitState,
        analysis: {
          commitsRewritten: gitState.commitsRewritten.length,
          filesRewritten: gitState.filesRewritten.length,
          knowledgeFilesRewritten: gitState.knowledgeFilesRewritten.length,
          hooksRewritten: gitState.hooksRewritten.length,
          rewriteSize: gitState.rewriteSize,
          historyIntegrity: gitState.historyIntegrity,
        },
        knowledgeGraph: {
          filesAffected: gitState.knowledgeFilesRewritten,
          hooksAffected: gitState.hooksRewritten,
          impactAssessment: this.assessPostRewriteImpact(gitState),
        },
        recommendations: this.generatePostRewriteRecommendations(gitState),
      };

      // Write report to disk
      const reportPath = join(reportsDir, `post-rewrite-${Date.now()}.json`);
      writeFileSync(reportPath, JSON.stringify(analysisReport, null, 2));

      console.log(`   📊 Post-rewrite Analysis Report: ${reportPath}`);
      console.log(
        `   ✏️ Commits rewritten: ${gitState.commitsRewritten.length}`
      );
      console.log(`   📁 Files rewritten: ${gitState.filesRewritten.length}`);
      console.log(
        `   🧠 Knowledge files: ${gitState.knowledgeFilesRewritten.length}`
      );
      console.log(`   🔗 Hooks affected: ${gitState.hooksRewritten.length}`);

      return {
        success: true,
        reportPath: reportPath,
        analysis: analysisReport.analysis,
        artifacts: [reportPath],
      };
    } catch (error) {
      console.error("❌ Post-rewrite analysis failed:", error.message);
      throw error;
    }
  },

  async capturePostRewriteState(context) {
    const { execSync } = await import("node:child_process");

    try {
      // Parse stdin for post-rewrite hook
      const stdin = process.stdin;
      let commitsRewritten = [];

      if (stdin && !stdin.isTTY) {
        const input = await new Promise((resolve) => {
          let data = "";
          stdin.on("data", (chunk) => (data += chunk));
          stdin.on("end", () => resolve(data));
        });

        commitsRewritten = input
          .trim()
          .split("\n")
          .filter((line) => line.length > 0);
      }

      // Get files rewritten
      const filesRewritten = new Set();
      for (const commit of commitsRewritten) {
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
          files.forEach((f) => filesRewritten.add(f));
        } catch {
          // Could not get files for commit
        }
      }

      const filesRewrittenArray = Array.from(filesRewritten);

      // Get rewrite statistics
      const rewriteStats = execSync(
        "git diff --stat HEAD~1 HEAD 2>/dev/null || echo ''",
        {
          encoding: "utf8",
        }
      ).trim();

      // Parse rewrite size
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

      // Get current branch
      const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
        encoding: "utf8",
      }).trim();

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
      const commitMessages = commitsRewritten.map((sha) => {
        try {
          return execSync(`git log --format=%s -n 1 ${sha}`, {
            encoding: "utf8",
          }).trim();
        } catch {
          return "unknown";
        }
      });

      // Check history integrity
      const historyIntegrity = {
        hasConflicts: false,
        hasErrors: false,
        integrityCheck: "passed",
      };

      try {
        // Check if there are any merge conflicts
        const conflictFiles = execSync(
          "git diff --name-only --diff-filter=U 2>/dev/null || echo ''",
          {
            encoding: "utf8",
          }
        )
          .trim()
          .split("\n")
          .filter((f) => f.length > 0);

        if (conflictFiles.length > 0) {
          historyIntegrity.hasConflicts = true;
          historyIntegrity.integrityCheck = "conflicts-detected";
        }
      } catch {
        // Could not check conflicts
      }

      return {
        rewriteInfo: {
          commitsRewritten,
          commitMessages,
          timestamp: new Date().toISOString(),
        },
        commitsRewritten,
        filesRewritten: filesRewrittenArray,
        knowledgeFilesRewritten: filesRewrittenArray.filter(
          (f) =>
            f.includes(".ttl") || f.includes(".rdf") || f.includes("graph/")
        ),
        hooksRewritten: filesRewrittenArray.filter(
          (f) => f.includes("hooks/") || f.includes(".hook.")
        ),
        rewriteSize: {
          linesAdded: parseInt(linesAdded) || 0,
          linesDeleted: parseInt(linesDeleted) || 0,
          filesChanged: filesRewrittenArray.length,
          stats: rewriteStats,
        },
        historyIntegrity,
        branchInfo: {
          currentBranch,
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
        "⚠️ Could not capture complete post-rewrite state:",
        error.message
      );
      return {
        rewriteInfo: {
          commitsRewritten: [],
          commitMessages: [],
          timestamp: new Date().toISOString(),
        },
        commitsRewritten: [],
        filesRewritten: [],
        knowledgeFilesRewritten: [],
        hooksRewritten: [],
        rewriteSize: {
          linesAdded: 0,
          linesDeleted: 0,
          filesChanged: 0,
          stats: "",
        },
        historyIntegrity: {
          hasConflicts: false,
          hasErrors: false,
          integrityCheck: "unknown",
        },
        branchInfo: { currentBranch: "unknown" },
        repositoryHealth: { totalCommits: 0, totalBranches: 0, totalTags: 0 },
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  },

  assessPostRewriteImpact(gitState) {
    const impact = {
      level: "low",
      description: "",
      affectedAreas: [],
      riskFactors: [],
    };

    const knowledgeFiles = gitState.knowledgeFilesRewritten;
    const hooksFiles = gitState.hooksRewritten;
    const commitsCount = gitState.commitsRewritten.length;
    const hasConflicts = gitState.historyIntegrity.hasConflicts;

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

    if (commitsCount > 10) {
      impact.riskFactors.push("large-rewrite");
      impact.level = "high";
    }

    if (gitState.rewriteSize.linesAdded > 5000) {
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

  generatePostRewriteRecommendations(gitState) {
    const recommendations = [];

    if (gitState.commitsRewritten.length === 0) {
      recommendations.push("No commits rewritten - history unchanged");
    }

    if (gitState.knowledgeFilesRewritten.length > 0) {
      recommendations.push(
        `Knowledge graph affected by rewrite: ${gitState.knowledgeFilesRewritten.length} files`
      );
    }

    if (gitState.hooksRewritten.length > 0) {
      recommendations.push(
        `Hooks system affected by rewrite: ${gitState.hooksRewritten.length} files`
      );
    }

    if (gitState.historyIntegrity.hasConflicts) {
      recommendations.push("Conflicts detected in rewrite - review resolution");
    }

    if (gitState.commitsRewritten.length > 5) {
      recommendations.push(
        "Large rewrite completed - consider testing thoroughly"
      );
    }

    if (gitState.rewriteSize.linesAdded > 1000) {
      recommendations.push("Large changes in rewrite - ensure compatibility");
    }

    return recommendations;
  },
});
