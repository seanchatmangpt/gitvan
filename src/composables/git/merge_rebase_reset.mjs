// src/composables/git/merge_rebase_reset.mjs
// GitVan v2 — Merge, rebase, and reset operations factory
// - Merge operations with various strategies
// - Rebase operations with options
// - Reset operations with different modes

export default function makeMergeRebaseReset(base, run, runVoid, toArr) {
  return {
    // Merge operations
    async merge(ref, options = {}) {
      const args = ["merge"];

      if (options.noff) args.push("--no-ff");
      if (options.ff) args.push("--ff-only");
      if (options.squash) args.push("--squash");
      if (options.noCommit) args.push("--no-commit");
      if (options.message) args.push("-m", options.message);

      if (ref) args.push(ref);

      await runVoid(args);
    },

    // Rebase operations
    async rebase(onto = "origin/main", options = {}) {
      const args = ["rebase"];

      if (options.interactive) args.push("-i");
      if (options.continue) args.push("--continue");
      if (options.abort) args.push("--abort");
      if (options.skip) args.push("--skip");
      if (options.autosquash) args.push("--autosquash");
      if (options.noAutosquash) args.push("--no-autosquash");

      if (onto) args.push(onto);

      await runVoid(args);
    },

    // Reset operations
    async reset(mode = "mixed", ref = "HEAD", options = {}) {
      const args = ["reset"];

      // Reset modes: soft, mixed, hard, merge, keep
      if (mode) args.push(`--${mode}`);

      if (options.paths && options.paths.length > 0) {
        args.push("--", ...toArr(options.paths));
      } else if (ref) {
        args.push(ref);
      }

      await runVoid(args);
    },
  };
}
