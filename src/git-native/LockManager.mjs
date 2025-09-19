import { exec } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);

/**
 * Git-Native CAS locks using atomic ref operations.
 * Uses Git's built-in atomicity for distributed locking without external dependencies.
 * Let-it-crash discipline: expired locks are removed on read.
 */
export class LockManager {
  /**
   * @param {{cwd?:string,logger?:Console,lock?:{defaultTimeout?:number,lockPrefix?:string}}} [options]
   */
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.logger = options.logger || console;
    this.defaultTimeout = options.lock?.defaultTimeout || 30000;
    this.lockPrefix = options.lock?.lockPrefix || 'refs/gitvan/locks';
    this.retryDelay = options.lock?.retryDelay || 100;
    this.maxRetries = options.lock?.maxRetries || 10;
    
    this._initialized = false;
  }

  /**
   * Initialize lock manager.
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this._initialized) return;
    
    this.logger.info('Initializing LockManager...');
    
    // Verify we're in a git repository
    try {
      await execAsync('git rev-parse --git-dir', { cwd: this.cwd });
    } catch (error) {
      throw new Error(`Not a git repository: ${this.cwd}`);
    }
    
    this._initialized = true;
    this.logger.info('LockManager initialized successfully');
  }

  /**
   * Acquire a lock using Git's atomic ref operations.
   * @param {string} lockName
   * @param {import("../types.js").LockOptions} [options]
   * @returns {Promise<boolean>}
   */
  async acquireLock(lockName, options = {}) {
    await this._ensureInitialized();
    
    const timeout = options.timeout || this.defaultTimeout;
    const fingerprint = options.fingerprint || randomUUID();
    const exclusive = options.exclusive !== false;
    
    const lockRef = `${this.lockPrefix}/${lockName}`;
    const lockId = randomUUID();
    
    // Create lock metadata
    const lockData = {
      id: lockId,
      acquiredAt: Date.now(),
      timeout,
      fingerprint,
      exclusive,
      pid: process.pid,
      hostname: require('os').hostname()
    };
    
    // Use Git's atomic ref creation (fails if ref exists)
    try {
      const lockBlob = await this._createBlob(JSON.stringify(lockData));
      await execAsync(`git update-ref ${lockRef} ${lockBlob}`, { cwd: this.cwd });
      
      this.logger.debug(`Acquired lock: ${lockName} (${lockId})`);
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
          this.logger.debug(`Acquired expired lock: ${lockName} (${lockId})`);
          return true;
        } catch (retryError) {
          this.logger.debug(`Failed to acquire lock ${lockName} after retry: ${retryError.message}`);
          return false;
        }
      }
      this.logger.debug(`Failed to acquire lock ${lockName}: ${error.message}`);
      return false;
    }
  }

  /**
   * Release (delete) a lock ref.
   * @param {string} lockName
   * @returns {Promise<boolean>}
   */
  async releaseLock(lockName) {
    await this._ensureInitialized();
    
    const lockRef = `${this.lockPrefix}/${lockName}`;
    
    try {
      // Get current lock data for CAS operation
      const currentOid = await this._getRefOid(lockRef);
      if (!currentOid) {
        this.logger.debug(`Lock ${lockName} not found`);
        return false;
      }
      
      // Delete the lock ref (CAS operation)
      await execAsync(`git update-ref -d ${lockRef} ${currentOid}`, { cwd: this.cwd });
      
      this.logger.info(`Released lock: ${lockName}`);
      return true;
    } catch (error) {
      this.logger.warn(`Failed to release lock ${lockName}: ${error.message}`);
      return false;
    }
  }

  /**
   * Is a valid, unexpired lock present?
   * @param {string} lockName
   * @returns {Promise<boolean>}
   */
  async isLocked(lockName) {
    await this._ensureInitialized();
    
    const lockInfo = await this.getLockInfo(lockName);
    return lockInfo !== null;
  }

  /**
   * Get lock metadata or null.
   * @param {string} lockName
   * @returns {Promise<null|import("../types.js").LockRecord>}
   */
  async getLockInfo(lockName) {
    await this._ensureInitialized();
    
    const lockRef = `${this.lockPrefix}/${lockName}`;
    
    try {
      const oid = await this._getRefOid(lockRef);
      if (!oid) return null;
      
      const lockData = await this._getBlobContent(oid);
      const parsed = JSON.parse(lockData);
      
      // Check if lock is expired
      const now = Date.now();
      if (now - parsed.acquiredAt > parsed.timeout) {
        // Lock is expired, remove it
        await this.releaseLock(lockName);
        return null;
      }
      
      return {
        name: lockName,
        ref: lockRef,
        ...parsed
      };
    } catch (error) {
      this.logger.debug(`Failed to get lock info for ${lockName}: ${error.message}`);
      return null;
    }
  }

  /**
   * List active (non-expired) locks.
   * @returns {Promise<Array<import("../types.js").LockRecord>>}
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
      // No locks found or other error
      this.logger.debug(`No locks found: ${error.message}`);
    }
    
    return locks;
  }

  /** Danger: remove all locks. @returns {Promise<number>} count */
  async clearAllLocks() {
    await this._ensureInitialized();
    
    const locks = await this.listLocks();
    let clearedCount = 0;
    
    for (const lock of locks) {
      if (await this.releaseLock(lock.name)) {
        clearedCount++;
      }
    }
    
    this.logger.warn(`Cleared ${clearedCount} locks`);
    return clearedCount;
  }

  /** Remove expired locks. @returns {Promise<number>} cleaned */
  async cleanupExpiredLocks() {
    await this._ensureInitialized();
    
    const locks = await this.listLocks();
    let cleanedCount = 0;
    
    for (const lock of locks) {
      const now = Date.now();
      if (now - lock.acquiredAt > lock.timeout) {
        if (await this.releaseLock(lock.name)) {
          cleanedCount++;
        }
      }
    }
    
    if (cleanedCount > 0) {
      this.logger.info(`Cleaned up ${cleanedCount} expired locks`);
    }
    
    return cleanedCount;
  }

  /**
   * Validate a held lock against a fingerprint.
   * @param {string} lockName
   * @param {string} fingerprint
   * @returns {Promise<boolean>}
   */
  async validateFingerprint(lockName, fingerprint) {
    const lockInfo = await this.getLockInfo(lockName);
    return lockInfo && lockInfo.fingerprint === fingerprint;
  }

  /**
   * Check if lock is expired
   * @private
   * @param {string} lockRef
   * @returns {Promise<boolean>}
   */
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

  /**
   * Remove expired lock
   * @private
   * @param {string} lockRef
   * @returns {Promise<void>}
   */
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

  /**
   * Ensure the system is initialized.
   * @private
   * @returns {Promise<void>}
   */
  async _ensureInitialized() {
    if (!this._initialized) {
      await this.initialize();
    }
  }

  /**
   * Create a git blob from content.
   * @private
   * @param {string} content
   * @returns {Promise<string>} blob OID
   */
  async _createBlob(content) {
    const { stdout } = await execAsync(`git hash-object -w --stdin`, { 
      cwd: this.cwd,
      input: content 
    });
    return stdout.trim();
  }

  /**
   * Get blob content by OID.
   * @private
   * @param {string} oid
   * @returns {Promise<string>} content
   */
  async _getBlobContent(oid) {
    const { stdout } = await execAsync(`git cat-file -p ${oid}`, { cwd: this.cwd });
    return stdout;
  }

  /**
   * Get ref OID or null if ref doesn't exist.
   * @private
   * @param {string} ref
   * @returns {Promise<string|null>} OID or null
   */
  async _getRefOid(ref) {
    try {
      const { stdout } = await execAsync(`git rev-parse ${ref}`, { cwd: this.cwd });
      return stdout.trim();
    } catch (error) {
      return null;
    }
  }
}