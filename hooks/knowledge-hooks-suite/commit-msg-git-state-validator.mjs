// hooks/knowledge-hooks-suite/commit-msg-git-state-validator.mjs
// Commit Message Git State Validator - Validates commit message format and content

import { defineJob } from "../../src/core/job-registry.mjs";
import { useGitVan } from "../../src/core/context.mjs";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export default defineJob({
  meta: {
    name: "commit-msg-git-state-validator",
    desc: "Validates commit message format and content, writes comprehensive validation report",
    tags: ["knowledge-hooks", "git-validation", "commit-msg", "commit-message"],
    version: "1.0.0",
  },

  hooks: ["commit-msg"],

  async run(context) {
    console.log("🔍 Commit Message Git State Validation");

    try {
      const gitvanContext = useGitVan();
      const { execSync } = await import("node:child_process");

      // Create reports directory
      const reportsDir = join(process.cwd(), "reports", "git-state");
      mkdirSync(reportsDir, { recursive: true });

      // Get comprehensive Git state for commit-msg operation
      const gitState = await this.captureCommitMsgGitState(context);

      // Validate commit message
      const validationResult = await this.validateCommitMessage(gitState);

      // Generate validation report
      const validationReport = {
        timestamp: new Date().toISOString(),
        hookType: "commit-msg",
        gitState: gitState,
        commitMessage: {
          content: gitState.commitMessage,
          validation: validationResult,
        },
        validation: {
          commitMessageFile: gitState.commitMessageFile,
          isValid: validationResult.isValid,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          suggestions: validationResult.suggestions,
        },
        knowledgeGraph: {
          filesAffected: gitState.knowledgeFilesStaged,
          hooksAffected: gitState.hookFilesStaged,
          impactAssessment: this.assessKnowledgeGraphImpact(gitState),
        },
        recommendations: this.generateCommitMsgRecommendations(
          gitState,
          validationResult
        ),
      };

      // Write report to disk
      const reportPath = join(reportsDir, `commit-msg-${Date.now()}.json`);
      writeFileSync(reportPath, JSON.stringify(validationReport, null, 2));

      console.log(`   📊 Commit Message Validation Report: ${reportPath}`);
      console.log(`   📝 Message valid: ${validationResult.isValid}`);
      console.log(`   ❌ Errors: ${validationResult.errors.length}`);
      console.log(`   ⚠️ Warnings: ${validationResult.warnings.length}`);

      // If validation fails, throw error to prevent commit
      if (!validationResult.isValid) {
        throw new Error(
          `Commit message validation failed: ${validationResult.errors.join(
            ", "
          )}`
        );
      }

      return {
        success: true,
        reportPath: reportPath,
        validation: validationReport.validation,
        artifacts: [reportPath],
      };
    } catch (error) {
      console.error("❌ Commit message validation failed:", error.message);
      throw error;
    }
  },

  async captureCommitMsgGitState(context) {
    const { execSync } = await import("node:child_process");

    try {
      // Get commit message file path
      const commitMessageFile = context.commitMessageFile || "unknown";

      // Read commit message
      let commitMessage = "";
      if (commitMessageFile !== "unknown") {
        try {
          commitMessage = readFileSync(commitMessageFile, "utf8");
        } catch (error) {
          console.warn("⚠️ Could not read commit message file:", error.message);
        }
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

      // Get branch information
      const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
        encoding: "utf8",
      }).trim();

      // Get commit information
      const commitInfo = await this.getCommitInfo();

      return {
        commitMessageFile,
        commitMessage,
        stagedFiles,
        knowledgeFilesStaged,
        hookFilesStaged,
        currentBranch,
        commitInfo,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.warn("⚠️ Could not capture commit-msg Git state:", error.message);
      return {
        commitMessageFile: "unknown",
        commitMessage: "",
        stagedFiles: [],
        knowledgeFilesStaged: [],
        hookFilesStaged: [],
        currentBranch: "unknown",
        commitInfo: null,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  },

  async getCommitInfo() {
    const { execSync } = await import("node:child_process");

    try {
      // Get current commit SHA
      const currentCommit = execSync("git rev-parse HEAD", {
        encoding: "utf8",
      }).trim();

      // Get author information
      const authorName = execSync("git config user.name", {
        encoding: "utf8",
      }).trim();

      const authorEmail = execSync("git config user.email", {
        encoding: "utf8",
      }).trim();

      // Get repository information
      const remoteUrl = execSync(
        "git config --get remote.origin.url 2>/dev/null || echo ''",
        {
          encoding: "utf8",
        }
      ).trim();

      return {
        currentCommit,
        authorName,
        authorEmail,
        remoteUrl,
      };
    } catch (error) {
      return {
        currentCommit: "unknown",
        authorName: "unknown",
        authorEmail: "unknown",
        remoteUrl: "unknown",
        error: error.message,
      };
    }
  },

  async validateCommitMessage(gitState) {
    const message = gitState.commitMessage;
    const errors = [];
    const warnings = [];
    const suggestions = [];

    // Basic format validation
    if (!message || message.trim().length === 0) {
      errors.push("Commit message cannot be empty");
      return { isValid: false, errors, warnings, suggestions };
    }

    // Check message length
    const lines = message.split("\n");
    const subjectLine = lines[0];

    if (subjectLine.length > 72) {
      warnings.push("Subject line is longer than 72 characters");
      suggestions.push("Consider shortening the subject line");
    }

    if (subjectLine.length < 10) {
      warnings.push("Subject line is very short");
      suggestions.push("Consider adding more descriptive subject");
    }

    // Check for conventional commit format
    const conventionalCommitPattern =
      /^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .+/;
    if (!conventionalCommitPattern.test(subjectLine)) {
      warnings.push(
        "Commit message does not follow conventional commit format"
      );
      suggestions.push("Consider using format: type(scope): description");
    }

    // Check for knowledge graph specific patterns
    if (gitState.knowledgeFilesStaged.length > 0) {
      const knowledgePatterns = [
        /knowledge/i,
        /ontology/i,
        /graph/i,
        /sparql/i,
        /turtle/i,
        /rdf/i,
      ];

      const hasKnowledgeContext = knowledgePatterns.some((pattern) =>
        pattern.test(message)
      );

      if (!hasKnowledgeContext) {
        warnings.push(
          "Knowledge graph files changed but message doesn't mention knowledge context"
        );
        suggestions.push(
          "Consider mentioning knowledge graph changes in commit message"
        );
      }
    }

    // Check for hook specific patterns
    if (gitState.hookFilesStaged.length > 0) {
      const hookPatterns = [/hook/i, /automation/i, /workflow/i, /trigger/i];

      const hasHookContext = hookPatterns.some((pattern) =>
        pattern.test(message)
      );

      if (!hasHookContext) {
        warnings.push(
          "Hook files changed but message doesn't mention hook context"
        );
        suggestions.push("Consider mentioning hook changes in commit message");
      }
    }

    // Check for imperative mood
    const imperativePattern =
      /^(add|remove|update|fix|refactor|implement|create|delete|modify|change)/i;
    if (!imperativePattern.test(subjectLine)) {
      warnings.push("Subject line should use imperative mood");
      suggestions.push(
        "Use verbs like 'add', 'fix', 'update' instead of 'added', 'fixed', 'updated'"
      );
    }

    // Check for trailing period in subject
    if (subjectLine.endsWith(".")) {
      warnings.push("Subject line should not end with a period");
      suggestions.push("Remove the trailing period from the subject line");
    }

    // Check for multiple paragraphs (should have blank line between)
    if (lines.length > 1) {
      const hasBlankLine = lines[1].trim() === "";
      if (!hasBlankLine) {
        warnings.push(
          "Body should be separated from subject with a blank line"
        );
        suggestions.push("Add a blank line between subject and body");
      }
    }

    // Check body line length
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].length > 72) {
        warnings.push(`Body line ${i} is longer than 72 characters`);
        suggestions.push("Consider wrapping long lines in the body");
        break;
      }
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings,
      suggestions,
    };
  },

  generateCommitMsgRecommendations(gitState, validationResult) {
    const recommendations = [];

    if (!validationResult.isValid) {
      recommendations.push("Fix validation errors before committing");
    }

    if (validationResult.warnings.length > 0) {
      recommendations.push(
        "Consider addressing warnings for better commit quality"
      );
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

    if (validationResult.suggestions.length > 0) {
      recommendations.push(...validationResult.suggestions);
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
