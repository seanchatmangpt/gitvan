// src/composables/git/remote.mjs
// GitVan v2 — Git Remote Operations
// Modular remote commands to prevent bloat in main useGit()

import { runGit, runGitVoid } from "../git-core.mjs";

export function createRemoteCommands(base) {
  return {
    // ---------- Remote operations ----------
    async fetch(remote = "origin", refspec = "", options = {}) {
      const args = ["fetch"];

      if (options.prune) args.push("--prune");
      if (options.tags) args.push("--tags");
      if (options.all) args.push("--all");
      if (options.depth) args.push(`--depth=${options.depth}`);

      if (remote) args.push(remote);
      if (refspec) args.push(refspec);

      await runGitVoid(args, base);
    },

    async push(remote = "origin", ref = "HEAD", options = {}) {
      const args = ["push"];

      if (options.force) args.push("--force");
      if (options.setUpstream) args.push("--set-upstream");
      if (options.tags) args.push("--tags");
      if (options.delete) args.push("--delete");
      if (options.dryRun) args.push("--dry-run");

      if (remote) args.push(remote);
      if (ref) args.push(ref);

      await runGitVoid(args, base);
    },

    async pull(remote = "origin", branch = "", options = {}) {
      const args = ["pull"];

      if (options.rebase) args.push("--rebase");
      if (options.ff) args.push("--ff-only");
      if (options.noff) args.push("--no-ff");
      if (options.squash) args.push("--squash");

      if (remote) args.push(remote);
      if (branch) args.push(branch);

      await runGitVoid(args, base);
    },

    async remoteList() {
      const output = await runGit(["remote", "-v"], base);
      return output
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
          const [name, url] = line.split(/\s+/);
          return { name, url };
        });
    },

    async remoteAdd(name, url) {
      await runGitVoid(["remote", "add", name, url], base);
    },

    async remoteRemove(name) {
      await runGitVoid(["remote", "remove", name], base);
    },
  };
}
