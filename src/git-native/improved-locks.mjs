/**
 * Improved Git-Native Lock Architecture
 * Using proper libraries for robust distributed locking
 */

import { createHash } from "crypto";
import { randomUUID } from "crypto";

// Option 1: Redis-based distributed locks (recommended)
import Redis from "ioredis";

// Option 2: File-based locks with proper CAS
import { promises as fs } from "fs";
import { join } from "path";

// Option 3: Database-based locks
import { Database } from "sqlite3";

/**
 * Redis-based Distributed Lock Manager
 * Provides true distributed locking across multiple processes/machines
 */
export class RedisLockManager {
  constructor(options = {}) {
    this.redis = new Redis(options.redis || { host: "localhost", port: 6379 });
    this.defaultTimeout = options.defaultTimeout || 30000;
    this.retryDelay = options.retryDelay || 100;
    this.maxRetries = options.maxRetries || 10;
  }

  /**
   * Acquire lock with automatic retry and timeout
   * @param {string} lockName
   * @param {Object} options
   * @returns {Promise<boolean>}
   */
  async acquireLock(lockName, options = {}) {
    const timeout = options.timeout || this.defaultTimeout;
    const fingerprint = options.fingerprint || randomUUID();
    const lockKey = `gitvan:lock:${lockName}`;

    const lockValue = JSON.stringify({
      id: randomUUID(),
      acquiredAt: Date.now(),
      timeout,
      fingerprint,
      pid: process.pid,
      exclusive: options.exclusive !== false,
    });

    // Use Redis SET with NX (only if not exists) and EX (expiration)
    const result = await this.redis.set(
      lockKey,
      lockValue,
      "PX",
      timeout, // Expire in milliseconds
      "NX" // Only set if not exists
    );

    return result === "OK";
  }

  /**
   * Release lock with fingerprint validation
   * @param {string} lockName
   * @param {string} fingerprint
   * @returns {Promise<boolean>}
   */
  async releaseLock(lockName, fingerprint) {
    const lockKey = `gitvan:lock:${lockName}`;

    // Use Lua script for atomic check-and-delete
    const luaScript = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      else
        return 0
      end
    `;

    const result = await this.redis.eval(luaScript, 1, lockKey, fingerprint);
    return result === 1;
  }

  /**
   * Extend lock timeout
   * @param {string} lockName
   * @param {string} fingerprint
   * @param {number} additionalTime
   * @returns {Promise<boolean>}
   */
  async extendLock(lockName, fingerprint, additionalTime) {
    const lockKey = `gitvan:lock:${lockName}`;

    const luaScript = `
      local current = redis.call("GET", KEYS[1])
      if current == ARGV[1] then
        return redis.call("EXPIRE", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;

    const result = await this.redis.eval(
      luaScript,
      1,
      lockKey,
      fingerprint,
      Math.ceil(additionalTime / 1000)
    );
    return result === 1;
  }

  /**
   * List all active locks
   * @returns {Promise<Array>}
   */
  async listLocks() {
    const keys = await this.redis.keys("gitvan:lock:*");
    const locks = [];

    for (const key of keys) {
      const value = await this.redis.get(key);
      if (value) {
        const lockData = JSON.parse(value);
        locks.push({
          name: key.replace("gitvan:lock:", ""),
          ...lockData,
        });
      }
    }

    return locks;
  }
}

/**
 * File-based Lock Manager with proper CAS
 * Uses atomic file operations for single-machine locking
 */
export class FileLockManager {
  constructor(options = {}) {
    this.lockDir = options.lockDir || ".gitvan/locks";
    this.defaultTimeout = options.defaultTimeout || 30000;
  }

  /**
   * Acquire lock using atomic file creation
   * @param {string} lockName
   * @param {Object} options
   * @returns {Promise<boolean>}
   */
  async acquireLock(lockName, options = {}) {
    const lockFile = join(this.lockDir, `${lockName}.lock`);
    const lockData = {
      id: randomUUID(),
      acquiredAt: Date.now(),
      timeout: options.timeout || this.defaultTimeout,
      fingerprint: options.fingerprint || randomUUID(),
      pid: process.pid,
      exclusive: options.exclusive !== false,
    };

    try {
      // Atomic file creation - fails if file exists
      await fs.writeFile(lockFile, JSON.stringify(lockData), { flag: "wx" });
      return true;
    } catch (error) {
      if (error.code === "EEXIST") {
        // Check if lock is expired
        const isExpired = await this._isLockExpired(lockFile);
        if (isExpired) {
          await this._removeExpiredLock(lockFile);
          // Retry once
          try {
            await fs.writeFile(lockFile, JSON.stringify(lockData), {
              flag: "wx",
            });
            return true;
          } catch (retryError) {
            return false;
          }
        }
      }
      return false;
    }
  }

  /**
   * Release lock with fingerprint validation
   * @param {string} lockName
   * @param {string} fingerprint
   * @returns {Promise<boolean>}
   */
  async releaseLock(lockName, fingerprint) {
    const lockFile = join(this.lockDir, `${lockName}.lock`);

    try {
      const content = await fs.readFile(lockFile, "utf8");
      const lockData = JSON.parse(content);

      if (lockData.fingerprint === fingerprint) {
        await fs.unlink(lockFile);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if lock is expired
   * @private
   */
  async _isLockExpired(lockFile) {
    try {
      const content = await fs.readFile(lockFile, "utf8");
      const lockData = JSON.parse(content);
      return Date.now() - lockData.acquiredAt > lockData.timeout;
    } catch (error) {
      return true;
    }
  }

  /**
   * Remove expired lock
   * @private
   */
  async _removeExpiredLock(lockFile) {
    try {
      await fs.unlink(lockFile);
    } catch (error) {
      // Ignore errors
    }
  }
}

/**
 * Database-based Lock Manager
 * Uses SQLite with proper transactions for locking
 */
export class DatabaseLockManager {
  constructor(options = {}) {
    this.dbPath = options.dbPath || ".gitvan/locks.db";
    this.defaultTimeout = options.defaultTimeout || 30000;
    this.db = null;
  }

  async initialize() {
    this.db = new Database(this.dbPath);

    // Create locks table
    await new Promise((resolve, reject) => {
      this.db.run(
        `
        CREATE TABLE IF NOT EXISTS locks (
          name TEXT PRIMARY KEY,
          id TEXT NOT NULL,
          acquired_at INTEGER NOT NULL,
          timeout INTEGER NOT NULL,
          fingerprint TEXT NOT NULL,
          pid INTEGER NOT NULL,
          exclusive BOOLEAN NOT NULL DEFAULT 1
        )
      `,
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * Acquire lock using database transaction
   * @param {string} lockName
   * @param {Object} options
   * @returns {Promise<boolean>}
   */
  async acquireLock(lockName, options = {}) {
    const lockData = {
      id: randomUUID(),
      acquiredAt: Date.now(),
      timeout: options.timeout || this.defaultTimeout,
      fingerprint: options.fingerprint || randomUUID(),
      pid: process.pid,
      exclusive: options.exclusive !== false,
    };

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run("BEGIN TRANSACTION");

        // Check if lock exists and is expired
        this.db.get(
          "SELECT * FROM locks WHERE name = ?",
          [lockName],
          (err, row) => {
            if (err) {
              this.db.run("ROLLBACK");
              reject(err);
              return;
            }

            if (row) {
              // Check if expired
              if (Date.now() - row.acquired_at > row.timeout) {
                // Remove expired lock
                this.db.run(
                  "DELETE FROM locks WHERE name = ?",
                  [lockName],
                  (err) => {
                    if (err) {
                      this.db.run("ROLLBACK");
                      reject(err);
                      return;
                    }

                    // Insert new lock
                    this.db.run(
                      "INSERT INTO locks (name, id, acquired_at, timeout, fingerprint, pid, exclusive) VALUES (?, ?, ?, ?, ?, ?, ?)",
                      [
                        lockName,
                        lockData.id,
                        lockData.acquiredAt,
                        lockData.timeout,
                        lockData.fingerprint,
                        lockData.pid,
                        lockData.exclusive,
                      ],
                      function (err) {
                        if (err) {
                          this.db.run("ROLLBACK");
                          reject(err);
                        } else {
                          this.db.run("COMMIT");
                          resolve(true);
                        }
                      }
                    );
                  }
                );
              } else {
                // Lock exists and not expired
                this.db.run("ROLLBACK");
                resolve(false);
              }
            } else {
              // No existing lock, insert new one
              this.db.run(
                "INSERT INTO locks (name, id, acquired_at, timeout, fingerprint, pid, exclusive) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [
                  lockName,
                  lockData.id,
                  lockData.acquiredAt,
                  lockData.timeout,
                  lockData.fingerprint,
                  lockData.pid,
                  lockData.exclusive,
                ],
                function (err) {
                  if (err) {
                    this.db.run("ROLLBACK");
                    reject(err);
                  } else {
                    this.db.run("COMMIT");
                    resolve(true);
                  }
                }
              );
            }
          }
        );
      });
    });
  }

  /**
   * Release lock with fingerprint validation
   * @param {string} lockName
   * @param {string} fingerprint
   * @returns {Promise<boolean>}
   */
  async releaseLock(lockName, fingerprint) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "DELETE FROM locks WHERE name = ? AND fingerprint = ?",
        [lockName, fingerprint],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes > 0);
          }
        }
      );
    });
  }
}

/**
 * Hybrid Lock Manager
 * Combines multiple strategies for maximum reliability
 */
export class HybridLockManager {
  constructor(options = {}) {
    this.strategies = [];

    // Add Redis if available
    if (options.redis) {
      this.strategies.push(new RedisLockManager(options));
    }

    // Add file-based as fallback
    this.strategies.push(new FileLockManager(options));

    // Add database as final fallback
    this.strategies.push(new DatabaseLockManager(options));
  }

  async initialize() {
    for (const strategy of this.strategies) {
      if (strategy.initialize) {
        await strategy.initialize();
      }
    }
  }

  /**
   * Try each strategy until one succeeds
   * @param {string} lockName
   * @param {Object} options
   * @returns {Promise<boolean>}
   */
  async acquireLock(lockName, options = {}) {
    for (const strategy of this.strategies) {
      try {
        const acquired = await strategy.acquireLock(lockName, options);
        if (acquired) {
          this._activeStrategy = strategy;
          return true;
        }
      } catch (error) {
        console.warn(`Lock strategy failed: ${error.message}`);
        continue;
      }
    }
    return false;
  }

  /**
   * Release lock using the same strategy that acquired it
   * @param {string} lockName
   * @param {string} fingerprint
   * @returns {Promise<boolean>}
   */
  async releaseLock(lockName, fingerprint) {
    if (this._activeStrategy) {
      return this._activeStrategy.releaseLock(lockName, fingerprint);
    }
    return false;
  }
}

// Export the recommended implementation
export { RedisLockManager as LockManager };
