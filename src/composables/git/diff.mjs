// src/composables/git/diff.mjs
// GitVan v2 — Diff operations factory
// - File diff and change detection helpers
// - Changed paths filtering with glob support

import minimatch from "minimatch";

export default function makeDiff(base, run, runVoid, toArr) {
  return {
    // Git diff with various options
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
        args.push("--", ...toArr(options.files));
      }

      return run(args);
    },

    // Get changed files between commits
    async changedFiles(from, to = "HEAD") {
      const diff = await this.diff({ from, to, nameOnly: true });
      return diff.split("\n").filter(line => line.trim());
    },

    // Get diff names (file names only)
    async diffNames(from, to = "HEAD") {
      const diff = await this.diff({ from, to, nameOnly: true });
      return diff.split("\n").filter(line => line.trim());
    },

    // Filter changed paths by glob patterns
    async pathsChanged(globs, from, to = "HEAD") {
      const changedPaths = await this.diffNames(from, to);
      const globArray = toArr(globs);
      
      return changedPaths.filter(path => {
        return globArray.some(glob => minimatch(path, glob));
      });
    },
  };
}