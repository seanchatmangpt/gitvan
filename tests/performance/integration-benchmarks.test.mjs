// tests/performance/integration-benchmarks.test.mjs
// Performance benchmarks for job system integration

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { JobBridge, resetJobBridge } from "../../src/jobs/job-bridge.mjs";
import { resetBreeScheduler } from "../../src/jobs/bree-scheduler.mjs";
import { withGitVan } from "../../src/core/context.mjs";
import { useJob } from "../../src/composables/job.mjs";
import { createTestContext, createTestJob } from "../test-utils/context.mjs";

describe("Performance: Integration Benchmarks", () => {
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

  describe("Concurrent Job Execution", () => {
    it("should handle 10 concurrent jobs", async () => {
      await withGitVan(testContext, async () => {
        const jobs = await Promise.all(
          Array.from({ length: 10 }, (_, i) =>
            createTestJob(testContext.cwd, `concurrent-10-${i}`)
          )
        );

        const startTime = Date.now();

        const results = await Promise.all(
          jobs.map((job) => bridge.executeJobWithLock(job))
        );

        const duration = Date.now() - startTime;

        console.log(`10 concurrent jobs completed in ${duration}ms`);
        console.log(`Average: ${duration / 10}ms per job`);

        results.forEach((result) => {
          expect(result.ok).toBe(true);
        });

        expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      });
    }, 10000);

    it("should handle 100 concurrent jobs", async () => {
      await withGitVan(testContext, async () => {
        const jobs = await Promise.all(
          Array.from({ length: 100 }, (_, i) =>
            createTestJob(testContext.cwd, `concurrent-100-${i}`)
          )
        );

        const startTime = Date.now();

        const results = await Promise.all(
          jobs.map((job) => bridge.executeJobWithLock(job))
        );

        const duration = Date.now() - startTime;

        console.log(`100 concurrent jobs completed in ${duration}ms`);
        console.log(`Average: ${duration / 100}ms per job`);

        const successCount = results.filter((r) => r.ok).length;
        console.log(`Success rate: ${(successCount / 100) * 100}%`);

        expect(successCount).toBeGreaterThan(90); // At least 90% success rate
      });
    }, 30000);

    it("should benchmark 1000 concurrent jobs", async () => {
      await withGitVan(testContext, async () => {
        // Create jobs in batches
        const batchSize = 100;
        const totalJobs = 1000;
        let allJobs = [];

        for (let i = 0; i < totalJobs; i += batchSize) {
          const batch = await Promise.all(
            Array.from({ length: Math.min(batchSize, totalJobs - i) }, (_, j) =>
              createTestJob(testContext.cwd, `concurrent-1000-${i + j}`, {
                runFunction: `
export default async function run() {
  return { success: true, id: ${i + j} };
}
                `.trim(),
              })
            )
          );
          allJobs = allJobs.concat(batch);
        }

        const startTime = Date.now();
        const memoryBefore = process.memoryUsage().heapUsed;

        // Execute in batches to avoid overwhelming the system
        const results = [];
        for (let i = 0; i < allJobs.length; i += 50) {
          const batch = allJobs.slice(i, i + 50);
          const batchResults = await Promise.all(
            batch.map((job) => bridge.executeJobWithLock(job).catch((e) => ({ ok: false, error: e.message })))
          );
          results.push(...batchResults);
        }

        const duration = Date.now() - startTime;
        const memoryAfter = process.memoryUsage().heapUsed;
        const memoryIncrease = (memoryAfter - memoryBefore) / 1024 / 1024;

        const successCount = results.filter((r) => r.ok).length;

        console.log(`\n=== 1000 Jobs Benchmark ===`);
        console.log(`Total duration: ${duration}ms`);
        console.log(`Average per job: ${duration / totalJobs}ms`);
        console.log(`Throughput: ${(totalJobs / duration) * 1000} jobs/second`);
        console.log(`Success rate: ${(successCount / totalJobs) * 100}%`);
        console.log(`Memory increase: ${memoryIncrease.toFixed(2)}MB`);

        expect(successCount).toBeGreaterThan(totalJobs * 0.8); // At least 80% success
      });
    }, 120000); // 2 minutes timeout
  });

  describe("Memory Usage", () => {
    it("should measure memory usage for job execution", async () => {
      await withGitVan(testContext, async () => {
        const jobDef = await createTestJob(testContext.cwd, "memory-test-job");

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        const memoryBefore = process.memoryUsage();

        // Execute job 100 times
        for (let i = 0; i < 100; i++) {
          await bridge.executeJobWithLock(jobDef);
        }

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        const memoryAfter = process.memoryUsage();

        const heapIncrease = (memoryAfter.heapUsed - memoryBefore.heapUsed) / 1024 / 1024;
        const rssIncrease = (memoryAfter.rss - memoryBefore.rss) / 1024 / 1024;

        console.log(`\n=== Memory Usage ===`);
        console.log(`Heap increase: ${heapIncrease.toFixed(2)}MB`);
        console.log(`RSS increase: ${rssIncrease.toFixed(2)}MB`);
        console.log(`Per execution: ${(heapIncrease / 100).toFixed(4)}MB`);

        // Should not leak significant memory
        expect(heapIncrease).toBeLessThan(50); // Less than 50MB increase
      });
    }, 30000);

    it("should detect memory leaks", async () => {
      await withGitVan(testContext, async () => {
        const jobDef = await createTestJob(testContext.cwd, "leak-test-job");

        if (global.gc) global.gc();
        const baseline = process.memoryUsage().heapUsed;

        // Run multiple iterations and check memory growth
        const measurements = [];

        for (let i = 0; i < 5; i++) {
          // Execute 50 jobs
          for (let j = 0; j < 50; j++) {
            await bridge.executeJobWithLock(jobDef);
          }

          if (global.gc) global.gc();

          const current = process.memoryUsage().heapUsed;
          const increase = (current - baseline) / 1024 / 1024;
          measurements.push(increase);

          console.log(`Iteration ${i + 1}: +${increase.toFixed(2)}MB`);
        }

        // Check if memory growth stabilizes (no continuous leak)
        const lastTwo = measurements.slice(-2);
        const growth = lastTwo[1] - lastTwo[0];

        console.log(`Memory growth rate: ${growth.toFixed(2)}MB/iteration`);

        // Growth rate should be minimal after warmup
        expect(Math.abs(growth)).toBeLessThan(5); // Less than 5MB growth per 50 jobs
      });
    }, 60000);
  });

  describe("Lock Contention", () => {
    it("should measure lock contention with high concurrency", async () => {
      await withGitVan(testContext, async () => {
        const jobDef = await createTestJob(testContext.cwd, "contention-job", {
          runFunction: `
export default async function run() {
  await new Promise(resolve => setTimeout(resolve, 100));
  return { success: true };
}
          `.trim(),
        });

        const startTime = Date.now();
        const promises = [];

        // Try to execute same job 20 times concurrently
        for (let i = 0; i < 20; i++) {
          promises.push(
            bridge.executeJobWithLock(jobDef).catch((e) => ({ error: e.message }))
          );
        }

        const results = await Promise.all(promises);
        const duration = Date.now() - startTime;

        const successful = results.filter((r) => r.ok).length;
        const locked = results.filter((r) => r.error?.includes("already running")).length;

        console.log(`\n=== Lock Contention ===`);
        console.log(`Duration: ${duration}ms`);
        console.log(`Successful: ${successful}`);
        console.log(`Blocked by lock: ${locked}`);
        console.log(`Contention rate: ${(locked / 20) * 100}%`);

        // Expect high contention
        expect(locked).toBeGreaterThan(0);
        expect(successful).toBe(1); // Only one should succeed at a time
      });
    }, 30000);
  });

  describe("Receipt Write Throughput", () => {
    it("should measure receipt write throughput", async () => {
      await withGitVan(testContext, async () => {
        const { useReceipt } = await import("../../src/composables/receipt.mjs");
        const receipt = useReceipt();

        const count = 100;
        const startTime = Date.now();

        // Write many receipts
        for (let i = 0; i < count; i++) {
          await receipt.write({
            jobId: `throughput-job-${i}`,
            fingerprint: `fp-${i}`,
            startedAt: new Date().toISOString(),
            finishedAt: new Date().toISOString(),
            head: "abc123",
            ok: true,
            result: { success: true },
            duration: 100,
          });
        }

        const duration = Date.now() - startTime;
        const throughput = (count / duration) * 1000;

        console.log(`\n=== Receipt Throughput ===`);
        console.log(`Wrote ${count} receipts in ${duration}ms`);
        console.log(`Throughput: ${throughput.toFixed(2)} receipts/second`);

        expect(throughput).toBeGreaterThan(10); // At least 10 receipts/second
      });
    }, 30000);
  });

  describe("Scheduler Overhead", () => {
    it("should measure scheduler overhead", async () => {
      await withGitVan(testContext, async () => {
        const jobDef = await createTestJob(testContext.cwd, "overhead-job");

        // Execute without scheduler (direct)
        const directStart = Date.now();
        const job = useJob();
        await job.run("overhead-job");
        const directDuration = Date.now() - directStart;

        // Execute with scheduler (through bridge)
        const schedulerStart = Date.now();
        await bridge.executeJobWithLock(jobDef);
        const schedulerDuration = Date.now() - schedulerStart;

        const overhead = schedulerDuration - directDuration;
        const overheadPercent = (overhead / directDuration) * 100;

        console.log(`\n=== Scheduler Overhead ===`);
        console.log(`Direct execution: ${directDuration}ms`);
        console.log(`With scheduler: ${schedulerDuration}ms`);
        console.log(`Overhead: ${overhead}ms (${overheadPercent.toFixed(2)}%)`);

        // Overhead should be reasonable
        expect(overheadPercent).toBeLessThan(200); // Less than 200% overhead
      });
    });
  });

  describe("Parallel vs Sequential Performance", () => {
    it("should compare parallel vs sequential execution", async () => {
      await withGitVan(testContext, async () => {
        const jobs = await Promise.all(
          Array.from({ length: 10 }, (_, i) =>
            createTestJob(testContext.cwd, `parallel-test-${i}`, {
              runFunction: `
export default async function run() {
  await new Promise(resolve => setTimeout(resolve, 50));
  return { success: true };
}
              `.trim(),
            })
          )
        );

        // Sequential execution
        const seqStart = Date.now();
        for (const job of jobs) {
          await bridge.executeJobWithLock(job);
        }
        const seqDuration = Date.now() - seqStart;

        // Create new jobs for parallel test
        const parallelJobs = await Promise.all(
          Array.from({ length: 10 }, (_, i) =>
            createTestJob(testContext.cwd, `parallel-comp-${i}`, {
              runFunction: `
export default async function run() {
  await new Promise(resolve => setTimeout(resolve, 50));
  return { success: true };
}
              `.trim(),
            })
          )
        );

        // Parallel execution
        const parStart = Date.now();
        await Promise.all(
          parallelJobs.map((job) => bridge.executeJobWithLock(job))
        );
        const parDuration = Date.now() - parStart;

        const speedup = seqDuration / parDuration;

        console.log(`\n=== Parallel vs Sequential ===`);
        console.log(`Sequential: ${seqDuration}ms`);
        console.log(`Parallel: ${parDuration}ms`);
        console.log(`Speedup: ${speedup.toFixed(2)}x`);

        // Parallel should be significantly faster
        expect(speedup).toBeGreaterThan(3); // At least 3x faster
      });
    }, 30000);
  });
});
