// src/composables/git/remotes.mjs
// GitVan v2 — Remote operations factory
// - Fetch, push, pull operations
// - Default remote detection

export default function makeRemotes(base, run, runVoid, toArr) {
  return {
    // Fetch from remote
    async fetch(remote = "origin", refspec = "", options = {}) {
      const args = ["fetch"];

      if (options.prune) args.push("--prune");
      if (options.tags) args.push("--tags");
      if (options.all) args.push("--all");
      if (options.depth) args.push(`--depth=${options.depth}`);

      if (remote) args.push(remote);
      if (refspec) args.push(refspec);

      await runVoid(args);
    },

    // Push to remote
    async push(remote = "origin", ref = "HEAD", options = {}) {
      const args = ["push"];

      if (options.force) args.push("--force");
      if (options.setUpstream) args.push("--set-upstream");
      if (options.tags) args.push("--tags");
      if (options.delete) args.push("--delete");
      if (options.dryRun) args.push("--dry-run");

      if (remote) args.push(remote);
      if (ref) args.push(ref);

      await runVoid(args);
    },

    // Pull from remote
    async pull(remote = "origin", branch = "", options = {}) {
      const args = ["pull"];

      if (options.rebase) args.push("--rebase");
      if (options.ff) args.push("--ff-only");
      if (options.noff) args.push("--no-ff");
      if (options.squash) args.push("--squash");

      if (remote) args.push(remote);
      if (branch) args.push(branch);

      await runVoid(args);
    },

    // Get default remote
    async defaultRemote() {
      try {
        const output = await run(["remote", "show", "origin"]);
        if (output.includes("origin")) {
          return "origin";
        }
      } catch {
        // Fallback to first remote
        try {
          const output = await run(["remote"]);
          const remotes = output.split("\n").filter(line => line.trim());
          return remotes[0] || "origin";
        } catch {
          return "origin";
        }
      }
    },
  };
}
