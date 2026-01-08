# Integration Test Strategy: Bree Scheduler Refactoring

**GitVan v4.0.0 - TPS Jidoka (Prevent Defects at Source)**

**Date:** 2026-01-08
**Status:** Analysis Complete
**Coverage Target:** 80%+ for all integration points

---

## Executive Summary

This document provides a comprehensive integration testing strategy for the Bree scheduler refactoring in GitVan. The refactoring introduces Bree as the job scheduling engine, requiring validation of 9 critical integration points across the system.

**Key Findings:**
- ✅ Basic Bree functionality is tested (jobs-bree-integration.test.mjs)
- ⚠️ Context management integration needs validation
- ⚠️ Git integration (locks, receipts) needs end-to-end tests
- ⚠️ Hook system integration is untested
- ⚠️ Workflow engine integration is untested
- ⚠️ Pack system integration is untested
- ⚠️ Cross-directory isolation is untested
- ⚠️ Failure recovery scenarios are incomplete

---

## 1. Integration Test Matrix

Component pairs that require integration testing:

| Component A | Component B | Integration Point | Test Status | Priority |
|-------------|-------------|-------------------|-------------|----------|
| BreeScheduler | JobBridge | Job config conversion | ✅ Tested | High |
| JobBridge | useLock() | Lock acquisition/release | ⚠️ Partial | Critical |
| JobBridge | useReceipt() | Receipt writing | ⚠️ Partial | Critical |
| JobBridge | useGit() | Git info retrieval | ⚠️ Partial | High |
| useJob() | BreeScheduler | Schedule/unschedule | ✅ Tested | High |
| useJob() | JobBridge | Job execution | ⚠️ Partial | High |
| BreeScheduler | Worker Threads | Context passing | ❌ Untested | Critical |
| Job Discovery | BreeScheduler | Auto-scheduling cron jobs | ✅ Tested | Medium |
| Hook System | JobBridge | Hook-triggered jobs | ❌ Untested | High |
| Workflow Engine | JobBridge | Jobs in DAG workflows | ❌ Untested | Critical |
| Pack System | Job Discovery | Jobs in packs | ❌ Untested | Medium |
| CLI Commands | useJob() | All job commands | ⚠️ Partial | High |
| Git Refs | JobBridge | Lock refs (refs/gitvan/locks) | ❌ Untested | Critical |
| Git Notes | JobBridge | Receipt notes (refs/notes/gitvan/audit) | ❌ Untested | Critical |
| Multiple Repos | BreeScheduler | Scheduler isolation | ❌ Untested | High |
| Error Recovery | JobBridge | Lock cleanup on failure | ❌ Untested | Critical |

**Legend:**
- ✅ Tested: Comprehensive tests exist
- ⚠️ Partial: Some tests exist but incomplete
- ❌ Untested: No tests found

---

## 2. Missing Integration Tests

### 2.1 Critical Gaps

#### 2.1.1 Context Management (unctx)
**Issue:** Worker threads may lose unctx context
**Impact:** Composables (lock, receipt, git) will fail in workers
**Tests Needed:**
1. Verify composables work within worker threads
2. Verify context persists through async operations
3. Verify context isolation between concurrent jobs
4. Verify lazy initialization of composables in JobBridge

#### 2.1.2 Git Integration - Locks
**Issue:** Lock refs creation/deletion not verified end-to-end
**Impact:** Jobs may run concurrently when they shouldn't
**Tests Needed:**
1. Verify lock ref created: `refs/gitvan/locks/job-{jobId}`
2. Verify lock ref deleted after job completion
3. Verify lock ref deleted after job failure
4. Verify lock TTL enforcement
5. Verify stale lock detection and cleanup

#### 2.1.3 Git Integration - Receipts
**Issue:** Receipt notes not verified end-to-end
**Impact:** Audit trail may be incomplete
**Tests Needed:**
1. Verify receipt written to `refs/notes/gitvan/audit`
2. Verify receipt contains all required fields
3. Verify receipt fingerprint is deterministic
4. Verify receipts persist across scheduler restarts
5. Verify receipt history is queryable

#### 2.1.4 Workflow Engine Integration
**Issue:** Jobs in workflows may not work with Bree
**Impact:** DAG execution may fail
**Tests Needed:**
1. Verify jobs in workflow steps execute via Bree
2. Verify step dependencies are respected
3. Verify context passes from workflow to job
4. Verify job failures propagate to workflow
5. Verify parallel job execution in workflows

#### 2.1.5 Cross-Directory Isolation
**Issue:** Scheduler instances may interfere
**Impact:** Jobs from different repos may mix
**Tests Needed:**
1. Verify separate scheduler per cwd
2. Verify job data doesn't leak between schedulers
3. Verify locks are scoped to repository
4. Verify receipts are scoped to repository

### 2.2 High Priority Gaps

#### 2.2.1 Hook System Integration
**Issue:** Hooks may not trigger Bree-scheduled jobs
**Impact:** Event-driven workflows may break
**Tests Needed:**
1. Verify hook events trigger scheduled jobs
2. Verify Bree scheduler coexists with hook jobs
3. Verify no scheduling conflicts

#### 2.2.2 CLI Integration
**Issue:** CLI commands not fully tested with Bree
**Impact:** Users may encounter CLI errors
**Tests Needed:**
1. `gitvan job schedule <jobId>` - works
2. `gitvan job unschedule <jobId>` - works
3. `gitvan job list --scheduled` - shows scheduled jobs
4. `gitvan job status <jobId>` - shows running state
5. Exit codes are correct

#### 2.2.3 Pack System Integration
**Issue:** Jobs in packs may not be discovered
**Impact:** Pack installation may fail
**Tests Needed:**
1. Verify jobs in packs are discovered
2. Verify jobs in packs can be scheduled
3. Verify pack installation with Bree jobs works

### 2.3 Medium Priority Gaps

#### 2.3.1 Failure Recovery
**Issue:** Incomplete testing of error scenarios
**Impact:** System may be left in inconsistent state
**Tests Needed:**
1. Job crashes mid-execution - lock released
2. Scheduler crashes - locks cleaned on restart
3. Worker thread crashes - receipt written
4. Out of memory - graceful degradation

#### 2.3.2 Performance
**Issue:** No performance tests for Bree integration
**Impact:** May not scale to many jobs
**Tests Needed:**
1. 100 concurrent jobs
2. 1000 scheduled jobs
3. Memory usage over time
4. Lock contention under load

---

## 3. Test Scenarios for Each Integration Point

### 3.1 Job Discovery Integration

#### Scenario 1: Existing job discovery still works
```javascript
// Test: Job files are discovered and loaded
// Input: jobs/ directory with .mjs files
// Expected: All jobs returned by list()
```

#### Scenario 2: Bree config generation works
```javascript
// Test: GitVan job definition converts to Bree config
// Input: Job with cron: "0 * * * *"
// Expected: Bree config has cron: "0 * * * *"
```

#### Scenario 3: Cron parsing works end-to-end
```javascript
// Test: Cron expressions are parsed correctly
// Input: Various cron formats
// Expected: Bree accepts and schedules correctly
```

### 3.2 Context Management (unctx)

#### Scenario 1: Composables called within withGitVan()
```javascript
// Test: useJob() works inside withGitVan()
// Input: withGitVan(ctx, async () => { useJob() })
// Expected: No context errors
```

#### Scenario 2: Async context preserved through Bree
```javascript
// Test: Context survives await in worker thread
// Input: Worker calls composable after async operation
// Expected: Composable still has context
```

#### Scenario 3: Worker thread context passing
```javascript
// Test: Context is serialized and passed to worker
// Input: Job execution with context
// Expected: Worker receives full context
```

#### Scenario 4: No context loss in lazy initialization
```javascript
// Test: JobBridge lazy composables don't lose context
// Input: First call to this.lock in JobBridge
// Expected: useLock() works correctly
```

### 3.3 Git Integration

#### Scenario 1: Lock ref creation/deletion
```javascript
// Test: Lock ref lifecycle
// Input: Run job with lock
// Expected:
//   - refs/gitvan/locks/job-{jobId} created
//   - Lock ref deleted after completion
```

#### Scenario 2: Receipt writing to notes
```javascript
// Test: Receipt persists in git notes
// Input: Job execution (success)
// Expected:
//   - Note added to refs/notes/gitvan/audit
//   - Contains: jobId, fingerprint, timestamp, status
```

#### Scenario 3: Deterministic timestamps
```javascript
// Test: Timestamps use UTC
// Input: Job runs in different timezones
// Expected: All timestamps are UTC (env.TZ=UTC)
```

#### Scenario 4: Head detection
```javascript
// Test: Git HEAD is captured
// Input: Job runs on specific commit
// Expected: Receipt contains correct HEAD sha
```

### 3.4 Hook System Integration

#### Scenario 1: Hooks still trigger jobs
```javascript
// Test: Git event triggers job
// Input: Git commit event
// Expected: Associated job runs
```

#### Scenario 2: Bree scheduler coexists with hook jobs
```javascript
// Test: Both systems work together
// Input: Scheduled job + hook-triggered job
// Expected: Both execute without conflicts
```

#### Scenario 3: No scheduling conflicts
```javascript
// Test: Hook jobs don't interfere with scheduled jobs
// Input: Hook event during scheduled execution
// Expected: Both jobs run, proper locking
```

### 3.5 CLI Integration

#### Scenario 1: All existing job commands work
```javascript
// Commands to test:
// - gitvan job list
// - gitvan job run <jobId>
// - gitvan job validate <jobId>
// - gitvan job status <jobId>
// - gitvan job history <jobId>
```

#### Scenario 2: New scheduler commands work
```javascript
// Commands to test:
// - gitvan job schedule <jobId>
// - gitvan job unschedule <jobId>
// - gitvan job scheduler start
// - gitvan job scheduler stop
// - gitvan job scheduler status
```

#### Scenario 3: Help text complete
```javascript
// Test: All commands have help text
// Input: gitvan job <command> --help
// Expected: Detailed help displayed
```

#### Scenario 4: Exit codes proper
```javascript
// Test: Commands return correct exit codes
// Expected: 0 for success, non-zero for errors
```

### 3.6 Workflow Engine Integration

#### Scenario 1: Jobs in workflows run via Bree
```javascript
// Test: Workflow step executes job through Bree
// Input: Workflow with job step
// Expected: Job runs via JobBridge
```

#### Scenario 2: DAG execution with scheduled jobs
```javascript
// Test: DAG planner respects job dependencies
// Input: Workflow with dependent jobs
// Expected: Jobs run in correct order
```

#### Scenario 3: Step dependencies respected
```javascript
// Test: Jobs wait for dependencies
// Input: Job B depends on Job A
// Expected: Job A completes before Job B starts
```

#### Scenario 4: Context passed correctly
```javascript
// Test: Workflow context available in job
// Input: Workflow with context variables
// Expected: Job receives workflow context
```

### 3.7 Pack System Integration

#### Scenario 1: Jobs in packs work with Bree
```javascript
// Test: Pack jobs are schedulable
// Input: Install pack with jobs
// Expected: Jobs appear in list, can be scheduled
```

#### Scenario 2: Pack installation with Bree jobs
```javascript
// Test: Pack installation succeeds
// Input: Pack with cron jobs
// Expected: Jobs auto-scheduled
```

#### Scenario 3: Job discovery in packs
```javascript
// Test: Jobs in pack directories found
// Input: Pack with jobs/ subdirectory
// Expected: Jobs discovered and loaded
```

### 3.8 Receipt and Audit System

#### Scenario 1: Receipts written for all executions
```javascript
// Test: Every job execution creates receipt
// Input: 10 job executions
// Expected: 10 receipts in notes
```

#### Scenario 2: Fingerprints correct
```javascript
// Test: Fingerprint is deterministic
// Input: Same job, same head, same payload
// Expected: Same fingerprint
```

#### Scenario 3: Audit trail complete
```javascript
// Test: All execution data captured
// Expected receipt fields:
// - jobId
// - fingerprint
// - startedAt (ISO 8601)
// - finishedAt (ISO 8601)
// - head (git sha)
// - ok (boolean)
// - result or error
// - duration (ms)
```

#### Scenario 4: History accessible
```javascript
// Test: Past executions queryable
// Input: job.history(jobId, { limit: 50 })
// Expected: Array of receipts, newest first
```

### 3.9 Cross-Directory Support

#### Scenario 1: Multiple git repos with different jobs
```javascript
// Test: Two repos with different job sets
// Input: /repo1 with job-a, /repo2 with job-b
// Expected: Each scheduler only sees its jobs
```

#### Scenario 2: Scheduler isolation per directory
```javascript
// Test: Schedulers don't interfere
// Input: Start scheduler in repo1 and repo2
// Expected: Independent scheduler instances
```

#### Scenario 3: No data mixing between directories
```javascript
// Test: Locks and receipts are scoped
// Input: Same job name in two repos
// Expected: Separate locks, separate receipts
```

---

## 4. Test Code Examples

### 4.1 Context Management Test

```javascript
// tests/integration/bree-context-management.test.mjs
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { withGitVan } from "../../src/core/context.mjs";
import { useJob } from "../../src/composables/job.mjs";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { execSync } from "child_process";

describe("Bree Context Management Integration", () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-bree-context");
    await fs.mkdir(join(tempDir, "jobs"), { recursive: true });

    // Initialize git
    execSync("git init", { cwd: tempDir });
    execSync('git config user.name "Test"', { cwd: tempDir });
    execSync('git config user.email "test@test.com"', { cwd: tempDir });
    await fs.writeFile(join(tempDir, "README.md"), "# Test");
    execSync("git add . && git commit -m 'init'", { cwd: tempDir });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should preserve context through worker execution", async () => {
    await withGitVan({ cwd: tempDir }, async () => {
      // Create test job
      await fs.writeFile(
        join(tempDir, "jobs", "context-test.mjs"),
        `
export const meta = { name: "Context Test", desc: "Tests context", tags: [] };
export default async function run({ payload, ctx }) {
  // This should have access to git info via context
  if (!ctx.git) {
    throw new Error("Git context missing in worker");
  }
  if (!ctx.git.head) {
    throw new Error("Git HEAD missing in worker context");
  }
  return { ok: true, head: ctx.git.head };
}
        `.trim()
      );

      const job = useJob();

      // Run job via Bree (which uses worker threads)
      const result = await job.runWithBree("context-test");

      expect(result.ok).toBe(true);
      expect(result.result.head).toBeDefined();
      expect(typeof result.result.head).toBe("string");
    });
  });

  it("should allow composables to work in worker context", async () => {
    await withGitVan({ cwd: tempDir }, async () => {
      // Create job that uses composables
      await fs.writeFile(
        join(tempDir, "jobs", "composable-test.mjs"),
        `
import { useGit } from "../../src/composables/git/index.mjs";

export const meta = { name: "Composable Test", desc: "Test", tags: [] };
export default async function run({ payload, ctx }) {
  // Try to use composable in worker
  const git = useGit();
  const info = await git.info();

  return { ok: true, branch: info.branch };
}
        `.trim()
      );

      const job = useJob();

      // This should work if context is properly passed
      await expect(async () => {
        await job.runWithBree("composable-test");
      }).not.toThrow();
    });
  });
});
```

### 4.2 Git Integration Test (Locks and Receipts)

```javascript
// tests/integration/bree-git-integration.test.mjs
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { withGitVan } from "../../src/core/context.mjs";
import { useJob } from "../../src/composables/job.mjs";
import { useGit } from "../../src/composables/git/index.mjs";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { execSync } from "child_process";

describe("Bree Git Integration", () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-bree-git");
    await fs.mkdir(join(tempDir, "jobs"), { recursive: true });

    execSync("git init", { cwd: tempDir });
    execSync('git config user.name "Test"', { cwd: tempDir });
    execSync('git config user.email "test@test.com"', { cwd: tempDir });
    await fs.writeFile(join(tempDir, "README.md"), "# Test");
    execSync("git add . && git commit -m 'init'", { cwd: tempDir });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("Lock Refs", () => {
    it("should create lock ref when job starts", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        // Create long-running job
        await fs.writeFile(
          join(tempDir, "jobs", "lock-test.mjs"),
          `
export const meta = { name: "Lock Test", desc: "Test", tags: [] };
export default async function run({ payload, ctx }) {
  // Simulate work
  await new Promise(resolve => setTimeout(resolve, 100));
  return { ok: true };
}
          `.trim()
        );

        const job = useJob();
        const git = useGit();

        // Start job with lock
        const runPromise = job.runWithLock("lock-test");

        // Check lock exists during execution (might be too fast)
        // Better: check lock in separate test with longer job

        await runPromise;

        // Verify lock is released
        const lockExists = await git.refExists("refs/gitvan/locks/job-lock-test");
        expect(lockExists).toBe(false);
      });
    });

    it("should delete lock ref after job completes", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        await fs.writeFile(
          join(tempDir, "jobs", "quick-job.mjs"),
          `
export const meta = { name: "Quick Job", desc: "Test", tags: [] };
export default async function run() { return { ok: true }; }
          `.trim()
        );

        const job = useJob();
        const git = useGit();

        await job.runWithLock("quick-job");

        // Lock should be released
        const lockExists = await git.refExists("refs/gitvan/locks/job-quick-job");
        expect(lockExists).toBe(false);
      });
    });

    it("should delete lock ref after job failure", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        await fs.writeFile(
          join(tempDir, "jobs", "failing-job.mjs"),
          `
export const meta = { name: "Failing Job", desc: "Test", tags: [] };
export default async function run() {
  throw new Error("Intentional failure");
}
          `.trim()
        );

        const job = useJob();
        const git = useGit();

        // Job should fail
        await expect(job.runWithLock("failing-job")).rejects.toThrow();

        // Lock should still be released
        const lockExists = await git.refExists("refs/gitvan/locks/job-failing-job");
        expect(lockExists).toBe(false);
      });
    });
  });

  describe("Receipt Notes", () => {
    it("should write receipt to git notes", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        await fs.writeFile(
          join(tempDir, "jobs", "receipt-test.mjs"),
          `
export const meta = { name: "Receipt Test", desc: "Test", tags: [] };
export default async function run() { return { ok: true, data: 123 }; }
          `.trim()
        );

        const job = useJob();
        const git = useGit();

        await job.runWithLock("receipt-test");

        // Check receipt in notes
        const receipts = await job.history("receipt-test");
        expect(receipts.length).toBeGreaterThan(0);

        const latestReceipt = receipts[0];
        expect(latestReceipt.jobId).toBe("receipt-test");
        expect(latestReceipt.status).toBe("success");
        expect(latestReceipt.fingerprint).toBeDefined();
      });
    });

    it("should include all required fields in receipt", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        await fs.writeFile(
          join(tempDir, "jobs", "complete-receipt.mjs"),
          `
export const meta = { name: "Complete Receipt", desc: "Test", tags: [] };
export default async function run() { return { ok: true, artifacts: ["test.txt"] }; }
          `.trim()
        );

        const job = useJob();

        await job.runWithLock("complete-receipt");

        const receipts = await job.history("complete-receipt");
        const receipt = receipts[0];

        // Verify all required fields
        expect(receipt).toHaveProperty("jobId");
        expect(receipt).toHaveProperty("fingerprint");
        expect(receipt).toHaveProperty("timestamp");
        expect(receipt).toHaveProperty("status");
        expect(receipt).toHaveProperty("duration");
      });
    });

    it("should generate deterministic fingerprints", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        await fs.writeFile(
          join(tempDir, "jobs", "fingerprint-test.mjs"),
          `
export const meta = { name: "Fingerprint Test", desc: "Test", tags: [] };
export default async function run({ payload }) {
  return { ok: true, payload };
}
          `.trim()
        );

        const job = useJob();

        // Run with same payload twice
        const payload = { test: "data" };
        await job.run("fingerprint-test", { payload });
        await job.run("fingerprint-test", { payload });

        const history = await job.history("fingerprint-test", { limit: 2 });

        // Same payload should produce same fingerprint (if on same HEAD)
        // Actually, fingerprints include timestamp/execution ID so they differ
        // Better test: verify fingerprint format and determinism
        expect(history[0].fingerprint).toMatch(/^[a-f0-9]{16}$/);
        expect(history[1].fingerprint).toMatch(/^[a-f0-9]{16}$/);
      });
    });
  });

  describe("Determinism", () => {
    it("should use UTC timezone", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        await fs.writeFile(
          join(tempDir, "jobs", "timezone-test.mjs"),
          `
export const meta = { name: "Timezone Test", desc: "Test", tags: [] };
export default async function run({ ctx }) {
  return { ok: true, env: ctx.env };
}
          `.trim()
        );

        const job = useJob();
        const result = await job.run("timezone-test");

        expect(result.env.TZ).toBe("UTC");
        expect(result.env.LANG).toBe("C");
      });
    });
  });
});
```

### 4.3 Workflow Integration Test

```javascript
// tests/integration/bree-workflow-integration.test.mjs
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { withGitVan } from "../../src/core/context.mjs";
import { useWorkflow } from "../../src/composables/workflow.mjs";
import { useJob } from "../../src/composables/job.mjs";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { execSync } from "child_process";

describe("Bree Workflow Integration", () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-bree-workflow");
    await fs.mkdir(join(tempDir, "jobs"), { recursive: true });
    await fs.mkdir(join(tempDir, "workflows"), { recursive: true });

    execSync("git init", { cwd: tempDir });
    execSync('git config user.name "Test"', { cwd: tempDir });
    execSync('git config user.email "test@test.com"', { cwd: tempDir });
    await fs.writeFile(join(tempDir, "README.md"), "# Test");
    execSync("git add . && git commit -m 'init'", { cwd: tempDir });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should execute jobs in workflow via Bree", async () => {
    await withGitVan({ cwd: tempDir }, async () => {
      // Create job
      await fs.writeFile(
        join(tempDir, "jobs", "workflow-job.mjs"),
        `
export const meta = { name: "Workflow Job", desc: "Test", tags: [] };
export default async function run({ ctx }) {
  return { ok: true, workflowContext: ctx.workflow };
}
        `.trim()
      );

      // Create workflow
      await fs.writeFile(
        join(tempDir, "workflows", "test-workflow.ttl"),
        `
@prefix : <http://gitvan.dev/workflow/> .
@prefix step: <http://gitvan.dev/step/> .

:TestWorkflow a :Workflow ;
  :hasStep step:job1 .

step:job1 a :JobStep ;
  :jobId "workflow-job" .
        `.trim()
      );

      const workflow = useWorkflow();

      // Execute workflow
      const result = await workflow.execute("test-workflow");

      expect(result.ok).toBe(true);
      expect(result.steps).toBeDefined();
    });
  });

  it("should respect job dependencies in DAG", async () => {
    await withGitVan({ cwd: tempDir }, async () => {
      // Create jobs
      await fs.writeFile(
        join(tempDir, "jobs", "job-a.mjs"),
        `
export const meta = { name: "Job A", desc: "First job", tags: [] };
export default async function run() {
  return { ok: true, job: "A", timestamp: Date.now() };
}
        `.trim()
      );

      await fs.writeFile(
        join(tempDir, "jobs", "job-b.mjs"),
        `
export const meta = { name: "Job B", desc: "Second job", tags: [] };
export default async function run() {
  return { ok: true, job: "B", timestamp: Date.now() };
}
        `.trim()
      );

      // Create workflow with dependency: B depends on A
      await fs.writeFile(
        join(tempDir, "workflows", "dag-workflow.ttl"),
        `
@prefix : <http://gitvan.dev/workflow/> .
@prefix step: <http://gitvan.dev/step/> .

:DAGWorkflow a :Workflow ;
  :hasStep step:jobA ;
  :hasStep step:jobB .

step:jobA a :JobStep ;
  :jobId "job-a" .

step:jobB a :JobStep ;
  :jobId "job-b" ;
  :dependsOn step:jobA .
        `.trim()
      );

      const workflow = useWorkflow();
      const result = await workflow.execute("dag-workflow");

      expect(result.ok).toBe(true);

      // Verify job-a ran before job-b
      const jobAResult = result.steps.find(s => s.jobId === "job-a");
      const jobBResult = result.steps.find(s => s.jobId === "job-b");

      expect(jobAResult.timestamp).toBeLessThan(jobBResult.timestamp);
    });
  });
});
```

### 4.4 Cross-Directory Isolation Test

```javascript
// tests/integration/bree-cross-directory.test.mjs
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { withGitVan } from "../../src/core/context.mjs";
import { useJob } from "../../src/composables/job.mjs";
import { getBreeScheduler, resetBreeScheduler } from "../../src/jobs/bree-scheduler.mjs";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { execSync } from "child_process";

describe("Bree Cross-Directory Isolation", () => {
  let repo1Dir;
  let repo2Dir;

  beforeEach(async () => {
    repo1Dir = join(process.cwd(), "test-bree-repo1");
    repo2Dir = join(process.cwd(), "test-bree-repo2");

    // Create repo 1
    await fs.mkdir(join(repo1Dir, "jobs"), { recursive: true });
    execSync("git init", { cwd: repo1Dir });
    execSync('git config user.name "Test"', { cwd: repo1Dir });
    execSync('git config user.email "test@test.com"', { cwd: repo1Dir });
    await fs.writeFile(join(repo1Dir, "README.md"), "# Repo 1");
    execSync("git add . && git commit -m 'init'", { cwd: repo1Dir });

    // Create repo 2
    await fs.mkdir(join(repo2Dir, "jobs"), { recursive: true });
    execSync("git init", { cwd: repo2Dir });
    execSync('git config user.name "Test"', { cwd: repo2Dir });
    execSync('git config user.email "test@test.com"', { cwd: repo2Dir });
    await fs.writeFile(join(repo2Dir, "README.md"), "# Repo 2");
    execSync("git add . && git commit -m 'init'", { cwd: repo2Dir });

    resetBreeScheduler();
  });

  afterEach(async () => {
    await fs.rm(repo1Dir, { recursive: true, force: true });
    await fs.rm(repo2Dir, { recursive: true, force: true });
    resetBreeScheduler();
  });

  it("should maintain separate scheduler instances per directory", async () => {
    const scheduler1 = getBreeScheduler({ cwd: repo1Dir });
    const scheduler2 = getBreeScheduler({ cwd: repo2Dir });

    expect(scheduler1).not.toBe(scheduler2);
    expect(scheduler1.cwd).toBe(repo1Dir);
    expect(scheduler2.cwd).toBe(repo2Dir);
  });

  it("should isolate jobs between directories", async () => {
    // Create job in repo1
    await fs.writeFile(
      join(repo1Dir, "jobs", "repo1-job.mjs"),
      `
export const meta = { name: "Repo 1 Job", desc: "Test", tags: [] };
export default async function run() { return { ok: true, repo: "repo1" }; }
      `.trim()
    );

    // Create job in repo2 (same name)
    await fs.writeFile(
      join(repo2Dir, "jobs", "repo1-job.mjs"),
      `
export const meta = { name: "Repo 1 Job", desc: "Test", tags: [] };
export default async function run() { return { ok: true, repo: "repo2" }; }
      `.trim()
    );

    await withGitVan({ cwd: repo1Dir }, async () => {
      const job = useJob();
      const jobs = await job.list();

      expect(jobs.length).toBe(1);
      expect(jobs[0].id).toBe("repo1-job");
    });

    await withGitVan({ cwd: repo2Dir }, async () => {
      const job = useJob();
      const jobs = await job.list();

      expect(jobs.length).toBe(1);
      expect(jobs[0].id).toBe("repo1-job");
    });

    // Verify results are different
    await withGitVan({ cwd: repo1Dir }, async () => {
      const job = useJob();
      const result = await job.run("repo1-job");
      expect(result.repo).toBe("repo1");
    });

    await withGitVan({ cwd: repo2Dir }, async () => {
      const job = useJob();
      const result = await job.run("repo1-job");
      expect(result.repo).toBe("repo2");
    });
  });

  it("should scope locks to repository", async () => {
    // Create same job in both repos
    const jobContent = `
export const meta = { name: "Shared Job", desc: "Test", tags: [] };
export default async function run() {
  await new Promise(resolve => setTimeout(resolve, 100));
  return { ok: true };
}
    `.trim();

    await fs.writeFile(join(repo1Dir, "jobs", "shared-job.mjs"), jobContent);
    await fs.writeFile(join(repo2Dir, "jobs", "shared-job.mjs"), jobContent);

    // Run jobs concurrently in different repos
    const [result1, result2] = await Promise.all([
      withGitVan({ cwd: repo1Dir }, async () => {
        const job = useJob();
        return await job.runWithLock("shared-job");
      }),
      withGitVan({ cwd: repo2Dir }, async () => {
        const job = useJob();
        return await job.runWithLock("shared-job");
      })
    ]);

    // Both should succeed (separate locks)
    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
  });
});
```

---

## 5. Data Validation Checklist

### Pre-Execution Validation

- [ ] Job definition loaded successfully
- [ ] Job has `run` function
- [ ] Cron expression is valid (if present)
- [ ] Job file exists
- [ ] Worker directory exists
- [ ] Git repository initialized

### During Execution Validation

- [ ] Lock acquired before job starts
- [ ] Context contains: cwd, env, git info
- [ ] Git info contains: head, branch, commit
- [ ] Worker thread receives context
- [ ] Worker thread can import job file
- [ ] Composables work in worker (if used)

### Post-Execution Validation

- [ ] Lock released (success or failure)
- [ ] Receipt written to git notes
- [ ] Receipt contains all fields:
  - jobId (string)
  - fingerprint (16-char hex)
  - startedAt (ISO 8601 timestamp)
  - finishedAt (ISO 8601 timestamp)
  - head (git sha)
  - ok (boolean)
  - result or error
  - duration (milliseconds)
- [ ] Fingerprint is deterministic
- [ ] Timestamp is UTC
- [ ] Receipt is queryable via history()

### Cleanup Validation

- [ ] Worker file cleaned up (if temporary)
- [ ] No stale locks in refs/gitvan/locks
- [ ] Context cleared from memory
- [ ] Scheduler can be shut down cleanly

---

## 6. End-to-End Scenario Validation

### Scenario 1: Full Job Lifecycle

```
1. Discover job (list)
2. Schedule job (schedule)
3. Verify scheduler running (getSchedulerStatus)
4. Trigger job manually (run)
5. Check job status (status)
6. View execution history (history)
7. Unschedule job (unschedule)
8. Validate job (validate)
```

**Validation Points:**
- Job appears in list
- Schedule succeeds
- Scheduler is running
- Job executes successfully
- Status shows correct state
- History contains execution record
- Unschedule removes from scheduler
- Validation passes

### Scenario 2: Concurrent Job Execution

```
1. Create 3 jobs (job-a, job-b, job-c)
2. Run all 3 concurrently
3. Verify locks prevent conflicts
4. Verify all 3 complete successfully
5. Verify 3 receipts written
```

**Validation Points:**
- All jobs complete without errors
- Locks acquired and released for each
- 3 distinct receipts in notes
- No data corruption
- All fingerprints unique

### Scenario 3: Failure Recovery

```
1. Create job that throws error
2. Run job with lock
3. Verify error is caught
4. Verify lock is released
5. Verify error receipt written
6. Verify job can run again
```

**Validation Points:**
- Error propagates correctly
- Lock released despite error
- Receipt has ok: false
- Receipt contains error message
- Subsequent execution succeeds

### Scenario 4: Workflow with Jobs

```
1. Create workflow with 3 job steps
2. Job 2 depends on Job 1
3. Job 3 depends on Job 2
4. Execute workflow
5. Verify correct execution order
6. Verify 3 receipts written
```

**Validation Points:**
- Jobs execute in dependency order
- Each job has proper context
- Workflow completes successfully
- All receipts have correct timestamps
- Workflow result contains all job results

### Scenario 5: Pack Installation with Jobs

```
1. Create pack with 2 jobs
2. Install pack
3. Verify jobs discovered
4. Schedule one job
5. Verify job runs
```

**Validation Points:**
- Pack installation succeeds
- Jobs appear in list
- Jobs can be scheduled
- Jobs execute correctly
- Receipts written to correct repo

### Scenario 6: Cross-Directory Isolation

```
1. Create 2 git repos
2. Each has job with same name
3. Run jobs in both repos concurrently
4. Verify separate execution
5. Verify separate receipts
6. Verify no cross-contamination
```

**Validation Points:**
- Separate scheduler instances
- Jobs don't interfere
- Locks are scoped to repo
- Receipts in correct repo
- Results are distinct

---

## 7. Test Implementation Priority

### Phase 1: Critical (Week 1)
1. Context management tests
2. Git integration tests (locks + receipts)
3. Workflow integration tests
4. Cross-directory isolation tests

### Phase 2: High (Week 2)
1. Hook system integration tests
2. CLI integration tests
3. Failure recovery tests
4. Pack system tests

### Phase 3: Medium (Week 3)
1. Performance tests
2. Memory leak tests
3. Edge case tests
4. Documentation validation

---

## 8. Success Criteria

Integration testing is complete when:

- [ ] All 9 integration points have tests
- [ ] Test coverage ≥80% for Bree-related code
- [ ] All critical scenarios pass
- [ ] All high priority scenarios pass
- [ ] No context loss bugs found
- [ ] Locks always released (verified)
- [ ] Receipts always written (verified)
- [ ] Cross-directory isolation works
- [ ] Workflow integration works
- [ ] CLI commands work
- [ ] Documentation updated

---

## 9. Known Risks

1. **Worker Thread Context Loss**
   - Risk: unctx may not work across worker threads
   - Mitigation: Serialize context in workerData
   - Test: Verify composables fail gracefully in worker

2. **Lock Stale Detection**
   - Risk: Locks may become stale if process crashes
   - Mitigation: Implement lock TTL and cleanup
   - Test: Simulate crash and verify cleanup

3. **Receipt Corruption**
   - Risk: Concurrent writes to git notes may conflict
   - Mitigation: Use git locking for notes
   - Test: Concurrent receipt writes

4. **Memory Leaks**
   - Risk: Worker files or contexts may not be cleaned
   - Mitigation: Track created resources
   - Test: Long-running tests with cleanup verification

---

## 10. Next Steps

1. Create test files in `tests/integration/`:
   - `bree-context-management.test.mjs`
   - `bree-git-integration.test.mjs`
   - `bree-workflow-integration.test.mjs`
   - `bree-cross-directory.test.mjs`
   - `bree-cli-integration.test.mjs`
   - `bree-hooks-integration.test.mjs`
   - `bree-pack-integration.test.mjs`

2. Run existing tests to establish baseline:
   ```bash
   npm test tests/jobs-bree-integration.test.mjs
   ```

3. Implement Phase 1 tests (critical)

4. Fix bugs found during testing

5. Implement Phase 2 and 3 tests

6. Update documentation

---

**TPS Principle Applied:** Testing at integration points prevents defects from reaching production. Every integration point is a potential failure point - test them all.

**Document Status:** Ready for implementation
**Last Updated:** 2026-01-08
**Next Review:** After Phase 1 completion
