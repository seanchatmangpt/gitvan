// src/composables/git/cherry_revert.mjs
// GitVan v2 — Cherry-pick and revert operations factory
// - Cherry-pick operations with options
// - Revert operations with options

/**
 * Create Git cherry-pick and revert operations
 * @param {Object} base - Base configuration {cwd, env}
 * @param {Function} run - Execute git command with output
 * @param {Function} runVoid - Execute git command without output
 * @param {Function} toArr - Convert to array helper
 * @returns {Object} Cherry-pick and revert operations interface
 */
export default function makeCherryRevert(base, run, runVoid, toArr) {
  return {
    // Cherry-pick operations
    async cherryPick(commit, options = {}) {
      const args = ["cherry-pick"];

      if (options.continue) args.push("--continue");
      if (options.abort) args.push("--abort");
      if (options.skip) args.push("--skip");
      if (options.noCommit) args.push("--no-commit");
      if (options.edit) args.push("--edit");

      if (commit) args.push(commit);

      await runVoid(args);
    },

    // Revert operations
    async revert(commit, options = {}) {
      const args = ["revert"];

      if (options.noCommit) args.push("--no-commit");
      if (options.edit) args.push("--edit");
      if (options.mainline) args.push("-m", options.mainline);

      if (commit) args.push(commit);

      await runVoid(args);
    },
  };
}
