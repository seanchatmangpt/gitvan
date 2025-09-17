// src/composables/git/merge.mjs
// GitVan v2 — Git Merge Operations
// Modular merge commands to prevent bloat in main useGit()

import { runGitVoid } from "../git-core.mjs";

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
  };
}
