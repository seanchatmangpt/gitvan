// src/composables/git/diff.mjs
// GitVan v2 — Diff operations factory
// - File diff and change detection helpers
// - Changed paths filtering with glob support

import { minimatch } from "minimatch";

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

    // Generate a patch
    async generatePatch(options = {}) {
      const args = ["diff"];

      if (options.cached || options.staged) {
        args.push("--cached");
      }

      if (options.from && options.to) {
        args.push(`${options.from}..${options.to}`);
      } else if (options.from) {
        args.push(options.from);
      }

      if (options.files && options.files.length > 0) {
        args.push("--", ...toArr(options.files));
      }

      return run(args);
    },

    // Apply a patch
    async applyPatch(patchContent, options = {}) {
      const { writeFile, unlink } = await import("node:fs/promises");
      const { join } = await import("node:path");
      const { tmpdir } = await import("node:os");

      // Write patch to temporary file
      const patchFile = join(tmpdir(), `gitvan-patch-${Date.now()}.patch`);
      await writeFile(patchFile, patchContent, "utf8");

      try {
        const args = ["apply"];

        if (options.check) {
          args.push("--check");
        }

        if (options.reverse) {
          args.push("--reverse");
        }

        if (options.index) {
          args.push("--index");
        }

        if (options.cached) {
          args.push("--cached");
        }

        if (options.reject) {
          args.push("--reject");
        }

        if (options.whitespace) {
          args.push(`--whitespace=${options.whitespace}`);
        }

        args.push(patchFile);

        await runVoid(args);
      } finally {
        // Clean up temporary file
        try {
          await unlink(patchFile);
        } catch {
          // Ignore cleanup errors
        }
      }
    },

    // Apply a patch from file
    async applyPatchFile(patchFilePath, options = {}) {
      const args = ["apply"];

      if (options.check) {
        args.push("--check");
      }

      if (options.reverse) {
        args.push("--reverse");
      }

      if (options.index) {
        args.push("--index");
      }

      if (options.cached) {
        args.push("--cached");
      }

      if (options.reject) {
        args.push("--reject");
      }

      if (options.whitespace) {
        args.push(`--whitespace=${options.whitespace}`);
      }

      args.push(patchFilePath);

      await runVoid(args);
    },

    // Create patch for specific commits
    async formatPatch(options = {}) {
      const args = ["format-patch"];

      if (options.outputDir) {
        args.push("-o", options.outputDir);
      }

      if (options.stdout) {
        args.push("--stdout");
      }

      if (options.count) {
        args.push(`-${options.count}`);
      }

      if (options.from && options.to) {
        args.push(`${options.from}..${options.to}`);
      } else if (options.from) {
        args.push(options.from);
      } else {
        args.push("HEAD");
      }

      return run(args);
    },

    // Check if patch can be applied
    async canApplyPatch(patchContent) {
      try {
        await this.applyPatch(patchContent, { check: true });
        return true;
      } catch {
        return false;
      }
    },

    // Get diff statistics
    async diffStats(from, to = "HEAD") {
      const output = await this.diff({ from, to, stat: true });

      // Parse stat output
      const lines = output.split("\n");
      const stats = {
        files: [],
        totalInsertions: 0,
        totalDeletions: 0,
        totalFiles: 0,
      };

      for (const line of lines) {
        // Format: " file.js | 10 +++++++---"
        const match = line.match(/^\s*(.+?)\s*\|\s*(\d+)\s*([+-]+)?$/);
        if (match) {
          const [, file, changes, symbols] = match;
          const insertions = (symbols?.match(/\+/g) || []).length;
          const deletions = (symbols?.match(/-/g) || []).length;

          stats.files.push({
            file: file.trim(),
            changes: parseInt(changes, 10),
            insertions,
            deletions,
          });

          stats.totalInsertions += insertions;
          stats.totalDeletions += deletions;
          stats.totalFiles++;
        }
      }

      return stats;
    },

    // Get diff with context lines
    async diffWithContext(from, to = "HEAD", contextLines = 3) {
      const args = ["diff", `-U${contextLines}`];

      if (from && to) {
        args.push(`${from}..${to}`);
      } else if (from) {
        args.push(from);
      }

      return run(args);
    },
  };
}