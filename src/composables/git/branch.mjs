// src/composables/git/branch.mjs
// GitVan v2 — Git Branch Operations
// Modular branch commands to prevent bloat in main useGit()

import { runGit, runGitVoid } from "../git-core.mjs";

export function createBranchCommands(base) {
  return {
    // ---------- Branch operations ----------
    async branchList(options = {}) {
      const args = ["branch"];

      if (options.all) args.push("-a");
      if (options.remote) args.push("-r");
      if (options.merged) args.push("--merged");
      if (options.noMerged) args.push("--no-merged");
      if (options.verbose) args.push("-v");

      const output = await runGit(args, base);
      return output
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => line.replace(/^\*?\s*/, "").trim());
    },

    async branchCreate(name, startPoint = "HEAD", options = {}) {
      const args = ["branch"];

      if (options.force) args.push("-f");
      if (options.track) args.push("--track");
      if (options.noTrack) args.push("--no-track");

      args.push(name);
      if (startPoint !== "HEAD") args.push(startPoint);

      await runGitVoid(args, base);
    },

    async branchDelete(name, options = {}) {
      const args = ["branch"];

      if (options.force) args.push("-D");
      else args.push("-d");

      args.push(name);
      await runGitVoid(args, base);
    },

    async branchRename(oldName, newName) {
      await runGitVoid(["branch", "-m", oldName, newName], base);
    },

    async branchExists(name) {
      try {
        await runGit(["show-ref", "--verify", `refs/heads/${name}`], base);
        return true;
      } catch {
        return false;
      }
    },
  };
}
