// src/composables/git/branches.mjs
// GitVan v2 — Branch operations factory
// - Branch listing, creation, deletion
// - Checkout and switch operations

/**
 * Create Git branch operations
 * @param {Object} base - Base configuration {cwd, env}
 * @param {Function} run - Execute git command with output
 * @param {Function} runVoid - Execute git command without output
 * @param {Function} toArr - Convert to array helper
 * @returns {Object} Branch operations interface
 */
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

    // Rename a branch
    async branchRename(oldName, newName, options = {}) {
      const args = ["branch"];

      if (options.force) {
        args.push("-M");
      } else {
        args.push("-m");
      }

      args.push(oldName);
      args.push(newName);

      await runVoid(args);
    },

    // Set upstream for a branch
    async setUpstream(branch, upstream, options = {}) {
      const args = ["branch"];

      if (options.unset) {
        args.push("--unset-upstream");
        args.push(branch);
      } else {
        args.push("--set-upstream-to", upstream);
        args.push(branch);
      }

      await runVoid(args);
    },

    // Get upstream branch for a branch
    async getUpstream(branch = "HEAD") {
      try {
        return await run(["rev-parse", "--abbrev-ref", `${branch}@{upstream}`]);
      } catch {
        return null;
      }
    },

    // Get tracking status for branches
    async getTrackingStatus(branch) {
      try {
        const upstream = await this.getUpstream(branch);
        if (!upstream) {
          return { tracking: false };
        }

        // Get ahead/behind counts
        const output = await run([
          "rev-list",
          "--left-right",
          "--count",
          `${branch}...${upstream}`,
        ]);

        const [ahead, behind] = output.split("\t").map((n) => parseInt(n, 10));

        return {
          tracking: true,
          upstream,
          ahead,
          behind,
          inSync: ahead === 0 && behind === 0,
        };
      } catch {
        return { tracking: false };
      }
    },

    // Get all branches with tracking info
    async branchesWithTracking() {
      const output = await run([
        "branch",
        "-vv",
        "--format=%(refname:short)%09%(upstream:short)%09%(upstream:track)",
      ]);

      return output
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
          const [name, upstream, track] = line.split("\t");

          // Parse track info like "[ahead 2, behind 3]"
          let ahead = 0;
          let behind = 0;
          if (track) {
            const aheadMatch = track.match(/ahead (\d+)/);
            const behindMatch = track.match(/behind (\d+)/);
            if (aheadMatch) ahead = parseInt(aheadMatch[1], 10);
            if (behindMatch) behind = parseInt(behindMatch[1], 10);
          }

          return {
            name,
            upstream: upstream || null,
            ahead,
            behind,
            inSync: ahead === 0 && behind === 0,
          };
        });
    },

    // Check if branch exists
    async branchExists(name) {
      try {
        await runVoid(["show-ref", "--verify", "--quiet", `refs/heads/${name}`]);
        return true;
      } catch {
        return false;
      }
    },

    // Get current branch
    async currentBranch() {
      try {
        return await run(["rev-parse", "--abbrev-ref", "HEAD"]);
      } catch {
        return null;
      }
    },

    // Copy a branch
    async branchCopy(source, destination, options = {}) {
      const args = ["branch"];

      if (options.force) {
        args.push("-C");
      } else {
        args.push("-c");
      }

      args.push(source);
      args.push(destination);

      await runVoid(args);
    },
  };
}
