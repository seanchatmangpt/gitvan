// src/utils/platform.mjs
// GitVan v4.0.0  Cross-Platform Utilities
// Handles platform-specific operations (Windows, macOS, Linux)

import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { createLogger } from "./logger.mjs";
import { isWindows } from "./security.mjs";

const logger = createLogger("platform");

/**
 * Retry configuration for file operations
 */
const RETRY_DEFAULTS = {
  maxRetries: 3,
  initialDelay: 100, // ms
  backoffFactor: 2,
};

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Delete a file with retry logic for Windows file locking issues
 * Windows can lock files longer than Unix, so we retry with exponential backoff
 *
 * @param {string} filePath - Path to file to delete
 * @param {object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 100)
 * @param {number} options.backoffFactor - Backoff multiplier (default: 2)
 * @returns {Promise<boolean>} - True if deleted, false if file doesn't exist
 * @throws {Error} If deletion fails after all retries
 */
export async function deleteFileWithRetry(filePath, options = {}) {
  const { maxRetries, initialDelay, backoffFactor } = {
    ...RETRY_DEFAULTS,
    ...options,
  };

  // Check if file exists
  if (!existsSync(filePath)) {
    logger.debug(`File does not exist, skipping deletion: ${filePath}`);
    return false;
  }

  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      rmSync(filePath, { force: true });

      // Verify deletion
      if (!existsSync(filePath)) {
        if (attempt > 0) {
          logger.debug(
            `File deleted successfully after ${attempt + 1} attempts: ${filePath}`
          );
        }
        return true;
      }
    } catch (error) {
      lastError = error;

      // Calculate delay with exponential backoff
      const delay = initialDelay * Math.pow(backoffFactor, attempt);

      logger.debug(
        `Failed to delete file (attempt ${attempt + 1}/${maxRetries}): ${error.message}`
      );

      // Don't sleep on last attempt
      if (attempt < maxRetries - 1) {
        logger.debug(`Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  // All retries exhausted
  throw new Error(
    `Failed to delete file after ${maxRetries} attempts: ${filePath} - ${lastError?.message || "Unknown error"}`
  );
}

/**
 * Delete multiple files with retry logic
 * @param {string[]} filePaths - Array of file paths to delete
 * @param {object} options - Retry options (same as deleteFileWithRetry)
 * @returns {Promise<{deleted: number, failed: number, errors: Array}>}
 */
export async function deleteFilesWithRetry(filePaths, options = {}) {
  const results = {
    deleted: 0,
    failed: 0,
    errors: [],
  };

  for (const filePath of filePaths) {
    try {
      const deleted = await deleteFileWithRetry(filePath, options);
      if (deleted) {
        results.deleted++;
      }
    } catch (error) {
      results.failed++;
      results.errors.push({
        file: filePath,
        error: error.message,
      });
      logger.warn(`Failed to delete file: ${filePath} - ${error.message}`);
    }
  }

  return results;
}

/**
 * Get platform-specific temp directory
 * @returns {string} Temp directory path
 */
export function getTempDir() {
  return tmpdir();
}

/**
 * Get environment variable with case-insensitive fallback for Windows
 * On Windows, env vars are case-insensitive, but process.env is case-sensitive in Node
 *
 * @param {string} name - Environment variable name
 * @param {string} defaultValue - Default value if not found
 * @returns {string|undefined} Environment variable value
 */
export function getEnvVar(name, defaultValue = undefined) {
  // Try exact match first
  if (process.env[name] !== undefined) {
    return process.env[name];
  }

  // On Windows, try case-insensitive match
  if (isWindows()) {
    const upperName = name.toUpperCase();
    for (const [key, value] of Object.entries(process.env)) {
      if (key.toUpperCase() === upperName) {
        return value;
      }
    }
  }

  return defaultValue;
}

/**
 * Set environment variable with proper case handling
 * @param {string} name - Environment variable name
 * @param {string} value - Environment variable value
 */
export function setEnvVar(name, value) {
  process.env[name] = value;

  // On Windows, also set uppercase version for compatibility
  if (isWindows() && name !== name.toUpperCase()) {
    process.env[name.toUpperCase()] = value;
  }
}

/**
 * Check if a process is running (cross-platform)
 * @param {number} pid - Process ID
 * @returns {boolean} True if process is running
 */
export function isProcessRunning(pid) {
  try {
    // Sending signal 0 checks if process exists without killing it
    // Works on both Windows and Unix
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // ESRCH means process doesn't exist
    // EPERM means process exists but we don't have permission
    return error.code === "EPERM";
  }
}

/**
 * Get platform information
 * @returns {object} Platform details
 */
export function getPlatformInfo() {
  return {
    platform: process.platform,
    isWindows: isWindows(),
    isMac: process.platform === "darwin",
    isLinux: process.platform === "linux",
    arch: process.arch,
    nodeVersion: process.version,
    tempDir: getTempDir(),
  };
}

/**
 * Execute a function with platform-specific error handling
 * @param {Function} fn - Function to execute
 * @param {object} options - Options
 * @param {number} options.retries - Number of retries for transient errors
 * @returns {Promise<any>} Function result
 */
export async function withPlatformErrorHandling(fn, options = {}) {
  const { retries = 3 } = options;
  let lastError = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is potentially transient (file locking, etc.)
      const isTransient =
        error.code === "EBUSY" ||
        error.code === "EPERM" ||
        error.code === "EACCES" ||
        error.code === "EAGAIN";

      if (!isTransient || attempt === retries - 1) {
        throw error;
      }

      // Wait before retry
      const delay = 100 * Math.pow(2, attempt);
      logger.debug(
        `Transient error (${error.code}), retrying in ${delay}ms...`
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Normalize environment for deterministic execution
 * Sets TZ=UTC and LANG=C for consistent behavior across platforms
 *
 * @param {object} env - Environment variables to normalize
 * @returns {object} Normalized environment
 */
export function normalizeEnvironment(env = process.env) {
  return {
    ...env,
    TZ: "UTC",
    LANG: "C",
    LC_ALL: "C",
  };
}

/**
 * Check if running in CI environment
 * @returns {boolean} True if in CI
 */
export function isCI() {
  return !!(
    process.env.CI ||
    process.env.CONTINUOUS_INTEGRATION ||
    process.env.GITHUB_ACTIONS ||
    process.env.GITLAB_CI ||
    process.env.CIRCLECI ||
    process.env.TRAVIS
  );
}

export default {
  deleteFileWithRetry,
  deleteFilesWithRetry,
  getTempDir,
  getEnvVar,
  setEnvVar,
  isProcessRunning,
  getPlatformInfo,
  withPlatformErrorHandling,
  normalizeEnvironment,
  isCI,
};
