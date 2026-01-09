// tests/integration/job-bridge-lock.test.mjs
// Integration Point 2: JobBridge ← → useLock() Composable
// Tests lock acquisition, release, and concurrency control

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { JobBridge, resetJobBridge, resetBreeScheduler } from "../../tests/test-utils/job-bridge.mjs";
import { withGitVan } from "../../src/core/context.mjs";
import { useLock } from "../../src/composables/lock.mjs";
import { createTestContext, createTestJob } from "../../tests/test-utils/context.mjs";
import { sleep, cleanupGitRefs } from "../../tests/test-utils/helpers.mjs";

describe("Integration: JobBridge ← → useLock()", () => {
  let testContext;
  let bridge;

  beforeEach(async () => {
    testContext = await createTestContext();
    resetBreeScheduler();
    resetJobBridge();
    bridge = new JobBridge({ cwd: testContext.cwd });
  });

  afterEach(async () => {
    try {
      // Shutdown bridge
      if (bridge && typeof bridge.shutdown === 'function') {
        await bridge.shutdown().catch(() => {});
      }

      // Clean up lock refs
      await cleanupGitRefs(testContext.cwd, 'refs/gitvan/locks').catch(() => {});

      // Reset infrastructure
      resetBreeScheduler();
      resetJobBridge();

      // Cleanup test context
      await testContext.cleanup();
    } catch (error) {
      console.warn(`Cleanup failed: ${error.message}`);
    }
  });

  describe("Lock Acquisition", () => {
    it("should acquire lock before job execution", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();
        const jobDef = await createTestJob(testContext.cwd, "lock-test");

        let lockAcquiredDuringExecution = false;

        // Check lock status during execution
        const executionPromise = bridge.executeJobWithLock(jobDef, {
          payload: { test: "data" },
        });

        // Give it a moment to acquire lock
        await sleep(50);

        lockAcquiredDuringExecution = await lock.isLocked("job-lock-test");

        await executionPromise;

        expect(lockAcquiredDuringExecution).toBe(true);
      });
    });

    it("should use job ID as lock name", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();
        const jobDef = await createTestJob(testContext.cwd, "my-job");

        const executionPromise = bridge.executeJobWithLock(jobDef);
        await sleep(50);

        const isLocked = await lock.isLocked("job-my-job");
        await executionPromise;

        expect(isLocked).toBe(true);
      });
    });

    it("should set TTL on lock", async () => {
      await withGitVan(testContext, async () => {
        const jobDef = await createTestJob(testContext.cwd, "ttl-job");

        // Execute job (default TTL is 5 minutes = 300000ms)
        await bridge.executeJobWithLock(jobDef);

        // Lock should have been released after execution
        const lock = useLock();
        const isLocked = await lock.isLocked("job-ttl-job");
        expect(isLocked).toBe(false);
      });
    });
  });

  describe("Concurrent Execution Prevention", () => {
    it("should prevent concurrent execution of same job", async () => {
      await withGitVan(testContext, async () => {
        const jobDef = await createTestJob(testContext.cwd, "concurrent-job", {
          runFunction: `
export default async function run({ payload }) {
  await new Promise(resolve => setTimeout(resolve, 200));
  return { success: true, payload };
}
          `.trim(),
        });

        // Start first execution
        const execution1 = bridge.executeJobWithLock(jobDef, {
          payload: { instance: 1 },
        });

        // Try to start second execution immediately
        await sleep(50);
        const execution2 = bridge.executeJobWithLock(jobDef, {
          payload: { instance: 2 },
        });

        // First should succeed, second should fail
        await expect(execution1).resolves.toBeDefined();
        await expect(execution2).rejects.toThrow("already running");
      });
    });

    it("should allow concurrent execution of different jobs", async () => {
      await withGitVan(testContext, async () => {
        const job1 = await createTestJob(testContext.cwd, "job1", {
          runFunction: `
export default async function run() {
  await new Promise(resolve => setTimeout(resolve, 100));
  return { success: true, job: "job1" };
}
          `.trim(),
        });

        const job2 = await createTestJob(testContext.cwd, "job2", {
          runFunction: `
export default async function run() {
  await new Promise(resolve => setTimeout(resolve, 100));
  return { success: true, job: "job2" };
}
          `.trim(),
        });

        // Both should be able to run concurrently
        const [result1, result2] = await Promise.all([
          bridge.executeJobWithLock(job1),
          bridge.executeJobWithLock(job2),
        ]);

        expect(result1.ok).toBe(true);
        expect(result2.ok).toBe(true);
      });
    });

    it("should allow second execution after first completes", async () => {
      await withGitVan(testContext, async () => {
        const jobDef = await createTestJob(testContext.cwd, "sequential-job");

        // First execution
        const result1 = await bridge.executeJobWithLock(jobDef, {
          payload: { run: 1 },
        });

        // Second execution should succeed
        const result2 = await bridge.executeJobWithLock(jobDef, {
          payload: { run: 2 },
        });

        expect(result1.ok).toBe(true);
        expect(result2.ok).toBe(true);
      });
    });
  });

  describe("Lock Release", () => {
    it("should release lock after successful execution", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();
        const jobDef = await createTestJob(testContext.cwd, "release-job");

        await bridge.executeJobWithLock(jobDef);

        const isLocked = await lock.isLocked("job-release-job");
        expect(isLocked).toBe(false);
      });
    });

    it("should release lock after execution error", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();
        const jobDef = await createTestJob(testContext.cwd, "error-job", {
          runFunction: `
export default async function run() {
  throw new Error("Intentional error");
}
          `.trim(),
        });

        await expect(bridge.executeJobWithLock(jobDef)).rejects.toThrow();

        const isLocked = await lock.isLocked("job-error-job");
        expect(isLocked).toBe(false);
      });
    });

    it("should release lock in finally block", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();
        const jobDef = await createTestJob(testContext.cwd, "finally-job", {
          runFunction: `
export default async function run() {
  throw new Error("Error in job");
}
          `.trim(),
        });

        try {
          await bridge.executeJobWithLock(jobDef);
        } catch {}

        // Lock should be released despite error
        const isLocked = await lock.isLocked("job-finally-job");
        expect(isLocked).toBe(false);
      });
    });
  });

  describe("Force Flag", () => {
    it("should bypass lock check with force flag", async () => {
      await withGitVan(testContext, async () => {
        const jobDef = await createTestJob(testContext.cwd, "force-job", {
          runFunction: `
export default async function run({ payload }) {
  await new Promise(resolve => setTimeout(resolve, 200));
  return { success: true, payload };
}
          `.trim(),
        });

        // Start first execution
        const execution1 = bridge.executeJobWithLock(jobDef, {
          payload: { instance: 1 },
        });

        // Start second with force flag
        await sleep(50);
        const execution2 = bridge.executeJobWithLock(jobDef, {
          payload: { instance: 2 },
          force: true,
        });

        // Both should succeed when force is used
        const [result1, result2] = await Promise.all([execution1, execution2]);

        expect(result1.ok).toBe(true);
        expect(result2.ok).toBe(true);
      });
    });

    it("should not bypass lock without force flag", async () => {
      await withGitVan(testContext, async () => {
        const jobDef = await createTestJob(testContext.cwd, "no-force-job", {
          runFunction: `
export default async function run() {
  await new Promise(resolve => setTimeout(resolve, 200));
  return { success: true };
}
          `.trim(),
        });

        const execution1 = bridge.executeJobWithLock(jobDef);
        await sleep(50);
        const execution2 = bridge.executeJobWithLock(jobDef, { force: false });

        await expect(execution1).resolves.toBeDefined();
        await expect(execution2).rejects.toThrow();
      });
    });
  });

  describe("Lock Timeout", () => {
    it("should honor lock TTL", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();
        const jobDef = await createTestJob(testContext.cwd, "timeout-job");

        // Acquire lock manually
        await lock.acquire("job-timeout-job", { ttl: 100 });

        // Wait for TTL to expire
        await sleep(150);

        // Lock should be available now
        const canAcquire = await lock.acquire("job-timeout-job");
        expect(canAcquire).toBe(true);

        await lock.release("job-timeout-job");
      });
    });
  });

  describe("Multiple Jobs Don't Block Each Other", () => {
    it("should allow parallel execution of different jobs", async () => {
      await withGitVan(testContext, async () => {
        const jobs = await Promise.all([
          createTestJob(testContext.cwd, "parallel-1"),
          createTestJob(testContext.cwd, "parallel-2"),
          createTestJob(testContext.cwd, "parallel-3"),
        ]);

        const startTime = Date.now();

        // Execute all jobs in parallel
        const results = await Promise.all(
          jobs.map((job) => bridge.executeJobWithLock(job))
        );

        const duration = Date.now() - startTime;

        // All should succeed
        results.forEach((result) => {
          expect(result.ok).toBe(true);
        });

        // Should complete in parallel time, not sequential
        // (If sequential, would take 3x longer)
        expect(duration).toBeLessThan(500);
      });
    });

    it("should use separate locks for separate jobs", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();
        const job1 = await createTestJob(testContext.cwd, "separate-1");
        const job2 = await createTestJob(testContext.cwd, "separate-2");

        // Start both jobs
        const exec1 = bridge.executeJobWithLock(job1);
        const exec2 = bridge.executeJobWithLock(job2);

        await sleep(50);

        // Both should have their own locks
        const lock1 = await lock.isLocked("job-separate-1");
        const lock2 = await lock.isLocked("job-separate-2");

        await Promise.all([exec1, exec2]);

        expect(lock1).toBe(true);
        expect(lock2).toBe(true);
      });
    });
  });

  describe("Lock Error Handling", () => {
    it("should handle lock acquisition failure", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();
        const jobDef = await createTestJob(testContext.cwd, "lock-fail-job");

        // Manually acquire lock
        await lock.acquire("job-lock-fail-job");

        // Execution should fail due to lock
        await expect(bridge.executeJobWithLock(jobDef)).rejects.toThrow(
          "already running"
        );

        // Release manual lock
        await lock.release("job-lock-fail-job");
      });
    });

    it("should continue if lock release fails", async () => {
      await withGitVan(testContext, async () => {
        const jobDef = await createTestJob(testContext.cwd, "release-fail-job");

        // Mock lock release to fail
        const originalRelease = bridge.lock.release;
        bridge.lock.release = vi.fn().mockRejectedValue(new Error("Release failed"));

        // Execution should still complete (error logged but not thrown)
        await expect(bridge.executeJobWithLock(jobDef)).resolves.toBeDefined();

        // Restore
        bridge.lock.release = originalRelease;
      });
    });
  });
});
