// src/composables/git/commits.mjs
// GitVan v2 — Commit operations factory
// - Commit history and analysis helpers
// - Release helpers: shortlog, trailers

export default function makeCommits(base, run, runVoid, toArr) {
  return {
    // Git log with custom format
    async log(format = "%h%x09%s", extra = []) {
      const extraArgs =
        typeof extra === "string"
          ? extra.split(/\s+/).filter(Boolean)
          : toArr(extra);
      return run(["log", `--pretty=${format}`, ...extraArgs]);
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
  };
}
