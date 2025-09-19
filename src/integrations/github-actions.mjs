// src/integrations/github-actions.mjs
// GitHub Actions Integration for Knowledge Hooks

import { defineJob } from "../core/job-registry.mjs";
import { useGitVan } from "../core/context.mjs";

/**
 * GitHub Actions Integration
 * Provides seamless integration with GitHub Actions workflows
 */
export class GitHubActionsIntegration {
  constructor(options = {}) {
    this.githubToken = options.githubToken || process.env.GITHUB_TOKEN;
    this.repository = options.repository || process.env.GITHUB_REPOSITORY;
    this.apiBaseUrl = options.apiBaseUrl || "https://api.github.com";
    this.logger = options.logger || console;
  }

  /**
   * Trigger a GitHub Actions workflow
   * @param {string} workflowId - Workflow ID or filename
   * @param {object} inputs - Workflow inputs
   * @param {string} ref - Git reference (branch/tag)
   * @returns {Promise<object>} Workflow run information
   */
  async triggerWorkflow(workflowId, inputs = {}, ref = "main") {
    try {
      const url = `${this.apiBaseUrl}/repos/${this.repository}/actions/workflows/${workflowId}/dispatches`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `token ${this.githubToken}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref,
          inputs,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `GitHub API error: ${response.status} ${response.statusText}`
        );
      }

      this.logger.info(`✅ GitHub Actions workflow ${workflowId} triggered`);

      return {
        success: true,
        workflowId,
        ref,
        inputs,
        triggeredAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `❌ Failed to trigger GitHub Actions workflow: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Get workflow run status
   * @param {number} runId - Workflow run ID
   * @returns {Promise<object>} Run status information
   */
  async getWorkflowRunStatus(runId) {
    try {
      const url = `${this.apiBaseUrl}/repos/${this.repository}/actions/runs/${runId}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `token ${this.githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `GitHub API error: ${response.status} ${response.statusText}`
        );
      }

      const runData = await response.json();

      return {
        id: runData.id,
        status: runData.status,
        conclusion: runData.conclusion,
        createdAt: runData.created_at,
        updatedAt: runData.updated_at,
        htmlUrl: runData.html_url,
        jobsUrl: runData.jobs_url,
      };
    } catch (error) {
      this.logger.error(
        `❌ Failed to get workflow run status: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * List workflow runs
   * @param {string} workflowId - Workflow ID
   * @param {object} options - Query options
   * @returns {Promise<Array<object>>} List of workflow runs
   */
  async listWorkflowRuns(workflowId, options = {}) {
    try {
      const params = new URLSearchParams({
        per_page: options.perPage || 30,
        page: options.page || 1,
        ...(options.status && { status: options.status }),
        ...(options.branch && { branch: options.branch }),
      });

      const url = `${this.apiBaseUrl}/repos/${this.repository}/actions/workflows/${workflowId}/runs?${params}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `token ${this.githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `GitHub API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      return data.workflow_runs.map((run) => ({
        id: run.id,
        status: run.status,
        conclusion: run.conclusion,
        createdAt: run.created_at,
        updatedAt: run.updated_at,
        htmlUrl: run.html_url,
        headBranch: run.head_branch,
        headSha: run.head_sha,
      }));
    } catch (error) {
      this.logger.error(`❌ Failed to list workflow runs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a GitHub Actions workflow step for Knowledge Hooks
   * @param {object} hookConfig - Hook configuration
   * @returns {object} GitHub Actions step configuration
   */
  createWorkflowStep(hookConfig) {
    return {
      name: `Knowledge Hook: ${hookConfig.title}`,
      uses: "actions/github-script@v6",
      with: {
        script: `
          const { HookOrchestrator } = require('./src/hooks/HookOrchestrator.mjs');
          
          const orchestrator = new HookOrchestrator({
            graphDir: './hooks',
            context: { cwd: process.cwd() },
            logger: console,
          });
          
          const result = await orchestrator.evaluate({
            gitContext: {
              event: 'github-actions',
              commitSha: context.sha,
              branch: context.ref.replace('refs/heads/', ''),
              repository: context.repo.full_name,
            },
            verbose: true,
          });
          
          console.log('Knowledge Hook evaluation result:', result);
        `,
      },
    };
  }
}

/**
 * GitHub Actions Integration Job
 * Provides GitHub Actions integration for Knowledge Hooks
 */
export default defineJob({
  meta: {
    name: "github-actions-integration",
    desc: "Integrates Knowledge Hooks with GitHub Actions workflows",
    tags: ["github-actions", "integration", "ci-cd"],
    version: "1.0.0",
  },

  hooks: ["post-commit", "post-merge", "pre-push"],

  async run(context) {
    console.log("🔗 Starting GitHub Actions Integration");

    try {
      const gitvanContext = useGitVan();
      const githubIntegration = new GitHubActionsIntegration({
        githubToken: process.env.GITHUB_TOKEN,
        repository: process.env.GITHUB_REPOSITORY,
        logger: console,
      });

      // Get Git context
      const gitContext = await this.getGitContext(context);

      // Check if we should trigger GitHub Actions
      const shouldTrigger = await this.shouldTriggerGitHubActions(gitContext);

      if (shouldTrigger) {
        // Trigger appropriate GitHub Actions workflow
        const workflowResult = await this.triggerAppropriateWorkflow(
          githubIntegration,
          gitContext
        );

        console.log(
          `   🚀 GitHub Actions workflow triggered: ${workflowResult.workflowId}`
        );
        console.log(
          `   📊 Workflow inputs: ${JSON.stringify(workflowResult.inputs)}`
        );

        return {
          success: true,
          githubActions: workflowResult,
          gitContext,
        };
      } else {
        console.log("   ⏭️ Skipping GitHub Actions trigger");
        return {
          success: true,
          skipped: true,
          reason: "No trigger conditions met",
          gitContext,
        };
      }
    } catch (error) {
      console.error("❌ GitHub Actions integration failed:", error.message);
      throw error;
    }
  },

  async getGitContext(context) {
    const { execSync } = await import("node:child_process");

    try {
      const commitSha = execSync("git rev-parse HEAD", {
        encoding: "utf8",
      }).trim();

      const branch = execSync("git rev-parse --abbrev-ref HEAD", {
        encoding: "utf8",
      }).trim();

      const changedFiles = execSync("git diff --name-only HEAD~1 HEAD", {
        encoding: "utf8",
      })
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      return {
        commitSha,
        branch,
        changedFiles,
        hookName: context.hookName,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.warn("⚠️ Could not extract Git context:", error.message);
      return {
        commitSha: "unknown",
        branch: "unknown",
        changedFiles: [],
        hookName: context.hookName || "unknown",
        timestamp: new Date().toISOString(),
      };
    }
  },

  async shouldTriggerGitHubActions(gitContext) {
    // Trigger GitHub Actions if:
    // 1. Knowledge graph files changed
    // 2. Hook files changed
    // 3. Critical files changed

    const knowledgeFiles = gitContext.changedFiles.filter(
      (f) => f.includes(".ttl") || f.includes(".rdf") || f.includes("graph/")
    );

    const hookFiles = gitContext.changedFiles.filter(
      (f) => f.includes("hooks/") || f.includes(".hook.")
    );

    const criticalFiles = gitContext.changedFiles.filter(
      (f) =>
        f.includes("package.json") ||
        f.includes("Dockerfile") ||
        f.includes(".github/workflows/")
    );

    return (
      knowledgeFiles.length > 0 ||
      hookFiles.length > 0 ||
      criticalFiles.length > 0
    );
  },

  async triggerAppropriateWorkflow(githubIntegration, gitContext) {
    const knowledgeFiles = gitContext.changedFiles.filter(
      (f) => f.includes(".ttl") || f.includes(".rdf") || f.includes("graph/")
    );

    const hookFiles = gitContext.changedFiles.filter(
      (f) => f.includes("hooks/") || f.includes(".hook.")
    );

    if (knowledgeFiles.length > 0) {
      // Trigger knowledge graph validation workflow
      return await githubIntegration.triggerWorkflow(
        "knowledge-graph-validation.yml",
        {
          commit_sha: gitContext.commitSha,
          changed_files: knowledgeFiles.join(","),
          validation_type: "knowledge_graph",
        },
        gitContext.branch
      );
    } else if (hookFiles.length > 0) {
      // Trigger hook validation workflow
      return await githubIntegration.triggerWorkflow(
        "hook-validation.yml",
        {
          commit_sha: gitContext.commitSha,
          changed_files: hookFiles.join(","),
          validation_type: "hooks",
        },
        gitContext.branch
      );
    } else {
      // Trigger general validation workflow
      return await githubIntegration.triggerWorkflow(
        "general-validation.yml",
        {
          commit_sha: gitContext.commitSha,
          changed_files: gitContext.changedFiles.join(","),
          validation_type: "general",
        },
        gitContext.branch
      );
    }
  },
});
