// src/composables/git/worktrees.mjs
// GitVan v2 — Worktree operations factory
// - Worktree listing, creation, removal
// - Worktree pruning

export default function makeWorktrees(base, run, runVoid, toArr) {
  return {
    // List worktrees
    async listWorktrees() {
      try {
        const output = await run(["worktree", "list", "--porcelain"]);
        const worktrees = [];
        let current = {};

        for (const line of output.split("\n")) {
          if (line.startsWith("worktree ")) {
            if (current.path) worktrees.push(current);
            current = { path: line.substring(9) };
          } else if (line.startsWith("HEAD ")) {
            current.head = line.substring(5);
          } else if (line.startsWith("branch ")) {
            current.branch = line.substring(7).replace("refs/heads/", "");
          } else if (line.startsWith("detached")) {
            current.detached = true;
          }
        }

        if (current.path) worktrees.push(current);

        // Mark main worktree
        const mainPath = await run(["rev-parse", "--show-toplevel"]);
        return worktrees.map((wt) => ({
          ...wt,
          isMain: wt.path === mainPath,
        }));
      } catch {
        // Fallback to single worktree
        const worktree = await run(["rev-parse", "--show-toplevel"]);
        const head = await run(["rev-parse", "HEAD"]);
        const branch = await run(["rev-parse", "--abbrev-ref", "HEAD"]);
        return [
          {
            path: worktree,
            head: head,
            branch: branch,
            isMain: true,
          },
        ];
      }
    },

    // Add a worktree
    async worktreeAdd(path, branch, options = {}) {
      const args = ["worktree", "add"];

      if (options.force) args.push("--force");
      if (options.detach) args.push("--detach");
      if (options.checkout) args.push("--checkout");
      if (options.noCheckout) args.push("--no-checkout");

      args.push(path);
      if (branch) args.push(branch);

      await runVoid(args);
    },

    // Remove a worktree
    async worktreeRemove(path, options = {}) {
      const args = ["worktree", "remove"];

      if (options.force) args.push("--force");

      args.push(path);

      await runVoid(args);
    },

    // Prune worktrees
    async worktreePrune(options = {}) {
      const args = ["worktree", "prune"];

      if (options.dryRun) args.push("--dry-run");
      if (options.verbose) args.push("--verbose");

      await runVoid(args);
    },
  };
}
