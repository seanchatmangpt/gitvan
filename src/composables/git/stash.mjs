// src/composables/git/stash.mjs
// GitVan v2 — Git Stash Operations
// Modular stash commands to prevent bloat in main useGit()

import { runGit, runGitVoid } from "../git-core.mjs";

export function createStashCommands(base) {
  return {
    // ---------- Stash operations ----------
    async stashSave(message = "", options = {}) {
      const args = ["stash"];

      if (options.push) args.push("push");
      else args.push("save");

      if (message) args.push("-m", message);
      if (options.includeUntracked) args.push("-u");
      if (options.keepIndex) args.push("--keep-index");

      await runGitVoid(args, base);
    },

    async stashList() {
      const output = await runGit(["stash", "list"], base);
      return output.split("\n").filter((line) => line.trim());
    },

    async stashApply(stash = "stash@{0}", options = {}) {
      const args = ["stash"];

      if (options.pop) args.push("pop");
      else args.push("apply");

      if (stash) args.push(stash);

      await runGitVoid(args, base);
    },

    async stashDrop(stash = "stash@{0}") {
      await runGitVoid(["stash", "drop", stash], base);
    },

    async stashShow(stash = "stash@{0}", options = {}) {
      const args = ["stash", "show"];

      if (options.stat) args.push("--stat");
      if (options.patch) args.push("-p");

      if (stash) args.push(stash);

      return runGit(args, base);
    },

    async stashClear() {
      await runGitVoid(["stash", "clear"], base);
    },
  };
}
