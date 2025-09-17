// src/composables/git-core.mjs
// GitVan v2 — Core Git Utilities
// Shared utilities for all Git command modules

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function runGit(
  args,
  { cwd, env, maxBuffer = 12 * 1024 * 1024 } = {}
) {
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

export async function runGitVoid(args, opts) {
  await runGit(args, opts);
}

export function toArr(x) {
  return Array.isArray(x) ? x : [x];
}
