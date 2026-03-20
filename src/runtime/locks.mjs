/**
 * GitVan v2 Atomic Locking Utilities
 * Provides atomic file locking using Git refs for concurrency safety
 */

import { useGit } from "../composables/git/index.mjs";

/**
 * Acquires an atomic lock using Git refs
 * @param {string} lockRef - Git ref to use as lock (e.g., 'refs/gitvan/locks/template:path')
 * @param {string} _data - Lock metadata (unused, lock uses HEAD SHA as ref value)
 * @returns {Promise<boolean>} True if lock acquired, false if already locked
 */
export async function acquireLock(lockRef, _data) {
  const git = useGit();
  try {
    // Use current HEAD as the ref value (git update-ref requires a valid SHA)
    const sha = await git.currentHead();
    if (!sha) {
      return false;
    }
    // Atomically create the ref. Returns false if the ref already exists.
    const created = await git.updateRefCreate(lockRef, sha);
    return created;
  } catch {
    return false; // Lock is held by another process
  }
}

/**
 * Releases a lock by deleting the Git ref
 * @param {string} lockRef - Git ref to release
 * @returns {Promise<boolean>} True if lock was released
 */
export async function releaseLock(lockRef) {
  const git = useGit();
  try {
    // Check if the ref exists first
    const refValue = await git.getRef(lockRef);
    if (!refValue) {
      return false; // Nothing to release
    }
    // Delete the ref using update-ref -d
    await git.run(["update-ref", "-d", lockRef]);
    return true;
  } catch {
    // Ignore errors if the ref is already gone
    return false;
  }
}

/**
 * Generate a lock ref path for a given operation
 * @param {string} operation - Operation type (e.g., 'template', 'inject')
 * @param {string} path - File path being operated on
 * @returns {string} Lock ref path
 */
export function generateLockRef(operation, path) {
  // Normalize path to avoid conflicts
  const normalizedPath = path.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `refs/gitvan/locks/${operation}:${normalizedPath}`;
}

/**
 * Generate a worktree-specific lock ref
 * @param {string} worktreePath - Worktree path
 * @returns {string} Worktree lock ref path
 */
export function worktreeLockRef(worktreePath) {
  const normalizedPath = worktreePath.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `refs/gitvan/locks/worktree:${normalizedPath}`;
}
