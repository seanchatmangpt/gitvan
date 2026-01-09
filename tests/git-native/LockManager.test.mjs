import { test, describe, beforeEach, afterEach, expect } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { LockManager } from '../../src/git-native/LockManager.mjs';
import { createTestContext } from '../helpers/context.mjs';
import { cleanupGitRefs, getGitLocks } from '../helpers/helpers.mjs';

const execAsync = promisify(exec);

/**
 * Cleanup all git lock refs
 * @param {string} cwd - Repository directory
 */
async function cleanupAllLockRefs(cwd) {
  try {
    const { stdout } = await execAsync(
      'git for-each-ref --format="%(refname)" refs/gitvan/locks',
      { cwd }
    );
    const refs = stdout.trim().split('\n').filter(Boolean);

    for (const ref of refs) {
      try {
        const { stdout: oid } = await execAsync(`git rev-parse "${ref}"`, { cwd });
        await execAsync(`git update-ref -d "${ref}" "${oid.trim()}"`, { cwd });
      } catch (error) {
        // Ignore individual ref deletion errors
      }
    }
  } catch (error) {
    // No refs found or error listing them
  }
}

describe('LockManager Tests', () => {
  let testDir;
  let lockManager;

  beforeEach(async () => {
    const testContext = await createTestContext();
    testDir = testContext.cwd;

    lockManager = new LockManager({
      cwd: testDir,
      logger: console
    });

    await lockManager.initialize();
  });

  afterEach(async () => {
    try {
      // Release all held locks first
      const locks = await lockManager.listLocks();
      for (const lock of locks) {
        await lockManager.releaseLock(lock.name).catch(() => {});
      }

      // Clean up all lock refs
      await cleanupAllLockRefs(testDir);

      // Remove test directory
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to clean up test: ${error.message}`);
    }
  });

  test('should initialize successfully', async () => {
    expect(lockManager).toBeDefined();
  });

  test('should acquire and release locks', async () => {
    const lockName = 'test-lock';
    
    // Acquire lock
    const acquired = await lockManager.acquireLock(lockName);
    expect(acquired).toBe(true);
    
    // Check if locked
    const isLocked = await lockManager.isLocked(lockName);
    expect(isLocked).toBe(true);
    
    // Release lock
    const released = await lockManager.releaseLock(lockName);
    expect(released).toBe(true);
    
    // Check if unlocked
    const isUnlocked = await lockManager.isLocked(lockName);
    expect(isUnlocked).toBe(false);
  });

  test('should prevent double lock acquisition', async () => {
    const lockName = 'exclusive-lock';
    
    // First acquisition should succeed
    const firstAcquired = await lockManager.acquireLock(lockName);
    expect(firstAcquired).toBe(true);
    
    // Second acquisition should fail
    const secondAcquired = await lockManager.acquireLock(lockName);
    expect(secondAcquired).toBe(false);
    
    // Release and try again
    await lockManager.releaseLock(lockName);
    const thirdAcquired = await lockManager.acquireLock(lockName);
    expect(thirdAcquired).toBe(true);
  });

  test('should handle lock with custom timeout', async () => {
    const lockName = 'timeout-lock';
    const timeout = 5000; // 5 seconds
    
    const acquired = await lockManager.acquireLock(lockName, { timeout });
    expect(acquired).toBe(true);
    
    const lockInfo = await lockManager.getLockInfo(lockName);
    expect(lockInfo).toBeDefined();
    expect(lockInfo.timeout).toBe(timeout);
  });

  test('should handle lock with fingerprint', async () => {
    const lockName = 'fingerprint-lock';
    const fingerprint = 'test-fingerprint';
    
    const acquired = await lockManager.acquireLock(lockName, { fingerprint });
    expect(acquired).toBe(true);
    
    const isValid = await lockManager.validateFingerprint(lockName, fingerprint);
    expect(isValid).toBe(true);
    
    const isInvalid = await lockManager.validateFingerprint(lockName, 'wrong-fingerprint');
    expect(isInvalid).toBe(false);
  });

  test('should handle exclusive vs non-exclusive locks', async () => {
    const lockName = 'exclusive-test';
    
    // Default should be exclusive
    const exclusiveAcquired = await lockManager.acquireLock(lockName);
    expect(exclusiveAcquired).toBe(true);
    
    const secondAcquired = await lockManager.acquireLock(lockName);
    expect(secondAcquired).toBe(false);
    
    await lockManager.releaseLock(lockName);
    
    // Test non-exclusive
    const nonExclusiveAcquired = await lockManager.acquireLock(lockName, { exclusive: false });
    expect(nonExclusiveAcquired).toBe(true);
    
    const secondNonExclusiveAcquired = await lockManager.acquireLock(lockName, { exclusive: false });
    expect(secondNonExclusiveAcquired).toBe(true);
  });

  test('should get lock information', async () => {
    const lockName = 'info-lock';
    const fingerprint = 'info-fingerprint';
    const timeout = 10000;
    
    await lockManager.acquireLock(lockName, { fingerprint, timeout });
    
    const lockInfo = await lockManager.getLockInfo(lockName);
    expect(lockInfo).toBeDefined();
    expect(lockInfo.name).toBe(lockName);
    expect(lockInfo.fingerprint).toBe(fingerprint);
    expect(lockInfo.timeout).toBe(timeout);
    expect(lockInfo.exclusive).toBe(true);
    expect(typeof lockInfo.acquiredAt).toBe('number');
    expect(typeof lockInfo.pid).toBe('number');
  });

  test('should list active locks', async () => {
    // Create multiple locks
    await lockManager.acquireLock('lock-1');
    await lockManager.acquireLock('lock-2');
    await lockManager.acquireLock('lock-3');
    
    const locks = await lockManager.listLocks();
    expect(locks.length).toBe(3);
    
    const lockNames = locks.map(lock => lock.name);
    expect(lockNames).toContain('lock-1');
    expect(lockNames).toContain('lock-2');
    expect(lockNames).toContain('lock-3');
  });

  test('should clean up expired locks', async () => {
    const lockName = 'expired-lock';
    const shortTimeout = 100; // 100ms
    
    await lockManager.acquireLock(lockName, { timeout: shortTimeout });
    
    // Wait for lock to expire
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Check if lock is still considered active
    const isLocked = await lockManager.isLocked(lockName);
    expect(isLocked).toBe(false);
    
    // Clean up expired locks
    const cleanedCount = await lockManager.cleanupExpiredLocks();
    expect(cleanedCount).toBeGreaterThanOrEqual(0);
  });

  test('should clear all locks', async () => {
    // Create multiple locks
    await lockManager.acquireLock('clear-lock-1');
    await lockManager.acquireLock('clear-lock-2');
    await lockManager.acquireLock('clear-lock-3');
    
    // Clear all locks
    const clearedCount = await lockManager.clearAllLocks();
    expect(clearedCount).toBe(3);
    
    // Verify all locks are cleared
    const locks = await lockManager.listLocks();
    expect(locks.length).toBe(0);
  });

  test('should handle release of non-existent lock', async () => {
    const released = await lockManager.releaseLock('non-existent-lock');
    expect(released).toBe(false);
  });

  test('should handle getLockInfo for non-existent lock', async () => {
    const lockInfo = await lockManager.getLockInfo('non-existent-lock');
    expect(lockInfo).toBeNull();
  });

  test('should handle validateFingerprint for non-existent lock', async () => {
    const isValid = await lockManager.validateFingerprint('non-existent-lock', 'fingerprint');
    expect(isValid).toBe(false);
  });
});
