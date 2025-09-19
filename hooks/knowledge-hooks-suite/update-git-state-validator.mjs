// hooks/knowledge-hooks-suite/update-git-state-validator.mjs
// Update Git State Validator - Validates Git state for branch updates (server-side)

import { defineJob } from "../../src/core/job-registry.mjs";
import { useGitVan } from "../../src/core/context.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export default defineJob({
  meta: {
    name: "update-git-state-validator",
    desc: "Validates Git state for branch updates and writes comprehensive state report",
    tags: ["knowledge-hooks", "git-validation", "update", "server-side"],
    version: "1.0.0",
  },

  hooks: ["update"],

  async run(context) {
    console.log("🔍 Update Git State Validation");

    try {
      const gitvanContext = useGitVan();
      const { execSync } = await import("node:child_process");

      // Create reports directory
      const reportsDir = join(process.cwd(), "reports", "git-state");
      mkdirSync(reportsDir, { recursive: true });

      // Get comprehensive Git state for update operation
      const gitState = await this.captureUpdateGitState(context);

      // Generate validation report
      const validationReport = {
        timestamp: new Date().toISOString(),
        hookType: "update",
        gitState: gitState,
        validation: {
          refName: gitState.refName,
          oldObjectId: gitState.oldObjectId,
          newObjectId: gitState.newObjectId,
          operationType: gitState.operationType,
          branchUpdated: gitState.branchUpdated,
          filesChanged: gitState.filesChanged.length,
          hasKnowledgeChanges: gitState.knowledgeFilesChanged.length > 0,
        },
        knowledgeGraph: {
          filesAffected: gitState.knowledgeFilesChanged,
          hooksAffected: gitState.hookFilesChanged,
          impactAssessment: this.assessKnowledgeGraphImpact(gitState),
        },
        recommendations: this.generateUpdateRecommendations(gitState),
      };

      // Write report to disk
      const reportPath = join(reportsDir, `update-${Date.now()}.json`);
      writeFileSync(reportPath, JSON.stringify(validationReport, null, 2));

      console.log(`   📊 Update Git State Report: ${reportPath}`);
      console.log(`   🌿 Branch: ${gitState.refName}`);
      console.log(`   📝 Operation: ${gitState.operationType}`);
      console.log(`   📁 Files changed: ${gitState.filesChanged.length}`);

      return {
        success: true,
        reportPath: reportPath,
        validation: validationReport.validation,
        artifacts: [reportPath],
      };
    } catch (error) {
      console.error("❌ Update validation failed:", error.message);
      throw error;
    }
  },

  async captureUpdateGitState(context) {
    const { execSync } = await import("node:child_process");

    try {
      // Extract update parameters from context
      const refName = context.refName || "unknown";
      const oldObjectId = context.oldObjectId || "unknown";
      const newObjectId = context.newObjectId || "unknown";

      // Determine operation type
      let operationType = "unknown";
      if (oldObjectId === "0000000000000000000000000000000000000000") {
        operationType = "create";
      } else if (newObjectId === "0000000000000000000000000000000000000000") {
        operationType = "delete";
      } else {
        operationType = "update";
      }

      // Get files changed between old and new object IDs
      let filesChanged = [];
      if (operationType !== "create" && operationType !== "delete") {
        try {
          const diffOutput = execSync(
            `git diff --name-only ${oldObjectId} ${newObjectId}`,
            { encoding: "utf8" }
          );
          filesChanged = diffOutput
            .trim()
            .split("\n")
            .filter((f) => f.length > 0);
        } catch (error) {
          console.warn("⚠️ Could not get diff:", error.message);
        }
      }

      // Categorize changed files
      const knowledgeFilesChanged = filesChanged.filter(
        (f) => f.includes(".ttl") || f.includes(".rdf") || f.includes("graph/")
      );
      const hookFilesChanged = filesChanged.filter(
        (f) => f.includes("hooks/") || f.includes(".hook.")
      );

      // Get branch information
      const branchInfo = await this.getBranchInfo(refName);

      return {
        refName,
        oldObjectId,
        newObjectId,
        operationType,
        filesChanged,
        knowledgeFilesChanged,
        hookFilesChanged,
        branchInfo,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.warn("⚠️ Could not capture update Git state:", error.message);
      return {
        refName: "unknown",
        oldObjectId: "unknown",
        newObjectId: "unknown",
        operationType: "unknown",
        filesChanged: [],
        knowledgeFilesChanged: [],
        hookFilesChanged: [],
        branchInfo: null,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  },

  async getBranchInfo(refName) {
    const { execSync } = await import("node:child_process");

    try {
      // Extract branch name from ref
      const branchName = refName.replace("refs/heads/", "");

      // Get branch commit count
      const commitCount = execSync(
        `git rev-list --count ${refName} 2>/dev/null || echo 0`,
        { encoding: "utf8" }
      ).trim();

      // Get last commit info
      const lastCommit = execSync(
        `git log -1 --pretty=format:"%H|%an|%ae|%ad|%s" ${refName} 2>/dev/null || echo ""`,
        { encoding: "utf8" }
      ).trim();

      return {
        branchName,
        commitCount: parseInt(commitCount),
        lastCommit: lastCommit ? this.parseCommitInfo(lastCommit) : null,
      };
    } catch (error) {
      return {
        branchName: refName,
        commitCount: 0,
        lastCommit: null,
        error: error.message,
      };
    }
  },

  parseCommitInfo(commitLine) {
    const [sha, author, email, date, message] = commitLine.split("|");
    return {
      sha,
      author,
      email,
      date,
      message,
    };
  },

  generateUpdateRecommendations(gitState) {
    const recommendations = [];

    if (gitState.operationType === "create") {
      recommendations.push(`New branch created: ${gitState.refName}`);
    } else if (gitState.operationType === "delete") {
      recommendations.push(`Branch deleted: ${gitState.refName}`);
    } else {
      recommendations.push(`Branch updated: ${gitState.refName}`);
    }

    if (gitState.filesChanged.length > 0) {
      recommendations.push(
        `${gitState.filesChanged.length} files changed in this update`
      );
    }

    if (gitState.knowledgeFilesChanged.length > 0) {
      recommendations.push(
        `Knowledge graph files modified: ${gitState.knowledgeFilesChanged.join(
          ", "
        )}`
      );
    }

    if (gitState.hookFilesChanged.length > 0) {
      recommendations.push(
        `Hook files modified: ${gitState.hookFilesChanged.join(", ")}`
      );
    }

    return recommendations;
  },

  assessKnowledgeGraphImpact(gitState) {
    const knowledgeFiles = gitState.knowledgeFilesChanged;
    const hookFiles = gitState.hookFilesChanged;

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
});
