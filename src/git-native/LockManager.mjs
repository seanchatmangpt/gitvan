// src/git-native/LockManager.mjs
// Git-Native Lock Management using Git references

import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";

/**
 * Git-Native Lock Manager
 * Manages locks and semaphores using Git references
 */
export class LockManager {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.logger = options.logger || console;

    // Lock configuration
    this.config = {
      defaultTimeout: 30000, // 30 seconds default timeout
      lockPrefix: "refs/gitvan/locks",
      ...options.lock,
    };

    // Active locks tracking
    this.activeLocks = new Map();
  }

  /**
   * Acquire a lock
   * @param {string} lockName - Name of the lock
   * @param {object} options - Lock options
   * @returns {Promise<boolean>} True if lock acquired, false otherwise
   */
  async acquireLock(lockName, options = {}) {
    const {
      timeout = this.config.defaultTimeout,
      fingerprint = null,
      exclusive = true,
    } = options;

    const lockRef = `${this.config.lockPrefix}/${lockName}`;
    const lockId = this._generateLockId();
    const lockData = {
      id: lockId,
      acquiredAt: Date.now(),
      timeout,
      fingerprint: fingerprint || this._generateFingerprint(),
      exclusive,
      pid: process.pid,
    };

    try {
      // Check if lock already exists
      const existingLock = await this._getLockData(lockRef);
      if (existingLock) {
        // Check if lock has expired
        if (this._isLockExpired(existingLock)) {
          this.logger.warn(`Lock ${lockName} expired, removing...`);
          await this._removeLock(lockRef);
        } else {
          this.logger.debug(
            `Lock ${lockName} already held by ${existingLock.pid}`
          );
          return false;
        }
      }

      // Acquire the lock - use a dummy commit if HEAD doesn't exist
      try {
        execSync(`git update-ref ${lockRef} HEAD`, {
          cwd: this.cwd,
          stdio: "pipe",
        });
      } catch (error) {
        // If HEAD doesn't exist, create a dummy commit
        execSync(`git commit --allow-empty -m "dummy commit for lock"`, {
          cwd: this.cwd,
          stdio: "pipe",
        });
        execSync(`git update-ref ${lockRef} HEAD`, {
          cwd: this.cwd,
          stdio: "pipe",
        });
      }

      // Add lock metadata as Git note
      const noteContent = JSON.stringify(lockData);
      execSync(`git notes add -f -m "${noteContent}" ${lockRef}`, {
        cwd: this.cwd,
        stdio: "pipe",
      });

      // Track active lock
      this.activeLocks.set(lockName, {
        ref: lockRef,
        data: lockData,
        acquiredAt: Date.now(),
      });

      this.logger.debug(`Lock ${lockName} acquired with ID ${lockId}`);
      return true;
    } catch (error) {
      this.logger.warn(`Failed to acquire lock ${lockName}: ${error.message}`);
      return false;
    }
  }

  /**
   * Release a lock
   * @param {string} lockName - Name of the lock
   * @returns {Promise<boolean>} True if lock released, false otherwise
   */
  async releaseLock(lockName) {
    const lockInfo = this.activeLocks.get(lockName);
    if (!lockInfo) {
      this.logger.warn(`No active lock found for ${lockName}`);
      return false;
    }

    const { ref } = lockInfo;

    try {
      // Remove the Git ref
      execSync(`git update-ref -d ${ref}`, {
        cwd: this.cwd,
        stdio: "pipe",
      });

      // Remove from active locks
      this.activeLocks.delete(lockName);

      this.logger.debug(`Lock ${lockName} released`);
      return true;
    } catch (error) {
      this.logger.warn(`Failed to release lock ${lockName}: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if a lock is held
   * @param {string} lockName - Name of the lock
   * @returns {Promise<boolean>} True if lock is held, false otherwise
   */
  async isLocked(lockName) {
    const lockRef = `${this.config.lockPrefix}/${lockName}`;

    try {
      const lockData = await this._getLockData(lockRef);
      if (!lockData) {
        return false;
      }

      // Check if lock has expired
      if (this._isLockExpired(lockData)) {
        await this._removeLock(lockRef);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.warn(`Failed to check lock ${lockName}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get lock information
   * @param {string} lockName - Name of the lock
   * @returns {Promise<object|null>} Lock data or null if not found
   */
  async getLockInfo(lockName) {
    const lockRef = `${this.config.lockPrefix}/${lockName}`;

    try {
      const lockData = await this._getLockData(lockRef);
      if (!lockData) {
        return null;
      }

      // Check if lock has expired
      if (this._isLockExpired(lockData)) {
        await this._removeLock(lockRef);
        return null;
      }

      return lockData;
    } catch (error) {
      this.logger.warn(
        `Failed to get lock info for ${lockName}: ${error.message}`
      );
      return null;
    }
  }

  /**
   * List all active locks
   * @returns {Promise<Array>} Array of lock information
   */
  async listLocks() {
    const locks = [];

    try {
      // Get all refs under the lock prefix
      const output = execSync(
        `git for-each-ref --format="%(refname)" ${this.config.lockPrefix}/*`,
        {
          cwd: this.cwd,
          stdio: "pipe",
        }
      ).toString();

      const refs = output
        .trim()
        .split("\n")
        .filter((ref) => ref);

      for (const ref of refs) {
        const lockName = ref.replace(`${this.config.lockPrefix}/`, "");
        const lockData = await this._getLockData(ref);

        if (lockData && !this._isLockExpired(lockData)) {
          locks.push({
            name: lockName,
            ref,
            ...lockData,
          });
        } else if (lockData && this._isLockExpired(lockData)) {
          // Clean up expired lock
          await this._removeLock(ref);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to list locks: ${error.message}`);
    }

    return locks;
  }

  /**
   * Clear all locks (use with caution)
   * @returns {Promise<number>} Number of locks cleared
   */
  async clearAllLocks() {
    let cleared = 0;

    try {
      // Get all refs under the lock prefix
      const output = execSync(
        `git for-each-ref --format="%(refname)" ${this.config.lockPrefix}/*`,
        {
          cwd: this.cwd,
          stdio: "pipe",
        }
      ).toString();

      const refs = output
        .trim()
        .split("\n")
        .filter((ref) => ref);

      for (const ref of refs) {
        await this._removeLock(ref);
        cleared++;
      }

      // Clear active locks tracking
      this.activeLocks.clear();
    } catch (error) {
      this.logger.warn(`Failed to clear locks: ${error.message}`);
    }

    return cleared;
  }

  /**
   * Clean up expired locks
   * @returns {Promise<number>} Number of expired locks cleaned up
   */
  async cleanupExpiredLocks() {
    let cleaned = 0;

    try {
      const locks = await this.listLocks();

      for (const lock of locks) {
        if (this._isLockExpired(lock)) {
          await this._removeLock(lock.ref);
          cleaned++;
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to cleanup expired locks: ${error.message}`);
    }

    return cleaned;
  }

  /**
   * Get lock data from Git ref
   * @private
   */
  async _getLockData(lockRef) {
    try {
      // Check if ref exists
      execSync(`git show-ref --verify --quiet ${lockRef}`, {
        cwd: this.cwd,
        stdio: "pipe",
      });

      // Get the note content
      const output = execSync(`git notes show ${lockRef}`, {
        cwd: this.cwd,
        stdio: "pipe",
      }).toString();

      return JSON.parse(output.trim());
    } catch (error) {
      return null;
    }
  }

  /**
   * Remove a lock
   * @private
   */
  async _removeLock(lockRef) {
    try {
      execSync(`git update-ref -d ${lockRef}`, {
        cwd: this.cwd,
        stdio: "pipe",
      });
    } catch (error) {
      this.logger.warn(`Failed to remove lock ${lockRef}: ${error.message}`);
    }
  }

  /**
   * Check if lock has expired
   * @private
   */
  _isLockExpired(lockData) {
    const now = Date.now();
    const acquiredAt = lockData.acquiredAt;
    const timeout = lockData.timeout || this.config.defaultTimeout;

    return now - acquiredAt > timeout;
  }

  /**
   * Generate a unique lock ID
   * @private
   */
  _generateLockId() {
    return randomBytes(8).toString("hex");
  }

  /**
   * Generate a fingerprint for lock validation
   * @private
   */
  _generateFingerprint() {
    return randomBytes(16).toString("hex");
  }

  /**
   * Validate lock fingerprint
   * @param {string} lockName - Name of the lock
   * @param {string} fingerprint - Fingerprint to validate
   * @returns {Promise<boolean>} True if fingerprint matches
   */
  async validateFingerprint(lockName, fingerprint) {
    const lockData = await this.getLockInfo(lockName);
    if (!lockData) {
      return false;
    }

    return lockData.fingerprint === fingerprint;
  }
}
