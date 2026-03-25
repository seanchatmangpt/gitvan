// src/composables/git/merge.mjs
// GitVan v2 — Git Merge Operations
// Modular merge commands to prevent bloat in main useGit()

import { runGitVoid } from "../git-core.mjs";

/**
 * Create Git merge operations
 * @param {Object} base - Base configuration {cwd, env}
 * @returns {Object} Merge operations interface
 */
export function createMergeCommands(base) {
  return {
    // ---------- Merge operations ----------
    async merge(ref, options = {}) {
      const args = ["merge"];

      if (options.noff) args.push("--no-ff");
      if (options.ff) args.push("--ff-only");
      if (options.squash) args.push("--squash");
      if (options.noCommit) args.push("--no-commit");
      if (options.message) args.push("-m", options.message);

      if (ref) args.push(ref);

      await runGitVoid(args, base);
    },

    async rebase(onto = "origin/main", options = {}) {
      const args = ["rebase"];

      if (options.interactive) args.push("-i");
      if (options.continue) args.push("--continue");
      if (options.abort) args.push("--abort");
      if (options.skip) args.push("--skip");
      if (options.autosquash) args.push("--autosquash");
      if (options.noAutosquash) args.push("--no-autosquash");

      if (onto) args.push(onto);

      await runGitVoid(args, base);
    },

    async cherryPick(commit, options = {}) {
      const args = ["cherry-pick"];

      if (options.continue) args.push("--continue");
      if (options.abort) args.push("--abort");
      if (options.skip) args.push("--skip");
      if (options.noCommit) args.push("--no-commit");
      if (options.edit) args.push("--edit");

      if (commit) args.push(commit);

      await runGitVoid(args, base);
    },

    async revert(commit, options = {}) {
      const args = ["revert"];

      if (options.noCommit) args.push("--no-commit");
      if (options.edit) args.push("--edit");
      if (options.mainline) args.push("-m", options.mainline);

      if (commit) args.push(commit);

      await runGitVoid(args, base);
    },

    // ---------- Merge abort ----------
    async mergeAbort() {
      await runGitVoid(["merge", "--abort"], base);
    },

    // ---------- Conflict detection ----------
    async hasConflicts() {
      try {
        const output = await runGit(["diff", "--name-only", "--diff-filter=U"], base);
        return output.trim().length > 0;
      } catch {
        return false;
      }
    },

    async getConflictedFiles() {
      try {
        const output = await runGit(["diff", "--name-only", "--diff-filter=U"], base);
        return output
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
      } catch {
        return [];
      }
    },

    // ---------- Conflict resolution ----------
    async resolveConflict(file, strategy = "ours") {
      const args = ["checkout"];

      if (strategy === "ours") {
        args.push("--ours");
      } else if (strategy === "theirs") {
        args.push("--theirs");
      } else {
        throw new Error(`Invalid strategy: ${strategy}. Use 'ours' or 'theirs'`);
      }

      args.push("--", file);

      await runGitVoid(args, base);
    },

    async resolveAllConflicts(strategy = "ours") {
      const conflicts = await this.getConflictedFiles();

      for (const file of conflicts) {
        await this.resolveConflict(file, strategy);
      }

      return conflicts;
    },

    // ---------- Merge status ----------
    async getMergeStatus() {
      try {
        const { readFile } = await import("node:fs/promises");
        const { join } = await import("node:path");

        const gitDir = await runGit(["rev-parse", "--git-dir"], base);
        const mergeHeadPath = join(gitDir.trim(), "MERGE_HEAD");

        try {
          const mergeHead = await readFile(mergeHeadPath, "utf8");
          const conflicts = await this.getConflictedFiles();

          return {
            inProgress: true,
            mergeHead: mergeHead.trim(),
            hasConflicts: conflicts.length > 0,
            conflictedFiles: conflicts,
          };
        } catch {
          return { inProgress: false };
        }
      } catch {
        return { inProgress: false };
      }
    },

    // ---------- Merge strategies ----------
    async mergeWithStrategy(ref, strategy, options = {}) {
      const args = ["merge", "-s", strategy];

      if (options.message) {
        args.push("-m", options.message);
      }

      if (options.noCommit) {
        args.push("--no-commit");
      }

      if (ref) args.push(ref);

      await runGitVoid(args, base);
    },

    // Recursive strategy (default, for two branches)
    async mergeRecursive(ref, options = {}) {
      return this.mergeWithStrategy(ref, "recursive", options);
    },

    // Octopus strategy (for multiple branches)
    async mergeOctopus(refs, options = {}) {
      const args = ["merge", "-s", "octopus"];

      if (options.message) {
        args.push("-m", options.message);
      }

      args.push(...refs);

      await runGitVoid(args, base);
    },

    // Ours strategy (keep our version)
    async mergeOurs(ref, options = {}) {
      return this.mergeWithStrategy(ref, "ours", options);
    },

    // Subtree strategy
    async mergeSubtree(ref, options = {}) {
      return this.mergeWithStrategy(ref, "subtree", options);
    },

    // ---------- Check if merge is needed ----------
    async needsMerge(branch, targetBranch = "HEAD") {
      try {
        const mergeBase = await runGit(["merge-base", branch, targetBranch], base);
        const branchHead = await runGit(["rev-parse", branch], base);

        return mergeBase.trim() !== branchHead.trim();
      } catch {
        return false;
      }
    },
  };
}
