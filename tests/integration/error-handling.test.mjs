// tests/integration/error-handling.test.mjs
// Integration Point 10: Error Handling & Recovery
// Tests error scenarios and recovery mechanisms

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { JobBridge, resetJobBridge } from "../../src/jobs/job-bridge.mjs";
import { resetBreeScheduler } from "../../src/jobs/bree-scheduler.mjs";
import { withGitVan } from "../../src/core/context.mjs";
import { useJob } from "../../src/composables/job.mjs";
import { useReceipt } from "../../src/composables/receipt.mjs";
import { useLock } from "../../src/composables/lock.mjs";
import { createTestContext, createTestJob } from "../test-utils/context.mjs";
import { sleep } from "../test-utils/helpers.mjs";

describe("Integration: Error Handling & Recovery", () => {
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
      await bridge.shutdown();
    } catch {}
    resetBreeScheduler();
    resetJobBridge();
    await testContext.cleanup();
  });

  describe("Job Error Causes Receipt Write", () => {
    it("should write receipt on job error", async () => {
      await withGitVan(testContext, async () => {
        const receipt = useReceipt();
        const jobDef = await createTestJob(testContext.cwd, "error-receipt-job", {
          runFunction: `
export default async function run() {
  throw new Error("Job failed");
}
          `.trim(),
        });

        try {
          await bridge.executeJobWithLock(jobDef);
        } catch {}

        const receipts = await receipt.list({ jobId: "error-receipt-job" });
        expect(receipts.length).toBeGreaterThan(0);
        expect(receipts[0].ok).toBe(false);
        expect(receipts[0].error).toContain("Job failed");
      });
    });

    it("should include error details in receipt", async () => {
      await withGitVan(testContext, async () => {
        const receipt = useReceipt();
        const errorMessage = "Specific error message";
        const jobDef = await createTestJob(testContext.cwd, "error-details-job", {
          runFunction: `
export default async function run() {
  throw new Error("${errorMessage}");
}
          `.trim(),
        });

        try {
          await bridge.executeJobWithLock(jobDef);
        } catch {}

        const receipts = await receipt.list({ jobId: "error-details-job" });
        expect(receipts[0].error).toContain(errorMessage);
      });
    });
  });

  describe("Lock Released on Job Error", () => {
    it("should release lock after job error", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();
        const jobDef = await createTestJob(testContext.cwd, "lock-error-job", {
          runFunction: `
export default async function run() {
  throw new Error("Error during execution");
}
          `.trim(),
        });

        try {
          await bridge.executeJobWithLock(jobDef);
        } catch {}

        const isLocked = await lock.isLocked("job-lock-error-job");
        expect(isLocked).toBe(false);
      });
    });

    it("should allow retry after error", async () => {
      await withGitVan(testContext, async () => {
        let attempt = 0;
        const jobDef = await createTestJob(testContext.cwd, "retry-job", {
          runFunction: `
let attempt = 0;
export default async function run() {
  attempt++;
  if (attempt === 1) {
    throw new Error("First attempt fails");
  }
  return { success: true, attempt };
}
          `.trim(),
        });

        // First attempt fails
        try {
          await bridge.executeJobWithLock(jobDef);
        } catch {}

        // Second attempt should succeed
        const result = await bridge.executeJobWithLock(jobDef);
        expect(result.ok).toBe(true);
      });
    });
  });

  describe("Scheduler Continues After Job Error", () => {
    it("should continue scheduling after job error", async () => {
      await withGitVan(testContext, async () => {
        const failJob = await createTestJob(testContext.cwd, "fail-job", {
          runFunction: `
export default async function run() {
  throw new Error("Fail");
}
          `.trim(),
        });

        const successJob = await createTestJob(testContext.cwd, "success-job");

        // Schedule both
        await bridge.scheduleJob(failJob);
        await bridge.scheduleJob(successJob);

        // Both should be scheduled
        expect(bridge.scheduler.hasJob("fail-job")).toBe(true);
        expect(bridge.scheduler.hasJob("success-job")).toBe(true);
      });
    });

    it("should not stop scheduler on single job failure", async () => {
      await withGitVan(testContext, async () => {
        const job = useJob();
        await job.startScheduler();

        const failJob = await createTestJob(testContext.cwd, "scheduler-fail-job", {
          runFunction: `
export default async function run() {
  throw new Error("Scheduler test fail");
}
          `.trim(),
        });

        try {
          await job.runWithBree("scheduler-fail-job");
        } catch {}

        // Scheduler should still be running
        const status = job.getSchedulerStatus();
        expect(status.isRunning).toBe(true);

        await job.stopScheduler();
      });
    });
  });

  describe("Graceful Error Messages", () => {
    it("should provide clear error message for missing job", async () => {
      await withGitVan(testContext, async () => {
        const job = useJob();

        await expect(job.get("non-existent-job")).rejects.toThrow(
          "Job not found"
        );
      });
    });

    it("should provide clear error message for invalid job", async () => {
      await withGitVan(testContext, async () => {
        const job = useJob();

        // Create invalid job (no run function)
        await createTestJob(testContext.cwd, "invalid-job", {
          runFunction: "export const meta = { name: 'Invalid' };",
        });

        const validation = await job.validate("invalid-job");
        expect(validation.valid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });

    it("should provide clear error message for lock failure", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();
        const jobDef = await createTestJob(testContext.cwd, "lock-fail-job");

        // Acquire lock manually
        await lock.acquire("job-lock-fail-job");

        // Execution should fail with clear message
        await expect(bridge.executeJobWithLock(jobDef)).rejects.toThrow(
          "already running"
        );

        await lock.release("job-lock-fail-job");
      });
    });
  });

  describe("Recovery from Transient Failures", () => {
    it("should recover from temporary errors", async () => {
      await withGitVan(testContext, async () => {
        let attempts = 0;
        const jobDef = await createTestJob(testContext.cwd, "transient-job", {
          runFunction: `
let attempts = 0;
export default async function run() {
  attempts++;
  if (attempts < 3) {
    throw new Error("Transient failure");
  }
  return { success: true, attempts };
}
          `.trim(),
        });

        // Fail twice
        try {
          await bridge.executeJobWithLock(jobDef);
        } catch {}
        try {
          await bridge.executeJobWithLock(jobDef);
        } catch {}

        // Third time succeeds
        const result = await bridge.executeJobWithLock(jobDef);
        expect(result.ok).toBe(true);
      });
    });

    it("should maintain state after recovery", async () => {
      await withGitVan(testContext, async () => {
        const receipt = useReceipt();
        const jobDef = await createTestJob(testContext.cwd, "state-job");

        // Successful execution
        await bridge.executeJobWithLock(jobDef);

        // Failed execution
        const failJob = await createTestJob(testContext.cwd, "fail-state-job", {
          runFunction: `
export default async function run() {
  throw new Error("Fail");
}
          `.trim(),
        });

        try {
          await bridge.executeJobWithLock(failJob);
        } catch {}

        // State should be maintained
        const receipts = await receipt.list({ jobId: "state-job" });
        expect(receipts.length).toBe(1);
        expect(receipts[0].ok).toBe(true);
      });
    });
  });

  describe("Invalid Job Definition Handling", () => {
    it("should reject job without ID", async () => {
      await withGitVan(testContext, async () => {
        const invalidJob = {
          id: null,
          file: "/path/to/job.mjs",
          meta: { name: "Invalid" },
        };

        await expect(bridge.scheduleJob(invalidJob)).rejects.toThrow();
      });
    });

    it("should reject job without file", async () => {
      await withGitVan(testContext, async () => {
        const invalidJob = {
          id: "no-file-job",
          file: null,
          meta: { name: "No File" },
        };

        await expect(bridge.scheduleJob(invalidJob)).rejects.toThrow();
      });
    });

    it("should validate job before execution", async () => {
      await withGitVan(testContext, async () => {
        const job = useJob();

        // Create job without run function
        await createTestJob(testContext.cwd, "no-run-job", {
          runFunction: "export const meta = { name: 'No Run' };",
        });

        const validation = await job.validate("no-run-job");
        expect(validation.valid).toBe(false);
      });
    });
  });

  describe("Missing Job Module Handling", () => {
    it("should handle missing job file", async () => {
      await withGitVan(testContext, async () => {
        const job = useJob();

        await expect(job.get("missing-job")).rejects.toThrow();
      });
    });

    it("should handle corrupted job file", async () => {
      await withGitVan(testContext, async () => {
        const { promises: fs } = await import("node:fs");
        const { join } = await import("pathe");

        // Create corrupted job file
        const jobFile = join(testContext.cwd, "jobs", "corrupted.mjs");
        await fs.writeFile(jobFile, "this is not valid javascript {{{", "utf8");

        const job = useJob();
        await expect(job.get("corrupted")).rejects.toThrow();
      });
    });
  });

  describe("Timeout Handling", () => {
    it("should handle job timeout", async () => {
      await withGitVan(testContext, async () => {
        const jobDef = await createTestJob(testContext.cwd, "timeout-job", {
          runFunction: `
export default async function run() {
  await new Promise(resolve => setTimeout(resolve, 5000));
  return { success: true };
}
          `.trim(),
        });

        // Set short timeout
        const timeoutPromise = Promise.race([
          bridge.executeJobWithLock(jobDef),
          sleep(100).then(() => {
            throw new Error("Timeout");
          }),
        ]);

        await expect(timeoutPromise).rejects.toThrow("Timeout");
      });
    });
  });

  describe("Worker Crash Handling", () => {
    it("should handle worker exit", async () => {
      await withGitVan(testContext, async () => {
        const jobDef = await createTestJob(testContext.cwd, "exit-job", {
          runFunction: `
export default async function run() {
  process.exit(1);
}
          `.trim(),
        });

        await expect(bridge.executeJobWithLock(jobDef)).rejects.toThrow();
      });
    });

    it("should cleanup after worker crash", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();
        const jobDef = await createTestJob(testContext.cwd, "crash-job", {
          runFunction: `
export default async function run() {
  throw new Error("Crash");
}
          `.trim(),
        });

        try {
          await bridge.executeJobWithLock(jobDef);
        } catch {}

        // Lock should be released
        const isLocked = await lock.isLocked("job-crash-job");
        expect(isLocked).toBe(false);
      });
    });
  });

  describe("Multiple Error Scenarios", () => {
    it("should handle multiple consecutive errors", async () => {
      await withGitVan(testContext, async () => {
        const receipt = useReceipt();
        const jobDef = await createTestJob(testContext.cwd, "multi-error-job", {
          runFunction: `
export default async function run() {
  throw new Error("Always fails");
}
          `.trim(),
        });

        // Multiple failures
        for (let i = 0; i < 3; i++) {
          try {
            await bridge.executeJobWithLock(jobDef);
          } catch {}
        }

        // All should be recorded
        const receipts = await receipt.list({ jobId: "multi-error-job" });
        expect(receipts.length).toBe(3);
        receipts.forEach((r) => expect(r.ok).toBe(false));
      });
    });

    it("should isolate errors between different jobs", async () => {
      await withGitVan(testContext, async () => {
        const failJob = await createTestJob(testContext.cwd, "isolate-fail-job", {
          runFunction: `
export default async function run() {
  throw new Error("Fail");
}
          `.trim(),
        });

        const successJob = await createTestJob(testContext.cwd, "isolate-success-job");

        try {
          await bridge.executeJobWithLock(failJob);
        } catch {}

        // Other job should still work
        const result = await bridge.executeJobWithLock(successJob);
        expect(result.ok).toBe(true);
      });
    });
  });

  describe("Error Recovery Patterns", () => {
    it("should support error recovery with finally", async () => {
      await withGitVan(testContext, async () => {
        const lock = useLock();
        let finallyCalled = false;

        const jobDef = await createTestJob(testContext.cwd, "finally-job", {
          runFunction: `
let finallyCalled = false;
export default async function run() {
  try {
    throw new Error("Error");
  } finally {
    finallyCalled = true;
  }
}
          `.trim(),
        });

        try {
          await bridge.executeJobWithLock(jobDef);
        } catch {}

        // Lock should still be released (bridge's finally)
        const isLocked = await lock.isLocked("job-finally-job");
        expect(isLocked).toBe(false);
      });
    });

    it("should support graceful degradation", async () => {
      await withGitVan(testContext, async () => {
        const jobDef = await createTestJob(testContext.cwd, "degrade-job", {
          runFunction: `
export default async function run() {
  try {
    throw new Error("Primary method failed");
  } catch (error) {
    // Fallback
    return { success: true, fallback: true };
  }
}
          `.trim(),
        });

        const result = await bridge.executeJobWithLock(jobDef);
        expect(result.ok).toBe(true);
      });
    });
  });
});
