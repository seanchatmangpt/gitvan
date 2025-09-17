// src/composables/git-80-20.mjs
// GitVan v2 — True 80/20 Git Implementation
// Only the essential Git commands that GitVan actually uses

import path from "node:path";
import { useGitVan, tryUseGitVan } from "../core/context.mjs";
import { runGit, runGitVoid, toArr } from "./git-core.mjs";

export function useGit8020() {
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

    // ========== ESSENTIAL GITVAN OPERATIONS (80/20) ==========

    // 1. Repository Information (Core GitVan needs)
    async branch() {
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
      if (ctx && typeof ctx.now === "function") {
        return ctx.now();
      }
      const forced = process.env.GITVAN_NOW;
      return forced || new Date().toISOString();
    },

    // 2. Worktree Management (Critical for GitVan daemon)
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
        const branch = await this.branch();
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

    // 3. Status and Change Detection (Essential for event detection)
    async statusPorcelain() {
      return runGit(["status", "--porcelain"], base);
    },
    async isClean() {
      const status = await this.statusPorcelain();
      return status.trim() === "";
    },
    async hasUncommittedChanges() {
      const status = await this.statusPorcelain();
      return status.trim() !== "";
    },

    // 4. Commit History (Essential for GitVan event processing)
    async log(format = "%h%x09%s", extra = []) {
      const extraArgs =
        typeof extra === "string"
          ? extra.split(/\s+/).filter(Boolean)
          : toArr(extra);
      return runGit(["log", `--pretty=${format}`, ...extraArgs], base);
    },
    async revList(args = ["--max-count=50", "HEAD"]) {
      const argArray = toArr(args);
      if (argArray.length === 1 && argArray[0].startsWith("--")) {
        argArray.push("HEAD");
      }
      return runGit(["rev-list", ...argArray], base);
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

    // 5. Basic Write Operations (Essential for GitVan operations)
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

    // 6. Git Notes System (Critical for GitVan receipts and metadata)
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

    // 7. Atomic Ref Operations (Critical for GitVan locks)
    async updateRefCreate(ref, valueSha) {
      try {
        await runGitVoid(["show-ref", "--verify", "--quiet", ref], base);
        return false; // Ref exists
      } catch {
        try {
          await runGitVoid(["update-ref", ref, valueSha], base);
          return true; // Created successfully
        } catch (error) {
          try {
            await runGitVoid(["show-ref", "--verify", "--quiet", ref], base);
            return false; // Someone else created it
          } catch {
            throw error; // Real error
          }
        }
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

    // 8. Essential Plumbing (For GitVan pack operations)
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
        if (error.message.includes("Not a valid object name")) {
          throw new Error(`Object ${sha} not found`);
        }
        throw error;
      }
    },

    // ========== MINIMAL ADDITIONAL OPERATIONS (Only if needed) ==========

    // 9. Basic Branch Operations (Only for worktree management)
    async branchList() {
      const output = await runGit(["branch"], base);
      return output
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => line.replace(/^\*?\s*/, "").trim());
    },
    async branchCreate(name, startPoint = "HEAD") {
      const args = ["branch", name];
      if (startPoint !== "HEAD") args.push(startPoint);
      await runGitVoid(args, base);
    },

    // 10. Basic Checkout (Only for worktree switching)
    async checkout(ref) {
      await runGitVoid(["checkout", ref], base);
    },

    // ========== UTILITY METHODS ==========
    async getCurrentBranch() {
      try {
        return await this.branch();
      } catch (error) {
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

    // ========== ESCAPE HATCH ==========
    async run(args) {
      return runGit(toArr(args), base);
    },
    async runVoid(args) {
      await runGitVoid(toArr(args), base);
    },
  };
}
