// src/composables/git/stash.mjs
// GitVan v2 — Stash operations factory
// - Stash push, list, apply, drop operations
// - Uses modern `stash push` command

export default function makeStash(base, run, runVoid, toArr) {
  return {
    // Push to stash (modern command)
    async stashPush(message = "", options = {}) {
      const args = ["stash", "push"];

      if (message) args.push("-m", message);
      if (options.includeUntracked) args.push("-u");
      if (options.keepIndex) args.push("--keep-index");

      await runVoid(args);
    },

    // List stashes
    async stashList() {
      const output = await run(["stash", "list"]);
      return output.split("\n").filter((line) => line.trim());
    },

    // Apply stash
    async stashApply(stash = "stash@{0}", options = {}) {
      const args = ["stash"];

      if (options.pop) args.push("pop");
      else args.push("apply");

      if (stash) args.push(stash);

      await runVoid(args);
    },

    // Drop stash
    async stashDrop(stash = "stash@{0}") {
      await runVoid(["stash", "drop", stash]);
    },
  };
}