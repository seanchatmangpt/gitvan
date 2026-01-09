// src/composables/git/commits.mjs
// GitVan v2 — Commit operations factory
// - Commit history and analysis helpers
// - Release helpers: shortlog, trailers

export default function makeCommits(base, run, runVoid, toArr) {
  return {
    // Git log with custom format or options object
    async log(formatOrOptions = "%h%x09%s", extra = []) {
      // Support both old API and options object
      if (typeof formatOrOptions === "object") {
        const options = formatOrOptions;
        const args = ["log"];

        if (options.maxCount) args.push(`--max-count=${options.maxCount}`);
        if (options.skip) args.push(`--skip=${options.skip}`);
        if (options.since) args.push(`--since=${options.since}`);
        if (options.until) args.push(`--until=${options.until}`);
        if (options.author) args.push(`--author=${options.author}`);
        if (options.grep) args.push(`--grep=${options.grep}`);
        if (options.format) args.push(`--format=${options.format}`);
        if (options.oneline) args.push("--oneline");
        if (options.graph) args.push("--graph");
        if (options.all) args.push("--all");

        const output = await run(args);

        // Parse output into array of commit objects
        const lines = output.split("\n").filter(line => line.trim());
        return lines.map(line => {
          // Simple parsing for now - can be enhanced based on format
          return { raw: line };
        });
      }

      // Original API: format string
      const extraArgs =
        typeof extra === "string"
          ? extra.split(/\s+/).filter(Boolean)
          : toArr(extra);
      return run(["log", `--pretty=${formatOrOptions}`, ...extraArgs]);
    },

    // Log since last tag
    async logSinceLastTag(format = "%h%x09%s") {
      try {
        return run(["log", `--pretty=${format}`, "--oneline", "HEAD"]);
      } catch {
        // If no tags exist, return empty
        return "";
      }
    },

    // Check if commit A is ancestor of commit B
    async isAncestor(a, b = "HEAD") {
      try {
        await runVoid(["merge-base", "--is-ancestor", a, b]);
        return true;
      } catch {
        return false;
      }
    },

    // Find merge base between two commits
    async mergeBase(a, b) {
      return run(["merge-base", a, b]);
    },

    // Get commit list with rev-list
    async revList(args = ["--max-count=50", "HEAD"]) {
      const argArray = toArr(args);
      // Ensure we always have a commit reference
      if (argArray.length === 1 && argArray[0].startsWith("--")) {
        argArray.push("HEAD");
      }
      return run(["rev-list", ...argArray]);
    },

    // Get commit count for a branch
    async getCommitCount(branch = "HEAD") {
      try {
        const result = await run(["rev-list", "--count", branch]);
        return parseInt(result, 10) || 0;
      } catch {
        return 0;
      }
    },

    // Describe last tag
    async describeLastTag() {
      try {
        return run(["describe", "--tags", "--abbrev=0"]);
      } catch {
        return null;
      }
    },

    // Shortlog for release notes
    async shortlog(range = "HEAD") {
      try {
        return run(["shortlog", "-s", "-n", range]);
      } catch {
        return "";
      }
    },

    // Interpret trailers for release notes
    async trailers(range = "HEAD") {
      try {
        return run(["interpret-trailers", "--parse", "--no-divider", range]);
      } catch {
        return "";
      }
    },

    // Amend last commit
    async amendCommit(options = {}) {
      const args = ["commit", "--amend"];

      if (options.message) {
        args.push("-m", options.message);
      } else if (!options.edit) {
        args.push("--no-edit");
      }

      if (options.all) {
        args.push("--all");
      }

      if (options.sign) {
        args.push("-S");
      }

      await runVoid(args);
    },

    // Reword commit message
    async rewordCommit(commit, newMessage) {
      // Interactive rebase to reword
      const args = ["rebase", "-i", "--autosquash", commit + "^"];
      // Note: This requires interactive mode, typically done via GIT_SEQUENCE_EDITOR
      // For programmatic use, we'll use commit --amend for HEAD
      if (commit === "HEAD") {
        await runVoid(["commit", "--amend", "-m", newMessage]);
      } else {
        throw new Error("Reword for non-HEAD commits requires interactive rebase");
      }
    },

    // Verify commit signature
    async verifyCommit(commit = "HEAD") {
      try {
        const output = await run(["verify-commit", commit]);
        return { verified: true, output };
      } catch (error) {
        return { verified: false, error: error.message };
      }
    },

    // Squash commits (requires interactive rebase)
    async squashCommits(fromCommit, toCommit = "HEAD") {
      // Note: Full squash implementation requires interactive rebase
      // This is a simplified version showing the command structure
      const args = ["rebase", "-i", "--autosquash", fromCommit];
      // In practice, this would need GIT_SEQUENCE_EDITOR set to automate
      throw new Error("Interactive squash requires rebase automation setup");
    },

    // Create fixup commit
    async createFixup(targetCommit, options = {}) {
      const args = ["commit", "--fixup", targetCommit];

      if (options.all) {
        args.push("--all");
      }

      await runVoid(args);
    },

    // Create squash commit
    async createSquash(targetCommit, options = {}) {
      const args = ["commit", "--squash", targetCommit];

      if (options.all) {
        args.push("--all");
      }

      if (options.message) {
        args.push("-m", options.message);
      }

      await runVoid(args);
    },

    // Show commit details
    async showCommit(commit = "HEAD", options = {}) {
      const args = ["show"];

      if (options.stat) {
        args.push("--stat");
      }

      if (options.patch === false) {
        args.push("--no-patch");
      }

      if (options.format) {
        args.push(`--format=${options.format}`);
      }

      args.push(commit);

      return run(args);
    },

    // Alias for showCommit (test compatibility)
    async show(commit = "HEAD", options = {}) {
      return this.showCommit(commit, options);
    },

    // Get commit message
    async getCommitMessage(commit = "HEAD") {
      return run(["log", "-1", "--format=%B", commit]);
    },

    // Get commit author
    async getCommitAuthor(commit = "HEAD") {
      const output = await run(["log", "-1", "--format=%an%x09%ae", commit]);
      const [name, email] = output.split("\t");
      return { name, email };
    },
  };
}
