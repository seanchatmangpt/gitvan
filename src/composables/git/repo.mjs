// src/composables/git/repo.mjs
// GitVan v2 — Repository information factory
// - Read-only repository information helpers
// - Deterministic time handling with context support

import { useGitVan, tryUseGitVan } from "../../core/context.mjs";

export default function makeRepo(base, run, runVoid, toArr) {
  // Get context from unctx - this must be called synchronously
  let ctx;
  try {
    ctx = useGitVan();
  } catch {
    ctx = tryUseGitVan?.() || null;
  }

  return {
    // Repository root directory
    async root() {
      return run(["rev-parse", "--show-toplevel"]);
    },

    // Current HEAD SHA
    async headSha() {
      return run(["rev-parse", "HEAD"]);
    },

    // Current branch or ref
    async currentRef() {
      try {
        return run(["rev-parse", "--abbrev-ref", "HEAD"]);
      } catch (error) {
        // Handle detached HEAD state
        if (error.message.includes("detached HEAD")) {
          return "HEAD";
        }
        throw error;
      }
    },

    // Repository status (porcelain format)
    async status() {
      return run(["status", "--porcelain"]);
    },

    // Check if working directory is clean
    async isClean() {
      const status = await this.status();
      return status.trim() === "";
    },

    // Check if there are uncommitted changes
    async hasUncommittedChanges() {
      const status = await this.status();
      return status.trim() !== "";
    },

    // Current timestamp in ISO format
    nowISO() {
      // Use context-provided time if available, otherwise fall back to env or current time
      if (ctx && typeof ctx.now === "function") {
        return ctx.now();
      }
      const forced = process.env.GITVAN_NOW;
      return forced || new Date().toISOString();
    },

    // Comprehensive repository information
    async info() {
      try {
        const [head, branch, worktree] = await Promise.all([
          this.headSha(),
          this.currentRef(),
          this.root(),
        ]);

        return {
          head,
          branch,
          worktree,
          isClean: await this.isClean(),
          hasUncommittedChanges: await this.hasUncommittedChanges(),
        };
      } catch (error) {
        throw new Error(`Failed to get git info: ${error.message}`);
      }
    },

    // Worktree git directory
    async worktreeGitDir() {
      return run(["rev-parse", "--git-dir"]);
    },
  };
}
