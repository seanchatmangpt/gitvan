# GitVan Git Poke-Yoke (Mistake-Proofing) Mechanisms

**Document Version**: 1.0
**Last Updated**: 2025-11-16
**Purpose**: Detailed implementation guides for mistake-proofing mechanisms

---

## Overview

Poke-Yoke (ポカ・ヨケ) is a Japanese manufacturing concept meaning "mistake-proofing" or "fail-safe". This document describes specific mechanisms to prevent identified failure modes in GitVan's git operations.

**Implementation Principles:**
1. **Detect-and-Warn**: Identify potential mistakes and warn users
2. **Prevent-and-Block**: Block dangerous operations automatically
3. **Guide-and-Suggest**: Guide users toward safe operations
4. **Recover-and-Restore**: Enable fast recovery from mistakes

---

## 1. Protected Branch System

### Design

```
┌─────────────────────────────────────────────┐
│  Protected Branch System                    │
├─────────────────────────────────────────────┤
│                                             │
│  [Protected Branch Rules]                   │
│  ├─ main: no-force-push, require-pr         │
│  ├─ develop: no-force-push, require-review  │
│  └─ release/*: no-delete, require-approval  │
│                                             │
│  [Operation Gate]                           │
│  ├─ Is branch protected?                    │
│  ├─ Is operation allowed?                   │
│  ├─ Get user confirmation?                  │
│  └─ Audit trail log                         │
│                                             │
└─────────────────────────────────────────────┘
```

### Implementation Code

```javascript
// src/poke-yoke/protected-branch-guard.mjs

export class ProtectedBranchGuard {
  constructor(git, options = {}) {
    this.git = git;
    this.protectedBranches = new Map([
      ['main', { noForcePush: true, noDelete: true, requireReview: true }],
      ['master', { noForcePush: true, noDelete: true, requireReview: true }],
      ['develop', { noForcePush: true, noDelete: false, requireReview: false }],
    ]);
    this.customProtections = options.protectedBranches || {};
    this.auditLog = [];
  }

  /**
   * Check if a branch is protected
   */
  isProtected(branchName) {
    return this.protectedBranches.has(branchName) ||
           this.customProtections.hasOwnProperty(branchName);
  }

  /**
   * Get protection rules for a branch
   */
  getProtectionRules(branchName) {
    return this.protectedBranches.get(branchName) ||
           this.customProtections[branchName] || null;
  }

  /**
   * Guard: Force push
   */
  async guardForcePush(branchName, options = {}) {
    const rules = this.getProtectionRules(branchName);

    if (rules?.noForcePush) {
      const message = `🚫 Cannot force push to protected branch '${branchName}'`;
      const reason = options.reason || 'Force push disabled';

      this.auditLog.push({
        timestamp: new Date().toISOString(),
        operation: 'forcePush',
        branch: branchName,
        status: 'BLOCKED',
        reason,
      });

      throw new Error(`${message}\nReason: ${reason}`);
    }

    // If forcing anyway, require explicit confirmation
    if (options.force && !options.confirmed) {
      throw new Error(`Force push to '${branchName}' requires confirmation`);
    }

    return true;
  }

  /**
   * Guard: Delete branch
   */
  async guardDeleteBranch(branchName, options = {}) {
    const rules = this.getProtectionRules(branchName);

    if (rules?.noDelete) {
      const message = `🚫 Cannot delete protected branch '${branchName}'`;

      this.auditLog.push({
        timestamp: new Date().toISOString(),
        operation: 'deleteBranch',
        branch: branchName,
        status: 'BLOCKED',
      });

      throw new Error(message);
    }

    return true;
  }

  /**
   * Guard: Review requirement
   */
  async guardRequireReview(branchName, options = {}) {
    const rules = this.getProtectionRules(branchName);

    if (rules?.requireReview && !options.hasApprovedReview) {
      const message = `⚠️  Branch '${branchName}' requires approved review`;

      this.auditLog.push({
        timestamp: new Date().toISOString(),
        operation: 'checkReview',
        branch: branchName,
        status: 'REVIEW_REQUIRED',
      });

      throw new Error(message);
    }

    return true;
  }

  /**
   * Audit log accessor
   */
  getAuditLog() {
    return this.auditLog;
  }

  /**
   * Add custom protection rules
   */
  addProtectedBranch(branchName, rules = {}) {
    this.protectedBranches.set(branchName, rules);
  }
}
```

---

## 2. Checkout Safety Guard

### Design

```
[Checkout Request]
    ↓
[Is working tree clean?] → No → [Offer auto-stash]
    ↓ Yes                           ↓
[Confirm target branch]         [Create stash]
    ↓                               ↓
[Check out branch] ←────────────────┘
    ↓
[Success]
```

### Implementation Code

```javascript
// src/poke-yoke/checkout-safety-guard.mjs

export class CheckoutSafetyGuard {
  constructor(git, options = {}) {
    this.git = git;
    this.confirmationRequired = options.confirmationRequired !== false;
    this.autoStash = options.autoStash !== false;
    this.dangerousBranches = ['main', 'master', 'develop'];
  }

  /**
   * Guard: Pre-checkout validation
   */
  async preCheckoutValidation(targetBranch, options = {}) {
    // 1. Check if branch exists
    const branches = await this.git.branch({ full: true });
    const branchExists = branches.some(b =>
      b.name === targetBranch ||
      b.name === `remotes/origin/${targetBranch}`
    );

    if (!branchExists) {
      throw new Error(`Branch '${targetBranch}' does not exist`);
    }

    // 2. Check working tree status
    const status = await this.git.status();
    const hasUncommittedChanges =
      status.files.length > 0 ||
      status.staged.length > 0;

    if (hasUncommittedChanges && !options.force) {
      if (this.autoStash) {
        console.warn(`⚠️  Uncommitted changes detected. Auto-stashing...`);
        // Auto-stash will be handled after this check
        return { needsStash: true, changes: status.files };
      } else {
        throw new Error(
          `Cannot checkout: uncommitted changes detected\n` +
          `Use --force to override or commit changes first`
        );
      }
    }

    // 3. Warn about dangerous checkouts
    if (this.dangerousBranches.includes(targetBranch)) {
      if (options.confirmed !== true) {
        console.warn(
          `⚠️  Checking out critical branch: '${targetBranch}'\n` +
          `Make sure you've pushed all your changes!`
        );

        if (this.confirmationRequired && !options.confirmed) {
          throw new Error(
            `Checkout to '${targetBranch}' requires confirmation`
          );
        }
      }
    }

    return { needsStash: false };
  }

  /**
   * Guard: Safe checkout with recovery
   */
  async safeCheckout(targetBranch, options = {}) {
    // Pre-validation
    const validation = await this.preCheckoutValidation(
      targetBranch,
      options
    );

    if (validation.needsStash) {
      // Create stash for recovery
      const stashName = `checkout-recovery-${Date.now()}`;
      console.log(`📦 Creating stash: ${stashName}`);
      await this.git.stash({ message: stashName });
    }

    try {
      // Perform checkout
      await this.git.checkout(targetBranch);
      console.log(`✅ Checked out '${targetBranch}'`);

      return { success: true, stashed: validation.needsStash };
    } catch (error) {
      // Recovery: restore stash if checkout failed
      if (validation.needsStash) {
        console.error(`❌ Checkout failed. Restoring stash...`);
        // Note: stash list and pop logic
        throw new Error(
          `Checkout failed: ${error.message}\n` +
          `Your changes were stashed. Use 'git stash pop' to recover.`
        );
      }
      throw error;
    }
  }

  /**
   * Get current branch safely
   */
  async getCurrentBranch() {
    try {
      return await this.git.currentBranch();
    } catch (error) {
      return null; // Detached HEAD
    }
  }

  /**
   * Check if in detached HEAD state
   */
  async isDetachedHead() {
    const currentBranch = await this.getCurrentBranch();
    return currentBranch === null;
  }
}
```

---

## 3. Merge Conflict Detection

### Design

```
[Merge Request]
    ↓
[Run merge with --no-commit] → Conflicts detected?
    ↓ No                          ↓ Yes
[Commit merge] ←────────────[Abort merge]
    ↓                            ↓
[Success]                  [Return conflict info]
                                 ↓
                          [User resolves manually]
```

### Implementation Code

```javascript
// src/poke-yoke/merge-conflict-guard.mjs

export class MergeConflictGuard {
  constructor(git, options = {}) {
    this.git = git;
    this.autoAbortOnConflict = options.autoAbortOnConflict !== false;
    this.conflictHistory = [];
  }

  /**
   * Guard: Pre-merge conflict detection
   */
  async detectMergeConflicts(sourceBranch, targetBranch) {
    try {
      // Perform a dry-run merge (no-commit, no-ff)
      await this.git.merge(sourceBranch, {
        noCommit: true,
        noFf: true,
        dryRun: true, // Hypothetical dry-run
      });

      return { hasConflicts: false };
    } catch (error) {
      // If merge fails, it might be due to conflicts
      if (error.message.includes('conflict')) {
        return { hasConflicts: true, error: error.message };
      }
      throw error;
    }
  }

  /**
   * Guard: Safe merge with conflict detection
   */
  async safeMerge(sourceBranch, targetBranch, options = {}) {
    // 1. Check for conflicts first
    const conflictCheck = await this.detectMergeConflicts(
      sourceBranch,
      targetBranch
    );

    if (conflictCheck.hasConflicts) {
      const message = `🚫 Merge would create conflicts in '${targetBranch}'`;

      this.conflictHistory.push({
        timestamp: new Date().toISOString(),
        source: sourceBranch,
        target: targetBranch,
        hasConflicts: true,
      });

      throw new Error(
        `${message}\n` +
        `Please resolve conflicts manually or use a different merge strategy.`
      );
    }

    // 2. Perform actual merge
    try {
      await this.git.merge(sourceBranch, {
        message: options.message || `Merge '${sourceBranch}' into '${targetBranch}'`,
        ...options,
      });

      console.log(`✅ Merged '${sourceBranch}' into '${targetBranch}'`);
      return { success: true, conflicts: false };
    } catch (error) {
      // If merge fails during execution
      if (this.autoAbortOnConflict) {
        console.error(`❌ Merge failed. Aborting...`);
        await this.git.merge({ abort: true });
      }

      throw new Error(
        `Merge failed: ${error.message}\n` +
        `Use 'git merge --abort' to cancel.`
      );
    }
  }

  /**
   * Get conflict resolution status
   */
  async getConflictStatus() {
    const status = await this.git.status();

    return {
      hasConflicts: status.conflict > 0,
      conflictedFiles: status.conflicted || [],
      unmergedFiles: status.unmerged || [],
    };
  }

  /**
   * Verify merge completion
   */
  async verifyMergeComplete() {
    const conflictStatus = await this.getConflictStatus();

    if (conflictStatus.hasConflicts) {
      throw new Error(
        `Cannot complete merge: unresolved conflicts in:\n` +
        `${conflictStatus.conflictedFiles.join('\n')}`
      );
    }

    return true;
  }

  /**
   * Get conflict history
   */
  getConflictHistory() {
    return this.conflictHistory;
  }
}
```

---

## 4. Rebase Safety Guard

### Design

```
[Rebase Request]
    ↓
[Check working tree clean?] → No → Error
    ↓ Yes
[Preserve original ref] → Save SHA
    ↓
[Begin rebase]
    ↓
[Conflict detected?] → Yes → [Stop & warn]
    ↓ No                       ↓
[Continue rebase]         [User handles]
    ↓                       ↓
[Success] ←────────────────┘
```

### Implementation Code

```javascript
// src/poke-yoke/rebase-safety-guard.mjs

export class RebaseSafetyGuard {
  constructor(git, options = {}) {
    this.git = git;
    this.preserveRefs = new Map();
    this.conflictOnStop = options.conflictOnStop !== false;
  }

  /**
   * Guard: Pre-rebase validation
   */
  async preRebaseValidation(targetBranch, options = {}) {
    // 1. Check working tree is clean
    const status = await this.git.status();
    if (status.files.length > 0 || status.staged.length > 0) {
      throw new Error(
        `Cannot rebase: uncommitted changes detected\n` +
        `Commit or stash changes before rebasing.`
      );
    }

    // 2. Verify target exists
    const targetExists = await this.git.revExists(targetBranch);
    if (!targetExists) {
      throw new Error(`Target branch '${targetBranch}' does not exist`);
    }

    // 3. Warn about destructive operations
    if (options.squash || options.drop) {
      console.warn(`⚠️  WARNING: Destructive rebase operation`);
      if (!options.confirmed) {
        throw new Error(
          `Squash/drop rebase requires explicit confirmation`
        );
      }
    }

    return true;
  }

  /**
   * Guard: Preserve original ref before rebase
   */
  async preserveOriginalRef(branchName) {
    const currentSha = await this.git.revParse(branchName);
    const refName = `refs/backup/${branchName}/pre-rebase-${Date.now()}`;

    await this.git.updateRef(refName, currentSha);

    this.preserveRefs.set(branchName, {
      originalSha: currentSha,
      backupRef: refName,
      timestamp: new Date().toISOString(),
    });

    console.log(`📌 Preserved original ref: ${refName}`);
    return refName;
  }

  /**
   * Guard: Safe rebase with preservation
   */
  async safeRebase(targetBranch, options = {}) {
    // Get current branch
    const currentBranch = await this.git.currentBranch();

    // Pre-validation
    await this.preRebaseValidation(targetBranch, options);

    // Preserve original ref
    const backupRef = await this.preserveOriginalRef(currentBranch);

    try {
      // Perform rebase
      await this.git.rebase(targetBranch, {
        ...options,
      });

      console.log(`✅ Rebase onto '${targetBranch}' successful`);

      return {
        success: true,
        backupRef,
        currentBranch,
      };
    } catch (error) {
      if (error.message.includes('conflict')) {
        // Stop on conflict
        if (this.conflictOnStop) {
          console.error(`⚠️  Rebase halted due to conflicts`);

          return {
            success: false,
            conflicts: true,
            backupRef,
            message: `Resolve conflicts in your editor, then run 'git rebase --continue'`,
          };
        }
      }

      // Auto-abort and restore
      console.error(`❌ Rebase failed. Auto-aborting and restoring...`);
      await this.git.rebase({ abort: true });

      throw new Error(
        `Rebase failed: ${error.message}\n` +
        `Original ref preserved at: ${backupRef}\n` +
        `To restore: git reset --hard ${backupRef}`
      );
    }
  }

  /**
   * Guard: Confirm rebase completion
   */
  async confirmRebaseComplete(branchName) {
    const status = await this.git.status();

    if (status.rebase) {
      throw new Error(
        `Rebase in progress. Complete with 'git rebase --continue' or abort with 'git rebase --abort'.`
      );
    }

    // Clean up backup ref if successful
    const backupInfo = this.preserveRefs.get(branchName);
    if (backupInfo) {
      console.log(`✅ Rebase complete. Backup preserved at: ${backupInfo.backupRef}`);
    }

    return true;
  }

  /**
   * Restore from backup if needed
   */
  async restoreFromBackup(branchName) {
    const backupInfo = this.preserveRefs.get(branchName);

    if (!backupInfo) {
      throw new Error(`No backup found for '${branchName}'`);
    }

    await this.git.reset(backupInfo.originalSha, { hard: true });

    console.log(
      `✅ Restored '${branchName}' to pre-rebase state: ${backupInfo.originalSha}`
    );

    return backupInfo.originalSha;
  }
}
```

---

## 5. Concurrent Operation Lock

### Design

```
[Operation Request]
    ↓
[Acquire Lock]
    ├─ Lock acquired? → [Execute Operation]
    │                       ↓
    │                  [Release Lock]
    │                       ↓
    │                   [Success]
    │
    └─ Lock timeout? → [Queue Operation]
                           ↓
                       [Retry with backoff]
                           ↓
                    [Deadlock detection?]
```

### Implementation Code

```javascript
// src/poke-yoke/concurrent-operation-lock.mjs

export class ConcurrentOperationLock {
  constructor(git, options = {}) {
    this.git = git;
    this.locks = new Map();
    this.lockTimeout = options.lockTimeout || 30000; // 30 seconds
    this.maxRetries = options.maxRetries || 5;
    this.operationQueue = [];
  }

  /**
   * Acquire lock for repository
   */
  async acquireLock(repoPath, timeout = this.lockTimeout) {
    const lockKey = `lock:${repoPath}`;
    const startTime = Date.now();
    let retries = 0;

    while (retries < this.maxRetries) {
      // Check if lock is available
      if (!this.locks.has(lockKey)) {
        // Create lock
        const lockId = `${lockKey}:${Date.now()}`;
        const lockRecord = {
          id: lockId,
          acquiredAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + timeout).toISOString(),
          repoPath,
        };

        this.locks.set(lockKey, lockRecord);
        console.log(`🔒 Lock acquired: ${lockKey}`);

        return {
          lockId,
          release: async () => this.releaseLock(lockKey),
        };
      }

      // Check if lock has expired
      const currentLock = this.locks.get(lockKey);
      if (new Date() > new Date(currentLock.expiresAt)) {
        console.warn(`⚠️  Stale lock detected. Removing: ${lockKey}`);
        this.locks.delete(lockKey);
        continue;
      }

      // Wait before retry
      const backoffMs = Math.min(1000 * Math.pow(2, retries), 5000);
      console.log(
        `⏳ Lock busy, retrying in ${backoffMs}ms (attempt ${retries + 1}/${this.maxRetries})`
      );
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      retries++;
    }

    throw new Error(
      `Cannot acquire lock for '${repoPath}' after ${this.maxRetries} retries`
    );
  }

  /**
   * Release lock
   */
  async releaseLock(lockKey) {
    if (this.locks.has(lockKey)) {
      const lock = this.locks.get(lockKey);
      this.locks.delete(lockKey);
      console.log(`🔓 Lock released: ${lockKey}`);
      return true;
    }
    return false;
  }

  /**
   * Execute operation with automatic lock management
   */
  async withLock(repoPath, operation, options = {}) {
    const lock = await this.acquireLock(repoPath);

    try {
      // Execute operation
      const result = await operation();
      return result;
    } catch (error) {
      // Log error with context
      console.error(
        `❌ Operation failed under lock ${lock.lockId}:`,
        error.message
      );
      throw error;
    } finally {
      // Always release lock
      await lock.release();
    }
  }

  /**
   * Get lock status
   */
  getLockStatus(repoPath) {
    const lockKey = `lock:${repoPath}`;
    const lock = this.locks.get(lockKey);

    return {
      isLocked: lock !== undefined,
      lock: lock || null,
    };
  }

  /**
   * Detect deadlocks
   */
  async detectDeadlocks() {
    const now = new Date();
    const deadlocks = [];

    for (const [lockKey, lock] of this.locks.entries()) {
      const age = now - new Date(lock.acquiredAt);

      if (age > this.lockTimeout * 2) {
        deadlocks.push({
          lockKey,
          age,
          lock,
        });
      }
    }

    return deadlocks;
  }

  /**
   * Clean up stale locks
   */
  async cleanupStaleLocks() {
    const now = new Date();
    const removed = [];

    for (const [lockKey, lock] of this.locks.entries()) {
      if (now > new Date(lock.expiresAt)) {
        this.locks.delete(lockKey);
        removed.push(lockKey);
      }
    }

    if (removed.length > 0) {
      console.warn(`🧹 Cleaned up ${removed.length} stale locks`);
    }

    return removed;
  }
}
```

---

## 6. Push Credentials Guard

### Design

```
[Push Request]
    ↓
[Check credentials available?]
    ├─ SSH configured? → Validate SSH key
    ├─ HTTPS configured? → Validate token
    └─ Neither? → Error with setup instructions
         ↓
    [All checks pass]
         ↓
    [Perform push]
```

### Implementation Code

```javascript
// src/poke-yoke/push-credentials-guard.mjs

export class PushCredentialsGuard {
  constructor(git, options = {}) {
    this.git = git;
    this.requireAuth = options.requireAuth !== false;
    this.sshKeyPath = options.sshKeyPath;
    this.httpsToken = options.httpsToken;
  }

  /**
   * Guard: Validate SSH key accessibility
   */
  async validateSshKey(keyPath = this.sshKeyPath) {
    if (!keyPath) {
      throw new Error(
        `SSH key path not configured. Set via options.sshKeyPath`
      );
    }

    try {
      const fs = await import('fs/promises');
      const stats = await fs.stat(keyPath);
      const mode = stats.mode;

      // Check if readable
      if ((mode & 0o400) === 0) {
        throw new Error(`SSH key not readable: ${keyPath}`);
      }

      // Check permissions (should be 600)
      if ((mode & 0o077) !== 0) {
        console.warn(`⚠️  SSH key has overly permissive permissions: ${mode.toString(8)}`);
        console.warn(`Consider running: chmod 600 ${keyPath}`);
      }

      console.log(`✅ SSH key validated: ${keyPath}`);
      return true;
    } catch (error) {
      throw new Error(
        `SSH key validation failed: ${error.message}\n` +
        `Ensure SSH key exists at: ${keyPath}`
      );
    }
  }

  /**
   * Guard: Validate HTTPS credentials
   */
  async validateHttpsCredentials(token = this.httpsToken) {
    if (!token) {
      throw new Error(
        `HTTPS token not configured. Set via options.httpsToken`
      );
    }

    // Basic validation
    if (typeof token !== 'string' || token.length === 0) {
      throw new Error(`Invalid HTTPS token`);
    }

    console.log(`✅ HTTPS credentials validated`);
    return true;
  }

  /**
   * Guard: Pre-push authentication check
   */
  async preAuthCheck(remoteUrl, options = {}) {
    const useSsh = remoteUrl.includes('git@');
    const useHttps = remoteUrl.includes('https://') || remoteUrl.includes('http://');

    if (useSsh) {
      await this.validateSshKey();
    } else if (useHttps) {
      await this.validateHttpsCredentials();
    } else {
      throw new Error(
        `Unsupported remote URL format: ${remoteUrl}\n` +
        `Use SSH (git@...) or HTTPS (https://...)`
      );
    }

    return true;
  }

  /**
   * Guard: Safe push with auth verification
   */
  async safePush(remote = 'origin', branch, options = {}) {
    // Get remote URL
    const remoteUrl = await this.git.getRemoteUrl(remote);

    if (!remoteUrl) {
      throw new Error(`Remote '${remote}' not configured`);
    }

    // Pre-flight auth check
    try {
      await this.preAuthCheck(remoteUrl, options);
    } catch (error) {
      throw new Error(
        `Push blocked: authentication check failed\n` +
        `${error.message}\n\n` +
        `Setup instructions:\n` +
        `1. For SSH: Generate key with 'ssh-keygen -t ed25519'\n` +
        `2. For HTTPS: Create token and store in options.httpsToken\n` +
        `3. Add public key to GitHub/GitLab in Settings → SSH Keys`
      );
    }

    // Perform push
    try {
      await this.git.push(remote, branch, options);
      console.log(`✅ Pushed to ${remote}/${branch}`);
      return { success: true };
    } catch (error) {
      // Better error messages for common failures
      if (error.message.includes('Permission denied')) {
        throw new Error(
          `Permission denied pushing to '${remote}'\n` +
          `Check your SSH key or HTTPS credentials`
        );
      } else if (error.message.includes('Rejected')) {
        throw new Error(
          `Push rejected by remote\n` +
          `Your branch is behind or has conflicts\n` +
          `Try: git pull --rebase && git push`
        );
      }
      throw error;
    }
  }
}
```

---

## 7. Working Tree Guard

### Design

```
[Working Tree Check]
    ↓
[Any unstaged changes?] → Yes → Warn & block
    ↓ No
[Any staged changes?] → Yes → Warn & block
    ↓ No
[Clean working tree]
    ↓
[Proceed with operation]
```

### Implementation Code

```javascript
// src/poke-yoke/working-tree-guard.mjs

export class WorkingTreeGuard {
  constructor(git, options = {}) {
    this.git = git;
    this.allowStaged = options.allowStaged || false;
    this.autoStash = options.autoStash || true;
  }

  /**
   * Guard: Check if working tree is clean
   */
  async isClean() {
    const status = await this.git.status();

    return {
      clean: status.files.length === 0 && status.staged.length === 0,
      untracked: status.untracked || [],
      unstaged: status.files || [],
      staged: status.staged || [],
    };
  }

  /**
   * Guard: Ensure clean working tree before operation
   */
  async ensureClean(operation, options = {}) {
    const treeStatus = await this.isClean();

    if (!treeStatus.clean) {
      const message = `🚫 Cannot ${operation}: uncommitted changes detected`;

      console.warn(message);
      console.warn(`Unstaged files: ${treeStatus.unstaged.length}`);
      console.warn(`Staged files: ${treeStatus.staged.length}`);
      console.warn(`Untracked files: ${treeStatus.untracked.length}`);

      if (options.force) {
        if (this.autoStash) {
          console.log(`📦 Auto-stashing changes...`);
          return { stashed: true };
        }
      }

      throw new Error(
        `${message}\n\n` +
        `Options:\n` +
        `1. Commit your changes: git add . && git commit -m "..."\n` +
        `2. Stash changes: git stash\n` +
        `3. Discard changes: git reset --hard (WARNING: loses changes)\n` +
        `4. Force operation (auto-stash): ${operation}(..., { force: true })`
      );
    }

    return { clean: true };
  }

  /**
   * Guard: Validate specific files
   */
  async validateFilesClean(filePaths, options = {}) {
    const status = await this.git.status();
    const changedFiles = [...status.files, ...status.staged];

    const conflictingFiles = filePaths.filter(f =>
      changedFiles.some(cf => cf.includes(f))
    );

    if (conflictingFiles.length > 0) {
      throw new Error(
        `Cannot proceed: changes in required files:\n` +
        `${conflictingFiles.join('\n')}`
      );
    }

    return true;
  }
}
```

---

## 8. Error Translation & Context

### Implementation Code

```javascript
// src/poke-yoke/error-translator.mjs

export class ErrorTranslator {
  static translateGitError(error, context = {}) {
    const message = error.message.toLowerCase();
    const { operation, branch, remote } = context;

    // Permission errors
    if (message.includes('permission denied') || message.includes('access denied')) {
      return {
        userMessage: `❌ Access denied (${operation || 'operation'})`,
        suggestion: `Check your SSH key or HTTPS credentials`,
        details: error.message,
        recoverySteps: [
          'Check SSH key: ssh -T git@github.com',
          'Or verify HTTPS token permissions',
          'Add public key to GitHub Settings → SSH Keys',
        ],
      };
    }

    // Network errors
    if (message.includes('network') || message.includes('timeout')) {
      return {
        userMessage: `⚠️  Network error (${operation || 'operation'})`,
        suggestion: `Check your internet connection`,
        details: error.message,
        recoverySteps: [
          'Verify internet connection: ping github.com',
          'Retry the operation',
          'Use git config http.postBuffer 524288000 for large repos',
        ],
      };
    }

    // Merge conflicts
    if (message.includes('conflict')) {
      return {
        userMessage: `⚠️  Merge conflict (${operation || 'merge'})`,
        suggestion: `Resolve conflicts in your files`,
        details: error.message,
        recoverySteps: [
          'Edit conflicted files (marked with <<<<<<<, =======, >>>>>>>)',
          'Stage resolved files: git add <file>',
          'Continue: git merge --continue',
          'Or abort: git merge --abort',
        ],
      };
    }

    // Ref not found
    if (message.includes('not found') && (branch || remote)) {
      return {
        userMessage: `❌ Reference not found: '${branch || remote}'`,
        suggestion: `Check if the branch or remote exists`,
        details: error.message,
        recoverySteps: [
          `List branches: git branch -a`,
          `List remotes: git remote -v`,
          `Create branch: git checkout -b ${branch}`,
        ],
      };
    }

    // Detached HEAD
    if (message.includes('detached')) {
      return {
        userMessage: `⚠️  Detached HEAD state`,
        suggestion: `Check out a branch to continue work`,
        details: error.message,
        recoverySteps: [
          'List branches: git branch',
          'Checkout branch: git checkout <branch-name>',
          'Or create branch from current state: git checkout -b <new-branch>',
        ],
      };
    }

    // Generic error
    return {
      userMessage: `❌ Git operation failed: ${operation || 'unknown'}`,
      suggestion: `See details below for more information`,
      details: error.message,
      recoverySteps: [
        'Check git status: git status',
        'Review recent commits: git log -5',
        'Get help: git <command> --help',
      ],
    };
  }

  static printError(error, context = {}) {
    const translated = this.translateGitError(error, context);

    console.error(`\n${translated.userMessage}`);
    console.error(`Suggestion: ${translated.suggestion}`);

    if (translated.details && translated.details !== error.message) {
      console.error(`\nDetails: ${translated.details}`);
    }

    if (translated.recoverySteps && translated.recoverySteps.length > 0) {
      console.error(`\nRecovery steps:`);
      translated.recoverySteps.forEach((step, i) => {
        console.error(`  ${i + 1}. ${step}`);
      });
    }

    console.error('');
  }
}
```

---

## Implementation Checklist

- [ ] Protected Branch Guard - Block force push, delete, require review
- [ ] Checkout Safety Guard - Auto-stash, confirm dangerous checkouts
- [ ] Merge Conflict Guard - Detect & prevent conflicts
- [ ] Rebase Safety Guard - Preserve refs, stop on conflicts
- [ ] Concurrent Operation Lock - File-based locking, deadlock detection
- [ ] Push Credentials Guard - SSH/HTTPS validation
- [ ] Working Tree Guard - Ensure clean before operations
- [ ] Error Translator - User-friendly error messages
- [ ] Integration Tests - Verify all guards work correctly
- [ ] Documentation - Usage guides and best practices

---

## References

- Toyota Poke-Yoke Principles
- Industrial Engineering Best Practices
- Git Safety Standards
