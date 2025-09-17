// src/composables/git-modular.mjs
// GitVan v2 — Modular useGit()
// - POSIX-first. No external deps. ESM.
// - Deterministic env: TZ=UTC, LANG=C.
// - UnJS context-aware (unctx). Captures context once to avoid loss after await.
// - Happy path only. No retries. No shell string interpolation.
// - Modular commands to prevent bloat.

import path from "node:path";
import { useGitVan, tryUseGitVan } from "../core/context.mjs";
import { runGit, runGitVoid, toArr } from "./git-core.mjs";

// Import modular command sets
import { createDiffCommands } from "./git/diff.mjs";
import { createRemoteCommands } from "./git/remote.mjs";
import { createBranchCommands } from "./git/branch.mjs";
import { createCheckoutCommands } from "./git/checkout.mjs";
import { createMergeCommands } from "./git/merge.mjs";
import { createStashCommands } from "./git/stash.mjs";
import { createResetCommands } from "./git/reset.mjs";

export function useGitModular() {
  // Get context from unctx - this must be called synchronously
  let ctx;
  try {
    ctx = useGitVan();
  } catch {
    ctx = tryUseGitVan?.() || null;
  }

  // Resolve working directory
  const cwd = (ctx && ctx.cwd) || process.cwd();

  // Set up deterministic environment with UTC timezone and C locale
  // Context env should not override TZ and LANG for determinism
  const env = {
    ...process.env,
    ...(ctx && ctx.env ? ctx.env : {}),
    TZ: "UTC", // Always override to UTC for determinism
    LANG: "C", // Always override to C locale for determinism
  };

  const base = { cwd, env };

  return {
    // Context properties (exposed for testing)
    cwd: base.cwd,
    env: base.env,

    // ---------- Core repo info (always included) ----------
    async getCurrentBranch() {
      return runGit(["rev-parse", "--abbrev-ref", "HEAD"], base);
    },
    async head() {
      return runGit(["rev-parse", "HEAD"], base);
    },
    async repoRoot() {
      return runGit(["rev-parse", "--show-toplevel"], base);
    },
    async worktreeGitDir() {
      return runGit(["rev-parse", "--git-dir"], base);
    },
    nowISO() {
      // Use context-provided time if available, otherwise fall back to env or current time
      if (ctx && typeof ctx.now === "function") {
        return ctx.now();
      }
      const forced = process.env.GITVAN_NOW;
      return forced || new Date().toISOString();
    },

    // ---------- Core read-only helpers (always included) ----------
    async log(format = "%h%x09%s", extra = []) {
      const extraArgs =
        typeof extra === "string"
          ? extra.split(/\s+/).filter(Boolean)
          : toArr(extra);
      return runGit(["log", `--pretty=${format}`, ...extraArgs], base);
    },
    async statusPorcelain() {
      return runGit(["status", "--porcelain"], base);
    },
    async isAncestor(a, b = "HEAD") {
      try {
        await runGitVoid(["merge-base", "--is-ancestor", a, b], base);
        return true;
      } catch {
        return false;
      }
    },
    async mergeBase(a, b) {
      return runGit(["merge-base", a, b], base);
    },
    async revList(args = ["--max-count=50", "HEAD"]) {
      const argArray = toArr(args);
      // Ensure we always have a commit reference
      if (argArray.length === 1 && argArray[0].startsWith("--")) {
        argArray.push("HEAD");
      }
      return runGit(["rev-list", ...argArray], base);
    },

    // ---------- Core write helpers (always included) ----------
    async add(paths) {
      const list = toArr(paths).filter(Boolean);
      if (list.length === 0) return;
      await runGitVoid(["add", "--", ...list], base);
    },
    async commit(message, opts = {}) {
      const args = ["commit", "-m", message];
      if (opts.sign) args.push("-S");
      await runGitVoid(args, base);
    },
    async tag(name, msg, opts = {}) {
      const args = ["tag"];
      if (opts.sign) args.push("-s");
      if (msg) args.push("-m", msg);
      args.push(name);
      await runGitVoid(args, base);
    },

    // ---------- Core notes (receipts) - always included ----------
    async noteAdd(ref, message, sha = "HEAD") {
      await runGitVoid(
        ["notes", `--ref=${ref}`, "add", "-f", "-m", message, sha],
        base
      );
    },
    async noteAppend(ref, message, sha = "HEAD") {
      await runGitVoid(
        ["notes", `--ref=${ref}`, "append", "-m", message, sha],
        base
      );
    },
    async noteShow(ref, sha = "HEAD") {
      return runGit(["notes", `--ref=${ref}`, "show", sha], base);
    },

    // ---------- Core atomic ref create (locks) - always included ----------
    async updateRefCreate(ref, valueSha) {
      // Check if ref exists first
      try {
        await runGitVoid(["show-ref", "--verify", "--quiet", ref], base);
        // Ref exists, return false to indicate failure
        return false;
      } catch {
        // Ref doesn't exist, try to create it
        try {
          await runGitVoid(["update-ref", ref, valueSha], base);
          return true;
        } catch (error) {
          // If creation failed due to race condition, check if it exists now
          try {
            await runGitVoid(["show-ref", "--verify", "--quiet", ref], base);
            return false; // Someone else created it
          } catch {
            throw error; // Real error, re-throw
          }
        }
      }
    },

    // ---------- Core plumbing - always included ----------
    async hashObject(filePath, { write = false } = {}) {
      const abs = path.isAbsolute(filePath)
        ? filePath
        : path.join(base.cwd, filePath);
      const args = ["hash-object"];
      if (write) args.push("-w");
      args.push("--", abs);
      return runGit(args, base);
    },
    async writeTree() {
      return runGit(["write-tree"], base);
    },
    async catFilePretty(sha) {
      try {
        return runGit(["cat-file", "-p", sha], base);
      } catch (error) {
        // Handle common error cases gracefully
        if (error.message.includes("Not a valid object name")) {
          throw new Error(`Object ${sha} not found`);
        }
        throw error;
      }
    },

    // ---------- Modular command sets (loaded on demand) ----------
    get diff() {
      if (!this._diffCommands) {
        this._diffCommands = createDiffCommands(base);
      }
      return this._diffCommands;
    },

    get remote() {
      if (!this._remoteCommands) {
        this._remoteCommands = createRemoteCommands(base);
      }
      return this._remoteCommands;
    },

    get branchCommands() {
      if (!this._branchCommands) {
        this._branchCommands = createBranchCommands(base);
      }
      return this._branchCommands;
    },

    get checkout() {
      if (!this._checkoutCommands) {
        this._checkoutCommands = createCheckoutCommands(base);
      }
      return this._checkoutCommands;
    },

    get merge() {
      if (!this._mergeCommands) {
        this._mergeCommands = createMergeCommands(base);
      }
      return this._mergeCommands;
    },

    get stash() {
      if (!this._stashCommands) {
        this._stashCommands = createStashCommands(base);
      }
      return this._stashCommands;
    },

    get reset() {
      if (!this._resetCommands) {
        this._resetCommands = createResetCommands(base);
      }
      return this._resetCommands;
    },

    // ---------- Utility methods (always included) ----------
    async isClean() {
      const status = await this.statusPorcelain();
      return status.trim() === "";
    },
    async hasUncommittedChanges() {
      const status = await this.statusPorcelain();
      return status.trim() !== "";
    },
    async branch() {
      try {
        return await this.getCurrentBranch();
      } catch (error) {
        // Handle detached HEAD state
        if (error.message.includes("detached HEAD")) {
          return "HEAD";
        }
        throw error;
      }
    },
    async getCommitCount(branch = "HEAD") {
      try {
        const result = await runGit(["rev-list", "--count", branch], base);
        return parseInt(result, 10) || 0;
      } catch {
        return 0;
      }
    },

    // ---------- Info methods (always included) ----------
    async info() {
      try {
        const [head, branch, worktree] = await Promise.all([
          this.head(),
          this.getCurrentBranch(),
          this.repoRoot(),
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

    // ---------- Ref methods (always included) ----------
    async listRefs(pattern = "") {
      try {
        const args = ["for-each-ref", "--format=%(refname)"];
        if (pattern) {
          args.push(pattern);
        }
        const output = await runGit(args, base);
        return output.split("\n").filter((line) => line.trim());
      } catch (error) {
        return [];
      }
    },

    async getRef(ref) {
      try {
        const output = await runGit(["show-ref", "--verify", ref], base);
        return output.trim();
      } catch (error) {
        return null;
      }
    },

    // ---------- Worktree methods (always included) ----------
    async listWorktrees() {
      try {
        const output = await runGit(["worktree", "list", "--porcelain"], base);
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
        const mainPath = await this.repoRoot();
        return worktrees.map((wt) => ({
          ...wt,
          isMain: wt.path === mainPath,
        }));
      } catch {
        // Fallback to single worktree
        const worktree = await this.repoRoot();
        const head = await this.head();
        const branch = await this.getCurrentBranch();
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

    // ---------- Generic runner (escape hatch) ----------
    async run(args) {
      return runGit(toArr(args), base);
    },
    async runVoid(args) {
      await runGitVoid(toArr(args), base);
    },
  };
}
