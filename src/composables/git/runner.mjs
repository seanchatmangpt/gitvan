// src/composables/git/runner.mjs
// GitVan v2 — Git runner with deterministic environment
// - POSIX-first. No external deps. ESM.
// - Deterministic env: TZ=UTC, LANG=C, LC_ALL=C, GIT_TERMINAL_PROMPT=0.
// - UnJS context-aware (unctx). Captures context once to avoid loss after await.
// - Happy path only. No retries. No shell string interpolation.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { useGitVan, tryUseGitVan } from "../../core/context.mjs";

const execFileAsync = promisify(execFile);

async function runGit(args, { cwd, env, maxBuffer = 12 * 1024 * 1024 } = {}) {
  try {
    const result = await execFileAsync("git", args, {
      cwd,
      env,
      maxBuffer,
      encoding: "utf8",
    });
    const stdout = result.stdout || "";
    return typeof stdout === "string" ? stdout.trim() : "";
  } catch (error) {
    // Handle specific cases for empty repositories
    const command = `git ${args.join(" ")}`;
    const errorMsg = error.message || "";
    const stderr = error.stderr || "";
    const fullError = `${errorMsg} ${stderr}`;

    // Handle empty repository cases for rev-parse HEAD and rev-list commands
    if (
      (args[0] === "rev-parse" && args[1] === "HEAD") ||
      (args[0] === "rev-list" &&
        (fullError.includes("ambiguous argument") ||
          fullError.includes("unknown revision") ||
          fullError.includes("not in the working tree") ||
          fullError.includes("fatal: ambiguous argument")))
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

export function createRunner() {
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
    LC_ALL: "C", // Always override to C locale for determinism
    GIT_TERMINAL_PROMPT: "0", // Disable terminal prompts
  };

  const base = { cwd, env };

  const run = (args) => runGit(toArr(args), base);
  const runVoid = (args) => runGitVoid(toArr(args), base);

  return { base, run, runVoid, toArr };
}
