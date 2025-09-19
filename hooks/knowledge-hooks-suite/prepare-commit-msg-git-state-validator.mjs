// hooks/knowledge-hooks-suite/prepare-commit-msg-git-state-validator.mjs
// Prepare Commit Message Git State Validator - Enhances commit messages with knowledge context

import { defineJob } from "../../src/core/job-registry.mjs";
import { useGitVan } from "../../src/core/context.mjs";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export default defineJob({
  meta: {
    name: "prepare-commit-msg-git-state-validator",
    desc: "Enhances commit messages with knowledge context and writes comprehensive state report",
    tags: [
      "knowledge-hooks",
      "git-validation",
      "prepare-commit-msg",
      "commit-message",
    ],
    version: "1.0.0",
  },

  hooks: ["prepare-commit-msg"],

  async run(context) {
    console.log("🔍 Prepare Commit Message Git State Validation");

    try {
      const gitvanContext = useGitVan();
      const { execSync } = await import("node:child_process");

      // Create reports directory
      const reportsDir = join(process.cwd(), "reports", "git-state");
      mkdirSync(reportsDir, { recursive: true });

      // Get comprehensive Git state for prepare-commit-msg operation
      const gitState = await this.capturePrepareCommitMsgGitState(context);

      // Enhance commit message with knowledge context
      const enhancedCommitMessage = await this.enhanceCommitMessage(gitState);

      // Generate validation report
      const validationReport = {
        timestamp: new Date().toISOString(),
        hookType: "prepare-commit-msg",
        gitState: gitState,
        commitMessage: {
          original: gitState.commitMessage,
          enhanced: enhancedCommitMessage,
          enhancements: this.getEnhancements(gitState, enhancedCommitMessage),
        },
        validation: {
          commitMessageFile: gitState.commitMessageFile,
          messageSource: gitState.messageSource,
          filesStaged: gitState.stagedFiles.length,
          hasKnowledgeChanges: gitState.knowledgeFilesStaged.length > 0,
          hasHookChanges: gitState.hookFilesStaged.length > 0,
        },
        knowledgeGraph: {
          filesAffected: gitState.knowledgeFilesStaged,
          hooksAffected: gitState.hookFilesStaged,
          impactAssessment: this.assessKnowledgeGraphImpact(gitState),
        },
        recommendations: this.generatePrepareCommitMsgRecommendations(gitState),
      };

      // Write report to disk
      const reportPath = join(
        reportsDir,
        `prepare-commit-msg-${Date.now()}.json`
      );
      writeFileSync(reportPath, JSON.stringify(validationReport, null, 2));

      console.log(`   📊 Prepare Commit Message Report: ${reportPath}`);
      console.log(`   📝 Message source: ${gitState.messageSource}`);
      console.log(`   📁 Staged files: ${gitState.stagedFiles.length}`);
      console.log(
        `   🧠 Knowledge files: ${gitState.knowledgeFilesStaged.length}`
      );

      return {
        success: true,
        reportPath: reportPath,
        validation: validationReport.validation,
        artifacts: [reportPath],
      };
    } catch (error) {
      console.error(
        "❌ Prepare commit message validation failed:",
        error.message
      );
      throw error;
    }
  },

  async capturePrepareCommitMsgGitState(context) {
    const { execSync } = await import("node:child_process");

    try {
      // Get commit message file path
      const commitMessageFile = context.commitMessageFile || "unknown";

      // Determine message source
      let messageSource = "unknown";
      if (context.messageSource) {
        messageSource = context.messageSource;
      } else if (commitMessageFile !== "unknown") {
        messageSource = "file";
      }

      // Get staged files
      const stagedFiles = execSync("git diff --cached --name-only", {
        encoding: "utf8",
      })
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      // Categorize staged files
      const knowledgeFilesStaged = stagedFiles.filter(
        (f) => f.includes(".ttl") || f.includes(".rdf") || f.includes("graph/")
      );
      const hookFilesStaged = stagedFiles.filter(
        (f) => f.includes("hooks/") || f.includes(".hook.")
      );

      // Get current commit message
      let commitMessage = "";
      if (commitMessageFile !== "unknown") {
        try {
          commitMessage = readFileSync(commitMessageFile, "utf8");
        } catch (error) {
          console.warn("⚠️ Could not read commit message file:", error.message);
        }
      }

      // Get branch information
      const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
        encoding: "utf8",
      }).trim();

      // Get repository information
      const repositoryInfo = await this.getRepositoryInfo();

      return {
        commitMessageFile,
        messageSource,
        commitMessage,
        stagedFiles,
        knowledgeFilesStaged,
        hookFilesStaged,
        currentBranch,
        repositoryInfo,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.warn(
        "⚠️ Could not capture prepare-commit-msg Git state:",
        error.message
      );
      return {
        commitMessageFile: "unknown",
        messageSource: "unknown",
        commitMessage: "",
        stagedFiles: [],
        knowledgeFilesStaged: [],
        hookFilesStaged: [],
        currentBranch: "unknown",
        repositoryInfo: null,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  },

  async getRepositoryInfo() {
    const { execSync } = await import("node:child_process");

    try {
      // Get repository URL
      const remoteUrl = execSync(
        "git config --get remote.origin.url 2>/dev/null || echo ''",
        {
          encoding: "utf8",
        }
      ).trim();

      // Get repository name
      const repoName = remoteUrl
        ? remoteUrl.split("/").pop().replace(".git", "")
        : "unknown";

      // Get current commit SHA
      const currentCommit = execSync("git rev-parse HEAD", {
        encoding: "utf8",
      }).trim();

      return {
        remoteUrl,
        repoName,
        currentCommit,
      };
    } catch (error) {
      return {
        remoteUrl: "unknown",
        repoName: "unknown",
        currentCommit: "unknown",
        error: error.message,
      };
    }
  },

  async enhanceCommitMessage(gitState) {
    let enhancedMessage = gitState.commitMessage;

    // Add knowledge graph context if knowledge files are staged
    if (gitState.knowledgeFilesStaged.length > 0) {
      const knowledgeContext = this.generateKnowledgeContext(gitState);
      enhancedMessage = this.prependContext(enhancedMessage, knowledgeContext);
    }

    // Add hook context if hook files are staged
    if (gitState.hookFilesStaged.length > 0) {
      const hookContext = this.generateHookContext(gitState);
      enhancedMessage = this.prependContext(enhancedMessage, hookContext);
    }

    // Add branch context
    const branchContext = this.generateBranchContext(gitState);
    enhancedMessage = this.prependContext(enhancedMessage, branchContext);

    return enhancedMessage;
  },

  generateKnowledgeContext(gitState) {
    const knowledgeFiles = gitState.knowledgeFilesStaged;
    const context = [];

    context.push("🧠 Knowledge Graph Changes:");
    knowledgeFiles.forEach((file) => {
      if (file.includes(".ttl")) {
        context.push(`  - Turtle ontology: ${file}`);
      } else if (file.includes(".rdf")) {
        context.push(`  - RDF data: ${file}`);
      } else if (file.includes("graph/")) {
        context.push(`  - Graph structure: ${file}`);
      }
    });

    return context.join("\n");
  },

  generateHookContext(gitState) {
    const hookFiles = gitState.hookFilesStaged;
    const context = [];

    context.push("🎣 Hook System Changes:");
    hookFiles.forEach((file) => {
      if (file.includes("hooks/")) {
        context.push(`  - Hook definition: ${file}`);
      } else if (file.includes(".hook.")) {
        context.push(`  - Hook configuration: ${file}`);
      }
    });

    return context.join("\n");
  },

  generateBranchContext(gitState) {
    const branch = gitState.currentBranch;
    return `🌿 Branch: ${branch}`;
  },

  prependContext(message, context) {
    if (!context.trim()) return message;
    return `${context}\n\n${message}`;
  },

  getEnhancements(gitState, enhancedMessage) {
    const enhancements = [];

    if (gitState.knowledgeFilesStaged.length > 0) {
      enhancements.push("Added knowledge graph context");
    }

    if (gitState.hookFilesStaged.length > 0) {
      enhancements.push("Added hook system context");
    }

    if (gitState.currentBranch !== "unknown") {
      enhancements.push("Added branch context");
    }

    return enhancements;
  },

  generatePrepareCommitMsgRecommendations(gitState) {
    const recommendations = [];

    if (gitState.stagedFiles.length === 0) {
      recommendations.push("No files staged for commit");
    }

    if (gitState.knowledgeFilesStaged.length > 0) {
      recommendations.push(
        `Knowledge graph files staged: ${gitState.knowledgeFilesStaged.join(
          ", "
        )}`
      );
    }

    if (gitState.hookFilesStaged.length > 0) {
      recommendations.push(
        `Hook files staged: ${gitState.hookFilesStaged.join(", ")}`
      );
    }

    if (gitState.commitMessage.trim().length < 10) {
      recommendations.push("Consider adding more descriptive commit message");
    }

    return recommendations;
  },

  assessKnowledgeGraphImpact(gitState) {
    const knowledgeFiles = gitState.knowledgeFilesStaged;
    const hookFiles = gitState.hookFilesStaged;

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
