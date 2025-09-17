// src/composables/git/branches.mjs
// GitVan v2 — Branch operations factory
// - Branch listing, creation, deletion
// - Checkout and switch operations

export default function makeBranches(base, run, runVoid, toArr) {
  return {
    // List branches
    async branchList(options = {}) {
      const args = ["branch"];

      if (options.all) args.push("-a");
      if (options.remote) args.push("-r");
      if (options.merged) args.push("--merged");
      if (options.noMerged) args.push("--no-merged");
      if (options.verbose) args.push("-v");

      const output = await run(args);
      return output
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => line.replace(/^\*?\s*/, "").trim());
    },

    // Create a new branch
    async branchCreate(name, startPoint = "HEAD", options = {}) {
      const args = ["branch"];

      if (options.force) args.push("-f");
      if (options.track) args.push("--track");
      if (options.noTrack) args.push("--no-track");

      args.push(name);
      if (startPoint !== "HEAD") args.push(startPoint);

      await runVoid(args);
    },

    // Delete a branch
    async branchDelete(name, options = {}) {
      const args = ["branch"];

      if (options.force) args.push("-D");
      else args.push("-d");

      args.push(name);
      await runVoid(args);
    },

    // Checkout to a ref or branch
    async checkout(ref, options = {}) {
      const args = ["checkout"];

      if (options.force) args.push("-f");
      if (options.create) args.push("-b");
      if (options.track) args.push("--track");
      if (options.detach) args.push("--detach");

      if (ref) args.push(ref);

      await runVoid(args);
    },

    // Switch to a branch
    async switch(branch, options = {}) {
      const args = ["switch"];

      if (options.create) args.push("-c");
      if (options.force) args.push("-f");
      if (options.detach) args.push("--detach");
      if (options.track) args.push("--track");
      if (options.noTrack) args.push("--no-track");

      if (branch) args.push(branch);

      await runVoid(args);
    },
  };
}
