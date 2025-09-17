// src/composables/git/diff.mjs
// GitVan v2 — Git Diff Operations
// Modular diff commands to prevent bloat in main useGit()

import { runGit } from "../git-core.mjs";

export function createDiffCommands(base) {
  return {
    // ---------- Diff operations ----------
    async diff(options = {}) {
      const args = ["diff"];

      // Handle different diff types
      if (options.cached) args.push("--cached");
      if (options.staged) args.push("--cached");
      if (options.nameOnly) args.push("--name-only");
      if (options.nameStatus) args.push("--name-status");
      if (options.stat) args.push("--stat");
      if (options.shortstat) args.push("--shortstat");
      if (options.numstat) args.push("--numstat");

      // Handle commit ranges
      if (options.from && options.to) {
        args.push(`${options.from}..${options.to}`);
      } else if (options.from) {
        args.push(options.from);
      }

      // Handle specific files
      if (options.files && options.files.length > 0) {
        args.push("--", ...options.files);
      }

      return runGit(args, base);
    },

    async diffFiles(file1, file2) {
      return runGit(["diff", "--no-index", file1, file2], base);
    },

    async diffTree(tree1, tree2) {
      return runGit(["diff-tree", tree1, tree2], base);
    },
  };
}
