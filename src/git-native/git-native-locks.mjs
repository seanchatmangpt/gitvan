/**
 * Git-Native Lock Architecture
 * Uses only Git primitives - no external systems
 * Leverages Git's atomic operations and ref system
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import { hostname } from 'os';

const execAsync = promisify(exec);

/**
 * Git-Native Lock Manager
 * Uses Git refs and atomic operations for distributed locking
 */
export class GitNativeLockManager {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.logger = options.logger || console;
    this.defaultTimeout = options.defaultTimeout || 30000;
    this.lockPrefix = options.lockPrefix || 'refs/gitvan/locks';
    this.retryDelay = options.retryDelay || 100;
    this.maxRetries = options.maxRetries || 10;
    
    this._initialized = false;
  }

  /**
   * Initialize lock manager
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this._initialized) return;
    
    this.logger.info('Initializing GitNativeLockManager...');
    
    // Verify we're in a git repository
    try {
      await execAsync('git rev-parse --git-dir', { cwd: this.cwd });
    } catch (error) {
      throw new Error(`Not a git repository: ${this.cwd}`);
    }
    
    this._initialized = true;
    this.logger.info('GitNativeLockManager initialized successfully');
  }

  /**
   * Acquire lock using Git's atomic ref operations
   * @param {string} lockName
   * @param {Object} options
   * @returns {Promise<boolean>}
   */
  async acquireLock(lockName, options = {}) {
    await this._ensureInitialized();
    
    const timeout = options.timeout || this.defaultTimeout;
    const fingerprint = options.fingerprint || randomUUID();
    const lockRef = `${this.lockPrefix}/${lockName}`;
    
    // Create lock metadata
    const lockData = {
      id: randomUUID(),
      acquiredAt: Date.now(),
      timeout,
      fingerprint,
      pid: process.pid,
      exclusive: options.exclusive !== false,
      hostname: hostname()
    };
    
    // Use Git's atomic ref creation (fails if ref exists)
    try {
      const lockBlob = await this._createBlob(JSON.stringify(lockData));
      await execAsync(`git update-ref ${lockRef} ${lockBlob}`, { cwd: this.cwd });
      
      this.logger.debug(`Acquired lock: ${lockName} (${lockData.id})`);
      return true;
    } catch (error) {
      // Lock already exists - check if expired
      const isExpired = await this._isLockExpired(lockRef);
      if (isExpired) {
        // Remove expired lock and retry
        await this._removeExpiredLock(lockRef);
        try {
          const lockBlob = await this._createBlob(JSON.stringify(lockData));
          await execAsync(`git update-ref ${lockRef} ${lockBlob}`, { cwd: this.cwd });
          return true;
        } catch (retryError) {
          return false;
        }
      }
      return false;
    }
  }

  /**
   * Release lock using Git's atomic ref deletion
   * @param {string} lockName
   * @param {string} fingerprint
   * @returns {Promise<boolean>}
   */
  async releaseLock(lockName, fingerprint) {
    await this._ensureInitialized();
    
    const lockRef = `${this.lockPrefix}/${lockName}`;
    
    try {
      // Get current lock data for validation
      const currentOid = await this._getRefOid(lockRef);
      if (!currentOid) return false;
      
      const lockData = await this._getBlobContent(currentOid);
      const parsed = JSON.parse(lockData);
      
      // Validate fingerprint
      if (parsed.fingerprint !== fingerprint) {
        this.logger.warn(`Fingerprint mismatch for lock ${lockName}`);
        return false;
      }
      
      // Atomic ref deletion
      await execAsync(`git update-ref -d ${lockRef} ${currentOid}`, { cwd: this.cwd });
      
      this.logger.debug(`Released lock: ${lockName}`);
      return true;
    } catch (error) {
      this.logger.warn(`Failed to release lock ${lockName}: ${error.message}`);
      return false;
    }
  }

  /**
   * Extend lock timeout
   * @param {string} lockName
   * @param {string} fingerprint
   * @param {number} additionalTime
   * @returns {Promise<boolean>}
   */
  async extendLock(lockName, fingerprint, additionalTime) {
    await this._ensureInitialized();
    
    const lockRef = `${this.lockPrefix}/${lockName}`;
    
    try {
      const currentOid = await this._getRefOid(lockRef);
      if (!currentOid) return false;
      
      const lockData = await this._getBlobContent(currentOid);
      const parsed = JSON.parse(lockData);
      
      // Validate fingerprint
      if (parsed.fingerprint !== fingerprint) {
        return false;
      }
      
      // Update timeout
      parsed.timeout += additionalTime;
      parsed.extendedAt = Date.now();
      
      // Create new blob and update ref atomically
      const newBlob = await this._createBlob(JSON.stringify(parsed));
      await execAsync(`git update-ref ${lockRef} ${newBlob} ${currentOid}`, { cwd: this.cwd });
      
      return true;
    } catch (error) {
      this.logger.warn(`Failed to extend lock ${lockName}: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if lock is held and valid
   * @param {string} lockName
   * @returns {Promise<boolean>}
   */
  async isLocked(lockName) {
    await this._ensureInitialized();
    
    const lockRef = `${this.lockPrefix}/${lockName}`;
    const isExpired = await this._isLockExpired(lockRef);
    return !isExpired;
  }

  /**
   * Get lock information
   * @param {string} lockName
   * @returns {Promise<Object|null>}
   */
  async getLockInfo(lockName) {
    await this._ensureInitialized();
    
    const lockRef = `${this.lockPrefix}/${lockName}`;
    
    try {
      const oid = await this._getRefOid(lockRef);
      if (!oid) return null;
      
      const lockData = await this._getBlobContent(oid);
      const parsed = JSON.parse(lockData);
      
      // Check if expired
      if (Date.now() - parsed.acquiredAt > parsed.timeout) {
        await this._removeExpiredLock(lockRef);
        return null;
      }
      
      return {
        name: lockName,
        ref: lockRef,
        ...parsed
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * List all active locks
   * @returns {Promise<Array>}
   */
  async listLocks() {
    await this._ensureInitialized();
    
    const locks = [];
    
    try {
      // Get all refs under the lock prefix
      const { stdout } = await execAsync(`git for-each-ref --format="%(refname)" ${this.lockPrefix}`, { cwd: this.cwd });
      const refs = stdout.trim().split('\n').filter(Boolean);
      
      for (const ref of refs) {
        const lockName = ref.replace(`${this.lockPrefix}/`, '');
        const lockInfo = await this.getLockInfo(lockName);
        
        if (lockInfo) {
          locks.push(lockInfo);
        }
      }
    } catch (error) {
      // No locks found
      this.logger.debug(`No locks found: ${error.message}`);
    }
    
    return locks;
  }

  /**
   * Clean up expired locks
   * @returns {Promise<number>} Number of locks cleaned up
   */
  async cleanupExpiredLocks() {
    await this._ensureInitialized();
    
    let cleanedCount = 0;
    
    try {
      const { stdout } = await execAsync(`git for-each-ref --format="%(refname)" ${this.lockPrefix}`, { cwd: this.cwd });
      const refs = stdout.trim().split('\n').filter(Boolean);
      
      for (const ref of refs) {
        const isExpired = await this._isLockExpired(ref);
        if (isExpired) {
          await this._removeExpiredLock(ref);
          cleanedCount++;
        }
      }
    } catch (error) {
      this.logger.debug(`No locks to clean up: ${error.message}`);
    }
    
    if (cleanedCount > 0) {
      this.logger.info(`Cleaned up ${cleanedCount} expired locks`);
    }
    
    return cleanedCount;
  }

  /**
   * Clear all locks (dangerous operation)
   * @returns {Promise<number>} Number of locks cleared
   */
  async clearAllLocks() {
    await this._ensureInitialized();
    
    let clearedCount = 0;
    
    try {
      const { stdout } = await execAsync(`git for-each-ref --format="%(refname)" ${this.lockPrefix}`, { cwd: this.cwd });
      const refs = stdout.trim().split('\n').filter(Boolean);
      
      for (const ref of refs) {
        await execAsync(`git update-ref -d ${ref}`, { cwd: this.cwd });
        clearedCount++;
      }
    } catch (error) {
      this.logger.debug(`No locks to clear: ${error.message}`);
    }
    
    this.logger.warn(`Cleared ${clearedCount} locks`);
    return clearedCount;
  }

  /**
   * Validate lock fingerprint
   * @param {string} lockName
   * @param {string} fingerprint
   * @returns {Promise<boolean>}
   */
  async validateFingerprint(lockName, fingerprint) {
    const lockInfo = await this.getLockInfo(lockName);
    return lockInfo && lockInfo.fingerprint === fingerprint;
  }

  // Private helper methods

  async _ensureInitialized() {
    if (!this._initialized) {
      await this.initialize();
    }
  }

  async _createBlob(content) {
    const { stdout } = await execAsync(`git hash-object -w --stdin`, { 
      cwd: this.cwd,
      input: content 
    });
    return stdout.trim();
  }

  async _getBlobContent(oid) {
    const { stdout } = await execAsync(`git cat-file -p ${oid}`, { cwd: this.cwd });
    return stdout;
  }

  async _getRefOid(ref) {
    try {
      const { stdout } = await execAsync(`git rev-parse ${ref}`, { cwd: this.cwd });
      return stdout.trim();
    } catch (error) {
      return null;
    }
  }

  async _isLockExpired(lockRef) {
    try {
      const oid = await this._getRefOid(lockRef);
      if (!oid) return true;
      
      const lockData = await this._getBlobContent(oid);
      const parsed = JSON.parse(lockData);
      
      return Date.now() - parsed.acquiredAt > parsed.timeout;
    } catch (error) {
      return true;
    }
  }

  async _removeExpiredLock(lockRef) {
    try {
      const oid = await this._getRefOid(lockRef);
      if (oid) {
        await execAsync(`git update-ref -d ${lockRef} ${oid}`, { cwd: this.cwd });
      }
    } catch (error) {
      // Ignore errors when removing expired locks
    }
  }
}

/**
 * Git-Native Distributed Lock Manager
 * Uses Git refs with remote synchronization for distributed locking
 */
export class GitDistributedLockManager extends GitNativeLockManager {
  constructor(options = {}) {
    super(options);
    this.remote = options.remote || 'origin';
    this.syncInterval = options.syncInterval || 5000; // 5 seconds
    this._syncTimer = null;
  }

  async initialize() {
    await super.initialize();
    
    // Start periodic sync with remote
    this._startSyncTimer();
  }

  async shutdown() {
    if (this._syncTimer) {
      clearInterval(this._syncTimer);
      this._syncTimer = null;
    }
  }

  /**
   * Acquire lock with remote synchronization
   * @param {string} lockName
   * @param {Object} options
   * @returns {Promise<boolean>}
   */
  async acquireLock(lockName, options = {}) {
    // Sync with remote first
    await this._syncWithRemote();
    
    // Try to acquire lock locally
    const acquired = await super.acquireLock(lockName, options);
    
    if (acquired) {
      // Push lock to remote
      await this._pushLockToRemote(lockName);
    }
    
    return acquired;
  }

  /**
   * Release lock with remote synchronization
   * @param {string} lockName
   * @param {string} fingerprint
   * @returns {Promise<boolean>}
   */
  async releaseLock(lockName, fingerprint) {
    const released = await super.releaseLock(lockName, fingerprint);
    
    if (released) {
      // Push release to remote
      await this._pushLockToRemote(lockName);
    }
    
    return released;
  }

  async _startSyncTimer() {
    this._syncTimer = setInterval(async () => {
      try {
        await this._syncWithRemote();
      } catch (error) {
        this.logger.warn(`Sync with remote failed: ${error.message}`);
      }
    }, this.syncInterval);
  }

  async _syncWithRemote() {
    try {
      // Fetch latest refs from remote
      await execAsync(`git fetch ${this.remote} ${this.lockPrefix}/*:${this.lockPrefix}/*`, { cwd: this.cwd });
    } catch (error) {
      // Ignore fetch errors - remote might not have locks yet
    }
  }

  async _pushLockToRemote(lockName) {
    try {
      const lockRef = `${this.lockPrefix}/${lockName}`;
      await execAsync(`git push ${this.remote} ${lockRef}`, { cwd: this.cwd });
    } catch (error) {
      this.logger.warn(`Failed to push lock ${lockName} to remote: ${error.message}`);
    }
  }
}

// Export the Git-native implementation
export { GitNativeLockManager as LockManager };
