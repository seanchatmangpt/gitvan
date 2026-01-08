// tests/integration/job-bridge-scheduler.test.mjs
// Integration Point 1: JobBridge ← → BreeScheduler
// Tests the integration between JobBridge and BreeScheduler

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { JobBridge, getJobBridge, resetJobBridge } from "../../src/jobs/job-bridge.mjs";
import { getBreeScheduler, resetBreeScheduler } from "../../src/jobs/bree-scheduler.mjs";
import { createTestContext, createTestJob } from "../test-utils/context.mjs";
import { createJobDefinition } from "../test-utils/fixtures.mjs";

describe("Integration: JobBridge ← → BreeScheduler", () => {
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

  describe("Singleton Management", () => {
    it("should get BreeScheduler singleton for cwd", () => {
      const scheduler1 = getBreeScheduler({ cwd: testContext.cwd });
      const scheduler2 = getBreeScheduler({ cwd: testContext.cwd });

      expect(scheduler1).toBe(scheduler2);
      expect(bridge.scheduler).toBe(scheduler1);
    });

    it("should create different schedulers for different cwds", async () => {
      const context2 = await createTestContext({ prefix: "gitvan-test-2" });

      try {
        const scheduler1 = getBreeScheduler({ cwd: testContext.cwd });
        const scheduler2 = getBreeScheduler({ cwd: context2.cwd });

        expect(scheduler1).not.toBe(scheduler2);
      } finally {
        await context2.cleanup();
      }
    });

    it("should share scheduler between multiple bridges with same cwd", () => {
      const bridge1 = new JobBridge({ cwd: testContext.cwd });
      const bridge2 = new JobBridge({ cwd: testContext.cwd });

      expect(bridge1.scheduler).toBe(bridge2.scheduler);
    });
  });

  describe("Job Definition Conversion", () => {
    it("should convert GitVan job to Bree config", async () => {
      const jobDef = await createTestJob(testContext.cwd, "test-job", {
        cron: "0 * * * *",
      });

      const breeConfig = bridge.toBreeJobConfig(jobDef);

      expect(breeConfig.name).toBe("test-job");
      expect(breeConfig.cron).toBe("0 * * * *");
      expect(breeConfig.path).toBeDefined();
      expect(breeConfig.worker).toBeDefined();
      expect(breeConfig.worker.workerData.jobId).toBe("test-job");
    });

    it("should handle job without cron schedule", async () => {
      const jobDef = await createTestJob(testContext.cwd, "on-demand-job");

      const breeConfig = bridge.toBreeJobConfig(jobDef);

      expect(breeConfig.name).toBe("on-demand-job");
      expect(breeConfig.cron).toBeUndefined();
      expect(breeConfig.interval).toBeUndefined();
    });

    it("should handle interval-based jobs", async () => {
      const jobDef = await createTestJob(testContext.cwd, "interval-job");

      const breeConfig = bridge.toBreeJobConfig(jobDef, { interval: "5m" });

      expect(breeConfig.interval).toBe("5m");
      expect(breeConfig.cron).toBeUndefined();
    });

    it("should include timeout in config", async () => {
      const jobDef = await createTestJob(testContext.cwd, "timeout-job");

      const breeConfig = bridge.toBreeJobConfig(jobDef, { timeout: 30000 });

      expect(breeConfig.timeout).toBe(30000);
    });
  });

  describe("Job Scheduling", () => {
    it("should schedule job with Bree", async () => {
      const jobDef = await createTestJob(testContext.cwd, "scheduled-job", {
        cron: "0 * * * *",
      });

      await bridge.scheduleJob(jobDef);

      expect(bridge.scheduler.hasJob("scheduled-job")).toBe(true);
      const jobs = bridge.scheduler.listJobs();
      expect(jobs).toHaveLength(1);
      expect(jobs[0].name).toBe("scheduled-job");
    });

    it("should schedule multiple jobs", async () => {
      const job1 = await createTestJob(testContext.cwd, "job1", {
        cron: "0 * * * *",
      });
      const job2 = await createTestJob(testContext.cwd, "job2", {
        cron: "0 0 * * *",
      });

      await bridge.scheduleJob(job1);
      await bridge.scheduleJob(job2);

      expect(bridge.scheduler.hasJob("job1")).toBe(true);
      expect(bridge.scheduler.hasJob("job2")).toBe(true);
      expect(bridge.scheduler.listJobs()).toHaveLength(2);
    });

    it("should update job if rescheduled", async () => {
      const jobDef = await createTestJob(testContext.cwd, "update-job", {
        cron: "0 * * * *",
      });

      await bridge.scheduleJob(jobDef);

      // Reschedule with different cron
      await bridge.unscheduleJob("update-job");
      await bridge.scheduleJob(jobDef, { cron: "0 0 * * *" });

      const jobs = bridge.scheduler.listJobs();
      expect(jobs).toHaveLength(1);
    });
  });

  describe("Job Unscheduling", () => {
    it("should unschedule job from Bree", async () => {
      const jobDef = await createTestJob(testContext.cwd, "remove-job", {
        cron: "0 * * * *",
      });

      await bridge.scheduleJob(jobDef);
      expect(bridge.scheduler.hasJob("remove-job")).toBe(true);

      await bridge.unscheduleJob("remove-job");
      expect(bridge.scheduler.hasJob("remove-job")).toBe(false);
    });

    it("should handle unscheduling non-existent job", async () => {
      // Should not throw
      await expect(
        bridge.unscheduleJob("non-existent-job")
      ).resolves.not.toThrow();
    });
  });

  describe("Scheduler State Reflection", () => {
    it("should reflect scheduler state in bridge status", async () => {
      const status = bridge.getStatus();

      expect(status).toHaveProperty("isRunning");
      expect(status).toHaveProperty("jobCount");
      expect(status).toHaveProperty("jobs");
      expect(status.isRunning).toBe(false);
    });

    it("should update status when scheduler starts", async () => {
      await bridge.start();

      const status = bridge.getStatus();
      expect(status.isRunning).toBe(true);

      await bridge.stop();
    });

    it("should reflect job count in status", async () => {
      const job1 = await createTestJob(testContext.cwd, "job1");
      const job2 = await createTestJob(testContext.cwd, "job2");

      await bridge.scheduleJob(job1);
      await bridge.scheduleJob(job2);

      const status = bridge.getStatus();
      expect(status.jobCount).toBe(2);
    });
  });

  describe("Scheduler Lifecycle", () => {
    it("should start scheduler through bridge", async () => {
      await bridge.start();

      expect(bridge.scheduler.isRunning).toBe(true);
      expect(bridge.getStatus().isRunning).toBe(true);

      await bridge.stop();
    });

    it("should stop scheduler through bridge", async () => {
      await bridge.start();
      await bridge.stop();

      expect(bridge.scheduler.isRunning).toBe(false);
      expect(bridge.getStatus().isRunning).toBe(false);
    });

    it("should shutdown scheduler and bridge together", async () => {
      const job1 = await createTestJob(testContext.cwd, "job1");
      await bridge.scheduleJob(job1);
      await bridge.start();

      await bridge.shutdown();

      expect(bridge.scheduler.isRunning).toBe(false);
      expect(bridge.scheduler.jobs.size).toBe(0);
    });
  });

  describe("Worker File Creation", () => {
    it("should create worker file for job", async () => {
      const jobDef = await createTestJob(testContext.cwd, "worker-job");

      const workerPath = bridge.createWorkerFile(jobDef);

      expect(workerPath).toBeDefined();
      expect(workerPath).toContain("worker-job-worker.mjs");
      expect(bridge.createdWorkerFiles.has(workerPath)).toBe(true);
    });

    it("should create unique worker files for different jobs", async () => {
      const job1 = await createTestJob(testContext.cwd, "job1");
      const job2 = await createTestJob(testContext.cwd, "job2");

      const worker1 = bridge.createWorkerFile(job1);
      const worker2 = bridge.createWorkerFile(job2);

      expect(worker1).not.toBe(worker2);
      expect(bridge.createdWorkerFiles.size).toBe(2);
    });
  });

  describe("Error Handling", () => {
    it("should handle scheduling errors gracefully", async () => {
      const invalidJob = createJobDefinition({
        id: null, // Invalid
        file: "/nonexistent/file.mjs",
      });

      await expect(bridge.scheduleJob(invalidJob)).rejects.toThrow();
    });

    it("should continue operating after single job failure", async () => {
      const validJob = await createTestJob(testContext.cwd, "valid-job");
      const invalidJob = createJobDefinition({
        id: "invalid-job",
        file: "/nonexistent/file.mjs",
      });

      await bridge.scheduleJob(validJob);

      try {
        await bridge.scheduleJob(invalidJob);
      } catch {}

      // Bridge should still work
      expect(bridge.scheduler.hasJob("valid-job")).toBe(true);
      const status = bridge.getStatus();
      expect(status.jobCount).toBe(1);
    });
  });

  describe("Integration Paths", () => {
    it("should maintain consistency between bridge and scheduler", async () => {
      const job1 = await createTestJob(testContext.cwd, "job1");
      const job2 = await createTestJob(testContext.cwd, "job2");

      // Add through bridge
      await bridge.scheduleJob(job1);
      await bridge.scheduleJob(job2);

      // Verify through scheduler
      expect(bridge.scheduler.hasJob("job1")).toBe(true);
      expect(bridge.scheduler.hasJob("job2")).toBe(true);
      expect(bridge.scheduler.listJobs()).toHaveLength(2);

      // Remove through bridge
      await bridge.unscheduleJob("job1");

      // Verify through scheduler
      expect(bridge.scheduler.hasJob("job1")).toBe(false);
      expect(bridge.scheduler.hasJob("job2")).toBe(true);
      expect(bridge.scheduler.listJobs()).toHaveLength(1);
    });

    it("should handle rapid schedule/unschedule operations", async () => {
      const jobDef = await createTestJob(testContext.cwd, "rapid-job");

      // Rapid operations
      await bridge.scheduleJob(jobDef);
      await bridge.unscheduleJob("rapid-job");
      await bridge.scheduleJob(jobDef);
      await bridge.unscheduleJob("rapid-job");
      await bridge.scheduleJob(jobDef);

      // Final state should be consistent
      expect(bridge.scheduler.hasJob("rapid-job")).toBe(true);
      expect(bridge.scheduler.listJobs()).toHaveLength(1);
    });
  });
});
