/**
 * @fileoverview GitVan v3.0.0 — Submodule Manager
 *
 * Manages git submodules at runtime, specifically for the vendor/unrdf integration.
 * Provides utilities to check status, detect updates, compare versions, and manage
 * submodule lifecycle.
 *
 * Features:
 * - Submodule initialization checking
 * - Version detection and comparison
 * - Update detection (local vs remote)
 * - Sync status reporting
 * - Warning and error reporting
 *
 * @version 1.0.0
 * @license Apache-2.0
 */

import { existsSync, readFileSync } from "fs";
import { join, resolve } from "pathe";
import { execSync } from "child_process";
import { createLogger } from "./logger.mjs";

const logger = createLogger("submodule-manager");

/**
 * Package configuration for @unrdf npm packages
 */
export const SUBMODULE_CONFIG = {
  unrdf: {
    path: "node_modules/@unrdf",
    name: "@unrdf/hooks",
    npmScope: "@unrdf",
  },
};

/**
 * Check if @unrdf packages are installed
 *
 * @param {string} packagePath - Relative path to check (e.g., "node_modules/@unrdf")
 * @param {string} [cwd=process.cwd()] - Working directory
 * @returns {boolean} True if installed
 */
export function isSubmoduleInitialized(packagePath, cwd = process.cwd()) {
  const fullPath = resolve(cwd, packagePath);

  // Check if directory exists
  if (!existsSync(fullPath)) {
    return false;
  }

  return true;
}

/**
 * Get @unrdf package version from package.json
 *
 * @param {string} packagePath - Relative path to package (e.g., "node_modules/@unrdf/hooks")
 * @param {string} [cwd=process.cwd()] - Working directory
 * @returns {string|null} Version string or null if not found
 */
export function getSubmoduleVersion(packagePath, cwd = process.cwd()) {
  // If path is "node_modules/@unrdf", try hooks subpackage
  let packageJsonPath = resolve(cwd, packagePath, "package.json");
  if (!existsSync(packageJsonPath)) {
    packageJsonPath = resolve(cwd, packagePath, "hooks", "package.json");
  }

  if (!existsSync(packageJsonPath)) {
    return null;
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    return packageJson.version || null;
  } catch (error) {
    logger.warn(`Failed to read version from ${packageJsonPath}:`, error.message);
    return null;
  }
}

/**
 * Get current commit hash of submodule
 *
 * @param {string} submodulePath - Relative path to submodule
 * @param {string} [cwd=process.cwd()] - Working directory
 * @returns {string|null} Commit hash or null if not available
 */
export function getSubmoduleCommit(submodulePath, cwd = process.cwd()) {
  if (!isSubmoduleInitialized(submodulePath, cwd)) {
    return null;
  }

  try {
    const fullPath = resolve(cwd, submodulePath);
    const commit = execSync("git rev-parse HEAD", {
      cwd: fullPath,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    return commit;
  } catch (error) {
    logger.warn(`Failed to get commit for ${submodulePath}:`, error.message);
    return null;
  }
}

/**
 * Get commit hash that parent repository expects for submodule
 *
 * @param {string} submodulePath - Relative path to submodule
 * @param {string} [cwd=process.cwd()] - Working directory
 * @returns {string|null} Expected commit hash or null
 */
export function getExpectedSubmoduleCommit(submodulePath, cwd = process.cwd()) {
  try {
    const commit = execSync(`git ls-tree HEAD ${submodulePath}`, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    // Format: "160000 commit <hash>\t<path>"
    const match = commit.match(/^160000 commit ([a-f0-9]{40})\t/);
    return match ? match[1] : null;
  } catch (error) {
    logger.warn(`Failed to get expected commit for ${submodulePath}:`, error.message);
    return null;
  }
}

/**
 * Check if submodule has uncommitted changes
 *
 * @param {string} submodulePath - Relative path to submodule
 * @param {string} [cwd=process.cwd()] - Working directory
 * @returns {boolean} True if there are uncommitted changes
 */
export function hasSubmoduleChanges(submodulePath, cwd = process.cwd()) {
  if (!isSubmoduleInitialized(submodulePath, cwd)) {
    return false;
  }

  try {
    const fullPath = resolve(cwd, submodulePath);
    const status = execSync("git status --porcelain", {
      cwd: fullPath,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    return status.length > 0;
  } catch (error) {
    logger.warn(`Failed to check changes for ${submodulePath}:`, error.message);
    return false;
  }
}

/**
 * Check if submodule is out of sync with expected commit
 *
 * @param {string} submodulePath - Relative path to submodule
 * @param {string} [cwd=process.cwd()] - Working directory
 * @returns {boolean} True if out of sync
 */
export function isSubmoduleOutOfSync(submodulePath, cwd = process.cwd()) {
  const currentCommit = getSubmoduleCommit(submodulePath, cwd);
  const expectedCommit = getExpectedSubmoduleCommit(submodulePath, cwd);

  if (!currentCommit || !expectedCommit) {
    return false;
  }

  return currentCommit !== expectedCommit;
}

/**
 * Get remote updates available for submodule
 *
 * @param {string} submodulePath - Relative path to submodule
 * @param {string} [cwd=process.cwd()] - Working directory
 * @returns {Object} Update information
 */
export function checkSubmoduleUpdates(submodulePath, cwd = process.cwd()) {
  if (!isSubmoduleInitialized(submodulePath, cwd)) {
    return {
      available: false,
      error: "Submodule not initialized",
    };
  }

  try {
    const fullPath = resolve(cwd, submodulePath);

    // Fetch latest from remote
    execSync("git fetch origin --quiet", {
      cwd: fullPath,
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Get current commit
    const currentCommit = execSync("git rev-parse HEAD", {
      cwd: fullPath,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    // Get remote commit
    const remoteCommit = execSync("git rev-parse origin/main", {
      cwd: fullPath,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    // Count commits behind
    const behindCount = execSync(
      `git rev-list --count HEAD..origin/main`,
      {
        cwd: fullPath,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }
    ).trim();

    return {
      available: currentCommit !== remoteCommit,
      currentCommit: currentCommit.substring(0, 8),
      remoteCommit: remoteCommit.substring(0, 8),
      behindCount: parseInt(behindCount, 10),
    };
  } catch (error) {
    logger.warn(`Failed to check updates for ${submodulePath}:`, error.message);
    return {
      available: false,
      error: error.message,
    };
  }
}

/**
 * Get comprehensive status for a submodule
 *
 * @param {string} submodulePath - Relative path to submodule
 * @param {string} [cwd=process.cwd()] - Working directory
 * @returns {Object} Status information
 */
export function getSubmoduleStatus(submodulePath, cwd = process.cwd()) {
  const initialized = isSubmoduleInitialized(submodulePath, cwd);

  if (!initialized) {
    return {
      initialized: false,
      path: submodulePath,
      status: "not-initialized",
      warnings: ["Submodule is not initialized. Run: git submodule update --init"],
    };
  }

  const version = getSubmoduleVersion(submodulePath, cwd);
  const currentCommit = getSubmoduleCommit(submodulePath, cwd);
  const expectedCommit = getExpectedSubmoduleCommit(submodulePath, cwd);
  const hasChanges = hasSubmoduleChanges(submodulePath, cwd);
  const outOfSync = isSubmoduleOutOfSync(submodulePath, cwd);

  const warnings = [];
  if (outOfSync) {
    warnings.push(
      `Submodule is out of sync. Expected: ${expectedCommit?.substring(0, 8)}, Current: ${currentCommit?.substring(0, 8)}`
    );
  }
  if (hasChanges) {
    warnings.push("Submodule has uncommitted changes");
  }

  return {
    initialized: true,
    path: submodulePath,
    version,
    currentCommit: currentCommit?.substring(0, 8),
    expectedCommit: expectedCommit?.substring(0, 8),
    outOfSync,
    hasChanges,
    status: outOfSync
      ? "out-of-sync"
      : hasChanges
        ? "modified"
        : "ok",
    warnings,
  };
}

/**
 * Get status for all configured submodules
 *
 * @param {string} [cwd=process.cwd()] - Working directory
 * @returns {Object} Status for all submodules
 */
export function getAllSubmodulesStatus(cwd = process.cwd()) {
  const statuses = {};

  for (const [name, config] of Object.entries(SUBMODULE_CONFIG)) {
    statuses[name] = getSubmoduleStatus(config.path, cwd);
  }

  return statuses;
}

/**
 * Initialize a submodule
 *
 * @param {string} submodulePath - Relative path to submodule
 * @param {string} [cwd=process.cwd()] - Working directory
 * @returns {Object} Initialization result
 */
export function initializeSubmodule(submodulePath, cwd = process.cwd()) {
  try {
    logger.info(`Initializing submodule: ${submodulePath}`);

    execSync(`git submodule update --init ${submodulePath}`, {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });

    logger.info(`Successfully initialized: ${submodulePath}`);

    return {
      success: true,
      message: `Submodule ${submodulePath} initialized successfully`,
    };
  } catch (error) {
    logger.error(`Failed to initialize ${submodulePath}:`, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Update a submodule to latest remote version
 *
 * @param {string} submodulePath - Relative path to submodule
 * @param {string} [cwd=process.cwd()] - Working directory
 * @returns {Object} Update result
 */
export function updateSubmodule(submodulePath, cwd = process.cwd()) {
  if (!isSubmoduleInitialized(submodulePath, cwd)) {
    return initializeSubmodule(submodulePath, cwd);
  }

  try {
    logger.info(`Updating submodule: ${submodulePath}`);

    execSync(`git submodule update --remote ${submodulePath}`, {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });

    logger.info(`Successfully updated: ${submodulePath}`);

    return {
      success: true,
      message: `Submodule ${submodulePath} updated successfully`,
    };
  } catch (error) {
    logger.error(`Failed to update ${submodulePath}:`, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Sync submodule to expected commit (from parent repo)
 *
 * @param {string} submodulePath - Relative path to submodule
 * @param {string} [cwd=process.cwd()] - Working directory
 * @returns {Object} Sync result
 */
export function syncSubmodule(submodulePath, cwd = process.cwd()) {
  if (!isSubmoduleInitialized(submodulePath, cwd)) {
    return initializeSubmodule(submodulePath, cwd);
  }

  try {
    logger.info(`Syncing submodule: ${submodulePath}`);

    execSync(`git submodule update ${submodulePath}`, {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });

    logger.info(`Successfully synced: ${submodulePath}`);

    return {
      success: true,
      message: `Submodule ${submodulePath} synced successfully`,
    };
  } catch (error) {
    logger.error(`Failed to sync ${submodulePath}:`, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get unrdf submodule status (convenience function)
 *
 * @param {string} [cwd=process.cwd()] - Working directory
 * @returns {Object} Status information
 */
export function getUnrdfStatus(cwd = process.cwd()) {
  return getSubmoduleStatus(SUBMODULE_CONFIG.unrdf.path, cwd);
}

/**
 * Initialize unrdf submodule (convenience function)
 *
 * @param {string} [cwd=process.cwd()] - Working directory
 * @returns {Object} Initialization result
 */
export function initializeUnrdf(cwd = process.cwd()) {
  return initializeSubmodule(SUBMODULE_CONFIG.unrdf.path, cwd);
}

/**
 * Update unrdf submodule (convenience function)
 *
 * @param {string} [cwd=process.cwd()] - Working directory
 * @returns {Object} Update result
 */
export function updateUnrdf(cwd = process.cwd()) {
  return updateSubmodule(SUBMODULE_CONFIG.unrdf.path, cwd);
}

/**
 * Sync unrdf submodule (convenience function)
 *
 * @param {string} [cwd=process.cwd()] - Working directory
 * @returns {Object} Sync result
 */
export function syncUnrdf(cwd = process.cwd()) {
  return syncSubmodule(SUBMODULE_CONFIG.unrdf.path, cwd);
}

export default {
  isSubmoduleInitialized,
  getSubmoduleVersion,
  getSubmoduleCommit,
  getExpectedSubmoduleCommit,
  hasSubmoduleChanges,
  isSubmoduleOutOfSync,
  checkSubmoduleUpdates,
  getSubmoduleStatus,
  getAllSubmodulesStatus,
  initializeSubmodule,
  updateSubmodule,
  syncSubmodule,
  getUnrdfStatus,
  initializeUnrdf,
  updateUnrdf,
  syncUnrdf,
};
