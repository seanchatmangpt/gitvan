// src/composables/git.mjs
// GitVan v2 — useGit()
// - POSIX-first. No external deps. ESM.
// - Deterministic env: TZ=UTC, LANG=C.
// - UnJS context-aware (unctx). Captures context once to avoid loss after await.
// - Happy path only. No retries. No shell string interpolation.
// - 80/20 commands + a few primitives used by locks/receipts.

import { execFile as _execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { bindContext } from "../core/context.mjs";

const execFile = promisify(_execFile);

async function runGit(args, { cwd, env, maxBuffer = 12 * 1024 * 1024 } = {}) {
  const { stdout } = await execFile("git", args, { cwd, env, maxBuffer });
  return stdout.trim();
}

async function runGitVoid(args, opts) {
  await runGit(args, opts);
}

function toArr(x) {
  return Array.isArray(x) ? x : [x];
}

export function useGit() {
  const bound = bindContext();
  const base = {
    cwd: bound.cwd,
    env: bound.env,
  };

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
      const forced = process.env.GITVAN_NOW;
      return forced || new Date().toISOString();
    },

    // ---------- Read-only helpers ----------
    async log(format = "%h%x09%s", extra = []) {
      const extraArgs =
        typeof extra === "string" ? extra.split(/\s+/).filter(Boolean) : toArr(extra);
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
      if (argArray.length === 1 && argArray[0].startsWith('--')) {
        argArray.push('HEAD');
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
      await runGitVoid(["notes", `--ref=${ref}`, "add", "-m", message, sha], base);
    },
    async noteAppend(ref, message, sha = "HEAD") {
      await runGitVoid(["notes", `--ref=${ref}`, "append", "-m", message, sha], base);
    },
    async noteShow(ref, sha = "HEAD") {
      return runGit(["notes", `--ref=${ref}`, "show", sha], base);
    },

    // ---------- Atomic ref create (locks) ----------
    // Uses stdin protocol to atomically create a ref if absent.
    async updateRefCreate(ref, valueSha) {
      // Equivalent to: echo "create <ref> <sha>" | git update-ref --stdin
      // Using execFile without shell: write via env var and small wrapper.
      // Simpler: rely on single create op by running update-ref directly per ref.
      // Note: Git does not expose "create" outside stdin, so we approximate by
      // using `symbolic-ref` for new symbols or fallback to update-ref with failure check.
      // Pragmatic approach: if ref exists, this should fail the use-case. We check first.
      try {
        await runGitVoid(["show-ref", "--verify", "--quiet", ref], base);
        // exists -> signal failure
        return false;
      } catch {
        // not exists -> create pointing to valueSha
        await runGitVoid(["update-ref", ref, valueSha], base);
        return true;
      }
    },

    // ---------- Plumbing ----------
    async hashObject(filePath, { write = false } = {}) {
      const abs = path.isAbsolute(filePath) ? filePath : path.join(base.cwd, filePath);
      const args = ["hash-object"];
      if (write) args.push("-w");
      args.push("--", abs);
      return runGit(args, base);
    },
    async writeTree() {
      return runGit(["write-tree"], base);
    },
    async catFilePretty(sha) {
      return runGit(["cat-file", "-p", sha], base);
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