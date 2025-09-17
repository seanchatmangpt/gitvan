// src/jobs/runner.mjs
// GitVan v2 — Job Runner with Locking and Receipts
// Handles job execution, concurrency control, and audit trails

import { createHash } from "node:crypto";
import { useGit } from "../composables/git.mjs";
import { defineJob } from "./define.mjs";
import { createJobHooks } from "./hooks.mjs";

/**
 * Job execution result
 */
export class JobResult {
  constructor(options = {}) {
    this.id = options.id;
    this.fingerprint = options.fingerprint;
    this.startedAt = options.startedAt;
    this.finishedAt = options.finishedAt;
    this.head = options.head;
    this.ok = options.ok;
    this.error = options.error;
    this.artifacts = options.artifacts || [];
    this.duration = options.duration;
  }

  toJSON() {
    return {
      id: this.id,
      fingerprint: this.fingerprint,
      startedAt: this.startedAt,
      finishedAt: this.finishedAt,
      head: this.head,
      ok: this.ok,
      error: this.error?.message,
      artifacts: this.artifacts,
      duration: this.duration,
    };
  }
}

/**
 * Job execution context
 */
export class JobExecutionContext {
  constructor(jobDef, options = {}) {
    this.jobDef = jobDef;
    this.git = useGit();
    this.root = options.root || process.cwd();
    this.nowISO = options.nowISO || new Date().toISOString();
    this.env = options.env || process.env;
    this.logger = options.logger || console;
    this.trigger = options.trigger;
    this.payload = options.payload || {};
  }

  async buildContext() {
    const git = this.git;

    return {
      root: this.root,
      nowISO: this.nowISO,
      env: this.env,
      git: {
        head: await git.head(),
        branch: await git.getCurrentBranch(),
        isSigned: await this.isCommitSigned(),
      },
      trigger: this.trigger,
      logger: this.logger,
      payload: this.payload,
    };
  }

  async isCommitSigned() {
    try {
      const git = this.git;
      const head = await git.head();
      const commitInfo = await git.run(["show", "--show-signature", head]);
      return commitInfo.includes("Good signature");
    } catch {
      return false;
    }
  }
}

/**
 * Job runner with locking and receipts
 */
export class JobRunner {
  constructor(options = {}) {
    this.git = useGit();
    this.receiptsRef = options.receiptsRef || "refs/notes/gitvan/results";
    this.locksRef = options.locksRef || "refs/gitvan/locks";
    this.executionsRef = options.executionsRef || "refs/gitvan/executions";
    this.hooks = options.hooks || createJobHooks();
  }

  /**
   * Generate execution fingerprint
   */
  generateFingerprint(jobDef, head, payload, trigger) {
    const payloadHash = payload
      ? createHash("sha256").update(JSON.stringify(payload)).digest("hex")
      : "";
    const triggerKind = trigger?.kind || "cli";
    const data = `${jobDef.id}@${head}@${payloadHash}@${jobDef.version}@${triggerKind}`;
    return createHash("sha256").update(data).digest("hex");
  }

  /**
   * Encode job ID for use in Git ref names
   */
  encodeJobId(jobId) {
    return jobId.replace(/:/g, "-").replace(/[^a-zA-Z0-9\-_]/g, "_");
  }

  /**
   * Acquire job lock
   */
  async acquireLock(jobId, fingerprint, force = false) {
    const encodedJobId = this.encodeJobId(jobId);
    const lockRef = `${this.locksRef}/${encodedJobId}`;

    if (force) {
      // Force mode: create new lock with timestamp
      const timestamp = Date.now();
      const forceFingerprint = `${fingerprint}-force-${timestamp}`;
      await this.git.runVoid(["update-ref", lockRef, await this.git.head()]);
      await this.git.noteAdd(lockRef, forceFingerprint, await this.git.head());
      return forceFingerprint;
    }

    // Normal mode: try to acquire lock
    try {
      await this.git.runVoid(["show-ref", "--verify", "--quiet", lockRef]);
      // Lock exists, return false
      return false;
    } catch {
      // Lock doesn't exist, create it
      await this.git.runVoid(["update-ref", lockRef, await this.git.head()]);
      await this.git.noteAdd(lockRef, fingerprint, await this.git.head());

      // Call lock acquire hook
      await this.hooks.callHook("lock:acquire", { id: jobId, fingerprint });

      return fingerprint;
    }
  }

  /**
   * Release job lock
   */
  async releaseLock(jobId) {
    const encodedJobId = this.encodeJobId(jobId);
    const lockRef = `${this.locksRef}/${encodedJobId}`;
    try {
      await this.git.runVoid(["update-ref", "-d", lockRef]);

      // Call lock release hook
      await this.hooks.callHook("lock:release", { id: jobId });
    } catch (error) {
      // Lock might not exist, which is fine
      if (!error.message.includes("doesn't exist")) {
        throw error;
      }
    }
  }

  /**
   * Write execution receipt
   */
  async writeReceipt(result) {
    const receipt = {
      id: result.id,
      fingerprint: result.fingerprint,
      startedAt: result.startedAt,
      finishedAt: result.finishedAt,
      head: result.head,
      ok: result.ok,
      error: result.error?.message,
      artifacts: result.artifacts,
      duration: result.duration,
    };

    const receiptJson = JSON.stringify(receipt, null, 2);

    try {
      await this.git.noteAdd(this.receiptsRef, receiptJson, result.head);

      // Call receipt write hook
      await this.hooks.callHook("receipt:write", {
        id: result.id,
        note: receipt,
        ref: this.receiptsRef,
      });
    } catch (error) {
      // If note already exists, append to it
      try {
        await this.git.noteAppend(
          this.receiptsRef,
          `\n---\n${receiptJson}`,
          result.head
        );
      } catch (appendError) {
        this.git.logger?.warn(
          `Failed to write receipt: ${appendError.message}`
        );
      }
    }

    // Call receipt hook
    if (this.hooks["receipt:write"]) {
      try {
        await this.hooks["receipt:write"]({
          id: result.id,
          note: receipt,
          ref: this.receiptsRef,
        });
      } catch (error) {
        this.git.logger?.warn(`Receipt hook failed: ${error.message}`);
      }
    }
  }

  /**
   * Record execution in git refs
   */
  async recordExecution(result) {
    const encodedJobId = this.encodeJobId(result.id);
    const executionRef = `${this.executionsRef}/${encodedJobId}/${result.fingerprint}`;
    const executionData = JSON.stringify(result.toJSON(), null, 2);

    try {
      await this.git.runVoid([
        "update-ref",
        executionRef,
        await this.git.head(),
      ]);
      await this.git.noteAdd(
        executionRef,
        executionData,
        await this.git.head()
      );
    } catch (error) {
      this.git.logger?.warn(`Failed to record execution: ${error.message}`);
    }
  }

  /**
   * Run a job
   */
  async runJob(jobDef, options = {}) {
    const {
      payload = {},
      trigger = null,
      force = false,
      head = null,
    } = options;

    const startTime = Date.now();
    const startedAt = new Date().toISOString();
    const currentHead = head || (await this.git.head());

    // Generate fingerprint
    const fingerprint = this.generateFingerprint(
      jobDef,
      currentHead,
      payload,
      trigger
    );

    // Create execution context
    const execContext = new JobExecutionContext(jobDef, {
      root: this.git.cwd,
      nowISO: startedAt,
      env: this.git.env,
      logger: this.git.logger || console,
      trigger,
      payload,
    });

    // Acquire lock
    const lockFingerprint = await this.acquireLock(
      jobDef.id,
      fingerprint,
      force
    );

    let result;
    try {
      // Call before hook
      await this.hooks.callHook("job:before", {
        id: jobDef.id,
        payload,
        ctx: await execContext.buildContext(),
      });

      // Build execution context
      const ctx = await execContext.buildContext();

      // Execute job
      const jobResult = await jobDef.run({ payload, ctx });

      // Create result
      const finishedAt = new Date().toISOString();
      result = new JobResult({
        id: jobDef.id,
        fingerprint: lockFingerprint,
        startedAt,
        finishedAt,
        head: currentHead,
        ok: true,
        artifacts: jobResult?.artifacts || [],
        duration: finishedAt - startedAt,
      });

      // Call after hook
      await this.hooks.callHook("job:after", {
        id: jobDef.id,
        result,
        ctx,
      });
    } catch (error) {
      // Create error result
      const finishedAt = new Date().toISOString();
      result = new JobResult({
        id: jobDef.id,
        fingerprint: lockFingerprint,
        startedAt,
        finishedAt,
        head: currentHead,
        ok: false,
        error,
        duration: finishedAt - startedAt,
      });

      // Call error hook
      await this.hooks.callHook("job:error", {
        id: jobDef.id,
        error,
        ctx: await execContext.buildContext(),
      });

      throw error;
    } finally {
      // Always release lock and write receipt
      await this.releaseLock(jobDef.id);
      await this.writeReceipt(result);
      await this.recordExecution(result);
    }

    return result;
  }

  /**
   * Check if job is currently running
   */
  async isJobRunning(jobId) {
    const encodedJobId = this.encodeJobId(jobId);
    const lockRef = `${this.locksRef}/${encodedJobId}`;
    try {
      await this.git.run(["show-ref", "--verify", "--quiet", lockRef]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get job lock info
   */
  async getJobLockInfo(jobId) {
    const encodedJobId = this.encodeJobId(jobId);
    const lockRef = `${this.locksRef}/${encodedJobId}`;
    try {
      await this.git.run(["show-ref", "--verify", "--quiet", lockRef]);
      const fingerprint = await this.git.noteShow(lockRef);
      return { locked: true, fingerprint: fingerprint.trim() };
    } catch {
      return { locked: false };
    }
  }

  /**
   * Clear job lock (force unlock)
   */
  async clearJobLock(jobId) {
    await this.releaseLock(jobId);
  }

  /**
   * List all job locks
   */
  async listJobLocks() {
    try {
      const locks = await this.git.run([
        "for-each-ref",
        "--format=%(refname)",
        this.locksRef,
      ]);
      return locks
        .split("\n")
        .filter(Boolean)
        .map((ref) => {
          const parts = ref.split("/");
          const encodedId = parts[parts.length - 1];
          // Decode job ID (reverse the encoding)
          const jobId = encodedId.replace(/-/g, ":").replace(/_/g, "-");
          return {
            id: jobId,
            ref,
          };
        });
    } catch {
      return [];
    }
  }
}
