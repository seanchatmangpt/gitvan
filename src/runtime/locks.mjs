/**
 * GitVan v2 Atomic Locking Utilities
 * Provides atomic file locking using Git refs for concurrency safety
 */

import { useGit } from "../composables/git.mjs";

/**
 * Acquires an atomic lock using Git refs
 * @param {string} lockRef - Git ref to use as lock (e.g., 'refs/gitvan/locks/template:path')
 * @param {string} sha - Git SHA to store in the lock
 * @returns {Promise<boolean>} True if lock acquired, false if already locked
 */
export async function acquireLock(lockRef, sha) {
  const git = useGit();
  try {
    // Atomically create the ref. This fails if the ref already exists.
    await git.updateRefCreate(lockRef, sha);
    return true;
  } catch {
    return false; // Lock is held by another process
  }
}

/**
 * Releases a lock by deleting the Git ref
 * @param {string} lockRef - Git ref to release
 * @returns {Promise<void>}
 */
export async function releaseLock(lockRef) {
  const git = useGit();
  try {
    await git.delRef(lockRef);
  } catch {
    // Ignore errors if the ref is already gone
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
