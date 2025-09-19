// hooks/knowledge-hooks-suite/applypatch-msg-git-state-validator.mjs
// Applypatch-msg Git State Validator - Validates Git state before applying patches

import { defineJob } from "../../src/core/job-registry.mjs";
import { useGitVan } from "../../src/core/context.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export default defineJob({
  meta: {
    name: "applypatch-msg-git-state-validator",
    desc: "Validates Git state before applying patches and writes comprehensive validation report",
    tags: ["knowledge-hooks", "git-validation", "applypatch-msg"],
    version: "1.0.0",
  },

  hooks: ["applypatch-msg"],

  async run(context) {
    console.log("📝 Applypatch-msg Git State Validation");

    try {
      const gitvanContext = useGitVan();
      const { execSync } = await import("node:child_process");

      // Create reports directory
      const reportsDir = join(process.cwd(), "reports", "git-state");
      mkdirSync(reportsDir, { recursive: true });

      // Get comprehensive Git state
      const gitState = await this.captureApplypatchState(context);

      // Generate validation report
      const validationReport = {
        timestamp: new Date().toISOString(),
        hookType: "applypatch-msg",
        gitState: gitState,
        validation: {
          patchFile: gitState.patchFile,
          patchMessage: gitState.patchMessage,
          workingTreeStatus: gitState.workingTreeStatus,
          repositoryHealth: gitState.repositoryHealth,
        },
        knowledgeGraph: {
          filesAffected: gitState.filesAffected,
          hooksAffected: gitState.hooksAffected,
          impactAssessment: this.assessApplypatchImpact(gitState),
        },
        recommendations: this.generateApplypatchRecommendations(gitState),
      };

      // Write report to disk
      const reportPath = join(reportsDir, `applypatch-msg-${Date.now()}.json`);
      writeFileSync(reportPath, JSON.stringify(validationReport, null, 2));

      console.log(`   📊 Applypatch-msg Validation Report: ${reportPath}`);
      console.log(`   📝 Patch file: ${gitState.patchFile}`);
      console.log(`   📝 Patch message: ${gitState.patchMessage}`);
      console.log(
        `   📁 Working tree status: ${gitState.workingTreeStatus.status}`
      );

      return {
        success: true,
        reportPath: reportPath,
        validation: validationReport.validation,
        artifacts: [reportPath],
      };
    } catch (error) {
      console.error("❌ Applypatch-msg validation failed:", error.message);
      throw error;
    }
  },

  async captureApplypatchState(context) {
    const { execSync } = await import("node:child_process");

    try {
      // Get patch file from stdin
      const stdin = process.stdin;
      let patchMessage = "";

      if (stdin && !stdin.isTTY) {
        const input = await new Promise((resolve) => {
          let data = "";
          stdin.on("data", (chunk) => (data += chunk));
          stdin.on("end", () => resolve(data));
        });
        patchMessage = input.trim();
      }

      // Get current branch
      const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
        encoding: "utf8",
      }).trim();

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

      return {
        patchFile: context.patchFile || "unknown",
        patchMessage,
        currentBranch,
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
        stagedFiles,
        unstagedFiles,
        untrackedFiles,
        filesAffected: [
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
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.warn(
        "⚠️ Could not capture complete applypatch state:",
        error.message
      );
      return {
        patchFile: "unknown",
        patchMessage: "unknown",
        currentBranch: "unknown",
        workingTreeStatus: { status: "unknown", clean: false, files: [] },
        repositoryHealth: { totalCommits: 0, totalBranches: 0, totalTags: 0 },
        stagedFiles: [],
        unstagedFiles: [],
        untrackedFiles: [],
        filesAffected: [],
        hooksAffected: [],
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  },

  assessApplypatchImpact(gitState) {
    const impact = {
      level: "low",
      description: "",
      affectedAreas: [],
      riskFactors: [],
    };

    const knowledgeFiles = gitState.filesAffected;
    const hooksFiles = gitState.hooksAffected;
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

    if (gitState.patchMessage.length > 1000) {
      impact.riskFactors.push("large-patch-message");
      impact.level = "medium";
    }

    impact.description = `Impact level: ${
      impact.level
    }. Affected areas: ${impact.affectedAreas.join(
      ", "
    )}. Risk factors: ${impact.riskFactors.join(", ")}`;

    return impact;
  },

  generateApplypatchRecommendations(gitState) {
    const recommendations = [];

    if (gitState.patchMessage.length === 0) {
      recommendations.push(
        "No patch message provided - consider adding a message"
      );
    }

    if (gitState.filesAffected.length > 0) {
      recommendations.push(
        `Knowledge graph will be affected: ${gitState.filesAffected.length} files`
      );
    }

    if (gitState.hooksAffected.length > 0) {
      recommendations.push(
        `Hooks system will be affected: ${gitState.hooksAffected.length} files`
      );
    }

    if (!gitState.workingTreeStatus.clean) {
      recommendations.push(
        "Working tree is dirty - consider committing or stashing changes"
      );
    }

    if (gitState.patchMessage.length > 500) {
      recommendations.push(
        "Large patch message detected - consider breaking into smaller patches"
      );
    }

    return recommendations;
  },
});

