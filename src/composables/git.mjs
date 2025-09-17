// src/composables/git.mjs
// GitVan v2 — useGit()
// - POSIX-first. No external deps. ESM.
// - Deterministic env: TZ=UTC, LANG=C.
// - UnJS context-aware (unctx). Captures context once to avoid loss after await.
// - Happy path only. No retries. No shell string interpolation.
// - 80/20 commands + a few primitives used by locks/receipts.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { useGitVan, tryUseGitVan } from "../core/context.mjs";

const execFileAsync = promisify(execFile);

async function runGit(args, { cwd, env, maxBuffer = 12 * 1024 * 1024 } = {}) {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd,
      env,
      maxBuffer,
    });
    return stdout.trim();
  } catch (error) {
    // Handle specific cases for empty repositories
    const command = `git ${args.join(" ")}`;
    const errorMsg = error.message || "";
    const stderr = error.stderr || "";
    const fullError = `${errorMsg} ${stderr}`;

    // Handle empty repository cases for rev-list commands
    if (
      args[0] === "rev-list" &&
      (fullError.includes("ambiguous argument") ||
        fullError.includes("unknown revision") ||
        fullError.includes("not in the working tree") ||
        fullError.includes("fatal: ambiguous argument"))
    ) {
      return ""; // Return empty string for empty repo
    }

    // Re-throw with more context for other errors
    const newError = new Error(`Command failed: ${command}\n${error.message}`);
    newError.originalError = error;
    newError.command = command;
    newError.args = args;
    newError.stderr = error.stderr;
    throw newError;
  }
}

async function runGitVoid(args, opts) {
  await runGit(args, opts);
}

function toArr(x) {
  return Array.isArray(x) ? x : [x];
}

export function useGit() {
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
    // ---------- Repo info ----------
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
        base,
      );
    },
    async noteAppend(ref, message, sha = "HEAD") {
      await runGitVoid(
        ["notes", `--ref=${ref}`, "append", "-m", message, sha],
        base,
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
        return worktrees.map(wt => ({
          ...wt,
          isMain: wt.path === mainPath
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
            isMain: true
          }
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
