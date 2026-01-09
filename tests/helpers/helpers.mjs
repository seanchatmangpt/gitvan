/**
 * Test Utilities - Helper Functions
 * Provides async helpers, git utilities, and test support functions
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

/**
 * Sleep/delay utility for async operations
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export async function sleep(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise<*>} Function result
 */
export async function retry(fn, options = {}) {
  const {
    maxAttempts = 3,
    delayMs = 100,
    backoffMultiplier = 2,
    onRetry = () => {}
  } = options;

  let lastError;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts - 1) {
        const delay = delayMs * Math.pow(backoffMultiplier, attempt);
        onRetry(attempt + 1, delay, error);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Clean up all git refs matching a prefix
 * @param {string} cwd - Repository directory
 * @param {string} prefix - Ref prefix (e.g., 'refs/gitvan/locks')
 * @returns {Promise<number>} Number of refs cleaned
 */
export async function cleanupGitRefs(cwd, prefix = 'refs/gitvan/locks') {
  let cleanedCount = 0;

  try {
    // List all refs matching prefix
    const { stdout } = await execAsync(
      `git for-each-ref --format="%(refname)" "${prefix}"`,
      { cwd }
    );

    const refs = stdout.trim().split('\n').filter(Boolean);

    // Delete each ref
    for (const ref of refs) {
      try {
        const { stdout: oid } = await execAsync(`git rev-parse "${ref}"`, { cwd });
        await execAsync(`git update-ref -d "${ref}" "${oid.trim()}"`, { cwd });
        cleanedCount++;
      } catch (error) {
        // Ignore individual ref deletion errors
      }
    }
  } catch (error) {
    // Ref prefix might not exist
  }

  return cleanedCount;
}

/**
 * Get all active git locks in a repository
 * @param {string} cwd - Repository directory
 * @returns {Promise<Object[]>} Array of lock objects
 */
export async function getGitLocks(cwd) {
  const locks = [];

  try {
    const { stdout } = await execAsync(
      'git for-each-ref --format="%(refname)" refs/gitvan/locks',
      { cwd }
    );

    const refs = stdout.trim().split('\n').filter(Boolean);

    for (const ref of refs) {
      try {
        const { stdout: oid } = await execAsync(`git rev-parse "${ref}"`, { cwd });
        const { stdout: content } = await execAsync(
          `git cat-file -p "${oid.trim()}"`,
          { cwd }
        );

        const lockName = ref.replace('refs/gitvan/locks/', '');
        locks.push({
          name: lockName,
          ref,
          oid: oid.trim(),
          data: JSON.parse(content)
        });
      } catch (error) {
        // Skip locks that can't be read
      }
    }
  } catch (error) {
    // No locks exist
  }

  return locks;
}

/**
 * Check if a lock exists in the repository
 * @param {string} cwd - Repository directory
 * @param {string} lockName - Lock name
 * @returns {Promise<boolean>}
 */
export async function lockExists(cwd, lockName) {
  try {
    await execAsync(`git rev-parse refs/gitvan/locks/${lockName}`, { cwd });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get all expired locks in a repository
 * @param {string} cwd - Repository directory
 * @returns {Promise<Object[]>} Array of expired lock objects
 */
export async function getExpiredLocks(cwd) {
  const locks = await getGitLocks(cwd);
  const now = Date.now();

  return locks.filter(lock => {
    const lockData = lock.data;
    const acquiredAt = lockData.acquiredAt || 0;
    const timeout = lockData.timeout || 30000;
    return (now - acquiredAt) > timeout;
  });
}

/**
 * Check if any expired locks exist in the repository
 * @param {string} cwd - Repository directory
 * @returns {Promise<boolean>}
 */
export async function hasExpiredLocks(cwd) {
  const expiredLocks = await getExpiredLocks(cwd);
  return expiredLocks.length > 0;
}

/**
 * Wait for all locks to be released
 * @param {string} cwd - Repository directory
 * @param {Object} options - Configuration
 * @returns {Promise<number>} Number of locks that were released
 */
export async function waitForLocksReleased(cwd, options = {}) {
  const {
    timeout = 5000,
    checkInterval = 100,
    onCheck = () => {}
  } = options;

  const startTime = Date.now();
  let releasedCount = 0;

  while (Date.now() - startTime < timeout) {
    const locks = await getGitLocks(cwd);
    onCheck(locks.length);

    if (locks.length === 0) {
      return releasedCount;
    }

    await sleep(checkInterval);
    releasedCount = locks.length;
  }

  throw new Error(`Timeout waiting for locks to be released (${timeout}ms)`);
}

/**
 * Verify test environment is clean
 * @param {string} cwd - Repository directory
 * @returns {Promise<Object>} Cleanliness report
 */
export async function verifyCleanTestEnv(cwd) {
  const locks = await getGitLocks(cwd);
  const expiredLocks = await getExpiredLocks(cwd);

  return {
    isClean: locks.length === 0,
    activeLockCount: locks.length,
    expiredLockCount: expiredLocks.length,
    locks,
    expiredLocks
  };
}

/**
 * Measure execution time of async function
 * @param {Function} fn - Async function
 * @returns {Promise<{duration: number, result: *}>}
 */
export async function measureTime(fn) {
  const startTime = performance.now();
  const result = await fn();
  const duration = performance.now() - startTime;
  return { duration, result };
}

/**
 * Assert git repository exists
 * @param {string} cwd - Repository directory
 * @throws {Error} If not a git repository
 */
export async function assertGitRepo(cwd) {
  try {
    await execAsync('git rev-parse --git-dir', { cwd });
  } catch (error) {
    throw new Error(`Not a git repository: ${cwd}`);
  }
}

/**
 * Get git repository state
 * @param {string} cwd - Repository directory
 * @returns {Promise<Object>} Repository state
 */
export async function getGitRepoState(cwd) {
  const state = {};

  try {
    // Get current branch
    const { stdout: branch } = await execAsync(
      'git rev-parse --abbrev-ref HEAD',
      { cwd }
    );
    state.branch = branch.trim();
  } catch (error) {
    state.branch = null;
  }

  try {
    // Get current HEAD commit
    const { stdout: head } = await execAsync(
      'git rev-parse HEAD',
      { cwd }
    );
    state.head = head.trim();
  } catch (error) {
    state.head = null;
  }

  try {
    // Get status
    const { stdout: status } = await execAsync(
      'git status --porcelain',
      { cwd }
    );
    state.dirty = status.trim().length > 0;
  } catch (error) {
    state.dirty = null;
  }

  return state;
}

/**
 * Timestamp for test output
 * @returns {string}
 */
export function testTimestamp() {
  return new Date().toISOString();
}

/**
 * Format duration in ms to human readable
 * @param {number} ms - Milliseconds
 * @returns {string}
 */
export function formatDuration(ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}

/**
 * Create a test report
 * @param {Object} config - Report configuration
 * @returns {Object}
 */
export function createTestReport(config = {}) {
  return {
    timestamp: testTimestamp(),
    ...config,
    failures: [],
    warnings: [],
    addFailure: function(message) {
      this.failures.push(message);
    },
    addWarning: function(message) {
      this.warnings.push(message);
    },
    passed: function() {
      return this.failures.length === 0;
    },
    summary: function() {
      return {
        timestamp: this.timestamp,
        failures: this.failures.length,
        warnings: this.warnings.length,
        passed: this.passed()
      };
    }
  };
}
