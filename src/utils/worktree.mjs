/**
 * GitVan v2 Worktree Utilities - Git worktree detection and scoping
 * Provides worktree-aware operations for multi-worktree environments
 */

import { useGit } from "../composables/git.mjs";
import { createHash } from "node:crypto";

/**
 * Get comprehensive worktree information
 * @returns {Promise<object>} Worktree info object
 */
export async function getWorktreeInfo() {
  const git = useGit();

  try {
    const commonDir = await git.run("rev-parse --git-common-dir");
    const worktree = await git.run("rev-parse --show-toplevel");
    const head = await git.head();
    const branch = await git.getCurrentBranch();

    return {
      commonDir: commonDir.trim(),
      worktree: worktree.trim(),
      branch: branch.trim(),
      head: head.trim(),
    };
  } catch (error) {
    throw new Error(`Failed to get worktree info: ${error.message}`);
  }
}

/**
 * Generate unique worktree key for locking and identification
 * @returns {Promise<string>} Unique worktree key
 */
export async function worktreeKey() {
  const { commonDir, worktree, branch } = await getWorktreeInfo();
  return `${commonDir}#${worktree}#${branch}`;
}

/**
 * Check if current directory is a git worktree
 * @returns {Promise<boolean>} True if worktree
 */
export async function isWorktree() {
  try {
    const git = useGit();
    await git.run("rev-parse --is-inside-work-tree");
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all worktrees for the repository
 * @returns {Promise<Array>} Array of worktree objects
 */
export async function listWorktrees() {
  const git = useGit();

  try {
    const output = await git.run("worktree list --porcelain");
    const worktrees = [];
    let current = {};

    for (const line of output.split("\n")) {
      if (line.startsWith("worktree ")) {
        if (current.path) worktrees.push(current);
        current = { path: line.substring(9) };
      } else if (line.startsWith("HEAD ")) {
        current.head = line.substring(5);
      } else if (line.startsWith("branch ")) {
        current.branch = line.substring(7);
      } else if (line.startsWith("detached")) {
        current.detached = true;
      }
    }

    if (current.path) worktrees.push(current);
    return worktrees;
  } catch {
    // Fallback to single worktree
    const info = await getWorktreeInfo();
    return [
      {
        path: info.worktree,
        head: info.head,
        branch: info.branch,
      },
    ];
  }
}

/**
 * Get worktree-specific lock reference
 * @param {string} lockName - Lock name
 * @returns {Promise<string>} Worktree-specific lock ref
 */
export async function getWorktreeLockRef(lockName) {
  const key = await worktreeKey();
  const keyHash = createHash("sha256").update(key).digest("hex").slice(0, 8);
  return `refs/gitvan/locks/${lockName}-${keyHash}`;
}
