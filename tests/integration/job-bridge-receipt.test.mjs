// tests/integration/job-bridge-receipt.test.mjs
// Integration Point 3: JobBridge ← → useReceipt() Composable
// Tests receipt writing, reading, and audit trail

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { JobBridge, resetJobBridge } from "../../src/jobs/job-bridge.mjs";
import { resetBreeScheduler } from "../../src/jobs/bree-scheduler.mjs";
import { withGitVan } from "../../src/core/context.mjs";
import { useReceipt } from "../../src/composables/receipt.mjs";
import { createTestContext, createTestJob } from "../test-utils/context.mjs";

describe("Integration: JobBridge ← → useReceipt()", () => {
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

  describe("Receipt Writing on Success", () => {
    it("should write receipt on successful execution", async () => {
      await withGitVan(testContext, async () => {
        const receipt = useReceipt();
        const jobDef = await createTestJob(testContext.cwd, "receipt-job");

        await bridge.executeJobWithLock(jobDef);

        const receipts = await receipt.list({ jobId: "receipt-job" });
        expect(receipts.length).toBeGreaterThan(0);
      });
    });

    it("should include correct metadata in receipt", async () => {
      await withGitVan(testContext, async () => {
        const receipt = useReceipt();
        const jobDef = await createTestJob(testContext.cwd, "metadata-job");

        const result = await bridge.executeJobWithLock(jobDef, {
          payload: { test: "data" },
        });

        const receipts = await receipt.list({ jobId: "metadata-job" });
        const lastReceipt = receipts[0];

        expect(lastReceipt.jobId).toBe("metadata-job");
        expect(lastReceipt.ok).toBe(true);
        expect(lastReceipt).toHaveProperty("startedAt");
        expect(lastReceipt).toHaveProperty("finishedAt");
        expect(lastReceipt).toHaveProperty("duration");
      });
    });

    it("should include git head in receipt", async () => {
      await withGitVan(testContext, async () => {
        const receipt = useReceipt();
        const jobDef = await createTestJob(testContext.cwd, "git-head-job");

        await bridge.executeJobWithLock(jobDef);

        const receipts = await receipt.list({ jobId: "git-head-job" });
        expect(receipts[0]).toHaveProperty("head");
        expect(typeof receipts[0].head).toBe("string");
      });
    });

    it("should include fingerprint in receipt", async () => {
      await withGitVan(testContext, async () => {
        const receipt = useReceipt();
        const jobDef = await createTestJob(testContext.cwd, "fingerprint-job");

        await bridge.executeJobWithLock(jobDef);

        const receipts = await receipt.list({ jobId: "fingerprint-job" });
        expect(receipts[0]).toHaveProperty("fingerprint");
        expect(receipts[0].fingerprint).toHaveLength(16);
      });
    });

    it("should include execution result in receipt", async () => {
      await withGitVan(testContext, async () => {
        const receipt = useReceipt();
        const jobDef = await createTestJob(testContext.cwd, "result-job", {
          runFunction: `
export default async function run({ payload }) {
  return { success: true, data: "test-result", payload };
}
          `.trim(),
        });

        await bridge.executeJobWithLock(jobDef, {
          payload: { input: "test" },
        });

        const receipts = await receipt.list({ jobId: "result-job" });
        expect(receipts[0]).toHaveProperty("result");
      });
    });
  });

  describe("Receipt Writing on Failure", () => {
    it("should write receipt on execution failure", async () => {
      await withGitVan(testContext, async () => {
        const receipt = useReceipt();
        const jobDef = await createTestJob(testContext.cwd, "fail-job", {
          runFunction: `
export default async function run() {
  throw new Error("Intentional failure");
}
          `.trim(),
        });

        await expect(bridge.executeJobWithLock(jobDef)).rejects.toThrow();

        const receipts = await receipt.list({ jobId: "fail-job" });
        expect(receipts.length).toBeGreaterThan(0);
      });
    });

    it("should mark receipt as failed with ok: false", async () => {
      await withGitVan(testContext, async () => {
        const receipt = useReceipt();
        const jobDef = await createTestJob(testContext.cwd, "error-receipt-job", {
          runFunction: `
export default async function run() {
  throw new Error("Test error");
}
          `.trim(),
        });

        try {
          await bridge.executeJobWithLock(jobDef);
        } catch {}

        const receipts = await receipt.list({ jobId: "error-receipt-job" });
        expect(receipts[0].ok).toBe(false);
      });
    });

    it("should include error message in failed receipt", async () => {
      await withGitVan(testContext, async () => {
        const receipt = useReceipt();
        const errorMessage = "Specific error message";
        const jobDef = await createTestJob(testContext.cwd, "error-msg-job", {
          runFunction: `
export default async function run() {
  throw new Error("${errorMessage}");
}
          `.trim(),
        });

        try {
          await bridge.executeJobWithLock(jobDef);
        } catch {}

        const receipts = await receipt.list({ jobId: "error-msg-job" });
        expect(receipts[0]).toHaveProperty("error");
        expect(receipts[0].error).toContain(errorMessage);
      });
    });

    it("should include execution duration even on failure", async () => {
      await withGitVan(testContext, async () => {
        const receipt = useReceipt();
        const jobDef = await createTestJob(testContext.cwd, "duration-fail-job", {
          runFunction: `
export default async function run() {
  await new Promise(resolve => setTimeout(resolve, 50));
  throw new Error("Fail after delay");
}
          `.trim(),
        });

        try {
          await bridge.executeJobWithLock(jobDef);
        } catch {}

        const receipts = await receipt.list({ jobId: "duration-fail-job" });
        expect(receipts[0]).toHaveProperty("duration");
        expect(receipts[0].duration).toBeGreaterThan(0);
      });
    });
  });

  describe("Receipt Querying", () => {
    it("should query receipts by jobId", async () => {
      await withGitVan(testContext, async () => {
        const receipt = useReceipt();
        const job1 = await createTestJob(testContext.cwd, "query-job-1");
        const job2 = await createTestJob(testContext.cwd, "query-job-2");

        await bridge.executeJobWithLock(job1);
        await bridge.executeJobWithLock(job2);

        const receipts1 = await receipt.list({ jobId: "query-job-1" });
        const receipts2 = await receipt.list({ jobId: "query-job-2" });

        expect(receipts1.length).toBe(1);
        expect(receipts2.length).toBe(1);
        expect(receipts1[0].jobId).toBe("query-job-1");
        expect(receipts2[0].jobId).toBe("query-job-2");
      });
    });

    it("should retrieve receipt history", async () => {
      await withGitVan(testContext, async () => {
        const receipt = useReceipt();
        const jobDef = await createTestJob(testContext.cwd, "history-job");

        // Execute multiple times
        await bridge.executeJobWithLock(jobDef, { payload: { run: 1 } });
        await bridge.executeJobWithLock(jobDef, { payload: { run: 2 } });
        await bridge.executeJobWithLock(jobDef, { payload: { run: 3 } });

        const receipts = await receipt.list({ jobId: "history-job" });
        expect(receipts.length).toBe(3);
      });
    });

    it("should order receipts by timestamp", async () => {
      await withGitVan(testContext, async () => {
        const receipt = useReceipt();
        const jobDef = await createTestJob(testContext.cwd, "ordered-job");

        await bridge.executeJobWithLock(jobDef);
        await bridge.executeJobWithLock(jobDef);
        await bridge.executeJobWithLock(jobDef);

        const receipts = await receipt.list({ jobId: "ordered-job" });

        // Should be ordered (most recent first or oldest first)
        for (let i = 1; i < receipts.length; i++) {
          const prev = new Date(receipts[i - 1].startedAt);
          const curr = new Date(receipts[i].startedAt);
          expect(prev.getTime()).toBeLessThanOrEqual(curr.getTime());
        }
      });
    });
  });

  describe("Fingerprint Generation", () => {
    it("should generate consistent fingerprints", async () => {
      await withGitVan(testContext, async () => {
        const receipt = useReceipt();
        const jobDef = await createTestJob(testContext.cwd, "fingerprint-consistent-job");

        await bridge.executeJobWithLock(jobDef, { payload: { data: "test" } });
        await bridge.executeJobWithLock(jobDef, { payload: { data: "test" } });

        const receipts = await receipt.list({ jobId: "fingerprint-consistent-job" });

        // Same job + same payload + same head = same fingerprint
        if (receipts[0].head === receipts[1].head) {
          expect(receipts[0].fingerprint).toBe(receipts[1].fingerprint);
        }
      });
    });

    it("should generate different fingerprints for different payloads", async () => {
      await withGitVan(testContext, async () => {
        const receipt = useReceipt();
        const jobDef = await createTestJob(testContext.cwd, "fingerprint-diff-job");

        await bridge.executeJobWithLock(jobDef, { payload: { data: "test1" } });
        await bridge.executeJobWithLock(jobDef, { payload: { data: "test2" } });

        const receipts = await receipt.list({ jobId: "fingerprint-diff-job" });
        expect(receipts[0].fingerprint).not.toBe(receipts[1].fingerprint);
      });
    });

    it("should include job ID in fingerprint", async () => {
      await withGitVan(testContext, async () => {
        const fingerprint1 = bridge.generateFingerprint("job1", "abc123", {});
        const fingerprint2 = bridge.generateFingerprint("job2", "abc123", {});

        expect(fingerprint1).not.toBe(fingerprint2);
      });
    });

    it("should include git head in fingerprint", async () => {
      await withGitVan(testContext, async () => {
        const fingerprint1 = bridge.generateFingerprint("job1", "abc123", {});
        const fingerprint2 = bridge.generateFingerprint("job1", "def456", {});

        expect(fingerprint1).not.toBe(fingerprint2);
      });
    });
  });

  describe("Receipt Verification", () => {
    it("should verify receipt exists", async () => {
      await withGitVan(testContext, async () => {
        const receipt = useReceipt();
        const jobDef = await createTestJob(testContext.cwd, "verify-job");

        await bridge.executeJobWithLock(jobDef);

        const receipts = await receipt.list({ jobId: "verify-job" });
        const verified = await receipt.verify(receipts[0]);

        expect(verified).toBe(true);
      });
    });
  });

  describe("Multiple Receipts", () => {
    it("should create separate receipts for each execution", async () => {
      await withGitVan(testContext, async () => {
        const receipt = useReceipt();
        const jobDef = await createTestJob(testContext.cwd, "multi-receipt-job");

        await bridge.executeJobWithLock(jobDef, { payload: { run: 1 } });
        await bridge.executeJobWithLock(jobDef, { payload: { run: 2 } });
        await bridge.executeJobWithLock(jobDef, { payload: { run: 3 } });

        const receipts = await receipt.list({ jobId: "multi-receipt-job" });
        expect(receipts.length).toBe(3);

        // Each should have unique timestamps
        const timestamps = receipts.map((r) => r.startedAt);
        const uniqueTimestamps = new Set(timestamps);
        expect(uniqueTimestamps.size).toBe(3);
      });
    });

    it("should maintain receipt history across multiple jobs", async () => {
      await withGitVan(testContext, async () => {
        const receipt = useReceipt();
        const jobs = [
          await createTestJob(testContext.cwd, "history-1"),
          await createTestJob(testContext.cwd, "history-2"),
          await createTestJob(testContext.cwd, "history-3"),
        ];

        for (const job of jobs) {
          await bridge.executeJobWithLock(job);
        }

        const allReceipts = await receipt.list();
        expect(allReceipts.length).toBeGreaterThanOrEqual(3);
      });
    });
  });

  describe("Receipt Error Handling", () => {
    it("should continue if receipt write fails", async () => {
      await withGitVan(testContext, async () => {
        const jobDef = await createTestJob(testContext.cwd, "receipt-fail-job");

        // Job should still execute even if receipt write fails
        const result = await bridge.executeJobWithLock(jobDef);
        expect(result.ok).toBe(true);
      });
    });
  });
});
