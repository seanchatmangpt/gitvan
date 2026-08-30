import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { hostname } from "node:os";

const execFileAsync = promisify(execFile);
const ZERO_OID = "0".repeat(40);

/**
 * Git-Native CAS locks using atomic ref operations.
 * Uses Git's built-in atomicity for distributed locking without external dependencies.
 * Let-it-crash discipline: expired locks are removed on read.
 */
export class LockManager {
  /**
   * @param {{cwd?:string,logger?:Console,lock?:{defaultTimeout?:number,lockPrefix?:string,retryDelay?:number,maxRetries?:number}}} [options]
   */
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.logger = options.logger || console;
    this.defaultTimeout = options.lock?.defaultTimeout || 30000;
    this.lockPrefix = options.lock?.lockPrefix || "refs/gitvan/locks";
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

    this.logger.info("Initializing LockManager...");

    try {
      await this._git(["rev-parse", "--git-dir"]);
    } catch {
      throw new Error(`Not a git repository: ${this.cwd}`);
    }

    this._initialized = true;
    this.logger.info("LockManager initialized successfully");
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
    const lockRef = this._lockRef(lockName);
    const lockId = randomUUID();

    await this._validateRef(lockRef);

    const lockData = {
      id: lockId,
      acquiredAt: Date.now(),
      timeout,
      fingerprint,
      exclusive,
      pid: process.pid,
      hostname: hostname(),
    };

    if (!exclusive) {
      const current = await this.getLockInfo(lockName);
      if (current) {
        // Preserve the historical boolean API: an existing non-exclusive
        // admission permits another non-exclusive caller, but never bypass an
        // exclusive holder. This API does not expose per-holder release tokens.
        return current.exclusive === false;
      }
    }

    try {
      const lockBlob = await this._createBlob(JSON.stringify(lockData));
      await this._createRefCAS(lockRef, lockBlob);
      this.logger.debug(`Acquired lock: ${lockName} (${lockId})`);
      return true;
    } catch (error) {
      const isExpired = await this._isLockExpired(lockRef);
      if (!isExpired) {
        this.logger.debug(`Failed to acquire lock ${lockName}: ${error.message}`);
        return false;
      }

      await this._removeExpiredLock(lockRef);
      try {
        const lockBlob = await this._createBlob(JSON.stringify(lockData));
        await this._createRefCAS(lockRef, lockBlob);
        this.logger.debug(`Acquired expired lock: ${lockName} (${lockId})`);
        return true;
      } catch (retryError) {
        this.logger.debug(
          `Failed to acquire lock ${lockName} after retry: ${retryError.message}`
        );
        return false;
      }
    }
  }

  /**
   * Release (delete) a lock ref.
   * @param {string} lockName
   * @returns {Promise<boolean>}
   */
  async releaseLock(lockName) {
    await this._ensureInitialized();

    const lockRef = this._lockRef(lockName);
    await this._validateRef(lockRef);

    try {
      const currentOid = await this._getRefOid(lockRef);
      if (!currentOid) {
        this.logger.debug(`Lock ${lockName} not found`);
        return false;
      }

      await this._git(["update-ref", "-d", lockRef, currentOid]);
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

    const lockRef = this._lockRef(lockName);
    await this._validateRef(lockRef);

    try {
      const oid = await this._getRefOid(lockRef);
      if (!oid) return null;

      const lockData = await this._getBlobContent(oid);
      const parsed = JSON.parse(lockData);

      if (Date.now() - parsed.acquiredAt > parsed.timeout) {
        await this.releaseLock(lockName);
        return null;
      }

      return {
        name: lockName,
        ref: lockRef,
        ...parsed,
      };
    } catch (error) {
      this.logger.debug(
        `Failed to get lock info for ${lockName}: ${error.message}`
      );
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
      const { stdout } = await this._git([
        "for-each-ref",
        "--format=%(refname)",
        this.lockPrefix,
      ]);
      const refs = stdout.trim().split("\n").filter(Boolean);

      for (const ref of refs) {
        const lockName = ref.replace(`${this.lockPrefix}/`, "");
        const lockInfo = await this.getLockInfo(lockName);
        if (lockInfo) locks.push(lockInfo);
      }
    } catch (error) {
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
      if (await this.releaseLock(lock.name)) clearedCount++;
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
      if (Date.now() - lock.acquiredAt > lock.timeout) {
        if (await this.releaseLock(lock.name)) cleanedCount++;
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
    return Boolean(lockInfo && lockInfo.fingerprint === fingerprint);
  }

  async _isLockExpired(lockRef) {
    try {
      const oid = await this._getRefOid(lockRef);
      if (!oid) return true;
      const lockData = await this._getBlobContent(oid);
      const parsed = JSON.parse(lockData);
      return Date.now() - parsed.acquiredAt > parsed.timeout;
    } catch {
      return true;
    }
  }

  async _removeExpiredLock(lockRef) {
    try {
      const oid = await this._getRefOid(lockRef);
      if (oid) await this._git(["update-ref", "-d", lockRef, oid]);
    } catch {
      // Another contender may have removed or replaced the stale ref.
    }
  }

  async _ensureInitialized() {
    if (!this._initialized) await this.initialize();
  }

  _lockRef(lockName) {
    if (typeof lockName !== "string" || lockName.length === 0) {
      throw new Error("Lock name must be a non-empty string");
    }
    return `${this.lockPrefix}/${lockName}`;
  }

  async _validateRef(ref) {
    try {
      await this._git(["check-ref-format", ref]);
    } catch {
      throw new Error(`Invalid lock ref: ${ref}`);
    }
  }

  async _createRefCAS(ref, oid) {
    await this._git(["update-ref", ref, oid, ZERO_OID]);
  }

  async _createBlob(content) {
    return new Promise((resolve, reject) => {
      const child = spawn("git", ["hash-object", "-w", "--stdin"], {
        cwd: this.cwd,
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(
            new Error(
              `git hash-object failed with exit ${code}: ${stderr.trim()}`
            )
          );
        }
      });
      child.stdin.end(content, "utf8");
    });
  }

  async _getBlobContent(oid) {
    const { stdout } = await this._git(["cat-file", "-p", oid]);
    return stdout;
  }

  async _getRefOid(ref) {
    try {
      const { stdout } = await this._git(["rev-parse", "--verify", ref]);
      return stdout.trim();
    } catch {
      return null;
    }
  }

  async _git(args) {
    return execFileAsync("git", args, {
      cwd: this.cwd,
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    });
  }
}
