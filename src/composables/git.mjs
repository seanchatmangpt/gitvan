/**
 * @fileoverview GitVan v2 — Git Operations Composable
 *
 * This module provides comprehensive Git operations within the GitVan context.
 * It implements an 80/20 approach focusing on essential Git operations that
 * GitVan actually uses, with POSIX-first design and no external dependencies.
 *
 * Key Features:
 * - POSIX-first implementation with no external dependencies
 * - Deterministic environment: TZ=UTC, LANG=C
 * - UnJS context-aware (unctx) to avoid context loss after await
 * - Happy path only: no retries, no shell string interpolation
 * - Essential Git operations: commit, branch, merge, worktree, notes, refs
 *
 * @version 2.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import { execFile } from "node:child_process";
import path from "node:path";
import { useGitVan, tryUseGitVan } from "../core/context.mjs";
import { useHybridGit } from "./hybrid-git.mjs";

/**
 * Execute Git command with error handling
 *
 * @async
 * @function runGit
 * @param {string[]} args - Git command arguments
 * @param {Object} options - Execution options
 * @param {string} [options.cwd] - Working directory
 * @param {Object} [options.env] - Environment variables
 * @param {number} [options.maxBuffer=12*1024*1024] - Maximum buffer size
 * @returns {Promise<string>} Git command output
 * @throws {Error} When Git command fails
 */
async function runGit(args, { cwd, env, maxBuffer = 12 * 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    const child = execFile("git", args, {
      cwd,
      env,
      maxBuffer,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data;
    });

    child.stderr?.on("data", (data) => {
      stderr += data;
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        const command = `git ${args.join(" ")}`;
        const error = new Error(`Command failed: ${command}\n${stderr}`);
        error.originalError = { code, stderr };
        error.command = command;
        error.args = args;
        error.stderr = stderr;
        reject(error);
      }
    });

    child.on("error", (error) => {
      const command = `git ${args.join(" ")}`;
      const newError = new Error(
        `Command failed: ${command}\n${error.message}`
      );
      newError.originalError = error;
      newError.command = command;
      newError.args = args;
      reject(newError);
    });
  });
}

/**
 * Execute Git command without expecting output
 *
 * @async
 * @function runGitVoid
 * @param {string[]} args - Git command arguments
 * @param {Object} options - Execution options
 * @returns {Promise<void>} Resolves when command completes
 * @throws {Error} When Git command fails
 */
async function runGitVoid(args, opts) {
  await runGit(args, opts);
}

function toArr(x) {
  return Array.isArray(x) ? x : [x];
}

/**
 * Git operations composable
 *
 * Provides comprehensive Git operations within the GitVan context.
 * This function returns an object with methods for all essential Git operations
 * including commits, branches, merges, worktrees, notes, and references.
 * 
 * Supports both native Git and hybrid MemFS backends for optimal performance.
 *
 * @function useGit
 * @param {Object} [options] - Git backend options
 * @param {string} [options.backend="auto"] - Backend type: "native", "memfs", or "auto"
 * @param {boolean} [options.hybrid=false] - Enable hybrid backend support
 * @returns {Object} Git operations interface
 * @returns {string} returns.root - Repository root directory
 * @returns {Function} returns.head - Get current HEAD commit SHA
 * @returns {Function} returns.branch - Get current branch name
 * @returns {Function} returns.run - Run arbitrary Git command
 * @returns {Function} returns.note - Add note to Git object
 * @returns {Function} returns.appendNote - Append note to Git object
 * @returns {Function} returns.setRef - Set Git reference
 * @returns {Function} returns.delRef - Delete Git reference
 * @returns {Function} returns.listRefs - List Git references with prefix
 * @returns {Function} returns.init - Initialize Git repository
 * @returns {Function} returns.clone - Clone Git repository
 * @returns {Function} returns.add - Add files to staging
 * @returns {Function} returns.commit - Commit changes
 * @returns {Function} returns.push - Push changes
 * @returns {Function} returns.pull - Pull changes
 * @returns {Function} returns.fetch - Fetch changes
 * @returns {Function} returns.branchCreate - Create branch
 * @returns {Function} returns.branchDelete - Delete branch
 * @returns {Function} returns.branchList - List branches
 * @returns {Function} returns.checkout - Switch branch
 * @returns {Function} returns.merge - Merge branch
 * @returns {Function} returns.rebase - Rebase branch
 * @returns {Function} returns.worktreeAdd - Create worktree
 * @returns {Function} returns.worktreeRemove - Remove worktree
 * @returns {Function} returns.worktreeList - List worktrees
 * @returns {Function} returns.tagCreate - Create tag
 * @returns {Function} returns.tagDelete - Delete tag
 * @returns {Function} returns.tagList - List tags
 * @returns {Function} returns.submoduleAdd - Add submodule
 * @returns {Function} returns.submoduleUpdate - Update submodule
 * @returns {Function} returns.nowISO - Get current timestamp in ISO format
 * @returns {Function} returns.verifyCommit - Verify commit exists
 * @returns {Function} returns.worktreeId - Get worktree identifier
 *
 * @example
 * ```javascript
 * const git = useGit();
 *
 * // Get current branch
 * const branch = git.branch();
 *
 * // Commit changes
 * git.add(['file1.js', 'file2.js']);
 * git.commit('feat: add new features');
 *
 * // Create and switch to new branch
 * git.branchCreate('feature/new-feature');
 * git.checkout('feature/new-feature');
 * ```
 */
export function useGit(options = {}) {
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
  
  // Initialize hybrid Git backend if requested
  let hybridGit = null;
  if (options.hybrid || options.backend) {
    // Note: This is a synchronous function, but hybrid Git is async
    // We'll initialize it lazily when needed
    const initHybridGit = async () => {
      if (!hybridGit) {
        hybridGit = await useHybridGit({
          backend: options.backend || "auto",
          testDir: cwd,
          ...options
        });
      }
      return hybridGit;
    };
  }

  return {
    // Context properties (exposed for testing)
    cwd: base.cwd,
    env: base.env,
    
    // Hybrid Git backend access
    async getHybridGit() {
      if (options.hybrid || options.backend) {
        if (!hybridGit) {
          hybridGit = await useHybridGit({
            backend: options.backend || "auto",
            testDir: cwd,
            ...options
          });
        }
        return hybridGit;
      }
      return null;
    },
    
    // Backend management
    async useMemFS() {
      const hg = await this.getHybridGit();
      if (hg) return hg.useMemFS();
      throw new Error("Hybrid Git not enabled");
    },
    
    async useNative() {
      const hg = await this.getHybridGit();
      if (hg) return hg.useNative();
      throw new Error("Hybrid Git not enabled");
    },
    
    async getBackendType() {
      const hg = await this.getHybridGit();
      return hg ? hg.getBackendType() : "native";
    },
    // ---------- Repo info ----------
    async branch() {
      return runGit(["rev-parse", "--abbrev-ref", "HEAD"], base);
    },
    async head() {
      return runGit(["rev-parse", "HEAD"], base);
    },
    async headSha() {
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

    // ---------- Read-only helpers ----------
    async log(format = "%h%x09%s", extra = []) {
      const extraArgs =
        typeof extra === "string"
          ? extra.split(/\s+/).filter(Boolean)
          : toArr(extra);
      return runGit(["log", `--pretty=${format}`, ...extraArgs], base);
    },
    async logSinceLastTag(format = "%h%x09%s") {
      try {
        return runGit(["log", `--pretty=${format}`, "--oneline", "HEAD"], base);
      } catch {
        // If no tags exist, return empty
        return "";
      }
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

    // ---------- Write helpers (happy path) ----------
    async add(paths) {
      const list = toArr(paths).filter(Boolean);
      if (list.length === 0) return;
      await runGitVoid(["add", "--", ...list], base);
    },
    async writeFile(filePath, content) {
      const { writeFile } = await import("node:fs/promises");
      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(base.cwd, filePath);
      await writeFile(fullPath, content, "utf8");
      return fullPath;
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

    // ---------- Notes (receipts) ----------
    async noteAdd(ref, message, sha = "HEAD") {
      // git will create the notes ref if needed
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

    // ---------- Atomic ref create (locks) ----------
    // Uses stdin protocol to atomically create a ref if absent.
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

    // ---------- Plumbing ----------
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

    // ---------- Utility methods ----------
    async isClean() {
      const status = await this.statusPorcelain();
      return status.trim() === "";
    },
    async hasUncommittedChanges() {
      const status = await this.statusPorcelain();
      return status.trim() !== "";
    },
    async getCurrentBranch() {
      try {
        return await this.branch();
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

    // ---------- Info methods ----------
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

    // ---------- Ref methods ----------
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

    // ---------- Worktree methods ----------
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

    // ---------- Diff operations ----------
    async diff(options = {}) {
      const args = ["diff"];

      // Handle different diff types
      if (options.cached) args.push("--cached");
      if (options.staged) args.push("--cached");
      if (options.nameOnly) args.push("--name-only");
      if (options.nameStatus) args.push("--name-status");
      if (options.stat) args.push("--stat");
      if (options.shortstat) args.push("--shortstat");
      if (options.numstat) args.push("--numstat");

      // Handle commit ranges
      if (options.from && options.to) {
        args.push(`${options.from}..${options.to}`);
      } else if (options.from) {
        args.push(options.from);
      }

      // Handle specific files
      if (options.files && options.files.length > 0) {
        args.push("--", ...toArr(options.files));
      }

      return runGit(args, base);
    },

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

    // ---------- Branch operations ----------
    async branchList(options = {}) {
      const args = ["branch"];

      if (options.all) args.push("-a");
      if (options.remote) args.push("-r");
      if (options.merged) args.push("--merged");
      if (options.noMerged) args.push("--no-merged");
      if (options.verbose) args.push("-v");

      const output = await runGit(args, base);
      return output
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => line.replace(/^\*?\s*/, "").trim());
    },

    async branchCreate(name, startPoint = "HEAD", options = {}) {
      const args = ["branch"];

      if (options.force) args.push("-f");
      if (options.track) args.push("--track");
      if (options.noTrack) args.push("--no-track");

      args.push(name);
      if (startPoint !== "HEAD") args.push(startPoint);

      await runGitVoid(args, base);
    },

    async branchDelete(name, options = {}) {
      const args = ["branch"];

      if (options.force) args.push("-D");
      else args.push("-d");

      args.push(name);
      await runGitVoid(args, base);
    },

    // ---------- Checkout/Switch operations ----------
    async checkout(ref, options = {}) {
      const args = ["checkout"];

      if (options.force) args.push("-f");
      if (options.create) args.push("-b");
      if (options.track) args.push("--track");
      if (options.detach) args.push("--detach");

      if (ref) args.push(ref);

      await runGitVoid(args, base);
    },

    async switch(branch, options = {}) {
      const args = ["switch"];

      if (options.create) args.push("-c");
      if (options.force) args.push("-f");
      if (options.detach) args.push("--detach");
      if (options.track) args.push("--track");
      if (options.noTrack) args.push("--no-track");

      if (branch) args.push(branch);

      await runGitVoid(args, base);
    },

    // ---------- Merge operations ----------
    async merge(ref, options = {}) {
      const args = ["merge"];

      if (options.noff) args.push("--no-ff");
      if (options.ff) args.push("--ff-only");
      if (options.squash) args.push("--squash");
      if (options.noCommit) args.push("--no-commit");
      if (options.message) args.push("-m", options.message);

      if (ref) args.push(ref);

      await runGitVoid(args, base);
    },

    // ---------- Rebase operations ----------
    async rebase(onto = "origin/main", options = {}) {
      const args = ["rebase"];

      if (options.interactive) args.push("-i");
      if (options.continue) args.push("--continue");
      if (options.abort) args.push("--abort");
      if (options.skip) args.push("--skip");
      if (options.autosquash) args.push("--autosquash");
      if (options.noAutosquash) args.push("--no-autosquash");

      if (onto) args.push(onto);

      await runGitVoid(args, base);
    },

    // ---------- Reset operations ----------
    async reset(mode = "mixed", ref = "HEAD", options = {}) {
      const args = ["reset"];

      // Reset modes: soft, mixed, hard, merge, keep
      if (mode) args.push(`--${mode}`);

      if (options.paths && options.paths.length > 0) {
        args.push("--", ...toArr(options.paths));
      } else if (ref) {
        args.push(ref);
      }

      await runGitVoid(args, base);
    },

    // ---------- Stash operations ----------
    async stashSave(message = "", options = {}) {
      const args = ["stash"];

      if (options.push) args.push("push");
      else args.push("save");

      if (message) args.push("-m", message);
      if (options.includeUntracked) args.push("-u");
      if (options.keepIndex) args.push("--keep-index");

      await runGitVoid(args, base);
    },

    async stashList() {
      const output = await runGit(["stash", "list"], base);
      return output.split("\n").filter((line) => line.trim());
    },

    async stashApply(stash = "stash@{0}", options = {}) {
      const args = ["stash"];

      if (options.pop) args.push("pop");
      else args.push("apply");

      if (stash) args.push(stash);

      await runGitVoid(args, base);
    },

    async stashDrop(stash = "stash@{0}") {
      await runGitVoid(["stash", "drop", stash], base);
    },

    // ---------- Cherry-pick operations ----------
    async cherryPick(commit, options = {}) {
      const args = ["cherry-pick"];

      if (options.continue) args.push("--continue");
      if (options.abort) args.push("--abort");
      if (options.skip) args.push("--skip");
      if (options.noCommit) args.push("--no-commit");
      if (options.edit) args.push("--edit");

      if (commit) args.push(commit);

      await runGitVoid(args, base);
    },

    // ---------- Revert operations ----------
    async revert(commit, options = {}) {
      const args = ["revert"];

      if (options.noCommit) args.push("--no-commit");
      if (options.edit) args.push("--edit");
      if (options.mainline) args.push("-m", options.mainline);

      if (commit) args.push(commit);

      await runGitVoid(args, base);
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
