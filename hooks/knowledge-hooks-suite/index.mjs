// hooks/knowledge-hooks-suite/index.mjs
// Knowledge Hooks Suite - Complete Git Lifecycle Coverage
// Comprehensive suite of knowledge hooks that validate Git state by writing reports to disk

import { defineJob } from "../../src/core/job-registry.mjs";
import { useGitVan } from "../../src/core/context.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export default defineJob({
  meta: {
    name: "knowledge-hooks-suite",
    desc: "Complete suite of knowledge hooks for all Git lifecycle operations with disk-based reporting",
    tags: ["knowledge-hooks", "git-lifecycle", "comprehensive", "reporting"],
    version: "1.0.0",
  },

  hooks: [
    // Client-side hooks
    "pre-commit",
    "post-commit",
    "pre-push",
    "post-merge",
    "post-checkout",
    // Apply patch hooks
    "applypatch-msg",
    "pre-applypatch",
    "post-applypatch",
    // Server-side hooks
    "pre-receive",
    "post-receive",
    "post-update",
    // Advanced hooks
    "pre-rebase",
    "post-rewrite",
    // Additional hooks (if supported)
    "prepare-commit-msg",
    "commit-msg",
    "pre-checkout",
    "pre-auto-gc",
    "push-to-checkout",
  ],

  async run(context) {
    console.log("🧠 Knowledge Hooks Suite - Complete Git Lifecycle Coverage");

    try {
      const gitvanContext = useGitVan();
      const { execSync } = await import("node:child_process");

      // Create reports directory
      const reportsDir = join(process.cwd(), "reports", "git-state");
      mkdirSync(reportsDir, { recursive: true });

      // Get comprehensive Git state
      const gitState = await this.captureComprehensiveGitState(context);

      // Generate comprehensive analysis report
      const comprehensiveReport = {
        timestamp: new Date().toISOString(),
        hookType: context.hookName || "unknown",
        gitState: gitState,
        analysis: {
          hookCoverage: this.getHookCoverage(),
          gitStateSummary: this.getGitStateSummary(gitState),
          knowledgeGraphImpact: this.assessKnowledgeGraphImpact(gitState),
          repositoryHealth: gitState.repositoryHealth,
          recommendations: this.generateComprehensiveRecommendations(gitState),
        },
        knowledgeGraph: {
          filesAffected: gitState.knowledgeFilesAffected,
          hooksAffected: gitState.hooksAffected,
          impactAssessment: this.assessComprehensiveImpact(gitState),
        },
        suite: {
          totalHooks: this.getHookCoverage().totalHooks,
          supportedHooks: this.getHookCoverage().supportedHooks,
          coveragePercentage: this.getHookCoverage().coveragePercentage,
        },
      };

      // Write comprehensive report to disk
      const reportPath = join(
        reportsDir,
        `comprehensive-${context.hookName || "unknown"}-${Date.now()}.json`
      );
      writeFileSync(reportPath, JSON.stringify(comprehensiveReport, null, 2));

      console.log(`   📊 Comprehensive Analysis Report: ${reportPath}`);
      console.log(
        `   🧠 Knowledge Hooks Suite Coverage: ${
          this.getHookCoverage().coveragePercentage
        }%`
      );
      console.log(
        `   📁 Git State Summary: ${this.getGitStateSummary(gitState)}`
      );
      console.log(
        `   🎯 Knowledge Graph Impact: ${
          this.assessKnowledgeGraphImpact(gitState).level
        }`
      );

      return {
        success: true,
        reportPath: reportPath,
        analysis: comprehensiveReport.analysis,
        artifacts: [reportPath],
      };
    } catch (error) {
      console.error("❌ Knowledge Hooks Suite failed:", error.message);
      throw error;
    }
  },

  async captureComprehensiveGitState(context) {
    const { execSync } = await import("node:child_process");

    try {
      // Get basic Git information
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

      // Get staged files
      const stagedFiles = execSync("git diff --cached --name-only", {
        encoding: "utf8",
      })
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      // Get unstaged files
      const unstagedFiles = execSync("git diff --name-only", {
        encoding: "utf8",
      })
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      // Get untracked files
      const untrackedFiles = execSync(
        "git ls-files --others --exclude-standard",
        {
          encoding: "utf8",
        }
      )
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

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

      // Get knowledge files
      const knowledgeFiles = execSync(
        "find . -name '*.ttl' -o -name '*.rdf' -o -path '*/graph/*' 2>/dev/null | head -50",
        {
          encoding: "utf8",
        }
      )
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      // Get hooks files
      const hooksFiles = execSync(
        "find . -path '*/hooks/*' -o -name '*.hook.*' 2>/dev/null | head -50",
        {
          encoding: "utf8",
        }
      )
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

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

      return {
        basicInfo: {
          currentBranch,
          currentCommit,
          commitMessage,
          commitAuthor,
          commitDate,
          shortSha: currentCommit.substring(0, 8),
        },
        workingTree: {
          status: workingTreeClean ? "clean" : "dirty",
          clean: workingTreeClean,
          stagedFiles,
          unstagedFiles,
          untrackedFiles,
          statusFiles: workingTreeStatus
            .split("\n")
            .filter((l) => l.length > 0),
        },
        repositoryHealth: {
          totalCommits: parseInt(totalCommits),
          totalBranches: parseInt(totalBranches),
          totalTags: parseInt(totalTags),
          branchAhead: parseInt(branchAhead),
          branchBehind: parseInt(branchBehind),
          hasUpstream: branchAhead !== "0" || branchBehind !== "0",
        },
        knowledgeFilesAffected: [
          ...stagedFiles.filter(
            (f) =>
              f.includes(".ttl") || f.includes(".rdf") || f.includes("graph/")
          ),
          ...unstagedFiles.filter(
            (f) =>
              f.includes(".ttl") || f.includes(".rdf") || f.includes("graph/")
          ),
          ...untrackedFiles.filter(
            (f) =>
              f.includes(".ttl") || f.includes(".rdf") || f.includes("graph/")
          ),
        ],
        hooksAffected: [
          ...stagedFiles.filter(
            (f) => f.includes("hooks/") || f.includes(".hook.")
          ),
          ...unstagedFiles.filter(
            (f) => f.includes("hooks/") || f.includes(".hook.")
          ),
          ...untrackedFiles.filter(
            (f) => f.includes("hooks/") || f.includes(".hook.")
          ),
        ],
        allKnowledgeFiles: knowledgeFiles,
        allHooksFiles: hooksFiles,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.warn("⚠️ Could not capture complete Git state:", error.message);
      return {
        basicInfo: {
          currentBranch: "unknown",
          currentCommit: "unknown",
          commitMessage: "unknown",
          commitAuthor: "unknown",
          commitDate: "unknown",
          shortSha: "unknown",
        },
        workingTree: {
          status: "unknown",
          clean: false,
          stagedFiles: [],
          unstagedFiles: [],
          untrackedFiles: [],
          statusFiles: [],
        },
        repositoryHealth: {
          totalCommits: 0,
          totalBranches: 0,
          totalTags: 0,
          branchAhead: 0,
          branchBehind: 0,
          hasUpstream: false,
        },
        knowledgeFilesAffected: [],
        hooksAffected: [],
        allKnowledgeFiles: [],
        allHooksFiles: [],
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  },

  getHookCoverage() {
    const allGitHooks = [
      // Client-side hooks
      "pre-commit",
      "prepare-commit-msg",
      "commit-msg",
      "post-commit",
      "pre-push",
      "post-push",
      "pre-rebase",
      "post-rewrite",
      "pre-checkout",
      "post-checkout",
      "pre-merge",
      "post-merge",
      "pre-auto-gc",
      "post-auto-gc",
      // Server-side hooks
      "pre-receive",
      "update",
      "post-receive",
      // Additional hooks
      "applypatch-msg",
      "pre-applypatch",
      "post-applypatch",
    ];

    const supportedHooks = [
      "pre-commit",
      "post-commit",
      "pre-push",
      "post-merge",
      "post-checkout",
      "applypatch-msg",
      "pre-applypatch",
      "post-applypatch",
      "pre-receive",
      "post-receive",
      "post-update",
      "pre-rebase",
      "post-rewrite",
      "prepare-commit-msg",
      "commit-msg",
      "pre-checkout",
      "pre-auto-gc",
      "push-to-checkout",
    ];

    return {
      totalHooks: allGitHooks.length,
      supportedHooks: supportedHooks.length,
      coveragePercentage: Math.round(
        (supportedHooks.length / allGitHooks.length) * 100
      ),
      allHooks: allGitHooks,
      supported: supportedHooks,
      unsupported: allGitHooks.filter((hook) => !supportedHooks.includes(hook)),
    };
  },

  getGitStateSummary(gitState) {
    const staged = gitState.workingTree.stagedFiles.length;
    const unstaged = gitState.workingTree.unstagedFiles.length;
    const untracked = gitState.workingTree.untrackedFiles.length;
    const knowledge = gitState.knowledgeFilesAffected.length;
    const hooks = gitState.hooksAffected.length;

    return `${staged} staged, ${unstaged} unstaged, ${untracked} untracked, ${knowledge} knowledge, ${hooks} hooks`;
  },

  assessKnowledgeGraphImpact(gitState) {
    const knowledgeFiles = gitState.knowledgeFilesAffected;
    const hooksFiles = gitState.hooksAffected;

    if (hooksFiles.length > 0) {
      return { level: "high", description: "Hooks system changes detected" };
    } else if (knowledgeFiles.length > 0) {
      return {
        level: "medium",
        description: "Knowledge graph changes detected",
      };
    } else {
      return { level: "low", description: "No knowledge graph changes" };
    }
  },

  assessComprehensiveImpact(gitState) {
    const impact = {
      level: "low",
      description: "",
      affectedAreas: [],
      riskFactors: [],
    };

    const knowledgeFiles = gitState.knowledgeFilesAffected;
    const hooksFiles = gitState.hooksAffected;
    const workingTreeDirty = !gitState.workingTree.clean;

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

    if (gitState.repositoryHealth.totalCommits > 10000) {
      impact.riskFactors.push("large-repository");
      impact.level = "medium";
    }

    impact.description = `Impact level: ${
      impact.level
    }. Affected areas: ${impact.affectedAreas.join(
      ", "
    )}. Risk factors: ${impact.riskFactors.join(", ")}`;

    return impact;
  },

  generateComprehensiveRecommendations(gitState) {
    const recommendations = [];

    if (gitState.knowledgeFilesAffected.length > 0) {
      recommendations.push(
        `Knowledge graph affected: ${gitState.knowledgeFilesAffected.length} files`
      );
    }

    if (gitState.hooksAffected.length > 0) {
      recommendations.push(
        `Hooks system affected: ${gitState.hooksAffected.length} files`
      );
    }

    if (!gitState.workingTree.clean) {
      recommendations.push(
        "Working tree is dirty - consider committing or stashing changes"
      );
    }

    if (gitState.repositoryHealth.branchAhead > 0) {
      recommendations.push(
        `Branch is ${gitState.repositoryHealth.branchAhead} commits ahead - consider pushing`
      );
    }

    if (gitState.repositoryHealth.branchBehind > 0) {
      recommendations.push(
        `Branch is ${gitState.repositoryHealth.branchBehind} commits behind - consider pulling`
      );
    }

    if (gitState.repositoryHealth.totalCommits > 1000) {
      recommendations.push(
        "Large repository detected - consider cleanup and optimization"
      );
    }

    return recommendations;
  },
});
